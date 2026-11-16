const API_BASE_URL = "https://" + "webbo-travel-erp-backend" + ".onrender.com";
let currentAgentId = 1;
let cachedClients = [];
let cachedEmployees = [];

function switchTab(tabId) {
    document.querySelectorAll('.erp-tab-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.className = "nav-tab-btn px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer whitespace-nowrap";
    });
    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeBtn) {
        activeBtn.className = "nav-tab-btn px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white shadow-sm cursor-pointer whitespace-nowrap";
    }
}

function populateCombos() {
    const clientOpts = '<option value="">-- Select Client --</option>' +
        cachedClients.map(c => `<option value="${c.customer_id}|${c.name}">${c.name} (${c.phone})</option>`).join('');
    document.querySelectorAll('.client-combo').forEach(sel => sel.innerHTML = clientOpts);

    const empOpts = cachedEmployees.map(e => `<option value="${e.employee_id}|${e.name}">${e.name} (${e.role})</option>`).join('');
    document.querySelectorAll('.emp-combo').forEach(sel => sel.innerHTML = empOpts);
}

async function loadDashboardStats() {
    try {
        const d = await (await fetch(API_BASE_URL + "/api/dashboard-stats")).json();
        if (!d || d.error) return;
        const fmt = (n) => "BDT " + parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

        document.getElementById('kpiTotalSales').innerText = fmt(d.totalSales);
        document.getElementById('kpiOpProfit').innerText = fmt(d.operatingProfit);
        document.getElementById('kpiCustDue').innerText = fmt(d.customerDue);
        document.getElementById('kpiLastMonthExp').innerText = fmt(d.last30DaysExpenses);

        document.getElementById('statVisaCount').innerText = d.visas.count + " Visas";
        document.getElementById('statVisaAmt').innerText = fmt(d.visas.amount);
        document.getElementById('statTicketCount').innerText = d.tickets.count + " Tickets";
        document.getElementById('statTicketAmt').innerText = fmt(d.tickets.amount);
        document.getElementById('statHotelCount').innerText = d.hotels.count + " Bookings";
        document.getElementById('statHotelAmt').innerText = fmt(d.hotels.amount);
        document.getElementById('statPkgCount').innerText = d.packages.count + " Packages";
        document.getElementById('statPkgAmt').innerText = fmt(d.packages.amount);
    } catch (err) { console.error(err); }
}

async function loadAgentData(id) {
    currentAgentId = id;
    try {
        const data = await (await fetch(API_BASE_URL + "/api/payroll/" + id)).json();
        if (data && !data.error) {
            document.getElementById('agentName').innerText = data.name;
            document.getElementById('agentRole').innerText = "(" + data.role + ")";
            document.getElementById('salesMargin').innerText = "BDT " + data.salesMarginGenerated.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            document.getElementById('cardBaseSalary').innerText = "BDT " + data.baseSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            document.getElementById('cardCommEarned').innerText = "BDT " + data.commissionEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            document.getElementById('netPayout').innerText = "BDT " + data.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        }
    } catch (err) { console.error(err); }
}

