
import { Report, PendingItem, Area, QualityReport } from '../types';

// Endpoint oficial v3.0
export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPoZk1y0cw4gZtQRMAR9ix0ZvMbgeqZA7fVveIb0lKrBteW06AqYqh2s20yQynmVEo/exec'; 
export const MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HjhTUldjn8Kk9mVF8GMw7ZQoPbqspMhqGV7OM5TPCTY/edit';

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface CloudStats {
  ok: number;
  warning: number;
  fail: number;
  na: number;
  total: number;
}

/**
 * Vulcan Date Parser v4.0 - Spreadsheet Priority
 * Captura EXATAMENTE o que está na planilha, seja objeto Date ou String.
 * NÃO utiliza Date.now() se o valor da nuvem for válido.
 */
const parseDateFromCloud = (dateVal: any): number => {
  if (!dateVal || dateVal === '-' || dateVal === 'undefined' || dateVal === 'null' || dateVal === '') return 0;
  
  // Se já for um objeto Date (Apps Script às vezes retorna Date)
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal.getTime();
  
  // Se for um timestamp numérico direto
  if (typeof dateVal === 'number' && dateVal > 1700000000000) return dateVal;

  try {
    const s = dateVal.toString().trim();
    
    // Tenta Date.parse padrão (funciona para ISO e alguns formatos regionais)
    const standardParse = Date.parse(s);
    if (!isNaN(standardParse)) return standardParse;

    // Fallback Robusto para o formato Brasileiro: DD/MM/YYYY HH:mm
    const matches = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\s,]+(\d{1,2}):(\d{1,2}))?/);
    if (matches) {
      const day = parseInt(matches[1]);
      const month = parseInt(matches[2]) - 1;
      const year = parseInt(matches[3]);
      const hour = matches[4] ? parseInt(matches[4]) : 12;
      const min = matches[5] ? parseInt(matches[5]) : 0;

      // Cria a data no fuso horário local para manter a "hora visual" da planilha
      const d = new Date(year, month, day, hour, min, 0);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
  } catch (e) {
    return 0;
  }
  return 0;
};

const sanitize = (str: any) => (str || '').toString().replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim().toUpperCase();

export const testScriptConnection = async (url: string): Promise<{success: boolean, message: string}> => {
  if (!url || !url.startsWith('https://script.google.com')) return { success: false, message: "URL inválida." };
  try {
    const response = await fetch(`${url}?action=test&t=${Date.now()}`, { method: 'GET', mode: 'cors' }).catch(() => null);
    if (!response) return { success: true, message: "Handshake Vulcan OK" };
    const text = await response.text();
    return text.includes("v2") || text.includes("v3") || text.includes("SUCCESS") || text.includes("Online")
      ? { success: true, message: "Protocolo Vulcan v3.1 Ativo!" }
      : { success: false, message: "Script v3.1 Requerido." };
  } catch (error) { return { success: false, message: "Falha de rede." }; }
};

