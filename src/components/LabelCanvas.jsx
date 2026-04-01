import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useLabelStore } from '../store/labelStore';
import { generateEAN13SVG } from '../utils/ean13';

const SCALE = 8; // px per mm for single label view
const SNAP_THRESHOLD = 0.8; // mm — snap distance

// 8 resize handles: 4 corners + 4 edges
const HANDLES = [
  { id: 'nw', cursor: 'nw-resize', x: -1, y: -1, dx: -1, dy: -1, dw: 1, dh: 1 },
  { id: 'n',  cursor: 'n-resize',  x: 0.5, y: -1, dx: 0, dy: -1, dw: 0, dh: 1 },
  { id: 'ne', cursor: 'ne-resize', x: 1, y: -1, dx: 0, dy: -1, dw: 1, dh: 1 },
  { id: 'e',  cursor: 'e-resize',  x: 1, y: 0.5, dx: 0, dy: 0, dw: 1, dh: 0 },
  { id: 'se', cursor: 'se-resize', x: 1, y: 1, dx: 0, dy: 0, dw: 1, dh: 1 },
  { id: 's',  cursor: 's-resize',  x: 0.5, y: 1, dx: 0, dy: 0, dw: 0, dh: 1 },
  { id: 'sw', cursor: 'sw-resize', x: -1, y: 1, dx: -1, dy: 0, dw: 1, dh: 0 },
  { id: 'w',  cursor: 'w-resize',  x: -1, y: 0.5, dx: -1, dy: 0, dw: 1, dh: 0 },
];

export default function LabelCanvas() {
  const viewMode = useLabelStore((s) => s.viewMode);
  if (viewMode === 'a4') return <A4Preview />;
  return <SingleLabelView />;
}

// ─── Smart guides computation ──────────────────────────

function computeGuides(blocks, draggedId, label) {
  const guides = [];
  const dragged = blocks.find((b) => b.id === draggedId);
  if (!dragged) return guides;

  const sm = label.safetyMargin || 0;
  const dEdges = {
    left: dragged.x, right: dragged.x + dragged.width,
    top: dragged.y, bottom: dragged.y + dragged.height,
    cx: dragged.x + dragged.width / 2, cy: dragged.y + dragged.height / 2,
  };

  // Reference lines: other blocks + label edges + safety margin + label center
  const refXs = [sm, label.width - sm, label.width / 2];
  const refYs = [sm, label.height - sm, label.height / 2];

  for (const b of blocks) {
    if (b.id === draggedId) continue;
    refXs.push(b.x, b.x + b.width, b.x + b.width / 2);
    refYs.push(b.y, b.y + b.height, b.y + b.height / 2);
  }

  for (const rx of refXs) {
    for (const edge of [dEdges.left, dEdges.right, dEdges.cx]) {
      if (Math.abs(edge - rx) < SNAP_THRESHOLD) {
        guides.push({ axis: 'x', pos: rx });
        break;
      }
    }
  }
  for (const ry of refYs) {
    for (const edge of [dEdges.top, dEdges.bottom, dEdges.cy]) {
      if (Math.abs(edge - ry) < SNAP_THRESHOLD) {
        guides.push({ axis: 'y', pos: ry });
        break;
      }
    }
  }

  return guides;
}

// ─── Single label view (editable) ───────────────────────

