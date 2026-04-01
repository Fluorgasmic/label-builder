import Header from './components/Header';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import LabelCanvas from './components/LabelCanvas';

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <LabelCanvas />
      </div>
    </div>
  );
}
