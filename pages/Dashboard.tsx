
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ChevronRight,
  Zap,
  Droplets,
  Settings2,
  Filter,
  Cloud,
  CloudOff,
  RefreshCw,
  RotateCw,
  Wifi,
  WifiOff,
  Calendar,
  Clock,
  Coffee,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Report, PendingItem, Area, Turma } from '../types';
import { getScaleForDate, getStatusForTurma } from '../services/shiftService';

interface DashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
  onRefreshCloud: () => Promise<void>;
  isRefreshing: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ reports, pendingItems, onRefreshCloud, isRefreshing }) => {
  const navigate = useNavigate();
  const [todayScale, setTodayScale] = useState(getScaleForDate(new Date()));

  const unsyncedCount = 
    reports.filter(r => !r.synced).length + 
    pendingItems.filter(p => !p.synced).length;
  
  const getAreaStats = (area: Area) => {
    const areaReports = reports.filter(r => r.area === area);
    const areaPending = pendingItems.filter(p => p.area === area && p.status === 'aberto');
    const hasFailures = areaPending.length > 0;
    
    return {
      lastReport: areaReports.length > 0 ? new Date(areaReports[0].timestamp).toLocaleDateString() : 'Sem registros',
      status: hasFailures ? `${areaPending.length} Pendências` : 'Operacional',
      hasFailures
    };
  };

  const AreaCard = ({ area, icon, description }: { area: Area, icon: React.ReactNode, description: string }) => {
    const stats = getAreaStats(area);
    const isCritical = stats.hasFailures;

    return (
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all flex flex-col h-full overflow-hidden group">
        {/* Parte Superior: Direciona para o Checklist */}
        <button 
          onClick={() => navigate(`/checklist/${encodeURIComponent(area)}`)}
          className="p-6 text-left flex-grow w-full focus:outline-none"
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${
            isCritical ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
          } group-hover:bg-blue-600 group-hover:text-white`}>
            {icon}
          </div>
          
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{area}</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 leading-relaxed">{description}</p>
        </button>
        
        {/* Parte Inferior: Direciona para Pendências Filtradas */}
        <button 
          onClick={() => navigate(`/pending?area=${encodeURIComponent(area)}`)}
          className={`px-6 py-4 border-t border-slate-50 flex items-center justify-between transition-colors ${
            isCritical ? 'bg-amber-50/50 hover:bg-amber-100/80' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Atual</span>
            <div className="flex items-center gap-1.5">
              {isCritical && <AlertCircle size={10} className="text-amber-600 animate-pulse" />}
              <span className={`text-[10px] font-black uppercase ${isCritical ? 'text-amber-600' : 'text-emerald-600'}`}>
                {stats.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase opacity-0 group-hover:opacity-100 transition-all">
            Ver Pendências <ChevronRight size={14} />
          </div>
        </button>
      </div>
    );
  };

  const getTurmaCardColor = (turma: Turma) => {
    switch (turma) {
      case 'A': return 'bg-yellow-400 text-slate-900 border-yellow-500';
      case 'B': return 'bg-orange-500 text-white border-orange-600';
      case 'C': return 'bg-emerald-500 text-white border-emerald-600';
      case 'D': return 'bg-sky-500 text-white border-sky-600';
      default: return 'bg-slate-900 text-white border-slate-900';
    }
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Painel de Controle</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gestão de Checklists e Ativos em Tempo Real</p>
        </div>
      </div>

      <button 
        onClick={() => navigate('/calendar')}
        className="w-full text-left bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm p-6 overflow-hidden relative group hover:border-blue-500 transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg group-hover:bg-blue-600 transition-colors">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Escala Operacional 2026</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
            Ver Escala Completa <ExternalLink size={14} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['A', 'B', 'C', 'D'] as Turma[]).map(t => {
            const status = getStatusForTurma(new Date(), t);
            return (
              <div key={t} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${status.isWorking ? 'border-slate-200 bg-white' : 'border-slate-50 bg-slate-50/50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border ${status.isWorking ? getTurmaCardColor(t) : 'bg-white text-slate-300 border-slate-100'}`}>
                    {t}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${status.isWorking ? 'text-slate-900' : 'text-slate-400'}`}>Turma {t}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {status.turno === 'FOLGA' ? <Coffee size={12} className="text-slate-300" /> : <Clock size={12} className="text-blue-500" />}
                      <span className={`text-[9px] font-bold uppercase ${status.turno === 'FOLGA' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {status.turno}
                      </span>
                    </div>
                  </div>
                </div>
                {status.isWorking && (
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border bg-slate-900 text-white`}>
                    Ativo
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AreaCard 
          area={Area.HBF_C} 
          icon={<Zap size={28} />} 
          description="Filtros de Esteira Planta C. Controle de vácuo e velocidades."
        />
        <AreaCard 
          area={Area.HBF_D} 
          icon={<Zap size={28} />} 
          description="Filtros de Esteira Planta D. Inspeção de sprays e panos."
        />
        <AreaCard 
          area={Area.BOMBEAMENTO} 
          icon={<Droplets size={28} />} 
          description="Bombas de vácuo e filtrado. Motores e selagem."
        />
        <AreaCard 
          area={Area.ESPESADORES} 
          icon={<Settings2 size={28} />} 
          description="Torque, rake e reagentes. Densidade do underflow."
        />
        <AreaCard 
          area={Area.DFP2} 
          icon={<Filter size={28} />} 
          description="Filtros de lona DFP 2. Sopragem e hidráulica."
        />
        
        <div className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col justify-between ${
          unsyncedCount > 0 
            ? 'bg-amber-50 border-amber-200 shadow-xl shadow-amber-200/20' 
            : 'bg-emerald-50 border-emerald-200 shadow-xl shadow-emerald-200/20'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              unsyncedCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {unsyncedCount > 0 ? <WifiOff size={24} /> : <Wifi size={24} />}
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${unsyncedCount > 0 ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                {unsyncedCount > 0 ? 'MODO OFFLINE' : 'MODO ONLINE'}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sincronização Google</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 leading-relaxed">
              {unsyncedCount > 0 
                ? `Existem ${unsyncedCount} registros locais para enviar.`
                : 'Seu banco de dados local está totalmente sincronizado.'}
            </p>
          </div>

          <button 
            onClick={onRefreshCloud}
            disabled={isRefreshing}
            className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 ${
              isRefreshing 
                ? 'bg-slate-900 text-white animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            {isRefreshing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {isRefreshing ? 'SICRONISANDO...' : 'OBTER DADOS ONLINE'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Histórico Recente</h2>
            <button onClick={() => navigate('/history')} className="text-blue-600 text-[11px] font-black uppercase tracking-widest hover:underline">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Operador</th>
                  <th className="px-6 py-4">Turno</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.slice(0, 5).map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-800 text-xs uppercase">{report.area}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 text-xs font-bold uppercase">{report.operator || 'N/A'}</span>
                        <span className="text-slate-400 text-[9px] font-black uppercase">Turma {report.turma}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        {report.turno}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {report.synced ? <Cloud size={14} className="text-emerald-500" /> : <CloudOff size={14} className="text-amber-400" />}
                        <span className={`text-[9px] font-black uppercase ${report.synced ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {report.synced ? 'Nuvem' : 'Local'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center border-4 border-slate-800">
          <div className="absolute top-0 right-0 p-8 opacity-10 animate-spin-slow">
            <RotateCw size={140} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tighter mb-2 relative z-10">Segurança em Primeiro Lugar</h3>
          <p className="text-slate-400 text-[11px] leading-relaxed font-bold uppercase tracking-wider italic relative z-10">
            "Checklists precisos salvam vidas e equipamentos. Reporte anomalias imediatamente."
          </p>
          <div className="mt-8 flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-lg shadow-lg shadow-blue-600/20">V</div>
             <div>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gestão de Planta</p>
               <p className="text-xs font-black uppercase">Ultrafino 2026</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
