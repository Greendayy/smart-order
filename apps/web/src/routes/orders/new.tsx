import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type Product = { id: string; name: string; price_cents: number; unit: string | null; category: string | null };
type Customer = { id: string; name: string; phone: string | null; address: string | null };
type OrderItem = { product_id: string; product_name: string; unit_price_cents: number; quantity: number; unit: string; category: string };

export const Route = createFileRoute("/orders/new")({ component: NewOrderPage });

function useDebounce(value: string, delay: number) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

function NewOrderPage() {
  const [orderType, setOrderType] = useState<"sale" | "return" | "purchase">("sale");
  const [settlementType, setSettlementType] = useState<"cash" | "monthly" | "collect">("cash");

  // Customer — inline fields with autocomplete
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custId, setCustId] = useState<string | null>(null);
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [custFocus, setCustFocus] = useState<"name" | "phone" | null>(null);

  const debouncedCustName = useDebounce(custName, 300);
  const debouncedCustPhone = useDebounce(custPhone, 300);

  useEffect(() => {
    if (custFocus !== "name" || !debouncedCustName || custId) { if (custFocus === "name" && !debouncedCustName) setCustResults([]); return; }
    api.customers.get({ query: { search: debouncedCustName } }).then((r) => setCustResults((r.data ?? []) as Customer[]));
  }, [debouncedCustName, custFocus, custId]);

  useEffect(() => {
    if (custFocus !== "phone" || !debouncedCustPhone || custId) { if (custFocus === "phone" && !debouncedCustPhone) setCustResults([]); return; }
    api.customers.get({ query: { search: debouncedCustPhone } }).then((r) => setCustResults((r.data ?? []) as Customer[]));
  }, [debouncedCustPhone, custFocus, custId]);

  const selectCustomer = (c: Customer) => {
    setCustId(c.id); setCustName(c.name); setCustPhone(c.phone ?? ""); setCustAddress(c.address ?? "");
    setCustResults([]); setCustFocus(null);
  };
  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const debouncedPS = useDebounce(productSearch, 300);

  useEffect(() => {
    if (!debouncedPS) { setProductResults([]); return; }
    api.products.get({ query: { search: debouncedPS } }).then((r) => setProductResults((r.data ?? []) as Product[]));
  }, [debouncedPS]);

  // Items
  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState("");

  const addItem = () => setItems([...items, { product_id: "", product_name: "", unit_price_cents: 0, quantity: 1, unit: "个", category: "" }]);
  const updateItem = (i: number, p: Partial<OrderItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...p } : it));
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const selectProduct = (i: number, p: Product) => {
    updateItem(i, { product_id: p.id, product_name: p.name, unit_price_cents: p.price_cents, unit: p.unit ?? "个", category: p.category ?? "" });
    setProductSearch(""); setProductResults([]); setActiveIdx(null);
  };

  const totalCents = items.reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);

  const handleSave = async (andPrint: boolean) => {
    if (!custName) { alert("请输入客户名称"); return; }
    if (items.length === 0) { alert("请添加至少一个商品"); return; }

    const payload: Record<string, unknown> = {
      order_type: orderType, settlement_type: settlementType, status: "draft",
      items: items.map((it) => {
        const obj: Record<string, unknown> = { product_name: it.product_name, quantity: it.quantity, unit_price_cents: it.unit_price_cents };
        if (it.product_id) obj.product_id = it.product_id;
        if (it.unit) obj.unit = it.unit;
        if (it.category) obj.category = it.category;
        return obj;
      })
    };
    if (note) payload.note = note;

    if (custId) {
      payload.customer_id = custId;
      // Also pass phone/address in case they were edited
      if (custPhone) payload.customer_phone = custPhone;
      if (custAddress) payload.customer_address = custAddress;
    } else {
      payload.customer_name = custName;
      if (custPhone) payload.customer_phone = custPhone;
      if (custAddress) payload.customer_address = custAddress;
    }

    const res = await api.orders.post(payload as never);
    const data = res.data as Record<string, unknown> | null;
    if (data?.id) {
      if (andPrint) window.location.href = `/orders/${data.id as string}?print=1`;
      else window.location.href = `/orders/${data.id as string}`;
    }
  };

  const orderTypeLabel = { sale: "销售单", return: "退货单", purchase: "进货单" } as const;
  const settlementLabel = { cash: "现结", monthly: "月结", collect: "代收" } as const;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">{orderTypeLabel[orderType]}</h1>
        </div>
        <div className="flex gap-2">
          {(["sale", "return", "purchase"] as const).map((t) => (
            <button key={t} onClick={() => setOrderType(t)}
              className={`px-3 py-1 rounded-lg text-sm ${orderType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {orderTypeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Order form as a single card */}
      <div className="bg-white rounded-xl shadow-sm border">
        {/* Customer section */}
        <div className="p-5 border-b">
          <div className="grid grid-cols-3 gap-3">
            {/* Name with autocomplete */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">客户名称</label>
              <input value={custName} placeholder="输入名称匹配..."
                onFocus={() => setCustFocus("name")}
                onChange={(e) => { setCustName(e.target.value); setCustId(null); setCustFocus("name"); }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {custFocus === "name" && custResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {custResults.map((c) => (
                    <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Phone with autocomplete */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">电话</label>
              <input value={custPhone} placeholder="输入电话匹配..."
                onFocus={() => setCustFocus("phone")}
                onChange={(e) => { setCustPhone(e.target.value); setCustId(null); setCustFocus("phone"); }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {custFocus === "phone" && custResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {custResults.map((c) => (
                    <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">地址</label>
              <input value={custAddress} onChange={(e) => setCustAddress(e.target.value)} placeholder="地址"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="p-5 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 font-medium">商品明细</span>
            <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ 添加</button>
          </div>

          {items.length === 0 ? (
            <div className="text-center text-gray-300 py-8 text-sm">点击 "+ 添加" 添加商品</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b">
                  <th className="text-left pb-2 font-medium">品名</th>
                  <th className="text-center pb-2 font-medium w-16">单位</th>
                  <th className="text-center pb-2 font-medium w-20">类别</th>
                  <th className="text-center pb-2 font-medium w-20">数量</th>
                  <th className="text-right pb-2 font-medium w-24">单价(元)</th>
                  <th className="text-right pb-2 font-medium w-24">金额</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-2 relative">
                      <input value={activeIdx === idx ? productSearch : item.product_name}
                        onChange={(e) => { setActiveIdx(idx); setProductSearch(e.target.value); updateItem(idx, { product_name: e.target.value, product_id: "" }); }}
                        onFocus={() => setActiveIdx(idx)}
                        onBlur={() => setTimeout(() => { if (activeIdx === idx) setActiveIdx(null); }, 200)}
                        placeholder="搜索或输入品名"
                        className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      {activeIdx === idx && productResults.length > 0 && (
                        <div className="absolute z-20 left-0 right-2 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                          {productResults.map((p) => (
                            <button key={p.id} onMouseDown={() => selectProduct(idx, p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">
                              {p.name} — ¥{(p.price_cents / 100).toFixed(2)}/{p.unit ?? "个"}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-1"><input value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="w-full px-1 py-1.5 border rounded text-sm text-center" /></td>
                    <td className="py-2 px-1"><input value={item.category} onChange={(e) => updateItem(idx, { category: e.target.value })} className="w-full px-1 py-1.5 border rounded text-sm text-center" /></td>
                    <td className="py-2 px-1"><input type="number" step="0.1" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })} className="w-full px-1 py-1.5 border rounded text-sm text-center" /></td>
                    <td className="py-2 px-1"><input type="number" step="0.01" value={item.unit_price_cents / 100 || ""} onChange={(e) => updateItem(idx, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} className="w-full px-1 py-1.5 border rounded text-sm text-right" /></td>
                    <td className="py-2 px-1 text-right text-gray-600">¥{((item.quantity * item.unit_price_cents) / 100).toFixed(2)}</td>
                    <td className="py-2 pl-1"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: settlement + note + total + buttons */}
        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs text-gray-400">结算方式</span>
            {(["cash", "monthly", "collect"] as const).map((t) => (
              <button key={t} onClick={() => setSettlementType(t)}
                className={`px-3 py-1 rounded text-sm ${settlementType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {settlementLabel[t]}
              </button>
            ))}
          </div>

          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} placeholder="备注（可选）"
            className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" />

          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">¥{(totalCents / 100).toFixed(2)}</div>
            <div className="flex gap-3">
              <button onClick={() => handleSave(false)} className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">保存</button>
              <button onClick={() => handleSave(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">保存并打印</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
