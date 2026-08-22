/* =========================================================
   DAYFLOW — common.js
   Shared across every authenticated page: sidebar user card,
   active-nav highlight, logout, toast, the Day Ring renderer,
   and the top "flow bar".
   ========================================================= */

function initShell() {
  const user = DF.currentUser();
  if (!user) { window.location.href = 'index.html'; return null; }

  // Highlight active nav link based on current file name
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  // Role-aware dashboard link (used on shared pages like profile/attendance/leave/payroll)
  const navDash = document.getElementById('navDashboard');
  if (navDash) {
    navDash.href = user.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
    if (current === navDash.getAttribute('href')) navDash.classList.add('active');
  }
  const navLeaveLabel = document.getElementById('navLeaveLabel');
  if (navLeaveLabel) navLeaveLabel.textContent = user.role === 'admin' ? 'Leave Approvals' : 'Leave';

  // Populate sidebar user card
  const nameEl = document.querySelector('[data-user-name]');
  const roleEl = document.querySelector('[data-user-role]');
  const avatarEl = document.querySelector('[data-user-avatar]');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'HR Officer' : user.designation;
  if (avatarEl) avatarEl.src = user.avatar;

  // Logout
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', () => {
      DF.clearSession();
      window.location.href = 'index.html';
    });
  });

  renderFlowBar();

  const sideRing = document.getElementById('sideRing');
  if (sideRing) {
    const now = new Date();
    const pct = Math.max(4, Math.min(100, ((now.getHours()*60+now.getMinutes()) - 540) / 540 * 100));
    renderDayRing(sideRing, { percent: pct });
  }

  return user;
}

/* ---- Flow bar: represents today's position between 9AM–6PM ---- */
function renderFlowBar() {
  const bar = document.querySelector('.flow-bar-fill');
  if (!bar) return;
  const now = new Date();
  const startMin = 9 * 60, endMin = 18 * 60;
  const curMin = now.getHours() * 60 + now.getMinutes();
  let pct = ((curMin - startMin) / (endMin - startMin)) * 100;
  pct = Math.max(4, Math.min(100, pct));
  requestAnimationFrame(() => { bar.style.width = pct + '%'; });
}

/* ---- Day Ring: circular SVG progress used across dashboard/attendance ---- */
function renderDayRing(el, { percent = 0, timeLabel = '', subLabel = 'Today' } = {}) {
  const size = el.classList.contains('day-ring-mini') ? 30 : 148;
  const stroke = el.classList.contains('day-ring-mini') ? 4 : 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;

  el.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="dawnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E8A33D"/>
          <stop offset="100%" stop-color="#2F8F82"/>
        </linearGradient>
      </defs>
      <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}"></circle>
      <circle class="fill" cx="${size/2}" cy="${size/2}" r="${r}"
        stroke-dasharray="${c}" stroke-dashoffset="${c}"></circle>
    </svg>
    ${!el.classList.contains('day-ring-mini') ? `
    <div class="day-ring-center">
      <div class="rc-time">${timeLabel}</div>
      <div class="rc-label">${subLabel}</div>
    </div>` : ''}
  `;
  const fillCircle = el.querySelector('circle.fill');
  requestAnimationFrame(() => {
    setTimeout(() => { fillCircle.style.strokeDashoffset = offset; }, 60);
  });
}

/* ---- Toasts ---- */
function toast(message, type = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ---- Modal helper ---- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ---- Small format helpers ---- */
function fmtCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---- Card tilt: subtle mouse-follow 3D tilt on every .card, everywhere ---- */
function initCardTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return; // skip touch devices

  const MAX_DEG = 6;

  document.querySelectorAll('.card').forEach(card => {
    let frame = null;

    card.addEventListener('mousemove', (e) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * MAX_DEG * 2;
        const ry = (px - 0.5) * MAX_DEG * 2;

        card.classList.add('tilting');
        card.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
        card.style.setProperty('--glow-x', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--glow-y', (py * 100).toFixed(1) + '%');
      });
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('tilting');
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}

document.addEventListener('DOMContentLoaded', initCardTilt);
