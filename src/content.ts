export type Category = 'all' | 'commerce' | 'development' | 'automation';
export type Zone = 'overview' | 'commerce' | 'development' | 'automation';

export const profile = {
  name: 'Abdullah Fida',
  github: 'https://github.com/Abdullah-Fida',
  linkedin: 'https://www.linkedin.com/in/abdullah-fida-88423b322',
  email: '',
  role: 'Shopify and full-stack developer',
};

export interface Project {
  id: string;
  title: string;
  eyebrow: string;
  category: Exclude<Category, 'all'>;
  description: string;
  role: string;
  summary: string;
  features: string[];
  tags: string[];
  url?: string;
  secondUrl?: string;
  secondLabel?: string;
  image?: string;
  visual: 'tcg' | 'wovenaa' | 'techlink' | 'news' | 'gym' | 'insurance' | 'agency' | 'social' | 'clips';
  status: string;
}

export const projects: Project[] = [
  {
    id: 'the-tcg-plug', title: 'The TCG Plug', eyebrow: 'Commerce, in motion.', category: 'commerce',
    description: 'Two storefronts. One serious trading-card operation.',
    role: 'Shopify development & ongoing store management',
    summary: 'Building and managing the storefronts behind a trading-card business: a retail store for collectors and a dedicated shop for live pack openings. The TCG Plug stores I manage currently do €300,000 in monthly sales.',
    features: ['Shopify storefront development', 'Ongoing store management', 'Retail and live Rip & Ship experiences', 'Product and collection presentation'],
    tags: ['Shopify', 'Store management', 'E-commerce'],
    url: 'https://www.thetcgplug.nl', secondUrl: 'https://thetcgplug.shop', secondLabel: 'Live shop',
    image: '/assets/tcg-hero.jpg', visual: 'tcg', status: 'Live storefronts',
  },
  {
    id: 'pressvane', title: 'PressVane', eyebrow: 'From idea to published.', category: 'automation',
    description: 'A news platform with an AI agent behind the publishing.',
    role: 'Website development & AI publishing integration',
    summary: 'A news website paired with an AI agent that creates articles and publishes them. The publishing workflow connects content generation with the place the story actually goes live.',
    features: ['News website development', 'AI article generation', 'Automatic article publishing', 'Integrated publishing workflow'],
    tags: ['AI agents', 'Web development', 'Publishing'], url: 'https://pressvane.com',
    visual: 'news', status: 'Live website',
  },
  {
    id: 'gym-management', title: 'Beyond the front desk', eyebrow: 'Software meets the real world.', category: 'development',
    description: 'A gym system that knows who can walk through the door.',
    role: 'Full-stack gym management & access control',
    summary: 'A live management system built around the complete member journey. Fingerprint check-in, door access, membership expiry and automatic messages work together in one flow.',
    features: ['Fingerprint-based member check-in', 'Door access control', 'Membership expiry tracking', 'Automatic member messages', 'End-to-end management workflow'],
    tags: ['Full-stack', 'Access control', 'Automation'], visual: 'gym', status: 'Live system · private demo',
  },
  {
    id: 'wovenaa', title: 'Wovenaa', eyebrow: 'A softer side of commerce.', category: 'commerce',
    description: 'A storefront for woven bags, natural textures, and everyday craft.',
    role: 'Shopify store development & management',
    summary: 'A Shopify storefront for a bags and accessories brand. Product presentation gives the woven materials and craftsmanship room to speak.',
    features: ['Shopify storefront development', 'Product and collection presentation', 'Store management', 'Responsive shopping experience'],
    tags: ['Shopify', 'Fashion', 'Store management'], url: 'https://wovenaa.com',
    image: '/assets/wovenaa-hero.jpg', visual: 'wovenaa', status: 'Live storefront',
  },
  {
    id: 'ahsantechlink', title: 'Ahsan Techlink', eyebrow: 'Built for a different kind of toolkit.', category: 'commerce',
    description: 'Technical equipment, made easier to shop for.',
    role: 'Shopify storefront & web development',
    summary: 'An equipment storefront for the Pakistan market, bringing CCTV, network, fibre and electrical testing products into a clear shopping experience.',
    features: ['Shopify store development', 'Technical product catalogue', 'Mobile shopping experience', 'Pakistan-focused storefront'],
    tags: ['Shopify', 'Web development', 'Pakistan'], url: 'https://ahsantechlink.com',
    image: '/assets/techlink-products.png', visual: 'techlink', status: 'Live storefront',
  },
  {
    id: 'zonyx', title: 'Zonyx Auto Insurance', eyebrow: 'Make the complicated feel clear.', category: 'development',
    description: 'A clear digital home for car, bike, and van cover.',
    role: 'Insurance website development',
    summary: 'A website for a UK vehicle insurance business. The experience introduces its cover options and gives visitors a route toward a quote.',
    features: ['Responsive website development', 'Car, bike and van cover presentation', 'Clear service navigation', 'Quote enquiry journey'],
    tags: ['Web development', 'Insurance', 'Responsive UI'], url: 'https://www.zonyxautoinsurance.com',
    visual: 'insurance', status: 'Live website',
  },
  {
    id: 'ikonnect', title: 'Ikonnect Service', eyebrow: 'A business, properly introduced.', category: 'development',
    description: 'The web presence for a data, AI, and growth agency.',
    role: 'Agency website development',
    summary: 'An agency website that brings data engineering, AI agents, web development and marketing services together in one digital presence.',
    features: ['Agency website development', 'Service presentation', 'Responsive layouts', 'Business enquiry flow'],
    tags: ['Web development', 'Agency', 'AI services'], url: 'https://www.ikonnectservice.com',
    visual: 'agency', status: 'Live website',
  },
  {
    id: 'social-agent', title: 'The publishing shift', eyebrow: 'The work carries on.', category: 'automation',
    description: 'An agent that creates the post, then hits publish.',
    role: 'Social content generation & publishing automation',
    summary: 'An automated workflow that takes social content from creation through publishing. Built to remove the repeated manual steps between an idea and a post going live.',
    features: ['Automatic post creation', 'Connected social publishing', 'End-to-end workflow automation', 'No routine manual publishing step'],
    tags: ['AI agents', 'Social automation', 'Workflows'], visual: 'social', status: 'Project walkthrough',
  },
  {
    id: 'stream-clips', title: 'Long stream. Short clips.', eyebrow: 'Catch the good part.', category: 'automation',
    description: 'A live stream goes in. Social-ready highlights come out.',
    role: 'Stream clipping, social publishing & YouTube automation',
    summary: 'An automation that watches live streams, finds the highlights, cuts them into clips and publishes to social platforms. The workflow connects the whole process, including YouTube automation.',
    features: ['Live stream monitoring', 'Highlight detection', 'Automatic clip cutting', 'Social platform publishing', 'YouTube automation'],
    tags: ['Video automation', 'AI workflows', 'YouTube'], visual: 'clips', status: 'Project walkthrough',
  },
];

