import React, { useState } from "react";
import {
  Package,
  Check,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Eye,
  Sparkles,
  AlertCircle,
  Loader,
  Copy,
  CheckCheck,
} from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_URL;

const REASONS = [
  "Za mały / Za duży",
  "Produkt niezgodny z opisem",
  "Uszkodzony w transporcie",
  "Nie podoba mi się / Zmiana decyzji",
  "Wada fabryczna",
];

const validateIBAN = (iban) => {
  if (!iban) return true;
  return /^PL\d{26}$/.test(iban.replace(/\s/g, "").toUpperCase());
};

const validatePostal = (postal) => {
  if (!postal) return true;
  return /^\d{2}-\d{3}$/.test(postal);
};

const allItemsHaveReason = (items, requestType) =>
  items.every((item) =>
    requestType === "RETURN" ? item.reason !== "" : item.solution !== "",
  );

function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orderRef, setOrderRef] = useState("");
  const [email, setEmail] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [requestType, setRequestType] = useState("RETURN");
  const [selectedItems, setSelectedItems] = useState([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    postal: "",
    city: "",
    iban: "",
  });
  const [ibanError, setIbanError] = useState("");
  const [postalError, setPostalError] = useState("");
  const [returnNo, setReturnNo] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API}/api/returns/prestashop/${orderRef}?email=${encodeURIComponent(email)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setOrderData(data);
        setCustomer(data.customer);
        setStep(2);
      } else {
        const err = await res.json();
        setError(
          err.error || "Numer zamówienia i e-mail nie pasują do siebie.",
        );
      }
    } catch {
      setError("Błąd połączenia z serwerem.");
    }
    setLoading(false);
  };

  const toggleItem = (item) => {
    const exists = selectedItems.find((i) => i.product_id === item.product_id);
    if (exists) {
      setSelectedItems(
        selectedItems.filter((i) => i.product_id !== item.product_id),
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        { ...item, quantityToReturn: 1, reason: "", note: "", solution: "" },
      ]);
    }
  };

  const updateItem = (productId, field, value) =>
    setSelectedItems(
      selectedItems.map((i) =>
        i.product_id === productId ? { ...i, [field]: value } : i,
      ),
    );

  const handleQuantityChange = (productId, value, maxQty) => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < 1)
      updateItem(productId, "quantityToReturn", 1);
    else if (parsed > maxQty) updateItem(productId, "quantityToReturn", maxQty);
    else updateItem(productId, "quantityToReturn", parsed);
  };

  const canProceedFromStep2 =
    selectedItems.length > 0 && allItemsHaveReason(selectedItems, requestType);

  const handleIbanChange = (value) => {
    setCustomer({ ...customer, iban: value });
    setIbanError(
      value && !validateIBAN(value)
        ? "Nieprawidłowy format IBAN. Wymagany: PL + 26 cyfr"
        : "",
    );
  };

  const handlePostalChange = (value) => {
    setCustomer({ ...customer, postal: value });
    setPostalError(
      value && !validatePostal(value)
        ? "Nieprawidłowy format. Wymagany: XX-XXX (np. 00-000)"
        : "",
    );
  };

  const canProceedFromStep3 = () => {
    if (
      !customer.name ||
      !customer.address ||
      !customer.postal ||
      !customer.city
    )
      return false;
    if (ibanError || postalError) return false;
    if (!validatePostal(customer.postal)) return false;
    return true;
  };

  const handleCopyRMA = () => {
    navigator.clipboard.writeText(returnNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const submitForm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderRef,
          customer_email: email,
          customer_data: customer,
          request_type: requestType,
          items: selectedItems.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantityToReturn,
            reason_type: requestType === "RETURN" ? i.reason : i.solution,
            reason_comment: i.note,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReturnNo(data.returnNo);
        setStep(5);
      } else {
        const err = await res.json();
        setError(err.error || "Błąd podczas wysyłania zgłoszenia.");
      }
    } catch {
      setError("Błąd podczas wysyłania zgłoszenia.");
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
          <span>
            Pack <span className="blue-text">It</span> Back
          </span>
        </div>

        <div className="glass-card fade-in">
          {step < 5 && (
            <div className="stepper-nav">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`step-node ${step === n ? "active" : ""}`}
                />
              ))}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSearch}>
              <h1>Wyszukaj zamówienie</h1>
              <p className="subtitle">Podaj dane, aby rozpocząć proces.</p>
              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              <div className="field">
                <label>Numer zamówienia</label>
                <input
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="FS0..."
                  required
                />
              </div>
              <div className="field">
                <label>Twój e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adam@nowak.pl"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <Loader className="spin" size={18} />
                ) : (
                  <>
                    Szukaj zamówienia <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h1>Wybierz produkty</h1>
              <div className="grid-choices">
                <div
                  className={`choice-card ${requestType === "RETURN" ? "selected" : ""}`}
                  onClick={() => {
                    setRequestType("RETURN");
                    setSelectedItems([]);
                  }}
                >
                  Zwrot
                </div>
                <div
                  className={`choice-card ${requestType === "COMPLAINT" ? "selected" : ""}`}
                  onClick={() => {
                    setRequestType("COMPLAINT");
                    setSelectedItems([]);
                  }}
                >
                  Reklamacja
                </div>
              </div>

              <div className="list">
                {orderData.items.map((item) => {
                  const isSelected = selectedItems.find(
                    (i) => i.product_id === item.product_id,
                  );
                  return (
                    <div
                      key={item.product_id}
                      className={`product-tile ${isSelected ? "active" : ""}`}
                      onClick={() => toggleItem(item)}
                    >
                      <div className="product-row-header">
                        <div className="checkbox-ui">
                          <Check />
                        </div>
                        <img
                          src={item.imgUrl}
                          alt=""
                          className="product-thumb"
                        />
                        <div className="product-content">
                          <p className="product-name">{item.product_name}</p>
                          <p className="product-meta">
                            Sztuk: {item.quantity} |{" "}
                            {Number(item.price).toFixed(2)} PLN
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          className="product-form"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid-2">
                            <div className="field">
                              <label>Ilość</label>
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={isSelected.quantityToReturn}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.product_id,
                                    e.target.value,
                                    item.quantity,
                                  )
                                }
                                onBlur={(e) =>
                                  handleQuantityChange(
                                    item.product_id,
                                    e.target.value,
                                    item.quantity,
                                  )
                                }
                              />
                            </div>
                            <div className="field">
                              <label>
                                {requestType === "RETURN"
                                  ? "Powód zwrotu"
                                  : "Oczekiwanie"}
                                <span
                                  style={{ color: "#ef4444", marginLeft: 3 }}
                                >
                                  *
                                </span>
                              </label>
                              <select
                                value={
                                  requestType === "RETURN"
                                    ? isSelected.reason
                                    : isSelected.solution
                                }
                                onChange={(e) =>
                                  updateItem(
                                    item.product_id,
                                    requestType === "RETURN"
                                      ? "reason"
                                      : "solution",
                                    e.target.value,
                                  )
                                }
                                style={{
                                  borderColor:
                                    (requestType === "RETURN"
                                      ? isSelected.reason
                                      : isSelected.solution) === ""
                                      ? "#fca5a5"
                                      : "",
                                }}
                              >
                                <option value="">Wybierz...</option>
                                {requestType === "RETURN" ? (
                                  REASONS.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="Wymiana">Wymiana</option>
                                    <option value="Zwrot pieniędzy">
                                      Zwrot pieniędzy
                                    </option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>
                          {requestType === "COMPLAINT" && (
                            <div className="field">
                              <label>Opisz wadę produktu</label>
                              <textarea
                                rows="2"
                                value={isSelected.note}
                                onChange={(e) =>
                                  updateItem(
                                    item.product_id,
                                    "note",
                                    e.target.value,
                                  )
                                }
                                placeholder="Np. rozprucie na szwie..."
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedItems.length > 0 &&
                !allItemsHaveReason(selectedItems, requestType) && (
                  <div className="alert alert-warning">
                    <AlertCircle size={18} />
                    <span>
                      Wybierz powód dla każdego zaznaczonego produktu.
                    </span>
                  </div>
                )}

              <button
                className="btn-primary"
                onClick={() => setStep(3)}
                disabled={!canProceedFromStep2}
              >
                Dalej <ChevronRight size={18} />
              </button>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Wróć
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <h1>Dane kontaktowe</h1>
              <div className="field">
                <label>
                  Imię i Nazwisko <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>
                  Ulica i numer <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>
                    Kod pocztowy <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={customer.postal}
                    onChange={(e) => handlePostalChange(e.target.value)}
                    placeholder="00-000"
                    style={{ borderColor: postalError ? "#fca5a5" : "" }}
                  />
                  {postalError && (
                    <p
                      style={{
                        color: "#dc2626",
                        fontSize: 12,
                        marginTop: 6,
                        fontWeight: 600,
                      }}
                    >
                      {postalError}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label>
                    Miasto <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={customer.city}
                    onChange={(e) =>
                      setCustomer({ ...customer, city: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>Numer konta (IBAN)</label>
                <input
                  value={customer.iban}
                  onChange={(e) => handleIbanChange(e.target.value)}
                  placeholder="PL00000000000000000000000000"
                  style={{ borderColor: ibanError ? "#fca5a5" : "" }}
                />
                {ibanError && (
                  <p
                    style={{
                      color: "#dc2626",
                      fontSize: 12,
                      marginTop: 6,
                      fontWeight: 600,
                    }}
                  >
                    {ibanError}
                  </p>
                )}
                <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                  Wymagany tylko przy zwrocie pieniędzy. Format: PL + 26 cyfr.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => setStep(4)}
                disabled={!canProceedFromStep3()}
              >
                Podsumowanie <Eye size={18} />
              </button>
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <ChevronLeft size={16} /> Wróć
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <h1>Podsumowanie</h1>
              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              <div className="summary-box">
                <div className="summary-row">
                  <span>Typ zgłoszenia:</span>
                  <strong>
                    {requestType === "RETURN" ? "Zwrot" : "Reklamacja"}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Zamówienie:</span>
                  <strong>{orderRef}</strong>
                </div>
                <div className="summary-row">
                  <span>Klient:</span>
                  <strong>{customer.name}</strong>
                </div>
                <div className="summary-row">
                  <span>Adres:</span>
                  <strong>
                    {customer.address}, {customer.postal} {customer.city}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>IBAN:</span>
                  <strong>{customer.iban || "Brak"}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  Zgłoszone produkty
                </p>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {selectedItems.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderBottom:
                          i < selectedItems.length - 1
                            ? "1px solid #f1f5f9"
                            : "none",
                      }}
                    >
                      <img
                        src={item.imgUrl}
                        alt=""
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          objectFit: "contain",
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            marginBottom: 2,
                          }}
                        >
                          {item.product_name}
                        </p>
                        <p style={{ fontSize: 12, color: "#64748b" }}>
                          Ilość: {item.quantityToReturn} &nbsp;·&nbsp;
                          {requestType === "RETURN"
                            ? item.reason
                            : item.solution}
                        </p>
                      </div>
                      <strong
                        style={{
                          fontSize: 14,
                          color: "#1e293b",
                          flexShrink: 0,
                        }}
                      >
                        {(Number(item.price) * item.quantityToReturn).toFixed(
                          2,
                        )}{" "}
                        PLN
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={submitForm}
                disabled={loading}
              >
                {loading ? (
                  <Loader className="spin" size={18} />
                ) : (
                  <>
                    Wyślij zgłoszenie <Sparkles size={18} />
                  </>
                )}
              </button>
              <button className="btn-secondary" onClick={() => setStep(3)}>
                <ChevronLeft size={16} /> Popraw dane
              </button>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center" }} className="fade-in">
              <div className="success-icon">
                <Check size={32} />
              </div>
              <h1>Zgłoszenie przyjęte!</h1>
              <p className="subtitle" style={{ marginBottom: 8 }}>
                Twój numer RMA to:
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#eff6ff",
                  border: "2px solid #bfdbfe",
                  borderRadius: 14,
                  padding: "14px 24px",
                  margin: "8px 0 28px",
                  cursor: "pointer",
                }}
                onClick={handleCopyRMA}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#1d4ed8",
                    letterSpacing: 1,
                  }}
                >
                  {returnNo}
                </span>
                {copied ? (
                  <CheckCheck size={20} color="#22c55e" />
                ) : (
                  <Copy size={20} color="#2563eb" />
                )}
              </div>

              {/* Instrukcja listu przewozowego */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 14,
                  padding: "20px 24px",
                  marginBottom: 28,
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#15803d",
                    marginBottom: 12,
                  }}
                >
                  📦 Co dalej? Wygeneruj list przewozowy
                </p>
                <ol
                  style={{
                    paddingLeft: 20,
                    color: "#166534",
                    fontSize: 14,
                    lineHeight: 2,
                  }}
                >
                  <li>
                    Wejdź na{" "}
                    <a
                      href={
                        import.meta.env.VITE_SUCCESS_REDIRECT ||
                        "https://wygodnezwroty.pl/"
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#15803d", fontWeight: 700 }}
                    >
                      wygodnezwroty.pl
                    </a>
                  </li>
                  <li>Wygeneruj list przewozowy dla swojej paczki</li>
                  <li>
                    Zanotuj numer listu — będzie potrzebny do śledzenia zwrotu
                  </li>
                  <li>
                    Wyślij paczkę i podaj nam numer listu odpowiadając na e-mail
                    potwierdzający
                  </li>
                </ol>
              </div>

              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
                Zapisz numer RMA — będzie potrzebny do śledzenia zgłoszenia.
              </p>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 32 }}>
                Wysłaliśmy potwierdzenie na adres <strong>{email}</strong>.
              </p>
              <a
                href={
                  import.meta.env.VITE_SUCCESS_REDIRECT ||
                  "https://wygodnezwroty.pl/"
                }
                style={{
                  display: "inline-block",
                  background: "#2563eb",
                  color: "white",
                  padding: "16px 32px",
                  borderRadius: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                  fontSize: 15,
                }}
              >
                Przejdź do Wygodne Zwroty →
              </a>
            </div>
          )}
        </div>

        <footer
          style={{
            marginTop: 40,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          Marcel Turek &nbsp;·&nbsp;
          <a
            href="https://github.com/mturek"
            style={{ color: "#94a3b8", textDecoration: "none" }}
          >
            github.com/mturek
          </a>
          &nbsp;·&nbsp; 2025
        </footer>
      </div>
    </>
  );
}

export default App;
