# GeonPayGuard

A comprehensive fintech platform for secure payments, multi-currency wallets, cryptocurrency management, and business services.

## 🚀 Overview

GeonPayGuard is a full-stack fintech solution that enables users to manage traditional and cryptocurrency payments, create fundraising campaigns, handle business transactions, and resolve disputes — all in one unified platform.

## ✨ Features

### 🔐 Authentication & Security
- **User Registration & Login** — Secure account creation with email verification
- **Password Recovery** — Recovery phrase-based account restoration
- **Session Management** — Active session monitoring with security controls
- **Two-Factor Authentication** — Enhanced account protection
- **Role-Based Access** — Admin, Business, and Client user roles

### 💰 Wallet Management
- **Multi-Currency Support** — Manage multiple currency wallets
- **Crypto Wallet Integration** — Support for USDT on:
  - Binance Smart Chain (BEP20)
  - Ethereum (ERC20)
- **Fiat Payments** — Stripe integration for card payments
- **Mobile Money** — M-Pesa integration for Kenya and East Africa
- **Fund Conversions** — Convert between crypto and fiat seamlessly

### 🏦 Vaults & Campaigns
- **Fundraising Campaigns** — Create and manage campaign vaults
- **Campaign Applications** — Accept applications for campaign funding
- **Campaign Analytics** — Track funding progress and contributor metrics
- **Secure Fund Release** — Controlled release of campaign funds

### 🏢 Business Services
- **API Key Management** — Generate and manage business API keys
- **Team Management** — Add and manage team members with roles
- **Business Analytics** — Comprehensive business insights and reporting
- **Webhook Integration** — Real-time event notifications for integrations

### 🛡️ Dispute Resolution
- **Support Tickets** — Create and track support requests
- **Dispute Management** — Formal dispute filing and resolution workflow
- **Ticket History** — Complete audit trail of all support interactions

### 📱 Notifications
- **Real-Time Alerts** — Instant notification delivery
- **Notification Preferences** — Customizable notification settings
- **Multi-Channel** — Email and in-app notifications

### ⚙️ Admin Dashboard
- **User Management** — Full user administration capabilities
- **Audit Logs** — Comprehensive activity tracking
- **Health Monitoring** — System health and performance metrics
- **Security Controls** — Platform-wide security configuration

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── core/           # Security and core utilities
│   ├── models/         # SQLAlchemy ORM models
│   ├── routes/        # API endpoints
│   ├── schemas/        # Pydantic request/response models
│   ├── services/      # Business logic services
│   │   ├── card.py     # Stripe card payments
│   │   ├── crypto.py   # Cryptocurrency operations
│   │   ├── email.py    # Email notifications (Resend)
│   │   └── mpesa.py    # M-Pesa mobile money
│   └── utils/         # Utility functions
├── main.py            # Application entry point
├── config.py          # Configuration management
└── database.py        # Database setup
```

### Frontend (Next.js)
```
frontend/
├── src/
│   ├── app/           # Next.js App Router pages
│   │   ├── admin/     # Admin dashboard pages
│   │   ├── auth/      # Authentication pages
│   │   ├── business/  # Business management
│   │   ├── client/    # Client dashboard
│   │   ├── settings/  # User settings
│   │   ├── support/   # Support center
│   │   ├── vaults/    # Campaign vaults
│   │   └── wallet/    # Wallet management
│   ├── components/   # React components
│   ├── lib/           # Library utilities
│   └── store/         # State management
├── public/            # Static assets
└── package.json       # Dependencies
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: SQLAlchemy (PostgreSQL/SQLite)
- **Authentication**: JWT, OAuth, Bcrypt
- **Crypto**: Web3.py, eth-account
- **Payments**: Stripe, M-Pesa (Intasend)
- **Email**: Resend
- **Cache**: Redis

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: Zustand
- **HTTP**: Axios

## 🚦 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, SQLite for development)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run the server:
```bash
python main.py
# or
uvicorn main:app --reload
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
# Edit proxy.ts if backend URL differs
```

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📝 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔧 Configuration

### Environment Variables (Backend)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `SECRET_KEY` | JWT signing key | Yes |
| `RESEND_API_KEY` | Resend email API key | Yes |
| `RESEND_FROM_EMAIL` | Sender email address | Yes |
| `STRIPE_SECRET_KEY` | Stripe API secret | For card payments |
| `PESAPAL_CONSUMER_KEY` | PesaPal Consumer Key | For M-Pesa |
| `PESAPAL_CONSUMER_SECRET` | PesaPal Consumer Secret | For M-Pesa |
| `PESAPAL_BASE_URL` | PesaPal API URL | `https://cybqa.pesapal.com` (sandbox) |
| `PESAPAL_CALLBACK_URL` | PesaPal callback URL | Your callback URL |
| `BSC_RPC_URL` | BSC node RPC URL | For BEP20 |
| `ETH_RPC_URL` | Ethereum node RPC URL | For ERC20 |
| `REDIS_URL` | Redis connection string | For caching |

## 📄 License

MIT License

## 👥 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## 🔐 Security

For security vulnerabilities, please contact our security team through official channels.
