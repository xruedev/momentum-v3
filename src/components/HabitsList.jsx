import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';

export default function HabitsList({ habits, selectedDate, onToggleHabit, onDecrementHabit, onRemoveHabit, onAddHabit }) {
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
        <button
          onClick={onAddHabit}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Crear tu primer hábito
        </button>
      </div>
    );
  }

  if (filteredHabits.length === 0) {
    return (
      <div className="text-center py-12">
        <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No hay hábitos programados para este día</p>
        <button
          onClick={onAddHabit}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agregar nuevo hábito
        </button>
      </div>
    );
  }

  return (
    <div>
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
                <button
                  onClick={() => onRemoveHabit(habit.id)}
                  className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddHabit}
        className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Agregar nuevo hábito
      </button>
    </div>
  );
}

