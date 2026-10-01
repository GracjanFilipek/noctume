import type { Role } from "@agent-tycoon/shared";
import { CORRIDORS, EXPANSION_SLOTS, HANGAR, PODS, PODS_CONDUIT, PODS_II, STAGE_H, STAGE_W, WORK_MODULES, type ExpansionSlot } from "./layout.ts";

export type ConduitState = "flow" | "broken" | "quiet";

const ROLE_HEX: Record<Role, string> = {
  researcher: "#8FD8EA",
  writer: "#FF9466",
  analyst: "#B8A0FF",
  developer: "#86A8FF",
  reviewer: "#F2A7D8",
};

interface Props {
  conduits: Record<Role, ConduitState>;
  /** Added-role modules that exist (a Developer / Reviewer has been hired). */
  built: Set<Role>;
  podsOccupied: number;
  podsII: boolean;
  annexes: Map<ExpansionSlot["id"], Role>;
  dormant: ExpansionSlot[];
  hangarFlow: boolean;
  /** A package is being dragged: the Hangar lights up (Tasks.dc.html). */
  hangarActive: boolean;
}

/** L3 hull (modules, corridors, dormant slots) + L4 data conduits. Module drawings from Main.dc.html. */
export function Hull({ conduits, built, podsOccupied, podsII, annexes, dormant, hangarFlow, hangarActive }: Props) {
  const addedCorridors = (["developer", "reviewer"] as Role[]).filter((r) => built.has(r)).map((r) => WORK_MODULES[r].conduit);
  const annexSlots = EXPANSION_SLOTS.filter((s) => annexes.has(s.id));
  const allCorridors = [...CORRIDORS, ...addedCorridors, ...annexSlots.map((s) => s.connector), ...(podsII ? [PODS_II.conduit] : [])];

  return (
    <svg className="layer" width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
      <defs>
        <linearGradient id="mBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD8EA" stopOpacity="0.7" />
          <stop offset="1" stopColor="#8FD8EA" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* corridors */}
      <g fill="none" strokeLinecap="round">
        {allCorridors.map((d) => (
          <path key={`o${d}`} d={d} stroke="#0E1511" strokeWidth="34" />
        ))}
        {allCorridors.map((d) => (
          <path key={`i${d}`} d={d} stroke="#1C2822" strokeWidth="24" />
        ))}
        <g stroke="#2D3E35" strokeWidth="24" strokeDasharray="2 10">
          {allCorridors.map((d) => (
            <path key={`r${d}`} d={d} />
          ))}
        </g>
      </g>

      {/* connectors to dormant modules */}
      <g fill="none" stroke="#5F7A69" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="4 6">
        {dormant.map((s) => (
          <path key={s.id} d={s.connector} />
        ))}
      </g>

      {/* data conduits (L4) */}
      {(Object.keys(WORK_MODULES) as Role[]).map((role) => {
        const m = WORK_MODULES[role];
        if (!m.conduit || (m.source === "added" && !built.has(role))) return null;
        return <Conduit key={role} d={m.conduit} color={ROLE_HEX[role]} state={conduits[role]} breakAt={m.breakAt} />;
      })}
      <path
        className={hangarFlow ? "at-flow-slow" : undefined}
        d={HANGAR.conduit}
        fill="none"
        stroke="#8FA597"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeDasharray="3 9"
        strokeLinecap="round"
      />
      <path d={PODS_CONDUIT} fill="none" stroke="#7BE495" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />

      {/* dormant modules: construction outlines */}
      <g fill="none" stroke="#5F7A69">
        {dormant.map(({ id, rect: r }) => (
          <g key={id}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill="#5F7A69" fillOpacity="0.05" strokeWidth="1.5" strokeDasharray="6 5" />
            <path d={Array.from({ length: 7 }, (_, i) => `M${r.x + 20 * (i + 1)} ${r.y + 8} V${r.y + r.h - 8}`).join(" ")} strokeOpacity="0.14" />
            <path d={`M${r.x + 14} ${r.y + 16} L${r.x + r.w - 14} ${r.y + r.h - 16} M${r.x + r.w - 14} ${r.y + 16} L${r.x + 14} ${r.y + r.h - 16}`} strokeOpacity="0.22" />
          </g>
        ))}
      </g>

      <AnalyticalCore />
      <Observatory scanning={conduits.researcher === "flow"} />
      <WordForge jammed={conduits.writer === "broken"} />
      {built.has("developer") && <Workshop />}
      {built.has("reviewer") && <ReviewTower />}
      {annexSlots.map((slot) => (
        <Annex key={slot.id} slot={slot} role={annexes.get(slot.id)!} working={conduits[annexes.get(slot.id)!] === "flow"} />
      ))}
      <Hangar active={hangarActive} />
      <Pods occupied={Math.min(podsOccupied, PODS.rects.length)} />
      {podsII && <PodsII occupied={podsOccupied - PODS.rects.length} />}
    </svg>
  );
}