export const categoryLabels: Record<Category, string> = {
  all: 'All work',
  commerce: 'Shopify & commerce',
  development: 'Web development',
  automation: 'AI & automation',
};

/** Screens shown on the 3D ring in the hero. Each one opens its project. */
export const heroPanels: { image: string; project: string; label: string }[] = [
  { image: '/assets/previews/tcg-nl-desktop.jpg', project: 'the-tcg-plug', label: 'The TCG Plug' },
  { image: '/assets/previews/pressvane-desktop.jpg', project: 'pressvane', label: 'PressVane' },
  { image: '/assets/previews/wovenaa-desktop.jpg', project: 'wovenaa', label: 'Wovenaa' },
  { image: '/assets/previews/zonyx-desktop.jpg', project: 'zonyx', label: 'Zonyx' },
  { image: '/assets/automation-art.jpg', project: 'stream-clips', label: 'Stream clips' },
  { image: '/assets/previews/ahsantechlink-desktop.jpg', project: 'ahsantechlink', label: 'Ahsan Techlink' },
  { image: '/assets/previews/ikonnect-desktop.jpg', project: 'ikonnect', label: 'Ikonnect' },
  { image: '/assets/previews/tcg-shop-desktop.jpg', project: 'the-tcg-plug', label: 'TCG Plug Live' },
];

export const services = [
  {
    title: 'Shopify & commerce',
    body: 'Storefronts built to sell, then looked after every day: products, collections, launches and the small fixes that keep orders moving.',
    points: ['Store builds & theme development', 'Day-to-day store management', 'Product & collection presentation', 'Live-selling storefronts'],
  },
  {
    title: 'Custom web apps',
    body: 'Websites and full-stack systems on the MERN stack, including software that reaches into the real world, like a gym door that knows its members.',
    points: ['React, Node.js, Express, MongoDB', 'Business & agency websites', 'Access control & member systems', 'Responsive, fast interfaces'],
  },
  {
    title: 'AI agents & automation',
    body: 'Agents that create the article, the post or the clip, and then publish it. The repetitive work between an idea and "live" goes away.',
    points: ['AI article generation & publishing', 'Social post automation', 'Stream highlight clipping', 'YouTube automation'],
  },
];
