# Tasneem's Little Museum

Personal portfolio of **Tasneem Mhairat**, Mechatronics Engineering student
at The Hashemite University. It's a playful digital museum: projects hang as
polaroids, milestones line a timeline, visitors sign a guestbook, and Hello
Kitty pops in now and then to say hi.

![Preview](public/og-image.png)

> **Setting it up for the first time?** Read **[START-HERE.md](START-HERE.md)**.
> It's a step-by-step guide that needs no coding.

## Features

| | |
| --- | --- |
| **Light & dark mode** | Follows the visitor's system setting; the ☾ / ☀︎ button switches and remembers. Every colour is a theme token, so both modes stay readable. |
| **Project showcase** | Polaroid cards with washi tape, search box, emoji category chips with counts, and a "showing X of Y" line. Cards open into a full write-up with photos, a lightbox, collaborators and a supervisor credit. Visitors can ♡ a project. |
| **Hero** | "Hi, I'm Tasneem" greeting with floating hearts and sparkles. |
| **Sections** | Currently Working On, My Favourite (featured project), project corridor, My Story So Far (timeline), Giving Back (volunteering), Kind Words (testimonials), contact, guestbook. Empty sections hide themselves. |
| **Hello Kitty** | Peeks in from the top, bottom, left or right edge every 20–45 s. Hover to keep her there, click for a "hi!". Turned off for visitors who prefer reduced motion. |
| **Bilingual** | English / العربية, with right-to-left layout. |
| **Editor** | Private panel (*Editor Access*) to manage everything, upload images and moderate the guestbook. Saves are committed to GitHub and deployed automatically. |

## Configuration

- **`site.config.js`**: name, GitHub username/repo, categories and their
  emoji, project statuses, founding year. This is the only file that has to
  be edited before the first deploy.
- **`src/data/projects.js`**: all content. The Editor rewrites this file.
- **`src/i18n/en.json`, `ar.json`**: all wording.
- **`src/index.css`**: colour tokens (`:root` = light, `[data-theme='dark']` = dark).
- **`src/theme.css`**: the playful layer (rounding, pills, script accents).

### Secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Needed for |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Editor login and guestbook |
| `VITE_TURNSTILE_SITE_KEY` *(optional)* | Cloudflare Turnstile spam check on the guestbook |

The site works without any of them: the guestbook shows "not configured
yet" and the Editor can't log in.

### Optional: Ask the Curator
An AI chat on each project that answers using only that project's write-up
(Google Gemini free tier). Run `supabase/migrations/curator_rate_limit.sql`,
then `curator_rate_limit_atomic.sql`, and deploy the function:

```bash
npx supabase secrets set GEMINI_API_KEY=... TURNSTILE_SECRET_KEY=...
npx supabase secrets set PROJECTS_RAW_URL=https://raw.githubusercontent.com/<user>/tasneem-museum/main/src/data/projects.js
npx supabase functions deploy ask-curator --no-verify-jwt
```

Then add the Actions **variable** `VITE_CURATOR_ENABLED` = `true` and redeploy.

## Development

```bash
npm install
npm run dev            # live dev server at http://localhost:5173/tasneem-museum/
npm run build          # production build in dist/
npm run build:preview  # double-clickable test copy in preview/index.html
npm run lint
```

Copy `.env.example` to `.env.local` to try the Editor login and guestbook
locally.

## Notes

- Hello Kitty is a character owned by Sanrio. The drawing here is an
  original fan illustration for a personal, non-commercial site. Remove
  `<HelloKitty />` from `src/App.jsx` if the site is ever used commercially.
- The ♡ counters use the free [counterapi.dev](https://counterapi.dev)
  service under the `likesNamespace` set in `site.config.js`.
