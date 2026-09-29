/**
 * NOT IN THE MOCKUPS — Developer and Reviewer were drawn for this game to match the CharacterSheet style:
 * same 64×64 grid, hull/metal palette, one role light (Kobalt / Magnolia), same state language
 * (idle dims, working glows + role effect, stuck = red light + glitch, success = gold, failure = grey + cross).
 */
import { Burst, Scanlines, Shadow, SmokeAndSparks } from "./common.tsx";
import { C, type RoleArt } from "./types.ts";

/* ================= DEVELOPER — compact construct with a code screen and manipulator arms ================= */

export const developer: RoleArt = {
  body(form, state) {
    const light = state === "stuck" ? C.red : state === "success" ? C.amber : C.cobalt;
    const dim = state === "idle";
    const broken = state === "failure";
    return (
      <>
        {form === 3 && <ellipse cx="32" cy="31" rx="29" ry="28" fill="none" stroke={C.cobalt} strokeOpacity="0.35" strokeDasharray="3 3" />}
        {/* hover base */}
        <path d="M22 51 L26 45 H38 L42 51 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="1" />
        {/* arms: working = raised to the keys, rest = hanging */}
        {state === "working" || state === "stuck" ? (
          <>
            <path d="M18 31 L11 35 L13 40" fill="none" stroke={C.pale} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M46 31 L53 35 L51 40" fill="none" stroke={C.pale} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="13" cy="40" r="1.5" fill={light} />
            <circle cx="51" cy="40" r="1.5" fill={light} />
          </>
        ) : (
          <>
            <path d={broken ? "M18 33 L15 44" : "M18 32 L14 41"} fill="none" stroke={C.pale} strokeWidth="1.3" strokeLinecap="round" />
            <path d={broken ? "M46 33 L50 43" : "M46 32 L50 41"} fill="none" stroke={C.pale} strokeWidth="1.3" strokeLinecap="round" />
          </>
        )}
        {form >= 2 && (
          <>
            <path d="M18 26 L13 28 L15 33 L18 31 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="0.9" />
            <path d="M46 26 L51 28 L49 33 L46 31 Z" fill={C.hullDark} stroke={C.metal} strokeWidth="0.9" />
          </>
        )}
        {/* torso */}
        <rect x="18" y="24" width="28" height="22" rx="6" fill={C.hull} stroke={C.metal} strokeWidth="1.5" />
        <path d="M24 28 H40" stroke={C.pale} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        {broken ? null : <circle cx="32" cy="36" r="2.4" fill={light} opacity={dim ? 0.5 : 1} />}
        {form >= 2 && !broken && (
          <>
            <circle cx="26" cy="36" r="1.2" fill={C.cobalt} />
            <circle cx="38" cy="36" r="1.2" fill={C.cobalt} />
          </>
        )}
        {/* head = screen */}
        {form === 3 && <rect x="18" y="5" width="28" height="20" rx="6" fill="none" stroke={C.cobalt} strokeOpacity="0.6" />}
        <rect x="20" y="7" width="24" height="16" rx="4" fill={C.lens} stroke={light} strokeWidth="1.8" />
        {broken ? (
          <path d="M25 10 L39 20 M39 10 L25 20" stroke={C.metal} strokeWidth="1.5" />
        ) : (
          <>
            <path d="M26.5 11.5 L23.5 15 L26.5 18.5 M37.5 11.5 L40.5 15 L37.5 18.5" fill="none" stroke={light} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity={dim ? 0.5 : 1} />
            {!dim && <rect className={state === "working" ? "at-blink" : undefined} x="30.5" y="13.5" width="3" height="3.2" fill={light} />}
          </>
        )}
        {form >= 2 && !broken && (
          <>
            <line x1="40" y1="7" x2="43" y2="2" stroke={C.metal} strokeWidth="1.2" />
            <circle cx="43.5" cy="1.8" r="1.5" fill={C.text} />
          </>
        )}
        {form === 3 && !broken && (
          <path d="M54 6 L51.5 9.5 L54 13 M58 6 L60.5 9.5 L58 13" fill="none" stroke={C.cobaltSoft} strokeWidth="0.9" strokeLinecap="round" />
        )}
        {!broken && <path d="M27 47.5 H37" stroke={C.cobalt} strokeWidth="1.2" strokeLinecap="round" opacity={dim || state === "stuck" ? 0.4 : 0.7} />}
      </>
    );
  },
  back(state) {
    return (
      <>
        <Shadow state={state} color={C.cobalt} rx={26} />
        {state === "working" && (
          <g fill={C.cobalt}>
            <rect className="at-write-block" x="108" y="88" width="14" height="3" opacity="0.8" />
            <rect className="at-write-block" style={{ animationDelay: ".4s" }} x="126" y="88" width="10" height="3" opacity="0.6" />
            <rect className="at-write-block" style={{ animationDelay: ".8s" }} x="114" y="97" width="22" height="3" opacity="0.8" />
            <rect className="at-write-block" style={{ animationDelay: "1.2s" }} x="114" y="106" width="14" height="3" opacity="0.6" />
            <rect className="at-blink" x="131" y="104.5" width="4" height="6" />
          </g>
        )}
        {state === "stuck" && (
          <>
            <g fill={C.dim}>
              <rect x="108" y="88" width="14" height="3" />
              <rect x="114" y="97" width="22" height="3" />
            </g>
            <rect x="114" y="106" width="8" height="3" fill={C.red} />
          </>
        )}
        {state === "success" && <Burst />}
      </>
    );
  },
  front(state) {
    if (state === "stuck") return <Scanlines rows={[[38, 92, 82, 4], [48, 124, 62, 3], [34, 146, 46, 3]]} />;
    if (state === "failure") return <SmokeAndSparks />;
    return null;
  },
};

