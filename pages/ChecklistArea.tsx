
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  CheckCircle2,
  Check as CheckIcon,
  ShieldAlert,
  Target,
  AlertTriangle,
  StickyNote,
  RotateCcw,
  Send,
  Wrench,
  Zap as ZapIcon,
  Cpu,
  UserCog,
  Copy
} from 'lucide-react';
import { Area, Turma, Turno, ChecklistItem, Report, Discipline } from '../types';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [isColumnsFeeding, setIsColumnsFeeding] = useState(true);

  useEffect(() => {
    const template = CHECKLIST_TEMPLATES[currentArea];
    if (template) {
      setItems(template.map((label, index) => ({
        id: `item-${index}`,
        label,
        status: 'ok',
        discipline: 'MECÂNICA',
        observation: ''
      })));
    }
  }, [currentArea]);

  const updateItemStatus = (id: string, status: 'ok' | 'fail' | 'na' | 'warning', observation?: string) => {
    const item = items.find(i => i.id === id);
    if (item?.label === 'ALIMENTANDO COLUNAS?') {
      setIsColumnsFeeding(status === 'ok');
    }
    
    // Atribuição automática de disciplina
    let autoDiscipline: Discipline = 'OPERAÇÃO';
    const labelLower = item?.label.toLowerCase() || '';
    if (labelLower.includes('sprays') || labelLower.includes('v-belts') || labelLower.includes('pano') || labelLower.includes('underpan') || labelLower.includes('resguardos')) {
      autoDiscipline = 'MECÂNICA';
    } else if (labelLower.includes('valvula') || labelLower.includes('corse') || labelLower.includes('retorno') || labelLower.includes('qualidade água')) {
      autoDiscipline = 'OPERAÇÃO';
    }

    setItems(items.map(item => item.id === id ? { 
      ...item, 
      status, 
      discipline: autoDiscipline,
      observation: observation !== undefined ? observation : item.observation 
    } : item));
    setValidationError(null);
  };

  const updateItemDiscipline = (id: string, discipline: Discipline) => {
    setItems(items.map(item => item.id === id ? { ...item, discipline } : item));
  };

  const updateItemObservation = (id: string, observation: string) => {
    setItems(items.map(item => item.id === id ? { ...item, observation } : item));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsRequiringJustification = items.filter(item => {
      const isHeader = item.label.startsWith('SECTION:');
      const labelLower = item.label.toLowerCase();
      
      if (item.label === 'ALIMENTANDO COLUNAS?' && item.status === 'fail') {
        return !item.observation || item.observation === 'NÃO' || item.observation.trim() === '';
      }

      if (!isColumnsFeeding && (labelLower.includes('coluna') || labelLower.includes('-fc-') || labelLower.includes('frother') || labelLower.includes('colector') || labelLower.includes('feed rate colunas'))) {
        return false;
      }

      const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(%)') || labelLower.includes('(kpa)') || 
                            labelLower.includes('(tph)') || labelLower.includes('(g/t)') || labelLower.includes('(hz)') || 
                            labelLower.includes('(ppm)') || labelLower.includes('(t/m³)') || labelLower.includes('(l/min)');
      const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

      if (!isHeader && !isMeasurement && !isTextInput && (item.status === 'fail' || item.status === 'warning')) {
        const obs = item.observation?.trim() || '';
        const autoTexts = [
          'NÃO', 'FECHADO', 'TURVA', 'RUIM', 'SEM RETORNO', 'SIM', 'FORA DO LUGAR', 
          'ANORMAL', 'OK', 'NO LUGAR', 'COM RETORNO', 'ABERTA', 'FECHADA', 'LIMPA', 'SUJA'
        ];
        return obs === '' || autoTexts.includes(obs.toUpperCase());
      }
      return false;
    });

    if (itemsRequiringJustification.length > 0) {
      setValidationError(`Justificativa obrigatória não preenchida para o item: ${itemsRequiringJustification[0].label}`);
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

  const renderItemControl = (item: ChecklistItem) => {
    const labelLower = item.label.toLowerCase();
    
    // Controles Customizados Ultrafino v9.0
    if (labelLower.includes('condições dos resguardos')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'NO LUGAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'NO LUGAR' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>NO LUGAR</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'FORA DO LUGAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'FORA DO LUGAR' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>FORA DO LUGAR</button>
        </div>
      );
    }

    if (labelLower.includes('sprays') || labelLower.includes('v-belts') || labelLower.includes('pano') || labelLower.includes('underpan')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'OK')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'OK' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>OK</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'ANORMAL')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'ANORMAL' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>ANORMAL</button>
        </div>
      );
    }

    if (labelLower.includes('valvula de diluicao') || labelLower.includes('corse seeding')) {
       const isNormalClosed = true;
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, isNormalClosed ? 'warning' : 'ok', 'ABERTA')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'ABERTA' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>ABERTA</button>
          <button type="button" onClick={() => updateItemStatus(item.id, isNormalClosed ? 'ok' : 'fail', 'FECHADA')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'FECHADA' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>FECHADA</button>
        </div>
      );
    }

    if (labelLower.includes('qualidade água')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'LIMPA')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'LIMPA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>LIMPA</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'warning', 'TURVA')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'TURVA' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500'}`}>TURVA</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'SUJA')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'SUJA' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>SUJA</button>
        </div>
      );
    }

    if (labelLower.includes('retorno do tanque 104')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'COM RETORNO')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'COM RETORNO' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>COM RETORNO</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'SEM RETORNO')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'SEM RETORNO' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>SEM RETORNO</button>
        </div>
      );
    }

    if (item.label === 'ALIMENTANDO COLUNAS?') {
      return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'SIM')} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${item.status === 'ok' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>SIM</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', '')} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${item.status === 'fail' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>NÃO</button>
        </div>
      );
    }

    const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(%)') || labelLower.includes('(kpa)') || 
                          labelLower.includes('(tph)') || labelLower.includes('(g/t)') || labelLower.includes('(hz)') || 
                          labelLower.includes('(ppm)') || labelLower.includes('(t/m³)') || labelLower.includes('(l/min)');
    const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

    if (isMeasurement || isTextInput) {
       return (
        <div className="relative w-full max-w-[200px]">
          <input type={isMeasurement && !labelLower.includes('ply') ? "number" : "text"} placeholder={isMeasurement ? "Vlr..." : "Preencher..."} value={item.observation || ''} onChange={(e) => updateItemObservation(item.id, e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-black text-[11px] uppercase transition-all text-blue-600" />
        </div>
       );
    }

    return (
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
        <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'OK')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>OK</button>
        <button type="button" onClick={() => updateItemStatus(item.id, 'na', 'STANDBY')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'na' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>SBY</button>
        <button type="button" onClick={() => updateItemStatus(item.id, 'fail')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>FALHA</button>
        <button type="button" onClick={() => updateItemStatus(item.id, 'warning')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'warning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>ANOM</button>
      </div>
    );
  };

  let skipDueToNoFeed = false;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100 animate-bounce"><CheckCircle2 size={56} /></div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório Concluído!</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Base de dados v9.0 Stable atualizada.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleShareWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"><Send size={20} /> Compartilhar Agora</button>
              <button onClick={handleCopyText} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl border-2 active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-100 hover:border-slate-300'}`}>{copyFeedback ? <CheckIcon size={20} /> : <Copy size={20} />}{copyFeedback ? 'Copiado!' : 'Copiar Texto'}</button>
              <button onClick={() => navigate('/history')} className="w-full text-slate-400 py-3 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">Ver Histórico de Turnos</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeft size={16} /> Voltar</button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{currentArea}</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Checklist Operação v9.0 Stable</p>
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl flex items-center gap-4 text-red-600 animate-shake shadow-lg shadow-red-500/5">
          <AlertTriangle className="shrink-0" size={24} />
          <p className="font-black text-[11px] uppercase tracking-wider leading-relaxed">{validationError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 pb-12">
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><UserCog size={14} className="text-blue-500" /> Identificação do Operador</label>
            <input type="text" required placeholder="DIGITE SEU NOME..." value={operator} onChange={(e) => setOperator(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={14} className="text-blue-500" /> Turma de Trabalho</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C', 'D'] as Turma[]).map(t => (
                <button key={t} type="button" onClick={() => setTurma(t)} className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all border-2 active:scale-95 ${turma === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
          {items.map((item, idx) => {
            const isHeader = item.label.startsWith('SECTION:');
            const labelLower = item.label.toLowerCase();

            if (item.label === 'ALIMENTANDO COLUNAS?') {
              skipDueToNoFeed = !isColumnsFeeding;
            } else if (isHeader && labelLower.includes('equipamentos hbf')) {
              skipDueToNoFeed = false;
            }

            if (skipDueToNoFeed && item.label !== 'ALIMENTANDO COLUNAS?') {
              const isActuallyColumnItem = labelLower.includes('coluna') || labelLower.includes('-fc-') || labelLower.includes('frother') || labelLower.includes('colector') || labelLower.includes('feed rate colunas') || labelLower.includes('ar (kpa)') || labelLower.includes('nível (%)') || labelLower.includes('setpoint (%)');
              if (isActuallyColumnItem) return null;
            }

            const isFailOrWarning = item.status === 'fail' || item.status === 'warning';
            const isNoFeedButNeedsObs = item.label === 'ALIMENTANDO COLUNAS?' && item.status === 'fail';
            
            // Simplificação: Não mostrar disciplina para subconjuntos HBF e sistemas auxiliares
            const isSimplifiedItem = labelLower.includes('sprays') || labelLower.includes('v-belts') || labelLower.includes('pano') || labelLower.includes('underpan') || labelLower.includes('resguardos') || labelLower.includes('valvula') || labelLower.includes('corse') || labelLower.includes('retorno') || labelLower.includes('qualidade água') || item.label === 'ALIMENTANDO COLUNAS?';
            
            return (
              <div key={item.id} className={`p-8 space-y-6 transition-colors ${isHeader ? 'bg-slate-50/80 backdrop-blur-sm' : 'hover:bg-slate-50/30'}`}>
                {isHeader ? (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-1 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{item.label.replace('SECTION:', '')}</h3>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.label}</h4>
                      </div>
                      {renderItemControl(item)}
                    </div>
                    
                    {(isFailOrWarning || isNoFeedButNeedsObs) && (
                      <div className="p-6 bg-slate-50 rounded-[2rem] space-y-6 border-2 border-slate-100 animate-in slide-in-from-top-4 duration-300">
                        {isFailOrWarning && !isSimplifiedItem && (
                          <div className="space-y-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2"><ShieldAlert size={14} className="text-red-500" /> Setor Responsável pela Anomalia</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { id: 'MECÂNICA', icon: <Wrench size={12} />, color: 'bg-orange-500' },
                                { id: 'ELÉTRICA', icon: <ZapIcon size={12} />, color: 'bg-blue-500' },
                                { id: 'INSTRUMENTAÇÃO', icon: <Cpu size={12} />, color: 'bg-purple-500' },
                                { id: 'OPERAÇÃO', icon: <UserCog size={12} />, color: 'bg-emerald-500' }
                              ].map(disc => (
                                <button key={disc.id} type="button" onClick={() => updateItemDiscipline(item.id, disc.id as Discipline)} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all active:scale-95 ${item.discipline === disc.id ? `${disc.color} text-white border-transparent shadow-lg` : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{disc.icon} {disc.id}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {item.label === 'ALIMENTANDO COLUNAS?' ? 'JUSTIFICATIVA PARA NÃO ALIMENTAR' : 'Descrição Técnica da Falha'}
                          </label>
                          <textarea placeholder={item.label === 'ALIMENTANDO COLUNAS?' ? "DESCREVA O MOTIVO DA PARADA..." : "DESCREVA O PROBLEMA COM DETALHES..."} value={item.observation} onChange={(e) => updateItemObservation(item.id, e.target.value)} className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-red-400 transition-all shadow-inner" rows={3} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><StickyNote size={14} className="text-blue-500" /> Observações Gerais / Passagem de Turno</label>
           <textarea placeholder="REGISTRE AQUI PONTOS DE ATENÇÃO PARA O PRÓXIMO TURNO..." value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-sm">
          {isSubmitting ? <RotateCcw size={20} className="animate-spin" /> : <Send size={20} />}
          {isSubmitting ? 'PROCESSANDO...' : 'TRANSMITIR RELATÓRIO v9.0'}
        </button>
      </form>
    </div>
  );
};

export default ChecklistArea;
