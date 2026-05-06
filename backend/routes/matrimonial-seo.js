/**
 * SEO Pages Routes for Matrimonial Module
 * Static pages for Google ranking and organic traffic
 */

const express = require('express');
const router = express.Router();
const MatrimonialProfile = require('../models/MatrimonialProfile');

/**
 * GET /matrimonial/city/:city
 * City-specific matrimonial guide page (SEO)
 */
router.get('/city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const capitalCity = city.charAt(0).toUpperCase() + city.slice(1);

    // Fetch stats for this city
    const cityProfiles = await MatrimonialProfile.countDocuments({ 
      'location.city': new RegExp(city, 'i')
    });

    const content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Best Matrimonial Site in ${capitalCity} | Find Your Perfect Match</title>
        <meta name="description" content="Meet ${cityProfiles}+ verified singles in ${capitalCity}. Find your perfect life partner on our secure matrimonial platform.">
        <meta name="keywords" content="${capitalCity} matrimonial, ${capitalCity} marriage, ${capitalCity} singles, ${capitalCity} wedding">
        <meta property="og:title" content="Matrimonial Services in ${capitalCity}">
        <meta property="og:description" content="Join ${cityProfiles}+ verified members in ${capitalCity}">
      </head>
      <body>
        <h1>Find Your Perfect Match in ${capitalCity}</h1>
        <p>Join ${cityProfiles}+ verified singles in ${capitalCity} looking for serious relationships.</p>
        <section>
          <h2>Why Choose Our Matrimonial Platform?</h2>
          <ul>
            <li>Verified profiles with KYC verification</li>
            <li>Advanced horoscope matching (8-Guna compatibility)</li>
            <li>Safe and secure platform</li>
            <li>Professional team support</li>
            <li>Privacy and confidentiality guaranteed</li>
          </ul>
        </section>
        <section>
          <h2>Matrimonial Services in ${capitalCity}</h2>
          <p>Our matrimonial platform connects ${capitalCity} singles across communities and religions.</p>
        </section>
        <a href="/matrimonial/signup" class="cta-button">Create Your Profile Now</a>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error('Error rendering city page:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /matrimonial/religion/:religion
 * Religion-specific matrimonial page (SEO)
 */
router.get('/religion/:religion', async (req, res) => {
  try {
    const { religion } = req.params;
    const capitalReligion = religion.charAt(0).toUpperCase() + religion.slice(1);

    const religionProfiles = await MatrimonialProfile.countDocuments({
      religion: new RegExp(religion, 'i')
    });

    const content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${capitalReligion} Matrimonial | Find Your Life Partner</title>
        <meta name="description" content="${religionProfiles}+ verified ${capitalReligion} singles. Find your perfect match on our matrimonial platform.">
        <meta name="keywords" content="${capitalReligion} matrimonial, ${capitalReligion} marriage, ${capitalReligion} singles">
      </head>
      <body>
        <h1>${capitalReligion} Matrimonial Services</h1>
        <p>Connect with ${religionProfiles}+ verified ${capitalReligion} singles seeking serious relationships.</p>
        <section>
          <h2>Traditional Values, Modern Platform</h2>
          <p>Our matrimonial platform respects ${capitalReligion} traditions while providing modern matchmaking features.</p>
        </section>
        <section>
          <h2>Features</h2>
          <ul>
            <li>Community-specific profiles</li>
            <li>Horoscope matching for compatibility</li>
            <li>Verified members only</li>
            <li>Confidential communication</li>
          </ul>
        </section>
        <a href="/matrimonial/signup?religion=${religion}" class="cta-button">Start Your Journey Today</a>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error('Error rendering religion page:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /matrimonial/blog/:slug
 * Blog post page
 */
router.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const blogPosts = {
      'horoscope-matching': {
        title: 'Complete Guide to Horoscope Matching for Marriage',
        content: `
          <article>
            <h1>Understanding Horoscope Matching (Kundali Milap)</h1>
            <p>Horoscope matching is an ancient Vedic practice that analyzes the compatibility of two individuals for marriage...</p>
            <h2>8-Guna Matching System</h2>
            <p>The traditional Vedic system uses 8 gunas (qualities) to measure compatibility...</p>
            <h2>How to Calculate Your Guna Score</h2>
            <p>Each guna is worth specific points out of 36...</p>
            <h3>The 8 Gunas:</h3>
            <ol>
              <li>Varna (1 point)</li>
              <li>Vasya (2 points)</li>
              <li>Tara (3 points)</li>
              <li>Yoni (4 points)</li>
              <li>Graha Maitri (5 points)</li>
              <li>Gana (6 points)</li>
              <li>Bhakoot (7 points)</li>
              <li>Nadi (8 points)</li>
            </ol>
          </article>
        `,
        slug: 'horoscope-matching'
      },
      'finding-right-partner': {
        title: 'How to Find Your Perfect Life Partner',
        content: '<article><h1>Finding Your Perfect Life Partner</h1><p>Tips and strategies...</p></article>',
        slug: 'finding-right-partner'
      },
      'matrimonial-safety': {
        title: 'Safety Tips for Online Matrimonial Websites',
        content: '<article><h1>Stay Safe on Matrimonial Sites</h1><p>Important security measures...</p></article>',
        slug: 'matrimonial-safety'
      }
    };

    const post = blogPosts[slug];
    if (!post) {
      return res.status(404).send('Blog post not found');
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${post.title}</title>
        <meta name="description" content="Read about ${post.title} on our matrimonial blog">
        <meta property="og:title" content="${post.title}">
      </head>
      <body>
        ${post.content}
        <section class="cta">
          <p>Join our matrimonial community today</p>
          <a href="/matrimonial/signup" class="button">Create Your Profile</a>
        </section>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error rendering blog post:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /matrimonial/sitemap.xml
 * XML sitemap for SEO
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://matrimonial.example.com';

    // Get cities and religions for dynamic URLs
    const cities = await MatrimonialProfile.distinct('location.city', { 'location.city': { $exists: true } });
    const religions = await MatrimonialProfile.distinct('religion');

    const urls = [
      `${baseUrl}/matrimonial`,
      `${baseUrl}/matrimonial/signup`,
      `${baseUrl}/matrimonial/blog`,
      ...cities.map(city => `${baseUrl}/matrimonial/city/${city.toLowerCase().replace(/ /g, '-')}`),
      ...religions.map(religion => `${baseUrl}/matrimonial/religion/${religion.toLowerCase()}`),
      `${baseUrl}/matrimonial/blog/horoscope-matching`,
      `${baseUrl}/matrimonial/blog/finding-right-partner`,
      `${baseUrl}/matrimonial/blog/matrimonial-safety`
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url, index) => `  <url>
    <loc>${url}</loc>
    <priority>${index === 0 ? '1.0' : '0.8'}</priority>
    <changefreq>weekly</changefreq>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /matrimonial/robots.txt
 * Robots file for search engine crawling
 */
router.get('/robots.txt', (req, res) => {
  const robots = `
User-agent: *
Allow: /matrimonial/city/
Allow: /matrimonial/religion/
Allow: /matrimonial/blog/
Disallow: /api/
Disallow: /admin/
Sitemap: /matrimonial/sitemap.xml
Rate-limit: 100 requests per hour
  `.trim();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(robots);
});

module.exports = router;
