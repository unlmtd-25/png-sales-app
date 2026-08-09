'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, getDeviceId } from '@/lib/db';
import Link from 'next/link';

export default function TopBar({ title, back }: { title: string; back?: string }) {
  const unsyncedCount = useLiveQuery(async () => {
    const all = await db.sync_log.where('device_id').equals(getDeviceId()).toArray();
    const exported = Number(localStorage.getItem('png_last_export_count') || 0);
    return Math.max(all.length - exported, 0);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-wharf-600 text-white px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-2 min-w-0">
          {back && (
            <Link href={back} className="p-1 -ml-1 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          )}
          <h1 className="font-display font-extrabold text-lg tracking-tight truncate">{title}</h1>
        </div>
        {typeof unsyncedCount === 'number' && unsyncedCount > 0 && (
          <Link
            href="/sync"
            className="shrink-0 flex items-center gap-1 bg-cargo-400 text-wharf-900 rounded-full px-2.5 py-1 text-xs font-bold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-wharf-900" />
            {unsyncedCount} unsynced
          </Link>
        )}
      </div>
    </header>
  );
}
