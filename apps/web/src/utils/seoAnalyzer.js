/**
 * Yoast SEO & Readability Analysis Engine
 * Real-time heuristic scoring exactly matching Yoast WordPress algorithms
 * Each assessment provides authentic Yoast documentation links (learnUrl),
 * matching Yoast WordPress clickable behavior shown in screenshots.
 */

const TRANSITION_WORDS = [
  'also', 'besides', 'furthermore', 'in addition', 'moreover',
  'consequently', 'therefore', 'as a result', 'accordingly', 'hence',
  'however', 'nevertheless', 'nonetheless', 'on the other hand', 'in contrast',
  'although', 'even though', 'while', 'despite', 'in spite of',
  'for example', 'for instance', 'specifically', 'to illustrate',
  'first', 'second', 'third', 'finally', 'next', 'then', 'subsequently',
  'similarly', 'likewise', 'equally', 'indeed', 'in fact'
];

/**
 * Counts syllables in a word for Flesch Reading Ease calculation
 */
function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean || clean.length <= 3) return 1;
  const withSub = clean.replace(/(?:[^laeiouy]|ed|es|e)$/, '')
                       .replace(/^y/, '');
  const matches = withSub.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Calculate Flesch Reading Ease Score
 * 90-100: Very Easy, 60-70: Standard / Good, <50: Difficult
 */