function SingleLabelView() {
  const { label, blocks, selectedBlockId, selectBlock, deselectAll, updateBlock, records, currentRecord, showGuides, zoom, setZoom } = useLabelStore();
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);

  const effectiveScale = SCALE * zoom;
  const mm2px = (mm) => mm * effectiveScale;
  const px2mm = (px) => px / effectiveScale;
  const record = records[currentRecord] || null;
  const sm = label.safetyMargin || 0;

  const getBlockDisplayText = (block) => {
    if (block.type !== 'text') return '';
    if (block.dataColumn && record && record[block.dataColumn]) return record[block.dataColumn];
    if (block.dataColumn && !record) return `{${block.dataColumn}}`;
    return block.text || '';
  };

  const getBarcodeValue = (block) => {
    if (block.dataColumn && record && record[block.dataColumn]) return record[block.dataColumn];
    if (block.dataColumn && !record) return '5901234123457';
    return block.staticValue || '';
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target.dataset.canvas) deselectAll();
  };

  const startDrag = useCallback((e, blockId) => {
    e.stopPropagation();
    if (e.target.dataset.handle) return;
    selectBlock(blockId);
    const block = useLabelStore.getState().blocks.find((b) => b.id === blockId);
    if (!block) return;
    setDragging({
      blockId, startMouseX: e.clientX, startMouseY: e.clientY,
      startX: block.x, startY: block.y,
    });
  }, [selectBlock]);

  const startResize = useCallback((e, blockId, handle) => {
    e.stopPropagation();
    e.preventDefault();
    const block = useLabelStore.getState().blocks.find((b) => b.id === blockId);
    if (!block) return;
    setResizing({
      blockId, handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: block.x, startY: block.y,
      startW: block.width, startH: block.height,
    });
  }, []);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMove = (e) => {
      const state = useLabelStore.getState();
      const sm = state.label.safetyMargin || 0;
      const eScale = SCALE * state.zoom;
      const px2mmLocal = (px) => px / eScale;

      if (dragging) {
        const dx = px2mmLocal(e.clientX - dragging.startMouseX);
        const dy = px2mmLocal(e.clientY - dragging.startMouseY);
        const block = state.blocks.find((b) => b.id === dragging.blockId);
        if (!block) return;
        let nx = Math.round((dragging.startX + dx) * 2) / 2;
        let ny = Math.round((dragging.startY + dy) * 2) / 2;

        // Only clamp text/line blocks to safety margin; image/barcode can exceed
        const clampToMargin = block.type === 'text' || block.type === 'line';
        if (sm > 0 && clampToMargin) {
          nx = Math.max(sm, Math.min(state.label.width - block.width - sm, nx));
          ny = Math.max(sm, Math.min(state.label.height - block.height - sm, ny));
        }

        // Snap to guides
        if (state.showGuides) {
          const refXs = [sm, state.label.width - sm, state.label.width / 2];
          const refYs = [sm, state.label.height - sm, state.label.height / 2];
          for (const b of state.blocks) {
            if (b.id === dragging.blockId) continue;
            refXs.push(b.x, b.x + b.width, b.x + b.width / 2);
            refYs.push(b.y, b.y + b.height, b.y + b.height / 2);
          }
          for (const rx of refXs) {
            if (Math.abs(nx - rx) < SNAP_THRESHOLD) nx = rx;
            if (Math.abs(nx + block.width - rx) < SNAP_THRESHOLD) nx = rx - block.width;
            if (Math.abs(nx + block.width / 2 - rx) < SNAP_THRESHOLD) nx = rx - block.width / 2;
          }
          for (const ry of refYs) {
            if (Math.abs(ny - ry) < SNAP_THRESHOLD) ny = ry;
            if (Math.abs(ny + block.height - ry) < SNAP_THRESHOLD) ny = ry - block.height;
            if (Math.abs(ny + block.height / 2 - ry) < SNAP_THRESHOLD) ny = ry - block.height / 2;
          }
        }

        updateBlock(dragging.blockId, { x: nx, y: ny });
      }

      if (resizing) {
        const { handle, startX, startY, startW, startH } = resizing;
        const dxPx = e.clientX - resizing.startMouseX;
        const dyPx = e.clientY - resizing.startMouseY;
        const dxMM = px2mmLocal(dxPx);
        const dyMM = px2mmLocal(dyPx);

        let nx = startX, ny = startY, nw = startW, nh = startH;

        // Apply handle deltas
        if (handle.dw) nw = startW + dxMM * (handle.dx < 0 ? -1 : 1);
        if (handle.dh) nh = startH + dyMM * (handle.dy < 0 ? -1 : 1);
        if (handle.dx < 0) nx = startX + dxMM;
        if (handle.dy < 0) ny = startY + dyMM;

        // Min size
        nw = Math.max(2, Math.round(nw * 2) / 2);
        nh = Math.max(1, Math.round(nh * 2) / 2);
        nx = Math.round(nx * 2) / 2;
        ny = Math.round(ny * 2) / 2;

        // Only clamp text/line blocks to safety margin
        const block = state.blocks.find((b) => b.id === resizing.blockId);
        const clampToMargin = block && (block.type === 'text' || block.type === 'line');
        if (sm > 0 && clampToMargin) {
          if (nx < sm) { nw -= (sm - nx); nx = sm; }
          if (ny < sm) { nh -= (sm - ny); ny = sm; }
          if (nx + nw > state.label.width - sm) nw = state.label.width - sm - nx;
          if (ny + nh > state.label.height - sm) nh = state.label.height - sm - ny;
        }

        updateBlock(resizing.blockId, { x: nx, y: ny, width: Math.max(2, nw), height: Math.max(1, nh) });
      }
    };

    const handleUp = () => { setDragging(null); setResizing(null); };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, resizing, updateBlock]);

  // Compute guides for rendering
  const activeGuides = useMemo(() => {
    if (!showGuides || !dragging) return [];
    return computeGuides(blocks, dragging.blockId, label);
  }, [blocks, dragging, label, showGuides]);

  // Zoom with mouse wheel (Ctrl/Cmd + scroll)
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(useLabelStore.getState().zoom + delta);
    }
  }, [setZoom]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
      {records.length > 0 && <RecordNav />}

      {/* Zoom controls */}
      <div className="flex items-center gap-2 mt-2 mb-1">
        <button onClick={() => setZoom(zoom - 0.25)}
          className="w-7 h-7 flex items-center justify-center border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer text-sm font-bold text-oxfam-muted">−</button>
        <button onClick={() => setZoom(1)}
          className="text-[11px] font-mono font-medium text-oxfam-muted px-2 py-1 border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer min-w-[52px] text-center">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => setZoom(zoom + 0.25)}
          className="w-7 h-7 flex items-center justify-center border border-oxfam-border rounded bg-oxfam-surface hover:bg-oxfam-surface-alt cursor-pointer text-sm font-bold text-oxfam-muted">+</button>
      </div>

      <div className="bg-white shadow-lg rounded-sm">
        <div
          ref={canvasRef}
          data-canvas="true"
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          className="relative bg-white border border-gray-200"
          style={{
            width: mm2px(label.width),
            height: mm2px(label.height),
            fontFamily: "'T-Star Pro', Helvetica, sans-serif",
          }}
        >
          {/* Safety margin indicator */}
          {sm > 0 && (
            <div
              className="absolute border border-dashed pointer-events-none"
              style={{
                left: mm2px(sm),
                top: mm2px(sm),
                width: mm2px(label.width - sm * 2),
                height: mm2px(label.height - sm * 2),
                borderColor: 'rgba(196,80,26,0.25)',
                zIndex: 0,
              }}
            />
          )}

          {/* Smart guides */}
          {activeGuides.map((g, i) => (
            g.axis === 'x' ? (
              <div key={i} className="absolute pointer-events-none" style={{
                left: mm2px(g.pos), top: 0, width: 0,
                height: mm2px(label.height),
                borderLeft: '1px solid rgba(58,125,68,0.5)',
                zIndex: 50,
              }} />
            ) : (
              <div key={i} className="absolute pointer-events-none" style={{
                left: 0, top: mm2px(g.pos), width: mm2px(label.width),
                height: 0,
                borderTop: '1px solid rgba(58,125,68,0.5)',
                zIndex: 50,
              }} />
            )
          ))}

          {/* Blocks */}
          {blocks.map((block) => {
            const isSelected = block.id === selectedBlockId;
            return (
              <div
                key={block.id}
                style={{
                  position: 'absolute',
                  left: mm2px(block.x),
                  top: mm2px(block.y),
                  width: mm2px(block.width),
                  height: mm2px(block.height),
                  zIndex: isSelected ? 20 : 10,
                }}
                className={`group cursor-move ${isSelected ? 'outline outline-2 outline-oxfam-accent outline-offset-1' : 'hover:outline hover:outline-1 hover:outline-oxfam-border hover:outline-offset-1'}`}
                onMouseDown={(e) => startDrag(e, block.id)}
              >
                <BlockContent block={block} getText={getBlockDisplayText} getBarcode={getBarcodeValue} mm2px={mm2px} />

                {/* 8 resize handles */}
                {isSelected && HANDLES.map((h) => {
                  const size = 7;
                  const half = size / 2;
                  let left, top;
                  if (h.x === -1) left = -half - 1;
                  else if (h.x === 0.5) left = `calc(50% - ${half}px)`;
                  else left = `calc(100% - ${half - 1}px)`;
                  if (h.y === -1) top = -half - 1;
                  else if (h.y === 0.5) top = `calc(50% - ${half}px)`;
                  else top = `calc(100% - ${half - 1}px)`;

                  return (
                    <div
                      key={h.id}
                      data-handle="resize"
                      className="absolute bg-white border-2 border-oxfam-accent"
                      style={{
                        left, top,
                        width: size, height: size,
                        cursor: h.cursor,
                        zIndex: 30,
                      }}
                      onMouseDown={(e) => startResize(e, block.id, h)}
                    />
                  );
                })}
              </div>
            );
          })}

          {blocks.length === 0 && (
            <div data-canvas="true" className="absolute inset-0 flex items-center justify-center text-oxfam-muted text-xs pointer-events-none">
              Ajoutez des blocs dans la barre latérale
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-[10px] text-oxfam-muted font-mono">
        {label.width} × {label.height} mm — zoom {Math.round(zoom * 100)}%
        {sm > 0 && ` — marge sécurité ${sm}mm`}
      </div>
    </div>
  );
}

