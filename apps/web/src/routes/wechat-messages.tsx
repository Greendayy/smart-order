import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../lib/api";

type WechatMessage = {
  id: string;
  sender_name: string;
  content: string;
  source: string;
  status: string;
  sales_order_id: string | null;
  created_at: string;
};

export const Route = createFileRoute("/wechat-messages")({
  component: WechatMessagesPage
});

function WechatMessagesPage() {
  const [messages, setMessages] = useState<WechatMessage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sender_name: "", content: "" });
  const [converting, setConverting] = useState<string | null>(null);

  const reload = async () => {
    const res = await (api as Record<string, any>)["wechat-messages"].pending.get();
    setMessages((res.data ?? []) as WechatMessage[]);
  };

  useEffect(() => { reload(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await (api as Record<string, any>)["wechat-messages"].post({
      sender_name: form.sender_name,
      content: form.content
    });
    setForm({ sender_name: "", content: "" });
    setShowForm(false);
    await reload();
  };

  const handleConvert = async (id: string) => {
    setConverting(id);
    try {
      const res = await (api as Record<string, any>)["wechat-messages"]({ id }).convert.post({});
      const data = res.data as Record<string, unknown> | null;
      if (data?.id) {
        window.location.href = `/orders/${data.id as string}`;
      } else {
        await reload();
      }
    } finally {
      setConverting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-xl font-bold">微信防漏单</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          {showForm ? "取消" : "录入消息"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发送人 *</label>
            <input
              required
              value={form.sender_name}
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
              placeholder="微信昵称或客户名称"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">消息内容 *</label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={3}
              placeholder="粘贴微信消息内容..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            保存
          </button>
        </form>
      )}

      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{msg.sender_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleString("zh-CN")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
              </div>
              <button
                onClick={() => handleConvert(msg.id)}
                disabled={converting === msg.id}
                className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 shrink-0"
              >
                {converting === msg.id ? "转换中..." : "转为订单"}
              </button>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg mb-2">暂无待处理消息</p>
            <p className="text-sm">点击"录入消息"添加微信消息</p>
          </div>
        )}
      </div>
    </div>
  );
}
