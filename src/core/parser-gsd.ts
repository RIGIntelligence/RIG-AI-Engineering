/*---------------------------------------------------------------------------------------------+
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* GSD-Pi session parser
 *
 * Data layout:
 *   ~/.gsd/sessions/<encoded-project-path>/
 *     Each project directory contains JSON session state files
 *
 * GSD uses a conversation format similar to OpenAI with turns
 * containing user/assistant messages with tool calls.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Session, SessionRequest } from './types';
import { assertTrustedPath, readFileSafe, createRequest, createSession, detectDevcontainerFromRequests } from './parser-shared';
import { warnCore } from './log';

interface GsdToolCallFunction {
  name?: string;
  arguments?: string;
}

interface GsdToolCall {
  id?: string;
  type?: string;
  function?: GsdToolCallFunction;
}

interface GsdMessage {
  role?: string;
  content?: string;
  tool_calls?: GsdToolCall[];
  model?: string;
  timestamp?: string | number;
}

interface GsdSessionState {
  id?: string;
  model?: string;
  platform?: string;
  cwd?: string;
  created_at?: string | number;
  updated_at?: string | number;
  messages?: GsdMessage[];
  title?: string;
}

/** Tool names (lowercase) that write/edit files. */
const GSD_WRITE_TOOLS = new Set([
  'write', 'write_file', 'create_file', 'edit', 'edit_file',
  'apply_diff', 'patch', 'multi_edit', 'create', 'overwrite',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function extractFilePath(args: Record<string, unknown> | null | undefined): string | null {
  if (!args) return null;
  if (typeof args.file_path === 'string') return args.file_path;
  if (typeof args.path === 'string') return args.path;
  if (typeof args.filename === 'string') return args.filename;
  return null;
}

function parseJsonRecord(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toTimestamp(value: string | number | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value > 1e12 ? value : value * 1000;
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? null : parsed;
}

function projectNameFromDir(directory: string): string {
  return directory.replaceAll('\\', '/').replace(/\/+$/, '').split('/').pop() || 'unknown';
}

export function findGsdDirs(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const dirs: string[] = [];
  const gsdDir = path.join(home, '.gsd');
  if (fs.existsSync(gsdDir)) dirs.push(gsdDir);
  return dirs;
}

function findGsdSessionDirs(gsdDir: string): string[] {
  const sessionsRoot = path.join(gsdDir, 'sessions');
  const result: string[] = [];
  try {
    const entries = fs.readdirSync(sessionsRoot, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) result.push(path.join(sessionsRoot, e.name));
    }
  } catch {
    /* sessions dir does not exist — return empty */
  }
  return result;
}

function readGsdJsonFiles(dir: string): GsdSessionState[] {
  const results: GsdSessionState[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.json')) continue;
      const filePath = path.join(dir, e.name);
      assertTrustedPath(filePath);
      const raw = readFileSafe(filePath);
      if (!raw) continue;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isRecord(parsed)) {
          results.push(parsed as GsdSessionState);
        }
      } catch (err) {
        warnCore('parser', `Failed to parse GSD session file: ${filePath}`, err);
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return results;
}

function extractToolNamesAndFiles(msg: GsdMessage): { tools: string[]; editedFiles: string[]; referencedFiles: string[] } {
  const tools: string[] = [];
  const editedFiles: string[] = [];
  const referencedFiles: string[] = [];

  const toolCalls = msg.tool_calls;
  if (!Array.isArray(toolCalls)) return { tools, editedFiles, referencedFiles };

  for (const tc of toolCalls) {
    const name = stringValue(tc.function?.name);
    if (!name) continue;
    tools.push(name);

    const toolLower = name.toLowerCase();
    const argsRaw = tc.function?.arguments;
    const args = typeof argsRaw === 'string' ? parseJsonRecord(argsRaw) : isRecord(argsRaw) ? argsRaw as Record<string, unknown> : null;
    const filePath = extractFilePath(args);

    if (filePath) {
      if (GSD_WRITE_TOOLS.has(toolLower)) {
        editedFiles.push(filePath);
      } else {
        referencedFiles.push(filePath);
      }
    }
  }

  return { tools, editedFiles, referencedFiles };
}

function parseGsdSession(rawSession: GsdSessionState, projectDir: string): Session | null {
  if (!rawSession.id && !rawSession.messages?.length) return null;

  const sessionId = rawSession.id || path.basename(projectDir);
  const messages = rawSession.messages || [];
  if (messages.length === 0) return null;

  const requests: SessionRequest[] = [];
  let currentUserMessage = '';
  let currentResponseTexts: string[] = [];
  let currentToolsUsed: string[] = [];
  let currentEditedFiles: string[] = [];
  let currentReferencedFiles: string[] = [];
  let currentModel = rawSession.model || '';
  let turnStartTs: number | null = null;
  let firstTs: number | null = null;
  let lastTs: number | null = null;

  // Track timestamps from session metadata
  const sessionCreatedTs = toTimestamp(rawSession.created_at);
  const sessionUpdatedTs = toTimestamp(rawSession.updated_at);
  if (sessionCreatedTs && (!firstTs || sessionCreatedTs < firstTs)) firstTs = sessionCreatedTs;
  if (sessionUpdatedTs && (!lastTs || sessionUpdatedTs > lastTs)) lastTs = sessionUpdatedTs;

  function flushTurn(): void {
    if (!currentUserMessage && currentResponseTexts.length === 0 && currentToolsUsed.length === 0) return;

    const responseText = currentResponseTexts.join('\n');
    requests.push(createRequest({
      requestId: `gsd-${sessionId.slice(0, 8)}-${requests.length}`,
      timestamp: turnStartTs,
      messageText: currentUserMessage,
      responseText,
      agentName: 'GSD-Pi',
      agentMode: rawSession.platform || 'agent',
      modelId: currentModel,
      toolsUsed: currentToolsUsed,
      editedFiles: [...new Set(currentEditedFiles)],
      referencedFiles: [...new Set(currentReferencedFiles)],
      totalElapsed: turnStartTs && lastTs ? lastTs - turnStartTs : null,
    }));

    currentUserMessage = '';
    currentResponseTexts = [];
    currentToolsUsed = [];
    currentEditedFiles = [];
    currentReferencedFiles = [];
    turnStartTs = null;
  }

  for (const msg of messages) {
    const role = (msg.role || '').toLowerCase();
    const msgTs = toTimestamp(msg.timestamp);

    if (msgTs) {
      if (!firstTs || msgTs < firstTs) firstTs = msgTs;
      if (!lastTs || msgTs > lastTs) lastTs = msgTs;
    }

    if (role === 'user') {
      flushTurn();
      const content = typeof msg.content === 'string' ? msg.content : '';
      currentUserMessage = content;
      turnStartTs = msgTs || firstTs;
    } else if (role === 'assistant') {
      const content = typeof msg.content === 'string' ? msg.content : '';
      if (content) currentResponseTexts.push(content);
      if (msg.model) currentModel = msg.model;
      const { tools, editedFiles, referencedFiles } = extractToolNamesAndFiles(msg);
      currentToolsUsed.push(...tools);
      currentEditedFiles.push(...editedFiles);
      currentReferencedFiles.push(...referencedFiles);
    } else if (role === 'tool') {
      // Tool result messages — content may be outputs, skip deep parsing
    }
  }

  flushTurn();
  if (requests.length === 0) return null;

  const cwd = rawSession.cwd || '';
  const wsName = cwd ? projectNameFromDir(cwd) : rawSession.platform || 'unknown';
  const wsId = `gsd-${wsName}-${sessionId.slice(0, 8)}`;

  return createSession({
    sessionId,
    workspaceId: wsId,
    workspaceName: wsName,
    location: 'terminal',
    harness: 'GSD-Pi',
    creationDate: firstTs,
    lastMessageDate: lastTs,
    requests,
    hasDevcontainer: detectDevcontainerFromRequests(requests, cwd),
    workspaceRootPath: cwd || undefined,
  });
}

export function parseGsdSessions(gsdDir: string): Session[] {
  const sessions: Session[] = [];
  const sessionDirs = findGsdSessionDirs(gsdDir);

  for (const projectDir of sessionDirs) {
    const rawSessionStates = readGsdJsonFiles(projectDir);
    for (const rawSession of rawSessionStates) {
      try {
        const session = parseGsdSession(rawSession, projectDir);
        if (session) sessions.push(session);
      } catch (err) {
        warnCore('parser', `Failed to parse GSD session in ${projectDir}`, err);
      }
    }
  }

  return sessions;
}