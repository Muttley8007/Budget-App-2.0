const K = 'bills-beta-pay-budget-lite-v2-beta';

let data = JSON.parse(localStorage.getItem(K) || '{"pays":[],"templates":[]}');

if (!data.templates) data.templates = [];
if (!data.pays) data.pays = [];
if (!data.bills) data.bills = [];
if (!data.billTemplates) data.billTemplates = [];

data.pays.forEach(p => {
  if (typeof p.archived === 'undefined') p.archived = false;
  if (!p.expenses) p.expenses = [];
  p.expenses.forEach(e => {
    if (typeof e.paid === 'undefined') e.paid = false;
  });
});

data.pays.forEach(p => {
  if (typeof p.collapsed === 'undefined') p.collapsed = false;
});

data.bills.forEach(b => {
  if (typeof b.recurring === 'undefined') b.recurring = false;
  if (typeof b.type === 'undefined') b.type = 'Monthly';
  if (typeof b.dueDate === 'undefined') b.dueDate = '';
  if (typeof b.paid === 'undefined') b.paid = false;
  if (typeof b.paidDate === 'undefined') b.paidDate = '';
  if (typeof b.planned === 'undefined') b.planned = false;
  if (typeof b.plannedDate === 'undefined') b.plannedDate = '';
  if (typeof b.showActionMenu === 'undefined') b.showActionMenu = false;
  if (typeof b.plannedPayId === 'undefined') b.plannedPayId = '';
  if (typeof b.plannedExpenseId === 'undefined') b.plannedExpenseId = '';
  if (typeof b.showPlanForm === 'undefined') b.showPlanForm = false;
});

if (!data.billDraft) {
  data.billDraft = {
    id: '',
    name: '',
    amount: '',
    type: 'Monthly',
    dueDate: '',
    recurring: true
  };
}

if (!data.billPeriodCollapsed) data.billPeriodCollapsed = {};

let currentTab = 'cards';

function save() {
  localStorage.setItem(K, JSON.stringify(data));
}

function money(n) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(n || 0);
}

