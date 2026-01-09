import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HabitsCalendar({ habits, selectedDate, today, onDateSelect, onPreviousDay, onNextDay, onTodayClick, formatDate }) {
  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No hay hábitos para mostrar en el calendario</p>
      </div>
    );
  }

  const days = [];
  const todayDate = new Date();
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - 29); // Últimos 30 días
  
  // Ajustar al inicio de la semana
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  for (let i = 0; i < 35; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    const isToday = dateString === today;
    const isFuture = dateString > today;
    
    // Obtener el día de la semana
    const dayOfWeek = currentDate.getDay();
    
    // Filtrar hábitos que aplican a este día de la semana
    const habitsForDay = habits.filter(habit => {
      if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
        return true; // Compatibilidad con hábitos antiguos
      }
      return habit.daysOfWeek.includes(dayOfWeek);
    });
    
    // Contar hábitos completados para este día
    const completedCount = habitsForDay.filter(habit => {
      const val = habit.history?.[dateString];
      return habit.type === 'boolean' 
        ? val === true 
        : Number(val) >= habit.goal;
    }).length;
    
    const totalHabits = habitsForDay.length;
    const completionRate = totalHabits > 0 ? completedCount / totalHabits : 0;
    
    days.push(
      <div
        key={dateString}
        onClick={() => !isFuture && onDateSelect(dateString)}
        className={`
          aspect-square p-2 rounded-lg border-2 cursor-pointer transition-all
          ${isFuture 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' 
            : isToday
              ? 'border-indigo-500 bg-indigo-50 hover:bg-indigo-100'
              : selectedDate === dateString
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-indigo-200'
          }
        `}
      >
        <div className="text-xs font-medium text-gray-600 mb-1">
          {currentDate.getDate()}
        </div>
        {!isFuture && totalHabits > 0 && (
          <div className="flex flex-col gap-1">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  completionRate === 1 
                    ? 'bg-green-500' 
                    : completionRate >= 0.5 
                      ? 'bg-yellow-500' 
                      : completionRate > 0 
                        ? 'bg-orange-500' 
                        : ''
                }`}
                style={{ width: `${completionRate * 100}%` }}
              />
            </div>
            {completedCount > 0 && (
              <div className="text-xs text-gray-500">
                {completedCount}/{totalHabits}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Selector de Fecha */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 mb-6">
        <button
          onClick={onPreviousDay}
          className="p-2 hover:bg-white rounded-lg transition-colors"
          title="Día anterior"
          aria-label="Día anterior"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateSelect(e.target.value)}
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
          className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      <h3 className="text-lg font-semibold text-gray-800 mb-4">Historial de los últimos 30 días</h3>
      <div className="grid grid-cols-7 gap-2">
        {/* Headers de días de la semana */}
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* Días del calendario */}
        {days}
      </div>
      
      {/* Leyenda */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Todos completados</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">50%+ completados</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-gray-600">Algunos completados</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span className="text-gray-600">Sin datos</span>
        </div>
      </div>
    </div>
  );
}

