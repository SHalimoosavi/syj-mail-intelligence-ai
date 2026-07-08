import { StatusPulse } from "./StatusPulse";

export function Topbar({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-base px-8 py-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-text">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <StatusPulse />
    </header>
  );
}
