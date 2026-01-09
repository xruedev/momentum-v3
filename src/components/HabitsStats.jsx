import { TrendingUp } from 'lucide-react';

export default function HabitsStats({ habits, getGoalForDate }) {
  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No hay estadísticas disponibles aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map((habit) => {
        const historyDays = Object.keys(habit.history || {}).length;
        const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
        const completedDays = Object.entries(habit.history || {}).filter(([dateString, val]) => {
          if (habitType === 'todo' || habitType === 'todont') {
            return val === true;
          } else if (habitType === 'horas') {
            const goal = getGoalForDate(habit, dateString);
            return Number(val) >= goal;
          }
          return false;
        }).length;

        return (
          <div key={habit.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="font-medium text-gray-800 mb-3">{habit.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-indigo-600">{completedDays}</div>
                <div className="text-sm text-gray-600">Días completados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{historyDays}</div>
                <div className="text-sm text-gray-600">Días registrados</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

