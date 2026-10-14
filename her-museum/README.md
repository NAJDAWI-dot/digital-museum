# Her Digital Museum

A personal portfolio presented as a digital museum — projects hang as exhibits,
milestones line a timeline, and visitors can leave a note in the guestbook.
Rose gold on deep plum, bilingual (English / العربية), and editable live from
the site itself.

![Preview](public/og-image.png)

## What's inside

| Wing | What it does |
| --- | --- |
| **Preloader & Hero** | Her name drawn letter by letter, then the curtain lifts onto the hero. |
| **Now Working On** | A small live "currently making…" strip, edited from the Editor. |
| **Curator's Favourite** | The project marked *Featured*, shown large. |
| **Exhibit corridor** | Scroll-through walk past the first four exhibits (a swipe carousel on phones). |
| **The Complete Collection** | Filterable gallery; each card opens a full write-up with photos, a lightbox, collaborators and a mentor credit. Visitors can ♡ a project. |
| **Her Journey** | Timeline of education, roles and milestones. |
| **Giving Back** | Volunteering, with photo prints. |
| **Kind Words** | Testimonials (hidden when empty). |
| **Contact & Guestbook** | Email / CV buttons and a moderated visitor's log. |
| **Extras** | Guided tour, Arabic/English switch, page transitions, custom cursor, and a museum cat who wanders past now and then. |
| **Editor** | A private panel (log in from *Editor Access*) to add, edit, reorder and delete everything above, upload images, and moderate the guestbook. Every save is committed straight to GitHub and goes live in about a minute. |

Everything respects *prefers-reduced-motion* and works by keyboard.

---

## Setup (about 20 minutes)

### 1. Create the repository

1. Create a new **public** GitHub repository (for example `her-museum`).
2. Copy everything in this folder into it and push to the `main` branch.

### 2. Fill in `site.config.js`

This is the only file to edit by hand:

```js
ownerName:   'Sara Ahmad',          // her name
initials:    'SA',                  // favicon monogram
githubOwner: 'sara-ahmad',          // GitHub username
githubRepo:  'her-museum',          // repository name from step 1
categories:  ['Design', 'Art', …],  // gallery tabs
likesNamespace: 'sara-ahmad-museum' // any unique string
```

The site will live at `https://<githubOwner>.github.io/<githubRepo>/`.

> Using a custom domain or a `<username>.github.io` repo? Change `BASE_PATH`
> at the bottom of the file to `'/'`.

### 3. Turn on GitHub Pages

Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Push any commit (or run the *Deploy to GitHub Pages* workflow from the
Actions tab). The site is now live with the sample content.

### 4. Enable the Editor login and guestbook (Supabase, free)

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Users → Add user**: create a user with her email and
   a strong password. Then **Authentication → Sign In / Providers** and turn
   **off** "Allow new users to sign up", so nobody else can make an account.
3. Open `supabase/migrations/guestbook_entries.sql`, replace every
   `you@example.com` with that same email, and run it in the **SQL Editor**.
4. In the GitHub repo → **Settings → Secrets and variables → Actions → New
   repository secret**, add:
   - `VITE_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — the `anon` `public` key on the same page
5. Re-run the deploy workflow.

### 5. First login & publishing

1. On the live site, click **Editor Access** and log in.
2. Open **⚙ Settings**, set **Contact Email** to the *same* email as the
   Supabase user (this is what the login checks), add CV and social links,
   and save.
3. To make edits go live, create a GitHub token: GitHub → Settings →
   Developer settings → **Fine-grained tokens** → Generate, limited to this
   repository, with **Contents: Read and write**. Paste it into the
   *GitHub PAT* box at the top of the Editor. It is kept only for the
   current browser tab.
4. Replace the sample exhibits, timeline, volunteering and testimonials with
   her own. Each save commits to `main`; the deploy workflow publishes it.

Without a token, edits are saved in that browser only (handy for drafting).
The **Export** button downloads the full content file as a backup.

---

## Optional extras

**Spam protection for the guestbook** — create a free Cloudflare Turnstile
widget and add its site key as the `VITE_TURNSTILE_SITE_KEY` secret.
New guestbook entries are always held for approval in the Editor's
📖 Guestbook tab either way.

**Ask the Curator** — an AI chat on each exhibit that answers questions using
only that project's write-up (uses Google Gemini's free tier):

1. Run `supabase/migrations/curator_rate_limit.sql`, then
   `curator_rate_limit_atomic.sql`, in the SQL Editor.
2. Deploy the function:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=... TURNSTILE_SECRET_KEY=...
   npx supabase secrets set PROJECTS_RAW_URL=https://raw.githubusercontent.com/<owner>/<repo>/main/src/data/projects.js
   npx supabase functions deploy ask-curator --no-verify-jwt
   ```
3. GitHub → Settings → Secrets and variables → Actions → **Variables** tab →
   add `VITE_CURATOR_ENABLED` = `true`, then redeploy.

---

## Customising

- **Colours** — `src/index.css`, the `:root` block. The accent tokens are
  still called `--gold*` but hold the rose gold; change the hex values to
  re-theme everything.
- **Wording** — `src/i18n/en.json` and `src/i18n/ar.json`.
- **Content** — through the Editor, or by hand in `src/data/projects.js`.
- **Images** — the Editor's uploader embeds them; the deploy workflow then
  moves them into `public/images/` automatically. You can also drop files
  into `public/images/` and reference them as `images/<file>`.
- **Link preview image** — replace `public/og-image.png` (1200 × 630).

## Local development

```bash
npm install
cp .env.example .env.local   # optional: fill in Supabase keys
npm run dev
```

`npm run build` produces the static site in `dist/`; `npm run lint` checks the code.
