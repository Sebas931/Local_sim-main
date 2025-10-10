import React, { useState } from 'react';
import { BarChart3, ShoppingCart, Package, Phone, User, Clock, Menu, ChevronLeft, LogOut, Play, Square, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { turnosService } from '../../services/turnosService';

const Layout = ({ children, activeTab, onTabChange }) => {
  const { user, logout, hasModule } = useAuth();
  const { turnoAbierto, setTurnoAbierto, showNotification } = useApp();
  // Sidebar collapsed by default on mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    typeof window !== 'undefined' && window.innerWidth < 1024
  );
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loadingTurno, setLoadingTurno] = useState(false);

  const navItems = [
    { module: 'Dashboard', value: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { module: 'Punto de venta', value: 'pos', name: 'Punto de Venta', icon: ShoppingCart },
    { module: 'Sims', value: 'sims', name: 'SIMs', icon: Package },
    { module: 'Recargas', value: 'products', name: 'Recargas', icon: Phone },
    { module: 'Devoluciones', value: 'devoluciones', name: 'Devoluciones', icon: ArrowRightLeft },
    { module: 'Usuarios', value: 'users', name: 'Usuarios', icon: User},
    { module: 'Turnos', value: 'turnos', name: 'Turnos', icon: Clock },
    { module: 'Inventarios Sims', value: 'inventarios', name: 'Inventarios SIMs', icon: AlertTriangle },
  ];

  const visibleNavItems = navItems.filter(item => hasModule(item.module));

  const handleAbrirTurno = () => {
    setShowUserMenu(false);
    onTabChange('turnos'); // Redirige a la pestaña de turnos para usar el modal
  };

  const handleCerrarTurno = () => {
    setShowUserMenu(false);
    onTabChange('turnos'); // Redirige a la pestaña de turnos para hacer el cierre
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header - Responsive */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
          {/* Left side */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="lg:hidden p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
              Local SIM Colombia
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {user?.full_name || user?.username}
              </Button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      {user?.email}
                    </div>

                    {/* Turno Status and Actions */}
                    <div className="px-4 py-2 text-xs text-gray-500 border-b bg-gray-50">
                      {turnoAbierto ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Turno Activo: {turnoAbierto.id?.slice(-8)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          Sin turno activo
                        </div>
                      )}
                    </div>

                    {/* Turno Actions */}
                    {turnoAbierto ? (
                      <button
                        onClick={handleCerrarTurno}
                        disabled={loadingTurno}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                      >
                        <Square className="h-4 w-4" />
                        Cerrar Turno
                      </button>
                    ) : (
                      <button
                        onClick={handleAbrirTurno}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                      >
                        <Play className="h-4 w-4" />
                        Abrir Turno
                      </button>
                    )}

                    <div className="border-t">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        {!isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar - Responsive */}
        <aside
          className={`bg-white shadow-sm border-r transition-all duration-300
            ${isSidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'}
            fixed lg:sticky top-[57px] sm:top-[65px] h-[calc(100vh-57px)] sm:h-[calc(100vh-65px)] z-40 lg:z-auto
            lg:transition-[width] overflow-y-auto`}
        >
          {/* Sidebar Toggle Button - Desktop only */}
          <div className="hidden lg:block absolute -right-3 top-4 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="rounded-full bg-white shadow-md h-6 w-6 p-0"
            >
              <ChevronLeft
                className={`h-3 w-3 transition-transform ${
                  isSidebarCollapsed ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </div>

          <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;

              return (
                <button
                  key={item.value}
                  onClick={() => {
                    onTabChange(item.value);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setIsSidebarCollapsed(true);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2 rounded-lg text-left transition-colors touch-manipulation ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <Icon className="h-5 w-5 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="font-medium text-sm sm:text-base">{item.name}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - Responsive padding */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 w-full lg:ml-0">
          {children}
        </main>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default Layout;