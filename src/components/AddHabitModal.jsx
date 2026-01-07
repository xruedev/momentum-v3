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
              onChange={(e) => onHabitChange({ ...newHabit, type: e.target.value, goal: e.target.value === 'boolean' ? 1 : newHabit.goal })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="boolean">Sí/No</option>
              <option value="numeric">Numérico</option>
            </select>
          </div>
          {newHabit.type === 'numeric' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta diaria
              </label>
              <input
                type="number"
                min="1"
                value={newHabit.goal}
                onChange={(e) => onHabitChange({ ...newHabit, goal: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
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
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

