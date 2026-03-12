import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './style.css'; // TA LINIA JEST KLUCZOWA

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);