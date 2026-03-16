import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Zap, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/auth.service';

const Reset = () => {
  const { token: paramToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Acepta token desde /reset-password/:token o ?token=...
  const token = paramToken ?? searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Token inválido o faltante. Solicita un nuevo enlace.');
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.newPassword || !form.confirm) { setError('Todos los campos son requeridos.'); return; }
    if (form.newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (form.newPassword !== form.confirm) { setError('Las contraseñas no coinciden.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await authService.resetPassword({ token, newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/40 mb-4">
            <Zap size={28} className="text-white fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EcoSort</h1>
          <p className="text-slate-500 text-sm mt-1">Nueva contraseña</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="bg-emerald-500/10 p-4 rounded-full">
                  <CheckCircle2 size={36} className="text-emerald-400" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">¡Contraseña restablecida!</h2>
              <p className="text-slate-400 text-sm">
                Serás redirigido al inicio de sesión en unos segundos...
              </p>
              <Link to="/login" className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                Ir ahora
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Restablecer contraseña</h2>
              <p className="text-slate-500 text-sm mb-6">Ingresa tu nueva contraseña.</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      name="newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-11 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-slate-600 transition-colors"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      name="confirm"
                      value={form.confirm}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full bg-slate-800 border text-white text-sm rounded-xl pl-10 pr-11 py-3 focus:outline-none focus:ring-1 placeholder-slate-600 transition-colors ${
                        form.confirm && form.newPassword !== form.confirm
                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/50'
                          : form.confirm && form.newPassword === form.confirm
                          ? 'border-emerald-500/60'
                          : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/50'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                  ) : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reset;
