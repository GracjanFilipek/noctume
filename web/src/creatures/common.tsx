/** Effects and signs shared by every role (CharacterSheet card frame, 158×190). */
import { C, type VisualState } from "./types.ts";

export const Shadow = ({ state, color, rx }: { state: VisualState; color: string; rx: number }) => {
  if (state === "stuck") return <ellipse cx="79" cy="176" rx={rx + 4} ry="4" fill={C.red} opacity="0.3" />;
  if (state === "success") return <ellipse cx="79" cy="176" rx={rx + 6} ry="4" fill={C.amber} opacity="0.35" />;
  if (state === "failure") return <ellipse cx="79" cy="178" rx={rx + 4} ry="4" fill={C.smoke} opacity="0.3" />;
  if (state === "idle") return <ellipse cx="79" cy="176" rx={rx} ry="4" fill="#AAB9AE" opacity="0.15" />;
  return <ellipse cx="79" cy="176" rx={rx + 2} ry="4" fill={color} opacity="0.35" />;
};

/** Success: 700 ms flash — rays and a ring (ease-out). */
export const Burst = () => (
  <>
    <g className="at-burst" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round">
      <path d="M79 52 V68 M79 148 V164 M23 108 H39 M119 108 H135 M40 69 L51 80 M107 136 L118 147 M118 69 L107 80 M51 136 L40 147" />
    </g>
    <circle className="at-ring" cx="79" cy="108" r="46" fill="none" stroke={C.amber} strokeWidth="2" />
  </>
);

/** Failure: smoke and sparks for 900 ms. */
export const SmokeAndSparks = () => (
  <>
    <g fill={C.smoke}>
      <circle className="at-rise" cx="70" cy="80" r="8" opacity="0.55" />
      <circle className="at-rise" style={{ animationDelay: ".8s" }} cx="88" cy="76" r="6" opacity="0.5" />
      <circle className="at-rise" style={{ animationDelay: "1.6s" }} cx="80" cy="70" r="9" opacity="0.4" />
    </g>
    <g className="at-flicker" stroke="#FFF1C9" strokeWidth="2" strokeLinecap="round">
      <path d="M44 104 L36 98 M42 116 L32 118 M118 120 L128 126 M112 96 L122 88" />
    </g>
  </>
);

/** Stuck: RGB-split scanlines, stepped. */
export const Scanlines = ({ rows }: { rows: [number, number, number, number][] }) => (
  <g className="at-flicker">
    <rect x={rows[0][0]} y={rows[0][1]} width={rows[0][2]} height={rows[0][3]} fill={C.red} opacity="0.55" />
    <rect x={rows[1][0]} y={rows[1][1]} width={rows[1][2]} height={rows[1][3]} fill={C.red} opacity="0.45" />
    <rect x={rows[2][0]} y={rows[2][1]} width={rows[2][2]} height={rows[2][3]} fill={C.phosphor} opacity="0.35" />
  </g>
);

/** Sign over the head. Priority is resolved by the caller: stuck › failure › success › idle; working has none. */
export function Sign({ state }: { state: VisualState }) {
  switch (state) {
    case "stuck":
      return (
        <svg x="57" y="16" width="44" height="40" viewBox="0 0 44 40" overflow="visible">
          <circle className="at-ring" cx="22" cy="22" r="16" fill="none" stroke={C.red} strokeWidth="1.5" />
          <g className="at-blink">
            <path d="M22 8 L35 32 H9 Z" fill="#2A0710" stroke={C.red} strokeWidth="2.2" strokeLinejoin="round" />
            <rect x="20.8" y="15" width="2.4" height="9" fill={C.red} />
            <rect x="20.8" y="26.5" width="2.4" height="2.6" fill={C.red} />
          </g>
        </svg>
      );
    case "success":
      return (
        <svg x="67" y="22" width="24" height="24" viewBox="0 0 12 12">
          <path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill={C.amber} />
          <path d="M3.8 6 L5.4 7.6 L8.4 4.6" fill="none" stroke="#1A1206" strokeWidth="1.2" />
        </svg>
      );
    case "failure":
      return (
        <svg x="67" y="20" width="24" height="24" viewBox="0 0 12 12">
          <g className="at-spin-vb">
            <path d="M9.6 3.4 A4.5 4.5 0 1 0 10.5 6.8" fill="none" stroke="#C4C9C2" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M7.6 1.6 L10.6 2.6 L9.2 5.2 Z" fill="#C4C9C2" />
          </g>
        </svg>
      );
    case "idle":
      return (
        <svg x="112" y="42" width="18" height="18" viewBox="0 0 12 12">
          <path d="M7.5 1.2 A5 5 0 1 0 10.8 8.2 A4 4 0 0 1 7.5 1.2 Z" fill="#AAB9AE" />
        </svg>
      );
    default:
      return null;
  }
}
