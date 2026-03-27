import { Elysia, t } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";

const PRINT_TEMPLATE_KEY = "print_template";

export type PrintTemplate = {
  company_name: string;
  company_address: string;
  company_phone: string;
  title: string;
  header_note: string;
  footer_note: string;
  show_unit_price: boolean;
  show_total: boolean;
  show_payment: boolean;
};

const DEFAULT_TEMPLATE: PrintTemplate = {
  company_name: "我的公司",
  company_address: "",
  company_phone: "",
  title: "销售单",
  header_note: "",
  footer_note: "感谢惠顾！",
  show_unit_price: true,
  show_total: true,
  show_payment: true
};

const templateBody = t.Object({
  company_name: t.String(),
  company_address: t.String(),
  company_phone: t.String(),
  title: t.String(),
  header_note: t.String(),
  footer_note: t.String(),
  show_unit_price: t.Boolean(),
  show_total: t.Boolean(),
  show_payment: t.Boolean()
});

export const settingsRoute = new Elysia({ prefix: "/settings" })
  .use(authMacro)

  // Get print template config
  .get(
    "/print-template",
    async () => {
      const res = await pool.query<{ value: PrintTemplate }>(
        `SELECT value FROM app_settings WHERE key = $1`,
        [PRINT_TEMPLATE_KEY]
      );
      return (res.rows[0]?.value ?? DEFAULT_TEMPLATE) as PrintTemplate;
    },
    { auth: true }
  )

  // Save print template config (admin only)
  .put(
    "/print-template",
    async ({ user, body, set }) => {
      if ((user as { role?: string }).role !== "admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()`,
        [PRINT_TEMPLATE_KEY, JSON.stringify(body)]
      );
      return { ok: true };
    },
    { auth: true, body: templateBody }
  );
