# Empire Skills API (Express + SQLite)

Local-first backend for the Empire Skills Training app. Uses Node's built-in
`node:sqlite` — **no native modules, no separate DB server**. The whole database
is a single file (`data/empireskills.db`), so moving to another machine is just
copying the folder.

Requires **Node 22.13+** (uses `node:sqlite` and `process.loadEnvFile`).

## Run locally

```bash
cd server
npm install
copy .env.example .env      # then edit JWT_SECRET / admin credentials
npm run seed                # creates admin user + sample course/session
npm run dev                 # http://localhost:4000/api/health
```

## API overview

All routes are under `/api`. Auth is `Authorization: Bearer <token>` (JWT from
signup/login). Field names match the old Firestore documents (camelCase), so the
frontend `src/lib/*.js` modules map 1:1.

| Area | Routes |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` |
| Users (admin) | `GET /users`, `PATCH /users/:id/role` |
| Courses | `GET /courses?published=1`, `GET/POST/PATCH/DELETE /courses/:id` |
| Lessons | `GET/POST /courses/:id/lessons`, `PATCH/DELETE /courses/:cid/lessons/:id` |
| Quizzes | `GET/PUT /courses/:cid/lessons/:lid/quiz`, `POST /quiz-attempts`, `GET /quiz-attempts?courseId=` |
| Enrollments | `GET/POST /enrollments`, `POST /enrollments/:id/complete-lesson`, `POST /enrollments/:id/activate` |
| Payments | `GET/POST /payments`, `POST /payments/:id/confirm`, `POST /payments/:id/reject` |
| Live sessions | `GET /sessions?upcoming=1`, `POST/PATCH/DELETE /sessions/:id`, `POST /sessions/:id/book` |
| Bookings | `GET /bookings`, `PATCH /bookings/:id/status`, `POST /bookings/:id/cancel` |
| Testimonials | `GET /testimonials?published=1`, `POST /testimonials`, `PATCH/DELETE /testimonials/:id` |
| Newsletter | `POST /subscribers` |
| WhatsApp | `GET/POST /whatsapp-groups` |

File uploads (payment proofs, testimonial videos, lesson videos) still go to
Cloudinary from the frontend; the API stores the resulting URL strings.

## Deploy to Lightsail (15.206.92.104)

From your Windows machine:

```powershell
# 1. Copy the server folder (excluding node_modules and local DB)
scp -i C:\Users\basil\Downloads\EmpireSkills.pem -r `
  server/package.json server/src server/seed.js server/.env.example server/README.md `
  ec2-user@15.206.92.104:~/empire-skills-api/

# 2. SSH in
ssh -i C:\Users\basil\Downloads\EmpireSkills.pem ec2-user@15.206.92.104
```

On the server (Amazon Linux 2023):

```bash
# Install Node 22 (once)
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

cd ~/empire-skills-api
npm install --omit=dev
cp .env.example .env && nano .env    # set a real JWT_SECRET, admin password, CORS_ORIGINS
npm run seed

# Keep it running with pm2
sudo npm install -g pm2
pm2 start src/index.js --name empire-api
pm2 save && pm2 startup              # follow the printed command once
```

Then open port **4000** in the Lightsail console (Networking → IPv4 firewall →
add Custom TCP 4000), or put nginx in front on port 80/443.

To bring an already-populated local DB with you, copy the data folder too:

```powershell
scp -i C:\Users\basil\Downloads\EmpireSkills.pem -r server/data ec2-user@15.206.92.104:~/empire-skills-api/
```
