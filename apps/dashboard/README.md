# UT Dining Dashboard

A modern dashboard for managing UT Austin dining hall locations, menus, and operational status for the [UT Dining](https://github.com/Longhorn-Developers/UT-Dining) app, built with [Next.js](https://nextjs.org/), [Mantine UI](https://mantine.dev/), and [Supabase](https://supabase.com/).

## Features

- **Location Management:**  
  Add, edit, delete, and reorder dining locations with drag-and-drop.
- **Status & Meal Times:**  
  View real-time open/closed status and current meal period for each location.
- **Payment Methods:**  
  Display accepted payment methods with icons and color coding.
- **Force Close:**  
  Instantly force-close or re-enable any location.
- **Menu Integration:**  
  See which locations have menus available.
- **Authentication:**  
  Secure login and session management.
- **Responsive UI:**  
  Built with Mantine for a modern, accessible experience.

## Project Structure

```
.
├── app/                # Next.js app directory (routing, layouts, pages)
│   └── (private)/dashboard/  # Dashboard logic and server actions
│   └── actions/        # Auth and other actions
│   └── login/          # Login page
├── components/         # UI components
│   └── dashboard/      # Dashboard-specific components
│       └── locations/  # Location management (table, row, drag, modal, etc.)
├── lib/                # Utilities and backend integration
│   └── supabase/       # Supabase client, server, middleware
├── types/              # TypeScript types for database and domain models
├── public/             # Static assets
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

## Getting Started

The dashboard is part of the UT Dining monorepo. From the repo root:

```bash
./setup.sh            # installs everything and writes apps/dashboard/.env.local
./dev.sh dashboard    # http://localhost:3000
```

`pnpm env:local` points it at a local Supabase (`pnpm db:start`), and `pnpm env:dev` at the hosted dev project. Database migrations live in the root `supabase/` folder and the generated types come from `@ut-dining/supabase`.

## Deployment

Vercel, with the project's root directory set to `apps/dashboard`.

## Key Files & Directories

- `app/(private)/dashboard/action.ts`  
  Server actions for location CRUD, force close, and display order updates.
- `components/dashboard/locations/locations-table.tsx`  
  Main table for displaying and reordering locations.
- `components/dashboard/locations/draggable-location-row.tsx`  
  Drag-and-drop enabled row for sortable locations.
- `lib/supabase/`  
  Supabase integration for authentication and data.
- `types/`  
  TypeScript types for strong type safety.

## Customization

- **Add new features:**  
  Create new components in `components/dashboard/` or utilities in `lib/`.
- **Change styling:**  
  Edit Mantine theme in `app/theme.ts` or override styles in `app/theme.css`.
- **Backend logic:**  
  Update server actions in `app/(private)/dashboard/action.ts`.

## License

MIT
