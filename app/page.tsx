'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Role, getCurrentUser, setCurrentUser, db, getDeviceId } from '@/lib/db';
import { newId } from '@/lib/id';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('OFFICER');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      router.replace('/dashboard');
    } else {
      setChecked(true);
    }
  }, [router]);

  async function handleStart() {
    if (!name.trim()) return;
    setCurrentUser(name.trim(), role);
    await db.users.put({
      id: newId(),
      name: name.trim(),
      role,
      device_id: getDeviceId(),
      created_at: new Date().toISOString(),
    });
    router.replace('/dashboard');
  }

  if (!checked) return null;

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-card bg-wharf-600 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l9-4 9 4-9 4-9-4z" />
            <path d="M3 7v10l9 4 9-4V7" />
            <path d="M12 11v10" />
          </svg>
        </div>
        <h1 className="font-display font-extrabold text-2xl text-wharf-700">Sales Tracker</h1>
        <p className="text-ink/50 text-sm mt-1">Offline field app — no signal needed</p>
      </div>

      <div className="docket mb-4">
        <label className="field-label">Your name</label>
        <input
          className="field-input"
          placeholder="e.g. Peter Kaupa"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="docket mb-8">
        <label className="field-label">Your role</label>
        <div className="grid grid-cols-1 gap-2 mt-1">
          {(['OFFICER', 'WAREHOUSE', 'MANAGER'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`text-left px-4 py-3 rounded-card border-2 font-semibold ${
                role === r ? 'border-wharf-500 bg-wharf-50 text-wharf-700' : 'border-wharf-100 text-ink/60'
              }`}
            >
              {r === 'OFFICER' && 'Sales Officer — orders, stocktake, surveys'}
              {r === 'WAREHOUSE' && 'Warehouse Admin — containers, damaged stock'}
              {r === 'MANAGER' && 'Sales Manager — reports, approvals, backups'}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={handleStart} disabled={!name.trim()}>
        Start
      </button>
    </main>
  );
              }
