/**
 * The server listens on 127.0.0.1, but a web page open in the user's browser can still reach it:
 * - any site can open ws://127.0.0.1/ws (WebSockets are not covered by CORS) or send simple POSTs,
 * - a DNS-rebinding site can make the browser treat the server as its own origin.
 * So every request must name a local Host, and a browser request must come from a local Origin.
 * Requests without Origin come from local tools (curl, scripts), which already have the user's access.
 */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function hostnameOf(hostHeader: string): string {
  // "[::1]:3001" → "[::1]", "localhost:5173" → "localhost"
  const match = hostHeader.trim().toLowerCase().match(/^(\[[^\]]+\]|[^:]+)(?::\d+)?$/);
  return match?.[1] ?? "";
}

export function isLocalRequest(host: string | undefined, origin: string | undefined): boolean {
  if (!host || !LOCAL_HOSTS.has(hostnameOf(host))) return false;
  if (origin === undefined) return true;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false; // includes Origin: null (sandboxed iframes, file://)
  }
}
