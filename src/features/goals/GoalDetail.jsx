/* eslint-disable react/prop-types */
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, firebaseError } from '../../firebase';
import { 
  Loader2, ArrowLeft, Plus, Check, Trash2, Edit3, X, MapPin, 
  Target, Info
} from 'lucide-react';

// UUID v4 helper generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // SVG connections state
  const [lines, setLines] = useState([]);
  
  // Inline adding states
  const [newSubgoalName, setNewSubgoalName] = useState('');
  const [isAddingSubgoal, setIsAddingSubgoal] = useState(false);
  const [newStepNames, setNewStepNames] = useState({}); // { [subgoalId]: string }
  const [addingStepId, setAddingStepId] = useState(null); // ID of subgoal currently adding a step

  // Editing states
  const [editingSubgoalId, setEditingSubgoalId] = useState(null);
  const [editSubgoalName, setEditSubgoalName] = useState('');
  const [selectedSubgoalId, setSelectedSubgoalId] = useState(null);

  // Link resource states
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Description / notes auto-save local state
  const [localDesc, setLocalDesc] = useState('');
  const prevSubgoalIdRef = useRef(null);
  
  const boardRef = useRef(null);

  // 1. Auth check
  useEffect(() => {
    if (!auth || firebaseError) {
      setError('Firebase no está configurado.');
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    }, (err) => {
      console.error(err);
      setError('Error de autenticación.');
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Roadmap document
  useEffect(() => {
    if (!db || !user || !id) return;
    
    setLoading(true);
    const docRef = doc(db, 'habits', id);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId !== user.uid) {
          setError('No tienes permiso para ver este objetivo.');
        } else {
          setRoadmap({ id: docSnap.id, ...data });
          setError(null);
        }
      } else {
        setError('El objetivo solicitado no existe.');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching roadmap detail:', err);
      setError('Error al conectar con la base de datos.');
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [id, user]);

  // 2.5 Close drawer if the selected subgoal is deleted
  useEffect(() => {
    if (roadmap && selectedSubgoalId) {
      const exists = (roadmap.subgoals || []).some(s => s.id === selectedSubgoalId);
      if (!exists) {
        setSelectedSubgoalId(null);
      }
    }
  }, [roadmap, selectedSubgoalId]);

  // Synchronize description local state when selectedSubgoalId changes
  useEffect(() => {
    if (roadmap && selectedSubgoalId) {
      const subgoal = (roadmap.subgoals || []).find(s => s.id === selectedSubgoalId);
      if (subgoal && selectedSubgoalId !== prevSubgoalIdRef.current) {
        setLocalDesc(subgoal.description || '');
        prevSubgoalIdRef.current = selectedSubgoalId;
      }
    } else {
      prevSubgoalIdRef.current = null;
    }
  }, [selectedSubgoalId, roadmap]);

  const saveDescription = () => {
    if (selectedSubgoalId) {
      handleUpdateSubgoalNotes(selectedSubgoalId, localDesc);
    }
  };

  // 3. SVG Line Calculation Logic
  const recalculateLines = useCallback(() => {
    const container = boardRef.current;
    if (!container || !roadmap) return;

    const containerRect = container.getBoundingClientRect();
    const rootDot = document.getElementById('root-connector');
    const computedLines = [];

    if (rootDot && roadmap.subgoals) {
      const rRect = rootDot.getBoundingClientRect();
      const rx = rRect.left - containerRect.left + rRect.width / 2;
      const ry = rRect.top - containerRect.top + rRect.height / 2;

      roadmap.subgoals.forEach((subgoal) => {
        const subLeftDot = document.getElementById(`subgoal-left-${subgoal.id}`);
        if (subLeftDot) {
          const slRect = subLeftDot.getBoundingClientRect();
          const slx = slRect.left - containerRect.left + slRect.width / 2;
          const sly = slRect.top - containerRect.top + slRect.height / 2;
          
          // Un subobjetivo está completo si tiene pasos y todos están completados
          const hasSteps = subgoal.steps && subgoal.steps.length > 0;
          const isCompleted = hasSteps && subgoal.steps.every(s => s.completed);

          computedLines.push({
            id: `root-to-${subgoal.id}`,
            x1: rx,
            y1: ry,
            x2: slx,
            y2: sly,
            completed: isCompleted
          });
        }
      });
    }

    setLines(computedLines);
  }, [roadmap]);

  // Recalculate positions on data load, edits, resizing
  useLayoutEffect(() => {
    if (!loading && roadmap) {
      const handle = requestAnimationFrame(() => {
        recalculateLines();
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [loading, roadmap, recalculateLines]);

  useEffect(() => {
    window.addEventListener('resize', recalculateLines);
    return () => window.removeEventListener('resize', recalculateLines);
  }, [recalculateLines]);

  // Helper: Recalcula porcentajes totales y subobjetivos
  const updateRoadmapData = async (updatedSubgoals) => {
    if (!db || !id) return;
    
    // Calcular porcentaje de cada subobjetivo
    const subgoals = updatedSubgoals.map(s => {
      const stepsCount = s.steps?.length || 0;
      const completedSteps = s.steps?.filter(st => st.completed).length || 0;
      const pctg = stepsCount > 0 ? Math.round((completedSteps / stepsCount) * 100) : 0;
      return { ...s, pctg };
    });

    // Calcular porcentaje total
    const totalSteps = subgoals.reduce((acc, s) => acc + (s.steps?.length || 0), 0);
    const totalCompleted = subgoals.reduce((acc, s) => acc + (s.steps?.filter(st => st.completed).length || 0), 0);
    const pctg = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

    try {
      await updateDoc(doc(db, 'habits', id), {
        subgoals,
        pctg,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating roadmap database:', err);
      alert('Error al guardar los cambios en la base de datos.');
    }
  };

  // ── Database Operations ──────────────────────────────────────────

  // Agregar Subobjetivo
  const handleAddSubgoal = async (e) => {
    e.preventDefault();
    if (!newSubgoalName.trim()) return;

    const newSub = {
      id: generateUUID(),
      name: newSubgoalName.trim(),
      pctg: 0,
      steps: []
    };

    const list = [...(roadmap.subgoals || []), newSub];
    setNewSubgoalName('');
    setIsAddingSubgoal(false);
    await updateRoadmapData(list);
  };

  // Eliminar Subobjetivo
  const handleDeleteSubgoal = async (subgoalId) => {
    if (!window.confirm('¿Eliminar este subobjetivo y todos sus pasos?')) return;
    const list = (roadmap.subgoals || []).filter(s => s.id !== subgoalId);
    await updateRoadmapData(list);
  };

  // Renombrar Subobjetivo
  const saveRenameSubgoal = async (subgoalId) => {
    if (!editSubgoalName.trim()) return;
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        return { ...s, name: editSubgoalName.trim() };
      }
      return s;
    });
    setEditingSubgoalId(null);
    await updateRoadmapData(list);
  };

  // Agregar Paso
  const handleAddStep = async (subgoalId) => {
    const stepName = newStepNames[subgoalId];
    if (!stepName || !stepName.trim()) return;

    const newStep = {
      id: generateUUID(),
      name: stepName.trim(),
      completed: false
    };

    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        const steps = [...(s.steps || []), newStep];
        return { ...s, steps };
      }
      return s;
    });

    setNewStepNames(prev => ({ ...prev, [subgoalId]: '' }));
    setAddingStepId(null);
    await updateRoadmapData(list);
  };

  // Eliminar Paso
  const handleDeleteStep = async (subgoalId, stepId) => {
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        const steps = (s.steps || []).filter(st => st.id !== stepId);
        return { ...s, steps };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // Toggle completar Paso
  const handleToggleStep = async (subgoalId, stepId) => {
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        const steps = (s.steps || []).map(st => {
          if (st.id === stepId) {
            return { ...st, completed: !st.completed };
          }
          return st;
        });
        return { ...s, steps };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // Renombrar Paso Inline (al salir del input o pulsar Enter)
  const handleRenameStep = async (subgoalId, stepId, newName) => {
    if (!newName.trim()) return;
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        const steps = (s.steps || []).map(st => {
          if (st.id === stepId) {
            return { ...st, name: newName.trim() };
          }
          return st;
        });
        return { ...s, steps };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // Actualizar Notas/Descripción de un Subobjetivo
  const handleUpdateSubgoalNotes = async (subgoalId, description) => {
    if (!roadmap) return;
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        return { ...s, description };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // Añadir un enlace de recurso a un Subobjetivo
  const handleAddSubgoalLink = async (subgoalId, title, url) => {
    if (!roadmap || !title.trim() || !url.trim()) return;

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newLink = {
      id: generateUUID(),
      title: title.trim(),
      url: formattedUrl
    };

    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        const links = [...(s.links || []), newLink];
        return { ...s, links };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // Eliminar un enlace de recurso de un Subobjetivo
  const handleDeleteSubgoalLink = async (subgoalId, linkId) => {
    if (!roadmap) return;
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        const links = (s.links || []).filter(l => l.id !== linkId);
        return { ...s, links };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // ── Render Helpers ──────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-emerald-600 font-medium">Cargando el mapa de objetivos...</p>
        </div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl max-w-md mx-auto mb-6">
          {error || 'El objetivo no pudo ser encontrado.'}
        </div>
        <button
          onClick={() => navigate('/goals')}
          className="inline-flex items-center gap-2 bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Goals
        </button>
      </div>
    );
  }

  // Estadísticas generales para mostrar en cabecera
  const subgoalsCount = roadmap.subgoals?.length || 0;
  const totalSteps = roadmap.subgoals?.reduce((acc, s) => acc + (s.steps?.length || 0), 0) || 0;
  const completedSteps = roadmap.subgoals?.reduce((acc, s) => acc + (s.steps?.filter(st => st.completed).length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 select-none overflow-x-hidden">
      <div className="w-[96%] max-w-[1600px] mx-auto px-4">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/goals')}
              className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:text-emerald-600 transition-colors"
              title="Volver al listado"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                Mapa de Ruta
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">{roadmap.name}</h1>
            </div>
          </div>
          
          {/* Resumen flotante */}
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 shadow-md flex items-center gap-6">
            <div className="text-center">
              <span className="block text-xs font-bold text-gray-400 uppercase">Subobjetivos</span>
              <span className="text-lg font-extrabold text-gray-700">{subgoalsCount}</span>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="text-center">
              <span className="block text-xs font-bold text-gray-400 uppercase">Pasos</span>
              <span className="text-lg font-extrabold text-gray-700">{completedSteps}/{totalSteps}</span>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="text-center">
              <span className="block text-xs font-bold text-gray-400 uppercase">Progreso</span>
              <span className="text-lg font-extrabold text-emerald-600">{roadmap.pctg}%</span>
            </div>
          </div>
        </div>

        {/* Tablero de Nodos Interactivos */}
        <div 
          id="node-board-container" 
          ref={boardRef}
          className="relative bg-white/40 border border-white/30 rounded-3xl p-10 min-h-[550px] flex gap-20 items-stretch z-10 overflow-hidden shadow-inner"
        >
          {/* Canvas SVG de Conexiones */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <linearGradient id="completed-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="pending-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.3" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {lines.map((line) => {
              // Curva Bézier cúbica suave
              const dx = Math.abs(line.x2 - line.x1);
              const controlOffset = Math.min(dx * 0.5, 120);
              const d = `M ${line.x1} ${line.y1} C ${line.x1 + controlOffset} ${line.y1}, ${line.x2 - controlOffset} ${line.y2}, ${line.x2} ${line.y2}`;
              
              return (
                <path
                  key={line.id}
                  d={d}
                  fill="none"
                  stroke={line.completed ? 'url(#completed-grad)' : 'url(#pending-grad)'}
                  strokeWidth={line.completed ? 4 : 2.5}
                  filter={line.completed ? 'url(#glow)' : undefined}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* COLUMNA 1: Objetivo Principal (Nodo Raíz) */}
          <div className="w-80 flex flex-col justify-center shrink-0 z-10">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative text-white flex flex-col items-center text-center">
              
              {/* Circular Progress Gauge */}
              <div className="relative mb-5 flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    stroke="#10b981" 
                    strokeWidth="8" 
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * roadmap.pctg) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black">{roadmap.pctg}%</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Meta</span>
                </div>
              </div>

              <h2 className="text-lg font-extrabold tracking-tight mb-4 leading-tight">
                {roadmap.name}
              </h2>
              
              {/* Botón / Input de Añadir Subobjetivo */}
              {isAddingSubgoal ? (
                <form onSubmit={handleAddSubgoal} className="w-full mt-2">
                  <input
                    type="text"
                    placeholder="Nuevo subobjetivo..."
                    value={newSubgoalName}
                    onChange={(e) => setNewSubgoalName(e.target.value)}
                    className="w-full text-sm bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white focus:outline-none mb-2 placeholder-gray-500"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="submit"
                      disabled={!newSubgoalName.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingSubgoal(false); setNewSubgoalName(''); }}
                      className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingSubgoal(true)}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all duration-300 transform active:scale-95 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Subobjetivo
                </button>
              )}

              {/* Conector Raíz a la derecha */}
              <div 
                id="root-connector" 
                className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg cursor-crosshair hover:scale-125 transition-transform"
                title="Conector de meta principal"
              />
            </div>
          </div>

          {/* COLUMNA 2: Subobjetivos (Grid compacta) */}
          <div className="flex-1 flex flex-col justify-center z-10">
            {roadmap.subgoals?.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-300/60 rounded-2xl bg-white/20 max-w-md mx-auto">
                <Target className="w-12 h-12 text-indigo-400 mb-2 animate-pulse" />
                <p className="text-gray-600 font-bold text-lg">Aún no hay subobjetivos</p>
                <p className="text-gray-400 text-sm mt-1">
                  {"Haz clic en \"+ Subobjetivo\" a la izquierda para subdividir tu meta principal en hitos."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto max-h-[550px] p-2">
                {roadmap.subgoals.map((subgoal) => {
                  const isSelected = selectedSubgoalId === subgoal.id;
                  
                  return (
                    <div 
                      key={subgoal.id}
                      id={`subgoal-${subgoal.id}`}
                      onClick={() => setSelectedSubgoalId(subgoal.id)}
                      className={`bg-white border-2 rounded-2xl p-5 shadow-lg relative group cursor-pointer transition-all duration-300 transform hover:scale-[1.02] flex flex-col justify-between min-h-[140px] ${
                        isSelected 
                          ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-indigo-50/20 scale-[1.01]' 
                          : 'border-white/80 hover:border-indigo-200'
                      }`}
                    >
                      {/* Conector izquierdo */}
                      <div 
                        id={`subgoal-left-${subgoal.id}`}
                        className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-white shadow-md z-10"
                      />

                      {/* Header Subobjetivo */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        {editingSubgoalId === subgoal.id ? (
                          <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editSubgoalName}
                              onChange={(e) => setEditSubgoalName(e.target.value)}
                              className="border border-indigo-400 rounded-lg px-2.5 py-1 w-full text-xs text-gray-800 font-bold focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRenameSubgoal(subgoal.id);
                                if (e.key === 'Escape') setEditingSubgoalId(null);
                              }}
                            />
                            <button
                              onClick={() => saveRenameSubgoal(subgoal.id)}
                              className="bg-indigo-500 text-white p-1.5 rounded-lg hover:bg-indigo-600 shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSubgoalId(null)}
                              className="bg-gray-100 text-gray-500 p-1.5 rounded-lg hover:bg-gray-200 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 
                              onClick={() => { setEditingSubgoalId(subgoal.id); setEditSubgoalName(subgoal.name); }}
                              className={`text-sm font-bold leading-snug line-clamp-2 pr-6 hover:text-indigo-600 cursor-pointer ${
                                isSelected ? 'text-indigo-800' : 'text-gray-800'
                              }`}
                            >
                              {subgoal.name}
                            </h3>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white/90 backdrop-blur rounded-lg p-0.5 shadow-sm border border-gray-100" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => { setEditingSubgoalId(subgoal.id); setEditSubgoalName(subgoal.name); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                                title="Renombrar subobjetivo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubgoal(subgoal.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                title="Eliminar subobjetivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        {/* Progreso del Subobjetivo */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-0.5">
                            <span>Progreso</span>
                            <span className="text-indigo-600 font-black">{subgoal.pctg}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${subgoal.pctg}%` }}
                            />
                          </div>
                        </div>

                        {/* Info adicional (Resource links & steps status) */}
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>{(subgoal.steps || []).filter(s => s.completed).length}/{(subgoal.steps || []).length} Pasos</span>
                          {subgoal.links && subgoal.links.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-extrabold normal-case">
                              {subgoal.links.length} links
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* BACKDROP Y DRAWER DETALLE (ESTILO NOTION) */}
      {(() => {
        const subgoal = (roadmap.subgoals || []).find(s => s.id === selectedSubgoalId);
        if (!subgoal) return null;

        const stepInputVal = newStepNames[subgoal.id] || '';
        const isAddingStep = addingStepId === subgoal.id;

        return (
          <>
            {/* Backdrop oscuro con blur */}
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => setSelectedSubgoalId(null)}
            />

            {/* Panel Deslizable */}
            <div 
              className="fixed inset-y-0 right-0 w-[550px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 transition-transform duration-300 ease-in-out transform translate-x-0"
            >
              {/* Header Drawer */}
              <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 bg-gray-50">
                <div className="flex-1 pr-6">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
                    Ficha del Subobjetivo
                  </span>
                  {editingSubgoalId === subgoal.id ? (
                    <div className="flex items-center gap-1.5 w-full mt-1">
                      <input
                        type="text"
                        value={editSubgoalName}
                        onChange={(e) => setEditSubgoalName(e.target.value)}
                        className="border-2 border-indigo-400 rounded-lg px-2.5 py-1 w-full text-base text-gray-800 font-extrabold focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameSubgoal(subgoal.id);
                          if (e.key === 'Escape') setEditingSubgoalId(null);
                        }}
                      />
                      <button
                        onClick={() => saveRenameSubgoal(subgoal.id)}
                        className="bg-indigo-500 text-white p-1.5 rounded-lg hover:bg-indigo-600 shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingSubgoalId(null)}
                        className="bg-gray-100 text-gray-500 p-1.5 rounded-lg hover:bg-gray-200 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 
                      onClick={() => { setEditingSubgoalId(subgoal.id); setEditSubgoalName(subgoal.name); }}
                      className="text-lg font-extrabold text-gray-800 leading-snug cursor-pointer hover:text-indigo-600 transition-colors"
                      title="Haz clic para renombrar"
                    >
                      {subgoal.name}
                    </h3>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                      <span>Progreso:</span>
                      <span className="text-indigo-600 font-black">{subgoal.pctg}%</span>
                    </div>
                    <div className="text-xs text-gray-400 font-bold">
                      {(subgoal.steps || []).filter(s => s.completed).length}/{(subgoal.steps || []).length} completados
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSubgoalId(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cuerpo Drawer (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* SECCIÓN 1: Descripción y Notas */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    Descripción y Notas
                  </h4>
                  <textarea
                    value={localDesc}
                    onChange={(e) => setLocalDesc(e.target.value)}
                    onBlur={saveDescription}
                    placeholder="Añade notas, ideas, metodologías o recordatorios de este subobjetivo... (Se guarda automáticamente al hacer click fuera)"
                    className="w-full h-24 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none transition-all resize-none bg-gray-50/50 focus:bg-white"
                  />
                </div>

                {/* SECCIÓN 2: Recursos y Enlaces Web */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Recursos y Enlaces Web
                  </h4>
                  
                  {/* Listado de Enlaces */}
                  <div className="space-y-2 mb-3">
                    {(!subgoal.links || subgoal.links.length === 0) ? (
                      <p className="text-xs text-gray-400 italic">No hay recursos web añadidos todavía.</p>
                    ) : (
                      subgoal.links.map((link) => (
                        <div key={link.id} className="flex justify-between items-center bg-gray-50 border border-gray-150 rounded-xl px-3.5 py-2 hover:bg-indigo-50/20 hover:border-indigo-100/50 transition-colors group">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 truncate max-w-[380px]"
                          >
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{link.title}</span>
                          </a>
                          <button
                            onClick={() => handleDeleteSubgoalLink(subgoal.id, link.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all shrink-0"
                            title="Eliminar recurso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Formulario Enlace */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddSubgoalLink(subgoal.id, linkTitle, linkUrl);
                      setLinkTitle('');
                      setLinkUrl('');
                    }}
                    className="bg-gray-50 border border-gray-150 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Título (ej. Curso React)"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        className="w-1/2 text-xs border border-gray-200 focus:border-indigo-400 focus:outline-none rounded-lg px-2.5 py-1.5 bg-white text-gray-800"
                        required
                      />
                      <input
                        type="text"
                        placeholder="URL (ej. react.dev)"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="w-1/2 text-xs border border-gray-200 focus:border-indigo-400 focus:outline-none rounded-lg px-2.5 py-1.5 bg-white text-gray-800"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!linkTitle.trim() || !linkUrl.trim()}
                      className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Recurso
                    </button>
                  </form>
                </div>

                {/* SECCIÓN 3: Pasos / Tareas */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Pasos del Subobjetivo
                  </h4>

                  {/* Listado de Pasos */}
                  <div className="space-y-2 mb-4">
                    {(!subgoal.steps || subgoal.steps.length === 0) ? (
                      <div className="text-center py-6 text-gray-400 text-xs italic border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
                        Sin pasos creados. Agrega tareas para calcular el progreso.
                      </div>
                    ) : (
                      subgoal.steps.map((step) => (
                        <div 
                          key={step.id}
                          id={`step-${step.id}`}
                          className={`flex items-center gap-3 bg-white border border-gray-200/80 rounded-xl p-3 shadow-sm relative group hover:shadow-md hover:border-gray-300 transition-all ${
                            step.completed 
                              ? 'bg-emerald-50/20 border-emerald-500/25' 
                              : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleStep(subgoal.id, step.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              step.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 hover:border-emerald-500'
                            }`}
                          >
                            {step.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          {/* Input editable inline */}
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => handleRenameStep(subgoal.id, step.id, e.target.value)}
                            className={`w-full text-xs font-semibold focus:outline-none bg-transparent border-b border-transparent focus:border-indigo-400 focus:ring-0 py-0.5 text-gray-700 ${
                              step.completed ? 'line-through text-gray-400 font-normal' : ''
                            }`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                            }}
                          />

                          {/* Botón de eliminación */}
                          <button
                            onClick={() => handleDeleteStep(subgoal.id, step.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-all shrink-0"
                            title="Eliminar paso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input de creación de Paso */}
                  <div>
                    {isAddingStep ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Nombre del paso..."
                          value={stepInputVal}
                          onChange={(e) => setNewStepNames(prev => ({ ...prev, [subgoal.id]: e.target.value }))}
                          className="w-full text-xs border border-gray-300 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-gray-800 font-medium focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddStep(subgoal.id);
                            if (e.key === 'Escape') setAddingStepId(null);
                          }}
                        />
                        <button
                          onClick={() => handleAddStep(subgoal.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg shrink-0 transition-colors"
                          disabled={!stepInputVal.trim()}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAddingStepId(null)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-1.5 rounded-lg shrink-0 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingStepId(subgoal.id)}
                        className="w-full flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-colors border border-indigo-100"
                      >
                        <Plus className="w-4 h-4" />
                        Añadir Paso
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
