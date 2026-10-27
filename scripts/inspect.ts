import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR", m.text());
});
await page.goto("http://127.0.0.1:3000");
await page
  .getByText("All changes saved", { exact: true })
  .waitFor({ timeout: 90000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "artifacts/editor-1600.png" });
console.log("title", await page.title());
console.log("body", (await page.locator("body").innerText()).slice(-1000));
await browser.close();
