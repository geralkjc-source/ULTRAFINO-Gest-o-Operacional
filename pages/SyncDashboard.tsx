
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
  Undo2
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

  const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  const currentMonthRef = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}_${new Date().getFullYear()}`;

  const unsyncedReports = reports.filter(r => !r.synced);
  const unsyncedPending = pendingItems.filter(p => !p.synced);
  const totalUnsynced = unsyncedReports.length + unsyncedPending.length;

  useEffect(() => {
    localStorage.setItem('google_apps_script_url', scriptUrl);
  }, [scriptUrl]);

  const handleSync = async () => {
    if (totalUnsynced === 0) return;
    setIsSyncing(true);
    setSyncStatus(null);
    const result = await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending);
    
    if (result.success) {
      setTimeout(() => {
        onSyncSuccess(unsyncedReports.map(r => r.id), unsyncedPending.map(p => p.id));
        setIsSyncing(false);
        setSyncStatus({ type: 'success', msg: `Sincronização Enviada!` });
      }, 500);
    } else {
      setIsSyncing(false);
      setSyncStatus({ type: 'error', msg: result.message });
    }
  };

  const handleResetUrl = () => {
    if (confirm("Deseja restaurar a URL padrão?")) {
      setScriptUrl(DEFAULT_SCRIPT_URL);
      localStorage.setItem('google_apps_script_url', DEFAULT_SCRIPT_URL);
    }
  };

  const handleUnlockConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (configPasswordAttempt === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setConfigPassError(false);
    } else {
      setConfigPassError(true);
      setTimeout(() => setConfigPassError(false), 2000);
    }
  };

  const handleDownloadMaster = () => {
    setIsExporting(true);
    setTimeout(() => {
      exportMasterToExcel(reports, pendingItems, `MASTER_ULTRAFINO_${currentMonthRef}`);
      setIsExporting(false);
    }, 1000);
  };

  const handleUnlockMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordAttempt === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPassError(false);
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 2000);
    }
  };

  const appsScriptTemplate = `/**
 * PLATAFORMA ULTRAFINO - BACKEND GOOGLE SHEETS v5.0 (SYNC VICE-VERSA)
 * Gerencia relatórios mensais, pendências e fornece estatísticas de saúde da planta.
 */

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Erro no processamento: " + err.toString());
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var monthRef = data.mes_referencia || "Geral";
  var nameRel = "REL_" + monthRef;
  var namePend = "PEND_" + monthRef;
  
  var sheetReports = ss.getSheetByName(nameRel) || ss.insertSheet(nameRel);
  var sheetPending = ss.getSheetByName(namePend) || ss.insertSheet(namePend);
  
  // 1. RELATÓRIOS
  if (sheetReports.getLastRow() == 0) {
    sheetReports.appendRow(["Data", "Hora", "Área", "Operador", "Turma", "Turno", "Itens com Falha", "Observações Gerais"]);
    sheetReports.getRange(1, 1, 1, 8).setBackground("#0f172a").setFontColor("#FFFFFF").setFontWeight("bold");
    sheetReports.setFrozenRows(1);
  }
  
  if (data.reports && data.reports.length > 0) {
    data.reports.forEach(function(r) { 
      sheetReports.appendRow([r.data, r.hora, r.area, r.operador.toUpperCase(), r.turma, r.turno, r.itens_falha, r.obs.toUpperCase()]); 
    });
  }
  
  // 2. PENDÊNCIAS (UPSERT)
  if (sheetPending.getLastRow() == 0) {
    sheetPending.appendRow(["Tag", "Área", "Descrição", "Prioridade", "Status", "Operador Origem", "Resolvido Por", "Data Reporte"]);
    sheetPending.getRange(1, 1, 1, 8).setBackground("#1e293b").setFontColor("#FFFFFF").setFontWeight("bold");
    sheetPending.setFrozenRows(1);
  }
  
  if (data.pending && data.pending.length > 0) {
    var range = sheetPending.getDataRange();
    var values = range.getValues();
    
    data.pending.forEach(function(p) { 
      var targetRow = -1;
      var tagInput = p.tag.toString().trim().toUpperCase();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString().trim().toUpperCase() === tagInput) {
          targetRow = i + 1;
          break;
        }
      }
      
      if (targetRow > -1) {
        sheetPending.getRange(targetRow, 5).setValue(p.status.toUpperCase());
        sheetPending.getRange(targetRow, 7).setValue(p.operador_resolucao.toUpperCase());
      } else {
        sheetPending.appendRow([p.tag.toUpperCase(), p.area, p.descricao.toUpperCase(), p.prioridade.toUpperCase(), p.status.toUpperCase(), p.operador_origem.toUpperCase(), p.operador_resolucao.toUpperCase(), p.data]);
      }
    });
  }
  
  return ContentService.createTextOutput("Sincronismo v5.0 OK").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getPendencies") {
    var allPendencies = [];
    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
      if (sheet.getName().indexOf("PEND_") === 0) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][0]) {
            allPendencies.push({
              tag: data[i][0], area: data[i][1], descricao: data[i][2], prioridade: data[i][3], status: data[i][4],
              operador_origem: data[i][5], operador_resolucao: data[i][6], data: data[i][7]
            });
          }
        }
      }
    });
    return ContentService.createTextOutput(JSON.stringify(allPendencies)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getStats") {
    var stats = { ok: 0, warning: 0, fail: 0, total: 0 };
    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
       if (sheet.getName().indexOf("PEND_") === 0) {
         var data = sheet.getDataRange().getValues();
         for (var i = 1; i < data.length; i++) {
           if (data[i][0]) {
             stats.total++;
             var status = data[i][4].toString().toUpperCase();
             var priority = data[i][3].toString().toUpperCase();
             if (status === "RESOLVIDO") stats.ok++;
             else if (priority === "ALTA") stats.fail++;
             else stats.warning++;
           }
         }
       }
    });
    // Se não houver pendências abertas, considerar planta OK baseada em total vs resolvido
    return ContentService.createTextOutput(JSON.stringify(stats)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "Online", v: "5.0"})).setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Sincronismo</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Status da Nuvem</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowConfig(!showConfig)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all ${showConfig ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
            <Settings2 size={14} /> {isAdmin ? 'Configurações' : 'Acesso Reservado'}
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          {!isAdmin ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase">Configurações de Nuvem</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Insira a senha mestra para gerenciar o Webhook</p>
              </div>
              <form onSubmit={handleUnlockConfig} className="max-w-xs mx-auto space-y-4">
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Senha Admin..." 
                  value={configPasswordAttempt} 
                  onChange={(e) => setConfigPasswordAttempt(e.target.value)} 
                  className={`w-full bg-slate-50 border ${configPassError ? 'border-red-500 animate-shake' : 'border-slate-200'} rounded-xl px-4 py-3 text-center font-black outline-none focus:ring-2 focus:ring-blue-500`} 
                />
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-600/20">Desbloquear</button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Unlock size={24} /></div>
                <div className="flex-1">
                  <h3 className="font-black text-slate-900 uppercase text-sm">Configuração Técnica (v5.0)</h3>
                  <p className="text-slate-500 text-xs mt-1 font-medium italic">O script agora envia estatísticas de saúde da planta para o Supervisório.</p>
                </div>
              </div>
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL de Sincronização (Ativo)</label>
                    <button 
                      onClick={handleResetUrl}
                      className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase hover:underline"
                    >
                      <Undo2 size={12} /> Restaurar Padrão
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={scriptUrl} 
                    onChange={(e) => setScriptUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                 <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Script v5.0 (Novo)</span>
                      <button onClick={() => navigator.clipboard.writeText(appsScriptTemplate)} className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-blue-400 text-[10px] font-bold uppercase flex items-center gap-1">
                        <Copy size={12} /> Copiar Código
                      </button>
                    </div>
                    <pre className="text-[9px] font-mono overflow-x-auto max-h-40 text-slate-400 custom-scrollbar">{appsScriptTemplate}</pre>
                 </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button onClick={() => setShowConfig(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-colors">Salvar e Sair</button>
              </div>
            </>
          )}
        </div>
      )}

      {syncStatus && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-bounce ${syncStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
          {syncStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-xs font-black uppercase tracking-tight">{syncStatus.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${totalUnsynced > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
              {totalUnsynced > 0 ? (isSyncing ? <RefreshCw size={32} className="animate-spin" /> : <CloudOff size={32} />) : <Cloud size={32} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronismo Local</p>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                {totalUnsynced === 0 ? 'Tudo Atualizado' : `${totalUnsynced} Pendentes`}
              </h2>
            </div>
          </div>
          <button onClick={handleSync} disabled={isSyncing || totalUnsynced === 0} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-slate-900 text-white' : totalUnsynced === 0 ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100' : 'bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95'}`}>
            {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : <Cloud size={20} />}
            <span>{isSyncing ? 'Transmitindo...' : `Enviar para Nuvem`}</span>
          </button>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700"><Database size={160} /></div>
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400"><Database size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Controle Admin</span></div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={handleDownloadMaster} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-700 p-2 rounded-lg text-white shadow-lg transition-transform active:scale-90"><FileDown size={18} /></button>
                  <a href={MASTER_SHEET_URL} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-white shadow-lg transition-transform active:scale-90"><ArrowUpRight size={18} /></a>
                </div>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              {!isAdmin ? (
                <form onSubmit={handleUnlockMaster} className="space-y-3">
                  <div className="flex items-center gap-2"><Lock size={14} className="text-amber-500" /><p className="text-[10px] font-black text-slate-400 uppercase">Acesso Reservado</p></div>
                  <div className="relative">
                    <input type="password" placeholder="Senha Admin..." value={passwordAttempt} onChange={(e) => setPasswordAttempt(e.target.value)} className={`w-full bg-slate-800 border ${passError ? 'border-red-500 animate-shake' : 'border-slate-700'} rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none`} />
                    <button type="submit" className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 rounded-md text-[10px] font-black uppercase">Acessar</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                   <div className="flex items-center gap-2 text-emerald-400"><Unlock size={14} /><p className="text-[10px] font-black uppercase tracking-widest">Base Liberada - Ref: {currentMonthRef}</p></div>
                   <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleDownloadMaster} className="py-2 bg-emerald-600 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-transform active:scale-95"><FileDown size={14} /> XLSX</button>
                    <button onClick={() => window.open(MASTER_SHEET_URL, '_blank')} className="py-2 bg-blue-600 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-transform active:scale-95"><ExternalLink size={14} /> Sheets</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800 mt-6 grid grid-cols-2 gap-4">
            <div className="text-center"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Referência</p><p className="text-sm font-black text-blue-400">{currentMonthName}</p></div>
            <div className="text-center"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sincronizados</p><p className="text-xl font-black text-emerald-400">{reports.filter(r => r.synced).length + pendingItems.filter(p => p.synced).length}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncDashboard;
