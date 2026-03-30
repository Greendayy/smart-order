import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../lib/api";

type Customer = { id: string; name: string };
type ReconcileRow = {
  customer_id: string;
  customer_name: string;
  order_count: number;
  total_cents: number;
  paid_cents: number;
  owed_cents: number;
};

export const Route = createFileRoute("/reconcile")({
  component: ReconcilePage
});

function ReconcilePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<ReconcileRow[]>([]);

  useEffect(() => {
    api.customers.get().then((res) => setCustomers((res.data ?? []) as Customer[]));
  }, []);

  const handleQuery = async () => {
    const query: Record<string, string> = {};
    if (customerId) query.customer_id = customerId;
    if (startDate) query.start_date = startDate;
    if (endDate) query.end_date = endDate;
    const res = await api.orders.reconcile.get({ query });
    setRows((res.data ?? []) as ReconcileRow[]);
  };

  useEffect(() => { handleQuery(); }, [customerId, startDate, endDate]);

  const summaryTotal = rows.reduce((s, r) => s + r.total_cents, 0);
  const summaryPaid = rows.reduce((s, r) => s + r.paid_cents, 0);
  const summaryOwed = rows.reduce((s, r) => s + r.owed_cents, 0);

  const handleExportCSV = () => {
    const header = "客户,订单数,应收(元),已收(元),欠款(元)\n";
    const body = rows.map((r) =>
      `${r.customer_name},${r.order_count},${(r.total_cents / 100).toFixed(2)},${(r.paid_cents / 100).toFixed(2)},${(r.owed_cents / 100).toFixed(2)}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `对账_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">对账</h1>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={rows.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          导出 Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">客户</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部客户</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">应收总额</p>
          <p className="text-xl font-bold">¥{(summaryTotal / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">已收总额</p>
          <p className="text-xl font-bold text-green-600">¥{(summaryPaid / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">欠款总额</p>
          <p className="text-xl font-bold text-red-600">¥{(summaryOwed / 100).toFixed(2)}</p>
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">客户</th>
              <th className="text-right px-4 py-3 font-medium">订单数</th>
              <th className="text-right px-4 py-3 font-medium">应收</th>
              <th className="text-right px-4 py-3 font-medium">已收</th>
              <th className="text-right px-4 py-3 font-medium">欠款</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.customer_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                <td className="px-4 py-3 text-right">{r.order_count}</td>
                <td className="px-4 py-3 text-right">¥{(r.total_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-green-600">¥{(r.paid_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-red-600 font-medium">¥{(r.owed_cents / 100).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
