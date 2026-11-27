# UT Dining open data

Every menu, dish, nutrition label, allergen flag and set of opening hours that the [UT Dining](https://github.com/EthanL06/UT-Dining) app shows for UT Austin's dining halls, cafés, markets, restaurants and food trucks, as plain JSON and CSV files.

The files update automatically after each menu scrape, twice a day (about 1 AM and 9:20 AM Central). Each update is one commit, so the git history shows exactly what changed and when. Past days are never deleted, so this repository is also the long-term archive of every menu since July 2025.

This is not an official University of Texas source. See [Source and terms](#source-and-terms) before you rely on it.

## Files

| Path                                   | What it holds                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `menus/YYYY/YYYY-MM-DD.json` and `.csv` | Everything served on that day: location, meal, station and dish                 |
| `dishes.json` and `dishes.csv`         | Every dish ever served, with nutrition, ingredients and allergens               |
| `locations.json` and `locations.csv`   | Every location with its type, address, map pin, payment methods and hours       |

Menus and dishes are split so that a dish served 200 times is stored once. Join a menu row to `dishes` on `dish_id`.

JSON is the primary format. Each CSV has the same data flattened, with a header row, UTF-8 and RFC 4180 quoting.

## Quick start

Today's menus with calories, in Python:

```python
import json, urllib.request
base = "https://raw.githubusercontent.com/EthanL06/ut-dining-data/main"
day = json.load(urllib.request.urlopen(f"{base}/menus/2026/2026-11-28.json"))
dishes = {d["id"]: d for d in json.load(urllib.request.urlopen(f"{base}/dishes.json"))}
for menu in day["menus"]:
    for category in menu["categories"]:
        for item in category["items"]:
            dish = dishes[item["dish_id"]]
            print(menu["location"], menu["meal"], dish["name"], (dish["nutrition"] or {}).get("calories"))
```

Or clone the repository and load the CSVs into a spreadsheet, pandas, DuckDB or SQLite.

## Schema

### `menus/YYYY/YYYY-MM-DD.json`

```json
{
  "date": "2026-11-28",
  "menus": [
    {
      "location": "J2 Dining",
      "location_id": "feb48836-df0e-4bbe-bdc8-b0a64df9c086",
      "meal": "Breakfast",
      "categories": [
        {
          "name": "Breakfast Plant Based",
          "items": [{ "dish_id": "d121660b5a19", "name": "Lentil and Mushroom Ragu" }]
        }
      ]
    }
  ]
}
```

| Field                     | Type   | Notes                                                                   |
| ------------------------- | ------ | ----------------------------------------------------------------------- |
| `date`                    | string | Service date in Central time, `YYYY-MM-DD`                              |
| `menus[].location`        | string | Location name, as in `locations`                                        |
| `menus[].location_id`     | string | Joins to `locations[].id`                                               |
| `menus[].meal`            | string | Breakfast, Lunch, Dinner, or the name the location uses                 |
| `categories[].name`       | string | The station or section, in the order UT lists them                      |
| `items[].dish_id`         | string | Joins to `dishes[].id`                                                  |
| `items[].name`            | string | Dish name, repeated here for convenience                                |

Menus are ordered by location name, then Breakfast, Brunch, Lunch, Dinner, then any other meal. A day with no file means no menus were posted. Menus are published a few days ahead, so a future day's file can still change until that day passes.

CSV columns: `date, location, location_id, meal, category, dish_id, dish_name`, one row per item.

### `dishes.json`

An array with one dish per line, sorted by name.

| Field                  | Type            | Notes                                                                                               |
| ---------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `id`                   | string          | 12 hex characters, derived from the name, recipe, nutrition and allergens                           |
| `name`                 | string          | Dish name                                                                                           |
| `recipe`               | string or null  | UT FoodPro recipe number and portion, such as `310109*3`                                            |
| `first_seen`           | string          | First date this exact dish appeared on a menu                                                       |
| `last_seen`            | string          | Latest date it appeared                                                                             |
| `nutrition`            | object or null  | Per serving, as printed on the label. Null when UT has no label                                      |
| `allergens`            | object or null  | `true` or `false` per allergen or diet. Null when unknown                                            |

If UT changes a recipe's nutrition or allergens, the new version gets a new `id` and the old one stays, so every past menu still points at the label that was shown that day.

`nutrition` keys, each a string with its unit as printed, or null when the label leaves it blank: `serving_size`, `calories`, `total_fat`, `saturated_fat`, `trans_fat`, `cholesterol`, `sodium`, `total_carbohydrates`, `dietary_fiber`, `total_sugars`, `protein`, `vitamin_d`, `calcium`, `iron`, `potassium`, `ingredients`. Units are `g`, `mg` and `mcg`; `calories` has none.

`allergens` keys: `beef`, `egg`, `fish`, `milk`, `peanuts`, `pork`, `sesame_seeds`, `shellfish`, `soy`, `tree_nuts`, `wheat`, `vegan`, `vegetarian`, `halal`. They combine the menu icons with the allergen line on the label.

CSV columns: `dish_id, name, recipe, first_seen, last_seen`, then one column per nutrition key, then one per allergen key.

### `locations.json`

The current list of locations. The git history has older versions.

| Field                   | Type            | Notes                                                                                     |
| ----------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `id`                    | string          | UUID                                                                                      |
| `name`                  | string          | Location name                                                                             |
| `colloquial_name`       | string or null  | What students call it, such as "J2"                                                       |
| `type`                  | string or null  | Dining Hall, Food & Drink, Food Truck, Coffee Shop or Convenience Store                   |
| `description`           | string          |                                                                                           |
| `address`               | string          |                                                                                           |
| `latitude`, `longitude` | number or null  |                                                                                           |
| `google_maps_link`, `apple_maps_link` | string or null |                                                                             |
| `image`                 | string or null  | Image URL                                                                                 |
| `has_menus`             | boolean         | Whether the location posts daily menus                                                    |
| `temporarily_closed`    | boolean         | Closed until further notice, whatever the hours say                                       |
| `methods_of_payment`    | string[]        | Such as `Cash`, `Credit/Debit`, `Dine In Dollars`                                         |
| `regular_service_hours` | object          | Weekly hours, see below                                                                   |
| `meal_times`            | object[]        | Dining halls: when each meal is served                                                    |

`regular_service_hours` has a key per weekday (`monday` to `sunday`), each `{ "isClosed": boolean, "timeRanges": [{ "open": 1100, "close": 2000 }] }`. Times are 24-hour `HHMM` integers in Central time, so `1100` is 11:00 AM and `2359` means midnight. When `isClosed` is true, ignore `timeRanges`.

In the CSV, `methods_of_payment` is joined with `;`, and `regular_service_hours` and `meal_times` are JSON strings.

## Source and terms

The menus, nutrition and allergen information come from UT Austin University Housing and Dining's public FoodPro pages, and hours from UT's housing and University Unions sites. UT Dining collects them and republishes them here as-is. This project is not affiliated with or endorsed by the University of Texas at Austin.

The data can be wrong, late or incomplete, and recipes change. Do not rely on it for allergy or medical decisions; check with dining staff. It is provided without warranty of any kind.

The code that produces these files is MIT licensed in [EthanL06/UT-Dining](https://github.com/EthanL06/UT-Dining) (`apps/scraper/src/export.ts`). Found a problem? Open an issue there.
