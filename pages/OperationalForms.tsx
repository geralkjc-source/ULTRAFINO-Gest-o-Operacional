import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft as ArrowLeftIcon, 
  User as UserIcon, 
  Calendar as CalendarIcon, 
  MessageSquare as MessageSquareIcon, 
  CheckCircle2 as CheckCircleIcon, 
  Signature as SignatureIcon,
  Clock as ClockIcon, 
  MapPin as MapPinIcon, 
  AlertTriangle as AlertTriangleIcon,
  Award,
  Zap,
  ShieldAlert,
  Wrench,
  Cpu,
  UserCog
} from 'lucide-react';
import { Area, Turma, Turno, Discipline, PendingItem } from '../types';
import { getCurrentShiftInfo } from '../services/shiftService';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OperationalFormsProps {
  onAddManualPending: (pending: PendingItem) => void;
}

const OperationalForms: React.FC<OperationalFormsProps> = ({ onAddManualPending }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'praise' | 'failure'>('praise');
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Praise Form State
  const [praiseData, setPraiseData] = useState({
    elogioNome: '',
    elogioDepartamento: '',
    elogioFuncao: '',
    quemElogiaNome: '',
    quemElogiaDepartamento: '',
    quemElogiaFuncao: '',
    dataElogio: '',
    motivoElogio: '',
    impactoElogio: '',
    assinaturaColaborador: '',
    assinaturaSupervisor: '',
  });

  // Failure Form State
  const [failureData, setFailureData] = useState({
    colaboradorNome: '',
    colaboradorDepartamento: '',
    colaboradorFuncao: '',
    dataOcorrencia: '',
    horaOcorrencia: '',
    localOcorrencia: '',
    descricaoFalha: '',
    causasProvaveis: [] as string[],
    outraCausa: '',
    consequenciasObservadas: '',
    acoesCorretivas: '',
    medidasPreventivas: '',
    responsavelRegisto: '',
    supervisorGestor: '',
  });

  const generatePraisePDF = (data: typeof praiseData) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text('FORMULÁRIO DE ELOGIO OPERACIONAL', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Plataforma Ultrafino Usina 2', 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [['CAMPO', 'INFORMAÇÃO']],
      body: [
        ['1. DADOS DO COLABORADOR ELOGIADO', ''],
        ['Nome', data.elogioNome],
        ['Departamento / Equipa', data.elogioDepartamento],
        ['Função', data.elogioFuncao],
        ['2. DADOS DE QUEM ELOGIA', ''],
        ['Nome', data.quemElogiaNome],
        ['Departamento / Função', data.quemElogiaDepartamento],
        ['Função', data.quemElogiaFuncao],
        ['3. DATA DO ELOGIO', data.dataElogio],
        ['4. MOTIVO DO ELOGIO', data.motivoElogio],
        ['5. IMPACTO DA AÇÃO ELOGIADA', data.impactoElogio],
        ['6. ASSINATURAS', ''],
        ['Colaborador que regista', data.assinaturaColaborador],
        ['Supervisor / Gestor', data.assinaturaSupervisor],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    doc.setFontSize(8);
    doc.text(`Gerado em: ${timestamp}`, 10, doc.internal.pageSize.height - 10);
    doc.save(`Elogio_${data.elogioNome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const generateFailurePDF = (data: typeof failureData) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text('FORMULÁRIO DE FALHA OPERACIONAL', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Plataforma Ultrafino Usina 2', 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [['CAMPO', 'INFORMAÇÃO']],
      body: [
        ['1. DADOS DO COLABORADOR ENVOLVIDO', ''],
        ['Nome', data.colaboradorNome],
        ['Departamento / Equipa', data.colaboradorDepartamento],
        ['Função', data.colaboradorFuncao],
        ['2. DATA E HORA DA OCORRÊNCIA', `${data.dataOcorrencia} ${data.horaOcorrencia}`],
        ['3. LOCAL DA OCORRÊNCIA', data.localOcorrencia],
        ['4. DESCRIÇÃO DA FALHA', data.descricaoFalha],
        ['5. CAUSAS PROVÁVEIS', data.causasProvaveis.join(', ') + (data.outraCausa ? ` - ${data.outraCausa}` : '')],
        ['6. CONSEQUÊNCIAS OBSERVADAS', data.consequenciasObservadas],
        ['7. AÇÕES CORRETIVAS IMEDIATAS', data.acoesCorretivas],
        ['8. MEDIDAS PREVENTIVAS RECOMENDADAS', data.medidasPreventivas],
        ['9. ASSINATURAS', ''],
        ['Responsável pelo registo', data.responsavelRegisto],
        ['Supervisor / Gestor', data.supervisorGestor],
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    doc.setFontSize(8);
    doc.text(`Gerado em: ${timestamp}`, 10, doc.internal.pageSize.height - 10);
    doc.save(`Falha_${data.colaboradorNome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handlePraiseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPraiseData(prev => ({ ...prev, [name]: value }));
  };

  const handleFailureChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFailureData(prev => ({ ...prev, [name]: value }));
  };

  const handleFailureCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFailureData(prev => ({
      ...prev,
      causasProvaveis: checked
        ? [...prev.causasProvaveis, value]
        : prev.causasProvaveis.filter(causa => causa !== value),
    }));
  };

  const handlePraiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulário de Elogio Submetido:', praiseData);
    generatePraisePDF(praiseData);
    alert('Formulário de Elogio Submetido e PDF Gerado com Sucesso!');
    navigate(-1);
  };

  const handleFailureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulário de Falha Submetido:', failureData);
    generateFailurePDF(failureData);
    alert('Formulário de Falha Submetido e PDF Gerado com Sucesso!');
    navigate(-1);
  };

  const causasOptions = [
    'Procedimento não seguido',
    'Falha de comunicação',
    'Falha técnica / equipamento',
    'Erro humano',
    'Formação insuficiente',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);





  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ULTRAADMIN') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta!');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Acesso Restrito</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Insira a senha de administrador</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="SENHA"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-center tracking-[0.5em] focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              autoFocus
            />
            {error && <p className="text-red-500 text-[10px] font-black uppercase text-center animate-bounce">{error}</p>}
          </div>
          <button type="submit" className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
            Entrar
          </button>
          <button type="button" onClick={() => navigate('/')} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">
            Voltar ao Início
          </button>
        </form>
      </div>
    );
  }

  // Manual Pending State
  // const [pendingData, setPendingData] = useState({
  //   operator: '',
  //   area: Area.DFP2,
  //   tag: '',
  //   description: '',
  //   priority: 'media' as 'baixa' | 'media' | 'alta',
  //   discipline: 'OPERAÇÃO' as Discipline,
  // });



  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeftIcon size={16} /> Voltar</button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Formulários Operacionais</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Plataforma Ultrafino Usina 2</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border-2 border-slate-200 shadow-inner">
        <button 
          onClick={() => setActiveTab('praise')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all ${activeTab === 'praise' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Award size={20} /> Elogio
        </button>
        <button 
          onClick={() => setActiveTab('failure')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all ${activeTab === 'failure' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Zap size={20} /> Falha
        </button>
      </div>

      {activeTab === 'praise' && (
        <form onSubmit={handlePraiseSubmit} className="space-y-8 pb-12">
          {/* Dados do Colaborador Elogiado */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-blue-500" /> 1. Dados do Colaborador Elogiado</h2>
            <input type="text" name="elogioNome" placeholder="Nome" value={praiseData.elogioNome} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="elogioDepartamento" placeholder="Departamento / Equipa" value={praiseData.elogioDepartamento} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="elogioFuncao" placeholder="Função" value={praiseData.elogioFuncao} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Dados de Quem Elogia */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-blue-500" /> 2. Dados de Quem Elogia</h2>
            <input type="text" name="quemElogiaNome" placeholder="Nome" value={praiseData.quemElogiaNome} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="quemElogiaDepartamento" placeholder="Departamento / Função" value={praiseData.quemElogiaDepartamento} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="quemElogiaFuncao" placeholder="Função" value={praiseData.quemElogiaFuncao} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Data do Elogio */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CalendarIcon size={16} className="text-blue-500" /> 3. Data do Elogio</h2>
            <input type="date" name="dataElogio" value={praiseData.dataElogio} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Motivo do Elogio */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquareIcon size={16} className="text-blue-500" /> 4. Motivo do Elogio</h2>
            <textarea name="motivoElogio" placeholder="Descreva a ação positiva realizada, comportamento exemplar, contribuição, iniciativa, segurança, trabalho em equipa, etc." value={praiseData.motivoElogio} onChange={handlePraiseChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Impacto da Ação Elogiada */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircleIcon size={16} className="text-blue-500" /> 5. Impacto da Ação Elogiada</h2>
            <textarea name="impactoElogio" placeholder="Como essa atitude contribuiu para a operação, segurança, produtividade ou clima de trabalho?" value={praiseData.impactoElogio} onChange={handlePraiseChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Assinaturas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><SignatureIcon size={16} className="text-blue-500" /> 6. Assinaturas</h2>
            <input type="text" name="assinaturaColaborador" placeholder="Colaborador que regista o elogio" value={praiseData.assinaturaColaborador} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="assinaturaSupervisor" placeholder="Supervisor / Gestor" value={praiseData.assinaturaSupervisor} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          <button type="submit" className="w-full py-6 rounded-[2rem] bg-emerald-600 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 text-sm">
            <Award size={20} /> ENVIAR ELOGIO
          </button>
        </form>
      )}

      {activeTab === 'failure' && (
        <form onSubmit={handleFailureSubmit} className="space-y-8 pb-12">
          {/* Dados do Colaborador Envolvido */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-red-500" /> 1. Dados do Colaborador Envolvido</h2>
            <input type="text" name="colaboradorNome" placeholder="Nome" value={failureData.colaboradorNome} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="colaboradorDepartamento" placeholder="Departamento / Equipa" value={failureData.colaboradorDepartamento} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="colaboradorFuncao" placeholder="Função" value={failureData.colaboradorFuncao} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Data e Hora da Ocorrência */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CalendarIcon size={16} className="text-red-500" /> 2. Data e Hora da Ocorrência</h2>
            <input type="date" name="dataOcorrencia" value={failureData.dataOcorrencia} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="time" name="horaOcorrencia" value={failureData.horaOcorrencia} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Local da Ocorrência */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MapPinIcon size={16} className="text-red-500" /> 3. Local da Ocorrência</h2>
            <input type="text" name="localOcorrencia" placeholder="Local da Ocorrência" value={failureData.localOcorrencia} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Descrição da Falha Operacional */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquareIcon size={16} className="text-red-500" /> 4. Descrição da Falha Operacional</h2>
            <textarea name="descricaoFalha" placeholder="Explique claramente o que aconteceu." value={failureData.descricaoFalha} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Causas Prováveis */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><AlertTriangleIcon size={16} className="text-red-500" /> 5. Causas Prováveis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {causasOptions.map(causa => (
                <label key={causa} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" value={causa} checked={failureData.causasProvaveis.includes(causa)} onChange={handleFailureCheckboxChange} className="form-checkbox h-5 w-5 text-red-600 rounded" />
                  {causa}
                </label>
              ))}
              <input type="text" name="outraCausa" placeholder="Outra (especifique)" value={failureData.outraCausa} onChange={handleFailureChange} className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" />
            </div>
          </div>

          {/* Consequências Observadas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquareIcon size={16} className="text-red-500" /> 6. Consequências Observadas</h2>
            <textarea name="consequenciasObservadas" placeholder="Descreva as consequências observadas." value={failureData.consequenciasObservadas} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Ações Corretivas Imediatas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircleIcon size={16} className="text-red-500" /> 7. Ações Corretivas Imediatas</h2>
            <textarea name="acoesCorretivas" placeholder="Descreva as ações corretivas tomadas imediatamente." value={failureData.acoesCorretivas} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Medidas Preventivas Recomendadas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><AlertTriangleIcon size={16} className="text-red-500" /> 8. Medidas Preventivas Recomendadas</h2>
            <textarea name="medidasPreventivas" placeholder="Descreva as medidas preventivas recomendadas para evitar recorrência." value={failureData.medidasPreventivas} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Assinaturas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><SignatureIcon size={16} className="text-red-500" /> 9. Assinaturas</h2>
            <input type="text" name="responsavelRegisto" placeholder="Responsável pelo registo" value={failureData.responsavelRegisto} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="supervisorGestor" placeholder="Supervisor / Gestor" value={failureData.supervisorGestor} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          <button type="submit" className="w-full py-6 rounded-[2rem] bg-red-600 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-red-700 transition-all active:scale-95 text-sm">
            <Zap size={20} /> REGISTRAR FALHA
          </button>
        </form>
      )}


    </div>
  );
};

export default OperationalForms;
