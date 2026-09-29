import type { ModelTier, OutputFormat, Role } from "./types.ts";

export const ROLES: Record<Role, { label: string; emoji: string; color: number }> = {
  researcher: { label: "Researcher", emoji: "🔍", color: 0x4fa3ff },
  writer: { label: "Copywriter", emoji: "✍️", color: 0xffb347 },
  developer: { label: "Developer", emoji: "💻", color: 0x7ddc6f },
  analyst: { label: "Analityk", emoji: "📊", color: 0xc38bff },
  reviewer: { label: "Recenzent", emoji: "🧐", color: 0xff6f91 },
};

export const TIERS: Record<ModelTier, { label: string }> = {
  haiku: { label: "Junior" },
  sonnet: { label: "Mid" },
  opus: { label: "Senior" },
};

export const FORMATS: Record<OutputFormat, { label: string; needs?: "pdf" | "docx" }> = {
  auto: { label: "Auto (agent dobiera)" },
  pdf: { label: "PDF", needs: "pdf" },
  docx: { label: "Word (DOCX)", needs: "docx" },
  html: { label: "HTML" },
  md: { label: "Markdown" },
  csv: { label: "CSV (Excel)" },
};

/** Safe default skills. Bash is a premium skill unlocked per agent. */
export const SAFE_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "WebSearch", "WebFetch"];
export const PREMIUM_TOOLS = ["Bash"];
/** Reviewers only ever read, whatever skills they have unlocked. */
export const REVIEW_TOOLS = ["Read", "Glob", "Grep"];

export const OFFICE = { cols: 4, rows: 3 };

export const TOOL_ICONS: Record<string, string> = {
  Read: "📖",
  Write: "✍️",
  Edit: "📝",
  Glob: "🗂️",
  Grep: "🔎",
  WebSearch: "🔍",
  WebFetch: "🌐",
  Bash: "💻",
  StructuredOutput: "📋",
};
