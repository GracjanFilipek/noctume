import type { Agent, Role } from "@agent-tycoon/shared";
import { PODS, POD_SPRITE, SPRITE, WORK_MODULES, type Bunk, type Point } from "./layout.ts";

export type Area = { kind: "zone"; role: Role } | { kind: "pods" };

export interface Placement {
  agent: Agent;
  at: Point;
  size: number;
  area: Area;
  pill: "below" | "right" | "pod";
}

/** Where each agent was last placed; lives across renders so nobody jumps when someone else moves. */
export type Seats = Map<string, { area: Area; slot: number }>;

const areaKey = (a: Area) => (a.kind === "pods" ? "pods" : a.role);

/**
 * Where each agent stands (VisualSystem + brief):
 * - working → a bunk in its role's zone,
 * - idle → a regeneration pod (overflow drifts by its own zone),
 * - stuck → stays where it was (its zone if unknown).
 * An agent keeps its bunk/pod while it stays in the same area; newcomers take the lowest free slot.
 */
export function placeAgents(agents: Agent[], seats: Seats): Placement[] {
  // 1. Decide the area. Agents already resting in a pod keep it before newcomers are considered.
  const area = new Map<string, Area>();
  const idle = agents.filter((a) => a.status === "idle");
  const inPods = idle.filter((a) => seats.get(a.id)?.area.kind === "pods");
  const podQueue = [...inPods, ...idle.filter((a) => !inPods.includes(a))];
  const podded = new Set(podQueue.slice(0, PODS.centers.length).map((a) => a.id));
  for (const agent of agents) {
    const zone: Area = { kind: "zone", role: agent.role };
    if (agent.status === "working") area.set(agent.id, zone);
    else if (agent.status === "stuck") area.set(agent.id, seats.get(agent.id)?.area ?? zone);
    else area.set(agent.id, podded.has(agent.id) ? { kind: "pods" } : zone);
  }

  // 2. Keep previous slots where the area did not change, then fill the gaps.
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

  // 3. Positions.
  return agents.map((agent) => {
    const a = area.get(agent.id)!;
    const slot = slotOf.get(agent.id)!;
    seats.set(agent.id, { area: a, slot });
    const slots: Bunk[] = a.kind === "pods" ? PODS.centers : WORK_MODULES[a.role].bunks;
    const base = slots[slot % slots.length];
    // More agents than bunks: a 4th agent of a role would build an annex (stage 6); until then, offset.
    const lap = Math.floor(slot / slots.length);
    const at = { x: base.x + lap * 26, y: base.y - lap * 18 };
    const pill = a.kind === "pods" ? "pod" : lap === 0 && base.pill === "right" ? "right" : "below";
    return { agent, at, size: a.kind === "pods" ? POD_SPRITE : SPRITE, area: a, pill };
  });
}
