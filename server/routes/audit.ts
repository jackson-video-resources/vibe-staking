import { Router } from "express";
import { db } from "../db.js";
import { auditLog } from "../../shared/schema.js";
import { desc } from "drizzle-orm";

export const auditRouter = Router();

auditRouter.get("/audit", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? "50")) || 50, 1),
      200,
    );
    const offset = Math.max(parseInt(String(req.query.offset ?? "0")) || 0, 0);

    const rows = await db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.timestamp))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});
