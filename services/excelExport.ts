
import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel file with print optimizations.
 * @param data Array of objects to export
 * @param fileName Desired filename (without extension)
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Configuração de largura de colunas para evitar cortes no texto
  const objectMaxLength: number[] = [];
  data.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const columnValue = val ? val.toString() : "";
      objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnValue.length + 2);
    });
  });
  
  // Limitar largura máxima para colunas muito longas (como descrições)
  // FIX: Use 'wch' (Width in Characters) instead of 'w' which is not a valid property for ColInfo
  worksheet["!cols"] = objectMaxLength.map((w) => ({ wch: Math.min(w, 50) }));

  // Configuração de Impressão: Paisagem e A4
  // Nota: A propriedade !pageSetup é suportada por visualizadores como Excel
  worksheet['!pageSetup'] = {
    orientation: 'landscape', // 'landscape' para paisagem
    paperSize: 9,             // 9 representa o tamanho A4
    scale: 100                // Escala de 100%
  };

  // Ajustar margens para caber mais conteúdo
  worksheet['!margins'] = {
    left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  
  // Create binary string
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create Blob and Trigger download
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  
  // Cleanup
  window.URL.revokeObjectURL(url);
};
