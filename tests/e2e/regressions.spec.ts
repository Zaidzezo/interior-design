import { test, expect } from "@playwright/test";

test("profile guard, precise canvas selection, rotated resize and reload", async ({
  page,
}) => {
  const request = page.request;
  const email = `regression-${Date.now()}@example.test`;
  const registered = await request.post("/api/auth/register", {
    data: { name: "Regression user", email, password: "Regression-pass-123" },
  });
  expect(registered.ok()).toBeTruthy();
  const created = await request.post("/api/projects", {
    data: { name: "Gesture regression", template: "blank" },
  });
  expect(created.ok()).toBeTruthy();
  const project = await created.json();
  await page.addInitScript(
    (id) => localStorage.setItem("buildspace-project", id),
    project.id,
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("Account").first().click();
  await expect(page.getByRole("region", { name: "Profile" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
  await page.getByTitle("Close dialog").click();
  await page.getByRole("button", { name: "Furniture", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search furniture" })
    .fill("Linen three");
  await page.locator(".catalog-place").first().click();
  const box = (await page.getByTestId("plan-canvas").boundingBox())!;
  const center = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
  await page.mouse.click(center.x, center.y);
  await expect(page.getByLabel("Entity name")).toHaveValue("Linen three seat");
  await page.getByLabel("Rotation", { exact: true }).fill("30");
  await page.getByLabel("Rotation", { exact: true }).press("Enter");
  const zoom = Math.max(
    10,
    Math.min((box.width - 180) / 10.8, (box.height - 140) / 10.8),
  );
  const theta = Math.PI / 6;
  const offset = {
    x: (1.1 * Math.cos(theta) - 0.475 * Math.sin(theta)) * zoom,
    y: (1.1 * Math.sin(theta) + 0.475 * Math.cos(theta)) * zoom,
  };
  // Placement is grid-snapped, so read acknowledged center before locating handles.
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const saved = await (await request.get(`/api/projects/${project.id}`)).json();
  const item = saved.scene.floors[0].items[0];
  const pan = {
    x: (box.width - 10 * zoom) / 2,
    y: (box.height - 10 * zoom) / 2 + 23,
  };
  const actual = {
    x: box.x + pan.x + item.x * zoom,
    y: box.y + pan.y + item.y * zoom,
  };
  await page.keyboard.down("Shift");
  await page.keyboard.down("Alt");
  await page.mouse.move(actual.x + offset.x, actual.y + offset.y);
  await page.mouse.down();
  await page.mouse.move(
    actual.x + offset.x * 1.35,
    actual.y + offset.y * 1.35,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await page.keyboard.up("Shift");
  await expect(page.getByLabel("Width", { exact: true })).not.toHaveValue(
    "2.2",
  );
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const resized = (
    await (await request.get(`/api/projects/${project.id}`)).json()
  ).scene.floors[0].items[0];
  expect(resized.width / resized.depth).toBeCloseTo(item.width / item.depth, 2);
  expect(resized.x).toBeCloseTo(item.x, 3);
  expect(resized.y).toBeCloseTo(item.y, 3);
  await page.reload();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("Account").first().click();
  await expect(page.getByRole("region", { name: "Profile" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("room color persists and supports undo/redo without rebuilding default walls", async ({
  page,
}) => {
  const request = page.request;
  await request.post("/api/auth/guest", { data: {} });
  const response = await request.post("/api/projects", {
    data: { name: "Color regression", template: "sample" },
  });
  const project = await response.json();
  await page.addInitScript(
    (id) => localStorage.setItem("buildspace-project", id),
    project.id,
  );
  await page.goto("/");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.locator(".room-row").first().click();
  const color = page.getByLabel("Surface color"),
    before = await color.inputValue();
  await color.fill("#123456");
  await expect(color).toHaveValue("#123456");
  await page.locator("body").click({ position: { x: 10, y: 10 } });
  await page.keyboard.press("Control+z");
  await expect(color).toHaveValue(before);
  await page.keyboard.press("Control+Shift+z");
  await expect(color).toHaveValue("#123456");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const saved = await (await request.get(`/api/projects/${project.id}`)).json();
  expect(saved.scene.floors[0].rooms[0].color).toBe("#123456");
  expect(saved.scene.floors[0].walls.map((w: any) => w.id)).toEqual(
    project.scene.floors[0].walls.map((w: any) => w.id),
  );
  await page.reload();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.locator(".room-row").first().click();
  await expect(color).toHaveValue("#123456");
});

test('default walls select, move and resize through canvas gestures',async({page})=>{
 const request=page.request;await request.post('/api/auth/guest',{data:{}});
 const project=await (await request.post('/api/projects',{data:{name:'Wall gesture regression',template:'sample'}})).json();
 await page.addInitScript(id=>localStorage.setItem('buildspace-project',id),project.id);
 await page.goto('/');await expect(page.getByText('All changes saved',{exact:true})).toBeVisible();
 const f=project.scene.floors[0],points=f.rooms.flatMap((r:any)=>r.points);
 const minX=Math.min(...points.map((p:any)=>p.x)),minY=Math.min(...points.map((p:any)=>p.y));
 const width=Math.max(...points.map((p:any)=>p.x))-minX,depth=Math.max(...points.map((p:any)=>p.y))-minY;
 const box=(await page.getByTestId('plan-canvas').boundingBox())!;
 const z=Math.max(10,Math.min((box.width-180)/(width+.8),(box.height-140)/(depth+.8)));
 const pan={x:(box.width-width*z)/2-minX*z,y:(box.height-depth*z)/2-minY*z+23};
 const screen=(p:{x:number;y:number})=>({x:box.x+pan.x+p.x*z,y:box.y+pan.y+p.y*z});
 const wall=f.walls.find((w:any)=>w.a.x===minX&&w.b.x===minX&&!f.openings.some((o:any)=>o.wallId===w.id));
 expect(wall).toBeTruthy();
 const middle=screen({x:wall.a.x,y:(wall.a.y+wall.b.y)/2});
 await page.mouse.click(middle.x,middle.y);await expect(page.getByLabel('Wall length',{exact:true})).toBeVisible();
 await page.mouse.move(middle.x,middle.y);await page.mouse.down();await page.mouse.move(middle.x-8,middle.y,{steps:8});await page.mouse.up();
 await expect(page.getByText('All changes saved',{exact:true})).toBeVisible();
 let saved=await (await request.get(`/api/projects/${project.id}`)).json();
 const moved=saved.scene.floors[0].walls.find((w:any)=>w.id===wall.id);
 expect(moved.a.x).toBeLessThan(wall.a.x);
 const endpoint=screen(moved.a);
 await page.mouse.move(endpoint.x,endpoint.y);await page.mouse.down();await page.mouse.move(endpoint.x,endpoint.y-7,{steps:8});await page.mouse.up();
 await expect(page.getByText('All changes saved',{exact:true})).toBeVisible();
 saved=await (await request.get(`/api/projects/${project.id}`)).json();
 expect(saved.scene.floors[0].walls.find((w:any)=>w.id===wall.id).a.y).toBeLessThan(moved.a.y);
});
