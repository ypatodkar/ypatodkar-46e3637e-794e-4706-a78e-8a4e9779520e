# Project Overview: Secure Task Management System

## What is this project?
This project is a **Full Stack Task Management System** designed with a focus on **Security, Multi-tenancy, and Role-Based Access Control (RBAC)**. 
It is structured as an **Nx monorepo** containing both the frontend client and the backend API, along with shared libraries. 

The application allows users within different organizations to manage tasks on a Kanban-style board while strictly enforcing data visibility and permissions based on the user's role and their organization's hierarchy.

## Technology Stack
- **Workspace:** Nx Monorepo
- **Backend (API):** NestJS, TypeORM, SQLite (for data storage)
- **Frontend (Dashboard):** Angular, Tailwind CSS, Angular CDK (for drag-and-drop Kanban functionality)
- **Authentication & Security:** JWT (JSON Web Tokens), bcrypt (for password hashing), Passport.js

## Architecture & Monorepo Structure
The Nx workspace is divided into applications and shared libraries:

1. **`apps/api` (Backend):** 
   - A NestJS RESTful API handling business logic, database interactions, authentication, and authorization.
   - Listens on port `3000` (by default) with an `/api` prefix.
   - Auto-generates demo organizations, users, and tasks upon the first run using SQLite (`data/taskmgmt.sqlite`).

2. **`apps/dashboard` (Frontend):**
   - An Angular Single Page Application (SPA) serving as the user interface.
   - Proxies `/api` requests to the NestJS backend.
   - Features a Kanban board, team management interface, and an audit log viewer.
   - Runs on port `4200`.

3. **`libs/data` (Shared Data):**
   - Shared TypeScript interfaces, types, and enums (e.g., Task Statuses, User Roles) utilized by both the API and the Dashboard.

4. **`libs/auth` (Shared Auth Logic):**
   - Shared RBAC decorators (e.g., `@Public()`, `@Roles()`) and JWT payload structures.

## Core Features & Business Logic

### 1. Multi-tenant Organization Hierarchy
Data is isolated based on `organizationId`. Organizations can have a parent-child relationship (e.g., "Acme Corp" is the parent of "Engineering" and "Marketing"). 
This hierarchy dictates data visibility: high-level roles in parent organizations can view data in child organizations.

### 2. Role-Based Access Control (RBAC)
The system enforces strict access levels:
- **Owner:** Highest level of access. Can view tasks, manage users (promote/demote Admins and Viewers), and view audit logs across their own organization **and all descendant organizations**.
- **Admin:** Can create, read, update, and delete tasks (Full CRUD), and verify tasks. Scope is limited strictly to their own organization.
- **Viewer:** Read-only access to their organization's tasks. They can only update the status (Open → In Progress → Done) of tasks explicitly assigned to them.

### 3. Task Management (Kanban)
Tasks have properties like title, description, status, priority, and category. 
The Angular dashboard implements a drag-and-drop board to seamlessly move tasks between columns. Viewers are restricted from moving tasks to the "Verified" column.

### 4. Audit Logging
To ensure security and traceability, the backend strictly logs actions modifying state (e.g., creating/updating tasks, changing roles) into an `AuditLog` table. This log records who performed the action, the targeted resource, and the result, which Owner/Admin roles can review.

## Local Development & Scripts
- **Install Dependencies:** `npm install`
- **Configure Env:** Copy `.env.example` to `.env` and set `JWT_SECRET`.
- **Run Backend:** `npx nx run api:serve`
- **Run Frontend:** `npx nx run dashboard:serve`
- **Run Tests:** `npx nx run <project>:test` (available for api, data, auth, dashboard)

## Summary
The project is a robust, production-like prototype showcasing advanced architectural concepts like monorepo code sharing, hierarchical RBAC operations, and clear separation of concerns between a NestJS backend and an Angular frontend.
