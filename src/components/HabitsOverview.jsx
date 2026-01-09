import { Plus, Target, Hash, Trash2 } from 'lucide-react';

export default function HabitsOverview({ habits, onAddHabit, onRemoveHabit }) {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; // Mantener orden para compatibilidad con índices

  const formatDaysOfWeek = (daysOfWeek) => {
    if (!daysOfWeek || daysOfWeek.length === 0) {
      return 'Todos los días';
    }
    if (daysOfWeek.length === 7) {
      return 'Todos los días';
    }
    return daysOfWeek
      .sort((a, b) => a - b)
      .map(day => dayNames[day])
      .join(', ');
  };

  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Todos los hábitos</h2>
        <button
          onClick={onAddHabit}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo hábito
        </button>
      </div>

      <div className="space-y-4">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="border border-gray-200 rounded-lg p-4 bg-white hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
                    if (habitType === 'todo') {
                      return <Target className="w-5 h-5 text-green-600" />;
                    } else if (habitType === 'todont') {
                      return <Target className="w-5 h-5 text-red-600" />;
                    } else {
                      return <Hash className="w-5 h-5 text-blue-600" />;
                    }
                  })()}
                  <h3 className="font-medium text-gray-800">{habit.name}</h3>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tipo:</span>
                    <span>{(() => {
                      const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
                      if (habitType === 'todo') return 'To Do';
                      if (habitType === 'todont') return "To Don't";
                      if (habitType === 'horas') return 'Horas';
                      return habit.type;
                    })()}</span>
                  </div>
                  
                  {(habit.type === 'horas' || habit.type === 'numeric') && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Meta diaria:</span>
                      <span>{habit.goal} {habit.type === 'horas' ? 'horas' : ''}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Días activos:</span>
                    <span>{formatDaysOfWeek(habit.daysOfWeek)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveHabit(habit.id)}
                className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar hábito"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

