import { createServer } from "node:http";
import { parse } from "node:url";
import { createHash } from "node:crypto";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname: "127.0.0.1", port });
const handle = app.getRequestHandler();
await app.prepare();
const { db } = await import("./src/lib/db");
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
type Peer = {
  socket: WebSocket;
  projectId: string;
  clientId: string;
  userId: string;
  sessionId: string;
  name: string;
};
const peers = new Set<Peer>();
async function send(projectId: string, message: unknown, exclude?: string) {
  const data = JSON.stringify(message);
  for (const p of peers)
    if (
      p.projectId === projectId &&
      p.clientId !== exclude &&
      p.socket.readyState === WebSocket.OPEN
    ) {
      const [authorized, session] = await Promise.all([
        db.project.findFirst({
          where: {
            id: projectId,
            OR: [
              { ownerId: p.userId },
              { members: { some: { userId: p.userId } } },
            ],
          },
        }),
        db.session.findUnique({ where: { id: p.sessionId } }),
      ]);
      if (authorized && session && session.expiresAt > new Date())
        p.socket.send(data);
      else p.socket.close(1008, "Access revoked");
    }
}
(globalThis as any).buildspaceBroadcast = send;
function presence(projectId: string) {
  send(projectId, {
    type: "presence",
    peers: [...peers]
      .filter((p) => p.projectId === projectId)
      .map((p) => ({ clientId: p.clientId, name: p.name })),
  });
}
const server = createServer((req, res) =>
  handle(req, res, parse(req.url ?? "", true)),
);
server.on("upgrade", async (req, socket, head) => {
  const url = new URL(req.url ?? "", "http://127.0.0.1:3000");
  if (url.pathname !== "/collaboration") {
    app.getUpgradeHandler()(req, socket, head);
    return;
  }
  try {
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host !== req.headers.host)
      throw new Error("Origin rejected");
    const token = (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("buildspace_session="))
      ?.split("=")[1];
    if (!token) throw new Error("Unauthenticated");
    const session = await db.session.findUnique({
      where: { id: createHash("sha256").update(token).digest("hex") },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date())
      throw new Error("Expired session");
    const projectId = url.searchParams.get("projectId") ?? "",
      clientId = url.searchParams.get("clientId") ?? "";
    if (clientId.length > 100) throw new Error("Invalid client");
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (
      !project ||
      (project.ownerId !== session.userId &&
        !project.members.some((m) => m.userId === session.userId))
    )
      throw new Error("Forbidden");
    wss.handleUpgrade(req, socket, head, (ws) => {
      const peer: Peer = {
        socket: ws,
        projectId,
        clientId,
        userId: session.userId,
        sessionId: session.id,
        name: session.user.name,
      };
      peers.add(peer);
      ws.send(
        JSON.stringify({
          type: "revision",
          scene: project.scene,
          revision: project.revision,
          projectId,
        }),
      );
      presence(projectId);
      ws.on("message", async (bytes) => {
        try {
          const current = await db.project.findFirst({
            where: {
              id: projectId,
              OR: [
                { ownerId: session.userId },
                { members: { some: { userId: session.userId } } },
              ],
            },
          });
          if (!current) {
            ws.close(1008, "Access revoked");
            return;
          }
          const m = JSON.parse(bytes.toString());
          if (
            m.type === "cursor" &&
            Number.isFinite(m.x) &&
            Number.isFinite(m.y) &&
            Math.abs(m.x) < 1000 &&
            Math.abs(m.y) < 1000
          )
            send(
              projectId,
              { type: "cursor", clientId, name: peer.name, x: m.x, y: m.y },
              clientId,
            );
        } catch {
          ws.close(1008, "Invalid message");
        }
      });
      ws.on("close", () => {
        peers.delete(peer);
        presence(projectId);
      });
    });
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
});
// Recheck memberships periodically so revocation closes already connected sessions.
const permissionTimer = setInterval(async () => {
  for (const p of peers) {
    const project = await db.project.findFirst({
      where: {
        id: p.projectId,
        OR: [
          { ownerId: p.userId },
          { members: { some: { userId: p.userId } } },
        ],
      },
    });
    if (!project) p.socket.close(1008, "Access revoked");
  }
}, 5000);
permissionTimer.unref();
server.listen(port, "127.0.0.1", () =>
  console.log(
    `BuildSpace ${dev ? "development" : "production"} server ready on port ${port}`,
  ),
);
