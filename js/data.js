/* =========================================================
   DAYFLOW — data.js
   Mock "database" backed by localStorage. In a real system
   this layer would be swapped for API calls; every function
   here keeps that same shape (get/save) so the swap is a
   one-file job.
   ========================================================= */

const DB_KEYS = {
  users: 'df_users',
  attendance: 'df_attendance',
  leaves: 'df_leaves',
  seeded: 'df_seeded_v1'
};

function avatarFor(seed) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f0f2f6`;
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;

  const users = [
    {
      id: 'EMP-1001', role: 'admin', name: 'Pavaimalar R.', email: 'pavaimalar@dayflow.hr',
      password: 'Admin@123', designation: 'HR Officer', department: 'Human Resources',
      joined: '2019-06-10', phone: '+91 98765 43210', address: 'Karur, Tamil Nadu',
      salary: { basic: 42000, hra: 12000, allowance: 6000, deductions: 4200 },
      avatar: avatarFor('Pavaimalar')
    },
    {
      id: 'EMP-1002', role: 'employee', name: 'Arun M', email: 'arun@dayflow.hr',
      password: 'Arun@123', designation: 'Software Engineer', department: 'Engineering',
      joined: '2022-01-14', phone: '+91 90000 11122', address: 'Trichy, Tamil Nadu',
      salary: { basic: 32000, hra: 9000, allowance: 4000, deductions: 3100 },
      avatar: avatarFor('Arun')
    },
    {
      id: 'EMP-1003', role: 'employee', name: 'Srihari A', email: 'srihari@dayflow.hr',
      password: 'Srihari@123', designation: 'QA Analyst', department: 'Engineering',
      joined: '2021-08-02', phone: '+91 90000 22233', address: 'Karur, Tamil Nadu',
      salary: { basic: 30000, hra: 8500, allowance: 3500, deductions: 2900 },
      avatar: avatarFor('Srihari')
    },
    {
      id: 'EMP-1004', role: 'employee', name: 'Aakash M', email: 'aakash@dayflow.hr',
      password: 'Aakash@123', designation: 'UI/UX Designer', department: 'Design',
      joined: '2023-03-20', phone: '+91 90000 33344', address: 'Coimbatore, Tamil Nadu',
      salary: { basic: 28000, hra: 8000, allowance: 3000, deductions: 2600 },
      avatar: avatarFor('Aakash')
    }
  ];

  const attendance = [];
  const statuses = ['present', 'present', 'present', 'present', 'half', 'absent', 'leave'];
  users.forEach(u => {
    for (let i = 20; i >= 1; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      attendance.push({
        empId: u.id,
        date: day.toISOString().slice(0, 10),
        status,
        checkIn: status === 'present' || status === 'half' ? '09:2' + Math.floor(Math.random()*9) : null,
        checkOut: status === 'present' ? '18:0' + Math.floor(Math.random()*9) : (status === 'half' ? '13:30' : null)
      });
    }
    // today: no entry yet (fresh check-in demo)
  });

  const leaves = [
    { id: 'LV-001', empId: 'EMP-1002', type: 'Sick', from: todayISO(2), to: todayISO(3), remarks: 'Fever, need rest', status: 'pending', appliedOn: todayISO(-1) },
    { id: 'LV-002', empId: 'EMP-1003', type: 'Paid', from: todayISO(-6), to: todayISO(-5), remarks: 'Family function', status: 'approved', appliedOn: todayISO(-9), comment: 'Approved, enjoy!' },
    { id: 'LV-003', empId: 'EMP-1004', type: 'Unpaid', from: todayISO(-12), to: todayISO(-12), remarks: 'Personal work', status: 'rejected', appliedOn: todayISO(-14), comment: 'Sprint deadline week, please reschedule' }
  ];

  localStorage.setItem(DB_KEYS.users, JSON.stringify(users));
  localStorage.setItem(DB_KEYS.attendance, JSON.stringify(attendance));
  localStorage.setItem(DB_KEYS.leaves, JSON.stringify(leaves));
  localStorage.setItem(DB_KEYS.seeded, '1');
}

const DF = {
  getUsers() { return JSON.parse(localStorage.getItem(DB_KEYS.users) || '[]'); },
  saveUsers(u) { localStorage.setItem(DB_KEYS.users, JSON.stringify(u)); },
  findUser(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); },
  findById(id) { return this.getUsers().find(u => u.id === id); },

  getAttendance() { return JSON.parse(localStorage.getItem(DB_KEYS.attendance) || '[]'); },
  saveAttendance(a) { localStorage.setItem(DB_KEYS.attendance, JSON.stringify(a)); },
  attendanceFor(empId) { return this.getAttendance().filter(a => a.empId === empId); },

  getLeaves() { return JSON.parse(localStorage.getItem(DB_KEYS.leaves) || '[]'); },
  saveLeaves(l) { localStorage.setItem(DB_KEYS.leaves, JSON.stringify(l)); },
  leavesFor(empId) { return this.getLeaves().filter(l => l.empId === empId); },

  currentUser() {
    const raw = sessionStorage.getItem('df_session');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(user) { sessionStorage.setItem('df_session', JSON.stringify(user)); },
  clearSession() { sessionStorage.removeItem('df_session'); },

  requireAuth(requiredRole) {
    const u = this.currentUser();
    if (!u) { window.location.href = 'index.html'; return null; }
    if (requiredRole && u.role !== requiredRole) {
      window.location.href = u.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
      return null;
    }
    return u;
  }
};

seedIfNeeded();
