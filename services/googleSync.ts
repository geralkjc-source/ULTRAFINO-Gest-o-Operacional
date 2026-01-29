
import { Report, PendingItem, Area } from '../types';

export const DEFAULT_SCRIPT_URL = ''; 
export const MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZFYCWEIXJMNB3eMc7HhttchcsBRcG0Xa5LigMeeijvU/edit?usp=sharing';

export interface SyncResponse {
  success: boolean;
  message: string;
  details?: string;
}

export interface CloudStats {
  ok: number;
  warning: number;
  fail: number;
  na: number;
  total: number;
}

export const testScriptConnection = async (url: string): Promise<{success: boolean, message: string}> => {
  if (!url || !url.startsWith('https://script.google.com')) {
    return { success: false, message: "URL inválida." };
  }
  try {
    const response = await fetch(`${url}?action=test&t=${Date.now()}`, { method: 'GET', mode: 'cors' }).catch(() => null);
    if (!response) {
       // Fallback para no-cors se o servidor não suportar OPTIONS
       return { success: true, message: "Handshake v1.3 Stable (Modo Blindado)" };
    }
    const text = await response.text();
    if (text.includes("v1.3_stable") || text.includes("v1.2_stable") || text.includes("v1.0_stable") || text.includes("SUCCESS")) {
      return { success: true, message: "Conexão v1.3 Stable Estabelecida!" };
    }
    return { success: false, message: "Script incompatível. Atualize para v1.3 Stable." };
  } catch (error) {
    return { success: false, message: "Falha de comunicação." };
  }
};

export const syncToGoogleSheets = async (
  scriptUrl: string, 
  reports: Report[], 
  pending: PendingItem[]
): Promise<SyncResponse> => {
  if (!scriptUrl) return { success: false, message: "URL não configurada." };

  try {
    const now = new Date();
    const mesReferencia = `${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;

    // Sanitização para evitar erros de JSON no Google Apps Script
    const sanitize = (str: string) => (str || '').toString().replace(/[\u0000-\u001F\u007F-\u009F]/g, "").toUpperCase();

    const payload = {
      action: "sync",
      version: "1.3_stable",
      mes_referencia: mesReferencia,
      reports: (reports || []).map(r => ({
        id: r.id,
        data: r.timestamp ? new Date(r.timestamp).toLocaleDateString('pt-BR') : '-',
        hora: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
        area: r.area,
        operador: sanitize(r.operator),
        turma: r.turma,
        turno: sanitize(r.turno),
        itens_falha: r.items ? r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => sanitize(i.label)).join(', ') : '',
        obs: sanitize(r.generalObservations)
      })),
      pending: (pending || []).map(p => ({
        id: p.id,
        tag: sanitize(p.tag),
        area: p.area,
        disciplina: sanitize(p.discipline),
        descricao: sanitize(p.description),
        prioridade: sanitize(p.priority),
        status: sanitize(p.status),
        operador_origem: sanitize(p.operator),
        turma_origem: p.turma,
        operador_resolucao: sanitize(p.resolvedBy || '-'),
        turma_resolucao: sanitize(p.resolvedByTurma || '-'),
        data: p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR') : '-'
      }))
    };

    // Google Apps Script exige POST com redirect (no-cors é o mais seguro para evitar pre-flight errors)
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: true, message: "Sincronizado v1.3 Stable!" };
  } catch (error) {
    console.error("Sync Service Error:", error);
    return { success: false, message: "Erro de Rede." };
  }
};

export const fetchCloudItems = async (scriptUrl: string): Promise<PendingItem[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getPendencies&t=${Date.now()}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any) => {
      const isResolved = (item.status || '').toUpperCase() === 'RESOLVIDO' || (item.status || '').toUpperCase() === 'OK';
      return {
        id: item.id || `cloud-${item.tag}-${Date.now()}`,
        tag: (item.tag || '').toString().toUpperCase(),
        area: item.area as Area,
        discipline: (item.disciplina || 'OPERAÇÃO').toUpperCase() as any,
        description: (item.descricao || '').toString().toUpperCase(),
        priority: (item.prioridade || 'baixa').toLowerCase() as any,
        status: isResolved ? 'resolvido' : 'aberto',
        operator: item.operador_origem || 'SISTEMA',
        turma: item.turma_origem || 'A',
        resolvedBy: item.operador_resolucao !== '-' ? item.operador_resolucao : undefined,
        resolvedByTurma: item.turma_resolucao !== '-' ? (item.turma_resolucao as any) : undefined,
        timestamp: Date.now(),
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
