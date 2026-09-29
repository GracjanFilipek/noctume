import { useState } from "react";
import { ROLES, TIERS, type ModelTier, type Role, type RunnerKind } from "@agent-tycoon/shared";
import { api } from "../api.ts";
import { RoleGlyph } from "../ui/icons.tsx";
import { ZONES } from "../ui/roles.ts";

const NAMES = ["Vega", "Lira", "Kwarc", "Orion", "Nova", "Iskra", "Tesla", "Echo", "Atlas", "Mira", "Kobalt", "Sonda"];

interface Props {
  runner: RunnerKind;
  onClose: () => void;
  act: (fn: () => Promise<unknown>) => void;
}

/** Hiring: short description → AI-written master prompt (editable) → hire. */
export function HireModal({ runner, onClose, act }: Props) {
  const [name, setName] = useState(() => NAMES[Math.floor(Math.random() * NAMES.length)]);
  const [role, setRole] = useState<Role>("writer");
  const [model, setModel] = useState<ModelTier>("haiku");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const input = { name, role, model, description };

  const generate = () =>
    act(async () => {
      setGenerating(true);
      try {
        const res = await api<{ systemPrompt: string }>("POST", "/agents/generate-prompt", input);
        setPrompt(res.systemPrompt);
      } finally {
        setGenerating(false);
      }
    });

  const hire = () =>
    act(async () => {
      await api("POST", "/agents", { ...input, systemPrompt: prompt });
      onClose();
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div role="dialog" aria-labelledby="hire-title" className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <div className="stack-4">
            <h2 id="hire-title" className="dialog-title">
              Aktywuj moduł
            </h2>
            <span className="caption-sm text-3">Nowy agent zajmie koję w strefie {ZONES[role].name}.</span>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Zamknij">
            ✕
          </button>
        </div>

        <label className="field">
          <span>Imię</span>
          <div className="row-gap-8">
            <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="button" className="btn-ghost" onClick={() => setName(NAMES[Math.floor(Math.random() * NAMES.length)])}>
              Losuj
            </button>
          </div>
        </label>

        <div className="field">
          <span>Rola</span>
          <div className="role-pick">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                className="role-option"
                style={{ "--role": `var(--role-${r})` } as React.CSSProperties}
                onClick={() => setRole(r)}
              >
                <RoleGlyph role={r} size={12} />
                {ROLES[r].label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Poziom</span>
          <select className="select" value={model} onChange={(e) => setModel(e.target.value as ModelTier)}>
            {Object.entries(TIERS).map(([id, t]) => (
              <option key={id} value={id}>
                {t.label} · {id}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Krótki opis — kim ma być, w czym się specjalizuje</span>
          <textarea
            className="input"
            rows={3}
            placeholder="np. Copywriter B2B od finansów i SAP, pisze konkretnie, lubi liczby i case studies, unika korpomowy."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="row-gap-10">
          <button type="button" className="btn-outline" onClick={generate} disabled={generating || !name.trim()}>
            {generating ? "Piszę master prompt…" : prompt ? "Wygeneruj ponownie" : "Wygeneruj master prompt"}
          </button>
          <span className="caption-sm text-3">
            {runner === "claude" ? "Claude (sonnet) napisze prompt z opisu — jedno krótkie wywołanie." : "Tryb Mock: prompt z szablonu, bez wywołania modelu."}
          </span>
        </div>

        <label className="field">
          <span>Rdzeń świadomości · master prompt (możesz edytować)</span>
          <textarea
            className="input mono-prompt"
            rows={10}
            value={prompt}
            placeholder="Wygeneruj albo wpisz sam. Puste = prosty prompt z roli i opisu."
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>

        <div className="row-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="button" className="btn-primary" onClick={hire} disabled={generating || !name.trim()}>
            Zatrudnij
          </button>
        </div>
      </div>
    </div>
  );
}
