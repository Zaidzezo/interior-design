import { cookies } from "next/headers";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { db } from "./db";
export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
export const verifyPassword = (password: string, stored: string) => {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(
    Buffer.from(hash, "hex"),
    scryptSync(password, salt, 64),
  );
};
export const sessionHash = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function currentUser() {
  const c = (await cookies()).get("buildspace_session")?.value;
  if (!c) return null;
  const s = await db.session.findUnique({
    where: { id: sessionHash(c) },
    include: { user: true },
  });
  return s && s.expiresAt > new Date() ? s.user : null;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: sessionHash(token),
      userId,
      expiresAt: new Date(Date.now() + 86400_000 * 14),
    },
  });
  (await cookies()).set("buildspace_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400 * 14,
  });
}
