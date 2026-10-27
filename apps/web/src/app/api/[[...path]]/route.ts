import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  currentUser,
  createSession,
  hashPassword,
  verifyPassword,
  sessionHash,
} from "@/lib/auth";
import { SceneSchema } from "@core/model";
import { templateScene } from "@core/templates";
import { blankScene, sampleScene } from "@core/sample";
import { analyze } from "@core/geometry";
import { estimate } from "@core/estimate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, { status });
const authAttempts = new Map<string, { count: number; until: number }>();
const asJson = (s: unknown) => s as Prisma.InputJsonValue;
async function body(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > 5_000_000)
    throw new Error("Request exceeds 5 MB");
  const text = await req.text();
  if (text.length > 5_000_000) throw new Error("Request exceeds 5 MB");
  return JSON.parse(text);
}
async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const p = (await ctx.params).path ?? [];
    const method = req.method;
    if (!["GET", "HEAD"].includes(method)) {
      const origin = req.headers.get("origin");
      if (origin && new URL(origin).host !== req.headers.get("host"))
        return json({ error: "Cross-origin request rejected" }, 403);
    }
    if (p[0] === "health") {
      await db.$queryRaw`SELECT 1`;
      return json({ ok: true, database: "postgresql" });
    }
    if (p[0] === "auth") {
      if (p[1] === "me") {
        const user = await currentUser();
        return json({
          user: user
            ? { id: user.id, name: user.name, email: user.email }
            : null,
        });
      }
      if (p[1] === "logout" && method === "POST") {
        const c = (await cookies()).get("buildspace_session")?.value;
        if (c) await db.session.deleteMany({ where: { id: sessionHash(c) } });
        (await cookies()).delete("buildspace_session");
        return json({ ok: true });
      }
      if (p[1] === "guest" && method === "POST") {
        const existing = await currentUser();
        if (existing)
          return json({
            id: existing.id,
            name: existing.name,
            email: existing.email,
          });
        if (process.env.ALLOW_LOCAL_GUEST !== "true")
          return json({ error: "Local guest mode is disabled" }, 403);
        const user = await db.user.create({
          data: {
            name: "Local designer",
            email: `local-${randomBytes(10).toString("hex")}@buildspace.local`,
          },
        });
        await createSession(user.id);
        return json({ id: user.id, name: user.name, email: user.email });
      }
      if (["register", "login"].includes(p[1]) && method === "POST") {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
        const now = Date.now();
        const rate = authAttempts.get(ip);
        if (rate && rate.until > now && rate.count >= 30)
          return json(
            {
              error: "Too many authentication attempts. Try again in a minute.",
            },
            429,
          );
        authAttempts.set(ip, {
          count: rate && rate.until > now ? rate.count + 1 : 1,
          until: rate && rate.until > now ? rate.until : now + 60000,
        });
        const b = z
          .object({
            email: z.email().max(250),
            password: z.string().min(10).max(200),
            name: z.string().min(1).max(100).optional(),
          })
          .parse(await body(req));
        const email = b.email.toLowerCase();
        let user = await db.user.findUnique({ where: { email } });
        if (p[1] === "register") {
          if (user) return json({ error: "Account already exists" }, 409);
          const guest = await currentUser();
          user = guest?.email.endsWith("@buildspace.local")
            ? await db.user.update({
                where: { id: guest.id },
                data: {
                  email,
                  name: b.name ?? guest.name,
                  password: hashPassword(b.password),
                },
              })
            : await db.user.create({
                data: {
                  email,
                  name: b.name ?? email.split("@")[0],
                  password: hashPassword(b.password),
                },
              });
        } else if (
          !user?.password ||
          !verifyPassword(b.password, user.password)
        )
          return json({ error: "Invalid email or password" }, 401);
        await createSession(user!.id);
        return json({ id: user!.id, name: user!.name, email: user!.email });
      }
      return json({ error: "Unknown auth route" }, 404);
    }
    const user = await currentUser();
    if (p[0] === "public" && p[1] && method === "GET") {
      const share = await db.share.findUnique({
        where: { token: p[1] },
        include: { project: true },
      });
      if (!share) return json({ error: "Link unavailable" }, 404);
      return json({
        id: share.project.id,
        name: share.project.name,
        scene: share.project.scene,
        revision: share.project.revision,
        readOnly: true,
      });
    }
    if (!user) return json({ error: "Authentication required" }, 401);
    if (p[0] === "catalog") {
      const { catalog, materials } = await import("@core/catalog");
      return json({ catalog, materials });
    }
    if (p[0] !== "projects") return json({ error: "Not found" }, 404);
    if (!p[1]) {
      if (method === "GET")
        return json(
          await db.project.findMany({
            where: {
              OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
              ],
            },
            select: {
              id: true,
              name: true,
              favorite: true,
              revision: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
          }),
        );
      if (method === "POST") {
        const b = z
          .object({
            name: z.string().min(1).max(100),
            template: z
              .enum([
                "sample",
                "blank",
                "studio",
                "one-bedroom",
                "two-bedroom",
                "family",
                "office",
                "workplace",
                "open-plan",
              ])
              .optional(),
            scene: SceneSchema.optional(),
          })
          .parse(await body(req));
        const scene =
          b.scene ??
          (b.template === "blank"
            ? blankScene(b.name)
            : templateScene(b.template ?? "sample"));
        scene.name = b.name;
        const critical = scene.floors
          .flatMap(analyze)
          .filter((i) => i.severity === "error");
        if (critical.length)
          return json(
            { error: "Invalid architectural geometry", issues: critical },
            422,
          );
        const project = await db.project.create({
          data: { name: b.name, ownerId: user.id, scene: asJson(scene) },
        });
        return json(project, 201);
      }
      return json({ error: "Method not allowed" }, 405);
    }
    const project = await db.project.findUnique({
      where: { id: p[1] },
      include: { members: true },
    });
    const membership = project?.members.find((m) => m.userId === user.id);
    if (!project || (project.ownerId !== user.id && !membership))
      return json({ error: "Project not found" }, 404);
    const owner = project.ownerId === user.id;
    const canEdit = owner || membership?.role === "editor";
    if (method !== "GET" && !canEdit)
      return json({ error: "Read-only permission" }, 403);
    if (!p[2]) {
      if (method === "GET") return json({ ...project, readOnly: !canEdit });
      if (method === "DELETE") {
        if (!owner) return json({ error: "Owner permission required" }, 403);
        await db.project.delete({ where: { id: project.id } });
        return json({ ok: true });
      }
      if (method === "PATCH") {
        const b = z
          .object({
            name: z.string().min(1).max(100).optional(),
            favorite: z.boolean().optional(),
          })
          .parse(await body(req));
        return json(
          await db.project.update({ where: { id: project.id }, data: b }),
        );
      }
    }
    if (p[2] === "scene" && method === "PUT") {
      const b = z
        .object({ revision: z.number().int().min(0), scene: SceneSchema })
        .parse(await body(req));
      const critical = b.scene.floors
        .flatMap(analyze)
        .filter((i) => i.severity === "error");
      if (critical.length)
        return json(
          { error: "Invalid architectural geometry", issues: critical },
          422,
        );
      const result = await db.project.updateMany({
        where: { id: project.id, revision: b.revision },
        data: {
          scene: asJson(b.scene),
          name: b.scene.name,
          revision: { increment: 1 },
        },
      });
      if (!result.count)
        return json(
          {
            error:
              "Another session saved a newer revision. Your draft is preserved. Reload or save a copy.",
            revision: (
              await db.project.findUnique({ where: { id: project.id } })
            )?.revision,
          },
          409,
        );
      await (globalThis as any).buildspaceBroadcast?.(
        project.id,
        {
          type: "revision",
          projectId: project.id,
          revision: b.revision + 1,
          scene: b.scene,
        },
        req.headers.get("x-buildspace-client") ?? undefined,
      );
      return json({ revision: b.revision + 1 });
    }
    if (p[2] === "estimate")
      return json(estimate(SceneSchema.parse(project.scene)));
    if (p[2] === "analysis")
      return json(SceneSchema.parse(project.scene).floors.flatMap(analyze));
    if (p[2] === "versions") {
      if (method === "GET")
        return json(
          await db.version.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: "desc" },
          }),
        );
      if (method === "POST") {
        const b = z
          .object({ name: z.string().min(1).max(100) })
          .parse(await body(req));
        return json(
          await db.version.create({
            data: {
              projectId: project.id,
              name: b.name,
              revision: project.revision,
              scene: asJson(project.scene),
            },
          }),
          201,
        );
      }
    }
    if (p[2] === "share") {
      if (!owner) return json({ error: "Owner permission required" }, 403);
      if (method === "GET")
        return json({
          links: await db.share.findMany({ where: { projectId: project.id } }),
          members: await db.member.findMany({
            where: { projectId: project.id },
            include: { user: { select: { name: true, email: true } } },
          }),
        });
      if (method === "POST") {
        const b = z
          .object({
            email: z.email().optional(),
            role: z.enum(["editor", "viewer"]).optional(),
          })
          .parse(await body(req));
        if (b.email) {
          const invitee = await db.user.findUnique({
            where: { email: b.email.toLowerCase() },
          });
          if (!invitee)
            return json(
              { error: "This email needs a BuildSpace account first" },
              404,
            );
          return json(
            await db.member.upsert({
              where: {
                projectId_userId: { projectId: project.id, userId: invitee.id },
              },
              create: {
                projectId: project.id,
                userId: invitee.id,
                role: b.role ?? "viewer",
              },
              update: { role: b.role ?? "viewer" },
            }),
          );
        }
        return json(
          await db.share.create({
            data: {
              projectId: project.id,
              token: randomBytes(24).toString("hex"),
            },
          }),
          201,
        );
      }
      if (method === "DELETE") {
        const b = z
          .object({ id: z.string(), kind: z.enum(["link", "member"]) })
          .parse(await body(req));
        if (b.kind === "link")
          await db.share.deleteMany({
            where: { id: b.id, projectId: project.id },
          });
        else
          await db.member.deleteMany({
            where: { id: b.id, projectId: project.id },
          });
        return json({ ok: true });
      }
    }
    return json({ error: "Unknown operation" }, 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ error: "Invalid input", details: error.issues }, 400);
    if (error instanceof SyntaxError)
      return json({ error: "Invalid JSON" }, 400);
    console.error(error instanceof Error ? error.message : error);
    return json({ error: "The request could not be completed" }, 500);
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
