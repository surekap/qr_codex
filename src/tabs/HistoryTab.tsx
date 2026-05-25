import type { ScanEntry } from '../types';

interface HistoryTabProps {
  history: ScanEntry[];
  deleteEntry: (id: string) => void;
  onCreateFromEntry: (text: string) => void;
  onSwitchToScan: () => void;
}

export function HistoryTab(_props: HistoryTabProps) {
  return <div className="h-full flex items-center justify-center text-gray-400">History coming soon</div>;
}
