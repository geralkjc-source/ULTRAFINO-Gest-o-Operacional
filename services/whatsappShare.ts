
import { Report, ChecklistItem, Area, PendingItem } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';

/**
 * Formata um resumo de múltiplas pendências no formato solicitado.
 */
export const formatSummaryForWhatsApp = (items: PendingItem[], note?: string): string => {
  let message = `*PENDÊNCIAS E PONTOS DE ATENÇÃO NO CIRCUITO DE ULTRAFINOS*\n\n`;

  if (note) {
    message += `*Nota:* ${note.trim()}\n\n`;
  }

  // Agrupar por área
  const groupedByArea: Record<string, PendingItem[]> = {};
  items.forEach(item => {
    if (!groupedByArea[item.area]) groupedByArea[item.area] = [];
    groupedByArea[item.area].push(item);
  });

  Object.entries(groupedByArea).forEach(([area, areaItems]) => {
    message += `*${area.toUpperCase()}*\n`;
    
    areaItems.forEach(item => {
      let emoji = '⚪';
      if (item.status === 'resolvido') {
        emoji = '✅';
      } else {
        emoji = item.priority === 'alta' ? '🔴' : '🟡';
      }

      const tagPart = item.tag ? item.tag.trim() : '';
      const descPart = item.description ? item.description.trim().toUpperCase() : '';
      
      // Formato: ▪️TAG EMOJI DESCRIÇÃO ou ▪️DESCRIÇÃO EMOJI se não houver tag
      if (tagPart) {
        message += `▪️${tagPart}${emoji} ${descPart}\n`;
      } else {
        message += `▪️${descPart}${emoji}\n`;
      }
    });
    message += `\n`;
  });

  return message.trim();
};

/**
 * Formata uma pendência individual para compartilhamento.
 */
export const formatPendingForWhatsApp = (item: PendingItem): string => {
  const dateStr = new Date(item.timestamp).toLocaleDateString('pt-BR');
  const timeStr = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const priorityEmoji = item.priority === 'alta' ? '🔴' : item.priority === 'media' ? '🟡' : '🔵';
  
  let message = `*🚨 PENDÊNCIA OPERACIONAL - ULTRAFINO*\n\n`;
  message += `📍 *ÁREA:* ${item.area.toUpperCase()}\n`;
  message += `🏷️ *TAG:* ${item.tag || 'N/A'}\n`;
  message += `${priorityEmoji} *PRIORIDADE:* ${item.priority.toUpperCase()}\n`;
  message += `📝 *DESCRIÇÃO:* ${item.description.toUpperCase()}\n`;
  message += `⏰ *DATA:* ${dateStr} às ${timeStr}\n`;
  message += `🔄 *STATUS:* ${item.status.toUpperCase()}\n`;

  if (item.comments && item.comments.length > 0) {
    message += `\n💬 *ÚLTIMOS COMENTÁRIOS:*\n`;
    item.comments.slice(-2).forEach(c => {
      message += `- _${c.text}_\n`;
    });
  }

  return message;
};

/**
 * Formata um relatório completo.
 */
