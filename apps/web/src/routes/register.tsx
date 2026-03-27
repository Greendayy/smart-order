import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";

export const Route = createFileRoute("/register")({
  component: RegisterPage
});

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (countdown <= 0) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown > 0]);

  const sendCode = useCallback(async () => {
    if (!email || countdown > 0) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth-code/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "发送失败");
        return;
      }
      setCodeSent(true);
      setCountdown(60);
    } catch {
      setError("网络错误");
    }
  }, [email, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPwd) {
      setError("两次密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth-code/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, name, password }),
        credentials: "include"
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error ?? "注册失败");
        return;
      }

      await router.invalidate();
      router.navigate({ to: "/" });
    } catch {
      setLoading(false);
      setError("网络错误");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d9d9d9",
    borderRadius: 4,
    fontSize: 14,
    boxSizing: "border-box"
  };

  return (
    <main
      style={{
        fontFamily: "ui-sans-serif, system-ui",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        margin: 0,
        backgroundColor: "#f5f5f5"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 40,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          width: 360
        }}
      >
        <h1 style={{ margin: "0 0 24px", fontSize: 24 }}>注册账号</h1>

        <form onSubmit={handleSubmit}>
          {/* Email + send code */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>邮箱</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={codeSent}
                style={{ ...inputStyle, flex: 1, background: codeSent ? "#f5f5f5" : "#fff" }}
              />
              <button
                type="button"
                disabled={!email || countdown > 0}
                onClick={sendCode}
                style={{
                  whiteSpace: "nowrap",
                  padding: "8px 14px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                  background: !email || countdown > 0 ? "#f5f5f5" : "#fff",
                  cursor: !email || countdown > 0 ? "not-allowed" : "pointer",
                  fontSize: 13,
                  color: countdown > 0 ? "#999" : "#1677ff"
                }}
              >
                {countdown > 0 ? `${countdown}s` : codeSent ? "重新发送" : "发送验证码"}
              </button>
            </div>
          </div>

          {/* Code */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>验证码</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="6 位验证码"
              style={inputStyle}
            />
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少 6 位"
              style={inputStyle}
            />
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>确认密码</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: "#ff4d4f", fontSize: 14, margin: "0 0 16px" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              background: loading ? "#bbb" : "#1677ff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 14, margin: "20px 0 0", color: "#666" }}>
          已有账号？
          <Link to="/login" style={{ color: "#1677ff", textDecoration: "none" }}>
            返回登录
          </Link>
        </p>
      </div>
    </main>
  );
}
