// Creates the first admin account and a sample published course + live session.
// Safe to re-run: skips anything that already exists.
try { process.loadEnvFile(); } catch { /* no .env file — use defaults */ }

const { db, uid, now, insert } = await import('./src/db.js');
const { hashPassword, issueStudentId } = await import('./src/auth.js');

const adminEmail = process.env.ADMIN_EMAIL || 'admin@empireskills.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const adminName = process.env.ADMIN_NAME || 'Site Admin';

if (!db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)) {
  insert('users', {
    id: uid(), email: adminEmail, passwordHash: hashPassword(adminPassword),
    fullName: adminName, phone: '', studentId: issueStudentId(),
    role: 'admin', subscribedToUpdates: false, createdAt: now()
  });
  console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
} else {
  console.log(`Admin already exists: ${adminEmail}`);
}

if (!db.prepare('SELECT id FROM courses LIMIT 1').get()) {
  const courseId = insert('courses', {
    id: uid(),
    title: 'Business English Essentials',
    shortDescription: 'Master professional English for meetings, emails and presentations.',
    description: 'A practical course covering workplace vocabulary, email writing, meeting participation and presentation skills.',
    category: 'Business English',
    mode: 'self_paced',
    priceCents: 4900,
    currency: 'USD',
    durationHours: 8,
    instructorName: 'Michael',
    coverImageUrl: '',
    learningOutcomes: ['Write clear professional emails', 'Lead and participate in meetings', 'Deliver confident presentations'],
    isPublished: true,
    createdAt: now(),
    updatedAt: now()
  });
  insert('lessons', {
    id: uid(), courseId, title: 'Welcome & course overview',
    videoUrl: '', videoIsUpload: false, durationMinutes: 10, orderIndex: 0, resources: [], createdAt: now()
  });
  insert('lessons', {
    id: uid(), courseId, title: 'Professional email writing',
    videoUrl: '', videoIsUpload: false, durationMinutes: 25, orderIndex: 1, resources: [], createdAt: now()
  });
  console.log('Sample course created with 2 lessons');
}

if (!db.prepare('SELECT id FROM liveSessions LIMIT 1').get()) {
  const start = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 3600 * 1000);
  insert('liveSessions', {
    id: uid(), type: 'group', topic: 'Conversation practice: job interviews',
    category: 'Business English', startTime: start.toISOString(), endTime: end.toISOString(),
    capacity: 10, bookedCount: 0, priceCents: 0, currency: 'USD',
    meetingUrl: '', status: 'open', createdAt: now()
  });
  console.log('Sample live session created');
}

console.log('Seed complete.');
