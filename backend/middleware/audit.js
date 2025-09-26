// backend/middleware/audit.js

import { client } from "../db/connection.js";  // your MongoDB client

/**
 * Audit-logging middleware for Express.
 * Records each admin action into 'audit_logs' collection.
 * Requires authenticateJWT to populate req.user.userID.
 */
export default function auditLogger(req, res, next) {
  const startTime = Date.now();

  // After response is sent, write the audit entry
  res.on("finish", async () => {
    try {
      const durationMs = Date.now() - startTime;
      const db = client.db(process.env.DATABASE_NAME);
      const entry = {
        adminID:    req.user?.userID || null,
        route:      req.originalUrl,
        method:     req.method,
        statusCode: res.statusCode,
        durationMs: durationMs,
        timestamp:  new Date(),
        ip:         req.ip,
        userAgent:  req.headers["user-agent"] || "",
        // optional: include request details
        query:      req.query && Object.keys(req.query).length ? req.query : undefined,
        body:       req.body  && Object.keys(req.body).length  ? req.body  : undefined
      };
      await db.collection("audit_logs").insertOne(entry);
    } catch (err) {
      console.error("[AuditLogger] Failed to write audit log:", err);
    }
  });

  next();
}
