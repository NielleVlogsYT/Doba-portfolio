/* ============================================================
   ADMIN PANEL LOGIC
   Loads content.json, handles editing, saves via Vercel API
   ============================================================ */

(() => {
    'use strict';

    // ============================================================
    // STATE
    // ============================================================
    let content = null;
    let dirty = false;
    let activeSection = 'site';

    // ============================================================
    // DOM REFERENCES
    // ============================================================
    const saveBtn = document.getElementById('save-btn');
    const statusEl = document.getElementById('admin-status');
    const navItems = document.querySelectorAll('.admin-nav__item');
    const panels = document.querySelectorAll('.admin-panel');

    // ============================================================
    // UTILITIES
    // ============================================================
    function setStatus(text, isError = false) {
        statusEl.textContent = text;
        statusEl.style.color = isError ? 'var(--danger)' : 'var(--fg-muted)';
    }

    function markDirty() {
        if (!dirty) {
            dirty = true;
            saveBtn.disabled = false;
            setStatus('Unsaved changes');
        }
    }

    function markClean() {
        dirty = false;
        saveBtn.disabled = true;
        setStatus('Saved');
    }

    function getValue(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    function setValue(obj, path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
        target[last] = value;
    }

    function slugify(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    // ============================================================
    // TEMPLATE RENDERING
    // ============================================================
    function renderTemplate(templateId, data = {}) {
        const template = document.getElementById(templateId);
        if (!template) return null;
        const clone = template.content.cloneNode(true);
        const root = clone.querySelector('[draggable="true"], details');
        if (root && data) {
            populateFields(root, data);
        }
        return clone;
    }

    function populateFields(container, data) {
        const inputs = container.querySelectorAll('[name]');
        inputs.forEach(input => {
            const name = input.getAttribute('name');
            const value = data[name];
            if (value !== undefined && value !== null) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else if (input.tagName === 'SELECT') {
                    input.value = value;
                } else if (Array.isArray(value)) {
                    input.value = value.join(input.name === 'stack' ? ', ' : '\n');
                } else {
                    input.value = value;
                }
            }
        });
        // Update project title in summary
        if (data.title) {
            const titleEl = container.querySelector('.list-item__title');
            if (titleEl) titleEl.textContent = data.title;
        }
    }

    function collectFields(container) {
        const data = {};
        const inputs = container.querySelectorAll('[name]');
        inputs.forEach(input => {
            const name = input.getAttribute('name');
            let value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.tagName === 'SELECT') {
                value = input.value;
            } else if (input.name === 'tags') {
                value = input.value.split(/\s+/).filter(Boolean);
            } else if (input.name === 'stack' || input.name === 'items') {
                value = input.value.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                value = input.value;
            }
            setValue(data, name, value);
        });
        return data;
    }

    // ============================================================
    // VISUAL CONFIG FIELDS (Project-specific)
    // ============================================================
    function updateVisualFields(container, visualType) {
        const visualFields = container.querySelector('#visual-fields');
        if (!visualFields) return;

        const templates = {
            catalog: `
                <div class="field-row">
                    <label>Window Title</label>
                    <input type="text" name="visual.title" placeholder="campus / enrollment">
                </div>
                <div class="field-row">
                    <label>Term</label>
                    <input type="text" name="visual.term" placeholder="SPRING TERM / 2025">
                </div>
                <div class="field-row">
                    <label>Heading</label>
                    <input type="text" name="visual.heading" placeholder="Course catalog">
                </div>
                <div class="field-row field-row--full field-row--textarea">
                    <label>Summary (one per line)</label>
                    <textarea name="visual.summary" rows="2" placeholder="12 open sections&#10;4 credits saved"></textarea>
                </div>
                <div class="field-row field-row--full field-row--textarea">
                    <label>Rows (code|name|seats per line)</label>
                    <textarea name="visual.rows" rows="4" placeholder="CS 240|Data structures|08 / 24 seats&#10;CS 315|Database systems|16 / 24 seats"></textarea>
                </div>
            `,
            inventory: `
                <div class="field-row">
                    <label>Window Title</label>
                    <input type="text" name="visual.title" placeholder="STOCKROOM">
                </div>
                <div class="field-row">
                    <label>Subtitle</label>
                    <input type="text" name="visual.subtitle" placeholder="All locations⌄">
                </div>
                <div class="field-row">
                    <label>Heading</label>
                    <input type="text" name="visual.heading" placeholder="Today at a glance">
                </div>
                <div class="field-row field-row--full field-row--textarea">
                    <label>Metrics (label|value per line)</label>
                    <textarea name="visual.metrics" rows="3" placeholder="NET SALES|$8,420&#10;ITEMS LOW|07"></textarea>
                </div>
                <div class="field-row">
                    <label>Chart Bars Count</label>
                    <input type="number" name="visual.chartBars" value="12" min="1" max="20">
                </div>
                <div class="field-row field-row--full field-row--textarea">
                    <label>Items (name|stock per line)</label>
                    <textarea name="visual.items" rows="4" placeholder="Arabica blend|18 units&#10;Oat milk|06 units&#10;Paper cups|42 units"></textarea>
                </div>
            `,
            api: `
                <div class="field-row">
                    <label>Window Title</label>
                    <input type="text" name="visual.title" placeholder="API CONSOLE">
                </div>
                <div class="field-row">
                    <label>Environment</label>
                    <input type="text" name="visual.env" placeholder="v1 / production">
                </div>
                <div class="field-row field-row--full">
                    <label>Request (method|path|status)</label>
                    <input type="text" name="visual.request" placeholder="GET|/api/v1/enrollments|200 OK">
                </div>
                <div class="field-row field-row--full field-row--textarea">
                    <label>Response JSON (pretty printed)</label>
                    <textarea name="visual.response" rows="4" placeholder='{&#10;  "status": "success",&#10;  "count": 24,&#10;  "data": [...]&#10;}'></textarea>
                </div>
                <div class="field-row">
                    <label>Latency</label>
                    <input type="text" name="visual.latency" placeholder="42 ms">
                </div>
                <div class="field-row">
                    <label>Rate Limit</label>
                    <input type="text" name="visual.rateLimit" placeholder="98%">
                </div>
            `
        };

        visualFields.innerHTML = templates[visualType] || templates.catalog;

        // Add change listeners to new fields
        visualFields.querySelectorAll('[name]').forEach(input => {
            input.addEventListener('input', markDirty);
            input.addEventListener('change', markDirty);
        });
    }

    function collectVisualData(container) {
        const visualType = container.querySelector('[name="visual.type"]')?.value || 'catalog';
        const visual = { type: visualType };

        if (visualType === 'catalog') {
            visual.title = container.querySelector('[name="visual.title"]')?.value || '';
            visual.term = container.querySelector('[name="visual.term"]')?.value || '';
            visual.heading = container.querySelector('[name="visual.heading"]')?.value || '';
            visual.summary = (container.querySelector('[name="visual.summary"]')?.value || '').split('\n').filter(Boolean);
            const rowsText = container.querySelector('[name="visual.rows"]')?.value || '';
            visual.rows = rowsText.split('\n').filter(Boolean).map(line => {
                const [code, name, seats] = line.split('|');
                return { code: code?.trim(), name: name?.trim(), seats: seats?.trim() };
            }).filter(r => r.code);
        } else if (visualType === 'inventory') {
            visual.title = container.querySelector('[name="visual.title"]')?.value || '';
            visual.subtitle = container.querySelector('[name="visual.subtitle"]')?.value || '';
            visual.heading = container.querySelector('[name="visual.heading"]')?.value || '';
            const metricsText = container.querySelector('[name="visual.metrics"]')?.value || '';
            visual.metrics = metricsText.split('\n').filter(Boolean).map(line => {
                const [label, value] = line.split('|');
                return { label: label?.trim(), value: value?.trim() };
            }).filter(m => m.label);
            visual.chartBars = parseInt(container.querySelector('[name="visual.chartBars"]')?.value || '12', 10);
            const itemsText = container.querySelector('[name="visual.items"]')?.value || '';
            visual.items = itemsText.split('\n').filter(Boolean).map(line => {
                const [name, stock] = line.split('|');
                return { name: name?.trim(), stock: stock?.trim() };
            }).filter(i => i.name);
        } else if (visualType === 'api') {
            visual.title = container.querySelector('[name="visual.title"]')?.value || '';
            visual.env = container.querySelector('[name="visual.env"]')?.value || '';
            const reqText = container.querySelector('[name="visual.request"]')?.value || '';
            const [method, path, status] = reqText.split('|');
            visual.request = {
                method: method?.trim() || 'GET',
                path: path?.trim() || '/api/v1/enrollments',
                status: status?.trim() || '200 OK'
            };
            visual.response = container.querySelector('[name="visual.response"]')?.value || '';
            visual.latency = container.querySelector('[name="visual.latency"]')?.value || '';
            visual.rateLimit = container.querySelector('[name="visual.rateLimit"]')?.value || '';
        }

        return visual;
    }

    // ============================================================
    // DRAG & DROP SORTING
    // ============================================================
    let draggedItem = null;

    function enableDragSort(list) {
        list.addEventListener('dragstart', e => {
            const item = e.target.closest('[draggable="true"]');
            if (!item) return;
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        list.addEventListener('dragend', e => {
            const item = e.target.closest('[draggable="true"]');
            if (item) item.classList.remove('dragging');
            list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            draggedItem = null;
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const item = e.target.closest('[draggable="true"]');
            if (item && item !== draggedItem) {
                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                item.classList.add('drag-over');
            }
        });

        list.addEventListener('drop', e => {
            e.preventDefault();
            const item = e.target.closest('[draggable="true"]');
            if (item && draggedItem && item !== draggedItem) {
                const items = [...list.querySelectorAll('[draggable="true"]')];
                const fromIdx = items.indexOf(draggedItem);
                const toIdx = items.indexOf(item);
                if (fromIdx < toIdx) {
                    item.after(draggedItem);
                } else {
                    item.before(draggedItem);
                }
                markDirty();
            }
            list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        list.addEventListener('dragleave', e => {
            if (!list.contains(e.relatedTarget)) {
                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            }
        });
    }

    // ============================================================
    // SECTION NAVIGATION
    // ============================================================
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section === activeSection) return;

            navItems.forEach(b => b.classList.toggle('active', b === btn));
            panels.forEach(p => p.classList.toggle('active', p.id === `panel-${section}`));
            activeSection = section;
        });
    });

    // ============================================================
    // LOAD CONTENT
    // ============================================================
    async function loadContent() {
        try {
            setStatus('Loading…');
            const res = await fetch('content.json?v=' + Date.now());
            if (!res.ok) throw new Error('Failed to load content.json');
            content = await res.json();
            populateAllSections();
            markClean();
            setStatus('Ready');
        } catch (err) {
            console.error(err);
            setStatus('Error loading content: ' + err.message, true);
        }
    }

    // ============================================================
    // POPULATE ALL SECTIONS
    // ============================================================
    function populateAllSections() {
        populateSite();
        populateProjects();
        populateServices();
        populateAbout();
        populateContact();
    }

    // --- SITE ---
    function populateSite() {
        const site = content.site;
        if (!site) return;

        // Simple fields
        document.getElementById('site-name').value = site.name || '';
        document.getElementById('site-role').value = site.role || '';
        document.getElementById('site-handle').value = site.handle || '';
        document.getElementById('site-email').value = site.email || '';

        document.getElementById('social-github').value = site.social?.github || '';
        document.getElementById('social-linkedin').value = site.social?.linkedin || '';
        document.getElementById('social-facebook').value = site.social?.facebook || '';
        document.getElementById('social-twitter').value = site.social?.twitter || '';

        document.getElementById('hero-status').value = site.hero?.status || '';
        document.getElementById('hero-headline-light').value = site.hero?.headlineLight || '';
        document.getElementById('hero-headline-heavy').value = site.hero?.headlineHeavy || '';
        document.getElementById('hero-lede').value = site.hero?.lede || '';

        // Tools list
        const toolsList = document.getElementById('tools-list');
        toolsList.innerHTML = '';
        (site.tools || []).forEach((tool, idx) => {
            const node = renderTemplate('tpl-tool', { tool });
            const input = node.querySelector('input');
            input.dataset.index = idx;
            toolsList.appendChild(node);
        });
        enableDragSort(toolsList);
    }

    // --- PROJECTS ---
    function populateProjects() {
        const list = document.getElementById('projects-list');
        list.innerHTML = '';
        (content.projects || []).forEach((project, idx) => {
            const node = renderTemplate('tpl-project', project);
            const details = node.querySelector('details');
            details.dataset.index = idx;

            // Populate visual fields based on type
            const visualType = project.visual?.type || 'catalog';
            details.querySelector('[name="visual.type"]').value = visualType;
            updateVisualFields(details, visualType);
            populateFields(details, project.visual || {});

            // Add visual type change listener
            details.querySelector('[name="visual.type"]').addEventListener('change', e => {
                updateVisualFields(details, e.target.value);
            });

            list.appendChild(node);
        });
        enableDragSort(list);
    }

    // --- SERVICES ---
    function populateServices() {
        // Process steps
        const processList = document.getElementById('process-list');
        processList.innerHTML = '';
        (content.services?.process || []).forEach((step, idx) => {
            const node = renderTemplate('tpl-process', step);
            node.querySelector('[draggable="true"]').dataset.index = idx;
            processList.appendChild(node);
        });
        enableDragSort(processList);

        // Service cards
        const cardsList = document.getElementById('service-cards-list');
        cardsList.innerHTML = '';
        (content.services?.cards || []).forEach((card, idx) => {
            const node = renderTemplate('tpl-service-card', {
                ...card,
                items: card.items?.join('\n') || ''
            });
            node.querySelector('[draggable="true"]').dataset.index = idx;
            cardsList.appendChild(node);
        });
        enableDragSort(cardsList);
    }

    // --- ABOUT ---
    function populateAbout() {
        // Story paragraphs
        const storyParas = document.getElementById('story-paragraphs');
        storyParas.innerHTML = '';
        document.getElementById('story-lead').value = content.about?.story?.lead || '';
        (content.about?.story?.paragraphs || []).forEach((para, idx) => {
            const node = renderTemplate('tpl-story-paragraph', { paragraph: para });
            node.querySelector('[draggable="true"]').dataset.index = idx;
            storyParas.appendChild(node);
        });
        enableDragSort(storyParas);

        // Skills plates
        const skillsPlates = document.getElementById('skills-plates');
        skillsPlates.innerHTML = '';
        (content.about?.skills?.plates || []).forEach((plate, idx) => {
            const node = renderTemplate('tpl-skills-plate', plate);
            node.querySelector('[draggable="true"]').dataset.index = idx;
            skillsPlates.appendChild(node);
        });
        enableDragSort(skillsPlates);

        // Facts
        const factsList = document.getElementById('facts-list');
        factsList.innerHTML = '';
        (content.about?.facts || []).forEach((fact, idx) => {
            const node = renderTemplate('tpl-fact', fact);
            node.querySelector('[draggable="true"]').dataset.index = idx;
            factsList.appendChild(node);
        });
        enableDragSort(factsList);
    }

    // --- CONTACT ---
    function populateContact() {
        document.getElementById('contact-headline').value = content.contact?.headline || '';
        document.getElementById('contact-lede').value = content.contact?.lede || '';
        document.getElementById('contact-email').value = content.contact?.email || '';
        document.getElementById('contact-resume').value = content.contact?.resumeUrl || '';
        document.getElementById('contact-availability').value = content.contact?.availability || '';

        const faqsList = document.getElementById('faqs-list');
        faqsList.innerHTML = '';
        (content.contact?.faqs || []).forEach((faq, idx) => {
            const node = renderTemplate('tpl-faq', faq);
            const details = node.querySelector('details');
            details.dataset.index = idx;
            faqsList.appendChild(node);
        });
        // FAQs don't need drag sort (they're details elements)
    }

    // ============================================================
    // COLLECT ALL DATA
    // ============================================================
    function collectAllData() {
        const data = JSON.parse(JSON.stringify(content)); // Deep clone

        // Site
        data.site.name = document.getElementById('site-name').value;
        data.site.role = document.getElementById('site-role').value;
        data.site.handle = document.getElementById('site-handle').value;
        data.site.email = document.getElementById('site-email').value;
        data.site.social.github = document.getElementById('social-github').value;
        data.site.social.linkedin = document.getElementById('social-linkedin').value;
        data.site.social.facebook = document.getElementById('social-facebook').value;
        data.site.social.twitter = document.getElementById('social-twitter').value;
        data.site.hero.status = document.getElementById('hero-status').value;
        data.site.hero.headlineLight = document.getElementById('hero-headline-light').value;
        data.site.hero.headlineHeavy = document.getElementById('hero-headline-heavy').value;
        data.site.hero.lede = document.getElementById('hero-lede').value;

        // Tools
        data.site.tools = [];
        document.querySelectorAll('#tools-list [draggable="true"]').forEach(item => {
            const val = item.querySelector('input').value.trim();
            if (val) data.site.tools.push(val);
        });

        // Projects
        data.projects = [];
        document.querySelectorAll('#projects-list details').forEach(details => {
            const project = collectFields(details);
            project.visual = collectVisualData(details);
            if (project.id) data.projects.push(project);
        });

        // Services - Process
        data.services.process = [];
        document.querySelectorAll('#process-list [draggable="true"]').forEach(item => {
            const step = collectFields(item);
            if (step.title) data.services.process.push(step);
        });

        // Services - Cards
        data.services.cards = [];
        document.querySelectorAll('#service-cards-list [draggable="true"]').forEach(item => {
            const card = collectFields(item);
            if (card.title) data.services.cards.push(card);
        });

        // About - Story
        data.about.story.lead = document.getElementById('story-lead').value;
        data.about.story.paragraphs = [];
        document.querySelectorAll('#story-paragraphs [draggable="true"]').forEach(item => {
            const val = item.querySelector('textarea').value.trim();
            if (val) data.about.story.paragraphs.push(val);
        });

        // About - Skills
        data.about.skills.plates = [];
        document.querySelectorAll('#skills-plates [draggable="true"]').forEach(item => {
            const plate = collectFields(item);
            if (plate.name) data.about.skills.plates.push(plate);
        });

        // About - Facts
        data.about.facts = [];
        document.querySelectorAll('#facts-list [draggable="true"]').forEach(item => {
            const fact = collectFields(item);
            if (fact.label) data.about.facts.push(fact);
        });

        // Contact
        data.contact.headline = document.getElementById('contact-headline').value;
        data.contact.lede = document.getElementById('contact-lede').value;
        data.contact.email = document.getElementById('contact-email').value;
        data.contact.resumeUrl = document.getElementById('contact-resume').value;
        data.contact.availability = document.getElementById('contact-availability').value;

        // Contact - FAQs
        data.contact.faqs = [];
        document.querySelectorAll('#faqs-list details').forEach(details => {
            const faq = collectFields(details);
            if (faq.question) data.contact.faqs.push(faq);
        });

        return data;
    }

    // ============================================================
    // SAVE TO GITHUB VIA VERCEL API
    // ============================================================
    async function saveContent() {
        if (!dirty) return;

        saveBtn.classList.add('loading');
        setStatus('Saving…');

        try {
            const data = collectAllData();
            const res = await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Save failed');
            }

            content = data;
            markClean();
            setStatus('Saved — Vercel is redeploying');
        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, true);
        } finally {
            saveBtn.classList.remove('loading');
        }
    }

    // ============================================================
    // EVENT LISTENERS - ADD BUTTONS
    // ============================================================
    document.getElementById('add-tool').addEventListener('click', () => {
        const list = document.getElementById('tools-list');
        const node = renderTemplate('tpl-tool', { tool: '' });
        list.appendChild(node);
        markDirty();
    });

    document.getElementById('add-project').addEventListener('click', () => {
        const list = document.getElementById('projects-list');
        const node = renderTemplate('tpl-project', {
            id: '',
            number: String(content.projects.length + 1).padStart(2, '0'),
            type: 'WEB APP',
            year: new Date().getFullYear().toString(),
            title: 'New Project',
            description: '',
            tags: ['web'],
            stack: [],
            githubUrl: '',
            visual: { type: 'catalog' }
        });
        const details = node.querySelector('details');
        updateVisualFields(details, 'catalog');
        list.appendChild(node);
        markDirty();
    });

    document.getElementById('add-process').addEventListener('click', () => {
        const list = document.getElementById('process-list');
        const node = renderTemplate('tpl-process', {
            step: `Step ${content.services.process.length + 1}`,
            title: '',
            description: ''
        });
        list.appendChild(node);
        markDirty();
    });

    document.getElementById('add-service-card').addEventListener('click', () => {
        const list = document.getElementById('service-cards-list');
        const node = renderTemplate('tpl-service-card', {
            title: '',
            description: '',
            items: ''
        });
        list.appendChild(node);
        markDirty();
    });

    document.getElementById('add-story-paragraph').addEventListener('click', () => {
        const list = document.getElementById('story-paragraphs');
        const node = renderTemplate('tpl-story-paragraph', { paragraph: '' });
        list.appendChild(node);
        markDirty();
    });

    document.getElementById('add-fact').addEventListener('click', () => {
        const list = document.getElementById('facts-list');
        const node = renderTemplate('tpl-fact', { label: '', value: '' });
        list.appendChild(node);
        markDirty();
    });

    document.getElementById('add-faq').addEventListener('click', () => {
        const list = document.getElementById('faqs-list');
        const node = renderTemplate('tpl-faq', { question: '', answer: '' });
        list.appendChild(node);
        markDirty();
    });

    // ============================================================
    // EVENT LISTENERS - DELETE BUTTONS (delegated)
    // ============================================================
    document.addEventListener('click', e => {
        if (e.target.matches('.list-item__delete')) {
            const item = e.target.closest('[draggable="true"], details');
            if (item && confirm('Delete this item?')) {
                item.remove();
                markDirty();
            }
        }
    });

    // ============================================================
    // EVENT LISTENERS - INPUT CHANGES (delegated)
    // ============================================================
    document.addEventListener('input', e => {
        if (e.target.matches('input, textarea, select')) {
            // Update project title in summary
            if (e.target.name === 'title') {
                const details = e.target.closest('details');
                if (details) {
                    const titleEl = details.querySelector('.list-item__title');
                    if (titleEl) titleEl.textContent = e.target.value || 'New Project';
                }
            }
            markDirty();
        }
    });

    document.addEventListener('change', e => {
        if (e.target.matches('input, textarea, select')) {
            markDirty();
        }
    });

    // ============================================================
    // SAVE BUTTON
    // ============================================================
    saveBtn.addEventListener('click', saveContent);

    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            if (!saveBtn.disabled) saveContent();
        }
    });

    // ============================================================
    // INIT
    // ============================================================
    loadContent();
})();