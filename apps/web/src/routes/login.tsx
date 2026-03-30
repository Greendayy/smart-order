import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = () => {
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    setCodeSent(true);
    setError("");
  };

  const handleLogin = () => {
    if (code !== "123456") {
      setError("验证码错误（提示：123456）");
      return;
    }
    localStorage.setItem("smart_order_logged_in", "true");
    localStorage.setItem("smart_order_user", email);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Smart Order</h1>
        <p className="text-gray-500 text-center text-sm mb-8">智能订单管理系统</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {codeSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {!codeSent ? (
            <button
              onClick={handleSendCode}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              获取验证码
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              登录
            </button>
          )}
        </div>

        <p className="text-gray-400 text-xs text-center mt-6">
          测试验证码：123456
        </p>
      </div>
    </div>
  );
}
