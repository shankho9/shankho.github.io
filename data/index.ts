export const navbarData = {
  homeTitle: 'Nomadic Notions',
}

export const footerData = {
  author: 'Siddhartha Basu',
  aboutAuthor:
    'Hi! I am Shankho - Siddhartha Basu, a Tech enthusiast, problem solver and software engineer. Currently employed at Natwest Group Bank, Gurugram, India.',
  authorInterest:
    'I enjoy company of those who are willing to walk the extra mile. Test Automation Engineer by profession and a philanthropic by heart - `All things bright and beautiful, all creatures great and small`',
  aboutTheSite:
    "This is a personal blog site built with Nuxt3, TailwindCSS, NuxtContent, Nuxt Icon. Currently it's deployed in Vercel.",
}

export const homePage = {
  title: 'Welcome To My Blog Site - Nomadic Notions!!',
  description: `
    Nomadic Notions is a space where leadership, strategy, and personal growth converge—
    much like a seasoned traveler navigating the ever-changing corporate landscape. 

    Just as a nomad moves with purpose yet adapts to the unknown, great leaders must balance
    vision with agility. The mind journeys through challenges, decisions, and reflections,
    shaping perspectives that drive transformation. 

    Some insights leave lasting footprints, while others evolve with experience, reshaping
    the path ahead. This blog is a collection of leadership wisdom—stories of resilience,
    strategic thinking, and the quiet moments between action and reflection. 

    Each post is a stop along the way, an invitation to pause, learn, and lead with clarity and purpose.
  `,
}

export const blogsPage = {
  title: 'All Blogs',
  description: 'Here you will find all the blog posts I have written & published on this site.',
}

export const categoryPage = {
  title: 'Categories',
  description: 'Categories generated from all the tags are mentioned in the different blog post',
}

export const pesonalSpace = {
  title: 'My LifeLines',
  description:
    'This is my space. Welcome to my organized chaos — family, adventures, and thoughts that sounded better in my head.',
}

