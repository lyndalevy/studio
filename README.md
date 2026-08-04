# Studio L Photography

The site. Everything you'll want to change day-to-day lives in three files in
`content/` — you shouldn't need to touch anything else.

## Running it

```bash
npm run dev
```

Then open http://localhost:3000. The site reloads as you save.

## Changing things

### Prices → `content/rates.ts`

Each package is a block. Change a number, add a bullet, delete a whole package —
the Rates page rebuilds itself. Copy an existing block to add a new one.

`featured: true` makes a card solid red. Use it on one package only.

### Photos → `content/galleries.ts`

Each entry is a category on the Portfolio page. The `source` says where its
photos come from:

| `source`                                   | What it does                                                |
| ------------------------------------------ | ----------------------------------------------------------- |
| `{ kind: "local", dir: "real-estate" }`     | Reads `public/photos/real-estate/`. Fastest, needs a redeploy. |
| `{ kind: "lightroom", url: "https://…" }`   | A public Lightroom share link. Updates on its own.           |
| `{ kind: "icloud", token: "B1rGf6…" }`      | An iCloud Shared Album. The token is the last part of the share link. |

You can mix them — one category on Lightroom, another on local files. Switching
a category from one to another is a one-line change and nothing else moves.

`hidden: true` takes a category off the site without deleting it.

**Lightroom caveat:** Adobe has no official API for share links, so this reads
the same internal endpoint the share page uses. It works, but Adobe can change
it without notice. If a gallery ever goes blank, the page says so on screen
rather than breaking — and you can switch that category to `local` or `icloud`
in the meantime. The share must be **public** (not "require sign in").

### Words, email, Instagram → `content/site.ts`

Your name, tagline, the About page text, and contact details.

### The logo

Right now the wordmark is built from live type — the camera mark plus the name
set in Transcity. If you export the exact logo from Canva, drop it in `public/`
and set `logo` in `content/site.ts`:

```ts
logo: { src: "/logo.png", width: 1471, height: 392 },
```

### Colours

`app/globals.css`, top of the file. Change `--color-red` and `--color-cream`
and the whole site follows.

## Fonts

`Transcity.otf` and `Schoolbook-Regular.ttf` in `app/fonts/`.

Two things to know about Transcity: it contains **only A–Z and a–z** — no
digits, no punctuation, not even a period. The font stack in `globals.css`
lists Schoolbook right behind it, so the browser falls back per character and
`$150/hr` renders in Schoolbook automatically instead of showing blank boxes.

Its licence is also **personal use only** — commercial use needs a paid licence
from dharmasstudio.com. Schoolbook came from a font aggregator and its
redistribution terms are unclear, and it has no real bold (headings use the
browser's synthesised bold). Swapping either one is a two-line change in
`app/fonts.ts`.

## Deploying

Push to GitHub, then import the repo at vercel.com. It'll detect Next.js and
build it. Galleries re-check their sources every 5 minutes, so photo changes
appear without a redeploy — text and price changes need a push.
