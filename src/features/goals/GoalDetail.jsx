/* eslint-disable react/prop-types */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, firebaseError } from '../../firebase';
import { 
  Loader2, ArrowLeft, Plus, Check, Trash2, Edit3, X, MapPin, 
  Target, Info, FolderPlus, Folder, ChevronRight
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

  // Categories states
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Helper: Obtener lista de categorías (incluyendo virtual "Sin categoría")
  const getCategoriesList = useCallback(() => {
    if (!roadmap) return [];
    const list = [...(roadmap.categories || [])];
    
    // Check if there are any subgoals with no categoryId or an invalid categoryId
    const hasUncategorized = (roadmap.subgoals || []).some(
      s => !s.categoryId || !list.some(c => c.id === s.categoryId)
    );
    
    if (hasUncategorized) {
      list.push({ id: 'uncategorized', name: 'Sin categoría' });
    }
    
    return list;
  }, [roadmap]);

  // Validar si la categoría seleccionada sigue existiendo (p. ej. tras eliminación)
  useEffect(() => {
    if (roadmap && selectedCategoryId) {
      const cats = getCategoriesList();
      const exists = cats.some(c => c.id === selectedCategoryId);
      if (!exists) {
        setSelectedCategoryId(null);
      }
    }
  }, [roadmap, selectedCategoryId, getCategoriesList]);

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



  // Helper: Recalcula porcentajes totales y subobjetivos
  const updateRoadmapData = async (updatedSubgoals, updatedCategories = null) => {
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

    const catsToSave = updatedCategories !== null ? updatedCategories : (roadmap?.categories || []);

    try {
      await updateDoc(doc(db, 'habits', id), {
        subgoals,
        categories: catsToSave,
        pctg,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating roadmap database:', err);
      alert('Error al guardar los cambios en la base de datos.');
    }
  };

  // ── Database Operations ──────────────────────────────────────────

  // Agregar Categoría
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newCat = {
      id: generateUUID(),
      name: newCategoryName.trim()
    };

    const list = [...(roadmap.categories || []), newCat];
    setNewCategoryName('');
    setIsAddingCategory(false);
    setSelectedCategoryId(newCat.id);
    await updateRoadmapData(roadmap.subgoals || [], list);
  };

  // Eliminar Categoría
  const handleDeleteCategory = async (categoryId) => {
    if (categoryId === 'uncategorized') {
      alert('No se puede eliminar la categoría por defecto.');
      return;
    }
    
    if (!window.confirm('¿Eliminar esta categoría y todos sus subobjetivos? Esta acción no se puede deshacer.')) return;
    
    const updatedCategories = (roadmap.categories || []).filter(c => c.id !== categoryId);
    const updatedSubgoals = (roadmap.subgoals || []).filter(s => s.categoryId !== categoryId);
    
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    }
    
    await updateRoadmapData(updatedSubgoals, updatedCategories);
  };

  // Renombrar Categoría
  const saveRenameCategory = async (categoryId) => {
    if (!editCategoryName.trim()) return;
    const list = (roadmap.categories || []).map(c => {
      if (c.id === categoryId) {
        return { ...c, name: editCategoryName.trim() };
      }
      return c;
    });
    setEditingCategoryId(null);
    await updateRoadmapData(roadmap.subgoals || [], list);
  };

  // Mover Subobjetivo de Categoría
  const handleMoveSubgoal = async (subgoalId, targetCategoryId) => {
    const list = (roadmap.subgoals || []).map(s => {
      if (s.id === subgoalId) {
        return { ...s, categoryId: targetCategoryId || null };
      }
      return s;
    });
    await updateRoadmapData(list);
  };

  // Agregar Subobjetivo
  const handleAddSubgoal = async (e) => {
    e.preventDefault();
    if (!newSubgoalName.trim()) return;

    const newSub = {
      id: generateUUID(),
      name: newSubgoalName.trim(),
      categoryId: selectedCategoryId === 'uncategorized' ? null : selectedCategoryId,
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
          className="relative bg-white/40 border border-white/30 rounded-3xl p-8 min-h-[580px] flex gap-16 items-stretch z-10 overflow-hidden shadow-inner"
        >
          {/* Línea Conectora entre Nivel 1 y Nivel 2 */}
          {selectedCategoryId && (
            <div className="absolute left-[320px] w-16 top-0 bottom-0 flex items-center justify-center z-0 pointer-events-none animate-in fade-in duration-300">
              <div className="w-full h-px bg-gradient-to-r from-indigo-500/80 to-emerald-500/80 relative flex items-center justify-center">
                {/* Nodo Conector Estático */}
                <div className="absolute w-3 h-3 bg-white border-2 border-indigo-500/80 rounded-full shadow-sm" />
              </div>
            </div>
          )}

          {/* COLUMNA IZQUIERDA (NIVEL 1) */}
          {!selectedCategoryId ? (
            /* Root Goal */
            <div className="w-72 flex flex-col justify-center shrink-0 z-10 animate-in fade-in slide-in-from-left-4 duration-300">
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

                <h2 className="text-base font-extrabold tracking-tight mb-2 leading-tight">
                  {roadmap.name}
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">Objetivo final de la ruta</p>
              </div>
            </div>
          ) : (
            /* Selected Category */
            (() => {
              const cat = getCategoriesList().find(c => c.id === selectedCategoryId);
              if (!cat) return null;
              
              const catSubgoals = (roadmap.subgoals || []).filter(s => {
                if (selectedCategoryId === 'uncategorized') {
                  return !s.categoryId || !(roadmap.categories || []).some(c => c.id === s.categoryId);
                }
                return s.categoryId === selectedCategoryId;
              });
              const totalCatSteps = catSubgoals.reduce((acc, s) => acc + (s.steps?.length || 0), 0);
              const completedCatSteps = catSubgoals.reduce((acc, s) => acc + (s.steps?.filter(st => st.completed).length || 0), 0);
              const catPctg = totalCatSteps > 0 ? Math.round((completedCatSteps / totalCatSteps) * 100) : 0;

              return (
                <div className="w-72 flex flex-col justify-center shrink-0 z-10 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative text-white flex flex-col items-center text-center">
                    
                    {/* Botón Volver */}
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className="mb-4 inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold text-xs py-1.5 px-3 rounded-lg transition-colors border border-slate-700/50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Atrás
                    </button>

                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">Categoría</span>
                    
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
                          strokeDashoffset={251.2 - (251.2 * catPctg) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-xl font-black">{catPctg}%</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Progreso</span>
                      </div>
                    </div>

                    <h2 className="text-base font-extrabold tracking-tight mb-4 leading-tight">
                      {cat.name}
                    </h2>
                  </div>
                </div>
              );
            })()
          )}

          {/* COLUMNA DERECHA (NIVEL 2) */}
          {!selectedCategoryId ? (
            /* Categorías list */
            <div className="flex-1 flex flex-col justify-between z-10 bg-slate-50 border border-indigo-500/20 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-indigo-500" />
                  Categorías
                </h3>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  {getCategoriesList().length}
                </span>
              </div>

              <div 
                className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[380px] p-1 pr-2 scrollbar-thin animate-in fade-in duration-300"
              >
                {getCategoriesList().length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500 text-xs italic border border-dashed border-gray-300 rounded-xl bg-white/20">
                    No hay categorías todavía. Crea una abajo para empezar.
                  </div>
                ) : (
                  getCategoriesList().map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    
                    // Calcular estadísticas de subobjetivos de esta categoría
                    const catSubgoals = (roadmap.subgoals || []).filter(s => {
                      if (cat.id === 'uncategorized') {
                        return !s.categoryId || !(roadmap.categories || []).some(c => c.id === s.categoryId);
                      }
                      return s.categoryId === cat.id;
                    });
                    const totalCatSteps = catSubgoals.reduce((acc, s) => acc + (s.steps?.length || 0), 0);
                    const completedCatSteps = catSubgoals.reduce((acc, s) => acc + (s.steps?.filter(st => st.completed).length || 0), 0);
                    const catPctg = totalCatSteps > 0 ? Math.round((completedCatSteps / totalCatSteps) * 100) : 0;

                    return (
                      <div
                        key={cat.id}
                        id={`category-${cat.id}`}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`bg-white border rounded-xl p-4 shadow-sm relative group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-300 flex flex-col justify-between min-h-[110px] ${
                          isSelected 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/10' 
                            : 'border-slate-200/60 hover:border-indigo-200'
                        }`}
                      >
                        {/* Header de Categoría */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          {editingCategoryId === cat.id ? (
                            <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="border border-indigo-400 rounded-lg px-2.5 py-1 w-full text-xs text-gray-800 font-bold focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRenameCategory(cat.id);
                                  if (e.key === 'Escape') setEditingCategoryId(null);
                                }}
                              />
                              <button
                                onClick={() => saveRenameCategory(cat.id)}
                                className="bg-indigo-500 text-white p-1.5 rounded-lg hover:bg-indigo-600 shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingCategoryId(null)}
                                className="bg-gray-100 text-gray-500 p-1.5 rounded-lg hover:bg-gray-200 shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 pr-6">
                                {cat.name}
                              </h4>
                              
                              {cat.id !== 'uncategorized' && (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white/90 backdrop-blur rounded-lg p-0.5 shadow-sm border border-gray-100" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => { setEditingCategoryId(cat.id); setEditCategoryName(cat.name); }}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                                    title="Renombrar categoría"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                    title="Eliminar categoría"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Progreso de la categoría */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                            <span>{catSubgoals.length} subobjetivos</span>
                            <span className="text-indigo-600 font-semibold">{catPctg}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${catPctg}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Añadir Categoría */}
              <div className="mt-4 pt-3 border-t border-indigo-100/50">
                {isAddingCategory ? (
                  <form onSubmit={handleAddCategory} className="w-full flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nueva categoría..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full text-xs border border-gray-300 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-gray-800 font-medium focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newCategoryName.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" /> Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="w-full flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 px-3 rounded-xl transition-all duration-300"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Añadir Categoría
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Subgoals list */
            <div className="flex-1 flex flex-col justify-between z-10 bg-slate-50 border border-emerald-500/20 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Subobjetivos
                </h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  {(roadmap.subgoals || []).filter(s => {
                    if (selectedCategoryId === 'uncategorized') {
                      return !s.categoryId || !(roadmap.categories || []).some(c => c.id === s.categoryId);
                    }
                    return s.categoryId === selectedCategoryId;
                  }).length}
                </span>
              </div>

              <div 
                className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[380px] p-1 pr-2 scrollbar-thin animate-in fade-in duration-300"
              >
                {((roadmap.subgoals || []).filter(s => {
                  if (selectedCategoryId === 'uncategorized') {
                    return !s.categoryId || !(roadmap.categories || []).some(c => c.id === s.categoryId);
                  }
                  return s.categoryId === selectedCategoryId;
                })).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500 text-xs italic border border-dashed border-gray-300 rounded-xl bg-white/20">
                    Sin subobjetivos en esta categoría. Crea uno abajo para empezar.
                  </div>
                ) : (
                  (roadmap.subgoals || []).filter(s => {
                    if (selectedCategoryId === 'uncategorized') {
                      return !s.categoryId || !(roadmap.categories || []).some(c => c.id === s.categoryId);
                    }
                    return s.categoryId === selectedCategoryId;
                  }).map((subgoal) => {
                    const isSelected = selectedSubgoalId === subgoal.id;
                    
                    return (
                      <div 
                        key={subgoal.id}
                        id={`subgoal-${subgoal.id}`}
                        onClick={() => setSelectedSubgoalId(subgoal.id)}
                        className={`bg-white border rounded-xl p-4 shadow-sm relative group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-300 flex flex-col justify-between min-h-[110px] ${
                          isSelected 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/10' 
                            : 'border-slate-200/60 hover:border-emerald-200'
                        }`}
                      >
                        {/* Header Subobjetivo */}
                        <div className="flex justify-between items-start gap-2 mb-2">
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
                                className="bg-indigo-500 text-white p-1 rounded-lg hover:bg-indigo-600 shrink-0"
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
                              <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 pr-6">
                                {subgoal.name}
                              </h4>
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

                        {/* Info de progreso */}
                        <div className="mt-2">
                          <div className="mb-2">
                            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                              <span>Progreso</span>
                              <span className="text-emerald-600 font-semibold">{subgoal.pctg}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${subgoal.pctg}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>{(subgoal.steps || []).filter(s => s.completed).length}/{(subgoal.steps || []).length} Pasos</span>
                            {subgoal.links && subgoal.links.length > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-extrabold normal-case text-[10px]">
                                {subgoal.links.length} links
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Añadir Subobjetivo */}
              <div className="mt-4 pt-3 border-t border-indigo-100/50">
                {isAddingSubgoal ? (
                  <form onSubmit={handleAddSubgoal} className="w-full flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo subobjetivo..."
                      value={newSubgoalName}
                      onChange={(e) => setNewSubgoalName(e.target.value)}
                      className="w-full text-xs border border-gray-300 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-gray-800 font-medium focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newSubgoalName.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" /> Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingSubgoal(false); setNewSubgoalName(''); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingSubgoal(true)}
                    className="w-full flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 px-3 rounded-xl transition-all duration-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Subobjetivo
                  </button>
                )}
              </div>
            </div>
          )}
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
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                      <span>Progreso:</span>
                      <span className="text-indigo-600 font-black">{subgoal.pctg}%</span>
                    </div>
                    <div className="text-xs text-gray-400 font-bold">
                      {(subgoal.steps || []).filter(s => s.completed).length}/{(subgoal.steps || []).length} completados
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Categoría:</span>
                      <select
                        value={subgoal.categoryId || ''}
                        onChange={(e) => handleMoveSubgoal(subgoal.id, e.target.value)}
                        className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      >
                        <option value="">Sin categoría</option>
                        {(roadmap.categories || []).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
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
