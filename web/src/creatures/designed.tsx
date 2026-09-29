/**
 * Researcher, Writer and Analyst — paths verbatim from design/agent-tycoon/CharacterSheet.dc.html.
 * The state drawings in the sheet are Forma I; Forms II/III add the parts shown in the evolution columns.
 */
import { Burst, Scanlines, Shadow, SmokeAndSparks } from "./common.tsx";
import { C, type RoleArt } from "./types.ts";

/* ================= RESEARCHER — levitating scanner drone ================= */

export const researcher: RoleArt = {
  body(form, state) {
    const lens = state === "stuck" ? C.red : C.ice;
    const tip = state === "stuck" ? C.red : state === "success" ? C.amber : C.ice;
    const dim = state === "idle";
    const broken = state === "failure";
    return (
      <>
        {form === 3 && (
          <>
            <ellipse cx="32" cy="33" rx="30" ry="23" fill="none" stroke={C.ice} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M11 40 L2 45 L8 46 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="0.8" />
            <path d="M53 40 L62 45 L56 46 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="0.8" />
          </>
        )}
        <path d="M15 31 L3 25 L6 36 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="1" />
        <path d="M49 31 L61 25 L58 36 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="1" />
        <ellipse cx="32" cy="33" rx="18" ry="14" fill={C.hull} stroke={C.metal} strokeWidth="1.5" />
        <path d="M19 28 Q32 15 45 28" fill="none" stroke={C.pale} strokeWidth="1.5" strokeLinecap="round" />
        {form === 3 && <circle cx="32" cy="35" r="11" fill="none" stroke={C.ice} strokeOpacity="0.6" />}
        <circle cx="32" cy="35" r="8.5" fill={C.lens} stroke={lens} strokeWidth="2" />
        {broken ? (
          <path d="M28 31 L36 39 M36 31 L28 39" stroke={C.metal} strokeWidth="1.5" />
        ) : (
          <circle cx="32" cy="35" r="4.5" fill={lens} opacity={dim ? 0.5 : 1} />
        )}
        {!dim && !broken && state !== "stuck" && <circle cx="30.2" cy="33.2" r="1.4" fill={C.white} />}
        {broken ? (
          <line x1="32" y1="19" x2="30" y2="11" stroke={C.metal} strokeWidth="1.5" />
        ) : (
          <>
            <line x1="32" y1="19" x2="32" y2="10" stroke={C.metal} strokeWidth="1.5" />
            <circle cx="32" cy="9" r="2.2" fill={tip} opacity={dim ? 0.5 : 1} />
          </>
        )}
        {form >= 2 && !broken && (
          <>
            <circle cx="18.5" cy="37" r="1.6" fill={C.ice} />
            <circle cx="45.5" cy="37" r="1.6" fill={C.ice} />
            <line x1="40" y1="21" x2="45" y2="14" stroke={C.metal} strokeWidth="1.2" />
            <circle cx="45.5" cy="13.5" r="1.5" fill={C.text} />
          </>
        )}
        {form === 3 && !broken && (
          <>
            <line x1="24" y1="21" x2="19" y2="14" stroke={C.metal} strokeWidth="1.2" />
            <circle cx="18.5" cy="13.5" r="1.5" fill={C.text} />
            <circle cx="58" cy="10" r="2.2" fill={C.iceSoft} />
            <ellipse cx="58" cy="10" rx="4.5" ry="1.5" fill="none" stroke={C.iceSoft} strokeWidth="0.8" />
          </>
        )}
        {!broken && (
          <path d="M25 46 L32 51 L39 46" fill="none" stroke={C.ice} strokeWidth="1.5" strokeLinecap="round" opacity={dim || state === "stuck" ? 0.4 : 0.7} />
        )}
      </>
    );
  },
  back(state) {
    return (
      <>
        {state === "working" && <polygon className="at-beam" points="79,110 50,184 108,184" fill="url(#crBeamIce)" />}
        {state === "stuck" && <polygon points="79,110 60,170 98,170" fill={C.red} opacity="0.12" />}
        <Shadow state={state} color={C.ice} rx={30} />
        {state === "success" && <Burst />}
      </>
    );
  },
  front(state) {
    if (state === "working")
      return (
        <g fill={C.iceSoft}>
          <rect className="at-rise" x="64" y="168" width="3" height="3" />
          <rect className="at-rise" style={{ animationDelay: ".8s" }} x="88" y="172" width="3" height="3" />
          <rect className="at-rise" style={{ animationDelay: "1.6s" }} x="76" y="160" width="2.5" height="2.5" />
        </g>
      );
    if (state === "stuck") return <Scanlines rows={[[36, 96, 90, 4], [46, 124, 70, 3], [30, 142, 50, 3]]} />;
    if (state === "failure") return <SmokeAndSparks />;
    return null;
  },
};

