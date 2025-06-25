# UT Dining Dashboard

A modern dashboard for managing UT Austin dining hall locations, menus, and operational status for the [UT Dining](https://github.com/Longhorn-Developers/UT-Dining) app, built with [Next.js](https://nextjs.org/), [Mantine UI](https://mantine.dev/), and [Supabase](https://supabase.com/).

---

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

---

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

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
# or
npm install
# or
yarn install
```

### 2. Set up environment variables

Create a `.env.local` file with your Supabase credentials and any other required environment variables.

### 3. Run the development server

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## Supabase Local Development

You can run Supabase locally for development and testing.

1. **Install the Supabase CLI:**
   https://supabase.com/docs/guides/cli

2. **Start Supabase locally:**

   ```bash
   supabase start
   ```

   This will start Supabase (Postgres, Auth, Storage, etc.) on your machine.

3. **Connect your app:**
   Make sure your `.env.local` is configured to use the local Supabase instance (see Supabase docs for connection details).

4. **Default Test User:**

   - **Email:** `test@test.com`
   - **Password:** `password`

   Use these credentials to log in to the dashboard during development.

---

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

---

## Customization

- **Add new features:**  
  Create new components in `components/dashboard/` or utilities in `lib/`.
- **Change styling:**  
  Edit Mantine theme in `app/theme.ts` or override styles in `app/theme.css`.
- **Backend logic:**  
  Update server actions in `app/(private)/dashboard/action.ts`.

---

## License

MIT
