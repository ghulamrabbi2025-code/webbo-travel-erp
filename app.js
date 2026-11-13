const API_BASE_URL = "https://onrender.com";
let currentAgentId = 1;

function switchTab(tabId) {
    document.querySelectorAll('.erp-tab-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.className = "nav-tab-btn px-3.5 py-2 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer whitespace-nowrap";
    });
    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeBtn) {
        activeBtn.className = "nav-tab-btn px-4 py-2 rounded-full text-xs font-semibold bg-zinc-900 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap";
    }
}

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard-stats`);
        const d = await res.json();
        if (!d || d.error) return;

        const fmt = (n) => 'BDT ' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        document.getElementById('kpiTotalSales').innerText = fmt(d.totalSales);
        document.getElementById('kpiOpProfit').innerText = fmt(d.operatingProfit);
        document.getElementById('kpiCustDue').innerText = fmt(d.customerDue);
        document.getElementById('kpiLastMonthExp').innerText = fmt(d.last30DaysExpenses);

        document.getElementById('statVisaCount').innerText = d.visas.count + ' Visas';
        document.getElementById('statVisaAmt').innerText = fmt(d.visas.amount);

        document.getElementById('statTicketCount').innerText = d.tickets.count + ' Tickets';
        document.getElementById('statTicketAmt').innerText = fmt(d.tickets.amount);

        document.getElementById('statHotelCount').innerText = d.hotels.count + ' Bookings';
        document.getElementById('statHotelAmt').innerText = fmt(d.hotels.amount);

        document.getElementById('statPkgCount').innerText = d.packages.count + ' Packages';
        document.getElementById('statPkgAmt').innerText = fmt(d.packages.amount);
    } catch (err) {
        console.error("Dashboard stats error:", err);
    }
}

async function loadAgentData(id) {
    currentAgentId = id;
    try {
        const res = await fetch(`${API_BASE_URL}/api/payroll/${id}`);
        const data = await res.json();
        if (data && !data.error) {
            document.getElementById('agentName').innerText = data.name;
            document.getElementById('agentRole').innerText = data.role;
            document.getElementById('salesMargin').innerText = 'BDT ' + data.salesMarginGenerated.toLocaleString('en-IN', { minimumFractionDigits: 2 });
            document.getElementById('cardBaseSalary').innerText = 'BDT ' + data.baseSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 });
            document.getElementById('cardCommEarned').innerText = 'BDT ' + data.commissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 });
            document.getElementById('netPayout').innerText = 'BDT ' + data.netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        }
    } catch (err) {
        console.error("Payroll fetch error:", err);
    }
}
async function loadEmployees() {
    const switcher = document.getElementById('staffSwitcherBar');
    if (switcher) switcher.innerHTML = '<span class="text-xs text-zinc-400">Fetching staff names...</span>';
    try {
        const res = await fetch(`${API_BASE_URL}/api/employees`);
        const employees = await res.json();
        if (switcher) {
            switcher.innerHTML = employees.length > 0
                ? employees.map(emp => {
                    const cls = emp.employee_id === currentAgentId
                        ? "px-3.5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                        : "px-3.5 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold hover:bg-zinc-200 cursor-pointer";
                    return `<button onclick="switchAgent(${emp.employee_id})" class="${cls}">${emp.name}</button>`;
                }).join('')
                : '<span class="text-xs text-rose-500">No staff found. Add staff in Expenses & HR tab.</span>';
        }

        const tbody = document.getElementById('staffTableBody');
        if (tbody) {
            tbody.innerHTML = employees.map(emp => `
                <tr class="hover:bg-zinc-50">
                    <td class="p-3 font-bold text-zinc-800">#${emp.employee_id} ${emp.name}</td>
                    <td class="p-3"><div class="font-semibold text-zinc-700">${emp.role}</div><div class="text-[10px] text-zinc-400">${emp.email}</div></td>
                    <td class="p-3 font-mono font-bold text-zinc-700">BDT ${parseFloat(emp.base_salary).toLocaleString()}</td>
                    <td class="p-3 font-bold text-emerald-700">${parseFloat(emp.commission_rate)}%</td>
                    <td class="p-3 text-right">
                        <button onclick="editEmployee(${emp.employee_id}, '${emp.name}', '${emp.role}', ${emp.base_salary}, ${emp.commission_rate})" class="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Employee list error:", err);
    }
}

