import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type Order = { id: string; order_no: string | null; status: string; order_type: string; settlement_type: string; customer_name: string | null; total_cents: number; paid_amount_cents: number; created_at: string };

const statusMap: Record<string, string> = { draft: "草稿", pending_ship: "待发货", shipped: "已发货", settled: "已结清" };
const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-600", pending_ship: "bg-yellow-100 text-yellow-700", shipped: "bg-blue-100 text-blue-700", settled: "bg-green-100 text-green-700" };
const orderTypeMap: Record<string, string> = { sale: "销售单", return: "退货单", purchase: "进货单" };
const nextStatus: Record<string, string> = { draft: "pending_ship", pending_ship: "shipped", shipped: "settled" };

export const Route = createFileRoute("/orders/")({ component: OrdersListPage });

function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadOrders = async () => {
    const query: Record<string, string> = {};
    if (statusFilter) query.status = statusFilter;
    if (orderTypeFilter) query.order_type = orderTypeFilter;
    if (customerName) query.customer_name = customerName;
    if (startDate) query.start_date = startDate;
    if (endDate) query.end_date = endDate;
    const res = await api.orders.get({ query });
    setOrders((res.data ?? []) as Order[]);
  };

  useEffect(() => { loadOrders(); }, [statusFilter, orderTypeFilter, customerName, startDate, endDate]);

  const handleStatusUpdate = async (id: string, status: string) => {
    await api.orders({ id }).status.patch({ status } as never);
    await loadOrders();
  };

  const totalCentsSum = orders.reduce((s, o) => s + o.total_cents, 0);
  const paidCentsSum = orders.reduce((s, o) => s + o.paid_amount_cents, 0);

  const handlePrintReconcile = () => window.print();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">订单列表</h1>
          <span className="text-xs text-gray-400">{!startDate && !endDate ? "（默认今日）" : ""}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrintReconcile} disabled={orders.length === 0} className="px-4 py-2 border border-green-600 text-green-600 rounded-lg text-sm hover:bg-green-50 disabled:opacity-50">对账/打印</button>
          <a href="/orders/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">新建订单</a>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex flex-wrap gap-3 items-end print:hidden">
        <div>
          <label className="block text-xs text-gray-500 mb-1">客户</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="模糊搜索" className="px-3 py-1.5 border rounded-lg text-sm w-32" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">类型</label>
          <select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
            <option value="">全部</option>
            {Object.entries(orderTypeMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">状态</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
            <option value="">全部</option>
            {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">开始</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">结束</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Summary */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border p-3 text-center"><p className="text-xs text-gray-500">应收</p><p className="text-lg font-bold">¥{(totalCentsSum / 100).toFixed(2)}</p></div>
          <div className="bg-white rounded-lg border p-3 text-center"><p className="text-xs text-gray-500">已收</p><p className="text-lg font-bold text-green-600">¥{(paidCentsSum / 100).toFixed(2)}</p></div>
          <div className="bg-white rounded-lg border p-3 text-center"><p className="text-xs text-gray-500">欠款</p><p className="text-lg font-bold text-red-600">¥{((totalCentsSum - paidCentsSum) / 100).toFixed(2)}</p></div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">订单号</th>
              <th className="text-left px-4 py-3 font-medium">类型</th>
              <th className="text-left px-4 py-3 font-medium">客户</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-left px-4 py-3 font-medium print:hidden">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><a href={`/orders/${o.id}`} className="text-blue-600 hover:underline">{o.order_no ?? o.id.slice(0, 8)}</a></td>
                <td className="px-4 py-3 text-gray-500">{orderTypeMap[o.order_type] ?? o.order_type}</td>
                <td className="px-4 py-3">{o.customer_name ?? "-"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] ?? "bg-gray-100"}`}>{statusMap[o.status] ?? o.status}</span></td>
                <td className="px-4 py-3 text-right">¥{(o.total_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 print:hidden">
                  {nextStatus[o.status] && <button onClick={() => handleStatusUpdate(o.id, nextStatus[o.status]!)} className="text-blue-600 text-xs mr-2">{statusMap[nextStatus[o.status]!]}</button>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无订单</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
