export interface PlaceSource {
  location: string;
  hoursRow?: string;
  uhdPage?: string;
  unionsTruck?: string;
}

const uhd = (list: 'restaurants' | 'coffee-shops' | 'convenience-stores', slug: string) =>
  `https://housing.utexas.edu/dining/dining-locations/${list}/${slug}`;

const truck = (slug: string) => `https://universityunions.utexas.edu/eat/food-trucks/${slug}`;

export const PLACE_SOURCES: PlaceSource[] = [
  {
    location: 'Chick-fil-A – Texas Union',
    hoursRow: 'Chick-fil-A (Texas Union)',
    uhdPage: uhd('restaurants', 'chick-fil-texas-union'),
  },
  {
    location: 'Chick-fil-A – WCP',
    hoursRow: 'Chick-fil-A (WCP)',
    uhdPage: uhd('restaurants', 'chick-fil-wcp'),
  },
  {
    location: 'Cypress Bend Cafe',
    hoursRow: 'Cypress Bend Cafe',
    uhdPage: uhd('restaurants', 'cypress-bend-cafe'),
  },
  {
    location: "Jesta' Pizza",
    hoursRow: 'Jesta Pizza',
    uhdPage: uhd('restaurants', 'jesta-pizza'),
  },
  {
    location: 'Littlefield Patio Cafe',
    hoursRow: 'Littlefield Patio Cafe',
    uhdPage: uhd('restaurants', 'littlefield-patio-cafe'),
  },
  {
    location: 'One Two Three Sushi',
    hoursRow: 'One Two Three Sushi',
    uhdPage: uhd('restaurants', 'one-two-three-sushi'),
  },
  {
    location: 'Panda Express',
    hoursRow: 'Panda Express',
    uhdPage: uhd('restaurants', 'panda-express'),
  },
  {
    location: 'Sabor Tacos y Más',
    hoursRow: 'Sabor Tacos y Mas',
    uhdPage: uhd('restaurants', 'sabor-tacos-y-mas'),
  },
  {
    location: 'Tower Burgers and Fries',
    hoursRow: 'Tower Burger',
    uhdPage: uhd('restaurants', 'tower-burgers-and-fries'),
  },
  {
    location: 'Noodle Lab',
    hoursRow: 'Noodle Lab',
    uhdPage: uhd('restaurants', 'noodle-lab'),
  },
  {
    location: 'Shake Smart — Union',
    hoursRow: 'Shake Smart',
    uhdPage: uhd('coffee-shops', 'shake-smart'),
  },
  {
    location: 'Jester Java',
    hoursRow: 'Jester Java',
    uhdPage: uhd('coffee-shops', 'jester-java'),
  },
  {
    location: 'Longhorn Coffee Co.',
    hoursRow: 'Longhorn Coffee Co.',
    uhdPage: uhd('coffee-shops', 'longhorn-coffee-co'),
  },
  {
    location: "Prufrock's Coffee",
    hoursRow: "Prufrock's Coffee",
    uhdPage: uhd('coffee-shops', 'prufrocks'),
  },
  {
    location: 'Coffee Union House',
    hoursRow: 'Union Coffee House',
    uhdPage: uhd('coffee-shops', 'union-coffee-house'),
  },
  {
    location: 'Up and Atom',
    hoursRow: 'Up and Atom',
    uhdPage: uhd('coffee-shops', 'up-and-atom'),
  },
  {
    location: 'Varsity Grounds',
    hoursRow: 'Varsity Grounds',
    uhdPage: uhd('coffee-shops', 'varsity-grounds'),
  },
  {
    location: 'Jester City Market',
    hoursRow: 'Jester City Market',
    uhdPage: uhd('convenience-stores', 'jester-city-market'),
  },
  {
    location: "Kin's Market",
    hoursRow: "Kin's Market",
    uhdPage: uhd('convenience-stores', 'kins-market'),
  },
  {
    location: 'Hook ’em Hut – Texas Union',
    hoursRow: "Hook 'em Hut (Texas Union)",
    uhdPage: uhd('convenience-stores', 'hook-em-hut-texas-union'),
  },
  {
    location: 'Hook ’em Hut – WCP',
    hoursRow: "Hook 'em Hut (WCP)",
    uhdPage: uhd('convenience-stores', 'hook-em-hut-wcp'),
  },
  {
    location: 'La Fonda',
    hoursRow: 'La Fonda Food Trailer',
    uhdPage: uhd('restaurants', 'la-fonda'),
    unionsTruck: truck('la-fonda'),
  },
  {
    location: '512 Brew Bus',
    hoursRow: '512 Brew Bus',
    unionsTruck: truck('512-brew-bus'),
  },
  { location: "Sam's Gyro Halal", unionsTruck: truck('sams-gyro-halal') },
  { location: 'Yapa Artisan Empanadas', unionsTruck: truck('yapa-artisan-empanadas') },
  { location: 'Frios Gourmet Pops', unionsTruck: truck('frios-gourmet-pops') },
  { location: 'Kriya Matcha', unionsTruck: 'https://universityunions.utexas.edu/kriya-matcha' },
  { location: 'Tacowey', unionsTruck: truck('tacowey') },
];
