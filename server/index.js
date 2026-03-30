import express from 'express';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

const JWT_SECRET = process.env.JWT_SECRET || 'pixel-crm-jwt-secret-2024';

// ── Auth Middleware ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── AUTH ───────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: rows[0].id, email: rows[0].email, full_name: rows[0].full_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM profiles WHERE id = $1 AND password = $2',
      [req.user.id, currentPassword]
    );
    if (rows.length === 0)
      throw new Error('Current password is incorrect.');
    await client.query('UPDATE profiles SET password = $1 WHERE id = $2', [newPassword, req.user.id]);
    await client.query(
      "UPDATE settings SET password = $1, updated_at = now() WHERE id = 'app_settings'",
      [newPassword]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── SERVICES ───────────────────────────────────────────────────────────────────
app.get('/api/services', authMiddleware, async (req, res) => {
  try {
    const { rows: services } = await pool.query('SELECT * FROM services ORDER BY created_at');
    const { rows: subCats } = await pool.query('SELECT * FROM sub_categories ORDER BY created_at');
    const result = services.map(s => ({
      ...s,
      subCategories: subCats.filter(sc => sc.service_id === s.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', authMiddleware, async (req, res) => {
  const { name, hsn_code } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO services (name, hsn_code) VALUES ($1, $2) RETURNING *',
      [name, hsn_code || null]
    );
    res.json({ ...rows[0], subCategories: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', authMiddleware, async (req, res) => {
  const { name, hsn_code } = req.body;
  try {
    await pool.query('UPDATE services SET name = $1, hsn_code = $2 WHERE id = $3', [name, hsn_code || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sub-categories', authMiddleware, async (req, res) => {
  const { service_id, name } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO sub_categories (service_id, name) VALUES ($1, $2) RETURNING *',
      [service_id, name]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sub-categories/:id', authMiddleware, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE sub_categories SET name = $1 WHERE id = $2', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sub-categories/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM sub_categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ENQUIRIES ─────────────────────────────────────────────────────────────────
app.get('/api/enquiries', authMiddleware, async (req, res) => {
  try {
    const { rows: enquiries } = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC');
    const { rows: services } = await pool.query('SELECT * FROM enquiry_services');
    const result = enquiries.map(e => ({
      ...e,
      services: services.filter(s => s.enquiry_id === e.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enquiries', authMiddleware, async (req, res) => {
  const { services: enquiryServices, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO enquiries
        (contact_name, company_name, mobile_number, website, email, company_address,
         gst_number, gst_slab, tax_type, country, state, description, status, converted_to_quote)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',false) RETURNING *`,
      [data.contact_name, data.company_name, data.mobile_number, data.website,
       data.email, data.company_address, data.gst_number, data.gst_slab,
       data.tax_type, data.country, data.state, data.description]
    );
    const enquiry = rows[0];
    if (enquiryServices?.length > 0) {
      for (const s of enquiryServices) {
        await client.query(
          'INSERT INTO enquiry_services (enquiry_id, service_id, sub_service_id) VALUES ($1,$2,$3)',
          [enquiry.id, s.service_id, s.sub_service_id || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(enquiry);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/enquiries/:id', authMiddleware, async (req, res) => {
  const { services: enquiryServices, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fieldMap = {
      contact_name: data.contact_name, company_name: data.company_name,
      mobile_number: data.mobile_number, website: data.website, email: data.email,
      company_address: data.company_address, gst_number: data.gst_number,
      gst_slab: data.gst_slab, tax_type: data.tax_type, country: data.country,
      state: data.state, description: data.description, status: data.status,
      converted_to_quote: data.converted_to_quote,
    };
    const fields = [], values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (fields.length > 0) {
      values.push(req.params.id);
      await client.query(`UPDATE enquiries SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
    if (enquiryServices !== undefined) {
      await client.query('DELETE FROM enquiry_services WHERE enquiry_id = $1', [req.params.id]);
      for (const s of enquiryServices) {
        await client.query(
          'INSERT INTO enquiry_services (enquiry_id, service_id, sub_service_id) VALUES ($1,$2,$3)',
          [req.params.id, s.service_id, s.sub_service_id || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── QUOTATIONS ────────────────────────────────────────────────────────────────
app.get('/api/quotations', authMiddleware, async (req, res) => {
  try {
    const { rows: quotations } = await pool.query('SELECT * FROM quotations ORDER BY created_at DESC');
    const { rows: items } = await pool.query('SELECT * FROM quotation_items');
    const result = quotations.map(q => ({
      ...q,
      items: items.filter(i => i.quotation_id === q.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotations', authMiddleware, async (req, res) => {
  const { items, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO quotations
        (enquiry_id, quote_number, company_name, contact_name, email, mobile_number,
         website, company_address, gst_number, gst_slab, tax_type, country, state,
         base_amount, gst_amount, total_amount, status, converted_to_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active',false) RETURNING *`,
      [data.enquiry_id, data.quote_number, data.company_name, data.contact_name,
       data.email, data.mobile_number, data.website, data.company_address,
       data.gst_number, data.gst_slab, data.tax_type, data.country, data.state,
       data.base_amount, data.gst_amount, data.total_amount]
    );
    const quotation = rows[0];
    for (const item of (items || [])) {
      await client.query(
        `INSERT INTO quotation_items
          (quotation_id, service_id, sub_service_id, service_name, sub_service_name,
           hsn_code, quantity, base_price, gst_rate, gst_amount, total_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [quotation.id, item.service_id, item.sub_service_id || null, item.service_name,
         item.sub_service_name, item.hsn_code, item.quantity, item.base_price,
         item.gst_rate, item.gst_amount, item.total_price]
      );
    }
    await client.query('COMMIT');
    res.json(quotation);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/quotations/:id', authMiddleware, async (req, res) => {
  const { items, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fieldMap = {
      status: data.status, converted_to_order: data.converted_to_order,
      company_name: data.company_name, contact_name: data.contact_name,
      email: data.email, mobile_number: data.mobile_number, website: data.website,
      company_address: data.company_address, gst_number: data.gst_number,
      tax_type: data.tax_type, country: data.country, state: data.state,
      base_amount: data.base_amount, gst_amount: data.gst_amount, total_amount: data.total_amount,
    };
    const fields = [], values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (fields.length > 0) {
      values.push(req.params.id);
      await client.query(`UPDATE quotations SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
    if (items !== undefined) {
      await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [req.params.id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO quotation_items
            (quotation_id, service_id, sub_service_id, service_name, sub_service_name,
             hsn_code, quantity, base_price, gst_rate, gst_amount, total_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [req.params.id, item.service_id, item.sub_service_id || null, item.service_name,
           item.sub_service_name, item.hsn_code, item.quantity, item.base_price,
           item.gst_rate, item.gst_amount, item.total_price]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { rows: orders } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const { rows: services } = await pool.query('SELECT * FROM order_services');
    const { rows: payments } = await pool.query('SELECT * FROM payments');
    const { rows: refunds } = await pool.query('SELECT * FROM refund_payments');
    const result = orders.map(o => ({
      ...o,
      services: services.filter(s => s.order_id === o.id),
      payments: payments.filter(p => p.order_id === o.id),
      refundPayments: refunds.filter(r => r.order_id === o.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  const { services: orderServices, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO orders
        (quotation_id, order_number, company_name, contact_name, poc_name, email,
         mobile_number, website, company_address, gst_number, gst_slab, tax_type,
         country, state, total_amount, base_amount, gst_amount, paid_amount,
         pending_amount, refund_due, refund_paid, po_file, po_file_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,0,$18,0,0,$19,$20,'active')
       RETURNING *`,
      [data.quotation_id, data.order_number, data.company_name, data.contact_name,
       data.poc_name, data.email, data.mobile_number, data.website, data.company_address,
       data.gst_number, data.gst_slab, data.tax_type, data.country, data.state,
       data.total_amount, data.base_amount, data.gst_amount, data.pending_amount,
       data.po_file || '', data.po_file_name || '']
    );
    const order = rows[0];
    for (const s of (orderServices || [])) {
      await client.query(
        `INSERT INTO order_services
          (order_id, service_id, sub_service_id, service_name, sub_service_name,
           hsn_code, quantity, base_price, gst_rate, gst_amount, total_price, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')`,
        [order.id, s.service_id, s.sub_service_id || null, s.service_name,
         s.sub_service_name, s.hsn_code, s.quantity, s.base_price,
         s.gst_rate, s.gst_amount, s.total_price]
      );
    }
    await client.query('COMMIT');
    res.json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  const { services: orderServices, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fieldMap = {
      status: data.status, company_name: data.company_name, contact_name: data.contact_name,
      poc_name: data.poc_name, email: data.email, mobile_number: data.mobile_number,
      website: data.website, company_address: data.company_address, gst_number: data.gst_number,
      gst_slab: data.gst_slab, tax_type: data.tax_type, country: data.country, state: data.state,
      total_amount: data.total_amount, base_amount: data.base_amount, gst_amount: data.gst_amount,
      paid_amount: data.paid_amount, pending_amount: data.pending_amount,
      refund_due: data.refund_due, refund_paid: data.refund_paid,
      po_file: data.po_file, po_file_name: data.po_file_name,
    };
    const fields = [], values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (fields.length > 0) {
      values.push(req.params.id);
      await client.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
    if (orderServices !== undefined) {
      await client.query('DELETE FROM order_services WHERE order_id = $1', [req.params.id]);
      for (const s of orderServices) {
        await client.query(
          `INSERT INTO order_services
            (order_id, service_id, sub_service_id, service_name, sub_service_name,
             hsn_code, quantity, base_price, gst_rate, gst_amount, total_price, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [req.params.id, s.service_id, s.sub_service_id || null, s.service_name,
           s.sub_service_name, s.hsn_code, s.quantity, s.base_price,
           s.gst_rate, s.gst_amount, s.total_price, s.status || 'active']
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/payments', authMiddleware, async (req, res) => {
  const { amount, type, version, notes } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO payments (order_id, amount, type, version, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, amount, type, version || null, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/refunds', authMiddleware, async (req, res) => {
  const { amount, type, notes } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO refund_payments (order_id, amount, type, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, amount, type, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/order-services/cancel', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  try {
    await pool.query(
      'UPDATE order_services SET status = $1 WHERE id = ANY($2::uuid[])',
      ['canceled', ids]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/order-services/:id/restore', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE order_services SET status = $1 WHERE id = $2', ['active', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/restore-all-services', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE order_services SET status = $1 WHERE order_id = $2', ['active', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MARKET RESEARCH ───────────────────────────────────────────────────────────
app.get('/api/market-research', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM market_research ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/market-research', authMiddleware, async (req, res) => {
  const { company_name, website, phone, email, description, pitch_planning } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO market_research (company_name, website, phone, email, description, pitch_planning)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [company_name, website, phone, email, description, pitch_planning]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/market-research/:id', authMiddleware, async (req, res) => {
  const data = req.body;
  const fieldMap = {
    company_name: data.company_name, website: data.website, phone: data.phone,
    email: data.email, description: data.description, pitch_planning: data.pitch_planning,
  };
  const fields = [], values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(fieldMap)) {
    if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
  }
  try {
    if (fields.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE market_research SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/market-research/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM market_research WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM settings WHERE id = 'app_settings'");
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  const data = req.body;
  const fieldMap = {
    password: data.password,
    quote_pdf_settings: data.quote_pdf_settings != null ? JSON.stringify(data.quote_pdf_settings) : undefined,
    po_pdf_settings: data.po_pdf_settings != null ? JSON.stringify(data.po_pdf_settings) : undefined,
    pi_pdf_settings: data.pi_pdf_settings != null ? JSON.stringify(data.pi_pdf_settings) : undefined,
    tax_invoice_pdf_settings: data.tax_invoice_pdf_settings != null ? JSON.stringify(data.tax_invoice_pdf_settings) : undefined,
  };
  const fields = [], values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(fieldMap)) {
    if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
  }
  try {
    if (fields.length > 0) {
      fields.push(`updated_at = now()`);
      values.push('app_settings');
      const result = await pool.query(
        `UPDATE settings SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
      );
      if (result.rowCount === 0) {
        await pool.query("INSERT INTO settings (id) VALUES ('app_settings') ON CONFLICT DO NOTHING");
        await pool.query(
          `UPDATE settings SET ${fields.join(', ')} WHERE id = $${idx}`,
          values
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Pixel CRM API server running on http://localhost:${PORT}`);
});
