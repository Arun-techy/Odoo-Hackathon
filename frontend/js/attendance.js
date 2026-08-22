document.addEventListener('DOMContentLoaded', () => {
  const user = DF.requireAuth();
  if (!user) return;
  initShell();

  const isAdmin = user.role === 'admin';
  let viewedEmpId = user.id;

  const employees = DF.getUsers().filter(u => u.role === 'employee');

  if (isAdmin) {
    document.getElementById('attSub').textContent = 'Viewing attendance for all employees';
    document.getElementById('selfCheckCard').style.display = 'none';
    const sel = document.getElementById('empSwitcher');
    sel.style.display = 'block';
    sel.innerHTML = employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    viewedEmpId = employees[0]?.id;
    sel.addEventListener('change', () => { viewedEmpId = sel.value; renderAll(); });
  }

  const dows = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  document.getElementById('calDow').innerHTML = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

  function renderCalendar(empId) {
    const records = DF.attendanceFor(empId);
    const map = {};
    records.forEach(r => map[r.date] = r.status);

    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = todayISO();

    let cells = '';
    for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const status = map[dateStr];
      let cls = 'future';
      if (dateStr <= todayStr) cls = status || (new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6 ? 'future' : 'absent');
      cells += `<div class="cal-cell ${cls}" title="${dateStr}">${d}${cls !== 'future' ? '<span class=\"dot\"></span>' : ''}</div>`;
    }
    document.getElementById('calGrid').innerHTML = cells;
  }

  function renderWeekTable(empId) {
    const records = DF.attendanceFor(empId).slice(-7).reverse();
    const tbody = document.getElementById('weekTableBody');
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-3); padding:24px 0;">No records yet</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map(r => `
      <tr>
        <td>${fmtDay(r.date)}</td>
        <td class="mono">${fmtDate(r.date)}</td>
        <td><span class="badge badge-${r.status}">${capitalize(r.status)}</span></td>
        <td class="mono">${r.checkIn || '—'}</td>
        <td class="mono">${r.checkOut || '—'}</td>
      </tr>
    `).join('');
  }

  function renderSelfCheck() {
    if (isAdmin) return;
    const today = todayISO();
    let rec = DF.attendanceFor(user.id).find(r => r.date === today);
    const ring = document.getElementById('attRing');
    const statusLine = document.getElementById('attStatusLine');
    const btn = document.getElementById('attCheckBtn');

    function paint() {
      if (!rec) {
        renderDayRing3D(ring, { percent: 0, timeLabel: '--:--', subLabel: 'Pending' });
        statusLine.textContent = 'Not checked in';
        btn.textContent = 'Check in';
      } else if (!rec.checkOut) {
        renderDayRing3D(ring, { percent: 55, timeLabel: rec.checkIn, subLabel: 'In progress' });
        statusLine.textContent = 'Checked in at ' + rec.checkIn;
        btn.textContent = 'Check out';
      } else {
        renderDayRing3D(ring, { percent: 100, timeLabel: rec.checkOut, subLabel: 'Complete' });
        statusLine.textContent = `In ${rec.checkIn} · Out ${rec.checkOut}`;
        btn.disabled = true; btn.textContent = 'Done for today';
      }
    }
    btn.onclick = () => {
      const all = DF.getAttendance();
      const now = new Date().toTimeString().slice(0,5);
      if (!rec) {
        rec = { empId: user.id, date: today, status: 'present', checkIn: now, checkOut: null };
        all.push(rec);
        toast('Checked in at ' + now, 'success');
      } else if (!rec.checkOut) {
        rec.checkOut = now;
        toast('Checked out at ' + now, 'success');
      }
      DF.saveAttendance(all);
      paint();
      renderWeekTable(user.id);
      renderCalendar(user.id);
    };
    paint();
  }

  function renderAll() {
    renderCalendar(viewedEmpId);
    renderWeekTable(viewedEmpId);
  }

  renderAll();
  renderSelfCheck();
});
