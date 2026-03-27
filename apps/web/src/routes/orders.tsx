import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan, ORDER_STATUS } from "../lib/format";

export const Route = createFileRoute("/orders")({
  component: OrdersPage
});

type Order = {
  id: string;
  customer_id: string;
  customer_name: string;
  status: string;
  note: string | null;
  total_cents: number;
  paid_cents: number;
  created_at: string;
};

type Customer = { id: string; name: string };
type Product = { id: string; name: string; price_cents: number };

type LineItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "全部" },
  { key: "todo", label: "未发送" },
  { key: "sent", label: "已发送" },
  { key: "unsettled", label: "未结算" },
  { key: "settled", label: "已结算" },
  { key: "canceled", label: "已作废" }
];

const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  todo: { bg: "#f5f5f5", color: "#595959", border: "#d9d9d9" },
  sent: { bg: "#e6f4ff", color: "#0958d9", border: "#91caff" },
  unsettled: { bg: "#fff7e6", color: "#d46b08", border: "#ffd591" },
  settled: { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  canceled: { bg: "#f5f5f5", color: "#999", border: "#d9d9d9" }
};

const emptyItem = (): LineItem => ({ product_id: "", product_name: "", quantity: 1, unit_price_cents: 0 });

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formCustomer, setFormCustomer] = useState("");
  const [formNote, setFormNote] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadOrders = async (status?: string) => {
    setLoading(true);
    const res = await (api as any).orders.get({
      query: status && status !== "all" ? { status } : {}
    });
    setLoading(false);
    if (res.error) { setError("加载失败"); return; }
    setOrders(res.data ?? []);
  };

  const loadDeps = async () => {
    const [cRes, pRes] = await Promise.all([
      (api as any).customers.get(),
      (api as any).products.get()
    ]);
    setCustomers(cRes.data ?? []);
    setProducts(pRes.data ?? []);
  };

  useEffect(() => { loadOrders(statusFilter); }, [statusFilter]);
  useEffect(() => { loadDeps(); }, []);

  const openForm = () => {
    setFormCustomer(customers[0]?.id ?? "");
    setFormNote("");
    setLineItems([emptyItem()]);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const selectProduct = (idx: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateItem(idx, {
      product_id: productId,
      product_name: p?.name ?? "",
      unit_price_cents: p?.price_cents ?? 0
    });
  };

  const addItem = () => setLineItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const formTotal = lineItems.reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomer) { setFormError("请选择客户"); return; }
    const validItems = lineItems.filter((it) => it.product_name.trim() && it.quantity > 0);
    if (validItems.length === 0) { setFormError("请至少添加一个有效明细"); return; }
    setSaving(true);
    setFormError(null);
    const payload: Record<string, unknown> = {
      customer_id: formCustomer,
      items: validItems.map((it) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        ...(it.product_id ? { product_id: it.product_id } : {})
      }))
    };
    if (formNote.trim()) payload.note = formNote.trim();
    const res = await (api as any).orders.post(payload);
    setSaving(false);
    if (res.error) { setFormError("创建失败"); return; }
    closeForm();
    loadOrders(statusFilter);
  };

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>销售订单</h1>
        </div>
        <button onClick={openForm} style={btnPrimary}>+ 新建订单</button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #e8e8e8" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: "8px 16px", border: "none",
              borderBottom: statusFilter === tab.key ? "2px solid #1677ff" : "2px solid transparent",
              background: "none", cursor: "pointer", fontSize: 14,
              color: statusFilter === tab.key ? "#1677ff" : "#555"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>客户 *</label>
              <select value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} style={{ ...inputStyle, height: 34 }}>
                <option value="">-- 选择客户 --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>备注</label>
              <input value={formNote} onChange={(e) => setFormNote(e.target.value)} style={inputStyle} placeholder="选填" />
            </div>
          </div>

          {/* Line items */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>订单明细</span>
              <button type="button" onClick={addItem} style={{ fontSize: 13, color: "#1677ff", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                + 添加行
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={itemThStyle}>商品</th>
                  <th style={itemThStyle}>名称</th>
                  <th style={{ ...itemThStyle, width: 80 }}>数量</th>
                  <th style={{ ...itemThStyle, width: 110 }}>单价（分）</th>
                  <th style={{ ...itemThStyle, width: 100 }}>小计</th>
                  <th style={{ ...itemThStyle, width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, idx) => (
                  <tr key={idx}>
                    <td style={itemTdStyle}>
                      <select
                        value={it.product_id}
                        onChange={(e) => selectProduct(idx, e.target.value)}
                        style={{ width: "100%", padding: "4px 6px", border: "1px solid #d9d9d9", borderRadius: 3, fontSize: 13 }}
                      >
                        <option value="">-- 选择 --</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td style={itemTdStyle}>
                      <input
                        required
                        value={it.product_name}
                        onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                        style={{ width: "100%", padding: "4px 6px", border: "1px solid #d9d9d9", borderRadius: 3, fontSize: 13, boxSizing: "border-box" }}
                        placeholder="商品名称"
                      />
                    </td>
                    <td style={itemTdStyle}>
                      <input
                        type="number" min={1} value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        style={{ width: "100%", padding: "4px 6px", border: "1px solid #d9d9d9", borderRadius: 3, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </td>
                    <td style={itemTdStyle}>
                      <input
                        type="number" min={0} value={it.unit_price_cents}
                        onChange={(e) => updateItem(idx, { unit_price_cents: Number(e.target.value) })}
                        style={{ width: "100%", padding: "4px 6px", border: "1px solid #d9d9d9", borderRadius: 3, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </td>
                    <td style={{ ...itemTdStyle, color: "#595959" }}>
                      {formatYuan(it.quantity * it.unit_price_cents)}
                    </td>
                    <td style={itemTdStyle}>
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} style={{ color: "#ff4d4f", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "right", padding: "6px 8px", fontSize: 13, fontWeight: 600 }}>合计：</td>
                  <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 700, color: "#cf1322" }}>{formatYuan(formTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {formError && <p style={{ color: "#ff4d4f", fontSize: 13, margin: "0 0 8px" }}>{formError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={closeForm} style={btnSecondary}>取消</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "创建中..." : "确认创建"}
            </button>
          </div>
        </form>
      )}

      {error && <p style={{ color: "#ff4d4f" }}>{error}</p>}

      {loading ? (
        <p style={{ color: "#999" }}>加载中...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "#999" }}>暂无订单</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>客户</th>
              <th style={thStyle}>日期</th>
              <th style={thStyle}>订单金额</th>
              <th style={thStyle}>已收</th>
              <th style={thStyle}>未收</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>备注</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const sc = (STATUS_COLOR[o.status] ?? STATUS_COLOR.todo)!;
              const unpaid = o.total_cents - o.paid_cents;
              return (
                <tr key={o.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={tdStyle}><b>{o.customer_name}</b></td>
                  <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString("zh-CN")}</td>
                  <td style={tdStyle}>{formatYuan(o.total_cents)}</td>
                  <td style={tdStyle}>{formatYuan(o.paid_cents)}</td>
                  <td style={tdStyle}>
                    {unpaid > 0 && o.status !== "canceled" ? (
                      <span style={{ color: "#cf1322", fontWeight: 600 }}>{formatYuan(unpaid)}</span>
                    ) : <span style={{ color: "#52c41a" }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {ORDER_STATUS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "#999", fontSize: 13 }}>{o.note ?? "—"}</td>
                  <td style={tdStyle}>
                    <Link to="/order-detail" search={{ id: o.id }} style={{ fontSize: 13, color: "#1677ff", textDecoration: "none" }}>
                      详情
                    </Link>
                  </td>
                </tr>
              );
            })}
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
const itemThStyle: React.CSSProperties = { padding: "6px 8px", fontWeight: 600, textAlign: "left" };
const itemTdStyle: React.CSSProperties = { padding: "4px 4px" };
const btnPrimary: React.CSSProperties = { padding: "7px 16px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, cursor: "pointer" };
