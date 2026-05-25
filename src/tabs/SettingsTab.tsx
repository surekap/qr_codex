import type { AppSettings } from '../types';
import { Toggle } from '../components/Toggle';

interface SettingsTabProps {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearHistory: () => void;
  version: string;
}

export function SettingsTab({ settings, updateSettings, clearHistory, version }: SettingsTabProps) {
  function handleClearHistory() {
    if (window.confirm('Clear all scan history? This cannot be undone.')) {
      clearHistory();
    }
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-4 pt-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scan Behaviour</h2>
        <div className="bg-white border border-gray-100 rounded-2xl px-4 divide-y divide-gray-100">
          {'vibrate' in navigator && (
            <Toggle
              label="Vibrate on scan"
              description="Haptic feedback when a code is detected"
              checked={settings.vibrate}
              onChange={v => updateSettings({ vibrate: v })}
            />
          )}
          <Toggle
            label="Beep on scan"
            description="Audio tone when a code is detected"
            checked={settings.beep}
            onChange={v => updateSettings({ beep: v })}
          />
          <Toggle
            label="Save to history"
            description="Store scanned codes in history"
            checked={settings.saveToHistory}
            onChange={v => updateSettings({ saveToHistory: v })}
          />
          <Toggle
            label="Save duplicates"
            description="Allow saving the same code more than once"
            checked={settings.saveDuplicates}
            onChange={v => updateSettings({ saveDuplicates: v })}
          />
        </div>

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-6 mb-2">History</h2>
        <div className="bg-white border border-gray-100 rounded-2xl px-4">
          <button
            onClick={handleClearHistory}
            className="w-full text-left py-3 text-sm text-red-500 font-medium"
          >
            Clear all history
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-gray-300">
          <p>QR Codex</p>
          <p>v{version}</p>
        </div>
      </div>
    </div>
  );
}
