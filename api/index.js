import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

// Helper to wrap async routes
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// AUTH & MIDDLEWARE
// ==========================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query(
    `SELECT id, email, full_name, role FROM profiles WHERE email = $1 AND password = $2`,
    [email, password]
  );
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  const user = result.rows[0];
  // Simple token: base64-encoded user id + timestamp (no JWT needed — no auth middleware)
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email, ts: Date.now() })).toString('base64');
  res.json({ token, user });
}));

app.post('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post('/api/auth/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  const verify = await pool.query(
    `SELECT id FROM profiles WHERE id = $1 AND password = $2`,
    [userId, currentPassword]
  );
  if (verify.rows.length === 0) return res.status(400).json({ error: 'Current password is incorrect.' });
  await pool.query(`UPDATE profiles SET password = $1 WHERE id = $2`, [newPassword, userId]);
  await pool.query(`UPDATE settings SET password = $1 WHERE id = 'app_settings'`, [newPassword]);
  res.json({ success: true });
}));

// ==========================================
// PROTECTED ROUTES
// ==========================================
app.use('/api', authMiddleware);

// ==========================================
// SERVICES
// ==========================================
app.get('/api/services', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT s.*,
      COALESCE(json_agg(sc ORDER BY sc.created_at) FILTER (WHERE sc.id IS NOT NULL), '[]'::json) as "subCategories"
    FROM services s
    LEFT JOIN sub_categories sc ON s.id = sc.service_id
    GROUP BY s.id
    ORDER BY s.created_at
  `);
  res.json(result.rows);
}));

app.post('/api/services', asyncHandler(async (req, res) => {
  const { name, hsn_code } = req.body;
  const result = await pool.query(
    `INSERT INTO services (name, hsn_code) VALUES ($1, $2) RETURNING *`,
    [name, hsn_code || null]
  );
  res.json({ ...result.rows[0], subCategories: [] });
}));

app.put('/api/services/:id', asyncHandler(async (req, res) => {
  const { name, hsn_code } = req.body;
  await pool.query(`UPDATE services SET name = $1, hsn_code = $2 WHERE id = $3`, [name, hsn_code || null, req.params.id]);
  res.json({ success: true });
}));

// Sub Categories
app.post('/api/sub-categories', asyncHandler(async (req, res) => {
  const { service_id, name } = req.body;
  const result = await pool.query(
    `INSERT INTO sub_categories (service_id, name) VALUES ($1, $2) RETURNING *`,
    [service_id, name]
  );
  res.json(result.rows[0]);
}));

app.put('/api/sub-categories/:id', asyncHandler(async (req, res) => {
  const { name } = req.body;
  await pool.query(`UPDATE sub_categories SET name = $1 WHERE id = $2`, [name, req.params.id]);
  res.json({ success: true });
}));

app.delete('/api/sub-categories/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM sub_categories WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// ENQUIRIES
// ==========================================
app.get('/api/enquiries', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT e.*,
      COALESCE(json_agg(es ORDER BY es.id) FILTER (WHERE es.id IS NOT NULL), '[]'::json) as "services"
    FROM enquiries e
    LEFT JOIN enquiry_services es ON e.id = es.enquiry_id
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `);
  res.json(result.rows);
}));

