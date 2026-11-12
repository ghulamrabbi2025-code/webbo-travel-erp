const API_BASE_URL = "https://webbo-travel-erp-backend.onrender.com";
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
        sellingPrice: parseFloat(document.getElementById('visaPrice').value)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/visa/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
            alert("💾 Visa record saved successfully to Neon Cloud Database!");
            loadAgentData(currentAgentId);
        }
    } catch (err) {
        alert("Cloud transmission timed out. Wait 30 seconds if Render is waking up from sleep.");
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
        sellingPrice: parseFloat(document.getElementById('ticketPrice').value)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/ticket/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
            alert("💾 Ticket PNR logged successfully to Neon Cloud Database!");
            loadAgentData(currentAgentId);
        }
    } catch (err) {
        alert("Cloud transmission timed out. Wait 30 seconds if Render is waking up from sleep.");
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
        alert("Update failed.");
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
        alert("Error details: " + err.message);
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
            return `
                <tr class="hover:bg-slate-50">
                    <td class="p-3"><div class="font-bold text-slate-800">${h.hotel_name}</div><div class="text-[10px] text-indigo-600 font-bold">${h.city} • ${h.room_type}</div></td>
                    <td class="p-3 text-slate-600">${h.customer_name || 'ID #' + h.customer_id}</td>
                    <td class="p-3 text-[11px] text-slate-500">${inDate} - ${outDate}</td>
                    <td class="p-3 font-mono font-bold text-emerald-700">+ BDT ${parseFloat(h.margin_earned).toLocaleString()}</td>
                                  <td class="p-3 text-right space-x-1">
                   <button onclick="openInvoice('HTL-' + ${h.hotel_booking_id}, '${h.customer_name || 'Client #' + h.customer_id}', '${h.hotel_name} (${h.city})', 'Room: ${h.room_type} | ${inDate} to ${outDate}', ${h.selling_price})" class="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold">🖨️ Invoice</button>
                   <button onclick="editHotel(${h.hotel_booking_id}, '${h.city}', '${h.hotel_name}', '${h.room_type}', ${h.supplier_cost}, ${h.selling_price})" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
               </td>

                </tr>
            `;
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
        const res = await fetch(`${API_BASE_URL}/api/hotel/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, hotelName, roomType, supplierCost, sellingPrice })
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ Hotel booking updated & commission recalculated!");
            loadHotels();
            loadAgentData(currentAgentId);
        }
    } catch (err) {
        alert("Update failed.");
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
        sellingPrice: parseFloat(document.getElementById('hotelPrice').value)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/hotel/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
            alert("🏨 Global Hotel Booking saved & commission updated!");
            e.target.reset();
            loadHotels();
            loadAgentData(currentAgentId);
        }
    } catch (err) {
        alert("Error details: " + err.message);
    } finally {
        btn.disabled = false;
    }
}
async function loadVisas() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/visas`);
        const visas = await res.json();
        const tbody = document.getElementById('visaTableBody');
        if (!tbody) return;

        if (visas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">No visa bookings recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = visas.map(v => `
            <tr class="hover:bg-slate-50">
                <td class="p-3"><div class="font-bold text-slate-800">${v.country}</div><div class="text-[10px] text-emerald-600 font-bold">${v.visa_type}</div></td>
                <td class="p-3 text-slate-600">${v.customer_name || 'ID #' + v.customer_id}</td>
                <td class="p-3"><span class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold">${v.tracking_status || 'Submitted'}</span></td>
                <td class="p-3 font-mono font-bold text-emerald-700">+ BDT ${parseFloat(v.margin_earned).toLocaleString()}</td>
           <td class="p-3 text-right space-x-1">
               <button onclick="openInvoice('VIS-' + ${v.visa_booking_id}, '${v.customer_name || 'Client #' + v.customer_id}', '${v.country} Visa (${v.visa_type})', 'Status: ${v.tracking_status || 'Submitted'}', ${v.selling_price})" class="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold">🖨️ Invoice</button>
               <button onclick="editVisa(${v.visa_booking_id}, '${v.country}', '${v.visa_type}', '${v.tracking_status || 'Submitted'}', ${v.supplier_cost}, ${v.selling_price})" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
           </td>
            </tr>
        `).join('');
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
        const res = await fetch(`${API_BASE_URL}/api/visa/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country, visaType, trackingStatus, supplierCost, sellingPrice })
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ Visa booking updated & commission recalculated!");
            loadVisas();
            loadAgentData(currentAgentId);
        }
    } catch (err) {
        alert("Update failed: " + err.message);
    }
}

