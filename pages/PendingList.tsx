
import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  RotateCw,
  UserCheck,
  Check,
  Wrench,
  Zap,
  Cpu,
  UserCog,
  Copy
} from 'lucide-react';
import { PendingItem, Area, Turma, Discipline } from '../types';
import { exportToExcel } from '../services/excelExport';
import { formatSummaryForWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface PendingListProps {
  pendingItems: PendingItem[];
  onResolve: (id: string, operatorName: string, resolvedTurma: Turma) => void;
  onAddComment: (id: string, text: string) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const PendingList: React.FC<PendingListProps> = ({ pendingItems = [], onResolve, onRefresh, isRefreshing }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('Tudo');
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'resolvido' | 'Tudo'>('aberto');
  
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolverName, setResolverName] = useState('');
  const [resolverTurma, setResolverTurma] = useState<Turma>('A');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const filteredItems = pendingItems.filter(item => {
    if (!item) return false;
    const matchesSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    return matchesSearch && matchesArea && matchesStatus;
  });

  const disciplineConfig: Record<Discipline, { icon: React.ReactNode, color: string, bg: string }> = {
    'MECÂNICA': { icon: <Wrench size={12} />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    'ELÉTRICA': { icon: <Zap size={12} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    'INSTRUMENTAÇÃO': { icon: <Cpu size={12} />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    'OPERAÇÃO': { icon: <UserCog size={12} />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
  };

  const handleExport = () => {
    const data = filteredItems.map(item => ({
      'TAG': item.tag, 'ÁREA': item.area, 'DISCIPLINA': item.discipline, 'DESCRIÇÃO': item.description,
      'STATUS': item.status.toUpperCase(), 'RESOLVIDO POR': item.resolvedBy || '-', 'TURMA RESOLUÇÃO': item.resolvedByTurma || '-'
    }));
    exportToExcel(data, 'Pendencias_Ultrafino');
  };

  const handleCopySummary = async () => {
    const text = formatSummaryForWhatsApp(filteredItems, "Resumo gerado via plataforma.");
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const submitResolution = () => {
    if (resolvingId && resolverName.trim()) {
      onResolve(resolvingId, resolverName.trim().toUpperCase(), resolverTurma);
      setResolvingId(null);
      setResolverName('');
    }
  };

  return (
    <div className="space-y-6">
      {resolvingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><UserCheck size={32} /></div>
            <h2 className="text-xl font-black text-slate-900 uppercase text-center">Baixar Pendência</h2>
            <div className="space-y-4">
              <input type="text" placeholder="SEU NOME..." autoFocus value={resolverName} onChange={(e) => setResolverName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-center uppercase outline-none focus:ring-2 focus:ring-emerald-500" />
              <div className="grid grid-cols-4 gap-2">
                {(['A', 'B', 'C', 'D'] as Turma[]).map(t => (
                  <button key={t} onClick={() => setResolverTurma(t)} className={`py-3 rounded-xl font-black border ${resolverTurma === t ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResolvingId(null)} className="flex-1 py-4 border-2 border-slate-100 rounded-xl font-black uppercase text-slate-400 text-xs">Cancelar</button>
              <button onClick={submitResolution} disabled={!resolverName.trim()} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs">Registrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Falhas</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Filtro por Disciplina e Turma</p>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <button onClick={onRefresh} disabled={isRefreshing} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase border border-slate-200"><RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} /></button>
          )}
          <button onClick={handleCopySummary} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2 border transition-all ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>
            {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
            {copyFeedback ? 'Copiado!' : 'Copiar Resumo'}
          </button>
          <button onClick={handleExport} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md">Exportar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-bold uppercase" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase">
            <option value="Tudo">Áreas</option>
            {Object.values(Area).map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-900 text-white border border-slate-900 rounded-lg px-3 py-2 text-[10px] font-black uppercase">
            <option value="aberto">Abertas</option>
            <option value="resolvido">Resolvidas</option>
            <option value="Tudo">Todas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const config = disciplineConfig[item.discipline] || disciplineConfig['OPERAÇÃO'];
          return (
            <div key={item.id} className={`bg-white rounded-2xl border-2 transition-all flex flex-col h-full ${item.status === 'resolvido' ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 shadow-sm'}`}>
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${config.bg} ${config.color} text-[9px] font-black uppercase`}>
                  {config.icon} {item.discipline}
                </div>
                {item.status === 'resolvido' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Clock size={16} className="text-amber-500 animate-pulse" />}
              </div>
              
              <div className="p-4 space-y-3 flex-grow">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.area}</span>
                  <span className="text-blue-600">TAG: {item.tag || 'S/T'}</span>
                </div>
                <p className={`text-sm font-black uppercase ${item.status === 'resolvido' ? 'text-emerald-900' : 'text-slate-800'}`}>{item.description}</p>
                
                <div className="p-3 bg-slate-50 rounded-xl text-[9px] font-bold text-slate-500 space-y-1">
                   <div className="flex justify-between"><span>REPORTADO POR: {item.operator}</span> <span>T-{item.turma}</span></div>
                   {item.status === 'resolvido' && (
                     <div className="flex justify-between text-emerald-600 border-t border-emerald-100 pt-1 mt-1">
                       <span>BAIXA POR: {item.resolvedBy}</span> <span>T-{item.resolvedByTurma}</span>
                     </div>
                   )}
                </div>
              </div>

              <div className="p-4 border-t mt-auto rounded-b-2xl">
                {item.status === 'aberto' ? (
                  <button onClick={() => setResolvingId(item.id)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Baixar TAG</button>
                ) : (
                  <div className="text-center text-emerald-600 font-black text-[10px] uppercase flex items-center justify-center gap-2"><Check size={16} /> Concluído</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingList;
