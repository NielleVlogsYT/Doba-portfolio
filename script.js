/* ---------------------------------------------------------------
   Project filters (projects page).

   The rail nav marks the current page from the markup itself with
   aria-current="page", so there is nothing to do here for
   navigation — this script only filters the project cards.
   --------------------------------------------------------------- */

(function () {
    'use strict';

    var railMenu = document.querySelector('.rail__menu');

    if (railMenu && window.matchMedia) {
        var mobileQuery = window.matchMedia('(max-width: 600px)');

        function syncRailMenu() {
            if (mobileQuery.matches) {
                railMenu.removeAttribute('open');
            } else {
                railMenu.setAttribute('open', '');
            }
        }

        syncRailMenu();
        mobileQuery.addEventListener('change', syncRailMenu);
    }

    var sectionLinks = Array.prototype.slice.call(
        document.querySelectorAll('.rail__nav a[href^="#"]')
    );
    var sections = sectionLinks.map(function (link) {
        return document.querySelector(link.getAttribute('href'));
    }).filter(Boolean);

    function setCurrentSection(sectionId) {
        sectionLinks.forEach(function (link) {
            if (link.getAttribute('href') === '#' + sectionId) {
                link.setAttribute('aria-current', 'location');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    sectionLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            var sectionId = link.getAttribute('href').slice(1);
            var section = document.getElementById(sectionId);

            if (railMenu && window.matchMedia('(max-width: 600px)').matches) {
                railMenu.removeAttribute('open');
            }

            if (section) {
                setCurrentSection(sectionId);
            }
        });
    });

    if (sections.length) {
        function updateCurrentSection() {
            var currentId = sections[0].id;
            var threshold = window.innerHeight * 0.35;

            sections.forEach(function (section) {
                if (section.getBoundingClientRect().top <= threshold) {
                    currentId = section.id;
                }
            });

            setCurrentSection(currentId);
        }

        window.addEventListener('scroll', updateCurrentSection, { passive: true });
        updateCurrentSection();
    }

    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-tags]'));
    var status = document.querySelector('.filter-status');

    if (!chips.length || !cards.length) {
        return;
    }

    function apply(filter) {
        var shown = 0;

        chips.forEach(function (chip) {
            chip.setAttribute(
                'aria-pressed',
                String(chip.getAttribute('data-filter') === filter)
            );
        });

        cards.forEach(function (card) {
            var tags = (card.getAttribute('data-tags') || '').split(' ');
            var match = filter === 'all' || tags.indexOf(filter) !== -1;
            card.hidden = !match;
            if (match) {
                shown++;
            }
        });

        if (status) {
            status.textContent =
                shown === 1 ? 'Showing 1 project.' : 'Showing ' + shown + ' projects.';
        }
    }

    chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            apply(chip.getAttribute('data-filter'));
        });
    });

    apply('all');
})();
