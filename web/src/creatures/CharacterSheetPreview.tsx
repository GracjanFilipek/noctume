import { ROLES, type Role } from "@agent-tycoon/shared";
import { Creature } from "./Creature.tsx";
import type { Form, VisualState } from "./types.ts";
import { RoleGlyph } from "../ui/icons.tsx";
import { ZONES } from "../ui/roles.ts";

/**
 * Dev page (/#arkusz): every creature rendered by <Creature>, laid out like design/agent-tycoon/CharacterSheet
 * so it can be screenshotted and compared with the mockup.
 */
const STATES: { id: VisualState; label: string; card: string; border: string; stage: string }[] = [
  { id: "idle", label: "BEZCZYNNY", card: "#0F1512", border: "#1F2B24", stage: "#0A0F0C" },
  { id: "working", label: "PRACUJE", card: "#0F1512", border: "#1F2B24", stage: "#0A0F0C" },
  { id: "stuck", label: "UTKNĄŁ", card: "#170C0E", border: "#5A1E26", stage: "#110A0C" },
  { id: "success", label: "SUKCES", card: "#16110A", border: "#5A4318", stage: "#0F0E0A" },
  { id: "failure", label: "PORAŻKA", card: "#111412", border: "#2A302C", stage: "#0C0F0D" },
];
const FORMS: { form: Form; label: string; levels: string }[] = [
  { form: 1, label: "FORMA I", levels: "poziom 1–2" },
  { form: 2, label: "FORMA II", levels: "poziom 3–4" },
  { form: 3, label: "FORMA III", levels: "poziom 5+" },
];
const ADDED: Role[] = ["developer", "reviewer"];

export function CharacterSheetPreview() {
  const roles = Object.keys(ROLES) as Role[];
  return (
    <div className="sheet">
      <div className="sheet-head">
        <h1>Arkusz postaci</h1>
        <p>
          5 ról × 5 stanów + ewolucja, renderowane komponentem &lt;Creature&gt;. Developer i Recenzent nie ma w makiecie — narysowane w tym
          samym stylu.
        </p>
      </div>
      <div className="sheet-row sheet-cols">
        <div className="sheet-rolecol" />
        {STATES.map((s) => (
          <div key={s.id} className="sheet-col">
            {s.label}
          </div>
        ))}
        <div className="sheet-gap" />
        {FORMS.map((f) => (
          <div key={f.form} className="sheet-col narrow">
            {f.label}
            <span>{f.levels}</span>
          </div>
        ))}
      </div>
      {roles.map((role) => (
        <div key={role} className="sheet-row">
          <div className="sheet-rolecol">
            <div className="sheet-role">
              <RoleGlyph role={role} size={12} />
              {ROLES[role].label}
            </div>
            <span>Strefa: {ZONES[role].name}</span>
            {ADDED.includes(role) && <span className="sheet-added">spoza makiety</span>}
          </div>
          {STATES.map((s) => (
            <div key={s.id} className="sheet-card" style={{ background: s.card, borderColor: s.border }}>
              <div className="sheet-stage" style={{ background: s.stage }}>
                <div style={{ position: "absolute", left: 23, top: 52 }}>
                  <Creature role={role} state={s.id} size={112} />
                </div>
              </div>
            </div>
          ))}
          <div className="sheet-gap">
            <div />
          </div>
          {FORMS.map((f) => (
            <div key={f.form} className="sheet-card narrow">
              <div className="sheet-stage narrow">
                <div style={{ position: "absolute", left: 17, top: 60 }}>
                  <Creature role={role} state="working" form={f.form} size={104} effects={false} sign={false} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
