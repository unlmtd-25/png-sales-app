'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, getCurrentUser, getDeviceId, logSyncEntry, Customer, Product } from '@/lib/db';
import { formatKina } from '@/lib/calculations';
import { newDeviceScopedId, newId } from '@/lib/id';
import TopBar from '@/components/TopBar';

interface CartLine {
  product: Product;
  quantity: number;
  discount: number; // flat Kina discount on the line
}

export default function NewOrderPage() {
  const router = useRouter();
  const user = getCurrentUser();

  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []) || [];

  const [customerId, setCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerLocation, setNewCustomerLocation] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const revenue = cart.reduce((s, l) => s + l.product.unit_price * l.quantity - l.discount, 0);
  const cogs = cart.reduce((s, l) => s + l.product.unit_cost * l.quantity, 0);
  const profit = revenue - cogs;

  async function handleCreateCustomer() {
    if (!newCustomerName.trim()) return;
    const id = newId();
    const customer: Customer = {
      id,
      name: newCustomerName.trim(),
      location: newCustomerLocation.trim(),
      phone: newCustomerPhone.trim(),
      last_order_date: null,
      created_by: user?.name || 'unknown',
      updated_at: new Date().toISOString(),
      version: 1,
    };
    await db.customers.put(customer);
    logSyncEntry('customers', id, 'INSERT');
    setCustomerId(id);
    setShowNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerLocation('');
    setNewCustomerPhone('');
  }

  async function handleConfirm() {
    if (!customerId || cart.length === 0) return;
    setSaving(true);
    const orderId = newDeviceScopedId('ORD');
    const now = new Date().toISOString();

    await db.orders.put({
      id: orderId,
      customer_id: customerId,
      officer_id: user?.name || 'unknown',
      date: now,
      total_revenue: revenue,
      total_profit: profit,
      device_origin: getDeviceId(),
    });
    logSyncEntry('orders', orderId, 'INSERT');

    for (const line of cart) {
      const itemId = newDeviceScopedId('ITEM');
      await db.order_items.put({
        id: itemId,
        order_id: orderId,
        product_id: line.product.id,
        quantity: line.quantity,
        price_at_sale: line.product.unit_price,
        discount: line.discount,
        cogs_at_sale: line.product.unit_cost,
      });
      logSyncEntry('order_items', itemId, 'INSERT');
    }

    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      await db.customers.put({ ...customer, last_order_date: now, updated_at: now, version: customer.version + 1 });
      logSyncEntry('customers', customer.id, 'UPDATE');
    }

    router.replace('/orders');
  }

  return (
    <>
      <TopBar title="New Order" back="/orders" />
      <main className="px-4 pt-4 pb-40 max-w-md mx-auto">
        {/* Customer selection */}
        <div className="docket mb-4">
          <label className="field-label">Customer</label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{selectedCustomer.name}</div>
                <div className="text-xs text-ink/40">{selectedCustomer.location}</div>
              </div>
              <button className="btn-ghost text-sm" onClick={() => setCustomerId('')}>Change</button>
            </div>
          ) : showNewCustomer ? (
            <div className="space-y-2">
              <input className="field-input" placeholder="Customer / shop name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
              <input className="field-input" placeholder="Location / town" value={newCustomerLocation} onChange={(e) => setNewCustomerLocation(e.target.value)} />
              <input className="field-input" placeholder="Phone (optional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setShowNewCustomer(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCreateCustomer} disabled={!newCustomerName.trim()}>Save</button>
              </div>
            </div>
          ) : (
            <>
              <input
                className="field-input mb-2"
                placeholder="Search customer..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto divide-y divide-wharf-50">
                {filteredCustomers.slice(0, 8).map((c) => (
                  <button key={c.id} className="w-full text-left py-2 flex items-center justify-between" onClick={() => setCustomerId(c.id)}>
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="text-xs text-ink/40">{c.location}</span>
                  </button>
                ))}
              </div>
              <button className="btn-ghost text-sm mt-1" onClick={() => setShowNewCustomer(true)}>+ Add new customer</button>
            </>
          )}
        </div>

        {/* Product picker */}
        <div className="docket mb-4">
          <label className="field-label">Add products</label>
          <input
            className="field-input mb-2"
            placeholder="Search product or code..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {filteredProducts.length === 0 && (
              <div className="col-span-2 text-sm text-ink/40 py-2">
                No products yet — <a href="/products" className="underline text-wharf-600">add products first</a>.
              </div>
            )}
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="rounded-card border-2 border-wharf-100 p-2.5 text-left active:border-wharf-400"
              >
                <div className="font-semibold text-sm leading-tight">{p.name}</div>
                <div className="text-xs text-ink/40">{p.weight_grams}g</div>
                <div className="font-display font-bold text-wharf-600 text-sm mt-1">{formatKina(p.unit_price)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="docket mb-4">
            <label className="field-label">Order lines</label>
            <div className="divide-y divide-wharf-50">
              {cart.map((line) => (
                <div key={line.product.id} className="py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm">{line.product.name}</span>
                    <button className="text-alert-500 text-xs font-semibold" onClick={() => removeLine(line.product.id)}>Remove</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="stepper-btn !w-9 !h-9" onClick={() => updateLine(line.product.id, { quantity: Math.max(1, line.quantity - 1) })}>−</button>
                    <span className="w-8 text-center font-display font-bold">{line.quantity}</span>
                    <button className="stepper-btn !w-9 !h-9" onClick={() => updateLine(line.product.id, { quantity: line.quantity + 1 })}>+</button>
                    <span className="ml-auto text-sm text-ink/40">discount</span>
                    <input
                      type="number"
                      className="w-16 field-input !py-1.5 !px-2 text-sm"
                      value={line.discount || ''}
                      placeholder="0"
                      onChange={(e) => updateLine(line.product.id, { discount: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <div className="docket">
            <Row label="Revenue" value={formatKina(revenue)} />
            <Row label="COGS" value={formatKina(cogs)} />
            <Row label="Profit" value={formatKina(profit)} bold />
          </div>
        )}
      </main>

      {cart.length > 0 && customerId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-wharf-100 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button className="btn-primary max-w-md mx-auto block" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving...' : `Confirm Order — ${formatKina(revenue)}`}
          </button>
        </div>
      )}
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-ink/50">{label}</span>
      <span className={`font-display ${bold ? 'font-extrabold text-wharf-700' : 'font-bold text-ink/70'} text-sm`}>{value}</span>
    </div>
  );
         }
