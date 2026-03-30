import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type Product = { id: string; name: string; price_cents: number; unit: string | null };
type Customer = { id: string; name: string; phone: string | null };

type OrderItem = {
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export const Route = createFileRoute("/orders/new")({
  component: NewOrderPage
});

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function NewOrderPage() {
  // Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  useEffect(() => {
    if (!debouncedCustomerSearch || selectedCustomer) return;
    api.customers.get({ query: { search: debouncedCustomerSearch } }).then((res) => {
      setCustomerResults((res.data ?? []) as Customer[]);
    });
  }, [debouncedCustomerSearch, selectedCustomer]);

  // Products search
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);

  const debouncedProductSearch = useDebounce(productSearch, 300);

  useEffect(() => {
    if (!debouncedProductSearch) { setProductResults([]); return; }
    api.products.get({ query: { search: debouncedProductSearch } }).then((res) => {
      setProductResults((res.data ?? []) as Product[]);
    });
  }, [debouncedProductSearch]);

  // Order items
  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState("");

  const addEmptyItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { product_id: "", product_name: "", unit_price_cents: 0, quantity: 1 }
    ]);
  }, []);

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectProduct = (idx: number, product: Product) => {
    updateItem(idx, {
      product_id: product.id,
      product_name: product.name,
      unit_price_cents: product.price_cents
    });
    setProductSearch("");
    setProductResults([]);
    setActiveItemIdx(null);
  };

  const totalCents = items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);

  const handleSave = async () => {
    if (!selectedCustomer && !newCustomerName) {
      alert("请选择或新建客户");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一个商品");
      return;
    }

    const payload: Record<string, unknown> = {
      items: items.map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        ...(item.product_id ? { product_id: item.product_id } : {})
      }))
    };
    if (note) payload.note = note;

    if (selectedCustomer) {
      payload.customer_id = selectedCustomer.id;
    } else {
      payload.customer_name = newCustomerName;
      if (newCustomerPhone) payload.customer_phone = newCustomerPhone;
    }

    const res = await api.orders.post(payload as never);
    const data = res.data as Record<string, unknown> | null;
    if (data?.id) {
      window.location.href = `/orders/${data.id as string}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-xl font-bold">新建订单</h1>
      </div>

      {/* Customer section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-4">客户信息</h2>
        {selectedCustomer ? (
          <div className="flex items-center gap-4">
            <span className="font-medium">{selectedCustomer.name}</span>
            <span className="text-gray-500 text-sm">{selectedCustomer.phone ?? ""}</span>
            <button
              onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              更换
            </button>
          </div>
        ) : showNewCustomer ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="客户名称 *"
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="电话（可选）"
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => { setShowNewCustomer(false); setNewCustomerName(""); setNewCustomerPhone(""); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              取消，搜索已有客户
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="搜索客户名称或电话..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {customerResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerSearch(""); }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                  >
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowNewCustomer(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + 新建客户
            </button>
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">商品明细</h2>
          <button onClick={addEmptyItem} className="text-sm text-blue-600 hover:text-blue-800">+ 添加商品</button>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">点击"添加商品"开始</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 relative">
                  <input
                    value={activeItemIdx === idx ? productSearch : item.product_name}
                    onChange={(e) => {
                      setActiveItemIdx(idx);
                      setProductSearch(e.target.value);
                      updateItem(idx, { product_name: e.target.value, product_id: "" });
                    }}
                    onFocus={() => setActiveItemIdx(idx)}
                    placeholder="搜索或输入商品名称"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {activeItemIdx === idx && productResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                      {productResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectProduct(idx, p)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                        >
                          {p.name} — ¥{(p.price_cents / 100).toFixed(2)}/{p.unit ?? "个"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                  className="w-20 px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="数量"
                />
                <input
                  type="number"
                  value={item.unit_price_cents}
                  onChange={(e) => updateItem(idx, { unit_price_cents: Number(e.target.value) || 0 })}
                  className="w-28 px-3 py-2 border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="单价(分)"
                />
                <span className="w-24 py-2 text-sm text-right text-gray-600">
                  ¥{((item.quantity * item.unit_price_cents) / 100).toFixed(2)}
                </span>
                <button onClick={() => removeItem(idx)} className="py-2 text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-3">备注</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="订单备注（可选）"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border p-6">
        <div>
          <span className="text-gray-500 text-sm">合计：</span>
          <span className="text-2xl font-bold text-blue-600 ml-2">¥{(totalCents / 100).toFixed(2)}</span>
        </div>
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          保存订单
        </button>
      </div>
    </div>
  );
}
