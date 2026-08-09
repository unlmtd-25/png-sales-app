import { db, getDeviceId, Product, Customer } from './db';

// Append-only tables merge by simple insert (IDs are device-scoped, so they
// can never collide). Master tables merge by version and can produce a
// conflict that needs a human decision.
const APPEND_ONLY_TABLES = [
  'orders',
  'order_items',
  'stocktake',
  'surveys',
  'containers',
  'container_contents',
  'promotions',
] as const;

const MASTER_TABLES = ['products', 'customers'] as const;

export interface ExportChange {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  row: Record<string, unknown>;
}

export interface ExportPayload {
  device_id: string;
  export_timestamp: string;
  changes: ExportChange[];
}

export interface ConflictEntry {
  id: string;
  table: string;
  row_id: string;
  local: Record<string, unknown>;
  incoming: Record<string, unknown>;
  detected_at: string;
}

const CONFLICTS_KEY = 'png_conflicts';

export function getStoredConflicts(): ConflictEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CONFLICTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveConflicts(list: ConflictEntry[]) {
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(list));
}

export function resolveConflict(conflictId: string, keep: 'local' | 'incoming') {
  const list = getStoredConflicts();
  const entry = list.find((c) => c.id === conflictId);
  if (!entry) return;
  if (keep === 'incoming') {
    applyRow(entry.table, entry.incoming, true);
  }
  saveConflicts(list.filter((c) => c.id !== conflictId));
}

async function applyRow(table: string, row: any, forceApply: boolean) {
  const t = (db as any)[table];
  if (forceApply) {
    await t.put(row);
  }
}

// Build an export of everything this device has recorded since it last
// exported. Every table is exported in full for simplicity (the app's data
// volume is small — a few thousand rows per province), rather than trying
// to diff a partial changeset.
export async function buildExportPayload(): Promise<ExportPayload> {
  const changes: ExportChange[] = [];

  for (const table of [...APPEND_ONLY_TABLES, ...MASTER_TABLES, 'users']) {
    const rows = await (db as any)[table].toArray();
    for (const row of rows) {
      changes.push({ table, operation: 'INSERT', row });
    }
  }

  return {
    device_id: getDeviceId(),
    export_timestamp: new Date().toISOString(),
    changes,
  };
}

export function downloadExport(payload: ExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = payload.export_timestamp.slice(0, 16).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `sales-export-${payload.device_id}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
}

export async function applyImportPayload(payload: ExportPayload): Promise<ImportSummary> {
  const summary: ImportSummary = { inserted: 0, updated: 0, skipped: 0, conflicts: 0 };
  const conflicts = getStoredConflicts();

  for (const change of payload.changes) {
    const { table, row } = change;
    const t = (db as any)[table];
    if (!t) continue;

    if ((APPEND_ONLY_TABLES as readonly string[]).includes(table) || table === 'users') {
      const existing = await t.get(row.id);
      if (existing) {
        summary.skipped++;
      } else {
        await t.put(row);
        summary.inserted++;
      }
      continue;
    }

    if ((MASTER_TABLES as readonly string[]).includes(table)) {
      const existing: (Product | Customer) | undefined = await t.get(row.id);
      if (!existing) {
        await t.put(row);
        summary.inserted++;
        continue;
      }
      if (existing.version === row.version) {
        summary.skipped++; // identical, already have it
        continue;
      }
      if (row.version > existing.version && existing.updated_at <= row.updated_at) {
        // Incoming is strictly newer and nothing local changed since — safe to auto-apply.
        await t.put(row);
        summary.updated++;
        continue;
      }
      // Both sides diverged from a common ancestor: flag for manual review.
      conflicts.push({
        id: `${table}-${row.id}-${Date.now()}`,
        table,
        row_id: row.id,
        local: existing as unknown as Record<string, unknown>,
        incoming: row,
        detected_at: new Date().toISOString(),
      });
      summary.conflicts++;
    }
  }

  saveConflicts(conflicts);
  return summary;
    }
