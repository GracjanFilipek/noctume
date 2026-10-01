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
 * Expansion slots — the station's build front. A slot is either dormant (construction outline, "Aktywuj"),
 * hosts the Developer/Reviewer module (left/right, once hired), or holds an annex: "the 4th agent of a role
 * builds an annex next to its zone". Only the first MAX_DORMANT_ON_MAP unused slots are drawn as dormant.
 * The top/left/right slots and their connectors are from Main.dc.html; topLeft/topRight are added for 12 agents.
 */
export interface ExpansionSlot {
  id: "top" | "left" | "right" | "topLeft" | "topRight";
  rect: Rect;
  connector: string;
  hostFor?: Role;
}

export const EXPANSION_SLOTS: ExpansionSlot[] = [
  { id: "top", rect: { x: 480, y: 96, w: 160, h: 118 }, connector: "M560 214 V350" },
  { id: "left", rect: { x: 40, y: 370, w: 170, h: 118 }, connector: "M210 430 C300 430 360 436 440 440", hostFor: "developer" },
  { id: "right", rect: { x: 910, y: 370, w: 170, h: 118 }, connector: "M910 430 C820 430 760 436 680 440", hostFor: "reviewer" },
  { id: "topLeft", rect: { x: 14, y: 30, w: 126, h: 112 }, connector: "M140 86 C160 110 160 150 152 176" },
  { id: "topRight", rect: { x: 982, y: 30, w: 126, h: 112 }, connector: "M982 86 C962 110 966 150 972 172" },
];

/** "Na mapie widać najwyżej 3 uśpione gniazda (najbliższy front budowy)." */
export const MAX_DORMANT_ON_MAP = 3;

/** Nearest slots first: an annex grows next to its own zone. */
export const ANNEX_PREFERENCE: Record<Role, ExpansionSlot["id"][]> = {
  researcher: ["topLeft", "top", "left", "topRight", "right"],
  writer: ["topRight", "top", "right", "topLeft", "left"],
  analyst: ["top", "left", "right", "topLeft", "topRight"],
  developer: ["topLeft", "top", "topRight", "right"],
  reviewer: ["topRight", "top", "topLeft", "left"],
};

/** Annex sprites are smaller ("sylwetki czytelne od 48 px"). */
export const ANNEX_SPRITE = 56;

/** Three bunks in an annex: two below, one above (fits the narrow corner slots). */
export function annexBunks(r: Rect): Bunk[] {
  return [
    { x: r.x + r.w * 0.27, y: r.y + r.h * 0.6 },
    { x: r.x + r.w * 0.73, y: r.y + r.h * 0.6 },
    { x: r.x + r.w * 0.5, y: r.y + r.h * 0.3 },
  ];
}

/** "Kapsuły Regeneracji rosną o 3 kapsuły": the second bank opens below the core when a 4th agent rests. */
export const PODS_II = {
  rect: { x: 440, y: 600, w: 240, h: 140 },
  rects: [
    { x: 452, y: 614, w: 66, h: 112 },
    { x: 527, y: 614, w: 66, h: 112 },
    { x: 602, y: 614, w: 66, h: 112 },
  ],
  centers: [
    { x: 485, y: 664 },
    { x: 560, y: 664 },
    { x: 635, y: 664 },
  ],
  conduit: "M560 600 V532",
};
