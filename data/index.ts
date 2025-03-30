export const navbarData = {
  homeTitle: "Shankho's Blog",
}

export const footerData = {
  author: 'Siddhartha Basu',
  aboutAuthor:
    'Hi! I am Shankho, (aka. Siddhartha or Sid or by hack name Shankho) a Tech enthusiast, problem solver and software engineer. Currently employed at Natwest Group Bank, Gurugram, India.',
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
  aboutMe: 'Google Auth ToDo',
}

export const aboutPage = {
  title: 'Shankho',
  description: 'Software Engineer, Problem Solver, Web Enthusiast.',
  aboutMe:
    "Hello, fellow human! I'm a software wizard who spends most of his day leading Test Automation for Coutts Bank. When I'm not running after Test Automation numbers from my team :), you can find me working on complex coding challenges and spending time with my family - 2 angel daughters (Riya and Tiya). Just don't ask me to cast any love spells, my magic only works on automation code I write!",
}

export const seoData = {
  title: `Sid's Blog | Shankho Blog`,
  ogTitle: `Let's learn the aspects of Life through - Sid's Blog | Shankho's Blog`,
  description: `Hi I am Shankho. A Test Automation Senior Vice President at Natwest Group, with over a decade of experience in software development. - Sid's Blog | Shankho's Blog`,
  twitterDescription: `Sid's Blog, where I play around content, resources, etc - Sid's Blog | Shankho's Blog`,
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
}

export const siteMetaData = [
  {
    name: 'description',
    content: seoData.description,
  },
  // Test on: https://developers.facebook.com/tools/debug/ or https://socialsharepreview.com/
  { property: 'og:site_name', content: seoData.mySite },
  { property: 'og:type', content: 'website' },
  {
    property: 'og:url',
    content: seoData.mySite,
  },
  {
    property: 'og:title',
    content: seoData.ogTitle,
  },
  {
    property: 'og:description',
    content: seoData.description,
  },
  {
    property: 'og:image',
    content: seoData.image,
  },
  // Test on: https://cards-dev.twitter.com/validator or https://socialsharepreview.com/
  { name: 'twitter:site', content: seoData.twitterHandle },
  { name: 'twitter:card', content: 'summary_large_image' },
  {
    name: 'twitter:url',
    content: seoData.mySite,
  },
  {
    name: 'twitter:title',
    content: seoData.ogTitle,
  },
  {
    name: 'twitter:description',
    content: seoData.twitterDescription,
  },
  {
    name: 'twitter:image',
    content: seoData.image,
  },
]
