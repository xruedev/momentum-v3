import { Target, LogOut, UserCircle } from 'lucide-react';

export default function AppHeader({ user, onLogout }) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Target className="w-10 h-10 text-indigo-600" />
            FocusMind
          </h1>
          <p className="text-gray-600">Rastreador de Hábitos</p>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-md">
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
              onClick={onLogout}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-md transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Salir</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

