import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  unit: string | null;
  oe_code: string | null;
};

type OrderDetail = {
  id: string;
  order_no: string | null;
  status: string;
  note: string | null;
  source: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  paid_amount_cents: number;
  items: OrderItem[];
};

const statusMap: Record<string, string> = {
  draft: "草稿",
  pending: "待处理",
  preparing: "备货中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消"
};

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

  const handlePrint = () => window.print();

  return (
    <>
      {/* Screen view */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
            <h1 className="text-xl font-bold">订单详情</h1>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            打印
          </button>
        </div>

        {/* Order info */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">订单号</span>
              <p className="font-medium mt-1">{order.order_no ?? "-"}</p>
            </div>
            <div>
              <span className="text-gray-500">状态</span>
              <p className="font-medium mt-1">{statusMap[order.status] ?? order.status}</p>
            </div>
            <div>
              <span className="text-gray-500">来源</span>
              <p className="font-medium mt-1">{order.source ?? "手工"}</p>
            </div>
            <div>
              <span className="text-gray-500">创建时间</span>
              <p className="font-medium mt-1">{new Date(order.created_at).toLocaleString("zh-CN")}</p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold mb-3">客户信息</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">客户名称</span>
              <p className="font-medium mt-1">{order.customer_name ?? "-"}</p>
            </div>
            <div>
              <span className="text-gray-500">电话</span>
              <p className="font-medium mt-1">{order.customer_phone ?? "-"}</p>
            </div>
            <div>
              <span className="text-gray-500">地址</span>
              <p className="font-medium mt-1">{order.customer_address ?? "-"}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">商品</th>
                <th className="text-left px-4 py-3 font-medium">OE编码</th>
                <th className="text-right px-4 py-3 font-medium">单价</th>
                <th className="text-right px-4 py-3 font-medium">数量</th>
                <th className="text-right px-4 py-3 font-medium">小计</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.oe_code ?? "-"}</td>
                  <td className="px-4 py-3 text-right">¥{(item.unit_price_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{item.quantity} {item.unit ?? "个"}</td>
                  <td className="px-4 py-3 text-right font-medium">¥{(item.line_total_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">商品合计</span>
            <span className="font-medium">¥{(totalCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">已付金额</span>
            <span className="font-medium">¥{(order.paid_amount_cents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2 mt-2">
            <span className="text-gray-500 font-semibold">欠款</span>
            <span className="font-bold text-red-600">¥{((totalCents - order.paid_amount_cents) / 100).toFixed(2)}</span>
          </div>
          {order.note && (
            <div className="mt-4 text-sm">
              <span className="text-gray-500">备注：</span>
              <span>{order.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Print view — triple-copy format (241mm wide, auto height) */}
      <div className="hidden print:block print-area">
        {[1, 2, 3].map((copy) => (
          <div key={copy} className="print-copy">
            <div className="print-header">
              <h1>Smart Order 销售单</h1>
              <p className="copy-label">
                {copy === 1 ? "客户联" : copy === 2 ? "存根联" : "财务联"}
              </p>
            </div>

            <div className="print-info">
              <span>单号：{order.order_no ?? "-"}</span>
              <span>日期：{new Date(order.created_at).toLocaleDateString("zh-CN")}</span>
            </div>
            <div className="print-info">
              <span>客户：{order.customer_name ?? "-"}</span>
              <span>电话：{order.customer_phone ?? "-"}</span>
            </div>
            {order.customer_address && (
              <div className="print-info">
                <span>地址：{order.customer_address}</span>
              </div>
            )}

            <table className="print-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>商品名称</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}{item.unit ?? "个"}</td>
                    <td>¥{(item.unit_price_cents / 100).toFixed(2)}</td>
                    <td>¥{(item.line_total_cents / 100).toFixed(2)}</td>
                  </tr>
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
