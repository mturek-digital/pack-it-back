import express from 'express';
import { pool } from '../../config/db.js';
import { requireAuth } from '../../middleware/auth.js';
import { sendConfirmationEmail } from '../../config/mailer.js';
import { getOrderByReference } from '../../integrations/prestashop/prestashop.js';

const router = express.Router();

router.get('/prestashop/:orderRef', async (req, res) => {
  try {
    const { orderRef } = req.params;
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({ error: 'Brak parametru email.' });
    }

    const data = await getOrderByReference(orderRef, email);

    if (!data) {
      return res.status(404).json({ error: 'Numer zamówienia i e-mail nie pasują do siebie.' });
    }

    res.json(data);
  } catch (error) {
    console.error('PrestaShop API error:', error.message);
    res.status(500).json({ error: 'Błąd połączenia z PrestaShop.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      'SELECT * FROM pib_returns ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM pib_returns');

    res.json({ data: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [returns] = await pool.query('SELECT * FROM pib_returns WHERE id = ?', [id]);

    if (returns.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono zgłoszenia.' });
    }

    const [items] = await pool.query('SELECT * FROM pib_return_items WHERE return_id = ?', [id]);
    res.json({ ...returns[0], items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/decision', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, decision, decision_note } = req.body;

    await pool.query(
      'UPDATE pib_returns SET status = ?, decision = ?, decision_note = ? WHERE id = ?',
      [status, decision, decision_note || null, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/waybill', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { waybill } = req.body;

    await pool.query(
      'UPDATE pib_returns SET waybill = ? WHERE id = ?',
      [waybill || null, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { order_number, customer_email, customer_data, request_type, items } = req.body;

    const currentYear = new Date().getFullYear();
    const [lastReturn] = await connection.query(
      `SELECT internal_return_no FROM pib_returns
       WHERE internal_return_no LIKE ? ORDER BY id DESC LIMIT 1`,
      [`RMA-${currentYear}-%`]
    );

    let nextNumber = 1;
    if (lastReturn.length > 0) {
      nextNumber = parseInt(lastReturn[0].internal_return_no.split('-')[2]) + 1;
    }

    const returnNo = `RMA-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    const [result] = await connection.query(
      `INSERT INTO pib_returns
       (internal_return_no, order_number, customer_email, customer_name, customer_phone,
        customer_address, customer_postal, customer_city, customer_iban, request_type, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FORM', 'NEW')`,
      [
        returnNo, order_number, customer_email,
        customer_data.name, customer_data.phone,
        customer_data.address, customer_data.postal,
        customer_data.city, customer_data.iban || null,
        request_type,
      ]
    );

    const returnId = result.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO pib_return_items
         (return_id, product_name, quantity, reason_type, reason_comment)
         VALUES (?, ?, ?, ?, ?)`,
        [returnId, item.product_name, item.quantity, item.reason_type, item.reason_comment]
      );
    }

    await connection.commit();

    sendConfirmationEmail({
      to: customer_email,
      returnNo,
      requestType: request_type,
      orderNumber: order_number,
      items,
    }).catch(err => console.error('Błąd wysyłki e-mail:', err));

    res.json({ success: true, returnNo });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;