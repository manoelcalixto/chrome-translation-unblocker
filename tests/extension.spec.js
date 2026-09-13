import { test as base, expect, chromium } from "@playwright/test";
import { resolve } from "node:path";

const markup = `<!doctype html><html lang="en"><head><meta name="google" content="notranslate"><title>Translation test</title></head><body>
  <main id="lesson" translate="no" contenteditable="false" class="layout notranslate">
  <h1>Read this page in your language</h1><p id="mixed" translate=" NO " class="keep notranslate">Ordinary text</p>
  <pre translate="no"><code id="code" class="notranslate">const keep = true;</code></pre>
  <textarea id="answer" translate="no" class="notranslate">My draft</textarea>
  <div id="editor" contenteditable="true" translate="no" class="notranslate">Editable <span id="child" translate="no">Keep</span></div>
  <p id="newer" translate="no">A subsequent site setting</p></main></body></html>`;

const test = base.extend({
  extension: async ({ browserName }, use) => {
    if (browserName !== "chromium") throw new Error("These extension tests require Chromium");
    // Always a new temporary profile; never attach to the user's browser.
    const context = await chromium.launchPersistentContext("", {
      channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
      headless: true,
      args: ["--enable-unsafe-extension-debugging"],
      ignoreDefaultArgs: ["--disable-extensions"]
    });
    const errors = [];
    context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
    try {
      await context.route(/^https?:\/\//, route => route.fulfill({ contentType: "text/html; charset=utf-8", body: markup }));
      const cdp = await context.browser().newBrowserCDPSession();
      const { id } = await cdp.send("Extensions.loadUnpacked", { path: resolve("extension") });
      const page = await context.newPage();
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${id}/popup.html`);
      const setEnabled = value => popup.evaluate(enabled => chrome.storage.local.set({ enabled }), value);
      const status = async (target = page) => {
        await target.bringToFront();
        return popup.evaluate(async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          return chrome.tabs.sendMessage(tab.id, { type: "liberar-traducao/status" }, { frameId: 0 });
        });
      };
      await use({ context, page, popup, setEnabled, status });
      expect(errors, "Uncaught browser errors").toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("installs the real extension on HTTP and HTTPS without exposing APIs to the page", async ({ extension }) => {
  for (const url of ["https://alpha.example.test/article", "http://beta.example.test/article"]) {
    await extension.page.goto(url);
    await expect(extension.page.locator("#lesson")).toHaveAttribute("translate", "yes");
    await expect(extension.page.locator("#lesson")).toHaveClass("layout");
    await expect(extension.page.locator("#mixed")).toHaveAttribute("translate", "yes");
    await expect(extension.page.locator('meta[name="google"]')).toHaveCount(0);
    expect(await extension.page.evaluate(() => Boolean(window.chrome?.storage))).toBe(false);
    expect(await extension.status()).toMatchObject({ initialized: true, enabled: true, settingsError: false });
  }
});

test("preserves explicit exclusions in code, form fields and editable descendants", async ({ extension: { page } }) => {
  await page.goto("https://alpha.example.test/article");
  await expect(page.locator("#lesson")).toHaveAttribute("translate", "yes");
  for (const selector of ["pre", "#answer", "#editor", "#child"]) {
    await expect(page.locator(selector)).toHaveAttribute("translate", "no");
  }
  await expect(page.locator("#code")).toHaveClass("notranslate");
  await expect(page.locator("#answer")).toHaveValue("My draft");
});

test("adjusts dynamic subtrees, site reapplication and SPA navigation", async ({ extension }) => {
  const { page } = extension;
  await page.goto("https://alpha.example.test/article");
  await expect(page.locator("#lesson")).toHaveAttribute("translate", "yes");
  await page.evaluate(() => {
    document.body.insertAdjacentHTML("beforeend", '<section><p id="dynamic" translate="no" class="keep notranslate">New content</p></section>');
    document.querySelector("#lesson").setAttribute("translate", "no");
    document.querySelector("#lesson").classList.add("notranslate");
    document.head.insertAdjacentHTML("beforeend", '<meta name="GOOGLE" content=" NOTRANSLATE ">');
  });
  await expect(page.locator("#dynamic")).toHaveAttribute("translate", "yes");
  await expect(page.locator("#dynamic")).toHaveClass("keep");
  await expect(page.locator("#lesson")).toHaveClass("layout");
  await expect(page.locator("meta[name]")).toHaveCount(0);
  await page.evaluate(() => {
    document.body.innerHTML = '<main id="replacement" translate="no">New page</main>';
    window.history.pushState({}, "", "/next");
  });
  await expect(page.locator("#replacement")).toHaveAttribute("translate", "yes");
  expect((await extension.status()).adjustedElements).toBe(1);
});

test("global pause restores changes, persists on reload and updates cross-origin frames", async ({ extension }) => {
  const { page, context, setEnabled } = extension;
  await page.goto("https://alpha.example.test/article");
  await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", '<iframe src="https://embedded.example.test/frame" title="Embedded article"></iframe>'));
  const frameLesson = page.frameLocator("iframe").locator("#lesson");
  await expect(frameLesson).toHaveAttribute("translate", "yes");
  const other = await context.newPage();
  await other.goto("http://beta.example.test/article");
  await expect(other.locator("#lesson")).toHaveAttribute("translate", "yes");
  await page.evaluate(() => {
    document.querySelector("#newer").setAttribute("translate", "");
    document.querySelector("#lesson").classList.add("site-added");
  });
  await setEnabled(false);
  await expect(page.locator("#lesson")).toHaveAttribute("translate", "no");
  await expect(page.locator("#lesson")).toHaveClass(/site-added/);
  await expect(page.locator("#lesson")).toHaveClass(/notranslate/);
  await expect(page.locator("#mixed")).toHaveAttribute("translate", " NO ");
  await expect(page.locator("#newer")).toHaveAttribute("translate", "");
  await expect(page.locator('meta[name="google"]')).toHaveCount(1);
  await expect(frameLesson).toHaveAttribute("translate", "no");
  await expect(other.locator("#lesson")).toHaveAttribute("translate", "no");
  await other.reload();
  expect(await extension.status(other)).toMatchObject({ initialized: true, enabled: false });
  await expect(other.locator("#lesson")).toHaveAttribute("translate", "no");
  await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", '<p id="paused" translate="no">Added while paused</p>'));
  await expect(page.locator("#paused")).toHaveAttribute("translate", "no");
  await setEnabled(true);
  await expect(page.locator("#paused")).toHaveAttribute("translate", "yes");
  await expect(frameLesson).toHaveAttribute("translate", "yes");
  await expect(other.locator("#lesson")).toHaveAttribute("translate", "yes");
});

test("popup uses real storage and messages and renders within Chrome dimensions", async ({ extension }, testInfo) => {
  const { page, popup } = extension;
  await page.goto("https://alpha.example.test/article");
  await expect(page.locator("#lesson")).toHaveAttribute("translate", "yes");
  await page.bringToFront();
  await popup.evaluate(() => window.updateStatus());
  await expect(popup.locator("#status")).toContainText("Conteúdo liberado");
  await expect(popup.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await popup.setViewportSize({ width: 360, height: 600 });
  expect(await popup.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  expect(await popup.locator("body").evaluate(el => el.scrollHeight)).toBeLessThan(600);
  await popup.locator("body").screenshot({ path: testInfo.outputPath("popup.png") });
  await popup.getByRole("switch").click();
  await expect(popup.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("#lesson")).toHaveAttribute("translate", "no");
  expect(await popup.evaluate(() => chrome.storage.local.get("enabled"))).toEqual({ enabled: false });
});

test("unsupported browser pages receive no script and the popup explains the limit", async ({ extension }) => {
  const { page, popup } = extension;
  await page.goto("about:blank");
  await page.bringToFront();
  await expect(extension.status()).rejects.toThrow();
  await popup.evaluate(() => window.updateStatus());
  await expect(popup.locator("#status")).toContainText("Páginas internas do Chrome");
});
