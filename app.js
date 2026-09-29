let scrollYPosition = 0;

document.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT') {
        scrollYPosition = window.scrollY;
        setTimeout(() => {
            window.scrollTo(0, scrollYPosition);
        }, 0);
    }
}, true);

Element.prototype.scrollIntoView = function() {};

// PWA Install Prompt Handler
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
            document.getElementById('installBtn').style.display = 'none';
        });
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=1', { scope: './' })
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.log('Service Worker Registration Failed:', err));
    });
}

// AUTOMATIC DEVICE IDENTIFIER SYSTEM
function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem("miki_device_id");
    if (!deviceId) {
        deviceId = "DEV-" + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem("miki_device_id", deviceId);
    }
    return deviceId;
}

const MY_DEVICE_ID = getOrCreateDeviceId();

let activeRow = 1;
let currentFileOwner = "";
let isReadOnlyMode = false;

let tapCount = 0;
let tapTimer = null;
let isLocked = true;

let priceTapCount = 0;
let priceTapTimer = null;
let isPriceLocked = true;

function renderLedgerTableRows() {
    const tbody = document.getElementById("ledgerTableBody");
    if (!tbody) return;
    
    let html = "";
    for (let i = 1; i <= 16; i++) {
        html += `
            <tr>
                <td><input type="text" class="name-input" id="ledgerName_${i}" oninput="updateActiveCustomerName(${i}); saveLedger();" onfocus="loadRowToMain(${i})" readonly style="background-color: #e5e7eb;"></td>
                <td><input type="text" class="readonly-col" id="ledgerDry_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                <td><input type="text" class="readonly-col" id="ledgerFresh_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                <td><input type="text" class="readonly-col" id="ledgerCab_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                <td><input type="text" class="readonly-col" id="ledgerBo_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                <td><input type="text" class="readonly-col" id="ledgerBal_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                <td><input type="text" class="readonly-col amount" id="ledgerBilling_${i}" readonly></td>
                <td><input type="text" class="readonly-col colln-input" id="ledgerPay_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                <td><input type="text" class="readonly-col amount" id="ledgerRem_${i}" readonly></td>
            </tr>
        `;
    }
    html += `
        <tr>
            <td class="miki" style="color: #dc2626; font-size: 9px; padding: 0 1px;">NET TOTAL</td>
            <td class="net-total-red" id="totalDry"></td>
            <td class="net-total-red" id="totalFresh"></td>
            <td class="net-total-red" id="totalCab"></td>
            <td class="net-total-red" id="totalBo"></td>
            <td class="net-total-red" id="totalBal"></td>
            <td class="net-total-red" id="totalBilling"></td>
            <td class="net-total-red" id="totalColln"></td>
            <td class="net-total-red" id="totalRem"></td>
        </tr>
    `;
    tbody.innerHTML = html;
}

function handleKeyClick() {
    if (isReadOnlyMode) return;
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 1000);

    if (tapCount >= 5) {
        tapCount = 0;
        isLocked = !isLocked;
        toggleLockState(isLocked);
    }
}

function toggleLockState(locked) {
    const header = document.getElementById("lockHeader");
    if (header) header.textContent = locked ? "🔒" : "🔑";

    const nameInputs = document.querySelectorAll(".name-input");
    nameInputs.forEach(field => {
        field.readOnly = locked || isReadOnlyMode;
        field.style.backgroundColor = (locked || isReadOnlyMode) ? "#e5e7eb" : "white";
    });
}

function handlePriceKeyClick() {
    if (isReadOnlyMode) return;
    priceTapCount++;
    clearTimeout(priceTapTimer);
    priceTapTimer = setTimeout(() => { priceTapCount = 0; }, 1000);

    if (priceTapCount >= 5) {
        priceTapCount = 0;
        isPriceLocked = !isPriceLocked;
        togglePriceLockState(isPriceLocked);
    }
}

function togglePriceLockState(locked) {
    const header = document.getElementById("priceLockHeader");
    if (header) header.textContent = locked ? "Price 🔒" : "Price 🔑";

    const priceInputs = document.querySelectorAll(".price-input");
    priceInputs.forEach(field => {
        field.readOnly = locked || isReadOnlyMode;
        field.style.backgroundColor = (locked || isReadOnlyMode) ? "#e5e7eb" : "white";
    });
}

