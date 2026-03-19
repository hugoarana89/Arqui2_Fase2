import { useState } from 'react';
import {
  Play, Pause, DoorOpen, DoorClosed, Car,
  Lightbulb, LightbulbOff, ShieldAlert, ShieldCheck,
  Loader2, CheckCircle2, AlertCircle, Activity
} from 'lucide-react';
import { controlService } from '../services/plant.service';
import { useSocket } from '../hooks/useSocket';

// ── Feedback toast ─────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' }

// ── Botón de acción ────────────────────────────
const ActionBtn = ({
  label, icon, onClick, loading, variant = 'default', disabled = false
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
}) => {
  const colors = {
    default: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200',
    danger:  'bg-red-600/20 hover:bg-red-600/30 border-red-500/40 text-red-300',
    success: 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300',
    warning: 'bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/40 text-amber-300',
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${colors}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {label}
    </button>
  );
};

// ── Tarjeta de control ─────────────────────────
const ControlCard = ({ title, icon, children, emergency = false }:
  { title: string; icon: React.ReactNode; children: React.ReactNode; emergency?: boolean }) => (
  <div className={`bg-slate-900 rounded-2xl border p-5 ${emergency ? 'border-red-500/40' : 'border-slate-800'}`}>
    <div className="flex items-center gap-2 mb-4">
      <span className={emergency ? 'text-red-400' : 'text-blue-400'}>{icon}</span>
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

// ── Componente principal ──────────────────────
const Control = () => {
  const { plantState: s } = useSocket();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const run = async (key: string, fn: () => Promise<{ message: string }>) => {
    setLoadingKey(key);
    try {
      const res = await fn();
      addToast(res.message, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Error al enviar comando.', 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  const L = (key: string) => loadingKey === key;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl pointer-events-auto transition-all ${
            t.type === 'success'
              ? 'bg-emerald-900/80 border-emerald-500/40 text-emerald-300 backdrop-blur-sm'
              : 'bg-red-900/80 border-red-500/40 text-red-300 backdrop-blur-sm'
          }`}>
            {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {t.message}
          </div>
        ))}
      </div>

      <div className="relative max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Panel de Control Remoto</h1>
          <p className="text-slate-500 text-sm mt-0.5">Los comandos se envían al backend y luego a la Raspberry Pi vía MQTT</p>
        </div>

        {/* Emergencia — primera y más visible */}
        <ControlCard title="Control de emergencia" icon={<ShieldAlert size={16} />} emergency>
          <p className="text-slate-500 text-xs mb-4 leading-relaxed">
            Activar la emergencia detiene todas las bandas, activa la alarma general y abre la puerta principal automáticamente.
          </p>
          <div className="flex flex-wrap gap-3">
            <ActionBtn
              label="Activar emergencia"
              icon={<ShieldAlert size={15} />}
              variant="danger"
              loading={L('emergencia-activar')}
              disabled={s.modo_emergencia}
              onClick={() => run('emergencia-activar', () =>
                controlService.emergencia({ comando: 'activar', motivo: 'manual_override' })
              )}
            />
            <ActionBtn
              label="Desactivar emergencia"
              icon={<ShieldCheck size={15} />}
              variant="success"
              loading={L('emergencia-desactivar')}
              disabled={!s.modo_emergencia}
              onClick={() => run('emergencia-desactivar', () =>
                controlService.emergencia({ comando: 'desactivar' })
              )}
            />
          </div>
          {s.modo_emergencia && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">
              <ShieldAlert size={13} /> Modo emergencia activo
            </div>
          )}
        </ControlCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Líneas de producción */}
          <ControlCard title="Líneas de producción" icon={<Activity size={16} />}>
            <div className="space-y-3">
              {(['principal', 'plastico', 'vidrio', 'metal'] as const).map((linea) => {
                const isActive = linea === 'principal' ? s.banda_principal
                  : linea === 'plastico' ? s.banda_plastico
                  : linea === 'vidrio' ? s.banda_vidrio
                  : s.banda_metal;

                const labelMap = { principal: 'Principal', plastico: 'Plástico', vidrio: 'Vidrio', metal: 'Metal' };

                return (
                  <div key={linea} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-sm text-slate-300 font-medium">Línea {labelMap[linea]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                        {isActive ? 'Activa' : 'Pausada'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <ActionBtn
                        label="Pausar"
                        icon={<Pause size={13} />}
                        variant="warning"
                        loading={L(`linea-pausar-${linea}`)}
                        disabled={!isActive}
                        onClick={() => run(`linea-pausar-${linea}`, () =>
                          controlService.linea({ comando: 'pausar', linea })
                        )}
                      />
                      <ActionBtn
                        label="Reanudar"
                        icon={<Play size={13} />}
                        variant="success"
                        loading={L(`linea-reanudar-${linea}`)}
                        disabled={isActive}
                        onClick={() => run(`linea-reanudar-${linea}`, () =>
                          controlService.linea({ comando: 'reanudar', linea })
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ControlCard>

          <div className="space-y-5">
            {/* Acceso peatonal */}
            <ControlCard title="Puerta principal" icon={s.puerta_abierta ? <DoorOpen size={16} /> : <DoorClosed size={16} />}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Estado actual</span>
                <span className={`text-sm font-semibold ${s.puerta_abierta ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {s.puerta_abierta ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
              <div className="flex gap-2">
                <ActionBtn
                  label="Abrir puerta"
                  icon={<DoorOpen size={15} />}
                  variant="success"
                  loading={L('puerta-abrir')}
                  disabled={s.puerta_abierta}
                  onClick={() => run('puerta-abrir', () =>
                    controlService.acceso({ comando: 'abrir', elemento: 'puerta_principal' })
                  )}
                />
                <ActionBtn
                  label="Cerrar puerta"
                  icon={<DoorClosed size={15} />}
                  loading={L('puerta-cerrar')}
                  disabled={!s.puerta_abierta}
                  onClick={() => run('puerta-cerrar', () =>
                    controlService.acceso({ comando: 'cerrar', elemento: 'puerta_principal' })
                  )}
                />
              </div>
            </ControlCard>

            {/* Talanquera */}
            <ControlCard title="Talanquera vehicular" icon={<Car size={16} />}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Estado actual</span>
                <span className={`text-sm font-semibold ${s.talanquera_abierta ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {s.talanquera_abierta ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
              <div className="flex gap-2">
                <ActionBtn
                  label="Abrir"
                  icon={<DoorOpen size={15} />}
                  variant="success"
                  loading={L('talanquera-abrir')}
                  disabled={s.talanquera_abierta}
                  onClick={() => run('talanquera-abrir', () =>
                    controlService.acceso({ comando: 'abrir', elemento: 'talanquera' })
                  )}
                />
                <ActionBtn
                  label="Cerrar"
                  icon={<DoorClosed size={15} />}
                  loading={L('talanquera-cerrar')}
                  disabled={!s.talanquera_abierta}
                  onClick={() => run('talanquera-cerrar', () =>
                    controlService.acceso({ comando: 'cerrar', elemento: 'talanquera' })
                  )}
                />
              </div>
            </ControlCard>

            {/* Iluminación */}
            <ControlCard title="Iluminación" icon={s.iluminacion ? <Lightbulb size={16} /> : <LightbulbOff size={16} />}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Estado actual</span>
                <span className={`text-sm font-semibold ${s.iluminacion ? 'text-amber-400' : 'text-slate-400'}`}>
                  {s.iluminacion ? 'Encendida' : 'Apagada'}
                </span>
              </div>
              <div className="flex gap-2">
                <ActionBtn
                  label="Encender"
                  icon={<Lightbulb size={15} />}
                  variant="warning"
                  loading={L('luz-encender')}
                  disabled={s.iluminacion}
                  onClick={() => run('luz-encender', () =>
                    controlService.iluminacion({ comando: 'encender' })
                  )}
                />
                <ActionBtn
                  label="Apagar"
                  icon={<LightbulbOff size={15} />}
                  loading={L('luz-apagar')}
                  disabled={!s.iluminacion}
                  onClick={() => run('luz-apagar', () =>
                    controlService.iluminacion({ comando: 'apagar' })
                  )}
                />
              </div>
            </ControlCard>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Control;
