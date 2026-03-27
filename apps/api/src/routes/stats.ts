import { Elysia } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";

type SummaryRow = {
  order_total: number;
  order_todo: number;
  order_sent: number;
  order_unsettled: number;
  order_settled: number;
  order_canceled: number;
  revenue_cents: number;
  paid_cents: number;
  return_count: number;
  return_total_cents: number;
  customer_count: number;
  product_count: number;
  low_stock_count: number;
};

type TrendRow = {
  date: string;
  count: number;
  revenue_cents: number;
};

export const statsRoute = new Elysia({ prefix: "/stats" })
  .use(authMacro)
  .get(
    "/summary",
    async () => {
      const summaryRes = await pool.query<SummaryRow>(`
        WITH
          order_stats AS (
            SELECT
              COUNT(*)::integer                                              AS total,
              COUNT(*) FILTER (WHERE status = 'todo')::integer              AS todo,
              COUNT(*) FILTER (WHERE status = 'sent')::integer              AS sent,
              COUNT(*) FILTER (WHERE status = 'unsettled')::integer         AS unsettled,
              COUNT(*) FILTER (WHERE status = 'settled')::integer           AS settled,
              COUNT(*) FILTER (WHERE status = 'canceled')::integer          AS canceled
            FROM sales_orders
          ),
          revenue AS (
            SELECT COALESCE(SUM(soi.line_total_cents), 0)::integer AS revenue_cents
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.sales_order_id
            WHERE so.status != 'canceled'
          ),
          paid AS (
            SELECT COALESCE(SUM(amount_cents), 0)::integer AS paid_cents
            FROM payments
          ),
          return_stats AS (
            SELECT
              COUNT(*)::integer                              AS count,
              COALESCE(SUM(total_cents), 0)::integer        AS total_cents
            FROM returns
          ),
          customer_stats AS (
            SELECT COUNT(*)::integer AS count FROM customers
          ),
          product_stats AS (
            SELECT
              COUNT(*)::integer                                           AS count,
              COUNT(*) FILTER (WHERE stock <= stock_alert)::integer       AS low_stock_count
            FROM products
          )
        SELECT
          (SELECT total      FROM order_stats) AS order_total,
          (SELECT todo       FROM order_stats) AS order_todo,
          (SELECT sent       FROM order_stats) AS order_sent,
          (SELECT unsettled  FROM order_stats) AS order_unsettled,
          (SELECT settled    FROM order_stats) AS order_settled,
          (SELECT canceled   FROM order_stats) AS order_canceled,
          (SELECT revenue_cents      FROM revenue)        AS revenue_cents,
          (SELECT paid_cents         FROM paid)           AS paid_cents,
          (SELECT count              FROM return_stats)   AS return_count,
          (SELECT total_cents        FROM return_stats)   AS return_total_cents,
          (SELECT count              FROM customer_stats) AS customer_count,
          (SELECT count              FROM product_stats)  AS product_count,
          (SELECT low_stock_count    FROM product_stats)  AS low_stock_count
      `);

      const trendRes = await pool.query<TrendRow>(`
        SELECT
          DATE_TRUNC('day', so.created_at)::date::text            AS date,
          COUNT(*)::integer                                        AS count,
          COALESCE(SUM(soi.line_total_cents), 0)::integer         AS revenue_cents
        FROM sales_orders so
        LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
        WHERE so.created_at >= NOW() - INTERVAL '30 days'
          AND so.status != 'canceled'
        GROUP BY 1
        ORDER BY 1
      `);

      const s = summaryRes.rows[0] ?? {
        order_total: 0, order_todo: 0, order_sent: 0,
        order_unsettled: 0, order_settled: 0, order_canceled: 0,
        revenue_cents: 0, paid_cents: 0,
        return_count: 0, return_total_cents: 0,
        customer_count: 0, product_count: 0, low_stock_count: 0
      };

      return {
        orders: {
          total: Number(s.order_total),
          by_status: {
            todo: Number(s.order_todo),
            sent: Number(s.order_sent),
            unsettled: Number(s.order_unsettled),
            settled: Number(s.order_settled),
            canceled: Number(s.order_canceled)
          }
        },
        revenue_cents: Number(s.revenue_cents),
        paid_cents: Number(s.paid_cents),
        outstanding_cents: Math.max(0, Number(s.revenue_cents) - Number(s.paid_cents)),
        returns: {
          count: Number(s.return_count),
          total_cents: Number(s.return_total_cents)
        },
        customers: { count: Number(s.customer_count) },
        products: {
          count: Number(s.product_count),
          low_stock_count: Number(s.low_stock_count)
        },
        trend: trendRes.rows.map((r) => ({
          date: r.date,
          count: Number(r.count),
          revenue_cents: Number(r.revenue_cents)
        }))
      };
    },
    { auth: true }
  );
