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

- [ ] **Splash:** a heart draws itself, fills pink, then the page opens
      through a circle. It shows once per visit; open a new tab to see it again.
- [ ] **Top of the page:** the floating pill menu, the "I'm Tasneem" greeting,
      and her **museum pass** card with floating stickers
- [ ] **Cursor:** a pink arrow that turns into a heart over buttons and links,
      with a little sparkle trail
- [ ] **☾ / ☀︎** in the menu switches light and dark mode, and remembers it
- [ ] **Currently working on:** the pinned sticky note with a progress bar
- [ ] **My favourite:** hover the photo pile and it fans out
- [ ] **Project parade:** the strip of mini polaroids glides by itself.
      Hover to pause it, then click one.
- [ ] **Things I've made:** search ("robot", "Arduino"), the category chips,
      and **Clear**. Click a card to open the full project.
- [ ] **My story so far:** goes sideways. Use the arrows, drag it with
      the mouse, or swipe on a phone.
- [ ] **Giving back:** the new cards
- [ ] **Hello Kitty** pops in from an edge after a few seconds. Hover to keep
      her there, click her for a "hi! ♡".
- [ ] **ع** switches to Arabic (right-to-left)
- [ ] Your phone or a narrow window

### Try the new editor (demo)

The test copy has a **demo editor**, so you can try editing without any
accounts:

1. Click the **🔑 key** in the menu and type **any** password.
2. You'll get a floating editing bar at the bottom and **✎ Edit** buttons on
   the sections. Click one to jump straight to it.
3. Try **🖼️ Projects** (click a tile, change something, **Save changes**),
   **📌 Working on** (emoji and progress slider), and **⏳ My story** (↑ ↓ to
   reorder).

Demo changes stay in your browser only and are never published. The real
site has no demo mode: there, only her real password works.

### What won't work in the test copy (that's expected)

- **Guestbook** needs her Supabase account (START-HERE, Part 2), so it shows
  "not configured yet".
- **♡ counts** stay at 0, because counters only save on the live site.
- **🚀 Publishing** is switched off in the demo.

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
- A quick heart splash, a floating pill menu, and a greeting with her
  "museum pass" card
- A sticky-note "currently working on" with a progress bar
- "My favourite" as a fanned photo pile, plus a gliding project parade
- Polaroid project showcase with search and emoji category filters
- "My story so far" as a horizontal road, and new "Giving back" cards
- A heart cursor with a sparkle trail, and Hello Kitty from all four edges
- An easier editor: a login card, ✎ Edit buttons on every section, one-page
  project editing with a live preview, and a guided 🚀 Publishing setup
- Lighter and smoother: the first download is about half the size, and
  there's no smooth-scroll library, particle canvas or heavy blur effects

Removed, as you asked for her version: the recap video render, 3D models,
narrator, analytics, the archives, and the collectables.
