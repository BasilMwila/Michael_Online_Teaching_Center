# Empire Skills Training Center

A full-featured online training site built with **React (Vite) + Tailwind + Firebase** — runs entirely on the Firebase free (Spark) plan.

## Features

- 🎓 **Public catalog** — Home, Courses listing with filters, course detail pages, Testimonials, About, Contact
- 🆔 **Unique student IDs** — sequential `EST-YYYY-NNNNN` issued at signup via a Firestore transaction
- 💳 **Manual bank-transfer payments** — students upload proof, admin approves, enrollment activates
- 📺 **Self-paced video lessons** — YouTube / Vimeo embeds, lesson-by-lesson progress tracking
- 📝 **Quizzes** — per-lesson quizzes with auto-scoring, retake allowed, pass threshold gates progress
- 🎥 **Live session booking** — admin publishes available slots (1-on-1 or group), students book; capacity & status auto-managed
- 💬 **WhatsApp group tracking** — admin records who's been added to which group after payment
- ⭐ **Testimonials** — students submit written + video testimonials; admin moderates
- 🤖 **Built-in chatbot** — rule-based FAQ matcher, floating widget on every page (no API costs)
- 👤 **Admin console** — courses CRUD with lesson + quiz editor, payment approvals, live sessions, users, testimonial moderation, WhatsApp groups, overview KPIs
- 📱 **Fully responsive** — works on phone, tablet, PC
- 📧 **Newsletter signup** — collects subscribers in Firestore for future broadcasts

## Stack

- **React 18** + **Vite** + **React Router v6**
- **Tailwind CSS** (emerald-green brand palette)
- **Firebase Auth** (email/password) · **Firestore** (data) · **Firebase Hosting** (deploy)
- **Cloudinary free tier** (payment proofs, testimonial videos) — no credit card required
- `react-hot-toast` for notifications
- No backend server — all logic is client-side, secured by Firestore security rules

## Project setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

1. Go to <https://console.firebase.google.com> and create a new project
2. Stay on the free **Spark** plan
3. In the project, enable:
   - **Authentication** → Email/Password sign-in method
   - **Firestore Database** → start in production mode
4. Project settings → General → Your apps → Add web app → copy the config keys

> File uploads (payment proofs, testimonial videos) go to **Cloudinary**, not Firebase Storage, so you don't need to enable Storage or upgrade to Blaze.

### 3. Set up Cloudinary (free, no card)

1. Sign up at <https://cloudinary.com>
2. **Cloud name**: shown on the dashboard right after sign-in
3. **Upload preset**:
   - Settings (gear icon) → **Upload** tab → scroll to **Upload presets** → **Add upload preset**
   - Set **Signing Mode** to **Unsigned**
   - Save and copy the preset name

### 4. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:
- Firebase web-app config values (6 fields)
- Cloudinary cloud name + upload preset
- Your bank details + support contact

### 5. Deploy the security rules and indexes

Install the Firebase CLI if you don't have it:

```bash
npm install -g firebase-tools
firebase login
```

Update `.firebaserc` with your actual project ID (replace `empire-skills-training`), then:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 6. Make yourself an admin

1. Run `npm run dev`, sign up via the website with your email
2. In the Firebase console → Firestore → `users` collection → find your document
3. Change the `role` field from `student` to `admin`
4. Reload the site — the **Admin Console** link appears in your account menu

### 7. (Optional) Seed your first course

You can create courses entirely from the admin console (`/admin/courses → + New course`), or seed manually in the Firestore console under the `courses` collection.

## Run locally

```bash
npm run dev
```

Open <http://localhost:5173>.

## Build & deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Your site is now live at `https://<project-id>.web.app`.

## Firestore data model

| Collection | Purpose |
|---|---|
| `users` | Profile + role + unique studentId (created on signup) |
| `counters/students` | Sequential student-ID counter (incremented in transaction) |
| `courses` | Course catalog; subcollections `lessons` and `quizzes` |
| `enrollments` | Student → Course join; status, progress, completed lessons |
| `payments` | Bank-transfer proof submissions; admin approves/rejects |
| `quizAttempts` | Quiz score history per user |
| `liveSessions` | Calendar slots (1-on-1 or group classes) |
| `bookings` | Student bookings against `liveSessions` |
| `testimonials` | Submitted by students; admin publishes |
| `whatsappGroupMembers` | Audit log of who admin added to which WA group |
| `chatMessages` | Chatbot conversation logs (for analytics) |
| `subscribers` | Newsletter signups |

## Free-tier limits to watch

Firebase Spark plan limits (per day, soft enough for an early-stage site):
- Firestore: 50K reads, 20K writes, 20K deletes, 1 GB stored
- Hosting: 10 GB stored, 360 MB/day bandwidth
- Authentication: unlimited email/password

Cloudinary free tier:
- 25 GB storage · 25 GB monthly bandwidth · unlimited transformations

If you outgrow Firebase quotas, upgrade to **Blaze** (pay-as-you-go) — you only pay over the free quotas.

## Project structure

```
src/
├── App.jsx                  # Routes
├── firebase.js              # Firebase init
├── main.jsx                 # React root
├── context/AuthContext.jsx  # Auth state + signup w/ student-ID counter
├── lib/                     # Firestore data layer
│   ├── courses.js · enrollments.js · payments.js
│   ├── liveSessions.js · bookings.js · testimonials.js
│   ├── quizzes.js · users.js · chatbot.js · format.js
├── components/              # Navbar, Footer, ChatbotWidget, Layout, ProtectedRoute, …
└── pages/                   # Public, auth, /student/*, /admin/*
firestore.rules              # Role-based access control
storage.rules                # Upload constraints
firestore.indexes.json       # Composite indexes
firebase.json · .firebaserc  # Hosting + project config
```

## License

Proprietary — © Empire Skills Training Center.
