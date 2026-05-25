import type { ExternalLookupResult, SemanticType } from '../types';

export async function fetchExternalLookup(
  text: string,
  semanticType: SemanticType
): Promise<ExternalLookupResult | null> {
  if (semanticType === 'retail_product') return fetchFoodFacts(text);
  if (semanticType === 'book') return fetchGoogleBooks(text);
  return null;
}

async function fetchFoodFacts(barcode: string): Promise<ExternalLookupResult | null> {
  const clean = barcode.replace(/[^0-9]/g, '');
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${clean}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const additional: Record<string, string> = {};
    if (p.quantity) additional['Quantity'] = p.quantity;
    if (p.categories) additional['Categories'] = p.categories.split(',')[0].trim();
    if (p.nutriment?.['energy-kcal_100g']) additional['Energy (per 100g)'] = `${p.nutriment['energy-kcal_100g']} kcal`;
    return {
      source: 'Open Food Facts',
      productName: p.product_name || p.product_name_en,
      brand: p.brands,
      imageUrl: p.image_small_url || p.image_url,
      additionalFields: additional,
    };
  } catch {
    return null;
  }
}

async function fetchGoogleBooks(isbn: string): Promise<ExternalLookupResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const item = data.items?.[0]?.volumeInfo;
    if (!item) return null;
    const additional: Record<string, string> = {};
    if (item.publisher) additional['Publisher'] = item.publisher;
    if (item.publishedDate) additional['Published'] = item.publishedDate;
    if (item.pageCount) additional['Pages'] = String(item.pageCount);
    if (item.categories?.length) additional['Category'] = item.categories[0];
    return {
      source: 'Google Books',
      productName: item.title,
      brand: item.authors?.join(', '),
      imageUrl: item.imageLinks?.thumbnail?.replace('http://', 'https://'),
      additionalFields: additional,
    };
  } catch {
    return null;
  }
}
