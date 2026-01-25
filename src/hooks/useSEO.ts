import { useEffect } from 'react';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonical?: string;
  noIndex?: boolean;
}

/**
 * Custom hook for managing page-level SEO meta tags
 * Updates document title and meta tags dynamically
 */
export const useSEO = ({
  title,
  description,
  keywords,
  ogImage = 'https://lovable.dev/opengraph-image-p98pqg.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonical,
  noIndex = false,
}: SEOConfig) => {
  useEffect(() => {
    // Brand name for consistent branding
    const brandName = 'AI Daily Digest';
    const fullTitle = title.includes(brandName) ? title : `${title} | ${brandName}`;
    
    // Update document title (max 60 chars recommended)
    document.title = fullTitle.slice(0, 60);

    // Helper function to update or create meta tags
    const updateMetaTag = (selector: string, attribute: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        const [attr, value] = selector.match(/\[([^=]+)="([^"]+)"\]/)?.slice(1) || [];
        if (attr && value) {
          element.setAttribute(attr, value);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, content);
    };

    // Meta description (140-160 chars recommended)
    const trimmedDescription = description.slice(0, 160);
    updateMetaTag('meta[name="description"]', 'content', trimmedDescription);

    // Keywords (optional)
    if (keywords) {
      updateMetaTag('meta[name="keywords"]', 'content', keywords);
    }

    // Open Graph tags
    updateMetaTag('meta[property="og:title"]', 'content', fullTitle.slice(0, 60));
    updateMetaTag('meta[property="og:description"]', 'content', trimmedDescription);
    updateMetaTag('meta[property="og:type"]', 'content', ogType);
    updateMetaTag('meta[property="og:image"]', 'content', ogImage);

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'content', twitterCard);
    updateMetaTag('meta[name="twitter:title"]', 'content', fullTitle.slice(0, 60));
    updateMetaTag('meta[name="twitter:description"]', 'content', trimmedDescription);
    updateMetaTag('meta[name="twitter:image"]', 'content', ogImage);

    // Canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // Robots meta tag
    if (noIndex) {
      updateMetaTag('meta[name="robots"]', 'content', 'noindex, nofollow');
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) {
        robotsMeta.remove();
      }
    }

    // Cleanup function
    return () => {
      // Reset to default on unmount (optional, depends on use case)
    };
  }, [title, description, keywords, ogImage, ogType, twitterCard, canonical, noIndex]);
};

// SEO configurations for each page
export const SEO_CONFIG = {
  index: {
    title: 'Daily Digest - Executive News Intelligence',
    description: 'AI-powered daily news digest for executives. Get curated intelligence from multiple sources, analyzed and summarized in seconds. Free and easy to use.',
    keywords: 'daily digest, executive news, AI news summary, business intelligence, news curation',
  },
  createArticle: {
    title: 'Create Article - AI Article Generator',
    description: 'Generate professional SEO-optimized articles with AI. Support for multiple sources, images, and customizable writing styles. Perfect for content creators.',
    keywords: 'AI article generator, SEO articles, content creation, automatic writing, article generator Indonesia',
  },
  articleHistory: {
    title: 'Article History - Saved Articles',
    description: 'View and manage your generated articles. Access, export, or delete your previously created content. All your AI-generated articles in one place.',
    keywords: 'article history, saved articles, content management, article archive',
  },
  notFound: {
    title: 'Page Not Found (404)',
    description: 'The page you are looking for does not exist. Return to the homepage to continue using AI Daily Digest.',
    noIndex: true,
  },
} as const;
