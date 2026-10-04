/**
 * NOCTUME desktop app: starts the local server inside the Electron main process and shows the UI in a window.
 * Data lives in the per-user folder (~/Library/Application Support/Noctume), not next to the app.
 */
import { app, BrowserWindow, dialog, shell } from "electron";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

interface RunningServer {
  port: number;
  shutdown(): Promise<void>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
let server: RunningServer | undefined;
let win: BrowserWindow | undefined;
let quitting = false;

/**
 * Apps launched from the Dock get a minimal PATH, so `claude` (and `node` for an npm-installed claude)
 * would not be found. Borrow the PATH of the user's login shell, the same one their terminal uses.
 */
function adoptLoginShellPath() {
  if (process.platform === "win32") return;
  try {
    const shellBin = process.env.SHELL || "/bin/zsh";
    const out = execFileSync(shellBin, ["-ilc", 'printf "__NOCTUME_PATH__%s__NOCTUME_PATH__" "$PATH"'], {
      encoding: "utf8",
      timeout: 5000,
    });
    const found = out.match(/__NOCTUME_PATH__(.*)__NOCTUME_PATH__/)?.[1];
    if (found) process.env.PATH = [found, process.env.PATH].filter(Boolean).join(path.delimiter);
  } catch {
    // keep the default PATH; the server also checks the usual install folders
  }
}

async function boot() {
  // From source (npm run desktop) the Dock would show Electron's icon; the packaged app has its own.
  if (process.platform === "darwin" && !app.isPackaged) app.dock?.setIcon(path.join(here, "icon.png"));
  adoptLoginShellPath();
  process.env.NOCTUME_HOME ??= app.getPath("userData");

  // Imported only now: the server reads NOCTUME_HOME when its modules load.
  const { startServer } = (await import(pathToFileURL(path.join(here, "server.mjs")).href)) as {
    startServer: (o: object) => Promise<RunningServer>;
  };
  server = await startServer({ port: 0, staticDir: path.join(here, "web"), handleSignals: false, logger: false });
  const origin = `http://127.0.0.1:${server.port}`;

  win = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    title: "Noctume",
    backgroundColor: "#060907",
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once("ready-to-show", () => win?.show());

  // Result files and anything outside the app open in the default browser / viewer.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  await win.loadURL(origin);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(boot, (err) => {
    dialog.showErrorBox("Noctume nie wystartowała", String(err?.stack ?? err));
    app.quit();
  });

  // Started from a terminal (npm run desktop): Ctrl+C should quit the same careful way as Cmd+Q.
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => app.quit());

  // A tool, not a background service: closing the window ends the session.
  app.on("window-all-closed", () => app.quit());

  // Stop running agents and save the state before the process exits.
  app.on("before-quit", (event) => {
    if (quitting || !server) return;
    event.preventDefault();
    quitting = true;
    server.shutdown().finally(() => app.quit());
  });
}
