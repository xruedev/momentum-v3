import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash, Save, Shield } from 'lucide-react';

export default function HabitDetailModal({ habit, onClose, onSaveAntiSabotage }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ trigger: '', solution: '' });

  if (!habit) return null;

  const antiSabotage = habit.antiSabotage || [];

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({ trigger: '', solution: '' });
  };

  const handleEdit = (measure) => {
    setEditingId(measure.id);
    setFormData({ trigger: measure.trigger, solution: measure.solution });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ trigger: '', solution: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let newMeasures;
    if (editingId) {
      newMeasures = antiSabotage.map(m => 
        m.id === editingId ? { ...m, ...formData } : m
      );
    } else {
      newMeasures = [...antiSabotage, { id: crypto.randomUUID(), ...formData }];
    }
    onSaveAntiSabotage(habit.id, newMeasures);
    handleCancel();
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta medida?')) {
      const newMeasures = antiSabotage.filter(m => m.id !== id);
      onSaveAntiSabotage(habit.id, newMeasures);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{habit.name}</h2>
              <p className="text-sm text-gray-500 font-medium">Información Anti-Sabotaje</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {antiSabotage.length === 0 && !isAdding ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Shield className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 mb-6 max-w-xs mx-auto">
                No tienes medidas anti-sabotaje para este hábito. Añade una para prepararte contra las dificultades.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                Añadir primera medida
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Measures List */}
              <div className="grid gap-4">
                {antiSabotage.map((measure) => (
                  <div key={measure.id} className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-md transition-all">
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {measure.trigger}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed pl-3.5 border-l-2 border-gray-100 italic">
                          {measure.solution}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(measure)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(measure.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Button */}
              {!isAdding && !editingId && (
                <button
                  onClick={handleAdd}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Añadir medida adicional
                </button>
              )}

              {/* Form (Add or Edit) */}
              {(isAdding || editingId) && (
                <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 animate-in slide-in-from-top-4 duration-300">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    {editingId ? 'Editar Medida' : 'Nueva Medida Anti-Sabotaje'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        ¿Qué puede sabotear tu hábito?
                      </label>
                      <input
                        type="text"
                        value={formData.trigger}
                        onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        placeholder="Ej: Falta de propósito, pereza por la mañana..."
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        ¿Cómo lo vas a evitar? (Solución)
                      </label>
                      <textarea
                        value={formData.solution}
                        onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white min-h-[100px]"
                        placeholder="Ej: Escribir mi propósito y leerlo cada noche..."
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-semibold flex items-center justify-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        {editingId ? 'Actualizar' : 'Guardar Medida'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
