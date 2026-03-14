import 'dotenv/config';
import { pool } from '../../config/db.js';
import { fetchPendingWaybills } from './wygodnezwroty.js';

async function main() {
  console.log('Sync listów przewozowych — Wygodne Zwroty');
  console.log('Tryb: MOCK (brak sandboxa po stronie Wygodne Zwroty)\n');

  const [pendingReturns] = await pool.query(
    `SELECT id, internal_return_no, customer_email, order_number
     FROM pib_returns
     WHERE (waybill IS NULL OR waybill = '')
       AND status != 'REJECTED'
     ORDER BY created_at DESC
     LIMIT 100`
  );

  if (!pendingReturns.length) {
    console.log('Brak zgłoszeń bez listu przewozowego.');
    process.exit(0);
  }

  console.log(`Zgłoszeń bez listu: ${pendingReturns.length}`);

  const waybills = await fetchPendingWaybills(pendingReturns);

  console.log(`Dopasowanych listów: ${waybills.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const { rmaNumber, waybill, carrier } of waybills) {
    const match = pendingReturns.find(r => r.internal_return_no === rmaNumber);
    if (!match) { skipped++; continue; }

    await pool.query(
      `UPDATE pib_returns SET waybill = ? WHERE id = ?`,
      [waybill, match.id]
    );

    console.log(`✅ ${rmaNumber} → ${waybill} (${carrier})`);
    updated++;
  }

  skipped += pendingReturns.length - waybills.length;
  console.log(`\nGotowe. Zaktualizowano: ${updated}, bez listu: ${skipped}`);
  process.exit(0);
}

main().catch(e => {
  console.error('Sync error:', e.message);
  process.exit(1);
});