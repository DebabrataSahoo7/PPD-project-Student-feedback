import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#1E293B',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '1rem',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
