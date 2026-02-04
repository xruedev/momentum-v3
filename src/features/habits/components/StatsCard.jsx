export default function StatsCard({ stats, selectedDate, today }) {
  if (!stats) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-indigo-600">{stats.completedForDate}/{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">
            {selectedDate === today ? 'Completados hoy' : 'Completados'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{stats.percentForDate}%</div>
          <div className="text-sm text-gray-600 mt-1">Progreso</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.totalActions}</div>
          <div className="text-sm text-gray-600 mt-1">Total acciones</div>
        </div>
      </div>
    </div>
  );
}

