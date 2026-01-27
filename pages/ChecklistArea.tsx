
import React, { useState, useEffect, useRef } from 'react';
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
  ShieldAlert,
  Activity,
  Target,
  Ruler,
  PowerOff,
  AlertTriangle,
  Droplets,
  FlaskConical,
  Zap,
  StickyNote,
  Hash,
  LayoutList,
  RotateCcw,
  Unlock,
  Lock
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
  const [validationError, setValidationError] = useState<string | null>(null);

  // States to track feeding logic
  const [isColumnsFeeding, setIsColumnsFeeding] = useState(true);

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
    const item = items.find(i => i.id === id);
    if (item?.label === 'ALIMENTANDO COLUNAS?') {
      setIsColumnsFeeding(status === 'ok');
    }
    
    setItems(items.map(item => item.id === id ? { ...item, status, observation: observation !== undefined ? observation : item.observation } : item));
    setValidationError(null);
  };

  const updateItemObservation = (id: string, observation: string) => {
    setItems(items.map(item => item.id === id ? { ...item, observation } : item));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de Justificativas Obrigatórias
    const itemsRequiringJustification = items.filter(item => {
      const isHeader = item.label.startsWith('SECTION:');
      const isMeasurement = item.label.includes('(m³/h)') || 
                            item.label.includes('(Kpa)') || 
                            item.label.includes('(%)') || 
                            item.label.includes('(g/t)') || 
                            item.label.includes('(ppm)') || 
                            item.label.includes('(t/m³)') || 
                            item.label.includes('(l/min)') ||
                            item.label.includes('(tph)') ||
                            item.label.includes('(Hz)');
      
      const isChoiceField = item.label.includes('Linhas em alimentação') || 
                            item.label.includes('Retorno do tanque 104') ||
                            item.label.includes('CORSE SEEDING');

      if (!isHeader && !isMeasurement && !isChoiceField && (item.status === 'fail' || item.status === 'warning')) {
        const obs = item.observation?.trim() || '';
        const autoTexts = ['NÃO', 'Fora do lugar', 'FECHADO', 'COM RETORNO', 'TURVA', 'RUIM', 'SEM RETORNO', 'ABERTA'];
        return obs === '' || autoTexts.includes(obs);
      }
      return false;
    });

    if (itemsRequiringJustification.length > 0) {
      setValidationError(`Existem ${itemsRequiringJustification.length} itens sem justificativa. Descreva o motivo da parada ou anomalia.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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

  const renderItemControl = (item: ChecklistItem, index: number) => {
    const labelLower = item.label.toLowerCase();

    // Check if this item should be disabled due to feeding state
    let isDisabled = false;
    const isUnderColumnsSection = items.slice(0, index).reverse().find(i => i.label.startsWith('SECTION:'))?.label === 'SECTION:OPERAÇÃO COLUNAS';
    const isUnderFlotationDetails = items.slice(0, index).reverse().find(i => i.label.startsWith('SECTION:'))?.label === 'SECTION:FLOTATION COLUMNS';

    if (item.label !== 'ALIMENTANDO COLUNAS?' && (isUnderColumnsSection || isUnderFlotationDetails) && !isColumnsFeeding) isDisabled = true;

    if (isDisabled) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 opacity-60 italic text-[10px] font-bold">
          <PowerOff size={14} /> SISTEMA OFF
        </div>
      );
    }

    // Retorno do tanque 104
    if (labelLower.includes('retorno do tanque 104')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'COM RETORNO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.observation === 'COM RETORNO' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <RotateCcw size={14} /> COM RETORNO
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'SEM RETORNO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.observation === 'SEM RETORNO' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <PowerOff size={14} /> SEM RETORNO
          </button>
        </div>
      );
    }

    // VALVULA DE DILUICAO
    if (labelLower.includes('valvula de diluicao')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'warning', 'ABERTA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.observation === 'ABERTA' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Unlock size={14} /> ABERTA
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'FECHADA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.observation === 'FECHADA' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Lock size={14} /> FECHADA
          </button>
        </div>
      );
    }

    // CORSE SEEDING
    if (labelLower.includes('corse seeding')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'ABERTA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.observation === 'ABERTA' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Unlock size={14} /> ABERTA
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'FECHADA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.observation === 'FECHADA' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Lock size={14} /> FECHADA
          </button>
        </div>
      );
    }

    // Special selection for "Linhas em alimentação (1-4)"
    if (labelLower.includes('linhas em alimentação')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[280px]">
          {['1', '2', '3', '4'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => updateItemStatus(item.id, 'ok', `${num} LINHA${num !== '1' ? 'S' : ''}`)}
              className={`flex-1 flex items-center justify-center py-2 rounded-md transition-all text-xs font-black ${
                item.observation === `${num} LINHA${num !== '1' ? 'S' : ''}` 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      );
    }

    // Feeding toggle control (Only for Columns now)
    if (item.label === 'ALIMENTANDO COLUNAS?') {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[240px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'SIM')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Play size={14} /> SIM
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'fail', 'NÃO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <PowerOff size={14} /> NÃO
          </button>
        </div>
      );
    }

    // Qualidade de Água control
    if (labelLower.includes('qualidade água') || labelLower.includes('clareza do overflow')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[320px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'BOM')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 size={14} /> BOM
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'warning', 'TURVA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'warning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle size={14} /> TURVA
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'fail', 'RUIM')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <AlertCircle size={14} /> RUIM
          </button>
        </div>
      );
    }

    // Special Text Inputs (like Ply)
    if (labelLower.includes('ply') || labelLower.includes('nota')) {
      return (
        <div className="relative w-full max-w-[220px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {labelLower.includes('ply') ? <StickyNote size={16} /> : <Hash size={16} />}
          </div>
          <input
            type="text"
            placeholder="Preencher..."
            value={item.observation || ''}
            onChange={(e) => updateItemObservation(item.id, e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 uppercase"
          />
        </div>
      );
    }

    const isMeasurement = labelLower.includes('(m³/h)') || 
                          labelLower.includes('(kpa)') || 
                          labelLower.includes('(%)') ||
                          labelLower.includes('(g/t)') ||
                          labelLower.includes('(ppm)') ||
                          labelLower.includes('(t/m³)') ||
                          labelLower.includes('(l/min)') ||
                          labelLower.includes('(tph)') ||
                          labelLower.includes('(hz)');
    
    if (isMeasurement) {
      let icon = <Gauge size={16} />;
      let suffix = '';
      let highlightGreen = false;
      let highlightRed = false;

      if (labelLower.includes('(m³/h)')) suffix = 'm³/h';
      if (labelLower.includes('(l/min)')) suffix = 'l/min';
      if (labelLower.includes('(tph)')) {
        suffix = 'tph';
        icon = <Zap size={16} />;
      }
      if (labelLower.includes('(hz)')) {
        suffix = 'Hz';
        icon = <Activity size={16} />;
      }
      if (labelLower.includes('(t/m³)')) {
        suffix = 't/m³';
        icon = <FlaskConical size={16} />;
      }
      if (labelLower.includes('(kpa)')) {
        suffix = 'Kpa';
        icon = <Waves size={16} />;
      }
      if (labelLower.includes('(%)')) {
        suffix = '%';
        icon = <Percent size={16} />;
        
        if (labelLower.includes('nível') || labelLower.includes('tank') || labelLower.includes('actual') || labelLower.includes('atual')) {
          icon = <Droplets size={16} />;
        } else if (labelLower.includes('setpoint')) {
          icon = <Target size={16} />;
        } else if (labelLower.includes('torque') || labelLower.includes('altura')) {
          icon = <Activity size={16} />;
        }
      }
      if (labelLower.includes('(g/t)')) {
        suffix = 'g/t';
        icon = <Activity size={16} />;
      }

      // Logic for Comparison (Densidade/Nível vs Setpoint)
      const isActualOrLevel = labelLower.includes('actual') || labelLower.includes('atual') || labelLower.includes('nível');
      const isSetpointField = labelLower.includes('setpoint');

      if (isActualOrLevel || isSetpointField) {
        // Busca o item oposto na vizinhança imediata (+/- 1)
        const otherItem = isActualOrLevel 
          ? items[index + 1] 
          : items[index - 1];

        if (otherItem && (otherItem.label.toLowerCase().includes('setpoint') || otherItem.label.toLowerCase().includes('actual') || otherItem.label.toLowerCase().includes('atual') || otherItem.label.toLowerCase().includes('nível'))) {
          if (item.observation && otherItem.observation) {
            const v1 = parseFloat(item.observation);
            const v2 = parseFloat(otherItem.observation);
            if (!isNaN(v1) && !isNaN(v2)) {
              if (v1 === v2) {
                highlightGreen = true;
              } else {
                highlightRed = true;
              }
            }
          }
        }
      }

      return (
        <div className="relative w-full max-w-[180px]">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            highlightGreen ? 'text-emerald-600' : 
            highlightRed ? 'text-red-600' : 
            'text-slate-400'
          }`}>
            {highlightGreen ? <Target size={16} className="animate-pulse" /> : icon}
          </div>
          <input
            type="number"
            placeholder="Valor"
            step="any"
            value={item.observation || ''}
            onChange={(e) => updateItemObservation(item.id, e.target.value)}
            className={`w-full pl-10 pr-14 py-2.5 border rounded-lg focus:ring-2 outline-none font-mono font-bold transition-all ${
              highlightGreen 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 focus:ring-emerald-500' 
                : highlightRed
                ? 'bg-red-50 border-red-500 text-red-700 focus:ring-red-500'
                : 'bg-white border-slate-200 text-slate-700 focus:ring-blue-500'
            }`}
          />
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase transition-colors ${
            highlightGreen ? 'text-emerald-500' : 
            highlightRed ? 'text-red-500' : 
            'text-slate-400'
          }`}>
            {suffix}
          </div>
        </div>
      );
    }

    if (labelLower.includes('rakes')) {
      return (
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[240px]">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'RODANDO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Play size={14} /> OK
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'fail', 'PARADO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <X size={14} /> PARADO
          </button>
        </div>
      );
    }

    if (item.label.startsWith('- ')) {
      return (
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'ok', 'OK')}
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
            onClick={() => updateItemStatus(item.id, 'ok', 'RODANDO')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-all text-[10px] font-black uppercase ${
              item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Play size={14} /> RODANDO
          </button>
          <button
            type="button"
            onClick={() => updateItemStatus(item.id, 'na', 'STANDBY')}
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
          onClick={() => updateItemStatus(item.id, 'ok', 'OK')}
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

      {(currentArea === Area.BOMBEAMENTO || currentArea === Area.DFP2) && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm mb-6 flex gap-4 items-start animate-in slide-in-from-left duration-500">
          <div className="text-amber-500 shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-amber-900 font-black uppercase text-xs tracking-wider mb-1">Aviso Crítico ao Operador</h3>
            <p className="text-amber-800 text-sm font-bold leading-relaxed">
              ATENÇÃO: É obrigatório verificar todos esses passos na inspeção das bombas: 
              <span className="text-amber-950 underline decoration-amber-500/30"> V-belts, Temperatura, Vibração, Ruído, Vazamento e Água de Selagem</span>.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {validationError && (
          <div className="bg-red-50 border-2 border-red-500 p-4 rounded-xl flex items-center gap-4 animate-bounce">
            <div className="bg-red-500 text-white p-2 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-red-900 font-black uppercase text-sm">Erro de Preenchimento</p>
              <p className="text-red-700 text-xs font-bold">{validationError}</p>
            </div>
          </div>
        )}

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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Turno de Trabalho</label>
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
            {items.map((item, idx) => {
              const isHeader = item.label.startsWith('SECTION:');
              const displayLabel = isHeader ? item.label.replace('SECTION:', '') : item.label;
              const isComplement = item.label.startsWith('- ');
              const cleanLabel = isComplement ? item.label.replace('- ', '') : displayLabel;
              
              const isMeasurement = item.label.includes('(m³/h)') || 
                                    item.label.includes('(Kpa)') || 
                                    item.label.includes('(%)') || 
                                    item.label.includes('(g/t)') || 
                                    item.label.includes('(ppm)') ||
                                    item.label.includes('(t/m³)') ||
                                    item.label.includes('(l/min)') ||
                                    item.label.includes('(tph)') ||
                                    item.label.includes('(Hz)');

              const isChoiceField = item.label.includes('Linhas em alimentação') || 
                                    item.label.includes('Retorno do tanque 104') ||
                                    item.label.includes('CORSE SEEDING');

              const isFailOrWarning = item.status === 'fail' || item.status === 'warning';
              
              // Verifica se este item específico precisa de justificativa e está vazio
              const needsJustification = !isHeader && !isMeasurement && !isChoiceField && isFailOrWarning;
              const isJustificationMissing = needsJustification && (!item.observation || item.observation.trim() === '' || ['NÃO', 'Fora do lugar', 'FECHADO', 'COM RETORNO', 'TURVA', 'RUIM', 'SEM RETORNO', 'ABERTA'].includes(item.observation));

              return (
                <div key={item.id} className={`p-6 space-y-4 transition-colors hover:bg-slate-50/50 ${isHeader ? 'bg-slate-50 border-y border-slate-100 py-2' : ''} ${isComplement ? 'pl-14 bg-slate-50/20' : ''}`}>
                  {isHeader ? (
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{displayLabel}</h3>
                  ) : (
                    <>
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <h4 className={`font-bold text-slate-800 flex-1 ${isComplement ? 'text-xs text-slate-500 italic' : 'text-base uppercase tracking-tight'}`}>
                          {cleanLabel}
                        </h4>
                        {renderItemControl(item, idx)}
                      </div>
                      
                      {needsJustification && (
                        <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                              <AlertCircle size={12} /> Justificativa Obrigatória
                            </span>
                          </div>
                          <textarea
                            placeholder="Descreva detalhadamente o motivo técnico desta anomalia ou parada..."
                            value={['NÃO', 'Fora do lugar', 'FECHADO', 'COM RETORNO', 'TURVA', 'RUIM', 'SEM RETORNO', 'ABERTA'].includes(item.observation || '') ? '' : item.observation}
                            onChange={(e) => updateItemObservation(item.id, e.target.value)}
                            className={`w-full p-4 border rounded-xl text-xs font-bold text-slate-700 outline-none uppercase transition-all shadow-inner ${
                              isJustificationMissing
                                ? 'bg-red-50 border-red-500 ring-4 ring-red-500/10 placeholder:text-red-300' 
                                : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                            }`}
                            rows={3}
                          />
                        </div>
                      )}
                    </>
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

        <div className="sticky bottom-6 flex flex-col gap-4">
           {validationError && (
              <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center justify-center gap-3 animate-pulse mx-auto border-4 border-white">
                <AlertTriangle size={20} />
                <span className="font-black uppercase text-xs">Existem pendências de justificativa acima</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-2xl ${
                validationError 
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              } text-white`}
            >
              {isSubmitting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
              Finalizar Relatório de Campo
            </button>
        </div>
      </form>
    </div>
  );
};

export default ChecklistArea;
