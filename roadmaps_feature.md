# Funcionalidad: Roadmaps Personalizados (FocusMind)

Esta funcionalidad permite a los usuarios definir y rastrear metas complejas a largo plazo mediante un sistema jerárquico de roadmaps interactivos con visualización de grafos de nodos.

---

## 🗂️ Modelo de Objetos

El modelo de datos se estructura en tres niveles jerárquicos:

1. **Objetivo Final (Roadmap)**:
   * Representa la meta principal (ej. *"Cobrar 100.000 € como programador"*).
   * Contiene un porcentaje de completado general (`pctg`), calculado dinámicamente según el progreso de sus pasos.
   * Contiene una lista de subobjetivos.

2. **Subobjetivo**:
   * Divisiones o hitos principales necesarios para lograr el objetivo final (ej. *"Aprender React a nivel avanzado"*, *"Conseguir nivel C1 de Inglés"*).
   * Contiene un porcentaje de completado individual (`pctg`), calculado según el progreso de sus pasos.
   * Contiene una lista de pasos (`steps`).

3. **Step (Paso)**:
   * Tareas atómicas concretas e independientes (ej. *"Terminar el curso de Hooks avanzados"*, *"Aprobar el examen EF SET"*).
   * Contiene un nombre (`name`) y un estado de completado (`completed` - booleano).

### Relaciones y Cardinalidad
* Un objetivo final puede tener **N** subobjetivos.
* Un subobjetivo puede tener **M** pasos.
* La adición y remoción de subobjetivos y pasos es ilimitada y flexible.

---

## 🗄️ Esquema de Base de Datos (Firestore)

Para mantener la consistencia del backend sin requerir cambios en las reglas de seguridad de Firebase, las roadmaps se almacenan directamente en la colección `habits` y se diferencian por el campo `type: 'roadmap'`.

### Estructura del Documento `roadmap`

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `string` | ID único del documento (UUID o generado por Firestore). |
| `userId` | `string` | ID de usuario de Firebase Auth. |
| `type` | `string` | Valor fijo `'roadmap'`. |
| `name` | `string` | Nombre del objetivo final. |
| `pctg` | `number` | Progreso total (completados / total_pasos) * 100. |
| `createdAt` | `string` | Timestamp ISO 8601 de creación. |
| `updatedAt` | `string` | Timestamp ISO 8601 de última actualización. |
| `subgoals` | `array` | Lista de subobjetivos en formato JSON. |

#### Formato JSON del array `subgoals`
```json
[
  {
    "id": "subgoal-uuid-1",
    "name": "Aprender React a nivel avanzado",
    "pctg": 50,
    "steps": [
      {
        "id": "step-uuid-1",
        "name": "Completar la sección de Hooks",
        "completed": true
      },
      {
        "id": "step-uuid-2",
        "name": "Crear un clon de Trello con Drag & Drop",
        "completed": false
      }
    ]
  }
]
```

---

## 🎨 Diseño de Interfaz y Vistas

La funcionalidad se implementa a través de dos vistas principales interconectadas:

### 1. Panel de Roadmaps (Listado General)
* Una cuadrícula donde el usuario ve todos sus objetivos activos.
* Cada tarjeta muestra:
  * El nombre del Objetivo Final.
  * Una barra de progreso animada con su porcentaje total.
  * Un resumen numérico (ej. *"3 subobjetivos, 12 pasos (8 completados)"*).
  * Fecha de creación.
  * Botones para entrar al detalle, renombrar o eliminar.
* Un botón destacado **"+ Crear Roadmap"** que despliega un diálogo simple para definir la meta final.

### 2. Tablero de Roadmap Interactivo (Vista de Nodos)
Una interfaz gráfica premium que visualiza la meta en forma de árbol de nodos conectados mediante líneas dinámicas SVGs:

* **Columna 1: Nodo Raíz (Meta Principal)**
  * Tarjeta de gran tamaño con fondo gradiente (`from-indigo-600 to-purple-600`), sombra difuminada y un indicador de progreso circular.
  * Botón integrado **"+ Subobjetivo"** para añadir hitos principales rápidamente.
* **Columna 2: Nodos de Subobjetivos**
  * Tarjetas de estilo glassmorphism que muestran el nombre del subobjetivo, su barra de progreso y el número de pasos completados.
  * Botón integrado **"+ Paso"** para añadir tareas secundarias.
  * Menú contextual/iconos de edición al pasar el ratón para renombrar o eliminar.
* **Columna 3: Nodos de Pasos**
  * Tarjetas compactas con un checkbox personalizado. Al completarse, el fondo cambia de color (`bg-emerald-500/10` y borde verde) con una transición suave.
  * El texto es editable al hacer clic en él para agilizar la administración del roadmap.
  * Botón de eliminación en hover.

### Conexión Dinámica por Nodos (SVG Canvas Overlay)
Las conexiones se dibujan usando un canvas SVG absoluto superpuesto en segundo plano. 
* Un script calcula las coordenadas de los bordes derecho e izquierdo de las tarjetas conectadas usando `getBoundingClientRect()` relativo al contenedor padre.
* Las líneas se dibujan usando curvas Bézier cúbicas (`C`) con degradados lineales y brillo sutil para un acabado de alta gama.
* Las conexiones que van hacia pasos o subobjetivos completados se iluminan en color verde (`#10b981`), mientras que las pendientes se muestran en un tono gris/índigo translúcido.
