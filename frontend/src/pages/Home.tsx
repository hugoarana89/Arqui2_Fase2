import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ShieldAlert, PackageOpen, Car,
  AlertTriangle, CheckCircle2, Flame, Zap,
  ArrowRight, Clock, LayoutDashboard, Wifi, WifiOff
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { monitoringService } from '../services/plant.service';
import type { ClassificationResult, CommandLog } from '../types/plant.types';

// ── Helpers ────────────────────────────────────
const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ── KPI Card ───────────────────────────────────
const KpiCard = ({
  label, value, sub, icon, color, alert = false
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; alert?: boolean;
}) => (
  <div className={`bg-slate-900 rounded-2xl border p-5 flex items-start gap-4 ${alert ? 'border-red-500/40 shadow-lg shadow-red-900/10' : 'border-slate-800'}`}>
    <div className={`p-2.5 rounded-xl flex-shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Alert banner ───────────────────────────────
const AlertBanner = ({ icon, title, message, color }:
  { icon: React.ReactNode; title: string; message: string; color: string }) => (
  <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${color}`}>
    <span className="flex-shrink-0">{icon}</span>
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs opacity-80">{message}</p>
    </div>
  </div>
);

// ── Línea de estado ────────────────────────────
const BandaStatus = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
      {active ? 'Activa' : 'Pausada'}
    </span>
  </div>
);

