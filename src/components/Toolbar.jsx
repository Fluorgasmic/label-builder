import { useState, useRef, useEffect } from 'react';
import { useLabelStore } from '../store/labelStore';
import { exportPDF } from '../utils/exportPdf';

export default function Toolbar() {
  const { blocks, records, label, viewMode, setViewMode, a4Settings, setA4Settings, setBlocks, setLabelSize, saveTemplate, loadTemplate, getTemplateNames, deleteTemplate, customFonts } = useLabelStore();
  const [showModeles, setShowModeles] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState(() => getTemplateNames());
  const [exporting, setExporting] = useState(false);

  const modelesRef = useRef(null);
  const exportRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (modelesRef.current && !modelesRef.current.contains(e.target)) setShowModeles(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refreshTemplates = () => setTemplates(getTemplateNames());

  const handleNewLabel = () => {
    if (blocks.length > 0 && !confirm('Effacer l\'étiquette actuelle et repartir de zéro ?')) return;
    setBlocks([]);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    saveTemplate(templateName.trim());
    setTemplateName('');
    refreshTemplates();
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ label, blocks }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele-oxfam.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.label) setLabelSize(data.label.width, data.label.height);
        if (data.blocks) setBlocks(data.blocks);
      } catch (err) {
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportPDF = async () => {
    if (blocks.length === 0 || records.length === 0) return;
    setExporting(true);
    try {
      await exportPDF({
        blocks, records, label, customFonts,
        options: {
          format: viewMode === 'a4' ? 'a4' : 'single',
          showCropMarks: a4Settings.cropMarks,
          a4MarginTop: a4Settings.marginTop,
          a4MarginBottom: a4Settings.marginBottom,
          a4MarginLeft: a4Settings.marginLeft,
          a4MarginRight: a4Settings.marginRight,
          a4Gutter: a4Settings.gutter,
        },
      });
    } catch (err) {
      console.error('Export error:', err);
    }
    setExporting(false);
  };

  const canExport = blocks.length > 0 && records.length > 0;

  return (
    <div className="bg-oxfam-surface border-b border-oxfam-border px-5 py-2 flex items-center gap-2">
      {/* New label */}
      <button onClick={handleNewLabel} className="toolbar-btn" title="Créer une nouvelle étiquette vierge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        Nouvelle étiquette
      </button>

      <div className="w-px h-6 bg-oxfam-border" />

      {/* Modèles dropdown */}
      <div className="relative" ref={modelesRef}>
        <button
          onClick={() => { setShowModeles(!showModeles); setShowExport(false); refreshTemplates(); }}
          className={`toolbar-btn ${showModeles ? 'active' : ''}`}
          title="Sauvegarder ou charger un modèle d'étiquette"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v7l3-2 3 2V3"/></svg>
          Mes modèles
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {showModeles && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-oxfam-surface border border-oxfam-border rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2.5">
            {/* Section: Sauvegarder le modèle actuel */}
            <div className="text-[10px] font-bold text-oxfam-muted uppercase tracking-wider">Sauvegarder le modèle actuel</div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                placeholder="Nom du modèle..."
                className="flex-1 text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted"
              />
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || blocks.length === 0}
                className="text-xs font-bold px-3 py-1.5 bg-oxfam-accent text-white rounded cursor-pointer disabled:opacity-40 disabled:cursor-default hover:brightness-110 border-none"
              >
                Sauvegarder
              </button>
            </div>

            {/* Section: Modèles sauvegardés */}
            {templates.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-oxfam-muted uppercase tracking-wider pt-1 border-t border-oxfam-border">Modèles sauvegardés</div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {templates.map((name) => (
                    <div key={name} className="flex items-center gap-1.5 px-2 py-1.5 bg-oxfam-surface-alt rounded text-xs group hover:bg-oxfam-accent-light">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-oxfam-muted shrink-0"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v7l3-2 3 2V3"/></svg>
                      <span className="flex-1 truncate font-medium">{name}</span>
                      <button
                        onClick={() => { loadTemplate(name); setShowModeles(false); }}
                        className="text-[10px] font-bold px-2 py-0.5 bg-oxfam-green text-white rounded cursor-pointer border-none hover:brightness-110"
                      >
                        Ouvrir
                      </button>
                      <button
                        onClick={() => { deleteTemplate(name); refreshTemplates(); }}
                        className="text-oxfam-muted hover:text-oxfam-accent bg-transparent border-none cursor-pointer text-sm font-bold opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Section: Partager */}
            <div className="text-[10px] font-bold text-oxfam-muted uppercase tracking-wider pt-1 border-t border-oxfam-border">Partager un modèle</div>
            <div className="flex gap-1.5">
              <button onClick={handleExportJSON} disabled={blocks.length === 0}
                className="flex-1 text-[10px] font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exporter en fichier
              </button>
              <label className="flex-1 text-[10px] font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer text-center flex items-center justify-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Charger un fichier
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-oxfam-border" />

      {/* View toggle */}
      <div className="flex border border-oxfam-border rounded overflow-hidden">
        <button
          onClick={() => setViewMode('single')}
          className={`text-[11px] font-bold px-3 py-1.5 border-none cursor-pointer ${viewMode === 'single' ? 'bg-oxfam-dark text-white' : 'bg-oxfam-surface text-oxfam-muted hover:bg-oxfam-surface-alt'}`}
        >
          Au format
        </button>
        <button
          onClick={() => setViewMode('a4')}
          className={`text-[11px] font-bold px-3 py-1.5 border-none border-l border-oxfam-border cursor-pointer ${viewMode === 'a4' ? 'bg-oxfam-dark text-white' : 'bg-oxfam-surface text-oxfam-muted hover:bg-oxfam-surface-alt'}`}
        >
          Imposées sur A4
        </button>
      </div>

      {/* A4 settings (inline, visible only in A4 mode) */}
      {viewMode === 'a4' && (
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <span className="text-oxfam-muted text-[10px] font-bold">Marges:</span>
          <label className="flex items-center gap-0.5 text-oxfam-muted" title="Marge haut">
            H
            <input type="number" value={a4Settings.marginTop} min={3} max={30}
              onChange={(e) => setA4Settings({ marginTop: Number(e.target.value) })}
              className="w-8 text-[10px] p-0.5 border border-oxfam-border rounded bg-oxfam-surface outline-none text-center" />
          </label>
          <label className="flex items-center gap-0.5 text-oxfam-muted" title="Marge bas">
            B
            <input type="number" value={a4Settings.marginBottom} min={3} max={30}
              onChange={(e) => setA4Settings({ marginBottom: Number(e.target.value) })}
              className="w-8 text-[10px] p-0.5 border border-oxfam-border rounded bg-oxfam-surface outline-none text-center" />
          </label>
          <label className="flex items-center gap-0.5 text-oxfam-muted" title="Marge gauche">
            G
            <input type="number" value={a4Settings.marginLeft} min={3} max={30}
              onChange={(e) => setA4Settings({ marginLeft: Number(e.target.value) })}
              className="w-8 text-[10px] p-0.5 border border-oxfam-border rounded bg-oxfam-surface outline-none text-center" />
          </label>
          <label className="flex items-center gap-0.5 text-oxfam-muted" title="Marge droite">
            D
            <input type="number" value={a4Settings.marginRight} min={3} max={30}
              onChange={(e) => setA4Settings({ marginRight: Number(e.target.value) })}
              className="w-8 text-[10px] p-0.5 border border-oxfam-border rounded bg-oxfam-surface outline-none text-center" />
          </label>
          <label className="flex items-center gap-0.5 text-oxfam-muted">
            Goutt.
            <input type="number" value={a4Settings.gutter} min={0} max={20}
              onChange={(e) => setA4Settings({ gutter: Number(e.target.value) })}
              className="w-8 text-[10px] p-0.5 border border-oxfam-border rounded bg-oxfam-surface outline-none text-center" />
          </label>
          <label className="flex items-center gap-1 text-oxfam-muted cursor-pointer">
            <input type="checkbox" checked={a4Settings.cropMarks}
              onChange={(e) => setA4Settings({ cropMarks: e.target.checked })}
              className="w-3 h-3 accent-oxfam-accent" />
            Repères de coupe
          </label>
        </div>
      )}

      <div className="flex-1" />

      {/* Export PDF */}
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => { setShowExport(!showExport); setShowModeles(false); }}
          disabled={!canExport}
          className={`toolbar-btn toolbar-btn-accent ${showExport ? 'active' : ''}`}
          title={!canExport ? 'Ajoutez des blocs et chargez des données pour exporter' : 'Exporter les étiquettes en PDF'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exporter PDF
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {showExport && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-oxfam-surface border border-oxfam-border rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2.5">
            <p className="text-[10px] text-oxfam-muted">
              Export en mode : <strong>{viewMode === 'a4' ? 'Imposition A4' : 'Au format'}</strong>
            </p>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={a4Settings.cropMarks} onChange={(e) => setA4Settings({ cropMarks: e.target.checked })} className="w-3.5 h-3.5 accent-oxfam-accent" />
              Repères de coupe
            </label>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="text-sm font-bold py-2 px-4 bg-oxfam-accent text-white rounded-md cursor-pointer disabled:opacity-40 hover:brightness-110 border-none flex items-center justify-center gap-2"
            >
              {exporting ? 'Export en cours...' : `Générer le PDF (${records.length} étiquette${records.length > 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      {records.length > 0 && (
        <span className="text-[11px] text-oxfam-muted font-mono">
          {records.length} étiquette{records.length > 1 ? 's' : ''} · {label.width}×{label.height}mm
        </span>
      )}
    </div>
  );
}