function dateFmt(d) {
  if (!d) return 'No date';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function totals(pay) {
  const exp = (pay.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  return { exp, rem: Number(pay.pay || 0) - exp };
}

function stat(rem) {
  if (rem < 0) return ['r', 'Red'];
  if (rem < 200) return ['y', 'Tight'];
  return ['g', 'OK'];
}

function addPay() {
  const d = document.getElementById('payDate').value;
  const p = Number(document.getElementById('payAmt').value || 0);
  const n = document.getElementById('payNote').value.trim();

  if (!d || !p) {
    alert('Add a date and pay amount');
    return;
  }

  data.pays.unshift({
    id: Date.now().toString(),
    date: d,
    pay: p,
    note: n,
    expenses: [],
    archived: false
  });

  save();

  document.getElementById('payDate').value = '';
  document.getElementById('payAmt').value = '';
  document.getElementById('payNote').value = '';

  render();
}

function editPay(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  const newDate = prompt('Pay date?', pay.date || '');
  if (!newDate) return;

  const newAmount = Number(prompt('Expected pay?', pay.pay || 0) || 0);
  if (!newAmount) return;

  const newNote = prompt('Notes?', pay.note || '');
  if (newNote === null) return;

  pay.date = newDate;
  pay.pay = newAmount;
  pay.note = newNote;

  save();
  render();
}

function delPay(id) {
  if (!confirm('Delete this pay period?')) return;
  data.pays = data.pays.filter(x => x.id !== id);
  save();
  render();
}

function closePay(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.archived = true;
  save();
  render();
}

function reopenPay(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.archived = false;
  save();
  render();
}

function addExp(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  pay.showExpenseForm = true;
  if (typeof pay.newExpenseName === 'undefined') pay.newExpenseName = '';
  if (typeof pay.newExpenseAmount === 'undefined') pay.newExpenseAmount = '';
  if (typeof pay.newExpenseCat === 'undefined') pay.newExpenseCat = 'Fixed';

  save();
  render();
}

function cancelAddExp(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.showExpenseForm = false;
  pay.newExpenseName = '';
  pay.newExpenseAmount = '';
  pay.newExpenseCat = 'Fixed';
  pay.selectedTemplateId = '';
  save();
  render();
}

function updateExpenseDraft(id, field, value){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay[field] = value;
  save();
}


function applyExpenseTemplate(id, templateId){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  pay.selectedTemplateId = templateId;

  const tpl = data.templates.find(t => t.id === templateId);
  if (tpl){
    pay.newExpenseName = tpl.name || '';
    pay.newExpenseAmount = tpl.amount || '';
    pay.newExpenseCat = tpl.cat || 'Fixed';
  }

  save();
  render();
}

function saveExpenseTemplate(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  const name = String(pay.newExpenseName || '').trim();
  const amount = Number(pay.newExpenseAmount || 0);
  const cat = String(pay.newExpenseCat || 'Fixed');

  if (!name){
    alert('Add an expense name first');
    return;
  }
  if (!amount){
    alert('Add an amount first');
    return;
  }

  let tpl = null;
  if (pay.selectedTemplateId){
    tpl = data.templates.find(t => t.id === pay.selectedTemplateId);
  }

  if (tpl){
    tpl.name = name;
    tpl.amount = amount;
    tpl.cat = cat;
  } else {
    tpl = {
      id: 't' + Date.now().toString(),
      name,
      amount,
      cat
    };
    data.templates.push(tpl);
    pay.selectedTemplateId = tpl.id;
  }

  save();
  render();
  alert('Saved to templates');
}

function saveInlineExp(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  const name = String(pay.newExpenseName || '').trim();
  const amount = Number(pay.newExpenseAmount || 0);
  const cat = String(pay.newExpenseCat || 'Fixed');

  if (!name) {
    alert('Add an expense name');
    return;
  }
  if (!amount) {
    alert('Add an amount');
    return;
  }

  pay.expenses.push({
    id: Date.now().toString(),
    name,
    amount,
    cat,
    paid: false
  });

  pay.showExpenseForm = false;
  pay.newExpenseName = '';
  pay.newExpenseAmount = '';
  pay.newExpenseCat = 'Fixed';
  pay.selectedTemplateId = '';

  save();
  render();
}

function delExp(payId, expId) {
  const pay = data.pays.find(x => x.id === payId);
  if (!pay) return;
  pay.expenses = pay.expenses.filter(x => x.id !== expId);
  save();
  render();
}

function togglePaid(payId, expId) {
  const pay = data.pays.find(x => x.id === payId);
  if (!pay) return;

  const exp = pay.expenses.find(x => x.id === expId);
  if (!exp) return;

  exp.paid = !exp.paid;
  save();
  render();
}


function showTab(tab) {
  currentTab = tab;
  document.getElementById('cardsTab').style.display = tab === 'cards' ? 'block' : 'none';
  document.getElementById('dashboardTab').style.display = tab === 'dashboard' ? 'block' : 'none';
  const billsTab = document.getElementById('billsTab');
  if (billsTab) billsTab.style.display = tab === 'bills' ? 'block' : 'none';

  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  if (tab === 'dashboard') drawMonthlyChart();
}

function renderSummary() {
  const activePays = data.pays.filter(p => !p.archived);
  const pay = activePays.reduce((s, p) => s + Number(p.pay || 0), 0);
  const exp = activePays.reduce((s, p) => s + totals(p).exp, 0);
  const rem = pay - exp;

  document.getElementById('summary').innerHTML =
    '<div class="stat-card">' +
      '<div class="stat-label">Expected Pay</div>' +
      '<div class="stat-value">' + money(pay) + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-label">Expenses</div>' +
      '<div class="stat-value">' + money(exp) + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-label">Net Remaining</div>' +
      '<div class="stat-value">' + money(rem) + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-label">Active Pays</div>' +
      '<div class="stat-value">' + activePays.length + '</div>' +
    '</div>';
}

function renderDashboard() {
  const box = document.getElementById('dashboard');
  const activePays = data.pays
    .filter(p => !p.archived)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!activePays.length) {
    box.innerHTML = '<h3>Dashboard</h3><div class="small">No pay periods yet.</div>';
    return;
  }

  const monthly = {};
  activePays.forEach(p => {
    const key = (p.date || '').slice(0, 7);
    if (!key) return;
    if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
    monthly[key].income += Number(p.pay || 0);
    monthly[key].expenses += totals(p).exp;
  });

  const monthCards = Object.keys(monthly).sort().map(key => {
    const income = monthly[key].income;
    const expenses = monthly[key].expenses;
    const remaining = income - expenses;
    const remClass = remaining < 0 ? 'rem-red' : remaining < 200 ? 'rem-tight' : 'rem-ok';

    const monthTitle = new Date(key + '-01T00:00:00').toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric'
    });

    return `
      <div class="dashboard-month-card">
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Month</div>
          <div class="dashboard-month-value">${monthTitle}</div>
        </div>
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Income</div>
          <div class="dashboard-month-value">${money(income)}</div>
        </div>
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Expenses</div>
          <div class="dashboard-month-value">${money(expenses)}</div>
        </div>
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Remaining</div>
          <div class="dashboard-month-value ${remClass}">${money(remaining)}</div>
        </div>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <h3>Dashboard</h3>
    <div class="small" style="margin-bottom:12px;">Monthly view of your planned pays</div>
    <div class="dashboard-month-grid">${monthCards}</div>
    <div style="margin-top:16px;">
      <h4 style="margin:0 0 10px;">Monthly Outlook</h4>
      <canvas id="monthlyChart" height="260" style="width:100%;background:#181818;border:1px solid #333;border-radius:12px;"></canvas>
    </div>
  `;

  drawMonthlyChart();
}

function drawMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  if (!canvas) return;

  const activePays = data.pays.filter(p => !p.archived);
  if (!activePays.length) return;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = 260;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const w = cssWidth - pad.left - pad.right;
  const h = cssHeight - pad.top - pad.bottom;

  const monthly = {};

  activePays.forEach(p => {
    const key = (p.date || '').slice(0, 7);
    if (!key) return;
    if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
    monthly[key].income += Number(p.pay || 0);
    monthly[key].expenses += totals(p).exp;
  });

  const months = Object.keys(monthly).sort();
  if (!months.length) return;

  const points = months.map(m => {
    const income = monthly[m].income;
    const expenses = monthly[m].expenses;
    return { month: m, income, expenses, remaining: income - expenses };
  });

  const maxY = 10000;
  const steps = 10;
  const stepValue = maxY / steps;

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.font = '11px Arial';
  ctx.fillStyle = '#aaa';

  for (let i = 0; i <= steps; i++) {
    const y = pad.top + h - (i / steps) * h;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + w, y);
    ctx.stroke();
    ctx.fillText('$' + (i * stepValue / 1000).toFixed(0) + 'k', 8, y + 4);
  }

  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + h);
  ctx.lineTo(pad.left + w, pad.top + h);
  ctx.stroke();

  const groupWidth = w / months.length;
  const barWidth = Math.min(22, groupWidth * 0.22);

  function yPos(val) {
    const capped = Math.max(0, Math.min(maxY, val));
    return pad.top + h - (capped / maxY) * h;
  }

  points.forEach((p, i) => {
    const cx = pad.left + groupWidth * i + groupWidth / 2;
    const incomeX = cx - barWidth - 4;
    const expenseX = cx + 4;
    const incomeY = yPos(p.income);
    const expenseY = yPos(p.expenses);

    ctx.fillStyle = '#2d6cdf';
    ctx.fillRect(incomeX, incomeY, barWidth, pad.top + h - incomeY);

    ctx.fillStyle = '#b33a3a';
    ctx.fillRect(expenseX, expenseY, barWidth, pad.top + h - expenseY);

    const label = formatMonthLabel(p.month);
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, pad.top + h + 18);
  });

  ctx.beginPath();
  points.forEach((p, i) => {
    const cx = pad.left + groupWidth * i + groupWidth / 2;
    const y = yPos(p.remaining);
    if (i === 0) ctx.moveTo(cx, y);
    else ctx.lineTo(cx, y);
  });
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 2;
  ctx.stroke();

  points.forEach((p, i) => {
    const cx = pad.left + groupWidth * i + groupWidth / 2;
    const y = yPos(p.remaining);
    ctx.beginPath();
    ctx.arc(cx, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fill();
  });

  ctx.textAlign = 'left';
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-AU', { month: 'short' });
}

