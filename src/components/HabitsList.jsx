import { CheckCircle2, Circle } from 'lucide-react';

export default function HabitsList({ habits, selectedDate, onToggleHabit, onDecrementHabit, stats, today }) {
  // Filtrar hábitos según el día de la semana seleccionado
  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  };

  const selectedDayOfWeek = getDayOfWeek(selectedDate);
  const filteredHabits = habits.filter(habit => {
    // Si el hábito no tiene daysOfWeek definido, mostrarlo siempre (compatibilidad con hábitos antiguos)
    if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
      return true;
    }
    return habit.daysOfWeek.includes(selectedDayOfWeek);
  });

  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No tienes hábitos aún</p>
        <p className="text-sm text-gray-400">Ve a la pestaña &quot;Hábitos&quot; para crear tu primer hábito</p>
      </div>
    );
  }

  if (filteredHabits.length === 0) {
    return (
      <div className="text-center py-12">
        <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No hay hábitos programados para este día</p>
        <p className="text-sm text-gray-400">Ve a la pestaña &quot;Hábitos&quot; para agregar nuevos hábitos</p>
      </div>
    );
  }

  return (
    <div>
      {/* Estadísticas discretas */}
      {stats && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                {selectedDate === today ? 'Hoy' : 'Completados'}:
              </span>
              <span className="font-semibold text-indigo-600">
                {stats.completedForDate}/{stats.total}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Progreso:</span>
                <span className="font-semibold text-green-600">{stats.percentForDate}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Total acciones:</span>
                <span className="font-semibold text-purple-600">{stats.totalActions}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {filteredHabits.map((habit) => {
          const dateValue = habit.history?.[selectedDate];
          const isCompleted = habit.type === 'boolean' 
            ? dateValue === true 
            : Number(dateValue) >= habit.goal;

          return (
            <div
              key={habit.id}
              className={`border rounded-lg p-4 transition-all ${
                isCompleted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleHabit(habit, selectedDate)}
                      className="flex-shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 hover:text-indigo-600" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h3 className={`font-medium ${isCompleted ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                        {habit.name}
                      </h3>
                      {habit.type === 'numeric' && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {Number(dateValue) || 0} / {habit.goal}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onDecrementHabit(habit, selectedDate)}
                              className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <button
                              onClick={() => onToggleHabit(habit, selectedDate)}
                              className="w-6 h-6 rounded bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-sm text-indigo-700"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

