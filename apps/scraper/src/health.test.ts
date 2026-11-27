import { describe, expect, it } from 'vitest';
import {
  buildReport,
  checkMenuPage,
  checkShortMenu,
  formatReport,
  isBlankLabel,
  unknownIcons,
} from './health.ts';
import { parseLabel, parseMealLinks, parseMenuPage } from './parse.ts';

const noData = `
  <div class="shortmenutitle">Menus for Friday, November 27, 2026</div>
  <table align="center" border="0" width=60%>
    <tr>
      <td><div class="shortmenuinstructs">No Data Available</div></td>
    </tr>
  </table>`;

const shortMenu = `
  <div class="shortmenumeals">Breakfast</div>
  <a href="longmenu.aspx?sName=University+Housing+and+Dining&locationNum=03&locationName=Kins+Dining&naFlag=1&dtdate=12%2f2%2f2026&mealName=Breakfast">Nutritive Analysis</a>`;

const row = (name: string, recipe: string, icons: string[]) => `
  <tr><td><table><tr>
    <td><div class='longmenucoldispname'><a href='label.aspx?locationNum=03&dtdate=12%2f2%2f2026&RecNumAndPort=${recipe}' target=_top>${name}</a></div></td>
    <td>${icons.map((icon) => `<img src="LegendImages/${icon}.png" alt="${icon} Icon">`).join('')}</td>
  </tr></table></td></tr>`;

const longMenu = (rows: string) => `
  <table><tr><td class="longmenugridheader">
    <a name="Lunch"><div class="longmenugridheader">Lunch&nbsp;Menu for Wednesday, December 2, 2026</div></a>
  </td></tr>
  <tr><td><div class='longmenucolmenucat'>-- Comfort --</div></td></tr>
  ${rows}</table>`;

const renamedRows = `
  <table><tr><td class="mealheader">Lunch Menu</td></tr>
  <tr><td><div class='menuitem'><a href='label.aspx?RecNumAndPort=111111*1'>Pasta</a></div></td></tr>
  <tr><td><div class='menuitem'><a href='label.aspx?RecNumAndPort=222222*1'>Salad</a></div></td></tr>
  </table>`;

describe('checkShortMenu', () => {
  it('treats FoodPro saying No Data Available as no menu posted', () => {
    expect(checkShortMenu(noData, parseMealLinks(noData))).toBe('not-posted');
  });

  it('accepts a page with meal links', () => {
    expect(checkShortMenu(shortMenu, parseMealLinks(shortMenu))).toBe('menus');
  });

  it('flags a page with neither meal links nor the empty note', () => {
    const html = '<div class="mealbutton" data-meal="Breakfast">Breakfast</div>';
    expect(checkShortMenu(html, parseMealLinks(html))).toBe('unrecognized');
  });
});

describe('checkMenuPage', () => {
  it('accepts a normal meal page', () => {
    const html = longMenu(row('Pasta', '111111*1', ['Wheat']) + row('Salad', '222222*1', []));
    expect(checkMenuPage(html, parseMenuPage(html))).toBeNull();
  });

  it('accepts an empty meal that FoodPro marks as No Data Available', () => {
    expect(checkMenuPage(noData, parseMenuPage(noData))).toBeNull();
  });

  it('flags label links that no longer parse into items', () => {
    expect(checkMenuPage(renamedRows, parseMenuPage(renamedRows))).toBe(
      'The meal page links 2 nutrition labels but only 0 items were parsed',
    );
  });

  it('flags a missing meal header', () => {
    const html = longMenu(row('Pasta', '111111*1', [])).replaceAll('longmenugridheader', 'x');
    expect(checkMenuPage(html, parseMenuPage(html))).toBe(
      'The meal name could not be read from the page header',
    );
  });

  it('flags an empty page without the empty note', () => {
    const html = '<html><body><div>Something else</div></body></html>';
    expect(checkMenuPage(html, parseMenuPage(html))).toMatch(/no items/);
  });
});

describe('unknownIcons', () => {
  it('lists only icons the parser cannot map', () => {
    const html = longMenu(row('Curry', '1*1', ['Halal', 'Mustard', 'Veggie', 'Gluten_Free']));
    expect(unknownIcons(html)).toEqual(['Mustard.png', 'Gluten_Free.png']);
  });
});

describe('isBlankLabel', () => {
  it('spots a label with no nutrition facts at all', () => {
    expect(isBlankLabel(parseLabel('<div>Label unavailable</div>'))).toBe(true);
    expect(isBlankLabel(parseLabel('<span class="nutfactscaloriesval">0</span>Sodium 0mg'))).toBe(
      false,
    );
  });
});

describe('buildReport', () => {
  const base = {
    dates: ['2026-12-24', '2026-12-25'],
    locationDays: 14,
    served: 0,
    notPosted: 14,
    labels: 0,
    blankLabels: 0,
    problems: [],
    unrecognizedAllergens: [],
    unknownIconFiles: [],
    checkedAt: '2026-12-24T07:30:00.000Z',
  };

  it('is healthy when UT posted nothing for a break', () => {
    const report = buildReport(base);
    expect(report.healthy).toBe(true);
    expect(formatReport(report)).toContain('without problems for 2026-12-24 to 2026-12-25');
  });

  it('flags mostly blank labels and new allergens', () => {
    const report = buildReport({
      ...base,
      served: 7,
      notPosted: 7,
      labels: 100,
      blankLabels: 80,
      unrecognizedAllergens: ['Mustard'],
    });
    expect(report.healthy).toBe(false);
    expect(report.problems.map((problem) => problem.kind)).toEqual(['layout', 'mapping']);
    const text = formatReport(report, 'https://github.com/run/1');
    expect(text).toContain('80 of 100 nutrition labels had no nutrition facts');
    expect(text).toContain('Mustard');
    expect(text).toContain('- Run: https://github.com/run/1');
  });

  it('ignores a few blank labels', () => {
    expect(buildReport({ ...base, labels: 400, blankLabels: 3 }).healthy).toBe(true);
  });
});
