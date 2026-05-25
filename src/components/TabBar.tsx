export type TabId = 'scan' | 'history' | 'create' | 'settings';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'scan',     label: 'Scan',     icon: '⬛' },
  { id: 'history',  label: 'History',  icon: '🕐' },
  { id: 'create',   label: 'Create',   icon: '➕' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            active === t.id ? 'text-accent' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
