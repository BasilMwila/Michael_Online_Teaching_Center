# Celebrating Prisca

Independent birthday memory website for Pastor Prisca Philips. It runs alongside Empire Skills with its own Node process, SQLite database, upload directory and port (4100). No Empire Skills app code or database is used.

## Run

Requires Node 22.13+. Run `npm ci`, copy `.env.example` to `.env`, set `ADMIN_TOKEN` to a long randomly generated secret, then `npm start`. Open http://127.0.0.1:4100. Run `npm test` for the isolated upload/moderation/persistence integration test.

The homepage contains a coverflow carousel, asymmetric photo mosaic, original birthday text interludes, honeycomb gallery, wishes and a submission form. A post containing one attachment opens directly; multiple attachments open in the fan carousel, including mixed photo/video posts. Videos do not autoplay. The layout respects reduced motion preferences.

The initial gallery is explicitly marked as illustrative. It is replaced by approved submissions once available. The four sample images are Unsplash images downloaded during design exploration; replace them with approved church photographs for launch. No sample portrait is claimed to be Pastor Prisca. The original text interludes are in `public/index.html`.

## Submissions and review

Public submissions can contain a text message and up to eight JPEG/PNG/WebP images or MP4/WebM/MOV videos, 40 MB each. A submission must include consent. Uploads are stored in `data/uploads`, posts in `data/diary.db`; back up this directory. File signatures are checked. Pending/rejected media is not publicly accessible. Access `admin.html` using the organiser's private `ADMIN_TOKEN` to approve or hide submissions. The key remains in browser memory only. There is a per-IP submission limit and a soft total upload storage limit. Video compatibility depends on the uploaded codec; MP4 with H.264/AAC is recommended. Videos are stored as uploaded, without transcoding.

## Hosting

Run under a separate PM2 process called `prisca-diary` and reverse proxy to `127.0.0.1:4100`. Keep a trailing slash on a subpath proxy so asset/API routes resolve. Example preview location within the existing HTTPS server block:

```nginx
location = /celebrating-prisca { return 301 /celebrating-prisca/; }
location ^~ /celebrating-prisca/ {
    client_max_body_size 325m;
    proxy_pass http://127.0.0.1:4100/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}
```

For a dedicated domain use the same proxy at `/`, issue HTTPS after DNS points to the server, and remove or redirect the preview path. No hardcoded production hostname is required. Configure PM2 startup persistence. Review public upload limits for expected traffic before promoting broadly.