/* ================= WRITER — slender being with holographic feathers ================= */

const FEATHERS = {
  normal: ["M29 27 C20 22 14 13 14 4 C19 11 25 17 31 24 Z", "M35 27 C44 22 50 13 50 4 C45 11 39 17 33 24 Z"],
  folded: ["M29 27 C22 24 18 18 17 10 C21 15 25 19 31 24 Z", "M35 27 C42 24 46 18 47 10 C43 15 39 19 33 24 Z"],
  spread: ["M29 27 C18 22 10 12 8 2 C16 10 24 16 31 24 Z", "M35 27 C46 22 54 12 56 2 C48 10 40 16 33 24 Z"],
  drooped: ["M29 28 C22 30 16 34 12 40 C18 35 24 32 30 30 Z", "M35 28 C42 30 48 34 52 40 C46 35 40 32 34 30 Z"],
};

export const writer: RoleArt = {
  body(form, state) {
    const pose = state === "idle" ? "folded" : state === "success" ? "spread" : state === "failure" ? "drooped" : "normal";
    const [left, right] = FEATHERS[pose];
    const opL = state === "working" || state === "success" ? 0.35 : state === "idle" || state === "failure" ? 0.2 : 0.28;
    const opR = state === "working" || state === "success" ? 0.3 : state === "idle" || state === "failure" ? 0.16 : 0.22;
    const accent = state === "stuck" ? C.red : state === "success" ? C.amber : C.coral;
    const dim = state === "idle";
    // The sheet draws the stylus arm while writing (and frozen mid-sentence when stuck), not at rest.
    const withStylus = state === "working" || state === "stuck";
    return (
      <>
        {form === 3 && (
          <>
            <ellipse cx="32" cy="32" rx="30" ry="31" fill="none" stroke={C.coral} strokeOpacity="0.35" strokeDasharray="3 3" />
            <path d="M28 30 C16 30 8 24 4 16 C12 22 20 25 29 27 Z" fill={C.coral} fillOpacity="0.22" stroke={C.coral} strokeWidth="0.9" />
            <path d="M36 30 C48 30 56 24 60 16 C52 22 44 25 35 27 Z" fill={C.ice} fillOpacity="0.2" stroke={C.ice} strokeWidth="0.9" />
          </>
        )}
        <path d={left} fill={C.coral} fillOpacity={opL} stroke={C.coral} strokeWidth="1" />
        <path d={right} fill={C.ice} fillOpacity={opR} stroke={C.ice} strokeWidth="1" />
        {form >= 2 && state !== "failure" && (
          <>
            <path d="M30 25 C24 18 22 10 24 2 C26 10 28 16 31.5 22 Z" fill={C.coral} fillOpacity="0.35" stroke={C.coral} strokeWidth="0.9" />
            <path d="M34 25 C40 18 42 10 40 2 C38 10 36 16 32.5 22 Z" fill={C.ice} fillOpacity="0.3" stroke={C.ice} strokeWidth="0.9" />
          </>
        )}
        <path d="M32 22 C39 27 38 42 32 57 C26 42 25 27 32 22 Z" fill={C.hull} stroke={C.pale} strokeWidth="1.3" />
        {form === 3 && <circle cx="32" cy="15" r="10" fill="none" stroke={C.coral} strokeOpacity="0.7" strokeDasharray="1.5 2.5" />}
        <circle cx="32" cy="15" r="6.5" fill="#26342D" stroke={C.pale} strokeWidth="1.3" />
        {state === "failure" ? (
          <path d="M29 13 L35 17 M35 13 L29 17" stroke={C.pale} strokeWidth="1.3" />
        ) : (
          <path d="M28.5 15 H35.5" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity={dim ? 0.5 : 1} />
        )}
        {state !== "failure" && <circle cx="32" cy="33" r="2.2" fill={state === "stuck" ? C.red : C.coral} opacity={dim ? 0.5 : 1} />}
        {form >= 2 && state !== "failure" && (
          <>
            <circle cx="32" cy="40" r="1.4" fill={C.coral} />
            <circle cx="32" cy="46" r="1.1" fill={C.coral} opacity={form === 3 ? 1 : 0.8} />
          </>
        )}
        {withStylus && (
          <>
            <path d="M34 30 C40 33 43 37 45 42" fill="none" stroke={C.pale} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M45 42 L50 36" stroke={C.coral} strokeWidth="1.6" strokeLinecap="round" />
            {state === "working" && <circle cx="50.5" cy="35.5" r="1.5" fill={C.white} />}
          </>
        )}
      </>
    );
  },
  back(state) {
    return (
      <>
        <Shadow state={state} color={C.coral} rx={24} />
        {state === "working" && (
          <g stroke={C.coral} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="32">
            <path className="at-write" d="M114 92 H146" />
            <path className="at-write" style={{ animationDelay: ".5s" }} d="M114 102 H142" />
            <path className="at-write" style={{ animationDelay: "1s" }} d="M114 112 H136" />
          </g>
        )}
        {state === "stuck" && (
          <>
            <g stroke={C.dim} strokeWidth="2.5" strokeLinecap="round">
              <path d="M114 92 H146" />
              <path d="M114 102 H124" />
            </g>
            <path d="M126 102 H134" stroke={C.red} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {state === "success" && <Burst />}
      </>
    );
  },
  front(state) {
    if (state === "stuck") return <Scanlines rows={[[40, 90, 80, 4], [50, 122, 60, 3], [36, 146, 44, 3]]} />;
    if (state === "failure") return <SmokeAndSparks />;
    return null;
  },
};

/* ================= ANALYST — crystal construct projecting charts ================= */

const SHARDS = {
  normal: ["11,30 15,26 18,33 14,37", "50,27 54,31 51,38 47,34"],
  close: ["17,34 20,31 22,36 19,38", "45,31 48,34 46,38 43,35"],
  out: ["8,30 12,26 15,33 11,37", "53,25 57,29 54,36 50,32"],
  burst: ["5,28 9,24 12,31 8,35", "56,23 60,27 57,34 53,30"],
};

export const analyst: RoleArt = {
  body(form, state) {
    const shards = state === "idle" ? SHARDS.close : state === "working" ? SHARDS.out : state === "success" ? SHARDS.burst : SHARDS.normal;
    const broken = state === "failure";
    const coreR = state === "success" ? 3.2 : form === 3 ? 3.2 : form === 2 ? 2.8 : 2.6;
    const core = state === "stuck" ? C.red : state === "success" ? "#FFE2A8" : "#EEE6FF";
    return (
      <>
        {form === 3 && !broken && (
          <ellipse cx="32" cy="34" rx="24" ry="13" transform="rotate(-25 32 34)" fill="none" stroke={C.amethyst} strokeOpacity="0.35" />
        )}
        <polygon points="32,8 43,22 40,46 32,55 24,46 21,22" fill="#2A2442" stroke={C.amethyst} strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points="32,8 43,22 32,28 21,22" fill="#4E3F7A" opacity="0.85" />
        <polygon points="32,28 40,46 32,55" fill="#1C1830" />
        {state !== "stuck" && !broken && form === 1 && (
          <line x1="32" y1="28" x2="32" y2="55" stroke={C.amethyst} strokeWidth="0.8" opacity="0.6" />
        )}
        {form >= 2 && !broken && (
          <path d="M24 22 L32 34 L40 22 M32 34 L26 46 M32 34 L38 46" fill="none" stroke={C.amethyst} strokeWidth="0.7" opacity={form === 3 ? 0.7 : 0.6} />
        )}
        {state === "stuck" && <path d="M27 18 L33 30 L29 40" fill="none" stroke={C.red} strokeWidth="1.2" />}
        {broken ? (
          <path d="M26 14 L34 28 L28 42 L33 52" fill="none" stroke="#070907" strokeWidth="1.6" />
        ) : (
          <circle cx="32" cy="34" r={coreR} fill={core} opacity={state === "idle" ? 0.5 : 1} />
        )}
        {form === 3 && !broken && (
          <>
            <polygon points="25,6 27,1 29,6" fill={C.amethyst} />
            <polygon points="30,5 32,-1 34,5" fill="#DCD0FF" />
            <polygon points="35,6 37,1 39,6" fill={C.amethyst} />
          </>
        )}
        {!broken && (
          <>
            <polygon points={shards[0]} fill="#2A2442" stroke={C.amethyst} strokeWidth="1" />
            <polygon points={shards[1]} fill="#2A2442" stroke={C.amethyst} strokeWidth="1" />
          </>
        )}
        {form >= 2 && !broken && (
          <>
            <polygon points="13,14 17,11 19,17 15,19" fill="#2A2442" stroke={C.amethyst} strokeWidth="1" />
            <polygon points="48,46 52,44 53,50 49,52" fill="#2A2442" stroke={C.amethyst} strokeWidth="1" />
          </>
        )}
        {form === 3 && !broken && (
          <ellipse cx="32" cy="34" rx="30" ry="8" fill="none" stroke={C.amethyst} strokeOpacity="0.55" strokeDasharray="3 2" />
        )}
      </>
    );
  },
  back(state) {
    return (
      <>
        <Shadow state={state} color={C.amethyst} rx={26} />
        {state === "working" && (
          <>
            <path d="M79 66 L100 58 M79 66 L150 58" stroke={C.amethyst} strokeOpacity="0.35" />
            <rect x="100" y="18" width="50" height="40" rx="4" fill={C.amethyst} fillOpacity="0.07" stroke={C.amethyst} strokeOpacity="0.6" />
            <g fill={C.amethyst}>
              <rect className="at-bar" x="106" y="42" width="6" height="12" />
              <rect className="at-bar" style={{ animationDelay: ".3s" }} x="116" y="34" width="6" height="20" />
              <rect className="at-bar" style={{ animationDelay: ".6s" }} x="126" y="38" width="6" height="16" />
              <rect className="at-bar" style={{ animationDelay: ".9s" }} x="136" y="28" width="6" height="26" />
            </g>
          </>
        )}
        {state === "stuck" && (
          <>
            <rect x="104" y="64" width="46" height="34" rx="4" fill="none" stroke={C.dim} strokeOpacity="0.6" />
            <path d="M118 74 L136 90 M136 74 L118 90" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {state === "failure" && (
          <>
            <polygon points="40,166 46,160 50,168" fill="#3A3F3A" />
            <polygon points="112,170 118,164 121,172" fill="#3A3F3A" />
          </>
        )}
        {state === "success" && <Burst />}
      </>
    );
  },
  front(state) {
    if (state === "stuck") return <Scanlines rows={[[40, 94, 80, 4], [48, 126, 60, 3], [36, 148, 44, 3]]} />;
    if (state === "failure") return <SmokeAndSparks />;
    return null;
  },
};