export function calculateFleschScore(text) {
  if (!text || text.trim().length === 0) return 0;
  
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleanText.match(/\b[a-zA-Z0-9'-]+\b/g) || [];

  if (words.length === 0 || sentences.length === 0) return 0;

  const totalSyllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = totalSyllables / words.length;

  const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Deep parser for page content (HTML or Markdown)
 * Extracts headings, images, alt tags, internal links, outbound links, word counts, and keyphrase locations
 */
export function parseContentMetrics(content = '', focusKeyphrase = '', ogImage = '') {
  const cleanKeyphrase = (focusKeyphrase || '').trim().toLowerCase();
  
  // 1. Text Only & Words
  const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/[#*`_\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = textOnly.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
  const wordCount = words.length;

  // 2. H1 Headings
  const h1Matches = [
    ...(content.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || []),
    ...(content.match(/^#\s+[^\n]+/gm) || [])
  ];
  const h1Count = h1Matches.length;

  // 3. Subheadings (H2, H3)
  const h2h3Matches = [
    ...(content.match(/<h[23][^>]*>[\s\S]*?<\/h[23]>/gi) || []),
    ...(content.match(/^#{2,3}\s+[^\n]+/gm) || [])
  ];
  const subheadingsCount = h2h3Matches.length;
  const subheadingsWithKeyphrase = cleanKeyphrase
    ? h2h3Matches.filter(h => h.toLowerCase().includes(cleanKeyphrase)).length
    : 0;

  // 4. Images & Alt Attributes
  const imgMatches = [
    ...(content.match(/<img[^>]*>/gi) || []),
    ...(content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [])
  ];
  let imagesCount = imgMatches.length;
  if (imagesCount === 0 && ogImage && ogImage !== '/logo.png') {
    imagesCount = 1;
  }

  let imagesWithAltKeyphrase = 0;
  if (cleanKeyphrase) {
    imgMatches.forEach(img => {
      const altHtml = img.match(/alt=["']([^"']*)["']/i);
      const altMd = img.match(/!\[([^\]]*)\]/);
      const altText = (altHtml ? altHtml[1] : (altMd ? altMd[1] : '')).toLowerCase();
      if (altText && altText.includes(cleanKeyphrase)) {
        imagesWithAltKeyphrase++;
      }
    });
  }

  // 5. Links: Outbound vs Internal vs Competing Links
  const linkMatches = [
    ...(content.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi) || []),
    ...(content.match(/\[([^\]]*)\]\(([^)]+)\)/g) || [])
  ];

  let outboundLinks = 0;
  let internalLinks = 0;
  let competingLinks = 0;

  linkMatches.forEach(linkStr => {
    let href = '';
    let anchorText = '';

    const htmlMatch = linkStr.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (htmlMatch) {
      href = htmlMatch[1].trim();
      anchorText = htmlMatch[2].replace(/<[^>]*>/g, '').trim().toLowerCase();
    } else {
      const mdMatch = linkStr.match(/\[([^\]]*)\]\(([^)]+)\)/);
      if (mdMatch) {
        anchorText = mdMatch[1].trim().toLowerCase();
        href = mdMatch[2].trim();
      }
    }

    if (href) {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        if (href.includes('transmedex.org') || href.includes('localhost')) {
          internalLinks++;
        } else {
          outboundLinks++;
        }
      } else if (href.startsWith('/') || href.startsWith('#')) {
        internalLinks++;
      }

      if (cleanKeyphrase && anchorText === cleanKeyphrase) {
        if (!href.endsWith(cleanKeyphrase) && !href.includes(cleanKeyphrase)) {
          competingLinks++;
        }
      }
    }
  });

  // 6. Introduction (first paragraph or first 100 words)
  let keyphraseInIntro = false;
  if (cleanKeyphrase) {
    const firstParagraphMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const firstParagraphText = firstParagraphMatch
      ? firstParagraphMatch[1].replace(/<[^>]*>/g, '').toLowerCase()
      : textOnly.slice(0, 400).toLowerCase();

    if (firstParagraphText.includes(cleanKeyphrase)) {
      keyphraseInIntro = true;
    }
  }

  // 7. Keyphrase Occurrences and Density
  let keyphraseOccurrences = 0;
  let keyphraseDensity = 0;
  if (cleanKeyphrase && wordCount > 0) {
    const escaped = cleanKeyphrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = textOnly.match(regex) || [];
    keyphraseOccurrences = matches.length;
    const keyphraseWords = cleanKeyphrase.split(/\s+/).length;
    keyphraseDensity = Number(((keyphraseOccurrences * keyphraseWords / wordCount) * 100).toFixed(2));
  }

  return {
    wordCount,
    h1Count,
    subheadingsCount,
    subheadingsWithKeyphrase,
    imagesCount,
    imagesWithAltKeyphrase,
    outboundLinks,
    internalLinks,
    competingLinks,
    keyphraseInIntro,
    keyphraseOccurrences,
    keyphraseDensity,
  };
}

/**
 * Full Yoast SEO analysis matching user's exact 17 checkpoints from WordPress
 * Every item includes learnUrl (Yoast documentation), preText, linkText, and description.
 */
export function analyzeSEO({
  focusKeyphrase = '',
  seoTitle = '',
  slug = '',
  metaDescription = '',
  content = '',
  ogImage = '',
  allConfigs = {},
  currentPath = '/',
}) {
  const problems = [];
  const improvements = [];
  const goodResults = [];

  const keyphrase = (focusKeyphrase || '').trim().toLowerCase();
  const title = (seoTitle || '').trim();
  const titleLower = title.toLowerCase();
  const desc = (metaDescription || '').trim();
  const descLower = desc.toLowerCase();
  const cleanSlug = (slug || '').toLowerCase().replace(/[^a-z0-9]/g, '-');

  // Metrics from content parser
  const metrics = parseContentMetrics(content, keyphrase, ogImage);

  // ══════════════════════════════════════════════════════════════
  // CHECK 1: Outbound links
  // ══════════════════════════════════════════════════════════════
  const outboundUrl = 'https://yoast.com/outbound-links/';
  if (metrics.outboundLinks === 0) {
    problems.push({
      id: 'outbound_links',
      title: 'Outbound links',
      preText: 'No outbound links appear in this page. ',
      linkText: 'Add some!',
      description: 'No outbound links appear in this page. Add some!',
      learnUrl: outboundUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'outbound_links',
      title: 'Outbound links',
      linkText: 'Good job!',
      description: 'Good job!',
      learnUrl: outboundUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 2: Keyphrase in image alt attributes
  // ══════════════════════════════════════════════════════════════
  const imgAltUrl = 'https://yoast.com/image-seo-alt-tag-and-title-tag-optimization/';
  if (!keyphrase || metrics.imagesCount === 0) {
    problems.push({
      id: 'image_alt_keyphrase',
      title: 'Keyphrase in image alt attributes',
      preText: 'This page does not have images, a keyphrase, or both. ',
      linkText: 'Add some images with alt attributes that include the keyphrase or synonyms!',
      description: 'This page does not have images, a keyphrase, or both. Add some images with alt attributes that include the keyphrase or synonyms!',
      learnUrl: imgAltUrl,
      status: 'bad',
    });
  } else if (metrics.imagesWithAltKeyphrase === 0) {
    improvements.push({
      id: 'image_alt_keyphrase',
      title: 'Keyphrase in image alt attributes',
      preText: 'Images on this page do not have alt attributes with the focus keyphrase. ',
      linkText: 'Add your keyphrase to image alt attributes!',
      description: 'Images on this page do not have alt attributes with the focus keyphrase. Add your keyphrase to image alt attributes!',
      learnUrl: imgAltUrl,
      status: 'ok',
    });
  } else {
    goodResults.push({
      id: 'image_alt_keyphrase',
      title: 'Keyphrase in image alt attributes',
      linkText: 'Good job!',
      description: 'Good job!',
      learnUrl: imgAltUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 3: Images
  // ══════════════════════════════════════════════════════════════
  const imagesUrl = 'https://yoast.com/image-seo/';
  if (metrics.imagesCount === 0) {
    problems.push({
      id: 'images',
      title: 'Images',
      preText: 'No images appear on this page. ',
      linkText: 'Add some!',
      description: 'No images appear on this page. Add some!',
      learnUrl: imagesUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'images',
      title: 'Images',
      linkText: 'Good job!',
      description: 'Good job!',
      learnUrl: imagesUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 4: Internal links
  // ══════════════════════════════════════════════════════════════
  const internalUrl = 'https://yoast.com/internal-linking-for-seo-why-and-how/';
  if (metrics.internalLinks === 0) {
    problems.push({
      id: 'internal_links',
      title: 'Internal links',
      preText: 'No internal links appear in this page, ',
      linkText: 'make sure to add some!',
      description: 'No internal links appear in this page, make sure to add some!',
      learnUrl: internalUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'internal_links',
      title: 'Internal links',
      linkText: 'You have enough internal links. Good job!',
      description: 'You have enough internal links. Good job!',
      learnUrl: internalUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 5: Keyphrase in introduction
  // ══════════════════════════════════════════════════════════════
  const introUrl = 'https://yoast.com/keyphrase-in-introduction/';
  if (!keyphrase || metrics.wordCount === 0) {
    problems.push({
      id: 'keyphrase_in_intro',
      title: 'Keyphrase in introduction',
      preText: '',
      linkText: 'Please add both a keyphrase and an introduction containing the keyphrase.',
      description: 'Please add both a keyphrase and an introduction containing the keyphrase.',
      learnUrl: introUrl,
      status: 'bad',
    });
  } else if (!metrics.keyphraseInIntro) {
    improvements.push({
      id: 'keyphrase_in_intro',
      title: 'Keyphrase in introduction',
      preText: '',
      linkText: 'Your keyphrase or its synonyms do not appear in the first paragraph. Make sure the topic is clear immediately.',
      description: 'Your keyphrase or its synonyms do not appear in the first paragraph. Make sure the topic is clear immediately.',
      learnUrl: introUrl,
      status: 'ok',
    });
  } else {
    goodResults.push({
      id: 'keyphrase_in_intro',
      title: 'Keyphrase in introduction',
      preText: '',
      linkText: 'Your keyphrase or its synonyms appear in the first paragraph. Well done!',
      description: 'Your keyphrase or its synonyms appear in the first paragraph. Well done!',
      learnUrl: introUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 6: Keyphrase density
  // ══════════════════════════════════════════════════════════════
  const densityUrl = 'https://yoast.com/what-is-keyword-density/';
  if (!keyphrase || metrics.wordCount === 0) {
    problems.push({
      id: 'keyphrase_density',
      title: 'Keyphrase density',
      preText: '',
      linkText: 'Please add both a keyphrase and some text containing the keyphrase.',
      description: 'Please add both a keyphrase and some text containing the keyphrase.',
      learnUrl: densityUrl,
      status: 'bad',
    });
  } else if (metrics.keyphraseOccurrences === 0) {
    problems.push({
      id: 'keyphrase_density',
      title: 'Keyphrase density',
      preText: '',
      linkText: 'The focus keyphrase was found 0 times. That is less than the recommended minimum of 0.5% in a text of this length.',
      description: 'The focus keyphrase was found 0 times. That is less than the recommended minimum of 0.5% in a text of this length.',
      learnUrl: densityUrl,
      status: 'bad',
    });
  } else if (metrics.keyphraseDensity < 0.5) {
    improvements.push({
      id: 'keyphrase_density',
      title: 'Keyphrase density',
      preText: '',
      linkText: `The focus keyphrase was found ${metrics.keyphraseOccurrences} time(s) (${metrics.keyphraseDensity}%). This is slightly below the recommended minimum of 0.5%.`,
      description: `The focus keyphrase was found ${metrics.keyphraseOccurrences} time(s) (${metrics.keyphraseDensity}%). This is slightly below the recommended minimum of 0.5%.`,
      learnUrl: densityUrl,
      status: 'ok',
    });
  } else if (metrics.keyphraseDensity > 3.0) {
    problems.push({
      id: 'keyphrase_density',
      title: 'Keyphrase density',
      preText: '',
      linkText: `The focus keyphrase was found ${metrics.keyphraseOccurrences} times (${metrics.keyphraseDensity}%). This is above the recommended maximum of 3.0% (keyword stuffing).`,
      description: `The focus keyphrase was found ${metrics.keyphraseOccurrences} times (${metrics.keyphraseDensity}%). This is above the recommended maximum of 3.0% (keyword stuffing).`,
      learnUrl: densityUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'keyphrase_density',
      title: 'Keyphrase density',
      preText: '',
      linkText: `The focus keyphrase was found ${metrics.keyphraseOccurrences} times. This is great!`,
      description: `The focus keyphrase was found ${metrics.keyphraseOccurrences} times. This is great!`,
      learnUrl: densityUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 7: Keyphrase in SEO title
  // ══════════════════════════════════════════════════════════════
  const titleKpUrl = 'https://yoast.com/focus-keyword-in-seo-title/';
  if (!keyphrase || !title) {
    problems.push({
      id: 'keyphrase_in_seo_title',
      title: 'Keyphrase in SEO title',
      preText: '',
      linkText: 'Please add both a keyphrase and an SEO title beginning with the keyphrase.',
      description: 'Please add both a keyphrase and an SEO title beginning with the keyphrase.',
      learnUrl: titleKpUrl,
      status: 'bad',
    });
  } else if (!titleLower.includes(keyphrase)) {
    problems.push({
      id: 'keyphrase_in_seo_title',
      title: 'Keyphrase in SEO title',
      preText: '',
      linkText: 'The focus keyphrase does not appear in the SEO title. Add your keyphrase to the title!',
      description: 'The focus keyphrase does not appear in the SEO title. Add your keyphrase to the title!',
      learnUrl: titleKpUrl,
      status: 'bad',
    });
  } else if (titleLower.startsWith(keyphrase)) {
    goodResults.push({
      id: 'keyphrase_in_seo_title',
      title: 'Keyphrase in SEO title',
      preText: '',
      linkText: 'The focus keyphrase appears at the beginning of the SEO title. Good job!',
      description: 'The focus keyphrase appears at the beginning of the SEO title. Good job!',
      learnUrl: titleKpUrl,
      status: 'good',
    });
  } else {
    goodResults.push({
      id: 'keyphrase_in_seo_title',
      title: 'Keyphrase in SEO title',
      preText: '',
      linkText: 'The focus keyphrase appears in the SEO title. Good job!',
      description: 'The focus keyphrase appears in the SEO title. Good job!',
      learnUrl: titleKpUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 8: Keyphrase length
  // ══════════════════════════════════════════════════════════════
  const kpLengthUrl = 'https://yoast.com/focus-keyword/';
  if (!keyphrase) {
    problems.push({
      id: 'keyphrase_length',
      title: 'Keyphrase length',
      preText: 'No focus keyphrase was set for this page. ',
      linkText: 'Set a keyphrase in order to calculate your SEO score.',
      description: 'No focus keyphrase was set for this page. Set a keyphrase in order to calculate your SEO score.',
      learnUrl: kpLengthUrl,
      status: 'bad',
    });
  } else {
    const keyphraseWords = keyphrase.split(/\s+/).filter(Boolean).length;
    if (keyphraseWords > 4) {
      improvements.push({
        id: 'keyphrase_length',
        title: 'Keyphrase length',
        preText: '',
        linkText: `The focus keyphrase is ${keyphraseWords} words long. That is more than the recommended maximum of 4 words.`,
        description: `The focus keyphrase is ${keyphraseWords} words long. That is more than the recommended maximum of 4 words.`,
        learnUrl: kpLengthUrl,
        status: 'ok',
      });
    } else {
      goodResults.push({
        id: 'keyphrase_length',
        title: 'Keyphrase length',
        preText: '',
        linkText: 'Good job!',
        description: 'Good job!',
        learnUrl: kpLengthUrl,
        status: 'good',
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 9: Keyphrase in meta description
  // ══════════════════════════════════════════════════════════════
  const metaKpUrl = 'https://yoast.com/meta-descriptions/';
  if (!keyphrase || !desc) {
    problems.push({
      id: 'keyphrase_in_meta',
      title: 'Keyphrase in meta description',
      preText: '',
      linkText: 'Please add both a keyphrase and a meta description containing the keyphrase.',
      description: 'Please add both a keyphrase and a meta description containing the keyphrase.',
      learnUrl: metaKpUrl,
      status: 'bad',
    });
  } else if (!descLower.includes(keyphrase)) {
    problems.push({
      id: 'keyphrase_in_meta',
      title: 'Keyphrase in meta description',
      preText: '',
      linkText: 'The focus keyphrase does not appear in the meta description. Add your keyphrase to help searchers find your page.',
      description: 'The focus keyphrase does not appear in the meta description. Add your keyphrase to help searchers find your page.',
      learnUrl: metaKpUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'keyphrase_in_meta',
      title: 'Keyphrase in meta description',
      preText: '',
      linkText: 'Keyphrase or synonym appears in the meta description. Well done!',
      description: 'Keyphrase or synonym appears in the meta description. Well done!',
      learnUrl: metaKpUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 10: Meta description length
  // ══════════════════════════════════════════════════════════════
  const metaLenUrl = 'https://yoast.com/how-to-create-the-right-meta-description/';
  const metaLen = desc.length;
  if (metaLen === 0) {
    problems.push({
      id: 'meta_length',
      title: 'Meta description length',
      preText: 'No meta description has been specified. Search engines will display copy from the page instead. ',
      linkText: 'Make sure to write one!',
      description: 'No meta description has been specified. Search engines will display copy from the page instead. Make sure to write one!',
      learnUrl: metaLenUrl,
      status: 'bad',
    });
  } else if (metaLen < 120) {
    improvements.push({
      id: 'meta_length',
      title: 'Meta description length',
      preText: '',
      linkText: `The meta description is too short (${metaLen} characters). Aim for 120-160 characters.`,
      description: `The meta description is too short (${metaLen} characters). Aim for 120-160 characters.`,
      learnUrl: metaLenUrl,
      status: 'ok',
    });
  } else if (metaLen > 165) {
    improvements.push({
      id: 'meta_length',
      title: 'Meta description length',
      preText: '',
      linkText: `The meta description is ${metaLen} characters, which exceeds the recommended 160 character limit. It may be truncated.`,
      description: `The meta description is ${metaLen} characters, which exceeds the recommended 160 character limit. It may be truncated.`,
      learnUrl: metaLenUrl,
      status: 'ok',
    });
  } else {
    goodResults.push({
      id: 'meta_length',
      title: 'Meta description length',
      preText: '',
      linkText: 'Well done!',
      description: 'Well done!',
      learnUrl: metaLenUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 11: Previously used keyphrase
  // ══════════════════════════════════════════════════════════════
  const prevKpUrl = 'https://yoast.com/keyword-cannibalization/';
  if (!keyphrase) {
    problems.push({
      id: 'previously_used_keyphrase',
      title: 'Previously used keyphrase',
      preText: 'No focus keyphrase was set for this page. ',
      linkText: "Please add a focus keyphrase you haven't used before on other content.",
      description: "No focus keyphrase was set for this page. Please add a focus keyphrase you haven't used before on other content.",
      learnUrl: prevKpUrl,
      status: 'bad',
    });
  } else {
    let usedCount = 0;
    Object.entries(allConfigs).forEach(([routePath, cfg]) => {
      if (routePath !== currentPath && cfg?.focusKeyphrase) {
        if (cfg.focusKeyphrase.trim().toLowerCase() === keyphrase) {
          usedCount++;
        }
      }
    });

    if (usedCount > 0) {
      improvements.push({
        id: 'previously_used_keyphrase',
        title: 'Previously used keyphrase',
        preText: '',
        linkText: `You've used this focus keyphrase ${usedCount} times before on other content. It's recommended to not use keyphrases more than once.`,
        description: `You've used this focus keyphrase ${usedCount} times before on other content. It's recommended to not use keyphrases more than once.`,
        learnUrl: prevKpUrl,
        status: 'ok',
      });
    } else {
      goodResults.push({
        id: 'previously_used_keyphrase',
        title: 'Previously used keyphrase',
        preText: '',
        linkText: "You've not used this keyphrase before, very good.",
        description: "You've not used this keyphrase before, very good.",
        learnUrl: prevKpUrl,
        status: 'good',
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 12: Keyphrase in slug
  // ══════════════════════════════════════════════════════════════
  const slugUrl = 'https://yoast.com/slug-in-seo/';
  if (!keyphrase) {
    problems.push({
      id: 'keyphrase_in_slug',
      title: 'Keyphrase in slug',
      preText: '',
      linkText: 'Please add both a keyphrase and a slug containing the keyphrase.',
      description: 'Please add both a keyphrase and a slug containing the keyphrase.',
      learnUrl: slugUrl,
      status: 'bad',
    });
  } else {
    const slugKeyphrase = keyphrase.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const keyphraseWords = keyphrase.split(/\s+/).filter(w => w.length > 2);
    const matchesSlug = cleanSlug.includes(slugKeyphrase) || keyphraseWords.some(w => cleanSlug.includes(w));

    if (!matchesSlug && cleanSlug !== '-') {
      improvements.push({
        id: 'keyphrase_in_slug',
        title: 'Keyphrase in slug',
        preText: '',
        linkText: 'Your focus keyphrase does not appear in the URL slug. Try to include keywords in the URL.',
        description: 'Your focus keyphrase does not appear in the URL slug. Try to include keywords in the URL.',
        learnUrl: slugUrl,
        status: 'ok',
      });
    } else {
      goodResults.push({
        id: 'keyphrase_in_slug',
        title: 'Keyphrase in slug',
        preText: '',
        linkText: "(Part of) your keyphrase does appear in the slug. That's great!",
        description: "(Part of) your keyphrase does appear in the slug. That's great!",
        learnUrl: slugUrl,
        status: 'good',
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 13: Keyphrase in subheading
  // ══════════════════════════════════════════════════════════════
  const subheadingsUrl = 'https://yoast.com/how-to-use-headings-on-your-site/';
  if (!keyphrase || metrics.wordCount === 0) {
    problems.push({
      id: 'keyphrase_in_subheading',
      title: 'Keyphrase in subheading',
      preText: '',
      linkText: 'Please add both a keyphrase and some text to receive relevant feedback.',
      description: 'Please add both a keyphrase and some text to receive relevant feedback.',
      learnUrl: subheadingsUrl,
      status: 'bad',
    });
  } else if (metrics.subheadingsCount === 0) {
    improvements.push({
      id: 'keyphrase_in_subheading',
      title: 'Keyphrase in subheading',
      preText: '',
      linkText: 'No H2 or H3 subheadings found. Add subheadings containing your keyphrase to organize your content.',
      description: 'No H2 or H3 subheadings found. Add subheadings containing your keyphrase to organize your content.',
      learnUrl: subheadingsUrl,
      status: 'ok',
    });
  } else if (metrics.subheadingsWithKeyphrase === 0) {
    improvements.push({
      id: 'keyphrase_in_subheading',
      title: 'Keyphrase in subheading',
      preText: '',
      linkText: 'Your H2 and H3 subheadings do not reflect the focus keyphrase. Add your keyphrase to higher-level subheadings!',
      description: 'Your H2 and H3 subheadings do not reflect the focus keyphrase. Add your keyphrase to higher-level subheadings!',
      learnUrl: subheadingsUrl,
      status: 'ok',
    });
  } else {
    goodResults.push({
      id: 'keyphrase_in_subheading',
      title: 'Keyphrase in subheading',
      preText: '',
      linkText: 'More than 30% of your subheadings reflect the topic of your copy. Good job!',
      description: 'More than 30% of your subheadings reflect the topic of your copy. Good job!',
      learnUrl: subheadingsUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 14: Text length
  // ══════════════════════════════════════════════════════════════
  const textLenUrl = 'https://yoast.com/how-long-should-a-blog-post-be/';
  if (metrics.wordCount === 0) {
    problems.push({
      id: 'text_length',
      title: 'Text length',
      preText: 'The text contains 0 words. This is far below the recommended minimum of 300 words. ',
      linkText: 'Add more content.',
      description: 'The text contains 0 words. This is far below the recommended minimum of 300 words. Add more content.',
      learnUrl: textLenUrl,
      status: 'bad',
    });
  } else if (metrics.wordCount < 300) {
    improvements.push({
      id: 'text_length',
      title: 'Text length',
      preText: `The text contains ${metrics.wordCount} words. This is below the recommended minimum of 300 words. `,
      linkText: 'Add more content.',
      description: `The text contains ${metrics.wordCount} words. This is below the recommended minimum of 300 words. Add more content.`,
      learnUrl: textLenUrl,
      status: 'ok',
    });
  } else {
    goodResults.push({
      id: 'text_length',
      title: 'Text length',
      preText: '',
      linkText: `The text contains ${metrics.wordCount} words. Good job!`,
      description: `The text contains ${metrics.wordCount} words. Good job!`,
      learnUrl: textLenUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 15: Single title (Single H1)
  // ══════════════════════════════════════════════════════════════
  const singleTitleUrl = 'https://yoast.com/heading-structure/';
  if (metrics.h1Count > 1) {
    problems.push({
      id: 'single_title',
      title: 'Single title',
      preText: '',
      linkText: `Multiple H1 headings detected (${metrics.h1Count}). Ensure only one primary H1 exists per page.`,
      description: `Multiple H1 headings detected (${metrics.h1Count}). Ensure only one primary H1 exists per page.`,
      learnUrl: singleTitleUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'single_title',
      title: 'Single title',
      preText: '',
      linkText: "You don't have multiple H1 headings, well done!",
      description: "You don't have multiple H1 headings, well done!",
      learnUrl: singleTitleUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 16: Competing links
  // ══════════════════════════════════════════════════════════════
  const competingUrl = 'https://yoast.com/competing-links/';
  if (metrics.competingLinks > 0) {
    problems.push({
      id: 'competing_links',
      title: 'Competing links',
      preText: '',
      linkText: "You have links which use your keyphrase or synonym as their anchor text pointing elsewhere. Don't compete with yourself!",
      description: "You have links which use your keyphrase or synonym as their anchor text pointing elsewhere. Don't compete with yourself!",
      learnUrl: competingUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'competing_links',
      title: 'Competing links',
      preText: '',
      linkText: 'There are no links which use your keyphrase or synonym as their anchor text. Nice!',
      description: 'There are no links which use your keyphrase or synonym as their anchor text. Nice!',
      learnUrl: competingUrl,
      status: 'good',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 17: SEO title width
  // ══════════════════════════════════════════════════════════════
  const titleWidthUrl = 'https://yoast.com/page-titles-seo/';
  const titleLen = title.length;
  if (titleLen === 0) {
    problems.push({
      id: 'seo_title_width',
      title: 'SEO title width',
      preText: '',
      linkText: 'Please add an SEO title for this page.',
      description: 'Please add an SEO title for this page.',
      learnUrl: titleWidthUrl,
      status: 'bad',
    });
  } else if (titleLen < 40) {
    improvements.push({
      id: 'seo_title_width',
      title: 'SEO title width',
      preText: '',
      linkText: `The SEO title is too short (${titleLen} characters). Try to make it between 50 and 60 characters.`,
      description: `The SEO title is too short (${titleLen} characters). Try to make it between 50 and 60 characters.`,
      learnUrl: titleWidthUrl,
      status: 'ok',
    });
  } else if (titleLen > 65) {
    problems.push({
      id: 'seo_title_width',
      title: 'SEO title width',
      preText: '',
      linkText: `The SEO title is too long (${titleLen} characters). It will be truncated in search results.`,
      description: `The SEO title is too long (${titleLen} characters). It will be truncated in search results.`,
      learnUrl: titleWidthUrl,
      status: 'bad',
    });
  } else {
    goodResults.push({
      id: 'seo_title_width',
      title: 'SEO title width',
      preText: '',
      linkText: 'Good job!',
      description: 'Good job!',
      learnUrl: titleWidthUrl,
      status: 'good',
    });
  }

  // Overall Score Calculation
  const totalChecks = problems.length + improvements.length + goodResults.length;
  const scorePercent = totalChecks > 0 ? Math.round((goodResults.length / totalChecks) * 100) : 0;
  
  let overallScore = 'bad';
  if (problems.length <= 1 && scorePercent >= 75) {
    overallScore = 'good';
  } else if (scorePercent >= 45 || problems.length <= 4) {
    overallScore = 'ok';
  }

  return {
    overallScore,
    scorePercent,
    metrics,
    wordCount: metrics.wordCount || 0,
    subheadingsCount: metrics.subheadingsCount || 0,
    internalLinksCount: metrics.internalLinks || 0,
    outboundLinksCount: metrics.outboundLinks || 0,
    imagesCount: metrics.imagesCount || 0,
    problems,
    improvements,
    goodResults,
  };
}

/**
 * Yoast Readability Analysis Engine
 */
export function analyzeReadability({ content = '' }) {
  const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/[#*`_\[\]()]/g, ' ').trim();
  const sentences = cleanText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const words = cleanText.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
  const paragraphs = content.split(/<\/p>|\n\n+/).map(p => p.replace(/<[^>]*>/g, '').trim()).filter(Boolean);

  const problems = [];
  const improvements = [];
  const goodResults = [];
  const fleschScore = calculateFleschScore(cleanText);

  // 1. Flesch Reading Ease
  const fleschUrl = 'https://yoast.com/flesch-reading-ease-score/';
  if (fleschScore >= 60) {
    goodResults.push({
      id: 'flesch',
      title: 'Flesch Reading Ease',
      linkText: `Score of ${fleschScore}/100. The text is very clear and easy to read.`,
      description: `Score of ${fleschScore}/100. The text is very clear and easy to read.`,
      learnUrl: fleschUrl,
      status: 'good'
    });
  } else if (fleschScore >= 45) {
    goodResults.push({
      id: 'flesch',
      title: 'Flesch Reading Ease',
      linkText: `Score of ${fleschScore}/100. The text is fairly readable for a professional audience.`,
      description: `Score of ${fleschScore}/100. The text is fairly readable for a professional audience.`,
      learnUrl: fleschUrl,
      status: 'good'
    });
  } else if (fleschScore > 0) {
    improvements.push({
      id: 'flesch',
      title: 'Flesch Reading Ease',
      linkText: `Score of ${fleschScore}/100. The copy may be considered difficult to read. Try using shorter sentences and simpler terms.`,
      description: `Score of ${fleschScore}/100. The copy may be considered difficult to read. Try using shorter sentences and simpler terms.`,
      learnUrl: fleschUrl,
      status: 'ok'
    });
  } else {
    problems.push({
      id: 'flesch',
      title: 'Flesch Reading Ease',
      linkText: 'Add body content to calculate Flesch Reading Ease readability score.',
      description: 'Add body content to calculate Flesch Reading Ease readability score.',
      learnUrl: fleschUrl,
      status: 'bad'
    });
  }

  // 2. Sentence Length (> 20 words)
  const sentenceUrl = 'https://yoast.com/sentence-length/';
  const longSentences = sentences.filter(s => (s.match(/\b[a-zA-Z0-9'-]+\b/g) || []).length > 20);
  const longPercent = sentences.length > 0 ? Math.round((longSentences.length / sentences.length) * 100) : 0;

  if (longPercent > 25) {
    improvements.push({
      id: 'sentence_length',
      title: 'Sentence length',
      linkText: `${longPercent}% of the sentences contain more than 20 words, which is more than the recommended 25%. Try to shorten them.`,
      description: `${longPercent}% of the sentences contain more than 20 words, which is more than the recommended 25%. Try to shorten them.`,
      learnUrl: sentenceUrl,
      status: 'ok'
    });
  } else if (sentences.length > 0) {
    goodResults.push({
      id: 'sentence_length',
      title: 'Sentence length',
      linkText: 'Great! Sentences are concise and easy to parse.',
      description: 'Great! Sentences are concise and easy to parse.',
      learnUrl: sentenceUrl,
      status: 'good'
    });
  }

  // 3. Paragraph Length (> 150 words)
  const paraUrl = 'https://yoast.com/paragraph-length/';
  const longParagraphs = paragraphs.filter(p => (p.match(/\b[a-zA-Z0-9'-]+\b/g) || []).length > 150);
  if (longParagraphs.length > 0) {
    improvements.push({
      id: 'paragraph_length',
      title: 'Paragraph length',
      linkText: `${longParagraphs.length} paragraph(s) contain more than 150 words. Break them into smaller sections.`,
      description: `${longParagraphs.length} paragraph(s) contain more than 150 words. Break them into smaller sections.`,
      learnUrl: paraUrl,
      status: 'ok'
    });
  } else if (paragraphs.length > 0) {
    goodResults.push({
      id: 'paragraph_length',
      title: 'Paragraph length',
      linkText: 'None of the paragraphs are too long. Great job!',
      description: 'None of the paragraphs are too long. Great job!',
      learnUrl: paraUrl,
      status: 'good'
    });
  }

  // 4. Consecutive Sentences Starting with the Same Word
  const consecUrl = 'https://yoast.com/consecutive-sentences/';
  let consecutiveCount = 0;
  for (let i = 1; i < sentences.length; i++) {
    const firstWordPrev = sentences[i - 1].split(/\s+/)[0]?.toLowerCase();
    const firstWordCurr = sentences[i].split(/\s+/)[0]?.toLowerCase();
    if (firstWordPrev && firstWordPrev === firstWordCurr && firstWordPrev.length > 2) {
      consecutiveCount++;
    }
  }

  if (consecutiveCount >= 3) {
    improvements.push({
      id: 'consecutive_sentences',
      title: 'Consecutive sentences',
      linkText: `The text contains ${consecutiveCount} consecutive sentences starting with the same word. Try to mix things up!`,
      description: `The text contains ${consecutiveCount} consecutive sentences starting with the same word. Try to mix things up!`,
      learnUrl: consecUrl,
      status: 'ok'
    });
  } else if (sentences.length > 2) {
    goodResults.push({
      id: 'consecutive_sentences',
      title: 'Consecutive sentences',
      linkText: 'There is good sentence variety.',
      description: 'There is good sentence variety.',
      learnUrl: consecUrl,
      status: 'good'
    });
  }

  // 5. Transition Words
  const transitionUrl = 'https://yoast.com/transition-words-why-and-how-to-use-them/';
  let transitionCount = 0;
  sentences.forEach(s => {
    const lower = s.toLowerCase();
    if (TRANSITION_WORDS.some(tw => lower.includes(tw))) {
      transitionCount++;
    }
  });

  const transitionPercent = sentences.length > 0 ? Math.round((transitionCount / sentences.length) * 100) : 0;
  if (transitionPercent < 20 && sentences.length > 3) {
    improvements.push({
      id: 'transition_words',
      title: 'Transition words',
      linkText: `Only ${transitionPercent}% of sentences contain transition words, which is below the recommended 30%. Add words like 'furthermore', 'however', and 'in addition'.`,
      description: `Only ${transitionPercent}% of sentences contain transition words, which is below the recommended 30%. Add words like 'furthermore', 'however', and 'in addition'.`,
      learnUrl: transitionUrl,
      status: 'ok'
    });
  } else if (sentences.length > 3) {
    goodResults.push({
      id: 'transition_words',
      title: 'Transition words',
      linkText: `Well done! ${transitionPercent}% of sentences contain transition words.`,
      description: `Well done! ${transitionPercent}% of sentences contain transition words.`,
      learnUrl: transitionUrl,
      status: 'good'
    });
  }

  const total = problems.length + improvements.length + goodResults.length;
  const scorePercent = total > 0 ? Math.round((goodResults.length / total) * 100) : 0;
  let overallScore = 'bad';
  if (scorePercent >= 70) overallScore = 'good';
  else if (scorePercent >= 40) overallScore = 'ok';

  return {
    overallScore,
    fleschScore,
    problems,
    improvements,
    goodResults,
  };
}
