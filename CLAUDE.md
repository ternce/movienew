# CLAUDE.md - MoviePlatform Development Guidelines

You're a Senior Full-Stack Developer with 40+ years of experience, you know everything about how to make a high-quality, production ready, safe and secured code that will be working 100%. You're also an expert in UI/UX design with 20+ years of experience, you always double check for the latest design ideas, design rules, what colors and ui components will fit the best to create a stunning, minimalistic and professional UI. You're also a well-organized developer that is always creating structured plans to implement a feature and always running E2E tests, Unit Tests, performance tests, usability and compatibility and accessibility tests to make sure the project fits everyone perfectly. Remember, before you start coding a new feature or debugging anything, you make a deep-research to find out all nuances, to find the best solution possible, and you always think about the performance optimization, safe-code, and that the code you're writing is high-quality and there won't be any need to debug it.

---

## Project Overview

MoviePlatform is a next-generation video streaming platform combining Netflix/Spotify features with:

- **Video Content:** Series, Clips, Shorts, Video Tutorials
- **Multi-level Partner Program:** 5-level referral system with commissions
- **Subscription System:** Individual series, tutorial, and premium plans
- **Bonus System:** Earn and spend bonuses across the platform
- **Age Restrictions:** Content filtering (0+, 6+, 12+, 16+, 18+)
- **Russian Payments:** SBP, YooKassa, Bank Transfer, QR codes

---

## Tech Stack

### Frontend (apps/web, apps/admin)

| Technology                | Purpose                         |
| ------------------------- | ------------------------------- |
| **Next.js 15**            | React framework with App Router |
| **shadcn/ui + Radix UI**  | Accessible UI components        |
| **Tailwind CSS 4**        | Utility-first styling           |
| **TanStack Query**        | Server state management         |
| **Zustand**               | Client state management         |
| **HLS.js**                | Adaptive video streaming        |
| **React Hook Form + Zod** | Form handling and validation    |
| **Vitest**                | Unit testing                    |
| **Playwright**            | E2E testing                     |

### Backend (apps/api)

| Technology            | Purpose                    |
| --------------------- | -------------------------- |
| **NestJS + Fastify**  | API framework              |
| **PostgreSQL 16**     | Primary database           |
| **Prisma ORM**        | Database access layer      |
| **Redis 7**           | Cache, sessions, queues    |
| **BullMQ**            | Background job processing  |
| **MinIO / Bunny CDN** | Video storage and delivery |
| **Jest + Supertest**  | API testing                |

### Infrastructure

| Technology         | Purpose                |
| ------------------ | ---------------------- |
| **Turborepo**      | Monorepo orchestration |
| **Docker Compose** | Local development      |
| **GitHub Actions** | CI/CD pipelines        |

---

## Design System

### Color Palette (Dark Mode Default)

```css
:root {
  /* Backgrounds */
  --mp-bg-primary: #05060a;
  --mp-bg-secondary: #080b12;
  --mp-surface: #10131c;
  --mp-surface-elevated: #151824;

  /* Accents */
  --mp-accent-primary: #c94bff; /* Neon violet-magenta */
  --mp-accent-secondary: #28e0c4; /* Turquoise-cyan */
  --mp-accent-tertiary: #ff6b5a; /* Warm coral */

  /* Text */
  --mp-text-primary: #f5f7ff;
  --mp-text-secondary: #9ca2bc;
  --mp-text-disabled: #5a6072;

  /* Borders */
  --mp-border: #272b38;

  /* Gradients */
  --mp-gradient-cta: linear-gradient(135deg, #c94bff 0%, #28e0c4 100%);
  --mp-gradient-hero: linear-gradient(180deg, transparent 0%, #05060a 100%);

  /* Notifications */
  --mp-success-bg: #12352e;
  --mp-success-text: #7cf2cf;
  --mp-error-bg: #35141a;
  --mp-error-text: #ff9aa8;
}
```

### Age Category Colors

| Category | Color     | Hex       |
| -------- | --------- | --------- |
| 0+ / 6+  | Turquoise | `#28E0C4` |
| 12+      | Blue      | `#3B82F6` |
| 16+      | Orange    | `#F97316` |
| 18+      | Red       | `#EF4444` |

### Typography

