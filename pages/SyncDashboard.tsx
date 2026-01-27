
import React, { useState } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Server,
  // Add missing ClipboardCheck import
  ClipboardCheck
} from 'lucide-react';
import { Report, PendingItem } from '../types';

interface SyncDashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
  onSyncSuccess: (reportIds: string[], pendingIds: string[]) => void;
}

const SyncDashboard: React.FC<SyncDashboardProps> = ({ reports, pendingItems, onSyncSuccess }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  const unsyncedReports = reports.filter(r => !r.synced);
  const unsyncedPending = pendingItems.filter(p => !p.synced);
  const totalUnsynced = unsyncedReports.length + unsyncedPending.length;

  const handleSync = () => {
    if (totalUnsynced === 0) return;
    
    setIsSyncing(true);
    setProgress(0);

    // Simulação de Sincronização em Lote para Google Sheets
    // Em um cenário real, aqui enviaríamos o payload para um Google Apps Script
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          onSyncSuccess(
            unsyncedReports.map(r => r.id),
            unsyncedPending.map(p => p.id)
          );
          setIsSyncing(false);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Base de Dados Google Drive</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Sincronização mestre com planilhas de gestão</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 font-black text-[10px] uppercase">
          <Server size={14} /> Cloud Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${totalUnsynced > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
              {totalUnsynced > 0 ? <CloudOff size={32} /> : <Cloud size={32} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integridade Local</p>
              <h2 className="text-2xl font-black text-slate-800 uppercase">
                {totalUnsynced === 0 ? 'Tudo Sincronizado' : `${totalUnsynced} Pendentes`}
              </h2>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing || totalUnsynced === 0}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${
              isSyncing ? 'bg-slate-100 text-slate-400' : 
              totalUnsynced === 0 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' :
              'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 active:scale-95'
            }`}
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? `Sincronizando ${progress}%` : 'Sincronizar Agora'}
          </button>

          {isSyncing && (
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-10">
            <Database size={160} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <ExternalLink size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Link da Planilha Mestre</span>
            </div>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Todos os dados sincronizados são injetados automaticamente na planilha Google de controle da gerência.
            </p>
          </div>
          
          <div className="pt-6 border-t border-slate-800 mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase">Relatórios em Nuvem</p>
              <p className="text-xl font-black">{reports.filter(r => r.synced).length}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase">Pendências em Nuvem</p>
              <p className="text-xl font-black">{pendingItems.filter(p => p.synced).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          <Clock size={14} /> Fila de Transmissão Recente
        </h3>
        
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {[...unsyncedReports, ...unsyncedPending].slice(0, 10).map((item, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                    {'tag' in item ? <AlertCircle size={20} /> : <ClipboardCheck size={20} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      {'tag' in item ? `PENDÊNCIA: ${item.tag}` : `RELATÓRIO: ${item.area}`}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      ID: {item.id.split('-')[1]} • {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black px-2 py-1 bg-amber-100 text-amber-700 rounded-md uppercase">Aguardando</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            ))}
            {totalUnsynced === 0 && (
              <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Base de dados 100% íntegra na nuvem</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncDashboard;
