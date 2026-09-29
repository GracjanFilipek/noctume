import type { Role } from "@agent-tycoon/shared";

/** Scene coordinates are the mockup's: the station stage is 1120 × 840 (Main.dc.html). */
export const STAGE_W = 1120;
export const STAGE_H = 840;
export const SPRITE = 84; // map sprite size
export const POD_SPRITE = 64; // resting in a regeneration pod

export type Point = { x: number; y: number };
/** A bunk; `pill: "right"` puts the name label beside the sprite where below would sit on the module (Main.dc.html: Vega). */
export type Bunk = Point & { pill?: "right" };
export type Rect = { x: number; y: number; w: number; h: number };

export interface WorkModule {
  id: Role;
  /** Mockup zones are always built; the two added roles take over a dormant slot once hired. */
  source: "mockup" | "added";
  labelAt: Point;
  /** Agent sprite centres — "Moduł roboczy ma 3 koje". */
  bunks: Bunk[];
  /** Data conduit to the Analytical Core (L4). */
  conduit: string;
  /** Where the conduit shows a break when an agent of this zone is stuck. */
  breakAt: Point;
}

export const WORK_MODULES: Record<Role, WorkModule> = {
  researcher: {
    id: "researcher",
    source: "mockup",
    labelAt: { x: 150, y: 308 },
    bunks: [
      { x: 285, y: 130, pill: "right" },
      { x: 214, y: 238 },
      { x: 356, y: 238 },
    ],
    conduit: "M392 290 C420 322 440 344 470 370",
    breakAt: { x: 431, y: 329 },
  },
  writer: {
    id: "writer",
    source: "mockup",
    labelAt: { x: 700, y: 308 },
    bunks: [
      { x: 800, y: 232 },
      { x: 896, y: 236 },
      { x: 720, y: 236 },
    ],
    conduit: "M728 290 C700 322 680 344 650 370",
    breakAt: { x: 689, y: 329 },
  },
  analyst: {
    id: "analyst",
    source: "mockup",
    labelAt: { x: 470, y: 540 },
    bunks: [
      { x: 498, y: 436 },
      { x: 622, y: 436 },
      { x: 560, y: 392 },
    ],
    // The analysts sit in the core itself; no conduit of their own.
    conduit: "",
    breakAt: { x: 560, y: 350 },
  },
  developer: {
    id: "developer",
    source: "added",
    labelAt: { x: 30, y: 506 },
    bunks: [
      { x: 80, y: 422 },
      { x: 180, y: 422 },
      { x: 130, y: 434 },
    ],
    conduit: "M230 430 C300 430 360 436 440 440",
    breakAt: { x: 335, y: 433 },
  },
  reviewer: {
    id: "reviewer",
    source: "added",
    labelAt: { x: 890, y: 506 },
    bunks: [
      { x: 940, y: 422 },
      { x: 1040, y: 422 },
      { x: 990, y: 434 },
    ],
    conduit: "M890 430 C820 430 760 436 680 440",
    breakAt: { x: 785, y: 433 },
  },
};

/** Regeneration pods (Kapsuły Regeneracji): idle agents rest here; the pods grow in threes. */
export const PODS: { centers: Point[]; rects: Rect[]; labelAt: Point } = {
  centers: [
    { x: 754, y: 644 },
    { x: 850, y: 644 },
    { x: 946, y: 644 },
  ],
  rects: [
    { x: 714, y: 592, w: 80, h: 116 },
    { x: 810, y: 592, w: 80, h: 116 },
    { x: 906, y: 592, w: 80, h: 116 },
  ],
  labelAt: { x: 690, y: 740 },
};

export const HANGAR = {
  labelAt: { x: 62, y: 760 },
  /** Package slots on the dock rail (Main.dc.html). */
  slots: [170, 225, 280, 335].map((x) => ({ x, y: 672 })),
  conduit: "M396 600 C430 572 452 552 474 524",
};

export const PODS_CONDUIT = "M724 576 C694 560 672 546 646 524";

/** The four corridors of the mockup (always built). */
export const CORRIDORS = [WORK_MODULES.researcher.conduit, WORK_MODULES.writer.conduit, HANGAR.conduit, PODS_CONDUIT];

/**
 * Dormant slots — construction outlines on the build front ("najwyżej 3 uśpione gniazda na mapie").
 * The side slots host the Developer / Reviewer modules once those roles are hired.
 */
export const DORMANT_SLOTS: { id: string; rect: Rect; connector: string; hostFor?: Role }[] = [
  { id: "top", rect: { x: 480, y: 96, w: 160, h: 118 }, connector: "M560 214 V350" },
  { id: "left", rect: { x: 40, y: 370, w: 170, h: 118 }, connector: "M210 430 C300 430 360 436 440 440", hostFor: "developer" },
  { id: "right", rect: { x: 910, y: 370, w: 170, h: 118 }, connector: "M910 430 C820 430 760 436 680 440", hostFor: "reviewer" },
];
