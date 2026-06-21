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
  Zap,
  Target,
} from 'lucide-react';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function DeveloperHub() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date (shared across all modules)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const today = new Date().toISOString().split('T')[0];

  // Work tasks
  const [workTasks, setWorkTasks] = useState([]);
  const [newWorkText, setNewWorkText] = useState('');

  // Study tasks
  const [studyTasks, setStudyTasks] = useState([]);
  const [newStudyText, setNewStudyText] = useState('');

  // Goals
  const [goals, setGoals] = useState([]);
  const [activeAddCategory, setActiveAddCategory] = useState(null);
  const [newGoalText, setNewGoalText] = useState('');
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingGoalText, setEditingGoalText] = useState('');

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth || firebaseError) {
      setError('Firebase no está configurado correctamente. Verifica tu archivo .env');
      setAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(
      auth,
      (u) => { setUser(u); setAuthLoading(false); },
      (err) => { setError(`Error de autenticación: ${err.message}`); setAuthLoading(false); }
    );
    return () => unsub();
  }, []);

  // ── Firestore listener ─────────────────────────────────────────
  useEffect(() => {
    if (!db || !user || firebaseError) return;
    setLoading(true);

    const unsub = onSnapshot(
      query(collection(db, 'habits'), where('userId', '==', user.uid)),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const byDate = (type) =>
          all
            .filter((i) => i.type === type && i.date === selectedDate)
            .sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1;
              return new Date(a.createdAt) - new Date(b.createdAt);
            });

        setWorkTasks(byDate('dev_task'));
        setStudyTasks(byDate('study_task'));
        setGoals(
          all
            .filter((i) => i.type === 'dev_goal')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        );
        setLoading(false);
        setError(null);
      },
      (err) => { setError('Error al cargar los datos: ' + err.message); setLoading(false); }
    );
    return () => unsub();
  }, [user, selectedDate]);

  const groupedGoals = useMemo(() => ({
    liquidcars: goals.filter((g) => g.category === 'liquidcars'),
    developer: goals.filter((g) => g.category === 'developer'),
  }), [goals]);

  // ── Generic task helpers ───────────────────────────────────────
  const addTask = async (text, type, setter) => {
    if (!text.trim() || !user) return;
    try {
      const id = generateId();
      await setDoc(doc(db, 'habits', id), {
        id, userId: user.uid,
        name: text.trim(), text: text.trim(),
        completed: false, date: selectedDate,
        createdAt: new Date().toISOString(), type, order: 0,
      });
      setter('');
    } catch (err) { setError('No se pudo agregar la tarea: ' + err.message); }
  };

  const toggleTask = async (task) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'habits', task.id), { completed: !task.completed }); }
    catch (err) { setError('No se pudo actualizar la tarea: ' + err.message); }
  };

  const moveToNextDay = async (task) => {
    if (!user) return;
    try {
      const [y, m, d] = task.date.split('-').map(Number);
      const next = new Date(y, m - 1, d + 1);
      const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      await updateDoc(doc(db, 'habits', task.id), { date: nextStr });
    } catch (err) { setError('No se pudo mover la tarea: ' + err.message); }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    try { await deleteDoc(doc(db, 'habits', taskId)); }
    catch (err) { setError('No se pudo eliminar la tarea: ' + err.message); }
  };

  // ── Goal helpers ───────────────────────────────────────────────
  const handleAddGoal = async (category) => {
    if (!newGoalText.trim() || !user) return;
    try {
      const id = generateId();
      await setDoc(doc(db, 'habits', id), {
        id, userId: user.uid,
        name: newGoalText.trim(), text: newGoalText.trim(),
        category, createdAt: new Date().toISOString(), type: 'dev_goal', order: 0,
      });
      setNewGoalText(''); setActiveAddCategory(null);
    } catch (err) { setError('No se pudo agregar el objetivo: ' + err.message); }
  };

  const handleSaveGoalEdit = async (goalId) => {
    if (!editingGoalText.trim() || !user) return;
    try {
      await updateDoc(doc(db, 'habits', goalId), { text: editingGoalText.trim(), name: editingGoalText.trim() });
      setEditingGoalId(null); setEditingGoalText('');
    } catch (err) { setError('No se pudo guardar el objetivo: ' + err.message); }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('¿Eliminar este objetivo?')) return;
    try { await deleteDoc(doc(db, 'habits', goalId)); }
    catch (err) { setError('No se pudo eliminar el objetivo: ' + err.message); }
  };

  // ── Date helpers ───────────────────────────────────────────────
  const shiftDate = (days) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const nd = new Date(y, m - 1, d + days);
    setSelectedDate(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`);
  };

  const formatDateLabel = (ds) => {
    if (ds === today) return 'Hoy';
    const [y, m, d] = ds.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // ── Auth loading guard ─────────────────────────────────────────
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

  // ── Reusable task card renderer ────────────────────────────────
  const TaskList = ({ tasks, newText, setNewText, type, accentColor, placeholder }) => {
    const colors = {
      purple: {
        icon: 'text-purple-600', ring: 'focus-within:border-purple-400', btn: 'bg-purple-600 hover:bg-purple-700',
        check: 'text-purple-500', hover: 'hover:border-purple-200', action: 'hover:bg-purple-50 hover:text-purple-600',
        badge: 'bg-gray-50 border-gray-200 text-gray-500',
      },
      indigo: {
        icon: 'text-indigo-600', ring: 'focus-within:border-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700',
        check: 'text-indigo-500', hover: 'hover:border-indigo-200', action: 'hover:bg-indigo-50 hover:text-indigo-600',
        badge: 'bg-gray-50 border-gray-200 text-gray-500',
      },
    }[accentColor];

    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 p-3.5 bg-white border rounded-xl transition-all duration-200 group/item ${
                task.completed ? 'border-gray-100 opacity-60 bg-gray-50/50' : `border-gray-200 ${colors.hover} hover:shadow-sm`
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => toggleTask(task)}
                  className={`flex-shrink-0 text-gray-300 ${colors.check.replace('text-', 'hover:text-')} transition-colors`}
                >
                  {task.completed
                    ? <CheckSquare className={`w-5 h-5 ${colors.check}`} />
                    : <Square className="w-5 h-5" />
                  }
                </button>
                <span className={`text-sm flex-1 min-w-0 truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                  {task.text}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => moveToNextDay(task)}
                  className={`p-1.5 rounded-lg text-gray-400 ${colors.action} transition-colors`}
                  title="Mover al día siguiente"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Sin tareas para hoy</p>
              <p className="text-gray-400 text-xs mt-1">Escribe abajo para añadir una</p>
            </div>
          )}
        </div>

        {/* Inline creator */}
        <form
          onSubmit={(e) => { e.preventDefault(); addTask(newText, type, setNewText); }}
          className={`flex items-center gap-3 p-3.5 bg-gray-50/50 rounded-xl border border-gray-200 ${colors.ring} focus-within:bg-white focus-within:shadow-inner transition-all duration-200`}
        >
          <Square className="w-4 h-4 text-gray-300 flex-shrink-0 opacity-60" />
          <input
            type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
            placeholder={placeholder}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none flex-1 font-medium"
          />
          {newText.trim() && (
            <button type="submit" className={`p-1.5 ${colors.btn} text-white rounded-lg transition-colors shadow-sm`}>
              <Plus className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    );
  };

  // ── Goal category block ────────────────────────────────────────
  const GoalCategory = ({ categoryKey, label, accent, catGoals }) => {
    const c = {
      purple: { bg: 'bg-purple-50/40', border: 'border-purple-100', hb: 'border-purple-100', title: 'text-purple-700', dot: 'bg-purple-500', input: 'border-purple-200 focus:border-purple-400', addBtn: 'bg-purple-600 hover:bg-purple-700', rowBorder: 'border-purple-100/50', txt: 'text-purple-900', rowAction: 'hover:bg-purple-100 text-purple-400 hover:text-purple-700', empty: 'text-purple-300', addToggle: 'text-purple-400 hover:bg-purple-100/60' },
      indigo: { bg: 'bg-indigo-50/40', border: 'border-indigo-100', hb: 'border-indigo-100', title: 'text-indigo-700', dot: 'bg-indigo-500', input: 'border-indigo-200 focus:border-indigo-400', addBtn: 'bg-indigo-600 hover:bg-indigo-700', rowBorder: 'border-indigo-100/50', txt: 'text-indigo-900', rowAction: 'hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700', empty: 'text-indigo-300', addToggle: 'text-indigo-400 hover:bg-indigo-100/60' },
    }[accent];

    return (
      <div className={`rounded-xl p-4 ${c.bg} border ${c.border}`}>
        <div className={`flex items-center justify-between mb-3 pb-2 border-b ${c.hb}`}>
          <h3 className={`text-xs font-bold tracking-widest uppercase ${c.title} flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} inline-block`} />
            {label}
          </h3>
          <button
            onClick={() => { setActiveAddCategory(activeAddCategory === categoryKey ? null : categoryKey); setNewGoalText(''); }}
            className={`p-1 rounded transition-colors border ${activeAddCategory === categoryKey ? `${c.border} ${c.bg} ${c.title}` : `border-transparent ${c.addToggle}`}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeAddCategory === categoryKey && (
          <div className="mb-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
            <input
              type="text" value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)}
              placeholder="Nuevo objetivo…"
              className={`flex-1 bg-white border ${c.input} rounded-lg px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none shadow-sm`}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGoal(categoryKey)} autoFocus
            />
            <button onClick={() => handleAddGoal(categoryKey)} className={`p-1.5 ${c.addBtn} text-white rounded-lg transition-colors`}><Check className="w-3 h-3" /></button>
            <button onClick={() => setActiveAddCategory(null)} className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"><X className="w-3 h-3" /></button>
          </div>
        )}

        <div className="space-y-1">
          {catGoals.map((goal) => (
            <div key={goal.id} className={`flex items-center gap-2 group/goal py-1.5 border-b ${c.rowBorder} last:border-0`}>
              {editingGoalId === goal.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text" value={editingGoalText} onChange={(e) => setEditingGoalText(e.target.value)}
                    className={`flex-1 bg-white border ${c.input} rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none`}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGoalEdit(goal.id)} autoFocus
                  />
                  <button onClick={() => handleSaveGoalEdit(goal.id)} className={`p-1 ${c.addBtn} text-white rounded transition-colors`}><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingGoalId(null)} className="p-1 bg-gray-200 text-gray-600 rounded transition-colors"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <>
                  <span className={`text-xs ${c.txt} flex-1 font-medium leading-relaxed`}>• {goal.text}</span>
                  <div className="flex gap-1 opacity-0 group-hover/goal:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditingGoalId(goal.id); setEditingGoalText(goal.text); }} className={`p-1 rounded ${c.rowAction} transition-colors`}><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {catGoals.length === 0 && <p className={`${c.empty} text-xs italic py-1`}>Sin objetivos aún.</p>}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">

      {/* ── Header ── */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl text-purple-600 shadow-sm border border-purple-200">
            <Code className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">Developer Hub</h1>
            <p className="text-gray-500 text-sm">Tu espacio de control diario</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
          <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" title="Día anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 text-center min-w-[140px] flex flex-col items-center">
            <input
              type="date" value={selectedDate}
              onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
              className="text-sm font-bold text-purple-600 bg-transparent border-none focus:outline-none cursor-pointer text-center p-0 w-[130px] focus:ring-0"
            />
            <span className="text-[10px] text-gray-400 font-mono mt-0.5">{formatDateLabel(selectedDate)}</span>
          </div>
          <button onClick={() => shiftDate(1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" title="Día siguiente">
            <ChevronRight className="w-5 h-5" />
          </button>
          {selectedDate !== today && (
            <button onClick={() => setSelectedDate(today)} className="text-xs px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-sm">
              Hoy
            </button>
          )}
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex justify-between items-center text-red-700 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LAYOUT: 2 columns
          LEFT (8/12): Sprint del Día + Foco de Estudio apilados
          RIGHT (4/12): Objetivos
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT: tareas apiladas ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* ── Sprint del Día (Trabajo) ── */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">Sprint del Día</h2>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">Tareas de trabajo</p>
              </div>
              <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {workTasks.length} {workTasks.length === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
              </div>
            ) : (
              <TaskList
                tasks={workTasks}
                newText={newWorkText}
                setNewText={setNewWorkText}
                type="dev_task"
                accentColor="purple"
                placeholder="Nueva tarea de trabajo…"
              />
            )}
          </section>

          {/* ── Foco de Estudio ── */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Target className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">Foco de Estudio</h2>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">Tareas de aprendizaje</p>
              </div>
              <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {studyTasks.length} {studyTasks.length === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              </div>
            ) : (
              <TaskList
                tasks={studyTasks}
                newText={newStudyText}
                setNewText={setNewStudyText}
                type="study_task"
                accentColor="indigo"
                placeholder="Nueva tarea de estudio…"
              />
            )}
          </section>

        </div>

        {/* ── RIGHT: Objetivos ── */}
        <section className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Briefcase className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 leading-tight">Objetivos</h2>
              <p className="text-[11px] text-gray-400 font-medium leading-tight">Metas persistentes</p>
            </div>
          </div>

          <div className="space-y-4">
            <GoalCategory categoryKey="liquidcars" label="Liquidcars" accent="purple" catGoals={groupedGoals.liquidcars} />
            <GoalCategory categoryKey="developer"  label="Developer"  accent="indigo"  catGoals={groupedGoals.developer}  />
          </div>
        </section>

      </div>
    </div>
  );
}
