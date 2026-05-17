import { Plus, Target, Clock, Trash2, Edit, Snowflake } from 'lucide-react';

export default function HabitsOverview({ habits, onAddHabit, onRemoveHabit, onEditHabit, onToggleFreezeHabit }) {
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
            className={`border border-gray-200 rounded-lg p-4 bg-white transition-all ${habit.isFrozen ? 'opacity-60 grayscale-[0.3] bg-gray-50 border-dashed' : 'hover:border-indigo-300 shadow-sm hover:shadow-md'}`}
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
                      return <Clock className="w-5 h-5 text-blue-600" />;
                    }
                  })()}
                  <h3 className={`font-medium ${habit.isFrozen ? 'text-gray-500' : 'text-gray-800'}`}>
                    {habit.name}
                    {habit.isFrozen && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                        <Snowflake className="w-2.5 h-2.5" />
                        Congelado
                      </span>
                    )}
                  </h3>
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Meta días laborables (L-V):</span>
                        <span>{habit.goalWorkdays || habit.goal || 0} horas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Meta días no laborables (S-D):</span>
                        <span>{habit.goalWeekends || habit.goal || 0} horas</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Días activos:</span>
                    <span>{formatDaysOfWeek(habit.daysOfWeek)}</span>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={() => onToggleFreezeHabit(habit.id, habit.isFrozen)}
                  className={`p-2 rounded-lg transition-all ${habit.isFrozen ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                  title={habit.isFrozen ? "Descongelar hábito" : "Congelar hábito"}
                >
                  <Snowflake className={`w-5 h-5 ${habit.isFrozen ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => onEditHabit(habit)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Editar hábito"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onRemoveHabit(habit.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Eliminar hábito"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

