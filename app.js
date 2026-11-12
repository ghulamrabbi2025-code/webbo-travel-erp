const API_BASE_URL = "https://onrender.com";
let currentAgentId = 1;

async function loadAgentData(id) {
    currentAgentId = id;
    const btn1 = document.getElementById('btnAgent1');
    const btn2 = document.getElementById('btnAgent2');
    
    if (btn1 && btn2) {
        if (id === 1) {
            btn1.className = "px-4 py-2.5 bg-white text-emerald-800 rounded-lg text-xs md:text-sm font-bold shadow-sm transition-all duration-200 tracking-wide";
            btn2.className = "px-4 py-2.5 text-slate-600 rounded-lg text-xs md:text-sm font-semibold hover:text-slate-900 transition-all duration-200 tracking-wide";
        } else {
            btn2.className = "px-4 py-2.5 bg-white text-emerald-800 rounded-lg text-xs md:text-sm font-bold shadow-sm transition-all duration-200 tracking-wide";
            btn1.className = "px-4 py-2.5 text-slate-600 rounded-lg text-xs md:text-sm font-semibold hover:text-slate-900 transition-all duration-200 tracking-wide";
        }
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/payroll/${id}`);
        const data = await res.json();
        
        if (data && !data.error) {
            document.getElementById('agentName').innerText = data.name;
            document.getElementById('agentRole').innerText = data.role;
            document.getElementById('salesMargin').innerText = 'BDT ' + data.salesMarginGenerated.toLocaleString('en-IN', {minimumFractionDigits: 2});
            document.getElementById('cardBaseSalary').innerText = 'BDT ' + data.baseSalary.toLocaleString('en-IN', {minimumFractionDigits: 2});
            document.getElementById('cardCommEarned').innerText = 'BDT ' + data.commissionEarned.toLocaleString('en-IN', {minimumFractionDigits: 2});
            document.getElementById('netPayout').innerText = 'BDT ' + data.netPayout.toLocaleString('en-IN', {minimumFractionDigits: 2});
            
            document.getElementById('tableBase').innerText = 'BDT ' + data.baseSalary.toLocaleString('en-IN', {minimumFractionDigits: 2});
            document.getElementById('tableComm').innerText = '+ BDT ' + data.commissionEarned.toLocaleString('en-IN', {minimumFractionDigits: 2});
            document.getElementById('tableNet').innerText = 'BDT ' + data.netPayout.toLocaleString('en-IN', {minimumFractionDigits: 2});
        }
    } catch (err) {
        console.error("Cloud fetch failure:", err);
    }
}

async function submitVisa(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const payload = {
        customerId: parseInt(document.getElementById('visaCustId').value),
        employeeId: currentAgentId,
        country: document.getElementById('visaCountry').value,
        visaType: document.getElementById('visaType').value,
        supplierCost: parseFloat(document.getElementById('visaCost').value),
        sellingPrice: parseFloat(document.getElementById('visaPrice').value),
        amountPaid: document.getElementById('visaPaid').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/visa/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
            alert("💾 Visa record saved successfully!");
            document.getElementById('visaPaid').value = '';
            loadAgentData(currentAgentId);
            loadVisas();
            loadPnL();
        }
    } catch (err) {
        alert("Cloud transmission timed out: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function submitTicket(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const payload = {
        customerId: parseInt(document.getElementById('ticketCustId').value),
        employeeId: currentAgentId,
        gdsPnr: document.getElementById('gdsPnr').value,
        airlineCode: document.getElementById('airlineCode').value,
        route: document.getElementById('route').value,
        supplierCost: parseFloat(document.getElementById('ticketCost').value),
        sellingPrice: parseFloat(document.getElementById('ticketPrice').value),
        amountPaid: document.getElementById('ticketPaid').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/ticket/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
            alert("💾 Ticket PNR logged successfully!");
            document.getElementById('ticketPaid').value = '';
            loadAgentData(currentAgentId);
            loadTickets();
            loadPnL();
        }
    } catch (err) {
        alert("Cloud transmission timed out: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function loadCustomers() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/customers`);
        const customers = await res.json();
        const tbody = document.getElementById('customerTableBody');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">No clients registered yet.</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(c => {
            const expiry = c.expiry_date ? new Date(c.expiry_date).toISOString().split('T')[0] : '';
            const displayExpiry = c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-GB') : 'N/A';
            return `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-emerald-700">#${c.customer_id}</td>
                    <td class="p-3 font-semibold text-slate-800">${c.name}</td>
                    <td class="p-3 text-slate-500">${c.phone}</td>
                    <td class="p-3 font-mono font-bold text-blue-700">${c.passport_number || 'Pending'}</td>
                    <td class="p-3 text-slate-600">${displayExpiry}</td>
                    <td class="p-3 text-right">
                        <button onclick="editCustomer(${c.customer_id}, '${c.name}', '${c.phone}', '${c.passport_number || ''}', '${expiry}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("Error loading customers:", err);
    }
}

async function editCustomer(id, oldName, oldPhone, oldPass, oldExp) {
    const name = prompt("Update Client Full Name:", oldName);
    if (!name) return;
    const phone = prompt("Update Mobile Number:", oldPhone);
    if (!phone) return;
    const passportNumber = prompt("Update Passport Number:", oldPass);
    const expiryDate = prompt("Update Passport Expiry (YYYY-MM-DD):", oldExp);

    try {
        const res = await fetch(`${API_BASE_URL}/api/customer/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, passportNumber, expiryDate })
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ Client details updated!");
            loadCustomers();
        }
    } catch (err) {
        alert("Update failed: " + err.message);
    }
}

