import type { Role } from "@agent-tycoon/shared";

/**
 * Station zones per role. Researcher, Writer and Analyst come from the design mockups;
 * Developer (Warsztat) and Reviewer (Wieża Recenzji) are not in the mockups and were added to match.
 */
export const ZONES: Record<Role, { name: string; hint: string }> = {
  researcher: { name: "Obserwatorium", hint: "research" },
  writer: { name: "Kuźnia Słów", hint: "pisanie" },
  analyst: { name: "Rdzeń Analityczny", hint: "analiza" },
  developer: { name: "Warsztat", hint: "kod" },
  reviewer: { name: "Wieża Recenzji", hint: "recenzje" },
};

/** Bunks per work module; a 4th agent of a role builds an annex (stage 6). */
export const BUNKS_PER_MODULE = 3;

export const roleVar = (role: Role) => ({ "--role": `var(--role-${role})` }) as React.CSSProperties;
