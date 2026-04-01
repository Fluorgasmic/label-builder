import { useState } from 'react';
import { useLabelStore } from '../store/labelStore';

export default function TemplateManager() {
  const { saveTemplate, loadTemplate, getTemplateNames, deleteTemplate, blocks, label } = useLabelStore();
  const [newName, setNewName] = useState('');
  const [templates, setTemplates] = useState(() => getTemplateNames());

  const refresh = () => setTemplates(getTemplateNames());

  const handleSave = () => {
    if (!newName.trim()) return;
    saveTemplate(newName.trim());
    setNewName('');
    refresh();
  };

  const handleLoad = (name) => {
    loadTemplate(name);
  };

  const handleDelete = (name) => {
    deleteTemplate(name);
    refresh();
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ label, blocks }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-oxfam.json';
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
        if (data.label) useLabelStore.getState().setLabelSize(data.label.width, data.label.height);
        if (data.blocks) useLabelStore.getState().setBlocks(data.blocks);
      } catch (err) {
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="border border-oxfam-border rounded-lg overflow-hidden">
      <div className="bg-oxfam-surface-alt px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-oxfam-muted border-b border-oxfam-border flex items-center gap-2">
        <span className="bg-oxfam-dark text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2v12h12V5.5L10.5 2H2zm9 1l2 2h-2V3zM4 4h4v3h4v7H4V4z"/></svg>
        </span>
        Templates
      </div>
      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Save current */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Nom du template..."
            className="flex-1 text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted"
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim() || blocks.length === 0}
            className="text-xs font-bold px-3 py-1.5 bg-oxfam-accent text-white rounded cursor-pointer disabled:opacity-40 disabled:cursor-default hover:brightness-110 border-none"
          >
            Sauver
          </button>
        </div>

        {/* Saved templates list */}
        {templates.length > 0 && (
          <div className="flex flex-col gap-1">
            {templates.map((name) => (
              <div
                key={name}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-oxfam-surface-alt rounded text-xs group"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-oxfam-muted shrink-0"><path d="M2 2v12h12V5.5L10.5 2H2zm9 1l2 2h-2V3zM4 4h4v3h4v7H4V4z"/></svg>
                <span className="flex-1 truncate font-medium">{name}</span>
                <button
                  onClick={() => handleLoad(name)}
                  className="text-[10px] font-bold px-2 py-0.5 bg-oxfam-green text-white rounded cursor-pointer border-none hover:brightness-110"
                >
                  Charger
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="text-oxfam-muted hover:text-oxfam-accent bg-transparent border-none cursor-pointer text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Import / Export JSON */}
        <div className="flex gap-1.5 pt-1 border-t border-oxfam-border">
          <button
            onClick={handleExportJSON}
            disabled={blocks.length === 0}
            className="flex-1 text-[10px] font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Exporter JSON
          </button>
          <label className="flex-1 text-[10px] font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer text-center">
            Importer JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
