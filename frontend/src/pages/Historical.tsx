import { useState, useCallback } from 'react';
import {
  Search, Filter, Download, Calendar, ChevronDown,
  PackageOpen, Activity, Terminal, Loader2,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  TrendingUp, Clock
} from 'lucide-react';
import { monitoringService } from '../services/plant.service';
import type { SensorEvent, ClassificationResult, CommandLog } from '../types/plant.types';

// ── Helpers ────────────────────────────────────
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-GT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const LINEA_COLOR: Record<string, string> = {
  plastico: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  vidrio:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  metal:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const CATEGORY_LABEL: Record<string, string> = {
  parqueo:      'Parqueo',
  acceso:       'Acceso',
  banda:        'Bandas',
  clasificador: 'Clasificador',
  seguridad:    'Seguridad',
};

type TabType = 'events' | 'classifications' | 'commands';

// ── Mini bar chart ─────────────────────────────
const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex-1">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
  </div>
);

// ── Componente principal ──────────────────────
const Historical = () => {
  const [tab, setTab] = useState<TabType>('classifications');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [category, setCategory] = useState('');
  const [linea, setLinea]     = useState('');
  const [limit, setLimit]     = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState('');

  const [events, setEvents]           = useState<SensorEvent[]>([]);
  const [classifications, setClassifications] = useState<ClassificationResult[]>([]);
  const [commands, setCommands]       = useState<CommandLog[]>([]);
  const [searched, setSearched]       = useState(false);

  // Filtrado local por fechas (la API no tiene filtro por fecha en este MVP)
  const filterByDate = <T extends { receivedAt?: string; timestamp?: string; sentAt?: string }>(
    arr: T[]
  ): T[] => {
    return arr.filter((item) => {
      const iso = item.receivedAt ?? item.timestamp ?? item.sentAt ?? '';
      if (!iso) return true;
      const d = new Date(iso).getTime();
      if (dateFrom && d < new Date(dateFrom).getTime()) return false;
      if (dateTo   && d > new Date(dateTo + 'T23:59:59').getTime()) return false;
      return true;
    });
  };

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (tab === 'events') {
        const res = await monitoringService.getEvents({ category: category || undefined, limit });
        setEvents(filterByDate(res.data));
      } else if (tab === 'classifications') {
        const res = await monitoringService.getClassifications({ linea: linea || undefined, limit });
        setClassifications(filterByDate(res.data));
      } else {
        const res = await monitoringService.getCommands(limit);
        setCommands(filterByDate(res.data));
      }
      setSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al consultar datos.');
    } finally {
      setIsLoading(false);
    }
  }, [tab, category, linea, limit, dateFrom, dateTo]);

  // Stats para clasificaciones
  const stats = {
    aprobados:  classifications.filter((c) => c.resultado === 'aprobado').length,
    rechazados: classifications.filter((c) => c.resultado === 'rechazado').length,
    plastico:   classifications.filter((c) => c.linea === 'plastico').length,
    vidrio:     classifications.filter((c) => c.linea === 'vidrio').length,
    metal:      classifications.filter((c) => c.linea === 'metal').length,
  };
  const totalClass = classifications.length;

  const tabCfg: Record<TabType, { label: string; icon: React.ReactNode }> = {
    classifications: { label: 'Clasificaciones', icon: <PackageOpen size={15} /> },
    events:          { label: 'Eventos de sensores', icon: <Activity size={15} /> },
    commands:        { label: 'Historial de comandos', icon: <Terminal size={15} /> },
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Consulta Histórica</h1>
          <p className="text-slate-500 text-sm mt-0.5">Datos almacenados en MongoDB Atlas</p>
        </div>

        {/* Filtros */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={15} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Fecha inicio */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Fecha inicio</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
            {/* Fecha fin */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Fecha fin</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Filtro específico según tab */}
            {tab === 'events' ? (
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Categoría</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Todas</option>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : tab === 'classifications' ? (
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Línea</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    value={linea} onChange={(e) => setLinea(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Todas</option>
                    <option value="plastico">Plástico</option>
                    <option value="vidrio">Vidrio</option>
                    <option value="metal">Metal</option>
                  </select>
                </div>
              </div>
            ) : <div />}

            {/* Límite */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Máx. registros</label>
              <div className="relative">
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select
                  value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-900/30"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {isLoading ? 'Consultando...' : 'Consultar'}
            </button>
            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-sm">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {(Object.entries(tabCfg) as [TabType, typeof tabCfg[TabType]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSearched(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cfg.icon}{cfg.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        {searched && (
          <>
            {/* ── Gráficas para clasificaciones ── */}
            {tab === 'classifications' && classifications.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Aprobados vs rechazados */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={15} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Resultados globales</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-400 font-medium">Aprobados</span>
                        <span className="text-slate-400">{stats.aprobados} ({totalClass ? Math.round(stats.aprobados/totalClass*100) : 0}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MiniBar value={stats.aprobados} max={totalClass} color="bg-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-red-400 font-medium">Rechazados</span>
                        <span className="text-slate-400">{stats.rechazados} ({totalClass ? Math.round(stats.rechazados/totalClass*100) : 0}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MiniBar value={stats.rechazados} max={totalClass} color="bg-red-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Por línea */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={15} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Por línea</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'plastico', label: 'Plástico', color: 'bg-blue-500', count: stats.plastico },
                      { key: 'vidrio',   label: 'Vidrio',   color: 'bg-cyan-500',  count: stats.vidrio },
                      { key: 'metal',    label: 'Metal',    color: 'bg-amber-500', count: stats.metal },
                    ].map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 font-medium">{item.label}</span>
                          <span className="text-slate-400">{item.count} ({totalClass ? Math.round(item.count/totalClass*100) : 0}%)</span>
                        </div>
                        <MiniBar value={item.count} max={totalClass} color={item.color} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tabla ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <span className="text-sm text-slate-400">
                  {tab === 'events' ? `${events.length} eventos` :
                   tab === 'classifications' ? `${classifications.length} clasificaciones` :
                   `${commands.length} comandos`}
                </span>
                <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <Download size={13} /> Exportar
                </button>
              </div>

              <div className="overflow-x-auto">
                {/* Tabla de clasificaciones */}
                {tab === 'classifications' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3 font-medium">Fecha y hora</th>
                        <th className="text-left px-5 py-3 font-medium">Línea</th>
                        <th className="text-left px-5 py-3 font-medium">Resultado</th>
                        <th className="text-left px-5 py-3 font-medium">Medición</th>
                        <th className="text-left px-5 py-3 font-medium">Almacén tras evento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classifications.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-slate-600">Sin resultados</td></tr>
                      ) : classifications.map((c) => (
                        <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3 text-slate-400 flex items-center gap-1.5"><Clock size={12} />{fmt(c.timestamp)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${LINEA_COLOR[c.linea] ?? ''}`}>
                              {c.linea}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {c.resultado === 'aprobado'
                              ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13} /> Aprobado</span>
                              : <span className="flex items-center gap-1 text-red-400"><XCircle size={13} /> Rechazado</span>}
                          </td>
                          <td className="px-5 py-3 text-slate-300">
                            {c.medicion != null ? `${c.medicion} mm` : c.transparencia != null ? `${c.transparencia}%` : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {c.porcentaje_almacen_tras_evento != null
                              ? <span className={`font-medium ${c.porcentaje_almacen_tras_evento >= 90 ? 'text-red-400' : 'text-slate-300'}`}>
                                  {c.porcentaje_almacen_tras_evento}%
                                </span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Tabla de eventos de sensores */}
                {tab === 'events' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3 font-medium">Fecha y hora</th>
                        <th className="text-left px-5 py-3 font-medium">Categoría</th>
                        <th className="text-left px-5 py-3 font-medium">Topic</th>
                        <th className="text-left px-5 py-3 font-medium">Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-10 text-slate-600">Sin resultados</td></tr>
                      ) : events.map((e) => (
                        <tr key={e._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3 text-slate-400 whitespace-nowrap"><Clock size={12} className="inline mr-1" />{fmt(e.receivedAt)}</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs capitalize">
                              {CATEGORY_LABEL[e.category] ?? e.category}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-400 font-mono text-xs">{e.topic}</td>
                          <td className="px-5 py-3 text-slate-500 font-mono text-xs max-w-xs truncate">
                            {JSON.stringify(e.payload)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Tabla de comandos */}
                {tab === 'commands' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3 font-medium">Fecha y hora</th>
                        <th className="text-left px-5 py-3 font-medium">Comando</th>
                        <th className="text-left px-5 py-3 font-medium">Topic</th>
                        <th className="text-left px-5 py-3 font-medium">Usuario</th>
                        <th className="text-left px-5 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commands.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-slate-600">Sin resultados</td></tr>
                      ) : commands.map((c) => (
                        <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3 text-slate-400 whitespace-nowrap"><Clock size={12} className="inline mr-1" />{fmt(c.sentAt)}</td>
                          <td className="px-5 py-3">
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold capitalize">
                              {c.comando}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 font-mono text-xs">{c.topic}</td>
                          <td className="px-5 py-3 text-slate-300 text-xs">{c.userName}</td>
                          <td className="px-5 py-3">
                            {c.status === 'sent'
                              ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={12} /> Enviado</span>
                              : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> Error</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {!searched && (
          <div className="text-center py-16 text-slate-600">
            <Search size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Configura los filtros y presiona Consultar para ver datos</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Historical;
