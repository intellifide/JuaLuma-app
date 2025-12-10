# Finity App

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![License](https://img.shields.io/badge/license-MIT-blue)

Finity is a modern financial management application that integrates with Plaid for transaction syncing, provides AI-powered insights, and offers a comprehensive dashboard for asset tracking.

## Overview

Finity is built to provide users with a clear view of their financial health. It supports:
- **Bank Integration**: Sync transactions via Plaid.
- **Asset Tracking**: Manual tracking for non-bank assets (reals estate, crypto, etc.).
- **AI Assistant**: Conversational AI for financial querying and advice.
- **Marketplace**: Extensible widgets and developer tools.

## Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, Pydantic
- **Database**: PostgreSQL (Cloud SQL), Firestore
- **Auth**: Firebase Authentication
- **Infrastructure**: Terraform, Google Cloud Platform

## Getting Started

To set up the project locally, please refer to the [Local Development Setup](docs/local-development-setup.md) guide.

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TCoder920x/finity-app.git
   cd finity-app
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

## Contribution Guidelines

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure all tests pass and pre-commit hooks are clean before submitting.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
