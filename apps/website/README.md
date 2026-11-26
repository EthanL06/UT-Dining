# UT Dining Website

The marketing site for UT Dining: a feature overview, the changelog and the privacy policy.

## Getting Started

The website is part of the UT Dining monorepo. From the repo root:

```bash
pnpm install
pnpm --filter @ut-dining/website dev     # http://localhost:3000
pnpm --filter @ut-dining/website build
```

## Changelog

`/changelog/` and the home page's "What's new" card render on the server from published rows in the Supabase `changelog` table (`WEBSITE_SUPABASE_URL`, `WEBSITE_SUPABASE_ANON_KEY`). Pages revalidate every 5 minutes, so dashboard edits show up without a deploy. Without the variables, or if the request fails, the site uses `content/changelog.json`.

## SEO

- `WEBSITE_SITE_URL` sets the absolute site URL used for canonical links, Open Graph, the sitemap and JSON-LD. On Vercel it falls back to the production or branch URL.
- Each page sets its own title, description and canonical URL through `pageMetadata()` in `lib/site.ts`.
- `public/og.png` is the share image for Open Graph and Twitter cards.
- The home page has JSON-LD for the Organization, WebSite and MobileApplication.
- `app/sitemap.ts`, `app/robots.ts` and `app/manifest.ts` generate the sitemap, robots.txt and the web manifest. Vercel preview deployments disallow crawling.
- The `apple-itunes-app` meta shows Safari's Smart App Banner on iPhone.

## Deployment

The Vercel project `ut-dining-website` builds `apps/website` and serves it from `/`. Production builds from `main`, and other branches get previews that read dev Supabase. `vercel.json` skips builds when nothing the website depends on changed (`turbo-ignore`), and it never builds `assets/*` branches.

Until the App Store links move to Vercel, `.github/workflows/website-deploy.yml` builds a static copy with `WEBSITE_STATIC_EXPORT=1` (base path `/ut-dining-website`) on pushes to `main` and publishes it to the `gh-pages` branch of [Longhorn-Developers/ut-dining-website](https://github.com/Longhorn-Developers/ut-dining-website), so https://longhorn-developers.github.io/ut-dining-website/privacy-policy/ keeps working.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) for more details.
