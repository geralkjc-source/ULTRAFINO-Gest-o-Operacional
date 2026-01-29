
import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  Eye,
  Filter,
  ArrowRight,
  X,
  Check,
  Minus,
  Clock,
  AlertCircle,
  MessageCircle,
  User,
  Hash,
  Copy
} from 'lucide-react';
import { Report, Area, Comment, Discipline } from '../types';
import { exportToExcel } from '../services/excelExport';
import { formatReportForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface ReportsHistoryProps {
  reports: Report[];
  onAddItemComment: (reportId: string, itemId: string, text: string) => void;
}

const ReportsHistory: React.FC<ReportsHistoryProps> = ({ reports, onAddItemComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const filteredReports = reports.filter(r => 
    r.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTurnoColor = (turno: string) => {
    switch(turno.toUpperCase()) {
      case 'MANHÃ': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'TARDE': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'NOITE': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleExportAll = () => {
    const dataToExport = reports.map(r => ({
      ID: r.id,
      Data: new Date(r.timestamp).toLocaleDateString('pt-BR'),
      Hora: new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      Area: r.area,
      Operador: r.operator,
      Turma: r.turma,
      Turno: r.turno,
      Itens_Com_Falha: r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => i.label).join(', '),
      Observacoes: r.generalObservations
    }));
    exportToExcel(dataToExport, 'Historico_Relatorios_Ultrafino');
  };

  const handleWhatsAppShare = () => {
    if (selectedReport) {
      const whatsappText = formatReportForWhatsApp(selectedReport, selectedReport.items);
      shareToWhatsApp(whatsappText);
    }
  };

  const handleCopyText = async () => {
    if (selectedReport) {
      const text = formatReportForWhatsApp(selectedReport, selectedReport.items);
      const success = await copyToClipboard(text);
      if (success) {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Histórico de Relatórios</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Auditagem e Rastreabilidade Operacional</p>
        </div>
        <button 
          onClick={handleExportAll}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-700 transition-all shadow-lg"
        >
          <Download size={16} />
          Exportar Base de Dados
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="BUSCAR OPERADOR OU ÁREA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold uppercase"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredReports.map((report) => (
              <div 
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-slate-50 ${
                  selectedReport?.id === report.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-[10px] border ${getTurnoColor(report.turno)}`}>
                    {report.turno.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight">{report.area}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-500 text-[9px] font-black uppercase tracking-tighter">{report.operator}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-blue-600 text-[9px] font-black uppercase">TURMA {report.turma}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(report.timestamp).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] font-black text-slate-900">{new Date(report.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <ArrowRight size={18} className="text-slate-300" />
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-black uppercase text-[10px]">Nenhum registro encontrado</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          {selectedReport ? (
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-2xl sticky top-24 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-slate-900 text-white">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${getTurnoColor(selectedReport.turno)}`}>
                    TURNO: {selectedReport.turno}
                  </span>
                  <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">{selectedReport.area}</h3>
                <div className="flex items-center gap-2 mt-2 text-slate-400">
                   <Calendar size={12} />
                   <span className="text-[10px] font-bold uppercase">{new Date(selectedReport.timestamp).toLocaleString('pt-BR')}</span>
                </div>
              </div>
              
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Operador</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase">{selectedReport.operator}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Turma</p>
                    <p className="text-[11px] font-black text-blue-600 uppercase">Equipe {selectedReport.turma}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Checklist Efetuado</p>
                  <div className="space-y-2">
                    {selectedReport.items.map(item => {
                      const isAlert = item.status === 'fail' || item.status === 'warning';
                      return (
                        <div key={item.id} className={`p-3 rounded-lg border flex flex-col gap-2 ${
                          item.status === 'ok' ? 'bg-white border-slate-100' : 
                          item.status === 'fail' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase ${isAlert ? 'text-slate-800' : 'text-slate-600'}`}>
                              {item.label}
                            </span>
                            <div className={`p-1 rounded ${
                              item.status === 'ok' ? 'text-emerald-500' : 
                              item.status === 'fail' ? 'text-red-500' : 'text-amber-500'
                            }`}>
                              {item.status === 'ok' ? <Check size={14} /> : <AlertCircle size={14} />}
                            </div>
                          </div>
                          {item.observation && (
                            <p className="text-[9px] font-bold text-slate-500 uppercase italic">
                              ↳ {item.observation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedReport.generalObservations && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passagem de Turno</p>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-[11px] font-bold text-slate-700 uppercase leading-relaxed">
                        {selectedReport.generalObservations}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={handleWhatsAppShare}
                    className="w-full bg-[#25D366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </button>
                  <button 
                    onClick={handleCopyText}
                    className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all border-2 ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-100 hover:border-slate-300'}`}
                  >
                    {copyFeedback ? <Check size={18} /> : <Copy size={18} />}
                    {copyFeedback ? 'Copiado!' : 'Copiar Texto'}
                  </button>
                  <button 
                    onClick={() => exportToExcel([selectedReport], `REL_${selectedReport.area}`)}
                    className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border border-slate-200"
                  >
                    <Download size={16} />
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 text-center p-8 space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <FileText size={32} />
              </div>
              <div>
                <p className="font-black uppercase text-xs">Selecione um Relatório</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsHistory;
