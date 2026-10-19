import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { seoConfig } from '@/data/seoConfig';

function SEOHead({ defaultTitle = 'TransMedex | Medical Billing Services Company in the USA', defaultDescription = 'TransMedex offers medical billing, coding, credentialing, clearinghouse, and revenue cycle management services for healthcare providers across the USA.' }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  let pageSEO = seoConfig[currentPath] || {};
  if (typeof window !== 'undefined') {
    try {
      const localOverrides = JSON.parse(localStorage.getItem('transmedex_seo_override') || '{}');
      if (localOverrides[currentPath]) {
        pageSEO = { ...pageSEO, ...localOverrides[currentPath] };
      }
    } catch (e) {}
  }
  
  const title = pageSEO.title || defaultTitle;
  const description = pageSEO.description || defaultDescription;
  const canonical = pageSEO.canonical || `https://www.transmedex.org${currentPath === '/' ? '' : currentPath}`;
  const robots = pageSEO.robots || 'index, follow';
  
  const og = pageSEO.og || {};
  const ogTitle = og.title || title;
  const ogDescription = og.description || description;
  const ogImage = og.image ? `https://www.transmedex.org${og.image}` : 'https://www.transmedex.org/logo.png';
  const ogUrl = og.url || canonical;

  const twitter = pageSEO.twitter || {};
  const twitterTitle = twitter.title || ogTitle;
  const twitterDescription = twitter.description || ogDescription;
  const twitterImage = twitter.image ? `https://www.transmedex.org${twitter.image}` : ogImage;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robots} />
      <meta name="google-site-verification" content="j73lAYZaibOFhh8tMPZKEM5XngQc9VBoPhbb8Zmm7gU" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="TransMedex" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={ogUrl} />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={twitterImage} />

      {/* Structured Data (Schema.org) */}
      {pageSEO.schema && (
        <script type="application/ld+json">
          {JSON.stringify(pageSEO.schema)}
        </script>
      )}
    </Helmet>
  );
}

export default SEOHead;
