// Single source of truth for the product catalogue.
// Imported by the browser (index.html) and by the order API, so pricing and
// option validation can never drift between what a buyer sees and what the
// server records. Add new products by appending to PRODUCTS.

export const PRODUCTS = [
  {
    slug: "three-monks-zip-hoodie",
    name: "Three Monks Pullover Hoodie",
    price_usd: 10,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      {
        key: "bone",
        label: "Bone",
        image: "/img/monks-bone.jpg",
        alt: "Three Monks pullover hoodie, bone colorway",
      },
      {
        key: "black",
        label: "Black",
        image: "/img/monks-black.jpg",
        alt: "Three Monks pullover hoodie, black colorway",
      },
    ],
  },
  {
    slug: "christ-is-king-cropped-zip-hoodie",
    name: "Christ Is King Cropped Zip Hoodie",
    price_usd: 10,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      {
        key: "bone",
        label: "Bone",
        image: "/img/crucifix-bone.jpg",
        alt: "Christ Is King cropped zip hoodie, bone colorway, back print",
      },
      {
        key: "black",
        label: "Black",
        image: "/img/crucifix-black.jpg",
        alt: "Christ Is King cropped zip hoodie, black colorway, back print",
      },
    ],
  },
];

export function bySlug(slug) {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

export function paypalUrl(priceUsd) {
  return `https://www.paypal.me/drbinna123/${priceUsd}`;
}
