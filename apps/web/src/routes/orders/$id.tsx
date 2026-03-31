import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type OrderItem = { id: string; product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number; unit: string | null; note: string | null };
type OrderDetail = { id: string; order_no: string | null; status: string; order_type: string; settlement_type: string; note: string | null; created_at: string; customer_name: string | null; customer_phone: string | null; customer_address: string | null; paid_amount_cents: number; items: OrderItem[] };

const statusMap: Record<string, string> = { draft: "草稿", pending_ship: "待发货", shipped: "已发货", settled: "已结清" };
const orderTypeMap: Record<string, string> = { sale: "销售单", return: "退货单", purchase: "进货单" };
const settlementMap: Record<string, string> = { cash: "现结", monthly: "月结", collect: "代收" };

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetailPage,
  loader: async ({ params }) => {
    const res = await api.orders({ id: params.id }).get();
    return res.data as OrderDetail;
  }
});

function OrderDetailPage() {
  const order = Route.useLoaderData();
  const totalCents = order.items.reduce((s, i) => s + i.line_total_cents, 0);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1") {
      setTimeout(() => window.print(), 500);
    }
  }, []);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
            <h1 className="text-xl font-bold">订单详情</h1>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">打印</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">订单号</span><p className="font-medium mt-1">{order.order_no ?? "-"}</p></div>
            <div><span className="text-gray-500">类型</span><p className="font-medium mt-1">{orderTypeMap[order.order_type] ?? order.order_type}</p></div>
            <div><span className="text-gray-500">状态</span><p className="font-medium mt-1">{statusMap[order.status] ?? order.status}</p></div>
            <div><span className="text-gray-500">结算</span><p className="font-medium mt-1">{settlementMap[order.settlement_type] ?? order.settlement_type}</p></div>
            <div><span className="text-gray-500">创建时间</span><p className="font-medium mt-1">{new Date(order.created_at).toLocaleString("zh-CN")}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold mb-3">客户</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">名称</span><p className="font-medium mt-1">{order.customer_name ?? "-"}</p></div>
            <div><span className="text-gray-500">电话</span><p className="font-medium mt-1">{order.customer_phone ?? "-"}</p></div>
            <div><span className="text-gray-500">地址</span><p className="font-medium mt-1">{order.customer_address ?? "-"}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">品名</th>
                <th className="text-right px-4 py-3 font-medium">单价</th>
                <th className="text-right px-4 py-3 font-medium">数量</th>
                <th className="text-right px-4 py-3 font-medium">金额</th>
                <th className="text-left px-4 py-3 font-medium">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">{i.product_name}</td>
                  <td className="px-4 py-3 text-right">¥{(i.unit_price_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{i.quantity} {i.unit ?? "个"}</td>
                  <td className="px-4 py-3 text-right font-medium">¥{(i.line_total_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{i.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">合计</span><span className="font-medium">¥{(totalCents / 100).toFixed(2)}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">已付</span><span className="font-medium">¥{(order.paid_amount_cents / 100).toFixed(2)}</span></div>
          <div className="flex justify-between text-sm border-t pt-2 mt-2"><span className="text-gray-500 font-semibold">欠款</span><span className="font-bold text-red-600">¥{((totalCents - order.paid_amount_cents) / 100).toFixed(2)}</span></div>
          {order.note && <div className="mt-4 text-sm"><span className="text-gray-500">备注：</span><span>{order.note}</span></div>}
        </div>
      </div>

      {/* Print */}
      <div className="hidden print:block print-area">
        {[1, 2, 3].map((copy) => (
          <div key={copy} className="print-copy">
            <div className="print-header">
              <h1>Smart Order {orderTypeMap[order.order_type] ?? "销售单"}</h1>
              <p className="copy-label">{copy === 1 ? "客户联" : copy === 2 ? "存根联" : "财务联"}</p>
            </div>
            <div className="print-info"><span>单号：{order.order_no ?? "-"}</span><span>日期：{new Date(order.created_at).toLocaleDateString("zh-CN")}</span></div>
            <div className="print-info"><span>客户：{order.customer_name ?? "-"}</span><span>电话：{order.customer_phone ?? "-"}</span></div>
            {order.customer_address && <div className="print-info"><span>地址：{order.customer_address}</span></div>}
            <div className="print-info"><span>结算：{settlementMap[order.settlement_type] ?? "-"}</span></div>
            <table className="print-table">
              <thead><tr><th>序号</th><th>品名</th><th>数量</th><th>单价</th><th>金额</th></tr></thead>
              <tbody>
                {order.items.map((i, idx) => (
                  <tr key={i.id}><td>{idx + 1}</td><td>{i.product_name}</td><td>{i.quantity}{i.unit ?? "个"}</td><td>¥{(i.unit_price_cents / 100).toFixed(2)}</td><td>¥{(i.line_total_cents / 100).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="print-footer">
              <span>合计：¥{(totalCents / 100).toFixed(2)}</span>
              <span>已付：¥{(order.paid_amount_cents / 100).toFixed(2)}</span>
              <span>欠款：¥{((totalCents - order.paid_amount_cents) / 100).toFixed(2)}</span>
            </div>
            {order.note && <div className="print-note">备注：{order.note}</div>}
            {copy < 3 && <div className="print-divider" />}
          </div>
        ))}
      </div>
    </>
  );
}
