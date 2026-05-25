interface CreateTabProps {
  prefillText: string;
  onPrefillConsumed: () => void;
}

export function CreateTab(_props: CreateTabProps) {
  return <div className="h-full flex items-center justify-center text-gray-400">Create coming soon</div>;
}