// ─── Block content rendering (shared) ──────────────────

function BlockContent({ block, getText, getBarcode, mm2px }) {
  const m = (v) => mm2px ? mm2px(v) : v * SCALE;

  if (block.type === 'text') {
    const text = getText ? getText(block) : block.text || '';
    const va = block.verticalAlign || 'top';
    return (
      <div
        className="w-full h-full flex overflow-hidden select-none pointer-events-none"
        style={{
          fontFamily: `'${block.fontFamily}', sans-serif`,
          fontSize: m(block.fontSize),
          fontWeight: block.fontWeight,
          color: block.color,
          textAlign: block.align,
          alignItems: va === 'middle' ? 'center' : va === 'bottom' ? 'flex-end' : 'flex-start',
          justifyContent: block.align === 'center' ? 'center' : block.align === 'right' ? 'flex-end' : 'flex-start',
          lineHeight: 1.15,
        }}
      >
        <span className="w-full">{text}</span>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden select-none pointer-events-none">
        {block.src ? (
          <img src={block.src} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-gray-50 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
            <span className="text-[8px]">Image</span>
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'barcode') {
    const val = getBarcode ? getBarcode(block) : block.staticValue || '';
    const w = m(block.width), h = m(block.height);
    const svg = val ? generateEAN13SVG(val, w, h) : null;
    if (svg) return <div className="w-full h-full select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: svg }} />;
    return (
      <div className="w-full h-full bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px] select-none pointer-events-none">
        EAN-13
      </div>
    );
  }

  if (block.type === 'line') {
    return (
      <div className="w-full h-full select-none pointer-events-none"
        style={{ backgroundColor: block.color || '#000000' }} />
    );
  }

  return null;
}

// ─── A4 Preview (read-only) ────────────────────────────

function A4Preview() {
  const { label, blocks, records, a4Settings } = useLabelStore();
  const { marginTop, marginBottom, marginLeft, marginRight, gutter, cropMarks } = a4Settings;
  const A4_W = 210, A4_H = 297;
  const usableW = A4_W - marginLeft - marginRight;
  const usableH = A4_H - marginTop - marginBottom;
  const cols = Math.floor((usableW + gutter) / (label.width + gutter));
  const rows = Math.floor((usableH + gutter) / (label.height + gutter));
  const perPage = cols * rows;
  const totalPages = records.length > 0 ? Math.ceil(records.length / perPage) : 1;
  const gridW = cols * label.width + (cols - 1) * gutter;
  const gridH = rows * label.height + (rows - 1) * gutter;
  // Center within usable area
  const startX = marginLeft + (usableW - gridW) / 2;
  const startY = marginTop + (usableH - gridH) / 2;
  const A4_SCALE = 2.5;
  const pvW = A4_W * A4_SCALE, pvH = A4_H * A4_SCALE;
  const [page, setPage] = useState(0);
  const pageRecords = records.slice(page * perPage, (page + 1) * perPage);

  const getBlockText = (block, rec) => {
    if (block.type !== 'text') return '';
    if (block.dataColumn && rec && rec[block.dataColumn]) return rec[block.dataColumn];
    return block.text || '';
  };
  const getBlockBarcode = (block, rec) => {
    if (block.dataColumn && rec && rec[block.dataColumn]) return rec[block.dataColumn];
    return block.staticValue || '';
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 overflow-auto">
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="w-8 h-8 border border-oxfam-border rounded bg-oxfam-surface flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-oxfam-surface-alt text-base">‹</button>
          <span className="text-xs font-mono font-medium">Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="w-8 h-8 border border-oxfam-border rounded bg-oxfam-surface flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-oxfam-surface-alt text-base">›</button>
        </div>
      )}
      <div className="bg-white shadow-lg relative" style={{ width: pvW, height: pvH }}>
        {pageRecords.map((rec, idx) => {
          const r = Math.floor(idx / cols), c = idx % cols;
          const x = startX + c * (label.width + gutter), y = startY + r * (label.height + gutter);
          return (
            <div key={idx}>
              <div className="absolute overflow-hidden bg-white" style={{ left: x * A4_SCALE, top: y * A4_SCALE, width: label.width * A4_SCALE, height: label.height * A4_SCALE }}>
                {blocks.map((block) => (
                  <div key={block.id} className="absolute" style={{ left: block.x * A4_SCALE, top: block.y * A4_SCALE, width: block.width * A4_SCALE, height: block.height * A4_SCALE }}>
                    <BlockContent block={block} getText={(b) => getBlockText(b, rec)} getBarcode={(b) => getBlockBarcode(b, rec)} mm2px={(v) => v * A4_SCALE} />
                  </div>
                ))}
              </div>
              {cropMarks && <CropMarks x={x * A4_SCALE} y={y * A4_SCALE} w={label.width * A4_SCALE} h={label.height * A4_SCALE} />}
            </div>
          );
        })}
        {records.length === 0 && Array.from({ length: perPage }).map((_, idx) => {
          const r = Math.floor(idx / cols), c = idx % cols;
          return (
            <div key={idx} className="absolute border border-dashed border-gray-200"
              style={{ left: (startX + c * (label.width + gutter)) * A4_SCALE, top: (startY + r * (label.height + gutter)) * A4_SCALE, width: label.width * A4_SCALE, height: label.height * A4_SCALE }} />
          );
        })}
        <div className="absolute bottom-1.5 right-2.5 text-[9px] text-gray-400 font-mono">
          {cols}×{rows} = {perPage}/page · {label.width}×{label.height}mm · marges {marginTop}/{marginRight}/{marginBottom}/{marginLeft}mm · goutt. {gutter}mm
        </div>
      </div>
      <div className="mt-3 text-[10px] text-oxfam-muted font-mono">
        A4 (210 × 297 mm) — {records.length} étiquette{records.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function CropMarks({ x, y, w, h }) {
  const len = 8, off = 2.5;
  const lines = [
    [x-off-len,y,x-off,y],[x,y-off-len,x,y-off],
    [x+w+off,y,x+w+off+len,y],[x+w,y-off-len,x+w,y-off],
    [x-off-len,y+h,x-off,y+h],[x,y+h+off,x,y+h+off+len],
    [x+w+off,y+h,x+w+off+len,y+h],[x+w,y+h+off,x+w,y+h+off+len],
  ];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
      {lines.map(([x1,y1,x2,y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="0.5" />)}
    </svg>
  );
}

function RecordNav() {
  const { records, currentRecord, setCurrentRecord, viewMode } = useLabelStore();
  if (viewMode === 'a4') return null;
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setCurrentRecord(Math.max(0, currentRecord - 1))} disabled={currentRecord === 0}
        className="w-8 h-8 border border-oxfam-border rounded bg-oxfam-surface flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-oxfam-surface-alt text-base">‹</button>
      <span className="text-xs font-mono font-medium min-w-[60px] text-center">{currentRecord + 1} / {records.length}</span>
      <button onClick={() => setCurrentRecord(Math.min(records.length - 1, currentRecord + 1))} disabled={currentRecord >= records.length - 1}
        className="w-8 h-8 border border-oxfam-border rounded bg-oxfam-surface flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-oxfam-surface-alt text-base">›</button>
    </div>
  );
}
