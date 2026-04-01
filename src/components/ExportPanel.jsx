import { useState } from 'react';
import { useLabelStore } from '../store/labelStore';
import { exportPDF } from '../utils/exportPdf';

export default function ExportPanel() {
  const { blocks, records, label } = useLabelStore();
  const [format, setFormat] = useState('single');
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [a4Margin, setA4Margin] = useState(10);
  const [a4Gutter, setA4Gutter] = useState(4);
  const [exporting, setExporting] = useState(false);

  const canExport = blocks.length > 0 && records.length > 0;

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      await exportPDF({
        blocks,
        records,
        label,
        options: { format, showCropMarks, a4Margin, a4Gutter },
      });
    } catch (err) {
      console.error('Export error:', err);
    }
    setExporting(false);
  };

  return (
    <div className="border border-oxfam-border rounded-lg overflow-hidden">
      <div className="bg-oxfam-surface-alt px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-oxfam-muted border-b border-oxfam-border flex items-center gap-2">
        <span className="bg-oxfam-dark text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
        Export PDF
      </div>
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="radio"
              name="pdfFormat"
              value="single"
              checked={format === 'single'}
              onChange={() => setFormat('single')}
              className="accent-oxfam-accent"
            />
            Étiquettes individuelles
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="radio"
              name="pdfFormat"
              value="a4"
              checked={format === 'a4'}
              onChange={() => setFormat('a4')}
              className="accent-oxfam-accent"
            />
            Imposition A4
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showCropMarks}
            onChange={(e) => setShowCropMarks(e.target.checked)}
            className="w-4 h-4 accent-oxfam-accent"
          />
          Repères de coupe
        </label>

        {format === 'a4' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">Marge (mm)</label>
              <input
                type="number"
                value={a4Margin}
                min={3}
                max={30}
                onChange={(e) => setA4Margin(Number(e.target.value))}
                className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">Gouttière (mm)</label>
              <input
                type="number"
                value={a4Gutter}
                min={0}
                max={20}
                onChange={(e) => setA4Gutter(Number(e.target.value))}
                className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={!canExport || exporting}
          className="text-sm font-bold py-2.5 px-4 bg-oxfam-accent text-white rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-default hover:brightness-110 border-none flex items-center justify-center gap-2 mt-1"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Export en cours...
            </>
          ) : (
            <>Exporter en PDF</>
          )}
        </button>

        {!canExport && (
          <p className="text-[10px] text-oxfam-muted text-center">
            {blocks.length === 0 ? 'Ajoutez des blocs à l\'étiquette' : 'Chargez un fichier de données'}
          </p>
        )}

        {format === 'a4' && canExport && (
          <p className="text-[10px] text-oxfam-muted text-center">
            {(() => {
              const usableW = 210 - a4Margin * 2;
              const usableH = 297 - a4Margin * 2;
              const cols = Math.floor((usableW + a4Gutter) / (label.width + a4Gutter));
              const rows = Math.floor((usableH + a4Gutter) / (label.height + a4Gutter));
              const perPage = cols * rows;
              const pages = Math.ceil(records.length / perPage);
              return `${cols}×${rows} = ${perPage}/page · ${pages} page(s) · ${records.length} étiquettes`;
            })()}
          </p>
        )}
      </div>
    </div>
  );
}
