import { Router } from "express";
import { db } from "../db.js";
import { opportunities } from "../../shared/schema.js";
import { desc, eq } from "drizzle-orm";

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/opportunities", async (_req, res) => {
  try {
    const all = await db
      .select()
      .from(opportunities)
      .orderBy(desc(opportunities.vibeScore))
      .limit(100);
    res.json({ data: all });
  } catch {
    res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});

opportunitiesRouter.get("/opportunities/executable", async (_req, res) => {
  try {
    const all = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.executable, true))
      .orderBy(desc(opportunities.vibeScore))
      .limit(50);
    res.json({ data: all });
  } catch {
    res.status(500).json({ error: "Failed to fetch executable opportunities" });
  }
});
