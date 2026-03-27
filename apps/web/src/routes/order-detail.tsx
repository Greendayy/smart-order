import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan, ORDER_STATUS } from "../lib/format";

export const Route = createFileRoute("/order-detail")({
  component: OrderDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({ id: search.id as string })
});

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type Payment = {
  id: string;
  amount_cents: number;
  method: string | null;
  note: string | null;
  created_at: string;
};

type OrderDetail = {
  id: string;
  customer_id: string;
  customer_name: string;
  status: string;
  note: string | null;
  created_at: string;
  total_cents: number;
  paid_cents: number;
  items: OrderItem[];
  payments: Payment[];
};

type ReturnRecord = {
  id: string;
  reason: string | null;
  method: string | null;
  total_cents: number;
  created_at: string;
};

type ReturnItemForm = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  max_quantity: number;
};

const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  todo: { bg: "#f5f5f5", color: "#595959", border: "#d9d9d9" },
  sent: { bg: "#e6f4ff", color: "#0958d9", border: "#91caff" },
  unsettled: { bg: "#fff7e6", color: "#d46b08", border: "#ffd591" },
  settled: { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  canceled: { bg: "#f5f5f5", color: "#999", border: "#d9d9d9" }
};

// Allowed status transitions
const NEXT_STATUSES: Record<string, Array<{ key: string; label: string; danger?: boolean }>> = {
  todo: [{ key: "sent", label: "标记已发送" }, { key: "canceled", label: "作废", danger: true }],
  sent: [{ key: "unsettled", label: "标记未结算" }, { key: "settled", label: "标记已结算" }, { key: "canceled", label: "作废", danger: true }],
  unsettled: [{ key: "settled", label: "标记已结算" }, { key: "canceled", label: "作废", danger: true }],
  settled: [],
  canceled: []
};

const PAYMENT_METHODS = ["现金", "微信", "支付宝", "银行转账", "其他"];
const RETURN_METHODS = ["现金退款", "原路退回", "换货", "其他"];

