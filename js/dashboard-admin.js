document.addEventListener('DOMContentLoaded', () => {
  const user = DF.requireAuth('admin');
  if (!user) return;
  initShell();

  document.getElementById('dateLine').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const today = todayISO();
  const employees = DF.getUsers().filter(u => u.role === 'employee');
  const allAttendance = DF.getAttendance();
  const allLeaves = DF.getLeaves();

  function todayStatusFor(empId) {
    const rec = allAttendance.find(a => a.empId === empId && a.date === today);
    return rec ? rec.status : 'absent';
  }

  function netSalary(u) {
    const s = u.salary;
    return s.basic + s.hra + s.allowance - s.deductions;
  }

  function renderStats() {
    const presentToday = employees.filter(e => todayStatusFor(e.id) === 'present').length;
    const pendingCount = allLeaves.filter(l => l.status === 'pending').length;
    const payrollTotal = employees.reduce((sum, e) => sum + netSalary(e), 0);

    const cards = [
      { label: 'Total employees', val: employees.length, tone: 'teal' },
      { label: 'Present today', val: `${presentToday}/${employees.length}`, tone: 'amber' },
      { label: 'Pending approvals', val: pendingCount, tone: 'violet' },
      { label: 'Monthly payroll', val: fmtCurrency(payrollTotal), tone: 'coral' }
    ];
    document.getElementById('statCards').innerHTML = cards.map((c,i) => `
      <div class="card stat-card stagger-${i+1}" style="animation:riseIn .5s cubic-bezier(.2,.8,.2,1) both; animation-delay:${i*0.05}s;">
        <div class="stat-num" style="color:var(--flow-${c.tone});">${c.val}</div>
        <div class="stat-label">${c.label}</div>
      </div>
    `).join('');
  }

  function renderEmployeeTable() {
    document.getElementById('empCount').textContent = `${employees.length} total`;
    document.getElementById('empTableBody').innerHTML = employees.map(e => `
      <tr>
        <td>
          <div class="row-avatar">
            <img src="${e.avatar}" alt="">
            <div><div class="r-name">${e.name}</div><div class="r-sub">${e.id}</div></div>
          </div>
        </td>
        <td>${e.department}</td>
        <td><span class="badge badge-${todayStatusFor(e.id)}">${capitalize(todayStatusFor(e.id))}</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="viewEmployee('${e.id}')">View</button></td>
      </tr>
    `).join('');
  }

  function renderPendingLeaves() {
    const pending = allLeaves.filter(l => l.status === 'pending');
    const wrap = document.getElementById('pendingLeaveList');
    if (!pending.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:24px 0;">
        <div class="es-title">All caught up</div>
        <div class="es-sub">No pending leave requests right now.</div>
      </div>`;
      return;
    }
    wrap.innerHTML = pending.map(l => {
      const emp = DF.findById(l.empId);
      return `
      <div style="border:1px solid var(--border-soft); border-radius:12px; padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <div style="font-weight:600; font-size:13.5px;">${emp ? emp.name : l.empId}</div>
            <div style="font-size:12px; color:var(--text-2); margin-top:2px;">${l.type} · ${fmtDate(l.from)} – ${fmtDate(l.to)}</div>
          </div>
          <span class="badge badge-pending">Pending</span>
        </div>
        <div style="font-size:12.5px; color:var(--text-2); margin:10px 0;">"${l.remarks}"</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-accent" style="flex:1;" onclick="decideLeave('${l.id}','approved')">Approve</button>
          <button class="btn btn-sm btn-danger" style="flex:1;" onclick="decideLeave('${l.id}','rejected')">Reject</button>
        </div>
      </div>`;
    }).join('');
  }

  window.viewEmployee = function(empId) {
    const e = DF.findById(empId);
    if (!e) return;
    const modalBody = document.getElementById('empModalBody');
    modalBody.innerHTML = `
      <div style="display:flex; gap:14px; align-items:center; margin-bottom:18px;">
        <img class="avatar-lg" src="${e.avatar}" style="width:64px;height:64px;">
        <div>
          <h3>${e.name}</h3>
          <div class="sub" style="margin:0;">${e.id} · <span class="badge badge-${todayStatusFor(e.id)}">${capitalize(todayStatusFor(e.id))} today</span></div>
        </div>
      </div>
      <form id="editEmpForm">
        <div class="grid grid-2" style="gap:14px;">
          <div class="field"><label>Designation</label><input name="designation" value="${e.designation}"></div>
          <div class="field"><label>Department</label><input name="department" value="${e.department}"></div>
          <div class="field"><label>Phone</label><input name="phone" value="${e.phone || ''}"></div>
          <div class="field"><label>Basic pay</label><input name="basic" type="number" value="${e.salary.basic}"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal('empModal')">Close</button>
          <button type="submit" class="btn btn-primary">Save changes</button>
        </div>
      </form>
    `;
    modalBody.querySelector('#editEmpForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = ev.target;
      const users = DF.getUsers();
      const target = users.find(u => u.id === empId);
      target.designation = f.designation.value;
      target.department = f.department.value;
      target.phone = f.phone.value;
      target.salary.basic = Number(f.basic.value);
      DF.saveUsers(users);
      toast('Employee details updated', 'success');
      closeModal('empModal');
      Object.assign(e, target);
      renderEmployeeTable();
      renderStats();
    });
    openModal('empModal');
  };

  window.decideLeave = function(leaveId, decision) {
    const leaves = DF.getLeaves();
    const l = leaves.find(x => x.id === leaveId);
    if (!l) return;
    l.status = decision;
    l.comment = decision === 'approved' ? 'Approved by HR.' : 'Rejected — please discuss with HR.';
    DF.saveLeaves(leaves);
    toast(`Leave ${decision} for ${DF.findById(l.empId)?.name || l.empId}`, decision === 'approved' ? 'success' : 'error');
    allLeaves.length = 0; allLeaves.push(...leaves);
    renderStats();
    renderPendingLeaves();
  };

  document.getElementById('empModal').addEventListener('click', (e) => {
    if (e.target.id === 'empModal') closeModal('empModal');
  });

  renderStats();
  renderEmployeeTable();
  renderPendingLeaves();
});
