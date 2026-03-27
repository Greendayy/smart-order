import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export const Route = createFileRoute("/print-template")({
  component: PrintTemplatePage
});

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

const DEFAULT: PrintTemplate = {
  company_name: "",
  company_address: "",
  company_phone: "",
  title: "销售单",
  header_note: "",
  footer_note: "感谢惠顾！",
  show_unit_price: true,
  show_total: true
};

function PrintTemplatePage() {
  const [form, setForm] = useState<PrintTemplate>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await (api as any).settings["print-template"].get();
      setLoading(false);
      if (res.data) setForm(res.data as PrintTemplate);
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await (api as any).settings["print-template"].put(form);
    setSaving(false);
    if (res.error || res.data?.error) {
      setError("保存失败，请确认管理员权限");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const set = (patch: Partial<PrintTemplate>) => setForm((f) => ({ ...f, ...patch }));

  if (loading) return <main style={pageStyle}><p style={{ color: "#999" }}>加载中...</p></main>;

  return (
    <main style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Link to="/" style={{ color: "#1677ff", textDecoration: "none", fontSize: 14 }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 20 }}>打印模板设置</h1>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 640 }}>
        {/* Company info */}
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>公司信息</h2>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>公司名称</label>
              <input value={form.company_name} onChange={(e) => set({ company_name: e.target.value })} style={inputStyle} placeholder="显示在单据顶部" />
            </div>
            <div>
              <label style={labelStyle}>电话</label>
              <input value={form.company_phone} onChange={(e) => set({ company_phone: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>地址</label>
              <input value={form.company_address} onChange={(e) => set({ company_address: e.target.value })} style={inputStyle} />
            </div>
          </div>
        </section>

        {/* Document settings */}
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>单据设置</h2>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>单据标题</label>
              <input value={form.title} onChange={(e) => set({ title: e.target.value })} style={inputStyle} placeholder="如：销售单、送货单" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>页眉备注</label>
            <input value={form.header_note} onChange={(e) => set({ header_note: e.target.value })} style={inputStyle} placeholder="显示在标题下方（选填）" />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>页脚备注</label>
            <input value={form.footer_note} onChange={(e) => set({ footer_note: e.target.value })} style={inputStyle} placeholder="显示在单据底部" />
          </div>
        </section>

        {/* Display options */}
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>显示项目</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([
              ["show_unit_price", "显示单价"],
              ["show_total", "显示合计金额"]
            ] as const).map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set({ [key]: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {error && <p style={{ color: "#ff4d4f", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "保存中..." : "保存设置"}
          </button>
          {saved && <span style={{ color: "#52c41a", fontSize: 13 }}>✓ 已保存</span>}
        </div>
      </form>
    </main>
  );
}

const pageStyle: React.CSSProperties = { fontFamily: "ui-sans-serif, system-ui", padding: 24 };
const sectionStyle: React.CSSProperties = { background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "#333" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 4, color: "#555" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, boxSizing: "border-box" };
const btnPrimary: React.CSSProperties = { padding: "7px 20px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, cursor: "pointer" };
