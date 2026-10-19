/**
 * Schema.org Generator matching Yoast WordPress options
 * Generates JSON-LD structured data for Google & Search Engines
 */

export const PAGE_TYPES = [
  { label: 'Default for Pages (Web Page)', value: 'WebPage' },
  { label: 'Web Page', value: 'WebPage' },
  { label: 'Medical Web Page', value: 'MedicalWebPage' },
  { label: 'About Page', value: 'AboutPage' },
  { label: 'FAQ Page', value: 'FAQPage' },
  { label: 'QA Page', value: 'QAPage' },
  { label: 'Profile Page', value: 'ProfilePage' },
  { label: 'Contact Page', value: 'ContactPage' },
  { label: 'Item Page', value: 'ItemPage' },
  { label: 'Collection Page', value: 'CollectionPage' },
  { label: 'Checkout Page', value: 'CheckoutPage' },
  { label: 'Real Estate Listing', value: 'RealEstateListing' },
  { label: 'Search Results Page', value: 'SearchResultsPage' },
];

export const ARTICLE_TYPES = [
  { label: 'Default for Pages (None)', value: 'None' },
  { label: 'Article', value: 'Article' },
  { label: 'Blog Post', value: 'BlogPosting' },
  { label: 'Social Media Posting', value: 'SocialMediaPosting' },
  { label: 'News Article', value: 'NewsArticle' },
  { label: 'Advertiser Content Article', value: 'AdvertiserContentArticle' },
  { label: 'Satirical Article', value: 'SatiricalArticle' },
  { label: 'Scholarly Article', value: 'ScholarlyArticle' },
  { label: 'Tech Article', value: 'TechArticle' },
  { label: 'Report', value: 'Report' },
  { label: 'None', value: 'None' },
];

export const BUSINESS_TYPES = [
  { label: 'Medical Business', value: 'MedicalBusiness' },
  { label: 'Medical Organization', value: 'MedicalOrganization' },
  { label: 'Organization', value: 'Organization' },
  { label: 'Local Business', value: 'LocalBusiness' },
  { label: 'Service', value: 'Service' },
];

/**
 * Builds valid Schema.org JSON-LD structured data object
 */
export function buildSchemaJsonLd({
  pageType = 'WebPage',
  articleType = 'None',
  businessType = 'MedicalBusiness',
  title = '',
  description = '',
  url = 'https://www.transmedex.org',
  imageUrl = 'https://www.transmedex.org/logo.png',
  datePublished = '2026-01-01',
  dateModified = new Date().toISOString().split('T')[0],
  author = 'TransMedex Medical Billing Experts',
}) {
  const isArticle = articleType && articleType !== 'None';

  // Base Schema for the WebPage
  const schema = {
    '@context': 'https://schema.org',
    '@type': pageType === 'Default for Pages (Web Page)' ? 'WebPage' : pageType,
    name: title,
    description: description,
    url: url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'TransMedex',
      url: 'https://www.transmedex.org/',
    },
    about: {
      '@type': businessType,
      name: 'TransMedex',
      url: 'https://www.transmedex.org/',
      logo: 'https://www.transmedex.org/logo.png',
      telephone: '+1-609-793-0400',
      description: 'End-to-end medical billing and revenue cycle management provider for USA healthcare.',
    },
  };

  if (imageUrl) {
    schema.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: imageUrl.startsWith('http') ? imageUrl : `https://www.transmedex.org${imageUrl}`,
    };
  }

  // If an Article Type is selected (e.g. Blog Post, Article, etc.), nest or augment
  if (isArticle) {
    schema['@type'] = [schema['@type'], articleType];
    schema.headline = title;
    schema.author = {
      '@type': 'Organization',
      name: author,
      url: 'https://www.transmedex.org/',
    };
    schema.publisher = {
      '@type': 'Organization',
      name: 'TransMedex',
      url: 'https://www.transmedex.org/',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.transmedex.org/logo.png',
      },
    };
    schema.datePublished = datePublished;
    schema.dateModified = dateModified;
    if (imageUrl) {
      schema.image = imageUrl.startsWith('http') ? imageUrl : `https://www.transmedex.org${imageUrl}`;
    }
  }

  return schema;
}
