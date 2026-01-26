
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Check, 
  X, 
  Minus, 
  Camera, 
  Send, 
  ArrowLeft,
  Info,
  AlertCircle,
  Play,
  Gauge,
  Percent,
  Waves,
  CircleDot,
  MessageCircle,
  CheckCircle2,
  Copy,
  Check as CheckIcon,
  ShieldAlert
} from 'lucide-react';
import { Area, Turma, Turno, ChecklistItem, Report } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { formatReportForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface ChecklistAreaProps {
  onSaveReport: (report: Report) => void;
}

const ChecklistArea: React.FC<ChecklistAreaProps> = ({ onSaveReport }) => {
  const { areaName } = useParams<{ areaName: string }>();
  const navigate = useNavigate();
  const currentArea = areaName ? decodeURIComponent(areaName) as Area : Area.DFP2;
  
  const [operator, setOperator] = useState('');
  const [turma, setTurma] = useState<Turma>('A');
  const [turno, setTurno] = useState<Turno>('MANHÃ');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSavedReport, setLastSavedReport] = useState<Report | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const isScadaArea = currentArea === Area.BOMBEAMENTO || currentArea === Area.HBF_C || currentArea === Area.HBF_D || currentArea === Area.DFP2;

  useEffect(() => {
    const template = CHECKLIST_TEMPLATES[currentArea];
    if (template) {
      setItems(template.map((label, index) => ({
        id: `item-${index}`,
        label,
        status: 'ok',
        observation: ''
      })));
    }
  }, [currentArea]);

  const updateItemStatus = (id: string, status: 'ok' | 'fail' | 'na' | 'warning', observation?: string) => {
    setItems(items.map(item => item.id === id ? { ...item, status, observation: observation !== undefined ? observation : item.observation } : item));
  };

  const updateItemObservation = (id: string, observation: string) => {
    setItems(items.map(item => item.id === id ? { ...item, observation } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const filteredItems = items.filter(item => !item.label.startsWith('SECTION:'));
    
    const report: Report = {
      id: `rep-${Date.now()}`,
      timestamp: Date.now(),
      area: currentArea,
      operator,
      turma,
      turno,
      items: filteredItems,
      pendingItems: [],
      generalObservations: observations
    };

    setTimeout(() => {
      onSaveReport(report);
      setLastSavedReport(report);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    }, 800);
  };

  const handleShareWhatsApp = () => {
    if (lastSavedReport) {
      const whatsappText = formatReportForWhatsApp(lastSavedReport, items);
      shareToWhatsApp(whatsappText);
    }
  };

  const handleCopyText = async () => {
    if (lastSavedReport) {
      const text = formatReportForWhatsApp(lastSavedReport, items);
      const success = await copyToClipboard(text);
      if (success) {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    }
  };

  const renderItemControl = (item: ChecklistItem) => {
    const labelLower = item.label.toLowerCase();

    // Custom control for 'Condições dos resguardos'
    if (labelLower.includes('condições dos resguardos')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'NO lugar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Check size={14} /> NO LUGAR
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'fail', 'Fora do lugar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert size={14} /> FORA DO LUGAR
          </button>
        </div>
      );
    }

    if (labelLower.includes('corse seeding') || labelLower.includes('valvula de diluicao')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[240px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <CircleDot size={14} /> ABERTO
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'fail')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <X size={14} /> FECHADO
          </button>
        </div>
      );
    }

    if (labelLower.includes('retorno do tanque 104')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Check size={14} /> SEM RETORNO
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'warning')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'warning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Waves size={14} /> COM RETORNO
          </button>
        </div>
      );
    }

    const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(kpa)') || labelLower.includes('(%)');
    if (isMeasurement) {
      let icon = <Gauge size={16} />;
      let suffix = '';
      if (labelLower.includes('(m³/h)')) suffix = 'm³/h';
      if (labelLower.includes('(kpa)')) {
        suffix = 'Kpa';
        icon = <Waves size={16} />;
      }
      if (labelLower.includes('(%)')) {
        suffix = '%';
        icon = <Percent size={16} />;
      }

      return (
        <div className="relative w-full max-w-[160px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
          <input
            type="number"
            placeholder="Valor"
            step="any"
            value={item.observation || ''}
            onChange={(e) => updateItemObservation(item.id, e.target.value)}
            className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-slate-700"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">
            {suffix}
          </div>
        </div>
      );
    }

    if (item.label.startsWith('- ')) {
      return (
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Check size={14} /> OK
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'warning')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'warning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <AlertCircle size={14} /> ANOMALIA
          </button>
        </div>
      );
    }

    if (isScadaArea) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Play size={14} /> RODANDO
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'na')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'na' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Minus size={14} /> STANDBY
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'fail')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <X size={14} /> PARADO
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'warning')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'warning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <AlertCircle size={14} /> ANOMALIA
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center bg-slate-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => updateItemStatus(item.id, 'ok')}
          className={`px-4 py-2 rounded-md text-xs font-bold ${item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => updateItemStatus(item.id, 'fail')}
          className={`px-4 py-2 rounded-md text-xs font-bold ${item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500'}`}
        >
          FALHA
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">Relatório Finalizado!</h2>
              <p className="text-slate-500 font-medium mt-2">Deseja compartilhar o status agora via WhatsApp ou copiar o resumo?</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/20"
              >
                <MessageCircle size={24} />
                Enviar no WhatsApp
              </button>
              
              <button
                onClick={handleCopyText}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border-2 ${
                  copyFeedback 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {copyFeedback ? <CheckIcon size={20} /> : <Copy size={20} />}
                {copyFeedback ? 'Copiado!' : 'Copiar Texto'}
              </button>

              <button
                onClick={() => navigate('/history')}
                className="w-full text-slate-400 py-2 font-bold text-xs uppercase hover:text-slate-600 transition-colors"
              >
                Ir para o Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold uppercase text-xs"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{currentArea}</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Inspeção Preventiva Operacional</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operador Responsável</label>
              <input 
                type="text" 
                required
                placeholder="Insira o nome do operador"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Turma</label>
              <div className="flex gap-2">
                {(['A', 'B', 'C', 'D'] as Turma[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurma(t)}
                    className={`flex-1 py-3 rounded-lg font-black border transition-all ${
                      turma === t ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Turno de Trabalho (Escala 6-2)</label>
            <div className="grid grid-cols-3 gap-3">
              {(['MANHÃ', 'TARDE', 'NOITE'] as Turno[]).map(sh => (
                <button
                  key={sh}
                  type="button"
                  onClick={() => setTurno(sh)}
                  className={`py-4 rounded-xl font-black border transition-all flex flex-col items-center justify-center gap-1 ${
                    turno === sh 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{sh}</span>
                  <span className="text-[10px] opacity-60">
                    {sh === 'MANHÃ' ? '06:00 - 14:00' : sh === 'TARDE' ? '14:00 - 22:00' : '22:00 - 06:00'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Info size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Pendências automáticas: 🔴 Parado | ⚠️ Anomalia</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const isHeader = item.label.startsWith('SECTION:');
              const displayLabel = isHeader ? item.label.replace('SECTION:', '') : item.label;
              const isComplement = item.label.startsWith('- ');
              const cleanLabel = isComplement ? item.label.replace('- ', '') : displayLabel;

              if (isHeader) {
                return (
                  <div key={item.id} className="bg-slate-50 px-6 py-2 border-y border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{displayLabel}</h3>
                  </div>
                );
              }

              return (
                <div key={item.id} className={`p-6 space-y-4 transition-colors hover:bg-slate-50/50 ${isComplement ? 'pl-14 bg-slate-50/20' : ''}`}>
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <h4 className={`font-bold text-slate-800 flex-1 ${isComplement ? 'text-xs text-slate-500 italic' : 'text-base uppercase tracking-tight'}`}>
                      {cleanLabel}
                    </h4>
                    {renderItemControl(item)}
                  </div>
                  
                  {(item.status === 'fail' || item.status === 'warning') && 
                   !item.label.toLowerCase().includes('retorno do tanque 104') && 
                   !item.label.toLowerCase().includes('corse seeding') && 
                   !item.label.toLowerCase().includes('valvula de diluicao') &&
                   !item.label.toLowerCase().includes('condições dos resguardos') &&
                   !item.label.includes('(m³/h)') && !item.label.includes('(Kpa)') && !item.label.includes('(%)') && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <textarea
                        placeholder="Relate o motivo da falha ou anomalia..."
                        value={item.observation}
                        onChange={(e) => updateItemObservation(item.id, e.target.value)}
                        className={`w-full p-3 border rounded-lg text-xs font-medium text-slate-700 outline-none uppercase ${
                          item.status === 'fail' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                        }`}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Passagem de Turno / Eventos do Turno</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium uppercase"
            rows={4}
            placeholder="Descreva trocas de pano, limpezas, trocas de correias ou qualquer evento relevante..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20"
        >
          {isSubmitting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
          Finalizar Relatório de Campo
        </button>
      </form>
    </div>
  );
};

export default ChecklistArea;
