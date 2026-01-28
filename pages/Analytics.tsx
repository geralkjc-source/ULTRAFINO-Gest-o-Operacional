
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  RotateCw,
  ArrowRight,
  Zap,
  Droplets,
  Settings2,
  Filter,
  CheckCircle2,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { Report, PendingItem, Area } from '../types';
import { CloudStats } from '../services/googleSync';

interface AnalyticsProps {
  reports: Report[];
  pendingItems: PendingItem[];
  cloudStats: CloudStats | null;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  syncSource: 'local' | 'cloud';
}

const Analytics: React.FC<AnalyticsProps> = ({ 
  reports = [], 
  pendingItems = [], 
  cloudStats, 
  onRefresh, 
  isRefreshing,
  syncSource 
}) => {
  const navigate = useNavigate();

  // Processamento do Supervisório baseado exclusivamente no estado consolidado (Prop)
  const areaHealth = useMemo(() => {
    try {
      const today = new Date().toLocaleDateString('pt-BR');
      
      return Object.values(Area).map(area => {
        // As pendências já vem mescladas da Prop global do App.tsx
        const areaPendenciesOpen = pendingItems.filter(p => p.area === area && p.status === 'aberto');
        
        const hasCritical = areaPendenciesOpen.some(p => p.priority === 'alta');
        const hasAnomaly = areaPendenciesOpen.some(p => p.priority === 'media');

        const reportedToday = reports.find(r => 
          r && r.area === area && 
          new Date(r.timestamp).toLocaleDateString('pt-BR') === today
        );

        let status: 'critical' | 'anomaly' | 'ok' | 'standby' = 'standby';
        if (hasCritical) status = 'critical';
        else if (hasAnomaly) status = 'anomaly';
        else if (reportedToday) status = 'ok';

        return {
          area,
          status,
          pendenciesCount: areaPendenciesOpen.length,
          lastUpdate: reportedToday ? new Date(reportedToday.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
        };
      });
    } catch (e) {
      console.error("Erro no processamento Analytics:", e);
      return [];
    }
  }, [reports, pendingItems]);

  const statsSummary = useMemo(() => {
    // Se temos estatísticas da nuvem, usamos elas. Caso contrário, calculamos o local.
    if (cloudStats && syncSource === 'cloud') {
       return { 
         total: cloudStats.total || areaHealth.length,
         ok: cloudStats.ok || areaHealth.filter(a => a.status === 'ok').length
       };
    }
    const okCount = areaHealth.filter(a => a.status === 'ok').length;
    return { ok: okCount, total: areaHealth.length || 1 };
  }, [areaHealth, cloudStats, syncSource]);

  const AreaNode = ({ data }: { data: typeof areaHealth[0] }) => {
    const icons: Record<string, React.ReactNode> = {
      [Area.HBF_C]: <Zap size={20} />,
      [Area.HBF_D]: <Zap size={20} />,
      [Area.BOMBEAMENTO]: <Droplets size={20} />,
      [Area.ESPESADORES]: <Settings2 size={20} />,
      [Area.DFP2]: <Filter size={20} />
    };

    const statusConfig = {
      critical: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', label: 'PARADA CRÍTICA', pulse: 'animate-pulse' },
      anomaly: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]', label: 'ANOMALIA', pulse: '' },
      ok: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-500', shadow: '', label: 'OPERACIONAL', pulse: '' },
      standby: { bg: 'bg-slate-800/50', border: 'border-slate-700', text: 'text-slate-500', shadow: '', label: 'STANDBY', pulse: '' }
    };

    const config = statusConfig[data.status] || statusConfig.standby;

    return (
      <div 
        onClick={() => navigate('/pending')}
        className={`relative group cursor-pointer p-5 rounded-2xl border-2 transition-all duration-500 ${config.bg} ${config.border} ${config.shadow} ${config.pulse} hover:scale-[1.02]`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-lg bg-slate-900 ${config.text}`}>
            {icons[data.area] || <Activity size={20} />}
          </div>
          <div className="text-right">
            <span className={`text-[9px] font-black uppercase tracking-widest ${config.text}`}>
              {config.label}
            </span>
            {data.lastUpdate && (
              <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Sinc: {data.lastUpdate}</p>
            )}
          </div>
        </div>
        <h3 className="text-sm font-black text-white uppercase mb-4 tracking-tight">{data.area}</h3>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div className="flex -space-x-2">
            {data.pendenciesCount > 0 ? (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-900 ${config.text} bg-slate-800`}>
                {data.pendenciesCount}
              </div>
            ) : (
              <CheckCircle2 size={16} className="text-emerald-500" />
            )}
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            Supervisório de Planta
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Status Geral</p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${syncSource === 'cloud' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {syncSource === 'cloud' ? <Wifi size={10} /> : <WifiOff size={10} />}
              {syncSource === 'cloud' ? 'MODO ONLINE' : 'Modo Offline'}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Sincronizando...' : 'Obter Dados Online'}
          </button>
        </div>
      </div>

      <div className="bg-slate-950 p-8 md:p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {areaHealth.map(data => (
            <AreaNode key={data.area} data={data} />
          ))}
        </div>
        
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5 relative z-10">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saúde Global</p>
              <div className="text-2xl font-black text-blue-500">
                {statsSummary.total > 0 ? Math.round((statsSummary.ok / statsSummary.total) * 100) : 0}%
              </div>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 px-6 py-3 rounded-2xl flex items-center gap-4">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
              <Database size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Conectividade</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{syncSource === 'cloud' ? 'Sincronizado via Google' : 'Usando Banco Local'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
