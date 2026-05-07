export type BarterListing = {
  id: string;
  trader: string;
  title?: string;
  description?: string;
  city: string;
  gives: string;
  wants: string[];
  category: string;
  categorySlug: string;
  condition: "new" | "excellent" | "good" | "fair";
  estimatedValue: number;
  shipping: "local-only" | "domestic";
  trustScore: number;
  source?: "demo" | "supabase" | "local";
};

export const demoListings: BarterListing[] = [
  {
    id: "lena-espresso",
    trader: "Lena",
    city: "Berlin",
    gives: "espresso machine",
    wants: ["desk lamp", "record player"],
    category: "Home",
    categorySlug: "home",
    condition: "excellent",
    estimatedValue: 140,
    shipping: "domestic",
    trustScore: 4.8,
  },
  {
    id: "samir-lamp",
    trader: "Samir",
    city: "Berlin",
    gives: "desk lamp",
    wants: ["bike helmet", "espresso machine"],
    category: "Home office",
    categorySlug: "home-office",
    condition: "good",
    estimatedValue: 45,
    shipping: "domestic",
    trustScore: 4.4,
  },
  {
    id: "noah-helmet",
    trader: "Noah",
    city: "Potsdam",
    gives: "bike helmet",
    wants: ["record player", "camera tripod"],
    category: "Mobility",
    categorySlug: "mobility",
    condition: "excellent",
    estimatedValue: 60,
    shipping: "domestic",
    trustScore: 4.6,
  },
  {
    id: "mira-player",
    trader: "Mira",
    city: "Berlin",
    gives: "record player",
    wants: ["espresso machine", "desk lamp"],
    category: "Audio",
    categorySlug: "audio",
    condition: "good",
    estimatedValue: 130,
    shipping: "domestic",
    trustScore: 4.9,
  },
  {
    id: "ada-tripod",
    trader: "Ada",
    city: "Hamburg",
    gives: "camera tripod",
    wants: ["yoga mat", "board games bundle"],
    category: "Creative",
    categorySlug: "creative",
    condition: "excellent",
    estimatedValue: 75,
    shipping: "domestic",
    trustScore: 4.5,
  },
  {
    id: "jonas-yoga",
    trader: "Jonas",
    city: "Leipzig",
    gives: "yoga mat",
    wants: ["wireless keyboard", "bike helmet"],
    category: "Fitness",
    categorySlug: "fitness",
    condition: "good",
    estimatedValue: 30,
    shipping: "domestic",
    trustScore: 4.1,
  },
  {
    id: "nina-keyboard",
    trader: "Nina",
    city: "Berlin",
    gives: "wireless keyboard",
    wants: ["espresso machine", "camera tripod"],
    category: "Tech",
    categorySlug: "tech",
    condition: "excellent",
    estimatedValue: 80,
    shipping: "domestic",
    trustScore: 4.7,
  },
  {
    id: "omar-boardgames",
    trader: "Omar",
    city: "Dresden",
    gives: "board games bundle",
    wants: ["espresso machine", "desk lamp"],
    category: "Leisure",
    categorySlug: "leisure",
    condition: "good",
    estimatedValue: 50,
    shipping: "domestic",
    trustScore: 4.2,
  }
];

export function buildListingOptions(listings: BarterListing[]) {
  return listings.map((listing) => ({
    id: listing.id,
    label: `${listing.title ?? listing.trader} offers ${listing.gives}`,
  }));
}

export function buildItemOptions(listings: BarterListing[]) {
  return [...new Set(listings.map((listing) => listing.gives))]
    .sort((left, right) => left.localeCompare(right))
    .map((item) => ({
      value: item,
      label: item,
    }));
}

export const listingOptions = buildListingOptions(demoListings);
export const itemOptions = buildItemOptions(demoListings);
