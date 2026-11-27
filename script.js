/* ---------------------------------------------------------------
   Project filters (projects page).

   The rail nav marks the current page from the markup itself with
   aria-current="page", so there is nothing to do here for
   navigation — this script only filters the project cards.
   --------------------------------------------------------------- */

(function () {
    'use strict';

    /* ---------------------------------------------------------------
       Avatar cursor tracking (hero section)
       Snaps cursor direction to a 5x5 pose sheet and eases the avatar's
       physical drift for a "living character" feel.
       --------------------------------------------------------------- */
    var avatar = document.getElementById('portfolio-avatar');

    if (avatar) {
        // Helper to constrain a number between a min and max
        var clamp = function (val, min, max) {
            return Math.max(min, Math.min(max, val));
        };

        // --- Physical drift state (avatar element moves slightly toward cursor) ---
        var targetDriftX = 0;
        var targetDriftY = 0;
        var currentDriftX = 0;
        var currentDriftY = 0;

        var rafId = null;
        var driftSmoothFactor = 0.08;   // physical movement interpolation (slower = more organic)
        var maxDrift = 12;              // max pixels the avatar shifts from center

        function animate() {
            // --- Interpolate physical drift ---
            currentDriftX += (targetDriftX - currentDriftX) * driftSmoothFactor;
            currentDriftY += (targetDriftY - currentDriftY) * driftSmoothFactor;

            var driftSettledX = Math.abs(targetDriftX - currentDriftX) < 0.05;
            var driftSettledY = Math.abs(targetDriftY - currentDriftY) < 0.05;
            if (driftSettledX) currentDriftX = targetDriftX;
            if (driftSettledY) currentDriftY = targetDriftY;

            // --- Apply the eased physical transform ---
            avatar.style.transform = 'translate(' + currentDriftX.toFixed(2) + 'px, ' + currentDriftY.toFixed(2) + 'px)';

            var driftSettled = driftSettledX && driftSettledY;

            if (driftSettled) {
                rafId = null;
            } else {
                rafId = requestAnimationFrame(animate);
            }
        }

        function kick() {
            if (rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        }

        function resetTracking() {
            avatar.style.backgroundPosition = '50% 50%';
            targetDriftX = 0;
            targetDriftY = 0;
            kick();
        }

        window.addEventListener('pointermove', function (e) {
            var rect = avatar.getBoundingClientRect();
            var avatarCenterX = rect.left + rect.width / 2;
            var avatarCenterY = rect.top + rect.height / 2;

            // Calculate pixel distance on the page
            var dx = e.clientX - avatarCenterX;
            var dy = e.clientY - avatarCenterY;
            var distance = Math.hypot(dx, dy);

            // If the cursor is close to the center, point straight ahead (Center: Row 2, Col 2)
            if (distance < 50) {
                resetTracking();
                return;
            }

            // Define distance threshold where the avatar looks at its maximum angle
            var maxRange = 400;

            // Normalize offsets between -1.0 and 1.0 based on that threshold
            var normX = clamp(dx / maxRange, -1, 1);
            var normY = clamp(dy / maxRange, -1, 1);

            // Map -1.0 to 1.0 up to 0 to 4 (for the 5 columns and rows)
            // X maps to columns (left to right)
            var colIndex = Math.round((normX + 1) * 2);
            // Y maps to rows (top to bottom)
            var rowIndex = Math.round((normY + 1) * 2);

            // Snap to a real cell; interpolating background-position would slide across the sheet.
            avatar.style.backgroundPosition = (colIndex * 25) + '% ' + (rowIndex * 25) + '%';

            // --- Physical drift: avatar leans toward cursor ---
            // Clamp drift to maxDrift pixels
            targetDriftX = clamp(normX * maxDrift, -maxDrift, maxDrift);
            targetDriftY = clamp(normY * maxDrift, -maxDrift, maxDrift);

            kick();
        });

        window.addEventListener('pointerleave', resetTracking);
    }

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

    // ============================================================
    // Project Filters (exposed for dynamic content)
    // ============================================================
    function initProjectFilters() {
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
            // Remove existing listeners to avoid duplicates
            chip.replaceWith(chip.cloneNode(true));
        });

        // Re-select after clone
        var newChips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
        newChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                apply(chip.getAttribute('data-filter'));
            });
        });

        apply('all');
    }

    // Expose for content-loader
    window.initProjectFilters = initProjectFilters;

    // Auto-init on load
    initProjectFilters();
})();
