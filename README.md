<div align="center">

# ⏱️ Dayflow — HRMS
### *Every workday, perfectly aligned.*

Dayflow is a beautiful, modern **Human Resources Management System** built for the Odoo Hackathon. It brings attendance, leave, payroll, and approvals into one seamless, visually stunning experience — no backend required.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-View_Project-4f46e5?style=for-the-badge)](https://arun-techy.github.io/Odoo-Hackathon/)
[![Built with](https://img.shields.io/badge/Built_with-HTML5_%7C_CSS3_%7C_JS-orange?style=flat-square)](#-technology-stack)
[![Three.js](https://img.shields.io/badge/3D-Three.js-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#-license)

</div>

---

## 📸 Preview

<div align="center">
  <img src="assets/screenshots/hero.png" alt="Dayflow Hero Section" width="80%">
  <br><br>
  <img src="assets/screenshots/dashboard.png" alt="Dayflow Dashboard" width="45%">
  <img src="assets/screenshots/day-ring.png" alt="The Day Ring Component" width="45%">
</div>

> 💡 Add your actual screenshots/GIFs to an `assets/screenshots/` folder and update the paths above — this makes the repo pop on GitHub.

---

## ✨ Features

| Module | Description |
|---|---|
| 🎨 **Stunning UI/UX** | Custom CSS animations, modern styling, 3D hero section (Three.js), and interactive tilt cards |
| 🔐 **Role-Based Access** | Distinct dashboards and permissions for `Employees` and `HR Officers (Admins)` |
| 🔵 **The "Day Ring"** | Signature circular UI component that visually tracks workday progress in real time |
| ⏰ **Attendance** | Clock in/out, daily logs, and visual presence tracking |
| 🌴 **Leave Management** | Apply for leave, track status, and approve/reject requests (Admin) |
| 💰 **Payroll** | Overview of basic pay, allowances, deductions, and net salary |
| 👤 **Profile** | View and edit personal information |

---

## 🛠️ Technology Stack

| Layer | Tech |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3 (Custom Properties, Flexbox/Grid, Animations), Vanilla JavaScript (ES6+) |
| **3D Graphics** | [Three.js](https://threejs.org/) — animated hero section |
| **Data Layer** | Client-side `localStorage` (mock database) via `js/data.js` — **zero backend needed** |
| **Deployment** | GitHub Pages |

---

## 🏁 Quick Start (Run Locally)

Since Dayflow runs entirely on `localStorage`, there's **no build step, no `npm install`, no database setup**.

```bash
# 1. Clone the repository
git clone https://github.com/Arun-techy/Odoo-Hackathon.git
cd Odoo-Hackathon

# 2. Open it — that's it!
# Just open index.html directly in your browser, or serve it locally:
python -m http.server 8000
# then visit http://localhost:8000
```

> ⚠️ Some browsers restrict `localStorage`/module scripts on `file://` URLs. If things don't load correctly, use a local server (like the Python command above, or the VS Code "Live Server" extension).

---

## 📂 Project Structure

```
Odoo-Hackathon/
├── index.html          # Landing / hero page
├── dashboard.html       # Employee & Admin dashboards
├── css/
│   ├── style.css        # Core styling & CSS variables
│   └── animations.css    # Custom animations
├── js/
│   ├── data.js           # Mock database (localStorage layer)
│   ├── auth.js            # Role-based access logic
│   ├── dayring.js          # Day Ring component logic
│   └── main.js              # App entry point
└── assets/
    └── screenshots/          # Preview images for this README
```

> 📝 Update this tree to match your actual file layout.

---

## 🧑‍💻 Usage

1. Open the app and log in as either an **Employee** or **HR Officer**.
2. Employees can clock in/out, apply for leave, and view their payroll & profile.
3. HR Officers get an admin view to approve/reject leave requests and monitor team attendance.
4. All data persists in your browser via `localStorage` — clear site data to reset the mock database.

---

## 🗺️ Roadmap

- [ ] Backend integration (Odoo API / REST)
- [ ] Real authentication (JWT / OAuth)
- [ ] Notifications for leave approvals
- [ ] Mobile-responsive polish
- [ ] Exportable payroll reports (PDF)

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo, open issues, or submit a pull request.

```bash
git checkout -b feature/your-feature-name
git commit -m "Add: your feature"
git push origin feature/your-feature-name
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Made with ❤️ for **Odoo Hackathon** by [Arun](https://github.com/Arun-techy)

</div>
