
import * as XLSX from 'xlsx';
import { Report, PendingItem } from '../types';

/**
 * Exports data to an Excel file with print optimizations.
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  const objectMaxLength: number[] = [];
  data.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const columnValue = val ? val.toString() : "";
      objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnValue.length + 2);
    });
  });
  
  worksheet["!cols"] = objectMaxLength.map((w) => ({ wch: Math.min(w, 50) }));

  worksheet['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9,
    scale: 100
  };

  worksheet['!margins'] = {
    left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const now = new Date();
  const monthTag = `${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;
  link.download = `${fileName}_${monthTag}.xlsx`;
  
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Exportação Consolidada Admin (Relatórios + Pendências) em abas separadas.
 */
export const exportMasterToExcel = (reports: Report[], pending: PendingItem[], fileName: string) => {
  const workbook = XLSX.utils.book_new();
  const now = new Date();
  const monthTag = `${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;

  // 1. Preparar Aba de Relatórios
  const reportsData = reports.map(r => ({
    'Data': new Date(r.timestamp).toLocaleDateString('pt-BR'),
    'Hora': new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    'Área': r.area,
    'Operador': r.operator.toUpperCase(),
    'Turma': r.turma,
    'Turno': r.turno,
    'Itens com Falha': r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => i.label).join(', '),
    'Observações': r.generalObservations.toUpperCase()
  }));
  const wsReports = XLSX.utils.json_to_sheet(reportsData);
  XLSX.utils.book_append_sheet(workbook, wsReports, `REL_${monthTag}`);

  // 2. Preparar Aba de Pendências
  const pendingData = pending.map(p => ({
    'Tag': p.tag.toUpperCase(),
    'Área': p.area,
    'Descrição': p.description.toUpperCase(),
    'Prioridade': p.priority.toUpperCase(),
    'Status': p.status.toUpperCase(),
    'Operador Origem': p.operator?.toUpperCase() || 'N/A',
    'Resolvido Por': p.resolvedBy?.toUpperCase() || (p.status === 'resolvido' ? 'N/A' : '-'),
    'Data Reporte': new Date(p.timestamp).toLocaleString('pt-BR')
  }));
  const wsPending = XLSX.utils.json_to_sheet(pendingData);
  XLSX.utils.book_append_sheet(workbook, wsPending, `PEND_${monthTag}`);

  // Gerar arquivo
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${monthTag}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
