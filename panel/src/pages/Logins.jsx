import React, { useState } from 'react';
import { Package, Lock, User, ArrowRight } from 'lucide-react';

const Logins = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Sztywne dane logowania
    if (email === 'admin@admin.pl' && password === 'admin123') {
      onLogin();
    } else {
      alert("Błędne dane logowania!");
    }
  };

  return (
    <div id="pib-login-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <Package size={60} color="#2563eb" style={{ marginBottom: 15 }} />
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Pack <span style={{ color: '#2563eb' }}>It</span> Back</h1>
        <p style={{ color: '#64748b', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', marginTop: 5 }}>Admin Panel</p>
      </div>

      <div className="login-box" style={{ background: 'white', padding: 40, borderRadius: 24, border: '1px solid #e2e8f0', width: '100%', maxWidth: 400, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 8 }}>ADRES E-MAIL</label>
            <div className="pib-input-field" style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: 16, color: '#94a3b8' }} />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="admin@admin.pl" 
                required 
                style={{ width: '100%', height: 50, paddingLeft: 40, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 25 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 8 }}>HASŁO</label>
            <div className="pib-input-field" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: 16, color: '#94a3b8' }} />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                style={{ width: '100%', height: 50, paddingLeft: 40, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </div>
          </div>
          <button 
            type="submit" 
            style={{ background: '#2563eb', color: 'white', border: 'none', height: 55, borderRadius: 12, fontWeight: 800, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            Zaloguj się <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Logins;