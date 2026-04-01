import { useLabelStore } from '../store/labelStore';
import CollapsiblePanel from './CollapsiblePanel';

const BLOCK_ICONS = { text: '🔤', image: '🖼️', barcode: '▮▯▮', line: '━' };

export default function BlockList() {
  const { blocks, selectedBlockId, selectBlock, addTextBlock, addImageBlock, addBarcodeBlock, addLineBlock, removeBlock } = useLabelStore();

  return (
    <CollapsiblePanel step="3" title="Blocs">
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <button onClick={() => addTextBlock()}
          className="flex-1 text-xs font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer min-w-[60px]">
          + Texte
        </button>
        <button onClick={() => addImageBlock()}
          className="flex-1 text-xs font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer min-w-[60px]">
          + Image
        </button>
        <button onClick={() => addBarcodeBlock()}
          className="flex-1 text-xs font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer min-w-[60px]">
          + Code-barres
        </button>
        <button onClick={() => addLineBlock()}
          className="flex-1 text-xs font-semibold py-1.5 px-2 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer min-w-[60px]">
          + Ligne
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="text-xs text-oxfam-muted text-center py-3">
          Ajoutez des blocs pour construire votre étiquette
        </p>
      )}

      <div className="flex flex-col gap-1">
        {blocks.map((block) => (
          <div
            key={block.id}
            onClick={() => selectBlock(block.id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer text-xs transition-colors ${
              selectedBlockId === block.id
                ? 'bg-oxfam-accent-light border border-oxfam-accent text-oxfam-accent font-bold'
                : 'bg-oxfam-surface-alt border border-transparent hover:border-oxfam-border'
            }`}
          >
            <span className="text-sm">{BLOCK_ICONS[block.type]}</span>
            <span className="flex-1 truncate">
              {block.type === 'text' && (block.dataColumn || block.text || 'Texte')}
              {block.type === 'image' && 'Image'}
              {block.type === 'barcode' && (block.dataColumn || 'Code-barres')}
              {block.type === 'line' && (block.orientation === 'horizontal' ? 'Ligne H' : 'Ligne V')}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
              className="text-oxfam-muted hover:text-oxfam-accent bg-transparent border-none cursor-pointer text-sm font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </CollapsiblePanel>
  );
}
