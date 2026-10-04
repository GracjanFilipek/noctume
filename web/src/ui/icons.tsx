/**
 * SVG icons copied from the design mockups (design/mockups/*.dc.html).
 * Icons marked "not in mockup" were drawn to match for the Developer and Reviewer roles.
 */
import type { AgentStatus, Role } from "@agent-tycoon/shared";

type P = { size?: number; color?: string };

export const CostIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
    <path d="M3.5 15 A7.5 7.5 0 0 1 18.5 15" fill="none" stroke="#2F4037" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M3.5 15 A7.5 7.5 0 0 1 6.8 8.8" fill="none" stroke="#7BE495" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M11 15 L7.5 10" stroke="#E8EEE4" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="11" cy="15" r="1.6" fill="#E8EEE4" />
  </svg>
);

export const ActiveIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
    {active ? (
      <circle cx="7" cy="11" r="3.5" fill="#7BE495" />
    ) : (
      <circle cx="7" cy="11" r="3.5" fill="none" stroke="#7E8F83" strokeWidth="1.5" strokeDasharray="2 1.5" />
    )}
    <circle cx="15.5" cy="11" r="3.5" fill="none" stroke="#7E8F83" strokeWidth="1.5" strokeDasharray="2 1.5" />
  </svg>
);

export const ChevronUp = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
    <path d="M1 5 L5 1 L9 5" fill="none" stroke="#D7E0D5" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ChevronDown = ({ color = "#D7E0D5" }: P) => (
  <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
    <path d="M1 1 L5 5 L9 1" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const BackIcon = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
    <path d="M6.5 1 L1.5 6 L6.5 11" fill="none" stroke="#D7E0D5" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const MockIcon = () => (
  <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
    <path d="M1 5 Q4 0 7 5 T13 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ClaudeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <circle cx="7" cy="7" r="2.6" fill="currentColor" />
    <circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const ConnectionIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle className="at-ring" cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.2" />
    <circle cx="8" cy="8" r="3.5" fill={color} />
  </svg>
);

export const PlusIcon = ({ color = "#D7E0D5" }: P) => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 1 V9 M1 5 H9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const DormantModuleIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
    <rect x="4" y="8" width="48" height="40" rx="10" fill="none" stroke="#5F7A69" strokeWidth="1.5" strokeDasharray="5 4" />
    <path d="M14 12 V44 M24 12 V44 M34 12 V44 M44 12 V44" stroke="#5F7A69" strokeOpacity="0.2" />
    <path d="M28 20 V36 M20 28 H36" stroke="#D7E0D5" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ---------- agent state signs (12×12 grid) ---------- */

export const IdleSign = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M7.5 1.2 A5 5 0 1 0 10.8 8.2 A4 4 0 0 1 7.5 1.2 Z" fill="#AAB9AE" />
  </svg>
);

export const WorkingSign = ({ size = 12, color = "#7BE495" }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="4.5" fill="none" stroke={color} strokeOpacity="0.3" strokeWidth="1.6" />
    <path className="at-spin-vb" d="M6 1.5 A4.5 4.5 0 0 1 10.5 6" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const StuckSign = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6 1 L11.2 10.5 H0.8 Z" fill="#FF4D5E" />
    <rect x="5.3" y="4" width="1.4" height="3.6" fill="#1A0710" />
    <rect x="5.3" y="8.3" width="1.4" height="1.3" fill="#1A0710" />
  </svg>
);

export const SuccessSign = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill="#FFB547" />
    <path d="M3.8 6 L5.4 7.6 L8.4 4.6" fill="none" stroke="#1A1206" strokeWidth="1.4" />
  </svg>
);

export const FailureSign = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M9.6 3.4 A4.5 4.5 0 1 0 10.5 6.8" fill="none" stroke="#C4C9C2" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7.6 1.6 L10.6 2.6 L9.2 5.2 Z" fill="#C4C9C2" />
  </svg>
);

export const FailedBox = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" role="img" aria-label="nieudane">
    <rect x="0.5" y="0.5" width="11" height="11" rx="3" fill="#3A0E14" stroke="#FF4D5E" />
    <path d="M3.8 3.8 L8.2 8.2 M8.2 3.8 L3.8 8.2" stroke="#FF4D5E" strokeWidth="1.4" />
  </svg>
);

export const PendingDot = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="4" fill="none" stroke="#7E8F83" strokeWidth="1.4" strokeDasharray="2 1.5" />
  </svg>
);

export function StateSign({ status, size = 12, color }: { status: AgentStatus; size?: number; color?: string }) {
  if (status === "stuck") return <StuckSign size={size} />;
  if (status === "working") return <WorkingSign size={size} color={color} />;
  return <IdleSign size={size} />;
}

/* ---------- actions ---------- */

export const ReviveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M11.5 4.5 A5 5 0 1 0 12 8.5" fill="none" stroke="#080C0A" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9.2 2.2 L12.4 3.6 L10.6 6.4 Z" fill="#080C0A" />
  </svg>
);

export const PowerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M4.2 3.6 A5 5 0 1 0 9.8 3.6" fill="none" stroke="#FF8A96" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 1.2 V6.6" stroke="#FF8A96" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const DragHandle = ({ color = "#5E7166" }: P) => (
  <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
    <g fill={color}>
      <circle cx="3" cy="3" r="1.3" />
      <circle cx="7" cy="3" r="1.3" />
      <circle cx="3" cy="8" r="1.3" />
      <circle cx="7" cy="8" r="1.3" />
      <circle cx="3" cy="13" r="1.3" />
      <circle cx="7" cy="13" r="1.3" />
    </g>
  </svg>
);

