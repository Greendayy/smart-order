/**
 * Generate order number in format: DD20260330001
 * DD + YYYYMMDD + 3-digit daily sequence
 */
export async function generateOrderNumber(sql: { unsafe: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]> }): Promise<string> {
  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const prefix = `DD${dateStr}`;

  // Count today's orders to get next sequence number
  const rows = await sql.unsafe(
    `select count(*)::int as cnt from sales_orders where order_no like $1`,
    [prefix + "%"]
  );
  const seq = (Number(rows[0]?.cnt) || 0) + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}
