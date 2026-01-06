# FocusMind - Habit Tracker

Un rastreador de hábitos moderno construido con React, Vite, Firebase y Tailwind CSS.

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js instalado
- Una cuenta en Firebase con un proyecto creado

### Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Configura Firebase:

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

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
momentum-v3/
├── src/
│   ├── App.jsx          # Componente principal
│   ├── firebase.js      # Configuración de Firebase
│   ├── main.jsx         # Punto de entrada
│   └── index.css        # Estilos globales con Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🔥 Configuración de Firebase

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a Configuración del proyecto > Tus aplicaciones
4. Selecciona la opción Web (</>)
5. Copia la configuración y pégala en tu archivo `.env`

### Reglas de Seguridad

Asegúrate de configurar las Security Rules en Firebase Console para proteger tus datos:

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

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter

## ✨ Características

- ✅ Seguimiento de hábitos diarios
- 📊 Estadísticas y progreso
- 🎯 Soporte para hábitos booleanos (sí/no) y numéricos
- 🔄 Sincronización en tiempo real con Firebase
- 📱 Diseño responsive y moderno

## 📝 Notas

- La aplicación usa autenticación anónima de Firebase para desarrollo local
- En producción, considera implementar autenticación de usuarios completa
- Los datos se almacenan en Firestore bajo la colección `habits`

