
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
  Send
} from 'lucide-react';
import { PendingItem, Area, Comment } from '../types';
import { exportToExcel } from '../services/excelExport';
import { analyzePendingItems } from '../services/gemini';

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

  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleExport = () => {
    exportToExcel(filteredItems, 'Pendencias_Ultrafino');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Pendências</h1>
          <p className="text-slate-500 text-sm">Gerencie falhas técnicas e manutenções reportadas.</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || filteredItems.length === 0}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <BrainCircuit size={18} />
            {isAnalyzing ? 'Analisando...' : 'Análise IA'}
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
            placeholder="Buscar por descrição ou área..."
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
              <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
            </div>
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                <span className="bg-slate-100 px-2 py-0.5 rounded">{item.area}</span>
                <span>•</span>
                <span>ID: {item.id.split('-')[1]}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed min-h-[40px]">
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
