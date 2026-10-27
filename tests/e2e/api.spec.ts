import { test, expect } from "@playwright/test";
import { sampleScene, blankScene } from "../../packages/core/src/sample";
test.describe("real PostgreSQL API", () => {
  test("accounts, authorization, revision races, immutable versions, estimates, share revocation", async ({
    playwright,
    request,
  }) => {
    const owner = await playwright.request.newContext({
        baseURL: "http://127.0.0.1:3000",
      }),
      viewer = await playwright.request.newContext({
        baseURL: "http://127.0.0.1:3000",
      }),
      stranger = await playwright.request.newContext({
        baseURL: "http://127.0.0.1:3000",
      });
    const email = `owner-${crypto.randomUUID()}@example.com`,
      viewerEmail = `viewer-${crypto.randomUUID()}@example.com`;
    expect((await request.get("/api/health")).ok()).toBeTruthy();
    expect((await stranger.get("/api/projects")).status()).toBe(401);
    expect(
      (
        await owner.post("/api/auth/register", {
          data: { email, password: "strong-test-password", name: "Owner" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await viewer.post("/api/auth/register", {
          data: {
            email: viewerEmail,
            password: "strong-test-password",
            name: "Viewer",
          },
        })
      ).status(),
    ).toBe(200);
    const creation = await owner.post("/api/projects", {
      data: { name: "API integration plan", template: "sample" },
    });
    expect(creation.status()).toBe(201);
    const p = await creation.json();
    expect(p.scene.floors[0].rooms).toHaveLength(7);
    expect((await viewer.get(`/api/projects/${p.id}`)).status()).toBe(404);
    const scene = p.scene;
    scene.name = "Saved revision";
    const results = await Promise.all([
      owner.put(`/api/projects/${p.id}/scene`, {
        data: { revision: 0, scene },
      }),
      owner.put(`/api/projects/${p.id}/scene`, {
        data: { revision: 0, scene: { ...scene, name: "Competing revision" } },
      }),
    ]);
    expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
    const saved = await (await owner.get(`/api/projects/${p.id}`)).json();
    expect(saved.revision).toBe(1);
    const version = await (
      await owner.post(`/api/projects/${p.id}/versions`, {
        data: { name: "V1" },
      })
    ).json();
    const originalX = version.scene.floors[0].items[0].x;
    saved.scene.floors[0].items[0].x += 0.5;
    expect(
      (
        await owner.put(`/api/projects/${p.id}/scene`, {
          data: { revision: 1, scene: saved.scene },
        })
      ).status(),
    ).toBe(200);
    const versions = await (
      await owner.get(`/api/projects/${p.id}/versions`)
    ).json();
    expect(versions[0].scene.floors[0].items[0].x).toBe(originalX);
    const bad = structuredClone(saved.scene);
    bad.floors[0].openings[0].width = 100;
    expect(
      (
        await owner.put(`/api/projects/${p.id}/scene`, {
          data: { revision: 2, scene: bad },
        })
      ).status(),
    ).toBe(422);
    const member = await owner.post(`/api/projects/${p.id}/share`, {
      data: { email: viewerEmail, role: "viewer" },
    });
    expect(member.ok()).toBeTruthy();
    expect((await viewer.get(`/api/projects/${p.id}`)).status()).toBe(200);
    expect(
      (
        await viewer.put(`/api/projects/${p.id}/scene`, {
          data: { revision: 2, scene: saved.scene },
        })
      ).status(),
    ).toBe(403);
    expect((await viewer.delete(`/api/projects/${p.id}`)).status()).toBe(403);
    const link = await (
      await owner.post(`/api/projects/${p.id}/share`, { data: {} })
    ).json();
    expect((await stranger.get(`/api/public/${link.token}`)).status()).toBe(
      200,
    );
    expect(
      (
        await owner.delete(`/api/projects/${p.id}/share`, {
          data: { id: link.id, kind: "link" },
        })
      ).ok(),
    ).toBeTruthy();
    expect((await stranger.get(`/api/public/${link.token}`)).status()).toBe(
      404,
    );
    const membership = await member.json();
    await owner.delete(`/api/projects/${p.id}/share`, {
      data: { id: membership.id, kind: "member" },
    });
    expect((await viewer.get(`/api/projects/${p.id}`)).status()).toBe(404);
    const estimate = await (
      await owner.get(`/api/projects/${p.id}/estimate`)
    ).json();
    expect(estimate.length).toBeGreaterThan(30);
    expect(
      estimate.reduce((n: number, r: any) => n + r.total, 0),
    ).toBeGreaterThan(0);
    expect((await owner.delete(`/api/projects/${p.id}`)).ok()).toBeTruthy();
    expect((await owner.get(`/api/projects/${p.id}`)).status()).toBe(404);
    await owner.post("/api/auth/logout");
    expect((await owner.get("/api/projects")).status()).toBe(401);
    expect(
      (
        await owner.post("/api/auth/login", {
          data: { email, password: "incorrect-password" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await owner.post("/api/auth/login", {
          data: { email, password: "strong-test-password" },
        })
      ).ok(),
    ).toBeTruthy();
    await owner.dispose();
    await viewer.dispose();
    await stranger.dispose();
  });
  test("server and client estimate agree for known prices, exact JSON scene round trip", async ({
    request,
  }) => {
    await request.post("/api/auth/guest", { data: {} });
    const scene = blankScene("Exact round trip");
    const base = sampleScene().floors[0].items[0];
    scene.floors[0].items = [
      { ...base, id: crypto.randomUUID(), price: 100 },
      { ...base, id: crypto.randomUUID(), price: 100 },
      { ...base, id: crypto.randomUUID(), price: 50 },
    ];
    const p = await (
      await request.post("/api/projects", { data: { name: scene.name, scene } })
    ).json();
    expect(
      (await (await request.get(`/api/projects/${p.id}`)).json()).scene,
    ).toEqual(scene);
    const rows = await (
      await request.get(`/api/projects/${p.id}/estimate`)
    ).json();
    expect(rows.reduce((n: number, r: any) => n + r.total, 0)).toBe(250);
    await request.delete(`/api/projects/${p.id}`);
  });
});
