'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCurrentUser, logSyncEntry, ContainerStatus } from '@/lib/db';
import { daysBetween, formatKina, isSlowMoving } from '@/lib/calculations';
import { newId } from '@/lib/id';
import TopBar from '@/components/TopBar';
import Link from 'next/link';

const STATUSES: ContainerStatus[] = ['ACTIVE', 'PARTIAL', 'HELD', 'SOLD_OUT'];
const STAMP_CLASS: Record<ContainerStatus, string> = {
  ACTIVE: 'stamp-active',
  PARTIAL: 'stamp-partial',
  HELD: 'stamp-held',
  SOLD_OUT: 'stamp-soldout',
};

export default function ContainersPage() {
  const user = getCurrentUser();
  const containers = useLiveQuery(() => db.containers.orderBy('arrival_date').reverse().toArray(), []) || [];
  const contents = useLiveQuery(() => db.container_contents.toArray(), []) || [];

  const [filter, setFilter] = useState<ContainerStatus | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [number, setNumber] = useState('');
  const [arrival, setArrival] = useState(new Date().toISOString().slice(0, 10));
  const [freight, setFreight] = useState('');
  const [status, setStatus] = useState<ContainerStatus>('ACTIVE');

  const visible = containers.filter((c) => filter === 'ALL' || c.status === filter);

  async function handleSave() {
    if (!number.trim()) return;
    const id = newId();
    await db.containers.put({
      id,
      number: number.trim(),
      arrival_date: new Date(arrival).toISOString(),
      status,
      freight_fee: Number(freight) || 0,
      recorded_by: user?.name || 'unknown',
    });
    logSyncEntry('containers', id, 'INSERT');
    setNumber(''); setFreight(''); setStatus('ACTIVE');
    setShowForm(false);
  }

  return (
    <>
      <TopBar title="Containers" back="/dashboard" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        {!showForm && (
          <button className="btn-primary mb-4" onClick={() => setShowForm(true)}>+ Log Container Arrival</button>
        )}
        {showForm && (
          <div className="docket mb-4 space-y-2">
            <label className="field-label">New container</label>
            <input className="field-input" placeholder="Container number" value={number} onChange={(e) => setNumber(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field-input" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
              <input className="field-input" type="number" placeholder="Freight fee (K)" value={freight} onChange={(e) => setFreight(e.target.value)} />
            </div>
            <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as ContainerStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!number.trim()}>Save</button>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {(['ALL', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-display font-bold uppercase ${
                filter === s ? 'bg-wharf-600 text-white' : 'bg-white text-ink/50 border border-wharf-100'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {visible.length === 0 && <div className="docket text-center text-ink/40 text-sm py-8">No containers here.</div>}
          {visible.map((c) => {
            const myContents = contents.filter((cc) => cc.container_id === c.id);
            const received = myContents.reduce((s, cc) => s + cc.qty_received, 0);
            const sold = myContents.reduce((s, cc) => s + cc.qty_sold, 0);
            const pct = received > 0 ? Math.round((sold / received) * 100) : 0;
            const slow = isSlowMoving(c, myContents);
            const days = daysBetween(c.arrival_date);
            return (
              <Link key={c.id} href={`/containers/${c.id}`} className="docket block">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm">{c.number}</span>
                  <span className={`stamp ${STAMP_CLASS[c.status]}`}>{c.status.replace('_', ' ')}</span>
                </div>
                <div className="w-full h-1.5 bg-wharf-50 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-wharf-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-ink/40">
                  <span>{sold}/{received} sold · {days}d in inventory</span>
                  {slow && <span className="text-alert-500 font-bold">SLOW MOVING</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
              }
