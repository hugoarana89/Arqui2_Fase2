import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getUser } from "../utils/authStorage";
import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CubeIcon,
  UserCircleIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline"; // ahora es Lucide React

const NavBar = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHoverEnabled, setIsHoverEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsExpanded(false);
        setIsHoverEnabled(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    setIsHoverEnabled(!isHoverEnabled);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoggingOut(true);
    
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      localStorage.clear();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Clases base para los enlaces
  const linkClass = "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group";
  const activeClass = "bg-blue-600 text-white shadow-md";
  const inactiveClass = "text-slate-300 hover:bg-slate-800 hover:text-white";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Overlay para móvil */}
      {isExpanded && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Botón toggle para móvil/desktop */}
      <button
        onClick={handleToggle}
        className={`fixed top-4 z-50 p-2 rounded-lg bg-slate-900 text-white shadow-lg transition-all duration-300 hover:bg-slate-800 ${
          isExpanded 
            ? isMobile 
              ? "left-64" 
              : "left-56"
            : "left-4"
        } md:left-4`}
      >
        {isExpanded ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white z-40 transition-all duration-500 ease-in-out shadow-xl ${
          isExpanded 
            ? "w-64 md:w-56" 
            : "w-20"
        } ${
          isMobile && !isExpanded ? "-translate-x-full" : ""
        }`}
        onMouseEnter={() => {
          if (isHoverEnabled && !isMobile) setIsExpanded(true);
        }}
        onMouseLeave={() => {
          if (isHoverEnabled && !isMobile) setIsExpanded(false);
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo y título */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <CubeIcon className="w-6 h-6" />
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"}`}>
                <h1 className="text-xl font-bold whitespace-nowrap">Food Delivery</h1>
                {user && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                    <UserCircleIcon className="w-4 h-4" />
                    <span>{user.role?.toLowerCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {/* CLIENTE */}
              {user?.role === "CLIENTE" && (
                <>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Catálogo"
                  >
                    <HomeIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Catálogo
                    </span>
                  </NavLink>

                  <NavLink
                    to="/client/orders"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Mis Órdenes"
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Mis Órdenes
                    </span>
                  </NavLink>
                </>
              )}

              {/* ADMIN */}
              {user?.role === "ADMINISTRADOR" && (
                <>
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Usuarios"
                  >
                    <UsersIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Usuarios
                    </span>
                  </NavLink>

                  <NavLink
                    to="/admin/restaurants"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Restaurantes"
                  >
                    <BuildingStorefrontIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Restaurantes
                    </span>
                  </NavLink>

                  <NavLink
                    to="/admin/menus"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Menús"
                  >
                    <BookOpenIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Menús
                    </span>
                  </NavLink>
                </>
              )}

              {/* RESTAURANTE */}
              {user?.role === "RESTAURANTE" && (
                <>
                  <NavLink
                    to="/restaurant/orders"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Órdenes"
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Órdenes
                    </span>
                  </NavLink>

                  <NavLink
                    to="/restaurant/menu"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Menú"
                  >
                    <BuildingStorefrontIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Menú
                    </span>
                  </NavLink>
                </>
              )}

              {/* DELIVERY */}
              {user?.role === "REPARTIDOR" && (
                <>
                  <NavLink
                    to="/delivery/available"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Pedidos Disponibles"
                  >
                    <TruckIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Pedidos Disponibles
                    </span>
                  </NavLink>

                  <NavLink
                    to="/delivery/active"
                    className={({ isActive }) =>
                      `${linkClass} ${isActive ? activeClass : inactiveClass}`
                    }
                    title="Pedido Activo"
                  >
                    <TruckIcon className="w-5 h-5 flex-shrink-0" />
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
                    }`}>
                      Pedido Activo
                    </span>
                  </NavLink>
                </>
              )}
            </div>
          </nav>

          {/* Botón de Logout */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`${linkClass} w-full text-red-300 hover:bg-red-500/20 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Cerrar sesión"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
              <span className={`transition-all duration-300 whitespace-nowrap ${
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute"
              }`}>
                {isLoggingOut ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
                    Cerrando...
                  </span>
                ) : (
                  "Cerrar sesión"
                )}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main
        className={`flex-1 min-h-screen transition-all duration-500 ease-in-out p-6 ${
          isExpanded ? "md:ml-56 ml-0" : "md:ml-20 ml-0"
        } ${isMobile && isExpanded ? "opacity-50" : ""}`}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default NavBar;