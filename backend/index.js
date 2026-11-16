const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Auto-ensure clean standalone columns exist without breaking old tables
async function initSchema() {
  try {
    await pool.query(`
      ALTER TABLE visa_bookings ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
      ALTER TABLE visa_bookings ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
      ALTER TABLE visa_bookings ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);
      ALTER TABLE flight_tickets ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
      ALTER TABLE flight_tickets ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
      ALTER TABLE flight_tickets ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);
      ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
      ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
      ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);
      ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
      ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
      ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);
      ALTER TABLE passports ADD COLUMN IF NOT EXISTS holder_name VARCHAR(150);
      ALTER TABLE passports ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE office_expenses ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
    `);
  } catch (e) { console.log("Schema sync:", e.message); }
}
initSchema();

// 1. OVERVIEW STATS
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const v = (await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM visa_bookings")).rows[0];
    const f = (await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM flight_tickets")).rows[0];
    const h = (await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM hotel_bookings")).rows[0];
    const p = (await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM tour_packages")).rows[0];
    const expAll = parseFloat((await pool.query("SELECT COALESCE(SUM(amount),0) as total FROM office_expenses")).rows[0].total);
    const exp30 = parseFloat((await pool.query("SELECT COALESCE(SUM(amount),0) as total FROM office_expenses WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'")).rows[0].total);

    const totalSales = parseFloat(v.sales) + parseFloat(f.sales) + parseFloat(h.sales) + parseFloat(p.sales);
    const grossProfit = parseFloat(v.profit) + parseFloat(f.profit) + parseFloat(h.profit) + parseFloat(p.profit);

    res.json({
      totalSales,
      operatingProfit: grossProfit - expAll,
      customerDue: parseFloat(v.due) + parseFloat(f.due) + parseFloat(h.due) + parseFloat(p.due),
      last30DaysExpenses: exp30,
      visas: { count: v.cnt, amount: parseFloat(v.sales) },
      tickets: { count: f.cnt, amount: parseFloat(f.sales) },
      hotels: { count: h.cnt, amount: parseFloat(h.sales) },
      packages: { count: p.cnt, amount: parseFloat(p.sales) }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. PAYROLL
app.get('/api/payroll/:employeeId', async (req, res) => {
  const id = parseInt(req.params.employeeId, 10);
  try {
    const empRes = await pool.query("SELECT * FROM employees WHERE employee_id = $1", [id]);
    if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });
    const emp = empRes.rows[0];

    const vM = parseFloat((await pool.query("SELECT COALESCE(SUM(margin_earned),0) as s FROM visa_bookings WHERE employee_id=$1", [id])).rows[0].s);
    const fM = parseFloat((await pool.query("SELECT COALESCE(SUM(margin_earned),0) as s FROM flight_tickets WHERE employee_id=$1", [id])).rows[0].s);
    const hM = parseFloat((await pool.query("SELECT COALESCE(SUM(margin_earned),0) as s FROM hotel_bookings WHERE employee_id=$1", [id])).rows[0].s);
    const pM = parseFloat((await pool.query("SELECT COALESCE(SUM(margin_earned),0) as s FROM tour_packages WHERE employee_id=$1", [id])).rows[0].s);

    const totalMargin = vM + fM + hM + pM;
    const commissionEarned = totalMargin * (parseFloat(emp.commission_rate) / 100);
    res.json({ name: emp.name, role: emp.role, baseSalary: parseFloat(emp.base_salary), salesMarginGenerated: totalMargin, commissionEarned, netPayout: parseFloat(emp.base_salary) + commissionEarned });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. CLIENT (Single Table)
app.get('/api/customers', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM customers ORDER BY customer_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customer/register', async (req, res) => {
  const { name, phone, companyName } = req.body;
  try {
    const r = await pool.query("INSERT INTO customers (name, phone, company_name) VALUES ($1,$2,$3) RETURNING *", [name, phone, companyName || 'Individual']);
    res.status(201).json({ success: true, customer: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. PASSPORT (Single Table)
app.get('/api/passports', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM passports ORDER BY passport_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/passport/submit', async (req, res) => {
  const { customerId, holderName, phone, passportNumber, expiryDate } = req.body;
  try {
    const r = await pool.query("INSERT INTO passports (customer_id, holder_name, phone, passport_number, expiry_date) VALUES ($1,$2,$3,$4,$5) RETURNING *", [customerId || null, holderName, phone, passportNumber.toUpperCase(), expiryDate]);
    res.status(201).json({ success: true, record: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. VISA (Single Table)
app.get('/api/visas', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM visa_bookings ORDER BY visa_booking_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/visa/submit', async (req, res) => {
  const { customerId, customerName, employeeId, employeeName, supplierName, country, visaType, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== '' && amountPaid !== undefined ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const r = await pool.query("INSERT INTO visa_bookings (customer_id, customer_name, employee_id, employee_name, supplier_name, country, visa_type, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *", [customerId || null, customerName, employeeId || null, employeeName, supplierName, country, visaType, parseFloat(supplierCost), parseFloat(sellingPrice), paid]);
    res.status(201).json({ success: true, record: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. TICKET (Single Table)
app.get('/api/tickets', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM flight_tickets ORDER BY ticket_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ticket/submit', async (req, res) => {
  const { customerId, customerName, employeeId, employeeName, supplierName, gdsPnr, airlineCode, route, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== '' && amountPaid !== undefined ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const r = await pool.query("INSERT INTO flight_tickets (customer_id, customer_name, employee_id, employee_name, supplier_name, gds_pnr, airline_code, route, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *", [customerId || null, customerName, employeeId || null, employeeName, supplierName, gdsPnr.toUpperCase(), airlineCode.toUpperCase(), route.toUpperCase(), parseFloat(supplierCost), parseFloat(sellingPrice), paid]);
    res.status(201).json({ success: true, record: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. HOTEL (Single Table)
app.get('/api/hotels', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM hotel_bookings ORDER BY hotel_booking_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/hotel/submit', async (req, res) => {
  const { customerId, customerName, employeeId, employeeName, supplierName, city, hotelName, roomType, checkIn, checkOut, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== '' && amountPaid !== undefined ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
const r = await pool.query("INSERT INTO hotel_bookings (customer_id, customer_name, employee_id, employee_name, supplier_name, city, hotel_name, room_type, check_in, check_out, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *", [customerId || null, customerName, employeeId || null, employeeName, supplierName, city, hotelName, roomType, checkIn, checkOut, parseFloat(supplierCost), parseFloat(sellingPrice), paid]);
res.status(201).json({ success: true, record: r.rows[0] });
} catch (err) { res.status(500).json({ error: err.message }); }
});
// 8. PACKAGE (Single Table)
app.get('/api/packages', async (req, res) => {
try {
const r = await pool.query("SELECT * FROM tour_packages ORDER BY package_id DESC");
res.json(r.rows);
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/package/submit', async (req, res) => {
const { customerId, customerName, employeeId, employeeName, supplierName, packageName, category, destination, travelersCount, departureDate, includedServices, supplierCost, sellingPrice, amountPaid } = req.body;
const paid = amountPaid !== '' && amountPaid !== undefined ? parseFloat(amountPaid) : parseFloat(sellingPrice);
try {
const r = await pool.query("INSERT INTO tour_packages (customer_id, customer_name, employee_id, employee_name, supplier_name, package_name, category, destination, travelers_count, departure_date, included_services, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *", [customerId || null, customerName, employeeId || null, employeeName, supplierName, packageName, category, destination, parseInt(travelersCount, 10) || 1, departureDate, includedServices, parseFloat(supplierCost), parseFloat(sellingPrice), paid]);
res.status(201).json({ success: true, record: r.rows[0] });
} catch (err) { res.status(500).json({ error: err.message }); }
});
// 9. EXPENSES (Single Table)
app.get('/api/expenses', async (req, res) => {
try {
const r = await pool.query("SELECT * FROM office_expenses ORDER BY expense_date DESC, expense_id DESC");
res.json(r.rows);
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expense/submit', async (req, res) => {
const { category, description, amount, expenseDate, employeeName } = req.body;
try {
const r = await pool.query("INSERT INTO office_expenses (category, description, amount, expense_date, employee_name) VALUES ($1,$2,$3,$4,$5) RETURNING *", [category, description, parseFloat(amount), expenseDate, employeeName]);
res.status(201).json({ success: true, record: r.rows[0] });
} catch (err) { res.status(500).json({ error: err.message }); }
});
// 10. HR / EMPLOYEES (Single Table)
app.get('/api/employees', async (req, res) => {
try {
const r = await pool.query("SELECT employee_id, name, email, role, base_salary, commission_rate FROM employees ORDER BY employee_id ASC");
res.json(r.rows);
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/employee/add', async (req, res) => {
const { name, email, role, baseSalary, commissionRate } = req.body;
try {
const r = await pool.query("INSERT INTO employees (name, email, role, base_salary, commission_rate, password) VALUES ($1,$2,$3,$4,$5,'open') RETURNING employee_id, name", [name, email.trim(), role, parseFloat(baseSalary), parseFloat(commissionRate)]);
res.status(201).json({ success: true, employee: r.rows[0] });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/payment/collect', async (req, res) => {
const { type, id, newPaidAmount } = req.body;
const map = { visa: ['visa_bookings', 'visa_booking_id'], ticket: ['flight_tickets', 'ticket_id'], hotel: ['hotel_bookings', 'hotel_booking_id'], package: ['tour_packages', 'package_id'] };
const t = map[type];
if (!t) return res.status(400).json({ error: 'Invalid type' });
try {
await pool.query("UPDATE " + t[0] + " SET amount_paid=$1 WHERE " + t[1] + "=$2", [parseFloat(newPaidAmount), parseInt(id, 10)]);
res.json({ success: true });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/', (req, res) => res.status(200).send('CM Travels ERP Live'));
const PORT = Number(process.env.PORT) || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("CM Travels ERP running on Port " + PORT));
