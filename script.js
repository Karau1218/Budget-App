let pyodideInstance = null;

async function initPython() {
  const statusEl = document.getElementById("status");
  try {
    statusEl.innerText = "Loading Python WebAssembly runtime...";
    pyodideInstance = await loadPyodide();

    // Fetch and execute main.py cleanly
    const response = await fetch("main.py");
    if (!response.ok) {
      throw new Error(`Failed to load main.py (status ${response.status})`);
    }
    const pythonCode = await response.text();
    await pyodideInstance.runPythonAsync(pythonCode);

    // Initialize an in-memory dictionary to hold categories
    await pyodideInstance.runPythonAsync(`categories = {}`);

    // Add initial starter categories
    await addCategoryByName("Food", 1000, 26.04);
    await addCategoryByName("Clothing", 500, 50.00);
    await addCategoryByName("Auto", 300, 25.00);

    statusEl.innerText = "Python environment ready.";
    statusEl.style.color = "#059669";

    renderLedger();
    renderChart();
  } catch (err) {
    statusEl.innerText = "Error: " + err.message;
    statusEl.style.color = "#dc2626";
    console.error(err);
  }
}

initPython();

// Helper to add a category and seed dummy transactions
async function addCategoryByName(name, depositAmt, withdrawAmt) {
  await pyodideInstance.runPythonAsync(`
categories["${name}"] = Category("${name}")
categories["${name}"].deposit(${depositAmt}, "initial deposit")
categories["${name}"].withdraw(${withdrawAmt}, "spending")
  `);
  await refreshCategoryDropdowns();
}

async function refreshCategoryDropdowns() {
  const listPy = await pyodideInstance.runPythonAsync("list(categories.keys())");
  const catNames = listPy.toJs();

  const selectors = ["activeCategory", "transferFrom", "transferTo"];
  selectors.forEach((id) => {
    const sel = document.getElementById(id);
    const prevVal = sel.value;
    sel.innerHTML = "";
    catNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.innerText = name;
      sel.appendChild(opt);
    });
    if (catNames.includes(prevVal)) sel.value = prevVal;
  });

  document.getElementById("activeCategory").onchange = renderLedger;
}

async function addCategory() {
  const input = document.getElementById("catName");
  const name = input.value.trim();
  if (!name) return setStatus("Enter a category name", true);

  await pyodideInstance.runPythonAsync(`
if "${name}" not in categories:
    categories["${name}"] = Category("${name}")
  `);

  input.value = "";
  await refreshCategoryDropdowns();
  setStatus(`Category '${name}' created.`);
  renderLedger();
  renderChart();
}

async function makeDeposit() {
  const cat = document.getElementById("activeCategory").value;
  const amt = parseFloat(document.getElementById("txAmount").value);
  const desc = document.getElementById("txDesc").value.trim();
  if (isNaN(amt) || amt <= 0) return setStatus("Invalid amount", true);

  await pyodideInstance.runPythonAsync(`categories["${cat}"].deposit(${amt}, "${desc}")`);
  setStatus(`Deposited $${amt.toFixed(2)} into ${cat}`);
  renderLedger();
}

async function makeWithdraw() {
  const cat = document.getElementById("activeCategory").value;
  const amt = parseFloat(document.getElementById("txAmount").value);
  const desc = document.getElementById("txDesc").value.trim();
  if (isNaN(amt) || amt <= 0) return setStatus("Invalid amount", true);

  const res = await pyodideInstance.runPythonAsync(`categories["${cat}"].withdraw(${amt}, "${desc}")`);
  if (res) {
    setStatus(`Withdrew $${amt.toFixed(2)} from ${cat}`);
  } else {
    setStatus("Withdrawal failed: Insufficient funds", true);
  }
  renderLedger();
  renderChart();
}

async function makeTransfer() {
  const from = document.getElementById("transferFrom").value;
  const to = document.getElementById("transferTo").value;
  const amt = parseFloat(document.getElementById("transferAmount").value);

  if (from === to) return setStatus("Source and destination must be different", true);
  if (isNaN(amt) || amt <= 0) return setStatus("Invalid amount", true);

  const res = await pyodideInstance.runPythonAsync(`categories["${from}"].transfer(${amt}, categories["${to}"])`);
  if (res) {
    setStatus(`Transferred $${amt.toFixed(2)} from ${from} to ${to}`);
  } else {
    setStatus("Transfer failed: Insufficient funds", true);
  }
  renderLedger();
  renderChart();
}

async function renderLedger() {
  const cat = document.getElementById("activeCategory").value;
  if (!cat) return;
  const output = await pyodideInstance.runPythonAsync(`str(categories["${cat}"])`);
  document.getElementById("ledgerDisplay").innerText = output;
}

async function renderChart() {
  const output = await pyodideInstance.runPythonAsync(`create_spend_chart(list(categories.values()))`);
  document.getElementById("chartDisplay").innerText = output;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("status");
  el.innerText = msg;
  el.style.color = isError ? "#dc2626" : "#059669";
}