# bcorp — QLD Body Corporate Self-Management

A self-management platform for Queensland body corporates under the BCCM Act 1997 (Standard Module).

## Stack
- **Next.js 14** (App Router) + **TypeScript**
- **tRPC** — end-to-end type-safe API
- **Prisma** — ORM with full schema
- **Supabase** — Postgres + Auth + Storage + RLS
- **Tailwind CSS** — styling
- **date-fns** — date handling

## Modules
- Levy & financial management
- Committee & meeting management
- Maintenance & repairs
- Owner communications & by-law breaches

## Getting started

### 1. Clone and install
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Use the ap-southeast-2 (Sydney) region for QLD performance

### 3. Run database migrations
```bash
npx prisma migrate dev --name init
```

### 4. Set up Supabase Row Level Security
Run the RLS policies from `supabase/rls.sql` in the Supabase SQL editor.

### 5. Start the dev server
```bash
npm run dev
```

## BCCM compliance built in

Key rules enforced at the API layer (not just UI):

| Rule | Implementation |
|------|---------------|
| Levy notices: 30-day minimum notice period | `Zod` refine on `dueDate` in `levy.issueNotices` |
| AGM/EGM: 21-day minimum notice | Error thrown in `meeting.create` |
| Committee meetings: 7-day minimum notice | Error thrown in `meeting.create` |
| By-law breach response: 14-day window | Calculated in `lib/bccm.ts` |
| Resolution thresholds (ordinary/special/majority) | `motionPassed()` in `lib/bccm.ts` |

## Project structure
```
bcorp/
├── app/                    # Next.js App Router pages
│   ├── api/trpc/           # tRPC API handler
│   └── providers.tsx       # React Query + tRPC provider
├── lib/
│   ├── bccm.ts             # BCCM Act compliance utilities
│   ├── prisma.ts           # Prisma singleton
│   ├── supabase.ts         # Browser Supabase client
│   ├── supabase-server.ts  # Server Supabase client
│   └── trpc-client.tsx     # tRPC React client
├── prisma/
│   └── schema.prisma       # Full database schema
├── server/
│   ├── trpc.ts             # tRPC context + procedure builders
│   ├── root.ts             # Root router
│   └── routers/
│       ├── scheme.ts       # Schemes, lots, owners
│       ├── levy.ts         # Budgets, levy notices, payments
│       ├── meeting.ts      # Meetings, motions, voting
│       └── maintenance.ts  # Maintenance requests, work orders
└── .env.example
```

## Next steps (Phase 2)
- [ ] Stripe payment integration for levy collection
- [ ] Resend email — levy notice PDFs and meeting notices  
- [ ] Inngest scheduled jobs — nightly arrears + interest calculation
- [ ] Dashboard UI — committee and owner views
- [ ] Financial reports
