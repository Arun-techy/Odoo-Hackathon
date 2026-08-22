document.addEventListener('DOMContentLoaded', () => {
  const user = DF.requireAuth('employee');
  if (!user) return;
  initShell();

  document.getElementById('greetName').textContent = `, ${user.name.split(' ')[0]}`;
  document.getElementById('dateLine').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const today = todayISO();
  let records = DF.attendanceFor(user.id);
  let todayRecord = records.find(r => r.date === today);

  function paintRing() {
    const ring = document.getElementById('mainRing');
    const statusLine = document.getElementById('statusLine');
    const inOutLine = document.getElementById('inOutLine');
    const checkBtn = document.getElementById('checkBtn');

    if (!todayRecord) {
      renderDayRing3D(ring, { percent: 0, timeLabel: '--:--', subLabel: 'Not started' });
      statusLine.textContent = 'Not checked in yet';
      inOutLine.textContent = 'Tap "Check in" above to start the ring.';
      checkBtn.textContent = 'Check in';
      checkBtn.classList.remove('btn-danger'); checkBtn.classList.add('btn-accent');
    } else if (!todayRecord.checkOut) {
      const [h, m] = todayRecord.checkIn.split(':').map(Number);
      const now = new Date();
      const elapsedMin = (now.getHours()*60+now.getMinutes()) - (h*60+m);
      const pct = Math.max(4, Math.min(100, (elapsedMin/540)*100));
      renderDayRing3D(ring, { percent: pct, timeLabel: todayRecord.checkIn, subLabel: 'Checked in' });
      statusLine.textContent = 'Currently checked in';
      inOutLine.textContent = `In at ${todayRecord.checkIn} · shift in progress`;
      checkBtn.textContent = 'Check out';
      checkBtn.classList.remove('btn-accent'); checkBtn.classList.add('btn-danger');
    } else {
      renderDayRing3D(ring, { percent: 100, timeLabel: todayRecord.checkOut, subLabel: 'Day complete' });
      statusLine.textContent = 'Shift complete for today';
      inOutLine.textContent = `In ${todayRecord.checkIn} · Out ${todayRecord.checkOut}`;
      checkBtn.textContent = 'Checked out';
      checkBtn.disabled = true;
    }
  }

  document.getElementById('checkBtn').addEventListener('click', () => {
    const all = DF.getAttendance();
    const now = new Date();
    const timeStr = now.toTimeString().slice(0,5);

    if (!todayRecord) {
      todayRecord = { empId: user.id, date: today, status: 'present', checkIn: timeStr, checkOut: null };
      all.push(todayRecord);
      toast('Checked in at ' + timeStr, 'success');
    } else if (!todayRecord.checkOut) {
      todayRecord.checkOut = timeStr;
      toast('Checked out at ' + timeStr, 'success');
    }
    DF.saveAttendance(all);
    paintRing();
    renderActivity();
  });

  function renderActivity() {
    const wrap = document.getElementById('activityList');
    const recentAtt = DF.attendanceFor(user.id).slice(-3).reverse();
    const recentLeave = DF.leavesFor(user.id).slice(-2).reverse();
    const items = [];

    recentLeave.forEach(l => items.push({
      icon: '📝', text: `${l.type} leave (${fmtDate(l.from)} – ${fmtDate(l.to)})`,
      badge: l.status, date: l.appliedOn
    }));
    recentAtt.forEach(a => items.push({
      icon: '⏱', text: `Marked ${a.status} on ${fmtDate(a.date)}`,
      badge: a.status, date: a.date
    }));

    items.sort((a,b) => b.date.localeCompare(a.date));

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:20px 0;"><div class="es-title">No activity yet</div><div class="es-sub">Check in or apply for leave to see it here.</div></div>`;
      return;
    }

    wrap.innerHTML = items.slice(0,5).map(it => `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:34px;height:34px;border-radius:10px;background:var(--paper);display:flex;align-items:center;justify-content:center;font-size:15px;">${it.icon}</div>
        <div style="flex:1;">
          <div style="font-size:13.5px; font-weight:500;">${it.text}</div>
          <div style="font-size:11.5px; color:var(--text-3);">${fmtDate(it.date)}</div>
        </div>
        <span class="badge badge-${it.badge}">${capitalize(it.badge)}</span>
      </div>
    `).join('');
  }

  function renderMiniStats() {
    const wrap = document.getElementById('miniStats');
    const recs = DF.attendanceFor(user.id).slice(-14);
    const count = s => recs.filter(r => r.status === s).length;
    const tally = [
      { label: 'Present', val: count('present'), tone: 'teal' },
      { label: 'Half day', val: count('half'), tone: 'violet' },
      { label: 'Absent', val: count('absent'), tone: 'coral' },
      { label: 'On leave', val: count('leave'), tone: 'amber' }
    ];
    wrap.innerHTML = tally.map(t => `
      <div class="stat-card">
        <div class="stat-num" style="color:var(--flow-${t.tone});">${t.val}</div>
        <div class="stat-label">${t.label}</div>
      </div>
    `).join('');
  }

  paintRing();
  renderActivity();
  renderMiniStats();
});
