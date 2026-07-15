/* eslint-disable react/prop-types */
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { X, Loader2 } from 'lucide-react';

// UUID v4 helper generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function AddGoalModal({ isOpen, onClose, userId }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;

    setLoading(true);
    try {
      const id = generateUUID();
      await setDoc(doc(db, 'habits', id), {
        id,
        userId,
        type: 'roadmap',
        name: name.trim(),
        pctg: 0,
        subgoals: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setName('');
      onClose();
    } catch (err) {
      console.error('Error creating roadmap:', err);
      alert('Error al crear el objetivo. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Nuevo Objetivo</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ¿Cuál es tu objetivo final?
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cobrar 100.000 € como programador"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 border border-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-md hover:shadow-lg"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Objetivo'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
