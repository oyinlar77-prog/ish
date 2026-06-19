import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAILS = ["tuevulugbek1991@gmail.com", "globjournal@gmail.com"];

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, auth.userId))
    .limit(1);

  if (!user[0] || user[0].role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}

export async function getOrCreateUser(clerkId: string, email: string, name?: string, avatarUrl?: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";

  const [newUser] = await db
    .insert(usersTable)
    .values({ clerkId, email, name, avatarUrl, role, tier: "free" })
    .returning();

  return newUser;
}
