import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type Order = {
  id: string;
  order_no: string | null;
  status: string;
  customer_name: string | null;
  total_cents: number;
  paid_amount_cents: number;
  created_at: string;
};

const statusMap: Record<string, string> = {
  draft: "草稿",
  pending: "待处理",
  preparing: "备货中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消"
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600"
};

const nextStatus: Record<string, string> = {
  draft: "pending",
  pending: "preparing",
  preparing: "shipped",
  shipped: "completed"
};

export const Route = createFileRoute("/orders/")({
  component: OrdersListPage
});

function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadOrders = async () => {
    const query: Record<string, string> = {};
    if (statusFilter) query.status = statusFilter;
    if (startDate) query.start_date = startDate;
    if (endDate) query.end_date = endDate;
    const res = await api.orders.get({ query });
    setOrders((res.data ?? []) as Order[]);
  };

  useEffect(() => { loadOrders(); }, [statusFilter, startDate, endDate]);

  const handleStatusUpdate = async (id: string, status: string) => {
    await api.orders({ id }).status.patch({ status } as never);
    await loadOrders();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">订单列表</h1>
        </div>
        <a href="/orders/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          新建订单
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">状态</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部</option>
            {Object.entries(statusMap).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
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

      {/* Orders table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">订单号</th>
              <th className="text-left px-4 py-3 font-medium">客户</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-left px-4 py-3 font-medium">日期</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <a href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                    {o.order_no ?? o.id.slice(0, 8)}
                  </a>
                </td>
                <td className="px-4 py-3">{o.customer_name ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] ?? "bg-gray-100"}`}>
                    {statusMap[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">¥{(o.total_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3 text-right">
                  {nextStatus[o.status] && (
                    <button
                      onClick={() => handleStatusUpdate(o.id, nextStatus[o.status]!)}
                      className="text-blue-600 hover:text-blue-800 text-xs mr-2"
                    >
                      {statusMap[nextStatus[o.status]!]}
                    </button>
                  )}
                  {o.status !== "cancelled" && o.status !== "completed" && (
                    <button
                      onClick={() => handleStatusUpdate(o.id, "cancelled")}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      取消
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无订单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
