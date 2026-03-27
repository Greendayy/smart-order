import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan, ORDER_STATUS } from "../lib/format";

export const Route = createFileRoute("/customer-detail")({
  component: CustomerDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({ id: search.id as string })
});

type Order = {
  id: string;
  status: string;
  note: string | null;
  total_cents: number;
  paid_cents: number;
  created_at: string;
};

type CustomerDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  receivable_cents: number;
  created_at: string;
  orders: Order[];
};

function CustomerDetailPage() {
  const { id } = Route.useSearch();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await (api.customers as any)[id].get();
    setLoading(false);
    if (res.error || res.data?.error) { setError("客户不存在"); return; }
    const data = res.data as CustomerDetail;
    setCustomer(data);
    setForm({
      name: data.name,
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? ""
    });
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await (api.customers as any)[id].put({
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined
    });
    setSaving(false);
    if (res.error) { setError("保存失败"); return; }
    setEditing(false);
    load();
  };

  if (loading) return <main style={pageStyle}><p style={{ color: "#999" }}>加载中...</p></main>;
  if (error || !customer) return <main style={pageStyle}><p style={{ color: "#ff4d4f" }}>{error ?? "加载失败"}</p></main>;

  const unpaidOrders = customer.orders.filter((o) => o.status !== "canceled" && o.total_cents > o.paid_cents);

  return (
    <main style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/customers" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 客户列表</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>{customer.name}</h1>
        </div>
        <button onClick={() => setEditing((v) => !v)} style={btnSecondary}>
          {editing ? "取消编辑" : "编辑"}
        </button>
      </div>

      {/* Receivable alert */}
      {customer.receivable_cents > 0 && (
        <div style={{ background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#cf1322" }}>
            ⚠ 应收账款：{formatYuan(customer.receivable_cents)}
          </span>
          <span style={{ marginLeft: 12, fontSize: 13, color: "#999" }}>{unpaidOrders.length} 笔未结清</span>
        </div>
      )}

      {/* Info card / Edit form */}
      {editing ? (
        <form onSubmit={handleSave} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>姓名 *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>电话</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>邮箱</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>地址</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 20 }}>
          {[
            ["电话", customer.phone],
            ["邮箱", customer.email],
            ["地址", customer.address],
            ["创建时间", new Date(customer.created_at).toLocaleDateString("zh-CN")]
          ].map(([label, value]) => (
            <div key={label}>
              <span style={{ fontSize: 12, color: "#999" }}>{label}</span>
              <p style={{ margin: "2px 0 0", fontSize: 14 }}>{value ?? "—"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Orders */}
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>交易历史</h2>
      {customer.orders.length === 0 ? (
        <p style={{ color: "#999", fontSize: 14 }}>暂无订单记录</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>日期</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>订单金额</th>
              <th style={thStyle}>已收款</th>
              <th style={thStyle}>未收款</th>
              <th style={thStyle}>备注</th>
            </tr>
          </thead>
          <tbody>
            {customer.orders.map((o) => {
              const unpaid = o.total_cents - o.paid_cents;
              return (
                <tr key={o.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString("zh-CN")}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, background: o.status === "canceled" ? "#f5f5f5" : "#e6f4ff", color: o.status === "canceled" ? "#999" : "#0958d9" }}>
                      {ORDER_STATUS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatYuan(o.total_cents)}</td>
                  <td style={tdStyle}>{formatYuan(o.paid_cents)}</td>
                  <td style={tdStyle}>
                    {unpaid > 0 && o.status !== "canceled" ? (
                      <span style={{ color: "#cf1322", fontWeight: 600 }}>{formatYuan(unpaid)}</span>
                    ) : (
                      <span style={{ color: "#52c41a" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>{o.note ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = { fontFamily: "ui-sans-serif, system-ui", padding: 24 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 4, color: "#555" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, boxSizing: "border-box" };
const thStyle: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, borderBottom: "1px solid #e8e8e8" };
const tdStyle: React.CSSProperties = { padding: "10px 12px" };
const btnPrimary: React.CSSProperties = { padding: "7px 20px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, cursor: "pointer" };
