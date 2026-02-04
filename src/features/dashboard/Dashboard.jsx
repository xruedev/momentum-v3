import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  const features = [
    {
      id: 'habits',
      title: 'Habit Tracker',
      description: 'Rastrea tus hábitos diarios y mantén un registro de tu progreso',
      icon: Target,
      color: 'indigo',
      route: '/habits'
    }
    // Future features can be added here easily
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Target className="w-12 h-12 text-indigo-600" />
            FocusMind
          </h1>
          <p className="text-xl text-gray-600">Tu centro personal de productividad</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                onClick={() => navigate(feature.route)}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-indigo-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-indigo-100">
                    <Icon className="w-8 h-8 text-indigo-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {features.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay funcionalidades disponibles aún</p>
          </div>
        )}
      </div>
    </div>
  );
}