window.addEventListener('resize', () => {
  if (currentTab === 'dashboard') drawMonthlyChart();
});


let openMenuPayId = null;

function togglePayMenu(id){
  openMenuPayId = openMenuPayId === id ? null : id;
  render();
}

function closePayMenu(){
  openMenuPayId = null;
  render();
}
function toggleCollapse(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.collapsed = !pay.collapsed;
  save();
  render();
}


function updateBillDraft(field, value){
  if (!data.billDraft) data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  data.billDraft[field] = value;
  save();
}

function selectBillTemplate(templateId){
  if (!data.billDraft) data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  const tpl = data.billTemplates.find(t => t.id === templateId);
  data.billDraft.id = templateId || '';
  if (tpl){
    data.billDraft.name = tpl.name || '';
    data.billDraft.amount = tpl.amount || '';
    data.billDraft.type = tpl.type || 'Monthly';
    data.billDraft.dueDate = tpl.dueDate || '';
    data.billDraft.recurring = !!tpl.recurring;
  }
  save();
  render();
}

function clearBillDraft(){
  data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  save();
  render();
}

function addBill(){
  const d = data.billDraft || {};
  const name = String(d.name || '').trim();
  const amount = Number(d.amount || 0);
  if (!name) return alert('Add a bill name');
  if (!amount) return alert('Add an amount');

  data.bills.push({
    id:'b' + Date.now().toString(),
    name,
    amount,
    type:d.type || 'Monthly',
    dueDate:d.dueDate || '',
    recurring:!!d.recurring,
    planned:false,
    plannedDate:'',
    paid:false,
    paidDate:'',
    plannedPayId:'',
    plannedExpenseId:'',
    showPlanForm:false,
    createdAt:new Date().toISOString()
  });

  clearBillDraft();
}

