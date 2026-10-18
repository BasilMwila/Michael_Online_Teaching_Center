// The three specialist services each get a page of their own: the designed
// banner, the full "about" detail the owner wrote for it, and the courses filed
// under that category. The copy lives here rather than inside the page
// component so it can be edited without touching layout.

export const SERVICES = [
  {
    slug: 'ielts-pte',
    category: 'IELTS/PTE',
    navLabel: 'IELTS/PTE',
    title: 'IELTS & PTE Exam Preparation',
    banner: '/IELT_PAT.jpeg',
    bannerAlt: 'Empire Skills Academy IELTS and PTE exam preparation online classes',
    lead: 'The IELTS exam is designed to assess your English language skills in real-life academic and professional contexts. It evaluates four key areas — Listening, Reading, Writing and Speaking — and gives a band score from 0 to 9 to reflect your level of proficiency.',
    stats: [
      { value: '0–9', label: 'IELTS band scale' },
      { value: '4', label: 'Skills assessed' },
      { value: '100+', label: 'Students prepared' },
      { value: '4,000+', label: 'Institutions accept PTE' }
    ],
    sections: [
      {
        heading: 'How IELTS works',
        paragraphs: [
          'In this guide we explain the test format, the scoring system, the types of IELTS (Academic and General Training) and what to expect on exam day — so you understand exactly how IELTS works and how to prepare effectively.',
          'IELTS assesses how you use English in real-life situations, whether you are studying, working or living abroad. It is trusted by organisations worldwide to measure your English skills.'
        ]
      },
      {
        heading: 'Which test do you need?',
        paragraphs: ['The test you need to take depends on your future plans.'],
        layout: 'bullets',
        items: [
          { text: 'You intend to study in English, at home or abroad, to further your academic studies at an English-speaking university.' },
          { text: 'You wish to build your career overseas and start work in an English-speaking country.' },
          { text: 'You need to secure a visa to migrate to the UK.' }
        ]
      },
      {
        heading: 'The four skills',
        paragraphs: ['Both IELTS and PTE assess the same four primary communicative skills.'],
        layout: 'grid',
        items: [
          { title: 'Listening', text: 'Following conversations, lectures and announcements at natural speed.' },
          { title: 'Reading', text: 'Understanding academic and everyday texts, and finding detail quickly.' },
          { title: 'Writing', text: 'Structuring a clear argument, report or letter within the time allowed.' },
          { title: 'Speaking', text: 'Responding fluently and accurately under exam conditions.' }
        ]
      },
      {
        heading: 'The Pearson Test of English (PTE)',
        paragraphs: [
          'The PTE is a two-hour, computer-based English proficiency test used for global study, work and migration — particularly for visas in Australia, New Zealand and the UK.',
          'It provides secure English language testing for study applications worldwide, and for visa applications for work and migration in Australia, the UK, New Zealand and Canada. PTE Academic is accepted by more than 4,000 institutions worldwide, including Oxford University, Harvard Business School and Yale.'
        ],
        layout: 'cards',
        items: [
          { title: 'PTE Academic', text: 'For university admission and immigration.' },
          { title: 'PTE Academic UKVI', text: 'Specifically for UK visas for work or study below degree level.' },
          { title: 'PTE Core', text: 'For Canadian work and migration.' },
          { title: 'PTE Home', text: 'For UK visa language requirements. A simpler test covering only speaking and listening, used for specific UK family and settlement visas.' }
        ],
        note: 'The right PTE exam for you depends on the intention or goals of your move abroad.'
      },
      {
        heading: 'Proven results, worldwide',
        paragraphs: [
          'We have had success with over 100 students from across the world — from African countries such as Ghana, Kenya and Zambia, to European countries such as Poland, Germany and Turkey, to Argentina, Chile and Brazil in South America.',
          'We not only have certified and qualified tutors, but great experience and numerous success stories.'
        ]
      }
    ],
    cta: {
      heading: 'Ready to sit your exam with confidence?',
      text: 'Tell us the score you need and the deadline you are working to, and we will put you in the right preparation class.'
    }
  },

  {
    slug: 'cv-clinic',
    category: 'CV Clinic',
    navLabel: 'CV Clinic',
    title: 'CV Clinic',
    banner: '/CV.jpeg',
    bannerAlt: 'Empire Skills Academy professional CV services that get you noticed',
    lead: 'We are here for professionals who want to position themselves for career success through powerful CVs, compelling LinkedIn profiles and strategic job-search support.',
    stats: [
      { value: 'Thousands', label: 'Professionals supported' },
      { value: 'C-suite', label: 'To entry level' },
      { value: 'ATS', label: 'Aware writing' },
      { value: '8', label: 'Professional services' }
    ],
    sections: [
      {
        heading: 'Who we work with',
        paragraphs: [
          'With expert CV and LinkedIn writers, we have supported thousands of professionals — from C-suite executives and experienced managers to fresh graduates and entry-level job seekers — in presenting their skills, experience and achievements with confidence across diverse industries.',
          'With extensive experience in CV writing, career branding and consultancy, we understand what makes a professional profile stand out in today’s competitive job market. Our approach combines strategic storytelling, achievement-focused writing and Applicant Tracking System (ATS) awareness to help candidates communicate their value and make stronger first impressions.'
        ]
      },
      {
        heading: 'Our professional services',
        layout: 'cards',
        items: [
          { icon: 'id-badge', title: 'Professional CV & Resume Writing', text: 'Tailored, achievement-focused CVs designed to showcase your strengths.' },
          { icon: 'mail', title: 'Cover Letter Writing', text: 'Persuasive, role-specific cover letters that communicate your suitability.' },
          { icon: 'devices', title: 'LinkedIn Profile Writing & Optimisation', text: 'Build a professional presence that attracts recruiters and career opportunities.' },
          { icon: 'book-open', title: 'Executive & Professional Bio Writing', text: 'Communicate your expertise, credibility and personal brand.' },
          { icon: 'chat', title: 'Interview Coaching', text: 'Prepare to communicate your experience confidently and effectively.' },
          { icon: 'send', title: 'Job Search Coaching', text: 'Develop practical strategies for identifying and pursuing relevant opportunities.' },
          { icon: 'chart-bar', title: 'ATS & Online Application Strategies', text: 'Improve your understanding of recruitment systems and application requirements.' },
          { icon: 'users', title: 'Recruitment Services', text: 'Support employers and professionals in connecting talent with opportunities.' }
        ]
      },
      {
        heading: 'Industries we cover',
        paragraphs: [
          'From IT, healthcare, finance and marketing to administration, engineering, management and other sectors, we work with professionals at different career stages.'
        ],
        note: 'While no CV or LinkedIn profile can guarantee a job offer, a well-positioned professional brand can help you communicate your value more effectively and improve your readiness for career opportunities.'
      }
    ],
    cta: {
      heading: 'Ready to elevate your career?',
      text: 'Your CV is more than a document. Your LinkedIn profile is more than a page. Together they are powerful tools for communicating your professional value. Don’t let a weak presentation hold you back — take the next step towards a stronger professional image.'
    }
  },

  {
    slug: 'teach-online',
    category: 'Learn How To Teach Online',
    navLabel: 'Teach Online',
    title: 'Learn How To Teach Online',
    banner: '/English.jpeg',
    bannerAlt: 'Empire Skills Academy teaching online for passive income course package',
    lead: 'With the significance of English as an international language, the online teaching trend is on the rise. There are some challenges to working from home — but teaching English online is beyond worth it.',
    stats: [
      { value: '7+', label: 'Years teaching online' },
      { value: 'Any degree', label: 'Accepted in most cases' },
      { value: 'Your hours', label: 'You set the schedule' },
      { value: 'Worldwide', label: 'Where the demand is' }
    ],
    sections: [
      {
        heading: 'You don’t have to be a qualified teacher',
        paragraphs: [
          'You might be wondering: I am not a qualified teacher, so how can I teach English online? You will be happy to know that there are opportunities for qualified teachers and non-qualified teachers alike. Any kind of university education will do in most cases — and we show you how to separate the different qualifications required for different opportunities.'
        ]
      },
      {
        heading: 'The best part? Flexibility.',
        paragraphs: [
          'You get to choose your working schedule, and you are your own boss. You have full control over the money you make by teaching online. So are you ready to learn how to become an online English teacher? We have compiled a complete guide to help you decide if teaching English online is the right career path for you.'
        ]
      },
      {
        heading: 'Find your niche',
        paragraphs: [
          'Teaching English online is a great career path: you don’t need to meet the requirements of a regular desk job, and you work from the comfort of your home. To get the most from this industry you will need to own a niche or focus on a specific area. Here is what to ask when selecting yours.'
        ],
        layout: 'bullets',
        items: [
          { text: 'What is your teaching style?' },
          { text: 'What age group do you enjoy working with?' },
          { text: 'What are you passionate about, and what do you love about online tutoring?' },
          { text: 'Is there a specific gap in the market that you can fill?' }
        ]
      },
      {
        heading: 'Get accredited',
        paragraphs: [
          'An accredited certification will help you equip yourself with the right skills and qualifications. This secures your authority in the industry among your target audience, as qualifications and certifications are what most students and parents look for initially. We discuss trusted platforms to acquire these certificates, and the right certificate for the type of teaching opportunities you are looking for — you may have to spend just a little.'
        ]
      },
      {
        heading: 'The market',
        paragraphs: [
          'The market for online English teachers is good, and with the right qualifications, experience and certification you can make a good career teaching English online. Finding the right platform — one that gives you the right job opportunities to teach and earn online — is important.',
          'From over seven years of experience teaching online, we can say there are a lot of opportunities to teach English as a career or an extra source of income, because English is learned as a mandatory communications language and is in demand across the world, especially in non-English-speaking countries.'
        ]
      }
    ],
    cta: {
      heading: 'We compiled this course just for you',
      text: 'Get on board and learn how you can make a career out of teaching online.'
    }
  }
];

/** Look a service up by its URL slug. */
export const serviceBySlug = (slug) => SERVICES.find((s) => s.slug === slug);
