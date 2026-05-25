import type { AppSettings } from '../types';

interface SettingsTabProps {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearHistory: () => void;
  version: string;
}

export function SettingsTab(_props: SettingsTabProps) {
  return <div className="h-full flex items-center justify-center text-gray-400">Settings coming soon</div>;
}
