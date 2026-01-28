
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  RotateCw,
  MessageCircle,
  UserCheck,
  X,
  Send,
  StickyNote,
  Copy,
  Check
} from 'lucide-react';
import { PendingItem, Area } from '../types';
import { exportToExcel } from '../services/excelExport';
import { fetchCloudItems, DEFAULT_SCRIPT_URL } from '../services/googleSync';
import { formatPendingForWhatsApp, formatSummaryForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface PendingListProps {
  pendingItems: PendingItem[];
  onResolve: (id: string, operatorName?: string) => void;
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

  // Modal para resumo do WhatsApp
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryNote, setSummaryNote] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const filteredItems = pendingItems.filter(item => {
    if (!item) return false;
    const matchesSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleExport = () => {
    const data = filteredItems.map(item => ({
      'TAG': item.tag, 'ÁREA': item.area, 'DESCRIÇÃO': item.description,
      'STATUS': item.status.toUpperCase(), 'RESOLVIDO POR': item.resolvedBy || '-'
    }));
    exportToExcel(data, 'Pendencias_Ultrafino');
  };

  const handleShareSummary = () => {
    const summaryText = formatSummaryForWhatsApp(filteredItems, summaryNote);
    shareToWhatsApp(summaryText);
    setShowSummaryModal(false);
    setSummaryNote('');
  };

  const handleCopySummary = async () => {
    const summaryText = formatSummaryForWhatsApp(filteredItems, summaryNote);
    const success = await copyToClipboard(summaryText);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const submitResolution = () => {
    if (resolvingId && resolverName.trim()) {
      onResolve(resolvingId, resolverName.trim().toUpperCase());
      setResolvingId(null);
      setResolverName('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal de Baixa de Pendência */}
      {resolvingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <UserCheck size={32} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase">Baixar Pendência</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase mt-1">Informe seu nome para registro na planilha</p>
            </div>
            <input 
              type="text" placeholder="SEU NOME..." autoFocus
              value={resolverName} onChange={(e) => setResolverName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-center uppercase outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setResolvingId(null)} className="flex-1 py-4 border-2 border-slate-100 rounded-xl font-black uppercase text-slate-400 text-xs">Cancelar</button>
              <button onClick={submitResolution} disabled={!resolverName.trim()} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-emerald-600/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resumo do WhatsApp */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-green-600">
                <MessageCircle size={24} />
                <h2 className="text-xl font-black text-slate-900 uppercase">Resumo para WhatsApp</h2>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
                <p className="text-xs text-blue-800 font-bold leading-relaxed">
                  O sistema irá consolidar as <span className="font-black">{filteredItems.length} pendências</span> visíveis na tela e agrupar por área.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <StickyNote size={12} /> Nota de Rodapé / Observação Adicional
                </label>
                <textarea 
                  placeholder="Ex: Nota caros colegas não rodem a 6DCP-203 ela está disponível..."
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-green-500 shadow-inner"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleShareSummary}
                className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 active:scale-95 transition-all hover:bg-[#128C7E]"
              >
                <Send size={20} /> Enviar para WhatsApp
              </button>
              
              <button 
                onClick={handleCopySummary}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border-2 active:scale-95 ${
                  copyFeedback 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {copyFeedback ? <Check size={20} /> : <Copy size={20} />}
                {copyFeedback ? 'Copiado para Área de Transferência!' : 'Copiar Resumo em Texto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Pendências Operacionais</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Base Centralizada de Ativos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSummaryModal(true)}
            className="bg-[#25D366] text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center gap-2 hover:bg-[#128C7E] transition-all"
          >
            <MessageCircle size={14} /> WhatsApp Resumo
          </button>
          {onRefresh && (
            <button onClick={onRefresh} disabled={isRefreshing} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase border border-slate-200 shadow-sm hover:bg-slate-50">
              <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
          <button onClick={handleExport} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md">Exportar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar TAG ou Equipamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold uppercase" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase">
            <option value="Tudo">Todas Áreas</option>
            {Object.values(Area).map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-900 text-white border border-slate-900 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest">
            <option value="aberto">📂 Abertas</option>
            <option value="resolvido">✅ Resolvidas</option>
            <option value="Tudo">📊 Todas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`bg-white rounded-2xl border transition-all flex flex-col h-full ${item.status === 'resolvido' ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 shadow-sm'}`}>
            <div className="p-4 border-b border-slate-50 flex justify-between items-start">
              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.status === 'resolvido' ? 'bg-emerald-500 text-white' : item.priority === 'alta' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                {item.status === 'resolvido' ? 'RESOLVIDO' : `Prioridade ${item.priority}`}
              </span>
              <button onClick={() => { shareToWhatsApp(formatPendingForWhatsApp(item)); }} className="p-1.5 text-slate-400 hover:text-green-600"><MessageCircle size={16} /></button>
            </div>
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.area}</span>
                <span className="text-blue-600 font-black">TAG: {item.tag || 'N/A'}</span>
              </div>
              <p className="text-sm font-black text-slate-900 leading-relaxed uppercase">{item.description}</p>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 space-y-1">
                <p>REPORTE: {item.operator?.toUpperCase() || 'SISTEMA'}</p>
                {item.status === 'resolvido' && <p className="text-emerald-700 font-black">BAIXA: {item.resolvedBy?.toUpperCase()}</p>}
                <p className="text-[9px] text-slate-400 italic mt-1">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto rounded-b-2xl">
              <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${item.status === 'aberto' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {item.status === 'aberto' ? <AlertCircle size={14} className="animate-pulse" /> : <CheckCircle2 size={14} />} 
                {item.status}
              </span>
              {item.status === 'aberto' && (
                <button onClick={() => setResolvingId(item.id)} className="bg-white text-slate-700 border-2 border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">
                  Baixar TAG
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingList;
