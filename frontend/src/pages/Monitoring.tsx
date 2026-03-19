import { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, Clock,
  Car, DoorOpen, Flame,
  AlertTriangle, CheckCircle, XCircle,
  Zap, PackageOpen, Activity, Shield,
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

// ── Helpers ───────────────────────────────────
const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const MATERIAL_LABEL: Record<number, string> = { 0: 'Plástico', 1: 'Vidrio', 2: 'Metal' };
const MATERIAL_COLOR: Record<number, string> = {
  0: 'text-blue-400',
  1: 'text-cyan-400',
  2: 'text-amber-400',
};

// ── Indicador booleano ─────────────────────────
const BoolBadge = ({ value, labelTrue, labelFalse, danger = false }:
  { value: boolean; labelTrue: string; labelFalse: string; danger?: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
    value
      ? danger ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'bg-slate-700/60 text-slate-400 border border-slate-700'
  }`}>
    {value ? <CheckCircle size={11} /> : <XCircle size={11} />}
    {value ? labelTrue : labelFalse}
  </span>
);

// ── Barra de almacén ───────────────────────────
const StorageBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className={`text-sm font-bold ${value >= 90 ? 'text-red-400' : value >= 70 ? 'text-amber-400' : 'text-slate-300'}`}>
        {value}%
      </span>
    </div>
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color} ${value >= 90 ? 'animate-pulse' : ''}`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

// ── Tarjeta de sección ─────────────────────────
const Card = ({ title, icon, children, alert = false }:
  { title: string; icon: React.ReactNode; children: React.ReactNode; alert?: boolean }) => (
  <div className={`bg-slate-900 rounded-2xl border p-5 ${alert ? 'border-red-500/50 shadow-red-900/20 shadow-lg' : 'border-slate-800'}`}>
    <div className="flex items-center gap-2 mb-4">
      <span className={alert ? 'text-red-400' : 'text-blue-400'}>{icon}</span>
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h3>
      {alert && <span className="ml-auto flex h-2 w-2"><span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>}
    </div>
    {children}
  </div>
);

// ── Fila de dato ───────────────────────────────
const DataRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
    <span className="text-slate-500 text-sm">{label}</span>
    <span className="text-right">{children}</span>
  </div>
);

// ── Indicador de banda ─────────────────────────
const BandaIndicator = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
    active
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : 'bg-slate-800/60 border-slate-700 text-slate-500'
  }`}>
    <Activity size={14} className={active ? 'text-emerald-400' : 'text-slate-600'} />
    {label}
  </div>
);

// ── Componente principal ──────────────────────
const Monitoring = () => {
  const { plantState: s, socketStatus, reconnect } = useSocket();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const statusConfig = {
    connected:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <Wifi size={14} />, label: 'Conectado' },
    connecting:   { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',     icon: <RefreshCw size={14} className="animate-spin" />, label: 'Conectando...' },
    disconnected: { color: 'text-slate-400',   bg: 'bg-slate-800 border-slate-700',           icon: <WifiOff size={14} />, label: 'Desconectado' },
    error:        { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         icon: <WifiOff size={14} />, label: 'Error' },
  }[socketStatus];

  const hasAlerts = s.alerta_humo || s.alerta_rfid || s.alerta_parqueo_lleno || s.modo_emergencia;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Fondo grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Monitoreo en Tiempo Real</h1>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
              <Clock size={13} />
              {now.toLocaleString('es-GT')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.icon}{statusConfig.label}
            </span>
            {socketStatus !== 'connected' && (
              <button onClick={reconnect} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors">
                <RefreshCw size={13} /> Reconectar
              </button>
            )}
          </div>
        </div>

        {/* Banner de emergencia */}
        {s.modo_emergencia && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <Shield size={20} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-bold text-sm">MODO EMERGENCIA ACTIVO</p>
              <p className="text-red-500/80 text-xs">Todas las operaciones están suspendidas. Sistema en estado de alerta general.</p>
            </div>
          </div>
        )}

        {s.alerta_humo && (
          <div className="bg-orange-500/15 border border-orange-500/40 rounded-2xl p-4 flex items-center gap-3">
            <Flame size={20} className="text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-orange-400 font-bold text-sm">ALERTA DE HUMO DETECTADO</p>
              <p className="text-orange-500/80 text-xs">Umbral del sensor: {s.umbral_humo} ppm. Verificar la planta inmediatamente.</p>
            </div>
          </div>
        )}

        {/* Grid principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {/* Parqueo */}
          <Card title="Parqueo vehicular" icon={<Car size={16} />} alert={s.alerta_parqueo_lleno}>
            <DataRow label="Espacios ocupados">
              <span className="text-white font-bold">{s.parqueos_ocupados} / 2</span>
            </DataRow>
            <DataRow label="Talanquera">
              <BoolBadge value={s.talanquera_abierta} labelTrue="Abierta" labelFalse="Cerrada" />
            </DataRow>
            <DataRow label="Alerta lleno">
              <BoolBadge value={s.alerta_parqueo_lleno} labelTrue="Lleno" labelFalse="Disponible" danger />
            </DataRow>
          </Card>

          {/* Acceso peatonal */}
          <Card title="Acceso peatonal" icon={<DoorOpen size={16} />} alert={s.alerta_rfid}>
            <DataRow label="Puerta principal">
              <BoolBadge value={s.puerta_abierta} labelTrue="Abierta" labelFalse="Cerrada" />
            </DataRow>
            <DataRow label="Alarma RFID">
              <BoolBadge value={s.alerta_rfid} labelTrue="⚠ Alerta activa" labelFalse="Sin alertas" danger />
            </DataRow>
          </Card>

          {/* Iluminación y seguridad */}
          <Card title="Seguridad y control" icon={<Shield size={16} />} alert={s.alerta_humo || s.modo_emergencia}>
            <DataRow label="Iluminación">
              <BoolBadge value={s.iluminacion} labelTrue="Encendida" labelFalse="Apagada" />
            </DataRow>
            <DataRow label="Sensor de humo">
              <BoolBadge value={s.alerta_humo} labelTrue="Humo detectado" labelFalse="Normal" danger />
            </DataRow>
            <DataRow label="Umbral humo">
              <span className={`text-sm font-medium ${s.umbral_humo > 200 ? 'text-red-400' : 'text-slate-300'}`}>
                {s.umbral_humo} ppm
              </span>
            </DataRow>
            <DataRow label="Modo emergencia">
              <BoolBadge value={s.modo_emergencia} labelTrue="ACTIVO" labelFalse="Normal" danger />
            </DataRow>
          </Card>

          {/* Bandas */}
          <Card title="Líneas de producción" icon={<Activity size={16} />}>
            <div className="grid grid-cols-2 gap-2">
              <BandaIndicator label="Principal"  active={s.banda_principal} />
              <BandaIndicator label="Plástico"   active={s.banda_plastico} />
              <BandaIndicator label="Vidrio"     active={s.banda_vidrio} />
              <BandaIndicator label="Metal"      active={s.banda_metal} />
            </div>
          </Card>

          {/* Clasificador */}
          <Card title="Clasificador" icon={<Zap size={16} />}>
            <DataRow label="Material en proceso">
              <span className={`text-sm font-bold ${MATERIAL_COLOR[s.codigo_material]}`}>
                {MATERIAL_LABEL[s.codigo_material] ?? '—'}
              </span>
            </DataRow>
            <div className="mt-3 flex gap-2">
              {[0, 1, 2].map((code) => (
                <div key={code} className={`flex-1 text-center py-2 rounded-xl text-xs font-semibold border transition-all ${
                  s.codigo_material === code
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-600'
                }`}>
                  {MATERIAL_LABEL[code]}
                </div>
              ))}
            </div>
          </Card>

          {/* Almacenes */}
          <Card title="Capacidad de almacenes" icon={<PackageOpen size={16} />}
            alert={s.almacen_plastico >= 90 || s.almacen_vidrio >= 90 || s.almacen_metal >= 90}>
            <div className="space-y-4">
              <StorageBar label="Plástico" value={s.almacen_plastico} color="bg-blue-500" />
              <StorageBar label="Vidrio"   value={s.almacen_vidrio}   color="bg-cyan-500" />
              <StorageBar label="Metal"    value={s.almacen_metal}    color="bg-amber-500" />
            </div>
            <p className="text-xs text-slate-600 mt-3 text-right">Máx. {s.almacen_max} unidades por almacén</p>
          </Card>

        </div>

        {/* Footer — última actualización */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
          <span className="flex items-center gap-1.5">
            {hasAlerts
              ? <AlertTriangle size={12} className="text-amber-500" />
              : <CheckCircle size={12} className="text-emerald-500" />}
            {hasAlerts ? 'Hay alertas activas' : 'Sistema operando con normalidad'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            Última actualización: {fmt(s.last_updated)}
          </span>
        </div>

      </div>
    </div>
  );
};

export default Monitoring;
