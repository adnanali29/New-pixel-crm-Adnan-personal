import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper to wrap async routes
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// AUTHENTICATION
// ==========================================
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query(
    `SELECT id, email, full_name, role FROM profiles WHERE email = $1 AND password = $2`,
    [email, password]
  );
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  const user = result.rows[0];
  res.json({ user });
}));

app.post('/api/auth/verify', (req, res) => {
  res.json({ valid: true });
});

app.post('/api/auth/change-password', asyncHandler(async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const verify = await pool.query(
    `SELECT id FROM profiles WHERE id = $1 AND password = $2`,
    [userId, currentPassword]
  );
  if (verify.rows.length === 0) return res.status(401).json({ error: 'Incorrect current password' });
  
  await pool.query(`UPDATE profiles SET password = $1 WHERE id = $2`, [newPassword, userId]);
  await pool.query(`UPDATE settings SET password = $1 WHERE id = 'app_settings'`, [newPassword]);
  res.send();
}));

// ==========================================
// SERVICES
// ==========================================
app.get('/api/services', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT s.*, 
      COALESCE(json_agg(sc) FILTER (WHERE sc.id IS NOT NULL), '[]'::json) as "subCategories"
    FROM services s 
    LEFT JOIN sub_categories sc ON s.id = sc.service_id 
    GROUP BY s.id
  `);
  res.json(result.rows);
}));

app.post('/api/services', asyncHandler(async (req, res) => {
  const { name, hsn_code } = req.body;
  const result = await pool.query(`INSERT INTO services (name, hsn_code) VALUES ($1, $2) RETURNING *`, [name, hsn_code]);
  res.json(result.rows[0]);
}));

app.put('/api/services/:id', asyncHandler(async (req, res) => {
  const { name, hsn_code } = req.body;
  await pool.query(`UPDATE services SET name = $1, hsn_code = $2 WHERE id = $3`, [name, hsn_code, req.params.id]);
  res.send();
}));

// Sub Categories
app.post('/api/sub-categories', asyncHandler(async (req, res) => {
  const { service_id, name } = req.body;
  const result = await pool.query(`INSERT INTO sub_categories (service_id, name) VALUES ($1, $2) RETURNING *`, [service_id, name]);
  res.json(result.rows[0]);
}));

app.put('/api/sub-categories/:id', asyncHandler(async (req, res) => {
  const { name } = req.body;
  await pool.query(`UPDATE sub_categories SET name = $1 WHERE id = $2`, [name, req.params.id]);
  res.send();
}));

app.delete('/api/sub-categories/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM sub_categories WHERE id = $1`, [req.params.id]);
  res.send();
}));

// ==========================================
// ENQUIRIES
// ==========================================
app.get('/api/enquiries', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT e.*, 
      COALESCE(json_agg(es) FILTER (WHERE es.id IS NOT NULL), '[]'::json) as "services"
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
    
    const keys = Object.keys(data);
    const params = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
    
    const enqRes = await client.query(
      `INSERT INTO enquiries (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, 
      params
    );
    const enquiry = enqRes.rows[0];

    if (services && services.length > 0) {
      for (const svc of services) {
        await client.query(
          `INSERT INTO enquiry_services (enquiry_id, service_id, sub_service_id) VALUES ($1, $2, $3)`,
          [enquiry.id, svc.service_id, svc.sub_service_id]
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
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  if(keys.length === 0) return res.send();
  const setString = keys.map((k, i) => `${k} = $${i+1}`).join(', ');
  await pool.query(`UPDATE enquiries SET ${setString} WHERE id = $${keys.length+1}`, [...values, req.params.id]);
  res.send();
}));

app.delete('/api/enquiries/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM enquiries WHERE id = $1`, [req.params.id]);
  res.send();
}));

