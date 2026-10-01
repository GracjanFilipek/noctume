import type { Agent, Role } from "@agent-tycoon/shared";
import {
  ANNEX_PREFERENCE,
  ANNEX_SPRITE,
  annexBunks,
  EXPANSION_SLOTS,
  MAX_DORMANT_ON_MAP,
  PODS,
  PODS_II,
  POD_SPRITE,
  SPRITE,
  WORK_MODULES,
  type Bunk,
  type ExpansionSlot,
  type Point,
} from "./layout.ts";

export type Area = { kind: "zone"; role: Role } | { kind: "pods" };

export interface Placement {
  agent: Agent;
  at: Point;
  size: number;
  area: Area;
  pill: "below" | "right" | "pod";
}

/** Remembered between renders so nobody jumps when someone else moves, and annexes don't hop between slots. */
export interface StationMemory {
  seats: Map<string, { area: Area; slot: number }>;
  annexes: Map<ExpansionSlot["id"], Role>;
}

export interface StationPlan {
  placements: Placement[];
  /** Slot → role whose annex occupies it. */
  annexes: Map<ExpansionSlot["id"], Role>;
  /** Slots hosting the Developer / Reviewer module. */
  hosted: Set<ExpansionSlot["id"]>;
  /** Unused slots drawn as dormant (at most MAX_DORMANT_ON_MAP). */
  dormant: ExpansionSlot[];
  podsII: boolean;
  podsOccupied: number;
  podCapacity: number;
}

const POD_CENTERS = [...PODS.centers, ...PODS_II.centers];
const BUNKS_PER_MODULE = 3;
const areaKey = (a: Area) => (a.kind === "pods" ? "pods" : a.role);

/**
 * Where each agent stands (VisualSystem + brief):
 * - working → a bunk in its role's zone (4th+ agent of a role → an annex next to the zone),
 * - idle → a regeneration pod (3, then 6); overflow drifts by its own zone,
 * - stuck → stays where it was (its zone if unknown).
 * An agent keeps its bunk/pod while it stays in the same area; newcomers take the lowest free slot.
 */
export function planStation(agents: Agent[], memory: StationMemory): StationPlan {
  const { seats } = memory;
  const hosted = new Set<ExpansionSlot["id"]>(
    EXPANSION_SLOTS.filter((s) => s.hostFor && agents.some((a) => a.role === s.hostFor)).map((s) => s.id),
  );

  // 1. Area. Agents already resting in a pod keep it before newcomers are considered.
  const area = new Map<string, Area>();
  const idle = agents.filter((a) => a.status === "idle");
  const inPods = idle.filter((a) => seats.get(a.id)?.area.kind === "pods");
  const podQueue = [...inPods, ...idle.filter((a) => !inPods.includes(a))];
  const podded = new Set(podQueue.slice(0, POD_CENTERS.length).map((a) => a.id));
  for (const agent of agents) {
    const zone: Area = { kind: "zone", role: agent.role };
    if (agent.status === "working") area.set(agent.id, zone);
    else if (agent.status === "stuck") area.set(agent.id, seats.get(agent.id)?.area ?? zone);
    else area.set(agent.id, podded.has(agent.id) ? { kind: "pods" } : zone);
  }

  // 2. Slot within the area: keep the previous one if still free, then fill the gaps.
  const taken = new Map<string, Set<number>>();
  const slotOf = new Map<string, number>();
  const take = (key: string, slot: number) => {
    if (!taken.has(key)) taken.set(key, new Set());
    taken.get(key)!.add(slot);
  };
  for (const agent of agents) {
    const a = area.get(agent.id)!;
    const prev = seats.get(agent.id);
    if (prev && areaKey(prev.area) === areaKey(a) && !taken.get(areaKey(a))?.has(prev.slot)) {
      slotOf.set(agent.id, prev.slot);
      take(areaKey(a), prev.slot);
    }
  }
  for (const agent of agents) {
    if (slotOf.has(agent.id)) continue;
    const key = areaKey(area.get(agent.id)!);
    let slot = 0;
    while (taken.get(key)?.has(slot)) slot++;
    slotOf.set(agent.id, slot);
    take(key, slot);
  }

  // 3. Annexes: a zone whose highest used slot is beyond its 3 bunks needs ceil(extra / 3) annexes.
  const needed = new Map<Role, number>();
  for (const [key, slots] of taken) {
    if (key === "pods") continue;
    const extra = Math.max(...slots) + 1 - BUNKS_PER_MODULE;
    if (extra > 0) needed.set(key as Role, Math.ceil(extra / BUNKS_PER_MODULE));
  }
  const annexes = new Map<ExpansionSlot["id"], Role>();
  // keep remembered annexes that are still needed
  for (const [slot, role] of memory.annexes) {
    const have = [...annexes.values()].filter((r) => r === role).length;
    if (!hosted.has(slot) && have < (needed.get(role) ?? 0)) annexes.set(slot, role);
  }
  for (const [role, count] of needed) {
    for (const slot of ANNEX_PREFERENCE[role]) {
      if ([...annexes.values()].filter((r) => r === role).length >= count) break;
      if (!hosted.has(slot) && !annexes.has(slot)) annexes.set(slot, role);
    }
  }
  memory.annexes = annexes;
  const annexBunksOf = (role: Role) =>
    EXPANSION_SLOTS.filter((s) => annexes.get(s.id) === role).flatMap((s) => annexBunks(s.rect));

  // 4. Positions.
  const placements = agents.map((agent): Placement => {
    const a = area.get(agent.id)!;
    const slot = slotOf.get(agent.id)!;
    seats.set(agent.id, { area: a, slot });
    if (a.kind === "pods") {
      return { agent, at: POD_CENTERS[slot] ?? POD_CENTERS.at(-1)!, size: POD_SPRITE, area: a, pill: "pod" };
    }
    const own: Bunk[] = WORK_MODULES[a.role].bunks;
    if (slot < own.length) {
      return { agent, at: own[slot], size: SPRITE, area: a, pill: own[slot].pill === "right" ? "right" : "below" };
    }
    const extra = annexBunksOf(a.role);
    const at = extra[slot - own.length];
    if (at) return { agent, at, size: ANNEX_SPRITE, area: a, pill: "pod" };
    // No free slot left anywhere (more than the station can hold): stack by the zone.
    const lap = slot - own.length - extra.length + 1;
    const base = own[slot % own.length];
    return { agent, at: { x: base.x + lap * 22, y: base.y - lap * 16 }, size: SPRITE, area: a, pill: "below" };
  });

  const used = new Set<ExpansionSlot["id"]>([...hosted, ...annexes.keys()]);
  const podsOccupied = placements.filter((p) => p.area.kind === "pods").length;
  return {
    placements,
    annexes,
    hosted,
    dormant: EXPANSION_SLOTS.filter((s) => !used.has(s.id)).slice(0, MAX_DORMANT_ON_MAP),
    podsII: podsOccupied > PODS.centers.length,
    podsOccupied,
    podCapacity: podsOccupied > PODS.centers.length ? POD_CENTERS.length : PODS.centers.length,
  };
}
