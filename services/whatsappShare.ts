
import { Report, ChecklistItem, Area } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';

/**
 * Formata um relatório para o padrão de mensagem do WhatsApp solicitado.
 * Reconstroi seções caso o array de itens venha do histórico (sem marcadores de SECTION).
 */
export const formatReportForWhatsApp = (report: Report, itemsWithMaybeSections?: ChecklistItem[]): string => {
  const dateStr = new Date(report.timestamp).toLocaleDateString('pt-BR');
  const shiftHours = report.turno === 'MANHÃ' ? '06:14' : report.turno === 'TARDE' ? '14:22' : '22:06';

  // Cabeçalho Principal conforme solicitado estritamente
  let message = `${report.area.toUpperCase()}\n`;
  message += `📅 DATA: ${dateStr}| TURNO:${shiftHours}| TURMA: ${report.turma} | OPERADOR: ${report.operator.toUpperCase()}\n\n`;

  // Reconstrução de seções se estivermos visualizando do histórico
  let itemsToFormat = itemsWithMaybeSections || report.items;
  
  if (itemsToFormat.length > 0 && !itemsToFormat.some(i => i.label.startsWith('SECTION:'))) {
    const template = CHECKLIST_TEMPLATES[report.area] || [];
    const reconstructed: ChecklistItem[] = [];
    
    template.forEach((templateLabel, idx) => {
      if (templateLabel.startsWith('SECTION:')) {
        reconstructed.push({ id: `sec-${idx}`, label: templateLabel, status: 'ok' });
      } else {
        const found = report.items.find(i => i.label === templateLabel);
        if (found) reconstructed.push(found);
      }
    });
    itemsToFormat = reconstructed;
  }

  itemsToFormat.forEach(item => {
    if (item.label.startsWith('SECTION:')) {
      const sectionName = item.label.replace('SECTION:', '').trim();
      message += `${sectionName}\n`;
    } else {
      let statusEmoji = '';
      switch (item.status) {
        case 'ok': statusEmoji = '🟢'; break;
        case 'fail': statusEmoji = '🔴'; break;
        case 'na': statusEmoji = '🟡'; break;
        case 'warning': statusEmoji = '⚠️'; break;
        default: statusEmoji = '⚪'; break;
      }

      const isMeasurement = item.label.includes('(m³/h)') || item.label.includes('(Kpa)') || item.label.includes('(%)');
      
      if (isMeasurement) {
        message += `${item.label}: ${item.observation || '---'}\n`;
      } else {
        // Formata anexando a observação diretamente após o emoji
        const obsText = item.observation ? `${item.observation}` : '';
        message += `${item.label} ${statusEmoji}${obsText}\n`;
      }
    }
  });

  if (report.generalObservations) {
    message += `\n📝 OBSERVAÇÕES\n${report.generalObservations.toUpperCase()}\n`;
  }

  message += `\n📌 LEGENDA SCADA\n🟢 RODANDO | 🔴 PARADO | 🟡 STANDBY | ⚠️ ANOMALIA`;

  return message;
};

/**
 * Abre o WhatsApp com a mensagem formatada.
 */
export const shareToWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

/**
 * Copia o texto para a área de transferência.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('Falha ao copiar:', err);
    return false;
  }
};
