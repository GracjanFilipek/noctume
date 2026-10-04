/**
 * Screenshots for comparing the game with the design mockups (uses the locally installed Chrome).
 *
 *   node scripts/shots.mjs ref            # render design/mockups/*.dc.html → design/shots/reference-*.png
 *   node scripts/shots.mjs app [--seed]   # screenshot the running game (localhost:5173) → design/shots/app-*.png
 *
 * The .dc.html mockups are templates for a design tool. For a static reference we evaluate their
 * DCLogic class with a stub, substitute {{…}} placeholders and resolve <sc-if> blocks.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DESIGN = path.join(ROOT, "design/mockups");
const OUT = path.join(ROOT, "design/shots");
const APP = process.env.APP_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://127.0.0.1:3001/api";

const [mode = "ref", ...flags] = process.argv.slice(2);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  if (mode === "ref") await references();
  else if (mode === "app") await app(flags.includes("--seed"));
  else throw new Error(`Nieznany tryb: ${mode}`);
} finally {
  await browser.close();
}

async function references() {
  const files = (await readdir(DESIGN)).filter((f) => f.endsWith(".dc.html"));
  for (const file of files) {
    const source = await readFile(path.join(DESIGN, file), "utf8");
    const { html, width, height } = renderTemplate(source);
    const tmp = path.join(OUT, `.${file}`);
    await writeFile(tmp, html);
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`file://${tmp}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const out = path.join(OUT, `reference-${file.replace(".dc.html", "")}.png`);
    await page.screenshot({ path: out });
    await page.close();
    console.log("✔", path.relative(ROOT, out));
  }
}

function renderTemplate(source) {
  const script = source.match(/<script type="text\/x-dc"[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/);
  const props = script ? JSON.parse(script[1]) : {};
  const { width = 1600, height = 900 } = props.$preview ?? {};
  let vals = {};
  if (script) {
    const ctx = { DCLogic: class { constructor() { this.state = {}; } setState() {} }, result: null };
    vm.runInNewContext(`${script[2]}\nresult = new Component().renderVals();`, ctx);
    vals = ctx.result ?? {};
  }
  const lookup = (expr) => {
    const trimmed = expr.trim();
    if (trimmed === "true" || trimmed === "false") return trimmed === "true";
    const value = trimmed.split(".").reduce((o, k) => (o == null ? undefined : o[k]), vals);
    return typeof value === "function" ? "" : value;
  };
  let html = source
    .replace(/<script src="\.\/support\.js"><\/script>/, "")
    .replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, "");
  // <sc-if value="{{x}}"> keeps its children only when x is truthy.
  html = html.replace(/<sc-if value="\{\{([^}]*)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g, (_, expr, body) => (lookup(expr) ? body : ""));
  html = html.replace(/\{\{([^}]*)\}\}/g, (_, expr) => String(lookup(expr) ?? ""));
  // Boolean attributes rendered as strings ("false") would still disable a button.
  html = html.replace(/\sdisabled="(false|)"/g, "");
  return { html, width, height };
}

async function app(seed) {
  if (seed) await seedDemo();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(APP);
  await page.waitForSelector("text=połączono", { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await shot(page, "app-Main");

  const tab = (name) => page.getByRole("button", { name, exact: false }).first();
  await tab("ZADANIA").or(tab("Zadania")).first().click();
  await page.waitForTimeout(400);
  await shot(page, "app-Tasks");

  await tab("AGENCI").or(tab("Agenci")).first().click();
  const stuck = page.locator("[data-agent-status=stuck], .status-stuck").first();
  if (await stuck.count()) {
    await stuck.click();
    await page.waitForTimeout(400);
    await shot(page, "app-AgentDetail");
  }
  await page.close();

  const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await sheet.goto(`${APP}/#arkusz`);
  await sheet.evaluate(() => document.fonts.ready);
  await sheet.waitForTimeout(600);
  const out = path.join(OUT, "app-CharacterSheet.png");
  await sheet.screenshot({ path: out, fullPage: true });
  console.log("✔", path.relative(ROOT, out));
  await sheet.close();
}

async function shot(page, name) {
  const out = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: out });
  console.log("✔", path.relative(ROOT, out));
}

/** Mirrors the mockup cast in Mock mode: Vega working, Lira stuck, Kwarc idle. Resets nothing. */
async function seedDemo() {
  const call = async (method, p, body) => {
    const res = await fetch(`${API}${p}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${method} ${p}: ${data.error}`);
    return data;
  };
  const state = await call("GET", "/state");
  if (state.settings.runner !== "mock") throw new Error("Seed działa tylko w trybie Mock.");
  const byName = Object.fromEntries(state.agents.map((a) => [a.name, a]));
  const hire = async (name, role, model) => byName[name] ?? call("POST", "/agents", { name, role, model, description: "" });
  const vega = await hire("Vega", "researcher", "sonnet");
  const lira = await hire("Lira", "writer", "haiku");
  await hire("Kwarc", "analyst", "sonnet");
  await call("PATCH", "/settings", { maxParallel: 2 });
  const existing = new Set(state.tasks.filter((t) => t.status === "backlog").map((t) => t.title));
  for (const title of ["Artykuł: 5 mitów o agentach AI", "Zestawienie źródeł: regulacje AI w UE", "Opis produktu: moduł Aurora"]) {
    if (!existing.has(title)) await call("POST", "/tasks", { title, brief: "" });
  }
  // Lira fails first (stuck), then Vega starts so she is mid-run when the screenshot is taken.
  await call("POST", "/tasks", { title: "Ping", brief: "[błąd] brak odpowiedzi modelu", assigneeIds: [lira.id], start: true });
  await new Promise((r) => setTimeout(r, 4500));
  await call("POST", "/tasks", { title: "Przegląd rynku narzędzi no-code", brief: "Długie zadanie", assigneeIds: [vega.id], start: true });
  await new Promise((r) => setTimeout(r, 1200));
}
