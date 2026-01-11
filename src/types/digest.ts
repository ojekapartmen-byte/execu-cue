export interface DigestSource {
  name: string;
  url: string;
}

export interface DigestItem {
  id: string;
  headline: string;
  headlineUrl: string;
  sources: DigestSource[];
  bulletPoints: string[];
  insights: string[];
  category: string;
  subCategory?: string;
}

export interface DigestCategory {
  name: string;
  icon: string;
  items: DigestItem[];
  subCategories?: {
    name: string;
    items: DigestItem[];
  }[];
}

export interface DigestData {
  title: string;
  date: string;
  categories: DigestCategory[];
}

export interface InputLink {
  id: string;
  url: string;
  title?: string;
  isValid: boolean;
}

export type WorkflowStep = 'input' | 'toc' | 'report';
