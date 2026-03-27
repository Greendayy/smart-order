import { Elysia, t } from "elysia";
import crypto from "node:crypto";
import { pool } from "../db";
import { auth } from "../auth";
import { sendCode } from "../mail";

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function verifyCode(email: string, code: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM verification
     WHERE id IN (
       SELECT id FROM verification
       WHERE identifier = $1 AND value = $2 AND "expiresAt" > now()
       LIMIT 1
     )
     RETURNING id`,
    [email, code]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export const authCodeRoute = new Elysia({ prefix: "/auth-code" })
  /* ── 发送验证码 ── */
  .post(
    "/send",
    async ({ body, set }) => {
      const { email } = body;

      // 60s rate limit
      const recent = await pool.query(
        `SELECT 1 FROM verification
         WHERE identifier = $1 AND "createdAt" > now() - interval '60 seconds'
         LIMIT 1`,
        [email]
      );
      if (recent.rowCount && recent.rowCount > 0) {
        set.status = 429;
        return { error: "发送过于频繁，请 60 秒后重试" };
      }

      const code = generateCode();

      await pool.query(
        `INSERT INTO verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, now() + interval '5 minutes', now(), now())`,
        [crypto.randomUUID(), email, code]
      );

      try {
        await sendCode(email, code);
      } catch (err) {
        console.error("Failed to send email:", err);
        set.status = 500;
        return { error: "邮件发送失败，请稍后重试" };
      }

      return { ok: true };
    },
    {
      body: t.Object({ email: t.String({ format: "email" }) })
    }
  )

  /* ── 验证码注册 ── */
  .post(
    "/register",
    async ({ body, set }) => {
      const { email, code, name, password } = body;

      if (!(await verifyCode(email, code))) {
        set.status = 400;
        return { error: "验证码错误或已过期" };
      }

      // Check if user already exists
      const existing = await pool.query(
        `SELECT id FROM "user" WHERE email = $1`,
        [email]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        set.status = 409;
        return { error: "该邮箱已注册" };
      }

      // Create user via better-auth internal API
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
        asResponse: true
      });

      // Forward the Set-Cookie header from better-auth
      const headers: Record<string, string> = {};
      const setCookie = result.headers.get("set-cookie");
      if (setCookie) {
        headers["set-cookie"] = setCookie;
      }

      const data = await result.json();
      set.headers = headers;
      return data;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        code: t.String({ minLength: 6, maxLength: 6 }),
        name: t.String({ minLength: 1 }),
        password: t.String({ minLength: 6 })
      })
    }
  )

  /* ── 验证码登录 ── */
  .post(
    "/login",
    async ({ body, set }) => {
      const { email, code } = body;

      if (!(await verifyCode(email, code))) {
        set.status = 400;
        return { error: "验证码错误或已过期" };
      }

      // Check user exists
      const userResult = await pool.query(
        `SELECT id FROM "user" WHERE email = $1`,
        [email]
      );
      if (!userResult.rowCount || userResult.rowCount === 0) {
        set.status = 404;
        return { error: "该邮箱尚未注册" };
      }

      // Create session directly (OTP login bypasses password check)
      const userId = userResult.rows[0].id;
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await pool.query(
        `INSERT INTO session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, now(), now())`,
        [crypto.randomUUID(), token, userId, expiresAt]
      );

      // Set session cookie manually (match better-auth cookie format)
      set.headers["set-cookie"] =
        `better-auth.session_token=${token}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`;

      const user = await pool.query(
        `SELECT id, name, email, role FROM "user" WHERE id = $1`,
        [userId]
      );

      return { user: user.rows[0], token };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        code: t.String({ minLength: 6, maxLength: 6 })
      })
    }
  );