- **Headings:** Inter or Aeonik (variable weight)
- **Body:** Inter (400, 500, 600)
- **Monospace:** JetBrains Mono (code blocks)

### Spacing Scale

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px
```

### Border Radius

```
sm: 4px, md: 8px, lg: 12px, xl: 16px, 2xl: 24px, full: 9999px
```

---

## Project Structure

```
MoviePlatform/
├── apps/
│   ├── api/                    # NestJS backend API
│   │   ├── prisma/             # Database schema and migrations
│   │   ├── src/
│   │   │   ├── common/         # Shared utilities, guards, decorators
│   │   │   ├── config/         # Configuration modules
│   │   │   └── modules/        # Feature modules
│   │   └── test/               # API tests
│   │
│   ├── web/                    # Next.js user-facing app
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities and API client
│   │   ├── stores/             # Zustand stores
│   │   └── public/             # Static assets
│   │
│   └── admin/                  # Next.js admin panel
│       ├── app/                # Admin pages
│       ├── components/         # Admin-specific components
│       └── lib/                # Admin utilities
│
├── packages/
│   ├── shared/                 # Shared types and constants
│   │   └── src/
│   │       ├── types/          # TypeScript interfaces
│   │       └── constants/      # Shared constants
│   │
│   ├── ui/                     # Shared UI components
│   │   └── src/
│   │       ├── components/     # Reusable components
│   │       └── hooks/          # Shared hooks
│   │
│   ├── eslint-config/          # ESLint configurations
│   └── typescript-config/      # TypeScript configurations
│
├── docker/                     # Docker configurations
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

---

## Code Standards

### TypeScript

```typescript
// DO: Use strict typing
interface User {
  id: string
  email: string
  role: UserRole
}

// DON'T: Use any
const user: any = getUser() // Bad

// DO: Use unknown with type guards
function processData(data: unknown): void {
  if (isUser(data)) {
    console.log(data.email)
  }
}

// DO: Use enums from shared package
import { UserRole, ContentType } from "@movie-platform/shared"

// DON'T: Duplicate enums across packages
enum LocalUserRole {} // Bad - creates drift
```

### React/Next.js

```tsx
// Server Component (default)
export default async function SeriesPage({ params }: Props) {
  const series = await getSeries(params.id)
  return <SeriesView series={series} />
}

// Client Component (explicit)
;("use client")

import { useState } from "react"

export function VideoPlayer({ src }: Props) {
  const [playing, setPlaying] = useState(false)
  // Interactive component logic
}
```

### API Design

```typescript
// Consistent endpoint naming
GET    /api/v1/content           // List content
GET    /api/v1/content/:id       // Get single item
POST   /api/v1/content           // Create content
PATCH  /api/v1/content/:id       // Update content
DELETE /api/v1/content/:id       // Delete content

// Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### File Naming

```
components/video-card.tsx       # Kebab-case for files
components/VideoCard/index.tsx  # PascalCase for component folders
hooks/use-auth.ts               # Kebab-case with 'use-' prefix
stores/auth.store.ts            # Kebab-case with '.store' suffix
types/user.types.ts             # Kebab-case with '.types' suffix
```

---

## Security Requirements

### Authentication

- JWT access tokens (15min expiry)
- Refresh token rotation (7 day expiry)
- Secure HTTP-only cookies for tokens
- Redis session storage with device tracking

### Authorization

- Role-based access control (RBAC)
- Age-based content filtering at middleware level
- Resource ownership verification

### Input Validation

```typescript
// Always validate with Zod
import { z } from 'zod';

const createContentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  contentType: z.nativeEnum(ContentType),
  ageCategory: z.nativeEnum(AgeCategory),
});

