import React, { useState, useEffect } from 'react';
import { Package, LayoutDashboard, Search, ScanBarcode, X, Clock, CheckCircle, XCircle, Settings, User, Mail, MapPin, Phone, CreditCard } from 'lucide-react';

const Dashboard = () => {
  const [returns, setReturns] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    fetch('http://localhost:3000/api/returns')
      .then(res => res.json())
      .then(data => { setReturns(data); setFiltered(data); });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    const results = returns.filter(r => 
      r.customer_email?.toLowerCase().includes(q) ||
      r.order_number?.toLowerCase().includes(q) ||
      r.internal_return_no?.toLowerCase().includes(q) ||
      r.waybill?.toLowerCase() === q
    );
    const final = activeFilter === 'ALL' ? results : results.filter(r => r.status === activeFilter);
    setFiltered(final);
    // Auto-open przy skanowaniu listu
    if (results.length === 1 && results[0].waybill?.toLowerCase() === q) handleOpen(results[0].id);
  }, [search, returns, activeFilter]);

  const handleOpen = (id) => {
    fetch(`http://localhost:3000/api/returns/${id}`)
      .then(res => res.json())
      .then(data => setSelected(data));
  };

  const updateStatus = (status) => {
    fetch(`http://localhost:3000/api/returns/${selected.id}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, decision: status === 'ACCEPTED' ? 'Zatwierdzono' : 'Odrzucono' })
    }).then(() => { setSelected(null); window.location.reload(); });
  };

  return (
    <div id="pib-dashboard-layout">
      <aside className="pib-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Package size={32} color="#2563eb" />
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Pack <span style={{color: '#2563eb'}}>It</span> Back</h2>
        </div>
        <p className="sidebar-label">Menu</p>
        <div className={`sidebar-nav-item ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}>
          <LayoutDashboard size={18} /> Wszystkie zgłoszenia
        </div>
        <p className="sidebar-label">Statusy</p>
        <div className={`sidebar-nav-item ${activeFilter === 'NEW' ? 'active' : ''}`} onClick={() => setActiveFilter('NEW')}><Clock size={18} /> Nowe</div>
        <div className={`sidebar-nav-item ${activeFilter === 'ACCEPTED' ? 'active' : ''}`} onClick={() => setActiveFilter('ACCEPTED')}><CheckCircle size={18} /> Zaakceptowane</div>
        <div className={`sidebar-nav-item ${activeFilter === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveFilter('REJECTED')}><XCircle size={18} /> Odrzucone</div>
        <div className="sidebar-nav-item" style={{marginTop: 'auto'}}><Settings size={18} /> Ustawienia</div>
      </aside>

      <main className="pib-main">
        <header style={{ marginBottom: 30 }}><h1 style={{ fontSize: 28, fontWeight: 800 }}>Zarządzanie zwrotami</h1></header>
        <div className="search-wrapper">
          <Search className="icon-left" size={20} />
          <input type="text" placeholder="Szukaj klienta, zamówienia lub skanuj list..." value={search} onChange={e => setSearch(e.target.value)} />
          <ScanBarcode className="icon-right" size={24} />
        </div>
        <table className="pib-data-table">
          <thead>
            <tr><th>RMA</th><th>Zamówienie</th><th>Klient</th><th>List przewozowy</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(ret => (
              <tr key={ret.id} onClick={() => handleOpen(ret.id)}>
                <td style={{ fontWeight: 800, color: '#2563eb' }}>{ret.internal_return_no}</td>
                <td style={{ fontWeight: 700 }}>{ret.order_number}</td>
                <td>{ret.customer_email}</td>
                <td style={{color: '#94a3b8'}}>{ret.waybill || '---'}</td>
                <td><span className={`badge status-${ret.status}`}>{ret.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {selected && (
        <div className="pib-modal-overlay">
          <div className="pib-modal-window">
            <div className="modal-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
                <h2>Szczegóły {selected.internal_return_no}</h2>
                <X onClick={() => setSelected(null)} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div>
                  <h4 style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', marginBottom: 15 }}>Dane klienta</h4>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12 }}>
                    <p style={{marginBottom: 8}}><User size={14} inline /> <strong>{selected.customer_name}</strong></p>
                    <p style={{marginBottom: 8}}><Mail size={14} inline /> {selected.customer_email}</p>
                    <p style={{marginBottom: 8}}><Phone size={14} inline /> {selected.customer_phone || 'Brak telefonu'}</p>
                    <p style={{marginBottom: 8}}><MapPin size={14} inline /> {selected.customer_address}, {selected.customer_postal} {selected.customer_city}</p>
                    <p style={{marginTop: 10, color: '#2563eb', fontWeight: 700}}><CreditCard size={14} inline /> IBAN: {selected.customer_iban || 'Nie podano'}</p>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', marginBottom: 15 }}>Produkty</h4>
                  {selected.items?.map((item, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.product_name}</span> <strong>x{item.quantity}</strong>
                    </div>
                  ))}
                  <div style={{marginTop: 20, padding: 15, background: '#fff7ed', borderRadius: 10}}>
                    <p style={{fontSize: 11, fontWeight: 800}}>POWÓD:</p>
                    <p>{selected.items?.[0]?.reason_type}: {selected.items?.[0]?.reason_comment}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-side">
              <h4 style={{fontSize: 11, fontWeight: 800, marginBottom: 20}}>DECYZJA</h4>
              <button style={{ width: '100%', padding: 15, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }} onClick={() => updateStatus('ACCEPTED')}>AKCEPTUJ</button>
              <button style={{ width: '100%', padding: 15, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }} onClick={() => updateStatus('REJECTED')}>ODRZUĆ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;