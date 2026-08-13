// Curated "Student's Corner" stories supplied by Empire Skills Academy.
// These are hand-managed (not from Firestore) so they always render, even
// before any student submits a testimonial through the site.

export const STUDENT_STORIES = [
  {
    id: 'japhet-muwowo',
    type: 'quote',
    name: 'Japhet Muwowo',
    role: 'Retailing Department, Zambeef Products Plc',
    photo: '/students/japhet-muwowo.jpg',
    courses: [
      'Human Resource Management',
      'Occupational Health & Safety',
      'Communication Skills',
      'Leadership Management'
    ],
    excerpt:
      'Empire Skills Academy can handle your quest in a manner that will suit your financial muscle. Thumbs up to Empire Skills Academy.',
    paragraphs: [
      'My name is Japhet Muwowo. I studied Human Resource Management, Occupational Health and Safety, Communication Skills, and Leadership Management with Empire Skills Academy. I am currently working for Zambeef Products Plc under the Retailing department — Zambeef operates in three countries: Zambia, Nigeria and Ghana.',
      'Studying with Empire Skills Academy impacted me in so many ways: how to deal with employees’ disputes, dealing with risks and hazardous materials at the work place, how to manage people, and managing the flow of information technology from one level of the organisation to the other.',
      'In conclusion, I would encourage school leavers, business owners, managers, directors and CEOs to keep taking fresh courses, as technology keeps moving on daily. For those looking to further their careers, Empire Skills Academy can handle your quest in a manner that will suit your financial muscle. Thumbs up to Empire Skills Academy.'
    ]
  },
  {
    id: 'amos-chasala',
    type: 'quote',
    name: 'Amos Chasala',
    role: 'Driver by profession',
    tagline: 'A driver driving personal development',
    photo: '/students/amos-chasala.jpg',
    courses: ['Procurement', 'Marketing', 'Sales'],
    excerpt:
      'I know what I want, what I need, and where to get it at the right price — and I don’t even give it a second thought. This course is an A+.',
    paragraphs: [
      'I am a driver by profession. I honestly found the course to be so helpful, even in my own personal life. I see organisations, institutions and companies striving for better quality products while managing cost, and this requires someone who has knowledge, experience and training in a professional environment.',
      'Although cost-saving and negotiation are major parts of procurement, at home no one taught me about quality, negotiating, or any other aspect involved in buying goods.',
      'Ever since I started studying this course, I have applied the knowledge, skill and training I have been receiving — even in my own house. I look at and compare cost, and decide which supermarket I will go to for the best saving as well as the best quality I can afford. I know what I want, what I need, and where to get it at the right price, and I don’t even give it a second thought. This course is an A+.'
    ]
  },
  {
    id: 'vernon-ngandu',
    type: 'recognition',
    name: "Vernon Ng'andu",
    role: 'Psychosocial Counsellor',
    tagline: 'Student recognition — 4th Anniversary',
    photo: '/students/vernon-ngandu.jpg',
    courses: ['Risk Management', 'Project Management', 'Monitoring & Evaluation'],
    excerpt:
      'Recognised for an inspiring ambition of self-development as we celebrate our 4th anniversary.',
    paragraphs: [
      "As we celebrate our 4th anniversary, we would like to recognise Mr Vernon Ng'andu for an inspiring ambition of self-development.",
      'He is a Psychosocial Counsellor who decided to enrich his CV and add to his credibility, taking on more programmes with us — Risk Management, Project Management, and Monitoring and Evaluation.'
    ]
  },
  {
    id: 'luchembe-musonda',
    type: 'recognition',
    name: 'Luchembe Musonda',
    role: 'Field Officer, Zambia Red Cross Society',
    tagline: 'Meet our student partners',
    photo: '/students/luchembe-musonda.jpg',
    photoFit: 'contain',
    courses: ['Risk Management', 'Project Management', 'Monitoring & Evaluation'],
    excerpt:
      'Now able to provide effective leadership to his team and partners, with stronger resource management.',
    outcomes: [
      'He has been challenged to set goals and objectives',
      'He is now able to provide effective leadership to his team and partners',
      'He has learnt resource management and improved his working relationship with work volunteers'
    ]
  }
];

const CLOUD = 'https://res.cloudinary.com/dhx7e5lt7/video/upload';

export const VIDEO_STORIES = [
  {
    id: 'student-feedback',
    title: 'A word from one of our students',
    blurb: 'Unscripted feedback from a learner who trained with Empire Skills Academy.',
    src: `${CLOUD}/testimonials/es6esn6ksftkcyxatgbv.mp4`,
    poster: `${CLOUD}/so_1/testimonials/es6esn6ksftkcyxatgbv.jpg`
  },
  {
    id: 'ielts-feedback',
    title: 'Feedback on the English lessons',
    blurb: 'A learner shares how the IELTS preparation lessons went.',
    src: `${CLOUD}/testimonials/m5arzzb8pazdxdqmuhup.mp4`,
    poster: `${CLOUD}/so_1/testimonials/m5arzzb8pazdxdqmuhup.jpg`
  }
];
