import { useState, useMemo, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Calendar, List, Plus, Check, X, ChevronUp, ChevronDown, Filter, ArrowUpDown, Save, Focus } from 'lucide-react';

// Función para calcular el número de semana del año (ISO 8601)
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Función para calcular el total de semanas en un año
function getTotalWeeksInYear(year) {
  // Calcular la semana del 28 de diciembre, que siempre está en la última semana del año
  const dec28 = new Date(Date.UTC(year, 11, 28));
  const weekOfDec28 = getWeekNumber(dec28);
  
  // Si el 28 de diciembre está en la semana 1, significa que pertenece al año siguiente
  // En ese caso, el año tiene 52 semanas. Si está en semana 52 o 53, ese es el total.
  if (weekOfDec28 === 1) {
    // Verificar si realmente es del año siguiente o si el año tiene 53 semanas
    const dec31 = new Date(Date.UTC(year, 11, 31));
    const weekOfDec31 = getWeekNumber(dec31);
    return weekOfDec31 === 1 ? 52 : 53;
  }
  
  return weekOfDec28;
}

// Función para formatear fecha en español
function formatDateSpanish(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
  return `${day} de ${month}`;
}

export default function HabitsList({ habits, selectedDate, onToggleHabit, onDecrementHabit, onUpdateProgress, onUpdateHabitOrder, onUpdateMultipleHabitOrders, stats, today, getGoalForDate, focusMode = false, setFocusMode }) {
  const [filterType, setFilterType] = useState('todos'); // 'todos', 'todo', 'todont', 'horas'
  const [viewType, setViewType] = useState('weekly'); // 'weekly' o 'daily'
  const [showFilters, setShowFilters] = useState(false); // Controlar visibilidad de filtros
  const [showActionsMenu, setShowActionsMenu] = useState(false); // Controlar visibilidad del menú de acciones
  const [isSortingMode, setIsSortingMode] = useState(false); // Modo de ordenar hábitos
  const [temporaryOrder, setTemporaryOrder] = useState({}); // Orden temporal: { habitId: order }
  const [expandedHoursHabits, setExpandedHoursHabits] = useState(new Set()); // Set de IDs de hábitos tipo horas expandidos
  // Estado para trackear cambios sin guardar: { habitId: { dateString: value } }
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const actionsMenuRef = useRef(null);

  // Cerrar el menú de acciones cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  // Función para cerrar el menú de acciones con confirmación si está en modo ordenar
  const handleCloseActionsMenu = () => {
    if (isSortingMode) {
      const confirmed = window.confirm('¿Deseas salir del modo de ordenar?');
      if (!confirmed) {
        return;
      }
      setIsSortingMode(false);
    }
    setShowActionsMenu(false);
  };

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

  // Calcular información de la semana
  const weekInfo = useMemo(() => {
    if (weekDates.length === 0) return null;
    const mondayDate = new Date(weekDates[0]);
    const weekNumber = getWeekNumber(mondayDate);
    const year = mondayDate.getFullYear();
    
    // Calcular total de semanas en el año usando función mejorada
    const totalWeeks = getTotalWeeksInYear(year);
    
    return {
      startDate: formatDateSpanish(weekDates[0]),
      endDate: formatDateSpanish(weekDates[6]),
      weekNumber,
      totalWeeks
    };
  }, [weekDates]);

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

  // Agrupar hábitos por tipo para la vista semanal y ordenarlos por campo order
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
    
    // Ordenar cada grupo por campo order (usando orden temporal si está en modo ordenar)
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => {
        // Si estamos en modo ordenar y hay orden temporal, usarlo; si no, usar order real
        const orderA = isSortingMode && temporaryOrder[a.id] !== undefined 
          ? temporaryOrder[a.id] 
          : (a.order !== undefined ? a.order : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        const orderB = isSortingMode && temporaryOrder[b.id] !== undefined 
          ? temporaryOrder[b.id] 
          : (b.order !== undefined ? b.order : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
        return orderA - orderB;
      });
    });
    
    return grouped;
  }, [filteredHabits, isSortingMode, temporaryOrder]);

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
      const goal = getGoalForDate(habit, dateString);
      return { isCompleted: Number(dateValue) >= goal, value: Number(dateValue) || 0, goal };
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

  // Función para manejar el movimiento de hábitos (solo actualiza orden temporal)
  const handleMoveHabit = (habitId, direction) => {
    if (!isSortingMode) return;
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    // Determinar el tipo del hábito
    const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
    
    // Obtener todos los hábitos del mismo tipo con orden actual (temporal o real)
    const habitsOfSameType = filteredHabits
      .filter(h => {
        const hType = h.type === 'boolean' ? 'todo' : (h.type === 'numeric' ? 'horas' : h.type);
        return hType === habitType;
      })
      .map(h => ({
        ...h,
        order: temporaryOrder[h.id] !== undefined ? temporaryOrder[h.id] : (h.order !== undefined ? h.order : 0)
      }))
      .sort((a, b) => a.order - b.order);
    
    // Encontrar el índice del hábito actual
    const currentIndex = habitsOfSameType.findIndex(h => h.id === habitId);
    if (currentIndex === -1) return;
    
    // Determinar el índice del hábito adyacente
    let targetIndex;
    if (direction === 'up') {
      targetIndex = currentIndex - 1;
      if (targetIndex < 0) return;
    } else if (direction === 'down') {
      targetIndex = currentIndex + 1;
      if (targetIndex >= habitsOfSameType.length) return;
    } else {
      return;
    }
    
    const targetHabit = habitsOfSameType[targetIndex];
    
    // Intercambiar los orders en el estado temporal
    const currentOrder = habitsOfSameType[currentIndex].order;
    const targetOrder = habitsOfSameType[targetIndex].order;
    
    setTemporaryOrder(prev => ({
      ...prev,
      [habitId]: targetOrder,
      [targetHabit.id]: currentOrder
    }));
  };

  // Función para activar el modo de ordenar
  const enterSortingMode = () => {
    setIsSortingMode(true);
    setTemporaryOrder({}); // Inicializar orden temporal vacío
    setShowActionsMenu(false);
  };

  // Función para confirmar los cambios de orden y guardarlos en Firebase
  const confirmSorting = async () => {
    if (!onUpdateMultipleHabitOrders) {
      setIsSortingMode(false);
      setTemporaryOrder({});
      return;
    }
    
    // Calcular los nuevos orders para todos los hábitos
    // Necesitamos actualizar todos los hábitos del mismo tipo para asegurar orders secuenciales
    const orderUpdates = {};
    
    // Agrupar hábitos por tipo
    const habitsByType = {
      todo: [],
      todont: [],
      horas: []
    };
    
    habits.forEach(habit => {
      const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
      if (habitType === 'todo') {
        habitsByType.todo.push(habit);
      } else if (habitType === 'todont') {
        habitsByType.todont.push(habit);
      } else if (habitType === 'horas') {
        habitsByType.horas.push(habit);
      }
    });
    
    // Para cada tipo, calcular los nuevos orders secuenciales
    Object.keys(habitsByType).forEach(type => {
      const typeHabits = habitsByType[type];
      
      if (typeHabits.length === 0) return;
      
      // Crear mapa de orders finales (usando temporal si existe, sino el real)
      const finalOrders = typeHabits.map(habit => ({
        habit,
        finalOrder: temporaryOrder[habit.id] !== undefined 
          ? temporaryOrder[habit.id] 
          : (habit.order !== undefined ? habit.order : (habit.createdAt ? new Date(habit.createdAt).getTime() : 0))
      }));
      
      // Ordenar por order final
      finalOrders.sort((a, b) => a.finalOrder - b.finalOrder);
      
      // Asignar nuevos orders secuenciales basados en la nueva posición (empezando desde 0)
      finalOrders.forEach((item, index) => {
        const newOrder = index;
        const currentOrder = item.habit.order !== undefined ? item.habit.order : -1;
        
        // Actualizar si el order cambió o si no tenía order asignado
        if (newOrder !== currentOrder) {
          orderUpdates[item.habit.id] = newOrder;
        }
      });
    });
    
    // Actualizar todos los hábitos afectados en Firebase
    if (Object.keys(orderUpdates).length > 0) {
      await onUpdateMultipleHabitOrders(orderUpdates);
    }
    
    // Limpiar estado y salir del modo ordenar
    setTemporaryOrder({});
    setIsSortingMode(false);
  };

  // Función para cancelar los cambios de orden
  const cancelSorting = () => {
    const confirmed = window.confirm('¿Deseas descartar los cambios de orden?');
    if (confirmed) {
      setTemporaryOrder({});
      setIsSortingMode(false);
    }
  };

  // Función para salir del modo de ordenar con confirmación
  const exitSortingMode = () => {
    const hasChanges = Object.keys(temporaryOrder).length > 0;
    if (hasChanges) {
      const confirmed = window.confirm('¿Deseas salir del modo de ordenar? Los cambios no guardados se perderán.');
      if (!confirmed) {
        return;
      }
    }
    setTemporaryOrder({});
    setIsSortingMode(false);
  };

  // Función para manejar cambio de vista con confirmación si está en modo ordenar
  const handleViewTypeChange = (newViewType) => {
    if (isSortingMode && viewType !== newViewType) {
      const confirmed = window.confirm('¿Deseas salir del modo de ordenar para cambiar de vista?');
      if (!confirmed) {
        return;
      }
      setIsSortingMode(false);
    }
    setViewType(newViewType);
  };

  // Función para verificar si un hábito puede moverse en una dirección
  const canMoveHabit = (habitId, direction, typeArray) => {
    const index = typeArray.findIndex(h => h.id === habitId);
    if (direction === 'up') {
      return index > 0;
    } else if (direction === 'down') {
      return index < typeArray.length - 1;
    }
    return false;
  };

  // Función para calcular agregados semanales de un hábito
  const calculateWeeklyAggregates = (habit) => {
    const habitType = habit.type === 'boolean' ? 'todo' : (habit.type === 'numeric' ? 'horas' : habit.type);
    const habitChanges = unsavedChanges[habit.id] || {};
    
    if (habitType === 'todo' || habitType === 'todont') {
      // Para hábitos todo/todont: contar días completados / días totales aplicables
      let completedDays = 0;
      let totalApplicableDays = 0;
      
      weekDates.forEach(dateString => {
        const dayOfWeek = getDayOfWeek(dateString);
        const habitAppliesToDay = !habit.daysOfWeek || habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(dayOfWeek);
        
        // Incluir también fechas futuras en los cálculos
        if (habitAppliesToDay) {
          totalApplicableDays++;
          // Considerar cambios sin guardar si existen
          const val = habitChanges[dateString] !== undefined 
            ? habitChanges[dateString] 
            : habit.history?.[dateString];
          if (val === true) {
            completedDays++;
          }
        }
      });
      
      return { type: 'todo', completed: completedDays, total: totalApplicableDays };
    } else if (habitType === 'horas') {
      // Para hábitos de horas: sumar horas totales / horas objetivo semanales
      let totalHours = 0;
      let weeklyGoal = 0;
      
      weekDates.forEach(dateString => {
        const dayOfWeek = getDayOfWeek(dateString);
        const habitAppliesToDay = !habit.daysOfWeek || habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(dayOfWeek);
        
        // Incluir también fechas futuras en los cálculos
        if (habitAppliesToDay) {
          const goal = getGoalForDate(habit, dateString);
          weeklyGoal += goal;
          // Considerar cambios sin guardar si existen
          const val = habitChanges[dateString] !== undefined 
            ? Number(habitChanges[dateString]) 
            : Number(habit.history?.[dateString] || 0);
          totalHours += val;
        }
      });
      
      return { type: 'horas', total: totalHours, goal: weeklyGoal };
    }
    
    return null;
  };

  // Función para renderizar celda de agregados semanales
  const renderWeeklyAggregates = (habit) => {
    const aggregates = calculateWeeklyAggregates(habit);
    if (!aggregates) return null;
    
    const hasUnsavedChanges = unsavedChanges[habit.id] && Object.keys(unsavedChanges[habit.id]).length > 0;
    
    return (
        <td 
          key="aggregates"
          className="py-2 px-3 text-center border-l-4 border-indigo-300 bg-indigo-50/30 font-medium min-w-[150px]"
        >
        {aggregates.type === 'todo' ? (
          <div className="flex items-center justify-center gap-1">
            <span className={`text-sm font-semibold ${
              aggregates.completed === aggregates.total && aggregates.total > 0
                ? 'text-green-600' 
                : aggregates.completed > 0
                  ? 'text-indigo-600'
                  : 'text-gray-600'
            }`}>
              {aggregates.completed}/{aggregates.total}
            </span>
            <span className="text-xs text-gray-500">días</span>
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 font-medium">*</span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <span className={`text-sm font-semibold ${
              aggregates.total >= aggregates.goal && aggregates.goal > 0
                ? 'text-green-600' 
                : aggregates.total > 0
                  ? 'text-indigo-600'
                  : 'text-gray-600'
            }`}>
              {aggregates.total.toFixed(1)}h
            </span>
            <span className="text-xs text-gray-500">
              / {aggregates.goal.toFixed(1)}h
            </span>
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 font-medium">*</span>
            )}
          </div>
        )}
      </td>
    );
  };

  // Función para verificar si todos los hábitos están completados en un día
  const areAllHabitsCompletedForDay = (dateString) => {
    const dayOfWeek = getDayOfWeek(dateString);
    const isFuture = dateString > today;
    
    // Si es una fecha futura, no considerar completado
    if (isFuture) return false;
    
    // Obtener hábitos que aplican a este día
    const habitsForDay = filteredHabits.filter(habit => {
      if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
        return true; // Compatibilidad con hábitos antiguos
      }
      return habit.daysOfWeek.includes(dayOfWeek);
    });
    
    // Si no hay hábitos para este día, no considerar completado
    if (habitsForDay.length === 0) return false;
    
    // Verificar que todos los hábitos estén completados
    return habitsForDay.every(habit => {
      const habitStatus = getHabitStatus(habit, dateString);
      return habitStatus.isCompleted;
    });
  };

  // Función para renderizar celda de hábito en la tabla semanal
  const renderHabitCell = (habit, dateString) => {
    const habitStatus = getHabitStatus(habit, dateString);
    const { isCompleted, value, goal } = habitStatus;
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
          className={`py-1.5 px-2 border-r border-gray-100 text-center ${isDisabled ? 'bg-gray-50 opacity-50' : ''}`}
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
                  / {goal}h
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
        className={`py-1.5 px-2 border-r border-gray-100 text-center ${isDisabled ? 'bg-gray-50 opacity-50' : ''}`}
      >
        {habitAppliesToDay ? (
          <button
            onClick={() => !isDisabled && onToggleHabit(habit, dateString)}
            {...(isDisabled ? { disabled: true } : {})}
            className={`mx-auto ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
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
      {/* Selector de vista - oculto en modo foco */}
      {!focusMode && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleViewTypeChange('weekly')}
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
              onClick={() => handleViewTypeChange('daily')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewType === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              Diaria
            </button>
            {/* Indicador visual del modo ordenar con botones de confirmar y cancelar */}
            {isSortingMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-800">
                <ArrowUpDown className="w-4 h-4" />
                <span>Modo ordenar activo</span>
                <div className="flex items-center gap-1 ml-2 border-l border-yellow-300 pl-2">
                  <button
                    onClick={confirmSorting}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                    title="Confirmar cambios"
                  >
                    <Check className="w-3 h-3" />
                    Confirmar
                  </button>
                  <button
                    onClick={cancelSorting}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                    title="Cancelar cambios"
                  >
                    <X className="w-3 h-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => {
                if (showActionsMenu && isSortingMode) {
                  handleCloseActionsMenu();
                } else {
                  setShowActionsMenu(!showActionsMenu);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showActionsMenu || isSortingMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Acciones
              <ChevronDown className={`w-4 h-4 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Menú desplegable */}
            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    if (isSortingMode) {
                      const confirmed = window.confirm('¿Deseas salir del modo de ordenar para abrir los filtros?');
                      if (!confirmed) {
                        return;
                      }
                      setIsSortingMode(false);
                    }
                    setShowFilters(true);
                    setShowActionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg"
                >
                  <Filter className="w-4 h-4" />
                  Añadir filtros
                </button>
                <button
                  onClick={enterSortingMode}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Ordenar hábitos
                </button>
                {setFocusMode && (
                  <button
                    onClick={() => {
                      setFocusMode(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors last:rounded-b-lg"
                  >
                    <Focus className="w-4 h-4" />
                    Modo foco
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estadísticas discretas - solo en vista diaria y no en modo foco */}
      {!focusMode && viewType === 'daily' && stats && (
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
      
      {/* Filtros por tipo - mostrados condicionalmente y no en modo foco */}
      {!focusMode && showFilters && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'todo', label: 'To Do' },
                { value: 'todont', label: "To Don't" },
                { value: 'horas', label: 'Horas' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    filterType === filter.value
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowFilters(false);
                setFilterType('todos'); // Resetear filtro a "todos" al cerrar
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
              aria-label="Cerrar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
            <thead className="border-t-2 border-x-2 border-gray-300">
              {/* Fila con indicador de semana - oculto en modo foco */}
              {!focusMode && weekInfo && (
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th colSpan={9} className="py-2 px-3 text-center text-sm font-semibold text-gray-700">
                    {weekInfo.startDate} - {weekInfo.endDate}
                    <span className="mx-2 text-gray-400">•</span>
                    Semana {weekInfo.weekNumber}/{weekInfo.totalWeeks}
                  </th>
                </tr>
              )}
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="py-2 px-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px] border-l-2 border-gray-300">
                  Hábito
                </th>
                {weekDates.map((date) => {
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                  const dayNumber = dateObj.getDate();
                  const isToday = date === today;
                  const allCompleted = areAllHabitsCompletedForDay(date);
                  return (
                    <th 
                      key={date}
                      className={`py-2 px-3 text-center text-xs font-semibold border-r border-gray-200 ${
                        allCompleted
                          ? 'bg-green-100 text-green-700'
                          : isToday
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{dayName}</span>
                        <span className="text-lg font-bold">{dayNumber}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-2 px-3 text-center text-sm font-semibold text-gray-700 border-l-4 border-indigo-300 bg-indigo-50/50 min-w-[150px] border-r-2 border-gray-300">
                  Totales
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Grupo: To Do */}
              {habitsByType.todo.length > 0 && (
                <>
                  <tr className="bg-green-50/30 border-t-2 border-gray-300">
                    <td colSpan={9} className="py-1.5 px-2 text-xs font-semibold text-green-700 uppercase">
                      To Do
                    </td>
                  </tr>
                  {habitsByType.todo.map((habit) => (
                    <tr 
                      key={habit.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2 px-3 sticky left-0 bg-white z-10 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="flex-1">{habit.name}</span>
                          {viewType === 'weekly' && isSortingMode && (
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveHabit(habit.id, 'up')}
                                disabled={!canMoveHabit(habit.id, 'up', habitsByType.todo)}
                                className={`p-1 rounded transition-all ${
                                  canMoveHabit(habit.id, 'up', habitsByType.todo)
                                    ? 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title="Mover arriba"
                                aria-label="Mover arriba"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveHabit(habit.id, 'down')}
                                disabled={!canMoveHabit(habit.id, 'down', habitsByType.todo)}
                                className={`p-1 rounded transition-all ${
                                  canMoveHabit(habit.id, 'down', habitsByType.todo)
                                    ? 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title="Mover abajo"
                                aria-label="Mover abajo"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {weekDates.map(date => renderHabitCell(habit, date))}
                      {renderWeeklyAggregates(habit)}
                    </tr>
                  ))}
                </>
              )}
              
              {/* Grupo: To Don't */}
              {habitsByType.todont.length > 0 && (
                <>
                  <tr className={`bg-red-50/30 ${habitsByType.todo.length === 0 ? 'border-t-2 border-gray-300' : ''}`}>
                    <td colSpan={9} className="py-1.5 px-2 text-xs font-semibold text-red-700 uppercase">
                      To Don&apos;t
                    </td>
                  </tr>
                  {habitsByType.todont.map((habit) => (
                    <tr 
                      key={habit.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2 px-3 sticky left-0 bg-white z-10 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="flex-1">{habit.name}</span>
                          {viewType === 'weekly' && isSortingMode && (
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveHabit(habit.id, 'up')}
                                disabled={!canMoveHabit(habit.id, 'up', habitsByType.todont)}
                                className={`p-1 rounded transition-all ${
                                  canMoveHabit(habit.id, 'up', habitsByType.todont)
                                    ? 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title="Mover arriba"
                                aria-label="Mover arriba"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveHabit(habit.id, 'down')}
                                disabled={!canMoveHabit(habit.id, 'down', habitsByType.todont)}
                                className={`p-1 rounded transition-all ${
                                  canMoveHabit(habit.id, 'down', habitsByType.todont)
                                    ? 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title="Mover abajo"
                                aria-label="Mover abajo"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {weekDates.map(date => renderHabitCell(habit, date))}
                      {renderWeeklyAggregates(habit)}
                    </tr>
                  ))}
                </>
              )}
              
              {/* Grupo: Horas */}
              {habitsByType.horas.length > 0 && (
                <>
                  <tr className={`bg-blue-50/30 ${habitsByType.todo.length === 0 && habitsByType.todont.length === 0 ? 'border-t-2 border-gray-300' : ''}`}>
                    <td colSpan={9} className="py-1.5 px-2 text-xs font-semibold text-blue-700 uppercase">
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
                        <td className="py-2 px-3 sticky left-0 bg-white z-10 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{habit.name}</span>
                            <div className="flex items-center gap-1">
                              {isExpanded ? (
                                <>
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
                                </>
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
                              {viewType === 'weekly' && isSortingMode && (
                                <div className="flex flex-col gap-0.5 ml-1">
                                  <button
                                    onClick={() => handleMoveHabit(habit.id, 'up')}
                                    disabled={!canMoveHabit(habit.id, 'up', habitsByType.horas)}
                                    className={`p-1 rounded transition-all ${
                                      canMoveHabit(habit.id, 'up', habitsByType.horas)
                                        ? 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                    }`}
                                    title="Mover arriba"
                                    aria-label="Mover arriba"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveHabit(habit.id, 'down')}
                                    disabled={!canMoveHabit(habit.id, 'down', habitsByType.horas)}
                                    className={`p-1 rounded transition-all ${
                                      canMoveHabit(habit.id, 'down', habitsByType.horas)
                                        ? 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                    }`}
                                    title="Mover abajo"
                                    aria-label="Mover abajo"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {weekDates.map(date => renderHabitCell(habit, date))}
                        {renderWeeklyAggregates(habit)}
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
            const goal = getGoalForDate(habit, selectedDate);
            isCompleted = Number(dateValue) >= goal;
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
                return 'bg-green-50 border-red-300';
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
                return <CheckCircle2 className="w-6 h-6 text-green-600" />;
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
                      {habitType === 'horas' && (() => {
                        const goal = getGoalForDate(habit, selectedDate);
                        return (
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
                              / {goal} h
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
                        );
                      })()}
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

