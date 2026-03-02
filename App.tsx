
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Settings,
  Calendar,
  Award,
  Zap
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChecklistArea from './pages/ChecklistArea';
import PendingList from './pages/PendingList';
import ReportsHistory from './pages/ReportsHistory';
import SyncDashboard from './pages/SyncDashboard';
import Analytics from './pages/Analytics';
import ShiftCalendar from './pages/ShiftCalendar';
import OperationalForms from './pages/OperationalForms';
import DFPResults from './pages/DFPResults';
import ManualPendingForm from './pages/ManualPendingForm';
import { Area, Report, PendingItem, Turma, QualityReport } from './types';
import { syncToGoogleSheets, fetchCloudItems, fetchCloudReports, fetchCloudQualityReports, fetchCloudData, CloudStats, DEFAULT_SCRIPT_URL } from './services/googleSync';

const VulcanLogo = ({ className = "" }: { className?: string }) => (
  <span className={`font-black tracking-tighter select-none ${className}`}>VULCAN</span>
);

/**
 * Omni-Sync Monitor
 * Componente interno que observa a mudança de rotas para disparar o sincronismo automático.
 */
const OmniSyncMonitor = ({ onNavigate }: { onNavigate: () => void }) => {
  const location = useLocation();
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      onNavigate();
      lastPath.current = location.pathname;
    }
  }, [location, onNavigate]);

  return null;
};

