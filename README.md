# TransMedex

A modern, full-stack web platform for medical billing, certified coding, practice management, and Revenue Cycle Management (RCM) services across the United States.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Core Platform Capabilities](#core-platform-capabilities)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Local Development](#local-development)
- [Production Build & Deployment](#production-build--deployment)
- [API Reference](#api-reference)
- [SEO & Metadata Architecture](#seo--metadata-architecture)
- [Security & Performance Engineering](#security--performance-engineering)
- [Scripts Reference](#scripts-reference)
- [License](#license)

---

## Architectural Overview

TransMedex is engineered as a high-performance monorepo utilizing npm workspaces. The architecture decouples client-side presentation from backend business logic while allowing unified dependency management, streamlined builds, and shared tooling:

* **Client Application (`apps/web`):** A single-page application (SPA) built with React 18, Vite, Tailwind CSS, and Radix UI. It implements automated Schema.org structured data, dynamic OpenGraph/Twitter social cards, and build-time prerendering for optimal Core Web Vitals and search engine indexation.
* **API Service (`apps/api`):** An Express.js microservice responsible for request validation, contact inquiry ingestion, transactional email dispatch via SMTP (Nodemailer), security header enforcement, and serving static production builds.

```
                              ┌─────────────────────────────────┐
                              │       TransMedex Monorepo       │
                              └────────────────┬────────────────┘
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      ▼                                                 ▼
        ┌───────────────────────────┐                     ┌───────────────────────────┐
        │   apps/web (Frontend)     │                     │    apps/api (Backend)     │
        ├───────────────────────────┤                     ├───────────────────────────┤
        │ • React 18 + Vite         │                     │ • Node.js + Express 5     │
        │ • Tailwind CSS + Radix UI │                     │ • Security (Helmet, CORS) │
        │ • 175+ Healthcare Routes  │  REST Inquiries     │ • Rate Limiting           │
        │ • Prerendering Engine     │ ──────────────────> │ • SMTP Service            │
        │ • JSON-LD Schema Generator│   /hcgi/api/contact │ • Static File Server      │
        └───────────────────────────┘                     └───────────────────────────┘
```

---

## Core Platform Capabilities

### 1. Comprehensive Healthcare Route Coverage
The application dynamically supports **175+ production routes** structured around primary healthcare buyer personas:
* **All 50 US States:** Tailored local billing compliance, Medicaid regulations, regional carrier guidelines, and state-specific billing considerations (`/states/[state-name]`).
* **33 Major EHR / EMR Integrations:** Dedicated workflows for Epic Systems, Cerner (Oracle Health), AthenaHealth, eClinicalWorks, Kareo, NextGen, Allscripts, AdvancedMD, CareCloud, WebPT, and more (`/emr/[ehr-slug]`).
* **16 Core Billing & RCM Services:** In-depth landing pages covering Revenue Cycle Management (RCM), Denial Management, Medical Coding, Chart Auditing, Account Receivables (A/R) Recovery, MIPS & MACRA Consulting, Credentialing, and Patient Billing (`/services/[service-slug]`).
* **21 Clinical Specialties:** Specialized billing guidelines for Cardiology, Urology, Behavioral Health, Laboratory & Pathology, Orthopedics, Pediatrics, Radiology, Oncology, Dermatology, and Surgery (`/specialties/[specialty-slug]`).
* **Healthcare Knowledge Base:** Medical coding updates, reimbursement news, and payer policy analyses (`/blog`).

### 2. High-Performance Build Pipeline
* **Build-Time Prerendering (`tools/prerender.js`):** Generates static HTML snapshots for critical landing pages, achieving sub-second First Contentful Paint (FCP) and near-zero Largest Contentful Paint (LCP).
* **AI Crawler Manifest (`tools/generate-llms.js`):** Generates an `llms.txt` document summarizing the application's clinical domain knowledge and routing structure for modern search engines and AI retrieval crawlers.

---

## Technology Stack

### Frontend (`apps/web`)

| Technology | Purpose |
| :--- | :--- |
| **React 18.3** | Component-driven UI runtime |
| **Vite 6** | ESM-based development server and production bundler |
| **Tailwind CSS 3.4** | Utility-first design system with curated typography |
| **Radix UI Primitives** | Accessible, unstyled UI components (Dialog, Accordion, Tooltip, Popover) |
| **React Router DOM 7** | Client-side routing, route transitions, and code splitting |
| **Framer Motion 11** | Declarative micro-interactions and scroll animations |
| **React Hook Form + Zod** | Type-safe form state management and client-side validation |
| **Lucide React** | Consistent, tree-shakable SVG iconography |
| **React Helmet** | Dynamic `<head>` tag injection for page-level SEO |

### Backend (`apps/api`)

| Technology | Purpose |
| :--- | :--- |
| **Node.js 20+** | JavaScript runtime with native environment variable parsing |
| **Express.js 5** | REST API framework and production static asset pipeline |
| **Helmet 8** | HTTP security headers (CSP, HSTS, XSS protection, Sniff protection) |
| **Express Rate Limit 8**| IP-based rate limiting to prevent spam and DDoS attacks |
| **Nodemailer 9** | Production SMTP transport for practice consultation requests |
| **CORS** | Cross-Origin Resource Sharing control restricting API access |
| **Morgan** | HTTP request logging |

---

## Repository Structure

```text
Transmedex/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── middleware/        # Security, validation, and error-handling middleware
│   │   │   ├── routes/            # Route definitions (/health, /contact, /seo)
│   │   │   │   ├── contact.js     # Consultation lead handler & email dispatcher
│   │   │   │   ├── health-check.js# Health check endpoint
│   │   │   │   └── index.js       # Central router aggregation
│   │   │   └── main.js            # Express server initialization and static serving
│   │   ├── .env.example           # Example environment template for backend
│   │   └── package.json           # API dependencies and run scripts
│   │
│   └── web/
│       ├── public/                # Static public assets (Favicon, WebP graphics, verification tokens)
│       ├── src/
│       │   ├── components/        # Reusable UI elements (Navigation, Footer, SEOHead, Cards)
│       │   ├── data/              # Core site datasets (seoConfig.js, blogData.js, specialties)
│       │   ├── pages/             # Route views (HomePage, Services, EMR, States, BlogTemplate)
│       │   ├── utils/             # SEO Analyzer, Schema.org generators, string helpers
│       │   ├── App.jsx            # Application root routing and Suspense configuration
│       │   ├── index.css          # Tailwind base layers, typography tokens, and custom utilities
│       │   └── main.jsx           # React DOM hydration entrypoint
│       ├── tools/                 # Build-time prerendering and LLM manifest generation scripts
│       ├── index.html             # HTML5 template with critical CSS and Google Tag verification
│       ├── package.json           # Web dependencies and build scripts
│       ├── tailwind.config.js     # Tailwind design system configuration
│       └── vite.config.js         # Vite bundler options and path aliases
│
├── .gitignore                     # Git exclusions (node_modules, build outputs, local tools)
├── package.json                   # Monorepo workspace configuration & concurrent runner
└── README.md                      # Project documentation
```

---

## Getting Started

### Prerequisites

Ensure the following tools are installed on your workstation:
* **Node.js:** `v20.x` or later (LTS recommended)
* **npm:** `v10.x` or later

Verify your environment:
```bash
node -v
npm -v
```

### Installation

Clone the repository and install all workspace dependencies from the root directory:

```bash
git clone https://github.com/hamzaiqbal35/Transmedex.git
cd Transmedex
npm install
```

### Environment Configuration

1. Create a `.env` file in `apps/api/`:

```bash
cp apps/api/.env.example apps/api/.env
```

2. Populate the required environment variables:

```ini
# Server Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# SMTP Mail Server (Required for contact form inquiries)
SMTP_HOST=smtp.your-mail-provider.com
SMTP_PORT=465
SMTP_USER=inquiries@transmedex.org
SMTP_PASS=your_secure_smtp_password
MAIL_TO=leads@transmedex.org
```

### Local Development

Start both the React client (`localhost:3000`) and Express server (`localhost:3001`) simultaneously:

```bash
npm run dev
```

* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **Backend REST API:** [http://localhost:3001](http://localhost:3001)
* **API Health Check:** [http://localhost:3001/hcgi/api/health](http://localhost:3001/hcgi/api/health)

---

## Production Build & Deployment

The monorepo is configured for unified deployment on platforms such as DigitalOcean, AWS EC2, Render, Heroku, or standard VPS instances.

### 1. Building the Application

Run the production build script from the root directory:

```bash
npm run build
```

This command performs the following automated steps:
1. Generates the `llms.txt` crawler manifest (`node tools/generate-llms.js`).
2. Bundles and minifies the React application into `dist/apps/web/`.
3. Prerenders top-level routes into static HTML (`node tools/prerender.js`).

### 2. Starting in Production

Launch the Express server:

```bash
npm start
```

The Express server will:
* Bind to `process.env.PORT` (defaults to `3001`).
* Mount REST API endpoints under `/hcgi/api/*`.
* Serve pre-compressed static assets from `dist/apps/web/` with HTTP caching headers.
* Fall back to `index.html` for client-side React Router navigation on non-static routes.

---

## API Reference

All backend endpoints are prefixed with `/hcgi/api`.

### 1. Health Check
* **Endpoint:** `GET /hcgi/api/health`
* **Description:** Verifies service availability.
* **Response (200 OK):**
```json
{
  "status": "ok",
  "uptime": 1284.52,
  "timestamp": "2026-10-19T16:00:00.000Z"
}
```

### 2. Contact & Consultation Request
* **Endpoint:** `POST /hcgi/api/contact`
* **Description:** Ingests practice inquiries, runs validation, and forwards details to the internal admissions team via SMTP.
* **Rate Limit:** 10 requests per 15 minutes per IP address.
* **Request Body:**
```json
{
  "name": "Dr. Sarah Jenkins",
  "email": "s.jenkins@metromedical.com",
  "phone": "+1 (555) 234-5678",
  "practiceName": "Metro Cardiology Group",
  "specialty": "Cardiology",
  "monthlyBillingVolume": "$100k - $250k",
  "message": "Interested in end-to-end denial management and EHR transition audit."
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Thank you for reaching out. A TransMedex billing consultant will contact you shortly."
}
```
* **Error Response (400 Bad Request):**
```json
{
  "success": false,
  "errors": ["A valid email address is required."]
}
```

---

## SEO & Metadata Architecture

TransMedex incorporates an enterprise SEO framework managed via [seoConfig.js](file:///c:/Projects/Transmedex-main/Transmedex-main/apps/web/src/data/seoConfig.js) and [SEOHead.jsx](file:///c:/Projects/Transmedex-main/Transmedex-main/apps/web/src/components/SEOHead.jsx):

1. **Title & Description Control:** Each route features customized metadata targeting high-intent medical billing search queries (e.g., `Revenue Cycle Management Services | Certified Medical Coders`).
2. **Canonical Links:** Explicit `<link rel="canonical">` elements on every page ensure index consolidation and prevent duplicate content issues across URL parameters.
3. **Structured Data (Schema.org JSON-LD):**
   * `MedicalBusiness`: Injects official practice organization schema, geographic coordinates, service areas, and contact points.
   * `WebPage` & `Article`: Applied across clinical specialty guides and educational publications to facilitate rich Google search snippets.
4. **Social Sharing Metadata:** Complete Open Graph (`og:*`) and Twitter Card (`twitter:*`) tag generation with curated high-resolution WebP previews.
5. **Analytics & Verification:** Embedded Google Site Verification tokens and Google Tag Manager (`G-R1E0TFS2WH`) configured to execute on production environments.

---

## Security & Performance Engineering

* **Content Security Policy (CSP):** Managed via `helmet` to restrict unauthorized script execution and asset origins.
* **HTTP Security Headers:** Implements `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict Referrer Policies.
* **Rate Limiting:** Prevents form brute-forcing and endpoint abuse using `express-rate-limit`.
* **Zero Layout Shift (CLS):** Images are served in modern `.webp` formats with explicit aspect-ratio constraints. Critical hero assets are preloaded via `<link rel="preload">`.
* **Clean Git Tree:** Node modules and internal authoring tools are excluded from the repository via [.gitignore](file:///c:/Projects/Transmedex-main/Transmedex-main/.gitignore) to maintain a lean, secure codebase.

---

## Scripts Reference

The following commands can be executed from the root directory:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts frontend (port 3000) and backend (port 3001) concurrently |
| `npm run build` | Builds the frontend bundle and runs prerendering scripts |
| `npm start` | Launches the backend production server to serve API and web bundle |
| `npm run lint` | Runs ESLint across both `apps/web` and `apps/api` |

To target a specific workspace directly:
```bash
# Frontend only
npm run dev --prefix apps/web
npm run build --prefix apps/web

# Backend only
npm run dev --prefix apps/api
npm run start --prefix apps/api
```

---

## License

This project is proprietary software belonging to TransMedex. All rights reserved. Unauthorized copying, modification, distribution, or deployment of this software without explicit permission is strictly prohibited.
