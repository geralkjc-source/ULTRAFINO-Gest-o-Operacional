import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft as ArrowLeftIcon, 
  MapPin as MapPinIcon, 
  AlertTriangle as AlertTriangleIcon,
  Award,
  FlaskConical,
  Activity,
  Percent,
  UserCog,
  Droplets,
  Columns
} from 'lucide-react';
import { Turma, Turno, QualityReport } from '../types';
import { getCurrentShiftInfo } from '../services/shiftService';
import { fetchEmployees, Employee } from '../services/employeeService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DFPResultsProps {
  onSaveQualityReport: (report: QualityReport) => void;
}

const DFPResults: React.FC<DFPResultsProps> = ({ onSaveQualityReport }) => {
  const navigate = useNavigate();
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    operator: '',
    ply: '',
    timestamp: new Date().toISOString().split('T')[0],
    turno: detectedScale.turno,
    dfp2_c_cr: '',
    dfp2_c_yield: '',
    dfp2_c_reject_ash: '',
    dfp2_c_conc_ash: '',
    dfp2_d_cr: '',
    dfp2_d_yield: '',
    dfp2_d_reject_ash: '',
    dfp2_d_conc_ash: '',
    colunas_d_cr: '',
    colunas_d_yield: '',
    colunas_d_reject_ash: '',
    colunas_d_conc_ash: '',
    humidade_fundo: '',
    humidade_oversize: '',
    humidade_concentrado: '',
    generalObservations: ''
  });

  // ================= VALIDATION LOGIC =================
  const verificarDFP2 = (d: any) => {
    console.log('verificarDFP2 d:', d);
    let alertas = [];
    const cr = parseFloat(d.cr || '0');
    const yld = parseFloat(d.yield || '0');
    const ra = parseFloat(d.rejectAsh || '0');
    const ca = parseFloat(d.concAsh || '0');

    if (cr < 40) alertas.push("🔴 CR baixo");
    if (yld < 35) alertas.push("🔴 Yield baixo");
    if (ra < 30) alertas.push("🔴 Perda de carvão no rejeito");
    if (ca > 11) alertas.push("🟡 Cinza alta no concentrado");

    return alertas.length ? alertas : ["🟢 DFP2 Normal"];
  };

  const verificarColunaC = (d: any) => {
    let alertas = [];
    const pa = parseFloat(d.productAsh || '0');
    const yld = parseFloat(d.yield || '0');
    const cr = parseFloat(d.cr || '0');
    const ta = parseFloat(d.tailAsh || '0');

    if (pa > 11) alertas.push("🔴 Produto fora de especificação");
    if (yld < 55) alertas.push("🔴 Yield baixo");
    if (cr < 65) alertas.push("🔴 CR baixo");
    if (ta < 45) alertas.push("🔴 Carvão no tail");

    return alertas.length ? alertas : ["🟢 Coluna C Normal"];
  };

  const verificarColunaD = (d: any) => {
    console.log('verificarColunaD d:', d);
    let alertas = [];
    const pa = parseFloat(d.productAsh || '0');
    const yld = parseFloat(d.yield || '0');
    const cr = parseFloat(d.cr || '0');
    const ta = parseFloat(d.tailAsh || '0');

    if (pa > 11) alertas.push("🔴 Produto fora de especificação");
    if (yld < 55) alertas.push("🔴 Yield baixo");
    if (cr < 65) alertas.push("🔴 CR baixo");
    if (ta < 45) alertas.push("🔴 Carvão no tail");

    return alertas.length ? alertas : ["🟢 Coluna D Normal"];
  };

  const verificarHumidade = (tmStr: string | number) => {
    const TM = parseFloat(tmStr as string || '0');
    if (isNaN(TM)) return [];

    if (TM > 14.0) return ["🔴 Humidade muito alta"];
    if (TM > 13.5) return ["🟡 Humidade acima do target"];
    if (TM < 12.0) return ["🔵 Produto muito seco"];

    return ["🟢 Humidade Normal"];
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'operator') {
      setSearchTerm(value);
      setShowSuggestions(value.length > 1);
    }
  };

  const selectEmployee = (emp: Employee) => {
    setFormData(prev => ({ ...prev, operator: emp.nome.toUpperCase() }));
    setShowSuggestions(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const timestamp = new Date().toLocaleString('pt-BR', { hour12: false });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE QUALIDADE E YIELD', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PLATAFORMA OPERACIONAL ULTRAFINO - USINA 2', pageWidth / 2, 26, { align: 'center' });

    // Meta Info Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    
    // Left Column Info
    doc.setFont('helvetica', 'bold');
    doc.text('OPERADOR:', 15, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.operator.toUpperCase(), 45, 45);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DATA:', 15, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.timestamp, 45, 52);

    // Right Column Info
    doc.setFont('helvetica', 'bold');
    doc.text('PLY:', pageWidth / 2, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.ply.toUpperCase(), pageWidth / 2 + 15, 45);
    
    doc.setFont('helvetica', 'bold');
    doc.text('GERADO EM:', pageWidth / 2, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(timestamp, pageWidth / 2 + 30, 52);

    const body = [
      // DFP2 C
      [{ content: 'DFP 2 - PLANTA C', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center', textColor: [30, 41, 59] } }],
      ['CR (%)', formData.dfp2_c_cr, verificarDFP2({cr: formData.dfp2_c_cr, yield: formData.dfp2_c_yield, rejectAsh: formData.dfp2_c_reject_ash, concAsh: formData.dfp2_c_conc_ash}).join(' | ')],
      ['Yield (%)', formData.dfp2_c_yield, ''],
      ['Reject Ash (%)', formData.dfp2_c_reject_ash, ''],
      ['Conc Ash (%)', formData.dfp2_c_conc_ash, ''],
      
      // DFP2 D
      [{ content: 'DFP 2 - PLANTA D', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center', textColor: [30, 41, 59] } }],
      ['CR (%)', formData.dfp2_d_cr, verificarDFP2({cr: formData.dfp2_d_cr, yield: formData.dfp2_d_yield, rejectAsh: formData.dfp2_d_reject_ash, concAsh: formData.dfp2_d_conc_ash}).join(' | ')],
      ['Yield (%)', formData.dfp2_d_yield, ''],
      ['Reject Ash (%)', formData.dfp2_d_reject_ash, ''],
      ['Conc Ash (%)', formData.dfp2_d_conc_ash, ''],

      // COLUNA D
      [{ content: 'COLUNAS D', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center', textColor: [30, 41, 59] } }],
      ['Product Ash (%)', formData.colunas_d_conc_ash, verificarColunaD({productAsh: formData.colunas_d_conc_ash, yield: formData.colunas_d_yield, cr: formData.colunas_d_cr, tailAsh: formData.colunas_d_reject_ash}).join(' | ')],
      ['Yield (%)', formData.colunas_d_yield, ''],
      ['CR (%)', formData.colunas_d_cr, ''],
      ['Tail Ash (%)', formData.colunas_d_reject_ash, ''],

      // HUMIDADE
      [{ content: 'HUMIDADE', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center', textColor: [30, 41, 59] } }],
      ['Humidade Fundo (%)', formData.humidade_fundo, verificarHumidade(formData.humidade_fundo).join(' | ')],
      ['Humidade Oversize (%)', formData.humidade_oversize, verificarHumidade(formData.humidade_oversize).join(' | ')],
      ['Humidade Concentrado (%)', formData.humidade_concentrado, verificarHumidade(formData.humidade_concentrado).join(' | ')],
    ];

    autoTable(doc, {
      startY: 60,
      head: [['PARÂMETRO', 'VALOR', 'STATUS / ALERTAS DE QUALIDADE']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240] },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'center', cellWidth: 40 },
        2: { fontSize: 8, textColor: [71, 85, 105] }
      }
    });

    doc.save(`Relatorio_Qualidade_${formData.ply}_${Date.now()}.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newReport: QualityReport = {
      id: `qual-${Date.now()}`,
      timestamp: Date.now(),
      operator: formData.operator,
      turma: detectedScale.turma,
      turno: detectedScale.turno,
      ply: formData.ply,
      dfp2_c_cr: parseFloat(formData.dfp2_c_cr || '0'),
      dfp2_c_yield: parseFloat(formData.dfp2_c_yield || '0'),
      dfp2_c_reject_ash: parseFloat(formData.dfp2_c_reject_ash || '0'),
      dfp2_c_conc_ash: parseFloat(formData.dfp2_c_conc_ash || '0'),
      dfp2_d_cr: parseFloat(formData.dfp2_d_cr || '0'),
      dfp2_d_yield: parseFloat(formData.dfp2_d_yield || '0'),
      dfp2_d_reject_ash: parseFloat(formData.dfp2_d_reject_ash || '0'),
      dfp2_d_conc_ash: parseFloat(formData.dfp2_d_conc_ash || '0'),
      colunas_d_cr: parseFloat(formData.colunas_d_cr || '0'),
      colunas_d_yield: parseFloat(formData.colunas_d_yield || '0'),
      colunas_d_reject_ash: parseFloat(formData.colunas_d_reject_ash || '0'),
      colunas_d_conc_ash: parseFloat(formData.colunas_d_conc_ash || '0'),
      humidade_fundo: parseFloat(formData.humidade_fundo || '0'),
      humidade_oversize: parseFloat(formData.humidade_oversize || '0'),
      humidade_concentrado: parseFloat(formData.humidade_concentrado || '0'),
      generalObservations: formData.generalObservations
    };

    onSaveQualityReport(newReport);
    generatePDF();
    alert('Resultados de Qualidade Registrados com Sucesso!');
    navigate(-1);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeftIcon size={16} /> Voltar</button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Qualidade e Yield</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Plataforma Ultrafino Usina 2</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-12">
        
        {/* DFP2 PLANT C SECTION */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={16} className="text-blue-500" /> DFP2 - PLANTA C
            </h2>
            <div className="flex flex-wrap gap-2 justify-end">
              {verificarDFP2({cr: formData.dfp2_c_cr, yield: formData.dfp2_c_yield, rejectAsh: formData.dfp2_c_reject_ash, concAsh: formData.dfp2_c_conc_ash}).map((a, i) => (
                <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                  {a}
                </span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'CR (%)', field: 'cr' },
              { label: 'Yield (%)', field: 'yield' },
              { label: 'Reject Ash (%)', field: 'rejectAsh' },
              { label: 'Conc Ash (%)', field: 'concAsh' },
            ].map(item => (
              <div key={item.field} className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{item.label}</label>
                <input 
                  type="number" step="0.01" 
                  value={(formData as any)[`dfp2_c_${item.field}`]} 
                  onChange={(e) => handleInputChange(`dfp2_c_${item.field}`, e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        {/* DFP2 PLANT D SECTION */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={16} className="text-blue-600" /> DFP2 - PLANTA D
            </h2>
            <div className="flex flex-wrap gap-2 justify-end">
              {verificarDFP2({cr: formData.dfp2_d_cr, yield: formData.dfp2_d_yield, rejectAsh: formData.dfp2_d_reject_ash, concAsh: formData.dfp2_d_conc_ash}).map((a, i) => (
                <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                  {a}
                </span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'CR (%)', field: 'cr' },
              { label: 'Yield (%)', field: 'yield' },
              { label: 'Reject Ash (%)', field: 'rejectAsh' },
              { label: 'Conc Ash (%)', field: 'concAsh' },
            ].map(item => (
              <div key={item.field} className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{item.label}</label>
                <input 
                  type="number" step="0.01" 
                  value={(formData as any)[`dfp2_d_${item.field}`]} 
                  onChange={(e) => handleInputChange(`dfp2_d_${item.field}`, e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA D SECTION */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <Columns size={16} className="text-indigo-500" /> COLUNAS D
            </h2>
            <div className="flex flex-wrap gap-2 justify-end">
              {verificarColunaD({productAsh: formData.colunas_d_conc_ash, yield: formData.colunas_d_yield, cr: formData.colunas_d_cr, tailAsh: formData.colunas_d_reject_ash}).map((a, i) => (
                <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                  {a}
                </span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Product Ash (%)', field: 'productAsh' },
              { label: 'Yield (%)', field: 'yield' },
              { label: 'CR (%)', field: 'cr' },
              { label: 'Tail Ash (%)', field: 'tailAsh' },
            ].map(item => (
              <div key={item.field} className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{item.label}</label>
                <input 
                  type="number" step="0.01" 
                  value={(formData as any)[`colunas_d_${item.field}`]} 
                  onChange={(e) => handleInputChange(`colunas_d_${item.field}`, e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        {/* HUMIDADE HBF & PLY SECTION */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <Droplets size={16} className="text-cyan-500" /> HUMIDADE E PLY
            </h2>
            <div className="flex flex-wrap gap-2 justify-end">
              {verificarHumidade(formData.humidade_fundo).map((a, i) => (
                <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                  {a}
                </span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">TM (%)</label>
              <input 
                type="number" step="0.01" 
                value={formData.humidade_fundo} 
                onChange={(e) => handleInputChange('humidade_fundo', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-cyan-500 focus:bg-white transition-all shadow-inner"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">PLY</label>
              <input 
                type="text" 
                value={formData.ply} 
                onChange={(e) => handleInputChange('ply', e.target.value)}
                placeholder="EX: BTA1" 
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-cyan-500 focus:bg-white transition-all shadow-inner" 
                required 
              />
            </div>
          </div>
        </div>

        {/* Identificação */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserCog size={16} className="text-slate-500" /> Identificação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input 
                type="text" 
                value={formData.operator} 
                onChange={(e) => handleInputChange('operator', e.target.value)}
                placeholder="NOME DO OPERADOR" 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                required 
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp)} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.matricula} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input 
              type="date" 
              value={formData.timestamp} 
              onChange={(e) => handleInputChange('timestamp', e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
              required 
            />
          </div>
        </div>

        <button type="submit" className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 text-sm">
          <Activity size={20} /> REGISTRAR QUALIDADE E YIELD
        </button>
      </form>
    </div>
  );
};

export default DFPResults;
