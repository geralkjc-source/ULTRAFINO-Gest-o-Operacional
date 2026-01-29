
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  ClipboardCheck, 
  AlertCircle, 
  FileSpreadsheet, 
  LayoutDashboard,
  Menu,
  Cloud,
  CloudOff,
  RefreshCw,
  PieChart,
  Settings
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChecklistArea from './pages/ChecklistArea';
import PendingList from './pages/PendingList';
import ReportsHistory from './pages/ReportsHistory';
import SyncDashboard from './pages/SyncDashboard';
import Analytics from './pages/Analytics';
import { Area, Report, PendingItem, Turma } from './types';
import { syncToGoogleSheets, fetchCloudItems, fetchCloudData, CloudStats, DEFAULT_SCRIPT_URL } from './services/googleSync';

const VulcanLogo = ({ className = "" }: { className?: string }) => (
  <span className={`font-black tracking-tighter select-none ${className}`}>VULCAN</span>
);

const Sidebar = ({ isOpen, toggle, unsyncedCount }: { isOpen: boolean; toggle: () => void, unsyncedCount: number }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/charts', label: 'Supervisório', icon: <PieChart size={20} /> },
    { path: '/pending', label: 'Pendências', icon: <AlertCircle size={20} /> },
    { path: '/history', label: 'Histórico', icon: <FileSpreadsheet size={20} /> },
    { 
      path: '/sync', 
      label: 'Sincronização', 
      icon: <Cloud size={20} />, 
      badge: unsyncedCount > 0 ? unsyncedCount : null 
    },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={toggle} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
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
                  <Link key={item.path} to={item.path} onClick={() => window.innerWidth < 1024 && toggle()} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">{item.badge}</span>}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Checklists</p>
              <div className="space-y-1">
                {Object.values(Area).map(area => (
                  <Link key={area} to={`/checklist/${encodeURIComponent(area)}`} onClick={() => window.innerWidth < 1024 && toggle()} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname.includes(encodeURIComponent(area)) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <ClipboardCheck size={20} />
                    <span className="font-medium text-sm">{area}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

const Header = ({ onToggleSidebar, unsyncedCount }: { onToggleSidebar: () => void, unsyncedCount: number }) => (
  <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button onClick={onToggleSidebar} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"><Menu size={24} /></button>
      <h2 className="text-slate-800 font-black uppercase text-sm hidden sm:block tracking-tight">Ultrafino • Supervisório v8.0</h2>
    </div>
    <div className="flex items-center gap-4">
      {unsyncedCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full border border-amber-100 text-[9px] font-black uppercase tracking-wider animate-bounce">
          <CloudOff size={14} /> {unsyncedCount} Pendentes
        </div>
      )}
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400"><Settings size={18} /></div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [lastSyncSource, setLastSyncSource] = useState<'local' | 'cloud'>('local');

  // Inicialização robusta
  useEffect(() => {
    try {
      const savedReports = localStorage.getItem('ultrafino_reports');
      const savedPending = localStorage.getItem('ultrafino_pending');
      if (savedReports) setReports(JSON.parse(savedReports));
      if (savedPending) setPendingItems(JSON.parse(savedPending));
    } catch (e) { console.error("Initial Load Error", e); }
  }, []);

  const unsyncedCount = reports.filter(r => !r.synced).length + pendingItems.filter(p => !p.synced).length;

  const refreshDataFromCloud = useCallback(async (manualReports?: Report[], manualPending?: PendingItem[]) => {
    const scriptUrl = localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL;
    if (!scriptUrl) return;

    setIsGlobalSyncing(true);
    try {
      // Usa os dados manuais se fornecidos (evita o lag do estado do React)
      const reportsToSync = manualReports || reports;
      const pendingToSync = manualPending || pendingItems;

      const unsyncedReports = reportsToSync.filter(r => !r.synced);
      const unsyncedPending = pendingToSync.filter(p => !p.synced);

      if (unsyncedReports.length > 0 || unsyncedPending.length > 0) {
        await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending);
      }

      const [cloudItems, stats] = await Promise.all([
        fetchCloudItems(scriptUrl),
        fetchCloudData(scriptUrl)
      ]);
      
      if (stats) setCloudStats(stats);

      // Merge inteligente
      const mergedMap = new Map<string, PendingItem>();
      cloudItems.forEach(item => { if (item.tag) mergedMap.set(item.tag.trim().toUpperCase(), item); });
      pendingToSync.forEach(localItem => {
        if (!localItem.tag) return;
        const key = localItem.tag.trim().toUpperCase();
        if (!localItem.synced) mergedMap.set(key, { ...localItem, synced: true });
        else if (!mergedMap.has(key)) mergedMap.set(key, { ...localItem, synced: true });
      });

      const finalReports = reportsToSync.map(r => ({ ...r, synced: true }));
      const finalPending = Array.from(mergedMap.values());

      setReports(finalReports);
      setPendingItems(finalPending);
      
      localStorage.setItem('ultrafino_reports', JSON.stringify(finalReports));
      localStorage.setItem('ultrafino_pending', JSON.stringify(finalPending));
      setLastSyncSource('cloud');
    } catch (error) {
      console.error("Sync Error", error);
      setLastSyncSource('local');
    } finally {
      setIsGlobalSyncing(false);
    }
  }, [reports, pendingItems]);

  const addReport = (report: Report) => {
    const newReport = { ...report, synced: false };
    
    // 1. Atualiza Relatórios
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    
    // 2. Processa novas pendências do checklist
    const newPendings: PendingItem[] = [];
    (report.items || []).forEach((item, index) => {
      if (item.status === 'fail' || item.status === 'warning') {
        newPendings.push({
          id: `pend-${Date.now()}-${index}`,
          tag: item.label.toUpperCase(),
          description: item.observation?.trim().toUpperCase() || 'FALHA REPORTADA NO CHECKLIST',
          priority: item.status === 'fail' ? 'alta' : 'media',
          discipline: item.discipline || 'MECÂNICA',
          status: 'aberto',
          area: report.area,
          timestamp: Date.now(),
          operator: report.operator,
          turma: report.turma,
          synced: false
        });
      }
    });

    const updatedPending = [...pendingItems];
    if (newPendings.length > 0) {
      newPendings.forEach(newP => {
        const idx = updatedPending.findIndex(p => p.tag.trim().toUpperCase() === newP.tag.trim().toUpperCase());
        if (idx > -1) updatedPending[idx] = newP;
        else updatedPending.push(newP);
      });
      setPendingItems(updatedPending);
      localStorage.setItem('ultrafino_pending', JSON.stringify(updatedPending));
    }

    // 3. Dispara sincronismo passando os dados mais recentes imediatamente
    refreshDataFromCloud(updatedReports, updatedPending);
  };

  const resolvePending = (id: string, operatorName: string, resolvedTurma: Turma) => {
    const updated = pendingItems.map(p => 
      p.id === id ? { 
        ...p, 
        status: 'resolvido' as const, 
        resolvedBy: operatorName, 
        resolvedByTurma: resolvedTurma,
        synced: false, 
        timestamp: Date.now() 
      } : p
    );
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
    refreshDataFromCloud(reports, updated);
  };

  const onSyncSuccess = (syncedReportIds: string[], syncedPendingIds: string[]) => {
    const updatedReports = reports.map(r => syncedReportIds.includes(r.id) ? { ...r, synced: true } : r);
    const updatedPending = pendingItems.map(p => syncedPendingIds.includes(p.id) ? { ...p, synced: true } : p);
    setReports(updatedReports);
    setPendingItems(updatedPending);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    localStorage.setItem('ultrafino_pending', JSON.stringify(updatedPending));
  };

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} unsyncedCount={unsyncedCount} />
        <main className="flex-1 lg:ml-72 flex flex-col">
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} unsyncedCount={unsyncedCount} />
          <div className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard reports={reports} pendingItems={pendingItems} onRefreshCloud={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} />} />
              <Route path="/charts" element={<Analytics reports={reports} pendingItems={pendingItems} cloudStats={cloudStats} onRefresh={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} syncSource={lastSyncSource} />} />
              <Route path="/checklist/:areaName" element={<ChecklistArea onSaveReport={addReport} />} />
              <Route path="/pending" element={<PendingList pendingItems={pendingItems} onResolve={resolvePending} onRefresh={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} onAddComment={() => {}} />} />
              <Route path="/history" element={<ReportsHistory reports={reports} onAddItemComment={() => {}} />} />
              <Route path="/sync" element={<SyncDashboard reports={reports} pendingItems={pendingItems} onSyncSuccess={onSyncSuccess} />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
