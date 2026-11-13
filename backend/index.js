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

// 1. Executive Dashboard Stats (Counts, Totals, Dues, Last Month Expenses, Charts)
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const vStat = await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM visa_bookings");
    const fStat = await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM flight_tickets");
    const hStat = await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM hotel_bookings");
    const pStat = await pool.query("SELECT COUNT(*)::int as cnt, COALESCE(SUM(selling_price),0) as sales, COALESCE(SUM(margin_earned),0) as profit, COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)),0) as due FROM tour_packages");
    
    const allExp = await pool.query("SELECT COALESCE(SUM(amount),0) as total FROM office_expenses");
    const lastMonthExp = await pool.query("SELECT COALESCE(SUM(amount),0) as total FROM office_expenses WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'");

    const v = vStat.rows.at(0);
    const f = fStat.rows.at(0);
    const h = hStat.rows.at(0);
    const p = pStat.rows.at(0);

    const totalSales = parseFloat(v.sales) + parseFloat(f.sales) + parseFloat(h.sales) + parseFloat(p.sales);
    const grossProfit = parseFloat(v.profit) + parseFloat(f.profit) + parseFloat(h.profit) + parseFloat(p.profit);
    const totalExpenses = parseFloat(allExp.rows.at(0).total);
    const operatingProfit = grossProfit - totalExpenses;
    const customerDue = parseFloat(v.due) + parseFloat(f.due) + parseFloat(h.due) + parseFloat(p.due);
    const last30DaysExpenses = parseFloat(lastMonthExp.rows.at(0).total);

    res.json({
      totalSales,
      grossProfit,
      totalExpenses,
      operatingProfit,
      customerDue,
      last30DaysExpenses,
      visas: { count: v.cnt, amount: parseFloat(v.sales), profit: parseFloat(v.profit) },
      tickets: { count: f.cnt, amount: parseFloat(f.sales), profit: parseFloat(f.profit) },
      hotels: { count: h.cnt, amount: parseFloat(h.sales), profit: parseFloat(h.profit) },
      packages: { count: p.cnt, amount: parseFloat(p.sales), profit: parseFloat(p.profit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Staff Payroll & Commissions
app.get('/api/payroll/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const empRes = await pool.query("SELECT * FROM employees WHERE employee_id = $1", [parseInt(employeeId, 10)]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = empRes.rows.at(0);

    const vM = await pool.query("SELECT COALESCE(SUM(margin_earned), 0) as sum FROM visa_bookings WHERE employee_id = $1", [parseInt(employeeId, 10)]);
    const fM = await pool.query("SELECT COALESCE(SUM(margin_earned), 0) as sum FROM flight_tickets WHERE employee_id = $1", [parseInt(employeeId, 10)]);
    const hM = await pool.query("SELECT COALESCE(SUM(margin_earned), 0) as sum FROM hotel_bookings WHERE employee_id = $1", [parseInt(employeeId, 10)]);
    const pM = await pool.query("SELECT COALESCE(SUM(margin_earned), 0) as sum FROM tour_packages WHERE employee_id = $1", [parseInt(employeeId, 10)]);

    const totalMargin = parseFloat(vM.rows.at(0).sum) + parseFloat(fM.rows.at(0).sum) + parseFloat(hM.rows.at(0).sum) + parseFloat(pM.rows.at(0).sum);
    const commissionEarned = totalMargin * (parseFloat(emp.commission_rate) / 100);
    const netPayout = parseFloat(emp.base_salary) + commissionEarned;

    res.json({ name: emp.name, role: emp.role, baseSalary: parseFloat(emp.base_salary), salesMarginGenerated: totalMargin, commissionEarned, netPayout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Visas CRUD
app.get('/api/visas', async (req, res) => {
  try {
    const r = await pool.query("SELECT v.*, c.name as customer_name FROM visa_bookings v LEFT JOIN customers c ON v.customer_id = c.customer_id ORDER BY v.visa_booking_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/visa/submit', async (req, res) => {
  const { customerId, employeeId, country, visaType, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const r = await pool.query(
      "INSERT INTO visa_bookings (customer_id, employee_id, country, visa_type, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [customerId, employeeId, country, visaType, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
    );
    res.status(201).json({ success: true, record: r.rows.at(0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/visa/update/:id', async (req, res) => {
  const { country, visaType, trackingStatus, supplierCost, sellingPrice } = req.body;
  try {
    await pool.query("UPDATE visa_bookings SET country=$1, visa_type=$2, tracking_status=$3, supplier_cost=$4, selling_price=$5 WHERE visa_booking_id=$6",
      [country, visaType, trackingStatus, parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Flight Tickets CRUD
app.get('/api/tickets', async (req, res) => {
  try {
    const r = await pool.query("SELECT t.*, c.name as customer_name FROM flight_tickets t LEFT JOIN customers c ON t.customer_id = c.customer_id ORDER BY t.ticket_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ticket/submit', async (req, res) => {
  const { customerId, employeeId, gdsPnr, airlineCode, route, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const r = await pool.query(
      "INSERT INTO flight_tickets (customer_id, employee_id, gds_pnr, airline_code, route, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [customerId, employeeId, gdsPnr, airlineCode, route, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
    );
    res.status(201).json({ success: true, record: r.rows.at(0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/ticket/update/:id', async (req, res) => {
  const { gdsPnr, airlineCode, route, supplierCost, sellingPrice } = req.body;
  try {
    await pool.query("UPDATE flight_tickets SET gds_pnr=$1, airline_code=$2, route=$3, supplier_cost=$4, selling_price=$5 WHERE ticket_id=$6",
      [gdsPnr.toUpperCase(), airlineCode.toUpperCase(), route.toUpperCase(), parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Hotels CRUD
app.get('/api/hotels', async (req, res) => {
  try {
    const r = await pool.query("SELECT h.*, c.name as customer_name FROM hotel_bookings h LEFT JOIN customers c ON h.customer_id = c.customer_id ORDER BY h.hotel_booking_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/hotel/submit', async (req, res) => {
  const { customerId, employeeId, city, hotelName, roomType, checkIn, checkOut, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const r = await pool.query(
      "INSERT INTO hotel_bookings (customer_id, employee_id, city, hotel_name, room_type, check_in, check_out, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
      [customerId, employeeId, city, hotelName, roomType, checkIn, checkOut, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
    );
    res.status(201).json({ success: true, record: r.rows.at(0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/hotel/update/:id', async (req, res) => {
  const { city, hotelName, roomType, supplierCost, sellingPrice } = req.body;
  try {
    await pool.query("UPDATE hotel_bookings SET city=$1, hotel_name=$2, room_type=$3, supplier_cost=$4, selling_price=$5 WHERE hotel_booking_id=$6",
      [city, hotelName, roomType, parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Tour & Hajj/Umrah Packages CRUD
app.get('/api/packages', async (req, res) => {
  try {
    const r = await pool.query("SELECT p.*, c.name as customer_name FROM tour_packages p LEFT JOIN customers c ON p.customer_id = c.customer_id ORDER BY p.package_id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/package/submit', async (req, res) => {
const { customerId, employeeId, packageName, category, destination, travelersCount, departureDate, includedServices, supplierCost, sellingPrice, amountPaid } = req.body;
const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
try {
const r = await pool.query(
"INSERT INTO tour_packages (customer_id, employee_id, package_name, category, destination, travelers_count, departure_date, included_services, supplier_cost, selling_price, amount_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
[customerId, employeeId, packageName, category, destination, parseInt(travelersCount, 10) || 1, departureDate, includedServices, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
);
res.status(201).json({ success: true, record: r.rows.at(0) });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/package/update/:id', async (req, res) => {
const { packageName, destination, travelersCount, includedServices, supplierCost, sellingPrice } = req.body;
try {
await pool.query("UPDATE tour_packages SET package_name=$1, destination=$2, travelers_count=$3, included_services=$4, supplier_cost=$5, selling_price=$6 WHERE package_id=$7",
[packageName, destination, parseInt(travelersCount, 10) || 1, includedServices, parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(req.params.id, 10)]);
res.json({ success: true });
} catch (err) { res.status(500).json({ error: err.message }); }
});
// 7. Customers & Passports CRUD
app.get('/api/customers', async (req, res) => {
try {
const r = await pool.query("SELECT c.customer_id, c.name, c.phone, c.company_name, p.passport_number, p.expiry_date FROM customers c LEFT JOIN passports p ON c.customer_id = p.customer_id ORDER BY c.customer_id DESC");
res.json(r.rows);
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/customer/register', async (req, res) => {
const { name, phone, email, companyName, passportNumber, expiryDate } = req.body;
try {
const cRes = await pool.query("INSERT INTO customers (name, phone, email, company_name) VALUES ($1,$2,$3,$4) RETURNING *", [name, phone, email || null, companyName || null]);
const cust = cRes.rows.at(0);
if (passportNumber && expiryDate) {
await pool.query("INSERT INTO passports (customer_id, passport_number, expiry_date) VALUES ($1,$2,$3)", [cust.customer_id, passportNumber.toUpperCase(), expiryDate]);
}
res.status(201).json({ success: true, customer: cust });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/customer/update/:id', async (req, res) => {
const { name, phone, passportNumber, expiryDate } = req.body;
try {
await pool.query("UPDATE customers SET name=$1, phone=$2 WHERE customer_id=$3", [name, phone, parseInt(req.params.id, 10)]);
if (passportNumber && expiryDate) {
await pool.query("INSERT INTO passports (customer_id, passport_number, expiry_date) VALUES ($1,$2,$3) ON CONFLICT (passport_number) DO UPDATE SET expiry_date=$3", [parseInt(req.params.id, 10), passportNumber.toUpperCase(), expiryDate]);
}
res.json({ success: true });
} catch (err) { res.status(500).json({ error: err.message }); }
});
// 8. Expenses, Payments & Staff HR
app.get('/api/expenses', async (req, res) => {
try {
const r = await pool.query("SELECT * FROM office_expenses ORDER BY expense_date DESC, expense_id DESC");
res.json(r.rows);
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expense/submit', async (req, res) => {
const { category, description, amount, expenseDate, loggedBy } = req.body;
try {
const r = await pool.query("INSERT INTO office_expenses (category, description, amount, expense_date, logged_by) VALUES ($1,$2,$3,$4,$5) RETURNING *", [category, description, parseFloat(amount), expenseDate, loggedBy]);
res.status(201).json({ success: true, record: r.rows.at(0) });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/expense/update/:id', async (req, res) => {
const { category, description, amount } = req.body;
try {
await pool.query("UPDATE office_expenses SET category=$1, description=$2, amount=$3 WHERE expense_id=$4", [category, description, parseFloat(amount), parseInt(req.params.id, 10)]);
res.json({ success: true });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/payment/collect', async (req, res) => {
const { type, id, newPaidAmount } = req.body;
const map = { visa: ['visa_bookings', 'visa_booking_id'], ticket: ['flight_tickets', 'ticket_id'], hotel: ['hotel_bookings', 'hotel_booking_id'], package: ['tour_packages', 'package_id'] };
const t = map[type];
if (!t) return res.status(400).json({ error: 'Invalid type' });
try {
await pool.query("UPDATE " + t.at(0) + " SET amount_paid=$1 WHERE " + t.at(1) + "=$2", [parseFloat(newPaidAmount), parseInt(id, 10)]);
res.json({ success: true });
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/employee/add', async (req, res) => {
  const { name, email, role, baseSalary, commissionRate } = req.body;
  try {
    const r = await pool.query(
      "INSERT INTO employees (name, email, role, base_salary, commission_rate) VALUES ($1,$2,$3,$4,$5) RETURNING employee_id, name",
      [name, email.trim(), role, parseFloat(baseSalary), parseFloat(commissionRate)]
    );
    res.status(201).json({ success: true, employee: r.rows.at(0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/employee/update/:id', async (req, res) => {
  const { name, role, baseSalary, commissionRate } = req.body;
  try {
    await pool.query(
      "UPDATE employees SET name=$1, role=$2, base_salary=$3, commission_rate=$4 WHERE employee_id=$5",
      [name, role, parseFloat(baseSalary), parseFloat(commissionRate), parseInt(req.params.id, 10)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/employees', async (req, res) => {
try {
const r = await pool.query("SELECT employee_id, name, email, role, base_salary, commission_rate FROM employees ORDER BY employee_id ASC");
res.json(r.rows);
} catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/', (req, res) => res.status(200).send('CM Travels & Tours ERP Backend Live!'));
const PORT = Number(process.env.PORT) || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("CM Travels ERP running on Port " + PORT));
