# LeakShield Architecture

## 1. Requirements Analysis
**Goal**: Build a real-time Git repository security scanner and secrets leak detector using a modular monolith architecture.
**Core Tech**: React (Frontend), Node.js (Backend), Regex + Tree-sitter (Detection), SQLite/PostgreSQL (Database).
**Key Features**:
- GitHub Webhook integration (push events)
- Real-time incremental & full scans
- Regex-based and Tree-sitter contextual analysis for secret detection
- Risk assessment & policy enforcement (Block/Warn/Allow)
- Slack notifications
- Real-time React dashboard

## 2. High-Level Architecture (Modular Monolith)
The system will run as a single deployable Node.js application serving the API and integrating with a built frontend, or run as separate frontend/backend processes for development.

**Layers:**
- **Frontend Layer**: React SPA (Vite, React Router, Tailwind/Custom CSS).
- **API Layer**: Express/Fastify routes, validation, auth middleware.
- **Application Layer**: Use cases, services (ScanService, NotificationService).
- **Domain Layer**: Core business logic, entities (Finding, Scan, Policy).
- **Infrastructure Layer**: GitHub API/Webhook clients, Slack API client, Database repositories, Tree-sitter parsers, Regex Engine.

## 3. Folder Structure
```text
LeakShield/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── app/              # App entry, providers
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature-based modules (dashboard, findings, etc.)
│   │   ├── hooks/            # Shared React hooks
│   │   ├── services/         # API clients
│   │   ├── styles/           # Design system tokens and globals
│   │   └── types/            # TypeScript interfaces
├── backend/                  # Node.js API
│   ├── src/
│   │   ├── api/              # Controllers, routes, middleware
│   │   ├── application/      # Services, DTOs
│   │   ├── domain/           # Entities, value objects
│   │   ├── infrastructure/   # Database, GitHub, Slack, Detection logic
│   │   ├── config/           # Environment config
│   │   └── index.ts          # Server entry
├── package.json
└── README.md
```

## 4. Interfaces & Contracts
**Detector Interface:**
```typescript
interface Detector {
  detect(fileContent: string, context: ScanContext): DetectionResult[];
}
```
**Notifier Interface:**
```typescript
interface Notifier {
  notify(finding: Finding, policy: Policy): Promise<void>;
}
```

## 5. Domain Models
**Finding:**
- id: string
- repositoryId: string
- commitSha: string
- filePath: string
- lineStart: number
- lineEnd: number
- secretType: string
- severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
- confidence: number
- status: 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE'
- fingerprint: string

## 6. API Contracts
- `GET /api/repositories` - List connected repos
- `POST /api/webhooks/github` - Receive push events
- `GET /api/findings` - List findings with filters
- `POST /api/scans` - Trigger manual scan

## 7. Database Schema
- **Repositories**: id, name, url, defaultBranch, status
- **Scans**: id, repositoryId, commitSha, status, startedAt, completedAt
- **Findings**: id, repositoryId, scanId, commitSha, filePath, secretType, severity, status, fingerprint
- **Policies**: id, severity, action, enabled

## 8. Frontend Routes
- `/` - Dashboard
- `/repositories` - Repo list
- `/repositories/:id` - Repo details
- `/scans` - Scan center
- `/findings` - Findings list
- `/findings/:id` - Finding detail
- `/policies` - Policy configuration
- `/settings` - App settings

## 9. Design System
- **Colors**: Dark mode first, deep backgrounds (e.g., `#0f172a`), accented with brand colors (e.g., vibrant blue `#3b82f6` for info, `#ef4444` for critical findings).
- **Typography**: Inter / Roboto.
- **Components**: Glassmorphism cards, animated progress bars, syntax-highlighted code blocks with masked secrets.

## 10. Implementation Plan
- Phase 1: Init mono-repo, setup Vite React app, Node.js backend.
- Phase 2: Implement core domain entities and DB mock/SQLite.
- Phase 3: Setup Detection Engine (Regex + Tree-sitter).
- Phase 4: Build Express API and GitHub webhook handlers.
- Phase 5: Build React Frontend features.