function switchAgent(id) {
    loadAgentData(id);
    loadEmployees();
}

async function submitEmployee(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('empName').value,
        email: document.getElementById('empEmail').value,
        role: document.getElementById('empRole').value,
        baseSalary: document.getElementById('empSalary').value,
        commissionRate: document.getElementById('empComm').value
    };
    const res = await fetch(`${API_BASE_URL}/api/employee/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if ((await res.json()).success) {
        alert("✅ New staff hired!");
        e.target.reset();
        loadEmployees();
    }
}

async function editEmployee(id, oldName, oldRole, oldSal, oldComm) {
    const name = prompt("Staff Name:", oldName); if (!name) return;
    const role = prompt("Job Title:", oldRole); if (!role) return;
    const baseSalary = prompt("Base Salary (BDT):", oldSal);
    const commissionRate = prompt("Commission %:", oldComm);
    const res = await fetch(`${API_BASE_URL}/api/employee/update/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, role, baseSalary, commissionRate }) });
    if ((await res.json()).success) {
        alert("✅ Staff updated!");
        loadEmployees();
        if (currentAgentId === id) loadAgentData(id);
    }
}

async function submitVisa(e) {
    e.preventDefault();
    const payload = {
        customerId: parseInt(document.getElementById('visaCustId').value),
        employeeId: currentAgentId,
        country: document.getElementById('visaCountry').value,
        visaType: document.getElementById('visaType').value,
        supplierCost: document.getElementById('visaCost').value,
        sellingPrice: document.getElementById('visaPrice').value,
        amountPaid: document.getElementById('visaPaid').value
    };
    const res = await fetch(`${API_BASE_URL}/api/visa/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if ((await res.json()).success) {
        alert("💾 Visa entry saved!");
        document.getElementById('visaPaid').value = '';
        refreshAll();
    }
}

async function loadVisas() {
    const res = await fetch(`${API_BASE_URL}/api/visas`);
    const list = await res.json();
    const tbody = document.getElementById('visaTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(v => {
        const paid = v.amount_paid !== null ? parseFloat(v.amount_paid) : parseFloat(v.selling_price);
        const due = parseFloat(v.selling_price) - paid;
        const badge = due > 0 ? `<span class="block text-[10px] font-bold text-rose-600">Due: BDT ${due.toLocaleString()}</span>` : `<span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>`;
        const payBtn = due > 0 ? `<button onclick="collectPayment('visa', ${v.visa_booking_id}, ${paid}, ${v.selling_price})" class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-[11px] font-bold">💵 Pay</button>` : '';
        return `<tr class="hover:bg-zinc-50">
            <td class="p-3"><div class="font-bold text-zinc-800">${v.country}</div><div class="text-[10px] text-emerald-600 font-bold">${v.visa_type}</div></td>
            <td class="p-3 text-zinc-600">${v.customer_name || 'ID #' + v.customer_id}</td>
            <td class="p-3 font-mono font-bold text-emerald-700">+ BDT ${parseFloat(v.margin_earned).toLocaleString()}${badge}</td>
            <td class="p-3 text-right space-x-1">${payBtn}
                <button onclick="openInvoice('VIS-${v.visa_booking_id}', '${v.customer_name || 'Client #' + v.customer_id}', '${v.country} Visa (${v.visa_type})', 'Status: ${v.tracking_status || 'Submitted'}', ${v.selling_price}, ${paid})" class="px-2 py-1 bg-zinc-800 text-white rounded text-[11px] font-bold">🖨️ Invoice</button>
                <button onclick="editVisa(${v.visa_booking_id}, '${v.country}', '${v.visa_type}', '${v.tracking_status || 'Submitted'}', ${v.supplier_cost}, ${v.selling_price})" class="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-[11px] font-bold">✏️ Edit</button>
            </td></tr>`;
    }).join('') : '<tr><td colspan="4" class="p-4 text-center text-zinc-400">No visas logged yet.</td></tr>';
}

