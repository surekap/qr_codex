import type { AppSettings, ScanEntry } from '../types';
import type { ToastData } from '../components/Toast';

interface ScanTabProps {
  settings: AppSettings;
  history: ScanEntry[];
  hasText: (text: string) => boolean;
  addEntry: (entry: ScanEntry) => void;
  showToast: (data: ToastData) => void;
}

export function ScanTab(_props: ScanTabProps) {
  return <div className="h-full flex items-center justify-center text-gray-400">Scanner coming soon</div>;
}
