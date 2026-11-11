const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 1. Fetch Payroll & Commissions
app.get('/api/payroll/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const employee = empRes.rows.at(0);

    const visaMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM visa_bookings WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    const flightMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM flight_tickets WHERE employee_id = $1', [parseInt(employeeId, 10)]);

    const totalSalesMargin = parseFloat(visaMargin.rows.at(0).sum) + parseFloat(flightMargin.rows.at(0).sum);
    const commissionEarned = totalSalesMargin * (parseFloat(employee.commission_rate) / 100);
    const netPayout = parseFloat(employee.base_salary) + commissionEarned;

    res.json({
      name: employee.name,
      role: employee.role,
      baseSalary: parseFloat(employee.base_salary),
      salesMarginGenerated: totalSalesMargin,
      commissionEarned: commissionEarned,
      netPayout: netPayout
    });
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Submit Tourist / Umrah Visa
app.post('/api/visa/submit', async (req, res) => {
  const { customerId, employeeId, country, visaType, supplierCost, sellingPrice } = req.body;
  try {
    const newVisa = await pool.query(
      `INSERT INTO visa_bookings (customer_id, employee_id, country, visa_type, supplier_cost, selling_price) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customerId, employeeId, country, visaType, parseFloat(supplierCost), parseFloat(sellingPrice)]
    );
    res.status(201).json({ success: true, record: newVisa.rows.at(0) });
  } catch (err) {
    console.error("Visa error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. Submit Air Ticket PNR
app.post('/api/ticket/submit', async (req, res) => {
  const { customerId, employeeId, gdsPnr, airlineCode, route, supplierCost, sellingPrice } = req.body;
  try {
    const newTicket = await pool.query(
      `INSERT INTO flight_tickets (customer_id, employee_id, gds_pnr, airline_code, route, supplier_cost, selling_price) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [customerId, employeeId, gdsPnr, airlineCode, route, parseFloat(supplierCost), parseFloat(sellingPrice)]
    );
    res.status(201).json({ success: true, record: newTicket.rows.at(0) });
  } catch (err) {
    console.error("Ticket error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. Register New Customer & Passport
app.post('/api/customer/register', async (req, res) => {
  const { name, phone, email, companyName, passportNumber, expiryDate } = req.body;
  try {
    const custRes = await pool.query(
      `INSERT INTO customers (name, phone, email, company_name) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, phone, email || null, companyName || null]
    );
    const newCustomer = custRes.rows.at(0);

    if (passportNumber && expiryDate) {
      await pool.query(
        `INSERT INTO passports (customer_id, passport_number, expiry_date) 
         VALUES ($1, $2, $3)`,
        [newCustomer.customer_id, passportNumber.toUpperCase(), expiryDate]
      );
    }

    res.status(201).json({ success: true, customer: newCustomer });
  } catch (err) {
    console.error("Customer registration error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. Fetch All Customers & Passports
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.customer_id, c.name, c.phone, c.company_name, p.passport_number, p.expiry_date
      FROM customers c
      LEFT JOIN passports p ON c.customer_id = p.customer_id
      ORDER BY c.customer_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch customers error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Cloud ERP Backend running on Port ${PORT}`));
