import { test, expect } from "@playwright/test";
import { blankScene, sampleScene } from "../../packages/core/src/sample";
import { catalog } from "../../packages/core/src/catalog";
test("small object corner handles remain independently reachable at low zoom", async ({
  page,
}) => {
  const request = page.request;
  await request.post("/api/auth/guest", { data: {} });
  const scene = blankScene();
  scene.floors[0].items = [
    {
      ...sampleScene().floors[0].items[0],
      id: crypto.randomUUID(),
      catalogId: catalog.find((c) => c.kind === "rug")!.id,
      x: 5,
      y: 5,
      width: 0.8,
      depth: 0.5,
      rotation: 0,
    },
  ];
  const project = await (
    await request.post("/api/projects", {
      data: { name: "Low zoom control baseline", scene },
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
  const box = (await page.getByTestId("plan-canvas").boundingBox())!,
    center = { x: box.x + box.width / 2, y: box.y + box.height / 2 + 23 };
  await page.mouse.click(center.x, center.y);
  await expect(page.getByLabel("Entity name")).toBeVisible();
  await page.mouse.move(center.x, center.y);
  for (let i = 0; i < 22; i++) await page.mouse.wheel(0, 120);
  // Wheel clamps at 12 px/m. The 0.8x0.5m object has a 9.6x6px footprint.
  const handle = (await page
    .getByRole("button", { name: "top-left handle", exact: true })
    .boundingBox())!;
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 - 12,
    handle.y + handle.height / 2 - 6,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const item = (await (await request.get(`/api/projects/${project.id}`)).json())
    .scene.floors[0].items[0];
  expect(item.width).toBeGreaterThan(0.8);
  expect(item.depth).toBeGreaterThan(0.5);
  expect(item.x).toBeLessThan(5);
  expect(item.y).toBeLessThan(5);
});

for (const zoom of [12, 75, 180])
  for (const rotation of [0, 33, 90])
    test(`all eight handles zoom=${zoom} rotation=${rotation}`, async ({
      page,
    }) => {
      const request = page.request;
      await request.post("/api/auth/guest", { data: {} });
      const scene = blankScene();
      const item = {
        ...sampleScene().floors[0].items[0],
        id: crypto.randomUUID(),
        catalogId: catalog.find((c) => c.kind === "rug")!.id,
        x: 5,
        y: 5,
        width: 1.6,
        depth: 0.9,
        rotation,
      };
      scene.floors[0].items = [item];
      const project = await (
        await request.post("/api/projects", {
          data: { name: `Controls ${zoom} ${rotation}`, scene },
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
      const surface = page.getByTestId("plan-canvas"),
        box = (await surface.boundingBox())!;
      const center = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2 + 23,
      };
      await page.mouse.click(center.x, center.y);
      await page.mouse.move(center.x, center.y);
      for (let n = 0; n < 32; n++) {
        const value = Number(await surface.getAttribute("data-zoom"));
        if (
          (zoom === 12 && value <= 12) ||
          (zoom === 180 && value >= 180) ||
          (zoom === 75 && value >= 75)
        )
          break;
        await page.mouse.wheel(0, zoom === 12 ? 120 : -120);
        await expect
          .poll(async () => Number(await surface.getAttribute("data-zoom")))
          .not.toBe(value);
      }
      const radians = (rotation * Math.PI) / 180;
      for (const [handle, x, y] of [
        ["top-left", -1, -1],
        ["top-center", 0, -1],
        ["top-right", 1, -1],
        ["middle-left", -1, 0],
        ["middle-right", 1, 0],
        ["bottom-left", -1, 1],
        ["bottom-center", 0, 1],
        ["bottom-right", 1, 1],
      ] as const) {
        const button = page.getByRole("button", {
            name: `${handle} handle`,
            exact: true,
          }),
          b = (await button.boundingBox())!;
        expect(b.width).toBeGreaterThanOrEqual(12);
        expect(b.height).toBeGreaterThanOrEqual(12);
        const dx = (x * Math.cos(radians) - y * Math.sin(radians)) * 12,
          dy = (x * Math.sin(radians) + y * Math.cos(radians)) * 12;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, {
          steps: 6,
        });
        await expect
          .poll(async () => {
            const live = (await button.boundingBox())!;
            return Math.hypot(
              live.x + live.width / 2 - (b.x + b.width / 2 + dx),
              live.y + live.height / 2 - (b.y + b.height / 2 + dy),
            );
          })
          .toBeLessThan(1.5);
        await page.mouse.up();
        await expect
          .poll(async () =>
            Number(
              await page
                .getByLabel(x ? "Width" : "Depth", { exact: true })
                .inputValue(),
            ),
          )
          .toBeGreaterThan(x ? 1.6 : 0.9);
        // One semantic gesture is one history step.
        await page.keyboard.press("Control+z");
        await expect(page.getByLabel("Width", { exact: true })).toHaveValue(
          "1.6",
        );
        await expect(page.getByLabel("Depth", { exact: true })).toHaveValue(
          "0.9",
        );
      }
    });

test("move, rotation, pointer release outside canvas and pointer cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Furniture", exact: true }).click();
  await page.getByLabel("Search furniture").fill("Linen three");
  await page.locator(".catalog-place").first().click();
  const box = (await page.getByTestId("plan-canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const move = page.getByRole("button", { name: "move handle", exact: true });
  const b = (await move.boundingBox())!;
  await page.mouse.move(b.x + 12, b.y + 12);
  await page.mouse.down();
  await page.mouse.move(b.x + 42, b.y + 24, { steps: 6 });
  await page.mouse.up();
  const beforeOutside = (await move.boundingBox())!;
  await page.mouse.move(beforeOutside.x + 12, beforeOutside.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x - 25, beforeOutside.y + 12, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press("Control+z");
  await expect(move).toBeVisible();
  const rotate = page.getByRole("button", {
      name: "rotate handle",
      exact: true,
    }),
    r = (await rotate.boundingBox())!;
  await page.mouse.move(r.x + 12, r.y + 12);
  await page.mouse.down();
  await page.mouse.move(r.x + 42, r.y + 30, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByLabel("Rotation", { exact: true })).not.toHaveValue(
    "0",
  );
  const old = await page.getByLabel("Width", { exact: true }).inputValue(),
    corner = page.getByRole("button", {
      name: "bottom-right handle",
      exact: true,
    }),
    c = (await corner.boundingBox())!;
  await page.mouse.move(c.x + 9, c.y + 9);
  await page.mouse.down();
  await page.mouse.move(c.x + 40, c.y + 30, { steps: 4 });
  await corner.dispatchEvent("pointercancel", {
    pointerId: 1,
    pointerType: "mouse",
  });
  await page.mouse.up();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue(old);
});

test("controls follow native body drag before pointer release", async ({
  page,
}) => {
  const request = page.request;
  await request.post("/api/auth/guest", { data: {} });
  const scene = blankScene();
  scene.floors[0].items = [
    {
      ...sampleScene().floors[0].items[0],
      id: crypto.randomUUID(),
      catalogId: catalog.find((c) => c.kind === "rug")!.id,
      x: 5,
      y: 5,
      width: 3,
      depth: 2,
      rotation: 22,
    },
  ];
  const project = await (
    await request.post("/api/projects", {
      data: { name: "Live handle bounds", scene },
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
  const box = (await page.getByTestId("plan-canvas").boundingBox())!,
    center = { x: box.x + box.width / 2, y: box.y + box.height / 2 + 23 };
  await page.mouse.click(center.x, center.y);
  const control = page.getByRole("button", {
      name: "move handle",
      exact: true,
    }),
    before = (await control.boundingBox())!;
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 45, center.y + 20, { steps: 8 });
  await expect
    .poll(async () => (await control.boundingBox())!.x - before.x)
    .toBeGreaterThan(20);
  await page.mouse.up();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const saved = await (await request.get(`/api/projects/${project.id}`)).json();
  expect(saved.scene.floors[0].items[0].x).toBeGreaterThan(5);
  expect(saved.scene.floors[0].items[0].width).toBe(3);
});
