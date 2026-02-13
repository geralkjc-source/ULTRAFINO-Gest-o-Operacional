
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
import { syncToGoogleSheets, testScriptConnection, DEFAULT_SCRIPT_URL, MASTER_SHEET_URL } from '../services/googleSync';

const ADMIN_PASSWORD = 'ULTRAADMIN'; 

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
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (scriptUrl) localStorage.setItem('google_apps_script_url', scriptUrl);
  }, [scriptUrl]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  const handleTestConnection = async () => {
    setTestStatus('loading');
    addLog("Iniciando Handshake Vulcan v3.1...");
    const result = await testScriptConnection(scriptUrl);
    if (result.success) {
      setTestStatus('success');
      addLog("Sucesso: Backend Vulcan v3.1 Ativo.");
    } else {
      setTestStatus('error');
      addLog("Erro: Requer script v3.1.");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    addLog("Transmissão Vulcan v3.1 em curso...");
    const unsyncedReports = reports.filter(r => !r.synced);
    const unsyncedPending = pendingItems.filter(p => !p.synced);
    
    const result = await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending);
    if (result.success) {
      onSyncSuccess(unsyncedReports.map(r => r.id), unsyncedPending.map(p => p.id));
      addLog("Sincronismo v3.1 Concluído.");
    } else {
      addLog("Falha no sincronismo v3.1.");
    }
    setIsSyncing(false);
  };

  const appsScriptCode = `/**
 * VULCAN BACKEND v3.1 STABLE - SINCRONISMO TEMPO REAL
 * Suporte para leitura fiel de DATA e HORA das abas mensais e PEND_GERAL.
 */

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput("Erro JSON").setMimeType(ContentService.MimeType.TEXT); }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var monthRef = data.mes_referencia || "02_2026";
  
  var sheetReports = ss.getSheetByName("REL_" + monthRef) || ss.insertSheet("REL_" + monthRef);
  var sheetPending = ss.getSheetByName("PEND_GERAL") || ss.insertSheet("PEND_GERAL");

  var pendingHeaders = ["TAG", "ÁREA", "DISCIPLINA", "DESCRIÇÃO", "PRIORIDADE", "STATUS", "OP ORIGEM", "TURMA ORIGEM", "TURNO ORIGEM", "OP BAIXA", "TURMA BAIXA", "DATA REPORTE", "DATA RESOLUCAO", "ID_REF"];
  
  if (sheetReports.getLastRow() == 0) {
    sheetReports.appendRow(["ID_REF", "DATA", "HORA", "ÁREA", "OPERADOR", "TURMA", "TURNO", "FALHAS", "OBS"]);
    sheetReports.getRange(1, 1, 1, 9).setBackground("#0f172a").setFontColor("#FFF").setFontWeight("bold");
  }
  
  if (sheetPending.getLastRow() == 0) {
    sheetPending.appendRow(pendingHeaders);
    sheetPending.getRange(1, 1, 1, pendingHeaders.length).setBackground("#1e293b").setFontColor("#FFF").setFontWeight("bold");
  }

  // 1. SINCRONIZAR RELATÓRIOS
  if (data.reports) {
    var repValues = sheetReports.getDataRange().getValues();
    data.reports.forEach(function(r) { 
      var exists = false;
      for (var i = 1; i < repValues.length; i++) { if (repValues[i][0] == r.id) { exists = true; break; } }
      if (!exists) { sheetReports.appendRow([r.id, r.data, r.hora, r.area, r.operador, r.turma, r.turno, r.itens_falha, r.obs]); }
    });
  }
  
  // 2. SINCRONIZAR PENDÊNCIAS
  if (data.pending) {
    var pRows = sheetPending.getDataRange().getValues();
    var headers = pRows[0];
    var idxID = headers.indexOf("ID_REF");
    var idxStatus = headers.indexOf("STATUS");
    var idxOpB = headers.indexOf("OP BAIXA");
    var idxTurB = headers.indexOf("TURMA BAIXA");
    var idxDataRes = headers.indexOf("DATA RESOLUCAO");

    data.pending.forEach(function(p) { 
      var targetRow = -1;
      if (idxID > -1) {
        for (var i = 1; i < pRows.length; i++) { if (pRows[i][idxID] == p.id) { targetRow = i + 1; break; } }
      }
      
      if (targetRow > -1) {
        if (idxStatus > -1) sheetPending.getRange(targetRow, idxStatus + 1).setValue(p.status.toUpperCase());
        if (idxOpB > -1) sheetPending.getRange(targetRow, idxOpB + 1).setValue(p.operador_resolucao);
        if (idxTurB > -1) sheetPending.getRange(targetRow, idxTurB + 1).setValue(p.turma_resolucao);
        if (idxDataRes > -1) sheetPending.getRange(targetRow, idxDataRes + 1).setValue(p.data_resolucao);
      } else {
        sheetPending.appendRow([
          p.tag, p.area, p.disciplina, p.descricao, p.prioridade, p.status, 
          p.operador_origem, p.turma_origem, p.turno_origem, 
          p.operador_resolucao, p.turma_resolucao, p.data, p.data_resolucao, p.id
        ]);
        pRows.push([p.tag, p.area, p.disciplina, p.descricao, p.prioridade, p.status, p.operador_origem, p.turma_origem, p.turno_origem, p.operador_resolucao, p.turma_resolucao, p.data, p.data_resolucao, p.id]);
      }
    });
  }

  return ContentService.createTextOutput("SUCCESS_V3_1_STABLE").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "test") return ContentService.createTextOutput("Vulcan v3.1_stable Online").setMimeType(ContentService.MimeType.TEXT);
  
  if (action === "getReports") {
    var allReports = [];
    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
      if (sheet.getName().indexOf("REL_") === 0) {
        var rows = sheet.getDataRange().getValues();
        var headers = rows[0];
        for (var i = 1; i < rows.length; i++) {
          var item = {};
          headers.forEach(function(h, idx) {
            var key = h.toLowerCase().replace(/ /g, "_").replace("á", "a").replace("ç", "c").replace("ã", "a");
            item[key] = rows[i][idx];
          });
          allReports.push(item);
        }
      }
    });
    return ContentService.createTextOutput(JSON.stringify(allReports)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getPendencies") {
    var sheet = ss.getSheetByName("PEND_GERAL");
    if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var list = [];
    for (var i = 1; i < rows.length; i++) {
      var item = {};
      headers.forEach(function(h, idx) {
        var key = h.toLowerCase().replace(/ /g, "_").replace("á", "a").replace("ç", "c").replace("ã", "a");
        item[key] = rows[i][idx];
      });
      list.push({
        tag: item.tag, area: item.area, disciplina: item.disciplina,
        descricao: item.descricao, prioridade: item.prioridade, status: item.status,
        operador_origem: item.op_origem, turma_origem: item.turma_origem,
        turno_origem: item.turno_origem, operador_resolucao: item.op_baixa,
        turma_resolucao: item.turma_baixa, data: item.data_reporte,
        data_resolucao: item.data_resolucao, id: item.id_ref
      });
    }
    return ContentService.createTextOutput(JSON.stringify(list)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Vulcan v3.1 Online").setMimeType(ContentService.MimeType.TEXT);
}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">VULCAN CLOUD v3.1</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Sincronismo Fiel de Data/Hora</p>
        </div>
        {!isAdmin && (
          <button onClick={() => setshowConfig(!showConfig)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">
            <Settings2 size={16} /> {showConfig ? 'Fechar Painel' : 'Configurar Script v3.1'}
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
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Carga Master v3.1</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                    Sincronismo bidirecional que preserva os horários exatos registrados na planilha PEND_GERAL.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase border ${
                    testStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {testStatus === 'success' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    VULCAN v3.1 {testStatus === 'success' ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Fila Local</p>
                  <p className="text-2xl font-black text-slate-900">{reports.filter(r => !r.synced).length + pendingItems.filter(p => !p.synced).length} Itens</p>
                </div>
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase">Fidelidade Time</p>
                  <p className="text-xl font-black text-slate-900 uppercase text-[10px] mt-1">PLANILHA -> APP ACTIVE</p>
                </div>
              </div>

              <button onClick={handleSync} disabled={isSyncing || !scriptUrl} className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 text-sm shadow-2xl transition-all active:scale-95 ${
                  !scriptUrl ? 'bg-slate-100 text-slate-300' : isSyncing ? 'bg-slate-900 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                }`}>
                {isSyncing ? <RefreshCw className="animate-spin" /> : <Globe />} {isSyncing ? 'TRANSMITINDO...' : 'SINCRONIZAR VULCAN CLOUD'}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl border-4 border-slate-900 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><Terminal size={16} className="text-blue-500" /> Telemetria v3.1</h3>
              <Activity size={16} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="flex-grow space-y-3 font-mono text-[9px] text-slate-400 overflow-y-auto max-h-[350px] custom-scrollbar">
              {logs.length === 0 ? <p className="italic opacity-30">Aguardando telemetria...</p> : logs.map((log, i) => <div key={i} className="border-l-2 border-emerald-500/30 pl-3 py-1 bg-white/5">{log}</div>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] border-2 border-blue-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
          {!isAdmin ? (
            <div className="p-16 text-center space-y-8">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Lock size={40} /></div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">Segurança Vulcan v3.1</h2>
              <form onSubmit={(e) => { e.preventDefault(); if(password === ADMIN_PASSWORD) setIsAdmin(true); else alert("Senha incorreta"); }} className="max-w-xs mx-auto space-y-4">
                <input type="password" placeholder="SENHA ADMIN..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-center font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Entrar Admin</button>
              </form>
              <button onClick={() => setshowConfig(false)} className="text-[10px] font-black text-slate-400 uppercase">Voltar</button>
            </div>
          ) : (
            <div className="p-12 space-y-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><ShieldCheck size={32} /></div>
                  <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Backend Admin v3.1</h3><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Controle de Sincronismo de Data e Hora.</p></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={MASTER_SHEET_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl">
                    <FileSpreadsheet size={18} /> Planilha Mestra <ExternalLink size={14} />
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(appsScriptCode); setCopySuccess(true); setTimeout(()=>setCopySuccess(false), 2000); }} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                    <Code size={16} /> {copySuccess ? 'Copiado!' : 'Copiar Script v3.1'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><Terminal size={14} /> Código do Backend v3.1</h4>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner overflow-hidden">
                    <pre className="text-[10px] text-slate-300 font-mono overflow-y-auto max-h-[400px] custom-scrollbar leading-relaxed">{appsScriptCode}</pre>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Endpoint Google Script</label>
                      <input type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs text-blue-600 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleTestConnection} className="py-5 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 bg-slate-900 text-white shadow-xl">Validar v3.1</button>
                      <button onClick={() => setshowConfig(false)} className="py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl">Salvar e Sair</button>
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
