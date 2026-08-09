'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logSyncEntry, ContainerStatus } from '@/lib/db';
import { daysBetween, formatKina } from '@/lib/calculations';
import { newId } from '@/lib/id';
import TopBar from '@/components/TopBar';

const STATUSES: ContainerStatus[] = ['ACTIVE', 'PARTIAL', 'HELD', 'SOLD_OUT'];

export default function ContainerDetailPage({ params }: { params: { id: string } }) {
  const container = useLiveQuery(() => db.containers.get(params.id), [params.id]);
  const contents = useLiveQuery(() => db.container_contents.where('container_id').equals(params.id).toArray(), [params.id]) || [];
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []) || [];

  const [productId, setProductId] = useState('');
  const [qtyReceived, setQtyReceived] = useState('');

  async function addContent() {
    if (!productId || !qtyReceived) return;
    const id = newId();
    await db.container_contents.put({
      id,
      container_id: params.id,
      product_id: productId,
      qty_received: Number(qtyReceived) || 0,
      qty_sold: 0,
    });
    logSyncEntry('container_contents', id, 'INSERT');
    setProductId('');
    setQtyReceived('');
  }

  async function updateSold(contentId: string, qty_sold: number) {
    const row = contents.find((c) => c.id === contentId);
    if (!row) return;
    await db.container_contents.put({ ...row, qty_sold: Math.max(0, Math.min(row.qty_received, qty_sold)) });
    logSyncEntry('container_contents', contentId, 'UPDATE');
  }

  async function changeStatus(status: ContainerStatus) {
    if (!container) return;
    await db.containers.put({ ...container, status });
    logSyncEntry('containers', container.id, 'UPDATE');
  }

  if (!container) return null;
  const days = daysBetween(container.arrival_date);

  return (
    <>
      <TopBar title={container.number} back="/containers" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        <div className="docket mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink/50">Arrived</span>
            <span className="font-semibold">{new Date(container.arrival_date).toLocaleDateString()} ({days}d ago)</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink/50">Freight fee</span>
            <span className="font-semibold">{formatKina(container.freight_fee)}</span>
          </div>
          <div className="mt-2">
            <label className="field-label">Status</label>
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    container.status === s ? 'bg-wharf-600 text-white' : 'bg-wharf-50 text-ink/50'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="docket mb-4 space-y-2">
          <label className="field-label">Add product contents</label>
          <select className="field-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="field-input" type="number" placeholder="Qty received" value={qtyReceived} onChange={(e) => setQtyReceived(e.target.value)} />
            <button className="btn-secondary !w-auto px-4 shrink-0" onClick={addContent} disabled={!productId || !qtyReceived}>Add</button>
          </div>
        </div>

        <div className="space-y-2">
          {contents.map((c) => {
            const product = products.find((p) => p.id === c.product_id);
            return (
              <div key={c.id} className="docket">
                <div className="font-semibold text-sm mb-2">{product?.name || 'Unknown product'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/50">Received: <b className="text-ink">{c.qty_received}</b></span>
                  <div className="flex items-center gap-2">
                    <span className="text-ink/50">Sold</span>
                    <button className="stepper-btn !w-9 !h-9" onClick={() => updateSold(c.id, c.qty_sold - 1)}>−</button>
                    <span className="w-8 text-center font-display font-bold">{c.qty_sold}</span>
                    <button className="stepper-btn !w-9 !h-9" onClick={() => updateSold(c.id, c.qty_sold + 1)}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
