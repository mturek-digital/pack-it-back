import { pool } from '../../config/db.js';

function normStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : fallback;
}

export async function upsertAllegroReturn(mapped) {
  const {
    external_return_id, order_number, customer_name, customer_email,
    customer_phone, waybill, items = [],
  } = mapped;

  if (!external_return_id) throw new Error('Brak external_return_id');

  const currentYear = new Date().getFullYear();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [existing] = await conn.execute(
      `SELECT id, internal_return_no FROM pib_returns
       WHERE source = 'ALLEGRO' AND order_number = ? LIMIT 1`,
      [normStr(order_number)]
    );

    let returnId;

    if (existing.length > 0) {
      returnId = existing[0].id;
      await conn.execute(
        `UPDATE pib_returns SET
          customer_email = ?, customer_name = ?, customer_phone = ?,
          waybill = COALESCE(?, waybill), updated_at = NOW()
         WHERE id = ?`,
        [normStr(customer_email), normStr(customer_name),
         normStr(customer_phone), normStr(waybill), returnId]
      );
    } else {
      const [lastReturn] = await conn.query(
        `SELECT internal_return_no FROM pib_returns
         WHERE internal_return_no LIKE ? ORDER BY id DESC LIMIT 1`,
        [`RMA-${currentYear}-%`]
      );

      let nextNumber = 1;
      if (lastReturn.length > 0) {
        nextNumber = parseInt(lastReturn[0].internal_return_no.split('-')[2]) + 1;
      }

      const returnNo = `RMA-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

      const [result] = await conn.execute(
        `INSERT INTO pib_returns
         (internal_return_no, order_number, customer_email, customer_name,
          customer_phone, waybill, request_type, source, status)
         VALUES (?, ?, ?, ?, ?, ?, 'RETURN', 'ALLEGRO', 'NEW')`,
        [returnNo, normStr(order_number), normStr(customer_email),
         normStr(customer_name), normStr(customer_phone), normStr(waybill)]
      );
      returnId = result.insertId;
    }

    await conn.execute(`DELETE FROM pib_return_items WHERE return_id = ?`, [returnId]);

    for (const it of items) {
      await conn.execute(
        `INSERT INTO pib_return_items
         (return_id, product_name, quantity, reason_type, reason_comment)
         VALUES (?, ?, ?, ?, ?)`,
        [returnId, normStr(it.product_name), normInt(it.quantity),
         normStr(it.reason_type), normStr(it.reason_comment)]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}