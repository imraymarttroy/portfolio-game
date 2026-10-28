import { NPCData, PortfolioProject, SkillCategory, ShellItem } from '../types/game';

export const PORTFOLIO_OWNER = {
  name: 'Raymart Troy',
  title: 'Multimedia Artist & Creative Visual Storyteller',
  tagline: '“Every brand has a story worth telling.”',
  location: 'Manila, Philippines',
  birthday: 'June 28, 1999',
  email: 'imraymarttroy@gmail.com',
  alternateEmail: 'troy.theawesomegroup@gmail.com',
  phone: '+63 955 188 3472',
  website: 'https://imraymarttroy.online/',
  behance: 'https://www.behance.net/raymarttroy',
  facebook: 'https://www.facebook.com/imraymarttroy',
  instagram: 'https://www.instagram.com/imraymarttroy/',
  bio: 'A Manila-based Multimedia Artist who believes every brand has a story worth telling. Bringing stories to life through graphic design, 2D motion graphics, video editing, photography, and front-end web development, crafting visuals that are memorable, consistent, and deeply personal.',
};

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'narabi-coffee-matcha',
    title: 'Narabi Coffee & Matcha',
    category: 'Full-Stack Web', // Creative Design / Branding
    role: 'Lead Visual Designer & Brand Strategist',
    period: '2024',
    summary: 'A complete Japanese-inspired brand identity and packaging design system for Narabi Coffee & Matcha, featuring custom typography, organic earth palettes, and tactile merchandise packaging.',
    highlights: [
      'Engineered holistic brand guidelines spanning logo lockups, color theory, and typography hierarchy.',
      'Designed bespoke retail packaging, cup sleeves, and matcha tin decals with minimalist aesthetic.',
      'Produced digital promotional banners and social media campaign assets that boosted brand recall.',
    ],
    technologies: ['Adobe Illustrator', 'Photoshop', 'Packaging Design', 'Brand Identity', 'Typography'],
    demoUrl: 'https://www.behance.net/gallery/248038237/Narabi-Coffee-Matcha',
    repoUrl: 'https://www.behance.net/raymarttroy',
    badge: 'Brand Identity',
  },
  {
    id: 'the-bianca-series',
    title: 'The Bianca Series',
    category: '3D & Creative Tech', // Photography & Editorial Art
    role: 'Art Director & Photographer',
    period: '2024',
    summary: 'An evocative editorial photography collection exploring natural light, portrait emotion, and intentional composition that captures the genuine spirit and elegance of the subject.',
    highlights: [
      'Mastered cinematic framing and natural ambient lighting for raw, emotional portraits.',
      'Curated high-end color grading and retouching workflows tailored for digital and print exhibitions.',
      'Celebrated on Behance for authentic visual storytelling and depth.',
    ],
    technologies: ['Photography', 'Lightroom', 'Editorial Direction', 'Color Grading', 'Portraiture'],
    demoUrl: 'https://www.behance.net/gallery/249272427/The-Bianca-Series',
    repoUrl: 'https://www.behance.net/raymarttroy',
    badge: 'Photography',
  },
  {
    id: 'titser-gennie',
    title: 'Titser Gennie',
    category: 'AI & Agents', // Documentary & Video Storytelling
    role: 'Film Editor & Motion Designer',
    period: '2023',
    summary: 'An inspiring cinematic documentary film honoring educators, woven together with heartwarming narrative pacing, dynamic audio mixing, and elegant kinetic motion graphics.',
    highlights: [
      'Structured unscripted documentary footage into an emotionally resonant story arc.',
      'Crafted custom title animations, lower thirds, and historical photo motion composites.',
      'Delivered broadcast-ready color correction and balanced multi-track sound engineering.',
    ],
    technologies: ['Adobe Premiere Pro', 'After Effects', 'Sound Design', 'Kinetic Typography', 'Documentary'],
    demoUrl: 'https://youtu.be/lQTgq9zyDPc?si=m_XiY0bhUC5wTazd',
    repoUrl: 'https://imraymarttroy.online/',
    badge: 'Video & Motion',
  },
  {
    id: 'muph-2024-experience',
    title: 'MUPH 2024 Experience & High-Energy Reels',
    category: 'Cloud & Systems', // High-Impact Digital Campaigns & Motion
    role: 'Multimedia Producer & Video Editor',
    period: '2024',
    summary: 'High-octane coverage of Miss Universe Philippines 2024, LesMills Body Combat 100, and fast-paced commercial reels driving hundreds of thousands of views across digital platforms.',
    highlights: [
      'Produced dynamic short-form video reels with beat-synced transitions and motion graphics.',
      'Collaborated with major brands at Globe Telecom and 4.0 Management to maximize engagement.',
      'Integrated GA4 metrics and performance feedback to optimize video retention and viral reach.',
    ],
    technologies: ['Motion Graphics', 'Short-Form Reels', 'Social Video', 'Premiere Pro', 'After Effects'],
    demoUrl: 'https://www.facebook.com/reel/1091736388790714',
    repoUrl: 'https://www.facebook.com/imraymarttroy',
    badge: 'Viral Media',
  },
];

