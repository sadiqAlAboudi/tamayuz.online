# AGENTS.md — Development Guidelines for AI Agents

> **Project:** منصة التميز (`tamayuz.online`)  
> **Purpose:** Guidelines, architecture standards, and styling principles for AI agents working in this repository.

---

## 1. Core Tech Stack

The technology stack is strictly limited to:
* **Hugo** — Fast static site generator (templates, data pipelines, assets).
* **Sveltia CMS** — Lightweight, Git-based headless CMS for content management (`/admin`).
* **Semantic HTML5** — Accessible, standard markup.
* **Pure Modern CSS** — Native CSS with modern nesting, custom properties, and zero build baggage.
* **Vanilla JavaScript** — Lightweight, native client-side interactivity without libraries.

> [!IMPORTANT]
> **No Third-Party Frameworks or Libraries**:
> Never introduce Tailwind, Bootstrap, jQuery, React, Vue, or any external utility/component libraries. If a feature can be built using standard HTML5, modern CSS, or vanilla JS, it **must** be implemented natively.

---

## 2. Design & UX Philosophy

* **Modern & Visually Stunning:** Build clean, modern, high-polish user interfaces with balanced whitespace, subtle micro-interactions, smooth CSS transitions, and elegant typography.
* **User-Centric UX:** Prioritize readability, smooth navigation, instant visual feedback, responsive touch targets, and accessible layouts across desktop, tablet, and mobile devices.
* **Performance-First:** Keep assets lightweight, avoid render-blocking scripts, use WebP for imagery, and minimize DOM complexity.
* **RTL & Localization:** Maintain full Arabic RTL support (`dir="rtl"`, Cairo font, logical spacing where applicable).

---

## 3. HTML & CSS Standards

### 3.1. Semantic HTML Over Class Bloat
* Always use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<figure>`, `<figcaption>`, `<footer>`, `<dialog>`, `<details>`, `<summary>`) instead of generic `<div>` containers.
* Use native HTML attributes and controls (`aria-*`, `role`, `loading="lazy"`, `decoding="async"`, `popover`, `<dialog>`) rather than inventing complex JS/CSS overlays.

### 3.2. Pure CSS with Native Nesting
* Write CSS using modern **native CSS nesting** (`& > ...`, `&:hover`, `&::before`).
* **Avoid unnecessary custom classes:** Style directly using semantic tags and hierarchy within component boundaries whenever possible:
  ```css
  /* Good: Semantic nesting, concise, no class bloat */
  .reviews-section {
    padding: clamp(40px, 6vw, 80px) 0;

    & > header {
      text-align: center;
      margin-bottom: 2rem;

      & h2 {
        font-size: clamp(1.8rem, 3vw, 2.4rem);
      }

      & p {
        color: var(--text-muted);
      }
    }

    & ul {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    & li {
      padding: 1.5rem;
      border-radius: 12px;
    }
  }
  ```

### 3.3. Custom Classes: Use Only When Truly Needed
* **Permitted:** Use a custom class for a top-level component container (e.g., `.hero-section`, `.catalogue-grid`), a distinct UI modifier (e.g., `.is-active`, `.featured`), or when semantic tags alone would result in ambiguous or brittle selectors.
* **Forbidden:** Do not invent utility classes or granular element classes (e.g., `.title-text`, `.paragraph-desc`, `.wrapper-inner`, `.button-container`) when semantic nesting suffices.
* **No rules for the sake of writing rules:** Keep style sheets lean, intentional, and DRY. Every CSS declaration must serve a clear visual or structural purpose.

---

## 4. Content Management & Sveltia CMS

* **CMS Configuration:** All editorial fields, collections, and S3 media library bindings are managed in [`static/admin/config.yml`](file:///C:/Users/Muntadar/Documents/Projects/tamayuz.online/static/admin/config.yml).
* **Content Collections:**
  * Books / Study Guides: [`content/book/*.md`](file:///C:/Users/Muntadar/Documents/Projects/tamayuz.online/content/book)
  * Homepage Content: [`content/_index.md`](file:///C:/Users/Muntadar/Documents/Projects/tamayuz.online/content/_index.md)
  * Global Settings: [`data/settings.json`](file:///C:/Users/Muntadar/Documents/Projects/tamayuz.online/data/settings.json)
* **Media Handling:** All uploaded PDFs and heavy booklet images are hosted externally on **S3** (`media.bookingmaster.app`). **Never** commit large PDFs, videos, or raw high-resolution images directly into the Git repository.

---

## 5. JavaScript Guidelines

* Write modular, modern ES6+ vanilla JavaScript inside [`static/js/script.js`](file:///C:/Users/Muntadar/Documents/Projects/tamayuz.online/static/js/script.js) (or discrete static scripts when required).
* Keep DOM manipulations minimal and fast.
* Prefer native browser APIs:
  * `IntersectionObserver` for scroll animations / lazy tasks.
  * Native `<dialog>` methods (`showModal()`, `close()`) for modals.
  * CSS variables for dynamic runtime theme adjustments.

---

## 6. Directory Layout Reference

```text
├── assets/
│   └── css/               # Modular pure CSS files (hero, catalogue, reviews, etc.)
├── content/               # Markdown content parsed by Hugo & edited via Sveltia CMS
├── data/                  # Global site data (settings.json)
├── layouts/               # Hugo HTML templates (_default, partials, index.html)
├── static/
│   ├── admin/             # Sveltia CMS entrypoint (config.yml, index.html)
│   ├── assets/            # Essential local branding assets (logos, favicons, og-image)
│   ├── fonts/             # Self-hosted webfonts (Cairo woff2)
│   └── js/                # Native client-side JavaScript
└── hugo.toml              # Hugo site configuration
```

---

## 7. Rules of Engagement for Agents

1. **Check Existing Conventions:** Before modifying layouts or styles, inspect the existing structure in `layouts/` and `assets/css/` to match formatting and semantic hierarchy.
2. **Never Add External CDNs/NPM Packages:** Do not inject script tags for external CDNs (FontAwesome, Bootstrap, jQuery, Tailwind play CDN, etc.).
3. **Keep Git History Clean:** Never track generated binaries, compressed archives, or uncompressed PDFs in the Git tree.
4. **Test Before Committing:** Ensure Hugo builds cleanly (`hugo --gc --minify`) without errors or broken shortcodes.