export const formatReportForWhatsApp = (report: Report, itemsWithMaybeSections?: ChecklistItem[]): string => {
  const dateStr = new Date(report.timestamp).toLocaleDateString('pt-BR');
  const timeStr = new Date(report.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const turnoAjustado = report.turno.toUpperCase();

  let message = `*${report.area.toUpperCase()}*\n`;
  message += `📅 DATA: ${dateStr} | 🕒 HORA: ${timeStr}\n`;
  message += `🔄 TURNO: ${turnoAjustado} | 👥 TURMA: ${report.turma} | 👷 OPERADOR: ${report.operator.toUpperCase()}\n\n`;

  let itemsToFormat: ChecklistItem[] = [];

  if (itemsWithMaybeSections && itemsWithMaybeSections.some(i => i.label.startsWith('SECTION:'))) {
    itemsToFormat = itemsWithMaybeSections;
  } else {
    const template = CHECKLIST_TEMPLATES[report.area] || [];
    let itemPointer = 0;
    
    template.forEach((templateLabel, idx) => {
      if (templateLabel.startsWith('SECTION:')) {
        itemsToFormat.push({ id: `sec-${idx}`, label: templateLabel, status: 'ok' });
      } else {
        if (report.items[itemPointer]) {
          itemsToFormat.push(report.items[itemPointer]);
          itemPointer++;
        }
      }
    });
  }

  let isSectionDisabled = false;

  itemsToFormat.forEach((item, index) => {
    if (item.label.startsWith('SECTION:')) {
      const sectionName = item.label.replace('SECTION:', '').trim();
      message += `\n*${sectionName}*\n`;
      isSectionDisabled = false; 
    } else {
      if (item.label === 'ALIMENTANDO COLUNAS?') {
        const isOff = item.status === 'fail';
        const statusEmoji = isOff ? '🔴' : '🟢';
        message += `${item.label} ${statusEmoji} ${isOff ? 'NÃO ALIMENTANDO (STANDBY)' : 'SIM (OPERANDO)'}\n`;
        if (isOff) isSectionDisabled = true;
        return;
      }

      if (isSectionDisabled) return;

      let statusEmoji = '';
      switch (item.status) {
        case 'ok': statusEmoji = '🟢'; break;
        case 'fail': statusEmoji = '🔴'; break;
        case 'na': statusEmoji = '🟡'; break;
        case 'warning': statusEmoji = '⚠️'; break;
        default: statusEmoji = '⚪'; break;
      }

      const labelLower = item.label.toLowerCase();
      const isMeasurement = labelLower.includes('(m³/h)') || 
                            labelLower.includes('(kpa)') || 
                            labelLower.includes('(%)') || 
                            labelLower.includes('(g/t)') || 
                            labelLower.includes('(ppm)') || 
                            labelLower.includes('(t/m³)') || 
                            labelLower.includes('(l/min)') ||
                            labelLower.includes('(tph)') ||
                            labelLower.includes('(hz)');
      
      const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

      if (isMeasurement || isTextInput) {
        let suffix = '';
        if (isMeasurement) {
           // Lógica de alvo (actual == setpoint)
           const isValActual = labelLower.includes('actual') || labelLower.includes('atual') || labelLower.includes('nível');
           if (isValActual) {
             const nextItem = itemsToFormat[index + 1];
             if (nextItem && nextItem.label.toLowerCase().includes('setpoint') && item.observation && nextItem.observation) {
               if (parseFloat(item.observation) === parseFloat(nextItem.observation)) suffix = ' 🎯';
             }
           }
        }
        message += `${item.label}: ${item.observation || '---'}${suffix}\n`;
      } else {
        let obsText = '';
        if (item.observation) {
          const cleanObs = item.observation.trim();
          const autoTexts = ['OK', 'RODANDO', 'SIM', 'STANDBY', 'NÃO', 'ABERTO', 'FECHADO', 'SEM RETORNO', 'COM RETORNO', 'NO lugar', 'Fora do lugar', 'BOM', 'TURVA', 'RUIM'];
          if (!autoTexts.includes(cleanObs)) {
            obsText = `\n   └ 📝 _MOTIVO: ${cleanObs.toUpperCase()}_`;
          } else {
             obsText = ` ${cleanObs}`;
          }
        }
        message += `${item.label} ${statusEmoji}${obsText}\n`;
      }
    }
  });

  if (report.generalObservations) {
    message += `\n📝 *PASSAGEM DE TURNO / OBSERVAÇÕES*\n${report.generalObservations.toUpperCase()}\n`;
  }

  message += `\n📌 *LEGENDA SCADA*\n🟢 RODANDO | 🔴 PARADO | 🟡 STANDBY | ⚠️ ANOMALIA`;

  return message;
};

export const shareToWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    return false;
  }
};
