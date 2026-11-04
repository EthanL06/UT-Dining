# Mobile E2E tests (Maestro)

End-to-end flows for the iOS app, written for [Maestro](https://docs.maestro.dev). They drive the development build of `com.ethanl06.ut-dining.dev` on the iOS Simulator against local Supabase.

## Run

Needs macOS with Xcode, Docker, Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`, which needs Java 17+) and a simulator with the development client installed (`pnpm dev:ios`).

```sh
pnpm db:start
pnpm e2e:ios --sim <UDID>
pnpm e2e:ios --sim <UDID> apps/mobile/e2e/flows/favorites.yaml
pnpm e2e:ios --sim <UDID> --include-tags smoke
```

`scripts/qa/mobile-e2e.sh` loads the fixture menus into local Supabase, points `apps/mobile/.env.local` at it, boots the simulator in light appearance, starts Metro when it is not running, runs Maestro, and stops what it started. The JUnit report, screenshots and Maestro logs go to `.context/maestro/<time>/`. Pass `--release` when the simulator has a release build of the dev bundle id instead of a development client.

It refuses to run unless `supabase status` reports a `http://127.0.0.1:` API URL, so fixtures never reach the hosted projects.

## Test data

`fixtures/menus.sql` writes menus for J2 Dining from yesterday to three days ahead (Central time), through the same `insert_multiple_locations_and_menus` function the scraper uses. It replaces any J2 menus on those days and is safe to run again.

| Item | Where |
| --- | --- |
| Maestro Veggie Burger, Maestro Grilled Chicken | Maestro Grill, every meal and day |
| Maestro Garden Salad, Maestro Tofu Bowl | Maestro Greens, every meal and day |
| Maestro Breakfast Tacos | Maestro Grill, Breakfast only |
| Maestro Tomorrow Special | Maestro Grill, tomorrow only |

## Flows

| Flow | Checks |
| --- | --- |
| `onboarding.yaml` | Onboarding steps, Finish lands on Home, a relaunch skips onboarding |
| `location-menu.yaml` | J2 menu shows categories and items, a category collapses and expands |
| `menu-search.yaml` | Search narrows the menu, a miss shows the empty state, Cancel clears it |
| `menu-meals-and-dates.yaml` | Meal chips switch menus, the date arrows load tomorrow's menu |
| `food-details.yaml` | A food opens nutrition and allergens |
| `favorites.yaml` | Heart on a food and a left swipe add favorites, left swipes remove them |
| `meal-plan.yaml` | A right swipe and the chef hat add to the meal plan, right swipes remove |
| `settings.yaml` | Dark mode switch, Sync Data, Favorites quick link |
| `tabs.yaml` | Map, Notifications (seeded notifications) and Home tabs |

Every flow starts from a clean install state (`subflows/start.yaml`: clear state, open Metro, finish onboarding). Flows tagged `smoke` are the short set.

## Writing flows

- Match on visible text when it is stable. For icon buttons, use the `testID` on the component (`back-button`, `location-favorites-button`, `food-favorite-button`, `food-meal-plan-button`, `date-next-button`, `menu-search-input`, `settings-dark-mode-switch` and others).
- Use the fixture items, never scraped menus, so a flow does not depend on what UT serves that day.
- Run one flow with `maestro test <file>` while you write it, and `maestro studio` to inspect the screen.
