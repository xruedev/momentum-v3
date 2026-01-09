export default function EditHabitModal({ isOpen, onClose, habit, onHabitChange, onSubmit }) {
  if (!isOpen || !habit) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Hábito</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del hábito
            </label>
            <input
              type="text"
              value={habit.name}
              onChange={(e) => onHabitChange({ ...habit, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: Hacer ejercicio"
              required
            />
          </div>
          {(habit.type === 'horas' || habit.type === 'numeric') && (
            <div className="mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta días laborables (L-V) (horas)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={habit.goalWorkdays || habit.goal || 0}
                  onChange={(e) => onHabitChange({ ...habit, goalWorkdays: Number(e.target.value) })}
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
                  value={habit.goalWeekends || habit.goal || 0}
                  onChange={(e) => onHabitChange({ ...habit, goalWeekends: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Los cambios de meta se aplicarán a partir de hoy. Las fechas anteriores mantendrán sus metas originales.
                </p>
              </div>
            </div>
          )}
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
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

