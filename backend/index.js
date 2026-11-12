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

// 1. Fetch Payroll & Commissions
app.get('/api/payroll/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const employee = empRes.rows.at(0);

    const visaMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM visa_bookings WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    const flightMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM flight_tickets WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    const hotelMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM hotel_bookings WHERE employee_id = $1', [parseInt(employeeId, 10)]);
    const pkgMargin = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM tour_packages WHERE employee_id = $1', [parseInt(employeeId, 10)]);

    const totalSalesMargin = parseFloat(visaMargin.rows.at(0).sum) + parseFloat(flightMargin.rows.at(0).sum) + parseFloat(hotelMargin.rows.at(0).sum) + parseFloat(pkgMargin.rows.at(0).sum);
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
  const { customerId, employeeId, country, visaType, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const newVisa = await pool.query(
      `INSERT INTO visa_bookings (customer_id, employee_id, country, visa_type, supplier_cost, selling_price, amount_paid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [customerId, employeeId, country, visaType, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
    );
    res.status(201).json({ success: true, record: newVisa.rows.at(0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Submit Air Ticket PNR
app.post('/api/ticket/submit', async (req, res) => {
  const { customerId, employeeId, gdsPnr, airlineCode, route, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const newTicket = await pool.query(
      `INSERT INTO flight_tickets (customer_id, employee_id, gds_pnr, airline_code, route, supplier_cost, selling_price, amount_paid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [customerId, employeeId, gdsPnr, airlineCode, route, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
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
  const { customerId, employeeId, city, hotelName, roomType, checkIn, checkOut, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
    const newHotel = await pool.query(
      `INSERT INTO hotel_bookings (customer_id, employee_id, city, hotel_name, room_type, check_in, check_out, supplier_cost, selling_price, amount_paid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [customerId, employeeId, city, hotelName, roomType, checkIn, checkOut, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
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

// 10. Fetch All Visa Bookings
app.get('/api/visas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.name as customer_name 
      FROM visa_bookings v
      LEFT JOIN customers c ON v.customer_id = c.customer_id
      ORDER BY v.visa_booking_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Edit Visa Booking
app.put('/api/visa/update/:id', async (req, res) => {
  const { id } = req.params;
  const { country, visaType, trackingStatus, supplierCost, sellingPrice } = req.body;
  try {
    await pool.query(
      `UPDATE visa_bookings SET country = $1, visa_type = $2, tracking_status = $3, supplier_cost = $4, selling_price = $5 WHERE visa_booking_id = $6`,
      [country, visaType, trackingStatus, parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(id, 10)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Fetch All Flight Tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.name as customer_name 
      FROM flight_tickets t
      LEFT JOIN customers c ON t.customer_id = c.customer_id
      ORDER BY t.ticket_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Edit Flight Ticket
app.put('/api/ticket/update/:id', async (req, res) => {
  const { id } = req.params;
  const { gdsPnr, airlineCode, route, supplierCost, sellingPrice } = req.body;
  try {
    await pool.query(
      `UPDATE flight_tickets SET gds_pnr = $1, airline_code = $2, route = $3, supplier_cost = $4, selling_price = $5 WHERE ticket_id = $6`,
      [gdsPnr.toUpperCase(), airlineCode.toUpperCase(), route.toUpperCase(), parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(id, 10)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Create Custom Tour or Hajj/Umrah Package
app.post('/api/package/submit', async (req, res) => {
  const { customerId, employeeId, packageName, category, destination, travelersCount, departureDate, includedServices, supplierCost, sellingPrice, amountPaid } = req.body;
  const paid = amountPaid !== undefined && amountPaid !== '' ? parseFloat(amountPaid) : parseFloat(sellingPrice);
  try {
const newPkg = await pool.query(
INSERT INTO tour_packages (customer_id, employee_id, package_name, category, destination, travelers_count, departure_date, included_services, supplier_cost, selling_price, amount_paid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *,
[customerId, employeeId, packageName, category, destination, parseInt(travelersCount, 10) || 1, departureDate, includedServices, parseFloat(supplierCost), parseFloat(sellingPrice), paid]
);
res.status(201).json({ success: true, record: newPkg.rows.at(0) });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 15. Fetch All Packages
app.get('/api/packages', async (req, res) => {
try {
const result = await pool.query(SELECT p.*, c.name as customer_name  FROM tour_packages p LEFT JOIN customers c ON p.customer_id = c.customer_id ORDER BY p.package_id DESC);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 16. Edit Package
app.put('/api/package/update/:id', async (req, res) => {
const { id } = req.params;
const { packageName, destination, travelersCount, includedServices, supplierCost, sellingPrice } = req.body;
try {
await pool.query(
UPDATE tour_packages SET package_name = $1, destination = $2, travelers_count = $3, included_services = $4, supplier_cost = $5, selling_price = $6 WHERE package_id = $7,
[packageName, destination, parseInt(travelersCount, 10) || 1, includedServices, parseFloat(supplierCost), parseFloat(sellingPrice), parseInt(id, 10)]
);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 17. Staff Login Authentication
app.post('/api/login', async (req, res) => {
const { email, password } = req.body;
try {
const result = await pool.query(
'SELECT employee_id, name, email, role FROM employees WHERE LOWER(email) = LOWER($1) AND password = $2',
[email.trim(), password]
);
if (result.rows.length === 0) {
return res.status(401).json({ success: false, error: 'Invalid staff email or password.' });
}
res.json({ success: true, user: result.rows.at(0) });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});
// 18. Log New Office Expense
app.post('/api/expense/submit', async (req, res) => {
const { category, description, amount, expenseDate, loggedBy } = req.body;
try {
const newExp = await pool.query(
INSERT INTO office_expenses (category, description, amount, expense_date, logged_by)  VALUES ($1, $2, $3, $4, $5) RETURNING *,
[category, description, parseFloat(amount), expenseDate, loggedBy]
);
res.status(201).json({ success: true, record: newExp.rows.at(0) });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 19. Fetch All Expenses
app.get('/api/expenses', async (req, res) => {
try {
const result = await pool.query('SELECT * FROM office_expenses ORDER BY expense_date DESC, expense_id DESC');
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 20. Edit Expense
app.put('/api/expense/update/:id', async (req, res) => {
const { id } = req.params;
const { category, description, amount } = req.body;
try {
await pool.query(
'UPDATE office_expenses SET category = $1, description = $2, amount = $3 WHERE expense_id = $4',
[category, description, parseFloat(amount), parseInt(id, 10)]
);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 21. Agency-Wide Profit & Loss Summary
app.get('/api/pnl', async (req, res) => {
try {
const vSum = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM visa_bookings');
const fSum = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM flight_tickets');
const hSum = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM hotel_bookings');
const pSum = await pool.query('SELECT COALESCE(SUM(margin_earned), 0) as sum FROM tour_packages');
const expSum = await pool.query('SELECT COALESCE(SUM(amount), 0) as sum FROM office_expenses');
const grossProfit = parseFloat(vSum.rows.at(0).sum) + parseFloat(fSum.rows.at(0).sum) + parseFloat(hSum.rows.at(0).sum) + parseFloat(pSum.rows.at(0).sum);
const totalExpenses = parseFloat(expSum.rows.at(0).sum);
const netProfit = grossProfit - totalExpenses;
res.json({ grossProfit, totalExpenses, netProfit });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 22. Collect Installment / Update Amount Paid
app.put('/api/payment/collect', async (req, res) => {
const { type, id, newPaidAmount } = req.body;
const tableMap = {
visa: { table: 'visa_bookings', col: 'visa_booking_id' },
ticket: { table: 'flight_tickets', col: 'ticket_id' },
hotel: { table: 'hotel_bookings', col: 'hotel_booking_id' },
package: { table: 'tour_packages', col: 'package_id' }
};
const target = tableMap[type];
if (!target) return res.status(400).json({ error: 'Invalid booking type' });
try {
await pool.query(UPDATE ${target.table} SET amount_paid = $1 WHERE ${target.col} = $2, [parseFloat(newPaidAmount), parseInt(id, 10)]);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 23. Total Client Due Receivable Summary
app.get('/api/receivables', async (req, res) => {
try {
const vDue = await pool.query('SELECT COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)), 0) as due FROM visa_bookings');
const fDue = await pool.query('SELECT COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)), 0) as due FROM flight_tickets');
const hDue = await pool.query('SELECT COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)), 0) as due FROM hotel_bookings');
const pDue = await pool.query('SELECT COALESCE(SUM(selling_price - COALESCE(amount_paid, selling_price)), 0) as due FROM tour_packages');
const totalDue = parseFloat(vDue.rows.at(0).due) + parseFloat(fDue.rows.at(0).due) + parseFloat(hDue.rows.at(0).due) + parseFloat(pDue.rows.at(0).due);
res.json({ totalDue });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 24. Fetch All Employees
app.get('/api/employees', async (req, res) => {
try {
const result = await pool.query('SELECT employee_id, name, email, role, base_salary, commission_rate FROM employees ORDER BY employee_id ASC');
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 25. Hire / Add New Staff Member
app.post('/api/employee/add', async (req, res) => {
const { name, email, role, baseSalary, commissionRate, password } = req.body;
try {
const newEmp = await pool.query(
INSERT INTO employees (name, email, role, base_salary, commission_rate, password)  VALUES ($1, $2, $3, $4, $5, $6) RETURNING employee_id, name,
[name, email.trim(), role, parseFloat(baseSalary), parseFloat(commissionRate), password || 'webbo2026']
);
res.status(201).json({ success: true, employee: newEmp.rows.at(0) });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
// 26. Update Staff Salary, Commission Rate, Role, or Password
app.put('/api/employee/update/:id', async (req, res) => {
const { id } = req.params;
const { name, role, baseSalary, commissionRate, newPassword } = req.body;
try {
if (newPassword && newPassword.trim() !== '') {
await pool.query(
'UPDATE employees SET name = $1, role = $2, base_salary = $3, commission_rate = $4, password = $5 WHERE employee_id = $6',
[name, role, parseFloat(baseSalary), parseFloat(commissionRate), newPassword.trim(), parseInt(id, 10)]
);
} else {
await pool.query(
'UPDATE employees SET name = $1, role = $2, base_salary = $3, commission_rate = $4 WHERE employee_id = $5',
[name, role, parseFloat(baseSalary), parseFloat(commissionRate), parseInt(id, 10)]
);
}
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: err.message });
}
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Cloud ERP Backend running on Port ${PORT}`));

