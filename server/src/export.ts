import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Capabilities, OutputFormat } from "@agent-tycoon/shared";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
];
const TEXTUTIL = "/usr/bin/textutil";
const CONVERT_TIMEOUT_MS = 60_000;

function chromeBin(): string | undefined {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  return CHROME_CANDIDATES.find((p) => existsSync(p));
}

export function detectCapabilities(): Capabilities {
  return { pdf: !!chromeBin(), docx: existsSync(TEXTUTIL) };
}

/**
 * Turns the agent's HTML deliverable into the requested binary format, next to it in the workspace.
 * Returns the created file name, or undefined when the format needs no conversion.
 */
export async function convertDeliverable(format: OutputFormat, dir: string, source: string): Promise<string | undefined> {
  if (format !== "pdf" && format !== "docx") return undefined;
  const input = path.join(dir, source);
  if (!existsSync(input)) throw new Error(`Brak pliku ${source} do konwersji na ${format.toUpperCase()}.`);
  const outName = source.replace(/\.html?$/i, `.${format}`);
  const output = path.join(dir, outName);
  if (format === "pdf") await htmlToPdf(input, output);
  else await run(TEXTUTIL, ["-convert", "docx", "-output", output, input]);
  return outName;
}

/**
 * Headless Chrome prints to PDF but does not always exit afterwards,
 * so we wait until the PDF exists and stops growing, then stop Chrome ourselves.
 */
async function htmlToPdf(input: string, output: string) {
  const chrome = chromeBin();
  if (!chrome) throw new Error("Nie znaleziono Chrome — eksport PDF niedostępny (ustaw CHROME_BIN).");
  const profile = await mkdtemp(path.join(tmpdir(), "agent-tycoon-chrome-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-pdf-header-footer",
      `--user-data-dir=${profile}`,
      `--print-to-pdf=${output}`,
      pathToFileURL(input).href,
    ],
    { stdio: "ignore" },
  );
  try {
    const deadline = Date.now() + CONVERT_TIMEOUT_MS;
    let lastSize = -1;
    while (Date.now() < deadline) {
      await sleep(300);
      const size = await stat(output).then((s) => s.size, () => -1);
      if (size > 0 && size === lastSize) return;
      lastSize = size;
      if (child.exitCode !== null && size <= 0) break;
    }
    throw new Error("Konwersja do PDF nie powiodła się (Chrome nie wygenerował pliku).");
  } finally {
    child.kill("SIGKILL");
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr!.on("data", (c) => (stderr += c));
    const timer = setTimeout(() => child.kill("SIGKILL"), CONVERT_TIMEOUT_MS);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)}: ${stderr.trim() || `kod ${code}`}`));
    });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
