import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const WORKSPACES_DIR = path.join(ROOT_DIR, "workspaces");

export function workspaceDir(taskId: string) {
  return path.join(WORKSPACES_DIR, taskId);
}

export async function ensureWorkspace(taskId: string) {
  const dir = workspaceDir(taskId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Fresh, empty workspace (a re-run must not mix in files from the previous run). */
export async function resetWorkspace(taskId: string) {
  await rm(workspaceDir(taskId), { recursive: true, force: true });
  return ensureWorkspace(taskId);
}

/** Relative paths of all files in a task's workspace. */
export async function listWorkspaceFiles(taskId: string): Promise<string[]> {
  const dir = workspaceDir(taskId);
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
      .sort();
  } catch {
    return [];
  }
}
