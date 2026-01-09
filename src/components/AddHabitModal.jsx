export default function AddHabitModal({ isOpen, onClose, newHabit, onHabitChange, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Nuevo Hábito</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del hábito
            </label>
            <input
              type="text"
              value={newHabit.name}
              onChange={(e) => onHabitChange({ ...newHabit, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: Hacer ejercicio"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={newHabit.type}
              onChange={(e) => {
                const newType = e.target.value;
                onHabitChange({ 
                  ...newHabit, 
                  type: newType, 
                  goal: newType === 'horas' ? newHabit.goal : 1 
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="todo">To Do</option>
              <option value="todont">To Don&apos;t</option>
              <option value="horas">Horas</option>
            </select>
          </div>
          {newHabit.type === 'horas' && (
            <div className="mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta días laborables (L-V) (horas)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newHabit.goalWorkdays || 8}
                  onChange={(e) => onHabitChange({ ...newHabit, goalWorkdays: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta días no laborables (S-D) (horas)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newHabit.goalWeekends || 2}
                  onChange={(e) => onHabitChange({ ...newHabit, goalWeekends: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de la semana
            </label>
            <div className="grid grid-cols-7 gap-2">
              {[
                { value: 1, label: 'L' },
                { value: 2, label: 'M' },
                { value: 3, label: 'X' },
                { value: 4, label: 'J' },
                { value: 5, label: 'V' },
                { value: 6, label: 'S' },
                { value: 0, label: 'D' }
              ].map((day) => (
                <label
                  key={day.value}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all
                    ${newHabit.daysOfWeek?.includes(day.value)
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={newHabit.daysOfWeek?.includes(day.value) || false}
                    onChange={(e) => {
                      const currentDays = newHabit.daysOfWeek || [];
                      const newDays = e.target.checked
                        ? [...currentDays, day.value]
                        : currentDays.filter(d => d !== day.value);
                      onHabitChange({ ...newHabit, daysOfWeek: newDays });
                    }}
                    className="sr-only"
                  />
                  <span className="text-xs font-semibold">{day.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selecciona los días en los que quieres realizar este hábito
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

