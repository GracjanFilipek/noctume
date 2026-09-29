import type { Agent } from "@agent-tycoon/shared";
import { RoleGlyph } from "../ui/icons.tsx";

interface Props {
  agents: Agent[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/** Click agents to build an ordered team. Workers go in click order; reviewers always review at the end. */
export function TeamPicker({ agents, value, onChange, disabled }: Props) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const team = value.map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => !!a);
  const workers = team.filter((a) => a.role !== "reviewer");
  const reviewers = team.filter((a) => a.role === "reviewer");

  return (
    <div className="stack-6">
      <div className="chips">
        {agents.map((a) => {
          const selected = value.includes(a.id);
          const index = workers.indexOf(a);
          return (
            <button
              type="button"
              key={a.id}
              disabled={disabled}
              aria-pressed={selected}
              className={`chip ${selected ? "selected" : ""}`}
              style={{ "--role": `var(--role-${a.role})` } as React.CSSProperties}
              onClick={() => toggle(a.id)}
            >
              {selected && <span className="chip-num">{a.role === "reviewer" ? "R" : index + 1}</span>}
              <RoleGlyph role={a.role} />
              {a.name}
            </button>
          );
        })}
        {agents.length === 0 && <span className="caption-sm text-3">Najpierw zatrudnij agentów.</span>}
      </div>
      {team.length > 0 && (
        <span className="caption-sm text-3">
          {workers.map((a) => a.name).join(" → ") || "brak wykonawcy"}
          {reviewers.length > 0 && ` → recenzja: ${reviewers.map((a) => a.name).join(", ")} (maks. 1 runda poprawek)`}
        </span>
      )}
    </div>
  );
}
