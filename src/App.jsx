import { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth, firebaseError } from './firebase';
import { Loader2, X, BarChart3, ListTodo, Calendar, Target } from 'lucide-react';
import AppHeader from './components/AppHeader';
import HabitsList from './components/HabitsList';
import HabitsOverview from './components/HabitsOverview';
import HabitsCalendar from './components/HabitsCalendar';
import HabitsStats from './components/HabitsStats';
import AddHabitModal from './components/AddHabitModal';
import Login from './components/Login';

export default function App() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newHabit, setNewHabit] = useState({ 
    name: '', 
    type: 'boolean', 
    goal: 1, 
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // Por defecto todos los días
  });
  const today = new Date().toISOString().split('T')[0];

  // Logging inicial para diagnóstico
  useEffect(() => {
    console.log('🚀 App component montado');
    console.log('📊 Estado inicial:', {
      firebaseError: firebaseError ? firebaseError.message : 'none',
      auth: !!auth,
      db: !!db,
      authLoading,
      user: !!user
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Si Firebase no está inicializado, no intentar autenticación
    if (!auth || firebaseError) {
      setError("Firebase no está configurado correctamente. Verifica tu archivo .env");
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    // Observar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!mounted) return;
      
      setUser(u);
      setAuthLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error en onAuthStateChanged:', error);
      if (mounted) {
        setError(`Error de autenticación: ${error.message}`);
        setAuthLoading(false);
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    // Si Firebase no está inicializado o no hay usuario, no intentar cargar datos
    if (!db || !user || firebaseError) {
      if (firebaseError) {
        setAuthLoading(false);
      }
      return;
    }
    
    // No bloquear la UI mientras se cargan los hábitos
    // Simplemente mostrar la UI con array vacío y cargar en segundo plano
    const habitsRef = collection(db, 'habits');
    // Filtrar hábitos por userId del usuario autenticado
    const habitsQuery = query(habitsRef, where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(
      habitsQuery, 
      (snapshot) => {
        try {
          const habitsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHabits(habitsList);
          setError(null);
        } catch (err) {
          console.error('Error al procesar datos:', err);
          setError("Error al procesar los datos.");
        }
      }, 
      (err) => {
        console.error('Error en onSnapshot:', err);
        setError(`Error al sincronizar datos: ${err.message}`);
      }
    );
    
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    if (habits.length === 0) return null;
    
    // Obtener el día de la semana del selectedDate
    const getDayOfWeek = (dateString) => {
      const date = new Date(dateString);
      return date.getDay();
    };
    
    const selectedDayOfWeek = getDayOfWeek(selectedDate);
    
    // Filtrar hábitos que aplican al día seleccionado
    const habitsForDate = habits.filter(habit => {
      if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
        return true; // Compatibilidad con hábitos antiguos
      }
      return habit.daysOfWeek.includes(selectedDayOfWeek);
    });
    
    if (habitsForDate.length === 0) return null;
    
    const completedForDate = habitsForDate.filter(h => {
      const val = h.history?.[selectedDate];
      return h.type === 'boolean' ? val === true : (Number(val) >= h.goal);
    }).length;
    
    return {
      total: habitsForDate.length,
      completedForDate,
      percentForDate: Math.round((completedForDate / habitsForDate.length) * 100),
      totalActions: habits.reduce((acc, h) => acc + Object.keys(h.history || {}).length, 0)
    };
  }, [habits, selectedDate]);

  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.name.trim() || !user) return;
    if (!newHabit.daysOfWeek || newHabit.daysOfWeek.length === 0) {
      setError("Debes seleccionar al menos un día de la semana.");
      return;
    }
    try {
      const habitId = crypto.randomUUID();
      await setDoc(doc(db, 'habits', habitId), {
        ...newHabit,
        userId: user.uid, // Agregar userId al hábito
        goal: Number(newHabit.goal),
        daysOfWeek: newHabit.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        createdAt: new Date().toISOString(),
        history: {}
      });
      setNewHabit({ name: '', type: 'boolean', goal: 1, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
      setIsModalOpen(false);
    } catch (err) { 
      setError("Error al guardar."); 
    }
  };

  const updateProgress = async (habit, newValue, date = selectedDate) => {
    if (!user) return;
    const cleanValue = habit.type === 'boolean' ? newValue : Math.max(0, Number(newValue));
    try {
      await updateDoc(doc(db, 'habits', habit.id), { [`history.${date}`]: cleanValue });
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

  const toggleHabit = (habit, date = selectedDate) => {
    const currentValue = habit.history?.[date];
    const newValue = habit.type === 'boolean' 
      ? !currentValue 
      : (Number(currentValue) || 0) + 1;
    updateProgress(habit, newValue, date);
  };

  const decrementHabit = (habit, date = selectedDate) => {
    const currentValue = Number(habit.history?.[date] || 0);
    updateProgress(habit, Math.max(0, currentValue - 1), date);
  };

  const changeDate = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Hoy';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setHabits([]);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setError('Error al cerrar sesión');
    }
  };

  // Mostrar Login si no hay usuario y no está cargando autenticación
  if (!user && !authLoading && !firebaseError) {
    return <Login onLoginSuccess={(user) => setUser(user)} />;
  }

  // Mostrar loader solo durante la autenticación inicial
  if (authLoading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-indigo-600 font-medium">Conectando...</p>
          <p className="text-gray-500 text-sm mt-2">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si hay un error de Firebase al inicializar, mostrarlo inmediatamente
  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error de Configuración de Firebase</h2>
            <p className="text-gray-600 mb-4">{firebaseError.message}</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
              <p className="font-semibold mb-2">Pasos para solucionar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Verifica que el archivo .env existe en la raíz del proyecto</li>
                <li>Abre la consola del navegador (F12) y revisa los errores</li>
                <li>Asegúrate de que todas las variables tienen valores (no vacíos)</li>
                <li>Reinicia el servidor de desarrollo después de crear/modificar .env</li>
                <li>Verifica que no hay espacios extra alrededor del signo =</li>
                {error && error.includes('autenticación anónima') && (
                  <li className="text-yellow-700 font-semibold mt-2">
                    ⚠️ IMPORTANTE: Ve a Firebase Console → Authentication → Sign-in method → 
                    Habilita &quot;Anonymous&quot; y guarda los cambios
                  </li>
                )}
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error de Conexión</h2>
            <p className="text-gray-600 mb-4">{error}</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
              <p className="font-semibold mb-2">Posibles soluciones:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verifica que el archivo .env existe en la raíz del proyecto</li>
                <li>Revisa la consola del navegador (F12) para más detalles</li>
                <li>Asegúrate de que todas las variables tienen valores (no vacíos)</li>
                <li>Reinicia el servidor de desarrollo después de crear/modificar .env</li>
                <li>Verifica tu conexión a internet</li>
                {error && error.includes('autenticación anónima') && (
                  <li className="text-yellow-700 font-semibold mt-2">
                    ⚠️ IMPORTANTE: Ve a Firebase Console → Authentication → Sign-in method → 
                    Habilita &quot;Anonymous&quot; y guarda los cambios
                  </li>
                )}
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AppHeader
          user={user}
          onLogout={handleLogout}
        />

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
              onClick={() => setActiveTab('habits')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'habits'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Target className="w-5 h-5 inline mr-2" />
              Hábitos
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              Calendario
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
              <HabitsList
                habits={habits}
                selectedDate={selectedDate}
                onToggleHabit={toggleHabit}
                onDecrementHabit={decrementHabit}
                stats={stats}
                today={today}
              />
            )}

            {activeTab === 'habits' && (
              <HabitsOverview
                habits={habits}
                onAddHabit={() => setIsModalOpen(true)}
                onRemoveHabit={removeHabit}
              />
            )}

            {activeTab === 'calendar' && (
              <HabitsCalendar
                habits={habits}
                selectedDate={selectedDate}
                today={today}
                onDateSelect={setSelectedDate}
                onPreviousDay={() => changeDate(-1)}
                onNextDay={() => changeDate(1)}
                onTodayClick={() => setSelectedDate(today)}
                formatDate={formatDate}
              />
            )}

            {activeTab === 'stats' && (
              <HabitsStats habits={habits} />
            )}
          </div>
        </div>
      </div>

      <AddHabitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewHabit({ name: '', type: 'boolean', goal: 1, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
        }}
        newHabit={newHabit}
        onHabitChange={setNewHabit}
        onSubmit={addHabit}
      />
    </div>
  );
}