// Validate in controller
@Post()
async create(@Body() dto: unknown) {
  const validated = createContentSchema.parse(dto);
  return this.contentService.create(validated);
}
```

### Content Security

- Signed URLs for video streaming (4-hour expiry)
- No direct file downloads
- CORS restricted to allowed origins
- Content-Security-Policy headers
- Rate limiting on all endpoints

---

## Testing Requirements

### Unit Tests (Vitest/Jest)

```typescript
// Minimum 80% coverage for business logic
describe("CommissionCalculator", () => {
  it("should calculate level 1 commission correctly", () => {
    const result = calculateCommission(10000, 1)
    expect(result).toBe(1000) // 10%
  })

  it("should cap commission at level 5", () => {
    const result = calculateCommission(10000, 6)
    expect(result).toBe(0)
  })
})
```

### Integration Tests

```typescript
// Test API with database
describe("POST /api/v1/auth/login", () => {
  it("should return tokens for valid credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "password" })

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("accessToken")
  })
})
```

### E2E Tests (Playwright)

```typescript
// Critical user journeys
test("user can register and watch free content", async ({ page }) => {
  await page.goto("/register")
  await page.fill('[name="email"]', "test@example.com")
  // ... complete registration

  await page.goto("/series/free-series")
  await expect(page.locator("video")).toBeVisible()
})
```

### Performance Benchmarks

| Metric           | Target  |
| ---------------- | ------- |
| Page Load        | < 3s    |
| Video Start      | < 2s    |
| API Response     | < 200ms |
| Lighthouse Score | > 90    |
| Core Web Vitals  | Pass    |

---

## Commands Reference

```bash
# Development
npm run dev                    # Start all apps in development
npm run dev --filter=web       # Start only web app
npm run dev --filter=api       # Start only API

# Building
npm run build                  # Build all apps
npm run build --filter=web     # Build specific app

# Testing
npm run test                   # Run all unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # Generate coverage report
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:ui            # Run E2E with UI

# Database
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Run pending migrations
npm run db:migrate:dev         # Create and run migration
npm run db:push                # Push schema changes (dev only)
npm run db:studio              # Open Prisma Studio
npm run db:seed                # Seed database

# Code Quality
npm run lint                   # Lint all packages
npm run lint:fix               # Auto-fix lint issues
npm run type-check             # TypeScript check
npm run format                 # Format with Prettier
npm run format:check           # Check formatting

# Docker
npm run docker:up              # Start all containers
npm run docker:down            # Stop all containers
npm run docker:logs            # View container logs

# Utilities
npm run clean                  # Clean all build artifacts
npm run deps:check             # Check for outdated deps
npm run deps:update            # Update dependencies
```

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/movieplatform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# App URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
```

### Optional Variables

```bash
# Video CDN (production)
BUNNY_API_KEY=
BUNNY_STREAM_LIBRARY_ID=
BUNNY_CDN_HOSTNAME=

# Payments
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

# Email
SMTP_HOST=localhost
SMTP_PORT=1025

# Monitoring
SENTRY_DSN=
LOG_LEVEL=debug
```

---

## Git Workflow

### Branches

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add refresh token rotation
fix(video): resolve HLS playback on Safari
docs(readme): update installation instructions
style(ui): format button components
refactor(api): extract validation middleware
test(partners): add commission calculation tests
chore(deps): update dependencies
```

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
```

---

## CLAUDE Skills

### /video-upload

Video content upload and transcoding pipeline. Handles file validation, chunked uploads, multi-quality transcoding, HLS manifest generation, and thumbnail extraction.

### /age-filter

Age-based content filtering implementation. Extracts user age from session, calculates accessible categories, applies database filters, and logs access attempts for compliance.

### /partner-commission

Partner commission calculation engine. Traverses 5-level referral tree, calculates commissions using configured rates, creates pending records, and updates partner statistics.

### /payment-flow

Russian payment integration handler. Supports YooKassa, SBP, and bank transfers. Handles payment intents, webhooks, signature verification, and access grants.

### /streaming-secure

Secure video streaming implementation. Verifies access rights, generates signed URLs, configures HLS.js with adaptive bitrate, and tracks watch progress.

### /verification-flow

User identity/age verification pipeline. Supports payment verification, document upload, and third-party integration. Manages admin review queue and status updates.

---

## Troubleshooting

### Common Issues

**Database connection fails:**

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Reset database
npm run db:push -- --force-reset
```

**Video playback issues:**

```bash
# Check MinIO is accessible
curl http://localhost:9000/minio/health/live

# Verify bucket exists
docker compose exec minio mc ls local/videos
```

**Build failures:**

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Test failures:**

```bash
# Reset test database
DATABASE_URL=... npm run db:push -- --force-reset

# Run specific test
npm run test -- --filter="auth"
```

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://zustand-demo.pmnd.rs)
- [HLS.js](https://github.com/video-dev/hls.js)
- [Playwright](https://playwright.dev)
