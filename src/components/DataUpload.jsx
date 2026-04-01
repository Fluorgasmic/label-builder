import { useCallback } from 'react';
import { useLabelStore } from '../store/labelStore';
import { parseFile } from '../utils/parseData';
import CollapsiblePanel from './CollapsiblePanel';

export default function DataUpload() {
  const { headers, records, setData, clearData } = useLabelStore();

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const { headers: h, records: r } = await parseFile(file);
      setData(h, r);
    } catch (err) {
      console.error('Parse error:', err);
    }
  }, [setData]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('!border-oxfam-accent', '!bg-oxfam-accent-light');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <CollapsiblePanel step="2" title="Données" defaultOpen={records.length === 0}>
      {records.length > 0 ? (
        <>
          <div className="bg-oxfam-green-light border border-oxfam-green rounded-lg px-3.5 py-2.5 flex items-center gap-2 text-sm font-medium">
            <span className="text-oxfam-green text-base">✓</span>
            <div className="flex-1">
              <strong>{records.length}</strong> étiquettes · <strong>{headers.length}</strong> colonnes
            </div>
            <button onClick={clearData} className="text-oxfam-accent font-bold text-sm bg-transparent border-none cursor-pointer">×</button>
          </div>
          <div className="mt-2 text-[10px] text-oxfam-muted">
            Colonnes: {headers.join(', ')}
          </div>
        </>
      ) : (
        <div
          className="border-2 border-dashed border-oxfam-border rounded-lg py-7 px-3.5 text-center cursor-pointer transition-all hover:border-oxfam-accent hover:bg-oxfam-accent-light"
          onClick={() => document.getElementById('fileInput').click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('!border-oxfam-accent', '!bg-oxfam-accent-light'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('!border-oxfam-accent', '!bg-oxfam-accent-light')}
          onDrop={onDrop}
        >
          <div className="text-3xl opacity-50 mb-1.5">📄</div>
          <p className="text-sm text-oxfam-muted">Glissez ou cliquez pour charger</p>
          <div className="font-mono text-[10px] mt-1 text-oxfam-muted opacity-60">.csv · .tsv · .txt · .xlsx</div>
          <input type="file" id="fileInput" className="hidden" accept=".csv,.tsv,.txt,.xlsx,.xls"
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}
    </CollapsiblePanel>
  );
}
