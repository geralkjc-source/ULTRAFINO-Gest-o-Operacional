
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Copy,
  Calendar,
  Filter,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  X,
  History,
  Lock,
  Users
} from 'lucide-react';
import { PendingItem, Area, Turma, Discipline, Turno } from '../types';
import { exportToExcel, exportShiftReport } from '../services/excelExport';
import { exportShiftReportPDF, exportAuditPDF } from '../services/pdfExport';
import { formatSummaryForWhatsApp, copyToClipboard } from '../services/whatsappShare';
import { getCurrentShiftInfo, getCurrentShiftRange } from '../services/shiftService';

interface PendingListProps {
  pendingItems: PendingItem[];
  onResolve: (id: string, operatorName: string, resolvedTurma: Turma) => void;
  onAddComment: (id: string, text: string) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const PendingList: React.FC<PendingListProps> = ({ pendingItems = [], onResolve, onRefresh, isRefreshing }) => {
  const [searchParams] = useSearchParams();
  
  const queryArea = searchParams.get('area');
  const queryStatus = searchParams.get('status');
  const queryTurma = searchParams.get('turma');
  const queryResolvedByTurma = searchParams.get('resolvedByTurma');
  const queryDiscipline = searchParams.get('discipline');

  const initialArea = Object.values(Area).includes(queryArea as Area) ? queryArea! : 'Tudo';
  const initialStatus = queryStatus === 'resolvido' || queryStatus === 'aberto' || queryStatus === 'Tudo' ? queryStatus : 'aberto';
  const initialTurma = queryTurma === 'A' || queryTurma === 'B' || queryTurma === 'C' || queryTurma === 'D' ? queryTurma : 'Tudo';
  const initialResolvedTurma = queryResolvedByTurma === 'A' || queryResolvedByTurma === 'B' || queryResolvedByTurma === 'C' || queryResolvedByTurma === 'D' ? queryResolvedByTurma : 'Tudo';

  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>(initialArea);
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'resolvido' | 'Tudo'>(initialStatus as any);
  const [turnoFilter, setTurnoFilter] = useState<Turno | 'Tudo'>('Tudo');
  const [turmaFilter, setTurmaFilter] = useState<Turma | 'Tudo'>(initialTurma as any);
  const [resolvedTurmaFilter, setResolvedTurmaFilter] = useState<Turma | 'Tudo'>(initialResolvedTurma as any);
  const [disciplineFilter, setDisciplineFilter] = useState<string>(queryDiscipline || 'Tudo');
  
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolverName, setResolverName] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [teamLeader, setTeamLeader] = useState('');

  useEffect(() => {
    if (queryArea) setAreaFilter(queryArea);
    if (queryStatus) setStatusFilter(queryStatus as any);
    if (queryTurma) setTurmaFilter(queryTurma as any);
    if (queryResolvedByTurma) setResolvedTurmaFilter(queryResolvedByTurma as any);
    if (queryDiscipline) setDisciplineFilter(queryDiscipline);
  }, [queryArea, queryStatus, queryTurma, queryResolvedByTurma, queryDiscipline]);

  const filteredItems = pendingItems.filter(item => {
    if (!item) return false;
    const matchesSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    const matchesTurno = turnoFilter === 'Tudo' || item.turno === turnoFilter;
    const matchesTurma = turmaFilter === 'Tudo' || item.turma === turmaFilter;
    const matchesResolvedTurma = resolvedTurmaFilter === 'Tudo' || item.resolvedByTurma === resolvedTurmaFilter;
    const matchesDiscipline = disciplineFilter === 'Tudo' || item.discipline === disciplineFilter;
    
    return matchesSearch && matchesArea && matchesStatus && matchesTurno && matchesTurma && matchesResolvedTurma && matchesDiscipline;
  });

