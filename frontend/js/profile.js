document.addEventListener('DOMContentLoaded', () => {
  const user = DF.requireAuth();
  if (!user) return;
  initShell();

  const fresh = DF.findById(user.id) || user;

  document.getElementById('pAvatar').src = fresh.avatar;
  document.getElementById('pName').textContent = fresh.name;
  document.getElementById('pDesignation').textContent = fresh.designation;
  document.getElementById('pId').textContent = fresh.id;
  document.getElementById('pDept').textContent = fresh.department;
  document.getElementById('pJoined').textContent = fmtDate(fresh.joined);

  const form = document.getElementById('personalForm');
  form.name.value = fresh.name;
  form.email.value = fresh.email;
  form.phone.value = fresh.phone || '';
  form.address.value = fresh.address || '';

  document.getElementById('jDesignation').textContent = fresh.designation;
  document.getElementById('jDepartment').textContent = fresh.department;

  const s = fresh.salary;
  const items = [
    ['Basic pay', s.basic], ['HRA', s.hra], ['Allowances', s.allowance], ['Deductions', -s.deductions]
  ];
  document.getElementById('salaryBreakdown').innerHTML = items.map(([label, val]) => `
    <div style="display:flex; justify-content:space-between; padding:10px 12px; background:var(--paper); border-radius:10px; font-size:13px;">
      <span style="color:var(--text-2);">${label}</span>
      <span style="font-family:var(--f-mono); font-weight:600; color:${val < 0 ? 'var(--flow-coral)' : 'var(--text-1)'};">${val < 0 ? '-' : ''}${fmtCurrency(Math.abs(val))}</span>
    </div>
  `).join('');

  // Tabs
  document.querySelectorAll('#profileTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#profileTabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['personal','job','docs'].forEach(t => {
        document.getElementById('tab-' + t).style.display = (t === btn.dataset.tab) ? 'block' : 'none';
      });
    });
  });

  // Avatar upload preview (client-side only)
  document.getElementById('avatarUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('pAvatar').src = ev.target.result;
      const users = DF.getUsers();
      const u = users.find(x => x.id === fresh.id);
      u.avatar = ev.target.result;
      DF.saveUsers(users);
      toast('Profile photo updated', 'success');
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const users = DF.getUsers();
    const u = users.find(x => x.id === fresh.id);
    u.phone = form.phone.value;
    u.address = form.address.value;
    DF.saveUsers(users);
    toast('Profile updated successfully', 'success');
  });
});
