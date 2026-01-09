import { Target, ChevronLeft, ChevronRight, LogOut, UserCircle } from 'lucide-react';

export default function AppHeader({ selectedDate, today, onDateChange, onPreviousDay, onNextDay, onTodayClick, formatDate, user, onLogout }) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between mb-4">
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
      
      {/* Selector de Fecha */}
      <div className="flex items-center gap-4 bg-white rounded-lg p-3 shadow-md">
        <button
          onClick={onPreviousDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Día anterior"
          aria-label="Día anterior"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            max={today}
            className="text-lg font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
          />
          <p className="text-sm text-gray-500 mt-1">{formatDate(selectedDate)}</p>
          <p className="text-xs font-medium text-indigo-600 mt-0.5">
            {(() => {
              const date = new Date(selectedDate);
              const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              return dayNames[date.getDay()];
            })()}
          </p>
        </div>
        <button
          onClick={onNextDay}
          disabled={selectedDate >= today}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Día siguiente"
          aria-label="Día siguiente"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        {selectedDate !== today && (
          <button
            onClick={onTodayClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Hoy
          </button>
        )}
      </div>
    </header>
  );
}