export const WORK_EXPERIENCE = [
  {
    company: '4.0 Management',
    role: 'Creatives Team Member',
    period: '2026 — Present',
    description: 'Contributing to creative concepts, visual content, and multimedia projects that bring ideas to life through impactful storytelling and design.',
  },
  {
    company: 'Globe Telecom',
    role: 'Digital Marketing & Multimedia Specialist',
    period: '2022 — 2026',
    description: 'Spearheaded digital marketing campaigns, social media management, and multimedia design to strengthen brand visibility, audience engagement, and content performance across digital platforms. Utilized GA4 analytics and cross-functional collaboration to optimize campaign strategies.',
  },
  {
    company: 'Wordtext Systems Inc.',
    role: 'Multimedia Designer',
    period: '2021 — 2022',
    description: 'Produced high-quality visual assets, motion graphics, videos, and marketing collaterals for digital campaigns, corporate communications, and promotional materials while maintaining consistent brand identity.',
  },
];

export const EDUCATION = [
  {
    institution: 'University of Makati',
    degree: 'Bachelor of Arts in Broadcast Production',
    period: '2017 — 2020',
    description: 'Member of Collective Arts of Students and Thespians. Film/documentary editor, Publicity Team Head, mentor, and actor in Filipino Heroes League, KATI: Ang Pinagmulan ng Alamat, and Taguan.',
  },
  {
    institution: 'Higher School ng UMak',
    degree: 'Performing Arts (Major in Theater Arts)',
    period: '2015 — 2017',
    description: 'Senior High School Performing Arts strand, honing skills in acting, stage performance, presence, and creative narrative storytelling.',
  },
];

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: 'Visual & Graphic Design',
    icon: 'Sparkles',
    skills: [
      { name: 'Branding & Identity', level: 90, tags: ['Brand Book', 'Logos', 'Guidelines'] },
      { name: 'Graphic Design', level: 87, tags: ['Illustrator', 'Photoshop', 'Print'] },
      { name: 'Packaging & Merchandise', level: 85, tags: ['Labels', 'Typography', 'Mockups'] },
      { name: 'Art Direction', level: 88, tags: ['Style Guides', 'Color Harmony', 'Moodboards'] },
    ],
  },
  {
    name: 'Video & 2D Motion Graphics',
    icon: 'Video',
    skills: [
      { name: 'Video Editing', level: 85, tags: ['Premiere Pro', 'Documentary', 'Pacing'] },
      { name: '2D Motion Graphics', level: 85, tags: ['After Effects', 'Kinetic Type', 'VFX'] },
      { name: 'Sound Design & Mixing', level: 82, tags: ['Audio Scrubbing', 'SFX', 'Mastering'] },
      { name: 'Short-Form Reels & Ads', level: 89, tags: ['Reels', 'TikTok', 'Viral Hooks'] },
    ],
  },
  {
    name: 'Photography & Web Tech',
    icon: 'Camera',
    skills: [
      { name: 'Photography', level: 86, tags: ['Portraits', 'Lightroom', 'Natural Light'] },
      { name: 'Front-End Web Development', level: 75, tags: ['HTML5', 'CSS3/Tailwind', 'React', 'JS'] },
      { name: 'Analytics & Campaign Strategy', level: 84, tags: ['GA4', 'ROI', 'Digital Growth'] },
      { name: 'Theatrical Narrative & Stage', level: 88, tags: ['Storytelling', 'Acting', 'UMak CAST'] },
    ],
  },
];

