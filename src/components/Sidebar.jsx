import { useLabelStore } from '../store/labelStore';
import DataUpload from './DataUpload';
import BlockList from './BlockList';
import LabelSettings from './LabelSettings';
import PropertyPanel from './PropertyPanel';

export default function Sidebar() {
  const selectedBlockId = useLabelStore((s) => s.selectedBlockId);

  return (
    <aside className="w-[300px] bg-oxfam-surface border-r border-oxfam-border overflow-y-auto flex flex-col gap-3 p-4 shrink-0">
      <LabelSettings />
      <DataUpload />
      <BlockList />
      {selectedBlockId && <PropertyPanel />}
    </aside>
  );
}
