import type { Express, Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import * as crypto from "crypto";
import { db } from "./db";
import { users, adminLogin, insertUserSchema, loginSchema } from "@shared/schema";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateUserId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += Math.floor(Math.random() * 10).toString();
  }
  return id;
}

async function isUserIdUnique(id: string): Promise<boolean> {
  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return existing.length === 0;
}

async function generateUniqueUserId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const id = generateUserId();
    if (await isUserIdUnique(id)) {
      return id;
    }
    attempts++;
  }

  throw new Error("Failed to generate unique user ID");
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const { firstName, lastName, email, birthDate, password, country } = validation.data;

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      const userId = await generateUniqueUserId();
      const hashedPassword = hashPassword(password);

      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          birthDate,
          password: hashedPassword,
          country,
          online: "off",
        })
        .returning();

      return res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          country: newUser.country,
          isAdmin: false,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  });

  // Login: check users table first, then admin_login table
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const { emailOrUsername, password } = validation.data;
      const normalizedEmail = emailOrUsername.toLowerCase();
      const hashedPassword = hashPassword(password);

      // 1. Check users table first (passwords stored as SHA-256 hashes)
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (userRows.length > 0) {
        const user = userRows[0];
        if (user.password !== hashedPassword) {
          return res.status(401).json({ message: "Invalid password" });
        }
        // Mark user as online
        await db.update(users).set({ online: "on" }).where(eq(users.id, user.id));
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            country: user.country,
            isAdmin: false,
          },
        });
      }

      // 2. Check admin_login table (passwords stored as plain text)
      const adminRows = await db
        .select()
        .from(adminLogin)
        .where(eq(adminLogin.email, normalizedEmail))
        .limit(1);

      if (adminRows.length > 0) {
        const admin = adminRows[0];
        if (admin.password !== password) {
          return res.status(401).json({ message: "Invalid password" });
        }
        return res.json({
          message: "Login successful",
          user: {
            id: "admin",
            firstName: "Admin",
            lastName: "",
            email: admin.email,
            country: "",
            isAdmin: true,
          },
        });
      }

      // 3. Not found in either table
      return res.status(404).json({ message: "User not found" });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update online status — server-side session time accumulation
  // Every heartbeat (online=on) and every logout (online=off), the server
  // calculates elapsed seconds since last_seen and adds them to temps.
  app.put("/api/auth/online/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { online } = req.body;
      if (!["on", "off"].includes(online)) {
        return res.status(400).json({ message: "Invalid online status" });
      }

      // Read current state to calculate elapsed time
      const rows = await db
        .select({ online: users.online, lastSeen: users.lastSeen })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      const current = rows[0] ?? null;
      const now = new Date();

      if (online === "on") {
        // Heartbeat: if user was already online, accumulate time since last heartbeat.
        // Cap at 120 s to guard against stale lastSeen values after crashes.
        if (current?.online === "on" && current.lastSeen) {
          const elapsed = Math.floor((now.getTime() - new Date(current.lastSeen).getTime()) / 1000);
          if (elapsed > 0 && elapsed <= 120) {
            await db
              .update(users)
              .set({ online: "on", lastSeen: now, temps: sql`COALESCE(temps, 0) + ${elapsed}` })
              .where(eq(users.id, id));
            return res.json({ message: "Online status updated" });
          }
        }
        // First heartbeat of a session — just mark online + lastSeen
        await db.update(users).set({ online: "on", lastSeen: now }).where(eq(users.id, id));
      } else {
        // Going offline: accumulate remaining time since last heartbeat (cap 120 s)
        if (current?.online === "on" && current.lastSeen) {
          const elapsed = Math.floor((now.getTime() - new Date(current.lastSeen).getTime()) / 1000);
          if (elapsed > 0 && elapsed <= 120) {
            await db
              .update(users)
              .set({ online: "off", desactive: now, temps: sql`COALESCE(temps, 0) + ${elapsed}` })
              .where(eq(users.id, id));
            return res.json({ message: "Online status updated" });
          }
        }
        await db.update(users).set({ online: "off", desactive: now }).where(eq(users.id, id));
      }

      return res.json({ message: "Online status updated" });
    } catch (error) {
      console.error("Online status error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy endpoint kept for compatibility — no longer used by the client
  app.post("/api/auth/session-time/:id", async (req: Request, res: Response) => {
    return res.json({ message: "OK" });
  });

  app.put("/api/auth/user/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, birthDate, country, newPassword } = req.body;

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const normalizedEmail = email ? email.toLowerCase() : user[0].email;

      if (email && normalizedEmail !== user[0].email) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (existingUser.length > 0) {
          return res.status(409).json({ message: "Email already exists" });
        }
      }

      const updateData: any = {
        firstName: firstName ?? user[0].firstName,
        lastName: lastName ?? user[0].lastName,
        email: normalizedEmail,
        birthDate: birthDate ?? user[0].birthDate,
        country: country ?? user[0].country,
      };

      if (newPassword && newPassword.length >= 8) {
        updateData.password = hashPassword(newPassword);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return res.json({
        message: "User updated successfully",
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          country: updatedUser.country,
          isAdmin: false,
        },
      });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/auth/user/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      await db.delete(users).where(eq(users.id, id));

      return res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
