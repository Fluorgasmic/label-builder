import { useState } from 'react';
import { useLabelStore } from '../store/labelStore';
import logoB64 from '../assets/logo_oxfam_b64.txt?raw';
import CollapsiblePanel from './CollapsiblePanel';

const BUILTIN_FONTS = [
  { label: 'T-Star Pro', value: 'T-Star Pro' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Courier', value: 'Courier' },
];

const WEIGHT_OPTIONS = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Bold', value: 700 },
  { label: 'Heavy', value: 900 },
];

export default function PropertyPanel() {
  const { blocks, selectedBlockId, updateBlock, headers, duplicateBlock, alignBlocks, customFonts, addCustomFont, removeCustomFont } = useLabelStore();
  const block = blocks.find((b) => b.id === selectedBlockId);
  const [alignMode, setAlignMode] = useState('label');
  if (!block) return null;

  const update = (changes) => updateBlock(block.id, changes);
  const otherBlocks = blocks.filter((b) => b.id !== selectedBlockId);

  const fontOptions = [
    ...BUILTIN_FONTS,
    ...customFonts.map((f) => ({ label: `${f.name} *`, value: f.name })),
  ];

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const name = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const b64 = dataUrl.split(',')[1];
      const style = document.createElement('style');
      style.textContent = `@font-face { font-family: '${name}'; src: url('${dataUrl}') format('truetype'); font-weight: normal; font-style: normal; }`;
      document.head.appendChild(style);
      addCustomFont({ name, dataUrl, b64 });
      update({ fontFamily: name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const typeLabel = { text: 'Texte', image: 'Image', barcode: 'Code-barres', line: 'Ligne' }[block.type];

  return (
    <CollapsiblePanel title={`Propriétés — ${typeLabel}`} defaultOpen={true}>
      <div className="flex flex-col gap-3">
        {/* Duplicate */}
        <div className="flex justify-end">
          <button onClick={() => duplicateBlock(block.id)}
            className="text-[10px] bg-oxfam-surface border border-oxfam-border rounded px-2 py-0.5 cursor-pointer hover:bg-oxfam-surface-alt">
            Dupliquer
          </button>
        </div>

        {/* Position & size — all except line uses 4-col */}
        {block.type === 'line' ? (
          <div className="grid grid-cols-3 gap-2">
            <Field label="X (mm)" type="number" value={block.x} step={0.5} onChange={(v) => update({ x: v })} />
            <Field label="Y (mm)" type="number" value={block.y} step={0.5} onChange={(v) => update({ y: v })} />
            <Field label={block.orientation === 'horizontal' ? 'Long. (mm)' : 'Long. (mm)'} type="number"
              value={block.orientation === 'horizontal' ? block.width : block.height} step={0.5} min={1}
              onChange={(v) => update(block.orientation === 'horizontal' ? { width: v } : { height: v })} />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <Field label="X (mm)" type="number" value={block.x} step={0.5} onChange={(v) => update({ x: v })} />
            <Field label="Y (mm)" type="number" value={block.y} step={0.5} onChange={(v) => update({ y: v })} />
            <Field label="L (mm)" type="number" value={block.width} step={0.5} min={1} onChange={(v) => update({ width: v })} />
            <Field label="H (mm)" type="number" value={block.height} step={0.5} min={1} onChange={(v) => update({ height: v })} />
          </div>
        )}

        {/* Alignment buttons */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-oxfam-muted uppercase tracking-wider">Aligner</label>
            <div className="flex border border-oxfam-border rounded overflow-hidden">
              <button onClick={() => setAlignMode('label')}
                className={`text-[9px] font-bold px-2 py-0.5 border-none cursor-pointer ${alignMode === 'label' ? 'bg-oxfam-dark text-white' : 'bg-oxfam-surface text-oxfam-muted hover:bg-oxfam-surface-alt'}`}>
                Étiquette
              </button>
              <button onClick={() => setAlignMode('blocks')} disabled={otherBlocks.length === 0}
                className={`text-[9px] font-bold px-2 py-0.5 border-none cursor-pointer disabled:opacity-30 ${alignMode === 'blocks' ? 'bg-oxfam-dark text-white' : 'bg-oxfam-surface text-oxfam-muted hover:bg-oxfam-surface-alt'}`}>
                Autres blocs
              </button>
            </div>
          </div>
          <div className="flex gap-1">
            <AlignBtn title="Gauche" icon="align-left-h" onClick={() => alignBlocks('left', alignMode)} />
            <AlignBtn title="Centre H" icon="align-center-h" onClick={() => alignBlocks('centerH', alignMode)} />
            <AlignBtn title="Droite" icon="align-right-h" onClick={() => alignBlocks('right', alignMode)} />
            <div className="w-px bg-oxfam-border mx-0.5" />
            <AlignBtn title="Haut" icon="align-top-v" onClick={() => alignBlocks('top', alignMode)} />
            <AlignBtn title="Centre V" icon="align-center-v" onClick={() => alignBlocks('centerV', alignMode)} />
            <AlignBtn title="Bas" icon="align-bottom-v" onClick={() => alignBlocks('bottom', alignMode)} />
          </div>
        </div>

        {/* Line-specific */}
        {block.type === 'line' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Orientation" type="select" value={block.orientation} onChange={(v) => {
                if (v === 'horizontal') update({ orientation: v, height: block.thickness || 0.3, width: block.width || 46 });
                else update({ orientation: v, width: block.thickness || 0.3, height: block.height || 26 });
              }} options={[{ label: 'Horizontale', value: 'horizontal' }, { label: 'Verticale', value: 'vertical' }]} />
              <Field label="Épaisseur (mm)" type="number" value={block.thickness} step={0.1} min={0.1} max={5}
                onChange={(v) => {
                  const changes = { thickness: v };
                  if (block.orientation === 'horizontal') changes.height = v;
                  else changes.width = v;
                  update(changes);
                }} />
            </div>
            <Field label="Couleur" type="color" value={block.color} onChange={(v) => update({ color: v })} />
          </>
        )}

        {/* Text-specific */}
        {block.type === 'text' && (
          <>
            {headers.length > 0 && (
              <Field label="Colonne données" type="select" value={block.dataColumn || ''} onChange={(v) => update({ dataColumn: v || null })}
                options={[{ label: '— texte fixe —', value: '' }, ...headers.map((h) => ({ label: h, value: h }))]} />
            )}
            {!block.dataColumn && (
              <Field label="Texte" type="text" value={block.text} onChange={(v) => update({ text: v })} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Police" type="select" value={block.fontFamily} onChange={(v) => update({ fontFamily: v })} options={fontOptions.map((f) => ({ label: f.label, value: f.value }))} />
              <Field label="Graisse" type="select" value={block.fontWeight} onChange={(v) => update({ fontWeight: Number(v) })} options={WEIGHT_OPTIONS.map((w) => ({ label: w.label, value: w.value }))} />
            </div>
            {/* Custom font upload + list */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 px-2 py-1.5 border border-dashed border-oxfam-border rounded cursor-pointer transition-all hover:border-oxfam-accent hover:bg-oxfam-accent-light text-[10px] font-semibold text-oxfam-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Ajouter une police (.ttf, .otf, .woff)
                <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} className="hidden" />
              </label>
              {customFonts.length > 0 && customFonts.map((f) => (
                <div key={f.name} className="flex items-center gap-1.5 px-2 py-1 bg-oxfam-surface-alt rounded text-[10px] group">
                  <span className="font-bold text-oxfam-muted">Aa</span>
                  <span className="flex-1 truncate" style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</span>
                  <button onClick={() => removeCustomFont(f.name)}
                    className="text-oxfam-muted hover:text-oxfam-accent bg-transparent border-none cursor-pointer text-xs font-bold opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Taille (mm)" type="number" value={block.fontSize} step={0.1} min={0.5} onChange={(v) => update({ fontSize: v })} />
              <div>
                <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">Align. H</label>
                <div className="flex gap-1">
                  {[
                    { value: 'left', lines: [[3,5,17,5],[3,9,14,9],[3,13,17,13],[3,17,12,17]] },
                    { value: 'center', lines: [[4,5,18,5],[6,9,16,9],[4,13,18,13],[7,17,15,17]] },
                    { value: 'right', lines: [[5,5,19,5],[8,9,19,9],[5,13,19,13],[10,17,19,17]] },
                  ].map((a) => (
                    <button key={a.value} onClick={() => update({ align: a.value })}
                      className={`w-8 h-8 flex items-center justify-center rounded border cursor-pointer ${block.align === a.value ? 'bg-oxfam-dark border-oxfam-dark' : 'bg-oxfam-surface border-oxfam-border hover:bg-oxfam-surface-alt'}`}>
                      <svg width="18" height="18" viewBox="0 0 22 22">
                        {a.lines.map(([x1,y1,x2,y2], i) => (
                          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={block.align === a.value ? 'white' : '#8a7e72'} strokeWidth="2" strokeLinecap="round" />
                        ))}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Field label="Align. vertical" type="select" value={block.verticalAlign || 'top'} onChange={(v) => update({ verticalAlign: v })}
              options={[{ label: 'Haut', value: 'top' }, { label: 'Milieu', value: 'middle' }, { label: 'Bas', value: 'bottom' }]} />
            <Field label="Couleur" type="color" value={block.color} onChange={(v) => update({ color: v })} />
          </>
        )}

        {/* Image-specific */}
        {block.type === 'image' && (
          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider">Source image</label>
            {!block.src ? (
              <label className="flex flex-col items-center gap-1.5 border-2 border-dashed border-oxfam-border rounded-lg py-4 px-3 cursor-pointer transition-all hover:border-oxfam-accent hover:bg-oxfam-accent-light text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-oxfam-muted">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
                <span className="text-xs font-semibold text-oxfam-dark">Cliquez pour uploader une image</span>
                <span className="text-[10px] text-oxfam-muted">.png .jpg .svg</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => update({ src: ev.target.result });
                  reader.readAsDataURL(file);
                }} />
              </label>
            ) : (
              <div className="flex items-center gap-2 bg-oxfam-surface-alt border border-oxfam-border rounded-lg p-2">
                <img src={block.src} alt="preview" className="h-10 object-contain rounded" />
                <div className="flex-1 text-[10px] text-oxfam-muted">Image chargée</div>
                <label className="text-[10px] font-bold px-2 py-1 bg-oxfam-surface border border-oxfam-border rounded cursor-pointer hover:bg-white">
                  Changer
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => update({ src: ev.target.result });
                    reader.readAsDataURL(file);
                  }} />
                </label>
                <button onClick={() => update({ src: null })} className="text-oxfam-muted hover:text-oxfam-accent bg-transparent border-none cursor-pointer text-sm font-bold">×</button>
              </div>
            )}
            <button onClick={() => update({ src: logoB64 })}
              className="text-[10px] font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-oxfam-dark"><circle cx="12" cy="12" r="10"/></svg>
              Utiliser le logo Oxfam
            </button>
          </div>
        )}

        {/* Barcode-specific */}
        {block.type === 'barcode' && (
          <>
            {headers.length > 0 && (
              <Field label="Colonne code-barres" type="select" value={block.dataColumn || ''} onChange={(v) => update({ dataColumn: v || null })}
                options={[{ label: '— valeur fixe —', value: '' }, ...headers.map((h) => ({ label: h, value: h }))]} />
            )}
            {!block.dataColumn && (
              <Field label="Code EAN-13" type="text" value={block.staticValue} onChange={(v) => update({ staticValue: v })} />
            )}
          </>
        )}
      </div>
    </CollapsiblePanel>
  );
}

function AlignBtn({ title, icon, onClick }) {
  const paths = {
    'align-left-h':    <><line x1="4" y1="2" x2="4" y2="22" strokeWidth="2"/><rect x="7" y="6" width="10" height="4" rx="1"/><rect x="7" y="14" width="6" height="4" rx="1"/></>,
    'align-center-h':  <><line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" strokeDasharray="2 2"/><rect x="6" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/></>,
    'align-right-h':   <><line x1="20" y1="2" x2="20" y2="22" strokeWidth="2"/><rect x="7" y="6" width="10" height="4" rx="1"/><rect x="11" y="14" width="6" height="4" rx="1"/></>,
    'align-top-v':     <><line x1="2" y1="4" x2="22" y2="4" strokeWidth="2"/><rect x="6" y="7" width="4" height="10" rx="1"/><rect x="14" y="7" width="4" height="6" rx="1"/></>,
    'align-center-v':  <><line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" strokeDasharray="2 2"/><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/></>,
    'align-bottom-v':  <><line x1="2" y1="20" x2="22" y2="20" strokeWidth="2"/><rect x="6" y="7" width="4" height="10" rx="1"/><rect x="14" y="11" width="4" height="6" rx="1"/></>,
  };
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 flex items-center justify-center border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-oxfam-muted">{paths[icon]}</svg>
    </button>
  );
}

function Field({ label, type, value, onChange, step, min, max, options }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-oxfam-muted uppercase tracking-wider mb-1">{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted cursor-pointer">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'color' ? (
        <div className="flex items-center gap-1">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 border border-oxfam-border rounded cursor-pointer shrink-0 p-0.5" />
          <input type="text" value={value}
            onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') onChange(v); }}
            onBlur={(e) => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange('#000000'); }}
            className="flex-1 text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted font-mono"
            maxLength={7} placeholder="#000000" />
        </div>
      ) : (
        <input type={type} value={value} step={step} min={min} max={max}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full text-xs p-1.5 border border-oxfam-border rounded bg-oxfam-surface outline-none focus:border-oxfam-muted" />
      )}
    </div>
  );
}
