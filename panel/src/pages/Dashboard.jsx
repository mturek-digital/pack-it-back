import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, LayoutDashboard, Search, ScanBarcode, X,
  Clock, CheckCircle, XCircle, Settings, InboxIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem('pib_token');

const authFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('pib_token');
    window.location.reload();
    return null;
  }
  return res;
};

const ConfirmDialog = ({ decision, note, onNoteChange, onConfirm, onCancel }) => {
  const isAccept = decision === 'ACCEPTED';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          {isAccept ? '✅ Potwierdź akceptację' : '❌ Potwierdź odrzucenie'}
        </h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          {isAccept ? 'Zgłoszenie zostanie oznaczone jako zaakceptowane.' : 'Zgłoszenie zostanie odrzucone. Podaj powód (opcjonalnie).'}
        </p>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 8 }}>NOTATKA DLA KLIENTA (OPCJONALNIE)</label>
          <textarea rows={3} value={note} onChange={e => onNoteChange(e.target.value)}
            placeholder={isAccept ? 'Np. Zwrot zostanie przelany w ciągu 3 dni roboczych.' : 'Np. Produkt nie posiada widocznych wad.'}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, resize: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Wróć</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: isAccept ? '#22c55e' : '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
            {isAccept ? 'Tak, akceptuj' : 'Tak, odrzuć'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SkeletonRow = () => (
  <tr>
    {[140, 100, 180, 80, 120, 70].map((w, i) => (
      <td key={i} style={{ padding: 15 }}>
        <div style={{ height: 14, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      </td>
    ))}
  </tr>
);

const Dashboard = () => {
  const [returns, setReturns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [waybillInput, setWaybillInput] = useState('');
  const [waybillSaving, setWaybillSaving] = useState(false);

  const fetchReturns = useCallback(async (p = 1) => {
    setIsLoading(true);
    const res = await authFetch(`${API}/api/returns?page=${p}`);
    if (!res) return;
    const data = await res.json();
    setReturns(data.data || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setPage(p);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchReturns(1); }, []);

  const filtered = returns.filter(r => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.order_number?.toLowerCase().includes(q) ||
      r.internal_return_no?.toLowerCase().includes(q) ||
      r.waybill?.toLowerCase() === q;
    const matchFilter = activeFilter === 'ALL' || r.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const handleOpen = async (id) => {
    const res = await authFetch(`${API}/api/returns/${id}`);
    if (!res) return;
    const data = await res.json();
    setSelected(data);
    setWaybillInput(data.waybill || '');
  };

  const requestDecision = (decision) => { setDecisionNote(''); setConfirmDialog({ decision }); };

  const confirmDecision = async () => {
    const { decision } = confirmDialog;
    const decisionLabel = decision === 'ACCEPTED' ? 'Zatwierdzono' : 'Odrzucono';
    const res = await authFetch(`${API}/api/returns/${selected.id}/decision`, {
      method: 'PUT',
      body: JSON.stringify({ status: decision, decision: decisionLabel, decision_note: decisionNote || null }),
    });
    if (!res) return;
    const updatedReturn = { ...selected, status: decision, decision: decisionLabel, decision_note: decisionNote || null };
    setReturns(prev => prev.map(r => r.id === selected.id ? { ...r, status: decision } : r));
    setSelected(updatedReturn);
    setConfirmDialog(null);
    setDecisionNote('');
  };

  const saveWaybill = async () => {
    setWaybillSaving(true);
    const res = await authFetch(`${API}/api/returns/${selected.id}/waybill`, {
      method: 'PUT',
      body: JSON.stringify({ waybill: waybillInput }),
    });
    if (!res) return;
    setReturns(prev => prev.map(r => r.id === selected.id ? { ...r, waybill: waybillInput } : r));
    setSelected(prev => ({ ...prev, waybill: waybillInput }));
    setWaybillSaving(false);
  };

  return (
    <div id="pib-dashboard-layout">
      <aside className="pib-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Package size={32} color="#2563eb" />
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Pack <span style={{ color: '#2563eb' }}>It</span> Back</h2>
        </div>
        <p className="sidebar-label">Menu</p>
        <div className={`sidebar-nav-item ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}><LayoutDashboard size={18} /> Wszystkie zgłoszenia</div>
        <p className="sidebar-label">Statusy</p>
        <div className={`sidebar-nav-item ${activeFilter === 'NEW' ? 'active' : ''}`} onClick={() => setActiveFilter('NEW')}><Clock size={18} /> Nowe</div>
        <div className={`sidebar-nav-item ${activeFilter === 'ACCEPTED' ? 'active' : ''}`} onClick={() => setActiveFilter('ACCEPTED')}><CheckCircle size={18} /> Zaakceptowane</div>
        <div className={`sidebar-nav-item ${activeFilter === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveFilter('REJECTED')}><XCircle size={18} /> Odrzucone</div>
        <div className="sidebar-nav-item" style={{ marginTop: 'auto' }}><Settings size={18} /> Ustawienia</div>
        <div style={{ paddingTop: 30, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>Marcel Turek</p>
          <a href="https://github.com/mturek" style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none' }}>github.com/mturek</a>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>2025</p>
        </div>
      </aside>

      <main className="pib-main">
        <header style={{ marginBottom: 30 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Zarządzanie zwrotami</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Łącznie zgłoszeń: {total}</p>
        </header>

        <div className="search-wrapper">
          <Search className="icon-left" size={20} />
          <input type="text" placeholder="Szukaj klienta, zamówienia lub skanuj list..." value={search} onChange={e => setSearch(e.target.value)} />
          <ScanBarcode className="icon-right" size={24} />
        </div>

        <table className="pib-data-table">
          <thead>
            <tr>
              <th>RMA</th>
              <th>Zamówienie</th>
              <th>Klient</th>
              <th>Źródło</th>
              <th>List przewozowy</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.map(ret => (
                <tr key={ret.id} onClick={() => handleOpen(ret.id)}>
                  <td style={{ fontWeight: 800, color: '#2563eb' }}>{ret.internal_return_no}</td>
                  <td style={{ fontWeight: 700 }}>{ret.order_number}</td>
                  <td>{ret.customer_email}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                      background: ret.source === 'ALLEGRO' ? '#fef3c7' : '#eff6ff',
                      color: ret.source === 'ALLEGRO' ? '#92400e' : '#1d4ed8',
                    }}>
                      {ret.source === 'ALLEGRO' ? '🛒 Allegro' : '🌐 Formularz'}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{ret.waybill || '---'}</td>
                  <td><span className={`badge status-${ret.status}`}>{ret.status}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>

        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
            <InboxIcon size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontWeight: 700, fontSize: 16 }}>Brak zgłoszeń</p>
            <p style={{ fontSize: 14, marginTop: 4 }}>{search ? 'Zmień kryteria wyszukiwania.' : 'Nie ma jeszcze żadnych zgłoszeń w tej kategorii.'}</p>
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
            <button onClick={() => fetchReturns(page - 1)} disabled={page === 1} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <ChevronLeft size={16} /> Poprzednia
            </button>
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Strona {page} z {pages}</span>
            <button onClick={() => fetchReturns(page + 1)} disabled={page === pages} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              Następna <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>

      {selected && (
        <div className="pib-modal-overlay">
          <div className="pib-modal-window">
            <div className="modal-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
                <div>
                  <h2 style={{ marginBottom: 6 }}>Szczegóły {selected.internal_return_no}</h2>
                  <span className={`badge status-${selected.status}`}>{selected.status}</span>
                </div>
                <X onClick={() => setSelected(null)} style={{ cursor: 'pointer', flexShrink: 0 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div>
                  <h4 style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', marginBottom: 15 }}>Dane klienta</h4>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12 }}>
                    <p style={{ marginBottom: 8 }}><strong>{selected.customer_name}</strong></p>
                    <p style={{ marginBottom: 8 }}>{selected.customer_email}</p>
                    <p style={{ marginBottom: 8 }}>{selected.customer_phone || 'Brak telefonu'}</p>
                    <p style={{ marginBottom: 8 }}>{selected.customer_address}, {selected.customer_postal} {selected.customer_city}</p>
                    <p style={{ marginTop: 10, color: '#2563eb', fontWeight: 700 }}>IBAN: {selected.customer_iban || 'Nie podano'}</p>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', marginBottom: 15 }}>Produkty</h4>
                  {selected.items?.map((item, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.product_name}</span><strong>x{item.quantity}</strong>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, padding: 15, background: '#fff7ed', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 800 }}>POWÓD:</p>
                    <p>{selected.items?.[0]?.reason_type}: {selected.items?.[0]?.reason_comment}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 30 }}>
                <h4 style={{ fontSize: 11, color: '#2563eb', textTransform: 'uppercase', marginBottom: 12 }}>List przewozowy</h4>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={waybillInput}
                    onChange={e => setWaybillInput(e.target.value)}
                    placeholder="Wpisz lub zeskanuj numer listu..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                  />
                  <button onClick={saveWaybill} disabled={waybillSaving} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                    {waybillSaving ? 'Zapisuję...' : 'Zapisz'}
                  </button>
                </div>
              </div>

              {selected.decision_note && (
                <div style={{ marginTop: 24, padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>NOTATKA DO DECYZJI</p>
                  <p style={{ fontSize: 14, color: '#166534' }}>{selected.decision_note}</p>
                </div>
              )}
            </div>

            <div className="modal-side">
              <h4 style={{ fontSize: 11, fontWeight: 800, marginBottom: 20 }}>DECYZJA</h4>
              {selected.status === 'NEW' ? (
                <>
                  <button style={{ width: '100%', padding: 15, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }} onClick={() => requestDecision('ACCEPTED')}>AKCEPTUJ</button>
                  <button style={{ width: '100%', padding: 15, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }} onClick={() => requestDecision('REJECTED')}>ODRZUĆ</button>
                </>
              ) : (
                <>
                  <div style={{ padding: 16, background: selected.status === 'ACCEPTED' ? '#ecfdf5' : '#fef2f2', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, color: selected.status === 'ACCEPTED' ? '#059669' : '#dc2626' }}>
                    {selected.status === 'ACCEPTED' ? '✅ Zaakceptowano' : '❌ Odrzucono'}
                  </div>
                  <button style={{ width: '100%', padding: 12, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13, color: '#64748b' }} onClick={() => requestDecision(selected.status === 'ACCEPTED' ? 'REJECTED' : 'ACCEPTED')}>
                    Zmień decyzję
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          decision={confirmDialog.decision}
          note={decisionNote}
          onNoteChange={setDecisionNote}
          onConfirm={confirmDecision}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;