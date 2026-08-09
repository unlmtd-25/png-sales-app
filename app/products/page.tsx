'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCurrentUser, logSyncEntry } from '@/lib/db';
import { formatKina } from '@/lib/calculations';
import { newId } from '@/lib/id';
import TopBar from '@/components/TopBar';

export default function ProductsPage() {
  const user = getCurrentUser();
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []) || [];

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [weight, setWeight] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isNew, setIsNew] = useState(true);

  async function handleSave() {
    if (!name.trim() || !price) return;
    const id = newId();
    const now = new Date().toISOString();
    await db.products.put({
      id,
      code: code.trim() || 'P' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      name: name.trim(),
      weight_grams: Number(weight) || 0,
      unit_cost: Number(cost) || 0,
      unit_price: Number(price) || 0,
      is_new: isNew,
      category: category.trim() || 'General',
      created_by: user?.name || 'unknown',
      updated_at: now,
      version: 1,
    });
    logSyncEntry('products', id, 'INSERT');
    setName(''); setCode(''); setWeight(''); setCost(''); setPrice(''); setCategory('');
    setShowForm(false);
  }

  return (
    <>
      <TopBar title="Products" back="/orders" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        {!showForm && (
          <button className="btn-primary mb-4" onClick={() => setShowForm(true)}>+ Add Product</button>
        )}

        {showForm && (
          <div className="docket mb-4 space-y-2">
            <label className="field-label">New product</label>
            <input className="field-input" placeholder="Product name (e.g. Trukai Rice)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field-input" placeholder="Code (auto if blank)" value={code} onChange={(e) => setCode(e.target.value)} />
              <input className="field-input" type="number" placeholder="Weight (g)" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="field-input" type="number" placeholder="Unit cost (K)" value={cost} onChange={(e) => setCost(e.target.value)} />
              <input className="field-input" type="number" placeholder="Sell price (K)" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <input className="field-input" placeholder="Category (e.g. Rice, Noodles)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <label className="flex items-center gap-2 text-sm font-medium py-1">
              <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="w-4 h-4" />
              Tag as "New Product Line"
            </label>
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={!name.trim() || !price}>Save</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {products.length === 0 && <div className="docket text-center text-ink/40 text-sm py-8">No products yet.</div>}
          {products.map((p) => (
            <div key={p.id} className="docket flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  {p.is_new && <span className="text-[10px] font-bold bg-cargo-400/20 text-cargo-500 px-1.5 py-0.5 rounded-sm shrink-0">NEW</span>}
                </div>
                <div className="text-xs text-ink/40">{p.code} · {p.weight_grams}g · {p.category}</div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="font-display font-bold text-wharf-600 text-sm">{formatKina(p.unit_price)}</div>
                <div className="text-xs text-ink/40">cost {formatKina(p.unit_cost)}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
      }
