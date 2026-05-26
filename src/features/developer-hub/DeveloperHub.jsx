import { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, firebaseError } from '../../firebase';
import { 
  Loader2, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Square, 
  CheckSquare, 
  Code,
  Briefcase,
  Layers,
  BookOpen,
  Save
} from 'lucide-react';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function DeveloperHub() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Task & Goal states
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  
  // Journal states
  const [journalText, setJournalText] = useState('');
  const [localJournalText, setLocalJournalText] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [isEditingJournal, setIsEditingJournal] = useState(false);

  // Date state (defaults to today's local date)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const today = new Date().toISOString().split('T')[0];

  // Input states
  const [newTaskText, setNewTaskText] = useState('');
  
  // Goals category input controls
  const [activeAddCategory, setActiveAddCategory] = useState(null); // 'liquidcars' or 'developer'
  const [newGoalText, setNewGoalText] = useState('');
  
  // Goal editing controls
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingGoalText, setEditingGoalText] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    if (!auth || firebaseError) {
      setError("Firebase no está configurado correctamente. Verifica tu archivo .env");
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    }, (err) => {
      console.error('Error de autenticación:', err);
      setError(`Error de autenticación: ${err.message}`);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Tasks & Goals Firestore Listener (queries 'habits' collection to bypass security rules constraints)
  useEffect(() => {
    if (!db || !user || firebaseError) return;

    setLoading(true);
    const habitsRef = collection(db, 'habits');
    const habitsQuery = query(
      habitsRef, 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(habitsQuery, (snapshot) => {
      const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter tasks for the selected date
      const taskList = allItems.filter(item => item.type === 'dev_task' && item.date === selectedDate);
      taskList.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      setTasks(taskList);

      // Filter goals
      const goalList = allItems.filter(item => item.type === 'dev_goal');
      goalList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setGoals(goalList);

      // Filter journal for the selected date
      const journalEntry = allItems.find(item => item.type === 'dev_journal' && item.date === selectedDate);
      setJournalText(journalEntry ? journalEntry.text : '');

      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error cargando datos del hub:', err);
      setError("Error al cargar los datos: " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedDate]);

  // Sync local text when database updates, but not when user is actively typing
  useEffect(() => {
    if (!isEditingJournal) {
      setLocalJournalText(journalText);
    }
  }, [journalText, isEditingJournal]);

  // Group goals by category
  const groupedGoals = useMemo(() => {
    return {
      liquidcars: goals.filter(g => g.category === 'liquidcars'),
      developer: goals.filter(g => g.category === 'developer')
    };
  }, [goals]);

  // 4. Task Operations
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;

    try {
      const taskId = generateId();
      const newTask = {
        id: taskId,
        userId: user.uid,
        name: newTaskText.trim(),
        text: newTaskText.trim(),
        completed: false,
        date: selectedDate,
        createdAt: new Date().toISOString(),
        type: 'dev_task',
        order: 0
      };

      await setDoc(doc(db, 'habits', taskId), newTask);
      setNewTaskText('');
      setError(null);
    } catch (err) {
      console.error('Error agregando tarea:', err);
      setError("No se pudo agregar la tarea: " + err.message);
    }
  };

  const handleToggleTask = async (task) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'habits', task.id), {
        completed: !task.completed
      });
    } catch (err) {
      console.error('Error modificando tarea:', err);
      setError("No se pudo actualizar el estado de la tarea: " + err.message);
    }
  };

  const handleMoveToNextDay = async (task) => {
    if (!user) return;
    try {
      // Calculate next day date string using local split representation
      const [year, month, day] = task.date.split('-').map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() + 1);
      
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');
      const nextDayStr = `${y}-${m}-${d}`;

      await updateDoc(doc(db, 'habits', task.id), {
        date: nextDayStr
      });
      setError(null);
    } catch (err) {
      console.error('Error al mover tarea:', err);
      setError("No se pudo mover la tarea al día siguiente: " + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return;
    try {
      await deleteDoc(doc(db, 'habits', taskId));
      setError(null);
    } catch (err) {
      console.error('Error al eliminar tarea:', err);
      setError("No se pudo eliminar la tarea: " + err.message);
    }
  };

  // 5. Goal Operations
  const handleAddGoal = async (category) => {
    if (!newGoalText.trim() || !user) return;

    try {
      const goalId = generateId();
      const newGoal = {
        id: goalId,
        userId: user.uid,
        name: newGoalText.trim(),
        text: newGoalText.trim(),
        category,
        createdAt: new Date().toISOString(),
        type: 'dev_goal',
        order: 0
      };

      await setDoc(doc(db, 'habits', goalId), newGoal);
      setNewGoalText('');
      setActiveAddCategory(null);
      setError(null);
    } catch (err) {
      console.error('Error al agregar objetivo:', err);
      setError("No se pudo agregar el objetivo: " + err.message);
    }
  };

  const handleStartEditGoal = (goal) => {
    setEditingGoalId(goal.id);
    setEditingGoalText(goal.text);
  };

  const handleSaveGoalEdit = async (goalId) => {
    if (!editingGoalText.trim() || !user) return;
    try {
      await updateDoc(doc(db, 'habits', goalId), {
        text: editingGoalText.trim(),
        name: editingGoalText.trim()
      });
      setEditingGoalId(null);
      setEditingGoalText('');
      setError(null);
    } catch (err) {
      console.error('Error al guardar objetivo:', err);
      setError("No se pudo guardar el objetivo: " + err.message);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este objetivo?")) return;
    try {
      await deleteDoc(doc(db, 'habits', goalId));
      setError(null);
    } catch (err) {
      console.error('Error al eliminar objetivo:', err);
      setError("No se pudo eliminar el objetivo: " + err.message);
    }
  };

  // 6. Journal Operations
  const handleSaveJournal = async () => {
    if (!user) return;
    setIsSavingJournal(true);
    try {
      const jId = `${user.uid}_${selectedDate}_journal`;
      await setDoc(doc(db, 'habits', jId), {
        id: jId,
        userId: user.uid,
        name: `Journal ${selectedDate}`,
        text: localJournalText,
        type: 'dev_journal',
        date: selectedDate,
        createdAt: new Date().toISOString(),
        order: 0
      });
      setError(null);
    } catch (err) {
      console.error('Error al guardar diario:', err);
      setError("No se pudo guardar el diario: " + err.message);
    } finally {
      setIsSavingJournal(false);
    }
  };

  // 7. Helpers
  const shiftDate = (days) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    currentDate.setDate(currentDate.getDate() + days);
    
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const formatDateLabel = (dateString) => {
    if (dateString === today) return 'Hoy';
    
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-purple-600 font-medium">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      
      {/* Header Section */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl text-purple-600 shadow-sm border border-purple-200">
            <Code className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
              Developer Hub
            </h1>
            <p className="text-gray-500 text-sm">Tu espacio de control diario</p>
          </div>
        </div>

        {/* Date Selector widget */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Día anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 text-center min-w-[140px] flex flex-col items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="text-sm font-bold text-purple-600 bg-transparent border-none focus:outline-none cursor-pointer text-center p-0 h-auto w-[130px] focus:ring-0"
            />
            <span className="text-[10px] text-gray-400 font-mono mt-0.5">
              {formatDateLabel(selectedDate)}
            </span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Día siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {selectedDate !== today && (
            <button
              onClick={() => setSelectedDate(today)}
              className="text-xs px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-sm"
            >
              Hoy
            </button>
          )}
        </div>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex justify-between items-center text-red-700 text-sm animate-in fade-in duration-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PANEL: Daily items stacked vertically (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-8 w-full">
          
          {/* Card 1: To-Do List */}
          <section className="bg-white rounded-2xl p-6 shadow-lg border border-gray-150 relative overflow-hidden group/tasks w-full">
            
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <Layers className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Tareas Diarias</h2>
              <span className="ml-auto text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="space-y-3 min-h-[250px] flex flex-col justify-between">
                
                {/* Tasks List */}
                <div className="space-y-2.5">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-center justify-between gap-3 p-3.5 bg-white border rounded-xl hover:border-purple-200 hover:shadow-sm transition-all duration-300 group/item ${
                        task.completed 
                          ? 'border-gray-100 opacity-60 bg-gray-50/50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="flex-shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
                          title={task.completed ? "Marcar incompleto" : "Completar"}
                        >
                          {task.completed ? (
                            <CheckSquare className="w-5 h-5 text-purple-600 fill-purple-100/30" />
                          ) : (
                            <Square className="w-5 h-5 hover:scale-105 transition-transform" />
                          )}
                        </button>

                        <span className={`text-sm truncate pr-2 ${
                          task.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'
                        }`}>
                          {task.text}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => handleMoveToNextDay(task)}
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-500 hover:text-purple-600 transition-colors border border-transparent hover:border-purple-200"
                          title="Mover al día siguiente"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {tasks.length === 0 && (
                    <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No tienes tareas para este día.</p>
                      <p className="text-[10px] text-gray-500 mt-1">Escribe abajo para añadir una.</p>
                    </div>
                  )}
                </div>

                {/* Inline task creator placeholder */}
                <form 
                  onSubmit={handleAddTask} 
                  className="mt-6 flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-200 focus-within:border-purple-400 focus-within:bg-white focus-within:shadow-inner transition-all duration-300"
                >
                  <div className="flex-shrink-0 text-gray-400">
                    <Square className="w-5 h-5 opacity-50" />
                  </div>
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Nueva tarea"
                    className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full font-medium"
                  />
                  {newTaskText.trim() && (
                    <button
                      type="submit"
                      className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center animate-in scale-in duration-200 shadow-md shadow-purple-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </form>

              </div>
            )}
          </section>

          {/* Card 2: DEV Journal */}
          <section className="bg-white rounded-2xl p-6 shadow-lg border border-gray-150 relative overflow-hidden group/journal w-full">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Diario de DEV</h2>
              {isSavingJournal ? (
                <span className="ml-auto text-xs text-purple-600 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </span>
              ) : (
                <span className="ml-auto text-xs text-gray-450">
                  Auto-guarda al hacer clic fuera
                </span>
              )}
            </div>

            <div className="space-y-4">
              <textarea
                value={localJournalText}
                onChange={(e) => setLocalJournalText(e.target.value)}
                onFocus={() => setIsEditingJournal(true)}
                onBlur={() => {
                  setIsEditingJournal(false);
                  handleSaveJournal();
                }}
                placeholder="¿Qué has aprendido hoy? ¿Alguna duda, problemas o puntos de mejora?"
                className="w-full min-h-[160px] p-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:border-purple-400 focus:bg-white focus:outline-none text-sm text-gray-700 placeholder-gray-400 font-medium transition-all duration-300 resize-y"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveJournal}
                  disabled={isSavingJournal}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-purple-100 hover:shadow-md flex items-center gap-2 disabled:opacity-50"
                  title="Guardar diario"
                >
                  <Save className="w-4 h-4" />
                  {isSavingJournal ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT PANEL: Persistent items (Goals) (4 columns) */}
        <section className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-lg border border-gray-150 relative overflow-hidden group/goals w-full">
          
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">Objetivos</h2>
          </div>

          <div className="space-y-6">
            
            {/* Category: Liquidcars */}
            <div className="bg-purple-50/30 rounded-xl p-4 border border-purple-100/70">
              <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-2">
                <h3 className="text-sm font-bold tracking-wider uppercase text-purple-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  Liquidcars
                </h3>
                <button
                  onClick={() => {
                    setActiveAddCategory(activeAddCategory === 'liquidcars' ? null : 'liquidcars');
                    setNewGoalText('');
                  }}
                  className={`p-1 hover:bg-purple-100/50 rounded text-purple-600 hover:text-purple-800 transition-colors border ${
                    activeAddCategory === 'liquidcars' ? 'border-purple-300 bg-purple-100/50' : 'border-transparent'
                  }`}
                  title="Añadir objetivo"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Goal Input Creator */}
              {activeAddCategory === 'liquidcars' && (
                <div className="mb-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="Nuevo objetivo de Liquidcars..."
                    className="bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500/50 flex-1 shadow-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal('liquidcars')}
                    autoFocus
                  />
                  <button 
                    onClick={() => handleAddGoal('liquidcars')}
                    className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setActiveAddCategory(null)}
                    className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* List Liquidcars Goals */}
              <div className="space-y-2">
                {groupedGoals.liquidcars.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between gap-2 py-1.5 group/goal-row border-b border-purple-100/30 last:border-0">
                    {editingGoalId === goal.id ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                        <input
                          type="text"
                          value={editingGoalText}
                          onChange={(e) => setEditingGoalText(e.target.value)}
                          className="bg-white border border-purple-300 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:border-purple-500 flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveGoalEdit(goal.id)}
                          autoFocus
                        />
                        <button 
                          onClick={() => handleSaveGoalEdit(goal.id)}
                          className="p-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => setEditingGoalId(null)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-md transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-purple-900 pl-1 list-item list-inside flex-1 leading-relaxed font-medium">
                          {goal.text}
                        </span>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/goal-row:opacity-100 transition-opacity duration-200 flex-shrink-0">
                          <button
                            onClick={() => handleStartEditGoal(goal)}
                            className="p-1 hover:bg-purple-100 rounded text-purple-500 hover:text-purple-700 transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 hover:bg-purple-100 rounded text-purple-500 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {groupedGoals.liquidcars.length === 0 && (
                  <p className="text-purple-400 text-xs italic py-2 pl-1">No hay objetivos registrados.</p>
                )}
              </div>
            </div>

            {/* Category: Developer */}
            <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100/70">
              <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2">
                <h3 className="text-sm font-bold tracking-wider uppercase text-indigo-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  Developer
                </h3>
                <button
                  onClick={() => {
                    setActiveAddCategory(activeAddCategory === 'developer' ? null : 'developer');
                    setNewGoalText('');
                  }}
                  className={`p-1 hover:bg-indigo-100/50 rounded text-indigo-600 hover:text-indigo-800 transition-colors border ${
                    activeAddCategory === 'developer' ? 'border-indigo-300 bg-indigo-100/50' : 'border-transparent'
                  }`}
                  title="Añadir objetivo"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Goal Input Creator */}
              {activeAddCategory === 'developer' && (
                <div className="mb-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="Nuevo objetivo Developer..."
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 flex-1 shadow-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal('developer')}
                    autoFocus
                  />
                  <button 
                    onClick={() => handleAddGoal('developer')}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setActiveAddCategory(null)}
                    className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* List Developer Goals */}
              <div className="space-y-2">
                {groupedGoals.developer.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between gap-2 py-1.5 group/goal-row border-b border-indigo-100/30 last:border-0">
                    {editingGoalId === goal.id ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                        <input
                          type="text"
                          value={editingGoalText}
                          onChange={(e) => setEditingGoalText(e.target.value)}
                          className="bg-white border border-indigo-300 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:border-indigo-500 flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveGoalEdit(goal.id)}
                          autoFocus
                        />
                        <button 
                          onClick={() => handleSaveGoalEdit(goal.id)}
                          className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => setEditingGoalId(null)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-md transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-indigo-900 pl-1 list-item list-inside flex-1 leading-relaxed font-medium">
                          {goal.text}
                        </span>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/goal-row:opacity-100 transition-opacity duration-200 flex-shrink-0">
                          <button
                            onClick={() => handleStartEditGoal(goal)}
                            className="p-1 hover:bg-indigo-100 rounded text-indigo-500 hover:text-indigo-700 transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 hover:bg-indigo-100 rounded text-indigo-500 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {groupedGoals.developer.length === 0 && (
                  <p className="text-indigo-400 text-xs italic py-2 pl-1">No hay objetivos registrados.</p>
                )}
              </div>
            </div>

          </div>
        </section>

      </div>

    </div>
  );
}