/* ================= REVIEWER — hooded sentinel with a monocle eye and a seal ================= */

export const reviewer: RoleArt = {
  body(form, state) {
    const eye = state === "stuck" ? C.red : state === "success" ? C.amber : C.magnolia;
    const dim = state === "idle";
    const broken = state === "failure";
    const sealColor = state === "success" ? C.amber : C.magnolia;
    return (
      <>
        {form === 3 && (
          <>
            <ellipse cx="32" cy="33" rx="28" ry="29" fill="none" stroke={C.magnolia} strokeOpacity="0.35" strokeDasharray="3 3" />
            <path d="M22 11 Q32 1 42 11" fill="none" stroke={C.magnolia} strokeWidth="0.8" strokeDasharray="2 2" />
          </>
        )}
        {form >= 2 && !broken && (
          <>
            <path d="M24 22 L15 15 L19 25 Z" fill={C.magnolia} fillOpacity="0.25" stroke={C.magnolia} strokeWidth="0.9" />
            <path d="M40 22 L49 15 L45 25 Z" fill={C.magnolia} fillOpacity="0.25" stroke={C.magnolia} strokeWidth="0.9" />
          </>
        )}
        {/* cloak */}
        <path d="M32 12 C42 16 46 30 42 54 H22 C18 30 22 16 32 12 Z" fill={C.hull} stroke={C.pale} strokeWidth="1.3" />
        <path d="M24 20 Q32 14 40 20" fill="none" stroke={C.pale} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M26 54 L25 58 M32 54 V59 M38 54 L39 58" stroke={C.metal} strokeWidth="1.2" strokeLinecap="round" />
        {/* monocle eye */}
        <circle cx="32" cy="27" r="7" fill={C.lens} stroke={eye} strokeWidth="1.8" />
        {broken ? (
          <path d="M28.5 23.5 L35.5 30.5 M35.5 23.5 L28.5 30.5" stroke={C.metal} strokeWidth="1.5" />
        ) : (
          <>
            <circle cx="32" cy="27" r="3.2" fill={eye} opacity={dim ? 0.45 : 1} />
            {dim && <path d="M25 27 A7 7 0 0 1 39 27 Z" fill={C.hull} />}
            {!dim && state !== "stuck" && <circle cx="30.8" cy="25.8" r="1" fill={C.white} />}
            <path d="M39 28 C44 33 44 38 41 42" fill="none" stroke={state === "stuck" ? C.red : C.magnolia} strokeWidth="0.9" opacity="0.7" />
          </>
        )}
        {form >= 2 && !broken && (
          <>
            <circle cx="32" cy="39" r="1.2" fill={C.magnolia} />
            <circle cx="32" cy="45" r="1" fill={C.magnolia} opacity="0.8" />
          </>
        )}
        {/* seal */}
        {broken ? (
          <circle cx="20" cy="51" r="4" fill="none" stroke={C.metal} strokeWidth="1.2" />
        ) : (
          <>
            <circle cx="21" cy="42" r="4.5" fill={sealColor} fillOpacity={dim ? 0.12 : 0.22} stroke={sealColor} strokeWidth="1.2" />
            <path d="M19 42 L20.7 43.8 L23.5 40.6" fill="none" stroke={sealColor} strokeWidth="1.1" strokeLinecap="round" opacity={dim ? 0.5 : 1} />
          </>
        )}
        {form === 3 && !broken && (
          <>
            <circle cx="52" cy="12" r="3" fill="none" stroke={C.magnoliaSoft} strokeWidth="0.9" />
            <path d="M50.6 12 L51.7 13.2 L53.6 10.9" fill="none" stroke={C.magnoliaSoft} strokeWidth="0.8" />
          </>
        )}
      </>
    );
  },
  back(state) {
    return (
      <>
        <Shadow state={state} color={C.magnolia} rx={24} />
        {state === "working" && (
          <>
            <rect x="106" y="70" width="34" height="44" rx="3" fill={C.magnolia} fillOpacity="0.07" stroke={C.magnolia} strokeOpacity="0.6" />
            <g stroke={C.magnolia} strokeOpacity="0.45" strokeWidth="1.2">
              <path d="M112 80 H134 M112 86 H130 M112 92 H134" />
            </g>
            <path className="at-write" d="M113 102 L119 108 L133 94" fill="none" stroke={C.magnolia} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="32" />
          </>
        )}
        {state === "stuck" && (
          <>
            <rect x="106" y="70" width="34" height="44" rx="3" fill="none" stroke={C.dim} strokeOpacity="0.6" />
            <path d="M115 84 L131 100 M131 84 L115 100" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {state === "success" && <Burst />}
      </>
    );
  },
  front(state) {
    if (state === "stuck") return <Scanlines rows={[[40, 92, 80, 4], [50, 124, 60, 3], [36, 146, 44, 3]]} />;
    if (state === "failure") return <SmokeAndSparks />;
    return null;
  },
};
