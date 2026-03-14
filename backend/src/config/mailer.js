import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendConfirmationEmail = async ({ to, returnNo, requestType, orderNumber, items }) => {
  const typeLabel = requestType === 'RETURN' ? 'Zwrot' : 'Reklamacja';

  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${i.product_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${i.reason_type || '—'}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#2563eb;padding:32px 40px;">
      <h1 style="color:white;margin:0;font-size:22px;">Pack It Back</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Potwierdzenie zgłoszenia</p>
    </div>
    <div style="padding:40px;">
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 28px;">
        Twoje zgłoszenie zostało przyjęte. Rozpatrzymy je w ciągu <strong>3–5 dni roboczych</strong>.
      </p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin:0 0 6px;">Numer RMA</p>
        <p style="font-size:26px;font-weight:800;color:#1d4ed8;margin:0;letter-spacing:1px;">${returnNo}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr style="background:#f8fafc;">
          <td style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Typ zgłoszenia</td>
          <td style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Numer zamówienia</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;">${typeLabel}</td>
          <td style="padding:10px 12px;font-weight:600;">${orderNumber}</td>
        </tr>
      </table>
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;margin:0 0 10px;">Zgłoszone produkty</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:28px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Produkt</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;">Szt.</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Powód</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="font-weight:800;font-size:14px;color:#15803d;margin:0 0 10px;">Co dalej?</p>
        <ol style="padding-left:18px;color:#166534;font-size:13px;line-height:2;margin:0;">
          <li>Wejdź na <strong>wygodnezwroty.pl</strong> i wygeneruj list przewozowy</li>
          <li>Zanotuj numer listu przewozowego</li>
          <li>Wyślij paczkę i odpowiedz na tego maila podając numer listu</li>
        </ol>
      </div>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
        Masz pytania? Odpowiedz na tego maila podając numer RMA.<br><br>
        Pozdrawiamy,<br>
        <strong>Zespół Pack It Back</strong>
      </p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">
        Marcel Turek &nbsp;|&nbsp;
        <a href="https://github.com/mturek" style="color:#94a3b8;">github.com/mturek</a>
        &nbsp;|&nbsp; 2025
      </p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Potwierdzenie zgłoszenia ${returnNo} — Pack It Back`,
    html,
  });
};