// ── Componente principal ──────────────────────
const Home = () => {
  const { user } = useAuth();
  const { plantState: s, socketStatus } = useSocket();
  const [recentClassifications, setRecentClassifications] = useState<ClassificationResult[]>([]);
  const [recentCommands, setRecentCommands] = useState<CommandLog[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    monitoringService.getClassifications({ limit: 5 })
      .then((r) => setRecentClassifications(r.data))
      .catch(() => {});
    monitoringService.getCommands(5)
      .then((r) => setRecentCommands(r.data))
      .catch(() => {});
  }, []);

  const hasAlerts = s.alerta_humo || s.alerta_rfid || s.alerta_parqueo_lleno || s.modo_emergencia;
  const activeLines = [s.banda_principal, s.banda_plastico, s.banda_vidrio, s.banda_metal].filter(Boolean).length;
  const avgAlmacen = Math.round((s.almacen_plastico + s.almacen_vidrio + s.almacen_metal) / 3);

  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm">{greeting},</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">{user?.name ?? 'Operador'}</h1>
            <p className="text-slate-600 text-xs mt-0.5 flex items-center gap-1">
              <Clock size={11} />
              {now.toLocaleString('es-GT')} · EcoSort Planta de Reciclaje
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              socketStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {socketStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {socketStatus === 'connected' ? 'Tiempo real activo' : 'Sin conexión en vivo'}
            </span>
          </div>
        </div>

        {/* Alertas activas */}
        {hasAlerts && (
          <div className="space-y-2">
            {s.modo_emergencia && (
              <AlertBanner
                icon={<ShieldAlert size={18} className="text-red-400" />}
                title="Modo emergencia activo"
                message="Todas las operaciones suspendidas. Verificar planta."
                color="bg-red-500/10 border-red-500/30 text-red-400"
              />
            )}
            {s.alerta_humo && (
              <AlertBanner
                icon={<Flame size={18} className="text-orange-400" />}
                title="Humo detectado"
                message={`Sensor activo · Umbral: ${s.umbral_humo} ppm`}
                color="bg-orange-500/10 border-orange-500/30 text-orange-400"
              />
            )}
            {s.alerta_rfid && (
              <AlertBanner
                icon={<AlertTriangle size={18} className="text-amber-400" />}
                title="Alerta RFID"
                message="Intento de acceso con credencial inválida detectado."
                color="bg-amber-500/10 border-amber-500/30 text-amber-400"
              />
            )}
            {s.alerta_parqueo_lleno && !s.modo_emergencia && (
              <AlertBanner
                icon={<Car size={18} className="text-blue-400" />}
                title="Parqueo lleno"
                message={`${s.parqueos_ocupados} / 2 espacios ocupados · Talanquera bloqueada.`}
                color="bg-blue-500/10 border-blue-500/30 text-blue-400"
              />
            )}
          </div>
        )}

        {!hasAlerts && (
          <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={14} /> Sistema operando con normalidad — sin alertas activas
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Líneas activas"
            value={`${activeLines} / 4`}
            sub="Bandas en operación"
            icon={<Activity size={20} className="text-emerald-400" />}
            color="bg-emerald-500/10"
          />
          <KpiCard
            label="Parqueos"
            value={`${s.parqueos_ocupados} / 2`}
            sub={s.alerta_parqueo_lleno ? 'Parqueo lleno' : 'Espacios disponibles'}
            icon={<Car size={20} className="text-blue-400" />}
            color="bg-blue-500/10"
            alert={s.alerta_parqueo_lleno}
          />
          <KpiCard
            label="Ocupación almacenes"
            value={`${avgAlmacen}%`}
            sub="Promedio de 3 almacenes"
            icon={<PackageOpen size={20} className={avgAlmacen >= 80 ? 'text-amber-400' : 'text-slate-400'} />}
            color={avgAlmacen >= 80 ? 'bg-amber-500/10' : 'bg-slate-800'}
            alert={avgAlmacen >= 90}
          />
          <KpiCard
            label="Alertas activas"
            value={[s.alerta_humo, s.alerta_rfid, s.alerta_parqueo_lleno, s.modo_emergencia].filter(Boolean).length}
            sub={hasAlerts ? 'Requiere atención' : 'Todo en orden'}
            icon={<AlertTriangle size={20} className={hasAlerts ? 'text-red-400' : 'text-slate-500'} />}
            color={hasAlerts ? 'bg-red-500/10' : 'bg-slate-800'}
            alert={hasAlerts}
          />
        </div>

        {/* Grid de estado + eventos recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Estado de líneas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Líneas de producción</h3>
              </div>
              <Link to="/monitoring" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Ver todo <ArrowRight size={12} />
              </Link>
            </div>
            <BandaStatus label="Banda principal" active={s.banda_principal} />
            <BandaStatus label="Línea Plástico"  active={s.banda_plastico} />
            <BandaStatus label="Línea Vidrio"    active={s.banda_vidrio} />
            <BandaStatus label="Línea Metal"     active={s.banda_metal} />

            {/* Almacenes */}
            <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3">
              {[
                { label: 'Almacén Plástico', v: s.almacen_plastico, color: 'bg-blue-500' },
                { label: 'Almacén Vidrio',   v: s.almacen_vidrio,   color: 'bg-cyan-500' },
                { label: 'Almacén Metal',    v: s.almacen_metal,    color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{item.label}</span>
                    <span className={item.v >= 90 ? 'text-red-400 font-bold' : 'text-slate-400'}>{item.v}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-700 ${item.v >= 90 ? 'animate-pulse' : ''}`} style={{ width: `${item.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clasificaciones recientes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Clasificaciones recientes</h3>
              </div>
              <Link to="/historical" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Ver todo <ArrowRight size={12} />
              </Link>
            </div>
            {recentClassifications.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">Sin clasificaciones recientes</p>
            ) : recentClassifications.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.linea === 'plastico' ? 'bg-blue-400' : c.linea === 'vidrio' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                  <span className="text-sm text-slate-300 capitalize">{c.linea}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.resultado === 'aprobado'
                    ? <CheckCircle2 size={13} className="text-emerald-400" />
                    : <AlertTriangle size={13} className="text-red-400" />}
                  <span className="text-xs text-slate-500">{fmt(c.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Comandos recientes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={15} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Comandos recientes</h3>
              </div>
              <Link to="/historical" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                Ver todo <ArrowRight size={12} />
              </Link>
            </div>
            {recentCommands.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">Sin comandos recientes</p>
            ) : recentCommands.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 capitalize font-medium truncate">{c.comando}</p>
                  <p className="text-xs text-slate-600 truncate">{c.userName}</p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{fmtDate(c.sentAt)}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/monitoring',    icon: <Activity size={18} />,     label: 'Monitoreo',    color: 'text-emerald-400' },
            { to: '/control-panel', icon: <LayoutDashboard size={18}/>, label: 'Control',    color: 'text-blue-400' },
            { to: '/historical',    icon: <Clock size={18} />,        label: 'Historial',    color: 'text-amber-400' },
            { to: '/graphs',        icon: <Zap size={18} />,          label: 'Estadísticas', color: 'text-purple-400' },
          ].map((item) => (
            <Link
              key={item.to} to={item.to}
              className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 rounded-xl px-4 py-3.5 transition-all group"
            >
              <span className={item.color}>{item.icon}</span>
              <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{item.label}</span>
              <ArrowRight size={14} className="ml-auto text-slate-700 group-hover:text-slate-500 transition-colors" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Home;
