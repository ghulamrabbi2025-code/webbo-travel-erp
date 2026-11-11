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

// 1. Fetch Payroll & Commissions (Visas + Flights + Hotels)
app.get('/api/payroll/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const employee = empRes.rows.at(0);

    const visaMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM visa_bookings WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    const flightMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM flight_tickets WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    const hotelMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM hotel_bookings WHERE employee_id = $1', [parseInt(employeeId, 10)]);

    const totalSalesMargin = parseFloat(visaMargin.rows.at(0).sum) + parseFloat(flightMargin.rows.at(0).sum) + parseFloat(hotelMargin.rows.at(0).sum);
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
    res.status(500).json({ error: err.message });
  }
});

// 4. Register Customer & Passport
app.post('/api/customer/register', async (req, res) => {
  const { name, phone, email, companyName, passportNumber, expiryDate } = req.body;
  try {
    const custRes = await pool.query(
      `INSERT INTO customers (name, phone, email, company_name) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, phone, email || null, companyName || null]
    );
    const newCustomer = custRes.rows.at(0);

    if (passportNumber && expiryDate) {
      await pool.query(
        `INSERT INTO passports (customer_id, passport_number, expiry_date) VALUES ($1, $2, $3)`,
        [newCustomer.customer_id, passportNumber.toUpperCase(), expiryDate]
      );
    }
    res.status(201).json({ success: true, customer: newCustomer });
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

// 6. Edit Customer & Passport
app.put('/api/customer/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, passportNumber, expiryDate } = req.body;
  try {
    await pool.query('UPDATE customers SET name = $1, phone = $2 WHERE customer_id = $3', [name, phone, parseInt(id, 10)]);
    if (passportNumber && expiryDate) {
      await pool.query(
        `INSERT INTO passports (customer_id, passport_number, expiry_date) VALUES ($1, $2, $3)
         ON CONFLICT (passport_number) DO UPDATE SET expiry_date = $3`,
        [parseInt(id, 10), passportNumber.toUpperCase(), expiryDate]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Submit Worldwide Hotel Booking
app.post('/api/hotel/submit', async (req, res) => {
  const { customerId, employeeId, city, hotelName, roomType, checkIn, checkOut, supplierCost, sellingPrice } = req.body;
  try {
    const newHotel = await pool.query(
      `INSERT INTO hotel_bookings (customer_id, employee_id, city, hotel_name, room_type, check_in, check_out, supplier_cost, selling_price) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [customerId, employeeId, city, hotelName, roomType, checkIn, checkOut, parseFloat(supplierCost), parseFloat(sellingPrice)]
    );
    res.status(201).json({ success: true, record: newHotel.rows.at(0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Fetch All Hotel Bookings
app.get('/api/hotels', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, c.name as customer_name 
      FROM hotel_bookings h
      LEFT JOIN customers c ON h.customer_id = c.customer_id
      ORDER BY h.hotel_booking_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Edit Hotel Booking
app.put('/api/hotel/update/:id', async (req, res) => {
  const { id } = req.params;
  const { city, hotelName, roomType, supplierCost, sellingPrice } = req.body;
  try {
    await pool.query(
      `UPDATE hotel_bookings SET city = $1, hotel_name = $2, room_type = $3, supplier_cost = $4, selling_price = $5 WHERE hotel_booking_id = $6`,
      [city, hotelName, roomType, parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(id, 10)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Cloud ERP Backend running on Port ${PORT}`));
