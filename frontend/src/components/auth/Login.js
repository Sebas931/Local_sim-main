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
    <div className="flex items-center justify-center min-h-screen bg-white">
      <form onSubmit={handleSubmit} className="bg-localsim-teal-500 p-8 rounded-lg shadow-xl w-96">
        <div className="text-center mb-6">
          <div className="bg-white rounded-lg p-3 inline-block mb-4">
            <img
              src="/logo-local-sim.jpeg"
              alt="Local SIM Colombia"
              className="h-16 object-contain"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
          <h2 className="text-2xl font-bold text-white">Local SIM Colombia</h2>
          <p className="text-white/90 mt-2">Iniciar Sesión</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border-2 border-white/30 bg-white rounded-lg focus:ring-2 focus:ring-white focus:border-white outline-none transition-all"
            placeholder="Ingresa tu usuario"
            required
            disabled={isLoading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-white font-medium mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border-2 border-white/30 bg-white rounded-lg focus:ring-2 focus:ring-white focus:border-white outline-none transition-all"
            placeholder="Ingresa tu contraseña"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-white text-localsim-teal-600 hover:bg-white/90'
          } shadow-md hover:shadow-lg`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-localsim-teal-500 mr-2"></div>
              Iniciando sesión...
            </div>
          ) : (
            'Entrar'
          )}
        </button>

        <div className="mt-6 text-center text-sm text-white/90">
          <p>¿Problemas para ingresar?</p>
          <p>Contacta al administrador del sistema</p>
        </div>
      </form>
    </div>
  );
}