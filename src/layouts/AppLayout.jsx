import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, firebaseError } from '../firebase';
import { ArrowLeft, LogOut, UserCircle } from 'lucide-react';
import Login from '../components/shared/Login';
import { Loader2, X } from 'lucide-react';

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const isDashboard = location.pathname === '/';

  useEffect(() => {
    // Si Firebase no está inicializado, no intentar autenticación
    if (!auth || firebaseError) {
      setError("Firebase no está configurado correctamente. Verifica tu archivo .env");
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    // Observar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!mounted) return;
      
      setUser(u);
      setAuthLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error en onAuthStateChanged:', error);
      if (mounted) {
        setError(`Error de autenticación: ${error.message}`);
        setAuthLoading(false);
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setUser(user);
    setAuthLoading(false);
    setError(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setError('Error al cerrar sesión');
    }
  };

  // Mostrar Login si no hay usuario y no está cargando autenticación
  if (!user && !authLoading && !firebaseError) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Mostrar loader solo durante la autenticación inicial
  if (authLoading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-indigo-600 font-medium">Conectando...</p>
          <p className="text-gray-500 text-sm mt-2">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si hay un error de Firebase al inicializar, mostrarlo inmediatamente
  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error de Configuración de Firebase</h2>
            <p className="text-gray-600 mb-4">{firebaseError.message}</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
              <p className="font-semibold mb-2">Pasos para solucionar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Verifica que el archivo .env existe en la raíz del proyecto</li>
                <li>Abre la consola del navegador (F12) y revisa los errores</li>
                <li>Asegúrate de que todas las variables tienen valores (no vacíos)</li>
                <li>Reinicia el servidor de desarrollo después de crear/modificar .env</li>
                <li>Verifica que no hay espacios extra alrededor del signo =</li>
                {error && error.includes('autenticación anónima') && (
                  <li className="text-yellow-700 font-semibold mt-2">
                    ⚠️ IMPORTANTE: Ve a Firebase Console → Authentication → Sign-in method → 
                    Habilita &quot;Anonymous&quot; y guarda los cambios
                  </li>
                )}
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error de Conexión</h2>
            <p className="text-gray-600 mb-4">{error}</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
              <p className="font-semibold mb-2">Posibles soluciones:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verifica que el archivo .env existe en la raíz del proyecto</li>
                <li>Revisa la consola del navegador (F12) para más detalles</li>
                <li>Asegúrate de que todas las variables tienen valores (no vacíos)</li>
                <li>Reinicia el servidor de desarrollo después de crear/modificar .env</li>
                <li>Verifica tu conexión a internet</li>
                {error && error.includes('autenticación anónima') && (
                  <li className="text-yellow-700 font-semibold mt-2">
                    ⚠️ IMPORTANTE: Ve a Firebase Console → Authentication → Sign-in method → 
                    Habilita &quot;Anonymous&quot; y guarda los cambios
                  </li>
                )}
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isDashboard && (
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Volver al Dashboard</span>
                </button>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || user.email || 'Usuario'} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <UserCircle className="w-8 h-8 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {user.displayName || user.email || 'Usuario'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-md transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

