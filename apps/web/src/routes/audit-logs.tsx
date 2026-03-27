import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/audit-logs")({
  component: AuditLogsPage
});

type AuditLogItem = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  "customer.create": "创建客户",
  "customer.update": "更新客户",
  "customer.delete": "删除客户",
  "product.create": "创建产品",
  "product.update": "更新产品",
  "product.delete": "删除产品",
  "order.create": "创建订单",
  "order.update": "更新订单",
  "order.delete": "删除订单",
  "payment.create": "登记回款",
  "payment.delete": "删除回款",
  "return.create": "创建退货",
  "return.delete": "删除退货",
  "user.role_change": "修改角色"
};

function actionColor(action: string): string {
  if (action === "user.role_change") return "#722ed1";
  if (action.endsWith(".delete")) return "#ff4d4f";
  if (action.endsWith(".update")) return "#1677ff";
  if (action.endsWith(".create")) return "#52c41a";
  return "#8c8c8c";
}

const PAGE_SIZE = 50;

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontWeight: 500,
  color: "#8c8c8c",
  fontSize: 12,
  borderBottom: "1px solid #f0f0f0",
  whiteSpace: "nowrap"
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  borderBottom: "1px solid #fafafa",
  verticalAlign: "top"
};

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    if (session && !isAdmin) {
      navigate({ to: "/" });
    }
  }, [session, isAdmin]);

  const load = async (p: number, entity: string, action: string) => {
    setLoading(true);
    const q: Record<string, unknown> = { limit: PAGE_SIZE, offset: p * PAGE_SIZE };
    if (entity) q.entity_type = entity;
    if (action) q.action = action;
    const res = await (api as any)["audit-logs"].get({ query: q });
    if (!res.error) {
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => { load(page, filterEntity, filterAction); }, [page, filterEntity, filterAction]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!isAdmin && session) {
    return null;
  }

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 首页</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>审计日志</h1>
          <span style={{ fontSize: 13, color: "#999" }}>共 {total} 条</span>
        </div>
        <button
          onClick={() => load(page, filterEntity, filterAction)}
          style={{ padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 13, cursor: "pointer" }}
        >
          刷新
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(0); }}
          style={{ padding: "5px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 13, background: "#fff" }}
        >
          <option value="">全部实体</option>
          <option value="customer">客户</option>
          <option value="product">产品</option>
          <option value="order">订单</option>
          <option value="payment">回款</option>
          <option value="return">退货</option>
          <option value="user">用户</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
          style={{ padding: "5px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 13, background: "#fff" }}
        >
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(filterEntity || filterAction) && (
          <button
            onClick={() => { setFilterEntity(""); setFilterAction(""); setPage(0); }}
            style={{ padding: "5px 12px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 13, cursor: "pointer", color: "#ff4d4f" }}
          >
            清除筛选
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#999" }}>加载中...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#aaa" }}>暂无日志</p>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={thStyle}>时间</th>
                <th style={thStyle}>操作者</th>
                <th style={thStyle}>操作</th>
                <th style={thStyle}>实体类型</th>
                <th style={thStyle}>实体 ID</th>
                <th style={thStyle}>详情</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ ...tdStyle, color: "#8c8c8c", whiteSpace: "nowrap" }}>
                    {new Date(item.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td style={tdStyle}>
                    {item.actor_name ?? item.actor_user_id ?? <span style={{ color: "#aaa" }}>系统</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: "inline-block",
                      padding: "1px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${actionColor(item.action)}15`,
                      color: actionColor(item.action)
                    }}>
                      {ACTION_LABEL[item.action] ?? item.action}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "#555" }}>{item.entity_type ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "#8c8c8c", fontFamily: "monospace", fontSize: 11 }}>
                    {item.entity_id ? item.entity_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "#555", maxWidth: 260 }}>
                    {item.metadata && Object.keys(item.metadata as object).length > 0 ? (
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8c8c8c", wordBreak: "break-all" }}>
                        {JSON.stringify(item.metadata)}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: "5px 14px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.5 : 1 }}
          >
            上一页
          </button>
          <span style={{ padding: "5px 12px", fontSize: 13, color: "#555" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: "5px 14px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: page >= totalPages - 1 ? "default" : "pointer", opacity: page >= totalPages - 1 ? 0.5 : 1 }}
          >
            下一页
          </button>
        </div>
      )}
    </main>
  );
}
