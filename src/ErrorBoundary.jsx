import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Error en la Aplicación</h2>
              <p className="text-gray-600 mb-4">
                Ha ocurrido un error inesperado. Por favor, revisa la consola del navegador para más detalles.
              </p>
              {this.state.error && (
                <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700 mb-4">
                  <p className="font-mono text-red-600">{this.state.error.toString()}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
                <p className="font-semibold mb-2">Qué hacer:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Abre la consola del navegador (F12)</li>
                  <li>Revisa los errores en rojo</li>
                  <li>Verifica que todas las dependencias estén instaladas: <code className="bg-gray-200 px-1 rounded">npm install</code></li>
                  <li>Reinicia el servidor de desarrollo</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

