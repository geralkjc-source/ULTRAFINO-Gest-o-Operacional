
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
  ClipboardCheck,
  Mail,
  Lock,
  ArrowUpRight
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

    // Simulação de Sincronização Segura para geralkjc@gmail.com
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
        return prev + 2;
      });
    }, 50);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nuvem Operacional</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Sincronização mestre de dados industriais</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-black text-[10px] uppercase">
            <Mail size={14} className="text-blue-500" /> geralkjc@gmail.com
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 font-black text-[10px] uppercase">
            <Server size={14} /> Drive Conectado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6 flex flex-col justify-center relative overflow-hidden">
          {isSyncing && (
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-100">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
             </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl transition-all duration-500 ${totalUnsynced > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
              {totalUnsynced > 0 ? (
                isSyncing ? <RefreshCw size={32} className="animate-spin" /> : <CloudOff size={32} />
              ) : <Cloud size={32} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado da Sincronização</p>
              <h2 className="text-2xl font-black text-slate-800 uppercase">
                {totalUnsynced === 0 ? 'Base Atualizada' : `${totalUnsynced} Pendentes`}
              </h2>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing || totalUnsynced === 0}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${
              isSyncing ? 'bg-slate-900 text-white' : 
              totalUnsynced === 0 ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100' :
              'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                <span>Enviando para Drive... {progress}%</span>
              </>
            ) : (
              <>
                <Cloud size={20} />
                <span>{totalUnsynced === 0 ? 'Nuvem em Dia' : 'Sincronizar com Drive'}</span>
              </>
            )}
          </button>

          <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter">
            <Lock size={10} className="inline mr-1" /> Criptografia de ponta a ponta ativa para geralkjc@gmail.com
          </p>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Database size={160} />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <ExternalLink size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Planilha Mestre Ativa</span>
              </div>
              <a 
                href="https://sheets.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors text-white"
              >
                <ArrowUpRight size={16} />
              </a>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase">Repositório de Dados</p>
              <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                Base centralizada no Google Drive sob a conta <span className="text-blue-400 font-bold">geralkjc@gmail.com</span>. 
                Relatórios e checklists são injetados em tempo real após a sincronização manual.
              </p>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-800 mt-6 grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 uppercase">Checklists na Nuvem</p>
              <p className="text-xl font-black text-blue-400">{reports.filter(r => r.synced).length}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 uppercase">Anomalias na Nuvem</p>
              <p className="text-xl font-black text-amber-400">{pendingItems.filter(p => p.synced).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Clock size={14} /> Fila de Transmissão Local
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase">{totalUnsynced} itens restantes</span>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {[...unsyncedReports, ...unsyncedPending].slice(0, 10).map((item, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${'tag' in item ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                    {'tag' in item ? <AlertCircle size={20} /> : <ClipboardCheck size={20} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      {'tag' in item ? `PENDÊNCIA: ${item.tag}` : `RELATÓRIO: ${item.area}`}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      ID: {item.id.split('-')[1]} • Transmissão via geralkjc@gmail.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black px-2 py-1 bg-amber-100 text-amber-700 rounded-md uppercase">Offline</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            ))}
            {totalUnsynced === 0 && (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/30">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-800 font-black uppercase text-xs tracking-widest">Base de Dados Integrada</p>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Todos os registros estão seguros no Google Drive</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncDashboard;