  const disciplineConfig: Record<Discipline, { icon: React.ReactNode, color: string, bg: string }> = {
    'MECÂNICA': { icon: <Wrench size={12} />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    'ELÉTRICA': { icon: <Zap size={12} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    'INSTRUMENTAÇÃO': { icon: <Cpu size={12} />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    'OPERAÇÃO': { icon: <UserCog size={12} />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
  };

  const handleExportAuditoriaExcel = () => {
    const data = pendingItems.map(item => ({
      'SITUAÇÃO': item.status === 'resolvido' ? 'CONCLUÍDO' : 'PENDENTE',
      'DATA REPORTE': new Date(item.timestamp).toLocaleDateString('pt-BR'),
      'HORA REPORTE': new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      'ÁREA': item.area, 
      'TAG/ATIVO': item.tag || 'S/T', 
      'DISCIPLINA': item.discipline, 
      'DESCRIÇÃO DA FALHA': item.description.toUpperCase(),
      'PRIORIDADE': item.priority.toUpperCase(),
      'REPORTADO POR': item.operator.toUpperCase(),
      'TURMA ORIGEM': item.turma,
      'TURNO ORIGEM': item.turno,
      'DATA CONCLUSÃO': item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString('pt-BR') : '-',
      'HORA CONCLUSÃO': item.resolvedAt ? new Date(item.resolvedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
      'RESOLVIDO POR': item.resolvedBy || '-', 
      'TURMA RESOLUÇÃO': item.resolvedByTurma || '-'
    }));
    exportToExcel(data, 'AUDITORIA_INTEGRAL_ULTRAFINO');
  };

  const handleExportAuditoriaPDF = () => {
    exportAuditPDF(pendingItems);
  };

  const processExport = () => {
    const currentScale = getCurrentShiftInfo();
    const shiftRange = getCurrentShiftRange(); // Obtém o início exato do turno atual

    const meta = {
      teamLeader: teamLeader || 'NÃO INFORMADO',
      turma: currentScale.turma,
      turno: currentScale.turno
    };

    // Filtro aprimorado: Trabalho Realizado deve ter ocorrido DENTRO da janela do turno atual
    const reportItems = pendingItems.filter(item => {
      const isStillOpen = item.status === 'aberto';
      
      // Critério restrito de turno: resolvido por esta turma E dentro do horário deste turno
      const wasResolvedInThisShift = 
        item.status === 'resolvido' && 
        item.resolvedByTurma === currentScale.turma &&
        item.resolvedAt && 
        item.resolvedAt >= shiftRange.start;

      const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
      
      return (isStillOpen || wasResolvedInThisShift) && matchesArea;
    });

    if (exportType === 'excel') {
      const data = reportItems.map(item => ({
        'ÁREA': item.area,
        'TAG': item.tag || 'N/A',
        'DISCIPLINA': item.discipline,
        'DESCRIÇÃO': item.description.toUpperCase(),
        'SITUAÇÃO': item.status === 'resolvido' ? `✅ RESOLVIDO NO TURNO` : '🚨 EM ABERTO',
        'DATA REPORTE': new Date(item.timestamp).toLocaleDateString('pt-BR'),
        'DATA CONCLUSÃO': item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString('pt-BR') : '-'
      }));
      const fileName = `Relatorio_Turno_${currentScale.turno}_Equipe_${currentScale.turma}`;
      exportShiftReport(data, meta, fileName);
    } else {
      exportShiftReportPDF(reportItems, meta);
    }
    setIsExportModalOpen(false);
  };

  const handleCopySummary = async () => {
    const text = formatSummaryForWhatsApp(filteredItems, "Resumo gerado via plataforma.");
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleFinalizeResolution = () => {
    if(resolvingId && resolverName.trim()){
      const currentScale = getCurrentShiftInfo();
      onResolve(resolvingId, resolverName.trim().toUpperCase(), currentScale.turma); 
      setResolvingId(null); 
      setResolverName('');
    }
  };

  return (
    <div className="space-y-6">
      {resolvingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><UserCheck size={40} /></div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Resolver Pendência</h2>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Lock size={12} /> Turma Detectada: <span className="text-emerald-600">Equipe {getCurrentShiftInfo().turma}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Executado por</label>
                <input 
                  type="text" 
                  placeholder="SEU NOME COMPLETO..." 
                  autoFocus 
                  value={resolverName} 
                  onChange={(e) => setResolverName(e.target.value)} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center uppercase outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-inner" 
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setResolvingId(null)} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-slate-400 text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
              <button 
                onClick={handleFinalizeResolution} 
                disabled={!resolverName.trim()} 
                className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${exportType === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {exportType === 'pdf' ? <FileText size={32} /> : <FileSpreadsheet size={32} />}
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={24} /></button>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Exportar Relatório {exportType.toUpperCase()}</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Lock size={12} /> Escala Detectada: <span className="text-blue-600">{getCurrentShiftInfo().turno} / EQUIPE {getCurrentShiftInfo().turma}</span>
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Team Leader Responsável</label>
                <input 
                  type="text" 
                  placeholder="NOME DO LÍDER..." 
                  autoFocus 
                  value={teamLeader} 
                  onChange={(e) => setTeamLeader(e.target.value.toUpperCase())} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner" 
                />
              </div>
            </div>

            <button 
              onClick={processExport} 
              disabled={!teamLeader.trim()} 
              className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${exportType === 'pdf' ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'}`}
            >
              Gerar Relatório {getCurrentShiftInfo().turno}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Falhas</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Plataforma Ultrafino v1.2</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <button onClick={onRefresh} disabled={isRefreshing} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase border border-slate-200 hover:bg-slate-50 transition-colors"><RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} /></button>
          )}
          <button onClick={handleCopySummary} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2 border transition-all ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>
            {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
            {copyFeedback ? 'Copiado!' : 'Copiar Resumo'}
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <button onClick={() => { setExportType('excel'); setIsExportModalOpen(true); }} className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2 transition-all">
            <FileSpreadsheet size={14} /> Planilha Turno
          </button>
          <button onClick={() => { setExportType('pdf'); setIsExportModalOpen(true); }} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2 transition-all">
            <FileText size={14} /> PDF Turno
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <button onClick={handleExportAuditoriaPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2 transition-all">
            <FileText size={14} /> Auditoria PDF
          </button>
          <button onClick={handleExportAuditoriaExcel} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2">
            <FileSpreadsheet size={14} /> Auditoria Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar TAG ou Descrição técnica..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none text-sm font-black uppercase focus:bg-white focus:border-blue-500 transition-all" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 group focus-within:border-blue-500 transition-all">
            <Filter size={14} className="text-slate-400" />
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="bg-transparent py-3 text-[9px] font-black uppercase outline-none w-full">
              <option value="Tudo">Áreas (Tudo)</option>
              {Object.values(Area).map(area => <option key={area} value={area}>{area}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 group focus-within:border-blue-500 transition-all">
            <Users size={14} className="text-slate-400" />
            <select value={turmaFilter} onChange={(e) => setTurnoFilter(e.target.value as any)} className="bg-transparent py-3 text-[9px] font-black uppercase outline-none w-full">
              <option value="Tudo">T. Origem (Tudo)</option>
              <option value="A">Equipe A</option>
              <option value="B">Equipe B</option>
              <option value="C">Equipe C</option>
              <option value="D">Equipe D</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-100 rounded-xl px-3 group focus-within:border-emerald-500 transition-all">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <select value={resolvedTurmaFilter} onChange={(e) => setResolvedTurmaFilter(e.target.value as any)} className="bg-transparent py-3 text-[9px] font-black uppercase outline-none w-full">
              <option value="Tudo">T. Resolução (Tudo)</option>
              <option value="A">Equipe A</option>
              <option value="B">Equipe B</option>
              <option value="C">Equipe C</option>
              <option value="D">Equipe D</option>
            </select>
          </div>

          <select value={turnoFilter} onChange={(e) => setTurnoFilter(e.target.value as any)} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none focus:border-blue-500 transition-all">
            <option value="Tudo">Todos Turnos</option>
            <option value="MANHÃ">Manhã</option>
            <option value="TARDE">Tarde</option>
            <option value="NOITE">Noite</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-900 text-white rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none shadow-lg">
            <option value="aberto">🚨 Em Aberto</option>
            <option value="resolvido">✅ Resolvidas</option>
            <option value="Tudo">🔄 Todas</option>
          </select>

          <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none focus:border-blue-500 transition-all">
            <option value="Tudo">Disciplinas</option>
            <option value="MECÂNICA">Mecânica</option>
            <option value="ELÉTRICA">Elétrica</option>
            <option value="INSTRUMENTAÇÃO">Instrumentação</option>
            <option value="OPERAÇÃO">Operação</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const config = disciplineConfig[item.discipline] || disciplineConfig['OPERAÇÃO'];
          return (
            <div key={item.id} className={`bg-white rounded-[2rem] border-2 transition-all flex flex-col h-full overflow-hidden ${item.status === 'resolvido' ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-100 shadow-sm'}`}>
              <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.color} text-[9px] font-black uppercase tracking-tight`}>
                  {config.icon} {item.discipline}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.turno}</span>
                  {item.status === 'resolvido' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Clock size={16} className="text-amber-500 animate-pulse" />}
                </div>
              </div>
              
              <div className="p-6 space-y-4 flex-grow">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight">
                  <span className="bg-slate-900 text-white px-3 py-1 rounded-lg">{item.area}</span>
                  <span className="text-blue-600 border border-blue-100 px-3 py-1 rounded-lg">TAG: {item.tag || 'S/T'}</span>
                </div>
                <p className={`text-sm font-black uppercase leading-relaxed ${item.status === 'resolvido' ? 'text-emerald-900' : 'text-slate-800'}`}>{item.description}</p>
                
                <div className="p-4 bg-white/50 rounded-2xl border border-slate-100 space-y-3">
                   <div className="flex items-start gap-3 border-b border-slate-50 pb-3">
                     <Calendar size={14} className="text-slate-400 mt-1" />
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Origem do Reporte</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase mt-1">
                          {new Date(item.timestamp).toLocaleDateString('pt-BR')} - {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 mt-0.5">{item.operator} (TURMA {item.turma})</span>
                     </div>
                   </div>

                   {item.status === 'resolvido' && (
                     <div className="flex items-start gap-3 pt-1 animate-in fade-in duration-300">
                       <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center mt-1 shrink-0"><Check size={10} /></div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">Resolução Confirmada</span>
                          <span className="text-[9px] font-black text-emerald-700 uppercase mt-1">
                            {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString('pt-BR') : '-'} - {item.resolvedAt ? new Date(item.resolvedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span className="text-[8px] font-bold text-emerald-600 mt-0.5 uppercase tracking-wider">{item.resolvedBy} (EQUIPE {item.resolvedByTurma})</span>
                       </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="p-6 border-t mt-auto">
                {item.status === 'aberto' ? (
                  <button onClick={() => setResolvingId(item.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95">Resolver Pendência</button>
                ) : (
                  <div className="w-full py-4 bg-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-emerald-200">
                    <CheckCircle2 size={16} /> Item Concluído
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300">
                <AlertCircle size={40} />
             </div>
             <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Nenhum registro encontrado para estes filtros.</p>
             <button onClick={() => {setAreaFilter('Tudo'); setStatusFilter('Tudo'); setTurmaFilter('Tudo'); setResolvedTurmaFilter('Tudo'); setTurnoFilter('Tudo'); setDisciplineFilter('Tudo'); setSearchTerm('');}} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Limpar Todos os Filtros</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingList;
