import type { ReactNode } from "react";

/** Base states come from the server; success/failure are short events after a task ends. */
export type VisualState = "idle" | "working" | "stuck" | "success" | "failure";
/** Drawing variants from the CharacterSheet (more parts, more light). The app uses variant I; II/III exist for the sheet. */
export type Form = 1 | 2 | 3;

/**
 * One role's drawing. `body` is on the 64×64 sprite grid.
 * `back`/`front` effects use the CharacterSheet card frame (158×190, sprite box at 23,52 size 112),
 * so paths are copied verbatim from the mockup.
 */
export interface RoleArt {
  body: (form: Form, state: VisualState) => ReactNode;
  back?: (state: VisualState) => ReactNode;
  front?: (state: VisualState) => ReactNode;
}

export const C = {
  ice: "#8FD8EA",
  iceSoft: "#C4ECF5",
  coral: "#FF9466",
  amethyst: "#B8A0FF",
  cobalt: "#86A8FF",
  cobaltSoft: "#C8D6FF",
  magnolia: "#F2A7D8",
  magnoliaSoft: "#F8D3EA",
  amber: "#FFB547",
  red: "#FF4D5E",
  phosphor: "#7BE495",
  hull: "#1E2A24",
  hullDark: "#28382F",
  metal: "#6F8577",
  pale: "#CFD9CC",
  lens: "#07110E",
  white: "#FFFFFF",
  text: "#E8EEE4",
  dim: "#5E7166",
  smoke: "#6A716B",
};
