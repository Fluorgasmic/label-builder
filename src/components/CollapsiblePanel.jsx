import { useState } from 'react';

export default function CollapsiblePanel({ step, title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-oxfam-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-oxfam-surface-alt px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-oxfam-muted border-b border-oxfam-border flex items-center gap-2 cursor-pointer border-none text-left hover:bg-oxfam-bg transition-colors"
        style={{ borderBottom: open ? undefined : 'none' }}
      >
        {step && (
          <span className="bg-oxfam-dark text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{step}</span>
        )}
        <span className="flex-1">{title}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="p-3.5">
          {children}
        </div>
      )}
    </div>
  );
}
