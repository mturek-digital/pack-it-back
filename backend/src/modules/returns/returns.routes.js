import express from 'express';
import { pool } from '../../config/db.js';

const router = express.Router();

// 1. Pobieranie danych dla formularza klienta (PrestaShop)
router.get('/prestashop/:orderRef', async (req, res) => {
  try {
    const { orderRef } = req.params;
    const customerEmail = req.query.email;

    const [orders] = await pool.query(
      `SELECT o.id_order, o.reference, c.email, c.firstname, c.lastname,
              a.address1, a.postcode, a.city, a.phone
       FROM ps_orders o
       LEFT JOIN ps_customer c ON o.id_customer = c.id_customer
       LEFT JOIN ps_address a ON o.id_address_delivery = a.id_address
       WHERE o.reference = ? AND c.email = ?`,
      [orderRef, customerEmail]
    );

    if (orders.length === 0) return res.status(404).json({ error: "Zamówienie nie istnieje." });

    const [items] = await pool.query(
      `SELECT od.product_name, od.product_quantity as quantity, od.unit_price_tax_incl as price, od.product_id,
       (SELECT id_image FROM ps_image WHERE id_product = od.product_id AND cover = 1 LIMIT 1) as id_image,
       (SELECT link_rewrite FROM ps_product_lang WHERE id_product = od.product_id AND id_lang = 1 LIMIT 1) as url_name
       FROM ps_order_detail od WHERE od.id_order = ?`,
      [orders[0].id_order]
    );

    const processedItems = items.map(item => {
      // Budowanie linku: http://fajnysklep.turek.digital/ID-large_default/NAZWA.jpg
      const imgId = item.id_image || 'default';
      const prodName = item.url_name || 'product';
      const imgUrl = `http://fajnysklep.turek.digital/${imgId}-large_default/${prodName}.jpg`;

      return { 
        ...item, 
        imgUrl, 
        price: parseFloat(item.price).toFixed(2) 
      };
    });

    res.json({ 
      order: orders[0], 
      customer: {
        name: `${orders[0].firstname} ${orders[0].lastname}`,
        email: orders[0].email,
        phone: orders[0].phone,
        address: orders[0].address1,
        postal: orders[0].postcode,
        city: orders[0].city
      },
      items: processedItems 
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Pobieranie listy wszystkich zgłoszeń (dla Panelu Administratora)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pib_returns ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Pobieranie szczegółów konkretnego zgłoszenia wraz z produktami
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [returns] = await pool.query('SELECT * FROM pib_returns WHERE id = ?', [id]);
    
    if (returns.length === 0) return res.status(404).json({ error: "Nie znaleziono zgłoszenia" });

    const [items] = await pool.query('SELECT * FROM pib_return_items WHERE return_id = ?', [id]);
    
    res.json({ ...returns[0], items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Zapisywanie decyzji administratora (Akceptacja/Odrzucenie)
router.put('/:id/decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, decision, decision_note } = req.body;

    await pool.query(
      `UPDATE pib_returns 
       SET status = ?, decision = ?, decision_note = ?
       WHERE id = ?`,
      [status, decision, decision_note || null, id]
    );

    res.json({ success: true, message: "Decyzja została zapisana" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Zapisywanie nowego zgłoszenia z formularza klienta (RMA-YYYY-XXXX)
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { order_number, customer_email, customer_data, request_type, items } = req.body;
    
    // Generowanie numeru RMA: RMA-ROK-NUMER (np. RMA-2026-0001)
    const currentYear = new Date().getFullYear();
    const [lastReturn] = await connection.query(
      `SELECT internal_return_no FROM pib_returns 
       WHERE internal_return_no LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [`RMA-${currentYear}-%`]
    );

    let nextNumber = 1;
    if (lastReturn.length > 0) {
      const lastNoStr = lastReturn[0].internal_return_no; 
      const lastCounter = parseInt(lastNoStr.split('-')[2]); 
      nextNumber = lastCounter + 1;
    }
    
    const formattedNumber = String(nextNumber).padStart(4, '0');
    const returnNo = `RMA-${currentYear}-${formattedNumber}`;

    // Zapis do głównej tabeli pib_returns
    const [result] = await connection.query(
      `INSERT INTO pib_returns 
       (internal_return_no, order_number, customer_email, customer_name, customer_phone, customer_address, customer_postal, customer_city, customer_iban, request_type, source, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FORM', 'NEW')`,
      [
        returnNo, 
        order_number, 
        customer_email, 
        customer_data.name, 
        customer_data.phone, 
        customer_data.address, 
        customer_data.postal, 
        customer_data.city, 
        customer_data.iban || null, 
        request_type
      ]
    );

    const returnId = result.insertId;

    // Zapis produktów do tabeli pib_return_items
    for (const item of items) {
      await connection.query(
        `INSERT INTO pib_return_items (return_id, product_name, quantity, reason_type, reason_comment) 
         VALUES (?, ?, ?, ?, ?)`,
        [returnId, item.product_name, item.quantity, item.reason_type, item.reason_comment]
      );
    }

    await connection.commit();
    res.json({ success: true, returnNo });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;