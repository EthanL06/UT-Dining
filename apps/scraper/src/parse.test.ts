import { describe, expect, it } from 'vitest';
import { resolveAllergens } from './allergens.ts';
import { dateRange, shortMenuUrl } from './config.ts';
import { parseLabel, parseMealLinks, parseMenuPage } from './parse.ts';

const row = (name: string, recipe: string, icons: string[]) => `
  <tr><td><table><tr><td><table><tr>
    <td><div class='longmenucoldispname'><INPUT TYPE=CHECKBOX NAME=recipe VALUE='${recipe}*06'><a href='label.aspx?locationNum=12&locationName=J2+Dining&dtdate=10%2f26%2f2026&RecNumAndPort=${recipe}' target=_top>${name}</a></div></td>
    <td width=10%>${icons.map((icon) => `<img src="LegendImages/${icon}.png" alt="${icon} Icon">`).join('')}</td>
  </tr></table></td></tr></table></td></tr>`;

const category = (name: string) => `
  <tr><td><table><tr><td><table><tr>
    <td><div class='longmenucolmenucat'>-- ${name} --</div></td>
  </tr></table></td></tr></table></td></tr>`;

const menuPage = (rows: string) => `
  <table><tr><td class="longmenugridheader">
    <a name="Lunch"><div class="longmenugridheader">Lunch&nbsp;Menu for Monday, October 26, 2026</div></a>
  </td></tr>${rows}</table>`;

const label = (allergens: string) => `
  <div class="nutfactsservsize">Serving Size</div><div class="nutfactsservsize">1 each</div>
  <span class="nutfactscaloriesval">250</span>
  <div class="nutfactstopnutrient"><b>Total Fat</b>&nbsp;10.5g</div>
  <div class="nutfactstopnutrient">Saturated Fat&nbsp;- - - g</div>
  <div class="nutfactstopnutrient">Sodium&nbsp;480mg</div>
  <div class="nutfactstopnutrient">Total Carbohydrates&nbsp;30g</div>
  <div class="nutfactstopnutrient">Vitamin D - mcg&nbsp;1.2mcg</div>
  <div class="nutfactstopnutrient">Protein&nbsp;8g</div>
  <span class="labelingredientsvalue">Flour, Water</span>
  <span class="labelallergensvalue">${allergens}</span>`;

describe('parseMealLinks', () => {
  it('finds each meal link once, quoted or not', () => {
    const html = `<a href='longmenu.aspx?a=1&amp;mealName=Breakfast'>B</a>
      <a href="longmenu.aspx?a=1&mealName=Lunch">L</a><a href=longmenu.aspx?a=1&mealName=Lunch>L</a>`;
    expect(parseMealLinks(html)).toEqual([
      'https://hf-foodpro.austin.utexas.edu/foodpro/longmenu.aspx?a=1&mealName=Breakfast',
      'https://hf-foodpro.austin.utexas.edu/foodpro/longmenu.aspx?a=1&mealName=Lunch',
    ]);
  });
});

describe('parseMenuPage', () => {
  it('reads the meal, categories, recipes and every icon including halal', () => {
    const page = parseMenuPage(
      menuPage(
        category('The Texas Grill') +
          row('Halal Grilled Chicken', '111111*1', ['Halal', 'Soy']) +
          row('Dinner Roll', '212003*1', ['Wheat', 'Milk', 'Veggie']) +
          category('Plant Point') +
          row('Dinner Roll', '212006*1', ['Wheat', 'Vegan']),
      ),
    );
    expect(page.type).toBe('Lunch');
    expect(page.categories.map((entry) => entry.categoryName)).toEqual([
      'The Texas Grill',
      'Plant Point',
    ]);
    const [grill, plant] = page.categories;
    expect([...grill.rows[0].icons].sort()).toEqual(['halal', 'soy']);
    expect(grill.rows[1].recipe).toBe('212003*1');
    expect(plant.rows[0].recipe).toBe('212006*1');
    expect([...plant.rows[0].icons].sort()).toEqual(['vegan', 'wheat']);
  });
});

describe('parseLabel', () => {
  it('keeps the existing nutrition format and reads the allergen line', () => {
    const parsed = parseLabel(label('Wheat, Soybeans, Tree Nuts, Crustacean Shellfish'));
    expect(parsed.nutrition).toMatchObject({
      servingSize: '1 each',
      calories: 250,
      totalFat: '10.5g',
      saturatedFat: '0g',
      sodium: '480mg',
      totalCarbohydrates: '30g',
      vitaminD: '1.2mcg',
      protein: '8g',
      iron: '0mg',
      ingredients: 'Flour, Water',
    });
    expect([...parsed.allergens].sort()).toEqual(['shellfish', 'soy', 'tree_nuts', 'wheat']);
    expect(parsed.unrecognized).toEqual([]);
  });

  it('reports allergens it does not recognize', () => {
    expect(parseLabel(label('Mustard, Milk')).unrecognized).toEqual(['Mustard']);
  });
});

describe('resolveAllergens', () => {
  it('adds label allergens the icons missed', () => {
    const flags = resolveAllergens(new Set(['vegan']), new Set(['tree_nuts']));
    expect(flags.tree_nuts).toBe(true);
    expect(flags.vegan).toBe(true);
  });

  it('drops vegan and vegetarian when the label contradicts them', () => {
    expect(resolveAllergens(new Set(['vegan']), new Set(['milk'])).vegan).toBe(false);
    const fish = resolveAllergens(new Set(['vegetarian']), new Set(['fish']));
    expect(fish.vegetarian).toBe(false);
  });

  it('returns every key in the existing order', () => {
    expect(Object.keys(resolveAllergens(new Set(), new Set()))).toEqual([
      'beef',
      'egg',
      'fish',
      'milk',
      'peanuts',
      'pork',
      'shellfish',
      'soy',
      'tree_nuts',
      'wheat',
      'sesame_seeds',
      'vegan',
      'vegetarian',
      'halal',
    ]);
  });
});

describe('config', () => {
  it('builds date ranges across month ends', () => {
    expect(dateRange(3, '2026-10-30')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });

  it('builds the same FoodPro URLs as before', () => {
    expect(
      shortMenuUrl(
        { number: '08', name: 'Cypress Bend Cafe', param: 'Cypress+Bend+Cafe+' },
        '2026-07-05',
      ),
    ).toBe(
      'https://hf-foodpro.austin.utexas.edu/foodpro/shortmenu.aspx?sName=University+Housing+and+Dining&locationNum=08&locationName=Cypress+Bend+Cafe+&naFlag=1&dtdate=7%2f5%2f2026',
    );
  });
});
