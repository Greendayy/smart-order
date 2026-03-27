import nodemailer from "nodemailer";
import { env } from "./env";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
});

export async function sendCode(email: string, code: string): Promise<void> {
  if (!env.smtpUser || !env.smtpPass) {
    console.log(`[DEV] 验证码 -> ${email}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"Smart Order" <${env.smtpUser}>`,
    to: email,
    subject: "Smart Order 验证码",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="margin:0 0 16px;color:#333">Smart Order</h2>
        <p style="color:#555;font-size:14px;margin:0 0 16px">您的验证码是：</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1677ff;text-align:center;padding:16px 0">${code}</div>
        <p style="color:#999;font-size:12px;margin:16px 0 0">验证码 5 分钟内有效，请勿泄露给他人。</p>
      </div>
    `
  });
}