export const TESTIMONIALS = [
  {
    author: 'Angelo Kean',
    quote: 'Troy was hired to produce our brand visuals and video content, and we were very pleased with the results. He brought a wealth of experience across design, motion, and video, and he genuinely listened to what we needed. The final work told our story clearly and looked polished on every platform.',
  },
  {
    author: 'Marie Loma',
    quote: 'We hired Raymart for our brand visuals and video content and couldn’t be happier. The experience shows, and Raymart genuinely cares about what the client needs.',
  },
  {
    author: 'Mae Ureta',
    quote: 'Creative, experienced, and attentive to our needs. Raymart brought our brand story to life.',
  },
  {
    author: 'Henry Santos',
    quote: 'Raymart took our ideas and turned them into visuals and video that told our story better than we could have imagined. Highly experienced, easy to work with, and always focused on what we needed.',
  },
];

export const ISLAND_NPCS: NPCData[] = [
  {
    id: 'captain_barnaby',
    name: 'Captain Barnaby',
    role: 'Lighthouse Keeper & Harbor Master',
    title: 'The Pier Mariner',
    accentColor: '#38bdf8', // Sky blue
    position: [-16, 0.4, 18],
    rotation: 0.3,
    avatarIcon: '⚓',
    landmark: 'The Lighthouse & Wooden Pier',
    portfolioTopic: 'Raymart Troy’s Origin & Theater Roots',
    summaryQuote: '“Raymart started on the theater stage and turned drama into visual magic!”',
    dialogue: {
      id: 'barnaby_intro',
      speaker: 'Captain Barnaby',
      title: 'Harbor Master',
      greeting: 'Ahoy there, traveler! Step ashore on the Isle of Troy. If you want to know how Raymart Troy learned to steer creative ships, you came to the right lighthouse!',
      ambientChatter: [
        '“Raymart graduated with a Broadcast Production degree from the University of Makati!”',
        '“Did you know Raymart acted and designed publicity for UMak’s Collective Arts (CAST)?”',
        '“From Senior High theater arts to national telecom campaigns!”',
      ],
      options: [
        {
          text: 'How did Raymart start in multimedia arts?',
          response: 'Barnaby beams with pride: “Raymart discovered his passion in theater and stage performance at Higher School ng UMak! He then took his Bachelor of Arts in Broadcast Production at the University of Makati, editing documentaries, leading publicity teams, and performing in productions like Filipino Heroes League and KATI!”',
          topicId: 'story',
        },
        {
          text: 'Where has Raymart worked professionally?',
          response: '“Raymart has sailed through major industry waters! He produced motion graphics at Wordtext Systems, spearheaded digital marketing and GA4 campaigns at Globe Telecom, and now drives creative visual concepts at 4.0 Management!”',
          topicId: 'experience',
        },
        {
          text: 'How can I contact Raymart Troy directly?',
          response: '“Send a message straight to imraymarttroy@gmail.com or call +63 955 188 3472! He is based in Manila, Philippines!”',
          topicId: 'contact',
          externalLink: {
            label: 'Email Raymart Troy',
            url: 'mailto:imraymarttroy@gmail.com',
          },
        },
      ],
    },
  },
  {
    id: 'gearsmith_pip',
    name: 'Gearsmith Pip',
    role: 'Windmill Engineer & Craft Tinkerer',
    title: 'The Media Smith',
    accentColor: '#fb923c', // Orange
    position: [18, 1.2, 12],
    rotation: -2.1,
    avatarIcon: '⚙️',
    landmark: 'The Windmill Workshop',
    portfolioTopic: 'Creative Toolkit, Motion & Skills',
    summaryQuote: '“Branding 90%, Graphic Design 87%, Video Editing 85% — calibrated to perfection!”',
    dialogue: {
      id: 'pip_intro',
      speaker: 'Gearsmith Pip',
      title: 'Chief Tinkerer',
      greeting: 'Whirr, clack! Welcome to the Windmill Workshop! I inspect every frame of video, curve of typography, and color palette Raymart designs. Want to see his creative toolkit?',
      ambientChatter: [
        '“Raymart crafts 2D motion graphics that give brands an unmistakable heartbeat!”',
        '“From Adobe Premiere Pro and After Effects to Illustrator and Figma!”',
        '“Also proficient in Front-End Web Development at 75%!”',
      ],
      options: [
        {
          text: 'What are Raymart’s core creative skills?',
          response: '“Pip spins his gear meter: Branding at 90%, Graphic Design at 87%, Video Editing at 85%, 2D Motion Graphics at 85%, Photography at 86%, and Front-End Web Development at 75%! Every visual is tuned for maximum emotional punch!”',
          topicId: 'skills',
        },
        {
          text: 'What software and tools does Raymart master?',
          response: '“Adobe Premiere Pro, After Effects, Illustrator, Photoshop, Lightroom, plus HTML5, CSS3, Tailwind CSS, and Google Analytics 4 (GA4) for tracking campaign ROI!”',
          topicId: 'tools',
        },
        {
          text: 'What makes Raymart’s video editing stand out?',
          response: '“Rhythm and human pacing! Having theater and broadcast production roots, Raymart doesn’t just cut footage—he shapes raw takes into gripping emotional narratives that keep viewers glued to the screen!”',
          topicId: 'video_craft',
        },
      ],
    },
  },
  {
    id: 'curator_celeste',
    name: 'Curator Celeste',
    role: 'Art Director & Gallery Curator',
    title: 'The Gallery Curator',
    accentColor: '#c084fc', // Purple
    position: [-14, 1.0, -14],
    rotation: 1.2,
    avatarIcon: '🎨',
    landmark: 'The Crystal Pavilion',
    portfolioTopic: 'Featured Projects: Narabi, Bianca, & Reels',
    summaryQuote: '“Raymart turns brand identity and human portraits into unforgettable art.”',
    dialogue: {
      id: 'celeste_intro',
      speaker: 'Curator Celeste',
      title: 'Master Curator',
      greeting: 'Bonjour! You have arrived at the Crystal Pavilion. Here we showcase Raymart Troy’s most celebrated creative works. Which masterpiece would you like me to unveil?',
      ambientChatter: [
        '“Have you seen the Narabi Coffee & Matcha branding on Behance? Pure elegance!”',
        '“The Bianca Series photography captures natural light and raw soul!”',
        '“Check out Raymart’s documentary film Titser Gennie on YouTube!”',
      ],
      options: [
        {
          text: 'Tell me about Narabi Coffee & Matcha branding.',
          response: 'Celeste adjusts her beret: “An exquisite Japanese-inspired brand identity! Raymart crafted the minimalist logo, earth-toned packaging, matcha tin decals, and social collaterals that gave Narabi a cohesive, warm voice.”',
          topicId: 'narabi',
          externalLink: {
            label: 'View Narabi on Behance',
            url: 'https://www.behance.net/gallery/248038237/Narabi-Coffee-Matcha',
          },
        },
        {
          text: 'What is The Bianca Series photography?',
          response: '“A stunning editorial portrait collection! Raymart worked with natural sunlight and expressive framing to produce raw, cinematic photographs that celebrate beauty and genuine mood.”',
          topicId: 'bianca',
          externalLink: {
            label: 'View Bianca Series on Behance',
            url: 'https://www.behance.net/gallery/249272427/The-Bianca-Series',
          },
        },
        {
          text: 'Show me Raymart’s documentary and video work.',
          response: '“Watch Titser Gennie on YouTube! A deeply moving documentary honoring teachers with custom kinetic typography and beat-synced editing. He also edited the high-energy Miss Universe Philippines 2024 experience!”',
          topicId: 'videos',
          externalLink: {
            label: 'Watch Titser Gennie on YouTube',
            url: 'https://youtu.be/lQTgq9zyDPc?si=m_XiY0bhUC5wTazd',
          },
        },
      ],
    },
  },
  {
    id: 'sage_zephyr',
    name: 'Sage Zephyr',
    role: 'Island Philosopher & Creative Mentor',
    title: 'The Mountain Sage',
    accentColor: '#34d399', // Emerald
    position: [0, 4.5, -20],
    rotation: 3.14,
    avatarIcon: '✨',
    landmark: 'The Stargazer Peak & Campfire',
    portfolioTopic: 'Brand Storytelling Philosophy & Client Praise',
    summaryQuote: '“Every brand has a story worth telling. Raymart brings that story to life.”',
    dialogue: {
      id: 'zephyr_intro',
      speaker: 'Sage Zephyr',
      title: 'Stargazer Sage',
      greeting: 'Sit beside the fire, traveler. Up here under the stars, we contemplate not just what visuals look like, but how they touch human hearts. What wisdom do you seek about Raymart’s ethos?',
      ambientChatter: [
        '“‘Creative, experienced, and attentive to our needs’ — Mae Ureta”',
        '“Angelo Kean praised Raymart for listening deeply and delivering polished visuals on every platform!”',
        '“Henry Santos said Raymart told their story better than they could have imagined!”',
      ],
      options: [
        {
          text: 'What is Raymart’s creative philosophy?',
          response: 'Zephyr smiles into the campfire: “Raymart firmly believes that every single brand has a story worth telling. Rather than chasing generic trends, he shapes visuals around your authentic message so the result is memorable, consistent, and personal.”',
          topicId: 'philosophy',
        },
        {
          text: 'What do clients say about working with Raymart?',
          response: '“Angelo Kean said Raymart genuinely listened to what they needed and delivered polished visuals across all platforms. Marie Loma, Mae Ureta, and Henry Santos all attest that Raymart treats each project with immense care, experience, and dedication!”',
          topicId: 'testimonials',
        },
        {
          text: 'What kind of projects is Raymart looking for?',
          response: '“Ambitious brands, commercial campaigns, video productions, creative direction, and digital initiatives that want their story told with unmistakable heart and craft!”',
          topicId: 'vision',
        },
      ],
    },
  },
  {
    id: 'puck_courier',
    name: 'Puck the Courier',
    role: 'Island Messenger & Good News Bearer',
    title: 'The Swift Courier',
    accentColor: '#f43f5e', // Rose
    position: [2, 0.6, 6],
    rotation: 0.8,
    avatarIcon: '📬',
    landmark: 'The Village Center Gazebo',
    portfolioTopic: 'Contact Raymart, Phone & Social Links',
    summaryQuote: '“Call 0955 188 3472 or email imraymarttroy@gmail.com — special delivery!”',
    dialogue: {
      id: 'puck_intro',
      speaker: 'Puck the Courier',
      title: 'Island Postman',
      greeting: 'Special delivery! *Pants happily* I’m Puck, carrier of the best news on the island! Are you here to book Raymart Troy for multimedia design, video production, or branding?',
      ambientChatter: [
        '“Email: imraymarttroy@gmail.com • Phone: +63 955 188 3472!”',
        '“Follow Raymart on Behance at behance.net/raymarttroy!”',
        '“Based in Manila, Philippines and available for worldwide remote collaborations!”',
      ],
      options: [
        {
          text: 'How can I contact Raymart Troy right away?',
          response: 'Puck bounces with joy: “Send an email directly to imraymarttroy@gmail.com, or dial 0955 188 3472 (+63 955 188 3472)! Raymart is based in Manila, Philippines and responds promptly!”',
          topicId: 'contact_info',
          externalLink: {
            label: 'Send Email to Raymart',
            url: 'mailto:imraymarttroy@gmail.com',
          },
        },
        {
          text: 'Where can I see Raymart’s social media and Behance?',
          response: '“Visit his Behance portfolio at behance.net/raymarttroy, his Instagram @imraymarttroy, and his Facebook page at facebook.com/imraymarttroy!”',
          topicId: 'socials',
          externalLink: {
            label: 'Open Raymart’s Behance',
            url: 'https://www.behance.net/raymarttroy',
          },
        },
        {
          text: 'Tell me about the 8 Golden Shells on this island!',
          response: '“They are the 8 Golden Shells of Manila! Each one holds a secret milestone from Raymart’s journey: from UMak theater to Globe Telecom and Narabi Coffee. Gather all 8 for the Master Artist Endorsement!”',
          topicId: 'shells_lore',
        },
      ],
    },
  },
];

