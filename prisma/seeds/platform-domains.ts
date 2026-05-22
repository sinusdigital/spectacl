import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOMAIN_TYPES = [
  { name: 'Own',                        slug: 'own',                        color: '#10B981', description: "The tracked brand's own website" },
  { name: 'Corporate',                  slug: 'corporate',                  color: '#8B5CF6', description: 'Company and brand websites' },
  { name: 'Social & community',         slug: 'social-community',           color: '#3B82F6', description: 'Social networks and community platforms' },
  { name: 'News & media',               slug: 'news-media',                 color: '#F59E0B', description: 'News outlets and media publications' },
  { name: 'Q&A & developer',            slug: 'qa-developer',               color: '#6B7280', description: 'Developer platforms, Q&A sites, and code repositories' },
  { name: 'E-commerce & retail',        slug: 'e-commerce-retail',          color: '#EC4899', description: 'Online shops and retail platforms' },
  { name: 'Reference & encyclopedic',   slug: 'reference-encyclopedic',     color: '#A855F7', description: 'Encyclopedias, academic references, and knowledge bases' },
  { name: 'Publishing & blogging',      slug: 'publishing-blogging',        color: '#06B6D4', description: 'Blogging platforms and independent publications' },
  { name: 'Search engines',             slug: 'search-engines',             color: '#EF4444', description: 'Search engines and discovery platforms' },
  { name: 'Reviews & ratings',          slug: 'reviews-ratings',            color: '#84CC16', description: 'Review and rating platforms' },
  { name: 'Government & institutional', slug: 'government-institutional',   color: '#64748B', description: 'Government bodies, international organisations, and institutions' },
  { name: 'Finance & business data',    slug: 'finance-business-data',      color: '#F97316', description: 'Financial data, business intelligence, and market data' },
  { name: 'Maps & local',               slug: 'maps-local',                 color: '#22C55E', description: 'Mapping services and local discovery' },
];

