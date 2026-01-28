
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  User,
  History,
  Cloud,
  CloudOff,
  UserCheck,
  RotateCw,
  MessageCircle,
  Copy,
  Check as CheckIcon
} from 'lucide-react';
import { PendingItem, Area } from '../types';
import { exportToExcel } from '../services/excelExport';
import { fetchCloudItems, DEFAULT_SCRIPT_URL } from '../services/googleSync';
import { formatPendingForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface PendingListProps {
  pendingItems: PendingItem[];
  onResolve: (id: string, operatorName?: string) => void;
  onAddComment: (id: string, text: string) => void;
}

const PendingList: React.FC<PendingListProps> = ({ pendingItems, onResolve, onAddComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('Tudo');
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'resolvido' | 'Tudo'>('aberto');
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudItems, setCloudItems] = useState<PendingItem[]>([]);
  
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolverName, setResolverName] = useState('');

  const scriptUrl = localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL;

  const combinedItems = React.useMemo(() => {
    const map = new Map<string, PendingItem>();
    
    // Garantia de array
    const safeCloud = Array.isArray(cloudItems) ? cloudItems : [];
    const safeLocal = Array.isArray(pendingItems) ? pendingItems : [];

    safeCloud.forEach(item => {
      if (item && item.tag) {
        const key = item.tag.trim().toUpperCase();
        map.set(key, item);
      }
    });

    safeLocal.forEach(localItem => {
      if (localItem && localItem.tag) {
        const key = localItem.tag.trim().toUpperCase();
        const cloudItem = map.get(key);

        if (localItem.status === 'resolvido') {
          map.set(key, { ...(cloudItem || {}), ...localItem });
        } else if (!cloudItem || localItem.timestamp > cloudItem.timestamp) {
          map.set(key, localItem);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [pendingItems, cloudItems]);

  const filteredItems = combinedItems.filter(item => {
    const matchesSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleSyncCloud = async () => {
    if (!scriptUrl || scriptUrl === DEFAULT_SCRIPT_URL) return;
    setIsSyncing(true);
    try {
      const items = await fetchCloudItems(scriptUrl);
      setCloudItems(Array.isArray(items) ? items : []);
    } catch (e) { 
      console.error(e); 
      setCloudItems([]);
    } finally { 
      setIsSyncing(false); 
    }
  };

  useEffect(() => {
    handleSyncCloud();
    const interval = setInterval(handleSyncCloud, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const data = filteredItems.map(item => ({
      'TAG': item.tag, 'ÁREA': item.area, 'DESCRIÇÃO': item.description,
      'STATUS': item.status.toUpperCase(), 'RESOLVIDO POR': item.resolvedBy || '-'
    }));
    exportToExcel(data, 'Pendencias_Ultrafino');
  };

  const submitResolution = () => {
    if (resolvingId && resolverName.trim()) {
      onResolve(resolvingId, resolverName.trim().toUpperCase());
      setResolvingId(null);
      setResolverName('');
      setTimeout(handleSyncCloud, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {resolvingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <UserCheck size={32} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase">Confirmar Resolução</h2>
              <p className="text-slate-500 text-xs font-bold mt-1">Insira seu nome para baixar a pendência na planilha</p>
            </div>
            <input 
              type="text" placeholder="SEU NOME..." autoFocus
              value={resolverName} onChange={(e) => setResolverName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-center uppercase outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setResolvingId(null)} className="flex-1 py-4 border-2 border-slate-100 rounded-xl font-black uppercase text-slate-400 text-xs">Cancelar</button>
              <button onClick={submitResolution} disabled={!resolverName.trim()} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-emerald-600/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Pendências</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Sincronismo Bidirecional Ativo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSyncCloud} disabled={isSyncing} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase border border-slate-200 shadow-sm hover:bg-slate-50">
            <RotateCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md"><Download size={14} /> Exportar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar TAG ou Equipamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold uppercase" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase">
            <option value="Tudo">Áreas: Todas</option>
            {Object.values(Area).map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-900 text-white border border-slate-900 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest">
            <option value="aberto">📂 Abertas</option>
            <option value="resolvido">✅ Resolvidas</option>
            <option value="Tudo">📊 Todas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`bg-white rounded-2xl border transition-all flex flex-col h-full ${item.status === 'resolvido' ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 shadow-sm'}`}>
            <div className="p-4 border-b border-slate-50 flex justify-between items-start">
              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.status === 'resolvido' ? 'bg-emerald-500 text-white' : item.priority === 'alta' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                {item.status === 'resolvido' ? 'RESOLVIDO' : `Prioridade ${item.priority}`}
              </span>
              <div className="flex gap-1">
                <button onClick={() => { shareToWhatsApp(formatPendingForWhatsApp(item)); }} className="p-1.5 text-slate-400 hover:text-green-600"><MessageCircle size={16} /></button>
              </div>
            </div>
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.area}</span>
                <span className="text-blue-600">TAG: {item.tag || 'N/A'}</span>
              </div>
              <p className="text-sm font-black text-slate-900 leading-relaxed uppercase">{item.description}</p>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Reporte: {item.operator?.toUpperCase() || 'SISTEMA'}</p>
                {item.status === 'resolvido' && <p className="text-[10px] font-black text-emerald-700 uppercase">Resolvido: {item.resolvedBy?.toUpperCase()}</p>}
                <p className="text-[9px] text-slate-400 italic">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto rounded-b-2xl">
              <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${item.status === 'aberto' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {item.status === 'aberto' ? <AlertCircle size={14} className="animate-pulse" /> : <CheckCircle2 size={14} />} 
                {item.status}
              </span>
              {item.status === 'aberto' && (
                <button onClick={() => setResolvingId(item.id)} className="bg-white text-slate-700 border-2 border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">
                  Baixar Pendência
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingList;
