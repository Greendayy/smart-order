import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan } from "../lib/format";

export const Route = createFileRoute("/returns")({
  component: ReturnsPage
});

type ReturnRow = {
  id: string;
  sales_order_id: string;
  customer_name: string;
  reason: string | null;
  method: string | null;
  total_cents: number;
  created_at: string;
};

function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await (api as any).returns.get();
    setLoading(false);
    if (res.error) { setError("加载失败"); return; }
    setReturns(res.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const totalReturned = returns.reduce((s, r) => s + r.total_cents, 0);

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>退货管理</h1>
        </div>
        {returns.length > 0 && (
          <div style={{ padding: "6px 14px", background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6, fontSize: 13 }}>
            <span style={{ color: "#cf1322", fontWeight: 600 }}>本期退货合计：{formatYuan(totalReturned)}</span>
          </div>
        )}
      </div>

      {error && <p style={{ color: "#ff4d4f" }}>{error}</p>}

      {loading ? (
        <p style={{ color: "#999" }}>加载中...</p>
      ) : returns.length === 0 ? (
        <p style={{ color: "#999" }}>暂无退货记录</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>日期</th>
              <th style={thStyle}>客户</th>
              <th style={thStyle}>退货金额</th>
              <th style={thStyle}>退款方式</th>
              <th style={thStyle}>原因</th>
              <th style={thStyle}>关联订单</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString("zh-CN")}</td>
                <td style={tdStyle}><b>{r.customer_name}</b></td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#cf1322" }}>{formatYuan(r.total_cents)}</td>
                <td style={tdStyle}>{r.method ?? "—"}</td>
                <td style={{ ...tdStyle, color: "#666" }}>{r.reason ?? "—"}</td>
                <td style={tdStyle}>
                  <Link
                    to="/order-detail"
                    search={{ id: r.sales_order_id }}
                    style={{ fontSize: 13, color: "#1677ff", textDecoration: "none" }}
                  >
                    查看订单
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, borderBottom: "1px solid #e8e8e8" };
const tdStyle: React.CSSProperties = { padding: "10px 12px" };
