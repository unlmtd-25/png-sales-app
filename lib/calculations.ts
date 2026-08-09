import { Container, ContainerContent, Order, OrderItem, Product, Stocktake } from './db';

export function daysBetween(from: string, to: string = new Date().toISOString()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function isSlowMoving(container: Container, contents: ContainerContent[]): boolean {
  const days = daysBetween(container.arrival_date);
  const received = contents.reduce((s, c) => s + c.qty_received, 0);
  const sold = contents.reduce((s, c) => s + c.qty_sold, 0);
  const pctSold = received > 0 ? sold / received : 0;
  return days > 60 && pctSold < 0.5;
}

export function latestStockValue(product: Product, latest: Stocktake | undefined): number {
  if (!latest) return 0;
  return latest.good_qty * product.unit_cost;
}

// Reorder alert: current good stock < 30% of average monthly sales (last 3 months)
export function needsReorder(
  productId: string,
  latestGoodQty: number,
  orderItems: OrderItem[],
  orders: Order[]
): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const orderIdsInWindow = new Set(
    orders.filter((o) => new Date(o.date) >= threeMonthsAgo).map((o) => o.id)
  );
  const soldInWindow = orderItems
    .filter((oi) => oi.product_id === productId && orderIdsInWindow.has(oi.order_id))
    .reduce((s, oi) => s + oi.quantity, 0);
  const avgMonthly = soldInWindow / 3;
  if (avgMonthly === 0) return false;
  return latestGoodQty < avgMonthly * 0.3;
}

export function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Month-over-month growth % for a product's sales volume
export function monthOverMonthGrowth(
  productId: string,
  orderItems: OrderItem[],
  orders: Order[]
): number | null {
  const orderDateMap = new Map(orders.map((o) => [o.id, o.date]));
  const byMonth = new Map<string, number>();
  for (const oi of orderItems) {
    if (oi.product_id !== productId) continue;
    const date = orderDateMap.get(oi.order_id);
    if (!date) continue;
    const key = monthKey(date);
    byMonth.set(key, (byMonth.get(key) || 0) + oi.quantity);
  }
  const months = Array.from(byMonth.keys()).sort();
  if (months.length < 2) return null;
  const thisMonth = byMonth.get(months[months.length - 1]) || 0;
  const lastMonth = byMonth.get(months[months.length - 2]) || 0;
  if (lastMonth === 0) return null;
  return ((thisMonth - lastMonth) / lastMonth) * 100;
}

export function daysSinceLastOrder(lastOrderDate: string | null): number | null {
  if (!lastOrderDate) return null;
  return daysBetween(lastOrderDate);
}

export function reorderBucket(days: number | null): '30' | '60' | '90' | null {
  if (days === null) return null;
  if (days >= 90) return '90';
  if (days >= 60) return '60';
  if (days >= 30) return '30';
  return null;
}

export function formatKina(amount: number): string {
  return 'K' + amount.toLocaleString('en-PG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
