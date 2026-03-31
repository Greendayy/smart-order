import { sqlFromEnv } from "./index";

const sql = sqlFromEnv();

async function seed() {
  console.log("Seeding data...");

  // 10 Customers
  const customers = await sql`
    insert into customers (name, phone, address, balance_cents) values
      ('张伟汽配', '13800001001', '广州市白云区机场路88号', 150000),
      ('李强汽车装饰', '13800001002', '广州市番禺区大石镇', -50000),
      ('王海轮胎店', '13800001003', '深圳市龙华区民治大道', 0),
      ('陈明汽车美容', '13800001004', '佛山市南海区桂城', 230000),
      ('赵刚汽修厂', '13800001005', '东莞市虎门镇', 80000),
      ('刘洋4S店', '13800001006', '广州市天河区黄埔大道', 0),
      ('孙涛配件行', '13800001007', '中山市小榄镇', -30000),
      ('周杰汽车城', '13800001008', '珠海市香洲区', 450000),
      ('吴敏轮毂店', '13800001009', '惠州市惠城区', 0),
      ('郑浩改装店', '13800001010', '汕头市龙湖区', 120000)
    returning id, name
  `;
  console.log(`  Created ${customers.length} customers`);

  // 10 Suppliers
  await sql`
    insert into suppliers (name, contact_name, phone, address, note) values
      ('广州宏达汽配', '李总', '13900001001', '广州市花都区汽配城A区', '老供应商'),
      ('深圳金牛配件', '王经理', '13900001002', '深圳市宝安区', '脚垫专供'),
      ('佛山顺德塑胶厂', '陈厂长', '13900001003', '佛山市顺德区', '挡泥板工厂'),
      ('东莞华盛汽饰', '赵总', '13900001004', '东莞市长安镇', '坐垫批发'),
      ('台州瑞安雨挡厂', '刘师傅', '13900001005', '浙江省台州市瑞安', '雨挡直供'),
      ('河北安平护板厂', '孙老板', '13900001006', '河北省衡水市安平县', '护板专供'),
      ('义乌小商品城', '周总', '13900001007', '浙江省义乌市', '杂件采购'),
      ('广州永福路汽配', '吴经理', '13900001008', '广州市越秀区永福路', '综合配件'),
      ('中山坦洲配件行', '郑老板', '13900001009', '中山市坦洲镇', '通用件'),
      ('汕头澄海玩具配件', '黄总', '13900001010', '汕头市澄海区', '小件配件')
  `;
  console.log("  Created 10 suppliers");

  // 10 Products (covering different categories)
  const products = await sql`
    insert into products (name, category, unit, supplier_name, purchase_price_cents, price_cents, stock, note) values
      ('丰田凯美瑞全包围脚垫', '脚垫', '套', '深圳金牛配件', 8000, 15000, 20, '2024款适用'),
      ('本田雅阁丝圈脚垫', '脚垫', '套', '深圳金牛配件', 6000, 12000, 15, '通用型号'),
      ('夏季冰丝坐垫', '坐垫', '套', '东莞华盛汽饰', 5000, 9800, 30, '透气款'),
      ('冬季毛绒坐垫', '坐垫', '套', '东莞华盛汽饰', 7000, 13500, 10, '加厚保暖'),
      ('本田CR-V雨挡', '雨挡', '副', '台州瑞安雨挡厂', 2000, 4500, 50, '注塑一体'),
      ('日产轩逸雨挡', '雨挡', '副', '台州瑞安雨挡厂', 1800, 4000, 40, '带亮条'),
      ('发动机下护板(铁质)', '护板', '个', '河北安平护板厂', 4500, 8000, 25, '3mm厚度'),
      ('油箱护板', '护板', '个', '河北安平护板厂', 3500, 6500, 20, '铝合金材质'),
      ('通用软胶挡泥板', '挡泥板', '副', '佛山顺德塑胶厂', 800, 2000, 100, '加宽型'),
      ('SUV专用挡泥板', '挡泥板', '副', '佛山顺德塑胶厂', 1200, 3000, 60, '带螺丝安装')
    returning id, name
  `;
  console.log(`  Created ${products.length} products`);

  // Helper to get random item
  const rand = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]!;
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Create orders covering last 7 days, different types and statuses
  const orderTypes = ["sale", "sale", "sale", "return", "purchase"];
  const statuses = ["draft", "pending_ship", "shipped", "settled"];
  const settlements = ["cash", "monthly", "collect"];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const numOrders = dayOffset === 0 ? 4 : 2; // More orders today

    for (let i = 0; i < numOrders; i++) {
      const customer = rand(customers);
      const orderType = rand(orderTypes);
      const status = rand(statuses);
      const settlement = rand(settlements);
      const orderNo = `DD${fmt(date).replace(/-/g, "")}${String(i + 1).padStart(3, "0")}`;

      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      for (let j = 0; j < numItems; j++) {
        selectedProducts.push(rand(products));
      }

      // Create order
      const cid = (customer as Record<string, unknown>).id as string;
      const orderRows = await sql.unsafe(
        `insert into sales_orders (customer_id, order_no, order_type, settlement_type, status, source, created_at)
         values ($1, $2, $3, $4, $5, 'manual', $6) returning id`,
        [cid, orderNo, orderType, settlement, status, date.toISOString()]
      );

      // Create items
      for (const prod of selectedProducts) {
        const qty = Math.floor(Math.random() * 5) + 1;
        const p = prod as Record<string, unknown>;
        const price = (p.price_cents as number) ?? 10000;
        await sql.unsafe(
          `insert into sales_order_items (sales_order_id, product_id, product_name, quantity, unit_price_cents, line_total_cents)
           values ($1, $2, $3, $4, $5, $6)`,
          [orderRows[0]!.id, p.id, p.name, qty, price, qty * price]
        );
      }
    }
  }

  console.log("  Created sample orders for last 7 days");
  console.log("Seeding complete!");
  await sql.end({ timeout: 5 });
}

await seed();
