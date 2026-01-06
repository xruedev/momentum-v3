# FocusMind - Habit Tracker

Un rastreador de hábitos moderno construido con React, Vite, Firebase y Tailwind CSS.

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Una cuenta en Firebase con un proyecto creado

### Instalación

1. **Clona o descarga el proyecto**

2. **Instala las dependencias:**
```bash
npm install
```

3. **Configura Firebase:**

Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY="tu-api-key"
VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="tu-proyecto-id"
VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="tu-sender-id"
VITE_FIREBASE_APP_ID="tu-app-id"
VITE_FIREBASE_MEASUREMENT_ID="tu-measurement-id"
VITE_APP_ID="habit-tracker-pro"
```

**Cómo obtener tus credenciales:**
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a Configuración del proyecto (⚙️) > Tus aplicaciones
4. Selecciona la opción Web (</>)
5. Copia los valores del objeto `firebaseConfig` y úsalos en tu `.env`

4. **Configura las reglas de seguridad de Firestore:**

Ve a Firestore Database > Reglas y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /habits/{habitId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Inicia el servidor de desarrollo:**
```bash
npm run dev
```

6. **Abre tu navegador:**
La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne)

## 🧪 Cómo Probar la Aplicación

### Pruebas Básicas

1. **Crear un hábito:**
   - Haz clic en el botón "Agregar nuevo hábito" o "Crear tu primer hábito"
   - Completa el formulario:
     - Nombre: Ej. "Hacer ejercicio"
     - Tipo: Selecciona "Sí/No" o "Numérico"
     - Si es numérico, establece una meta (ej. 10,000 pasos)
   - Haz clic en "Crear"

2. **Marcar un hábito como completado:**
   - Para hábitos tipo "Sí/No": Haz clic en el círculo vacío
   - Debería cambiar a un círculo verde con check ✓

3. **Actualizar un hábito numérico:**
   - Para hábitos numéricos, usa los botones `+` y `-`
   - El contador muestra: `valor actual / meta`

4. **Ver estadísticas:**
   - Cambia a la pestaña "Estadísticas"
   - Verás días completados y días registrados por cada hábito

5. **Eliminar un hábito:**
   - Haz clic en el icono de papelera (🗑️) junto al hábito
   - El hábito se eliminará de Firebase

### Verificar Sincronización en Tiempo Real

1. Abre la aplicación en dos pestañas diferentes del navegador
2. Crea o modifica un hábito en una pestaña
3. Deberías ver los cambios reflejados automáticamente en la otra pestaña

### Verificar Datos en Firebase

1. Ve a la Consola de Firebase > Firestore Database
2. Deberías ver una colección llamada `habits`
3. Cada documento representa un hábito con su historial

## 📁 Estructura del Proyecto

```
momentum-v3/
├── src/
│   ├── App.jsx          # Componente principal con toda la lógica
│   ├── firebase.js      # Configuración de Firebase
│   ├── main.jsx         # Punto de entrada de React
│   └── index.css        # Estilos globales con Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env                 # Variables de entorno (no incluido en git)
```

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo con hot-reload
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción localmente
- `npm run lint` - Ejecuta el linter para verificar el código

## ✨ Características

- ✅ Seguimiento de hábitos diarios
- 📊 Estadísticas y progreso visual
- 🎯 Soporte para hábitos booleanos (sí/no) y numéricos
- 🔄 Sincronización en tiempo real con Firebase
- 📱 Diseño responsive y moderno
- 🎨 Interfaz intuitiva con Tailwind CSS
- 🔐 Autenticación anónima de Firebase

## 🐛 Solución de Problemas

### Error: "Firebase: Error (auth/configuration-not-found)"
- Verifica que el archivo `.env` existe y tiene todas las variables correctas
- Asegúrate de que no hay espacios extra alrededor del signo `=`
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "Missing or insufficient permissions"
- Verifica las reglas de seguridad de Firestore en la consola de Firebase
- Asegúrate de que permiten lectura/escritura para usuarios autenticados

### Los cambios no se reflejan
- Verifica la conexión a internet
- Revisa la consola del navegador para errores
- Asegúrate de que Firebase está configurado correctamente

### La aplicación no carga
- Verifica que todas las dependencias están instaladas: `npm install`
- Revisa que el puerto no está en uso
- Verifica los logs en la terminal donde ejecutaste `npm run dev`

## 📝 Notas

- La aplicación usa **autenticación anónima** de Firebase para desarrollo local
- En producción, considera implementar autenticación de usuarios completa
- Los datos se almacenan en Firestore bajo la colección `habits`
- Cada hábito tiene un historial que se actualiza diariamente

## 🔒 Seguridad

- **Nunca** subas el archivo `.env` a Git (ya está en `.gitignore`)
- Configura reglas de seguridad apropiadas en Firebase para producción
- Considera usar variables de entorno diferentes para desarrollo y producción

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal.

