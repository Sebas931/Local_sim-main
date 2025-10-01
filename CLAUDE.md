# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a Local SIM Colombia management application with:
- **Backend**: FastAPI server with SQLAlchemy ORM, async PostgreSQL/MongoDB database
- **Frontend**: React 18 SPA with TailwindCSS, Radix UI components, and shadcn/ui

## Development Commands

### Backend (FastAPI)
- Start server: `cd backend && uvicorn server:app --host 0.0.0.0 --port 8001`
- Install dependencies: `cd backend && pip install -r requirements.txt`
- Test API: `python backend_test.py` (comprehensive API testing suite)

### Frontend (React)
- Start development server: `cd frontend && npm start` (runs on http://localhost:3000)
- Build for production: `cd frontend && npm run build`
- Install dependencies: `cd frontend && npm install` or `yarn install`

## Core System Architecture

### Database Models (backend/models.py)
- Uses SQLAlchemy with UUID primary keys for most entities
- Main entities: Sale, SaleItem, User, Role, Module, Product, SIM, Turn
- Role-based permission system with Role-Module relationships
- Audit trails and timestamps on key entities

### API Routes Structure (backend/routes/)
- `auth.py` - JWT authentication and user login
- `sales.py` - Sales management and invoice generation
- `sims.py` - SIM card inventory and management
- `products.py` - Product catalog
- `dashboard.py` - Analytics and reporting
- `users.py` - User management
- `roles.py` - Role and permissions management
- `turnos.py` - Shift/turn management
- `winred.py` - WinRed payment integration

### Frontend Structure
- Main app logic in `src/App.js` (large monolithic component)
- UI components in `src/components/ui/` using shadcn/ui patterns
- Authentication handled via Login.js
- Uses React Router for navigation

### External Integrations
- **Siigo API**: ERP integration for invoice generation (backend/siigo_client.py)
- **WinRed**: Payment processing integration
- **Database**: Async SQLAlchemy with PostgreSQL/MongoDB support

## Key Configuration Files
- Backend environment: `backend/.env` (database URLs, API keys)
- Frontend environment: `frontend/.env`
- CORS configured for localhost:3000 development

## Testing Protocol
The project includes a sophisticated testing protocol with agent communication:
- Main testing data tracked in `test_result.md`
- Protocol for communication between development and testing agents
- Comprehensive API testing via `backend_test.py`

## Development Notes
- Backend runs on port 8001, frontend on port 3000
- Database uses UUID primary keys consistently
- Role-based access control implemented throughout
- All API endpoints require authentication except login
- Frontend uses modern React patterns with hooks and context