function saveBillTemplate(){
  const d = data.billDraft || {};
  const name = String(d.name || '').trim();
  const amount = Number(d.amount || 0);
  if (!name) return alert('Add a bill name first');
  if (!amount) return alert('Add an amount first');

  let tpl = d.id ? data.billTemplates.find(t => t.id === d.id) : null;
  if (tpl){
    tpl.name = name;
    tpl.amount = amount;
    tpl.type = d.type || 'Monthly';
    tpl.dueDate = d.dueDate || '';
    tpl.recurring = !!d.recurring;
  } else {
    tpl = {
      id:'bt' + Date.now().toString(),
      name,
      amount,
      type:d.type || 'Monthly',
      dueDate:d.dueDate || '',
      recurring:!!d.recurring
    };
    data.billTemplates.push(tpl);
    data.billDraft.id = tpl.id;
  }
  save();
  render();
  alert('Bill saved');
}

function deleteBill(id){
  if (!confirm('Delete this bill?')) return;
  data.bills = data.bills.filter(b => b.id !== id);
  save();
  render();
}

function editBill(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill) return;
  data.billDraft = {
    id:'',
    name: bill.name || '',
    amount: bill.amount || '',
    type: bill.type || 'Monthly',
    dueDate: bill.dueDate || '',
    recurring: !!bill.recurring
  };
  data.bills = data.bills.filter(b => b.id !== id);
  save();
  render();
  showTab('bills');
}

function billDateLabel(d){
  if (!d) return 'No due date';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}




function toggleBillMenu(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill) return;

  data.bills.forEach(b => {
    if (b.id !== id) b.showActionMenu = false;
  });

  bill.showActionMenu = !bill.showActionMenu;
  save();
  render();
}

function closeBillMenu(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill) return;
  bill.showActionMenu = false;
  save();
  render();
}

function toggleBillPlanned(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill || bill.type === 'Fortnightly') return;

  bill.planned = !bill.planned;
  bill.plannedDate = bill.planned ? new Date().toISOString() : '';

  save();
  render();
}

function toggleBillPaid(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill || bill.type === 'Fortnightly') return;

  bill.paid = !bill.paid;
  bill.paidDate = bill.paid ? new Date().toISOString() : '';

  save();
  render();
}

function addMonthsSafe(dateString, months){
  const d = new Date(dateString + 'T00:00:00');
  const originalDay = d.getDate();

  d.setDate(1);
  d.setMonth(d.getMonth() + months);

  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, lastDay));

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function nextBillDueDate(bill){
  if (!bill.dueDate) return '';

  if (bill.type === 'Monthly') return addMonthsSafe(bill.dueDate, 1);
  if (bill.type === 'Quarterly') return addMonthsSafe(bill.dueDate, 3);
  if (bill.type === 'Annual') return addMonthsSafe(bill.dueDate, 12);

  return bill.dueDate;
}

