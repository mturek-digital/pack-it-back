import React, { useState } from 'react';
import { Package, ShieldCheck, Truck, RefreshCcw, Check, ArrowRight, ChevronRight, ChevronLeft, Eye, Sparkles, AlertCircle, Loader } from 'lucide-react';
import './style.css';

const REASONS = [
  "Za mały / Za duży",
  "Produkt niezgodny z opisem",
  "Uszkodzony w transporcie",
  "Nie podoba mi się / Zmiana decyzji",
  "Wada fabryczna"
];

function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [orderRef, setOrderRef] = useState('');
  const [email, setEmail] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [requestType, setRequestType] = useState('RETURN');
  const [selectedItems, setSelectedItems] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', postal: '', city: '', iban: '' });
  const [returnNo, setReturnNo] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:3000/api/returns/prestashop/${orderRef}?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setOrderData(data);
        setCustomer(data.customer);
        setStep(2);
      } else {
        const err = await res.json();
        setError(err.error || 'Numer zamówienia i e-mail nie pasują do siebie.');
      }
    } catch {
      setError('Błąd połączenia z serwerem.');
    }
    setLoading(false);
  };

  const toggleItem = (item) => {
    const exists = selectedItems.find(i => i.product_name === item.product_name);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.product_name !== item.product_name));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantityToReturn: 1, reason: '', note: '', solution: 'Zwrot środków' }]);
    }
  };

  const updateItem = (name, field, value) => {
    setSelectedItems(selectedItems.map(i => i.product_name === name ? { ...i, [field]: value } : i));
  };

  const submitForm = async () => {
  setLoading(true);
  try {
    const res = await fetch('http://localhost:3000/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_number: orderRef,
        customer_email: email,
        customer_data: customer, // Obiekt z name, phone, address, postal, city, iban
        request_type: requestType,
        items: selectedItems.map(i => ({
          product_name: i.product_name,
          quantity: i.quantityToReturn,
          reason_type: requestType === 'RETURN' ? i.reason : i.solution,
          reason_comment: i.note
        }))
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      setReturnNo(data.returnNo);
      setStep(5);
      setTimeout(() => { window.location.href = 'https://wygodnezwroty.pl/'; }, 4000);
    }
  } catch (err) {
    setError('Błąd podczas wysyłania zgłoszenia.');
  }
  setLoading(false);
};

  return (
    <>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="wrapper">
        <div className="logo-container">
          <Package size={38} className="blue-text" /> 
          <span>Pack <span className="blue-text">It</span> Back</span>
        </div>

        <div className="glass-card fade-in">
          {step < 5 && (
            <div className="stepper-nav">
              {[1, 2, 3, 4].map(n => <div key={n} className={`step-node ${step === n ? 'active' : ''}`} />)}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSearch}>
              <h1>Wyszukaj zamówienie</h1>
              <p className="subtitle">Podaj dane, aby rozpocząć proces.</p>
              {error && <div className="alert alert-error"><AlertCircle size={18}/><span>{error}</span></div>}
              <div className="field">
                <label>Numer zamówienia</label>
                <input value={orderRef} onChange={e => setOrderRef(e.target.value)} placeholder="FS0..." required />
              </div>
              <div className="field">
                <label>Twój e-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="adam@nowak.pl" required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader className="spin" size={18}/> : <>Szukaj zamówienia <ArrowRight size={18}/></>}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h1>Wybierz produkty</h1>
              <div className="grid-choices">
                <div className={`choice-card ${requestType === 'RETURN' ? 'selected' : ''}`} onClick={() => {setRequestType('RETURN'); setSelectedItems([])}}>Zwrot</div>
                <div className={`choice-card ${requestType === 'COMPLAINT' ? 'selected' : ''}`} onClick={() => {setRequestType('COMPLAINT'); setSelectedItems([])}}>Reklamacja</div>
              </div>
              <div className="list">
                {orderData.items.map((item, idx) => {
                  const isSelected = selectedItems.find(i => i.product_name === item.product_name);
                  return (
                    <div key={idx} className={`product-tile ${isSelected ? 'active' : ''}`} onClick={() => toggleItem(item)}>
                      <div className="product-row-header">
                        <div className="checkbox-ui"><Check /></div>
                        <img src={item.imgUrl} alt="" className="product-thumb" />
                        <div className="product-content">
                          <p className="product-name">{item.product_name}</p>
                          <p className="product-meta">Sztuk: {item.quantity} | {Number(item.price).toFixed(2)} PLN</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="product-form" onClick={e => e.stopPropagation()}>
                          <div className="grid-2">
                            <div className="field">
                              <label>Ilość</label>
                              <input type="number" min="1" max={item.quantity} value={isSelected.quantityToReturn} onChange={e => updateItem(item.product_name, 'quantityToReturn', e.target.value)} />
                            </div>
                            <div className="field">
                              <label>{requestType === 'RETURN' ? 'Powód zwrotu' : 'Oczekiwanie'}</label>
                              <select value={requestType === 'RETURN' ? isSelected.reason : isSelected.solution} onChange={e => updateItem(item.product_name, requestType === 'RETURN' ? 'reason' : 'solution', e.target.value)}>
                                <option value="">Wybierz...</option>
                                {requestType === 'RETURN' ? REASONS.map(r => <option key={r} value={r}>{r}</option>) : <><option value="Wymiana">Wymiana</option><option value="Zwrot pieniędzy">Zwrot pieniędzy</option></>}
                              </select>
                            </div>
                          </div>
                          {requestType === 'COMPLAINT' && (
                            <div className="field">
                              <label>Opisz wadę produktu</label>
                              <textarea rows="2" value={isSelected.note} onChange={e => updateItem(item.product_name, 'note', e.target.value)} placeholder="Np. rozprucie na szwie..."></textarea>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button className="btn-primary" onClick={() => setStep(3)}>Dalej <ChevronRight size={18}/></button>
              <button className="btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={16}/> Wróć</button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <h1>Dane kontaktowe</h1>
              <div className="field"><label>Imię i Nazwisko</label><input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} /></div>
              <div className="field"><label>Ulica i numer</label><input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} /></div>
              <div className="grid-2">
                <div className="field"><label>Kod pocztowy</label><input value={customer.postal} onChange={e => setCustomer({...customer, postal: e.target.value})} placeholder="00-000" /></div>
                <div className="field"><label>Miasto</label><input value={customer.city} onChange={e => setCustomer({...customer, city: e.target.value})} /></div>
              </div>
              <div className="field"><label>Numer konta (IBAN)</label><input value={customer.iban} onChange={e => setCustomer({...customer, iban: e.target.value})} placeholder="PL..." /></div>
              <button className="btn-primary" onClick={() => setStep(4)}>Podsumowanie <Eye size={18}/></button>
              <button className="btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={16}/> Wróć</button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <h1>Podsumowanie</h1>
              <div className="summary-box">
                <div className="summary-row"><span>Typ zgłoszenia:</span><strong>{requestType === 'RETURN' ? 'Zwrot' : 'Reklamacja'}</strong></div>
                <div className="summary-row"><span>Zamówienie:</span><strong>{orderRef}</strong></div>
                <div className="summary-row"><span>Klient:</span><strong>{customer.name}</strong></div>
                <div className="summary-row"><span>Adres:</span><strong>{customer.address}, {customer.city}</strong></div>
                <div className="summary-row"><span>IBAN:</span><strong>{customer.iban || 'Brak'}</strong></div>
                <div className="summary-row"><span>Wybrane produkty:</span><strong>{selectedItems.length} szt.</strong></div>
              </div>
              <button className="btn-primary" onClick={submitForm} disabled={loading}>
                {loading ? <Loader className="spin" size={18}/> : <>Wyślij zgłoszenie <Sparkles size={18}/></>}
              </button>
              <button className="btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={16}/> Popraw dane</button>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: 'center' }} className="fade-in">
              <div className="success-icon"><Check size={32} /></div>
              <h1>Gotowe!</h1>
              <p className="subtitle">Numer RMA: <strong>{returnNo}</strong></p>
              <p>Zaraz zostaniesz przekierowany do Wygodne Zwroty...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;