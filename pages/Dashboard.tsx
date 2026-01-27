
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ChevronRight,
  ClipboardCheck,
  Zap,
  Droplets,
  Settings2,
  Filter,
  Cloud,
  CloudOff,
  // Add missing RefreshCw import
  RefreshCw
} from 'lucide-react';
import { Report, PendingItem, Area } from '../types';

interface DashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ reports, pendingItems }) => {
  const navigate = useNavigate();
  const openPending = pendingItems.filter(p => p.status === 'aberto');
  const criticalPending = openPending.filter(p => p.priority === 'alta');
  const unsyncedCount = 
    reports.filter(r => !r.synced).length + 
    pendingItems.filter(p => !p.synced).length;
  
  const getAreaStats = (area: Area) => {
    const areaReports = reports.filter(r => r.area === area);
    const hasFailures = areaReports.length > 0 && areaReports[0].items.some(i => i.status === 'fail' || i.status === 'warning');
    return {
      lastReport: areaReports.length > 0 ? new Date(areaReports[0].timestamp).toLocaleDateString() : 'Sem registros',
      status: hasFailures ? 'Com Pendências' : 'Operacional'
    };
  };

  const AreaCard = ({ area, icon, description }: { area: Area, icon: React.ReactNode, description: string }) => {
    const stats = getAreaStats(area);
    const isCritical = stats.status === 'Com Pendências';

    return (
      <button 
        onClick={() => navigate(`/checklist/${encodeURIComponent(area)}`)}
        className="group relative bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all text-left flex flex-col h-full"
      >
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${
          isCritical ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
        } group-hover:bg-blue-600 group-hover:text-white`}>
          {icon}
        </div>
        
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{area}</h3>
        <p className="text-slate-500 text-xs font-medium mb-6 flex-grow">{description}</p>
        
        <div className="pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Atual</span>
            <span className={`text-[11px] font-bold ${isCritical ? 'text-amber-600' : 'text-emerald-600'}`}>
              {stats.status}
            </span>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Painel de Controle</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Selecione uma área operacional para iniciar inspeção</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-3">
            <Activity size={18} className="text-blue-500" />
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Pendências</p>
              <p className="text-sm font-bold text-slate-900">{openPending.length}</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500" />
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Alertas</p>
              <p className="text-sm font-bold text-slate-900">{criticalPending.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AreaCard 
          area={Area.HBF_C} 
          icon={<Zap size={28} />} 
          description="Filtros de Esteira Horizontais da Planta C. Controle de vácuo e velocidades dos belts."
        />
        <AreaCard 
          area={Area.HBF_D} 
          icon={<Zap size={28} />} 
          description="Filtros de Esteira Horizontais da Planta D. Inspeção de sprays, panos e diluição."
        />
        <AreaCard 
          area={Area.BOMBEAMENTO} 
          icon={<Droplets size={28} />} 
          description="Bombas de vácuo, filtrado e spillage. Monitoramento de motores e selagem."
        />
        <AreaCard 
          area={Area.ESPESADORES} 
          icon={<Settings2 size={28} />} 
          description="Gestão de torque, rake e adição de reagentes. Controle de densidade do underflow."
        />
        <AreaCard 
          area={Area.DFP2} 
          icon={<Filter size={28} />} 
          description="Filtros de lona DFP 2. Inspeção de sopragem e unidades hidráulicas."
        />
        
        {/* Cloud Sync Status Card */}
        <button 
          onClick={() => navigate('/sync')}
          className={`p-6 rounded-2xl border-2 transition-all flex flex-col ${
            unsyncedCount > 0 
              ? 'bg-amber-50 border-amber-200 hover:shadow-lg shadow-amber-200/20' 
              : 'bg-emerald-50 border-emerald-200 hover:shadow-lg shadow-emerald-200/20'
          }`}
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
            unsyncedCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {unsyncedCount > 0 ? <CloudOff size={28} /> : <Cloud size={28} />}
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Google Drive</h3>
          <p className="text-slate-500 text-xs font-medium mb-6 flex-grow">
            {unsyncedCount > 0 
              ? `Você possui ${unsyncedCount} registros salvos localmente aguardando envio para a nuvem.`
              : 'Todos os seus dados operacionais estão sincronizados e seguros no Google Drive.'}
          </p>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              unsyncedCount > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {unsyncedCount > 0 ? 'Pendente Sincronização' : 'Base de Dados Íntegra'}
            </span>
            <RefreshCw size={18} className={unsyncedCount > 0 ? 'text-amber-500 animate-spin-slow' : 'text-emerald-500'} />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Histórico Recente</h2>
            <button onClick={() => navigate('/history')} className="text-blue-600 text-[11px] font-black uppercase tracking-widest hover:underline">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Operador</th>
                  <th className="px-6 py-4">Turno</th>
                  <th className="px-6 py-4">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.slice(0, 4).map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-800 text-xs uppercase">{report.area}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 text-xs font-bold uppercase">{report.operator || 'N/A'}</span>
                        <span className="text-slate-400 text-[10px] font-medium uppercase">Turma {report.turma}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        {report.turno}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                          report.items.every(i => i.status !== 'fail' && i.status !== 'warning') 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {report.items.every(i => i.status !== 'fail' && i.status !== 'warning') ? 'CONFORME' : 'ANOMALIAS'}
                        </span>
                        {report.synced ? <Cloud size={14} className="text-emerald-500" /> : <CloudOff size={14} className="text-amber-400" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Segurança</h3>
          <p className="text-slate-400 text-xs leading-relaxed font-medium italic">
            "Checklists precisos salvam vidas e equipamentos. Reporte qualquer anomalia imediatamente."
          </p>
          <div className="mt-6 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-xs">V</div>
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase">Gestão Operacional</p>
               <p className="text-xs font-bold">Ultrafino</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