function Conduit({ d, color, state, breakAt }: { d: string; color: string; state: ConduitState; breakAt: { x: number; y: number } }) {
  if (state === "flow") {
    return <path className="at-flow" d={d} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" />;
  }
  return (
    <>
      <path d={d} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
      {state === "broken" && (
        <path
          className="at-blink"
          d={`M${breakAt.x - 6} ${breakAt.y - 6} L${breakAt.x + 6} ${breakAt.y + 6} M${breakAt.x + 6} ${breakAt.y - 6} L${breakAt.x - 6} ${breakAt.y + 6}`}
          stroke="#FF4D5E"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

/* ---------- modules from the mockup ---------- */

function AnalyticalCore() {
  return (
    <g>
      <path d="M500 350 C498 336 490 326 488 314" fill="none" stroke="#35483E" strokeWidth="5" strokeLinecap="round" />
      <path d="M622 350 C626 336 632 326 636 312" fill="none" stroke="#35483E" strokeWidth="5" strokeLinecap="round" />
      <circle className="at-twinkle" cx="488" cy="312" r="4" fill="#B8A0FF" />
      <circle className="at-twinkle" style={{ animationDelay: "1.4s" }} cx="636" cy="310" r="4" fill="#B8A0FF" />
      <path d="M470 350 H650 L680 380 V500 L650 530 H470 L440 500 V380 Z" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <path d="M482 364 H638 L664 390 V490 L638 516 H482 L456 490 V390 Z" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      <g stroke="#B8A0FF" strokeWidth="1" opacity="0.35">
        <path d="M560 404 L482 364 M560 404 L638 364 M548 482 L482 516 M572 482 L638 516 M538 436 L456 440 M582 436 L664 440" />
      </g>
      <g fill="#B8A0FF" opacity="0.6">
        <circle cx="482" cy="364" r="2.5" />
        <circle cx="638" cy="364" r="2.5" />
        <circle cx="482" cy="516" r="2.5" />
        <circle cx="638" cy="516" r="2.5" />
        <circle cx="456" cy="440" r="2.5" />
        <circle cx="664" cy="440" r="2.5" />
      </g>
      <g className="at-pulse">
        <polygon points="560,404 582,436 572,482 560,494 548,482 538,436" fill="#2A2442" stroke="#B8A0FF" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="560,404 582,436 560,446 538,436" fill="#4E3F7A" />
        <line x1="560" y1="446" x2="560" y2="494" stroke="#B8A0FF" strokeWidth="1" opacity="0.6" />
        <circle cx="560" cy="452" r="3.5" fill="#EEE6FF" />
      </g>
      <g fill="#35483E">
        {[494, 522, 550, 578, 606].map((x) => (
          <rect key={x} x={x} y="344" width="6" height="6" />
        ))}
      </g>
    </g>
  );
}

function Observatory({ scanning }: { scanning: boolean }) {
  return (
    <g>
      <path d="M175 172 A110 92 0 0 1 395 172 Z" fill="#8FD8EA" fillOpacity="0.06" stroke="#8FD8EA" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M230 172 A55 92 0 0 1 340 172" fill="none" stroke="#8FD8EA" strokeOpacity="0.2" />
      <path d="M194 132 Q285 110 376 132" fill="none" stroke="#8FD8EA" strokeOpacity="0.2" />
      <ellipse cx="285" cy="82" rx="16" ry="5" fill="#090E0B" stroke="#8FD8EA" strokeWidth="1.5" />
      <rect x="150" y="170" width="270" height="130" rx="26" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x="166" y="186" width="238" height="98" rx="16" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      {scanning ? (
        <>
          {/* Main.dc.html: the dome scanner sweeps while a researcher works */}
          <polygon className="at-beam" points="285,142 258,270 312,270" fill="url(#mBeam)" />
          <circle cx="285" cy="252" r="11" fill="#8FD8EA" fillOpacity="0.1" stroke="#8FD8EA" strokeOpacity="0.7" />
          <ellipse className="at-spin" cx="285" cy="252" rx="18" ry="5" fill="none" stroke="#8FD8EA" strokeOpacity="0.6" strokeDasharray="3 3" />
          <ellipse cx="285" cy="276" rx="34" ry="5" fill="#8FD8EA" opacity="0.28" />
        </>
      ) : (
        <>
          <circle cx="285" cy="252" r="11" fill="#8FD8EA" fillOpacity="0.06" stroke="#8FD8EA" strokeOpacity="0.35" />
          <ellipse cx="285" cy="276" rx="34" ry="5" fill="#8FD8EA" opacity="0.14" />
        </>
      )}
      <rect x="263" y="276" width="44" height="6" rx="3" fill="#1C2822" />
      <g fill="#8FD8EA">
        <circle className="at-twinkle" cx="184" cy="292" r="1.8" />
        <circle className="at-twinkle" style={{ animationDelay: ".5s" }} cx="214" cy="292" r="1.8" />
        <circle className="at-twinkle" style={{ animationDelay: "1s" }} cx="356" cy="292" r="1.8" />
        <circle className="at-twinkle" style={{ animationDelay: "1.5s" }} cx="386" cy="292" r="1.8" />
      </g>
    </g>
  );
}

function WordForge({ jammed }: { jammed: boolean }) {
  return (
    <g>
      <g fill="none" stroke="#35483E" strokeWidth="5" strokeLinecap="round">
        <path d="M752 172 C748 150 740 136 738 120" />
        <path d="M806 172 C808 146 812 128 812 108" />
        <path d="M946 172 C950 152 958 140 962 126" />
      </g>
      <circle className="at-twinkle" cx="738" cy="118" r="4" fill="#FF9466" />
      <circle className="at-twinkle" style={{ animationDelay: ".9s" }} cx="812" cy="106" r="4" fill="#FF9466" />
      <circle className="at-twinkle" style={{ animationDelay: "1.8s" }} cx="962" cy="124" r="4" fill="#FF9466" />
      <rect x="700" y="170" width="280" height="130" rx="26" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x="716" y="186" width="248" height="98" rx="16" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      <g stroke="#FF9466" strokeWidth="1.2" opacity="0.45">
        <line x1="904" y1="196" x2="904" y2="274" />
        <line x1="926" y1="196" x2="926" y2="274" />
        <line x1="948" y1="196" x2="948" y2="274" />
      </g>
      <g fill="#FF9466" opacity="0.6">
        <rect x="898" y="206" width="12" height="2.5" />
        <rect x="920" y="214" width="12" height="2.5" />
        <rect x="942" y="204" width="10" height="2.5" />
        <rect x="898" y="226" width="9" height="2.5" />
        <rect x="942" y="250" width="12" height="2.5" />
        <rect x="898" y="258" width="11" height="2.5" />
      </g>
      {/* Main.dc.html: a jammed line in the rack while a writer is stuck */}
      {jammed && <rect className="at-blink" x="918" y="238" width="16" height="3" fill="#FF4D5E" />}
      <g fill="#FF9466" opacity="0.5">
        <circle cx="734" cy="292" r="1.8" />
        <circle cx="764" cy="292" r="1.8" />
        <circle cx="916" cy="292" r="1.8" />
        <circle cx="946" cy="292" r="1.8" />
      </g>
    </g>
  );
}

function Hangar({ active }: { active: boolean }) {
  const hull = "M100 580 H390 Q410 580 410 600 V730 Q410 750 390 750 H100 L62 716 V614 Z";
  return (
    <g>
      {active && <path d={hull} fill="none" stroke="#B5F2C6" strokeOpacity="0.5" strokeWidth="8" filter="url(#mSoft)" />}
      <path d={hull} fill="#18231D" stroke={active ? "#B5F2C6" : "#35483E"} strokeOpacity={active ? 0.8 : 1} strokeWidth="2" />
      <path d="M112 596 H386 Q394 596 394 604 V726 Q394 734 386 734 H112 L78 708 V622 Z" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      <line className="at-flow-slow" x1="86" y1="626" x2="86" y2="704" stroke="#7BE495" strokeWidth="2" strokeDasharray="3 9" opacity="0.7" />
      <line x1="94" y1="626" x2="94" y2="704" stroke="#7BE495" strokeOpacity="0.25" />
      <line x1="104" y1="718" x2="386" y2="718" stroke="#2D3E35" strokeWidth="2" />
      <path d="M140 690 H372 C386 690 390 680 390 666 V604" fill="none" stroke="#35483E" strokeWidth="3" strokeLinecap="round" />
      <g fill="#35483E">
        <rect x="168" y="690" width="4" height="28" />
        <rect x="278" y="690" width="4" height="28" />
      </g>
      <g fill="#7BE495" opacity={active ? 0.7 : 0.5}>
        {[140, 200, 260, 320].map((x, i) => (
          <circle key={x} className={active ? "at-twinkle" : undefined} style={{ animationDelay: `${i * 0.4}s` }} cx={x} cy="604" r={active ? 2 : 1.8} />
        ))}
      </g>
      {active && <path className="at-flow" d="M60 664 C90 664 110 672 150 672" fill="none" stroke="#7BE495" strokeWidth="1.5" strokeDasharray="3 9" opacity="0.8" />}
      {/* package shadows on the dock rail; the packages themselves are draggable DOM (Station) */}
      {HANGAR.slots.map(({ x }) => (
        <ellipse key={x} cx={x} cy={688} rx="12" ry="3" fill="#5F7A69" opacity="0.18" />
      ))}
      {/* the courier at the dock */}
      <g className="at-bob" style={{ animationDuration: "3.6s" }}>
        <ellipse cx="-4" cy="668" rx="16" ry="6" fill="#7BE495" opacity="0.45" filter="url(#mSoft)" />
        <path d="M0 668 L22 652 H48 L60 668 L48 684 H22 Z" fill="#1E2A24" stroke="#6F8577" strokeWidth="1.5" />
        <path d="M40 658 H50 L55 668 H40 Z" fill="#7BE495" opacity="0.6" />
        <circle className="at-blink" cx="28" cy="676" r="1.8" fill="#FF9466" />
      </g>
    </g>
  );
}

function Pods({ occupied }: { occupied: number }) {
  return (
    <g>
      <g fill="none" stroke="#35483E" strokeWidth="5" strokeLinecap="round">
        <path d="M716 572 C712 556 706 546 702 532" />
        <path d="M996 572 C1000 556 1006 546 1010 534" />
      </g>
      <circle className="at-twinkle" cx="702" cy="530" r="4" fill="#7BE495" />
      <circle className="at-twinkle" style={{ animationDelay: "1.2s" }} cx="1010" cy="532" r="4" fill="#7BE495" />
      <rect x="690" y="570" width="320" height="160" rx="26" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x="704" y="584" width="292" height="132" rx="16" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      {PODS.rects.map((r, i) => {
        const on = i < occupied;
        return (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="30" fill="#7BE495" fillOpacity={on ? 0.07 : 0.03} stroke="#7BE495" strokeOpacity={on ? 0.7 : 0.3} strokeWidth="1.5" />
            <ellipse cx={r.x + r.w / 2} cy="700" rx="26" ry="4" fill="#7BE495" opacity={on ? 0.3 : 0.1} />
          </g>
        );
      })}
    </g>
  );
}

/* ---------- scaling to 12 agents (VisualSystem §07; drawn in the module language of the mockup) ---------- */

/** "Czwarty agent tej roli dobudowuje aneks obok swojej strefy — stacja rośnie na zewnątrz jak rafa." */
function Annex({ slot, role, working }: { slot: ExpansionSlot; role: Role; working: boolean }) {
  const c = ROLE_HEX[role];
  const r = slot.rect;
  return (
    <g>
      <path d={slot.connector} fill="none" stroke={c} strokeOpacity={working ? 0.9 : 0.35} strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" className={working ? "at-flow" : undefined} />
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x={r.x + 12} y={r.y + 12} width={r.w - 24} height={r.h - 24} rx="14" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      <g fill={c} opacity="0.5">
        <circle cx={r.x + 24} cy={r.y + r.h - 6} r="1.8" />
        <circle cx={r.x + r.w - 24} cy={r.y + r.h - 6} r="1.8" />
      </g>
      <circle className="at-twinkle" cx={r.x + r.w / 2} cy={r.y + 4} r="3" fill={c} />
    </g>
  );
}

/** "Kapsuły Regeneracji rosną o 3 kapsuły." */
function PodsII({ occupied }: { occupied: number }) {
  const r = PODS_II.rect;
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="24" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x={r.x + 8} y={r.y + 8} width={r.w - 16} height={r.h - 16} rx="16" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      {PODS_II.rects.map((p, i) => {
        const on = i < occupied;
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="28" fill="#7BE495" fillOpacity={on ? 0.07 : 0.03} stroke="#7BE495" strokeOpacity={on ? 0.7 : 0.3} strokeWidth="1.5" />
            <ellipse cx={p.x + p.w / 2} cy={p.y + p.h - 8} rx="22" ry="3.5" fill="#7BE495" opacity={on ? 0.3 : 0.1} />
          </g>
        );
      })}
    </g>
  );
}

/* ---------- NOT IN THE MOCKUP: modules for the added roles, drawn in the same construction language ---------- */

function Workshop() {
  const c = ROLE_HEX.developer;
  return (
    <g>
      <g fill="none" stroke="#35483E" strokeWidth="5" strokeLinecap="round">
        <path d="M70 358 C66 340 60 330 58 318" />
        <path d="M190 358 C194 340 200 330 202 320" />
      </g>
      <circle className="at-twinkle" cx="58" cy="316" r="4" fill={c} />
      <circle className="at-twinkle" style={{ animationDelay: "1.1s" }} cx="202" cy="318" r="4" fill={c} />
      <rect x="30" y="356" width="200" height="140" rx="26" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x="46" y="372" width="168" height="108" rx="16" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      {/* workbench with code blocks */}
      <line x1="56" y1="468" x2="204" y2="468" stroke="#2D3E35" strokeWidth="2" />
      <g fill={c} opacity="0.45">
        <rect x="60" y="382" width="16" height="2.5" />
        <rect x="80" y="382" width="10" height="2.5" />
        <rect x="64" y="389" width="22" height="2.5" />
        <rect x="170" y="382" width="24" height="2.5" />
        <rect x="178" y="389" width="12" height="2.5" />
      </g>
      <g fill={c} opacity="0.5">
        <circle cx="64" cy="486" r="1.8" />
        <circle cx="94" cy="486" r="1.8" />
        <circle cx="166" cy="486" r="1.8" />
        <circle cx="196" cy="486" r="1.8" />
      </g>
    </g>
  );
}

function ReviewTower() {
  const c = ROLE_HEX.reviewer;
  return (
    <g>
      <path d="M990 356 V322" stroke="#35483E" strokeWidth="5" strokeLinecap="round" />
      <path d="M972 330 L990 312 L1008 330" fill="none" stroke={c} strokeOpacity="0.55" strokeWidth="1.5" />
      <circle className="at-twinkle" cx="990" cy="310" r="4" fill={c} />
      <rect x="890" y="356" width="200" height="140" rx="26" fill="#18231D" stroke="#35483E" strokeWidth="2" />
      <rect x="906" y="372" width="168" height="108" rx="16" fill="#090E0B" stroke="#25332B" strokeWidth="1.5" />
      {/* stacks of reviewed pages and a seal */}
      <g stroke={c} strokeOpacity="0.45" strokeWidth="1.2" fill="none">
        <rect x="1048" y="380" width="18" height="24" rx="2" />
        <path d="M1052 387 H1062 M1052 392 H1060 M1052 397 H1062" />
        <circle cx="1057" cy="460" r="8" />
        <path d="M1053 460 L1056 463 L1061 457" />
      </g>
      <g fill={c} opacity="0.5">
        <circle cx="924" cy="486" r="1.8" />
        <circle cx="954" cy="486" r="1.8" />
        <circle cx="1026" cy="486" r="1.8" />
        <circle cx="1056" cy="486" r="1.8" />
      </g>
    </g>
  );
}
