'use client';

import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getDeviceId, getCurrentUser } from '@/lib/db';
import {
  buildExportPayload,
  downloadExport,
  applyImportPayload,
  getStoredConflicts,
  resolveConflict,
  ImportSummary,
} from '@/lib/sync';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

export default function SyncPage() {
  const user = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState('');
  const [conflictTick, setConflictTick] = useState(0);

  const syncLogCount = useLiveQuery(() => db.sync_log.where('device_id').equals(getDeviceId()).count(), []) || 0;
  const conflicts = getStoredConflicts();

  async function handleExport() {
    setBusy(true);
    const payload = await buildExportPayload();
    downloadExport(payload);
    localStorage.setItem('png_last_export_count', String(syncLogCount));
    setBusy(false);
  }

  async function handleImportFile(file: File) {
    setBusy(true);
    setError('');
    setLastResult(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const summary = await applyImportPayload(payload);
      setLastResult(summary);
      setConflictTick((t) => t + 1);
    } catch (e) {
      setError('Could not read that file. Make sure it is a Sales Tracker export.');
    }
    setBusy(false);
  }

  function handleResolve(id: string, keep: 'local' | 'incoming') {
    resolveConflict(id, keep);
    setConflictTick((t) => t + 1);
  }

  return (
    <>
      <TopBar title="Sync Data" />
      <main className="px-4 pt-4 pb-28 max-w-md mx-auto">
        <div className="docket mb-4">
          <div className="text-xs text-ink/40 mb-1">This device</div>
          <div className="font-display font-bold text-wharf-700">{getDeviceId()}</div>
          <div className="text-sm text-ink/50">{user?.name} · {user?.role}</div>
        </div>

        <Section title="1. Export this device's data">
          <p className="text-sm text-ink/50 mb-3">
            Creates a JSON file with every order, stocktake, container update, and survey
            recorded here. Share it via Bluetooth, USB, or a messaging app to another device.
          </p>
          <button className="btn-primary" onClick={handleExport} disabled={busy}>
            {busy ? 'Preparing...' : 'Export & Download JSON'}
          </button>
        </Section>

        <Section title="2. Import from another device">
          <p className="text-sm text-ink/50 mb-3">
            Load a JSON file exported from a teammate's device. New records are added;
            matching records are merged automatically where safe.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
          />
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            Choose File to Import
          </button>

          {error && <div className="alert-strip mt-3">{error}</div>}

          {lastResult && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <ResultStat label="Added" value={lastResult.inserted} />
              <ResultStat label="Updated" value={lastResult.updated} />
              <ResultStat label="Already had" value={lastResult.skipped} />
              <ResultStat label="Conflicts" value={lastResult.conflicts} warn={lastResult.conflicts > 0} />
            </div>
          )}
        </Section>

        {conflicts.length > 0 && (
          <Section title="Conflicts needing review">
            <p className="text-sm text-ink/50 mb-3">
              These records were changed differently on two devices. Pick which version to keep
              — this should normally be done by the Sales Manager.
            </p>
            <div className="space-y-3">
              {conflicts.map((c) => (
                <div key={c.id} className="rounded-card border-2 border-alert-500/30 p-3">
                  <div className="text-xs font-bold uppercase text-alert-500 mb-2">{c.table} · conflict</div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-wharf-50 rounded-card p-2">
                      <div className="font-bold mb-1">Kept on this device</div>
                      <pre className="whitespace-pre-wrap break-words">{summarizeRow(c.local)}</pre>
                    </div>
                    <div className="bg-cargo-50 rounded-card p-2">
                      <div className="font-bold mb-1">From import</div>
                      <pre className="whitespace-pre-wrap break-words">{summarizeRow(c.incoming)}</pre>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost flex-1 border-2 border-wharf-200 text-sm" onClick={() => handleResolve(c.id, 'local')}>
                      Keep this device's
                    </button>
                    <button className="btn-ghost flex-1 border-2 border-wharf-200 text-sm" onClick={() => handleResolve(c.id, 'incoming')}>
                      Use imported
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="font-display font-bold text-sm uppercase tracking-wide text-wharf-600/70 mb-2">{title}</h2>
      <div className="docket">{children}</div>
    </div>
  );
}

function ResultStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-card px-3 py-2 ${warn ? 'bg-alert-500/10' : 'bg-wharf-50'}`}>
      <div className={`font-display font-extrabold text-lg ${warn ? 'text-alert-500' : 'text-wharf-700'}`}>{value}</div>
      <div className="text-[11px] uppercase text-ink/40 font-semibold">{label}</div>
    </div>
  );
}

function summarizeRow(row: Record<string, unknown>): string {
  const keys = ['name', 'unit_price', 'unit_cost', 'location', 'phone', 'updated_at', 'version'];
  return keys
    .filter((k) => k in row)
    .map((k) => `${k}: ${row[k]}`)
    .join('\n');
          }
