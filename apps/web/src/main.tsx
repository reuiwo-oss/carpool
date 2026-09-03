import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/ToastContext';
import { UnreadProvider } from './features/messages/UnreadContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* .app to powłoka o szerokości projektu — toast i pasek zakładek
            pozycjonują się względem niej, nie względem okna. */}
        <div className="app">
          <UnreadProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </UnreadProvider>
        </div>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