app.post('/api/enquiries', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { services, ...data } = req.body;
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
    if (services?.length > 0) {
      for (const s of services) {
        await client.query(
          'INSERT INTO enquiry_services (enquiry_id, service_id, sub_service_id) VALUES ($1,$2,$3)',
          [enquiry.id, s.service_id, s.sub_service_id || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(enquiry);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.put('/api/enquiries/:id', asyncHandler(async (req, res) => {
  // Destructure services out — enquiries table has no "services" column
  const { services, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await client.query(
        `UPDATE enquiries SET ${setString} WHERE id = $${keys.length + 1}`,
        [...Object.values(data), req.params.id]
      );
    }
    if (services !== undefined) {
      await client.query('DELETE FROM enquiry_services WHERE enquiry_id = $1', [req.params.id]);
      for (const s of services) {
        await client.query(
          'INSERT INTO enquiry_services (enquiry_id, service_id, sub_service_id) VALUES ($1,$2,$3)',
          [req.params.id, s.service_id, s.sub_service_id || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.delete('/api/enquiries/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM enquiries WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// QUOTATIONS
// ==========================================
app.get('/api/quotations', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT q.*,
      COALESCE(json_agg(qi ORDER BY qi.id) FILTER (WHERE qi.id IS NOT NULL), '[]'::json) as "items"
    FROM quotations q
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `);
  res.json(result.rows);
}));

app.post('/api/quotations', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { items, ...data } = req.body;
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
    const quote = rows[0];
    if (items?.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO quotation_items
            (quotation_id, service_id, sub_service_id, service_name, sub_service_name,
             hsn_code, quantity, base_price, gst_rate, gst_amount, total_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [quote.id, item.service_id, item.sub_service_id || null, item.service_name,
           item.sub_service_name, item.hsn_code, item.quantity, item.base_price,
           item.gst_rate, item.gst_amount, item.total_price]
        );
      }
    }
    if (data.enquiry_id) {
      await client.query(`UPDATE enquiries SET converted_to_quote = true WHERE id = $1`, [data.enquiry_id]);
    }
    await client.query('COMMIT');
    res.json(quote);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.put('/api/quotations/:id', asyncHandler(async (req, res) => {
  // Destructure items out — quotations table has no "items" column
  const { items, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await client.query(
        `UPDATE quotations SET ${setString} WHERE id = $${keys.length + 1}`,
        [...Object.values(data), req.params.id]
      );
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
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ==========================================
// ORDERS
// ==========================================
app.get('/api/orders', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT o.*,
      COALESCE((SELECT json_agg(os.* ORDER BY os.id) FROM order_services os WHERE os.order_id = o.id), '[]') as "services",
      COALESCE((SELECT json_agg(p.* ORDER BY p.date) FROM payments p WHERE p.order_id = o.id), '[]') as "payments",
      COALESCE((SELECT json_agg(rp.* ORDER BY rp.date) FROM refund_payments rp WHERE rp.order_id = o.id), '[]') as "refundPayments"
    FROM orders o
    ORDER BY o.created_at DESC
  `);
  res.json(result.rows);
}));

app.post('/api/orders', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { services, ...data } = req.body;
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
    if (services?.length > 0) {
      for (const s of services) {
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
    }
    if (data.quotation_id) {
      await client.query(`UPDATE quotations SET converted_to_order = true WHERE id = $1`, [data.quotation_id]);
    }
    await client.query('COMMIT');
    // Return order WITH real service UUIDs so frontend never uses fake generateId() IDs
    const { rows: serviceRows } = await pool.query(
      'SELECT * FROM order_services WHERE order_id = $1 ORDER BY id',
      [order.id]
    );
    res.json({ ...order, services: serviceRows });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.put('/api/orders/:id', asyncHandler(async (req, res) => {
  // Destructure services out — orders table has no "services" column
  const { services, ...data } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await client.query(
        `UPDATE orders SET ${setString} WHERE id = $${keys.length + 1}`,
        [...Object.values(data), req.params.id]
      );
    }
    if (services !== undefined) {
      await client.query('DELETE FROM order_services WHERE order_id = $1', [req.params.id]);
      for (const s of services) {
        await client.query(
          `INSERT INTO order_services
            (order_id, service_id, sub_service_id, service_name, sub_service_name,
             hsn_code, quantity, base_price, gst_rate, gst_amount, total_price, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [req.params.id, s.service_id || null, s.sub_service_id || null, s.service_name,
           s.sub_service_name, s.hsn_code, s.quantity, s.base_price,
           s.gst_rate, s.gst_amount, s.total_price, s.status || 'active']
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.delete('/api/orders/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM orders WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

app.post('/api/orders/:id/payments', asyncHandler(async (req, res) => {
  const { amount, type, version, notes } = req.body;
  const result = await pool.query(
    `INSERT INTO payments (order_id, amount, type, version, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, amount, type, version || null, notes || null]
  );
  res.json(result.rows[0]);
}));

app.post('/api/orders/:id/refunds', asyncHandler(async (req, res) => {
  const { amount, type, notes } = req.body;
  const result = await pool.query(
    `INSERT INTO refund_payments (order_id, amount, type, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.params.id, amount, type, notes || null]
  );
  res.json(result.rows[0]);
}));

app.put('/api/order-services/cancel', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || ids.length === 0) return res.json({ success: true });
  await pool.query(
    'UPDATE order_services SET status = $1 WHERE id = ANY($2::uuid[])',
    ['canceled', ids]
  );
  res.json({ success: true });
}));

app.put('/api/order-services/:id/restore', asyncHandler(async (req, res) => {
  await pool.query(`UPDATE order_services SET status = 'active' WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

app.put('/api/orders/:id/restore-all-services', asyncHandler(async (req, res) => {
  await pool.query(`UPDATE order_services SET status = 'active' WHERE order_id = $1`, [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// MARKET RESEARCH
// ==========================================
app.get('/api/market-research', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM market_research ORDER BY created_at DESC`);
  res.json(result.rows);
}));

app.post('/api/market-research', asyncHandler(async (req, res) => {
  const { company_name, website, phone, email, description, pitch_planning } = req.body;
  const result = await pool.query(
    `INSERT INTO market_research (company_name, website, phone, email, description, pitch_planning)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [company_name, website, phone, email, description, pitch_planning]
  );
  res.json(result.rows[0]);
}));

app.put('/api/market-research/:id', asyncHandler(async (req, res) => {
  const { company_name, website, phone, email, description, pitch_planning } = req.body;
  const fieldMap = { company_name, website, phone, email, description, pitch_planning };
  const fields = [], values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(fieldMap)) {
    if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
  }
  if (fields.length > 0) {
    values.push(req.params.id);
    await pool.query(`UPDATE market_research SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  }
  res.json({ success: true });
}));

app.delete('/api/market-research/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM market_research WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// CUSTOMERS
// ==========================================
app.get('/api/customers', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM customers ORDER BY created_at DESC`);
  res.json(result.rows);
}));

app.post('/api/customers', asyncHandler(async (req, res) => {
  const data = req.body;
  const result = await pool.query(
    `INSERT INTO customers
      (poc_name, company_name, company_email, company_number, company_address,
       website, notes, gst_number, gst_slab, tax_type, country, state)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [data.poc_name || data.pocName, data.company_name || data.companyName,
     data.company_email || data.companyEmail || '', data.company_number || data.companyNumber || '',
     data.company_address || data.companyAddress || '', data.website || '',
     data.notes || '', data.gst_number || data.gstNumber || '',
     data.gst_slab || data.gstSlab || 18, data.tax_type || data.taxType || 'Exclusive',
     data.country || 'India', data.state || '']
  );
  res.json(result.rows[0]);
}));

app.put('/api/customers/:id', asyncHandler(async (req, res) => {
  const data = req.body;
  await pool.query(
    `UPDATE customers SET
      poc_name = $1, company_name = $2, company_email = $3, company_number = $4,
      company_address = $5, website = $6, notes = $7, gst_number = $8,
      gst_slab = $9, tax_type = $10, country = $11, state = $12
     WHERE id = $13`,
    [data.poc_name || data.pocName, data.company_name || data.companyName,
     data.company_email || data.companyEmail || '', data.company_number || data.companyNumber || '',
     data.company_address || data.companyAddress || '', data.website || '',
     data.notes || '', data.gst_number || data.gstNumber || '',
     data.gst_slab || data.gstSlab || 18, data.tax_type || data.taxType || 'Exclusive',
     data.country || 'India', data.state || '', req.params.id]
  );
  res.json({ success: true });
}));

app.delete('/api/customers/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM customers WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// SETTINGS
// ==========================================
app.get('/api/settings', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM settings WHERE id = 'app_settings'`);
  res.json(result.rows[0] || null);
}));

app.put('/api/settings', asyncHandler(async (req, res) => {
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
  if (fields.length > 0) {
    fields.push(`updated_at = now()`);
    values.push('app_settings');
    const result = await pool.query(
      `UPDATE settings SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    if (result.rowCount === 0) {
      await pool.query("INSERT INTO settings (id) VALUES ('app_settings') ON CONFLICT DO NOTHING");
      await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
  }
  res.json({ success: true });
}));

// Fallback error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Pixel CRM API running on http://localhost:${PORT}`));
}
