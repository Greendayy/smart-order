import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan } from "../lib/format";

export const Route = createFileRoute("/products")({
  component: ProductsPage
});

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  spec: string | null;
  cost_cents: number;
  price_cents: number;
  stock: number;
  stock_alert: number;
  created_at: string;
};

type StockStatus = "out" | "low" | "ok";

function stockStatus(stock: number, alert: number): StockStatus {
  if (stock === 0) return "out";
  if (stock <= alert) return "low";
  return "ok";
}

const STATUS_LABEL: Record<StockStatus, string> = { out: "缺货", low: "紧缺", ok: "充足" };
const STATUS_COLOR: Record<StockStatus, { bg: string; color: string; border: string }> = {
  out: { bg: "#fff2f0", color: "#cf1322", border: "#ffccc7" },
  low: { bg: "#fff7e6", color: "#d46b08", border: "#ffd591" },
  ok: { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" }
};

const emptyForm = {
  name: "", barcode: "", spec: "",
  cost: "", price: "", stock: "", stock_alert: "10"
};

type FormState = typeof emptyForm;

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "warning">("all");

  const load = async () => {
    setLoading(true);
    const res = await (api as any).products.get();
    setLoading(false);
    if (res.error) { setError("加载失败"); return; }
    setProducts(res.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, barcode: p.barcode ?? "", spec: p.spec ?? "",
      cost: (p.cost_cents / 100).toString(),
      price: (p.price_cents / 100).toString(),
      stock: p.stock.toString(),
      stock_alert: p.stock_alert.toString()
    });
    setShowForm(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      cost_cents: Math.round(Number(form.cost) * 100),
      price_cents: Math.round(Number(form.price) * 100),
      stock: Number(form.stock) || 0,
      stock_alert: Number(form.stock_alert) || 0
    };
    if (form.barcode) payload.barcode = form.barcode;
    if (form.spec) payload.spec = form.spec;

    if (editingId) {
      await (api as any).products[editingId].put(payload);
    } else {
      await (api as any).products.post(payload);
    }
    setSaving(false);
    cancelForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此产品？")) return;
    setDeleting(id);
    await (api as any).products[id].delete();
    setDeleting(null);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const displayed = filter === "warning"
    ? products.filter((p) => stockStatus(p.stock, p.stock_alert) !== "ok")
    : products;

  const outCount = products.filter((p) => p.stock === 0).length;
  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= p.stock_alert).length;

  const FormPanel = (
    <form onSubmit={handleSubmit} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / 3" }}>
          <label style={labelStyle}>商品名称 *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>条形码</label>
          <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>规格</label>
          <input value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} style={inputStyle} placeholder="如：500ml/瓶" />
        </div>
        <div>
          <label style={labelStyle}>成本价（元）</label>
          <input type="text" inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} onFocus={(e) => e.target.select()} placeholder="0.00" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>参考售价（元）</label>
          <input type="text" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} onFocus={(e) => e.target.select()} placeholder="0.00" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>当前库存</label>
          <input type="text" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/[^\d]/g, "") })} onFocus={(e) => e.target.select()} placeholder="0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>预警阈值</label>
          <input type="text" inputMode="numeric" value={form.stock_alert} onChange={(e) => setForm({ ...form, stock_alert: e.target.value.replace(/[^\d]/g, "") })} onFocus={(e) => e.target.select()} placeholder="10" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={cancelForm} style={btnSecondary}>取消</button>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "保存中..." : editingId ? "更新" : "创建"}
        </button>
      </div>
    </form>
  );

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>产品管理（SKU）</h1>
        </div>
        <button onClick={startCreate} style={btnPrimary}>+ 新建产品</button>
      </div>

      {/* Summary */}
      {(outCount > 0 || lowCount > 0) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {outCount > 0 && (
            <div style={{ padding: "8px 14px", background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: "#cf1322", fontWeight: 600 }}>缺货 {outCount} 件</span>
            </div>
          )}
          {lowCount > 0 && (
            <div style={{ padding: "8px 14px", background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: "#d46b08", fontWeight: 600 }}>库存偏低 {lowCount} 件</span>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #e8e8e8" }}>
        {(["all", "warning"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 16px", border: "none", borderBottom: filter === f ? "2px solid #1677ff" : "2px solid transparent", background: "none", cursor: "pointer", fontSize: 14, color: filter === f ? "#1677ff" : "#555" }}>
            {f === "all" ? `全部 (${products.length})` : `库存预警 (${outCount + lowCount})`}
          </button>
        ))}
      </div>

      {(showForm || editingId) && FormPanel}
      {error && <p style={{ color: "#ff4d4f" }}>{error}</p>}

      {loading ? (
        <p style={{ color: "#999" }}>加载中...</p>
      ) : displayed.length === 0 ? (
        <p style={{ color: "#999" }}>{filter === "warning" ? "暂无库存预警产品" : "暂无产品，点击「新建产品」添加"}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>商品名称</th>
              <th style={thStyle}>条形码</th>
              <th style={thStyle}>规格</th>
              <th style={thStyle}>成本价</th>
              <th style={thStyle}>参考售价</th>
              <th style={thStyle}>库存</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((p) => {
              const st = stockStatus(p.stock, p.stock_alert);
              const sc = STATUS_COLOR[st];
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0", background: isEditing ? "#e6f4ff22" : undefined }}>
                  <td style={tdStyle}><b>{p.name}</b></td>
                  <td style={tdStyle}>{p.barcode ?? "—"}</td>
                  <td style={tdStyle}>{p.spec ?? "—"}</td>
                  <td style={tdStyle}>{formatYuan(p.cost_cents)}</td>
                  <td style={tdStyle}>{formatYuan(p.price_cents)}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: st !== "ok" ? 600 : undefined, color: st === "out" ? "#cf1322" : st === "low" ? "#d46b08" : undefined }}>
                      {p.stock}
                    </span>
                    <span style={{ fontSize: 11, color: "#999", marginLeft: 4 }}>/ 预警{p.stock_alert}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {STATUS_LABEL[st]}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEdit(p)} style={{ fontSize: 13, color: "#1677ff", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        编辑
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ fontSize: 13, color: "#ff4d4f", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {deleting === p.id ? "..." : "删除"}
                      </button>
                    </div>
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
const btnPrimary: React.CSSProperties = { padding: "7px 16px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, cursor: "pointer" };
