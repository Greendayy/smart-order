/** Format integer cents to ¥X,XXX.XX */
export function formatYuan(cents: number): string {
  const yuan = Math.abs(cents) / 100;
  const formatted = yuan.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents < 0 ? `-¥${formatted}` : `¥${formatted}`;
}

/** Order status label */
export const ORDER_STATUS: Record<string, string> = {
  todo: "未发送",
  sent: "已发送",
  canceled: "已作废",
  settled: "已结算",
  unsettled: "未结算"
};
