
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Lock, 
  Settings2, 
  Copy, 
  Check, 
  Globe,
  Wifi,
  WifiOff,
  AlertTriangle,
  Terminal,
  Save,
  Activity,
  Database,
  ShieldCheck,
  Code,
  CheckCircle2,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { Report, PendingItem } from '../types';
import { syncToGoogleSheets, testScriptConnection, DEFAULT_SCRIPT_URL } from '../services/googleSync';

const ADMIN_PASSWORD = 'ULTRAADMIN'; 
const MASTER_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Ul_SSH2Bqr6hLyIqzNGelK44Y21SX91gQg_XPjvhEVw/edit?gid=248763946#gid=248763946';

interface SyncDashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
  onSyncSuccess: (syncedReportIds: string[], syncedPendingIds: string[]) => void;
}

const SyncDashboard: React.FC<SyncDashboardProps> = ({ reports, pendingItems, onSyncSuccess }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL);
  const [showConfig, setshowConfig] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (scriptUrl) localStorage.setItem('google_apps_script_url', scriptUrl);
  }, [scriptUrl]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 10));
  };

  const handleTestConnection = async () => {
    setTestStatus('loading');
    addLog("Iniciando Handshake v1.4 Stable...");
    const result = await testScriptConnection(scriptUrl);
    if (result.success) {
      setTestStatus('success');
      setTestMessage(result.message);
      addLog("Sucesso: Script v1.4 Online.");
    } else {
      setTestStatus('error');
      setTestMessage(result.message);
      addLog("Erro: " + result.message);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    addLog("Auditando Volume Mensal v1.4...");
    const unsyncedReports = reports.filter(r => !r.synced);
    const unsyncedPending = pendingItems.filter(p => !p.synced);
    
    const result = await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending);
    if (result.success) {
      onSyncSuccess(unsyncedReports.map(r => r.id), unsyncedPending.map(p => p.id));
      addLog("Sincronismo v1.4 Concluído.");
    } else {
      addLog("Falha no envio.");
    }
    setIsSyncing(false);
  };

  const appsScriptCode = `/**
 * PLATAFORMA ULTRAFINO - BACKEND v1.4 STABLE
 * Foco: Volume Acumulado Mensal por Disciplina (Auditagem)
 */

function doPost(e) {
  var data;
  try { 
    data = JSON.parse(e.postData.contents); 
  } catch (err) { 
    return ContentService.createTextOutput("Erro JSON").setMimeType(ContentService.MimeType.TEXT); 
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var monthRef = data.mes_referencia || "Geral";
  
  var sheetReports = ss.getSheetByName("REL_" + monthRef) || ss.insertSheet("REL_" + monthRef);
  var sheetPending = ss.getSheetByName("PEND_" + monthRef) || ss.insertSheet("PEND_" + monthRef);
  var sheetBI = ss.getSheetByName("BI_DASHBOARD_" + monthRef) || ss.insertSheet("BI_DASHBOARD_" + monthRef);
  
  // 1. SINCRONISMO DE RELATÓRIOS
  if (sheetReports.getLastRow() == 0) {
    sheetReports.appendRow(["ID_REF", "DATA", "HORA", "ÁREA", "OPERADOR", "TURMA", "TURNO", "FALHAS", "OBS"]);
    sheetReports.getRange(1, 1, 1, 9).setBackground("#0f172a").setFontColor("#FFF").setFontWeight("bold");
  }
  
  if (data.reports) {
    var repValues = sheetReports.getDataRange().getValues();
    data.reports.forEach(function(r) { 
      var exists = false;
      for (var i = 1; i < repValues.length; i++) { if (repValues[i][0] == r.id) { exists = true; break; } }
      if (!exists) {
        sheetReports.appendRow([r.id, r.data, r.hora, r.area, r.operador, r.turma, r.turno, r.itens_falha, r.obs]); 
      }
    });
  }
  
  // 2. SINCRONISMO DE PENDÊNCIAS (ID_REF)
  if (sheetPending.getLastRow() == 0) {
    sheetPending.appendRow(["TAG", "ÁREA", "DISCIPLINA", "DESCRIÇÃO", "PRIORIDADE", "STATUS", "OP ORIGEM", "TURMA ORIGEM", "OP BAIXA", "TURMA BAIXA", "DATA", "ID_REF"]);
    sheetPending.getRange(1, 1, 1, 12).setBackground("#1e293b").setFontColor("#FFF").setFontWeight("bold");
  }
  
  if (data.pending) {
    var pValues = sheetPending.getDataRange().getValues();
    data.pending.forEach(function(p) { 
      var targetRow = -1;
      for (var i = 1; i < pValues.length; i++) {
        if (pValues[i][11] == p.id) { targetRow = i + 1; break; }
      }
      
      if (targetRow > -1) {
        sheetPending.getRange(targetRow, 6).setValue(p.status.toUpperCase());
        sheetPending.getRange(targetRow, 9).setValue(p.operador_resolucao);
        sheetPending.getRange(targetRow, 10).setValue(p.turma_resolucao);
      } else {
        sheetPending.appendRow([p.tag, p.area, p.disciplina, p.descricao, p.prioridade, p.status, p.operador_origem, p.turma_origem, p.operador_resolucao, p.turma_resolucao, p.data, p.id]);
      }
    });
  }

  // 3. ATUALIZAÇÃO DO BI MENSAL (VOLUME ACUMULADO)
  updateBIAccumulated(sheetBI, sheetPending, monthRef);

  return ContentService.createTextOutput("SUCCESS_V1_4_STABLE").setMimeType(ContentService.MimeType.TEXT);
}

function updateBIAccumulated(sheetBI, sheetPending, monthRef) {
  sheetBI.clear();
  sheetBI.getRange("A1").setValue("BI ULTRAFINO v1.4 - VOLUME TOTAL MENSAL: " + monthRef).setFontWeight("bold").setFontSize(16).setFontColor("#0f172a");
  
  var pendData = sheetPending.getDataRange().getValues();
  
  // TABELA A: VOLUME TOTAL POR DISCIPLINA (NAO DÁ BAIXA)
  sheetBI.getRange("A3").setValue("VOLUME MENSAL ACUMULADO POR DISCIPLINA").setFontWeight("bold").setFontColor("#3b82f6");
  sheetBI.getRange("A4:C4").setValues([["DISCIPLINA", "VOLUME TOTAL", "SITUAÇÃO"]]).setBackground("#f8fafc").setFontWeight("bold");
  var dMap = {"MECÂNICA": 0, "ELÉTRICA": 0, "INSTRUMENTAÇÃO": 0, "OPERAÇÃO": 0};
  for(var i = 1; i < pendData.length; i++) {
    var disc = pendData[i][2];
    if(dMap[disc] !== undefined) dMap[disc]++; // Apenas conta, sem checar status de baixa
  }
  var dRow = 5;
  for(var d in dMap) {
    sheetBI.getRange(dRow, 1, 1, 3).setValues([[d, dMap[d], "REGISTRO ACUMULADO"]]);
    dRow++;
  }

  // TABELA B: EFICIÊNCIA DAS BAIXAS
  var perfStartRow = dRow + 2;
  sheetBI.getRange(perfStartRow, 1).setValue("RANKING DE BAIXAS (PERFORMANCE)").setFontWeight("bold").setFontColor("#10b981");
  sheetBI.getRange(perfStartRow + 1, 1, 1, 2).setValues([["TURMA", "TOTAL BAIXAS"]]).setBackground("#f8fafc").setFontWeight("bold");
  var tMap = {"A": 0, "B": 0, "C": 0, "D": 0};
  for(var i = 1; i < pendData.length; i++) {
    var turmaBaixa = pendData[i][9];
    var status = pendData[i][5];
    if(status == "RESOLVIDO" && tMap[turmaBaixa] !== undefined) tMap[turmaBaixa]++;
  }
  var tRow = perfStartRow + 2;
  for(var t in tMap) {
    sheetBI.getRange(tRow, 1, 1, 2).setValues([[t, tMap[t]]]);
    tRow++;
  }

  // TABELA C: DÍVIDA TÉCNICA (PENDÊNCIAS DA TURMA DE ORIGEM)
  var debtStartRow = tRow + 2;
  sheetBI.getRange(debtStartRow, 1).setValue("DÍVIDA TÉCNICA (CARGA PENDENTE DA ORIGEM)").setFontWeight("bold").setFontColor("#ef4444");
  sheetBI.getRange(debtStartRow + 1, 1, 1, 3).setValues([["TURMA ORIGEM", "D.T (PENDENTE)", "ALERTA"]]).setBackground("#fef2f2").setFontWeight("bold");
  
  var oMap = {"A": 0, "B": 0, "C": 0, "D": 0};
  for(var i = 1; i < pendData.length; i++) {
    var status = pendData[i][5];
    var turmaOrigem = pendData[i][7];
    var turmaBaixa = pendData[i][9];

    if(status == "ABERTO" || (status == "RESOLVIDO" && turmaOrigem != turmaBaixa)) {
      if(oMap[turmaOrigem] !== undefined) oMap[turmaOrigem]++;
    }
  }
  
  var oRow = debtStartRow + 2;
  for(var o in oMap) {
    var alert = oMap[o] > 0 ? "⚠️ PENDENTE" : "✅ ZERADO";
    sheetBI.getRange(oRow, 1, 1, 3).setValues([[o, oMap[o], alert]]);
    oRow++;
  }
  
  sheetBI.setColumnWidth(1, 400);
  sheetBI.setColumnWidth(2, 150);
  sheetBI.setColumnWidth(3, 200);
}

function doGet(e) {
  var action = e.parameter.action;
  if (action === "test") return ContentService.createTextOutput("Ultrafino v1.4_stable Online").setMimeType(ContentService.MimeType.TEXT);
  if (action === "getPendencies") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var list = [];
    ss.getSheets().forEach(function(s) {
      if (s.getName().indexOf("PEND_") === 0) {
        var rows = s.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][11]) list.push({ 
            tag: rows[i][0], area: rows[i][1], disciplina: rows[i][2], 
            descricao: rows[i][3], prioridade: rows[i][4], status: rows[i][5],
            operador_origem: rows[i][6], turma_origem: rows[i][7],
            operador_resolucao: rows[i][8], turma_resolucao: rows[i][9], data: rows[i][10], id: rows[i][11]
          });
        }
      }
    });
    return ContentService.createTextOutput(JSON.stringify(list)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Ultrafino Cloud v1.4 Stable").setMimeType(ContentService.MimeType.TEXT);
}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Sincronismo v1.4 Stable</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">BI de Auditagem e Volume Acumulado Ativado</p>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setshowConfig(!showConfig)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all border border-slate-700"
          >
            <Settings2 size={16} /> {showConfig ? 'Fechar Painel' : 'Configurar Script'}
          </button>
        )}
      </div>

      {!showConfig ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-8">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner">
                    <Database size={40} className={isSyncing ? 'animate-bounce' : ''} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Carga Estável v1.4</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                    Versão de auditagem. Registra o esforço total por disciplina durante o mês para fechamento de KPIs.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase border ${
                    testStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {testStatus === 'success' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {testStatus === 'success' ? 'Protocolo v1.4 OK' : 'Sem Conexão'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Fila de Transmissão</p>
                  <p className="text-2xl font-black text-slate-900">{reports.filter(r => !r.synced).length + pendingItems.filter(p => !p.synced).length} itens</p>
                </div>
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase">Status do BI</p>
                  <p className="text-xl font-black text-slate-900 uppercase text-[10px] mt-1">{scriptUrl ? 'Auditagem Ativa' : 'Aguardando Setup'}</p>
                </div>
              </div>

              <button 
                onClick={handleSync}
                disabled={isSyncing || !scriptUrl}
                className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 text-sm shadow-2xl transition-all active:scale-95 ${
                  !scriptUrl ? 'bg-slate-100 text-slate-300 cursor-not-allowed' :
                  isSyncing ? 'bg-slate-900 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                }`}
              >
                {isSyncing ? <RefreshCw className="animate-spin" /> : <Globe />}
                {isSyncing ? 'SINCRONIZANDO IDs...' : 'SINCRONIZAR BASE v1.4'}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl border-4 border-slate-900 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Terminal size={16} className="text-blue-500" /> Console v1.4
              </h3>
              <Activity size={16} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="flex-grow space-y-3 font-mono text-[9px] text-slate-400 overflow-y-auto max-h-[350px] custom-scrollbar">
              {logs.length === 0 ? (
                <p className="italic opacity-30">Aguardando telemetria...</p>
              ) : (
                logs.map((log, i) => <div key={i} className="border-l-2 border-emerald-500/30 pl-3 py-1 bg-white/5">{log}</div>)
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] border-2 border-blue-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
          {!isAdmin ? (
            <div className="p-16 text-center space-y-8">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Lock size={40} /></div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">Segurança Admin v1.4</h2>
              <form onSubmit={(e) => { e.preventDefault(); if(password === ADMIN_PASSWORD) setIsAdmin(true); else alert("Senha incorreta"); }} className="max-w-xs mx-auto space-y-4">
                <input type="password" placeholder="DIGITE A SENHA ADMIN..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-center font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Acessar Painel Protegido</button>
              </form>
              <button onClick={() => setshowConfig(false)} className="text-[10px] font-black text-slate-400 uppercase">Voltar ao Sincronismo</button>
            </div>
          ) : (
            <div className="p-12 space-y-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><ShieldCheck size={32} /></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Área do Administrador</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Controle de Script e Base de Dados Nuvem.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a 
                    href={MASTER_SPREADSHEET_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-95"
                  >
                    <FileSpreadsheet size={18} /> Acessar Planilha Mestra Online <ExternalLink size={14} />
                  </a>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(appsScriptCode); setCopySuccess(true); setTimeout(()=>setCopySuccess(false), 2000); }}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95 ${
                      copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {copySuccess ? <CheckCircle2 size={16} /> : <Code size={16} />}
                    {copySuccess ? 'Copiado!' : 'Copiar Script v1.4'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                    <Terminal size={14} /> Código-Fonte do Backend
                  </h4>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner overflow-hidden">
                    <pre className="text-[10px] text-slate-300 font-mono overflow-y-auto max-h-[400px] custom-scrollbar leading-relaxed">
                      {appsScriptCode}
                    </pre>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                         <Globe size={16} className="text-emerald-600" /> Endpoint de Produção (Google Apps Script)
                      </label>
                      <input 
                        type="text"
                        value={scriptUrl}
                        onChange={(e) => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..."
                        className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs text-blue-600 focus:border-blue-500 outline-none shadow-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={handleTestConnection}
                        disabled={testStatus === 'loading' || !scriptUrl}
                        className={`py-5 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                          testStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                        }`}
                      >
                        {testStatus === 'loading' ? <RefreshCw className="animate-spin" size={16} /> : <Activity size={16} />}
                        {testStatus === 'loading' ? 'Validando...' : 'Testar Comunicação'}
                      </button>
                      <button 
                        onClick={() => { alert("Configuração v1.4 Salva com Sucesso!"); setshowConfig(false); }}
                        className="py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl active:scale-95 hover:bg-blue-700"
                      >
                        <Save size={16} /> Salvar e Sair
                      </button>
                    </div>
                  </div>

                  <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-100 flex items-start gap-4">
                     <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                     <div className="space-y-2">
                       <h5 className="text-[10px] font-black text-amber-900 uppercase">Atenção Crítica</h5>
                       <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                         O link da planilha mestra contém todos os dados históricos. Não compartilhe a URL externa nem a senha admin fora do círculo de supervisão.
                       </p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncDashboard;