async function loadEmployees() {
    const switcher = document.getElementById('staffSwitcherBar');
    try {
        cachedEmployees = await (await fetch(API_BASE_URL + "/api/employees")).json();
        populateCombos();

        if (switcher) {
            switcher.innerHTML = cachedEmployees.map(emp => {
                const isAct = emp.employee_id === currentAgentId;
                const st = isAct
                    ? "background:#18181B; color:#fff; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;"
                    : "background:#F4F4F5; color:#27272A; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #E4E4E7;";
                return '<button onclick="switchAgent(' + emp.employee_id + ')" style="' + st + '">' + emp.name + '</button>';
            }).join('');
        }

        const tbody = document.getElementById('staffTableBody');
        if (tbody) {
            tbody.innerHTML = cachedEmployees.map(emp =>
                '<tr class="hover:bg-gray-50"><td class="p-3 font-bold text-gray-800">#' + emp.employee_id + ' ' + emp.name + '</td><td class="p-3">' + emp.role + '</td><td class="p-3 text-gray-500">' + emp.email + '</td><td class="p-3 font-mono font-bold">BDT ' + parseFloat(emp.base_salary).toLocaleString() + '</td><td class="p-3 font-bold text-green-700">' + parseFloat(emp.commission_rate) + '%</td></tr>'
            ).join('');
        }
    } catch (err) { console.error(err); }
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
    const r = await (await fetch(API_BASE_URL + "/api/employee/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
    if (r.success) { alert("✅ Employee saved!"); e.target.reset(); loadEmployees(); }
    else { alert("Error: " + r.error); }
}

// CLIENT (Standalone)
async function loadCustomers() {
    try {
        cachedClients = await (await fetch(API_BASE_URL + "/api/customers")).json();
        populateCombos();
        const tbody = document.getElementById('customerTableBody');
        if (tbody) {
            tbody.innerHTML = cachedClients.length ? cachedClients.map(c =>
                '<tr class="hover:bg-gray-50"><td class="p-3 font-bold text-green-700">#' + c.customer_id + '</td><td class="p-3 font-semibold text-gray-800">' + c.name + '</td><td class="p-3 text-gray-600">' + c.phone + '</td><td class="p-3 text-gray-500">' + (c.company_name || 'Individual') + '</td></tr>'
            ).join('') : '<tr><td colspan="4" class="p-4 text-center text-gray-400">No clients saved yet.</td></tr>';
        }
    } catch (err) { console.error(err); }
}

async function submitCustomer(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        companyName: document.getElementById('custCompany').value
    };
    const r = await (await fetch(API_BASE_URL + "/api/customer/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
    if (r.success) { alert("✅ Client saved!"); e.target.reset(); loadCustomers(); }
    else { alert("Error: " + r.error); }
}

// PASSPORT (Standalone)
async function loadPassports() {
    try {
        const list = await (await fetch(API_BASE_URL + "/api/passports")).json();
        const tbody = document.getElementById('passportTableBody');
        if (tbody) {
            tbody.innerHTML = list.length ? list.map(p => {
                const exp = p.expiry_date ? new Date(p.expiry_date).toLocaleDateString('en-GB') : 'N/A';
                return '<tr class="hover:bg-gray-50"><td class="p-3 font-bold text-gray-800">' + (p.holder_name || 'Client #' + p.customer_id) + '</td><td class="p-3 text-gray-600">' + (p.phone || '-') + '</td><td class="p-3 font-mono font-bold text-blue-700">' + p.passport_number + '</td><td class="p-3 text-gray-600">' + exp + '</td></tr>';
            }).join('') : '<tr><td colspan="4" class="p-4 text-center text-gray-400">No passports saved yet.</td></tr>';
        }
    } catch (err) { console.error(err); }
}

async function submitPassport(e) {
    e.preventDefault();
    const cVal = document.getElementById('passClientCombo').value;
    const [cid, cname] = cVal ? cVal.split('|') : [null, ''];
    const payload = {
        customerId: cid ? parseInt(cid) : null,
        holderName: document.getElementById('passHolderName').value || cname,
        phone: document.getElementById('passPhone').value,
        passportNumber: document.getElementById('passNumber').value,
        expiryDate: document.getElementById('passExpiry').value
    };
    const r = await (await fetch(API_BASE_URL + "/api/passport/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
    if (r.success) { alert("✅ Passport saved!"); e.target.reset(); loadPassports(); }
    else { alert("Error: " + r.error); }
}

// VISA (Standalone)
async function loadVisas() {
    const list = await (await fetch(API_BASE_URL + "/api/visas")).json();
    const tbody = document.getElementById('visaTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(v => {
        const paid = v.amount_paid !== null ? parseFloat(v.amount_paid) : parseFloat(v.selling_price);
        const due = parseFloat(v.selling_price) - paid;
        const badge = due > 0 ? '<span class="block text-xs font-bold text-red-600">Due: BDT ' + due.toLocaleString() + '</span>' : '<span class="block text-xs font-bold text-green-600">✓ Paid</span>';
const payBtn = due > 0 ? '💵 Pay' : '';
return '' + v.country + ' (' + v.visa_type + ')By: ' + (v.employee_name || 'Staff') + ' • Sup: ' + (v.supplier_name || 'Direct') + '' + (v.customer_name || 'Walk-in') + '+ BDT ' + parseFloat(v.margin_earned || 0).toLocaleString() + badge + '' + payBtn + '🖨️ Invoice';
}).join('') : 'No visas logged yet.';
}
async function submitVisa(e) {
e.preventDefault();
const [cid, cname] = (document.getElementById('visaClientCombo').value || '|Walk-in Client').split('|');
const [eid, ename] = (document.getElementById('visaEmpCombo').value || '1|Mahbub Rahman').split('|');
const payload = {
customerId: cid ? parseInt(cid) : null,
customerName: cname,
employeeId: parseInt(eid),
employeeName: ename,
supplierName: document.getElementById('visaSupplier').value,
country: document.getElementById('visaCountry').value,
visaType: document.getElementById('visaTypeCombo').value,
supplierCost: document.getElementById('visaCost').value,
sellingPrice: document.getElementById('visaPrice').value,
amountPaid: document.getElementById('visaPaid').value
};
const r = await (await fetch(API_BASE_URL + "/api/visa/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
if (r.success) { alert("✅ Visa saved!"); e.target.reset(); loadVisas(); loadDashboardStats(); }
else { alert("Error: " + r.error); }
}
// TICKET (Standalone)
async function loadTickets() {
const list = await (await fetch(API_BASE_URL + "/api/tickets")).json();
const tbody = document.getElementById('ticketTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(t => {
const paid = t.amount_paid !== null ? parseFloat(t.amount_paid) : parseFloat(t.selling_price);
const due = parseFloat(t.selling_price) - paid;
const badge = due > 0 ? 'Due: BDT ' + due.toLocaleString() + '' : '✓ Paid';
const payBtn = due > 0 ? '💵 Pay' : '';
return '' + t.gds_pnr + ' (' + t.airline_code + ') - ' + t.route + 'By: ' + (t.employee_name || 'Staff') + ' • Sup: ' + (t.supplier_name || 'GDS') + '' + (t.customer_name || 'Walk-in') + '+ BDT ' + parseFloat(t.margin_earned || 0).toLocaleString() + badge + '' + payBtn + '🖨️ Invoice';
}).join('') : 'No tickets logged yet.';
}
async function submitTicket(e) {
e.preventDefault();
const [cid, cname] = (document.getElementById('ticketClientCombo').value || '|Walk-in Client').split('|');
const [eid, ename] = (document.getElementById('ticketEmpCombo').value || '1|Mahbub Rahman').split('|');
const payload = {
customerId: cid ? parseInt(cid) : null,
customerName: cname,
employeeId: parseInt(eid),
employeeName: ename,
supplierName: document.getElementById('ticketSupplier').value,
gdsPnr: document.getElementById('gdsPnr').value,
airlineCode: document.getElementById('airlineCode').value,
route: document.getElementById('route').value,
supplierCost: document.getElementById('ticketCost').value,
sellingPrice: document.getElementById('ticketPrice').value,
amountPaid: document.getElementById('ticketPaid').value
};
const r = await (await fetch(API_BASE_URL + "/api/ticket/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
if (r.success) { alert("✅ Ticket saved!"); e.target.reset(); loadTickets(); loadDashboardStats(); }
else { alert("Error: " + r.error); }
}
// HOTEL (Standalone)
async function loadHotels() {
const list = await (await fetch(API_BASE_URL + "/api/hotels")).json();
const tbody = document.getElementById('hotelTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(h => {
const paid = h.amount_paid !== null ? parseFloat(h.amount_paid) : parseFloat(h.selling_price);
const due = parseFloat(h.selling_price) - paid;
const badge = due > 0 ? 'Due: BDT ' + due.toLocaleString() + '' : '✓ Paid';
const payBtn = due > 0 ? '💵 Pay' : '';
return '' + h.hotel_name + ' (' + h.city + ')By: ' + (h.employee_name || 'Staff') + ' • Sup: ' + (h.supplier_name || 'Direct') + '' + (h.customer_name || 'Walk-in') + '+ BDT ' + parseFloat(h.margin_earned || 0).toLocaleString() + badge + '' + payBtn + '🖨️ Invoice';
}).join('') : 'No hotel bookings yet.';
}
async function submitHotel(e) {
e.preventDefault();
const [cid, cname] = (document.getElementById('hotelClientCombo').value || '|Walk-in Client').split('|');
const [eid, ename] = (document.getElementById('hotelEmpCombo').value || '1|Mahbub Rahman').split('|');
const payload = {
customerId: cid ? parseInt(cid) : null,
customerName: cname,
employeeId: parseInt(eid),
employeeName: ename,
supplierName: document.getElementById('hotelSupplier').value,
city: document.getElementById('hotelCity').value,
hotelName: document.getElementById('hotelName').value,
roomType: document.getElementById('hotelRoom').value,
checkIn: document.getElementById('hotelCheckIn').value,
checkOut: document.getElementById('hotelCheckOut').value,
supplierCost: document.getElementById('hotelCost').value,
sellingPrice: document.getElementById('hotelPrice').value,
amountPaid: document.getElementById('hotelPaid').value
};
const r = await (await fetch(API_BASE_URL + "/api/hotel/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
if (r.success) { alert("✅ Hotel saved!"); e.target.reset(); loadHotels(); loadDashboardStats(); }
else { alert("Error: " + r.error); }
}
// PACKAGE (Standalone)
async function loadPackages() {
const list = await (await fetch(API_BASE_URL + "/api/packages")).json();
const tbody = document.getElementById('packageTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(p => {
const paid = p.amount_paid !== null ? parseFloat(p.amount_paid) : parseFloat(p.selling_price);
const due = parseFloat(p.selling_price) - paid;
const badge = due > 0 ? 'Due: BDT ' + due.toLocaleString() + '' : '✓ Paid';
const payBtn = due > 0 ? '💵 Pay' : '';
return '' + p.package_name + ' (' + p.travelers_count + ' Pax)By: ' + (p.employee_name || 'Staff') + ' • Sup: ' + (p.supplier_name || 'Direct') + '' + (p.customer_name || 'Walk-in') + '+ BDT ' + parseFloat(p.margin_earned || 0).toLocaleString() + badge + '' + payBtn + '🖨️ Invoice';
}).join('') : 'No packages logged yet.';
}
async function submitPackage(e) {
e.preventDefault();
const [cid, cname] = (document.getElementById('pkgClientCombo').value || '|Walk-in Client').split('|');
const [eid, ename] = (document.getElementById('pkgEmpCombo').value || '1|Mahbub Rahman').split('|');
const payload = {
customerId: cid ? parseInt(cid) : null,
customerName: cname,
employeeId: parseInt(eid),
employeeName: ename,
supplierName: document.getElementById('pkgSupplier').value,
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
const r = await (await fetch(API_BASE_URL + "/api/package/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
if (r.success) { alert("✅ Package saved!"); e.target.reset(); loadPackages(); loadDashboardStats(); }
else { alert("Error: " + r.error); }
}
// EXPENSES (Standalone)
async function loadExpenses() {
const list = await (await fetch(API_BASE_URL + "/api/expenses")).json();
const tbody = document.getElementById('expenseTableBody');
if (!tbody) return;
tbody.innerHTML = list.length ? list.map(e => {
const d = new Date(e.expense_date).toLocaleDateString('en-GB');
return '' + e.description + '' + e.category + ' • By: ' + (e.employee_name || 'Staff') + '' + d + '- BDT ' + parseFloat(e.amount).toLocaleString() + '';
}).join('') : 'No expenses logged yet.';
}
async function submitExpense(e) {
e.preventDefault();
const [, ename] = (document.getElementById('expEmpCombo').value || '1|Mahbub Rahman').split('|');
const payload = {
category: document.getElementById('expCategory').value,
description: document.getElementById('expDesc').value,
amount: document.getElementById('expAmount').value,
expenseDate: document.getElementById('expDate').value,
employeeName: ename
};
const r = await (await fetch(API_BASE_URL + "/api/expense/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json();
if (r.success) { alert("✅ Expense saved!"); e.target.reset(); loadExpenses(); loadDashboardStats(); }
else { alert("Error: " + r.error); }
}
// PAYMENT & INVOICE
async function collectPayment(type, id, currPaid, total) {
const add = prompt("Total: BDT " + total + "\nPaid: BDT " + currPaid + "\nDue: BDT " + (total - currPaid) + "\n\nEnter payment received (BDT):");
if (!add || isNaN(add)) return;
const r = await (await fetch(API_BASE_URL + "/api/payment/collect", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, newPaidAmount: parseFloat(currPaid) + parseFloat(add) }) })).json();
if (r.success) { alert("✅ Payment updated!"); refreshAll(); }
}
function openInvoice(invId, client, title, sub, totalVal, paidVal) {
const total = parseFloat(totalVal);
const paid = paidVal !== undefined && paidVal !== null ? parseFloat(paidVal) : total;
const due = Math.max(0, total - paid);
document.getElementById('invNumber').innerText = "INV-" + invId;
document.getElementById('invDate').innerText = "Date: " + new Date().toLocaleDateString('en-GB');
document.getElementById('invClient').innerText = client;
document.getElementById('invAgent').innerText = sub;
document.getElementById('invServiceTitle').innerText = title;
document.getElementById('invServiceSub').innerText = "CM Travels & Tours, West Kafrul, Dhaka";
document.getElementById('invAmount').innerText = "BDT " + total.toLocaleString("en-IN", { minimumFractionDigits: 2 });
document.getElementById('invTotal').innerText = "BDT " + total.toLocaleString("en-IN", { minimumFractionDigits: 2 });
document.getElementById('invPaid').innerText = "BDT " + paid.toLocaleString("en-IN", { minimumFractionDigits: 2 });
document.getElementById('invDue').innerText = "BDT " + due.toLocaleString("en-IN", { minimumFractionDigits: 2 });
document.getElementById('invoiceModal').classList.remove('hidden');
}
function closeInvoice() { document.getElementById('invoiceModal').classList.add('hidden'); }
function printInvoice() {
const html = document.getElementById('printableReceipt').innerHTML;
const w = window.open("", "", "width=720,height=820");
w.document.write('CM Travels & Tours Receipt' + html + '');
w.document.close();
setTimeout(() => { w.print(); w.close(); }, 500);
}
function refreshAll() {
loadDashboardStats();
loadVisas();
loadTickets();
loadHotels();
loadPackages();
loadExpenses();
}
loadEmployees();
loadCustomers();
loadPassports();
refreshAll();
