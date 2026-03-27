import { pool } from "./db";

/**
 * Fire-and-forget audit log writer. Never throws — failures are silently swallowed
 * so they never break the originating request.
 */
export function auditLog(
  actorUserId: string | null,
  action: string,
  entityType: string | null,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): void {
  pool
    .query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorUserId, action, entityType, entityId, JSON.stringify(metadata)]
    )
    .catch(() => {
      // best-effort — never fail the originating request
    });
}
