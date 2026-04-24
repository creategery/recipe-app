const TAG_RULES: { tag: string; keywords: RegExp }[] = [
  { tag: 'Breakfast',     keywords: /breakfast|pancake|waffle|oatmeal|omelette|omelet|frittata|granola|french toast|egg muffin|scrambled egg|morning|brunch/i },
  { tag: 'Dessert',       keywords: /\b(cookies?|brownie|cheesecake|cupcake|biscotti|macaron|tiramisu|fudge|cobbler|crumble|dessert|sorbet|gelato|mousse|meringue|pavlova|trifle|eclair|profiterole|cannoli|churro|praline|ganache|frosting|icing)\b|\bice cream\b|\bwhipped cream\b|\bchocolate chip\b|\bbread pudding\b|\brice pudding\b|\bchocolate pudding\b|\bchocolate truffle\b|\bpanna cotta\b|\bcreme brulee\b|\bcrème brûlée\b|\bfruit tart\b|\begg tart\b|\blemon tart\b|\bcaramel sauce\b|\bcaramel apple\b|\bsweet potato pie\b|\bcherry pie\b|\bapple pie\b|\bpumpkin pie\b|\bpecan pie\b|\bkey lime pie\b/i },
  { tag: 'Appetizer',     keywords: /appetizer|starter|dip|bruschetta|crostini|skewer|wing|slider|spring roll|dumpling|wonton|tartlet|canapé|amuse/i },
  { tag: 'Snack',         keywords: /snack|granola bar|trail mix|popcorn|chip|cracker|hummus|guacamole|salsa|pretzel/i },
  { tag: 'Mexican',       keywords: /taco|burrito|enchilada|quesadilla|fajita|carnitas|tamale|salsa|guacamole|jalapeño|chipotle|cilantro.*lime|mexican|tortilla|pozole|mole|horchata/i },
  { tag: 'Italian',       keywords: /pasta|pizza|risotto|lasagna|gnocchi|carbonara|bolognese|marinara|alfredo|pesto|tiramisu|parmesan|mozzarella|italian|prosciutto|pancetta|osso buco|polenta/i },
  { tag: 'Asian',         keywords: /stir.?fry|fried rice|ramen|pho|sushi|dumpling|wonton|teriyaki|soy sauce|sesame|ginger|miso|kimchi|pad thai|curry|thai|chinese|japanese|korean|vietnamese|sriracha|hoisin|oyster sauce/i },
  { tag: 'Mediterranean', keywords: /mediterranean|falafel|hummus|tzatziki|pita|couscous|tabbouleh|shakshuka|harissa|za.?atar|tahini|greek|moroccan|lebanese|feta|olive.*kalamata/i },
  { tag: 'Indian',        keywords: /curry|masala|tikka|biryani|dal|lentil.*indian|naan|chapati|paneer|turmeric|garam masala|cumin.*coriander|chutney|tandoori|samosa|korma|vindaloo/i },
  { tag: 'American',      keywords: /bbq|barbecue|burger|hot dog|mac.*cheese|fried chicken|biscuit.*gravy|cornbread|buffalo|coleslaw|chili|meatloaf|pot roast|clam chowder|new england|southern/i },
  { tag: 'Vegetarian',    keywords: /vegetarian|meatless|no meat|plant.?based|veggie/i },
  { tag: 'Vegan',         keywords: /\bvegan\b|dairy.?free.*egg.?free|plant.?based.*no dairy/i },
  { tag: 'Gluten-Free',   keywords: /gluten.?free|celiac|no gluten|almond flour|rice flour|tapioca flour/i },
  { tag: 'Slow Cooker',   keywords: /slow cooker|crockpot|crock.?pot|low.*slow|braised.*hours/i },
  { tag: 'Grilling',      keywords: /grill|barbecue|bbq|charcoal|smoker|smoked|smoke ring|indirect heat/i },
  { tag: 'Quick',         keywords: /\b(15|20|30)-minute\b|quick (and easy|dinner|meal|recipe)|fast (dinner|meal|recipe)|\bunder 30 min|\bspeedy\b/i },
];

export function autoDetectTags(title: string, ingredients: string[], instructions: string[]): string[] {
  const corpus = [title, ...ingredients, ...instructions].join(' ');
  return TAG_RULES
    .filter(({ keywords }) => keywords.test(corpus))
    .map(({ tag }) => tag);
}
