import { test, expect } from "@playwright/test";
import { blankScene, sampleScene } from "../../packages/core/src/sample";
import { catalog } from "../../packages/core/src/catalog";
test("recent furniture, finish controls and blueprint toggle", async ({
  page,
}) => {
  const request = page.request;
  await request.post("/api/auth/guest", { data: {} });
  const project = await (
    await request.post("/api/projects", {
      data: { name: "Presentation controls", template: "blank" },
    })
  ).json();
  await page.addInitScript(
    (id) => localStorage.setItem("buildspace-project", id),
    project.id,
  );
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Furniture", exact: true }).click();
  await page.getByLabel("Search furniture").fill("Linen three");
  await page.locator(".catalog-place").first().click();
  const box = (await page.getByTestId("plan-canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(
    page.getByRole("region", { name: "Recently used furniture" }),
  ).toBeVisible();
  await page.getByLabel("Furniture finish").selectOption("velvet");
  await page.getByRole("button", { name: "Mirror / arm side" }).click();
  await page.getByTitle("Switch plan rendering").click();
  await expect(page.getByTitle("Switch plan rendering")).toHaveText(
    "Blueprint",
  );
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const saved = await (await request.get(`/api/projects/${project.id}`)).json();
  expect(saved.scene.floors[0].items[0].finish).toBe("velvet");
  expect(saved.scene.floors[0].items[0].flipX).toBe(true);
  await page.reload();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Furniture", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Recently used furniture" }),
  ).toBeVisible();
});
test("Shift marquee selects furniture as a group of selection IDs", async ({
  page,
}) => {
  const request = page.request;
  await request.post("/api/auth/guest", { data: {} });
  const project = await (
    await request.post("/api/projects", {
      data: { name: "Marquee", template: "blank" },
    })
  ).json();
  const scene = blankScene();
  const item = sampleScene().floors[0].items[0];
  scene.floors[0].items = [4, 6].map((x, i) => ({
    ...item,
    id: crypto.randomUUID(),
    catalogId: catalog.find((c) => c.kind === "chair")!.id,
    x,
    y: 4 + i,
    width: 0.6,
    depth: 0.6,
    rotation: 0,
  }));
  const put = await request.put(`/api/projects/${project.id}/scene`, {
    data: { revision: project.revision, scene },
  });
  expect(put.ok(), await put.text()).toBeTruthy();
  await page.addInitScript(
    (id) => localStorage.setItem("buildspace-project", id),
    project.id,
  );
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const box = (await page.getByTestId("plan-canvas").boundingBox())!,
    z = Math.min((box.width - 180) / 10.8, (box.height - 140) / 10.8),
    pan = { x: (box.width - 10 * z) / 2, y: (box.height - 10 * z) / 2 + 23 };
  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + pan.x + 2 * z, box.y + pan.y + 2 * z);
  await page.mouse.down();
  await page.mouse.move(box.x + pan.x + 7 * z, box.y + pan.y + 7 * z, {
    steps: 12,
  });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("2 selected", { exact: true })).toHaveCount(0);
});
