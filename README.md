# DIGENZ — Digital • Creative • Services

Official repository for **DIGENZ**, a modern digital services and freelancing agency offering web development, software development, graphic design, and digital marketing solutions.

---

## 🌟 Features

- **Luxury Modern Brand Aesthetic:** Black, gold, and white premium color scheme with custom SVG branding and responsive typography.
- **Full Public Website:** 54+ high-conversion service pages, portfolio galleries, pricing packages, contact and quote inquiry forms.
- **Integrated Admin Dashboard (`/admin/`):**
  - **Live Metrics & Analytics:** Revenue, active orders, leads, and customer statistics.
  - **Products & Packages Management:** Full CRUD with pricing, features, categories, and image upload.
  - **Categories Management:** Nested categories with live badges and product counts.
  - **Orders & Inquiries Pipeline:** Live quote requests, order statuses (Pending, In Progress, Completed), and print-ready invoices.
  - **Banner & CMS Content Manager:** Live homepage hero text, announcements, and promotional copy editing.
  - **Discounts & Coupons Engine:** Percentage and fixed discounts with validity dates and usage tracking.
  - **Media Library:** Direct asset upload with instant preview and copyable URLs.
  - **Global Store Settings:** Contact info, WhatsApp integrations, maintenance mode toggle, and audit logging.
- **Zero-Dependency Native Backend:** Powered entirely by Node.js standard library with persistent, atomic JSON database engine (`data/db.json`).

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or newer recommended)

### 2. Installation & Running
Clone the repository and run:

```bash
# Clone the repository
git clone <YOUR-GITHUB-REPO-URL>
cd pk.web-desires.com

# Start the server (no npm install needed - 0 external dependencies!)
npm start
# or
node server.js
```

The application will be live at:
- **Public Website:** [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard:** [http://localhost:3000/admin/](http://localhost:3000/admin/)

---

## 🔐 Default Admin Credentials

- **Email:** `admin@digenz.com`
- **Password:** `Admin@Digenz2026!`

*(Credentials can be updated at any time from the Admin Dashboard Profile settings).*

---

## 📁 Project Structure

```text
├── admin/                  # Admin Dashboard SPA (HTML, CSS, JS)
│   ├── css/admin.css       # Black & Gold luxury dashboard styles
│   ├── js/admin.js         # Reactive admin client logic & routing
│   └── index.html          # Admin panel view
├── assets/                 # Public styling, scripts, fonts & branding
│   ├── js/digenz-live.js   # Live client synchronization & lead capture
│   └── ...
├── data/
│   └── db.json             # Atomic persistent JSON database
├── db.js                   # Secure database driver, crypto auth & audit logger
├── server.js               # REST API & static file HTTP server
├── index.htm               # Main homepage
├── package.json            # NPM scripts & metadata
└── README.md
```

---

## 📄 License
All rights reserved © 2026 DIGENZ.
