import React, { useState } from 'react';
import Logins from './pages/Logins';
import Dashboard from './pages/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Funkcja wywoływana po poprawnym wpisaniu danych w Logins.jsx
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard />
      ) : (
        <Logins onLogin={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;