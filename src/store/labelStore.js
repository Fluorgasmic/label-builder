import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

const DEFAULT_LABEL = { width: 50, height: 30, safetyMargin: 2 };

const createTextBlock = (overrides = {}) => ({
  id: uuid(),
  type: 'text',
  x: 2,
  y: 2,
  width: 20,
  height: 6,
  text: 'Texte',
  fontFamily: 'T-Star Pro',
  fontSize: 2.5,
  fontWeight: 400,
  color: '#000000',
  align: 'left',
  verticalAlign: 'top',
  dataColumn: null,
  ...overrides,
});

const createImageBlock = (overrides = {}) => ({
  id: uuid(),
  type: 'image',
  x: 2,
  y: 2,
  width: 14,
  height: 7,
  src: null,
  ...overrides,
});

const createBarcodeBlock = (overrides = {}) => ({
  id: uuid(),
  type: 'barcode',
  x: 25,
  y: 14,
  width: 23,
  height: 14,
  dataColumn: null,
  staticValue: '',
  ...overrides,
});

const createLineBlock = (overrides = {}) => ({
  id: uuid(),
  type: 'line',
  x: 2,
  y: 15,
  width: 46,
  height: 0.3,
  orientation: 'horizontal', // 'horizontal' or 'vertical'
  color: '#000000',
  thickness: 0.3, // mm
  ...overrides,
});

export const useLabelStore = create((set, get) => ({
  // Label dimensions
  label: { ...DEFAULT_LABEL },
  setLabelSize: (width, height) => set((s) => ({ label: { ...s.label, width, height } })),
  setSafetyMargin: (m) => set((s) => ({ label: { ...s.label, safetyMargin: m } })),

  // Show guides toggle
  showGuides: true,
  setShowGuides: (v) => set({ showGuides: v }),

  // Zoom level (multiplier on SCALE)
  zoom: 1,
  setZoom: (z) => set({ zoom: Math.max(0.5, Math.min(3, z)) }),

  // Custom fonts
  customFonts: [],
  addCustomFont: (font) => set((s) => ({ customFonts: [...s.customFonts, font] })),
  removeCustomFont: (name) => set((s) => ({ customFonts: s.customFonts.filter((f) => f.name !== name) })),

  // Blocks on the canvas
  blocks: [],
  selectedBlockId: null,

  selectBlock: (id) => set({ selectedBlockId: id }),
  deselectAll: () => set({ selectedBlockId: null }),

  addTextBlock: (overrides) =>
    set((s) => ({ blocks: [...s.blocks, createTextBlock(overrides)] })),

  addImageBlock: (overrides) =>
    set((s) => ({ blocks: [...s.blocks, createImageBlock(overrides)] })),

  addBarcodeBlock: (overrides) =>
    set((s) => ({ blocks: [...s.blocks, createBarcodeBlock(overrides)] })),

  addLineBlock: (overrides) =>
    set((s) => ({ blocks: [...s.blocks, createLineBlock(overrides)] })),

  updateBlock: (id, changes) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b)),
    })),

  removeBlock: (id) =>
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== id),
      selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
    })),

  duplicateBlock: (id) =>
    set((s) => {
      const block = s.blocks.find((b) => b.id === id);
      if (!block) return {};
      const copy = { ...block, id: uuid(), x: block.x + 2, y: block.y + 2 };
      return { blocks: [...s.blocks, copy], selectedBlockId: copy.id };
    }),

  moveBlockUp: (id) =>
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx >= s.blocks.length - 1) return {};
      const arr = [...s.blocks];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return { blocks: arr };
    }),

  moveBlockDown: (id) =>
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx <= 0) return {};
      const arr = [...s.blocks];
      [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      return { blocks: arr };
    }),

  // Alignment helpers
  // mode: 'label' aligns to label edges, 'blocks' aligns to bounding box of other blocks
  alignBlocks: (direction, mode = 'label') => {
    const { blocks, selectedBlockId, label } = get();
    if (!selectedBlockId) return;
    const selected = blocks.find((b) => b.id === selectedBlockId);
    if (!selected) return;
    const sm = label.safetyMargin || 0;

    let refLeft, refRight, refTop, refBottom;

    if (mode === 'blocks') {
      // Compute bounding box of all OTHER blocks
      const others = blocks.filter((b) => b.id !== selectedBlockId);
      if (others.length === 0) return;
      refLeft = Math.min(...others.map((b) => b.x));
      refRight = Math.max(...others.map((b) => b.x + b.width));
      refTop = Math.min(...others.map((b) => b.y));
      refBottom = Math.max(...others.map((b) => b.y + b.height));
    } else {
      refLeft = sm;
      refRight = label.width - sm;
      refTop = sm;
      refBottom = label.height - sm;
    }

    let changes = {};
    switch (direction) {
      case 'left':    changes = { x: refLeft }; break;
      case 'right':   changes = { x: refRight - selected.width }; break;
      case 'top':     changes = { y: refTop }; break;
      case 'bottom':  changes = { y: refBottom - selected.height }; break;
      case 'centerH': changes = { x: (refLeft + refRight - selected.width) / 2 }; break;
      case 'centerV': changes = { y: (refTop + refBottom - selected.height) / 2 }; break;
    }
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === selectedBlockId ? { ...b, ...changes } : b)),
    }));
  },

  // View mode: 'single' or 'a4'
  viewMode: 'single',
  setViewMode: (mode) => set({ viewMode: mode }),

  // A4 preview settings (independent margins: top, bottom, left, right)
  a4Settings: { marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10, gutter: 4, cropMarks: true },
  setA4Settings: (changes) => set((s) => ({ a4Settings: { ...s.a4Settings, ...changes } })),

  // Data
  headers: [],
  records: [],
  currentRecord: 0,
  setData: (headers, records) => set({ headers, records, currentRecord: 0 }),
  setCurrentRecord: (idx) => set({ currentRecord: idx }),
  clearData: () => set({ headers: [], records: [], currentRecord: 0 }),

  // Templates
  saveTemplate: (name) => {
    const { label, blocks, customFonts } = get();
    const templates = JSON.parse(localStorage.getItem('oxfam_templates') || '{}');
    templates[name] = { label, blocks, customFonts };
    localStorage.setItem('oxfam_templates', JSON.stringify(templates));
  },

  loadTemplate: (name) => {
    const templates = JSON.parse(localStorage.getItem('oxfam_templates') || '{}');
    const tpl = templates[name];
    if (tpl) {
      set({
        label: { ...DEFAULT_LABEL, ...tpl.label },
        blocks: tpl.blocks,
        customFonts: tpl.customFonts || [],
        selectedBlockId: null,
      });
    }
  },

  getTemplateNames: () => {
    return Object.keys(JSON.parse(localStorage.getItem('oxfam_templates') || '{}'));
  },

  deleteTemplate: (name) => {
    const templates = JSON.parse(localStorage.getItem('oxfam_templates') || '{}');
    delete templates[name];
    localStorage.setItem('oxfam_templates', JSON.stringify(templates));
  },

  setBlocks: (blocks) => set({ blocks, selectedBlockId: null }),
}));
