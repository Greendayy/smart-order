import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan } from "../lib/format";

export const Route = createFileRoute("/customers")({
  component: CustomersPage
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  receivable_cents: number;
  created_at: string;
};

const emptyForm = { name: "", phone: "", email: "", address: "" };

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.customers.get();
    setLoading(false);
    if (res.error) { setError("加载失败"); return; }
    setCustomers((res.data as Customer[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body: { name: string; phone?: string; email?: string; address?: string } = { name: form.name };
    if (form.phone) body.phone = form.phone;
    if (form.email) body.email = form.email;
    if (form.address) body.address = form.address;
    const res = await api.customers.post(body);
    setSaving(false);
    if (res.error) { setError("创建失败"); return; }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此客户？")) return;
    setDeleting(id);
    await (api.customers as any)[id].delete();
    setDeleting(null);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const totalReceivable = customers.reduce((sum, c) => sum + c.receivable_cents, 0);

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>客户管理</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ padding: "7px 16px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" }}
        >
          {showForm ? "取消" : "+ 新建客户"}
        </button>
      </div>

      {/* Receivable summary */}
      {totalReceivable > 0 && (
        <div style={{ background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#cf1322", fontWeight: 600 }}>⚠ 合计应收账款：{formatYuan(totalReceivable)}</span>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <button type="submit" disabled={saving} style={{ padding: "7px 20px", background: saving ? "#bbb" : "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      )}

      {error && <p style={{ color: "#ff4d4f" }}>{error}</p>}

      {/* Table */}
      {loading ? (
        <p style={{ color: "#999" }}>加载中...</p>
      ) : customers.length === 0 ? (
        <p style={{ color: "#999" }}>暂无客户，点击「新建客户」添加</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>姓名</th>
              <th style={thStyle}>电话</th>
              <th style={thStyle}>地址</th>
              <th style={thStyle}>应收账款</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>
                  <Link to="/customer-detail" search={{ id: c.id }} style={{ color: "#1677ff", textDecoration: "none", fontWeight: 500 }}>
                    {c.name}
                  </Link>
                </td>
                <td style={tdStyle}>{c.phone ?? "—"}</td>
                <td style={tdStyle}>{c.address ?? "—"}</td>
                <td style={tdStyle}>
                  {c.receivable_cents > 0 ? (
                    <span style={{ color: "#cf1322", fontWeight: 600 }}>{formatYuan(c.receivable_cents)}</span>
                  ) : (
                    <span style={{ color: "#52c41a" }}>已结清</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link to="/customer-detail" search={{ id: c.id }} style={{ fontSize: 13, color: "#1677ff", textDecoration: "none" }}>
                      详情
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      style={{ fontSize: 13, color: "#ff4d4f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {deleting === c.id ? "..." : "删除"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 4, color: "#555" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, boxSizing: "border-box" };
const thStyle: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, borderBottom: "1px solid #e8e8e8" };
const tdStyle: React.CSSProperties = { padding: "10px 12px" };
