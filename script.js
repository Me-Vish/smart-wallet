// ====== Utilities ======
const formatMoney = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const todayISO = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

// ====== Local Storage ======
const STORAGE_KEY = "fam_wallet_txns_v1";

const loadTxns = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveTxns = (txns) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
};

// ====== Fraud-like rules ======
// Rule 1: Amount > 10000 -> suspicious
// Rule 2: Same merchant repeated >= 3 times -> suspicious
const markSuspicious = (txns) => {
  const merchantCount = {};
  txns.forEach(t => {
    const key = t.merchant.toLowerCase().trim();
    merchantCount[key] = (merchantCount[key] || 0) + 1;
  });

  return txns.map(t => {
    const merchantKey = t.merchant.toLowerCase().trim();
    const suspicious =
      Number(t.amount) > 10000 || merchantCount[merchantKey] >= 3;

    return { ...t, suspicious };
  });
};

// ====== DOM ======
const balanceText = document.getElementById("balanceText");
const creditText = document.getElementById("creditText");
const debitText = document.getElementById("debitText");

const txnForm = document.getElementById("txnForm");
const typeEl = document.getElementById("type");
const amountEl = document.getElementById("amount");
const merchantEl = document.getElementById("merchant");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");
const modeEl = document.getElementById("mode");

const txnTable = document.getElementById("txnTable");
const searchEl = document.getElementById("search");
const filterTypeEl = document.getElementById("filterType");
const sortByEl = document.getElementById("sortBy");

const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

dateEl.value = todayISO();

// ====== Render ======
function calcStats(txns) {
  let credit = 0;
  let debit = 0;

  txns.forEach(t => {
    if (t.type === "credit") credit += Number(t.amount);
    else debit += Number(t.amount);
  });

  const balance = credit - debit;
  return { credit, debit, balance };
}

function renderStats(txns) {
  const { credit, debit, balance } = calcStats(txns);
  balanceText.textContent = formatMoney(balance);
  creditText.textContent = formatMoney(credit);
  debitText.textContent = formatMoney(debit);
}

function renderTable(txns) {
  txnTable.innerHTML = "";

  if (txns.length === 0) {
    txnTable.innerHTML = `
      <tr>
        <td colspan="8" style="opacity:0.7;">No transactions yet. Add one above ✅</td>
      </tr>
    `;
    return;
  }

  txns.forEach(t => {
    const statusBadge = t.suspicious
      ? `<span class="badge suspicious">Suspicious</span>`
      : `<span class="badge ok">OK</span>`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.date}</td>
      <td>${t.merchant}</td>
      <td>${t.category}</td>
      <td>${t.mode}</td>
      <td style="font-weight:800; color:${t.type === "credit" ? "#58ffb5" : "#ff6a6a"};">
        ${t.type.toUpperCase()}
      </td>
      <td style="font-weight:800;">${formatMoney(t.amount)}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="small-btn" data-id="${t.id}">Delete</button>
      </td>
    `;

    txnTable.appendChild(row);
  });
}

function applyFiltersAndRender() {
  let txns = loadTxns();
  txns = markSuspicious(txns);

  const query = searchEl.value.toLowerCase().trim();
  const filterType = filterTypeEl.value;
  const sortBy = sortByEl.value;

  // search
  if (query) {
    txns = txns.filter(t =>
      t.merchant.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.mode.toLowerCase().includes(query)
    );
  }

  // filter by type
  if (filterType === "credit") txns = txns.filter(t => t.type === "credit");
  if (filterType === "debit") txns = txns.filter(t => t.type === "debit");
  if (filterType === "suspicious") txns = txns.filter(t => t.suspicious);

  // sorting
  if (sortBy === "latest") {
    txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (sortBy === "amountHigh") {
    txns.sort((a, b) => Number(b.amount) - Number(a.amount));
  } else if (sortBy === "amountLow") {
    txns.sort((a, b) => Number(a.amount) - Number(b.amount));
  }

  renderStats(loadTxns());
  renderTable(txns);
}

// ====== Events ======
txnForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const amount = Number(amountEl.value);

  if (amount <= 0) {
    alert("Enter valid amount.");
    return;
  }

  const txns = loadTxns();

  const newTxn = {
    id: uid(),
    type: typeEl.value,
    amount: amount,
    merchant: merchantEl.value.trim(),
    category: categoryEl.value,
    date: dateEl.value,
    mode: modeEl.value,
  };

  txns.push(newTxn);
  saveTxns(txns);

  txnForm.reset();
  dateEl.value = todayISO();
  typeEl.value = "credit";

  applyFiltersAndRender();
});

txnTable.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    const id = e.target.getAttribute("data-id");
    let txns = loadTxns();
    txns = txns.filter(t => t.id !== id);
    saveTxns(txns);
    applyFiltersAndRender();
  }
});

searchEl.addEventListener("input", applyFiltersAndRender);
filterTypeEl.addEventListener("change", applyFiltersAndRender);
sortByEl.addEventListener("change", applyFiltersAndRender);

resetBtn.addEventListener("click", () => {
  const ok = confirm("Reset all transactions?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  applyFiltersAndRender();
});

exportBtn.addEventListener("click", () => {
  const txns = loadTxns();
  const blob = new Blob([JSON.stringify(txns, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.json";
  a.click();

  URL.revokeObjectURL(url);
});

// ====== Initialize ======
applyFiltersAndRender();
