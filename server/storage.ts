import { type User, type InsertUser, couponCodes, users, offres, type Offre, updateTable, pubTable, pub2Table, sharApp, socialTable, calendrier, coin, sale } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { sql, eq, asc, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCouponCodes(country?: string): Promise<any[]>;
  getOffres(country?: string): Promise<Offre[]>;
  getUpdate(): Promise<any | null>;
  getPub(country?: string): Promise<any[]>;
  getPub2(country?: string): Promise<any[]>;
  getShareAppContent(lang?: string): Promise<string | null>;
  getSocialLinks(): Promise<{ telegram: string | null; facebook: string | null; tiktok: string | null; bot: string | null } | null>;
  getCalendrier(): Promise<any[]>;
  getCoin(): Promise<any[]>;
  getSale(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID().substring(0, 6);
    const [user] = await db.insert(users).values({ ...insertUser, id }).returning();
    return user;
  }

  async getCouponCodes(country?: string): Promise<any[]> {
    const countryCode = (country || "DZ").toLowerCase();
    return await db.select().from(couponCodes).where(eq(couponCodes.country, countryCode));
  }

  async getOffres(country?: string): Promise<Offre[]> {
    const countryCode = (country || "DZ").toLowerCase();
    return await db.select().from(offres).where(eq(offres.country, countryCode)).orderBy(desc(offres.id)) as Offre[];
  }

  async getUpdate(): Promise<any | null> {
    const rows = await db.select().from(updateTable);
    if (rows.length === 0) return null;
    return rows[0];
  }

  async getPub(country?: string): Promise<any[]> {
    const countryCode = (country || "dz").toLowerCase();
    return await db.select().from(pubTable).where(eq(pubTable.country, countryCode));
  }

  async getPub2(country?: string): Promise<any[]> {
    const countryCode = (country || "dz").toLowerCase();
    return await db.select().from(pub2Table).where(eq(pub2Table.country, countryCode));
  }

  async getShareAppContent(lang?: string): Promise<string | null> {
    const rows = await db.select().from(sharApp);
    if (rows.length === 0) return null;
    return lang === "ar" ? rows[0].contentAr : rows[0].contentEn;
  }

  async getSocialLinks(): Promise<{ telegram: string | null; facebook: string | null; tiktok: string | null; bot: string | null } | null> {
    const rows = await db.select().from(socialTable);
    if (rows.length === 0) return null;
    return { telegram: rows[0].telegram, facebook: rows[0].facebook, tiktok: rows[0].tiktok, bot: rows[0].bot };
  }

  async getCalendrier(): Promise<any[]> {
    return await db.select().from(calendrier).orderBy(asc(calendrier.id));
  }

  async getCoin(): Promise<any[]> {
    return await db.select().from(coin).orderBy(asc(coin.id));
  }

  async getSale(): Promise<any[]> {
    return await db.select().from(sale).orderBy(asc(sale.id));
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getCouponCodes(_country?: string): Promise<any[]> { return []; }
  async getOffres(_country?: string): Promise<Offre[]> { return []; }
  async getUpdate(): Promise<any | null> { return null; }
  async getPub(_country?: string): Promise<any[]> { return []; }
  async getPub2(_country?: string): Promise<any[]> { return []; }
  async getShareAppContent(_lang?: string): Promise<string | null> { return null; }
  async getSocialLinks(): Promise<{ telegram: string | null; facebook: string | null; tiktok: string | null; bot: string | null } | null> { return null; }
  async getCalendrier(): Promise<any[]> { return []; }
  async getCoin(): Promise<any[]> { return []; }
  async getSale(): Promise<any[]> { return []; }
}

export const storage = new DatabaseStorage();
