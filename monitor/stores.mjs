export const PRODUCT = {
  id: 'switch2-zelda-40',
  name: 'Nintendo Switch 2 – The Legend of Zelda – 40th Anniversary Edition',
  releaseDate: '2026-10-29',
  upc: '045496885434',
};

const commonSignatureGroups = [
  ['nintendo switch 2', 'switch 2'],
  ['legend of zelda', 'zelda'],
  ['40th anniversary', '40th anniversary edition', '40 anniversary'],
];

const commonBlocked = [
  'sorry, you have been blocked',
  'access denied',
  'verify you are human',
  'captcha',
  'cf-chl-',
  'cloudflare ray id',
  'robot or human',
];

const commonNegative = {
  COMING_SOON: [
    'coming soon',
    'próximamente',
    'proximamente',
  ],
  OUT_OF_STOCK: [
    'currently unavailable',
    'out of stock',
    'sold out',
    'not available',
    'temporarily out of stock',
    'agotado',
    'sin stock',
    'no disponible',
    'producto no disponible',
  ],
};

const commonPositive = {
  PREORDER: [
    'preorder now',
    'pre-order now',
    'preorder',
    'pre-order',
    'pre-purchase now',
    'prepurchase now',
    'preventa',
    'preventa ahora',
    'reservar',
  ],
  AVAILABLE: [
    'add to cart',
    'add to bag',
    'buy now',
    'shop now',
    'agregar al carrito',
    'añadir al carrito',
    'comprar ahora',
  ],
};

function store({ id, name, country, url, priceCurrency, signatureGroups = commonSignatureGroups, blockedTerms = commonBlocked, negative = commonNegative, positive = commonPositive, expectedPrice = null }) {
  return {
    id,
    name,
    country,
    url,
    priceCurrency,
    signatureGroups,
    blockedTerms,
    negative,
    positive,
    expectedPrice,
  };
}

export const STORES = [
  store({
    id: 'nintendo-us',
    name: 'Nintendo Store',
    country: 'USA',
    priceCurrency: 'USD',
    expectedPrice: 519.99,
    url: 'https://www.nintendo.com/us/store/products/nintendo-switch-2-the-legend-of-zelda-40th-anniversary-edition-121642/',
  }),
  store({
    id: 'bestbuy-us',
    name: 'Best Buy',
    country: 'USA',
    priceCurrency: 'USD',
    expectedPrice: 519.99,
    url: 'https://www.bestbuy.com/product/switch-2-the-legend-of-zelda-40th-anniversary-edition/J7GSL57HTY/sku/6691841',
  }),
  store({
    id: 'gamestop-us',
    name: 'GameStop',
    country: 'USA',
    priceCurrency: 'USD',
    expectedPrice: 519.99,
    url: 'https://www.gamestop.com/consoles-hardware/nintendo-switch-2/products/nintendo-switch-2-the-legend-of-zelda-40th-anniversary-edition/451607.html',
  }),
  store({
    id: 'walmart-us',
    name: 'Walmart',
    country: 'USA',
    priceCurrency: 'USD',
    expectedPrice: 519.00,
    url: 'https://www.walmart.com/ip/Nintendo-Switch-2-The-Legend-of-Zelda-40th-Anniversary-Edition/21002656445',
  }),
  store({
    id: 'target-us',
    name: 'Target',
    country: 'USA',
    priceCurrency: 'USD',
    expectedPrice: 519.99,
    url: 'https://www.target.com/p/-/A-1013322047',
  }),
  store({
    id: 'amazon-us',
    name: 'Amazon US',
    country: 'USA',
    priceCurrency: 'USD',
    url: 'https://www.amazon.com/s?k=Nintendo+Switch+2+The+Legend+of+Zelda+40th+Anniversary+Edition',
  }),
  store({
    id: 'alkosto-co',
    name: 'Alkosto',
    country: 'Colombia',
    priceCurrency: 'COP',
    url: 'https://www.alkosto.com/search?text=Nintendo%20Switch%202%20Zelda%2040',
  }),
  store({
    id: 'ktronix-co',
    name: 'Ktronix',
    country: 'Colombia',
    priceCurrency: 'COP',
    url: 'https://www.ktronix.com/search?text=Nintendo%20Switch%202%20Zelda%2040',
  }),
  store({
    id: 'falabella-co',
    name: 'Falabella Colombia',
    country: 'Colombia',
    priceCurrency: 'COP',
    url: 'https://www.falabella.com.co/falabella-co/search?Ntt=Nintendo%20Switch%202%20Zelda%2040',
  }),
  store({
    id: 'panamericana-co',
    name: 'Panamericana',
    country: 'Colombia',
    priceCurrency: 'COP',
    url: 'https://www.panamericana.com.co/catalogsearch/result/?q=Nintendo+Switch+2+Zelda+40',
  }),
  store({
    id: 'mercadolibre-co',
    name: 'Mercado Libre Colombia',
    country: 'Colombia',
    priceCurrency: 'COP',
    url: 'https://listado.mercadolibre.com.co/nintendo-switch-2-zelda-40th-anniversary',
  }),
];
