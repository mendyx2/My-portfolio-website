/* =========================================================
   OI.Dev — Portfolio Script
   Vanilla JS, no deps. Handles:
     - Footer year
     - Custom cursor (desktop, non-touch)
     - Header scroll state + active nav link
     - Mobile menu toggle
     - Smooth scroll for in-page anchors
     - Scroll-reveal (IntersectionObserver)
     - Count-up animation for hero stats
     - Tools grid render
     - Projects grid render + detail view (hash-routed)
     - Toast notifications
   ========================================================= */

(() => {
  'use strict';

  /* ---------- Utilities ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isCoarse = () => window.matchMedia('(pointer: coarse)').matches;
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Photo helpers ----------
     Every photo on this site (project covers, screenshots, about photos) is
     just a plain file path — no external service, no "seed" strings to
     figure out.

     HOW TO ADD YOUR OWN PHOTOS:
     1. Drop your image files into an `images/` folder next to index.html
        (e.g. images/projects/orbital-dash.jpg).
     2. Paste that same path into the matching field in the data below
        (PROJECTS or PHOTOS further down this file).
     3. That's it — refresh the page and your photo shows up.

     If a path is left blank, or the file isn't there yet, a soft gradient
     placeholder is shown instead — it even prints the exact filename it's
     expecting, so you always know what to add and where. */
  const placeholderImg = (label, gradientCss) => {
    const colors = (gradientCss || '').match(/#[0-9a-fA-F]{3,6}/g) || ['#7C5CFC', '#00D9FF'];
    const c1 = colors[0];
    const c2 = colors[1] || colors[0];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/>
          <stop offset="1" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="47%" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#ffffff">Add a photo here</text>
      <text x="50%" y="59%" text-anchor="middle" font-family="monospace" font-size="13" fill="#ffffffcc">${label}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  // Attach an <img>, falling back to a labeled placeholder if the path is
  // empty or the file can't be found (fade-in-on-load either way).
  const setImg = (img, path, alt, gradientCss, placeholderLabel) => {
    if (!img) return;
    if (alt) img.alt = alt;
    const fallback = () => placeholderImg(placeholderLabel || path || 'image', gradientCss);
    const markLoaded = () => img.classList.add('is-loaded');
    if (!path) {
      img.src = fallback();
      markLoaded();
      return;
    }
    img.src = path;
    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', () => { img.src = fallback(); markLoaded(); }, { once: true });
  };

  /* ---------- Footer year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Custom cursor (desktop only) ---------- */
  const cursor = $('.cursor');
  if (cursor && !isCoarse() && !prefersReducedMotion()) {
    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let rafId = null;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot) {
        dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      }
    });

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ring) {
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const hoverables = 'a, button, [role="button"], .project-card, .tool, input, textarea, select, label';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverables)) cursor.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverables)) cursor.classList.remove('is-active');
    });
    document.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      cursor.style.opacity = '1';
    });
    // Pause RAF when tab hidden to save battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!document.hidden && !rafId) {
        rafId = requestAnimationFrame(loop);
      }
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ---------- Header scroll state ---------- */
  const header = $('#header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Active nav link on scroll ---------- */
  const navLinks = $$('.nav__link');
  const sections = navLinks
    .map((link) => {
      const id = (link.getAttribute('href') || '').replace('#', '');
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const setActive = (id) => {
      navLinks.forEach((l) => {
        l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`);
      });
    };
    const navObserver = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => navObserver.observe(s));
  }

  /* ---------- Mobile menu ---------- */
  const menuToggle = $('#menuToggle');
  const navEl = $('.nav');
  const navList = $('.nav__list');
  if (menuToggle && navEl) {
    const closeMenu = () => {
      menuToggle.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      navEl.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
    };
    const openMenu = () => {
      menuToggle.classList.add('is-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      navEl.classList.add('is-open');
      document.body.classList.add('no-scroll');
    };
    menuToggle.addEventListener('click', () => {
      if (menuToggle.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    // Close on link click
    if (navList) {
      navList.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeMenu();
      });
    }
    // Close on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
    // Close on Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuToggle.classList.contains('is-open')) closeMenu();
    });
  }

  /* ---------- Smooth scroll for in-page anchors ---------- */
  // Respect user motion preference by falling back to instant.
  const smoothScroll = (targetId) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
    if (prefersReducedMotion()) {
      window.scrollTo(0, top);
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    const id = href.slice(1);
    if (!id) return;
    e.preventDefault();
    // Update the URL hash without triggering jump
    history.pushState(null, '', `#${id}`);
    smoothScroll(id);
  });

  /* ---------- Scroll reveal ---------- */
  window.revealObserver = null;
  const revealEls = $$('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window && !prefersReducedMotion()) {
    window.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            window.revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => window.revealObserver.observe(el));
  } else {
    // Reduced motion: just show everything
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Count-up animation ---------- */
  const counters = $$('[data-count]');
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window && counters.length && !prefersReducedMotion()) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => countObserver.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.dataset.count));
  }

  /* ---------- Hero avatar (developer portrait) ---------- */
  const heroAvatarImg = $('#heroAvatarImg');
  if (heroAvatarImg) {
    setImg(heroAvatarImg, 'images/profile.jpg', 'Wendy Atobor — OI.Dev', 'linear-gradient(135deg, #7C5CFC 0%, #00D9FF 100%)', 'images/profile.jpg');
  }

  /* ---------- About: behind-the-scenes photo strip ---------- */
  const aboutPhotos = $('#aboutPhotos');
  if (aboutPhotos) {
    // Set `path` to your own photo, e.g. 'images/about/workspace.jpg'.
    // Leave it as '' and a placeholder showing that exact filename appears
    // until you add the real file.
    const PHOTOS = [
      { path: 'images/about/workspace.jpg', caption: 'Workspace · Late-night shipping' },
      { path: 'images/about/design.jpg', caption: 'Design system · Tokens' },
      { path: 'images/about/code.jpg', caption: 'Code · Caffeine-driven' },
    ];
    const photoGradient = 'linear-gradient(135deg, #7C5CFC 0%, #FF6BC1 100%)';
    PHOTOS.forEach((p) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'photo-tile img-ph reveal';
      tile.setAttribute('aria-label', `Open photo: ${p.caption}`);
      tile.dataset.photoUrl = p.path;
      tile.dataset.photoAlt = p.caption;
      tile.innerHTML = `
        <img alt="${p.caption}" loading="lazy" decoding="async" />
        <div class="photo-tile__overlay"></div>
        <span class="photo-tile__caption">${p.caption}</span>
      `;
      const img = tile.querySelector('img');
      setImg(img, p.path, p.caption, photoGradient, p.path);
      aboutPhotos.appendChild(tile);
    });
  }

  /* ---------- Data: tools ---------- */
  // Inline SVG icons so we don't need any external assets.
  const TOOLS = [

    { name: 'Flutter', color: '#54C5F8', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.314 0L2.3 12.013l3.622 3.624L14.314 4.65V0zM14.314 9.7L8.74 15.275l3.622 3.624L19.36 12.06 14.314 7.013V9.7zM14.314 19.4v4.65l5.045-5.046-3.622-3.624L14.314 19.4z"/></svg>' },
    { name: 'Dart', color: '#00D4FF', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 0l15 12-15 12V0z"/></svg>' },
    { name: 'React', color: '#61DAFB', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>' },
    { name: 'Next.js', color: '#F4F4F8', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 109.6 19.2L12 12V0zm0 24a12 12 0 006.4-1.84L12 12v12z"/></svg>' },
    { name: 'TypeScript', color: '#3178C6', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="0" y="0" width="24" height="24" rx="3"/><path fill="#3178C6" d="M0 0h24v24H0z"/><text x="12" y="17" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="800" fill="#fff">TS</text></svg>' },
    { name: 'Node.js', color: '#83CD29', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.85L2.5 7.1v9.8L12 22.15 21.5 16.9V7.1L12 1.85zM12 3.7l7.5 4.2v8.2L12 20.3l-7.5-4.2V7.9L12 3.7z"/></svg>' },
    { name: 'Tailwind', color: '#38BDF8', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4c-3 0-5 1.5-6 4.5 1.5-1.5 3-2 4.5-1.5 1 .3 1.7 1 2.4 1.7.9 1 2 2 4.1 2 3 0 5-1.5 6-4.5-1.5 1.5-3 2-4.5 1.5-1-.3-1.7-1-2.4-1.7C15.1 4.7 14 4 12 4zM6 12c-3 0-5 1.5-6 4.5 1.5-1.5 3-2 4.5-1.5 1 .3 1.7 1 2.4 1.7.9 1 2 2 4.1 2 3 0 5-1.5 6-4.5-1.5 1.5-3 2-4.5 1.5-1-.3-1.7-1-2.4-1.7C9.1 12.7 8 12 6 12z"/></svg>' },
    { name: 'WordPress', color: '#21759B', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11"/><text x="12" y="16.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="#0A0A0F">W</text></svg>' },
    { name: 'Figma', color: '#F24E1E', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4zM4 12c0-2.2 1.8-4 4-4h4v8H8c-2.2 0-4-1.8-4-4zM8 0C5.8 0 4 1.8 4 4s1.8 4 4 4h4V0H8zM16 0v8h4c2.2 0 4-1.8 4-4s-1.8-4-4-4h-4zM16 12h4c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4v-4z"/></svg>' },
    { name: 'Firebase', color: '#FFCA28', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 14.5L8 3l4 8-8.5 3.5zM12 9l4 6h5l-5-12-4 6zM2 16l9 6 1-3-6-5-4 2zM11 19l3 5 9-6-7-2-5 3z"/></svg>' },
    { name: 'n8n', color: '#EA4B71', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="0" y="0" width="24" height="24" rx="5"/><text x="12" y="16" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="800" fill="#0A0A0F">n8n</text></svg>' },
    { name: 'Retell AI', color: '#7C5CFC', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z"/><path d="M19 11a7 7 0 01-14 0M12 18v4"/></svg>' },
    { name: 'Spoki', color: '#25D366', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.09.86 4.01 2.3 5.54L3 22l5.66-1.49C10.02 21.14 11 21.3 12 21.3c5.52 0 10-4.03 10-9s-4.48-9-10-9z"/><path d="M13 7l-4 6h3l-1 4 4-6h-3l1-4z" fill="#0A0A0F"/></svg>' },
    { name: 'Git', color: '#F05032', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12L12 1 1 12l11 11 11-11zM12 4.5L20.5 13 12 21.5 3.5 13 12 4.5z"/></svg>' },
    { name: 'Antigravity', color: '#0078D7', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 2.5l-5 4.5L8 3 3 5v14l5 2 4-4 5 4.5L24 16V8L17 2.5z"/></svg>' },
    { name: 'Vercel', color: '#F4F4F8', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>' },
  ];

  /* ---------- Render: tools grid ---------- */
  const toolsGrid = $('#toolsGrid');
  if (toolsGrid) {
    const frag = document.createDocumentFragment();
    TOOLS.forEach((t) => {
      const el = document.createElement('div');
      el.className = 'tool';
      el.style.setProperty('--tool-color', t.color);
      el.setAttribute('role', 'listitem');
      el.setAttribute('aria-label', t.name);
      el.innerHTML = `
        <div class="tool__icon" style="color: ${t.color}">${t.svg}</div>
        <span class="tool__name">${t.name}</span>
      `;
      frag.appendChild(el);
    });
    toolsGrid.appendChild(frag);
  }

  /* ---------- Data: projects ----------
     Each project needs: id, title, tagline, desc, platform ('web' | 'mobile' | 'ai'),
     year, tags[], gradient (used as the placeholder background + accent).

     WEB & AI projects → set `image` to ONE photo path, and `liveUrl` to the
     link the "View Live" button opens.

     MOBILE projects → set `images` to a LIST of screenshot paths. The first
     one becomes the card cover; the "View Screenshots" button opens the
     whole list as a swipeable carousel.

     PHOTOS: just point each field at a file inside an `images/projects/`
     folder that you create next to index.html — e.g.
       image: 'images/projects/orbital-dash.jpg'
     Nothing else to configure. If a file is missing, that card shows a
     gradient placeholder printing the exact filename it's waiting for, so
     you always know what to add. */
  const PROJECTS = [
    {
      id: 'lumen-budget',
      title: 'LS-SOL',
      tagline: 'A custom made calculator designed for Nigerian Land Surveyor',
      desc: 'A Flutter app that turns land surveying calculations into simple and sharable outputs for field work. It also project management so users can archive calculations relating to different land projects.',
      platform: 'mobile',
      year: 2025,
      tags: ['Flutter', 'Dart', 'BLOC',],
      // gradient: 'linear-gradient(135deg, #7C5CFC 0%, #00D9FF 100%)',
      images: [
        'images/projects/Mobile projects/ls1.jpg',
        'images/projects/Mobile projects/ls2.jpg',
        'images/projects/Mobile projects/ls3.jpg',
        'images/projects/Mobile projects/ls4.jpg',
        'images/projects/Mobile projects/ls5.jpg',
        'images/projects/Mobile projects/ls6.jpg',
        'images/projects/Mobile projects/ls7.jpg',
        'images/projects/Mobile projects/ls8.jpg',
        'images/projects/Mobile projects/ls9.jpg',
      ],
    },
    {
      id: 'flavor-journal',
      title: 'Pitch Factory',
      tagline: 'An AI powered app for that helps you analyze your business pitch',
      desc: 'A flutter + firebase app for that helps you analyze your business pitch. It rates your business pitch on clarity, marketability, problem-solution fit, and completeness, with a score and detailed AI-generated feedback.',
      platform: 'mobile',
      year: 2026,
      tags: ['Flutter', 'Firebase', 'AI', 'OpenAI'],
      // gradient: 'linear-gradient(135deg, #FF6BC1 0%, #7C5CFC 100%)',
      images: [
        'images/projects/Mobile projects/pf1.png',
        'images/projects/Mobile projects/pf2.png',
        'images/projects/Mobile projects/pf3.png',
        'images/projects/Mobile projects/pf4.png',
        'images/projects/Mobile projects/pf5.png',
        'images/projects/Mobile projects/pf6.png',
      ],
    },
    {
      id: 'Wildflour Bakery',
      title: 'Wildflour Bakery',
      tagline: 'A well rounded bakery website.',
      desc: 'Bakery website that includes a product catalog, custom cart, Order/booking management, with potential payment capabilities ',
      platform: 'web',
      year: 2026,
      tags: ['HTML', 'CSS', 'Javascript', 'Formspree'],
      image: 'images/projects/Web & AI projects/wildflour-bakery.png',
      liveUrl: 'https://wildflour-bakery-website.vercel.app',
    },
    {
      id: 'AZ-HIRE',
      title: 'AZ-HIRE Landing Page',
      tagline: 'A Landing Page for a recruitment services company.',
      desc: 'AZ-HIRE Recruitment — A modern landing page for a recruitment agency, designed to convert visitors into clients and candidates. Built with a clean, responsive layout, bold typography, and smooth scroll-driven interactions across hero, services, stats, and contact sections. ',
      platform: 'web',
      year: 2026,
      tags: ['HTML', 'CSS', 'Javascript', 'Formspree'],
      image: 'images/projects/Web & AI projects/AZ-HIRE-landing-page.png',
      liveUrl: 'https://az-hire-landing-page-5pdj.vercel.app',
    },
    {
      id: 'northwind-admin',
      title: 'White Avenue Group',
      tagline: 'A Portfolio website for a Real estate company.',
      desc: 'White Avenue Group — A premium website for a Nigerian real estate developer, showcasing luxury residential and commercial projects across Abuja. Built to establish brand authority with a refined visual system, project storytelling, awards showcase, and lead-focused CTAs for prospective buyers and investors',
      platform: 'web',
      year: 2025,
      tags: ['Wordpress', 'Elementor'],
      image: 'images/projects/Web & AI projects/white-avenue-estates.png',
      liveUrl: 'https://whiteavenuegroup.com',
    },
    {
      id: 'nacham-tech',
      title: 'Nâcham Technology & Solutions',
      tagline: 'A full custom WordPress theme build for a tech firm.',
      desc: 'Nâcham Technology & Solutions — A premium corporate website for a Nigerian software engineering firm, designed to position the brand as a serious enterprise partner. Built on a fully custom WordPress theme with bespoke templates, dynamic content sections, and a refined visual system that showcases services, products, methodology, and case studies end-to-end',
      platform: 'web',
      year: 2026,
      tags: ['WordPress', 'PHP', 'Custom Theme', 'ACF',],
      image: 'images/projects/Web & AI projects/nacham-tech.png',
      liveUrl: 'https://nachamtns.com',
    },
    {
      id: 'ecom-voice-agent',
      title: 'E-Commerce Customer Service Agent',
      tagline: 'An AI voice agent that answers store customer calls, 24/7.',
      desc: 'An AI-powered customer support assistant for Jumia Nigeria featuring automated order-tracking, instant wallet refunds, and Google Search grounding to retrieve real-time store policies.',
      platform: 'ai',
      year: 2026,
      tags: ['React', 'Gemini API', 'Express', 'Typscript', 'Voice AI'],
      image: 'images/projects/Web & AI projects/jumia-cutomer-service-agent.png',
      liveUrl: 'https://aistudio.google.com/apps/1931db52-3c96-4ba1-8d16-ca0896ff8b0b?fullscreenApplet=true&showPreview=true&showAssistant=true',
    },
    {
      id: 'seo-analyzer',
      title: 'GEO Analyzer',
      tagline: 'An automated tool that audits a website and reports what to fix.',
      desc: 'A modern SEO and AI content optimization suite designed to analyze webpage architecture, audit technical search parameters, and evaluate competitor strategies. It leverages generative AI to instantly upgrade copywriting readability and simulate search previews for next-generation AI-driven search engines.',
      platform: 'ai',
      year: 2026,
      tags: ['React', 'Gemini API', 'Express', 'Typscript', 'HTML5', 'Tailwind CSS', 'SEO Analyzer', 'Cheerio', 'Scraping', 'Recharts'],
      image: 'images/projects/Web & AI projects/GEOAnalyzer.png',
      liveUrl: 'https://aistudio.google.com/apps/d523c6b2-9416-4644-95b0-a43240180e04?fullscreenApplet=true&showPreview=true&showAssistant=true',
    },
  ];

  /* ---------- Render: projects grid ---------- */
  const platformIcon = {
    mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 5.5L20 9.5l-5.6 2L12 17l-2.4-5.5L4 9.5l5.6-2z"/></svg>',
  };
  const platformLabel = { mobile: 'Mobile', web: 'Web', ai: 'AI Automation' };

  // Icon shown on each card's action button (depends on platform)
  const ctaIcon = {
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  };
  const ctaLabel = { web: 'View Live', mobile: 'View Screenshots' };

  const projectsGrid = $('#projectsGrid');
  if (projectsGrid) {
    const frag = document.createDocumentFragment();
    PROJECTS.forEach((p) => {
      const isMobile = p.platform === 'mobile';
      // A single cover photo per card: first screenshot for mobile apps,
      // the dedicated `image` path for web/AI projects.
      const coverPath = isMobile ? (p.images && p.images[0]) : p.image;

      const card = document.createElement('article');
      card.className = 'project-card reveal';
      card.dataset.projectId = p.id;
      card.innerHTML = `
        <div class="project-card__cover">
          <div class="project-card__cover-inner" style="--cover-gradient: ${p.gradient}">
            <div class="project-card__cover-bg"></div>
            <img class="project-card__cover-img" alt="" loading="lazy" decoding="async" />
          </div>
          <span class="project-card__platform project-card__platform--${p.platform}">
            ${platformIcon[p.platform] || ''}
            ${platformLabel[p.platform] || p.platform}
          </span>
          <span class="project-card__year">${p.year}</span>
        </div>
        <div class="project-card__body">
          <h3 class="project-card__title">${p.title}</h3>
          <p class="project-card__desc">${p.desc}</p>
          <div class="project-card__tags">
            ${p.tags.map((t) => `<span class="project-card__tag">${t}</span>`).join('')}
          </div>
          <div class="project-card__footer">
            ${isMobile
          ? `<button type="button" class="project-card__cta" data-carousel-id="${p.id}">
                   ${ctaLabel.mobile}
                   ${ctaIcon.mobile}
                 </button>`
          : `<a class="project-card__cta" href="${p.liveUrl || '#'}" target="_blank" rel="noopener">
                   ${ctaLabel.web}
                   ${ctaIcon.web}
                 </a>`}
          </div>
        </div>
      `;
      // Loads the cover photo, or a labeled placeholder if it's missing
      const img = card.querySelector('.project-card__cover-img');
      setImg(img, coverPath, `${p.title} cover photo`, p.gradient, coverPath);
      if (window.revealObserver) {
        window.revealObserver.observe(card);
      } else {
        card.classList.add('is-visible');
      }
      frag.appendChild(card);
    });
    projectsGrid.appendChild(frag);
  }

  /* ---------- Lightbox (photo tiles + mobile app screenshot carousel) ---------- */
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxClose = $('#lightboxClose');
  const lightboxPrev = $('#lightboxPrev');
  const lightboxNext = $('#lightboxNext');
  const lightboxCounter = $('#lightboxCounter');

  // Carousel state: null when viewing a single photo, otherwise
  // { images: [{path, alt}], index, gradient } for a multi-image gallery.
  let carouselState = null;

  function renderLightboxImage() {
    if (!lightboxImg || !carouselState) return;
    const item = carouselState.images[carouselState.index];
    if (lightboxCounter) {
      lightboxCounter.textContent = `${carouselState.index + 1} / ${carouselState.images.length}`;
    }
    lightboxImg.classList.remove('is-loaded');
    setImg(lightboxImg, item.path, item.alt, carouselState.gradient, item.path);
    if (lightboxCaption) lightboxCaption.textContent = item.alt || '';
  }

  // Opens a single photo (used by the About section's photo tiles).
  function openLightbox(path, alt, caption) {
    if (!lightbox || !lightboxImg) return;
    carouselState = null;
    lightbox.classList.remove('is-carousel');
    lightboxImg.classList.remove('is-loaded');
    setImg(lightboxImg, path, alt, null, path);
    if (lightboxCaption) lightboxCaption.textContent = caption || alt || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  // Opens the lightbox as a swipeable carousel for a set of screenshot
  // paths. `title` is used to build captions like "WhiteAvenue Website —
  // Screenshot 2", and `gradient` is the fallback shown for any missing file.
  function openCarousel(images, title, gradient, startIndex = 0) {
    if (!lightbox || !lightboxImg || !images || !images.length) return;
    carouselState = {
      images: images.map((path, i) => ({
        path,
        alt: `${title} — Screenshot ${i + 1}`,
      })),
      index: startIndex,
      gradient,
    };
    lightbox.classList.add('is-carousel');
    renderLightboxImage();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function showRelative(delta) {
    if (!carouselState) return;
    const total = carouselState.images.length;
    carouselState.index = (carouselState.index + delta + total) % total;
    renderLightboxImage();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open', 'is-carousel');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    carouselState = null;
  }

  if (lightbox) {
    // Click outside the image to close
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxClose) closeLightbox();
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showRelative(-1); });
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showRelative(1); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showRelative(-1);
      if (e.key === 'ArrowRight') showRelative(1);
    });
    // Delegated open handler for single photo tiles (About section)
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-photo-url]');
      if (!trigger) return;
      e.preventDefault();
      e.stopPropagation();
      openLightbox(trigger.dataset.photoUrl, trigger.dataset.photoAlt || '');
    });
    // Delegated open handler for mobile-project "View Screenshots" buttons
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-carousel-id]');
      if (!trigger) return;
      e.preventDefault();
      const p = PROJECTS.find((x) => x.id === trigger.dataset.carouselId);
      if (p && p.images && p.images.length) {
        openCarousel(p.images, p.title, p.gradient);
      }
    });
  }

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer = null;
  window.showToast = function (msg, ms = 2400) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), ms);
  };

  // Copy email to clipboard
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    e.preventDefault();
    const email = a.getAttribute('href').replace('mailto:', '');
    try {
      await navigator.clipboard.writeText(email);
      window.showToast(`Copied ${email} to clipboard`);
    } catch {
      // Fallback: open the mail client
      window.location.href = a.getAttribute('href');
    }
  });

})();
