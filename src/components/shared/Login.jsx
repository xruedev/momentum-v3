import { useState } from 'react';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { Loader2, UserCircle, Target } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (err) {
      console.error('Error en login con Google:', err);
      let errorMessage = err.message;
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'La ventana de inicio de sesión fue cerrada. Intenta de nuevo.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.';
      } else if (err.code === 'auth/configuration-not-found') {
        errorMessage = 'La autenticación con Google no está habilitada en Firebase. Ve a Firebase Console > Authentication > Sign-in method y habilita "Google".';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = 'Este dominio no está autorizado. El administrador debe agregar este dominio en Firebase Console > Authentication > Settings > Authorized domains.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      onLoginSuccess(result.user);
    } catch (err) {
      console.error('Error en login anónimo:', err);
      let errorMessage = err.message;
      
      if (err.code === 'auth/configuration-not-found' || err.message.includes('configuration-not-found')) {
        errorMessage = 'La autenticación anónima no está habilitada en Firebase. Ve a Firebase Console > Authentication > Sign-in method y habilita "Anonymous".';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de red. Verifica tu conexión a internet.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <Target className="w-8 h-8 text-indigo-600" />
            FocusMind
          </h1>
          <p className="text-gray-600">Elige cómo quieres iniciar sesión</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o</span>
            </div>
          </div>

          <button
            onClick={handleAnonymousSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserCircle className="w-5 h-5" />
                Continuar como invitado
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Al continuar, aceptas nuestros términos de servicio y política de privacidad
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Nota: Si continúas como invitado, tus datos solo estarán disponibles en este navegador
        </p>
      </div>
    </div>
  );
}

