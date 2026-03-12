import express from 'express';
import { pool } from '../../config/db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM pib_users WHERE email = ? AND password = ?',
      [username, password]
    );
    
    if (rows.length > 0) {
      res.json({ token: "fake-jwt-token" });
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

export default router;