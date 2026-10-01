import { useSyncExternalStore } from "react";
import type { Role } from "@agent-tycoon/shared";

/** The package being dragged right now — shared by the Tasks panel and the station scene. */
export interface Drag {
  taskId: string;
  /** Lead worker's role, for colouring the beam (undefined = no team yet). */
  role?: Role;
  source: "panel" | "hangar";
  /** Hangar slot the package was lifted from. */
  slot?: number;
}

let current: Drag | null = null;
const listeners = new Set<() => void>();

export function setDrag(next: Drag | null) {
  current = next;
  for (const fn of listeners) fn();
}

export function useDrag(): Drag | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
}
