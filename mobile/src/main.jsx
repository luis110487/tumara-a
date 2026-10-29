import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import './auth.css';
import './mobile-home.css';
import './categories.css';
import './results.css';
import './professional-profile.css';
import './request-service.css';
import './profile-screen.css';
import './mobile-chat.css';
import './account-menu.css';
import './my-requests.css';
import './pro-signup.css';
import './own-professional.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