function duplicateBillPeriod(type, key){
  if (type === 'Fortnightly') return;

  const sourceBills = (data.bills || []).filter(b =>
    b.type === type &&
    billPeriodKey(b) === key &&
    b.recurring
  );

  if (!sourceBills.length){
    alert('There are no recurring bills to copy.');
    return;
  }

  let copied = 0;
  let skipped = 0;

  sourceBills.forEach(bill => {
    const dueDate = nextBillDueDate(bill);
    const targetKey = dueDate ? billPeriodKey({ type, dueDate }) : 'No date';

    const duplicateExists = data.bills.some(existing =>
      existing.type === type &&
      billPeriodKey(existing) === targetKey &&
      String(existing.name || '').trim().toLowerCase() === String(bill.name || '').trim().toLowerCase()
    );

    if (duplicateExists){
      skipped++;
      return;
    }

    data.bills.push({
      id: 'b' + Date.now().toString() + Math.random().toString(36).slice(2, 7),
      name: bill.name,
      amount: Number(bill.amount || 0),
      type: bill.type,
      dueDate,
      recurring: true,
      planned: false,
      plannedDate: '',
      paid: false,
      paidDate: '',
      plannedPayId: '',
      plannedExpenseId: '',
      showPlanForm: false,
      createdAt: new Date().toISOString()
    });

    copied++;
  });

  save();
  render();

  const targetLabel = sourceBills[0] && sourceBills[0].dueDate
    ? billPeriodTitle(billPeriodKey({ type, dueDate: nextBillDueDate(sourceBills[0]) }), type)
    : 'next period';

  alert(`${targetLabel} created.\n${copied} recurring bill${copied === 1 ? '' : 's'} copied${skipped ? `.\n${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`);
}

function billPeriodKey(bill){
  if (!bill.dueDate) return 'No date';
  const d = new Date(bill.dueDate + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  if (bill.type === 'Annual') return String(year);

  if (bill.type === 'Quarterly'){
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  return bill.dueDate.slice(0, 7);
}

function billPeriodTitle(key, type){
  if (key === 'No date') return 'No due date';

  if (type === 'Annual') return `${key} Annual Bills`;

  if (type === 'Quarterly'){
    const [year, quarter] = key.split('-');
    return `${quarter} ${year}`;
  }

  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric'
  });
}

function billPeriodCollapseKey(type, key){
  return `${type}:${key}`;
}

function toggleBillPeriod(type, key){
  if (!data.billPeriodCollapsed) data.billPeriodCollapsed = {};
  const collapseKey = billPeriodCollapseKey(type, key);
  data.billPeriodCollapsed[collapseKey] = !data.billPeriodCollapsed[collapseKey];
  save();
  render();
}

function isBillPeriodCollapsed(type, key){
  if (!data.billPeriodCollapsed) data.billPeriodCollapsed = {};
  return !!data.billPeriodCollapsed[billPeriodCollapseKey(type, key)];
}

function renderBillSection(title, type){
  const allBills = (data.bills || [])
    .filter(b => b.type === type)
    .slice()
    .sort((a,b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return String(a.name).localeCompare(String(b.name));
    });

  const groups = {};
  allBills.forEach(b => {
    const key = billPeriodKey(b);
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });

  const periodKeys = Object.keys(groups)
    .filter(key => {
      if (type === 'Fortnightly') return true;
      return groups[key].some(b => !b.paid);
    })
    .sort((a,b) => {
      if (a === 'No date') return 1;
      if (b === 'No date') return -1;
      return a.localeCompare(b);
    });

  const activeBills = allBills.filter(b => type === 'Fortnightly' || !b.paid);
  const activeTotal = activeBills.reduce((s,b) => s + Number(b.amount || 0), 0);

  return `
    <div class="bill-card">
      <div class="bill-card-header">
        <div>
          <h3 class="bill-card-title">${title}</h3>
          <div class="bill-card-summary">${activeBills.length} active bills • ${money(activeTotal)} outstanding</div>
        </div>
      </div>

      ${periodKeys.length ? `
        <div class="bill-period-grid">
          ${periodKeys.map(key => {
            const periodBills = groups[key];
            const tracked = type !== 'Fortnightly';
            const plannedCount = tracked ? periodBills.filter(b => b.planned).length : 0;
            const paidCount = tracked ? periodBills.filter(b => b.paid).length : 0;
            const unpaidBills = tracked ? periodBills.filter(b => !b.paid) : periodBills;
            const unplannedBills = tracked ? periodBills.filter(b => !b.planned) : [];
            const outstanding = unpaidBills.reduce((s,b) => s + Number(b.amount || 0), 0);
            const planningProgress = tracked && periodBills.length ? Math.round((plannedCount / periodBills.length) * 100) : 0;
            const paymentProgress = tracked && periodBills.length ? Math.round((paidCount / periodBills.length) * 100) : 0;
            const collapsed = isBillPeriodCollapsed(type, key);

            return `
              <div class="bill-period-card ${collapsed ? 'collapsed' : ''}">
                <div class="bill-period-header">
                  <div>
                    <h4 class="bill-period-title">${billPeriodTitle(key, type)}</h4>
                    <div class="bill-period-summary">
                      ${tracked
                        ? `${unplannedBills.length} unplanned • ${unpaidBills.length} outstanding • ${money(outstanding)}`
                        : `${periodBills.length} bills • ${money(outstanding)}`}
                    </div>
                  </div>

                  <div class="bill-period-head-right">
                    ${tracked ? `
                      <button class="icon-btn" onclick="duplicateBillPeriod('${type}','${key}')" title="Duplicate to next period">⧉</button>
                    ` : ''}
                    <button class="icon-btn" onclick="toggleBillPeriod('${type}','${key}')" title="${collapsed ? 'Expand' : 'Collapse'}">
                      ${collapsed ? '+' : '−'}
                    </button>
                  </div>
                </div>

                ${tracked ? `
                  <div class="bill-progress-split">
                    <div>
                      <div class="bill-progress-label"><span>Planning</span><span>${plannedCount}/${periodBills.length}</span></div>
                      <div class="bill-progress-track">
                        <div class="bill-progress-fill planned" style="width:${planningProgress}%"></div>
                      </div>
                    </div>
                    <div>
                      <div class="bill-progress-label"><span>Payment</span><span>${paidCount}/${periodBills.length}</span></div>
                      <div class="bill-progress-track">
                        <div class="bill-progress-fill paid" style="width:${paymentProgress}%"></div>
                      </div>
                    </div>
                  </div>
                ` : ''}

                <div class="bill-list">
                  ${periodBills.map(b => `
                    <div class="bill-row modern ${b.paid ? 'paid' : ''}">
                      <div class="bill-avatar">${escapeHtml((b.name || '?').trim().charAt(0).toUpperCase())}</div>

                      <div class="bill-main">
                        <div class="bill-name">${escapeHtml(b.name)}</div>
                        <div class="bill-meta">
                          Due: ${billDateLabel(b.dueDate)}<br>
                          ${b.recurring ? 'Recurring' : 'One-off'}
                          ${b.plannedDate ? `<br>Planned: ${new Date(b.plannedDate).toLocaleDateString('en-AU')}` : ''}
                          ${b.paidDate ? `<br>Paid: ${new Date(b.paidDate).toLocaleDateString('en-AU')}` : ''}
                        </div>
                      </div>

                      <div class="bill-status-column">
                        ${tracked ? `
                          <div class="status-mini-labels"><span>P</span><span>PD</span></div>
                          <div class="status-mini-bars">
                            <span class="${b.planned ? 'on planned' : 'off'}"></span>
                            <span class="${b.paid ? 'on paid' : 'off'}"></span>
                          </div>
                        ` : ''}
                      </div>

                      <div class="bill-right modern">
                        <div class="bill-amount">${money(b.amount)}</div>
                        <button class="icon-btn bill-menu-trigger" onclick="toggleBillMenu('${b.id}')" title="Bill actions">⋮</button>

                        ${b.showActionMenu ? `
                          <div class="bill-action-menu">
                            ${tracked ? `
                              <button onclick="toggleBillPlanned('${b.id}')">
                                <span>${b.planned ? '✓' : '○'}</span>
                                ${b.planned ? 'Mark unplanned' : 'Mark planned'}
                              </button>
                              <button onclick="toggleBillPaid('${b.id}')">
                                <span>${b.paid ? '✓' : '○'}</span>
                                ${b.paid ? 'Mark unpaid' : 'Mark paid'}
                              </button>
                            ` : ''}
                            <button onclick="editBill('${b.id}')"><span>✎</span>Edit</button>
                            <button class="danger" onclick="deleteBill('${b.id}')"><span>⌫</span>Delete</button>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="empty-state">No active bills</div>'}
    </div>
  `;
}

function renderBills(){
  const box = document.getElementById('bills');
  if (!box) return;
  if (!data.billDraft) data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  const d = data.billDraft;

  box.innerHTML = `
    <div class="bills-layout">
      <div class="bill-form-panel">
        <div class="panel-header">
          <h2>Add Bill</h2>
          <p>Create an annual or monthly bill card.</p>
        </div>

        ${data.billTemplates.length ? `
          <div class="bill-template-row">
            <select onchange="selectBillTemplate(this.value)">
              <option value="">Choose saved bill</option>
              ${data.billTemplates.map(t => `
                <option value="${t.id}" ${d.id === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${money(t.amount)})</option>
              `).join('')}
            </select>
          </div>
        ` : ''}

        <div class="bill-form-grid">
          <input type="text" placeholder="Bill name" value="${escapeHtml(d.name || '')}" oninput="updateBillDraft('name', this.value)">
          <input type="number" step="0.01" placeholder="Amount" value="${escapeHtml(d.amount || '')}" oninput="updateBillDraft('amount', this.value)">
          <select onchange="updateBillDraft('type', this.value)">
            <option value="Fortnightly" ${d.type === 'Fortnightly' ? 'selected' : ''}>Fortnightly</option>
            <option value="Monthly" ${d.type === 'Monthly' ? 'selected' : ''}>Monthly</option>
            <option value="Quarterly" ${d.type === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
            <option value="Annual" ${d.type === 'Annual' ? 'selected' : ''}>Annual</option>
          </select>
          <input type="date" value="${escapeHtml(d.dueDate || '')}" oninput="updateBillDraft('dueDate', this.value)">
        </div>

        <label class="bill-check-row">
          <input type="checkbox" ${d.recurring ? 'checked' : ''} onchange="updateBillDraft('recurring', this.checked)">
          Recurring
        </label>

        <div class="inline-expense-actions" style="margin-top:12px;">
          <button class="btn btn-primary" onclick="addBill()">Add Bill</button>
          <button class="btn btn-secondary save-template-btn" onclick="saveBillTemplate()" title="Save bill">💾</button>
          <button class="btn btn-secondary" onclick="clearBillDraft()">Cancel</button>
        </div>
      </div>

      <div class="bill-section-grid">
        ${renderBillSection('Fortnightly Bills', 'Fortnightly')}
        ${renderBillSection('Monthly Bills', 'Monthly')}
        ${renderBillSection('Quarterly Bills', 'Quarterly')}
        ${renderBillSection('Annual Bills', 'Annual')}
      </div>
    </div>
  `;
}

function render() {
  renderSummary();
  renderDashboard();
  renderBills();

  const box = document.getElementById('list');
  const activePays = data.pays
    .filter(p => !p.archived)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!activePays.length) {
    box.innerHTML = '<div class="card">No pay periods yet.</div>';
    return;
  }

  box.innerHTML = activePays.map(p => {
    const t = totals(p);
    const s = stat(t.rem);

    return `
      <div class="pay-card ${p.collapsed ? 'collapsed' : ''}">
        <div class="pay-stripe ${s[0] === 'g' ? 'ok' : s[0] === 'y' ? 'tight' : 'red'}"></div>
        <div class="pay-content">
          <div class="pay-head">
            <div style="min-width:0;">
              <div class="pay-date">${dateFmt(p.date)}</div>
              <div class="pay-note">${escapeHtml(p.note || 'No notes')}</div>
            </div>
            <div class="pay-head-right">
              <div class="badge ${s[0] === 'g' ? 'ok' : s[0] === 'y' ? 'tight' : 'red'}">${s[1]}</div>
              <button class="btn btn-secondary pay-toggle" onclick="toggleCollapse('${p.id}')" title="${p.collapsed ? 'Expand' : 'Collapse'}">
                ${p.collapsed ? '＋' : '－'}
              </button>
            </div>
          </div>

          <div class="money-grid">
            <div class="money-box">
              <div class="money-label">--> $</div>
              <span class="money-value">${money(p.pay)}</span>
            </div>
            <div class="money-box">
              <div class="money-label">$ --></div>
              <span class="money-value">${money(t.exp)}</span>
            </div>
            <div class="money-box">
              <div class="money-label">Remaining</div>
              <span class="money-value">${money(t.rem)}</span>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn btn-primary" onclick="addExp('${p.id}')">+ Expense</button>
            <button class="btn btn-secondary" onclick="closePay('${p.id}')">Close</button>
            <div class="menu-wrap">
              <button class="btn btn-secondary menu-btn" onclick="togglePayMenu('${p.id}')" title="More">⋯</button>
              ${openMenuPayId === p.id ? `
                <div class="menu-panel">
                  <button class="btn btn-secondary" onclick="editPay('${p.id}')">✏ Edit</button>
                  <button class="btn btn-danger" onclick="delPay('${p.id}')">✕ Delete</button>
                </div>
              ` : ''}
            </div>
          </div>

          ${p.showExpenseForm ? `
            <div class="inline-expense-form">
              ${data.templates.length ? `
                <div class="inline-expense-template-row">
                  <select onchange="applyExpenseTemplate('${p.id}', this.value)">
                    <option value="">Choose saved expense</option>
                    ${data.templates.map(t => `
                      <option value="${t.id}" ${p.selectedTemplateId === t.id ? 'selected' : ''}>
                        ${escapeHtml(t.name)} (${money(t.amount)})
                      </option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}

              <div class="inline-expense-grid">
                <input
                  type="text"
                  placeholder="Expense name"
                  value="${escapeHtml(p.newExpenseName || '')}"
                  oninput="updateExpenseDraft('${p.id}','newExpenseName', this.value)"
                >
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value="${escapeHtml(p.newExpenseAmount || '')}"
                  oninput="updateExpenseDraft('${p.id}','newExpenseAmount', this.value)"
                >
                <select onchange="updateExpenseDraft('${p.id}','newExpenseCat', this.value)">
                  <option value="Fixed" ${(p.newExpenseCat || 'Fixed') === 'Fixed' ? 'selected' : ''}>Fixed</option>
                  <option value="Variable" ${(p.newExpenseCat || '') === 'Variable' ? 'selected' : ''}>Variable</option>
                  <option value="Optional" ${(p.newExpenseCat || '') === 'Optional' ? 'selected' : ''}>Optional</option>
                  <option value="Buffer" ${(p.newExpenseCat || '') === 'Buffer' ? 'selected' : ''}>Buffer</option>
                </select>
              </div>
              <div class="inline-expense-actions">
                <button class="btn btn-primary" onclick="saveInlineExp('${p.id}')">Add Expense</button>
                <button class="btn btn-secondary save-template-btn" onclick="saveExpenseTemplate('${p.id}')" title="Save template">💾</button>
                <button class="btn btn-secondary" onclick="cancelAddExp('${p.id}')">Cancel</button>
              </div>
            </div>
          ` : ''}

          <div class="expenses-wrap">
            ${(p.expenses || []).length ? `
              <div class="expense-list">
                ${(p.expenses || []).map(e => `
                  <div class="expense-row ${e.paid ? 'paid' : ''}">
                    <div class="expense-left">
                      <div class="expense-name" title="${escapeHtml(e.name)}">${escapeHtml(e.name)}</div>
                      <div class="expense-cat">${escapeHtml(e.cat || '')}</div>
                    </div>

                    <div class="expense-right">
                      <div class="expense-amount">${money(e.amount)}</div>
                      <div class="expense-buttons">
                        <button class="btn tick ${e.paid ? 'paid' : 'btn-secondary'}" onclick="togglePaid('${p.id}','${e.id}')">${e.paid ? '✓' : '□'}</button>
                        <button class="btn btn-danger" onclick="delExp('${p.id}','${e.id}')">X</button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty-state">No expenses yet</div>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    storageKey: K,
    data
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bills-beta-budget-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      const imported = parsed && parsed.data ? parsed.data : parsed;

      if (!imported || typeof imported !== 'object') {
        alert('That file does not look like a valid budget backup.');
        return;
      }

      if (!Array.isArray(imported.pays)) imported.pays = [];
      if (!Array.isArray(imported.templates)) imported.templates = [];

      imported.pays.forEach(p => {
        if (typeof p.archived === 'undefined') p.archived = false;
        if (!Array.isArray(p.expenses)) p.expenses = [];
        p.expenses.forEach(exp => {
          if (typeof exp.paid === 'undefined') exp.paid = false;
        });
      });

      if (!confirm('Importing will replace the current data in this browser. Continue?')) {
        return;
      }

      data = imported;
      save();
      render();
      alert('Import complete.');
    } catch (err) {
      alert('Could not read that file as valid JSON.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

render();




let globalMenuOpen = false;

function toggleGlobalMenu(){
  globalMenuOpen = !globalMenuOpen;
  const el = document.getElementById('globalMenu');
  if (el) {
    el.style.display = globalMenuOpen ? 'grid' : 'none';
  }
}

document.addEventListener('click', function(event){
  const insideBottomMenu = event.target.closest('.bottom-bar .menu-wrap');
  if (insideBottomMenu) return;
  const el = document.getElementById('globalMenu');
  if (el && globalMenuOpen){
    globalMenuOpen = false;
    el.style.display = 'none';
  }
});