async function editVisa(id, c, t, s, cost, price) {
    const country = prompt("Country:", c); if (!country) return;
    const visaType = prompt("Visa Type:", t);
    const trackingStatus = prompt("Status:", s);
    const supplierCost = prompt("Net Cost (BDT):", cost);
    const sellingPrice = prompt("Selling Price (BDT):", price);
const res = await fetch(${API_BASE_URL}/api/visa/update/${id}, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, visaType, trackingStatus, supplierCost, sellingPrice }) });
if ((await res.json()).success) {
alert("✅ Visa updated!");
refreshAll();
}
}
async function submitTicket(e) {
e.preventDefault();
const payload = {
customerId: parseInt(document.getElementById('ticketCustId').value),
employeeId: currentAgentId,
gdsPnr: document.getElementById('gdsPnr').value,
airlineCode: document.getElementById('airlineCode').value,
route: document.getElementById('route').value,
supplierCost: document.getElementById('ticketCost').value,
sellingPrice: document.getElementById('ticketPrice').value,
amountPaid: document.getElementById('ticketPaid').value
};
const res = await fetch(${API_BASE_URL}/api/ticket/submit, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if ((await res.json()).success) {
alert("✈️ Ticket PNR saved!");
document.getElementById('ticketPaid').value = '';
refreshAll();
}
}
async function loadTickets() {
const res = await fetch(${API_BASE_URL}/api/tickets);
const list = await res.json();
const tbody = document.getElementById('ticketTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(t => {
const paid = t.amount_paid !== null ? parseFloat(t.amount_paid) : parseFloat(t.selling_price);
const due = parseFloat(t.selling_price) - paid;
const badge = due > 0 ? <span class="block text-[10px] font-bold text-rose-600">Due: BDT ${due.toLocaleString()}</span> : <span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>;
const payBtn = due > 0 ? <button onclick="collectPayment('ticket', ${t.ticket_id}, ${paid}, ${t.selling_price})" class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-[11px] font-bold">💵 Pay</button> : '';
return `
${t.gds_pnr} (${t.airline_code})${t.route}
${t.customer_name || 'ID #' + t.customer_id}
• BDT \(parseFloat(t.margin_{e}arned).toLocaleString()\){badge}
${payBtn}
`;
}).join('') : 'No tickets logged yet.';
}
async function editTicket(id, pnr, air, rt, cost, price) {
const gdsPnr = prompt("GDS PNR:", pnr); if (!gdsPnr) return;
const airlineCode = prompt("Airline:", air);
const route = prompt("Route:", rt);
const supplierCost = prompt("Net Cost (BDT):", cost);
const sellingPrice = prompt("Selling Price (BDT):", price);
const res = await fetch(${API_BASE_URL}/api/ticket/update/${id}, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gdsPnr, airlineCode, route, supplierCost, sellingPrice }) });
if ((await res.json()).success) {
alert("✅ Ticket updated!");
refreshAll();
}
}
async function submitHotel(e) {
e.preventDefault();
const payload = {
customerId: parseInt(document.getElementById('hotelCustId').value),
employeeId: currentAgentId,
city: document.getElementById('hotelCity').value,
hotelName: document.getElementById('hotelName').value,
roomType: document.getElementById('hotelRoom').value,
checkIn: document.getElementById('hotelCheckIn').value,
checkOut: document.getElementById('hotelCheckOut').value,
supplierCost: document.getElementById('hotelCost').value,
sellingPrice: document.getElementById('hotelPrice').value,
amountPaid: document.getElementById('hotelPaid').value
};
const res = await fetch(${API_BASE_URL}/api/hotel/submit, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if ((await res.json()).success) {
alert("🏨 Hotel booking saved!");
e.target.reset();
refreshAll();
}
}
async function loadHotels() {
const res = await fetch(${API_BASE_URL}/api/hotels);
const list = await res.json();
const tbody = document.getElementById('hotelTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(h => {
const inD = new Date(h.check_in).toLocaleDateString('en-GB');
const outD = new Date(h.check_out).toLocaleDateString('en-GB');
const paid = h.amount_paid !== null ? parseFloat(h.amount_paid) : parseFloat(h.selling_price);
const due = parseFloat(h.selling_price) - paid;
const badge = due > 0 ? <span class="block text-[10px] font-bold text-rose-600">Due: BDT ${due.toLocaleString()}</span> : <span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>;
const payBtn = due > 0 ? <button onclick="collectPayment('hotel', ${h.hotel_booking_id}, ${paid}, ${h.selling_price})" class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-[11px] font-bold">💵 Pay</button> : '';
return `
${h.hotel_name}${h.city} • ${inD} to ${outD}
${h.customer_name || 'ID #' + h.customer_id}
• BDT \(parseFloat(h.margin_{e}arned).toLocaleString()\){badge}
${payBtn}
`;
}).join('') : 'No hotel bookings yet.';
}
async function editHotel(id, c, h, r, cost, price) {
const city = prompt("City:", c); if (!city) return;
const hotelName = prompt("Hotel Name:", h);
const roomType = prompt("Room Type:", r);
const supplierCost = prompt("Net Cost (BDT):", cost);
const sellingPrice = prompt("Selling Price (BDT):", price);
const res = await fetch(${API_BASE_URL}/api/hotel/update/${id}, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, hotelName, roomType, supplierCost, sellingPrice }) });
if ((await res.json()).success) {
alert("✅ Hotel updated!");
refreshAll();
}
}
async function submitPackage(e) {
e.preventDefault();
const payload = {
customerId: parseInt(document.getElementById('pkgCustId').value),
employeeId: currentAgentId,
packageName: document.getElementById('pkgName').value,
category: document.getElementById('pkgCategory').value,
destination: document.getElementById('pkgDest').value,
travelersCount: document.getElementById('pkgPax').value,
departureDate: document.getElementById('pkgDate').value,
includedServices: document.getElementById('pkgServices').value,
supplierCost: document.getElementById('pkgCost').value,
sellingPrice: document.getElementById('pkgPrice').value,
amountPaid: document.getElementById('pkgPaid').value
};
const res = await fetch(${API_BASE_URL}/api/package/submit, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if ((await res.json()).success) {
alert("📦 Package saved!");
e.target.reset();
refreshAll();
}
}
async function loadPackages() {
const res = await fetch(${API_BASE_URL}/api/packages);
const list = await res.json();
const tbody = document.getElementById('packageTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(p => {
const depD = new Date(p.departure_date).toLocaleDateString('en-GB');
const paid = p.amount_paid !== null ? parseFloat(p.amount_paid) : parseFloat(p.selling_price);
const due = parseFloat(p.selling_price) - paid;
const badge = due > 0 ? <span class="block text-[10px] font-bold text-rose-600">Due: BDT ${due.toLocaleString()}</span> : <span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>;
const payBtn = due > 0 ? <button onclick="collectPayment('package', ${p.package_id}, ${paid}, ${p.selling_price})" class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-[11px] font-bold">💵 Pay</button> : '';
return `
${p.package_name} (${p.travelers_count} Pax)${p.category} • ${depD}
${p.customer_name || 'ID #' + p.customer_id}
• BDT \(parseFloat(p.margin_{e}arned).toLocaleString()\){badge}
${payBtn}
`;
}).join('') : 'No packages created yet.';
}
async function editPackage(id, n, d, pax, srv, cost, price) {
const packageName = prompt("Package Title:", n); if (!packageName) return;
const destination = prompt("Destination:", d);
const travelersCount = prompt("Pax Count:", pax);
const includedServices = prompt("Services:", srv);
const supplierCost = prompt("Net Cost (BDT):", cost);
const sellingPrice = prompt("Selling Price (BDT):", price);
const res = await fetch(${API_BASE_URL}/api/package/update/${id}, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageName, destination, travelersCount, includedServices, supplierCost, sellingPrice }) });
if ((await res.json()).success) {
alert("✅ Package updated!");
refreshAll();
}
}
async function submitCustomer(e) {
e.preventDefault();
const payload = {
name: document.getElementById('custName').value,
phone: document.getElementById('custPhone').value,
companyName: document.getElementById('custCompany').value,
passportNumber: document.getElementById('custPassport').value,
expiryDate: document.getElementById('custExpiry').value
};
const res = await fetch(${API_BASE_URL}/api/customer/register, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
const r = await res.json();
if (r.success) {
alert(✅ Client registered as ID #${r.customer.customer_id});
e.target.reset();
loadCustomers();
}
}
async function loadCustomers() {
const res = await fetch(${API_BASE_URL}/api/customers);
const list = await res.json();
const tbody = document.getElementById('customerTableBody');
if (!tbody) return;
tbody.innerHTML = list.map(c => {
const expISO = c.expiry_date ? new Date(c.expiry_date).toISOString().split('T').at(0) : '';
const expDisp = c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-GB') : 'N/A';
return `
#${c.customer_id}
${c.name}
${c.phone}
${c.passport_number || 'Pending'}
${expDisp}
✏️ Edit
`;
}).join('');
}
async function editCustomer(id, n, p, pass, exp) {
const name = prompt("Client Name:", n); if (!name) return;
const phone = prompt("Mobile:", p);
const passportNumber = prompt("Passport No:", pass);
const expiryDate = prompt("Expiry (YYYY-MM-DD):", exp);
const res = await fetch(${API_BASE_URL}/api/customer/update/${id}, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, passportNumber, expiryDate }) });
if ((await res.json()).success) {
alert("✅ Client updated!");
loadCustomers();
}
}
async function submitExpense(e) {
e.preventDefault();
const payload = {
category: document.getElementById('expCategory').value,
description: document.getElementById('expDesc').value,
amount: document.getElementById('expAmount').value,
expenseDate: document.getElementById('expDate').value,
loggedBy: currentAgentId
};
const res = await fetch(${API_BASE_URL}/api/expense/submit, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if ((await res.json()).success) {
alert("🧾 Expense logged!");
e.target.reset();
refreshAll();
}
}
async function loadExpenses() {
const res = await fetch(${API_BASE_URL}/api/expenses);
const list = await res.json();
const tbody = document.getElementById('expenseTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(e => {
const d = new Date(e.expense_date).toLocaleDateString('en-GB');
return `
${e.description}${e.category}
${d}
• BDT ${parseFloat(e.amount).toLocaleString()}
✏️ Edit
`;
}).join('') : 'No expenses logged yet.';
}
async function editExpense(id, c, d, a) {
const category = prompt("Category:", c); if (!category) return;
const description = prompt("Description:", d);
const amount = prompt("Amount (BDT):", a);
const res = await fetch(${API_BASE_URL}/api/expense/update/${id}, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, description, amount }) });
if ((await res.json()).success) {
alert("✅ Expense updated!");
refreshAll();
}
}
async function collectPayment(type, id, currPaid, total) {
const add = prompt(Total: BDT ${total}\nPaid: BDT ${currPaid}\nDue: BDT ${total - currPaid}\n\nEnter new payment received (BDT):);
if (!add || isNaN(add)) return;
const res = await fetch(${API_BASE_URL}/api/payment/collect, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, newPaidAmount: parseFloat(currPaid) + parseFloat(add) }) });
if ((await res.json()).success) {
alert("✅ Payment collected!");
refreshAll();
}
}
function openInvoice(invId, client, title, sub, totalVal, paidVal) {
const total = parseFloat(totalVal);
const paid = paidVal !== undefined && paidVal !== null ? parseFloat(paidVal) : total;
const due = Math.max(0, total - paid);
document.getElementById('invNumber').innerText = 'INV-' + invId;
document.getElementById('invDate').innerText = 'Date: ' + new Date().toLocaleDateString('en-GB');
document.getElementById('invClient').innerText = client;
document.getElementById('invAgent').innerText = document.getElementById('agentName')?.innerText || 'Consultant';
document.getElementById('invServiceTitle').innerText = title;
document.getElementById('invServiceSub').innerText = sub;
document.getElementById('invAmount').innerText = 'BDT ' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
document.getElementById('invTotal').innerText = 'BDT ' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
document.getElementById('invPaid').innerText = 'BDT ' + paid.toLocaleString('en-IN', { minimumFractionDigits: 2 });
document.getElementById('invDue').innerText = 'BDT ' + due.toLocaleString('en-IN', { minimumFractionDigits: 2 });
document.getElementById('invoiceModal').classList.remove('hidden');
}
function closeInvoice() {
document.getElementById('invoiceModal').classList.add('hidden');
}
function printInvoice() {
const html = document.getElementById('printableReceipt').innerHTML;
const w = window.open('', '', 'width=720,height=820');
w.document.write(<html><head><title>CM Travels & Tours Receipt</title><script src="https://tailwindcss.com"><\/script></head><body class="p-8 bg-white"><div class="max-w-lg mx-auto border border-zinc-300 rounded-2xl p-6 space-y-5">${html}</div><script>setTimeout(()=>{window.print();window.close();},500);<\/script></body></html>);
w.document.close();
}
function refreshAll() {
loadDashboardStats();
loadVisas();
loadTickets();
loadHotels();
loadPackages();
loadExpenses();
}
currentAgentId = 1;
loadEmployees();
loadCustomers();
refreshAll();
