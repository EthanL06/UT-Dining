# UT Dining Website

The Ultimate Dining Experience for UT Students.
Discover, rate, and explore dining options across campus. Join thousands of Longhorns making informed dining choices.

## Getting Started

The website is part of the UT Dining monorepo. From the repo root:

```bash
./setup.sh
./dev.sh website      # http://localhost:3001/ut-dining-website
pnpm --filter @ut-dining/website build   # static export in apps/website/out
```

## Deployment

`.github/workflows/website-deploy.yml` builds the site on pushes to `main` and publishes `out/` to the `gh-pages` branch of [Longhorn-Developers/ut-dining-website](https://github.com/Longhorn-Developers/ut-dining-website). That keeps the site at https://longhorn-developers.github.io/ut-dining-website/, which the App Store privacy-policy link uses.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) for more details.
