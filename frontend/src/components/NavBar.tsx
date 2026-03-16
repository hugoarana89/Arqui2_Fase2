import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home, LayoutDashboard, BarChart3, History,
  Activity, User, LogOut, Menu, X, Zap, Loader2
} from "lucide-react";

const NavBar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHoverEnabled, setIsHoverEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) { setIsExpanded(false); setIsHoverEnabled(false); }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    setIsHoverEnabled(!isHoverEnabled);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const linkClass = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group";
  const activeClass = "bg-blue-600 text-white shadow-lg shadow-blue-900/20";
  const inactiveClass = "text-slate-400 hover:bg-slate-800 hover:text-white";

  const navItems = [
    { to: "/",              icon: <Home size={22} />,          label: "Inicio" },
    { to: "/monitoring",    icon: <Activity size={22} />,      label: "Monitoreo Real" },
    { to: "/control-panel", icon: <LayoutDashboard size={22}/>, label: "Panel de Control" },
    { to: "/graphs",        icon: <BarChart3 size={22} />,     label: "Estadísticas" },
    { to: "/historical",    icon: <History size={22} />,       label: "Historial" },
    { to: "/profile",       icon: <User size={22} />,          label: "Perfil" },
  ];

  // Iniciales del avatar
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Overlay Móvil */}
      {isExpanded && isMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Botón Toggle */}
      <button
        onClick={handleToggle}
        className={`fixed top-4 z-50 p-2.5 rounded-xl bg-slate-900 text-white shadow-xl transition-all duration-300 md:left-4 ${
          isExpanded ? (isMobile ? "left-60" : "left-52") : "left-4"
        }`}
      >
        {isExpanded ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-slate-950 text-white z-40 transition-all duration-500 ease-in-out border-r border-slate-800/50 ${
          isExpanded ? "w-64 md:w-56" : "w-20"
        } ${isMobile && !isExpanded ? "-translate-x-full" : "translate-x-0"}`}
        onMouseEnter={() => isHoverEnabled && !isMobile && setIsExpanded(true)}
        onMouseLeave={() => isHoverEnabled && !isMobile && setIsExpanded(false)}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-20 flex items-center px-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 bg-blue-600 p-2 rounded-lg shadow-inner">
                <Zap size={24} className="text-white fill-current" />
              </div>
              <div className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0"}`}>
                <h1 className="font-bold text-lg leading-tight tracking-tight">EcoSort</h1>
                <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">Planta Reciclaje</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `${linkClass} ${isActive ? activeClass : inactiveClass}`}
                title={!isExpanded ? item.label : ""}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className={`whitespace-nowrap font-medium transition-all duration-300 ${
                  isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                }`}>
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Footer: usuario + logout */}
          <div className="p-3 border-t border-slate-800/50 space-y-1">
            {/* Info de usuario */}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `${linkClass} ${isActive ? activeClass : inactiveClass}`
              }
              title={!isExpanded ? (user?.name ?? "Perfil") : ""}
            >
              <span className="flex-shrink-0 w-[22px] h-[22px] flex items-center justify-center bg-blue-600 rounded-md text-white text-xs font-bold">
                {initials}
              </span>
              <span className={`whitespace-nowrap font-medium text-sm transition-all duration-300 ${
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
              }`}>
                {user?.name ?? "Mi perfil"}
              </span>
            </NavLink>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`${linkClass} w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50`}
            >
              <span className="flex-shrink-0">
                {isLoggingOut ? <Loader2 size={22} className="animate-spin" /> : <LogOut size={22} />}
              </span>
              <span className={`font-medium transition-all duration-300 ${
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
              }`}>
                {isLoggingOut ? "Saliendo..." : "Cerrar Sesión"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className={`flex-1 transition-all duration-500 ease-in-out ${
        isExpanded ? "md:ml-56 ml-0" : "md:ml-20 ml-0"
      }`}>
        <div className={`p-6 min-h-screen ${isMobile && isExpanded ? "blur-sm" : ""}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default NavBar;