function OrderDetailPage() {
  const { id } = Route.useSearch();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("现金");
  const [payNote, setPayNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [deletingPayId, setDeletingPayId] = useState<string | null>(null);

  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnMethod, setReturnMethod] = useState("现金退款");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [deletingReturnId, setDeletingReturnId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await (api as any).orders[id].get();
    setLoading(false);
    if (res.error || res.data?.error) { setError("订单不存在"); return; }
    setOrder(res.data as OrderDetail);
  };

  const loadReturns = async () => {
    const res = await (api as any).returns.get({ query: { order_id: id } });
    setReturns(res.data ?? []);
  };

  useEffect(() => { load(); loadReturns(); }, [id]);

  const changeStatus = async (newStatus: string) => {
    if (!confirm(`确认将订单状态改为「${ORDER_STATUS[newStatus] ?? newStatus}」？`)) return;
    setStatusUpdating(true);
    await (api as any).orders[id].put({ status: newStatus });
    setStatusUpdating(false);
    load();
  };

  const openReturnForm = (items: OrderItem[]) => {
    setReturnItems(items.map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: 0,
      unit_price_cents: it.unit_price_cents,
      max_quantity: it.quantity
    })));
    setReturnReason("");
    setReturnMethod("现金退款");
    setShowReturnForm(true);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = returnItems.filter((it) => it.quantity > 0);
    if (validItems.length === 0) return;
    setReturnSubmitting(true);
    const payload: Record<string, unknown> = {
      sales_order_id: id,
      items: validItems.map((it) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        ...(it.product_id ? { product_id: it.product_id } : {})
      }))
    };
    if (returnReason.trim()) payload.reason = returnReason.trim();
    if (returnMethod) payload.method = returnMethod;
    await (api as any).returns.post(payload);
    setReturnSubmitting(false);
    setShowReturnForm(false);
    loadReturns();
  };

  const handleDeleteReturn = async (rid: string) => {
    if (!confirm("确认删除此退货记录？")) return;
    setDeletingReturnId(rid);
    await (api as any).returns[rid].delete();
    setDeletingReturnId(null);
    loadReturns();
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    setPaySubmitting(true);
    const body: Record<string, unknown> = { amount_cents: payAmount };
    if (payMethod) body.method = payMethod;
    if (payNote.trim()) body.note = payNote.trim();
    await (api as any).orders[id].payments.post(body);
    setPaySubmitting(false);
    setShowPayForm(false);
    setPayAmount(0);
    setPayNote("");
    load();
  };

  const handleDeletePayment = async (pid: string) => {
    if (!confirm("确认删除此付款记录？")) return;
    setDeletingPayId(pid);
    await (api as any).orders[id].payments[pid].delete();
    setDeletingPayId(null);
    load();
  };

  if (loading) return <main style={pageStyle}><p style={{ color: "#999" }}>加载中...</p></main>;
  if (error || !order) return <main style={pageStyle}><p style={{ color: "#ff4d4f" }}>{error ?? "加载失败"}</p></main>;

  const sc = (STATUS_COLOR[order.status] ?? STATUS_COLOR.todo)!;
  const unpaid = order.total_cents - order.paid_cents;
  const nextActions = NEXT_STATUSES[order.status] ?? [];

  return (
    <main style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/orders" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 订单列表</Link>
          <h1 style={{ margin: 0, fontSize: 20 }}>订单详情</h1>
          <span style={{ padding: "2px 10px", borderRadius: 10, fontSize: 12, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
            {ORDER_STATUS[order.status] ?? order.status}
          </span>
        </div>
        {/* Status transition buttons + print */}
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            to="/print-preview"
            search={{ id }}
            style={{ padding: "6px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer", border: "1px solid #d9d9d9", background: "#fff", color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            🖨 打印
          </Link>
          {nextActions.map((action) => (
            <button
              key={action.key}
              onClick={() => changeStatus(action.key)}
              disabled={statusUpdating}
              style={{
                padding: "6px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer", border: "1px solid",
                background: action.danger ? "#fff" : "#1677ff",
                color: action.danger ? "#ff4d4f" : "#fff",
                borderColor: action.danger ? "#ff4d4f" : "#1677ff",
                opacity: statusUpdating ? 0.6 : 1
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Receivable alert */}
      {unpaid > 0 && order.status !== "canceled" && (
        <div style={{ background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6, padding: "10px 16px", marginBottom: 20 }}>
          <span style={{ color: "#cf1322", fontWeight: 700 }}>⚠ 应收账款：{formatYuan(unpaid)}</span>
        </div>
      )}

      {/* Info card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 20 }}>
        {[
          ["客户", <Link key="c" to="/customer-detail" search={{ id: order.customer_id }} style={{ color: "#1677ff", textDecoration: "none" }}>{order.customer_name}</Link>],
          ["日期", new Date(order.created_at).toLocaleDateString("zh-CN")],
          ["订单金额", formatYuan(order.total_cents)],
          ["备注", order.note ?? "—"]
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span style={{ fontSize: 12, color: "#999" }}>{label}</span>
            <p style={{ margin: "4px 0 0", fontSize: 14 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Items */}
      <h2 style={{ fontSize: 16, marginBottom: 10 }}>订单明细</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "#fafafa", textAlign: "left" }}>
            <th style={thStyle}>商品名称</th>
            <th style={thStyle}>数量</th>
            <th style={thStyle}>单价</th>
            <th style={thStyle}>小计</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={tdStyle}>{item.product_name}</td>
              <td style={tdStyle}>{item.quantity}</td>
              <td style={tdStyle}>{formatYuan(item.unit_price_cents)}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{formatYuan(item.line_total_cents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ textAlign: "right", padding: "10px 12px", fontWeight: 600, color: "#555" }}>合计</td>
            <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 15, color: "#1677ff" }}>{formatYuan(order.total_cents)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payments */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>回款记录</h2>
        {order.status !== "canceled" && (
          <button onClick={() => setShowPayForm((v) => !v)} style={btnPrimary}>
            {showPayForm ? "取消" : "+ 登记回款"}
          </button>
        )}
      </div>

      {showPayForm && (
        <form onSubmit={handleAddPayment} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>金额（分）*</label>
            <input
              type="number" min={1} required value={payAmount || ""}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              style={inputStyle}
              placeholder={unpaid > 0 ? `剩余 ${unpaid}` : undefined}
            />
            {payAmount > 0 && <span style={{ fontSize: 12, color: "#1677ff" }}>{formatYuan(payAmount)}</span>}
          </div>
          <div>
            <label style={labelStyle}>收款方式</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={{ ...inputStyle, height: 34 }}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>备注</label>
            <input value={payNote} onChange={(e) => setPayNote(e.target.value)} style={inputStyle} placeholder="选填" />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setShowPayForm(false)} style={btnSecondary}>取消</button>
            <button type="submit" disabled={paySubmitting} style={{ ...btnPrimary, opacity: paySubmitting ? 0.6 : 1 }}>
              {paySubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      )}

      {order.payments.length === 0 ? (
        <p style={{ color: "#999", fontSize: 14 }}>暂无回款记录</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 8 }}>
            <thead>
              <tr style={{ background: "#fafafa", textAlign: "left" }}>
                <th style={thStyle}>日期</th>
                <th style={thStyle}>金额</th>
                <th style={thStyle}>方式</th>
                <th style={thStyle}>备注</th>
                {order.status !== "canceled" && <th style={thStyle}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {order.payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString("zh-CN")}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#389e0d" }}>{formatYuan(p.amount_cents)}</td>
                  <td style={tdStyle}>{p.method ?? "—"}</td>
                  <td style={tdStyle}>{p.note ?? "—"}</td>
                  {order.status !== "canceled" && (
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        disabled={deletingPayId === p.id}
                        style={{ fontSize: 13, color: "#ff4d4f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        {deletingPayId === p.id ? "..." : "删除"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#555" }}>已收合计</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#389e0d" }}>{formatYuan(order.paid_cents)}</td>
                <td colSpan={order.status !== "canceled" ? 3 : 2} />
              </tr>
            </tfoot>
          </table>
          {unpaid > 0 && order.status !== "canceled" && (
            <p style={{ fontSize: 14, color: "#cf1322", fontWeight: 600, margin: 0 }}>
              仍需收款：{formatYuan(unpaid)}
            </p>
          )}
        </>
      )}
      {/* Returns */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>退货记录</h2>
        {order.status !== "canceled" && (
          <button
            onClick={() => showReturnForm ? setShowReturnForm(false) : openReturnForm(order.items)}
            style={btnSecondary}
          >
            {showReturnForm ? "取消" : "+ 新建退货"}
          </button>
        )}
      </div>

      {showReturnForm && (
        <form onSubmit={handleCreateReturn} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#555", margin: "0 0 8px", fontWeight: 600 }}>选择退货明细（填写退货数量）：</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>商品名称</th>
                <th style={{ padding: "6px 8px", textAlign: "left", width: 90 }}>原订数量</th>
                <th style={{ padding: "6px 8px", textAlign: "left", width: 100 }}>退货数量</th>
                <th style={{ padding: "6px 8px", textAlign: "left", width: 110 }}>单价</th>
                <th style={{ padding: "6px 8px", textAlign: "left", width: 110 }}>退货小计</th>
              </tr>
            </thead>
            <tbody>
              {returnItems.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "4px 8px" }}>{it.product_name}</td>
                  <td style={{ padding: "4px 8px", color: "#999" }}>{it.max_quantity}</td>
                  <td style={{ padding: "4px 4px" }}>
                    <input
                      type="number" min={0} max={it.max_quantity} value={it.quantity}
                      onChange={(e) => {
                        const v = Math.min(Number(e.target.value), it.max_quantity);
                        setReturnItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: v } : r));
                      }}
                      style={{ width: 72, padding: "4px 6px", border: "1px solid #d9d9d9", borderRadius: 3, fontSize: 13, boxSizing: "border-box" as const }}
                    />
                  </td>
                  <td style={{ padding: "4px 8px" }}>{formatYuan(it.unit_price_cents)}</td>
                  <td style={{ padding: "4px 8px", fontWeight: it.quantity > 0 ? 600 : undefined, color: it.quantity > 0 ? "#cf1322" : "#ccc" }}>
                    {formatYuan(it.quantity * it.unit_price_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, fontSize: 13 }}>退货合计：</td>
                <td style={{ padding: "6px 8px", fontWeight: 700, color: "#cf1322", fontSize: 13 }}>
                  {formatYuan(returnItems.reduce((s, it) => s + it.quantity * it.unit_price_cents, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>退款方式</label>
              <select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)} style={{ ...inputStyle, height: 34 }}>
                {RETURN_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>退货原因</label>
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} style={inputStyle} placeholder="选填" />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setShowReturnForm(false)} style={btnSecondary}>取消</button>
            <button
              type="submit"
              disabled={returnSubmitting || returnItems.every((it) => it.quantity === 0)}
              style={{ ...btnPrimary, background: "#ff4d4f", opacity: (returnSubmitting || returnItems.every((it) => it.quantity === 0)) ? 0.5 : 1 }}
            >
              {returnSubmitting ? "提交中..." : "确认退货"}
            </button>
          </div>
        </form>
      )}

      {returns.length === 0 ? (
        <p style={{ color: "#999", fontSize: 14 }}>暂无退货记录</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={thStyle}>日期</th>
              <th style={thStyle}>退货金额</th>
              <th style={thStyle}>退款方式</th>
              <th style={thStyle}>原因</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString("zh-CN")}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#cf1322" }}>{formatYuan(r.total_cents)}</td>
                <td style={tdStyle}>{r.method ?? "—"}</td>
                <td style={tdStyle}>{r.reason ?? "—"}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDeleteReturn(r.id)}
                    disabled={deletingReturnId === r.id}
                    style={{ fontSize: 13, color: "#ff4d4f", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {deletingReturnId === r.id ? "..." : "删除"}
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

const pageStyle: React.CSSProperties = { fontFamily: "ui-sans-serif, system-ui", padding: 24 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 4, color: "#555" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, boxSizing: "border-box" };
const thStyle: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, borderBottom: "1px solid #e8e8e8" };
const tdStyle: React.CSSProperties = { padding: "10px 12px" };
const btnPrimary: React.CSSProperties = { padding: "7px 16px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, cursor: "pointer" };
