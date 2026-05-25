import { useState, useEffect, useCallback } from 'react';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { Toast } from './components/Toast';
import type { ToastData } from './components/Toast';
import { ScanTab } from './tabs/ScanTab';
import { HistoryTab } from './tabs/HistoryTab';
import { CreateTab } from './tabs/CreateTab';
import { SettingsTab } from './tabs/SettingsTab';
import { useHistory } from './hooks/useHistory';
import { useSettings } from './hooks/useSettings';

declare const __APP_VERSION__: string;

export default function App() {
  const [tab, setTab] = useState<TabId>('scan');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [createText, setCreateText] = useState('');
  const [updateReady, setUpdateReady] = useState(false);
  const { history, addEntry, deleteEntry, clearHistory, hasText } = useHistory();
  const { settings, updateSettings } = useSettings();

  useEffect(() => {
    import('workbox-window').then(({ Workbox }) => {
      if ('serviceWorker' in navigator) {
        const wb = new Workbox('/sw.js');
        wb.addEventListener('waiting', () => setUpdateReady(true));
        wb.register();
      }
    });
  }, []);

  function handleReload() {
    window.location.reload();
  }

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
  }, []);

  function handleCreateFromHistory(text: string) {
    setCreateText(text);
    setTab('create');
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
      {updateReady && (
        <div className="bg-accent text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Update available</span>
          <button onClick={handleReload} className="underline font-semibold">Reload</button>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        <div className={tab === 'scan' ? 'block h-full' : 'hidden'}>
          <ScanTab
            settings={settings}
            history={history}
            hasText={hasText}
            addEntry={addEntry}
            showToast={showToast}
          />
        </div>
        <div className={tab === 'history' ? 'block h-full' : 'hidden'}>
          <HistoryTab
            history={history}
            deleteEntry={deleteEntry}
            onCreateFromEntry={handleCreateFromHistory}
            onSwitchToScan={() => setTab('scan')}
          />
        </div>
        <div className={tab === 'create' ? 'block h-full' : 'hidden'}>
          <CreateTab prefillText={createText} onPrefillConsumed={() => setCreateText('')} />
        </div>
        <div className={tab === 'settings' ? 'block h-full' : 'hidden'}>
          <SettingsTab
            settings={settings}
            updateSettings={updateSettings}
            clearHistory={clearHistory}
            version={typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
          />
        </div>
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
