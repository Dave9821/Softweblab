# SoftWebLab — remaining pages

## Install order

1. Copy `services.html`, `about.html`, `careers.html`, `contact.html` into the repo root
   (same folder as `index.html`, `work.html`, `softweblab.css`).
2. Append the contents of `css-append.css` to the **end** of `softweblab.css`.
   Do NOT replace the file — Claude Code already edited `.brand-mark` and `.foot-logo` in it.
3. Copy `vercel.json` into the repo root (enables clean URLs so `/work`, `/services` etc. resolve).

## Must fix before deploy

- **Contact form**: `contact.html` has `action="REPLACE_WITH_FORMSPREE_ENDPOINT"`.
  Copy the real Formspree URL out of `index-old.html` and paste it in.
- **Careers**: Apply buttons currently open `mailto:careers@softweblab.net`.
  Point them at your real ATS or application form if you have one.
- **Stats**: `about.html` carries over 40+ team / 15+ industries / 99% retention from the
  old site. Verify these before they go live.

## Sitemap

Update `sitemap.xml` to list all six URLs:
/ , /work , /services , /about , /careers , /contact