/* ============================================================
   Bakers Gallery — full menu data
   Bakery & café menu (Indapur). Prices are representative —
   edit them freely to match your rate card.
   ============================================================ */

const NON_VEG_RE = /chicken|fish|egg/i;

function isVeg(name) { return !NON_VEG_RE.test(name); }

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function emojiFor(name) {
  const n = name.toLowerCase();
  if (/cake/.test(n)) return "🎂";
  if (/pastry/.test(n)) return "🍰";
  if (/cupcake|muffin/.test(n)) return "🧁";
  if (/cookie|biscuit|nankhatai/.test(n)) return "🍪";
  if (/bread|bun|pav|khari|toast/.test(n)) return "🍞";
  if (/puff/.test(n)) return "🥐";
  if (/pizza/.test(n)) return "🍕";
  if (/burger/.test(n)) return "🍔";
  if (/sandwich/.test(n)) return "🥪";
  if (/wrap|frankie/.test(n)) return "🌯";
  if (/nuggets|fries|wedges|garlic bread/.test(n)) return "🍟";
  if (/shake|cold coffee|coffee frappe/.test(n)) return "🥤";
  if (/mojito|cooler|mocktail|soda|lagoon/.test(n)) return "🧋";
  if (/coffee|cappuccino|hot chocolate|chai|tea/.test(n)) return "☕";
  if (/chicken|kfc/.test(n)) return "🍗";
  if (/paneer/.test(n)) return "🧀";
  if (/corn/.test(n)) return "🌽";
  return "🍽️";
}

// item helper -> { id, name, price, veg, emoji }
function C(name, price) {
  return { id: slug(name), name, price, veg: isVeg(name), emoji: emojiFor(name) };
}