export const resourcesPage = {
  title: 'Resources Library',
  description:
    'A curated collection of books, tools, learning resources, images, videos, and content that have helped me grow as a developer and leader.',
  books: [
    {
      title: 'The Pragmatic Programmer',
      author: 'Andrew Hunt & David Thomas',
      description: 'A timeless guide to becoming a better programmer.',
      link: 'https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052',
      category: 'Programming',
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      description: 'A handbook of agile software craftsmanship.',
      link: 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
      category: 'Programming',
    },
    {
      title: 'The Lean Startup',
      author: 'Eric Ries',
      description:
        "How today's entrepreneurs use continuous innovation to create radically successful businesses.",
      link: 'https://www.amazon.com/Lean-Startup-Entrepreneurs-Continuous-Innovation/dp/0307887898',
      category: 'Business',
    },
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      description: 'An easy & proven way to build good habits & break bad ones.',
      link: 'https://www.amazon.com/Atomic-Habits-Proven-Build-Break/dp/0735211299',
      category: 'Productivity',
    },
  ],
  tools: [
    {
      name: 'VS Code',
      description: 'My primary code editor with amazing extensions.',
      link: 'https://code.visualstudio.com/',
      category: 'Development',
      icon: 'mdi:code-tags',
    },
    {
      name: 'Git',
      description: 'Version control system - essential for every developer.',
      link: 'https://git-scm.com/',
      category: 'Development',
      icon: 'mdi:git',
    },
    {
      name: 'Postman',
      description: 'API testing and development made easy.',
      link: 'https://www.postman.com/',
      category: 'Development',
      icon: 'mdi:api',
    },
    {
      name: 'Docker',
      description: 'Containerization platform for consistent deployments.',
      link: 'https://www.docker.com/',
      category: 'DevOps',
      icon: 'mdi:docker',
    },
    {
      name: 'Notion',
      description: 'All-in-one workspace for notes, docs, and project management.',
      link: 'https://www.notion.so/',
      category: 'Productivity',
      icon: 'mdi:notebook',
    },
    {
      name: 'Figma',
      description: 'Design and prototyping tool for UI/UX work.',
      link: 'https://www.figma.com/',
      category: 'Design',
      icon: 'mdi:palette',
    },
  ],
  learningResources: [
    {
      title: 'MDN Web Docs',
      description: 'The best resource for web development documentation.',
      link: 'https://developer.mozilla.org/',
      category: 'Web Development',
      icon: 'mdi:web',
    },
    {
      title: 'freeCodeCamp',
      description: 'Free coding bootcamp with comprehensive courses.',
      link: 'https://www.freecodecamp.org/',
      category: 'Learning Platform',
      icon: 'mdi:school',
    },
    {
      title: 'Stack Overflow',
      description: 'Q&A platform for developers - where I find solutions daily.',
      link: 'https://stackoverflow.com/',
      category: 'Community',
      icon: 'mdi:stack-overflow',
    },
    {
      title: 'YouTube - Traversy Media',
      description: 'Excellent web development tutorials and courses.',
      link: 'https://www.youtube.com/c/TraversyMedia',
      category: 'Video Tutorials',
      icon: 'mdi:youtube',
    },
    {
      title: 'Dev.to',
      description: 'Community of developers sharing knowledge and experiences.',
      link: 'https://dev.to/',
      category: 'Community',
      icon: 'mdi:dev-to',
    },
    {
      title: 'Nuxt.js Documentation',
      description: 'Official documentation for the Nuxt framework.',
      link: 'https://nuxt.com/',
      category: 'Framework',
      icon: 'mdi:nuxt',
    },
  ],
  templates: [
    {
      title: 'Project README Template',
      description: 'A comprehensive README template for GitHub projects.',
      link: '#',
      category: 'Documentation',
      icon: 'mdi:file-document',
      download: false,
    },
    {
      title: 'API Testing Checklist',
      description: 'A checklist for thorough API testing.',
      link: '#',
      category: 'Testing',
      icon: 'mdi:check-circle',
      download: false,
    },
    {
      title: 'Code Review Guidelines',
      description: 'Best practices for conducting code reviews.',
      link: '#',
      category: 'Development',
      icon: 'mdi:code-review',
      download: false,
    },
  ],
  // Image Gallery Section - Images from ImageKit
  images: [
    {
      title: 'Family Moments',
      description: 'Cherished memories with loved ones',
      imageUrl:
        'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
      category: 'Family',
      date: '2024-01-15',
      link: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
    },
    {
      title: 'Tiya Solo',
      description: 'Love your smile - Tiya',
      imageUrl: 'https://photos.app.goo.gl/cRmLEnzGetL3qrXp6',
      category: 'Family',
      date: '2024-02-20',
      link: 'https://photos.app.goo.gl/cRmLEnzGetL3qrXp6',
    },
    {
      title: 'Work Memories',
      description: 'Team moments and achievements',
      imageUrl:
        'https://ik.imagekit.io/u6cq4dqll/Personal/about/MacquarieDays.jpg?updatedAt=1745977729581',
      category: 'Work',
      date: '2024-03-10',
      link: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/MacquarieDays.jpg?updatedAt=1745977729581',
    },
    // Add more images here from your ImageKit dashboard
    // Format: https://ik.imagekit.io/u6cq4dqll/YourFolder/YourImage.jpg?updatedAt=timestamp
  ],
  // Video Resources Section
  videos: [
    {
      title: 'Travel Documentary',
      description: 'A journey through beautiful landscapes',
      thumbnail:
        'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_BetDwarka_Solo_w_Terrano.jpg?updatedAt=1745979649461',
      videoUrl: 'https://www.youtube.com/watch?v=example', // YouTube, Vimeo, or direct video URL
      category: 'Travel',
      date: '2024-01-20',
      duration: '5:32',
      platform: 'youtube', // 'youtube', 'vimeo', 'direct', or 'imagekit'
    },
    {
      title: 'Family Moments',
      description: 'Captured memories with loved ones',
      thumbnail:
        'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
      videoUrl: 'https://www.youtube.com/watch?v=example',
      category: 'Family',
      date: '2024-02-15',
      duration: '3:45',
      platform: 'youtube',
    },
    // Add more videos here
    // For ImageKit videos, use: https://ik.imagekit.io/u6cq4dqll/YourFolder/YourVideo.mp4
    // For YouTube, use: https://www.youtube.com/watch?v=VIDEO_ID
    // For Vimeo, use: https://vimeo.com/VIDEO_ID
  ],
  // Content/Articles Section
  content: [
    {
      title: 'Getting Started with Nuxt 3',
      description: 'A comprehensive guide to building modern web applications with Nuxt 3.',
      link: '/blogs',
      category: 'Tutorial',
      icon: 'mdi:book-open-page-variant',
      date: '2024-01-10',
    },
    {
      title: 'Best Practices for Test Automation',
      description:
        'Learn the essential practices for effective test automation in modern development.',
      link: '/blogs',
      category: 'Development',
      icon: 'mdi:code-braces',
      date: '2024-02-05',
    },
    {
      title: 'Leadership in Tech',
      description: 'Insights on leading technical teams and driving innovation.',
      link: '/blogs',
      category: 'Leadership',
      icon: 'mdi:account-group',
      date: '2024-03-15',
    },
    // Add more content items here
  ],
}

