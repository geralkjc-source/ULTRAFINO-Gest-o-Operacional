
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ArrowUpCircle,
  Download,
  BrainCircuit,
  X,
  MessageSquare,
  Send,
  MessageCircle,
  Copy,
  Check as CheckIcon,
  StickyNote,
  LayoutList
} from 'lucide-react';
import { PendingItem, Area, Comment } from '../types';
import { exportToExcel } from '../services/excelExport';
import { analyzePendingItems } from '../services/gemini';
import { formatPendingForWhatsApp, formatSummaryForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface PendingListProps {
  pendingItems: PendingItem[];
  onResolve: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
}

const CommentList = ({ comments }: { comments?: Comment[] }) => (
  <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
    {comments && comments.length > 0 ? comments.map(c => (
      <div key={c.id} className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-slate-700">{c.author}</span>
          <span className="text-[10px] text-slate-400">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-slate-600 leading-snug">{c.text}</p>
      </div>
    )) : (
      <p className="text-[10px] text-slate-400 italic py-2">Sem comentários ainda.</p>
    )}
  </div>
);

const PendingList: React.FC<PendingListProps> = ({ pendingItems, onResolve, onAddComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('Tudo');
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'resolvido' | 'Tudo'>('aberto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [activeComments, setActiveComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({});
  
  // Modal de Resumo WhatsApp
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryNote, setSummaryNote] = useState('');
  const [summaryCopyFeedback, setSummaryCopyFeedback] = useState(false);

  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.tag && item.tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleExport = () => {
    const dataToExport = filteredItems.map(item => ({
      'TAG': item.tag || 'N/A',
      'ÁREA': item.area,
      'DESCRIÇÃO': item.description,
      'PRIORIDADE': item.priority.toUpperCase(),
      'STATUS': item.status === 'resolvido' ? 'RESOLVIDO' : 'EM ABERTO',
      'OPERADOR': item.operator?.toUpperCase() || 'N/A',
      'TURMA': item.turma || 'N/A',
      'DATA REPORTE': new Date(item.timestamp).toLocaleString('pt-BR')
    }));
    exportToExcel(dataToExport, 'Pendencias_Ultrafino');
  };

  const handleShareItem = (item: PendingItem) => {
    const text = formatPendingForWhatsApp(item);
    shareToWhatsApp(text);
  };

  const handleCopyItem = async (item: PendingItem) => {
    const text = formatPendingForWhatsApp(item);
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback({ ...copyFeedback, [item.id]: true });
      setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [item.id]: false }));
      }, 2000);
    }
  };

  const handleShareSummary = () => {
    if (filteredItems.length === 0) return;
    const text = formatSummaryForWhatsApp(filteredItems, summaryNote);
    shareToWhatsApp(text);
    setShowSummaryModal(false);
    setSummaryNote('');
  };

  const handleCopySummary = async () => {
    if (filteredItems.length === 0) return;
    const text = formatSummaryForWhatsApp(filteredItems, summaryNote);
    const success = await copyToClipboard(text);
    if (success) {
      setSummaryCopyFeedback(true);
      setTimeout(() => setSummaryCopyFeedback(false), 2000);
    }
  };

  const handleAIAnalysis = async () => {
    if (filteredItems.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePendingItems(filteredItems);
      setAnalysisResult(result);
    } catch (error) {
      console.error(error);
      alert('Erro ao analisar com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitComment = (id: string) => {
    const text = newCommentText[id];
    if (text?.trim()) {
      onAddComment(id, text);
      setNewCommentText({ ...newCommentText, [id]: '' });
    }
  };

  const toggleComments = (id: string) => {
    setActiveComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Modal Resumo WhatsApp / Copiar */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 uppercase">Exportar Resumo</h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700 leading-relaxed">
                  Este resumo incluirá <span className="underline">{filteredItems.length} itens</span> filtrados no formato de lista ▪️. 
                  Você pode adicionar uma nota técnica inicial (ex: orientações sobre equipamentos específicos).
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota Técnica / Pontos de Atenção (Opcional)</label>
                <textarea 
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  placeholder="Ex: Nota caros colegas não rodem a 6DCP-203 ela está disponível..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium uppercase min-h-[120px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleShareSummary}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-green-500/20"
              >
                <MessageCircle size={20} />
                WhatsApp
              </button>
              
              <button
                onClick={handleCopySummary}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 transition-all border-2 ${
                  summaryCopyFeedback 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {summaryCopyFeedback ? <CheckIcon size={20} /> : <Copy size={20} />}
                {summaryCopyFeedback ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Pendências</h1>
          <p className="text-slate-500 text-sm">Gerencie falhas técnicas e manutenções reportadas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || filteredItems.length === 0}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <BrainCircuit size={18} />
            {isAnalyzing ? 'Analisando...' : 'Análise IA'}
          </button>
          <button 
            onClick={() => setShowSummaryModal(true)}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <LayoutList size={18} />
            Gerar Resumo
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors"
          >
            <Download size={18} />
            Exportar Excel
          </button>
        </div>
      </div>

      {analysisResult && (
        <div className="bg-indigo-900 text-indigo-50 p-6 rounded-xl shadow-inner animate-in fade-in zoom-in duration-500">
          <div className="flex justify-between items-start mb-4">
            <h3 className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
              <BrainCircuit size={16} /> Insights da Inteligência Artificial
            </h3>
            <button onClick={() => setAnalysisResult(null)} className="text-indigo-300 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="prose prose-invert prose-sm max-w-none italic">
            {analysisResult.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por TAG, descrição ou área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Tudo">Todas Áreas</option>
            {Object.values(Area).map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Tudo">Todos Status</option>
            <option value="aberto">Abertas</option>
            <option value="resolvido">Resolvidas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col h-full ${
              item.status === 'resolvido' ? 'opacity-70' : ''
            }`}
          >
            <div className="p-4 border-b border-slate-50 flex justify-between items-start">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                item.priority === 'alta' ? 'bg-red-100 text-red-700' : 
                item.priority === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                Prioridade {item.priority}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleCopyItem(item)}
                  title="Copiar Resumo"
                  className={`p-1.5 rounded-md transition-all ${
                    copyFeedback[item.id] ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  {copyFeedback[item.id] ? <CheckIcon size={16} /> : <Copy size={16} />}
                </button>
                <button 
                  onClick={() => handleShareItem(item)}
                  title="Enviar via WhatsApp"
                  className="p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600 rounded-md transition-all"
                >
                  <MessageCircle size={16} />
                </button>
                <button className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-md transition-all">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                <span className="bg-slate-100 px-2 py-0.5 rounded">{item.area}</span>
                <span>•</span>
                <span className="text-blue-600">TAG: {item.tag || 'N/A'}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed min-h-[40px] uppercase">
                {item.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} />
                {new Date(item.timestamp).toLocaleString()}
              </div>

              {/* Comments Toggle */}
              <button 
                onClick={() => toggleComments(item.id)}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
              >
                <MessageSquare size={14} />
                {item.comments?.length || 0} Comentários
              </button>

              {activeComments[item.id] && (
                <div className="animate-in slide-in-from-top-2 duration-200 pt-2 border-t border-slate-50">
                  <CommentList comments={item.comments} />
                  <div className="mt-2 flex gap-1">
                    <input 
                      type="text" 
                      placeholder="Adicionar comentário..." 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={newCommentText[item.id] || ''}
                      onChange={(e) => setNewCommentText({ ...newCommentText, [item.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && submitComment(item.id)}
                    />
                    <button 
                      onClick={() => submitComment(item.id)}
                      className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
              <span className={`flex items-center gap-1.5 text-xs font-bold uppercase ${
                item.status === 'aberto' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {item.status === 'aberto' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                {item.status}
              </span>
              {item.status === 'aberto' && (
                <button 
                  onClick={() => onResolve(item.id)}
                  className="bg-white text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                >
                  Resolver
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300">
            <Filter size={48} className="text-slate-300 mb-4" />
            <h3 className="text-slate-500 font-bold">Nenhuma pendência encontrada</h3>
            <p className="text-slate-400 text-sm">Tente ajustar seus filtros de busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingList;