export const LessonIcon = () => (
  <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
    <path d="M7 1 L12 5 L10 14 L4 14 L2 5 Z" fill="#2C2A1E" stroke="#D9D1B0" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M2 5 H12 M7 1 L7 14" stroke="#D9D1B0" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

/* ---------- roles: 10×10 zone glyphs ---------- */

export function RoleGlyph({ role, size = 10, color }: { role: Role; size?: number; color?: string }) {
  const c = color ?? `var(--role-${role})`;
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
      {role === "researcher" && (
        <>
          <circle cx="5" cy="5" r="4" fill="none" stroke={c} strokeWidth="1.6" />
          <circle cx="5" cy="5" r="1.5" fill={c} />
        </>
      )}
      {role === "writer" && <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill="none" stroke={c} strokeWidth="1.6" />}
      {role === "analyst" && <path d="M5 0.8 L8.8 3 V7 L5 9.2 L1.2 7 V3 Z" fill="none" stroke={c} strokeWidth="1.6" />}
      {/* not in mockup */}
      {role === "developer" && (
        <path d="M3.6 1.6 L1 5 L3.6 8.4 M6.4 1.6 L9 5 L6.4 8.4" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* not in mockup */}
      {role === "reviewer" && (
        <path d="M5 0.9 L8.8 2.4 V5 C8.8 7.2 7.2 8.6 5 9.2 C2.8 8.6 1.2 7.2 1.2 5 V2.4 Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/* ---------- task packages (36×36) ---------- */

export function PackageIcon({ role, size = 36 }: { role?: Role; size?: number }) {
  const c = role ? `var(--role-${role})` : "#5F7A69";
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" style={{ flexShrink: 0 }}>
      {!role && <polygon points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="3 3" />}
      {role === "writer" && (
        <>
          <polygon points="18,3 32,18 18,33 4,18" fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.8" />
          <path d="M12 15 H24 M12 19 H24 M12 23 H19" stroke={c} strokeWidth="1.5" />
        </>
      )}
      {role === "analyst" && (
        <>
          <polygon points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5" fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.6" />
          <path d="M5 10.5 L18 18 L31 10.5 M18 18 V33" fill="none" stroke={c} strokeWidth="1.3" />
        </>
      )}
      {role === "researcher" && (
        <>
          <circle cx="18" cy="18" r="9" fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.8" />
          <ellipse cx="18" cy="18" rx="16" ry="5.5" fill="none" stroke={c} strokeOpacity="0.7" strokeWidth="1.3" />
        </>
      )}
      {/* not in mockup */}
      {role === "developer" && (
        <>
          <rect x="5" y="5" width="26" height="26" rx="5" fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.8" />
          <path d="M14 13 L10 18 L14 23 M22 13 L26 18 L22 23" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {/* not in mockup */}
      {role === "reviewer" && (
        <>
          <path d="M18 3 L30 7.5 V17 C30 25 24.5 30.5 18 33 C11.5 30.5 6 25 6 17 V7.5 Z" fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12.5 18 L16.5 22 L23.5 14" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/* ---------- skills: implants in hexagonal sockets (20×20) ---------- */

const HEX = "M10 1.5 L17.4 5.75 V14.25 L10 18.5 L2.6 14.25 V5.75 Z";

export function SkillIcon({ tool }: { tool: string }) {
  if (tool === "Bash") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 0.8 L12.2 3.8 L17.8 5.2 L16.2 9.2 L17.8 14.6 L12.2 16.2 L10 19.2 L7.8 16.2 L2.2 14.6 L3.8 9.2 L2.2 5.2 L7.8 3.8 Z" fill="none" stroke="#FFB547" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M6.8 7.8 L9 10 L6.8 12.2 M10.2 12.2 H13.4" fill="none" stroke="#FFB547" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d={HEX} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
      {tool === "Read" && <path d="M6 7.2 H8.6 Q10 7.2 10 8.6 V13.2 Q10 12.3 8.6 12.3 H6 Z M14 7.2 H11.4 Q10 7.2 10 8.6 V13.2 Q10 12.3 11.4 12.3 H14 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
      {tool === "Write" && <path d="M6.2 13.8 L7 11 L12.2 5.8 L14.2 7.8 L9 13 Z M11.2 6.8 L13.2 8.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
      {tool === "Edit" && <path d="M6 13.8 H14 M7 11.4 L11.4 7 L13 8.6 L8.6 13 H7 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
      {tool === "Glob" && (
        <>
          <path d="M5.8 7.4 H8.4 L9.4 8.4 H14.2 V13.2 H5.8 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M10 9.6 V12 M8.8 10.8 H11.2" stroke="currentColor" strokeWidth="1.1" />
        </>
      )}
      {tool === "Grep" && (
        <>
          <circle cx="9.2" cy="9.2" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M11.4 11.4 L13.8 13.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {tool === "WebSearch" && (
        <>
          <circle cx="10" cy="10" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6.2 10 H13.8 M10 6.2 Q12.3 10 10 13.8 Q7.7 10 10 6.2" fill="none" stroke="currentColor" strokeWidth="1" />
        </>
      )}
      {tool === "WebFetch" && <path d="M10 5.8 V11.4 M7.6 9.2 L10 11.6 L12.4 9.2 M6.4 13.8 H13.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export const PremiumWarning = () => (
  <svg width="14" height="13" viewBox="0 0 14 13" aria-hidden="true">
    <path d="M7 1 L13 12 H1 Z" fill="#FFB547" />
    <rect x="6.3" y="4.4" width="1.4" height="4" fill="#1A1206" />
    <rect x="6.3" y="9.4" width="1.4" height="1.4" fill="#1A1206" />
  </svg>
);
