import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../lib/api";

type Customer = { id: string; name: string; phone: string | null; address: string | null; balance_cents: number };

export const Route = createFileRoute("/customers")({ component: CustomersPage });

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [sortByBalance, setSortByBalance] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const reload = async () => {
    const query: Record<string, string> = {};
    if (search) query.search = search;
    if (sortByBalance) query.sort_by = "balance";
    const res = await api.customers.get({ query });
    setCustomers((res.data ?? []) as Customer[]);
  };

  useEffect(() => { reload(); }, [search, sortByBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { name: form.name };
    if (form.phone) payload.phone = form.phone;
    if (form.address) payload.address = form.address;
    await api.customers.post(payload as never);
    setForm({ name: "", phone: "", address: "" });
    setShowForm(false);
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此客户？")) return;
    await api.customers({ id }).delete();
    await reload();
  };

  const balanceColor = (cents: number) => {
    if (cents > 0) return "text-red-600";
    if (cents < 0) return "text-green-600";
    return "text-gray-900";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">客户管理</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          {showForm ? "取消" : "+ 新建客户"}
        </button>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索客户名称/电话..." className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={sortByBalance} onChange={(e) => setSortByBalance(e.target.checked)} className="rounded" />
          按金额排序
        </label>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">名称 *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">电话</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">地址</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">保存</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">名称</th>
              <th className="text-left px-4 py-3 font-medium">电话</th>
              <th className="text-left px-4 py-3 font-medium">地址</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone ?? "-"}</td>
                <td className="px-4 py-3 text-gray-500">{c.address ?? "-"}</td>
                <td className={`px-4 py-3 text-right font-medium ${balanceColor(c.balance_cents)}`}>
                  ¥{(c.balance_cents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-sm">删除</button></td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无客户</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