async function loadTickets() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/tickets`);
        const tickets = await res.json();
        const tbody = document.getElementById('ticketTableBody');
        if (!tbody) return;

        if (tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">No flight tickets logged yet.</td></tr>';
            return;
        }

        tbody.innerHTML = tickets.map(t => `
            <tr class="hover:bg-slate-50">
                <td class="p-3"><div class="font-mono font-bold text-blue-700">${t.gds_pnr}</div><div class="text-[10px] text-slate-500 font-bold">${t.route}</div></td>
                <td class="p-3 text-slate-600">${t.customer_name || 'ID #' + t.customer_id}</td>
                <td class="p-3 font-bold text-slate-700">${t.airline_code}</td>
                <td class="p-3 font-mono font-bold text-emerald-700">+ BDT ${parseFloat(t.margin_earned).toLocaleString()}</td>
                           <td class="p-3 text-right space-x-1">
               <button onclick="openInvoice('TKT-' + ${t.ticket_id}, '${t.customer_name || 'Client #' + t.customer_id}', 'Air Ticket (${t.airline_code}) - PNR: ${t.gds_pnr}', 'Routing: ${t.route}', ${t.selling_price})" class="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold">🖨️ Invoice</button>
               <button onclick="editTicket(${t.ticket_id}, '${t.gds_pnr}', '${t.airline_code}', '${t.route}', ${t.supplier_cost}, ${t.selling_price})" class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
           </td>
            </tr>
        `).join('');
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
        const res = await fetch(`${API_BASE_URL}/api/ticket/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gdsPnr, airlineCode, route, supplierCost, sellingPrice })
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ Flight ticket updated & commission recalculated!");
            loadTickets();
            loadAgentData(currentAgentId);
        }
    } catch (err) {
        alert("Update failed: " + err.message);
    }
}

async function loadPackages() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/packages`);
        const packages = await res.json();
        const tbody = document.getElementById('packageTableBody');
        if (!tbody) return;

        if (packages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">No tour or Hajj/Umrah packages created yet.</td></tr>';
            return;
        }

        tbody.innerHTML = packages.map(p => {
            const depDate = new Date(p.departure_date).toLocaleDateString('en-GB');
            return `
                <tr class="hover:bg-slate-50">
                    <td class="p-3">
                        <div class="font-bold text-slate-800">${p.package_name} <span class="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">${p.category}</span></div>
                        <div class="text-[10px] text-slate-500 mt-0.5">${p.destination} • ${p.included_services}</div>
                    </td>
                    <td class="p-3 text-slate-600">${p.customer_name || 'ID #' + p.customer_id}</td>
                    <td class="p-3 text-[11px] text-slate-600"><span class="font-bold">${p.travelers_count} Pax</span><br>${depDate}</td>
                    <td class="p-3 font-mono font-bold text-emerald-700">+ BDT ${parseFloat(p.margin_earned).toLocaleString()}</td>
                               <td class="p-3 text-right space-x-1">
                   <button onclick="openInvoice('PKG-' + ${p.package_id}, '${p.customer_name || 'Client #' + p.customer_id}', '${p.package_name} (${p.category})', '${p.destination} • ${p.travelers_count} Pax • ${p.included_services}', ${p.selling_price})" class="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold">🖨️ Invoice</button>
                   <button onclick="editPackage(${p.package_id}, '${p.package_name}', '${p.destination}', ${p.travelers_count}, '${p.included_services}', ${p.supplier_cost}, ${p.selling_price})" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
               </td>

                </tr>
            `;
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
        const res = await fetch(`${API_BASE_URL}/api/package/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageName, destination, travelersCount, includedServices, supplierCost, sellingPrice })
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ Package updated & commission recalculated!");
            loadPackages();
            loadAgentData(currentAgentId);
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
        sellingPrice: parseFloat(document.getElementById('pkgPrice').value)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/package/submit`, {
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
        }
    } catch (err) {
        alert("Cloud connection timed out: " + err.message);
    } finally {
        btn.disabled = false;
    }
}
function openInvoice(invId, clientName, title, subDetails, sellingPrice) {
    const formattedAmount = 'BDT ' + parseFloat(sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const today = new Date().toLocaleDateString('en-GB');
    const activeAgent = document.getElementById('agentName')?.innerText || 'Travel Consultant';

    document.getElementById('invNumber').innerText = 'INV-' + invId;
    document.getElementById('invDate').innerText = 'Date: ' + today;
    document.getElementById('invClient').innerText = clientName;
    document.getElementById('invAgent').innerText = activeAgent;
    document.getElementById('invServiceTitle').innerText = title;
    document.getElementById('invServiceSub').innerText = subDetails;
    document.getElementById('invAmount').innerText = formattedAmount;
    document.getElementById('invTotal').innerText = formattedAmount;

    document.getElementById('invoiceModal').classList.remove('hidden');
}

function closeInvoice() {
    document.getElementById('invoiceModal').classList.add('hidden');
}

function printInvoice() {
    const receiptHTML = document.getElementById('printableReceipt').innerHTML;
    const printWindow = window.open('', '', 'width=700,height=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Webbo Travel Receipt</title>
            <script src="https://tailwindcss.com"><\/script>
        </head>
        <body class="p-8 bg-white text-slate-800 font-sans">
            <div class="max-w-lg mx-auto border border-slate-300 rounded-2xl p-6 space-y-6">
                ${receiptHTML}
            </div>
            <script>
                setTimeout(() => { window.print(); window.close(); }, 500);
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
function initProtectedDashboard(agentId) {
    document.getElementById('loginOverlay').classList.add('hidden');
    loadAgentData(agentId);
    loadCustomers();
    loadHotels();
    loadVisas();
    loadTickets();
    loadPackages();
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
        const res = await fetch(`${API_BASE_URL}/api/login`, {
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

// Check if staff member is already logged in
const savedSession = localStorage.getItem('webboStaffSession');
if (savedSession) {
    const user = JSON.parse(savedSession);
    initProtectedDashboard(user.employee_id || 1);
}
