'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatKina } from '@/lib/calculations';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function OrdersPage() {
  const orders = useLiveQuery(() => db.orders.orderBy('date').reverse().toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  return (
    <>
      <TopBar title="Orders" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link href="/orders/new" className="btn-primary text-center">+ New Order</Link>
          <Link href="/customers" className="btn-secondary text-center">Customers</Link>
        </div>
        <Link href="/products" className="block text-center text-sm text-wharf-600 font-semibold underline underline-offset-2 mb-5">
          Manage product list
        </Link>

        {orders.length === 0 && (
          <div className="docket text-center text-ink/40 text-sm py-8">
            No orders recorded yet. Tap "New Order" to start.
          </div>
        )}

        <div className="space-y-2">
          {orders.map((o) => {
            const customer = customers.find((c) => c.id === o.customer_id);
            return (
              <div key={o.id} className="docket flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{customer?.name || 'Unknown customer'}</div>
                  <div className="text-xs text-ink/40">{new Date(o.date).toLocaleDateString()}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-display font-bold text-wharf-600">{formatKina(o.total_revenue)}</div>
                  <div className="text-xs text-ink/40">profit {formatKina(o.total_profit)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </>
  );
          }