const PLATFORM_DOMAINS: { domain: string; type: string }[] = [
  // Social & community
  { domain: 'youtube.com',      type: 'Social & community' },
  { domain: 'reddit.com',       type: 'Social & community' },
  { domain: 'linkedin.com',     type: 'Social & community' },
  { domain: 'facebook.com',     type: 'Social & community' },
  { domain: 'instagram.com',    type: 'Social & community' },
  { domain: 'x.com',            type: 'Social & community' },
  { domain: 'tiktok.com',       type: 'Social & community' },
  { domain: 'pinterest.com',    type: 'Social & community' },
  { domain: 'quora.com',        type: 'Social & community' },
  { domain: 'mastodon.social',  type: 'Social & community' },
  { domain: 'bsky.app',         type: 'Social & community' },
  { domain: 'discord.com',      type: 'Social & community' },
  { domain: 'telegram.org',     type: 'Social & community' },
  { domain: 'vk.com',           type: 'Social & community' },
  { domain: 'snapchat.com',     type: 'Social & community' },
  { domain: 'threads.net',      type: 'Social & community' },
  { domain: 'whatsapp.com',     type: 'Social & community' },

  // Reference & encyclopedic
  { domain: 'wikipedia.org',           type: 'Reference & encyclopedic' },
  { domain: 'wikidata.org',            type: 'Reference & encyclopedic' },
  { domain: 'wikimedia.org',           type: 'Reference & encyclopedic' },
  { domain: 'britannica.com',          type: 'Reference & encyclopedic' },
  { domain: 'wolframalpha.com',        type: 'Reference & encyclopedic' },
  { domain: 'archive.org',             type: 'Reference & encyclopedic' },
  { domain: 'scholar.google.com',      type: 'Reference & encyclopedic' },
  { domain: 'jstor.org',               type: 'Reference & encyclopedic' },
  { domain: 'semanticscholar.org',     type: 'Reference & encyclopedic' },
  { domain: 'ncbi.nlm.nih.gov',        type: 'Reference & encyclopedic' },
  { domain: 'pubmed.ncbi.nlm.nih.gov', type: 'Reference & encyclopedic' },
  { domain: 'researchgate.net',        type: 'Reference & encyclopedic' },
  { domain: 'arxiv.org',               type: 'Reference & encyclopedic' },
  { domain: 'ssrn.com',                type: 'Reference & encyclopedic' },

  // Q&A & developer
  { domain: 'stackexchange.com',            type: 'Q&A & developer' },
  { domain: 'stackoverflow.com',            type: 'Q&A & developer' },
  { domain: 'github.com',                   type: 'Q&A & developer' },
  { domain: 'news.ycombinator.com',         type: 'Q&A & developer' },
  { domain: 'gitlab.com',                   type: 'Q&A & developer' },
  { domain: 'bitbucket.org',                type: 'Q&A & developer' },
  { domain: 'dev.to',                       type: 'Q&A & developer' },
  { domain: 'hashnode.com',                 type: 'Q&A & developer' },
  { domain: 'lobste.rs',                    type: 'Q&A & developer' },
  { domain: 'codepen.io',                   type: 'Q&A & developer' },
  { domain: 'replit.com',                   type: 'Q&A & developer' },
  { domain: 'npmjs.com',                    type: 'Q&A & developer' },
  { domain: 'pypi.org',                     type: 'Q&A & developer' },
  { domain: 'crates.io',                    type: 'Q&A & developer' },
  { domain: 'huggingface.co',               type: 'Q&A & developer' },
  { domain: 'kaggle.com',                   type: 'Q&A & developer' },
  { domain: 'colab.research.google.com',    type: 'Q&A & developer' },

  // Publishing & blogging
  { domain: 'medium.com',     type: 'Publishing & blogging' },
  { domain: 'substack.com',   type: 'Publishing & blogging' },
  { domain: 'wordpress.com',  type: 'Publishing & blogging' },
  { domain: 'ghost.io',       type: 'Publishing & blogging' },
  { domain: 'blogger.com',    type: 'Publishing & blogging' },
  { domain: 'tumblr.com',     type: 'Publishing & blogging' },
  { domain: 'typepad.com',    type: 'Publishing & blogging' },
  { domain: 'beehiiv.com',    type: 'Publishing & blogging' },
  { domain: 'mirror.xyz',     type: 'Publishing & blogging' },
  { domain: 'hashnode.dev',   type: 'Publishing & blogging' },

  // Search engines
  { domain: 'google.com',       type: 'Search engines' },
  { domain: 'bing.com',         type: 'Search engines' },
  { domain: 'duckduckgo.com',   type: 'Search engines' },
  { domain: 'yahoo.com',        type: 'Search engines' },
  { domain: 'baidu.com',        type: 'Search engines' },
  { domain: 'yandex.com',       type: 'Search engines' },
  { domain: 'ecosia.org',       type: 'Search engines' },
  { domain: 'brave.com',        type: 'Search engines' },
  { domain: 'perplexity.ai',    type: 'Search engines' },
  { domain: 'kagi.com',         type: 'Search engines' },

  // News & media
  { domain: 'forbes.com',           type: 'News & media' },
  { domain: 'reuters.com',          type: 'News & media' },
  { domain: 'techcrunch.com',       type: 'News & media' },
  { domain: 'theverge.com',         type: 'News & media' },
  { domain: 'bloomberg.com',        type: 'News & media' },
  { domain: 'apnews.com',           type: 'News & media' },
  { domain: 'bbc.com',              type: 'News & media' },
  { domain: 'nytimes.com',          type: 'News & media' },
  { domain: 'theguardian.com',      type: 'News & media' },
  { domain: 'wsj.com',              type: 'News & media' },
  { domain: 'ft.com',               type: 'News & media' },
  { domain: 'economist.com',        type: 'News & media' },
  { domain: 'wired.com',            type: 'News & media' },
  { domain: 'arstechnica.com',      type: 'News & media' },
  { domain: 'engadget.com',         type: 'News & media' },
  { domain: 'zdnet.com',            type: 'News & media' },
  { domain: 'cnet.com',             type: 'News & media' },
  { domain: 'venturebeat.com',      type: 'News & media' },
  { domain: 'businessinsider.com',  type: 'News & media' },
  { domain: 'cnbc.com',             type: 'News & media' },
  { domain: 'npr.org',              type: 'News & media' },
  { domain: 'theatlantic.com',      type: 'News & media' },
  { domain: 'vox.com',              type: 'News & media' },
  { domain: 'axios.com',            type: 'News & media' },
  { domain: 'politico.com',         type: 'News & media' },
  { domain: 'spiegel.de',           type: 'News & media' },
  { domain: 'faz.net',              type: 'News & media' },
  { domain: 'zeit.de',              type: 'News & media' },
  { domain: 'handelsblatt.com',     type: 'News & media' },
  { domain: 'nrc.nl',               type: 'News & media' },
  { domain: 'fd.nl',                type: 'News & media' },
  { domain: 'volkskrant.nl',        type: 'News & media' },
  { domain: 'nos.nl',               type: 'News & media' },

  // Reviews & ratings
  { domain: 'trustpilot.com',       type: 'Reviews & ratings' },
  { domain: 'g2.com',               type: 'Reviews & ratings' },
  { domain: 'capterra.com',         type: 'Reviews & ratings' },
  { domain: 'glassdoor.com',        type: 'Reviews & ratings' },
  { domain: 'indeed.com',           type: 'Reviews & ratings' },
  { domain: 'tripadvisor.com',      type: 'Reviews & ratings' },
  { domain: 'yelp.com',             type: 'Reviews & ratings' },
  { domain: 'getapp.com',           type: 'Reviews & ratings' },
  { domain: 'producthunt.com',      type: 'Reviews & ratings' },
  { domain: 'alternativeto.net',    type: 'Reviews & ratings' },
  { domain: 'softwareadvice.com',   type: 'Reviews & ratings' },
  { domain: 'pcmag.com',            type: 'Reviews & ratings' },
  { domain: 'rtings.com',           type: 'Reviews & ratings' },
  { domain: 'wirecutter.com',       type: 'Reviews & ratings' },
  { domain: 'commonsensemedia.org', type: 'Reviews & ratings' },
  { domain: 'imdb.com',             type: 'Reviews & ratings' },
  { domain: 'rottentomatoes.com',   type: 'Reviews & ratings' },
  { domain: 'metacritic.com',       type: 'Reviews & ratings' },
  { domain: 'goodreads.com',        type: 'Reviews & ratings' },

  // E-commerce & retail
  { domain: 'amazon.com',       type: 'E-commerce & retail' },
  { domain: 'shopify.com',      type: 'E-commerce & retail' },
  { domain: 'ebay.com',         type: 'E-commerce & retail' },
  { domain: 'etsy.com',         type: 'E-commerce & retail' },
  { domain: 'walmart.com',      type: 'E-commerce & retail' },
  { domain: 'aliexpress.com',   type: 'E-commerce & retail' },
  { domain: 'zalando.com',      type: 'E-commerce & retail' },
  { domain: 'bol.com',          type: 'E-commerce & retail' },
  { domain: 'coolblue.nl',      type: 'E-commerce & retail' },
  { domain: 'pricespy.co.uk',   type: 'E-commerce & retail' },
  { domain: 'idealo.de',        type: 'E-commerce & retail' },
  { domain: 'geizhals.de',      type: 'E-commerce & retail' },

  // Government & institutional
  { domain: 'ec.europa.eu',            type: 'Government & institutional' },
  { domain: 'data.europa.eu',          type: 'Government & institutional' },
  { domain: 'data.gov',                type: 'Government & institutional' },
  { domain: 'eur-lex.europa.eu',       type: 'Government & institutional' },
  { domain: 'bundesregierung.de',      type: 'Government & institutional' },
  { domain: 'rijksoverheid.nl',        type: 'Government & institutional' },
  { domain: 'destatis.de',             type: 'Government & institutional' },
  { domain: 'cbs.nl',                  type: 'Government & institutional' },
  { domain: 'eurostat.ec.europa.eu',   type: 'Government & institutional' },
  { domain: 'who.int',                 type: 'Government & institutional' },
  { domain: 'un.org',                  type: 'Government & institutional' },
  { domain: 'worldbank.org',           type: 'Government & institutional' },
  { domain: 'imf.org',                 type: 'Government & institutional' },
  { domain: 'oecd.org',                type: 'Government & institutional' },
  { domain: 'sec.gov',                 type: 'Government & institutional' },
  { domain: 'ftc.gov',                 type: 'Government & institutional' },
  { domain: 'patents.google.com',      type: 'Government & institutional' },

  // Finance & business data
  { domain: 'crunchbase.com',       type: 'Finance & business data' },
  { domain: 'pitchbook.com',        type: 'Finance & business data' },
  { domain: 'statista.com',         type: 'Finance & business data' },
  { domain: 'macrotrends.net',      type: 'Finance & business data' },
  { domain: 'tradingeconomics.com', type: 'Finance & business data' },
  { domain: 'finance.yahoo.com',    type: 'Finance & business data' },
  { domain: 'marketwatch.com',      type: 'Finance & business data' },
  { domain: 'investing.com',        type: 'Finance & business data' },
  { domain: 'morningstar.com',      type: 'Finance & business data' },
  { domain: 'opencorporates.com',   type: 'Finance & business data' },
  { domain: 'dnb.com',              type: 'Finance & business data' },
  { domain: 'companieshouse.gov.uk',type: 'Finance & business data' },

  // Maps & local
  { domain: 'maps.google.com',    type: 'Maps & local' },
  { domain: 'openstreetmap.org',  type: 'Maps & local' },
  { domain: 'foursquare.com',     type: 'Maps & local' },
  { domain: 'mapbox.com',         type: 'Maps & local' },
];

