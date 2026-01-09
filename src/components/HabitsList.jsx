import { useState, useMemo } from 'react';
import { CheckCircle2, Circle, XCircle, Calendar, List, Plus, Minus, Check, X } from 'lucide-react';

export default function HabitsList({ habits, selectedDate, onToggleHabit, onDecrementHabit, onUpdateProgress, stats, today }) {
  const [filterType, setFilterType] = useState('todos'); // 'todos', 'todo', 'todont', 'horas'
  const [viewType, setViewType] = useState('weekly'); // 'weekly' o 'daily'
  const [expandedHoursHabits, setExpandedHoursHabits] = useState(new Set()); // Set de IDs de hábitos tipo horas expandidos
  // Estado para trackear cambios sin guardar: { habitId: { dateString: value } }
  const [unsavedChanges, setUnsavedChanges] = useState({});

  // Filtrar hábitos según el día de la semana seleccionado
  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  };

  // Calcular los días de la semana (Lunes a Domingo)
  const weekDates = useMemo(() => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    // Convertir: Domingo (0) -> retroceder 6 días, Lunes (1) -> retroceder 0 días, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysToMonday);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  }, [selectedDate]);

  const selectedDayOfWeek = getDayOfWeek(selectedDate);
  
  // Para vista semanal: filtrar hábitos que aplican a cualquier día de la semana
  // Para vista diaria: filtrar hábitos que aplican al día seleccionado
  const filteredByDay = habits.filter(habit => {
    // Si el hábito no tiene daysOfWeek definido, mostrarlo siempre (compatibilidad con hábitos antiguos)
    if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
      return true;
    }
    if (viewType === 'weekly') {
      // En vista semanal, mostrar hábitos que aplican a cualquier día de la semana
      const weekDays = weekDates.map(date => getDayOfWeek(date));
      return habit.daysOfWeek.some(day => weekDays.includes(day));
    } else {
      // En vista diaria, mostrar solo hábitos del día seleccionado
      return habit.daysOfWeek.includes(selectedDayOfWeek);
    }
  });

  // Filtrar por tipo de hábito
  const filteredHabits = filteredByDay.filter(habit => {
    if (filterType === 'todos') return true;
    // Compatibilidad con tipos antiguos
    if (filterType === 'todo' && (habit.type === 'todo' || habit.type === 'boolean')) return true;
    if (filterType === 'todont' && habit.type === 'todont') return true;
    if (filterType === 'horas' && (habit.type === 'horas' || habit.type === 'numeric')) return true;
    return false;
  });

  // Agrupar hábitos por tipo para la vista semanal
  const habitsByType = useMemo(() => {
    const grouped = {
      todo: [],
      todont: [],
      horas: []
    };
    
    filteredHabits.forEach(habit => {
      let habitType = habit.type;
      // Compatibilidad con tipos antiguos
      if (habit.type === 'boolean') habitType = 'todo';
      if (habit.type === 'numeric') habitType = 'horas';
      
      if (habitType === 'todo') {
        grouped.todo.push(habit);
      } else if (habitType === 'todont') {
        grouped.todont.push(habit);
      } else if (habitType === 'horas') {
        grouped.horas.push(habit);
      }
    });
    
    return grouped;
  }, [filteredHabits]);

  // Función auxiliar para obtener el estado de un hábito en una fecha
  const getHabitStatus = (habit, dateString) => {
    const dateValue = habit.history?.[dateString];
    let habitType = habit.type;
    
    // Compatibilidad con tipos antiguos
    if (habit.type === 'boolean') habitType = 'todo';
    if (habit.type === 'numeric') habitType = 'horas';
    
    if (habitType === 'todo' || habitType === 'todont') {
      return { isCompleted: dateValue === true, value: dateValue };
    } else if (habitType === 'horas') {
      return { isCompleted: Number(dateValue) >= habit.goal, value: Number(dateValue) || 0 };
    }
    return { isCompleted: false, value: null };
  };

  // Función para toggle de expansión de hábitos tipo horas
  const toggleHoursExpansion = (habitId) => {
    // Si está expandido y hay cambios sin guardar, pedir confirmación
    if (expandedHoursHabits.has(habitId) && unsavedChanges[habitId]) {
      const hasChanges = Object.keys(unsavedChanges[habitId]).length > 0;
      if (hasChanges) {
        const confirmed = window.confirm('¿Deseas descartar los cambios sin guardar?');
        if (!confirmed) {
          return; // No cerrar si el usuario cancela
        }
      }
      // Limpiar cambios sin guardar al cerrar
      setUnsavedChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[habitId];
        return newChanges;
      });
    }
    
    setExpandedHoursHabits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  // Función para guardar cambios de un hábito expandido
  const saveHoursChanges = (habitId) => {
    const changes = unsavedChanges[habitId];
    if (!changes) return;
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    // Aplicar todos los cambios
    Object.entries(changes).forEach(([dateString, value]) => {
      onUpdateProgress(habit, value, dateString);
    });
    
    // Limpiar cambios guardados
    setUnsavedChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[habitId];
      return newChanges;
    });
    
    // Cerrar vista expandida
    setExpandedHoursHabits(prev => {
      const newSet = new Set(prev);
      newSet.delete(habitId);
      return newSet;
    });
  };

  // Función para manejar cambios en inputs expandidos (sin guardar inmediatamente)
  const handleExpandedInputChange = (habit, dateString, newValue) => {
    setUnsavedChanges(prev => {
      const habitChanges = prev[habit.id] || {};
      // Si el valor es igual al original, no guardarlo como cambio
      const originalValue = Number(habit.history?.[dateString] || 0);
      if (newValue === originalValue) {
        // Eliminar el cambio si vuelve al valor original
        const newHabitChanges = { ...habitChanges };
        delete newHabitChanges[dateString];
        if (Object.keys(newHabitChanges).length === 0) {
          const newChanges = { ...prev };
          delete newChanges[habit.id];
          return newChanges;
        }
        return { ...prev, [habit.id]: newHabitChanges };
      }
      return {
        ...prev,
        [habit.id]: {
          ...habitChanges,
          [dateString]: newValue
        }
      };
    });
  };

  // Función para renderizar celda de hábito en la tabla semanal
  const renderHabitCell = (habit, dateString) => {
    const { isCompleted, value } = getHabitStatus(habit, dateString);
    const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
    
    // Comparar fechas correctamente (ambas ya están en formato YYYY-MM-DD)
    const isFuture = dateString > today;
    
    // Verificar si el hábito aplica a este día de la semana
    const dayOfWeek = getDayOfWeek(dateString);
    const habitAppliesToDay = !habit.daysOfWeek || habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(dayOfWeek);
    const isDisabled = isFuture || !habitAppliesToDay;
    
    if (habitType === 'horas') {
      const isExpanded = expandedHoursHabits.has(habit.id);
      const habitChanges = unsavedChanges[habit.id] || {};
      const displayValue = isExpanded && habitChanges[dateString] !== undefined 
        ? habitChanges[dateString] 
        : value;
      
      return (
        <td 
          key={dateString}
          className={`p-2 border-r border-gray-100 text-center ${isDisabled ? 'bg-gray-50 opacity-50' : ''}`}
        >
          {habitAppliesToDay ? (
            isExpanded ? (
              <input
                type="number"
                min="0"
                step="0.5"
                value={displayValue}
                onChange={(e) => {
                  const newValue = Math.max(0, Number(e.target.value));
                  handleExpandedInputChange(habit, dateString, newValue);
                }}
                disabled={isDisabled}
                className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  isDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                }`}
                placeholder="0"
              />
            ) : (
              <div className="flex items-center justify-center gap-1">
                <span className={`text-xs font-medium ${
                  isDisabled 
                    ? 'text-gray-400' 
                    : isCompleted 
                      ? 'text-blue-700' 
                      : 'text-gray-600'
                }`}>
                  {value || 0}h
                </span>
                <span className={`text-xs ${isCompleted ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                  / {habit.goal}h
                </span>
              </div>
            )
          ) : (
            <span className="text-gray-300 text-xs">-</span>
          )}
        </td>
      );
    }
    
    return (
      <td 
        key={dateString}
        className={`p-2 border-r border-gray-100 text-center ${isDisabled ? 'bg-gray-50 opacity-50' : ''}`}
      >
        {habitAppliesToDay ? (
          <button
            onClick={() => !isDisabled && onToggleHabit(habit, dateString)}
            {...(isDisabled ? { disabled: true } : {})}
            className={`mx-auto ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {isCompleted ? (
              habitType === 'todont' ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )
            ) : (
              <Circle className={`w-5 h-5 ${isDisabled ? 'text-gray-300' : 'text-gray-400 hover:text-indigo-600'}`} />
            )}
          </button>
        ) : (
          <span className="text-gray-300 text-xs">-</span>
        )}
      </td>
    );
  };

  return (
    <div>
      {/* Selector de vista */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewType === 'weekly'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Semanal
          </button>
          <button
            onClick={() => setViewType('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewType === 'daily'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List className="w-4 h-4" />
            Diaria
          </button>
        </div>
      </div>

      {/* Estadísticas discretas - solo en vista diaria */}
      {viewType === 'daily' && stats && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                {selectedDate === today ? 'Hoy' : 'Completados'}:
              </span>
              <span className="font-semibold text-indigo-600">
                {stats.completedForDate}/{stats.total}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Progreso:</span>
                <span className="font-semibold text-green-600">{stats.percentForDate}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Total acciones:</span>
                <span className="font-semibold text-purple-600">{stats.totalActions}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filtros por tipo - siempre visibles */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { value: 'todos', label: 'Todos' },
          { value: 'todo', label: 'To Do' },
          { value: 'todont', label: "To Don't" },
          { value: 'horas', label: 'Horas' }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterType(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === filter.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Contenido de hábitos */}
      {habits.length === 0 ? (
        <div className="text-center py-12">
          <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No tienes hábitos aún</p>
          <p className="text-sm text-gray-400">Ve a la pestaña &quot;Hábitos&quot; para crear tu primer hábito</p>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="text-center py-12">
          <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {viewType === 'weekly' 
              ? (filterType === 'todos' 
                  ? 'No hay hábitos programados para esta semana'
                  : `No hay hábitos de tipo "${filterType === 'todo' ? 'To Do' : filterType === 'todont' ? "To Don't" : 'Horas'}" para esta semana`)
              : (filterType === 'todos' 
                  ? 'No hay hábitos programados para este día'
                  : `No hay hábitos de tipo "${filterType === 'todo' ? 'To Do' : filterType === 'todont' ? "To Don't" : 'Horas'}" para este día`)
            }
          </p>
          <p className="text-sm text-gray-400">Cambia el filtro o ve a la pestaña &quot;Hábitos&quot; para agregar nuevos hábitos</p>
        </div>
      ) : viewType === 'weekly' ? (
        /* Vista Semanal - Tabla */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="p-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  Hábito
                </th>
                {weekDates.map((date) => {
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                  const dayNumber = dateObj.getDate();
                  const isToday = date === today;
                  return (
                    <th 
                      key={date}
                      className={`p-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 ${
                        isToday ? 'bg-indigo-50 text-indigo-700' : ''
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{dayName}</span>
                        <span className="text-lg font-bold">{dayNumber}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Grupo: To Do */}
              {habitsByType.todo.length > 0 && (
                <>
                  <tr className="bg-green-50/30">
                    <td colSpan={8} className="p-2 text-xs font-semibold text-green-700 uppercase">
                      To Do
                    </td>
                  </tr>
                  {habitsByType.todo.map((habit) => (
                    <tr 
                      key={habit.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 sticky left-0 bg-white z-10 font-medium text-gray-800">
                        {habit.name}
                      </td>
                      {weekDates.map(date => renderHabitCell(habit, date))}
                    </tr>
                  ))}
                </>
              )}
              
              {/* Grupo: To Don't */}
              {habitsByType.todont.length > 0 && (
                <>
                  <tr className="bg-red-50/30">
                    <td colSpan={8} className="p-2 text-xs font-semibold text-red-700 uppercase">
                      To Don&apos;t
                    </td>
                  </tr>
                  {habitsByType.todont.map((habit) => (
                    <tr 
                      key={habit.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 sticky left-0 bg-white z-10 font-medium text-gray-800">
                        {habit.name}
                      </td>
                      {weekDates.map(date => renderHabitCell(habit, date))}
                    </tr>
                  ))}
                </>
              )}
              
              {/* Grupo: Horas */}
              {habitsByType.horas.length > 0 && (
                <>
                  <tr className="bg-blue-50/30">
                    <td colSpan={8} className="p-2 text-xs font-semibold text-blue-700 uppercase">
                      Horas
                    </td>
                  </tr>
                  {habitsByType.horas.map((habit) => {
                    const isExpanded = expandedHoursHabits.has(habit.id);
                    const hasUnsavedChanges = unsavedChanges[habit.id] && Object.keys(unsavedChanges[habit.id]).length > 0;
                    return (
                      <tr 
                        key={habit.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3 sticky left-0 bg-white z-10 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <span>{habit.name}</span>
                            {isExpanded ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => saveHoursChanges(habit.id)}
                                  disabled={!hasUnsavedChanges}
                                  className={`p-1.5 rounded-full transition-all ${
                                    hasUnsavedChanges
                                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title="Guardar cambios"
                                  aria-label="Guardar cambios"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleHoursExpansion(habit.id)}
                                  className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
                                  title="Cancelar y descartar cambios"
                                  aria-label="Cancelar y descartar cambios"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => toggleHoursExpansion(habit.id)}
                                className="p-1.5 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm"
                                title="Expandir vista para editar horas"
                                aria-label="Expandir vista para editar horas"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        {weekDates.map(date => renderHabitCell(habit, date))}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Vista Diaria - Lista */
        <div className="space-y-3">
        {filteredHabits.map((habit) => {
          const dateValue = habit.history?.[selectedDate];
          let isCompleted;
          let habitType = habit.type;
          
          // Compatibilidad con tipos antiguos
          if (habit.type === 'boolean') habitType = 'todo';
          if (habit.type === 'numeric') habitType = 'horas';
          
          if (habitType === 'todo' || habitType === 'todont') {
            isCompleted = dateValue === true;
          } else if (habitType === 'horas') {
            isCompleted = Number(dateValue) >= habit.goal;
          } else {
            isCompleted = false;
          }

          // Colores según el tipo cuando está completado
          const getCompletedStyles = () => {
            if (!isCompleted) return 'bg-white border-gray-200 hover:border-indigo-300';
            switch (habitType) {
              case 'todo':
                return 'bg-green-50 border-green-300';
              case 'todont':
                return 'bg-red-50 border-red-300';
              case 'horas':
                return 'bg-blue-50 border-blue-300';
              default:
                return 'bg-green-50 border-green-200';
            }
          };

          const getCompletedTextColor = () => {
            if (!isCompleted) return 'text-gray-800';
            switch (habitType) {
              case 'todo':
                return 'text-green-800';
              case 'todont':
                return 'text-red-800';
              case 'horas':
                return 'text-blue-800';
              default:
                return 'text-green-800';
            }
          };

          const getIcon = () => {
            if (!isCompleted) {
              return <Circle className="w-6 h-6 text-gray-400 hover:text-indigo-600" />;
            }
            switch (habitType) {
              case 'todo':
                return <CheckCircle2 className="w-6 h-6 text-green-600" />;
              case 'todont':
                return <XCircle className="w-6 h-6 text-red-600" />;
              case 'horas':
                return <CheckCircle2 className="w-6 h-6 text-blue-600" />;
              default:
                return <CheckCircle2 className="w-6 h-6 text-green-600" />;
            }
          };

          return (
            <div
              key={habit.id}
              className={`border rounded-lg p-4 transition-all ${getCompletedStyles()}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleHabit(habit, selectedDate)}
                      className="flex-shrink-0"
                    >
                      {getIcon()}
                    </button>
                    <div className="flex-1">
                      <h3 className={`font-medium ${isCompleted ? `${getCompletedTextColor()} line-through` : 'text-gray-800'}`}>
                        {habit.name}
                      </h3>
                      {habitType === 'horas' && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={Number(dateValue) || 0}
                            onChange={(e) => {
                              const newValue = Math.max(0, Number(e.target.value));
                              onUpdateProgress(habit, newValue, selectedDate);
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="0"
                          />
                          <span className={`text-sm ${isCompleted ? 'text-blue-700' : 'text-gray-600'}`}>
                            / {habit.goal} h
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onDecrementHabit(habit, selectedDate)}
                              className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <button
                              onClick={() => onToggleHabit(habit, selectedDate)}
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
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}

