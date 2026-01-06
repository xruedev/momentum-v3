import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, appId } from './firebase';
import { 
  CheckCircle2, Circle, Plus, Trash2, Calendar, Loader2, 
  Target, Check, X, BarChart3, ListTodo, TrendingUp, Award 
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newHabit, setNewHabit] = useState({ name: '', type: 'boolean', goal: 1 });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Autenticación simple para desarrollo local
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const habitsRef = collection(db, 'habits');
    const unsubscribe = onSnapshot(habitsRef, (snapshot) => {
      const habitsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHabits(habitsList);
      setLoading(false);
    }, (err) => {
      setError("Error al sincronizar datos.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    if (habits.length === 0) return null;
    const completedToday = habits.filter(h => {
      const val = h.history?.[today];
      return h.type === 'boolean' ? val === true : (Number(val) >= h.goal);
    }).length;
    return {
      total: habits.length,
      completedToday,
      percentToday: Math.round((completedToday / habits.length) * 100),
      totalActions: habits.reduce((acc, h) => acc + Object.keys(h.history || {}).length, 0)
    };
  }, [habits, today]);

  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.name.trim() || !user) return;
    try {
      const habitId = crypto.randomUUID();
      await setDoc(doc(db, 'habits', habitId), {
        ...newHabit,
        goal: Number(newHabit.goal),
        createdAt: new Date().toISOString(),
        history: {}
      });
      setNewHabit({ name: '', type: 'boolean', goal: 1 });
      setIsModalOpen(false);
    } catch (err) { 
      setError("Error al guardar."); 
    }
  };

  const updateProgress = async (habit, newValue) => {
    if (!user) return;
    const cleanValue = habit.type === 'boolean' ? newValue : Math.max(0, Number(newValue));
    try {
      await updateDoc(doc(db, 'habits', habit.id), { [`history.${today}`]: cleanValue });
    } catch (err) { 
      setError("Error al actualizar."); 
    }
  };

  const removeHabit = async (id) => {
    try { 
      await deleteDoc(doc(db, 'habits', id)); 
    } catch (err) { 
      setError("Error al eliminar."); 
    }
  };

  const toggleHabit = (habit) => {
    const currentValue = habit.history?.[today];
    const newValue = habit.type === 'boolean' 
      ? !currentValue 
      : (Number(currentValue) || 0) + 1;
    updateProgress(habit, newValue);
  };

  const decrementHabit = (habit) => {
    const currentValue = Number(habit.history?.[today] || 0);
    updateProgress(habit, Math.max(0, currentValue - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-indigo-600 font-medium">Cargando hábitos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Target className="w-10 h-10 text-indigo-600" />
            FocusMind
          </h1>
          <p className="text-gray-600">Rastreador de Hábitos</p>
        </header>

        {/* Stats Card */}
        {stats && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{stats.completedToday}/{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Completados hoy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.percentToday}%</div>
                <div className="text-sm text-gray-600 mt-1">Progreso diario</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.totalActions}</div>
                <div className="text-sm text-gray-600 mt-1">Total acciones</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'list'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ListTodo className="w-5 h-5 inline mr-2" />
              Lista
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-5 h-5 inline mr-2" />
              Estadísticas
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
              <button
                onClick={() => setError(null)}
                className="float-right text-red-700 hover:text-red-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'list' && (
              <div>
                {habits.length === 0 ? (
                  <div className="text-center py-12">
                    <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No tienes hábitos aún</p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Crear tu primer hábito
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits.map((habit) => {
                      const todayValue = habit.history?.[today];
                      const isCompleted = habit.type === 'boolean' 
                        ? todayValue === true 
                        : Number(todayValue) >= habit.goal;

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
                                  onClick={() => toggleHabit(habit)}
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
                                        {Number(todayValue) || 0} / {habit.goal}
                                      </span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => decrementHabit(habit)}
                                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                        >
                                          -
                                        </button>
                                        <button
                                          onClick={() => toggleHabit(habit)}
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
                              onClick={() => removeHabit(habit.id)}
                              className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {habits.length > 0 && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Agregar nuevo hábito
                  </button>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                {habits.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay estadísticas disponibles aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {habits.map((habit) => {
                      const historyDays = Object.keys(habit.history || {}).length;
                      const completedDays = Object.values(habit.history || {}).filter(val => 
                        habit.type === 'boolean' ? val === true : Number(val) >= habit.goal
                      ).length;
                      const streak = 0; // Calcular racha si es necesario

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
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para agregar hábito */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Nuevo Hábito</h2>
            <form onSubmit={addHabit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del hábito
                </label>
                <input
                  type="text"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
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
                  onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value, goal: e.target.value === 'boolean' ? 1 : newHabit.goal })}
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
                    onChange={(e) => setNewHabit({ ...newHabit, goal: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewHabit({ name: '', type: 'boolean', goal: 1 });
                  }}
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
      )}
    </div>
  );
}

