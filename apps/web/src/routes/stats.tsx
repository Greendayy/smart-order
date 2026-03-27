import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan } from "../lib/format";

export const Route = createFileRoute("/stats")({
  component: StatsPage
});

type Summary = {
  orders: {
    total: number;
    by_status: {
      todo: number;
      sent: number;
      unsettled: number;
      settled: number;
      canceled: number;
    };
  };
  revenue_cents: number;
  paid_cents: number;
  outstanding_cents: number;
  returns: { count: number; total_cents: number };
  customers: { count: number };
  products: { count: number; low_stock_count: number };
  trend: Array<{ date: string; count: number; revenue_cents: number }>;
};

const STATUS_LABEL: Record<string, string> = {
  todo: "未发送",
  sent: "已发送",
  unsettled: "未结算",
  settled: "已结算",
  canceled: "已作废"
};

const STATUS_COLOR: Record<string, string> = {
  todo: "#8c8c8c",
  sent: "#1677ff",
  unsettled: "#fa8c16",
  settled: "#52c41a",
  canceled: "#d9d9d9"
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: 8,
  padding: "16px 20px",
  minWidth: 0
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#8c8c8c",
  marginBottom: 6
};

const cardValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#222"
};

export default function StatsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await (api as any).stats.summary.get();
    if (res.error) {
      setError("加载失败");
    } else {
      setData(res.data as Summary);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}><p style={{ color: "#999" }}>加载中...</p></main>;
  if (error || !data) return <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}><p style={{ color: "#ff4d4f" }}>{error ?? "加载失败"}</p></main>;

  const maxTrend = Math.max(...data.trend.map((t) => t.revenue_cents), 1);

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 首页</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>数据统计</h1>
        </div>
        <button
          onClick={load}
          style={{ padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 13, cursor: "pointer" }}
        >
          刷新
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>订单总数</p>
          <p style={cardValueStyle}>{data.orders.total}</p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>销售额（已发单）</p>
          <p style={{ ...cardValueStyle, color: "#1677ff" }}>{formatYuan(data.revenue_cents)}</p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>已收款</p>
          <p style={{ ...cardValueStyle, color: "#52c41a" }}>{formatYuan(data.paid_cents)}</p>
        </div>
        <div style={{ ...cardStyle, borderColor: data.outstanding_cents > 0 ? "#ffbb96" : "#e8e8e8" }}>
          <p style={cardLabelStyle}>待收款</p>
          <p style={{ ...cardValueStyle, color: data.outstanding_cents > 0 ? "#d4380d" : "#222" }}>
            {formatYuan(data.outstanding_cents)}
          </p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>退货笔数</p>
          <p style={cardValueStyle}>{data.returns.count}</p>
          <p style={{ fontSize: 12, color: "#8c8c8c", margin: "4px 0 0" }}>退款 {formatYuan(data.returns.total_cents)}</p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>客户数</p>
          <p style={cardValueStyle}>{data.customers.count}</p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>产品数</p>
          <p style={cardValueStyle}>{data.products.count}</p>
        </div>
        <div style={{ ...cardStyle, borderColor: data.products.low_stock_count > 0 ? "#ffe58f" : "#e8e8e8" }}>
          <p style={cardLabelStyle}>低库存产品</p>
          <p style={{ ...cardValueStyle, color: data.products.low_stock_count > 0 ? "#d48806" : "#222" }}>
            {data.products.low_stock_count}
          </p>
          <p style={{ fontSize: 12, color: "#8c8c8c", margin: "4px 0 0" }}>≤ 预警阈值</p>
        </div>
      </div>

      {/* Order status breakdown */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 14px", fontWeight: 600 }}>订单状态分布</h2>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {(["todo", "sent", "unsettled", "settled", "canceled"] as const).map((s) => {
            const count = data.orders.by_status[s];
            const pct = data.orders.total > 0 ? Math.round((count / data.orders.total) * 100) : 0;
            return (
              <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{
                  display: "flex" as any,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: STATUS_COLOR[s],
                  color: s === "canceled" ? "#aaa" : "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700
                }}>
                  {count}
                </span>
                <span style={{ fontSize: 12, color: "#555" }}>{STATUS_LABEL[s]}</span>
                <span style={{ fontSize: 11, color: "#aaa" }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 30-day trend */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "16px 20px" }}>
        <h2 style={{ fontSize: 15, margin: "0 0 14px", fontWeight: 600 }}>近 30 天趋势（非作废订单）</h2>
        {data.trend.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: 14 }}>暂无数据</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #f0f0f0" }}>
                  <th style={{ padding: "6px 12px", color: "#8c8c8c", fontWeight: 500 }}>日期</th>
                  <th style={{ padding: "6px 12px", color: "#8c8c8c", fontWeight: 500 }}>订单数</th>
                  <th style={{ padding: "6px 12px", color: "#8c8c8c", fontWeight: 500, minWidth: 200 }}>销售额</th>
                </tr>
              </thead>
              <tbody>
                {data.trend.map((row) => {
                  const barPct = Math.round((row.revenue_cents / maxTrend) * 100);
                  return (
                    <tr key={row.date} style={{ borderBottom: "1px solid #fafafa" }}>
                      <td style={{ padding: "6px 12px", color: "#555" }}>{row.date}</td>
                      <td style={{ padding: "6px 12px", fontWeight: 600 }}>{row.count}</td>
                      <td style={{ padding: "6px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            height: 14,
                            width: `${barPct}%`,
                            minWidth: barPct > 0 ? 4 : 0,
                            background: "#1677ff",
                            borderRadius: 2,
                            opacity: 0.7
                          }} />
                          <span style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>{formatYuan(row.revenue_cents)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
