import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import { Alert, AlertDescription } from './components/ui/alert';
import { useApp } from './context/AppContext';
import './App.css';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const SalesPointOfSale = React.lazy(() => import('./components/sales/SalesPointOfSale'));
const SimsManagement = React.lazy(() => import('./components/sims/SimsManagement'));
const ProductsManagement = React.lazy(() => import('./components/products/ProductsManagement'));
const Devoluciones = React.lazy(() => import('./components/devoluciones/Devoluciones'));
const TurnosManagement = React.lazy(() => import('./components/turnos/TurnosManagement'));
const InventarioDescuadresView = React.lazy(() => import('./components/turnos/InventarioDescuadresView'));
const UsersManagement = React.lazy(() => import('./components/users/UsersManagement'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-500">Cargando...</p>
    </div>
  </div>
);

// Notification component
const NotificationDisplay = () => {
  const { notification } = useApp();

  if (!notification?.message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className={`${
        notification.type === 'error' ? 'border-red-500 bg-red-50' :
        notification.type === 'success' ? 'border-green-500 bg-green-50' :
        'border-blue-500 bg-blue-50'
      }`}>
        <AlertDescription className={`${
          notification.type === 'error' ? 'text-red-700' :
          notification.type === 'success' ? 'text-green-700' :
          'text-blue-700'
        }`}>
          {notification.message}
        </AlertDescription>
      </Alert>
    </div>
  );
};

// Main App Content
const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Login />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <SalesPointOfSale />;
      case 'sims':
        return <SimsManagement />;
      case 'products':
        return <ProductsManagement />;
      case 'devoluciones':
        return <Devoluciones />;
      case 'users':
        return <UsersManagement />;
      case 'turnos':
        return <TurnosManagement />;
      case 'inventarios':
        return <InventarioDescuadresView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <Suspense fallback={<LoadingSpinner />}>
        {renderActiveTab()}
      </Suspense>
    </Layout>
  );
};

// Root App Component
function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="App">
          <AppContent />
          <NotificationDisplay />
        </div>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;