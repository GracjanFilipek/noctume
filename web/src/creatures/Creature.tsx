import type { Role } from "@agent-tycoon/shared";
import { Sign } from "./common.tsx";
import { analyst, researcher, writer } from "./designed.tsx";
import { developer, reviewer } from "./added.tsx";
import type { Form, RoleArt, VisualState } from "./types.ts";

const ART: Record<Role, RoleArt> = { researcher, writer, analyst, developer, reviewer };

/** Loop per state (one loop = one state): idle drifts, working bobs, stuck glitches in steps. */
const MOTION: Partial<Record<VisualState, string>> = { idle: "at-drift", working: "at-bob", stuck: "at-glitch" };

interface Props {
  role: Role;
  state: VisualState;
  form?: Form;
  /** Sprite size in px (map 84, card 62, list 50, sheet 112). Sylwetki czytelne od 48 px. */
  size?: number;
  /** Role effects around the sprite (beam, glyphs, chart, burst, smoke). Off for avatars. */
  effects?: boolean;
  /** State sign over the head. Off when the host draws it in the DOM label layer. */
  sign?: boolean;
  title?: string;
}

/**
 * An agent's creature: role × state (CSS class) × form. The state is swapped by class, not by redrawing
 * from scratch; effects share the CharacterSheet card frame (158×190, sprite at 23,52 size 112).
 */
export function Creature({ role, state, form = 1, size = 84, effects = true, sign = true, title }: Props) {
  const art = ART[role];
  const k = size / 112;
  const frame = { left: -23 * k, top: -52 * k, width: 158 * k, height: 190 * k };
  return (
    <div
      className={`creature st-${state}`}
      style={{ width: size, height: size, "--role": `var(--role-${role})` } as React.CSSProperties}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {effects && (
        <svg className="creature-fx" style={frame} viewBox="0 0 158 190">
          <defs>
            <linearGradient id="crBeamIce" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8FD8EA" stopOpacity="0.75" />
              <stop offset="1" stopColor="#8FD8EA" stopOpacity="0" />
            </linearGradient>
          </defs>
          {art.back?.(state)}
        </svg>
      )}
      <div className="creature-sprite">
        <div className={MOTION[state]} style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 64 64" overflow="visible">
            {art.body(form, state)}
          </svg>
        </div>
      </div>
      {(effects || sign) && (
        <svg className="creature-fx" style={frame} viewBox="0 0 158 190">
          {effects && art.front?.(state)}
          {sign && <Sign state={state} />}
        </svg>
      )}
    </div>
  );
}
