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
    id: 'gym-management', title: 'Gym access system', eyebrow: 'Software meets the real world.', category: 'development',
    description: 'Fingerprint check-in, door access and membership tracking in one system.',
    role: 'Full-stack gym management & access control',
    summary: 'A live management system built around the complete member journey. Fingerprint check-in, door access, membership expiry and automatic messages work together in one flow.',
    features: ['Fingerprint-based member check-in', 'Door access control', 'Membership expiry tracking', 'Automatic member messages', 'End-to-end management workflow'],
    tags: ['Full-stack', 'Access control', 'Automation'], visual: 'gym', status: 'Private system',
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
    id: 'social-agent', title: 'Social publishing agent', eyebrow: 'The work carries on.', category: 'automation',
    description: 'Writes social posts and publishes them on its own.',
    role: 'Social content generation & publishing automation',
    summary: 'An automated workflow that takes social content from creation through publishing. Built to remove the repeated manual steps between an idea and a post going live.',
    features: ['Automatic post creation', 'Connected social publishing', 'End-to-end workflow automation', 'No routine manual publishing step'],
    tags: ['AI agents', 'Social automation', 'Workflows'], visual: 'social', status: 'Automation',
  },
  {
    id: 'stream-clips', title: 'Stream clipping pipeline', eyebrow: 'Catch the good part.', category: 'automation',
    description: 'Watches live streams, cuts the highlights and posts them.',
    role: 'Stream clipping, social publishing & YouTube automation',
    summary: 'An automation that watches live streams, finds the highlights, cuts them into clips and publishes to social platforms. The workflow connects the whole process, including YouTube automation.',
    features: ['Live stream monitoring', 'Highlight detection', 'Automatic clip cutting', 'Social platform publishing', 'YouTube automation'],
    tags: ['Video automation', 'AI workflows', 'YouTube'], visual: 'clips', status: 'Automation',
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
    title: 'Shopify stores',
    body: 'Store setup, theme development and the day-to-day running of a store: products, collections, launches and fixes.',
    points: ['Store builds and theme work', 'Ongoing store management', 'Product and collection pages', 'Live-selling storefronts'],
  },
  {
    title: 'Websites and web apps',
    body: 'Business websites and full-stack applications with React, Node.js, Express and MongoDB, including systems that talk to hardware.',
    points: ['React, Node.js, Express, MongoDB', 'Business and agency websites', 'Access control and member systems', 'Fast, responsive interfaces'],
  },
  {
    title: 'AI automation',
    body: 'Agents and workflows that generate articles, social posts and video clips, then publish them without someone pressing the button.',
    points: ['Article generation and publishing', 'Social post automation', 'Stream highlight clipping', 'YouTube automation'],
  },
];