async function submitCustomer(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const payload = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        companyName: document.getElementById('custCompany').value,
        passportNumber: document.getElementById('custPassport').value,
        expiryDate: document.getElementById('custExpiry').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/customer/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
            alert(`✅ Registered ${result.customer.name} as Customer ID #${result.customer.customer_id}!`);
            e.target.reset();
            loadCustomers();
        }
    } catch (err) {
        alert("Cloud connection timed out: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function loadHotels() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/hotels`);
        const hotels = await res.json();
        const tbody = document.getElementById('hotelTableBody');
        if (!tbody) return;

        if (hotels.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">No hotel bookings recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = hotels.map(h => {
            const inDate = new Date(h.check_in).toLocaleDateString('en-GB');
            const outDate = new Date(h.check_out).toLocaleDateString('en-GB');
            const paid = h.amount_paid !== null ? parseFloat(h.amount_paid) : parseFloat(h.selling_price);
            const due = parseFloat(h.selling_price) - paid;
            const dueBadge = due > 0 ? `<span class="block text-[10px] font-bold text-red-600">Due: BDT ${due.toLocaleString()}</span>` : `<span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>`;
const payBtn = due > 0 ? <button onclick="collectPayment('hotel', ${h.hotel_booking_id}, ${paid}, ${h.selling_price})" class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-bold">💵 Pay</button> : '';
return `
${h.hotel_name}${h.city} • ${h.room_type}
${h.customer_name || 'ID #' + h.customer_id}\({inDate} - \){outDate}• BDT \(parseFloat(h.margin_{e}arned).toLocaleString()\){dueBadge}
${payBtn}`;
}).join('');
} catch (err) {
console.error("Error loading hotels:", err);
}
}
async function editHotel(id, oldCity, oldHotel, oldRoom, oldCost, oldPrice) {
const city = prompt("Update Destination City/Country:", oldCity);
if (!city) return;
const hotelName = prompt("Update Hotel Name:", oldHotel);
if (!hotelName) return;
const roomType = prompt("Update Room Type:", oldRoom);
const supplierCost = prompt("Update Net Cost (BDT):", oldCost);
const sellingPrice = prompt("Update Selling Price (BDT):", oldPrice);
try {
const res = await fetch(${API_BASE_URL}/api/hotel/update/${id}, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ city, hotelName, roomType, supplierCost, sellingPrice })
});
const result = await res.json();
if (result.success) {
alert("✅ Hotel booking updated & commission recalculated!");
loadHotels();
loadAgentData(currentAgentId);
loadPnL();
}
} catch (err) {
alert("Update failed: " + err.message);
}
}
async function submitHotel(e) {
e.preventDefault();
const btn = e.target.querySelector('button[type="submit"]');
btn.disabled = true;
const payload = {
customerId: parseInt(document.getElementById('hotelCustId').value),
employeeId: currentAgentId,
city: document.getElementById('hotelCity').value,
hotelName: document.getElementById('hotelName').value,
roomType: document.getElementById('hotelRoom').value,
checkIn: document.getElementById('hotelCheckIn').value,
checkOut: document.getElementById('hotelCheckOut').value,
supplierCost: parseFloat(document.getElementById('hotelCost').value),
sellingPrice: parseFloat(document.getElementById('hotelPrice').value),
amountPaid: document.getElementById('hotelPaid').value
};
try {
const res = await fetch(${API_BASE_URL}/api/hotel/submit, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
const result = await res.json();
if (result && result.success) {
alert("🏨 Global Hotel Booking saved!");
e.target.reset();
loadHotels();
loadAgentData(currentAgentId);
loadPnL();
}
} catch (err) {
alert("Cloud connection timed out: " + err.message);
} finally {
btn.disabled = false;
}
}
async function loadVisas() {
try {
const res = await fetch(${API_BASE_URL}/api/visas);
const visas = await res.json();
const tbody = document.getElementById('visaTableBody');
if (!tbody) return;
if (visas.length === 0) {
tbody.innerHTML = 'No visa bookings recorded yet.';
return;
}
tbody.innerHTML = visas.map(v => {
const paid = v.amount_paid !== null ? parseFloat(v.amount_paid) : parseFloat(v.selling_price);
const due = parseFloat(v.selling_price) - paid;
const dueBadge = due > 0 ? <span class="block text-[10px] font-bold text-red-600">Due: BDT ${due.toLocaleString()}</span> : <span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>;
const payBtn = due > 0 ? <button onclick="collectPayment('visa', ${v.visa_booking_id}, ${paid}, ${v.selling_price})" class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-bold">💵 Pay</button> : '';
return `
${v.country}${v.visa_type}
${v.customer_name || 'ID #' + v.customer_id}${v.tracking_status || 'Submitted'}• BDT \(parseFloat(v.margin_{e}arned).toLocaleString()\){dueBadge}
${payBtn}`;
}).join('');
} catch (err) {
console.error("Error loading visas:", err);
}
}
async function editVisa(id, oldCountry, oldType, oldStatus, oldCost, oldPrice) {
const country = prompt("Update Destination Country:", oldCountry);
if (!country) return;
const visaType = prompt("Update Visa Subcategory:", oldType);
if (!visaType) return;
const trackingStatus = prompt("Update Tracking Status (e.g. Submitted, Approved, Delivered):", oldStatus);
const supplierCost = prompt("Update Net Cost (BDT):", oldCost);
const sellingPrice = prompt("Update Selling Price (BDT):", oldPrice);
try {
const res = await fetch(${API_BASE_URL}/api/visa/update/${id}, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ country, visaType, trackingStatus, supplierCost, sellingPrice })
});
const result = await res.json();
if (result.success) {
alert("✅ Visa booking updated & commission recalculated!");
loadVisas();
loadAgentData(currentAgentId);
loadPnL();
}
} catch (err) {
alert("Update failed: " + err.message);
}
}
async function loadTickets() {
try {
const res = await fetch(${API_BASE_URL}/api/tickets);
const tickets = await res.json();
const tbody = document.getElementById('ticketTableBody');
if (!tbody) return;
if (tickets.length === 0) {
tbody.innerHTML = 'No flight tickets logged yet.';
return;
}
tbody.innerHTML = tickets.map(t => {
const paid = t.amount_paid !== null ? parseFloat(t.amount_paid) : parseFloat(t.selling_price);
const due = parseFloat(t.selling_price) - paid;
const dueBadge = due > 0 ? <span class="block text-[10px] font-bold text-red-600">Due: BDT ${due.toLocaleString()}</span> : <span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>;
const payBtn = due > 0 ? <button onclick="collectPayment('ticket', ${t.ticket_id}, ${paid}, ${t.selling_price})" class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-bold">💵 Pay</button> : '';
return `
${t.gds_pnr}${t.route}
${t.customer_name || 'ID #' + t.customer_id}${t.airline_code}• BDT \(parseFloat(t.margin_{e}arned).toLocaleString()\){dueBadge}
${payBtn}`;
}).join('');
} catch (err) {
console.error("Error loading tickets:", err);
}
}
async function editTicket(id, oldPnr, oldAirline, oldRoute, oldCost, oldPrice) {
const gdsPnr = prompt("Update GDS PNR Code:", oldPnr);
if (!gdsPnr) return;
const airlineCode = prompt("Update Airline Code (e.g. BG, EK):", oldAirline);
if (!airlineCode) return;
const route = prompt("Update Flight Route (e.g. DAC-DXB):", oldRoute);
const supplierCost = prompt("Update Net Cost (BDT):", oldCost);
const sellingPrice = prompt("Update Selling Price (BDT):", oldPrice);
try {
const res = await fetch(${API_BASE_URL}/api/ticket/update/${id}, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ gdsPnr, airlineCode, route, supplierCost, sellingPrice })
});
const result = await res.json();
if (result.success) {
alert("✅ Flight ticket updated & commission recalculated!");
loadTickets();
loadAgentData(currentAgentId);
loadPnL();
}
} catch (err) {
alert("Update failed: " + err.message);
}
}
async function loadPackages() {
try {
const res = await fetch(${API_BASE_URL}/api/packages);
const packages = await res.json();
const tbody = document.getElementById('packageTableBody');
if (!tbody) return;
if (packages.length === 0) {
tbody.innerHTML = 'No tour or Hajj/Umrah packages created yet.';
return;
}
tbody.innerHTML = packages.map(p => {
const depDate = new Date(p.departure_date).toLocaleDateString('en-GB');
const paid = p.amount_paid !== null ? parseFloat(p.amount_paid) : parseFloat(p.selling_price);
const due = parseFloat(p.selling_price) - paid;
const dueBadge = due > 0 ? <span class="block text-[10px] font-bold text-red-600">Due: BDT ${due.toLocaleString()}</span> : <span class="block text-[10px] font-bold text-emerald-600">✓ Full Paid</span>;
const payBtn = due > 0 ? <button onclick="collectPayment('package', ${p.package_id}, ${paid}, ${p.selling_price})" class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-bold">💵 Pay</button> : '';
return `
${p.customer_name || 'ID #' + p.customer_id}\({p.travelers_count} Pax</span><br>\){depDate}• BDT \(parseFloat(p.margin_{e}arned).toLocaleString()\){dueBadge}
${payBtn}`;
}).join('');
} catch (err) {
console.error("Error loading packages:", err);
}
}
async function editPackage(id, oldName, oldDest, oldPax, oldServices, oldCost, oldPrice) {
const packageName = prompt("Update Package Title:", oldName);
if (!packageName) return;
const destination = prompt("Update Destination(s):", oldDest);
const travelersCount = prompt("Update Total Travelers (Pax):", oldPax);
const includedServices = prompt("Update Included Services:", oldServices);
const supplierCost = prompt("Update Total Net Cost (BDT):", oldCost);
const sellingPrice = prompt("Update Client Package Price (BDT):", oldPrice);
try {
const res = await fetch(${API_BASE_URL}/api/package/update/${id}, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ packageName, destination, travelersCount, includedServices, supplierCost, sellingPrice })
});
const result = await res.json();
if (result.success) {
alert("✅ Package updated & commission recalculated!");
loadPackages();
loadAgentData(currentAgentId);
loadPnL();
}
} catch (err) {
alert("Update failed: " + err.message);
}
}
async function submitPackage(e) {
e.preventDefault();
const btn = e.target.querySelector('button[type="submit"]');
btn.disabled = true;
const payload = {
customerId: parseInt(document.getElementById('pkgCustId').value),
employeeId: currentAgentId,
packageName: document.getElementById('pkgName').value,
category: document.getElementById('pkgCategory').value,
destination: document.getElementById('pkgDest').value,
travelersCount: parseInt(document.getElementById('pkgPax').value),
departureDate: document.getElementById('pkgDate').value,
includedServices: document.getElementById('pkgServices').value,
supplierCost: parseFloat(document.getElementById('pkgCost').value),
sellingPrice: parseFloat(document.getElementById('pkgPrice').value),
amountPaid: document.getElementById('pkgPaid').value
};
try {
const res = await fetch(${API_BASE_URL}/api/package/submit, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
const result = await res.json();
if (result && result.success) {
alert("📦 Package saved & commission updated!");
e.target.reset();
loadPackages();
loadAgentData(currentAgentId);
loadPnL();
}
} catch (err) {
alert("Cloud connection timed out: " + err.message);
} finally {
btn.disabled = false;
}
}
async function collectPayment(type, id, currentPaid, totalSelling) {
const addAmount = prompt(Total Bill: BDT ${totalSelling}\nAlready Paid: BDT ${currentPaid}\nRemaining Due: BDT ${totalSelling - currentPaid}\n\nEnter new payment received (BDT):);
if (!addAmount || isNaN(addAmount)) return;
const newPaidAmount = parseFloat(currentPaid) + parseFloat(addAmount);
try {
const res = await fetch(${API_BASE_URL}/api/payment/collect, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ type, id, newPaidAmount })
});
const result = await res.json();
if (result.success) {
alert(✅ Payment of BDT ${parseFloat(addAmount).toLocaleString()} recorded!);
loadVisas();
loadTickets();
loadHotels();
loadPackages();
}
} catch (err) {
alert("Payment update failed: " + err.message);
}
}
function openInvoice(invId, clientName, title, subDetails, sellingPrice, paidAmount) {
const total = parseFloat(sellingPrice);
const paid = paidAmount !== undefined && paidAmount !== null ? parseFloat(paidAmount) : total;
const due = Math.max(0, total - paid);
document.getElementById('invNumber').innerText = 'INV-' + invId;
document.getElementById('invDate').innerText = 'Date: ' + new Date().toLocaleDateString('en-GB');
document.getElementById('invClient').innerText = clientName;
document.getElementById('invAgent').innerText = document.getElementById('agentName')?.innerText || 'Travel Consultant';
document.getElementById('invServiceTitle').innerText = title;
document.getElementById('invServiceSub').innerText = subDetails;
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
const receiptHTML = document.getElementById('printableReceipt').innerHTML;
const printWindow = window.open('', '', 'width=700,height=800');
printWindow.document.write(<html> <head> <title>Webbo Travel Receipt</title> <script src="https://tailwindcss.com"><\/script> </head> <body class="p-8 bg-white text-slate-800 font-sans"> <div class="max-w-lg mx-auto border border-slate-300 rounded-2xl p-6 space-y-6"> ${receiptHTML} </div> <script> setTimeout(() => { window.print(); window.close(); }, 500); <\/script> </body> </html>);
printWindow.document.close();
}
async function loadPnL() {
try {
const res = await fetch(${API_BASE_URL}/api/pnl);
const data = await res.json();
if (data && data.grossProfit !== undefined) {
document.getElementById('pnlGross').innerText = 'BDT ' + data.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 });
document.getElementById('pnlExpenses').innerText = 'BDT ' + data.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 });
document.getElementById('pnlNet').innerText = 'BDT ' + data.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
} catch (err) {
console.error("Error loading P&L:", err);
}
}
async function loadExpenses() {
try {
const res = await fetch(${API_BASE_URL}/api/expenses);
const expenses = await res.json();
const tbody = document.getElementById('expenseTableBody');
if (!tbody) return;
if (expenses.length === 0) {
tbody.innerHTML = 'No office expenses recorded yet.';
return;
}
tbody.innerHTML = expenses.map(e => {
const expDate = new Date(e.expense_date).toLocaleDateString('en-GB');
return `
${e.description}${e.category}
${expDate}• BDT ${parseFloat(e.amount).toLocaleString()}
`;
}).join('');
} catch (err) {
console.error("Error loading expenses:", err);
}
}
async function editExpense(id, oldCat, oldDesc, oldAmt) {
const category = prompt("Update Category:", oldCat);
if (!category) return;
const description = prompt("Update Description:", oldDesc);
if (!description) return;
const amount = prompt("Update Amount (BDT):", oldAmt);
try {
const res = await fetch(${API_BASE_URL}/api/expense/update/${id}, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ category, description, amount })
});
const result = await res.json();
if (result.success) {
alert("✅ Expense updated & P&L recalculated!");
loadExpenses();
loadPnL();
}
} catch (err) {
alert("Update failed: " + err.message);
}
}
async function submitExpense(e) {
e.preventDefault();
const btn = e.target.querySelector('button[type="submit"]');
btn.disabled = true;
const payload = {
category: document.getElementById('expCategory').value,
description: document.getElementById('expDesc').value,
amount: parseFloat(document.getElementById('expAmount').value),
expenseDate: document.getElementById('expDate').value,
loggedBy: currentAgentId
};
try {
const res = await fetch(${API_BASE_URL}/api/expense/submit, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
const result = await res.json();
if (result && result.success) {
alert("🧾 Office expense logged & Net Profit updated!");
e.target.reset();
loadExpenses();
loadPnL();
}
} catch (err) {
alert("Cloud connection timed out: " + err.message);
} finally {
btn.disabled = false;
}
}
function initProtectedDashboard(agentId) {
document.getElementById('loginOverlay').classList.add('hidden');
loadAgentData(agentId);
loadCustomers();
loadHotels();
loadVisas();
loadTickets();
loadPackages();
loadExpenses();
loadPnL();
}
async function handleLogin(e) {
e.preventDefault();
const btn = e.target.querySelector('button[type="submit"]');
const errBox = document.getElementById('loginError');
btn.disabled = true;
btn.innerText = "Verifying Credentials...";
errBox.classList.add('hidden');
const email = document.getElementById('loginEmail').value;
const password = document.getElementById('loginPassword').value;
try {
const res = await fetch(${API_BASE_URL}/api/login, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email, password })
});
const data = await res.json();
if (data.success && data.user) {
localStorage.setItem('webboStaffSession', JSON.stringify(data.user));
initProtectedDashboard(data.user.employee_id);
} else {
errBox.innerText = data.error || "Incorrect email or password.";
errBox.classList.remove('hidden');
}
} catch (err) {
errBox.innerText = "Server waking up from sleep. Wait 30 seconds and click Unlock again.";
errBox.classList.remove('hidden');
} finally {
btn.disabled = false;
btn.innerText = "🔐 Unlock ERP Workspace";
}
}
function logoutUser() {
localStorage.removeItem('webboStaffSession');
document.getElementById('loginOverlay').classList.remove('hidden');
document.getElementById('loginForm').reset();
}
const savedSession = localStorage.getItem('webboStaffSession');
if (savedSession) {
const user = JSON.parse(savedSession);
initProtectedDashboard(user.employee_id || 1);
}
