document.addEventListener('DOMContentLoaded', () => {
  const user = DF.requireAuth();
  if (!user) return;
  initShell();

  const isAdmin = user.role === 'admin';

  if (isAdmin) {
    document.getElementById('leaveTitle').textContent = 'Leave Approvals';
    document.getElementById('leaveSub').textContent = 'Review and act on employee requests';
    document.getElementById('applyBtn').style.display = 'none';
    document.getElementById('listTitle').textContent = 'All requests';
    document.getElementById('leaveTheadAdmin').style.display = 'table-header-group';
  } else {
    document.getElementById('leaveTheadEmp').style.display = 'table-header-group';
    document.getElementById('applyBtn').addEventListener('click', () => openModal('applyModal'));
  }

  document.getElementById('applyModal').addEventListener('click', (e) => {
    if (e.target.id === 'applyModal') closeModal('applyModal');
  });

  function renderStats(leaves) {
    const count = s => leaves.filter(l => l.status === s).length;
    const stats = [
      { label: 'Pending', val: count('pending'), tone: 'amber' },
      { label: 'Approved', val: count('approved'), tone: 'teal' },
      { label: 'Rejected', val: count('rejected'), tone: 'coral' }
    ];
    document.getElementById('leaveStats').innerHTML = stats.map(s => `
      <div class="card stat-card">
        <div class="stat-num" style="color:var(--flow-${s.tone});">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('');
  }

  function renderTable() {
    const leaves = isAdmin ? DF.getLeaves().slice().reverse() : DF.leavesFor(user.id).slice().reverse();
    renderStats(leaves);
    const tbody = document.getElementById('leaveTableBody');
    const empty = document.getElementById('leaveEmpty');

    if (!leaves.length) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = leaves.map(l => {
      if (isAdmin) {
        const emp = DF.findById(l.empId);
        return `
          <tr>
            <td>
              <div class="row-avatar">
                <img src="${emp ? emp.avatar : ''}" alt="">
                <div><div class="r-name">${emp ? emp.name : l.empId}</div><div class="r-sub">${l.empId}</div></div>
              </div>
            </td>
            <td>${l.type}</td>
            <td class="mono">${fmtDate(l.from)} – ${fmtDate(l.to)}</td>
            <td style="max-width:180px;">${l.remarks}</td>
            <td><span class="badge badge-${l.status}">${capitalize(l.status)}</span></td>
            <td>
              ${l.status === 'pending' ? `
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-sm btn-accent" onclick="decide('${l.id}','approved')">Approve</button>
                  <button class="btn btn-sm btn-danger" onclick="decide('${l.id}','rejected')">Reject</button>
                </div>` : `<span class="hint">${l.comment || '—'}</span>`}
            </td>
          </tr>`;
      } else {
        return `
          <tr>
            <td>${l.type}</td>
            <td class="mono">${fmtDate(l.from)}</td>
            <td class="mono">${fmtDate(l.to)}</td>
            <td style="max-width:220px;">${l.remarks}${l.comment ? `<div class="hint" style="margin-top:4px;">HR: ${l.comment}</div>` : ''}</td>
            <td><span class="badge badge-${l.status}">${capitalize(l.status)}</span></td>
          </tr>`;
      }
    }).join('');
  }

  window.decide = function(id, decision) {
    const leaves = DF.getLeaves();
    const l = leaves.find(x => x.id === id);
    if (!l) return;
    l.status = decision;
    l.comment = decision === 'approved' ? 'Approved by HR.' : 'Rejected — please discuss with HR.';
    DF.saveLeaves(leaves);
    toast(`Request ${decision}`, decision === 'approved' ? 'success' : 'error');
    renderTable();
  };

  document.getElementById('applyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.to.value < f.from.value) { toast('"To" date must be after "From" date', 'error'); return; }
    const leaves = DF.getLeaves();
    const id = 'LV-' + String(leaves.length + 1).padStart(3, '0');
    leaves.push({
      id, empId: user.id, type: f.type.value, from: f.from.value, to: f.to.value,
      remarks: f.remarks.value, status: 'pending', appliedOn: todayISO()
    });
    DF.saveLeaves(leaves);
    toast('Leave request submitted', 'success');
    closeModal('applyModal');
    f.reset();
    renderTable();
  });

  renderTable();
});
