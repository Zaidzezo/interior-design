import { chromium } from "@playwright/test";
import { blankScene, rectangleRoom } from "../packages/core/src/sample";
import { catalog } from "../packages/core/src/catalog";
import { wallsFromRooms } from "../packages/core/src/geometry";
import { uid } from "../packages/core/src/model";
import { writeFile } from "node:fs/promises";
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3020";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const context = await browser.newContext({
      baseURL,
      viewport: { width: 1600, height: 900 },
    }),
    request = context.request;
  await request.post("/api/auth/guest", { data: {} });
  const project = await (
    await request.post("/api/projects", {
      data: { name: "150 object performance fixture", template: "blank" },
    })
  ).json();
  const scene = blankScene(),
    floor = scene.floors[0];
  floor.rooms = [rectangleRoom("Showroom", "Custom", 0, 0, 45, 35)];
  floor.walls = wallsFromRooms(floor.rooms);
  floor.items = Array.from({ length: 150 }, (_, i) => {
    const c = catalog[i % catalog.length];
    return {
      id: uid(),
      catalogId: c.id,
      name: c.name,
      x: 2 + (i % 15) * 2.85,
      y: 2 + Math.floor(i / 15) * 3.1,
      width: c.width,
      depth: c.depth,
      height: c.height,
      elevation: 0,
      rotation: 0,
      color: c.color,
      price: c.price,
      locked: false,
      hidden: false,
    };
  });
  const saved = await request.put(`/api/projects/${project.id}/scene`, {
    data: { revision: project.revision, scene },
  });
  if (!saved.ok()) throw new Error(await saved.text());
  const page = await context.newPage();
  await page.addInitScript(
    (id) => localStorage.setItem("buildspace-project", id),
    project.id,
  );
  await page.goto("/");
  await page.getByText("All changes saved", { exact: true }).waitFor();
  await page.getByTestId("plan-canvas").locator("canvas").first().waitFor();
  const samples = await page.evaluate<number[]>(
    `new Promise(resolve=>{const a=[];let previous=performance.now();const frame=now=>{a.push(now-previous);previous=now;if(a.length<120)requestAnimationFrame(frame);else resolve(a);};requestAnimationFrame(frame);})`,
  );
  samples.sort((a, b) => a - b);
  const report = {
    objects: 150,
    frames: 120,
    mode: "idle canvas with all objects visible, Chromium software rendering",
    medianMs: samples[60],
    p95Ms: samples[114],
    maxMs: samples[119],
    over33ms: samples.filter((n) => n > 33).length,
    limitation:
      "Idle rendering only; not a claim of 60fps during drag or production GPU performance.",
  };
  await writeFile(
    "artifacts/canvas-performance.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
  await page.screenshot({ path: "artifacts/showroom-150.png" });
} finally {
  await browser.close();
}
