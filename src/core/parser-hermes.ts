/*---------------------------------------------------------------------------------------------+
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* Hermes Agent session parser
 *
 * Data layout:
 *   ~/.hermes/sessions/session_<timestamp>_<id>.json   -- session metadata + messages
 *   ~/.hermes/sessions/request_dump_<id>.json          -- individual request dumps
 *
 * Session JSON format:
 *   session_id, model, platform, session_start, last_updated, messages[]
 *   messages[] entries: role (user/assistant/tool), content (string),
 *   tool_calls[].function.name, tool_calls[].function.arguments
 */

import * as fs from 'fs';
import * as path from 'path';
import { Session, SessionRequest } from './types';
import { assertTrustedPath, readFileSafe, createRequest, createSession, detectDevcontainerFromRequests } from './parser-shared';
import { warnCore } from './log';

interface HermesToolCallFunction {
  name?: string;
  arguments?: string;
}

interface HermesToolCall {
  function?: HermesToolCallFunction;
}

interface HermesMessage {
  role?: string;
  content?: string;
  tool_calls?: HermesToolCall[];
  reasoning?: string;
  finish_reason?: string;
  model?: string;
}

interface HermesSession {
  session_id?: string;
  model?: string;
  platform?: string;
  session_start?: string;
  last_updated?: string;
  messages?: HermesMessage[];
}

/** Tool names (lowercase) that write/edit files. */
const HERMES_WRITE_TOOLS = new Set([
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

function projectNameFromCwd(cwd: string): string {
  return cwd.replaceAll('\\', '/').replace(/\/+$/, '').split('/').pop() || 'unknown';
}

export function findHermesDirs(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const dirs: string[] = [];
  const sessionsDir = path.join(home, '.hermes', 'sessions');
  if (fs.existsSync(sessionsDir)) dirs.push(path.join(home, '.hermes'));
  return dirs;
}

function readHermesSessionFiles(hermesDir: string): HermesSession[] {
  const sessionsDir = path.join(hermesDir, 'sessions');
  const results: HermesSession[] = [];
  try {
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.startsWith('session_') || !e.name.endsWith('.json')) continue;
      const filePath = path.join(sessionsDir, e.name);
      assertTrustedPath(filePath);
      const raw = readFileSafe(filePath);
      if (!raw) continue;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isRecord(parsed)) {
          results.push(parsed as HermesSession);
        }
      } catch (err) {
        warnCore('parser', `Failed to parse Hermes session file: ${filePath}`, err);
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return results;
}

function parseHermesMessageContent(msg: HermesMessage): string {
  if (typeof msg.content === 'string') return msg.content;
  return '';
}

function extractToolNamesAndFiles(msg: HermesMessage): { tools: string[]; editedFiles: string[]; referencedFiles: string[] } {
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
      if (HERMES_WRITE_TOOLS.has(toolLower)) {
        editedFiles.push(filePath);
      } else {
        referencedFiles.push(filePath);
      }
    }
  }

  return { tools, editedFiles, referencedFiles };
}

function parseHermesSession(rawSession: HermesSession): Session | null {
  if (!rawSession.session_id) return null;

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
  let lastTs: number | null = null;
  let firstTs: number | null = null;

  function flushTurn(): void {
    if (!currentUserMessage && currentResponseTexts.length === 0 && currentToolsUsed.length === 0) return;

    const responseText = currentResponseTexts.join('\n');
    requests.push(createRequest({
      requestId: `hermes-${rawSession.session_id?.slice(0, 8)}-${requests.length}`,
      timestamp: turnStartTs,
      messageText: currentUserMessage,
      responseText,
      agentName: 'Hermes',
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
    const timestamp = msg.finish_reason ? null : null; // Hermes messages may not have per-msg timestamps

    // Update timestamp tracking from session-level timestamps
    if (rawSession.session_start) {
      const startTs = new Date(rawSession.session_start).getTime();
      if (!isNaN(startTs) && (!firstTs || startTs < firstTs)) firstTs = startTs;
    }
    if (rawSession.last_updated) {
      const updateTs = new Date(rawSession.last_updated).getTime();
      if (!isNaN(updateTs) && (!lastTs || updateTs > lastTs)) lastTs = updateTs;
    }

    if (role === 'user') {
      flushTurn();
      currentUserMessage = parseHermesMessageContent(msg);
      // Use session start as fallback timestamp for first turn
      if (!turnStartTs && firstTs) turnStartTs = firstTs;
    } else if (role === 'assistant') {
      const content = parseHermesMessageContent(msg);
      if (content) currentResponseTexts.push(content);
      if (msg.reasoning) currentResponseTexts.push(msg.reasoning);
      if (msg.model) currentModel = msg.model;
      const { tools, editedFiles, referencedFiles } = extractToolNamesAndFiles(msg);
      currentToolsUsed.push(...tools);
      currentEditedFiles.push(...editedFiles);
      currentReferencedFiles.push(...referencedFiles);
    } else if (role === 'tool') {
      // Tool result messages -- extract referenced files from tool results if needed
      // Hermes tool role messages may contain results; we don't parse them deeply here
    }
  }

  flushTurn();
  if (requests.length === 0) return null;

  const wsName = rawSession.platform || 'unknown';
  const wsId = `hermes-${rawSession.session_id.slice(0, 8)}`;

  return createSession({
    sessionId: rawSession.session_id,
    workspaceId: wsId,
    workspaceName: wsName,
    location: 'terminal',
    harness: 'Hermes',
    creationDate: firstTs,
    lastMessageDate: lastTs,
    requests,
    hasDevcontainer: detectDevcontainerFromRequests(requests),
  });
}

export function parseHermesSessions(hermesDir: string): Session[] {
  const sessions: Session[] = [];
  const rawSessions = readHermesSessionFiles(hermesDir);

  for (const rawSession of rawSessions) {
    try {
      const session = parseHermesSession(rawSession);
      if (session) sessions.push(session);
    } catch (err) {
      warnCore('parser', `Failed to parse Hermes session: ${rawSession.session_id}`, err);
    }
  }

  return sessions;
}