import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatYuan } from "../lib/format";

export const Route = createFileRoute("/print-preview")({
  component: PrintPreviewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    id: search.id as string,
    ...(search.orderTitle ? { orderTitle: search.orderTitle as string } : {})
  })
});

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type Payment = {
  id: string;
  amount_cents: number;
  method: string | null;
  created_at: string;
};

type OrderDetail = {
  id: string;
  customer_name: string;
  customer_id: string;
  customer_phone: string | null;
  customer_address: string | null;
  status: string;
  note: string | null;
  created_at: string;
  total_cents: number;
  paid_cents: number;
  items: OrderItem[];
  payments: Payment[];
};

type PrintTemplate = {
  company_name: string;
  company_address: string;
  company_phone: string;
  title: string;
  header_note: string;
  footer_note: string;
  show_unit_price: boolean;
  show_total: boolean;
};

const PRINT_CSS = `
  @page { size: auto; margin: 6mm; }
  @media print {
    .no-print { display: none !important; }
    html, body { margin: 0; padding: 0; }
    .print-page { padding: 0 !important; }
  }
  @media screen {
    .print-page { background: #fff; max-width: 740px; margin: 0 auto; }
  }
`;

function PrintPreviewPage() {
  const { id, orderTitle } = Route.useSearch() as { id: string; orderTitle?: string };
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [tpl, setTpl] = useState<PrintTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [oRes, tRes] = await Promise.all([
        (api as any).orders[id].get(),
        (api as any).settings["print-template"].get()
      ]);
      setOrder(oRes.data as OrderDetail);
      setTpl(tRes.data as PrintTemplate);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}><p>加载中...</p></div>;
  if (!order || !tpl) return <div style={{ padding: 24 }}><p style={{ color: "#ff4d4f" }}>加载失败</p></div>;

  const colSpan = tpl.show_unit_price ? 4 : 3;

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Toolbar — hidden when printing */}
      <div className="no-print" style={{ background: "#1677ff", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/order-detail" search={{ id }} style={{ color: "#fff", textDecoration: "none", fontSize: 14 }}>← 返回订单</Link>
        <span style={{ color: "#fff", fontSize: 14, flex: 1 }}>打印预览</span>
        <button
          onClick={() => window.print()}
          style={{ padding: "6px 20px", background: "#fff", color: "#1677ff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer", fontWeight: 600 }}
        >
          🖨 打印
        </button>
      </div>

      {/* Print content */}
      <div className="print-page" style={{ fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif", padding: 32, fontSize: 13, color: "#111" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 12, borderBottom: "2px solid #111", paddingBottom: 10 }}>
          {tpl.company_name && (
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{tpl.company_name}</div>
          )}
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>{orderTitle ?? tpl.title}</div>
          {tpl.header_note && <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{tpl.header_note}</div>}
        </div>

        {/* Order meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span><b>客户：</b>{order.customer_name}</span>
            {order.customer_phone && <span><b>电话：</b>{order.customer_phone}</span>}
            {order.customer_address && <span><b>地址：</b>{order.customer_address}</span>}
            {order.note && <span><b>备注：</b>{order.note}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
            <span><b>单号：</b>{order.id.slice(0, 8).toUpperCase()}</span>
            <span><b>日期：</b>{new Date(order.created_at).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={th}>商品名称</th>
              <th style={{ ...th, width: 60, textAlign: "center" }}>数量</th>
              {tpl.show_unit_price && <th style={{ ...th, width: 100, textAlign: "right" }}>单价</th>}
              <th style={{ ...th, width: 110, textAlign: "right" }}>小计</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                <td style={td}>{item.product_name}</td>
                <td style={{ ...td, textAlign: "center" }}>{item.quantity}</td>
                {tpl.show_unit_price && <td style={{ ...td, textAlign: "right" }}>{formatYuan(item.unit_price_cents)}</td>}
                <td style={{ ...td, textAlign: "right" }}>{formatYuan(item.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
          {tpl.show_total && (
            <tfoot>
              <tr style={{ borderTop: "2px solid #111" }}>
                <td colSpan={colSpan - 1} style={{ ...td, textAlign: "right", fontWeight: 700 }}>合计</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, fontSize: 15 }}>{formatYuan(order.total_cents)}</td>
              </tr>
            </tfoot>
          )}
        </table>


        {/* Signature area */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, marginBottom: 12, fontSize: 13 }}>
          <span>经手人签字：________________</span>
          <span>客户确认签字：________________</span>
          <span>日期：________________</span>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px dashed #ccc", paddingTop: 8, marginTop: 8, fontSize: 12, color: "#555" }}>
          {(tpl.company_address || tpl.company_phone) && (
            <div style={{ marginBottom: tpl.footer_note ? 4 : 0 }}>
              {tpl.company_address && <span>{tpl.company_address}</span>}
              {tpl.company_address && tpl.company_phone && <span style={{ margin: "0 6px" }}>│</span>}
              {tpl.company_phone && <span>Tel: {tpl.company_phone}</span>}
            </div>
          )}
          {tpl.footer_note && (
            <div style={{ textAlign: "center", color: "#888" }}>{tpl.footer_note}</div>
          )}
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = { padding: "7px 10px", textAlign: "left", fontWeight: 600, border: "1px solid #e0e0e0" };
const td: React.CSSProperties = { padding: "6px 10px", border: "1px solid #e0e0e0" };
