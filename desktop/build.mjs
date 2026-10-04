/**
 * Builds everything the desktop app ships, into desktop/dist:
 *   web/      the UI (vite build)
 *   server.mjs the server, bundled with its dependencies (fastify, ws, …)
 *   main.mjs   the Electron main process
 * The app needs no node_modules at runtime, so electron-builder packs only dist/.
 */
import { execSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(here, "dist");

rmSync(dist, { recursive: true, force: true });

execSync("npm run build -w @agent-tycoon/web", { cwd: root, stdio: "inherit" });
cpSync(path.join(root, "web", "dist"), path.join(dist, "web"), { recursive: true });
// Dock icon when running from source; the packaged app gets its .icns from build/icon.png via electron-builder.
cpSync(path.join(here, "build", "icon.png"), path.join(dist, "icon.png"));

// Bundled CommonJS deps (fastify, ws) call require(); give the ESM bundle a real one.
const banner = { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' };
const common = { bundle: true, platform: "node", format: "esm", target: "node22", banner, logLevel: "warning" };

await build({
  ...common,
  entryPoints: [path.join(root, "server", "src", "app.ts")],
  outfile: path.join(dist, "server.mjs"),
  // optional native speed-ups of ws; it falls back to JS when they are missing
  external: ["bufferutil", "utf-8-validate"],
});

await build({
  ...common,
  entryPoints: [path.join(here, "src", "main.ts")],
  outfile: path.join(dist, "main.mjs"),
  external: ["electron"],
});

console.log("✔ desktop/dist gotowe");
