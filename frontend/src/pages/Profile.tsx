import { useState, useEffect } from 'react';
import {
  User, Mail, Calendar, Lock, Eye, EyeOff,
  Loader2, AlertCircle, CheckCircle2, ShieldCheck,
  RefreshCw, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

// ── Helpers ───────────────────────────────────
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });

// ── Sub-componente: tarjeta de dato ───────────
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
    <div className="bg-slate-700/60 p-2.5 rounded-lg text-slate-400 flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <p className="text-white text-sm font-medium truncate">{value}</p>
    </div>
  </div>
);

// ── Sub-componente: input de contraseña ───────
const PasswordInput = ({
  label, name, value, show, onToggle, onChange, placeholder, autoComplete
}: {
  label: string; name: string; value: string; show: boolean;
  onToggle: () => void; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; autoComplete?: string;
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? '••••••••'}
        autoComplete={autoComplete}
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-11 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-slate-600 transition-colors"
      />
      <button type="button" onClick={onToggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);

// ── Componente principal ──────────────────────
const Profile = () => {
  const { user, refreshUser } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Carga inicial de datos frescos
  useEffect(() => {
    refreshUser();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setIsRefreshing(false);
  };

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (pwError) setPwError('');
    if (pwSuccess) setPwSuccess('');
  };

  const toggleShow = (field: 'current' | 'new' | 'confirm') =>
    setShow((s) => ({ ...s, [field]: !s[field] }));

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirm) {
      setPwError('Todos los campos son requeridos.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (pwForm.currentPassword === pwForm.newPassword) {
      setPwError('La nueva contraseña no puede ser igual a la actual.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwSuccess('');
    try {
      await authService.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('Contraseña actualizada correctamente.');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Error al cambiar la contraseña.');
    } finally {
      setPwLoading(false);
    }
  };

  // Initiales del avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Perfil</h1>
            <p className="text-slate-500 text-sm mt-0.5">Administra tu información personal</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* ── Tarjeta de perfil ───────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.15)_1px,transparent_1px)] bg-[size:32px_32px]" />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end gap-4 -mt-10 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-blue-600 border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-2xl tracking-tight">{initials}</span>
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {user?.name ?? '—'}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Cuenta verificada</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<User size={16} />} label="Nombre" value={user?.name ?? '—'} />
              <InfoRow icon={<Mail size={16} />} label="Correo electrónico" value={user?.email ?? '—'} />
              <InfoRow
                icon={<Calendar size={16} />}
                label="Miembro desde"
                value={user?.createdAt ? formatDate(user.createdAt) : '—'}
              />
              <InfoRow
                icon={<Calendar size={16} />}
                label="Última actualización"
                value={user?.updatedAt ? formatDate(user.updatedAt) : '—'}
              />
            </div>
          </div>
        </div>

        {/* ── Cambiar contraseña ─────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-50 p-2.5 rounded-xl">
              <KeyRound size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Cambiar contraseña</h3>
              <p className="text-xs text-slate-500 mt-0.5">Actualiza tu contraseña de acceso</p>
            </div>
          </div>

          {/* Feedback */}
          {pwError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <PasswordInput
              label="Contraseña actual"
              name="currentPassword"
              value={pwForm.currentPassword}
              show={show.current}
              onToggle={() => toggleShow('current')}
              onChange={handlePwChange}
              autoComplete="current-password"
            />
            <PasswordInput
              label="Nueva contraseña"
              name="newPassword"
              value={pwForm.newPassword}
              show={show.new}
              onToggle={() => toggleShow('new')}
              onChange={handlePwChange}
              autoComplete="new-password"
            />
            <PasswordInput
              label="Confirmar nueva contraseña"
              name="confirm"
              value={pwForm.confirm}
              show={show.confirm}
              onToggle={() => toggleShow('confirm')}
              onChange={handlePwChange}
              autoComplete="new-password"
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl px-8 py-2.5 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-900/20"
              >
                {pwLoading ? (
                  <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                ) : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
