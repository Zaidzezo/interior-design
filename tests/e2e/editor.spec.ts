import { test, expect } from "@playwright/test";
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('buildspace-view','2D'));});
import fs from "node:fs/promises";
test("editor save/reload, exact inspector editing, history, versions, real 3D and exports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".room-row")).toHaveCount(7);
  await page.screenshot({ path: "artifacts/editor-1600.png" });
  await page.getByRole("button", { name: "Furniture", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search furniture" })
    .fill("Linen three");
  await page.locator(".catalog-place").first().click();
  const box = await page.getByTestId("plan-canvas").boundingBox();
  await page.mouse.click(
    box!.x + box!.width * 0.55,
    box!.y + box!.height * 0.42,
  );
  await expect(page.getByLabel("Entity name")).toHaveValue("Linen three seat");
  await page.getByLabel("Width", { exact: true }).fill("2.35");
  await page.getByLabel("Width", { exact: true }).press("Enter");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  // Select a persisted object by its visibility-layer entry, then verify precise dimensions.
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page
    .locator(".layer-row button")
    .filter({ hasText: "Linen three seat" })
    .last()
    .click();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("2.35");
  await page.getByLabel("Rotation", { exact: true }).fill("37");
  await page.getByLabel("Rotation", { exact: true }).press("Enter");
  await page.keyboard.press("Control+z");
  await expect(page.getByLabel("Rotation", { exact: true })).toHaveValue("0");
  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByLabel("Rotation", { exact: true })).toHaveValue("37");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByLabel("Entity name")).toHaveValue("Linen three seat");
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unlock", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More drawing tools" }).click();
  await page.getByRole("button", { name: "Version history" }).click();
  await page.getByLabel("Version name").fill("Browser verified version");
  await page.getByRole("button", { name: "Save version", exact: true }).click();
  await expect(
    page.getByText("Browser verified version", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("Close dialog").click();
  await page.getByRole("button", { name: "3D View", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cutaway walls" }),
  ).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(page.locator(".scene3d canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/editor-3d.png" });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Editable project BuildSpace JSON" })
    .click();
  const download = await jsonDownload;
  await download.saveAs("artifacts/export.buildspace.json");
  const scene = JSON.parse(
    await fs.readFile("artifacts/export.buildspace.json", "utf8"),
  );
  expect(scene.formatVersion).toBe(1);
  expect(scene.floors[0].rooms).toHaveLength(7);
  const svgDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Vector plan SVG · scalable" })
    .click();
  await (await svgDownload).saveAs("artifacts/export.svg");
  expect(
    (await fs.readFile("artifacts/export.svg", "utf8")).includes("<polygon"),
  ).toBeTruthy();
  const pngDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "High resolution image PNG · 2× resolution" })
    .click();
  await (await pngDownload).saveAs("artifacts/export.png");
  expect((await fs.stat("artifacts/export.png")).size).toBeGreaterThan(10000);
  const pdfDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Print-ready plan PDF · A3 · scale to fit" })
    .click();
  await (await pdfDownload).saveAs("artifacts/export.pdf");
  expect(
    (await fs.readFile("artifacts/export.pdf")).subarray(0, 4).toString(),
  ).toBe("%PDF");
  const glbDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "3D model GLB · open 3D view first" })
    .click();
  await (await glbDownload).saveAs("artifacts/export.glb");
  expect(
    (await fs.readFile("artifacts/export.glb")).subarray(0, 4).toString(),
  ).toBe("glTF");
  await page.getByTitle("Close dialog").click();
  expect(errors).toEqual([]);
});
test("new blank project: draw 4 by 3 meters, resize, undo, and recover after reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("Open project gallery").click();
  await page.getByRole("button", { name: "Start from scratch" }).click();
  await expect(page.locator(".room-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Draw room", exact: true }).click();
  const box = await page.getByTestId("plan-canvas").boundingBox();
  const zoomText = await page.locator(".zoom-controls>span").innerText();
  const zoom = (parseInt(zoomText) / 100) * 50;
  const x = box!.x + box!.width / 2 - 2 * zoom,
    y = box!.y + box!.height / 2 - 1.5 * zoom;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4 * zoom, y + 3 * zoom, { steps: 10 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.locator(".room-row").first().click();
  await expect(page.getByText("12.00", { exact: false }).first()).toBeVisible();
  await page.getByLabel("Room width").fill("5");
  await page.getByLabel("Room width").press("Enter");
  await expect(page.locator(".area-readout strong")).toHaveText("15.00 m²");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.locator(".room-row").first().click();
  await expect(page.getByLabel("Room width")).toHaveValue("5");
});
test("two real browser sessions receive accepted revisions over authorized WebSockets", async ({
  browser,
}) => {
  const one = await browser.newContext();
  const page = await one.newPage();
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const two = await browser.newContext({
    storageState: await one.storageState(),
  });
  const remote = await two.newPage();
  await remote.goto("/");
  await expect(
    remote.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".collaboration-peers")).toHaveText("1 online");
  await page.locator(".room-row").first().click();
  await page.getByLabel("Entity name").fill("Shared entry");
  await page.getByLabel("Entity name").press("Tab");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await expect(remote.locator(".room-row").first()).toContainText(
    "Shared entry",
  );
  await one.close();
  await two.close();
});
test("responsive editor screenshots with no horizontal page overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `artifacts/editor-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (width >= 1280) {
      await expect(page.locator(".sidebar")).toBeVisible();
      await expect(page.locator(".inspector")).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Library", exact: true }).click();
      await expect(page.locator(".sidebar")).toBeVisible();
    }
  }
});

test("JSON import restores an exported design and PNG reference scale persists", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const jsonPath = testInfo.outputPath("design.json"),
    pngPath = testInfo.outputPath("export.png");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Editable project BuildSpace JSON" })
    .click();
  await (await jsonDownload).saveAs(jsonPath);
  const pngDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "High resolution image PNG · 2× resolution" })
    .click();
  await (await pngDownload).saveAs(pngPath);
  await page.getByTitle("Close dialog").click();
  await page.getByTitle("Open project gallery").click();
  await page.locator("input[type=file]").setInputFiles(jsonPath);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".room-row")).toHaveCount(7);
  await page.getByTitle("Open project gallery").click();
  await page.locator("input[type=file]").setInputFiles(pngPath);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("TRACING REFERENCE", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Image width").fill("12");
  await page.getByLabel("Image width").press("Enter");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page.getByRole("button", { name: "Reference · export.png" }).click();
  await expect(page.getByLabel("Image width")).toHaveValue("12");
});
