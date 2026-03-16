import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Zap, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/auth.service';

const Recovery = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Ingresa tu correo electrónico.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await authService.forgotPassword({ email });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo.');
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
          <p className="text-slate-500 text-sm mt-1">Recuperar contraseña</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="bg-emerald-500/10 p-4 rounded-full">
                  <CheckCircle2 size={36} className="text-emerald-400" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Correo enviado</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Si el correo está registrado, recibirás las instrucciones para recuperar tu contraseña.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-6 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">¿Olvidaste tu contraseña?</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                      placeholder="correo@ejemplo.com"
                      autoComplete="email"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-slate-600 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  ) : 'Enviar instrucciones'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Recovery;
