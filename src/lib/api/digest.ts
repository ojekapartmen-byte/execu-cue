import { supabase } from '@/integrations/supabase/client';
import { DigestCategory, DigestItem, InputLink } from '@/types/digest';

interface AnalyzedArticle {
  url: string;
  headline: string;
  category: string;
  subCategory?: string;
  sourceName: string;
}

interface AnalyzeResponse {
  success: boolean;
  articles?: AnalyzedArticle[];
  error?: string;
}

export async function analyzeSources(links: InputLink[]): Promise<AnalyzeResponse> {
  const sources = links.filter(l => l.isValid).map(l => ({ url: l.url }));
  
  const { data, error } = await supabase.functions.invoke('analyze-sources', {
    body: { sources },
  });

  if (error) {
    console.error('Error calling analyze-sources:', error);
    return { success: false, error: error.message };
  }

  return data as AnalyzeResponse;
}

export function buildCategoriesFromArticles(articles: AnalyzedArticle[]): DigestCategory[] {
  const categoryMap = new Map<string, {
    items: DigestItem[];
    subCategories: Map<string, DigestItem[]>;
  }>();

  articles.forEach((article, index) => {
    const item: DigestItem = {
      id: `article-${index}`,
      headline: article.headline,
      headlineUrl: article.url,
      sources: [{ name: article.sourceName, url: article.url }],
      bulletPoints: [],
      insights: [],
      category: article.category,
      subCategory: article.subCategory,
    };

    if (!categoryMap.has(article.category)) {
      categoryMap.set(article.category, {
        items: [],
        subCategories: new Map(),
      });
    }

    const catData = categoryMap.get(article.category)!;

    if (article.subCategory) {
      if (!catData.subCategories.has(article.subCategory)) {
        catData.subCategories.set(article.subCategory, []);
      }
      catData.subCategories.get(article.subCategory)!.push(item);
    } else {
      catData.items.push(item);
    }
  });

  // Convert to DigestCategory array
  const categories: DigestCategory[] = [];
  const categoryOrder = ['Politik Nasional', 'Hukum', 'Ekonomi', 'BUMN/Korporasi', 'Internasional', 'Uncategorized'];

  categoryOrder.forEach(catName => {
    if (categoryMap.has(catName)) {
      const catData = categoryMap.get(catName)!;
      const subCategories = Array.from(catData.subCategories.entries()).map(([name, items]) => ({
        name,
        items,
      }));

      categories.push({
        name: catName,
        icon: getIconForCategory(catName),
        items: catData.items,
        subCategories: subCategories.length > 0 ? subCategories : undefined,
      });
    }
  });

  // Add any remaining categories not in the order
  categoryMap.forEach((catData, catName) => {
    if (!categoryOrder.includes(catName)) {
      const subCategories = Array.from(catData.subCategories.entries()).map(([name, items]) => ({
        name,
        items,
      }));

      categories.push({
        name: catName,
        icon: 'filetext',
        items: catData.items,
        subCategories: subCategories.length > 0 ? subCategories : undefined,
      });
    }
  });

  return categories.filter(c => c.items.length > 0 || (c.subCategories && c.subCategories.length > 0));
}

function getIconForCategory(category: string): string {
  const iconMap: Record<string, string> = {
    'Politik Nasional': 'flag',
    'Hukum': 'scale',
    'Ekonomi': 'landmark',
    'BUMN/Korporasi': 'building2',
    'Internasional': 'globe',
    'Uncategorized': 'filetext',
  };
  return iconMap[category] || 'filetext';
}