export const syncToGoogleSheets = async (
  scriptUrl: string, 
  reports: Report[], 
  pending: PendingItem[],
  qualityReports: QualityReport[]
): Promise<SyncResponse> => {
  if (!scriptUrl) return { success: false, message: "URL ausente." };
  try {
    const now = new Date();
    const mesRef = `${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;
    
    const formatForSheet = (ts: number) => {
      if (!ts || ts === 0) return { date: '-', time: '-' };
      const d = new Date(ts);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hour = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return { date: `${day}/${month}/${year}`, time: `${hour}:${min}` };
    };

    const payload = {
      action: "sync",
      version: "3.1_stable_time",
      mes_referencia: mesRef,
      reports: (reports || []).map(r => {
        const fmt = formatForSheet(r.timestamp);
        return {
          id: r.id,
          data: fmt.date,
          hora: fmt.time,
          area: r.area,
          operador: sanitize(r.operator),
          turma: r.turma,
          turno: r.turno,
          itens_falha: r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => sanitize(i.label)).join(', '),
          obs: sanitize(r.generalObservations)
        };
      }),
      pending: (pending || []).map(p => {
        const fmt = formatForSheet(p.timestamp);
        const fmtRes = p.resolvedAt ? formatForSheet(p.resolvedAt) : null;
        return {
          id: p.id,
          tag: sanitize(p.tag),
          area: p.area,
          disciplina: sanitize(p.discipline),
          descricao: sanitize(p.description),
          prioridade: sanitize(p.priority),
          status: sanitize(p.status),
          operador_origem: sanitize(p.operator),
          turma_origem: p.turma,
          turno_origem: sanitize(p.turno),
          operador_resolucao: sanitize(p.resolvedBy || '-'),
          turma_resolucao: sanitize(p.resolvedByTurma || '-'),
          data: `${fmt.date} ${fmt.time}`,
          data_resolucao: fmtRes ? `${fmtRes.date} ${fmtRes.time}` : '-'
        };
      }),
      qualityReports: (qualityReports || []).map(qr => {
        const fmt = formatForSheet(qr.timestamp);
        return {
          id: qr.id,
          data: fmt.date,
          hora: fmt.time,
          operador: sanitize(qr.operator),
          turma: qr.turma,
          turno: qr.turno,
          ply: sanitize(qr.ply),
          dfp2_c_cr: qr.dfp2_c_cr,
          dfp2_c_yield: qr.dfp2_c_yield,
          dfp2_c_reject_ash: qr.dfp2_c_reject_ash,
          dfp2_c_conc_ash: qr.dfp2_c_conc_ash,
          dfp2_d_cr: qr.dfp2_d_cr,
          dfp2_d_yield: qr.dfp2_d_yield,
          dfp2_d_reject_ash: qr.dfp2_d_reject_ash,
          dfp2_d_conc_ash: qr.dfp2_d_conc_ash,
          colunas_d_cr: qr.colunas_d_cr,
          colunas_d_yield: qr.colunas_d_yield,
          colunas_d_reject_ash: qr.colunas_d_reject_ash,
          colunas_d_conc_ash: qr.colunas_d_conc_ash,
          humidade_fundo: qr.humidade_fundo,
          humidade_oversize: qr.humidade_oversize,
          humidade_concentrado: qr.humidade_concentrado,
          obs: sanitize(qr.generalObservations)
        };
      })
    };
    await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', cache: 'no-cache', body: JSON.stringify(payload) });
    return { success: true, message: "Sincronizado!" };
  } catch (error) { return { success: false, message: "Erro de Transmissão." }; }
};

export const fetchCloudItems = async (scriptUrl: string): Promise<PendingItem[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getPendencies&t=${Date.now()}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any): PendingItem => {
      const statusText = (item.status || '').toUpperCase();
      const isResolved = statusText === 'RESOLVIDO' || statusText === 'CONCLUÍDO';
      
      // PRIORIDADE TOTAL PARA OS DADOS DA PLANILHA
      const sheetTimestamp = parseDateFromCloud(item.data);
      const sheetResolvedAt = parseDateFromCloud(item.data_resolucao);

      return {
        id: item.id || `cl-${Date.now()}`,
        tag: sanitize(item.tag),
        area: item.area as Area,
        discipline: sanitize(item.disciplina) as any,
        description: sanitize(item.descricao),
        priority: (item.prioridade || 'baixa').toLowerCase() as any,
        status: isResolved ? 'resolvido' : 'aberto',
        operator: sanitize(item.operador_origem),
        turma: item.turma_origem || 'A',
        turno: (item.turno_origem || 'MANHÃ') as any,
        resolvedBy: item.operador_resolucao !== '-' ? sanitize(item.operador_resolucao) : undefined,
        resolvedByTurma: item.turma_resolucao !== '-' ? (item.turma_resolucao as any) : undefined,
        resolvedAt: sheetResolvedAt || undefined, 
        timestamp: sheetTimestamp || Date.now(),
        synced: true
      };
    });
  } catch (error) { return []; }
};

export const fetchCloudReports = async (scriptUrl: string): Promise<Report[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getReports&t=${Date.now()}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any): Report => {
      const dateRaw = r.data || '';
      const hourRaw = r.hora || '12:00';
      const sheetTimestamp = parseDateFromCloud(`${dateRaw} ${hourRaw}`);

      const failures = (r.falhas || r.itens_falha || r.itens_com_falha || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const items = failures.map((f: string, i: number) => ({
        id: `fail-${i}`,
        label: f,
        status: 'fail' as const,
        observation: 'FALHA IMPORTADA DA PLANILHA'
      }));

      return {
        id: r.id_ref || r.id || `rep-${Date.now()}-${Math.random()}`,
        timestamp: sheetTimestamp || Date.now(),
        area: r.area as Area,
        operator: sanitize(r.operador),
        turma: (r.turma || 'A') as any,
        turno: (r.turno || 'MANHÃ') as any,
        items: items,
        pendingItems: [],
        generalObservations: sanitize(r.obs),
        synced: true
      };
    });
  } catch (error) { return []; }
};

export const fetchCloudData = async (scriptUrl: string): Promise<CloudStats | null> => {
  if (!scriptUrl) return null;
  try {
    const response = await fetch(`${scriptUrl}?action=getStats&t=${Date.now()}`).catch(() => null);
    if (!response || !response.ok) return null;
    return await response.json();
  } catch (error) { return null; }
};

export const fetchCloudQualityReports = async (scriptUrl: string): Promise<QualityReport[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getQualityReports&t=${Date.now()}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((qr: any): QualityReport => {
      const dateRaw = qr.data || '';
      const hourRaw = qr.hora || '12:00';
      const sheetTimestamp = parseDateFromCloud(`${dateRaw} ${hourRaw}`);

      return {
        id: qr.id || `qr-${Date.now()}-${Math.random()}`,
        timestamp: sheetTimestamp || Date.now(),
        operator: sanitize(qr.operador),
        turma: (qr.turma || 'A') as any,
        turno: (qr.turno || 'MANHÃ') as any,
        ply: sanitize(qr.ply),
        dfp2_c_cr: qr.dfp2_c_cr || 0,
        dfp2_c_yield: qr.dfp2_c_yield || 0,
        dfp2_c_reject_ash: qr.dfp2_c_reject_ash || 0,
        dfp2_c_conc_ash: qr.dfp2_c_conc_ash || 0,
        dfp2_d_cr: qr.dfp2_d_cr || 0,
        dfp2_d_yield: qr.dfp2_d_yield || 0,
        dfp2_d_reject_ash: qr.dfp2_d_reject_ash || 0,
        dfp2_d_conc_ash: qr.dfp2_d_conc_ash || 0,
        colunas_d_cr: qr.colunas_d_cr || 0,
        colunas_d_yield: qr.colunas_d_yield || 0,
        colunas_d_reject_ash: qr.colunas_d_reject_ash || 0,
        colunas_d_conc_ash: qr.colunas_d_conc_ash || 0,
        humidade_fundo: qr.humidade_fundo || 0,
        humidade_oversize: qr.humidade_oversize || 0,
        humidade_concentrado: qr.humidade_concentrado || 0,
        generalObservations: sanitize(qr.obs),
        synced: true
      };
    });
  } catch (error) { return []; }
};
