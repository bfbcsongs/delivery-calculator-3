let tapCount = 0;
let tapTimer = null;
let isLocked = true;

const initialNames = ["Bag", "cess", "ed", "risa", "lina", "rakel", "7/11", "lea", "ling²", "sweet", "jean", "amy", "jelai", "", "", ""];

function renderLedgerTableRows() {
    const tbody = document.getElementById("ledgerTableBody");
    if (!tbody) return;
    
    let html = "";
    for (let i = 1; i <= 16; i++) {
        const defaultName = initialNames[i - 1] || "";
        html += `
            <tr>
                <td><input type="text" class="name-input" id="ledgerName_${i}" value="${defaultName}" oninput="saveLedger()" readonly style="background-color: #e5e7eb;"></td>
                <td><input type="number" step="any" class="readonly-col" id="ledgerDry_${i}" oninput="calculateLedgerRow(${i})"></td>
                <td><input type="number" step="any" class="readonly-col" id="ledgerFresh_${i}" oninput="calculateLedgerRow(${i})"></td>
                <td><input type="number" step="any" class="readonly-col" id="ledgerCab_${i}" oninput="calculateLedgerRow(${i})"></td>
                <td><input type="number" step="any" class="readonly-col" id="ledgerBo_${i}" oninput="calculateLedgerRow(${i})"></td>
                <td><input type="number" step="any" class="readonly-col" id="ledgerBal_${i}" oninput="calculateLedgerRow(${i})"></td>
                <td><input type="text" class="readonly-col amount" id="ledgerBilling_${i}" readonly></td>
                <td><input type="number" step="any" class="colln-input" id="ledgerPay_${i}" oninput="calculateLedgerRow(${i})"></td>
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
        field.readOnly = locked;
        field.style.backgroundColor = locked ? "#e5e7eb" : "white";
    });
}

function formatMoney(value) {
    if (value === null || value === undefined || isNaN(value)) return "";
    return Math.round(value).toLocaleString("en-US");
}

function calculateLedgerRow(row) {
    const dry = parseFloat(document.getElementById(`ledgerDry_${row}`).value) || 0;
    const fresh = parseFloat(document.getElementById(`ledgerFresh_${row}`).value) || 0;
    const cab = parseFloat(document.getElementById(`ledgerCab_${row}`).value) || 0;
    const bo = parseFloat(document.getElementById(`ledgerBo_${row}`).value) || 0;
    const bal = parseFloat(document.getElementById(`ledgerBal_${row}`).value) || 0;

    const totalSales = (dry * 45) + (fresh * 45) + (cab * 40) - ((bo / 2) * 45);
    const billing = totalSales + bal;

    const payInputRaw = document.getElementById(`ledgerPay_${row}`).value;
    const payVal = payInputRaw !== "" ? (parseFloat(payInputRaw) || 0) : billing;

    const utang = billing - payVal;

    const isRowEmpty = !dry && !fresh && !cab && !bo && !bal && payInputRaw === "";

    document.getElementById(`ledgerBilling_${row}`).value = isRowEmpty ? "" : formatMoney(billing);
    document.getElementById(`ledgerRem_${row}`).value = isRowEmpty ? "" : formatMoney(utang);

    calculateLedgerTotals();
    saveLedger();
}

function calculateLedgerTotals() {
    let sumDry = 0, sumFresh = 0, sumCab = 0, sumBo = 0;
    let sumBal = 0, sumBilling = 0, sumColln = 0, sumRem = 0;

    for (let i = 1; i <= 16; i++) {
        const dryVal = parseFloat(document.getElementById(`ledgerDry_${i}`).value);
        if (!isNaN(dryVal)) sumDry += dryVal;

        const freshVal = parseFloat(document.getElementById(`ledgerFresh_${i}`).value);
        if (!isNaN(freshVal)) sumFresh += freshVal;

        const cabVal = parseFloat(document.getElementById(`ledgerCab_${i}`).value);
        if (!isNaN(cabVal)) sumCab += cabVal;

        const boVal = parseFloat(document.getElementById(`ledgerBo_${i}`).value);
        if (!isNaN(boVal)) sumBo += boVal;

        const balVal = parseFloat(document.getElementById(`ledgerBal_${i}`).value);
        if (!isNaN(balVal)) sumBal += balVal;

        const billStr = document.getElementById(`ledgerBilling_${i}`).value.replace(/,/g, '');
        if (billStr !== "") sumBilling += parseFloat(billStr) || 0;

        const collnStr = document.getElementById(`ledgerPay_${i}`).value;
        if (collnStr !== "") sumColln += parseFloat(collnStr) || 0;

        const remStr = document.getElementById(`ledgerRem_${i}`).value.replace(/,/g, '');
        if (remStr !== "") sumRem += parseFloat(remStr) || 0;
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

function saveHeaderInfo() {
    const nameVal = document.getElementById("collectorName").value;
    const dateVal = document.getElementById("ledgerDate").value;
    localStorage.setItem("miki_header_info", JSON.stringify({ name: nameVal, date: dateVal }));
}

function saveLedger() {
    const ledgerData = {};
    for (let i = 1; i <= 16; i++) {
        ledgerData[`name_${i}`] = document.getElementById(`ledgerName_${i}`).value;
        ledgerData[`dry_${i}`] = document.getElementById(`ledgerDry_${i}`).value;
        ledgerData[`fresh_${i}`] = document.getElementById(`ledgerFresh_${i}`).value;
        ledgerData[`cab_${i}`] = document.getElementById(`ledgerCab_${i}`).value;
        ledgerData[`bo_${i}`] = document.getElementById(`ledgerBo_${i}`).value;
        ledgerData[`bal_${i}`] = document.getElementById(`ledgerBal_${i}`).value;
        ledgerData[`pay_${i}`] = document.getElementById(`ledgerPay_${i}`).value;
    }
    localStorage.setItem("miki_table2_standalone", JSON.stringify(ledgerData));
}

function loadLedger() {
    // Load Header Info
    const savedHeader = localStorage.getItem("miki_header_info");
    if (savedHeader) {
        const info = JSON.parse(savedHeader);
        document.getElementById("collectorName").value = info.name || "";
        document.getElementById("ledgerDate").value = info.date || "";
    } else {
        // Set Default Date to Today if empty
        document.getElementById("ledgerDate").value = new Date().toISOString().split('T')[0];
    }

    // Load Table Data
    const saved = localStorage.getItem("miki_table2_standalone");
    if (!saved) return;
    const ledgerData = JSON.parse(saved);
    for (let i = 1; i <= 16; i++) {
        if (ledgerData[`name_${i}`] !== undefined) document.getElementById(`ledgerName_${i}`).value = ledgerData[`name_${i}`];
        if (ledgerData[`dry_${i}`] !== undefined) document.getElementById(`ledgerDry_${i}`).value = ledgerData[`dry_${i}`];
        if (ledgerData[`fresh_${i}`] !== undefined) document.getElementById(`ledgerFresh_${i}`).value = ledgerData[`fresh_${i}`];
        if (ledgerData[`cab_${i}`] !== undefined) document.getElementById(`ledgerCab_${i}`).value = ledgerData[`cab_${i}`];
        if (ledgerData[`bo_${i}`] !== undefined) document.getElementById(`ledgerBo_${i}`).value = ledgerData[`bo_${i}`];
        if (ledgerData[`bal_${i}`] !== undefined) document.getElementById(`ledgerBal_${i}`).value = ledgerData[`bal_${i}`];
        if (ledgerData[`pay_${i}`] !== undefined) document.getElementById(`ledgerPay_${i}`).value = ledgerData[`pay_${i}`];
        calculateLedgerRow(i);
    }
}

/* SCREENSHOT FUNCTION WITH REQUIREMENT VALIDATION */
async function takeScreenshot() {
    const collectorName = document.getElementById("collectorName").value.trim();
    const ledgerDate = document.getElementById("ledgerDate").value.trim();

    // REQUIREMENT CHECK: Must fill Name and Date first
    if (!collectorName || !ledgerDate) {
        alert("⚠️ REQUIREMENTS NEEDED:\n\nPaki-fill up muna ang NAME BAR at DATE BAR sa itaas bago mag-take ng screenshot!");
        
        if (!collectorName) {
            document.getElementById("collectorName").focus();
        } else if (!ledgerDate) {
            document.getElementById("ledgerDate").focus();
        }
        return; // Stop execution
    }

    const captureArea = document.getElementById("captureArea");
    const btn = document.getElementById("screenshotBtn");
    const fileName = `Ledger_${collectorName}_${ledgerDate}.png`;

    btn.innerText = "⏳ CAPTURING...";

    try {
        const canvas = await html2canvas(captureArea, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert("Failed to capture screenshot.");
                btn.innerText = "📸 TAKE SCREENSHOT & SHARE";
                return;
            }

            const imageFile = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                await navigator.share({
                    files: [imageFile],
                    title: 'Miki Ledger Report',
                    text: `Ledger Report for ${collectorName} (${ledgerDate}):`
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
                alert("Naisave ang Screenshot sa Downloads! Pwede mo na itong i-send sa Messenger.");
            }
            btn.innerText = "📸 TAKE SCREENSHOT & SHARE";
        }, 'image/png');

    } catch (err) {
        console.error("Error capturing screenshot:", err);
        alert("Nagka-error sa pag-capture. Subukan ulit.");
        btn.innerText = "📸 TAKE SCREENSHOT & SHARE";
    }
}

window.onload = function() {
    renderLedgerTableRows();
    loadLedger();
};
