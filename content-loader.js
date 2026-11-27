/* ============================================================
   CONTENT LOADER
   Fetches content.json and populates all pages dynamically
   ============================================================ */

(() => {
    'use strict';

    let content = null;

    async function loadContent() {
        try {
            const res = await fetch('content.json?v=' + Date.now());
            if (!res.ok) throw new Error('Failed to load content.json');
            content = await res.json();
            populatePage();
        } catch (err) {
            console.error('Content loader error:', err);
        }
    }

    function getValue(obj, path, fallback = '') {
        return path.split('.').reduce((o, k) => (o || {})[k], obj) ?? fallback;
    }

    function setText(selector, text) {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
    }

    function setHtml(selector, html) {
        const el = document.querySelector(selector);
        if (el) el.innerHTML = html;
    }

    function setAttr(selector, attr, value) {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, value);
    }

    function populatePage() {
        if (!content) return;

        const site = content.site || {};
        const hero = site.hero || {};

        // ---- SITE-WIDE (all pages) ----
        // Title & meta
        document.title = `${site.name} — ${site.role}`;
        setAttr('meta[name="description"]', 'content', hero.lede || '');

        // Rail / sidebar
        setText('.rail__name', site.name);
        setText('.rail__role', site.role);
        setText('.rail__handle', site.handle);

        // Social links
        const social = site.social || {};
        setAttr('.rail__social a[aria-label="GitHub"]', 'href', social.github);
        setAttr('.rail__social a[aria-label="LinkedIn"]', 'href', social.linkedin);
        setAttr('.rail__social a[aria-label="Facebook"]', 'href', social.facebook);
        setAttr('.rail__social a[aria-label="X"]', 'href', social.twitter);

        // Footer copyright
        const year = new Date().getFullYear();
        setHtml('.rail__foot', `© ${year}<br>All rights reserved.`);

        // ---- PAGE-SPECIFIC ----
        const path = window.location.pathname;

        if (path.endsWith('index.html') || path === '/' || path === '') {
            populateIndex();
        } else if (path.endsWith('projects.html')) {
            populateProjectsPage();
        } else if (path.endsWith('services.html')) {
            populateServicesPage();
        } else if (path.endsWith('about.html')) {
            populateAboutPage();
        } else if (path.endsWith('contact.html')) {
            populateContactPage();
        }

        // Re-run project filters after content loads
        if (window.initProjectFilters) window.initProjectFilters();
    }

    // ============================================================
    // INDEX / HOME PAGE
    // ============================================================
    function populateIndex() {
        const site = content.site || {};
        const hero = site.hero || {};
        const projects = content.projects || [];
        const tools = site.tools || [];

        // Hero
        setText('.status', hero.status);
        setHtml('.intro__text h1', `<span class="intro__line--light">${hero.headlineLight}</span><span class="intro__line--heavy">${hero.headlineHeavy}</span>`);
        setText('.intro__lede', hero.lede);

        // Avatar (background image stays from CSS)

        // Tools marquee
        const marqueeGroups = document.querySelectorAll('.marquee__group');
        const toolItems = tools.map(t => `<li>${t}</li>`).join('');
        marqueeGroups.forEach(group => {
            group.innerHTML = toolItems;
        });

        // Projects section (featured 3 on home)
        populateProjectGallery(projects.slice(0, 3), '.project-gallery');

        // Services preview (first 4 on home)
        populateServicesPreview(content.services?.cards?.slice(0, 4) || []);
    }

    // ============================================================
    // PROJECTS PAGE
    // ============================================================
    function populateProjectsPage() {
        const projects = content.projects || [];
        populateProjectGallery(projects, '.project-gallery');
        setText('.project-count', `${projects.length} project${projects.length !== 1 ? 's' : ''}`);
        setText('.rail__nav a[href*="projects"] .rail__badge', String(projects.length).padStart(2, '0'));
    }

    function populateProjectGallery(projects, containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        container.innerHTML = projects.map((p, i) => renderProjectTile(p, i)).join('');

        // Add visual content to each tile
        projects.forEach((p, i) => {
            const tile = container.querySelectorAll('.project-tile')[i];
            if (tile && p.visual) {
                renderProjectVisual(tile.querySelector('.project-visual'), p.visual);
            }
        });
    }

    function renderProjectTile(p, index) {
        const isFeatured = index === 0;
        const tags = (p.tags || []).join(' ');
        const meta = `${p.number} / ${p.type}`;
        const stack = (p.stack || []).map(s => `<li>${s}</li>`).join('');

        return `
            <article class="project-tile ${isFeatured ? 'project-tile--featured' : ''}" data-tags="${tags}">
                <div class="project-visual project-visual--${p.visual?.type || 'catalog'}" aria-hidden="true"></div>
                <div class="project-tile__body">
                    <div class="project-tile__meta"><span>${meta}</span><span>${p.year}</span></div>
                    <h${isFeatured ? '3' : '2'}>${p.title}</h${isFeatured ? '3' : '2'}>
                    <p>${p.description}</p>
                    <ul class="project-stack">${stack}</ul>
                    <a class="project-action" href="${p.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub profile <span aria-hidden="true">↗</span></a>
                </div>
            </article>
        `;
    }

    function renderProjectVisual(container, visual) {
        if (!container || !visual) return;

        const v = visual;
        switch (v.type) {
            case 'catalog':
                container.innerHTML = `
                    <div class="mockup-window">
                        <div class="mockup-toolbar"><span></span><span></span><span></span><b>${v.title || 'campus / enrollment'}</b></div>
                        <div class="catalog-layout">
                            <div class="catalog-rail"><i></i><i></i><i></i><i></i></div>
                            <div class="catalog-main">
                                <p>${v.term || 'SPRING TERM / 2025'}</p>
                                <strong>${v.heading || 'Course catalog'}</strong>
                                <div class="catalog-summary">
                                    ${(v.summary || []).map(s => `<span>${s}</span>`).join('')}
                                </div>
                                ${(v.rows || []).map(r => `
                                    <div class="catalog-row"><b>${r.code}</b><span>${r.name}</span><small>${r.seats}</small></div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'inventory':
                container.innerHTML = `
                    <div class="inventory-window">
                        <div class="inventory-top"><span>${v.title || 'STOCKROOM'}</span><span>${v.subtitle || 'All locations⌄'}</span></div>
                        <p class="inventory-heading">${v.heading || 'Today at a glance'}</p>
                        <div class="inventory-metrics">
                            ${(v.metrics || []).map(m => `<div><small>${m.label}</small><b>${m.value}</b></div>`).join('')}
                        </div>
                        <div class="inventory-chart">
                            ${Array.from({ length: v.chartBars || 12 }, () => '<i></i>').join('')}
                        </div>
                        <div class="inventory-list">
                            <span>Product</span><span>On hand</span>
                            ${(v.items || []).map(i => `<b>${i.name}</b><b>${i.stock}</b>`).join('')}
                        </div>
                    </div>
                `;
                break;

            case 'api':
                container.innerHTML = `
                    <div class="api-window">
                        <div class="api-toolbar"><span>${v.title || 'API CONSOLE'}</span><span>${v.env || 'v1 / production'}</span></div>
                        <div class="api-request"><b>${v.request?.method || 'GET'}</b><span>${v.request?.path || '/api/v1/enrollments'}</span><i>${v.request?.status || '200 OK'}</i></div>
                        <div class="api-code"><pre>${v.response || '{ "status": "success", "count": 24 }'}</pre></div>
                        <div class="api-latency"><span>LATENCY <b>${v.latency || '42 ms'}</b></span><span>RATE LIMIT <b>${v.rateLimit || '98%'}</b></span></div>
                    </div>
                `;
                break;
        }
    }

    // ============================================================
    // SERVICES PAGE
    // ============================================================
    function populateServicesPage() {
        const services = content.services || {};

        // Process steps
        const stepsContainer = document.querySelector('.steps');
        if (stepsContainer && services.process) {
            stepsContainer.innerHTML = services.process.map(s => `
                <li class="step">
                    <span class="step__num">${s.step}</span>
                    <h3>${s.title}</h3>
                    <p>${s.description}</p>
                </li>
            `).join('');
        }

        // Service cards
        const cardsContainer = document.querySelector('.cards');
        if (cardsContainer && services.cards) {
            cardsContainer.innerHTML = services.cards.map(c => `
                <article class="card cap">
                    <h2>${c.title}</h2>
                    <p>${c.description}</p>
                    <ul class="cap__list">
                        ${(c.items || []).map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </article>
            `).join('');
        }
    }

    function populateServicesPreview(cards) {
        const container = document.querySelector('.cards');
        if (!container || !cards.length) return;

        container.innerHTML = cards.map(c => `
            <article class="card cap">
                <h3>${c.title}</h3>
                <p>${c.description}</p>
                <ul class="cap__list">
                    ${(c.items || []).map(i => `<li>${i}</li>`).join('')}
                </ul>
            </article>
        `).join('');
    }

    // ============================================================
    // ABOUT PAGE
    // ============================================================
    function populateAboutPage() {
        const about = content.about || {};
        const story = about.story || {};
        const skills = about.skills || {};
        const facts = about.facts || [];

        // Story
        setText('.card--about .card__lead', story.lead);
        const storyParas = document.querySelector('.card--about');
        if (storyParas && story.paragraphs) {
            const pTags = story.paragraphs.map(p => `<p>${p}</p>`).join('');
            const leadEl = storyParas.querySelector('.card__lead');
            if (leadEl) {
                leadEl.insertAdjacentHTML('afterend', pTags);
            }
        }
        setText('.card--about .card__more', 'See how I work');

        // Skills plates
        const platesContainer = document.querySelector('.stack');
        if (platesContainer && skills.plates) {
            platesContainer.innerHTML = skills.plates.map((p, i) => `
                <div class="plate plate--${['back', 'mid', 'front'][i] || 'back'}">
                    <span class="plate__name">${p.name}</span>
                    <span class="plate__detail">${p.detail}</span>
                </div>
            `).join('') + `<p class="stack__caption">${skills.caption || ''}</p>`;
        }

        // Facts
        const factsContainer = document.querySelector('.facts');
        if (factsContainer && facts.length) {
            factsContainer.innerHTML = facts.map(f => `
                <div class="fact">
                    <dt>${f.label}</dt>
                    <dd>${f.value}</dd>
                </div>
            `).join('');
        }
    }

    // ============================================================
    // CONTACT PAGE
    // ============================================================
    function populateContactPage() {
        const contact = content.contact || {};

        // Header
        setText('.page-head h1', contact.headline);
        setText('.page-head__lede', contact.lede);

        // Contact actions
        setAttr('.contact-actions a[href^="mailto:"]', 'href', `mailto:${contact.email}`);
        setAttr('.contact-actions a[download]', 'href', contact.resumeUrl);

        // Availability
        setText('.card--contact p', contact.availability);

        // FAQs
        const faqContainer = document.querySelector('.faq');
        if (faqContainer && contact.faqs) {
            faqContainer.innerHTML = contact.faqs.map(f => `
                <details>
                    <summary>${f.question}</summary>
                    <p>${f.answer}</p>
                </details>
            `).join('');
        }

        // Footer links
        const social = (content.site || {}).social || {};
        const footLinks = document.querySelector('.page-foot');
        if (footLinks) {
            footLinks.innerHTML = `Prefer a different route? Everything is in the rail: <a href="${social.github}" target="_blank" rel="noopener noreferrer">GitHub</a>, <a href="${social.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a>, or <a href="${social.twitter}" target="_blank" rel="noopener noreferrer">X</a>.`;
        }
    }

    // ============================================================
    // INIT
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadContent);
    } else {
        loadContent();
    }

    // Expose for project filters script
    window.contentLoader = { loadContent };
})();