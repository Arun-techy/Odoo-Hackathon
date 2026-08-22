/* =========================================================
   DAYFLOW — auth.js
   Handles the login and signup forms. Password rules,
   "email verification" and error states are simulated
   client-side against the localStorage user store.
   ========================================================= */

function showBanner(el, msg, kind) {
  el.textContent = msg;
  el.className = `banner ${kind} show`;
}

function validatePassword(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw)
  };
}

/* ---------------- LOGIN ---------------- */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  const banner = document.getElementById('loginBanner');

  // Redirect if already logged in
  const existing = DF.currentUser();
  if (existing) {
    window.location.href = existing.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    const btn = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Signing in…';

    setTimeout(() => {
      const user = DF.findUser(email);
      if (!user || user.password !== password) {
        showBanner(banner, 'Incorrect email or password. Please try again.', 'err');
        btn.disabled = false;
        btn.textContent = 'Sign in';
        form.closest('.auth-card').style.animation = 'none';
        void form.offsetWidth;
        form.closest('.auth-card').style.animation = 'shakeX .4s ease';
        return;
      }
      DF.setSession(user);
      showBanner(banner, 'Welcome back — redirecting…', 'ok');
      setTimeout(() => {
        window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
      }, 500);
    }, 500);
  });

  // Demo quick-fill chips
  document.querySelectorAll('[data-demo]').forEach(chip => {
    chip.addEventListener('click', () => {
      const kind = chip.getAttribute('data-demo');
      if (kind === 'admin') { form.email.value = 'pavaimalar@dayflow.hr'; form.password.value = 'Admin@123'; }
      else { form.email.value = 'arun@dayflow.hr'; form.password.value = 'Arun@123'; }
    });
  });
}

/* ---------------- SIGNUP ---------------- */
function initSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  const banner = document.getElementById('signupBanner');
  const pwInput = form.password;
  const rules = document.querySelectorAll('[data-rule]');

  pwInput.addEventListener('input', () => {
    const res = validatePassword(pwInput.value);
    rules.forEach(r => {
      const key = r.getAttribute('data-rule');
      r.classList.toggle('ok', !!res[key]);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const empId = form.empId.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const role = form.querySelector('input[name="role"]:checked').value;

    const res = validatePassword(password);
    const allValid = Object.values(res).every(Boolean);

    if (!allValid) {
      showBanner(banner, 'Password does not meet the security requirements below.', 'err');
      return;
    }
    if (DF.findUser(email)) {
      showBanner(banner, 'An account with this email already exists.', 'err');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating account…';

    setTimeout(() => {
      const users = DF.getUsers();
      const newUser = {
        id: empId || `EMP-${1000 + users.length + 1}`,
        role, name, email, password,
        designation: role === 'admin' ? 'HR Officer' : 'Employee',
        department: 'General', joined: new Date().toISOString().slice(0, 10),
        phone: '', address: '',
        salary: { basic: 25000, hra: 6000, allowance: 2000, deductions: 2000 },
        avatar: avatarFor(name || email)
      };
      users.push(newUser);
      DF.saveUsers(users);

      showBanner(banner, 'Account created! Verification email sent (simulated) — redirecting to sign in…', 'ok');
      setTimeout(() => { window.location.href = 'index.html'; }, 1400);
    }, 700);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initSignupForm();
});
