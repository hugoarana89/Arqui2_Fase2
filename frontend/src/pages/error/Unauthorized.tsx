import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icono e Ilustración Visual */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <ShieldAlert size={64} className="text-red-500" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Texto de Error */}
        <span className="inline-block px-3 py-1 text-sm font-semibold text-red-600 bg-red-50 rounded-full mb-4">
          Error 403
        </span>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
          Acceso Restringido
        </h1>
        
        <p className="text-slate-600 mb-10 leading-relaxed">
          Lo sentimos, no tienes los permisos necesarios para ver esta sección. 
          Si crees que esto es un error, contacta al administrador del sistema.
        </p>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            <Home size={18} />
            Volver al Inicio
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            <ArrowLeft size={18} />
            Regresar a la página anterior
          </button>
        </div>

        {/* Footer opcional */}
        <p className="mt-12 text-sm text-slate-400">
          Identificado como: <span className="font-medium text-slate-500 italic">Usuario Estándar</span>
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;