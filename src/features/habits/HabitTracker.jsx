import { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, firebaseError } from '../../firebase';
import { Loader2, X, BarChart3, ListTodo, Calendar, Target } from 'lucide-react';
import HabitsList from './components/HabitsList';
import HabitsOverview from './components/HabitsOverview';
import HabitsCalendar from './components/HabitsCalendar';
import HabitsStats from './components/HabitsStats';
import AddHabitModal from './components/AddHabitModal';
import EditHabitModal from './components/EditHabitModal';
import HabitDetailModal from './components/HabitDetailModal';

export default function HabitTracker() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState(null);
  const [focusMode, setFocusMode] = useState(false);

  const activeHabits = useMemo(() => habits.filter(h => !h.isFrozen), [habits]);
  
  const [newHabit, setNewHabit] = useState({ 
    name: '', 
    type: 'todo', 
    goal: 1, 
    goalWorkdays: 8,
    goalWeekends: 2,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0] // Por defecto todos los días (Lunes a Domingo)
  });
  const today = new Date().toISOString().split('T')[0];

  // Función para limpiar duplicados en goalHistory
  const cleanGoalHistory = (goalHistory) => {
    if (!goalHistory || goalHistory.length === 0) return goalHistory;
    
    // Agrupar por fecha y mantener solo la última entrada de cada fecha
    const historyByDate = {};
    goalHistory.forEach((entry, index) => {
      if (!entry.effectiveDate) return;
      const date = entry.effectiveDate;
      // Si ya existe una entrada para esta fecha, solo la reemplazamos si esta es más reciente (mayor índice)
      if (!historyByDate[date] || index > historyByDate[date].index) {
        historyByDate[date] = { entry, index };
      }
    });
    
    // Convertir de vuelta a array y ordenar por fecha
    return Object.values(historyByDate)
      .map(item => item.entry)
      .sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
  };

  // Función helper para obtener la meta según el día de la semana
  const getGoalForDate = (habit, dateString) => {
    // Para hábitos tipo "todo" y "todont", usar goal normal
    if (habit.type !== 'horas' && habit.type !== 'numeric') return habit.goal;
    
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
    
    // Días laborables: Lunes (1) a Viernes (5)
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    // Si no hay historial, usar metas actuales (compatibilidad con hábitos antiguos)
    if (!habit.goalHistory || habit.goalHistory.length === 0) {
      return isWorkday ? (habit.goalWorkdays ?? habit.goal ?? 0) : (habit.goalWeekends ?? habit.goal ?? 0);
    }
    
    // Buscar la meta vigente para esta fecha
    // Filtrar entradas donde effectiveDate <= dateString
    const validEntries = habit.goalHistory.filter(entry => {
      if (!entry.effectiveDate) return false;
      return entry.effectiveDate <= dateString;
    });
    
    // Si no hay entrada anterior, usar metas actuales
    if (validEntries.length === 0) {
      return isWorkday ? (habit.goalWorkdays ?? habit.goal ?? 0) : (habit.goalWeekends ?? habit.goal ?? 0);
    }
    
    // Ordenar por fecha descendente, y si hay misma fecha, tomar la última en el array (más reciente)
    // Primero ordenamos por fecha, luego por índice inverso para mantener el orden original
    const sortedEntries = validEntries
      .map((entry, index) => ({ entry, originalIndex: index }))
      .sort((a, b) => {
        const dateA = new Date(a.entry.effectiveDate);
        const dateB = new Date(b.entry.effectiveDate);
        // Si las fechas son iguales, tomar la que tiene mayor índice (más reciente en el array)
        if (dateA.getTime() === dateB.getTime()) {
          return b.originalIndex - a.originalIndex;
        }
        return dateB - dateA; // Orden descendente por fecha
      });
    
    const effectiveGoal = sortedEntries[0]?.entry;
    
    if (!effectiveGoal) {
      return isWorkday ? (habit.goalWorkdays ?? habit.goal ?? 0) : (habit.goalWeekends ?? habit.goal ?? 0);
    }
    
    return isWorkday ? (effectiveGoal.goalWorkdays ?? 0) : (effectiveGoal.goalWeekends ?? 0);
  };

  // Logging inicial para diagnóstico
  useEffect(() => {
    console.log('🚀 HabitTracker component montado');
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
      async (snapshot) => {
        try {
          const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const habitsList = allDocs.filter(h => h.type !== 'dev_task' && h.type !== 'dev_goal' && h.type !== 'dev_journal');
          
          // Migración automática: asignar order a hábitos que no lo tienen
          const habitsNeedingMigration = habitsList.filter(habit => habit.order === undefined);
          if (habitsNeedingMigration.length > 0) {
            // Agrupar por tipo para asignar orden independiente por tipo
            const habitsByType = {
              todo: [],
              todont: [],
              horas: []
            };
            
            habitsList.forEach(habit => {
              const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
              if (habitType === 'todo') {
                habitsByType.todo.push(habit);
              } else if (habitType === 'todont') {
                habitsByType.todont.push(habit);
              } else if (habitType === 'horas') {
                habitsByType.horas.push(habit);
              }
            });
            
            // Asignar order basado en createdAt para cada tipo
            Object.keys(habitsByType).forEach(type => {
              const typeHabits = habitsByType[type];
              
              // Separar hábitos con y sin order
              const habitsWithOrder = typeHabits.filter(h => h.order !== undefined);
              const habitsWithoutOrder = typeHabits.filter(h => h.order === undefined);
              
              // Obtener el máximo order existente
              const maxOrder = habitsWithOrder.reduce((max, h) => Math.max(max, h.order || -1), -1);
              
              // Ordenar hábitos sin order por createdAt
              habitsWithoutOrder.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateA - dateB;
              });
              
              // Asignar order empezando desde maxOrder + 1
              habitsWithoutOrder.forEach((habit, index) => {
                updateDoc(doc(db, 'habits', habit.id), { order: maxOrder + 1 + index })
                  .catch(err => console.error('Error al migrar order:', err));
              });
            });
          }
          
          // Limpiar duplicados en goalHistory para cada hábito
          const cleanedHabits = habitsList.map(habit => {
            if (habit.goalHistory && habit.goalHistory.length > 0) {
              const cleanedHistory = cleanGoalHistory(habit.goalHistory);
              // Si se encontraron duplicados, guardar la versión limpia
              if (cleanedHistory.length !== habit.goalHistory.length) {
                // Guardar la versión limpia en Firebase (asíncrono, no bloquea la UI)
                updateDoc(doc(db, 'habits', habit.id), { goalHistory: cleanedHistory })
                  .catch(err => console.error('Error al limpiar historial:', err));
                return { ...habit, goalHistory: cleanedHistory };
              }
            }
            return habit;
          });
          
          setHabits(cleanedHabits);
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
    
    // Obtener el día de la semana del selectedDate (Lunes = 1, Domingo = 0)
    const getDayOfWeek = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDay();
      // Convertir: Domingo (0) -> 0, Lunes (1) -> 1, ..., Sábado (6) -> 6
      return day;
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
      if (h.type === 'todo' || h.type === 'todont') {
        return val === true;
      } else if (h.type === 'horas') {
        const goal = getGoalForDate(h, selectedDate);
        return Number(val) >= goal;
      }
      // Compatibilidad con tipos antiguos
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
      
      // Calcular el orden basado en hábitos existentes del mismo tipo
      const habitType = newHabit.type === 'boolean' ? 'todo' : (newHabit.type === 'numeric' ? 'horas' : newHabit.type);
      const habitsOfSameType = habits.filter(h => {
        const hType = h.type === 'boolean' ? 'todo' : (h.type === 'numeric' ? 'horas' : h.type);
        return hType === habitType;
      });
      
      // Obtener el máximo order de hábitos del mismo tipo, o -1 si no hay ninguno
      const maxOrder = habitsOfSameType.reduce((max, h) => {
        const order = h.order !== undefined ? h.order : -1;
        return Math.max(max, order);
      }, -1);
      
      const habitData = {
        ...newHabit,
        userId: user.uid,
        daysOfWeek: newHabit.daysOfWeek || [1, 2, 3, 4, 5, 6, 0],
        createdAt: new Date().toISOString(),
        history: {},
        order: maxOrder + 1 // Asignar el siguiente orden disponible
      };
      
      // Para hábitos tipo "horas", guardar goalWorkdays y goalWeekends (no goal)
      if (newHabit.type === 'horas') {
        habitData.goalWorkdays = Number(newHabit.goalWorkdays);
        habitData.goalWeekends = Number(newHabit.goalWeekends);
        // Inicializar historial de metas con la fecha de creación
        habitData.goalHistory = [{
          effectiveDate: today,
          goalWorkdays: Number(newHabit.goalWorkdays),
          goalWeekends: Number(newHabit.goalWeekends)
        }];
      } else {
        // Para otros tipos, guardar goal normal
        habitData.goal = Number(newHabit.goal);
      }
      
      await setDoc(doc(db, 'habits', habitId), habitData);
      setNewHabit({ name: '', type: 'todo', goal: 1, goalWorkdays: 8, goalWeekends: 2, daysOfWeek: [1, 2, 3, 4, 5, 6, 0] });
      setIsModalOpen(false);
    } catch (err) { 
      setError("Error al guardar."); 
    }
  };

  const updateProgress = async (habit, newValue, date = selectedDate) => {
    if (!user) return;
    let cleanValue;
    if (habit.type === 'todo' || habit.type === 'todont') {
      cleanValue = newValue;
    } else if (habit.type === 'horas') {
      cleanValue = Math.max(0, Number(newValue));
    } else {
      // Compatibilidad con tipos antiguos
      cleanValue = habit.type === 'boolean' ? newValue : Math.max(0, Number(newValue));
    }
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

  const updateHabit = async (habitId, updates) => {
    if (!user) return;
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    try {
      const updateData = { name: updates.name };
      
      // Si es hábito de horas y cambian las metas
      const currentGoalWorkdays = Number(habit.goalWorkdays ?? habit.goal ?? 0);
      const currentGoalWeekends = Number(habit.goalWeekends ?? habit.goal ?? 0);
      
      if ((habit.type === 'horas' || habit.type === 'numeric') && 
          (Number(updates.goalWorkdays) !== currentGoalWorkdays || 
           Number(updates.goalWeekends) !== currentGoalWeekends)) {
        
        let goalHistory = habit.goalHistory || [];
        
        // Si no hay historial, inicializar con las metas actuales desde la fecha de creación
        // o desde una fecha muy antigua para preservar todo el historial
        if (goalHistory.length === 0) {
          const initialDate = habit.createdAt 
            ? new Date(habit.createdAt).toISOString().split('T')[0]
            : '2000-01-01'; // Fecha muy antigua para hábitos sin createdAt
          
          goalHistory.push({
            effectiveDate: initialDate,
            goalWorkdays: habit.goalWorkdays || habit.goal || 0,
            goalWeekends: habit.goalWeekends || habit.goal || 0
          });
        }
        
        // Eliminar todas las entradas existentes para hoy (para evitar duplicados)
        goalHistory = goalHistory.filter(entry => entry.effectiveDate !== today);
        
        // Añadir nueva entrada con las nuevas metas desde hoy
        const newEntry = {
          effectiveDate: today,
          goalWorkdays: Number(updates.goalWorkdays),
          goalWeekends: Number(updates.goalWeekends)
        };
        
        goalHistory.push(newEntry);
        
        updateData.goalHistory = goalHistory;
        updateData.goalWorkdays = Number(updates.goalWorkdays);
        updateData.goalWeekends = Number(updates.goalWeekends);
      }
      
      await updateDoc(doc(db, 'habits', habitId), updateData);
      setIsEditModalOpen(false);
      setEditingHabit(null);
    } catch (err) {
      setError("Error al actualizar.");
    }
  };

  const updateAntiSabotage = async (habitId, antiSabotageData) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'habits', habitId), { antiSabotage: antiSabotageData });
    } catch (err) {
      setError("Error al actualizar la información anti-sabotaje.");
    }
  };

  const toggleFreezeHabit = async (habitId, currentStatus) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'habits', habitId), { isFrozen: !currentStatus });
    } catch (err) {
      setError("Error al cambiar el estado de congelación.");
    }
  };

  const updateHabitOrder = async (habitId, direction) => {
    if (!user) return;
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    // Determinar el tipo del hábito
    const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
    
    // Obtener todos los hábitos del mismo tipo ordenados por order
    const habitsOfSameType = habits
      .filter(h => {
        const hType = h.type === 'boolean' ? 'todo' : (h.type === 'numeric' ? 'horas' : h.type);
        return hType === habitType;
      })
      .sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        return orderA - orderB;
      });
    
    // Encontrar el índice del hábito actual
    const currentIndex = habitsOfSameType.findIndex(h => h.id === habitId);
    if (currentIndex === -1) return;
    
    // Determinar el índice del hábito adyacente
    let targetIndex;
    if (direction === 'up') {
      targetIndex = currentIndex - 1;
      if (targetIndex < 0) return; // Ya está en la primera posición
    } else if (direction === 'down') {
      targetIndex = currentIndex + 1;
      if (targetIndex >= habitsOfSameType.length) return; // Ya está en la última posición
    } else {
      return;
    }
    
    const targetHabit = habitsOfSameType[targetIndex];
    
    // Intercambiar los orders
    const currentOrder = habit.order !== undefined ? habit.order : currentIndex;
    const targetOrder = targetHabit.order !== undefined ? targetHabit.order : targetIndex;
    
    try {
      // Actualizar ambos hábitos en Firebase
      await Promise.all([
        updateDoc(doc(db, 'habits', habitId), { order: targetOrder }),
        updateDoc(doc(db, 'habits', targetHabit.id), { order: currentOrder })
      ]);
    } catch (err) {
      console.error('Error al actualizar orden:', err);
      setError("Error al actualizar el orden.");
    }
  };

  // Función para actualizar múltiples hábitos con nuevos orders (para confirmar ordenación)
  const updateMultipleHabitOrders = async (orderUpdates) => {
    if (!user || !orderUpdates || Object.keys(orderUpdates).length === 0) return;
    
    try {
      // Actualizar todos los hábitos afectados en Firebase
      const updatePromises = Object.entries(orderUpdates).map(([habitId, newOrder]) => {
        return updateDoc(doc(db, 'habits', habitId), { order: newOrder });
      });
      
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error al actualizar múltiples órdenes:', err);
      setError("Error al actualizar el orden.");
    }
  };

  const handleEditHabit = (habit) => {
    // Asegurar que los valores de metas estén correctamente inicializados
    const habitForEdit = { ...habit };
    
    // Para hábitos de horas antiguos que pueden tener solo 'goal'
    if ((habit.type === 'horas' || habit.type === 'numeric') && !habit.goalWorkdays) {
      habitForEdit.goalWorkdays = habit.goal || 0;
      habitForEdit.goalWeekends = habit.goal || 0;
    }
    
    setEditingHabit(habitForEdit);
    setIsEditModalOpen(true);
  };

  const handleEditHabitSubmit = (e) => {
    e.preventDefault();
    if (!editingHabit || !editingHabit.name.trim()) return;
    updateHabit(editingHabit.id, editingHabit);
  };

  const toggleHabit = (habit, date = selectedDate) => {
    const currentValue = habit.history?.[date];
    let newValue;
    if (habit.type === 'todo' || habit.type === 'todont') {
      newValue = !currentValue;
    } else if (habit.type === 'horas') {
      newValue = (Number(currentValue) || 0) + 0.5;
    } else {
      // Compatibilidad con tipos antiguos
      newValue = habit.type === 'boolean' 
        ? !currentValue 
        : (Number(currentValue) || 0) + 1;
    }
    updateProgress(habit, newValue, date);
  };

  const decrementHabit = (habit, date = selectedDate) => {
    const currentValue = Number(habit.history?.[date] || 0);
    const decrement = habit.type === 'horas' ? 0.5 : 1;
    updateProgress(habit, Math.max(0, currentValue - decrement), date);
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
        {/* Botón discreto para salir del modo foco */}
        {focusMode && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setFocusMode(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-1"
              title="Salir del modo foco"
            >
              <X className="w-3 h-3" />
              Salir del modo foco
            </button>
          </div>
        )}

        {/* Tabs */}
        {!focusMode && (
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
                  habits={activeHabits}
                  selectedDate={selectedDate}
                  onToggleHabit={toggleHabit}
                  onDecrementHabit={decrementHabit}
                  onUpdateProgress={updateProgress}
                  onUpdateHabitOrder={updateHabitOrder}
                  onUpdateMultipleHabitOrders={updateMultipleHabitOrders}
                  stats={stats}
                  today={today}
                  getGoalForDate={getGoalForDate}
                  focusMode={focusMode}
                  setFocusMode={setFocusMode}
                  onHabitClick={setSelectedHabitForDetail}
                />
              )}

              {activeTab === 'habits' && (
                <HabitsOverview
                  habits={habits}
                  onAddHabit={() => setIsModalOpen(true)}
                  onRemoveHabit={removeHabit}
                  onEditHabit={handleEditHabit}
                  onToggleFreezeHabit={toggleFreezeHabit}
                />
              )}

              {activeTab === 'calendar' && (
                <HabitsCalendar
                  habits={activeHabits}
                  selectedDate={selectedDate}
                  today={today}
                  onDateSelect={setSelectedDate}
                  onPreviousDay={() => changeDate(-1)}
                  onNextDay={() => changeDate(1)}
                  onTodayClick={() => setSelectedDate(today)}
                  formatDate={formatDate}
                  getGoalForDate={getGoalForDate}
                />
              )}

              {activeTab === 'stats' && (
                <HabitsStats habits={habits} getGoalForDate={getGoalForDate} />
              )}
            </div>
          </div>
        )}

        {/* Contenido en modo foco - solo lista de hábitos */}
        {focusMode && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <HabitsList
              habits={activeHabits}
              selectedDate={selectedDate}
              onToggleHabit={toggleHabit}
              onDecrementHabit={decrementHabit}
              onUpdateProgress={updateProgress}
              onUpdateHabitOrder={updateHabitOrder}
              onUpdateMultipleHabitOrders={updateMultipleHabitOrders}
              stats={stats}
              today={today}
              getGoalForDate={getGoalForDate}
              focusMode={focusMode}
              setFocusMode={setFocusMode}
              onHabitClick={setSelectedHabitForDetail}
            />
          </div>
        )}
      </div>

        <HabitDetailModal
          habit={selectedHabitForDetail}
          onClose={() => setSelectedHabitForDetail(null)}
          onSaveAntiSabotage={updateAntiSabotage}
        />

        <AddHabitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewHabit({ name: '', type: 'todo', goal: 1, goalWorkdays: 8, goalWeekends: 2, daysOfWeek: [1, 2, 3, 4, 5, 6, 0] });
        }}
        newHabit={newHabit}
        onHabitChange={setNewHabit}
        onSubmit={addHabit}
      />

      <EditHabitModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingHabit(null);
        }}
        habit={editingHabit}
        onHabitChange={setEditingHabit}
        onSubmit={handleEditHabitSubmit}
      />
    </div>
  );
}

