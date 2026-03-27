import { Elysia, t } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
};

export const auditLogsRoute = new Elysia({ prefix: "/audit-logs" })
  .use(authMacro)
  .get(
    "/",
    async ({ user, set, query }) => {
      if ((user as { role?: string }).role !== "admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const { entity_type, action, limit = 50, offset = 0 } = query;

      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (entity_type) {
        conditions.push(`al.entity_type = $${idx++}`);
        params.push(entity_type);
      }
      if (action) {
        conditions.push(`al.action = $${idx++}`);
        params.push(action);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      params.push(limit);
      params.push(offset);

      const res = await pool.query<AuditLogRow>(
        `SELECT
           al.id,
           al.actor_user_id,
           u.name AS actor_name,
           al.action,
           al.entity_type,
           al.entity_id,
           al.metadata,
           al.created_at
         FROM audit_logs al
         LEFT JOIN "user" u ON u.id = al.actor_user_id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        params
      );

      const countRes = await pool.query<{ total: string }>(
        `SELECT COUNT(*)::integer AS total FROM audit_logs al ${where}`,
        params.slice(0, -2)
      );

      return {
        items: res.rows,
        total: Number(countRes.rows[0]?.total ?? 0)
      };
    },
    {
      auth: true,
      query: t.Object({
        entity_type: t.Optional(t.String()),
        action: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
        offset: t.Optional(t.Number({ minimum: 0 }))
      })
    }
  );
