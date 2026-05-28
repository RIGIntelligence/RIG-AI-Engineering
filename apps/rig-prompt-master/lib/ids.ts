import { createHash, randomUUID } from "node:crypto";

export function makeId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function utcNow(): string {
  return new Date().toISOString();
}

export function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function shortHash(value: string): string {
  return hashText(value).slice(0, 12);
}
