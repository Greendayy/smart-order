import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home
});

const cards = [
  { title: "开单", desc: "快速创建新订单", to: "/orders/new", icon: "📝" },
  { title: "订单列表", desc: "查看和管理所有订单", to: "/orders", icon: "📋" },
  { title: "商品管理", desc: "管理商品信息和库存", to: "/products", icon: "📦" },
  { title: "客户管理", desc: "管理客户信息", to: "/customers", icon: "👥" },
  { title: "对账", desc: "按客户和日期对账", to: "/reconcile", icon: "💰" },
  { title: "微信防漏单", desc: "录入和处理微信消息", to: "/wechat-messages", icon: "💬" }
];

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("smart_order_logged_in");
    localStorage.removeItem("smart_order_user");
    navigate({ to: "/login" });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Smart Order</h1>
          <p className="text-gray-500 text-sm">智能订单管理系统</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          退出登录
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <a
            key={card.to}
            href={card.to}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all"
          >
            <div className="text-3xl mb-3">{card.icon}</div>
            <h2 className="font-semibold text-lg">{card.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{card.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
