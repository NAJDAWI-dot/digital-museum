# Tasneem's museum: testing it and handing it over

The package has three things:

```
tasneem-museum-package/
├── READ-ME-FIRST.md      ← this file (for you)
├── TEST-IT-FIRST/        ← double-click test copy of the site
│   └── index.html
└── tasneem-museum/       ← the actual website (what Tasneem gets)
    └── START-HERE.md     ← her step-by-step setup guide
```

---

## 1. Test it yourself (2 minutes, nothing to install)

1. Unzip the package.
2. Open **`TEST-IT-FIRST`** and double-click **`index.html`**. It opens in
   your browser like a normal website. Chrome, Edge, Firefox and Safari all
   work. Keep the internet on so the fonts load.

### What to try

- [ ] The intro animation with her name, then the "Hi, I'm Tasneem" hero
- [ ] The **☾ / ☀︎** button in the top bar: switch between light and dark
      mode, then refresh. It remembers your choice.
- [ ] **My Work:** type in the search box ("robot", "Arduino"), click the
      category chips, then **Clear**
- [ ] Hover a polaroid card (it straightens up), click it to open the
      project, click a photo for the lightbox, press <kbd>Esc</kbd> to close
- [ ] Wait about 10 seconds for **Hello Kitty** to pop in from an edge.
      Hover to keep her there, click her for a "hi! ♡". She comes back every
      20–45 seconds from a different side.
- [ ] **Take a little tour ✨** in the hero
- [ ] **ع** in the top bar switches to Arabic (right-to-left)
- [ ] Shrink the window or open it on your phone (☰ menu, swipeable chips)

### What won't work in the test copy (that's expected)

- **Editor login** and **guestbook** need her Supabase account (START-HERE,
  Part 2). The guestbook shows "not configured yet".
- **♡ counts** stay at 0, because counters only save on the live site.

### Testing the full thing (optional, needs Node.js)

```bash
cd tasneem-museum
npm install
npm run dev
```

Then open the link it prints. To try the login and guestbook too, put Supabase
keys in a `.env.local` file (copy `.env.example`). After changing anything,
`npm run build:preview` regenerates the double-click test copy in
`tasneem-museum/preview/`.

---

## 2. Before you give it to her

Everything about her is already filled in: name, Mechatronics at HU, and
categories like Robotics, Embedded Systems and CAD & Design. The **projects,
timeline entries and testimonial are samples** (marked "SAMPLE"). She
replaces them from the Editor after setup, so you don't need to. If you know
her real projects, you can edit `tasneem-museum/src/data/projects.js` first.

The one thing that **must** change is her GitHub username in
`tasneem-museum/site.config.js` (`githubOwner`). Her guide tells her to do
this in Part 1, step 3, so leave it if you don't know it yet.

---

## 3. Give it to her (pick one)

### Option A: send it, she sets it up (easiest for you)
1. Send her the **`tasneem-museum` folder** zipped (WhatsApp, Google Drive or
   email all work; it's small). You can include `TEST-IT-FIRST` too, so she
   can peek at the site before setting anything up.
2. Tell her: *"Unzip it and open START-HERE.md. It walks you through
   everything, about 30 minutes."* The `.md` file opens in any text editor,
   and reads best if she uploads it to GitHub or opens it in VS Code.

### Option B: set it up together (smoothest)
Sit with her for about 30 minutes and follow **START-HERE.md** on her
laptop, using **her own** GitHub and Supabase accounts and **her** email.
That way she owns the site, the login and the password from day one, and you
never need her password. Don't use your own GitHub token in her Editor.

### Option C: have it live before you tell her (surprise)
1. Follow START-HERE Parts 1 and 2 on **your** accounts. Use your own
   username in `githubOwner`, and her email for the Supabase user so she can
   log in. Ask her to choose the password, or change it later in Supabase.
2. Hand it over:
   - **GitHub:** repository → Settings → *Transfer ownership* → her username.
     Then she changes `githubOwner` in `site.config.js` to her username,
     checks that **Settings → Pages** is still on *GitHub Actions*, and
     re-adds the two secrets if they are missing. Her address becomes
     `her-username.github.io/tasneem-museum/`.
   - **Supabase:** invite her to the organisation (Organization settings →
     Team), make her Owner, then remove yourself.

---

## 4. What's in her site

- Light and dark mode, both checked for readable text
- New project showcase: polaroid cards, search, emoji category filters
- Casual, first-person wording in English and Arabic
- Hello Kitty popping in from all four edges
- Editor for projects, photos, timeline, volunteering, testimonials,
  "currently working on", and guestbook moderation

Removed, as you asked for her version: the recap video render, 3D models,
narrator, analytics, the archives, and the collectables.