const Sidebar = ({ isOpen, toggle, unsyncedCount }: { isOpen: boolean; toggle: () => void, unsyncedCount: number }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/calendar', label: 'Escala 2026', icon: <Calendar size={20} /> },
    { path: '/charts', label: 'Supervisório', icon: <PieChart size={20} /> },
    { path: '/pending', label: 'Pendências', icon: <AlertCircle size={20} /> },
    { path: '/history', label: 'Histórico', icon: <FileSpreadsheet size={20} /> },
    { 
      path: '/sync', 
      label: 'Sincronização', 
      icon: <Cloud size={20} />, 
      badge: unsyncedCount > 0 ? unsyncedCount : null 
    },
    { path: '/dfp', label: 'Qualidade e Yield', icon: <PieChart size={20} /> },
    { path: '/forms', label: 'Formulários Operacionais', icon: <FileSpreadsheet size={20} /> },
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
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">USINA 2</h1>
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

const Header = ({ onToggleSidebar, unsyncedCount, isSyncing }: { onToggleSidebar: () => void, unsyncedCount: number, isSyncing: boolean }) => (
  <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button onClick={onToggleSidebar} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"><Menu size={24} /></button>
      <div className="flex flex-col">
        <h2 className="text-slate-800 font-black uppercase text-xs tracking-tight">Plataforma Ultrafino Usina 2</h2>
        {isSyncing && (
          <div className="flex items-center gap-1.5 text-blue-600 text-[8px] font-black uppercase animate-pulse">
            <RefreshCw size={8} className="animate-spin" /> Atualizando Nuvem...
          </div>
        )}
      </div>
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
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [lastSyncSource, setLastSyncSource] = useState<'local' | 'cloud'>('local');

  // Carregamento Inicial
  useEffect(() => {
    try {
      const savedReports = localStorage.getItem('ultrafino_reports');
      const savedPending = localStorage.getItem('ultrafino_pending');
      const savedQuality = localStorage.getItem('ultrafino_quality');
      if (savedReports) setReports(JSON.parse(savedReports));
      if (savedPending) setPendingItems(JSON.parse(savedPending));
      if (savedQuality) setQualityReports(JSON.parse(savedQuality));
    } catch (e) { console.error("Initial Load Error", e); }
  }, []);

  const unsyncedCount = reports.filter(r => !r.synced).length + pendingItems.filter(p => !p.synced).length;

  /**
   * Omni-Sync Function
   * Sincroniza dados locais com a nuvem e busca novidades.
   */
  const refreshDataFromCloud = useCallback(async (manualReports?: Report[], manualPending?: PendingItem[], manualQualityReports?: QualityReport[]) => {
    const scriptUrl = localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL;
    if (!scriptUrl) return;

    setIsGlobalSyncing(true);
    try {
      const reportsToSync = manualReports || reports;
      const pendingToSync = manualPending || pendingItems;
      const qualityReportsToSync = manualQualityReports || qualityReports;

      const unsyncedReports = reportsToSync.filter(r => !r.synced);
      const unsyncedPending = pendingToSync.filter(p => !p.synced);
      const unsyncedQualityReports = qualityReportsToSync.filter(qr => !qr.synced);

      // Envia o que está pendente localmente
      if (unsyncedReports.length > 0 || unsyncedPending.length > 0 || unsyncedQualityReports.length > 0) {
        await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending, unsyncedQualityReports);
      }

      // Busca dados atualizados da planilha (Garante hora correta)
      const [cloudPending, cloudReports, cloudQualityReports, stats] = await Promise.all([

        fetchCloudItems(scriptUrl),
        fetchCloudReports(scriptUrl),
        fetchCloudQualityReports(scriptUrl),
        fetchCloudData(scriptUrl)
      ]);
      
      if (stats) setCloudStats(stats);

      // Mesclagem Blindada: Prioridade para dados da nuvem (Vem com a hora fixa da planilha)
      const reportsMap = new Map<string, Report>();
      cloudReports.forEach(r => reportsMap.set(r.id, r));
      reportsToSync.forEach(lr => {
        if (!lr.synced || !reportsMap.has(lr.id)) reportsMap.set(lr.id, { ...lr, synced: true });
      });

      const pendingMap = new Map<string, PendingItem>();
      cloudPending.forEach(p => pendingMap.set(p.id, p));
      pendingToSync.forEach(lp => {
        if (!lp.synced || !pendingMap.has(lp.id)) pendingMap.set(lp.id, { ...lp, synced: true });
      });

      const qualityReportsMap = new Map<string, QualityReport>();
      cloudQualityReports.forEach(qr => qualityReportsMap.set(qr.id, qr));
      qualityReportsToSync.forEach(lqr => {
        if (!lqr.synced || !qualityReportsMap.has(lqr.id)) qualityReportsMap.set(lqr.id, { ...lqr, synced: true });
      });

      const finalReports = Array.from(reportsMap.values());
      const finalPending = Array.from(pendingMap.values());
      const finalQualityReports = Array.from(qualityReportsMap.values());

      setReports(finalReports);
      setPendingItems(finalPending);
      setQualityReports(finalQualityReports);
      
      localStorage.setItem('ultrafino_reports', JSON.stringify(finalReports));
      localStorage.setItem('ultrafino_pending', JSON.stringify(finalPending));
      localStorage.setItem('ultrafino_quality', JSON.stringify(finalQualityReports));
      setLastSyncSource('cloud');
    } catch (error) {
      console.error("Sync Error", error);
      setLastSyncSource('local');
    } finally {
      setIsGlobalSyncing(false);
    }
  }, [reports, pendingItems]);

  // Disparo de Sync ao entrar no App
  useEffect(() => {
    refreshDataFromCloud();
  }, []);

  const addReport = (report: Report) => {
    const newReport = { ...report, synced: false };
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    
    const newPendings: PendingItem[] = [];
    let lastParentTag = "";

    (report.items || []).forEach((item, index) => {
      const label = item.label;
      const labelLower = label.toLowerCase();
      const isSubItem = label.startsWith('-');
      if (!isSubItem && !label.startsWith('SECTION:') && /^[0-9][A-Z]-/.test(label)) lastParentTag = label;
      
      const isAuxiliary = labelLower.includes('retorno do tanque 104') || 
                          labelLower.includes('corse seeding') || 
                          labelLower.includes('valvula de diluicao');

      if ((item.status === 'fail' || item.status === 'warning') && !isAuxiliary) {
        // Não gera pendência para 'ALIMENTANDO COLUNAS?' se o status for 'fail' (NÃO)
        if (item.label === 'ALIMENTANDO COLUNAS?' && item.status === 'fail') {
          return;
        }

        const finalTag = (isSubItem && lastParentTag) 
          ? `${label.replace('-', '').trim()} ${lastParentTag}`.toUpperCase()
          : label.toUpperCase();

        newPendings.push({
          id: `pend-${Date.now()}-${index}`,
          tag: finalTag,
          description: item.observation?.trim().toUpperCase() || 'FALHA REPORTADA NO CHECKLIST',
          priority: item.status === 'fail' ? 'alta' : 'media',
          discipline: item.discipline || 'MECÂNICA',
          status: 'aberto',
          area: report.area,
          timestamp: Date.now(),
          operator: report.operator,
          turma: report.turma,
          turno: report.turno, 
          synced: false
        });
      }
    });

    const updatedPending = [...pendingItems, ...newPendings];
    setPendingItems(updatedPending);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updatedPending));
    
    // Sync imediato após envio
    refreshDataFromCloud(updatedReports, updatedPending);
  };

  const resolvePending = (id: string, operatorName: string, resolvedTurma: Turma) => {
    const updated = pendingItems.map(p => 
      p.id === id ? { 
        ...p, 
        status: 'resolvido' as const, 
        resolvedBy: operatorName, 
        resolvedByTurma: resolvedTurma,
        resolvedAt: Date.now(), 
        synced: false
      } : p
    );
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
    
    // Sync imediato após resolução
    refreshDataFromCloud(reports, updated);
  };

  const addManualPending = (pending: PendingItem) => {
    const updated = [...pendingItems, { ...pending, synced: false }];
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
    refreshDataFromCloud(reports, updated);
  };

  const addQualityReport = (report: QualityReport) => {
    const newReport = { ...report, synced: false };
    const updated = [newReport, ...qualityReports];
    setQualityReports(updated);
    localStorage.setItem('ultrafino_quality', JSON.stringify(updated));
    refreshDataFromCloud(reports, pendingItems, updated);
  };

  const onSyncSuccess = (syncedReportIds: string[], syncedPendingIds: string[], syncedQualityReportIds: string[]) => {
    const updatedReports = reports.map(r => syncedReportIds.includes(r.id) ? { ...r, synced: true } : r);
    const updatedPending = pendingItems.map(p => syncedPendingIds.includes(p.id) ? { ...p, synced: true } : p);
    const updatedQualityReports = qualityReports.map(qr => syncedQualityReportIds.includes(qr.id) ? { ...qr, synced: true } : qr);
    setReports(updatedReports);
    setPendingItems(updatedPending);
    setQualityReports(updatedQualityReports);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    localStorage.setItem('ultrafino_pending', JSON.stringify(updatedPending));
    localStorage.setItem('ultrafino_quality', JSON.stringify(updatedQualityReports));
  };

  return (
    <HashRouter>
      <OmniSyncMonitor onNavigate={() => refreshDataFromCloud()} />
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} unsyncedCount={unsyncedCount} />
        <main className="flex-1 lg:ml-72 flex flex-col">
          <Header 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            unsyncedCount={unsyncedCount} 
            isSyncing={isGlobalSyncing} 
          />
          <div className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard reports={reports} pendingItems={pendingItems} qualityReports={qualityReports} onRefreshCloud={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} />} />
              <Route path="/calendar" element={<ShiftCalendar />} />
              <Route path="/charts" element={<Analytics reports={reports} pendingItems={pendingItems} cloudStats={cloudStats} onRefresh={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} syncSource={lastSyncSource} />} />
              <Route path="/checklist/:areaName" element={<ChecklistArea onSaveReport={addReport} />} />
              <Route path="/pending" element={<PendingList pendingItems={pendingItems} onResolve={resolvePending} onRefresh={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} onAddComment={() => {}} />} />
              <Route path="/history" element={<ReportsHistory reports={reports} pendingItems={pendingItems} onAddItemComment={() => {}} />} />
              <Route path="/sync" element={<SyncDashboard reports={reports} pendingItems={pendingItems} onSyncSuccess={onSyncSuccess} />} />
              <Route path="/dfp" element={<DFPResults onSaveQualityReport={addQualityReport} qualityReports={qualityReports} />} />
              <Route path="/forms" element={<OperationalForms onAddManualPending={addManualPending} />} />
              <Route path="/manual-pending" element={<ManualPendingForm onAddManualPending={addManualPending} />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
