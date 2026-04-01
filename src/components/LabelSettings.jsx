import { useLabelStore } from '../store/labelStore';
import CollapsiblePanel from './CollapsiblePanel';

export default function LabelSettings() {
  const { label, setLabelSize, setSafetyMargin, showGuides, setShowGuides } = useLabelStore();

  return (
    <CollapsiblePanel step="1" title="Format étiquette">
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">Largeur (mm)</label>
            <input type="number" value={label.width} min={10} max={200}
              onChange={(e) => setLabelSize(Number(e.target.value), label.height)}
              className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">Hauteur (mm)</label>
            <input type="number" value={label.height} min={10} max={150}
              onChange={(e) => setLabelSize(label.width, Number(e.target.value))}
              className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">Marge sécu.</label>
            <input type="number" value={label.safetyMargin || 0} min={0} max={10} step={0.5}
              onChange={(e) => setSafetyMargin(Number(e.target.value))}
              className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)}
            className="w-3.5 h-3.5 accent-oxfam-accent" />
          Repères d'alignement
        </label>
      </div>
    </CollapsiblePanel>
  );
}

