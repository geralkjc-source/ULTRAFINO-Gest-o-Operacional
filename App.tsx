
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ClipboardCheck, 
  AlertCircle, 
  BarChart3, 
  FileSpreadsheet, 
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BrainCircuit,
  Settings
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChecklistArea from './pages/ChecklistArea';
import PendingList from './pages/PendingList';
import ReportsHistory from './pages/ReportsHistory';
import { Area, Report, PendingItem, Comment, ChecklistItem } from './types';

const VulcanLogo = ({ className = "" }: { className?: string }) => (
  <span className={`font-black tracking-tighter select-none ${className}`}>
    VULCAN
  </span>
);

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/pending', label: 'Pendências', icon: <AlertCircle size={20} /> },
    { path: '/history', label: 'Histórico', icon: <FileSpreadsheet size={20} /> },
  ];

  const areaItems = Object.values(Area).map(area => ({
    path: `/checklist/${encodeURIComponent(area)}`,
    label: area,
    icon: <ClipboardCheck size={20} />
  }));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={toggle}
        />
      )}
      
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-white px-3 py-2 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
               <VulcanLogo className="text-xl text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">ULTRAFINO</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Gestão Operacional</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Menu Principal</p>
              <div className="space-y-1">
                {menuItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Checklists por Área</p>
              <div className="space-y-1">
                {areaItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      location.pathname === item.path ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sair do Sistema</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => (
  <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button onClick={onToggleSidebar} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md">
        <Menu size={24} />
      </button>
      <div className="flex items-center gap-3">
        <div className="lg:hidden bg-white px-2 py-1 rounded-md border border-slate-100 flex items-center justify-center">
           <VulcanLogo className="text-sm text-slate-900" />
        </div>
        <h2 className="text-slate-800 font-semibold text-lg hidden sm:block">Plataforma de Relatórios & Pendências</h2>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
        <Settings size={18} />
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  useEffect(() => {
    const savedReports = localStorage.getItem('ultrafino_reports');
    const savedPending = localStorage.getItem('ultrafino_pending');
    if (savedReports) setReports(JSON.parse(savedReports));
    if (savedPending) setPendingItems(JSON.parse(savedPending));
  }, []);

  const addReport = (report: Report) => {
    const updatedReports = [report, ...reports];
    setReports(updatedReports);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    
    // Extração Automática com Inteligência de Contexto de TAG
    const newPendingFromChecklist: PendingItem[] = [];
    
    report.items.forEach((item, index) => {
      if (item.status === 'fail' || item.status === 'warning') {
        let finalTag = item.label;

        // Se for um sub-item (começa com "- "), busca o equipamento pai
        if (item.label.startsWith('- ')) {
          for (let i = index - 1; i >= 0; i--) {
            if (!report.items[i].label.startsWith('- ') && !report.items[i].label.startsWith('SECTION:')) {
              finalTag = `${report.items[i].label} ${item.label}`;
              break;
            }
          }
        }

        newPendingFromChecklist.push({
          id: `pend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tag: finalTag.replace('- ', '').trim().toUpperCase(),
          description: item.observation?.trim() || (item.status === 'fail' ? 'FORA DE SERVIÇO' : 'ANOMALIA / ATENÇÃO'),
          priority: (item.status === 'fail' ? 'alta' : 'media') as 'alta' | 'media',
          status: 'aberto' as const,
          area: report.area,
          timestamp: Date.now(),
          operator: report.operator,
          turma: report.turma,
          comments: []
        });
      }
    });

    if (newPendingFromChecklist.length > 0) {
      const updatedPending = [...newPendingFromChecklist, ...pendingItems];
      setPendingItems(updatedPending);
      localStorage.setItem('ultrafino_pending', JSON.stringify(updatedPending));
    }
  };

  const resolvePending = (id: string) => {
    const updated = pendingItems.map(p => p.id === id ? { ...p, status: 'resolvido' as const } : p);
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
  };

  const addPendingComment = (pendingId: string, commentText: string) => {
    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      text: commentText,
      author: 'Operador', 
      timestamp: Date.now()
    };
    const updated = pendingItems.map(p => 
      p.id === pendingId ? { ...p, comments: [...(p.comments || []), newComment] } : p
    );
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
  };

  const addReportItemComment = (reportId: string, itemId: string, commentText: string) => {
    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      text: commentText,
      author: 'Operador',
      timestamp: Date.now()
    };
    const updated = reports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          items: r.items.map(item => 
            item.id === itemId ? { ...item, comments: [...(item.comments || []), newComment] } : item
          )
        };
      }
      return r;
    });
    setReports(updated);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updated));
  };

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 lg:ml-72 flex flex-col min-w-0">
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          
          <div className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard reports={reports} pendingItems={pendingItems} />} />
              <Route 
                path="/checklist/:areaName" 
                element={<ChecklistArea onSaveReport={addReport} />} 
              />
              <Route 
                path="/pending" 
                element={<PendingList pendingItems={pendingItems} onResolve={resolvePending} onAddComment={addPendingComment} />} 
              />
              <Route 
                path="/history" 
                element={<ReportsHistory reports={reports} onAddItemComment={addReportItemComment} />} 
              />
            </Routes>
          </div>
          
          <footer className="p-6 border-t border-slate-200 flex flex-col items-center gap-2 text-slate-400 text-sm">
            <div className="bg-white px-2 py-1 rounded-md shadow-sm opacity-60 grayscale hover:grayscale-0 transition-all">
               <VulcanLogo className="text-[10px] text-slate-900" />
            </div>
            <p>&copy; 2024 Ultrafino Operações Industriais - Todos os direitos reservados.</p>
          </footer>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
