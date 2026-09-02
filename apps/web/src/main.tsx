import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/ToastContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* .app to powłoka o szerokości projektu — toast i pasek zakładek
            pozycjonują się względem niej, nie względem okna. */}
        <div className="app">
          <ToastProvider>
            <App />
          </ToastProvider>
        </div>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