export const aboutPage = {
  title: 'Siddhartha Basu',
  description: 'Software Engineer, Problem Solver, Web Enthusiast.',
  aboutMe:
    "Hello, fellow human! I'm a software wizard who spends most of his day leading Test Automation for Coutts Bank. When I'm not running after Test Automation numbers from my team :), you can find me working on complex coding challenges and spending time with my family - My wife Papiya, 2 angel daughters (Riya and Tiya). Just don't ask me to cast any love spells, my magic only works on automation code I write!",
}

export const seoData = {
  title: `Sid's Blog | Nomadic Notions - Siddhartha Basu`,
  ogTitle: `Let's learn the aspects of Life through - Sid's Blog | Nomadic Notions`,
  description: `Hi I am Siddhartha Basu. A Test Automation Senior Vice President at Natwest Group, with over a decade of experience in software development. - Sid's Blog | Nomadic Notions`,
  twitterDescription: `Sid's Blog, where I play around content, resources, etc - Sid's Blog | Nomadic Notions`,
  image:
    'https://res.cloudinary.com/dmecmyphj/image/upload/v1673548905/nuxt-blog/cover_ntgs6u.webp',
  mySite: 'https://shankho-blogsite.vercel.app/',
  twitterHandle: '@shankho99',
  mailAddress: 'siddhartha.basu@outlook.com',
}

export const socialLinks = {
  github: 'https://github.com/shankho9',
  linkedin: 'https://www.linkedin.com/in/siddharthabasu/',
  twitter: 'https://twitter.com/shankho99',
  stackoverflow: 'https://stackoverflow.com/users/8872168/siddhartha-basu',
  spotify: 'https://open.spotify.com/user/w7b38i9wif2jjq3hfx3ay30zj?si=6ac5c35594ec4d6f',
  bluesky: 'https://bsky.app/profile/shankho.bsky.social',
  discord: 'https://discord.com/users/basid09',
}

// Use a function to ensure seoData is available and provide fallbacks
export const siteMetaData = (() => {
  const mySite = seoData?.mySite || 'https://shankho-blogsite.vercel.app'
  const description = seoData?.description || "Sid's personal blog site"
  const ogTitle = seoData?.ogTitle || "Sid's Blog | Nomadic Notions"
  const image = seoData?.image || '/not-found.jpg'
  const twitterHandle = seoData?.twitterHandle || '@shankho99'
  const twitterDescription = seoData?.twitterDescription || description

  return [
    {
      name: 'description',
      content: description,
    },
    // Test on: https://developers.facebook.com/tools/debug/ or https://socialsharepreview.com/
    { property: 'og:site_name', content: mySite },
    { property: 'og:type', content: 'website' },
    {
      property: 'og:url',
      content: mySite,
    },
    {
      property: 'og:title',
      content: ogTitle,
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: image,
    },
    // Test on: https://cards-dev.twitter.com/validator or https://socialsharepreview.com/
    { name: 'twitter:site', content: twitterHandle },
    { name: 'twitter:card', content: 'summary_large_image' },
    {
      name: 'twitter:url',
      content: mySite,
    },
    {
      name: 'twitter:title',
      content: ogTitle,
    },
    {
      name: 'twitter:description',
      content: twitterDescription,
    },
    {
      name: 'twitter:image',
      content: image,
    },
  ]
})()