async function main() {
  console.log('🌱 Seeding domain types...');

  for (const dt of DOMAIN_TYPES) {
    await prisma.domainType.upsert({
      where: { name: dt.name },
      update: { slug: dt.slug, color: dt.color, description: dt.description },
      create: dt,
    });
  }
  console.log(`✅ Seeded ${DOMAIN_TYPES.length} domain types`);

  console.log('🌱 Seeding platform domains...');
  let seeded = 0;
  for (const d of PLATFORM_DOMAINS) {
    await prisma.domain.upsert({
      where: { domain: d.domain },
      update: { type: d.type },
      create: { domain: d.domain, type: d.type, isAllowlisted: false },
    });
    seeded++;
  }
  console.log(`✅ Seeded ${seeded} domains`);

  console.log('🔄 Migrating legacy type values...');
  const migrations: Array<{ from: string; to: string }> = [
    { from: 'UGC',        to: 'Social & community' },
    { from: 'Editorial',  to: 'News & media' },
    { from: 'Technical',  to: 'Q&A & developer' },
    { from: 'E-Commerce', to: 'E-commerce & retail' },
  ];

  for (const m of migrations) {
    const result = await prisma.domain.updateMany({
      where: { type: m.from },
      data: { type: m.to },
    });
    if (result.count > 0) {
      console.log(`  ✅ Migrated ${result.count} domains: "${m.from}" → "${m.to}"`);
    }
  }

  console.log('🎉 Platform domains seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
