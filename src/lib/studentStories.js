// Curated "Student's Corner" stories supplied by Empire Skills Academy.
// These are hand-managed (not from Firestore) so they always render, even
// before any student submits a testimonial through the site.

export const STUDENT_STORIES = [
  {
    id: 'japhet-muwowo',
    type: 'quote',
    name: 'Japhet Muwowo',
    role: 'Retailing Department, Zambeef Products Plc',
    tagline: "Student's corner — Japhet Muwowo writes",
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
      'My name is Japhet Muwowo. I studied the courses below with Empire Skills Academy;\n\n' +
        '1. Human resource management\n' +
        '2. Occupational health and safety\n' +
        '3. Communication skills, and\n' +
        '4. Leadership Management.',
      'I am currently working for Zambeef Products Plc under Retailing department. Zambeef Products Plc operates in three countries, Zambia, Nigeria and Ghana respectively.',
      'Studying with Empire Skills Academy impacted me in so many ways as stated hereunder;\n\n' +
        "• how to deal with employee's disputes\n" +
        '• dealing with Risks and Hazardous materials at the work place\n' +
        '• how to manage people, and\n' +
        '• managing the flow of information technology from one level of the Organisation to the other.',
      "In conclusion, I would encourage school leavers, business owners, managers, directors, C.E.O's to be taking fresh courses as technology keeps moving on daily basis. Those looking forward to further their careers, Empire Skills Academy can handle your quest in a manner that will suit your financial muscle.",
      'Thumbs up to Empire Skills Academy.'
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
    intro: 'He has participated in 3 programs with us and had this to say. (He studied Procurement, Marketing and Sales with us)',
    excerpt:
      "I know what I want, need and where to get it at the right price and that I don't even give it a second thought. This course is A+ plus",
    paragraphs: [
      'I am driver by profession. I honestly found the course to be so helpful even in my own personal life.\n' +
        'I see organisation, institutions and companies striving for better quality products while they are managing cost and this requires some one who has knowledge, experience and training in professional environment.',
      'Although cost-saving, negotiation are one of the major part of procurement, at home quite alright no one taught me about quality negotiating or any other aspect of involved in buying goods.',
      "Ever since I started studying this course, I have applied the knowledge, skill and training that have been receiving even in my house I do look and compare cost and decide which supermarket will I go and get the best saving as well as the best quality I can afford. I know what I want, need and where to get it at the right price and that I don't even give it a second thought. This course is A+ plus"
    ]
  },
  {
    id: 'vernon-ngandu',
    type: 'recognition',
    name: "Vernon Ng'andu",
    role: 'Psychosocial Counselor',
    tagline: 'Student corner — student recognition',
    photo: '/students/vernon-ngandu.jpg',
    courses: ['Risk Management', 'Project Management', 'Monitoring & Evaluation'],
    excerpt:
      'Recognised for an inspiring ambition of self development as we celebrate our 4th Anniversary.',
    paragraphs: [
      "As we celebrate our 4th Anniversary we would like to take recognition of Mr Vernon Ng'andu for an inspiring ambition of self development",
      'He is Psychosocial Counselor who decided to enrich his CV and add up his credibility and took on more programs with us which include Risk Management, Project Management and Monitoring and Evaluation.',
      'As we celebrate 4 years of growing a community of partners like Vernon, we would like for you to get on board our Give aways to join our community.'
    ]
  },
  {
    id: 'joana-midda-lungu',
    type: 'recognition',
    name: 'Joana Midda Lungu',
    role: 'Freelance Research Assistant and Crop Farmer',
    tagline: 'Meet our students',
    photo: '/students/joana-midda-lungu.jpg',
    courses: ['Psychosocial Counseling', 'Community Development'],
    excerpt:
      'The courses have helped relations with people and her interactions with communities in her work.',
    paragraphs: [
      'Is a freelance Research Assistant and Crop Farmer. She studied PSYCHOSOCIAL COUNSELING and COMMUNITY DEVELOPMENT with us. She says the courses have helped relations with people and her interactions with communities in her work'
    ]
  },
  {
    id: 'luchembe-musonda',
    type: 'recognition',
    name: 'Luchembe Musonda',
    role: 'Field officer at Zambia Red Cross Society',
    tagline: 'Meet our student partners',
    photo: '/students/luchembe-musonda.jpg',
    photoFit: 'contain',
    courses: ['Risk Management', 'Project Management', 'Monitoring & Evaluation'],
    excerpt:
      'He is now able to provide effective leadership to his team and Partners.',
    paragraphs: [
      'Has studied RISK MANAGEMENT, PROJECT MANAGEMENT, AND MONITORING & EVALUATION.'
    ],
    outcomes: [
      'He has been challenged to set goals and objectives',
      'He is now able to provide effective leadership to his team and Partners',
      'He has learnt resource management and improved his working relationship with the work volunteers'
    ]
  }
];

// Short-form feedback from the language programmes, shown as gold speech
// bubbles that mirror the academy's own "Feedback" social cards.
export const LESSON_FEEDBACK = [
  {
    id: 'ainebyoona-fischer',
    name: 'Ainebyoona Fischer',
    country: 'Uganda',
    hashtag: '#IELTS Lessons: UKVI',
    graphic: '/feedback/ainebyoona-fischer.jpg',
    rating: 5,
    quote:
      'The tutor was very understanding, patient and clear. His lectures not only prepared me for the IELTS exam but also helped me to improve on my everyday language. I managed to score an overall score of band 6.5, which is beyond the required target.'
  },
  {
    id: 'sandro-italy',
    name: 'Sandro',
    country: 'Italy',
    hashtag: '#EnglishWithMichael',
    graphic: '/feedback/sandro.jpg',
    rating: 5,
    quote:
      'I highly recommend Michael as an English tutor. He is incredibly professional, punctual, and has a deep understanding of the language. He tailored every lesson to my specific professional goals, and thanks to his guidance my business English has improved tremendously. A top-tier educator!'
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