export const ISLAND_SHELLS: ShellItem[] = [
  {
    id: 'shell_pier',
    name: 'Harbor Lighthouse Shell',
    hint: 'Resting on the weathered wooden planks of Captain Barnaby’s dock.',
    position: [-22, 0.45, 22],
    collected: false,
    lore: 'Milestone: Raymart graduated from University of Makati with a BA in Broadcast Production!',
  },
  {
    id: 'shell_windmill',
    name: 'Motion Cogwheel Nautilus',
    hint: 'Hidden behind the spinning blades of the Windmill workshop.',
    position: [22, 1.25, 14],
    collected: false,
    lore: 'Skill Unlocked: 2D Motion Graphics (85%) and Adobe Premiere & After Effects mastery!',
  },
  {
    id: 'shell_pavilion',
    name: 'Narabi Prismatic Shell',
    hint: 'Gleaming quietly beside the crystal pond near Curator Celeste.',
    position: [-18, 0.95, -16],
    collected: false,
    lore: 'Project Lore: Narabi Coffee & Matcha — Japanese-inspired branding and packaging design on Behance!',
  },
  {
    id: 'shell_peak',
    name: 'Stargazer Pearl of Manila',
    hint: 'Perched high on the grassy summit beside Sage Zephyr’s telescope.',
    position: [0, 4.85, -23],
    collected: false,
    lore: 'Ethos: “Every brand has a story worth telling. Raymart brings that story to life.”',
  },
  {
    id: 'shell_beach_east',
    name: 'Telecom Sunrise Amber',
    hint: 'Washed ashore on the eastern sandy beach near the drift logs.',
    position: [24, 0.15, -6],
    collected: false,
    lore: 'Career Chapter: Spearheaded digital marketing, social media, and GA4 analytics at Globe Telecom!',
  },
  {
    id: 'shell_beach_west',
    name: 'The Bianca Tidepool Shell',
    hint: 'Tucked between the western sea boulders near the quiet shore.',
    position: [-24, 0.15, 2],
    collected: false,
    lore: 'Art Lore: The Bianca Series editorial photography exploring emotion and natural sunlight!',
  },
  {
    id: 'shell_gazebo',
    name: 'Courier Conch of Likod',
    hint: 'Resting on the village center flowerbed by Puck’s courier cart.',
    position: [4, 0.65, 8],
    collected: false,
    lore: 'Direct Reach: imraymarttroy@gmail.com • 0955 188 3472 • Manila, Philippines!',
  },
  {
    id: 'shell_bridge',
    name: 'UMak CAST Star Shell',
    hint: 'Resting under the stone bridge that crosses the gentle mountain brook.',
    position: [-5, 0.35, 3],
    collected: false,
    lore: 'Origin: Collective Arts of Students and Thespians (CAST) — actor, editor, and publicity head!',
  },
];
