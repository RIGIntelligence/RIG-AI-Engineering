import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appUrl = process.env.RIG_PLAYWRIGHT_URL || "http://127.0.0.1:8767/";
const proofDir = path.resolve(process.cwd(), ".data/playwright");
const navLabels = [
  "Workbench",
  "Context",
  "Personas",
  "Runs",
  "Proof",
  "Agents",
  "Approvals",
  "Gate Checklist",
  "Audit Log",
  "Catalog v15",
  "Connectors",
  "Integrations",
  "Settings",
];

function labelRegex(label) {
  return new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

async function main() {
  await mkdir(proofDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const consoleEvents = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => consoleEvents.push({ type: "pageerror", text: error.message }));

  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(proofDir, "initial.png"), fullPage: false });

  const navResults = [];
  for (const label of navLabels) {
    const locator = page.getByRole("button", { name: labelRegex(label) }).first();
    const exists = await locator.count();
    if (!exists) {
      navResults.push({ label, exists: false, clicked: false, h1After: "", changed: false });
      continue;
    }

    const beforeText = await page.locator("body").innerText();
    await locator.click();
    await page.waitForTimeout(100);
    const afterText = await page.locator("body").innerText();
    const h1After = await page.locator("h1").first().innerText();
    navResults.push({ label, exists: true, clicked: true, h1After, changed: beforeText !== afterText || label === "Workbench" });
  }

  await page.screenshot({ path: path.join(proofDir, "after-nav-clicks.png"), fullPage: false });
  await page.getByRole("button", { name: /Workbench/ }).first().click();
  await page.locator("#prompt-input").fill("Playwright audit: create a working prompt and verify that output appears.");
  await page.getByRole("button", { name: /^Fix Prompt$/ }).click();
  await page.waitForTimeout(1000);
  const runHeading = await page.locator("h1").first().innerText();
  const runBody = await page.locator("body").innerText();
  await page.screenshot({ path: path.join(proofDir, "after-fix-prompt.png"), fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(appUrl, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: path.join(proofDir, "mobile.png"), fullPage: false });
  const mobileInfo = await mobile.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await browser.close();

  const summary = {
    appUrl,
    navResults,
    navPassCount: navResults.filter((result) => result.exists && result.clicked && result.h1After === result.label && result.changed).length,
    consoleEvents,
    promptRunChangedToRuns: runHeading === "Runs",
    promptRunHasOutputEvidence: /Score|Citations|Questions|RIG/.test(runBody),
    mobileInfo,
    screenshots: ["initial.png", "after-nav-clicks.png", "after-fix-prompt.png", "mobile.png"].map((file) => path.join(proofDir, file)),
  };

  await writeFile(path.join(proofDir, "navigation-audit.json"), JSON.stringify(summary, null, 2));

  const failures = [
    summary.navPassCount !== navLabels.length ? `nav pass count ${summary.navPassCount}/${navLabels.length}` : "",
    summary.consoleEvents.length ? `${summary.consoleEvents.length} console/page errors` : "",
    !summary.promptRunChangedToRuns ? "prompt run did not route to Runs" : "",
    !summary.promptRunHasOutputEvidence ? "prompt run output evidence not visible" : "",
    summary.mobileInfo.scrollWidth > summary.mobileInfo.width ? "mobile horizontal overflow detected" : "",
  ].filter(Boolean);

  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) {
    throw new Error(`Playwright navigation audit failed: ${failures.join("; ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
