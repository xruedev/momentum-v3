/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, firebaseError } from '../../firebase';
import { Loader2, Trash2, Edit3, Check, X, Map, Plus, ChevronRight, BarChart2 } from 'lucide-react';
import AddGoalModal from './components/AddGoalModal';

export default function GoalsList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    if (!auth || firebaseError) {
      setError('Firebase no está configurado correctamente.');
      setAuthLoading(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setLoading(false);
      }
    }, (err) => {
      console.error('Auth error:', err);
      setError('Error de autenticación.');
      setAuthLoading(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Goals (Roadmaps) from Firestore
  useEffect(() => {
    if (!db || !user || firebaseError) return;

    setLoading(true);
    const goalsRef = collection(db, 'habits');
    const goalsQuery = query(goalsRef, where('userId', '==', user.uid), where('type', '==', 'roadmap'));

    const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        // Calcular estadísticas al vuelo para asegurar consistencia
        const subgoals = data.subgoals || [];
        const totalSteps = subgoals.reduce((acc, sub) => acc + (sub.steps?.length || 0), 0);
        const completedSteps = subgoals.reduce((acc, sub) => acc + (sub.steps?.filter(s => s.completed).length || 0), 0);
        const computedPctg = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        return {
          id: doc.id,
          ...data,
          pctg: computedPctg,
          totalSteps,
          completedSteps,
          subgoalsCount: subgoals.length
        };
      }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setGoals(list);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Firestore fetch error:', err);
      setError('Error al cargar tus objetivos.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Delete Goal
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Evitar navegar al detalle
    if (!window.confirm('¿Estás seguro de que deseas eliminar este objetivo? Se borrarán todos sus subobjetivos y pasos.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'habits', id));
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('No se pudo eliminar el objetivo.');
    }
  };

  // 4. Start Inline Editing
  const startEdit = (goal, e) => {
    e.stopPropagation();
    setEditingId(goal.id);
    setEditName(goal.name);
  };

  // 5. Save Inline Edit
  const saveEdit = async (id, e) => {
    e.stopPropagation();
    if (!editName.trim()) return;

    try {
      await updateDoc(doc(db, 'habits', id), {
        name: editName.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (err) {
      console.error('Error updating goal name:', err);
      alert('No se pudo actualizar el nombre.');
    }
  };

  // 6. Cancel Inline Edit
  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-emerald-600 font-medium">Cargando tus objetivos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md mx-auto">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Map className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Goals</h1>
              <p className="text-gray-600 mt-1">Traza tu camino hacia el éxito paso a paso</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Nuevo Objetivo
          </button>
        </div>

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg mx-auto border border-gray-100">
            <Map className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No tienes objetivos creados</h3>
            <p className="text-gray-500 mb-6">
              {"Crea tu primer gran objetivo final (por ejemplo: \"Aprender desarrollo web full-stack\") y subdivídelo en pasos manejables."}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Crear mi primer objetivo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => navigate(`/goals/${goal.id}`)}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                {/* Header Card */}
                <div className="p-6">
                  <div className="flex justify-between items-start gap-2 mb-4">
                    {editingId === goal.id ? (
                      <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="border-2 border-emerald-500 rounded-lg px-2 py-1 w-full text-gray-800 font-semibold focus:outline-none text-base"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(goal.id, e);
                            if (e.key === 'Escape') cancelEdit(e);
                          }}
                        />
                        <button
                          onClick={e => saveEdit(goal.id, e)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-1.5 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-emerald-700 transition-colors line-clamp-2">
                          {goal.name}
                        </h3>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEdit(goal, e)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                            title="Renombrar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(goal.id, e)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress Ring and Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
                      <span>Progreso Completo</span>
                      <span className="text-emerald-600 font-bold">{goal.pctg}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${goal.pctg}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Stats Footer Card */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                      {goal.subgoalsCount} subobjetivos
                    </span>
                    <span>•</span>
                    <span>{goal.completedSteps}/{goal.totalSteps} pasos</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para crear un nuevo Objetivo */}
        <AddGoalModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          userId={user?.uid}
        />

      </div>
    </div>
  );
}
