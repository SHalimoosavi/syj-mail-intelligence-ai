interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-20 text-center">
      <div className="h-8 w-8 rounded-full border border-border" />
      <p className="font-display text-sm text-text">{title}</p>
      <p className="max-w-sm text-xs text-muted">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-wide text-danger">Connection lost</p>
      <p className="max-w-md text-xs text-muted">{message}</p>
    </div>
  );
}
