
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  RotateCw,
  PieChart,
  Cloud,
  AlertCircle,
  Database,
  ArrowRight,
  CalendarCheck,
  Zap,
  Droplets,
  Settings2,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Report, PendingItem, Area } from '../types';
import { fetchCloudData, CloudStats, fetchCloudItems, DEFAULT_SCRIPT_URL } from '../services/googleSync';

interface AnalyticsProps {
  reports: Report[];
  pendingItems: PendingItem[];
}

const Analytics: React.FC<AnalyticsProps> = ({ reports, pendingItems }) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [cloudPending, setCloudPending] = useState<PendingItem[]>([]);
  const [lastUpdateSource, setLastUpdateSource] = useState<'local' | 'cloud'>('local');

  const scriptUrl = localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL;

  // Lógica de Saúde Master - Sincroniza Local + Nuvem para os Gráficos
  const areaHealth = useMemo(() => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    // 1. Unir pendências locais e nuvem removendo duplicatas por TAG
    const allPendingMap = new Map<string, PendingItem>();
    
    // Adiciona da nuvem
    cloudPending.forEach(cp => allPendingMap.set(cp.tag.toUpperCase(), cp));
    // Adiciona locais (Locais mandam: se resolvi no tablet, vale o local resolvido)
    pendingItems.forEach(lp => {
      const tag = lp.tag.toUpperCase();
      const existing = allPendingMap.get(tag);
      if (!existing || lp.timestamp >= existing.timestamp || lp.status === 'resolvido') {
        allPendingMap.set(tag, lp);
      }
    });

    const combinedPendencies = Array.from(allPendingMap.values());

    return Object.values(Area).map(area => {
      // 2. Filtra pendências estritamente ABERTAS para esta área
      const areaPendenciesOpen = combinedPendencies.filter(p => p.area === area && p.status === 'aberto');
      const hasCritical = areaPendenciesOpen.some(p => p.priority === 'alta');
      const hasAnomaly = areaPendenciesOpen.some(p => p.priority === 'media');

      // 3. Verifica reporte de hoje
      const reportedToday = reports.find(r => 
        r.area === area && 
        new Date(r.timestamp).toLocaleDateString('pt-BR') === today
      );

      let status: 'critical' | 'anomaly' | 'ok' | 'standby' = 'standby';
      
      if (hasCritical) status = 'critical';
      else if (hasAnomaly) status = 'anomaly';
      else if (reportedToday) {
        // Se reportou hoje e não tem pendência aberta na lista master, está OK
        status = 'ok';
      }

      return {
        area,
        status,
        pendenciesCount: areaPendenciesOpen.length,
        lastUpdate: reportedToday ? new Date(reportedToday.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null,
        tags: areaPendenciesOpen.map(p => p.tag)
      };
    });
  }, [reports, pendingItems, cloudPending]);

  const statsSummary = useMemo(() => {
    const counts = { critical: 0, anomaly: 0, ok: 0, standby: 0 };
    areaHealth.forEach(a => counts[a.status]++);
    return { ...counts, total: areaHealth.length };
  }, [areaHealth]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [stats, items] = await Promise.all([
        fetchCloudData(scriptUrl),
        fetchCloudItems(scriptUrl)
      ]);

      if (stats) setCloudStats(stats);
      if (items.length > 0) setCloudPending(items);
      
      setLastUpdateSource('cloud');
    } catch (err) {
      console.error("Erro ao sincronizar com a nuvem");
      setLastUpdateSource('local');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { handleRefresh(); }, []);

  const AreaNode = ({ data }: { data: typeof areaHealth[0]; key?: React.Key }) => {
    const icons = {
      [Area.HBF_C]: <Zap size={20} />,
      [Area.HBF_D]: <Zap size={20} />,
      [Area.BOMBEAMENTO]: <Droplets size={20} />,
      [Area.ESPESADORES]: <Settings2 size={20} />,
      [Area.DFP2]: <Filter size={20} />
    };

    const statusConfig = {
      critical: { 
        bg: 'bg-red-500/10', 
        border: 'border-red-500', 
        text: 'text-red-500', 
        shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        label: 'PARADA CRÍTICA',
        pulse: 'animate-pulse'
      },
      anomaly: { 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500', 
        text: 'text-amber-500', 
        shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        label: 'ANOMALIA',
        pulse: ''
      },
      ok: { 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500', 
        text: 'text-emerald-500', 
        shadow: '',
        label: 'OPERACIONAL',
        pulse: ''
      },
      standby: { 
        bg: 'bg-slate-800/50', 
        border: 'border-slate-700', 
        text: 'text-slate-500', 
        shadow: '',
        label: 'STANDBY',
        pulse: ''
      }
    };

    const config = statusConfig[data.status];

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
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-900 ${config.bg.replace('/10', '')} ${config.text}`}>
                {data.pendenciesCount}
              </div>
            ) : (
              <CheckCircle2 size={16} className="text-emerald-500" />
            )}
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
        </div>

        {data.status === 'critical' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="w-full h-[2px] bg-red-500/50 absolute top-0 animate-[scan_3s_linear_infinite]" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <style>{`
        @keyframes scan {
          from { top: 0%; }
          to { top: 100%; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            Supervisório de Planta
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Visualização em Tempo Real</p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${lastUpdateSource === 'cloud' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {lastUpdateSource === 'cloud' ? <Wifi size={10} /> : <WifiOff size={10} />}
              {lastUpdateSource === 'cloud' ? 'Planilha Ativa' : 'Base Local'}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-4">
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span className="text-[10px] font-black text-slate-600 uppercase">{statsSummary.critical} Críticos</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-amber-500" />
               <span className="text-[10px] font-black text-slate-600 uppercase">{statsSummary.anomaly} Alertas</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-black text-slate-600 uppercase">{statsSummary.ok} OK</span>
             </div>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Recarregar Nuvem
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="bg-slate-950 p-8 md:p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]" />
        
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
                {Math.round((statsSummary.ok / areaHealth.length) * 100)}%
              </div>
            </div>
            <div className="w-[2px] h-10 bg-white/5" />
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Equipamentos OK</p>
              <div className="text-2xl font-black text-emerald-500">
                {areaHealth.filter(a => a.status === 'ok').length}/{areaHealth.length}
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 px-6 py-3 rounded-2xl flex items-center gap-4">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
              <Database size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Dados Sincronizados</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Master Sheets Ultrafino</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
