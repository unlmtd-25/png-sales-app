'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { daysSinceLastOrder } from '@/lib/calculations';
import TopBar from '@/components/TopBar';

export default function CustomersPage() {
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];

  return (
    <>
      <TopBar title="Customers" back="/orders" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        <p className="text-sm text-ink/50 mb-3">Add new customers from the "New Order" screen.</p>
        <div className="space-y-2">
          {customers.length === 0 && <div className="docket text-center text-ink/40 text-sm py-8">No customers yet.</div>}
          {customers.map((c) => {
            const days = daysSinceLastOrder(c.last_order_date);
            return (
              <div key={c.id} className="docket flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{c.name}</div>
                  <div className="text-xs text-ink/40">{c.location}{c.phone ? ` · ${c.phone}` : ''}</div>
                </div>
                <div className={`text-xs font-semibold shrink-0 ml-2 ${days && days >= 60 ? 'text-alert-500' : 'text-ink/40'}`}>
                  {days === null ? 'No orders' : `${days}d since order`}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
