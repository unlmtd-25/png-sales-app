'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCurrentUser, getDeviceId, logSyncEntry } from '@/lib/db';
import { formatKina } from '@/lib/calculations';
import { newDeviceScopedId } from '@/lib/id';
import TopBar from '@/components/TopBar';

const WEIGHTS = ['500g', '1kg', '2kg', '5kg', '10kg'];
const SIZES = ['Small', 'Medium', 'Large'];

export default function SurveyPage() {
  const user = getCurrentUser();
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []) || [];
  const surveys = useLiveQuery(() => db.surveys.orderBy('date').reverse().toArray(), []) || [];

  const [productId, setProductId] = useState('');
  const [productFreeText, setProductFreeText] = useState('');
  const [weight, setWeight] = useState(WEIGHTS[1]);
  const [size, setSize] = useState(SIZES[1]);
  const [marketPrice, setMarketPrice] = useState('');
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [storeName, setStoreName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTrendProduct, setSelectedTrendProduct] = useState('');

  async function handleSave() {
    if (!marketPrice || !storeName.trim() || (!productId && !productFreeText.trim())) return;
    setSaving(true);
    const id = newDeviceScopedId('SUR');
    await db.surveys.put({
      id,
      product_id: productId,
      product_name_freetext: productFreeText.trim(),
      weight,
      size,
      market_price: Number(marketPrice),
      competitor_price: competitorPrice ? Number(competitorPrice) : null,
      store_name: storeName.trim(),
      date: new Date().toISOString(),
      surveyed_by: user?.name || 'unknown',
      device_origin: getDeviceId(),
    });
    logSyncEntry('surveys', id, 'INSERT');
    setProductFreeText(''); setMarketPrice(''); setCompetitorPrice(''); setStoreName('');
    setSaving(false);
  }

  const trendSurveys = selectedTrendProduct
    ? surveys.filter((s) => s.product_id === selectedTrendProduct).slice().reverse()
    : [];

  return (
    <>
      <TopBar title="Market Survey" back="/dashboard" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        <div className="docket mb-4 space-y-2">
          <label className="field-label">New survey</label>
          <select
            className="field-input"
            value={productId}
            onChange={(e) => { setProductId(e.target.value); if (e.target.value) setProductFreeText(''); }}
          >
            <option value="">Select from our products, or type below...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!productId && (
            <input className="field-input" placeholder="Or type product name (e.g. competitor brand)" value={productFreeText} onChange={(e) => setProductFreeText(e.target.value)} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <select className="field-input" value={weight} onChange={(e) => setWeight(e.target.value)}>
              {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <select className="field-input" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="field-input" type="number" placeholder="Market price (K)" value={marketPrice} onChange={(e) => setMarketPrice(e.target.value)} />
            <input className="field-input" type="number" placeholder="Competitor price (opt.)" value={competitorPrice} onChange={(e) => setCompetitorPrice(e.target.value)} />
          </div>
          <input className="field-input" placeholder="Store / market name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Survey'}
          </button>
        </div>

        <div className="mb-2">
          <label className="field-label">Price trend</label>
          <select className="field-input" value={selectedTrendProduct} onChange={(e) => setSelectedTrendProduct(e.target.value)}>
            <option value="">Select a product to view trend...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {selectedTrendProduct && (
          <div className="docket mb-4 divide-y divide-wharf-50">
            {trendSurveys.length === 0 && <div className="text-sm text-ink/40 py-2">No survey history for this product yet.</div>}
            {trendSurveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">{s.store_name}</div>
                  <div className="text-xs text-ink/40">{new Date(s.date).toLocaleDateString()} · {s.weight} {s.size}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-wharf-600 text-sm">{formatKina(s.market_price)}</div>
                  {s.competitor_price !== null && <div className="text-xs text-ink/40">vs {formatKina(s.competitor_price)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="field-label">Recent surveys (all)</label>
        <div className="docket divide-y divide-wharf-50">
          {surveys.length === 0 && <div className="text-sm text-ink/40 py-2">No surveys recorded yet.</div>}
          {surveys.slice(0, 10).map((s) => {
            const product = products.find((p) => p.id === s.product_id);
            return (
              <div key={s.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{product?.name || s.product_name_freetext}</div>
                  <div className="text-xs text-ink/40 truncate">{s.store_name} · {new Date(s.date).toLocaleDateString()}</div>
                </div>
                <div className="font-display font-bold text-wharf-600 text-sm shrink-0 ml-2">{formatKina(s.market_price)}</div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
        }
