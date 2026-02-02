
import { Report, ChecklistItem, PendingItem } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';

/**
 * Formata um resumo de múltiplas pendências no formato solicitado.
 */
export const formatSummaryForWhatsApp = (items: PendingItem[], note?: string): string => {
  let message = `*PENDÊNCIAS E PONTOS DE ATENÇÃO NO CIRCUITO DE ULTRAFINOS*\n\n`;
  if (note) message += `*Nota:* ${note.trim()}\n\n`;

  const groupedByArea: Record<string, PendingItem[]> = {};
  items.forEach(item => {
    if (!groupedByArea[item.area]) groupedByArea[item.area] = [];
    groupedByArea[item.area].push(item);
  });

  Object.entries(groupedByArea).forEach(([area, areaItems]) => {
    message += `*${area.toUpperCase()}*\n`;
    areaItems.forEach(item => {
      let emoji = item.status === 'resolvido' ? '✅' : (item.priority === 'alta' ? '🔴' : '🟡');
      const tagPart = item.tag ? item.tag.trim() : '';
      const descPart = item.description ? item.description.trim().toUpperCase() : '';
      message += tagPart ? `▪️${tagPart}${emoji} ${descPart}\n` : `▪️${descPart}${emoji}\n`;
    });
    message += `\n`;
  });
  return message.trim();
};

/**
 * Formata um relatório completo respeitando as visibilidades condicionais.
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

  let hideDueToNoFeed = false;

  itemsToFormat.forEach((item, index) => {
    if (item.label.startsWith('SECTION:')) {
      const sectionName = item.label.replace('SECTION:', '').trim();
      const sectionLower = sectionName.toLowerCase();
      
      if (hideDueToNoFeed && sectionLower.includes('equipamentos hbf')) hideDueToNoFeed = false;
      
      if (!hideDueToNoFeed || !sectionLower.includes('flotation columns')) {
        message += `\n*${sectionName}*\n`;
      }
    } else {
      const labelLower = item.label.toLowerCase();
      
      if (item.label === 'ALIMENTANDO COLUNAS?') {
        const isFeeding = item.status === 'ok';
        const feedStatus = isFeeding ? '🟢 SIM' : '🔴 NÃO';
        const obs = item.observation ? `\n   └ 📝 _MOTIVO: ${item.observation.toUpperCase()}_` : '';
        message += `${item.label} ${feedStatus}${obs}\n`;
        hideDueToNoFeed = !isFeeding;
        return;
      }

      if (hideDueToNoFeed) {
        const isActuallyColumnItem = labelLower.includes('coluna') || 
                                     labelLower.includes('-fc-') || 
                                     labelLower.includes('frother') || 
                                     labelLower.includes('colector') ||
                                     labelLower.includes('feed rate colunas') ||
                                     labelLower.includes('ar (kpa)') || 
                                     labelLower.includes('nível (%)') || 
                                     labelLower.includes('setpoint (%)');
        if (isActuallyColumnItem) return;
      }

      const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(kpa)') || labelLower.includes('(%)') || 
                            labelLower.includes('(g/t)') || labelLower.includes('(ppm)') || labelLower.includes('(t/m³)') || 
                            labelLower.includes('(l/min)') || labelLower.includes('(tph)') || labelLower.includes('(hz)') ||
                            labelLower.includes('(mm)');
      const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

      if (isMeasurement || isTextInput) {
        let suffix = "";
        
        if (labelLower.includes('nível (%)')) {
          const nextItem = itemsToFormat[index + 1];
          if (nextItem && nextItem.label.toLowerCase().includes('setpoint (%)')) {
            const valNivel = parseFloat(item.observation || "0");
            const valSetpoint = parseFloat(nextItem.observation || "0");
            if (item.observation && nextItem.observation) {
               suffix = valNivel === valSetpoint ? " 🟢" : " 🔴";
            }
          }
        } else if (labelLower.includes('setpoint (%)')) {
           const prevItem = itemsToFormat[index - 1];
           if (prevItem && prevItem.label.toLowerCase().includes('nível (%)')) {
              const valNivel = parseFloat(prevItem.observation || "0");
              const valSetpoint = parseFloat(item.observation || "0");
              if (item.observation && prevItem.observation) {
                suffix = valNivel === valSetpoint ? " 🟢" : " 🔴";
              }
           }
        }

        message += `${item.label}: ${item.observation || '---'}${suffix}\n`;
      } else {
        let statusEmoji = '';
        const obsLower = (item.observation || '').toLowerCase();

        // Mapeamento v9.0 de Emojis
        if (obsLower === 'ok' || obsLower === 'no lugar' || obsLower === 'sim' || obsLower === 'com retorno' || obsLower === 'limpa') {
          statusEmoji = '🟢';
        } else if (obsLower === 'anormal' || obsLower === 'fora do lugar' || obsLower === 'não' || obsLower === 'sem retorno' || obsLower === 'suja') {
          statusEmoji = '🔴';
        } else if (obsLower === 'turva') {
          statusEmoji = '🟡';
        } else if (obsLower === 'aberta' || obsLower === 'aberto') {
          statusEmoji = (labelLower.includes('diluicao') || labelLower.includes('corse')) ? '⚠️' : '🔵';
        } else if (obsLower === 'fechada' || obsLower === 'fechado') {
          statusEmoji = (labelLower.includes('diluicao') || labelLower.includes('corse')) ? '🟢' : '⚪';
        } else {
          switch (item.status) {
            case 'ok': statusEmoji = '🟢'; break;
            case 'fail': statusEmoji = '🔴'; break;
            case 'na': statusEmoji = '🟡'; break;
            case 'warning': statusEmoji = '⚠️'; break;
            default: statusEmoji = '⚪'; break;
          }
        }

        let obsText = '';
        if (item.observation) {
          const cleanObs = item.observation.trim();
          const autoTexts = [
            'OK', 'RODANDO', 'SIM', 'STANDBY', 'NÃO', 'ABERTO', 'ABERTA', 'FECHADO', 'FECHADA', 
            'SEM RETORNO', 'COM RETORNO', 'BOM', 'TURVA', 'RUIM', 'NO LUGAR', 'FORA DO LUGAR', 
            'ANORMAL', 'LIMPA', 'SUJA'
          ];
          if (!autoTexts.includes(cleanObs.toUpperCase())) {
            obsText = `\n   └ 📝 _MOTIVO: ${cleanObs.toUpperCase()}_`;
          } else {
             obsText = ` ${cleanObs.toUpperCase()}`;
          }
        }
        message += `${item.label} ${statusEmoji}${obsText}\n`;
      }
    }
  });

  if (report.generalObservations) {
    message += `\n📝 *OBSERVAÇÕES/PASSAGEM*\n${report.generalObservations.toUpperCase()}\n`;
  }
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
    console.error("Copy failed", err);
    return false;
  }
};
