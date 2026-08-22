document.addEventListener('DOMContentLoaded', () => {
  const user = DF.requireAuth();
  if (!user) return;
  initShell();

  const isAdmin = user.role === 'admin';
  const employees = DF.getUsers().filter(u => u.role === 'employee');
  let viewedEmpId = isAdmin ? employees[0]?.id : user.id;

  if (isAdmin) {
    document.getElementById('payTitle').textContent = 'Payroll Management';
    document.getElementById('paySub').textContent = 'Update salary structures and review payslips';
    document.getElementById('salaryHint').textContent = 'Editable — changes apply immediately';
    document.getElementById('editSalaryForm').style.display = 'block';
    document.getElementById('orgPayrollCard').style.display = 'block';

    const sel = document.getElementById('empSwitcher');
    sel.style.display = 'block';
    sel.innerHTML = employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    sel.addEventListener('change', () => { viewedEmpId = sel.value; renderAll(); });
  }

  function netSalary(s) { return s.basic + s.hra + s.allowance - s.deductions; }

  function renderSalary() {
    const emp = DF.findById(viewedEmpId);
    if (!emp) return;
    const s = emp.salary;
    const rows = [
      ['Basic pay', s.basic, false], ['HRA', s.hra, false],
      ['Allowances', s.allowance, false], ['Deductions', s.deductions, true]
    ];
    document.getElementById('salaryList').innerHTML = rows.map(([label, val, neg]) => `
      <div style="display:flex; justify-content:space-between; font-size:13.5px;">
        <span style="color:var(--text-2);">${label}</span>
        <span class="mono" style="font-weight:600; color:${neg ? 'var(--flow-coral)' : 'var(--text-1)'};">${neg ? '-' : ''}${fmtCurrency(val)}</span>
      </div>
    `).join('');
    document.getElementById('netPay').textContent = fmtCurrency(netSalary(s));

    if (isAdmin) {
      const f = document.getElementById('editSalaryForm');
      f.basic.value = s.basic; f.hra.value = s.hra; f.allowance.value = s.allowance; f.deductions.value = s.deductions;
    }
  }

  function renderPayslips() {
    const emp = DF.findById(viewedEmpId);
    const months = ['This month', 'Last month', 'Two months ago'];
    document.getElementById('payslipList').innerHTML = months.map((m, i) => `
      <div style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border-soft); border-radius:10px;">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--paper);display:flex;align-items:center;justify-content:center;font-size:16px;">🧾</div>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:13.5px;">${m} payslip</div>
          <div style="font-size:11.5px; color:var(--text-3);">${emp.id} · Net ${fmtCurrency(netSalary(emp.salary))}</div>
        </div>
        <span class="badge badge-approved">Paid</span>
      </div>
    `).join('');
  }

  function renderOrgTable() {
    if (!isAdmin) return;
    document.getElementById('orgPayrollBody').innerHTML = employees.map(e => `
      <tr>
        <td>
          <div class="row-avatar">
            <img src="${e.avatar}" alt="">
            <div><div class="r-name">${e.name}</div><div class="r-sub">${e.id}</div></div>
          </div>
        </td>
        <td class="mono">${fmtCurrency(e.salary.basic)}</td>
        <td class="mono">${fmtCurrency(e.salary.hra)}</td>
        <td class="mono" style="color:var(--flow-coral);">-${fmtCurrency(e.salary.deductions)}</td>
        <td class="mono" style="font-weight:700;">${fmtCurrency(netSalary(e.salary))}</td>
      </tr>
    `).join('');
  }

  if (isAdmin) {
    document.getElementById('editSalaryForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const users = DF.getUsers();
      const target = users.find(u => u.id === viewedEmpId);
      target.salary = {
        basic: Number(f.basic.value), hra: Number(f.hra.value),
        allowance: Number(f.allowance.value), deductions: Number(f.deductions.value)
      };
      DF.saveUsers(users);
      toast(`Salary structure updated for ${target.name}`, 'success');
      employees.splice(0, employees.length, ...DF.getUsers().filter(u => u.role === 'employee'));
      renderAll();
    });
  }

  function renderAll() {
    renderSalary();
    renderPayslips();
    renderOrgTable();
  }
  renderAll();
});
