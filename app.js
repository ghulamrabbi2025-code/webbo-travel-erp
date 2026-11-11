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
                    <td class="p-3 text-right">
                        <button onclick="editHotel(${h.hotel_booking_id}, '${h.city}', '${h.hotel_name}', '${h.room_type}', ${h.supplier_cost}, ${h.selling_price})" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold">✏️ Edit</button>
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

loadAgentData(1);
loadCustomers();
loadHotels();
