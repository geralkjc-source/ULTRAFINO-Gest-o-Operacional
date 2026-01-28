
import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Mail,
  Lock,
  Unlock,
  ArrowUpRight,
  Settings2,
  Info,
  Copy,
  RotateCcw,
  FileDown,
  ClipboardCheck,
  CalendarDays,
  Undo2,
  Trash2,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Report, PendingItem } from '../types';
import { syncToGoogleSheets, DEFAULT_SCRIPT_URL, MASTER_SHEET_URL } from '../services/googleSync';
import { exportMasterToExcel } from '../services/excelExport';

interface SyncDashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
  onSyncSuccess: (reportIds: string[], pendingIds: string[]) => void;
}

const ADMIN_PASSWORD = 'ULTRAADMIN'; 

const SyncDashboard: React.FC<SyncDashboardProps> = ({ reports, pendingItems, onSyncSuccess }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL);
  const [showConfig, setShowConfig] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [configPasswordAttempt, setConfigPasswordAttempt] = useState('');
  const [passError, setPassError] = useState(false);
  const [configPassError, setConfigPassError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  const currentMonthRef = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}_${new Date().getFullYear()}`;

  const unsyncedReports = reports.filter(r => !r.synced);
  const unsyncedPending = pendingItems.filter(p => !p.synced);
  const totalUnsynced = unsyncedReports.length + unsyncedPending.length;

  useEffect(() => {
    localStorage.setItem('google_apps_script_url', scriptUrl);
  }, [scriptUrl]);

  const handleDownloadMaster = () => {
    setIsExporting(true);
    try {
      exportMasterToExcel(reports, pendingItems, 'Master_Ultrafino');
    } catch (err) {
      console.error('Erro ao baixar master:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('⚠️ ATENÇÃO: Isso apagará todos os dados locais. Certifique-se de ter sincronizado antes.')) {
      localStorage.removeItem('ultrafino_reports');
      localStorage.removeItem('ultrafino_pending');
      window.location.reload();
    }
  };

  const handleSync = async () => {
    if (totalUnsynced === 0) {
      setSyncStatus({ type: 'success', msg: "Tudo já está em dia!" });
      setTimeout(() => setSyncStatus(null), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    
    const result = await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending);
    
    if (result.success) {
      onSyncSuccess(unsyncedReports.map(r => r.id), unsyncedPending.map(p => p.id));
      setSyncStatus({ type: 'success', msg: `Sincronismo Concluído com Sucesso!` });
    } else {
      setSyncStatus({ type: 'error', msg: result.message });
    }
    setIsSyncing(false);
  };

  const appsScriptCode = `/**
 * PLATAFORMA ULTRAFINO - BACKEND GOOGLE SHEETS v5.1 (OTIMIZADO)
 * Publicar como: Web App | Execute as: Me | Access: Anyone
 */

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Erro JSON: " + err.toString());
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var monthRef = data.mes_referencia || "Geral";
  var nameRel = "REL_" + monthRef;
  var namePend = "PEND_" + monthRef;
  
  var sheetReports = ss.getSheetByName(nameRel) || ss.insertSheet(nameRel);
  var sheetPending = ss.getSheetByName(namePend) || ss.insertSheet(namePend);
  
  // 1. PROCESSAR RELATÓRIOS
  if (sheetReports.getLastRow() == 0) {
    sheetReports.appendRow(["Data", "Hora", "Área", "Operador", "Turma", "Turno", "Itens com Falha", "Observações Gerais"]);
    sheetReports.getRange(1, 1, 1, 8).setBackground("#0f172a").setFontColor("#FFFFFF").setFontWeight("bold");
  }
  
  if (data.reports && data.reports.length > 0) {
    data.reports.forEach(function(r) { 
      sheetReports.appendRow([r.data, r.hora, r.area, r.operador, r.turma, r.turno, r.itens_falha, r.obs]); 
    });
  }
  
  // 2. PROCESSAR PENDÊNCIAS (UPSERT POR TAG)
  if (sheetPending.getLastRow() == 0) {
    sheetPending.appendRow(["Tag", "Área", "Descrição", "Prioridade", "Status", "Operador Origem", "Resolvido Por", "Data Reporte"]);
    sheetPending.getRange(1, 1, 1, 8).setBackground("#1e293b").setFontColor("#FFFFFF").setFontWeight("bold");
  }
  
  if (data.pending && data.pending.length > 0) {
    var pValues = sheetPending.getDataRange().getValues();
    
    data.pending.forEach(function(p) { 
      var targetRow = -1;
      var tagInput = p.tag.toString().trim().toUpperCase();
      for (var i = 1; i < pValues.length; i++) {
        if (pValues[i][0].toString().trim().toUpperCase() === tagInput) {
          targetRow = i + 1;
          break;
        }
      }
      
      if (targetRow > -1) {
        // Atualiza Status (Col 5) e Resolvido Por (Col 7)
        sheetPending.getRange(targetRow, 5).setValue(p.status.toUpperCase());
        sheetPending.getRange(targetRow, 7).setValue(p.operador_resolucao.toUpperCase());
      } else {
        sheetPending.appendRow([p.tag.toUpperCase(), p.area, p.descricao.toUpperCase(), p.prioridade.toUpperCase(), p.status.toUpperCase(), p.operador_origem.toUpperCase(), p.operador_resolucao.toUpperCase(), p.data]);
      }
    });
  }
  
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getPendencies") {
    var all = [];
    var sheets = ss.getSheets();
    sheets.forEach(function(s) {
      if (s.getName().indexOf("PEND_") === 0) {
        var rows = s.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0]) {
            all.push({
              tag: rows[i][0], area: rows[i][1], descricao: rows[i][2], prioridade: rows[i][3], 
              status: rows[i][4], operador_origem: rows[i][5], operador_resolucao: rows[i][6], data: rows[i][7]
            });
          }
        }
      }
    });
    return ContentService.createTextOutput(JSON.stringify(all)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getStats") {
    var st = { ok: 0, warning: 0, fail: 0, total: 0 };
    ss.getSheets().forEach(function(s) {
       if (s.getName().indexOf("PEND_") === 0) {
         var rows = s.getDataRange().getValues();
         for (var i = 1; i < rows.length; i++) {
           if (rows[i][0]) {
             st.total++;
             var stat = rows[i][4].toString().toUpperCase();
             var prio = rows[i][3].toString().toUpperCase();
             if (stat === "RESOLVIDO") st.ok++;
             else if (prio === "ALTA") st.fail++;
             else st.warning++;
           }
         }
       }
    });
    return ContentService.createTextOutput(JSON.stringify(st)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("v5.1 Online").setMimeType(ContentService.MimeType.TEXT);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Sincronismo</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Conexão com Banco de Dados Google</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all ${showConfig ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          <Settings2 size={14} /> {isAdmin ? 'Configurações' : 'Acesso Reservado'}
        </button>
      </div>

      {showConfig && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          {!isAdmin ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
              <form onSubmit={(e) => { e.preventDefault(); if(configPasswordAttempt === ADMIN_PASSWORD) setIsAdmin(true); else setConfigPassError(true); }} className="max-w-xs mx-auto space-y-4">
                <input 
                  type="password" autoFocus placeholder="Senha Admin..." 
                  value={configPasswordAttempt} onChange={(e) => setConfigPasswordAttempt(e.target.value)} 
                  className={`w-full bg-slate-50 border ${configPassError ? 'border-red-500 animate-shake' : 'border-slate-200'} rounded-xl px-4 py-3 text-center font-black outline-none focus:ring-2 focus:ring-blue-500`} 
                />
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-600/20">Desbloquear</button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <Unlock size={24} className="text-emerald-600" />
                <div>
                  <h3 className="font-black text-slate-900 uppercase text-xs">Acesso Administrador Liberado</h3>
                  <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase">Atualize a URL do script se necessário.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                  <button onClick={handleCopyCode} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-all">
                    {copySuccess ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                  <pre className="text-[10px] text-slate-400 font-mono overflow-y-auto max-h-[200px] custom-scrollbar">
                    {appsScriptCode}
                  </pre>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Webhook (Google Script)</label>
                  <input 
                    type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button onClick={() => setShowConfig(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-colors">Fechar Configurações</button>
              </div>
            </div>
          )}
        </div>
      )}

      {syncStatus && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${syncStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
          {syncStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-xs font-black uppercase tracking-tight">{syncStatus.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${totalUnsynced > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
              {totalUnsynced > 0 ? (isSyncing ? <RefreshCw size={32} className="animate-spin" /> : <CloudOff size={32} />) : <Cloud size={32} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronismo Local</p>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                {totalUnsynced === 0 ? 'Tudo Sincronizado' : `${totalUnsynced} Registros`}
              </h2>
            </div>
          </div>
          <button 
            onClick={handleSync} 
            disabled={isSyncing} 
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-slate-900 text-white' : totalUnsynced === 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95'}`}
          >
            {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            <span>{isSyncing ? 'Enviando...' : totalUnsynced === 0 ? 'Forçar Atualização' : 'Sincronizar Agora'}</span>
          </button>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
           <div className="absolute -top-10 -right-10 opacity-10"><Database size={160} /></div>
           <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2 text-blue-400"><Database size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Banco de Dados</span></div>
             <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Status da Planilha</span>
                 <span className="text-[10px] font-black text-emerald-400 uppercase">Conectado</span>
               </div>
               <div className="grid grid-cols-2 gap-2">
                <button onClick={handleDownloadMaster} disabled={isExporting} className="py-2.5 bg-emerald-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                   {isExporting ? 'Processando...' : <><FileDown size={14} /> Baixar Master</>}
                </button>
                <a href={MASTER_SHEET_URL} target="_blank" rel="noopener noreferrer" className="py-2.5 bg-blue-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                  <ExternalLink size={14} /> Abrir Sheets
                </a>
              </div>
             </div>
           </div>
           <div className="pt-6 border-t border-slate-800 mt-4 text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Referência Ativa</p>
              <p className="text-sm font-black text-blue-400">{currentMonthName}</p>
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border-2 border-red-50 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Zona Crítica de Manutenção</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ações Irreversíveis no Dispositivo</p>
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-[11px] text-red-800 font-bold leading-relaxed">
            Se houver conflitos graves ou duplicatas, você pode limpar o cache local. <br/>
            <span className="font-black text-red-600 underline">Atenção:</span> Isso removerá relatórios que ainda não foram sincronizados.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleClearCache} className="px-8 py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95">
            <Trash2 size={18} /> Limpar Cache do App
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncDashboard;
