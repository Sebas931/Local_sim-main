import React, { useState } from "react";
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function Login() {
  const { login } = useAuth();
  const { showNotification } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        showNotification('Login exitoso', 'success');
      } else {
        setError(result.error || 'Usuario o contraseña incorrectos');
        showNotification(result.error || 'Error de login', 'error');
      }
    } catch (err) {
      const errorMsg = 'Usuario o contraseña incorrectos';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Local SIM Colombia</h2>
          <p className="text-gray-600 mt-2">Iniciar Sesión</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingresa tu usuario"
            required
            disabled={isLoading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingresa tu contraseña"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Iniciando sesión...
            </div>
          ) : (
            'Entrar'
          )}
        </button>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>¿Problemas para ingresar?</p>
          <p>Contacta al administrador del sistema</p>
        </div>
      </form>
    </div>
  );
}