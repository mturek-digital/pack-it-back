import React, { useState } from 'react';
import { Package, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Logins = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('pib_token', data.token);
        onLogin();
      } else {
        setError(data.error || 'Błędne dane logowania.');
      }
    } catch {
      setError('Błąd połączenia z serwerem.');
    }

    setLoading(false);
  };

  return (
    <div id="pib-login-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <Package size={60} color="#2563eb" style={{ marginBottom: 15 }} />
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Pack <span style={{ color: '#2563eb' }}>It</span> Back</h1>
        <p style={{ color: '#64748b', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', marginTop: 5 }}>Admin Panel</p>
      </div>

      <div style={{ background: 'white', padding: 40, borderRadius: 24, border: '1px solid #e2e8f0', width: '100%', maxWidth: 400, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#991b1b', fontSize: 14, fontWeight: 600 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 8 }}>ADRES E-MAIL</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: 16, color: '#94a3b8' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@admin.pl" required style={{ width: '100%', height: 50, paddingLeft: 40, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15 }} />
            </div>
          </div>
          <div style={{ marginBottom: 25 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 8 }}>HASŁO</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: 16, color: '#94a3b8' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', height: 50, paddingLeft: 40, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15 }} />
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', height: 55, borderRadius: 12, fontWeight: 800, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15 }}>
            {loading ? 'Logowanie...' : <> Zaloguj się <ArrowRight size={18} /> </>}
          </button>
        </form>
      </div>

      <footer style={{ marginTop: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
        Marcel Turek &nbsp;·&nbsp;
        <a href="https://github.com/mturek" style={{ color: '#94a3b8', textDecoration: 'none' }}>github.com/mturek</a>
        &nbsp;·&nbsp; 2025
      </footer>
    </div>
  );
};

export default Logins;