function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const val = parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

function formatMoney(value) {
    if (value === null || value === undefined) return "";
    return Math.round(value).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function updateActiveCustomerName(row) {
    if (row === activeRow) {
        const nameVal = document.getElementById(`ledgerName_${row}`).value.trim();
        const displayBox = document.getElementById("activeCustomerDisplay");
        displayBox.textContent = nameVal !== "" ? nameVal : `Row ${row}`;
    }
}

function syncFromPanel(type) {
    if (isReadOnlyMode) return;
    const val = document.getElementById("sync" + type).value;
    const targetId = type === "Dry" ? "qtyReg" : "qty" + type;
    document.getElementById(targetId).value = val;
    calculateMain();
}

function syncFromTable(type) {
    if (isReadOnlyMode) return;
    const targetId = type === "Reg" ? "syncDry" : "sync" + type;
    const val = document.getElementById("qty" + type).value;
    const syncInput = document.getElementById(targetId);
    if (syncInput) {
        syncInput.value = val;
    }
    calculateMain();
}

function clearMainInputs() {
    if (isReadOnlyMode) return;
    document.getElementById("qtyReg").value = "";
    document.getElementById("syncDry").value = "";
    document.getElementById("qtyFresh").value = "";
    document.getElementById("syncFresh").value = "";
    document.getElementById("qtyCab").value = "";
    document.getElementById("syncCab").value = "";
    document.getElementById("qtyBo").value = "";
    document.getElementById("syncBo").value = "";
    document.getElementById("inputBal").value = "";
    document.getElementById("inputPay").value = "";
    calculateMain();
}

function calculateMain() {
    const regQtyRaw = document.getElementById("qtyReg").value.trim();
    const freshQtyRaw = document.getElementById("qtyFresh").value.trim();
    const cabQtyRaw = document.getElementById("qtyCab").value.trim();
    const boQtyRaw = document.getElementById("qtyBo").value.trim();
    const balRaw = document.getElementById("inputBal").value.trim();
    const payRaw = document.getElementById("inputPay").value.trim();

    const isAllEmpty = !regQtyRaw && !freshQtyRaw && !cabQtyRaw && !boQtyRaw && !balRaw && !payRaw;

    const regQty = getVal("qtyReg");
    const regPrice = getVal("priceReg");
    const regAmount = Math.round(regQty * regPrice);

    const freshQty = getVal("qtyFresh");
    const freshPrice = getVal("priceFresh");
    const freshAmount = Math.round(freshQty * freshPrice);

    const cabQty = getVal("qtyCab");
    const cabPrice = getVal("priceCab");
    const cabAmount = Math.round(cabQty * cabPrice);

    const boQty = getVal("qtyBo");
    const boPrice = getVal("priceBo");
    const boAmount = Math.round((boQty / 2) * boPrice);

    const balAmount = Math.round(getVal("inputBal"));
    const payAmount = Math.round(getVal("inputPay"));

    const total = regAmount + freshAmount + cabAmount - boAmount;
    const billingAmount = total + balAmount;
    const netTotal = billingAmount - payAmount;

    document.getElementById("amountReg").textContent = regQtyRaw ? formatMoney(regAmount) : "";
    document.getElementById("amountFresh").textContent = freshQtyRaw ? formatMoney(freshAmount) : "";
    document.getElementById("amountCab").textContent = cabQtyRaw ? formatMoney(cabAmount) : "";
    document.getElementById("amountBo").textContent = boQtyRaw ? formatMoney(boAmount) : "";
    
    const hasSales = regQtyRaw || freshQtyRaw || cabQtyRaw || boQtyRaw;
    document.getElementById("totalAmount").textContent = hasSales ? formatMoney(total) : "";
    document.getElementById("netTotalAmount").textContent = isAllEmpty ? "" : formatMoney(netTotal);

    document.getElementById(`ledgerDry_${activeRow}`).value = document.getElementById("qtyReg").value;
    document.getElementById(`ledgerFresh_${activeRow}`).value = document.getElementById("qtyFresh").value;
    document.getElementById(`ledgerCab_${activeRow}`).value = document.getElementById("qtyCab").value;
    document.getElementById(`ledgerBo_${activeRow}`).value = document.getElementById("qtyBo").value;
    document.getElementById(`ledgerBal_${activeRow}`).value = document.getElementById("inputBal").value;
    
    document.getElementById(`ledgerBilling_${activeRow}`).value = isAllEmpty ? "" : formatMoney(billingAmount);

    const hasPayEntry = payRaw !== "";
    const collnVal = hasPayEntry ? payAmount : billingAmount;
    document.getElementById(`ledgerPay_${activeRow}`).value = isAllEmpty ? "" : formatMoney(collnVal);

    const remVal = billingAmount - collnVal;
    document.getElementById(`ledgerRem_${activeRow}`).value = isAllEmpty ? "" : formatMoney(remVal);

    calculateLedgerTotals();
    saveLedger();
}

function loadRowToMain(row) {
    activeRow = row;

    updateActiveCustomerName(row);

    document.getElementById("qtyReg").value = document.getElementById(`ledgerDry_${row}`).value;
    document.getElementById("syncDry").value = document.getElementById(`ledgerDry_${row}`).value;

    document.getElementById("qtyFresh").value = document.getElementById(`ledgerFresh_${row}`).value;
    document.getElementById("syncFresh").value = document.getElementById(`ledgerFresh_${row}`).value;

    document.getElementById("qtyCab").value = document.getElementById(`ledgerCab_${row}`).value;
    document.getElementById("syncCab").value = document.getElementById(`ledgerCab_${row}`).value;

    document.getElementById("qtyBo").value = document.getElementById(`ledgerBo_${row}`).value;
    document.getElementById("syncBo").value = document.getElementById(`ledgerBo_${row}`).value;

    document.getElementById("inputBal").value = document.getElementById(`ledgerBal_${row}`).value;
    
    const rawColln = document.getElementById(`ledgerPay_${row}`).value.replace(/,/g, '');
    const rawBilling = document.getElementById(`ledgerBilling_${row}`).value.replace(/,/g, '');
    document.getElementById("inputPay").value = (rawColln !== rawBilling) ? rawColln : "";

    calculateMain();
}

function calculateLedgerTotals() {
    let sumDry = 0, sumFresh = 0, sumCab = 0, sumBo = 0;
    let sumBal = 0, sumBilling = 0, sumColln = 0, sumRem = 0;

    for (let i = 1; i <= 16; i++) {
        const dryVal = parseFloat(document.getElementById(`ledgerDry_${i}`).value);
        if (!isNaN(dryVal)) { sumDry += dryVal; }

        const freshVal = parseFloat(document.getElementById(`ledgerFresh_${i}`).value);
        if (!isNaN(freshVal)) { sumFresh += freshVal; }

        const cabVal = parseFloat(document.getElementById(`ledgerCab_${i}`).value);
        if (!isNaN(cabVal)) { sumCab += cabVal; }

        const boVal = parseFloat(document.getElementById(`ledgerBo_${i}`).value);
        if (!isNaN(boVal)) { sumBo += boVal; }

        const balVal = parseFloat(document.getElementById(`ledgerBal_${i}`).value);
        if (!isNaN(balVal)) { sumBal += balVal; }
        
        const billStr = document.getElementById(`ledgerBilling_${i}`).value.replace(/,/g, '');
        if (billStr !== "") { sumBilling += parseFloat(billStr) || 0; }

        const collnStr = document.getElementById(`ledgerPay_${i}`).value.replace(/,/g, '');
        if (collnStr !== "") { sumColln += parseFloat(collnStr) || 0; }

        const remStr = document.getElementById(`ledgerRem_${i}`).value.replace(/,/g, '');
        if (remStr !== "") { sumRem += parseFloat(remStr) || 0; }
    }

    document.getElementById("totalDry").textContent = sumDry ? formatMoney(sumDry) : "";
    document.getElementById("totalFresh").textContent = sumFresh ? formatMoney(sumFresh) : "";
    document.getElementById("totalCab").textContent = sumCab ? formatMoney(sumCab) : "";
    document.getElementById("totalBo").textContent = sumBo ? (sumBo % 1 === 0 ? sumBo : sumBo.toFixed(1)) : "";
    document.getElementById("totalBal").textContent = sumBal ? formatMoney(sumBal) : "";
    document.getElementById("totalBilling").textContent = sumBilling ? formatMoney(sumBilling) : "";
    document.getElementById("totalColln").textContent = sumColln ? formatMoney(sumColln) : "";
    document.getElementById("totalRem").textContent = sumRem ? formatMoney(sumRem) : "";
}

function getCurrentLedgerSnapshot() {
    const ledgerData = {};
    for (let i = 1; i <= 16; i++) {
        ledgerData[`name_${i}`] = document.getElementById(`ledgerName_${i}`).value;
        ledgerData[`dry_${i}`] = document.getElementById(`ledgerDry_${i}`).value;
        ledgerData[`fresh_${i}`] = document.getElementById(`ledgerFresh_${i}`).value;
        ledgerData[`cab_${i}`] = document.getElementById(`ledgerCab_${i}`).value;
        ledgerData[`bo_${i}`] = document.getElementById(`ledgerBo_${i}`).value;
        ledgerData[`bal_${i}`] = document.getElementById(`ledgerBal_${i}`).value;
        ledgerData[`billing_${i}`] = document.getElementById(`ledgerBilling_${i}`).value;
        ledgerData[`pay_${i}`] = document.getElementById(`ledgerPay_${i}`).value;
        ledgerData[`rem_${i}`] = document.getElementById(`ledgerRem_${i}`).value;
    }
    return ledgerData;
}

function saveLedger() {
    if (isReadOnlyMode) return;
    const ledgerData = getCurrentLedgerSnapshot();
    localStorage.setItem("miki_ledger_data", JSON.stringify(ledgerData));
}

function applyLedgerData(ledgerData) {
    for (let i = 1; i <= 16; i++) {
        document.getElementById(`ledgerName_${i}`).value = ledgerData[`name_${i}`] || "";
        document.getElementById(`ledgerDry_${i}`).value = ledgerData[`dry_${i}`] || "";
        document.getElementById(`ledgerFresh_${i}`).value = ledgerData[`fresh_${i}`] || "";
        document.getElementById(`ledgerCab_${i}`).value = ledgerData[`cab_${i}`] || "";
        document.getElementById(`ledgerBo_${i}`).value = ledgerData[`bo_${i}`] || "";
        document.getElementById(`ledgerBal_${i}`).value = ledgerData[`bal_${i}`] || "";
        document.getElementById(`ledgerBilling_${i}`).value = ledgerData[`billing_${i}`] || "";
        document.getElementById(`ledgerPay_${i}`).value = ledgerData[`pay_${i}`] || "";
        document.getElementById(`ledgerRem_${i}`).value = ledgerData[`rem_${i}`] || "";
    }
    loadRowToMain(1);
    calculateLedgerTotals();
}

function setReadOnlyState(readOnly, owner = "") {
    isReadOnlyMode = readOnly;
    const banner = document.getElementById("readOnlyBanner");
    const ownerDisplay = document.getElementById("savedOwnerDisplay");

    if (banner && ownerDisplay) {
        if (readOnly) {
            ownerDisplay.textContent = owner;
            banner.style.display = "block";
        } else {
            banner.style.display = "none";
        }
    }

    const allInputs = document.querySelectorAll("input:not(.price-input):not(.name-input)");
    allInputs.forEach(input => {
        if (input.id !== "saveFileDate" && input.id !== "saveFileName") {
            input.readOnly = readOnly;
            input.style.backgroundColor = readOnly ? "#f3f4f6" : "white";
        }
    });

    toggleLockState(isLocked);
    togglePriceLockState(isPriceLocked);
}

function loadLedger() {
    const saved = localStorage.getItem("miki_ledger_data");
    if (!saved) return;
    const ledgerData = JSON.parse(saved);
    applyLedgerData(ledgerData);
}

/* SAVING & AUTOMATIC DEVICE ID PERMISSION MANAGEMENT */

function getSavedFolderFiles() {
    const folder = localStorage.getItem("miki_folder_files");
    return folder ? JSON.parse(folder) : [];
}

// Opens calendar defaulting to September 28, 2026 when tapped while blank
function handleDateFocus(input) {
    if (!input.value) {
        input.value = "2026-09-28";
        validateSaveForm();
    }
}

function openFolderModal() {
    document.getElementById("saveFileDate").value = "";
    document.getElementById("currentDeviceIdDisplay").textContent = MY_DEVICE_ID;

    validateSaveForm();
    renderFolderRecords();
    document.getElementById("folderModal").style.display = "flex";
}

function closeFolderModal() {
    document.getElementById("folderModal").style.display = "none";
}

function validateSaveForm() {
    const dateVal = document.getElementById("saveFileDate").value.trim();
    const nameVal = document.getElementById("saveFileName").value.trim();
    const saveBtn = document.getElementById("saveFileBtn");

    if (dateVal !== "" && nameVal !== "") {
        saveBtn.classList.add("active");
        saveBtn.disabled = false;
    } else {
        saveBtn.classList.remove("active");
        saveBtn.disabled = true;
    }
}

function saveFileRecord() {
    const dateVal = document.getElementById("saveFileDate").value.trim();
    const nameVal = document.getElementById("saveFileName").value.trim();

    if (!dateVal || !nameVal) return;

    let files = getSavedFolderFiles();
    const existingIndex = files.findIndex(f => f.date === dateVal);

    // Check ownership if overwriting
    if (existingIndex >= 0) {
        const existingOwner = files[existingIndex].ownerDeviceId || "";
        if (existingOwner !== MY_DEVICE_ID) {
            alert(`Permission Denied: File for ${dateVal} was saved by Device [${existingOwner}]. Only that device can overwrite it.`);
            return;
        }
        if (!confirm(`Overwrite record for ${dateVal}?`)) {
            return;
        }
    }

    const newRecord = {
        id: existingIndex >= 0 ? files[existingIndex].id : Date.now(),
        date: dateVal,
        name: nameVal,
        ownerDeviceId: MY_DEVICE_ID,
        data: getCurrentLedgerSnapshot()
    };

    if (existingIndex >= 0) {
        files[existingIndex] = newRecord;
    } else {
        files.push(newRecord);
    }

    // Sort files chronologically: First comes first
    files.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Limit archive to 30 files
    if (files.length > 30) {
        files = files.slice(files.length - 30);
    }

    localStorage.setItem("miki_folder_files", JSON.stringify(files));
    
    currentFileOwner = MY_DEVICE_ID;
    setReadOnlyState(false);
    
    alert(`File "${nameVal}" saved successfully!`);
    renderFolderRecords();
}

function renderFolderRecords() {
    const files = getSavedFolderFiles();
    const tbody = document.getElementById("folderRecordsBody");
    const countDisplay = document.getElementById("savedCountDisplay");
    
    countDisplay.textContent = files.length;
    tbody.innerHTML = "";

    if (files.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#6b7280;">No saved files found.</td></tr>`;
        return;
    }

    files.forEach(file => {
        const isOwner = file.ownerDeviceId === MY_DEVICE_ID;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${file.date}</strong></td>
            <td style="text-align:left;">${file.name}</td>
            <td>📱 ${file.ownerDeviceId || "Unknown"}</td>
            <td>
                <button class="load-file-btn" onclick="loadSavedFile(${file.id})">LOAD</button>
                ${isOwner ? `<button class="del-file-btn" onclick="deleteSavedFile(${file.id})">DEL</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadSavedFile(id) {
    const files = getSavedFolderFiles();
    const target = files.find(f => f.id === id);
    if (!target) return;

    const isOwner = target.ownerDeviceId === MY_DEVICE_ID;

    applyLedgerData(target.data);

    if (isOwner) {
        setReadOnlyState(false);
        currentFileOwner = target.ownerDeviceId;
        saveLedger();
        alert(`Loaded "${target.name}". Editable mode enabled.`);
    } else {
        setReadOnlyState(true, target.ownerDeviceId);
        alert(`Loaded "${target.name}" in READ-ONLY mode. Only Device [${target.ownerDeviceId}] can edit this file.`);
    }

    closeFolderModal();
}

function deleteSavedFile(id) {
    let files = getSavedFolderFiles();
    const target = files.find(f => f.id === id);

    if (target) {
        if (target.ownerDeviceId !== MY_DEVICE_ID) {
            alert(`Permission Denied: Only Device [${target.ownerDeviceId}] can delete this file.`);
            return;
        }

        if (confirm(`Delete saved record for ${target.date} (${target.name})?`)) {
            files = files.filter(f => f.id !== id);
            localStorage.setItem("miki_folder_files", JSON.stringify(files));
            renderFolderRecords();
        }
    }
}

window.onload = function() {
    renderLedgerTableRows();
    loadLedger();
};
