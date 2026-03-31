import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

type PrintConfig = {
  shopName: string; shopPhone: string; shopAddress: string;
  offsetX: number; offsetY: number;
  showBorder: boolean; showDivider: boolean;
};

const DEFAULT_CONFIG: PrintConfig = {
  shopName: "Smart Order", shopPhone: "", shopAddress: "",
  offsetX: 0, offsetY: 0, showBorder: true, showDivider: true
};

function loadConfig(): PrintConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem("print_config") ?? "{}") }; }
  catch { return DEFAULT_CONFIG; }
}

function saveConfig(cfg: PrintConfig) {
  localStorage.setItem("print_config", JSON.stringify(cfg));
}

export const Route = createFileRoute("/print-settings")({ component: PrintSettingsPage });

function PrintSettingsPage() {
  const [config, setConfig] = useState<PrintConfig>(loadConfig);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<PrintConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
  };

  const handleTestPrint = () => {
    saveConfig(config);
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-xl font-bold">打印模板设置</h1>
      </div>

      {/* Shop info */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-4">店铺信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">店铺名称</label>
            <input value={config.shopName} onChange={(e) => update({ shopName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">电话</label>
            <input value={config.shopPhone} onChange={(e) => update({ shopPhone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">地址</label>
            <input value={config.shopAddress} onChange={(e) => update({ shopAddress: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Offset calibration */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-4">偏移量校准</h2>
        <p className="text-xs text-gray-500 mb-4">用于解决针式打印机走纸偏移问题（单位：毫米）</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">X 轴偏移（左右）</label>
            <input type="number" step="0.5" value={config.offsetX} onChange={(e) => update({ offsetX: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y 轴偏移（上下）</label>
            <input type="number" step="0.5" value={config.offsetY} onChange={(e) => update({ offsetY: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Display options */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold mb-4">显示选项</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={config.showBorder} onChange={(e) => update({ showBorder: e.target.checked })} className="rounded" />
            打印表格边框
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={config.showDivider} onChange={(e) => update({ showDivider: e.target.checked })} className="rounded" />
            打印联间分割线
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          {saved ? "已保存 ✓" : "保存设置"}
        </button>
        <button onClick={handleTestPrint} className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
          测试打印
        </button>
      </div>
    </div>
  );
}