const MENU = [
  {
    id: "cakes", name: "Cakes", emoji: "🎂",
    blurb: "Fresh cream & flavoured cakes for every celebration.",
    items: [
      C("Chocolate Truffle Cake", 549),
      C("Black Forest Cake", 499),
      C("Pineapple Cake", 449),
      C("Butterscotch Cake", 499),
      C("Red Velvet Cake", 649),
      C("Fresh Fruit Cake", 599),
      C("Blueberry Cake", 649),
      C("Choco Chips Cake", 529)
    ]
  },
  {
    id: "pastries", name: "Pastries", emoji: "🍰",
    blurb: "Single-serve slices of our best-selling cakes.",
    items: [
      C("Chocolate Truffle Pastry", 60),
      C("Black Forest Pastry", 55),
      C("Pineapple Pastry", 50),
      C("Red Velvet Pastry", 70),
      C("Butterscotch Pastry", 60),
      C("Choco Chips Pastry", 60)
    ]
  },
  {
    id: "cupcakes-muffins", name: "Cupcakes & Muffins", emoji: "🧁",
    blurb: "Bite-sized happiness, baked daily.",
    items: [
      C("Choco Cupcake", 40),
      C("Vanilla Cupcake", 35),
      C("Red Velvet Cupcake", 50),
      C("Chocolate Muffin", 55),
      C("Blueberry Muffin", 55)
    ]
  },
  {
    id: "breads-buns", name: "Breads & Buns", emoji: "🍞",
    blurb: "Soft, fresh loaves and buns straight from the oven.",
    items: [
      C("Sandwich Bread", 45),
      C("Milk Bread", 50),
      C("Whole Wheat Bread", 60),
      C("Burger Buns (4 pcs)", 40),
      C("Pav (4 pcs)", 30),
      C("Khari / Toast", 35)
    ]
  },
  {
    id: "cookies", name: "Cookies & Biscuits", emoji: "🍪",
    blurb: "Crunchy, buttery and made to go with chai.",
    items: [
      C("Choco Chip Cookies (100g)", 60),
      C("Butter Cookies (100g)", 50),
      C("Jeera / Ajwain Cookies (100g)", 45),
      C("Oatmeal Cookies (100g)", 70),
      C("Nankhatai (100g)", 55)
    ]
  },
  {
    id: "puffs-rolls", name: "Puffs & Rolls", emoji: "🥐",
    blurb: "Flaky, golden and freshly filled.",
    items: [
      C("Veg Puff", 25),
      C("Paneer Puff", 35),
      C("Cheese Puff", 40),
      C("Chicken Puff", 45),
      C("Cheese Roll", 40),
      C("Chicken Roll", 50)
    ]
  },
  {
    id: "pizza", name: "Pizza", emoji: "🍕",
    blurb: "Hot, cheesy and loaded with toppings.",
    items: [
      C("Margherita Pizza", 199),
      C("Farmhouse Pizza", 249),
      C("Corn & Cheese Pizza", 229),
      C("Paneer Tikka Pizza", 269),
      C("Veggie Delight Pizza", 259),
      C("Chicken Tikka Pizza", 299),
      C("Chicken Cheese Pizza", 319)
    ]
  },
  {
    id: "burgers", name: "Burgers", emoji: "🍔",
    blurb: "Juicy, stacked and satisfying.",
    items: [
      C("Aloo Tikki Burger", 69),
      C("Veg Crunch Burger", 89),
      C("Paneer Burger", 109),
      C("Cheese Burger", 99),
      C("Chicken Burger", 119),
      C("Chicken Cheese Burger", 149)
    ]
  },
  {
    id: "sandwiches", name: "Sandwiches", emoji: "🥪",
    blurb: "Grilled fresh, pressed to perfection.",
    items: [
      C("Veg Grilled Sandwich", 89),
      C("Cheese Grilled Sandwich", 109),
      C("Paneer Sandwich", 119),
      C("Corn & Cheese Sandwich", 99),
      C("Chicken Sandwich", 129),
      C("Club Sandwich", 149)
    ]
  },
  {
    id: "wraps", name: "Wraps & Frankies", emoji: "🌯",
    blurb: "Hand-rolled and full of flavour.",
    items: [
      C("Veg Wrap", 99),
      C("Paneer Wrap", 129),
      C("Chicken Wrap", 149),
      C("Chicken Frankie", 139)
    ]
  },
  {
    id: "snacks", name: "Snacks & Quick Bites", emoji: "🍟",
    blurb: "Crunchy bites for every craving.",
    items: [
      C("French Fries", 89),
      C("Peri Peri Fries", 119),
      C("Cheese Garlic Bread", 129),
      C("Veg Nuggets (6 pcs)", 99),
      C("Chicken Nuggets (6 pcs)", 129),
      C("Potato Wedges", 109)
    ]
  },
  {
    id: "cold-coffee-shakes", name: "Cold Coffee & Shakes", emoji: "🥤",
    blurb: "Thick, chilled and freshly blended.",
    items: [
      C("Cold Coffee", 99),
      C("Chocolate Cold Coffee", 119),
      C("Oreo Shake", 129),
      C("Chocolate Shake", 119),
      C("Strawberry Shake", 109),
      C("Butterscotch Shake", 119),
      C("Mango Shake", 99),
      C("KitKat Shake", 139)
    ]
  },
  {
    id: "hot-beverages", name: "Hot Beverages", emoji: "☕",
    blurb: "Warm and comforting, all day long.",
    items: [
      C("Hot Coffee", 49),
      C("Cappuccino", 89),
      C("Hot Chocolate", 99),
      C("Masala Chai", 29),
      C("Green Tea", 59)
    ]
  },
  {
    id: "mocktails", name: "Mocktails & Coolers", emoji: "🧋",
    blurb: "Refreshing coolers to beat the heat.",
    items: [
      C("Virgin Mojito", 99),
      C("Blue Lagoon", 109),
      C("Fresh Lime Soda", 79),
      C("Watermelon Cooler", 99)
    ]
  }
];

// attach a real food photo to each category
const CATEGORY_IMG = {
  cakes: "assets/food/cakes.jpg",
  pastries: "assets/food/pastries.jpg",
  "cupcakes-muffins": "assets/food/cupcakes-muffins.jpg",
  "breads-buns": "assets/food/breads-buns.jpg",
  cookies: "assets/food/cookies.jpg",
  "puffs-rolls": "assets/food/puffs-rolls.jpg",
  pizza: "assets/food/pizza.jpg",
  burgers: "assets/food/burgers.jpg",
  sandwiches: "assets/food/sandwiches.jpg",
  wraps: "assets/food/wraps.jpg",
  snacks: "assets/food/snacks.jpg",
  "cold-coffee-shakes": "assets/food/cold-coffee-shakes.jpg",
  "hot-beverages": "assets/food/hot-beverages.jpg",
  mocktails: "assets/food/mocktails.jpg"
};
MENU.forEach(c => {
  c.img = CATEGORY_IMG[c.id] || "";
  c.items.forEach(it => { it.img = c.img; });
});

// Flattened lookup for cart operations
const ALL_ITEMS = {};
MENU.forEach(cat => cat.items.forEach(it => { ALL_ITEMS[it.id] = it; }));

// expose globally for other scripts
window.MENU = MENU;
window.ALL_ITEMS = ALL_ITEMS;
