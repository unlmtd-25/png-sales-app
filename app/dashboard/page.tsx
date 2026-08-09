'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { daysSinceLastOrder, formatKina, isSlowMoving, monthKey, needsReorder } from '@/lib/calculations';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/db';

export default function DashboardPage() {
  const user = getCurrentUser();

  const orders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const orderItems = useLiveQuery(() => db.order_items.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const stocktake = useLiveQuery(() => db.stocktake.toArray(), []) || [];
  const containers = useLiveQuery(() => db.containers.toArray(), []) || [];
  const containerContents = useLiveQuery(() => db.container_contents.toArray(), []) || [];

  const todayKey = new Date().toISOString().slice(0, 10);
  const thisMonthKey = monthKey(new Date().toISOString());

  const todayOrders = orders.filter((o) => o.date.slice(0, 10) === todayKey);
  const monthOrders = orders.filter((o) => monthKey(o.date) === thisMonthKey);

  const todayRevenue = todayOrders.reduce((s, o) => s + o.total_revenue, 0);
  const todayProfit = todayOrders.reduce((s, o) => s + o.total_profit, 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.total_revenue, 0);
  const monthProfit = monthOrders.reduce((s, o) => s + o.total_profit, 0);

  // Top customers by revenue (all-time)
  const revenueByCustomer = new Map<string, number>();
  for (const o of orders) revenueByCustomer.set(o.customer_id, (revenueByCustomer.get(o.customer_id) || 0) + o.total_revenue);
  const topCustomers = Array.from(revenueByCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, rev]) => ({ customer: customers.find((c) => c.id === id), rev }))
    .filter((x) => x.customer);

  // Top products by quantity sold
  const qtyByProduct = new Map<string, number>();
  for (const oi of orderItems) qtyByProduct.set(oi.product_id, (qtyByProduct.get(oi.product_id) || 0) + oi.quantity);
  const topProducts = Array.from(qtyByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
    .filter((x) => x.product);

  // Reorder alerts
  const latestStocktakeByProduct = new Map<string, typeof stocktake[number]>();
  for (const s of stocktake) {
    const cur = latestStocktakeByProduct.get(s.product_id);
    if (!cur || new Date(s.date) > new Date(cur.date)) latestStocktakeByProduct.set(s.product_id, s);
  }
  const reorderAlerts = products.filter((p) => {
    const latest = latestStocktakeByProduct.get(p.id);
    if (!latest) return false;
    return needsReorder(p.id, latest.good_qty, orderItems, orders);
  });

  // Slow moving containers
  const slowContainers = containers.filter((c) => {
    const contents = containerContents.filter((cc) => cc.container_id === c.id);
    return isSlowMoving(c, contents);
  });

  // Re-order reminders: customers inactive 30/60/90 days
  const staleCustomers = customers
    .map((c) => ({ c, days: daysSinceLastOrder(c.last_order_date) }))
    .filter((x) => x.days !== null && x.days >= 30)
    .sort((a, b) => (b.days || 0) - (a.days || 0))
    .slice(0, 5);

  return (
    <>
      <TopBar title={`Kia ora, ${user?.name?.split(' ')[0] || ''}`} />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        {(reorderAlerts.length > 0 || slowContainers.length > 0) && (
          <div className="mb-4 space-y-2">
            {reorderAlerts.length > 0 && (
              <Link href="/stocktake" className="alert-strip">
                ⚠ {reorderAlerts.length} product{reorderAlerts.length > 1 ? 's' : ''} below reorder level
              </Link>
            )}
            {slowContainers.length > 0 && (
              <Link href="/containers" className="alert-strip">
                🐌 {slowContainers.length} container{slowContainers.length > 1 ? 's' : ''} slow moving
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="stat-card">
            <span className="stat-label">Today's Revenue</span>
            <span className="stat-value">{formatKina(todayRevenue)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Today's Profit</span>
            <span className="stat-value">{formatKina(todayProfit)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Month Revenue</span>
            <span className="stat-value">{formatKina(monthRevenue)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Month Profit</span>
            <span className="stat-value">{formatKina(monthProfit)}</span>
          </div>
        </div>

        <Link href="/orders/new" className="btn-primary mb-6 block text-center">
          + New Order
        </Link>

        <Section title="Top Customers">
          {topCustomers.length === 0 && <Empty text="No orders yet" />}
          {topCustomers.map(({ customer, rev }) => (
            <Row key={customer!.id} left={customer!.name} right={formatKina(rev)} sub={customer!.location} />
          ))}
        </Section>

        <Section title="Top Products">
          {topProducts.length === 0 && <Empty text="No sales yet" />}
          {topProducts.map(({ product, qty }) => (
            <Row key={product!.id} left={product!.name} right={`${qty} units`} sub={product!.code} />
          ))}
        </Section>

        <Section title="Re-order Reminders">
          {staleCustomers.length === 0 && <Empty text="All customers active" />}
          {staleCustomers.map(({ c, days }) => (
            <Row key={c.id} left={c.name} right={`${days}d ago`} sub={c.location} warn={(days || 0) >= 60} />
          ))}
        </Section>
      </main>
      <BottomNav />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="font-display font-bold text-sm uppercase tracking-wide text-wharf-600/70 mb-2">{title}</h2>
      <div className="docket divide-y divide-wharf-50">{children}</div>
    </div>
  );
}

function Row({ left, right, sub, warn }: { left: string; right: string; sub?: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{left}</div>
        {sub && <div className="text-xs text-ink/40 truncate">{sub}</div>}
      </div>
      <div className={`font-display font-bold text-sm shrink-0 ml-3 ${warn ? 'text-alert-500' : 'text-wharf-600'}`}>{right}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-ink/40 py-2">{text}</div>;
                                          }
