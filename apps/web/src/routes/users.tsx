import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SessionData } from "../lib/session";

export const Route = createFileRoute("/users")({
  beforeLoad: ({ context }) => {
    const { session } = context as { session: SessionData };
    if (!session || session.user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: UsersPage
});

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
};

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: isAdmin ? "#e6f4ff" : "#f6ffed",
        color: isAdmin ? "#0958d9" : "#389e0d",
        border: `1px solid ${isAdmin ? "#91caff" : "#b7eb8f"}`
      }}
    >
      {isAdmin ? "管理员" : "业务员"}
    </span>
  );
}

function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const res = await api.users.get();
    setLoading(false);
    if (res.error) {
      setError("加载失败");
      return;
    }
    setUsers((res.data as User[]) ?? []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "sales" : "admin";
    setUpdating(user.id);
    const res = await (api.users as any)[user.id].role.put({ role: newRole });
    setUpdating(null);
    if (res.error) {
      setError("修改失败");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
  };

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>用户管理</h1>
        <button
          onClick={() => router.navigate({ to: "/" })}
          style={{
            padding: "6px 14px",
            background: "#fff",
            border: "1px solid #d9d9d9",
            borderRadius: 4,
            fontSize: 14,
            cursor: "pointer"
          }}
        >
          ← 返回
        </button>
      </div>

      {error && (
        <p style={{ color: "#ff4d4f", marginBottom: 16 }}>{error}</p>
      )}

      {loading ? (
        <p style={{ color: "#999" }}>加载中...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>姓名</th>
              <th style={thStyle}>邮箱</th>
              <th style={thStyle}>角色</th>
              <th style={thStyle}>创建时间</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>{user.name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>
                  <RoleBadge role={user.role} />
                </td>
                <td style={tdStyle}>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => toggleRole(user)}
                    disabled={updating === user.id}
                    style={{
                      padding: "4px 12px",
                      background: "#fff",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: updating === user.id ? "not-allowed" : "pointer",
                      color: "#555"
                    }}
                  >
                    {updating === user.id
                      ? "更新中..."
                      : user.role === "admin"
                        ? "设为业务员"
                        : "设为管理员"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  borderBottom: "1px solid #e8e8e8"
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px"
};
