import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../lib/api";

type Product = {
  id: string; name: string; category: string | null; unit: string | null;
  supplier_name: string | null; purchase_price_cents: number; price_cents: number;
  note: string | null; stock: number;
};

export const Route = createFileRoute("/products")({ component: ProductsPage });

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<"sold-today" | "all">("sold-today");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", unit: "个", supplier_name: "", purchase_price_cents: 0, price_cents: 0, note: "" });

  const reload = async () => {
    if (view === "sold-today" && !search) {
      const res = await api.products["sold-today"].get();
      setProducts((res.data ?? []) as Product[]);
    } else {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      const res = await api.products.get({ query });
      setProducts((res.data ?? []) as Product[]);
    }
  };

  useEffect(() => { reload(); }, [view, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { name: form.name, unit: form.unit || "个", purchase_price_cents: form.purchase_price_cents, price_cents: form.price_cents };
    if (form.category) payload.category = form.category;
    if (form.supplier_name) payload.supplier_name = form.supplier_name;
    if (form.note) payload.note = form.note;
    await api.products.post(payload as never);
    setForm({ name: "", category: "", unit: "个", supplier_name: "", purchase_price_cents: 0, price_cents: 0, note: "" });
    setShowForm(false);
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此商品？")) return;
    await api.products({ id }).delete();
    await reload();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">商品管理</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          {showForm ? "取消" : "+ 新建商品"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button onClick={() => setView("sold-today")} className={`px-3 py-1.5 ${view === "sold-today" ? "bg-blue-600 text-white" : "bg-white"}`}>今日已售</button>
          <button onClick={() => setView("all")} className={`px-3 py-1.5 ${view === "all" ? "bg-blue-600 text-white" : "bg-white"}`}>全部商品</button>
        </div>
        <input value={search} onChange={(e) => { setSearch(e.target.value); setView("all"); }} placeholder="搜索品名/类别..." className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">品名 *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">类别</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="脚垫/坐垫/雨挡..." className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">单位</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">供货商</label><input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">进价（元）</label><input type="number" step="0.01" value={form.purchase_price_cents / 100 || ""} onChange={(e) => setForm({ ...form, purchase_price_cents: Math.round(Number(e.target.value) * 100) })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">售价（元）</label><input type="number" step="0.01" value={form.price_cents / 100 || ""} onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs text-gray-500 mb-1">备注</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">保存</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">品名</th>
              <th className="text-left px-4 py-3 font-medium">类别</th>
              <th className="text-left px-4 py-3 font-medium">单位</th>
              <th className="text-left px-4 py-3 font-medium">供货商</th>
              <th className="text-right px-4 py-3 font-medium">进价</th>
              <th className="text-right px-4 py-3 font-medium">售价</th>
              <th className="text-left px-4 py-3 font-medium">备注</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category ?? "-"}</td>
                <td className="px-4 py-3 text-gray-500">{p.unit ?? "个"}</td>
                <td className="px-4 py-3 text-gray-500">{p.supplier_name ?? "-"}</td>
                <td className="px-4 py-3 text-right">¥{(p.purchase_price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">¥{(p.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{p.note ?? "-"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm">删除</button></td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{view === "sold-today" ? "今日暂无销售" : "暂无商品"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
