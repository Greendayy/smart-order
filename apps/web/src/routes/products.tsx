import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../lib/api";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  spec: string | null;
  category: string | null;
  oe_code: string | null;
  unit: string | null;
  price_cents: number;
  cost_cents: number;
  stock: number;
};

export const Route = createFileRoute("/products")({
  component: ProductsPage,
  loader: async () => {
    const res = await api.products.get();
    return (res.data ?? []) as Product[];
  }
});

function ProductsPage() {
  const initialProducts = Route.useLoaderData();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    oe_code: "",
    unit: "个",
    price_cents: 0,
    cost_cents: 0,
    stock: 0
  });

  const reload = async () => {
    const res = await api.products.get();
    setProducts((res.data ?? []) as Product[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name,
      unit: form.unit || "个",
      price_cents: form.price_cents,
      cost_cents: form.cost_cents,
      stock: form.stock
    };
    if (form.category) payload.category = form.category;
    if (form.oe_code) payload.oe_code = form.oe_code;
    await api.products.post(payload as never);
    setForm({ name: "", category: "", oe_code: "", unit: "个", price_cents: 0, cost_cents: 0, stock: 0 });
    setShowForm(false);
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此商品？")) return;
    await api.products({ id }).delete();
    await reload();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">商品管理</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          {showForm ? "取消" : "新增商品"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OE编码</label>
              <input
                value={form.oe_code}
                onChange={(e) => setForm({ ...form, oe_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">售价（分）</label>
              <input
                type="number"
                value={form.price_cents}
                onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成本（分）</label>
              <input
                type="number"
                value={form.cost_cents}
                onChange={(e) => setForm({ ...form, cost_cents: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">库存</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            保存
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">名称</th>
              <th className="text-left px-4 py-3 font-medium">分类</th>
              <th className="text-left px-4 py-3 font-medium">OE编码</th>
              <th className="text-right px-4 py-3 font-medium">售价</th>
              <th className="text-right px-4 py-3 font-medium">库存</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category ?? "-"}</td>
                <td className="px-4 py-3 text-gray-500">{p.oe_code ?? "-"}</td>
                <td className="px-4 py-3 text-right">¥{(p.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{p.stock} {p.unit ?? "个"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无商品</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
