import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type Product = { id: string; name: string; price_cents: number; unit: string | null; category: string | null };
type Customer = { id: string; name: string; phone: string | null; address: string | null };
type OrderItem = { product_id: string; product_name: string; unit_price_cents: number; quantity: number; unit: string; category: string; note: string };

export const Route = createFileRoute("/orders/new")({ component: NewOrderPage });

function useDebounce(value: string, delay: number) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

function NewOrderPage() {
  const [orderType, setOrderType] = useState<"sale" | "return" | "purchase">("sale");
  const [settlementType, setSettlementType] = useState<"cash" | "monthly" | "collect">("cash");

  // Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const debouncedCS = useDebounce(customerSearch, 300);

  useEffect(() => {
    if (!debouncedCS || selectedCustomer) return;
    api.customers.get({ query: { search: debouncedCS } }).then((r) => setCustomerResults((r.data ?? []) as Customer[]));
  }, [debouncedCS, selectedCustomer]);

  // Products
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const debouncedPS = useDebounce(productSearch, 300);

  useEffect(() => {
    if (!debouncedPS) { setProductResults([]); return; }
    api.products.get({ query: { search: debouncedPS } }).then((r) => setProductResults((r.data ?? []) as Product[]));
  }, [debouncedPS]);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState("");

  const addItem = () => setItems([...items, { product_id: "", product_name: "", unit_price_cents: 0, quantity: 1, unit: "个", category: "", note: "" }]);
  const updateItem = (i: number, p: Partial<OrderItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...p } : it));
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const selectProduct = (i: number, p: Product) => {
    updateItem(i, { product_id: p.id, product_name: p.name, unit_price_cents: p.price_cents, unit: p.unit ?? "个", category: p.category ?? "" });
    setProductSearch(""); setProductResults([]); setActiveIdx(null);
  };

  const totalCents = items.reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      order_type: orderType, settlement_type: settlementType,
      items: items.map((it) => {
        const obj: Record<string, unknown> = { product_name: it.product_name, quantity: it.quantity, unit_price_cents: it.unit_price_cents };
        if (it.product_id) obj.product_id = it.product_id;
        if (it.unit) obj.unit = it.unit;
        if (it.category) obj.category = it.category;
        if (it.note) obj.note = it.note;
        return obj;
      })
    };
    if (note) payload.note = note;
    if (selectedCustomer) {
      payload.customer_id = selectedCustomer.id;
    } else if (newCustomer.name) {
      payload.customer_name = newCustomer.name;
      if (newCustomer.phone) payload.customer_phone = newCustomer.phone;
      if (newCustomer.address) payload.customer_address = newCustomer.address;
    }
    return payload;
  };

  const handleSave = async (andPrint: boolean) => {
    if (!selectedCustomer && !newCustomer.name) { alert("请选择或新建客户"); return; }
    if (items.length === 0) { alert("请添加至少一个商品"); return; }
    const payload = buildPayload();
    payload.status = "draft";
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-xl font-bold">新建订单</h1>
      </div>

      {/* Order type & settlement */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 flex flex-wrap gap-6">
        <div>
          <label className="block text-xs text-gray-500 mb-2">开单类型</label>
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(["sale", "return", "purchase"] as const).map((t) => (
              <button key={t} onClick={() => setOrderType(t)} className={`px-4 py-1.5 ${orderType === t ? "bg-blue-600 text-white" : "bg-white"}`}>{orderTypeLabel[t]}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2">结算方式</label>
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(["cash", "monthly", "collect"] as const).map((t) => (
              <button key={t} onClick={() => setSettlementType(t)} className={`px-4 py-1.5 ${settlementType === t ? "bg-blue-600 text-white" : "bg-white"}`}>{settlementLabel[t]}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-4">客户信息</h2>
        {selectedCustomer ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{selectedCustomer.name}</span>
            <span className="text-gray-500">{selectedCustomer.phone ?? ""}</span>
            <span className="text-gray-500">{selectedCustomer.address ?? ""}</span>
            <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="text-blue-600 text-sm">更换</button>
          </div>
        ) : showNewCustomer ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="名称 *" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="电话" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} placeholder="地址" className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <button onClick={() => { setShowNewCustomer(false); setNewCustomer({ name: "", phone: "", address: "" }); }} className="text-sm text-gray-500">取消，搜索已有客户</button>
          </div>
        ) : (
          <div className="relative">
            <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="搜索客户名称或电话..." className="w-full px-3 py-2 border rounded-lg text-sm" />
            {customerResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                {customerResults.map((c) => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerSearch(""); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">
                    {c.name} {c.phone ? `(${c.phone})` : ""} {c.address ? `- ${c.address}` : ""}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNewCustomer(true)} className="mt-2 text-sm text-blue-600">+ 新建客户</button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">商品明细</h2>
          <button onClick={addItem} className="text-sm text-blue-600">+ 添加商品</button>
        </div>
        {items.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">点击"添加商品"开始</p> : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <input value={activeIdx === idx ? productSearch : item.product_name}
                      onChange={(e) => { setActiveIdx(idx); setProductSearch(e.target.value); updateItem(idx, { product_name: e.target.value, product_id: "" }); }}
                      onFocus={() => setActiveIdx(idx)} placeholder="品名（搜索或输入）" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    {activeIdx === idx && productResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                        {productResults.map((p) => (
                          <button key={p.id} onClick={() => selectProduct(idx, p)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">
                            {p.name} — ¥{(p.price_cents / 100).toFixed(2)}/{p.unit ?? "个"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="单位" className="w-16 px-2 py-2 border rounded-lg text-sm text-center" />
                  <input value={item.category} onChange={(e) => updateItem(idx, { category: e.target.value })} placeholder="类别" className="w-20 px-2 py-2 border rounded-lg text-sm" />
                  <input type="number" step="0.1" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })} className="w-20 px-2 py-2 border rounded-lg text-sm text-center" placeholder="数量" />
                  <input type="number" step="0.01" value={item.unit_price_cents / 100 || ""} onChange={(e) => updateItem(idx, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} className="w-24 px-2 py-2 border rounded-lg text-sm text-right" placeholder="单价(元)" />
                  <span className="w-24 py-2 text-sm text-right text-gray-600">¥{((item.quantity * item.unit_price_cents) / 100).toFixed(2)}</span>
                  <button onClick={() => removeItem(idx)} className="py-2 text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
                <input value={item.note} onChange={(e) => updateItem(idx, { note: e.target.value })} placeholder="备注（可选）" className="w-full px-3 py-1.5 border rounded-lg text-xs text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-3">订单备注</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="备注（可选）" className="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border p-6">
        <div>
          <span className="text-gray-500 text-sm">合计：</span>
          <span className="text-2xl font-bold text-blue-600 ml-2">¥{(totalCents / 100).toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50">保存</button>
          <button onClick={() => handleSave(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">保存并打印</button>
        </div>
      </div>
    </div>
  );
}
