document.addEventListener('DOMContentLoaded', function () {
    const recentActivitiesBody = document.getElementById('recent-activities');
    let vehicleDataMap = {}; // Stores all registered/searchable vehicles by vehicleId
    let currentVehicleId = null;

    // Register form submission
    document.getElementById('register-form').addEventListener('submit', function (event) {
        event.preventDefault();

        const registrationNumber = document.getElementById('registrationNumber').value;
        const make = document.getElementById('make').value;
        const model = document.getElementById('model').value;
        const ownerName = document.getElementById('ownerName').value;
        const vehicleId = 'VH' + Math.floor(100000 + Math.random() * 900000);
        const date = new Date().toLocaleDateString('en-GB');

        vehicleDataMap[vehicleId] = {
            vehicleId, regNo: registrationNumber, make, model, owner: ownerName,
            year: '2022', color: 'Silver', chassis: 'MRHBM12345', engine: 'ENGP87654',
            regDate: date, aadhar: '1234-5678-9012', insuranceStatus: 'Valid',
            insuranceExpiry: '31-Dec-2025', pollutionStatus: 'Valid',
            pollutionExpiry: '30-Jun-2025', history: [
                { date, txId: 'TX' + Math.floor(1000 + Math.random() * 9000), event: 'Vehicle Registration' }
            ]
        };

        document.getElementById('registrationPopup').textContent = `Vehicle with Registration Number ${registrationNumber} Registered Successfully!`;
        document.getElementById('registrationPopup').classList.add('show');
        setTimeout(() => document.getElementById('registrationPopup').classList.remove('show'), 3000);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicleId}</td>
            <td>${registrationNumber}</td>
            <td>Registration</td>
            <td>${date}</td>
            <td><button class="btn btn-sm btn-primary view-details" data-id="${vehicleId}">View Details</button></td>
        `;
        recentActivitiesBody.prepend(row);
        this.reset();
    });

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const pageId = this.getAttribute('data-page') + '-page';
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        });
    });

    // Tab handling
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Search form functionality
    document.getElementById('search-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const searchValue = document.getElementById('searchValue').value.trim().toLowerCase();
        const resultsBody = document.getElementById('search-results-body');
        resultsBody.innerHTML = '';

        let found = false;
        for (let id in vehicleDataMap) {
            const data = vehicleDataMap[id];
            if (data.regNo.toLowerCase() === searchValue || data.vehicleId.toLowerCase() === searchValue) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${data.vehicleId}</td>
                    <td>${data.regNo}</td>
                    <td>${data.make} ${data.model}</td>
                    <td>${data.owner}</td>
                    <td><span class="badge badge-success">Active</span></td>
                    <td><button class="btn btn-sm btn-primary view-details" data-id="${data.vehicleId}">View Details</button></td>
                `;
                resultsBody.appendChild(row);
                found = true;
            }
        }

        document.getElementById('search-results').style.display = 'block';
        if (!found) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" class="text-center text-danger">No vehicle found</td>`;
            resultsBody.appendChild(row);
        }
    });

    // View Details - Global Delegation
    document.body.addEventListener('click', function (event) {
        if (event.target.classList.contains('view-details')) {
            const vehicleId = event.target.getAttribute('data-id');
            if (vehicleId) {
                viewVehicleDetails(vehicleId);
            }
        }
    });

    function viewVehicleDetails(vehicleId) {
        currentVehicleId = vehicleId;
        const data = vehicleDataMap[vehicleId];
        if (!data) return;

        document.getElementById('search-page').classList.remove('active');
        document.getElementById('vehicle-details-page').classList.add('active');

        document.getElementById('details-vehicle-id').textContent = `Vehicle ID: ${data.vehicleId}`;
        document.getElementById('details-status-badge').textContent = 'Active';
        document.getElementById('details-status-badge').className = 'badge badge-success';
        document.getElementById('details-reg-number').textContent = data.regNo;
        document.getElementById('details-make').textContent = data.make;
        document.getElementById('details-model').textContent = data.model;
        document.getElementById('details-year').textContent = data.year;
        document.getElementById('details-color').textContent = data.color;
        document.getElementById('details-chassis').textContent = data.chassis;
        document.getElementById('details-engine').textContent = data.engine;
        document.getElementById('details-reg-date').textContent = data.regDate;
        document.getElementById('details-owner-name').textContent = data.owner;
        document.getElementById('details-owner-aadhar').textContent = data.aadhar;
        document.getElementById('details-insurance-status').textContent = data.insuranceStatus;
        document.getElementById('details-insurance-status').className = `badge badge-${data.insuranceStatus === 'Valid' ? 'success' : 'danger'}`;
        document.getElementById('details-insurance-expiry').textContent = data.insuranceExpiry;
        document.getElementById('details-pollution-status').textContent = data.pollutionStatus;
        document.getElementById('details-pollution-status').className = `badge badge-${data.pollutionStatus === 'Valid' ? 'success' : 'danger'}`;
        document.getElementById('details-pollution-expiry').textContent = data.pollutionExpiry;

        const historyBody = document.getElementById('history-table-body');
        historyBody.innerHTML = '';
        data.history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.date}</td><td>${item.txId}</td><td>${item.event}</td>`;
            historyBody.appendChild(row);
        });
    }

    // Ownership transfer
    document.getElementById('transfer-ownership-btn').addEventListener('click', () => {
        document.getElementById('transfer-modal').style.display = 'block';
    });
    document.getElementById('close-transfer-modal').addEventListener('click', () => {
        document.getElementById('transfer-modal').style.display = 'none';
    });
    document.getElementById('transfer-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const newOwner = document.getElementById('newOwnerName').value;
        if (currentVehicleId && vehicleDataMap[currentVehicleId]) {
            vehicleDataMap[currentVehicleId].owner = newOwner;
            vehicleDataMap[currentVehicleId].history.push({
                date: new Date().toLocaleDateString('en-GB'),
                txId: 'TX' + Math.floor(1000 + Math.random() * 9000),
                event: 'Ownership Transfer'
            });
            viewVehicleDetails(currentVehicleId);
            document.getElementById('registrationPopup').textContent = `Ownership transferred to ${newOwner} successfully!`;
            document.getElementById('registrationPopup').classList.add('show');
            setTimeout(() => document.getElementById('registrationPopup').classList.remove('show'), 3000);
        }
        document.getElementById('transfer-modal').style.display = 'none';
    });

    // Certificate updates
    document.getElementById('update-certificates-btn').addEventListener('click', () => {
        document.getElementById('update-certificates-modal').style.display = 'block';
    });
    document.getElementById('close-update-certificates-modal').addEventListener('click', () => {
        document.getElementById('update-certificates-modal').style.display = 'none';
    });
    document.getElementById('update-certificates-form').addEventListener('submit', function (event) {
        event.preventDefault();
        if (currentVehicleId && vehicleDataMap[currentVehicleId]) {
            const insuranceStatus = document.getElementById('updateInsuranceStatus').value;
            const pollutionStatus = document.getElementById('updatePollutionCertificate').value;
            const insuranceExpiry = document.getElementById('updateInsuranceExpiry').value;
            const pollutionExpiry = document.getElementById('updatePollutionExpiry').value;

            const vehicle = vehicleDataMap[currentVehicleId];
            vehicle.insuranceStatus = insuranceStatus;
            vehicle.pollutionStatus = pollutionStatus;
            vehicle.insuranceExpiry = insuranceExpiry;
            vehicle.pollutionExpiry = pollutionExpiry;
            vehicle.history.push({
                date: new Date().toLocaleDateString('en-GB'),
                txId: 'TX' + Math.floor(1000 + Math.random() * 9000),
                event: 'Certificate Update'
            });

            viewVehicleDetails(currentVehicleId);

            document.getElementById('registrationPopup').textContent = 'Certificates updated successfully!';
            document.getElementById('registrationPopup').classList.add('show');
            setTimeout(() => document.getElementById('registrationPopup').classList.remove('show'), 3000);
        }
        document.getElementById('update-certificates-modal').style.display = 'none';
    });

    // Back button
    document.getElementById('back-to-search').addEventListener('click', function () {
        document.getElementById('vehicle-details-page').classList.remove('active');
        document.getElementById('search-page').classList.add('active');
    });

    // Set active page at load
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.classList.contains('active')) {
            const pageId = link.getAttribute('data-page') + '-page';
            document.getElementById(pageId).classList.add('active');
        }
    });
});
