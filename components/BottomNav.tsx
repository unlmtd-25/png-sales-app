'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/orders', label: 'Orders', icon: OrdersIcon },
  { href: '/stocktake', label: 'Inventory', icon: InventoryIcon },
  { href: '/sync', label: 'Sync', icon: SyncIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-wharf-100 flex z-40 pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 ${
              active ? 'text-wharf-600' : 'text-ink/40'
            }`}
          >
            <Icon active={!!active} />
            <span className="text-[11px] font-display font-bold uppercase tracking-wide">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function iconProps(active: boolean) {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2.5 : 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M6 2h9l3 3v17H6z" />
      <path d="M15 2v3h3" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function InventoryIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}
function SyncIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 12a8 8 0 0114-5.3L21 9" />
      <path d="M21 5v4h-4" />
      <path d="M20 12a8 8 0 01-14 5.3L3 15" />
      <path d="M3 19v-4h4" />
    </svg>
  );
    }
