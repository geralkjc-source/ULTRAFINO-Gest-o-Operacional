
import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  ChevronDown,
  Eye,
  Filter,
  ArrowRight,
  X,
  Check,
  Minus,
  MessageSquare,
  Send,
  Clock,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { Report, Area, Comment } from '../types';
import { exportToExcel } from '../services/excelExport';
import { formatReportForWhatsApp, shareToWhatsApp } from '../services/whatsappShare';

interface ReportsHistoryProps {
  reports: Report[];
  onAddItemComment: (reportId: string, itemId: string, text: string) => void;
}

const ReportsHistory: React.FC<ReportsHistoryProps> = ({ reports, onAddItemComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeItemComment, setActiveItemComment] = useState<string | null>(null);
  const [newItemCommentText, setNewItemCommentText] = useState('');

  const filteredReports = reports.filter(r => 
    r.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportAll = () => {
    const dataToExport = reports.map(r => ({
      ID: r.id,
      Data: new Date(r.timestamp).toLocaleDateString(),
      Hora: new Date(r.timestamp).toLocaleTimeString(),
      Area: r.area,
      Operador: r.operator,
      Turma: r.turma,
      Turno: r.turno,
      Itens_Com_Falha: r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => i.label).join(', '),
      Observacoes: r.generalObservations
    }));
    exportToExcel(dataToExport, 'Historico_Relatorios_Ultrafino');
  };

  const handleAddComment = (itemId: string) => {
    if (selectedReport && newItemCommentText.trim()) {
      onAddItemComment(selectedReport.id, itemId, newItemCommentText);
      setNewItemCommentText('');
      const updatedReport = {
        ...selectedReport,
        items: selectedReport.items.map(i => 
          i.id === itemId ? { ...i, comments: [...(i.comments || []), { id: Date.now().toString(), text: newItemCommentText, author: 'Operador Root', timestamp: Date.now() }] } : i
        )
      };
      setSelectedReport(updatedReport);
    }
  };

  const handleWhatsAppShare = () => {
    if (selectedReport) {
      // Nota: Como os cabeçalhos de seção não são salvos no array de 'items' do relatório,
      // em uma implementação real ideal eles estariam presentes. 
      // Aqui usamos os itens persistidos.
      const whatsappText = formatReportForWhatsApp(selectedReport, selectedReport.items);
      shareToWhatsApp(whatsappText);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Histórico de Relatórios</h1>
          <p className="text-slate-500 text-sm">Acesse e audite todos os checklists finalizados.</p>
        </div>
        <button 
          onClick={handleExportAll}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Download size={18} />
          Exportar Base Completa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Filtrar por operador ou área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
              <Filter size={20} />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => {
                    setSelectedReport(report);
                    setActiveItemComment(null);
                  }}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedReport?.id === report.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{report.area}</h4>
                      <p className="text-slate-500 text-xs">
                        {report.operator} • Turma {report.turma} • <span className="font-bold text-blue-600">{report.turno}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar size={12} />
                        {new Date(report.timestamp).toLocaleDateString()}
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${
                        report.items.every(i => i.status !== 'fail' && i.status !== 'warning') ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {report.items.every(i => i.status !== 'fail' && i.status !== 'warning') ? 'Sem Falhas' : 'Com Observações'}
                      </span>
                    </div>
                    <ArrowRight size={18} className="text-slate-300" />
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">Nenhum registro encontrado.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {selectedReport ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg sticky top-24 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-slate-900 text-white">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-600 px-2 py-1 rounded">Visualização Detalhada</span>
                  <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <h3 className="text-xl font-bold">{selectedReport.area}</h3>
                <p className="text-slate-400 text-xs mt-1">ID: {selectedReport.id}</p>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Operador</p>
                    <p className="text-sm font-semibold">{selectedReport.operator}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Turma / Turno</p>
                    <p className="text-sm font-semibold">{selectedReport.turma} - <span className="text-blue-600 font-bold">{selectedReport.turno}</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Status do Checklist</p>
                  <div className="space-y-2">
                    {selectedReport.items.map(item => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center gap-3 p-2 rounded bg-slate-50 border border-slate-100 group">
                          <div className={`p-1 rounded-full flex-shrink-0 ${
                            item.status === 'ok' ? 'bg-emerald-100 text-emerald-600' :
                            item.status === 'fail' ? 'bg-red-100 text-red-600' : 
                            item.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {item.status === 'ok' ? <Check size={12} /> : 
                             item.status === 'fail' ? <X size={12} /> : 
                             item.status === 'warning' ? <AlertCircle size={12} /> : <Minus size={12} />}
                          </div>
                          <span className="text-xs text-slate-700 flex-1">{item.label}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveItemComment(activeItemComment === item.id ? null : item.id); }}
                            className="text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>

                        {(activeItemComment === item.id || (item.comments && item.comments.length > 0)) && (
                          <div className="ml-6 pl-2 border-l-2 border-slate-100 space-y-2 py-1">
                            {item.comments?.map(c => (
                              <div key={c.id} className="text-[10px] bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="font-bold text-slate-600">{c.author}</span>
                                <p className="text-slate-500 mt-1">{c.text}</p>
                              </div>
                            ))}
                            {activeItemComment === item.id && (
                              <div className="flex gap-1 animate-in slide-in-from-top-1 duration-200">
                                <input 
                                  autoFocus
                                  type="text" 
                                  placeholder="Novo comentário..." 
                                  className="flex-1 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                  value={newItemCommentText}
                                  onChange={(e) => setNewItemCommentText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(item.id)}
                                />
                                <button 
                                  onClick={() => handleAddComment(item.id)}
                                  className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"
                                >
                                  <Send size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Observações Gerais</p>
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded border border-slate-100">
                    {selectedReport.generalObservations || 'Nenhuma observação reportada.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button 
                    onClick={() => exportToExcel([selectedReport], `Relatorio_${selectedReport.area}_${selectedReport.id}`)}
                    className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <Download size={18} />
                    Baixar Excel
                  </button>
                  <button 
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#128C7E] transition-all shadow-lg shadow-green-500/10"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-center p-8 space-y-4">
              <Eye size={48} className="opacity-20" />
              <div>
                <p className="font-bold">Nenhum relatório selecionado</p>
                <p className="text-sm max-w-[200px] mx-auto">Clique em um registro na lista ao lado para ver os detalhes completos e interagir.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsHistory;