// ==========================================
// QUOTATIONS
// ==========================================
app.get('/api/quotations', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT q.*, 
      COALESCE(json_agg(qi) FILTER (WHERE qi.id IS NOT NULL), '[]'::json) as "items"
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
    
    const keys = Object.keys(data);
    const params = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
    
    const qRes = await client.query(
      `INSERT INTO quotations (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, 
      params
    );
    const quote = qRes.rows[0];

    if (items && items.length > 0) {
      for (const item of items) {
        const itemKeys = Object.keys(item);
        const itemParams = Object.values(item);
        const itemPlaceholders = itemKeys.map((_, i) => `$${i+2}`).join(', ');
        await client.query(
          `INSERT INTO quotation_items (quotation_id, ${itemKeys.join(', ')}) VALUES ($1, ${itemPlaceholders})`,
          [quote.id, ...itemParams]
        );
      }
    }
    
    // Auto convert enquiry status
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
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  if(keys.length === 0) return res.send();
  const setString = keys.map((k, i) => `${k} = $${i+1}`).join(', ');
  await pool.query(`UPDATE quotations SET ${setString} WHERE id = $${keys.length+1}`, [...values, req.params.id]);
  res.send();
}));


// ==========================================
// ORDERS
// ==========================================
app.get('/api/orders', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT o.*,
      (SELECT COALESCE(json_agg(os.*), '[]') FROM order_services os WHERE os.order_id = o.id) as "services",
      (SELECT COALESCE(json_agg(p.*), '[]') FROM payments p WHERE p.order_id = o.id) as "payments",
      (SELECT COALESCE(json_agg(rp.*), '[]') FROM refund_payments rp WHERE rp.order_id = o.id) as "refundPayments"
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
    
    const keys = Object.keys(data);
    const params = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
    
    const oRes = await client.query(
      `INSERT INTO orders (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, 
      params
    );
    const order = oRes.rows[0];

    if (services && services.length > 0) {
      for (const svc of services) {
        const svcKeys = Object.keys(svc);
        const svcParams = Object.values(svc);
        const svcPlaceholders = svcKeys.map((_, i) => `$${i+2}`).join(', ');
        await client.query(
          `INSERT INTO order_services (order_id, ${svcKeys.join(', ')}) VALUES ($1, ${svcPlaceholders})`,
          [order.id, ...svcParams]
        );
      }
    }
    
    // Auto convert quote status
    if (data.quotation_id) {
        await client.query(`UPDATE quotations SET converted_to_order = true WHERE id = $1`, [data.quotation_id]);
    }

    await client.query('COMMIT');
    res.json(order);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.put('/api/orders/:id', asyncHandler(async (req, res) => {
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  if(keys.length === 0) return res.send();
  const setString = keys.map((k, i) => `${k} = $${i+1}`).join(', ');
  await pool.query(`UPDATE orders SET ${setString} WHERE id = $${keys.length+1}`, [...values, req.params.id]);
  res.send();
}));

app.delete('/api/orders/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM orders WHERE id = $1`, [req.params.id]);
  res.send();
}));

app.post('/api/orders/:orderId/payments', asyncHandler(async (req, res) => {
  const { amount, type, version, notes } = req.body;
  const result = await pool.query(
    `INSERT INTO payments (order_id, amount, type, version, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.orderId, amount, type, version, notes]
  );
  res.json(result.rows[0]);
}));

app.post('/api/orders/:orderId/refunds', asyncHandler(async (req, res) => {
  const { amount, type, notes } = req.body;
  const result = await pool.query(
    `INSERT INTO refund_payments (order_id, amount, type, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.params.orderId, amount, type, notes]
  );
  res.json(result.rows[0]);
}));

app.put('/api/order-services/cancel', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || ids.length === 0) return res.send();
  const placeholders = ids.map((_, i) => `$${i+1}`).join(',');
  await pool.query(`UPDATE order_services SET status = 'canceled' WHERE id IN (${placeholders})`, ids);
  res.send();
}));

app.put('/api/order-services/:id/restore', asyncHandler(async (req, res) => {
  await pool.query(`UPDATE order_services SET status = 'active' WHERE id = $1`, [req.params.id]);
  res.send();
}));

app.put('/api/orders/:orderId/restore-all-services', asyncHandler(async (req, res) => {
  await pool.query(`UPDATE order_services SET status = 'active' WHERE order_id = $1`, [req.params.orderId]);
  res.send();
}));

// ==========================================
// MARKET RESEARCH
// ==========================================
app.get('/api/market-research', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM market_research ORDER BY created_at DESC`);
  res.json(result.rows);
}));

app.post('/api/market-research', asyncHandler(async (req, res) => {
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
  const result = await pool.query(`INSERT INTO market_research (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
  res.json(result.rows[0]);
}));

app.put('/api/market-research/:id', asyncHandler(async (req, res) => {
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  if(keys.length === 0) return res.send();
  const setString = keys.map((k, i) => `${k} = $${i+1}`).join(', ');
  await pool.query(`UPDATE market_research SET ${setString} WHERE id = $${keys.length+1}`, [...values, req.params.id]);
  res.send();
}));

app.delete('/api/market-research/:id', asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM market_research WHERE id = $1`, [req.params.id]);
  res.send();
}));

// ==========================================
// SETTINGS
// ==========================================
app.get('/api/settings', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM settings WHERE id = 'app_settings'`);
  res.json(result.rows[0] || {});
}));

app.put('/api/settings', asyncHandler(async (req, res) => {
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  const setString = keys.map((k, i) => `${k} = EXCLUDED.${k}`).join(', ');
  const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
  
  await pool.query(`
    INSERT INTO settings (id, ${keys.join(', ')}) 
    VALUES ('app_settings', ${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${setString}
  `, values);
  res.send();
}));

// Fallback error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  app.listen(3001);
}
