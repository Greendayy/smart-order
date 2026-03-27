import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { authClient } from "../lib/auth-client";
import { api } from "../lib/api";
import { formatYuan } from "../lib/format";

export const Route = createFileRoute("/")({
  component: Home
});

type Customer = { id: string; name: string; phone: string | null; address: string | null };
type Product = { id: string; name: string; price_cents: number; stock: number; spec: string | null };
type LineItem = { key: number; product_id: string; product_name: string; quantity: string; unit_price: string };
type OrderType = "sales" | "return" | "statement";
type CustomerOrder = { id: string; status: string; note: string | null; total_cents: number; paid_cents: number; created_at: string };

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "sales", label: "销售单" },
  { value: "return", label: "退货单" },
  { value: "statement", label: "对账单" }
];

const PAYMENT_METHODS = ["微信", "支付宝", "现金", "银行转账", "赊账"] as const;

let lineKey = 0;
function emptyLine(): LineItem {
  return { key: ++lineKey, product_id: "", product_name: "", quantity: "1", unit_price: "" };
}

function Home() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  /* ---- master data ---- */
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (api as any).customers.get().then((r: any) => r.data && setCustomers(r.data));
    (api as any).products.get().then((r: any) => r.data && setProducts(r.data));
  }, []);

  /* ---- order type ---- */
  const [orderType, setOrderType] = useState<OrderType>("sales");

  /* ---- customer search ---- */
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const customerBoxRef = useRef<HTMLDivElement>(null);

  /* ---- return-specific ---- */
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [returnReason, setReturnReason] = useState("");

  /* ---- product dropdown ---- */
  const [activeProductLine, setActiveProductLine] = useState<number | null>(null);
  const productBoxRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /* ---- form state ---- */
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [paymentMethod, setPaymentMethod] = useState<string>("微信");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /* ---- computed ---- */
  const totalCents = items.reduce((s, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Math.round((Number(it.unit_price) || 0) * 100);
    return s + qty * price;
  }, 0);

  const filteredCustomers = customerSearch.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()))
    : customers;

  /* ---- click-outside handlers ---- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setShowCustomerDrop(false);
      }
      if (activeProductLine !== null) {
        const ref = productBoxRefs.current.get(activeProductLine);
        if (ref && !ref.contains(e.target as Node)) setActiveProductLine(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeProductLine]);

  /* ---- fetch customer orders for return ---- */
  useEffect(() => {
    if (selectedCustomer && orderType === "return") {
      (api as any).customers[selectedCustomer.id].get().then((r: any) => {
        if (r.data?.orders) setCustomerOrders(r.data.orders);
      });
    } else {
      setCustomerOrders([]);
      setSelectedOrderId("");
    }
  }, [selectedCustomer, orderType]);

  /* ---- customer handlers ---- */
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setCustomerPhone(c.phone || "");
    setCustomerAddress(c.address || "");
    setShowCustomerDrop(false);
  };

  const handleCustomerInputChange = (v: string) => {
    setCustomerSearch(v);
    setShowCustomerDrop(true);
    if (selectedCustomer && v !== selectedCustomer.name) {
      setSelectedCustomer(null);
      setCustomerPhone("");
      setCustomerAddress("");
    }
  };

  /* ---- product handlers ---- */
  const updateItem = (key: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const handleProductInputChange = (key: number, v: string) => {
    updateItem(key, { product_name: v, product_id: "" });
    setActiveProductLine(key);
  };

  const handleSelectProduct = (key: number, p: Product) => {
    updateItem(key, {
      product_id: p.id,
      product_name: p.name,
      unit_price: (p.price_cents / 100).toString()
    });
    setActiveProductLine(null);
  };

  const removeItem = (key: number) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });
  };

  /* ---- auto-load return order items ---- */
  const handleSelectReturnOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) return;
    try {
      const res = await (api as any).orders[orderId].get();
      if (res.data?.items) {
        const loaded: LineItem[] = res.data.items.map((it: any) => ({
          key: ++lineKey,
          product_id: it.product_id || "",
          product_name: it.product_name,
          quantity: String(it.quantity),
          unit_price: (it.unit_price_cents / 100).toString()
        }));
        if (loaded.length > 0) setItems(loaded);
      }
    } catch { /* ignore */ }
  };

  /* ---- print utilities ---- */
  const triggerPrint = (orderId: string, title?: string) => {
    const params = new URLSearchParams({ id: orderId });
    if (title) params.set("orderTitle", title);
    const url = `/print-preview?${params.toString()}`;
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => setTimeout(() => { try { w.print(); } catch { /* no printer */ } }, 800);
    }
  };

  const printStatement = async (customerId: string, customerName: string) => {
    let cData: any;
    let tpl: any = {};
    try {
      const [cRes, tRes] = await Promise.all([
        (api as any).customers[customerId].get(),
        (api as any).settings["print-template"].get()
      ]);
      cData = cRes.data;
      tpl = tRes.data || {};
    } catch { return; }
    if (!cData) return;

    const orders = (cData.orders || []).filter((o: any) => o.status !== "canceled");
    const receivable = cData.receivable_cents ?? 0;
    const today = new Date().toLocaleDateString("zh-CN");
    const companyHeader = tpl.company_name
      ? `<div style="font-size:18px;font-weight:700;margin-bottom:4px">${tpl.company_name}</div>
         ${tpl.company_phone ? `<div style="font-size:12px;color:#555">Tel: ${tpl.company_phone}</div>` : ""}`
      : "";

    const rows = orders.map((o: any) => {
      const unpaid = Number(o.total_cents) - Number(o.paid_cents);
      return `<tr>
        <td style="${tdCss}">${o.id.slice(0, 8).toUpperCase()}</td>
        <td style="${tdCss}">${new Date(o.created_at).toLocaleDateString("zh-CN")}</td>
        <td style="${tdCss};text-align:right">${fmtY(Number(o.total_cents))}</td>
        <td style="${tdCss};text-align:right">${fmtY(Number(o.paid_cents))}</td>
        <td style="${tdCss};text-align:right;color:${unpaid > 0 ? "#cf1322" : "#389e0d"}">${fmtY(unpaid)}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>对账单 - ${customerName}</title>
      <style>body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:32px;max-width:740px;margin:0 auto;color:#111;font-size:13px}
      table{width:100%;border-collapse:collapse}
      @media print{body{padding:16px}}</style></head><body>
      <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px">
        ${companyHeader}
        <div style="font-size:22px;font-weight:700;letter-spacing:4px;margin-top:8px">对 账 单</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <div><b>客户：</b>${customerName}${cData.phone ? `<br><b>电话：</b>${cData.phone}` : ""}${cData.address ? `<br><b>地址：</b>${cData.address}` : ""}</div>
        <div style="text-align:right"><b>日期：</b>${today}</div>
      </div>
      <table><thead><tr style="background:#f0f0f0">
        <th style="${thCss}">单号</th><th style="${thCss}">日期</th>
        <th style="${thCss};text-align:right">金额</th><th style="${thCss};text-align:right">已付</th>
        <th style="${thCss};text-align:right">未付</th>
      </tr></thead><tbody>${rows}</tbody>
      <tfoot><tr style="border-top:2px solid #111">
        <td colspan="4" style="${tdCss};text-align:right;font-weight:700">应收总计</td>
        <td style="${tdCss};text-align:right;font-weight:700;font-size:15px;color:#cf1322">${fmtY(receivable)}</td>
      </tr></tfoot></table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px">
        <span>经手人签字：________________</span>
        <span>客户确认签字：________________</span>
        <span>日期：________________</span>
      </div>
      ${tpl.footer_note ? `<div style="text-align:center;font-size:12px;color:#888;border-top:1px dashed #ccc;padding-top:10px;margin-top:16px">${tpl.footer_note}</div>` : ""}
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 600); }
  };

  /* ---- reset ---- */
  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerPhone("");
    setCustomerAddress("");
    setItems([emptyLine()]);
    setNote("");
    setReturnReason("");
    setSelectedOrderId("");
    setCustomerOrders([]);
  };

  /* ---- submit ---- */
  const handleSubmit = async () => {
    setMsg(null);

    if (!selectedCustomer && !customerSearch.trim()) {
      setMsg({ type: "err", text: "请输入客户名称" });
      return;
    }

    // auto-create customer if needed
    let cid = selectedCustomer?.id;
    if (!cid) {
      try {
        const res = await (api as any).customers.post({
          name: customerSearch.trim(),
          phone: customerPhone || undefined,
          address: customerAddress || undefined
        });
        if (res.data?.id) {
          cid = res.data.id;
          const nc: Customer = { id: cid!, name: customerSearch.trim(), phone: customerPhone || null, address: customerAddress || null };
          setCustomers((prev) => [nc, ...prev]);
          setSelectedCustomer(nc);
        } else {
          setMsg({ type: "err", text: "自动新建客户失败" });
          return;
        }
      } catch {
        setMsg({ type: "err", text: "自动新建客户失败" });
        return;
      }
    }

    // 对账单: just print statement
    if (orderType === "statement") {
      setSaving(true);
      await printStatement(cid!, selectedCustomer?.name || customerSearch.trim());
      setSaving(false);
      setMsg({ type: "ok", text: "对账单已生成" });
      return;
    }

    const validItems = items.filter((it) => it.product_name && Number(it.quantity) > 0 && Number(it.unit_price) > 0);
    if (validItems.length === 0) { setMsg({ type: "err", text: "请至少添加一个商品" }); return; }

    if (orderType === "return" && !selectedOrderId) {
      setMsg({ type: "err", text: "退货单需要选择原始订单" });
      return;
    }

    setSaving(true);
    try {
      if (orderType === "sales") {
        const res = await (api as any).orders.post({
          customer_id: cid,
          note: note || undefined,
          items: validItems.map((it) => ({
            product_id: it.product_id || undefined,
            product_name: it.product_name,
            quantity: Number(it.quantity),
            unit_price_cents: Math.round(Number(it.unit_price) * 100)
          }))
        });
        if (res.error) { setMsg({ type: "err", text: "创建失败" }); setSaving(false); return; }
        const orderId = res.data?.id;

        if (paymentMethod !== "赊账" && orderId && totalCents > 0) {
          await (api as any).orders[orderId].payments.post({ amount_cents: totalCents, method: paymentMethod });
        }
        resetForm();
        setMsg({ type: "ok", text: "销售单创建成功！" });
        if (orderId) triggerPrint(orderId, "销售单");

      } else if (orderType === "return") {
        const res = await (api as any).returns.post({
          sales_order_id: selectedOrderId,
          reason: returnReason || undefined,
          items: validItems.map((it) => ({
            product_id: it.product_id || undefined,
            product_name: it.product_name,
            quantity: Number(it.quantity),
            unit_price_cents: Math.round(Number(it.unit_price) * 100)
          }))
        });
        if (res.error) { setMsg({ type: "err", text: "创建退货单失败" }); setSaving(false); return; }
        resetForm();
        setMsg({ type: "ok", text: "退货单创建成功！" });
        if (selectedOrderId) triggerPrint(selectedOrderId, "退货单");
      }
    } catch {
      setMsg({ type: "err", text: "网络错误" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/login" });
  };

  const displayName = session?.user?.name ?? session?.user?.email ?? "";
  const role = session?.user?.role;
  const isAdmin = role === "admin";

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Smart Order</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: isAdmin ? "#e6f4ff" : "#f6ffed", color: isAdmin ? "#0958d9" : "#389e0d", border: `1px solid ${isAdmin ? "#91caff" : "#b7eb8f"}` }}>
            {isAdmin ? "管理员" : "业务员"}
          </span>
          <span style={{ fontSize: 14, color: "#555" }}>{displayName}</span>
          <button onClick={handleLogout} style={btnSecondary}>退出</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { to: "/customers" as const, label: "👤 客户" },
          { to: "/products" as const, label: "📦 产品" },
          { to: "/orders" as const, label: "📋 订单" },
          { to: "/stats" as const, label: "📊 统计" },
          { to: "/returns" as const, label: "↩️ 退货" }
        ].map((n) => (
          <Link key={n.to} to={n.to} style={navLink}>{n.label}</Link>
        ))}
        {isAdmin && <Link to="/audit-logs" style={navLink}>🔒 审计</Link>}
        {isAdmin && <Link to="/print-template" style={navLink}>🖨 打印</Link>}
        {isAdmin && <Link to="/users" style={navLink}>👥 用户</Link>}
      </div>

      {/* ======= 开单区 ======= */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 24 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>📝 快速开单</h2>

        {/* 单据类型 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {ORDER_TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setOrderType(t.value)}
              style={{
                padding: "6px 18px", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer",
                border: orderType === t.value ? "1px solid #1677ff" : "1px solid #d9d9d9",
                background: orderType === t.value ? "#1677ff" : "#fff",
                color: orderType === t.value ? "#fff" : "#333"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 客户搜索 + 联系信息 */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }} ref={customerBoxRef}>
            <label style={labelStyle}>客户 *</label>
            <input
              value={customerSearch}
              onChange={(e) => handleCustomerInputChange(e.target.value)}
              onFocus={() => setShowCustomerDrop(true)}
              placeholder="输入客户名称搜索"
              style={inputStyle}
              autoComplete="off"
            />
            {showCustomerDrop && (
              <div style={dropdownStyle}>
                {filteredCustomers.length > 0 ? filteredCustomers.slice(0, 8).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    style={dropdownItemStyle}
                  >
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.phone && <span style={{ color: "#999", fontSize: 12, marginLeft: 8 }}>{c.phone}</span>}
                    {c.address && <span style={{ color: "#bbb", fontSize: 12, marginLeft: 8 }}>{c.address}</span>}
                  </div>
                )) : null}
                {customerSearch.trim() && !customers.find((c) => c.name === customerSearch.trim()) && (
                  <div style={{ ...dropdownItemStyle, color: "#1677ff", fontWeight: 500 }} onClick={() => setShowCustomerDrop(false)}>
                    + 新建客户「{customerSearch.trim()}」（提交时自动创建）
                  </div>
                )}
                {!customerSearch.trim() && filteredCustomers.length === 0 && (
                  <div style={{ padding: "8px 12px", color: "#999", fontSize: 13 }}>暂无客户数据</div>
                )}
              </div>
            )}
          </div>
          <div style={{ width: 160 }}>
            <label style={labelStyle}>联系电话</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="选填" style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>地址</label>
            <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="选填" style={inputStyle} />
          </div>
        </div>

        {/* 退货单：选择原始订单 */}
        {orderType === "return" && selectedCustomer && (
          <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>原始订单 *</label>
              <select value={selectedOrderId} onChange={(e) => handleSelectReturnOrder(e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">选择要退货的订单</option>
                {customerOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id.slice(0, 8).toUpperCase()} - {formatYuan(Number(o.total_cents))} - {new Date(o.created_at).toLocaleDateString("zh-CN")}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>退货原因</label>
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="可选" style={inputStyle} />
            </div>
          </div>
        )}

        {/* 备注 */}
        {orderType !== "statement" && (
          <div style={{ marginBottom: 20, maxWidth: 400 }}>
            <label style={labelStyle}>备注</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" style={inputStyle} />
          </div>
        )}

        {/* 商品明细 (销售单 / 退货单) */}
        {orderType !== "statement" && (
          <>
            <label style={{ ...labelStyle, marginBottom: 8 }}>商品明细</label>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 8 }}>
              <thead>
                <tr style={{ background: "#fafafa", textAlign: "left" }}>
                  <th style={thStyle}>商品</th>
                  <th style={{ ...thStyle, width: 90 }}>数量</th>
                  <th style={{ ...thStyle, width: 120 }}>单价（元）</th>
                  <th style={{ ...thStyle, width: 110, textAlign: "right" }}>小计</th>
                  <th style={{ ...thStyle, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const lineCents = (Number(it.quantity) || 0) * Math.round((Number(it.unit_price) || 0) * 100);
                  const filteredProducts = it.product_name.trim()
                    ? products.filter((p) => p.name.toLowerCase().includes(it.product_name.trim().toLowerCase()))
                    : products;
                  return (
                    <tr key={it.key} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={tdStyle}>
                        <div style={{ position: "relative" }} ref={(el) => { if (el) productBoxRefs.current.set(it.key, el); else productBoxRefs.current.delete(it.key); }}>
                          <input
                            value={it.product_name}
                            onChange={(e) => handleProductInputChange(it.key, e.target.value)}
                            onFocus={() => setActiveProductLine(it.key)}
                            placeholder="输入商品名称搜索"
                            style={inputStyle}
                            autoComplete="off"
                          />
                          {activeProductLine === it.key && (
                            <div style={dropdownStyle}>
                              {filteredProducts.slice(0, 8).map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => handleSelectProduct(it.key, p)}
                                  style={dropdownItemStyle}
                                >
                                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                                  {p.spec && <span style={{ color: "#999", fontSize: 12, marginLeft: 6 }}>{p.spec}</span>}
                                  <span style={{ color: "#bbb", fontSize: 12, marginLeft: 6 }}>库存{p.stock}</span>
                                  <span style={{ color: "#1677ff", fontSize: 12, marginLeft: 6 }}>{formatYuan(p.price_cents)}</span>
                                </div>
                              ))}
                              {it.product_name.trim() && filteredProducts.length === 0 && (
                                <div style={{ padding: "8px 12px", color: "#999", fontSize: 13 }}>无匹配商品，可手动输入名称和单价</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="text" inputMode="numeric" value={it.quantity}
                          onChange={(e) => updateItem(it.key, { quantity: e.target.value.replace(/[^\d]/g, "") })}
                          onFocus={(e) => e.target.select()}
                          style={{ ...inputStyle, textAlign: "center" }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="text" inputMode="decimal" value={it.unit_price}
                          onChange={(e) => updateItem(it.key, { unit_price: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          placeholder="0.00"
                          style={inputStyle}
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>
                        {formatYuan(lineCents)}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => removeItem(it.key)} style={{ background: "none", border: "none", color: "#ff4d4f", cursor: "pointer", fontSize: 16, padding: 0 }} title="删除">×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={() => setItems((prev) => [...prev, emptyLine()])} style={{ ...btnSecondary, fontSize: 13, padding: "4px 12px" }}>+ 添加商品</button>
          </>
        )}

        {/* 对账单提示 */}
        {orderType === "statement" && (
          <div style={{ background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16, fontSize: 14, color: "#555" }}>
            选择客户后点击「确认开单」，将生成该客户的对账单并打印。
          </div>
        )}

        {/* 底部：总额 + 结款方式 + 提交 */}
        <div style={{ marginTop: 20, borderTop: "1px solid #e8e8e8", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          {orderType === "sales" && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <label style={labelStyle}>结款方式</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 4,
                        border: paymentMethod === m ? "1px solid #1677ff" : "1px solid #d9d9d9",
                        background: paymentMethod === m ? "#e6f4ff" : "#fff",
                        color: paymentMethod === m ? "#1677ff" : "#333",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {orderType !== "sales" && <div />}

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {orderType !== "statement" && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#999" }}>合计</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#cf1322" }}>{formatYuan(totalCents)}</div>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ ...btnPrimary, padding: "10px 32px", fontSize: 16, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "提交中..." : orderType === "statement" ? "生成对账单" : "确认开单"}
            </button>
          </div>
        </div>

        {msg && (
          <p style={{ marginTop: 12, fontSize: 14, color: msg.type === "ok" ? "#389e0d" : "#ff4d4f" }}>{msg.text}</p>
        )}
      </div>
    </main>
  );
}

/* ---- helpers for statement HTML ---- */
const thCss = "padding:7px 10px;text-align:left;font-weight:600;border:1px solid #e0e0e0";
const tdCss = "padding:6px 10px;border:1px solid #e0e0e0";
function fmtY(cents: number) {
  const y = Math.abs(cents) / 100;
  const s = y.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents < 0 ? `-¥${s}` : `¥${s}`;
}

/* ---- styles ---- */
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 4, color: "#555" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, boxSizing: "border-box" };
const thStyle: React.CSSProperties = { padding: "8px 10px", fontWeight: 600, borderBottom: "1px solid #e8e8e8", fontSize: 13 };
const tdStyle: React.CSSProperties = { padding: "6px 10px" };
const btnPrimary: React.CSSProperties = { padding: "7px 16px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "6px 14px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, cursor: "pointer" };
const navLink: React.CSSProperties = { display: "inline-block", padding: "6px 14px", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 13, textDecoration: "none", color: "#333" };
const dropdownStyle: React.CSSProperties = { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #d9d9d9", borderRadius: "0 0 4px 4px", boxShadow: "0 4px 12px rgba(0,0,0,.1)", zIndex: 50, maxHeight: 240, overflowY: "auto" };
const dropdownItemStyle: React.CSSProperties = { padding: "8px 12px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 4 };
