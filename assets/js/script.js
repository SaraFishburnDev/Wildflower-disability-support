// ─── Notice Banner Scroll Hide ───
const noticeBanner = document.getElementById('noticeBanner');
(() => {
    let visible = false;
    window.addEventListener('scroll', () => {
        if (noticeBanner.hasAttribute('hidden')) return;
        const y = document.documentElement.scrollTop || document.body.scrollTop;
        if (y > 30 && visible !== false) {
            noticeBanner.classList.add('hide');
            visible = false;
        } else if (y <= 30 && visible !== true) {
            noticeBanner.classList.remove('hide');
            visible = true;
        }
    }, { passive: true });
})();

// ─── Navbar Height Tracking ───
const navbar = document.querySelector('nav.navbar');
(() => {
    const setNavHeight = () => {
        if (!navbar) return;
        document.documentElement.style.setProperty('--navbar-height', navbar.clientHeight + 'px');
    };
    setNavHeight();
    if ('ResizeObserver' in window) {
        new ResizeObserver(setNavHeight).observe(navbar);
    } else {
        window.addEventListener('resize', setNavHeight);
    }
})();

// ─── Navbar Scroll Effect ───
const logoWrapper = document.querySelector('.navbar-logo-wrapper');
const backToTop = document.getElementById('backToTop');

(() => {
    const scrollThreshold = 120;
    const upThreshold = 7;
    const downThreshold = 5;
    const cooldownMs = 400;

    let lastY = document.documentElement.scrollTop || document.body.scrollTop;
    let direction = "up";
    let anchorY = lastY;
    let cooldown = false;

    function setCooldown() {
        cooldown = true;
        setTimeout(() => (cooldown = false), cooldownMs);
    }

    function onScroll() {
        const y = document.documentElement.scrollTop || document.body.scrollTop;

        // Back to top button visibility
        backToTop.classList.toggle('visible', y > 400);

        // Scrolled shadow
        navbar.classList.toggle('scrolled', y > 50);
        logoWrapper.classList.toggle('scrolled', y > 50);

        if (cooldown) return;

        if (y <= scrollThreshold) {
            if (navbar.classList.contains("navbar-scroll")) {
                navbar.classList.remove("navbar-scroll");
                setCooldown();
            }

            lastY = y;
            anchorY = y;
            direction = "up";
            return;
        }

        const nowDir = y > lastY ? "down" : y < lastY ? "up" : direction;

        if (nowDir !== direction) {
            direction = nowDir;
            anchorY = y;
        }

        const delta = y - anchorY;

        if (direction === "down" && delta >= downThreshold) {
            if (!navbar.classList.contains("navbar-scroll")) {
                navbar.classList.add("navbar-scroll");
                setCooldown();
            }
            anchorY = y;
        }

        lastY = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
})();

// ─── Back to Top ───
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Active Nav Link Highlighting ───

function updateActiveNav() {
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');
    const scrollPos = window.scrollY + 120;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
        }
    });
}
window.addEventListener('scroll', updateActiveNav);

// ─── Custom Mobile Menu ───
const menuContainer = document.getElementById('menuContainer');
const menuOverlay = document.getElementById('menuOverlay');
const menuToggleBtn = document.getElementById('menuToggle');
const menuToggleLabel = menuToggleBtn.querySelector('.toggler-label');
const navbarIsland = document.querySelector('.navbar-island');

const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
let focusableEls = [], firstFocusable = null, lastFocusable = null;

const mainContent = document.getElementById('main-content');
const pageFooter = document.querySelector('footer[role="contentinfo"]');
const heroSection = document.querySelector('.hero');

function openMenu() {
    const pad = 12;
    const vw = document.documentElement.clientWidth;
    const islandRect = navbarIsland.getBoundingClientRect();
    menuContainer.style.width = (vw - pad * 2) + 'px';
    menuContainer.style.right = -(vw - pad - islandRect.right) + 'px';
    const openHeight = Math.min(menuContainer.scrollHeight, window.innerHeight - 24);
    menuContainer.style.height = openHeight + 'px';
    menuContainer.classList.add('open');
    menuToggleBtn.classList.add('active');
    menuToggleLabel.textContent = 'CLOSE';
    menuOverlay.style.display = 'block';
    requestAnimationFrame(() => { menuOverlay.style.opacity = '1'; });
    menuToggleBtn.setAttribute('aria-expanded', 'true');
    menuContainer.setAttribute('aria-hidden', 'false');

    // Hide background content from screen readers
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    if (pageFooter) pageFooter.setAttribute('aria-hidden', 'true');
    if (heroSection) heroSection.setAttribute('aria-hidden', 'true');

    focusableEls = [...menuContainer.querySelectorAll(focusableSelector)];
    firstFocusable = focusableEls[0];
    lastFocusable = focusableEls[focusableEls.length - 1];
    if (firstFocusable) firstFocusable.focus();
}

function closeMenu(returnFocus) {
    menuContainer.style.width = '';
    menuContainer.style.height = '';
    menuContainer.style.right = '';
    menuContainer.classList.remove('open');
    menuToggleBtn.classList.remove('active');
    menuToggleLabel.textContent = 'MENU';
    menuOverlay.style.opacity = '0';
    setTimeout(() => { menuOverlay.style.display = 'none'; }, 400);
    menuToggleBtn.setAttribute('aria-expanded', 'false');
    menuContainer.setAttribute('aria-hidden', 'true');

    // Restore background content to screen readers
    if (mainContent) mainContent.removeAttribute('aria-hidden');
    if (pageFooter) pageFooter.removeAttribute('aria-hidden');
    if (heroSection) heroSection.removeAttribute('aria-hidden');

    if (returnFocus !== false) menuToggleBtn.focus();
}

function toggleMenu() {
    menuContainer.classList.contains('open') ? closeMenu() : openMenu();
}

menuToggleBtn.addEventListener('click', toggleMenu);
menuOverlay.addEventListener('click', () => closeMenu());

menuContainer.addEventListener('keydown', (e) => {
    if (!menuContainer.classList.contains('open')) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
    }

    if (e.key === 'Tab' && focusableEls.length > 1) {
        if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
        }
    }
});

// Close menu & instant scroll on menu link click (event delegation for dynamic links)
menuContainer.addEventListener('click', (e) => {
    const link = e.target.closest('.menu-link');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
        e.preventDefault();
        closeMenu(false);
        const target = document.querySelector(href);
        if (target) {
            // Re-trigger fade-in for the target section (respects reduced motion)
            const prefersMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersMotion) {
                const fadeEls = target.querySelectorAll('.fade-up.visible');
                fadeEls.forEach(el => el.classList.remove('visible'));
                window.scrollTo({ top: target.offsetTop - 90, behavior: 'instant' });
                requestAnimationFrame(() => {
                    fadeEls.forEach(el => el.classList.add('visible'));
                });
            } else {
                window.scrollTo({ top: target.offsetTop - 90, behavior: 'instant' });
            }
        }
    }
});

// ─── Mobile header contact button instant scroll ───
// The [data-nav-cta] href is updated dynamically by content.js renderNav,
// so we just read it at click time.
const mobileContactBtn = document.getElementById('mobileContactBtn');
if (mobileContactBtn) {
    mobileContactBtn.addEventListener('click', (e) => {
        if (window.innerWidth < 992) {
            e.preventDefault();
            const href = mobileContactBtn.getAttribute('href');
            const target = href ? document.querySelector(href) : null;
            if (target) {
                window.scrollTo({ top: target.offsetTop - 90, behavior: 'instant' });
            }
        }
    });
}

// ─── Dynamic Content Initialization ───
// Called by content.js after CSV content has been rendered into the DOM
window.initDynamicContent = function(sectionIdMap) {
    sectionIdMap = sectionIdMap || {};
    const contactSelector = sectionIdMap.contact || '#contact';

    // Fade-up Animation on Scroll
    const fadeElements = document.querySelectorAll('.fade-up:not(.observed)');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    fadeElements.forEach(el => {
        el.classList.add('observed');
        observer.observe(el);
    });

    // Service Enquiry Links
    function checkService(value) {
        const cb = document.getElementById(`service-${value}`);
        if (cb) cb.checked = true;
    }

    // Handle ?service= URL param on page load
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service');
    if (service) {
        checkService(service);
        setTimeout(() => {
            const contactEl = document.querySelector(contactSelector);
            if (contactEl) contactEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Intercept enquire links so they don't cause a full page reload
    // Only targets <a> service cards (those without description_full)
    document.querySelectorAll('a.service-card[href*="?service="]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = new URL(link.href);
            const svc = url.searchParams.get('service');
            if (svc) {
                checkService(svc);
                history.replaceState(null, '', `?service=${svc}${contactSelector}`);
            }
            const contactEl = document.querySelector(contactSelector);
            if (contactEl) contactEl.scrollIntoView({ behavior: 'smooth' });
        });
    });
};

// ─── Share Widget ───
(() => {
    const shareTrigger = document.getElementById('shareTrigger');
    const shareTray = document.getElementById('shareTray');
    const shareMobile = document.querySelector('.share-mobile');

    function closeTray() {
        if (!shareTray) return;
        shareTray.classList.remove('open');
        if (shareTrigger) {
            shareTrigger.setAttribute('aria-expanded', 'false');
        }
        shareTray.setAttribute('aria-hidden', 'true');
    }

    // Mobile tray toggle
    if (shareTrigger) {
        shareTrigger.addEventListener('click', () => {
            const isOpen = shareTray.classList.toggle('open');
            shareTrigger.setAttribute('aria-expanded', String(isOpen));
            shareTray.setAttribute('aria-hidden', String(!isOpen));
        });
    }

    // Close tray on outside click
    document.addEventListener('click', (e) => {
        if (shareMobile && !shareMobile.contains(e.target)) {
            closeTray();
        }
    });

    // Close tray on scroll
    window.addEventListener('scroll', closeTray, { passive: true });

    // Close tray after tray action click (for link-based actions)
    if (shareTray) {
        shareTray.querySelectorAll('a.share-tray-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(closeTray, 300);
            });
        });
    }

    // Copy Link — desktop & mobile
    function handleCopy(btn) {
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(window.location.href).then(() => {
                const icon = btn.querySelector('i');
                const label = btn.querySelector('.share-label') || btn.childNodes[btn.childNodes.length - 1];
                const origIconClass = icon.className;

                // Desktop button
                if (btn.querySelector('.share-label')) {
                    const labelEl = btn.querySelector('.share-label');
                    const origLabel = labelEl.textContent;
                    icon.className = 'bi bi-check-lg';
                    labelEl.textContent = 'Copied!';
                    setTimeout(() => {
                        icon.className = origIconClass;
                        labelEl.textContent = origLabel;
                    }, 2000);
                } else {
                    // Mobile button — text node after icon
                    const origText = btn.textContent;
                    icon.className = 'bi bi-check-lg';
                    // Clear text nodes after icon
                    while (icon.nextSibling) btn.removeChild(icon.nextSibling);
                    btn.append(' Copied!');
                    setTimeout(() => {
                        icon.className = origIconClass;
                        while (icon.nextSibling) btn.removeChild(icon.nextSibling);
                        btn.append(' Copy Link');
                    }, 2000);
                }

                // Close mobile tray after copy
                setTimeout(closeTray, 300);
            });
        });
    }

    handleCopy(document.getElementById('shareCopyDesktop'));
    handleCopy(document.getElementById('shareCopyMobile'));

    // Measure each desktop pill's natural width and set a CSS variable
    document.querySelectorAll('.share-desktop .share-btn').forEach(btn => {
        const label = btn.querySelector('.share-label');
        if (!label) return;
        // Temporarily make label visible and measurable
        label.style.opacity = '1';
        label.style.position = 'absolute';
        label.style.visibility = 'hidden';
        label.style.whiteSpace = 'nowrap';
        const textW = label.offsetWidth;
        label.style.opacity = '';
        label.style.position = '';
        label.style.visibility = '';
        label.style.whiteSpace = '';
        // icon (20px) + gap (10px) + text + padding (12px each side)
        const openW = 20 + 10 + textW + 24 + 4; // +4 breathing room
        btn.style.setProperty('--share-open-w', openW + 'px');
    });
})();

// ─── Form Validation & Submission ───
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
const resetFormBtn = document.getElementById('resetFormBtn');

form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
            firstInvalid.focus();
        }
        return;
    }

    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Sending...';

    // Submit to Google Forms via fetch (no cookies, like curl)
    const params = new URLSearchParams();
    params.append('entry.1485367225', document.getElementById('firstName').value);
    params.append('entry.50102404', document.getElementById('lastName').value);
    params.append('entry.1058667171', document.getElementById('email').value);
    params.append('entry.1235825412', document.getElementById('phone').value);
    params.append('entry.1817018428', document.getElementById('message').value);

    // Collect checked service labels to match Google Form option text
    document.querySelectorAll('#serviceCheckboxes input[type="checkbox"]:checked').forEach(cb => {
        const label = document.querySelector('label[for="' + cb.id + '"]');
        if (label) params.append('entry.1659227597', label.textContent.trim());
    });

    fetch('https://docs.google.com/forms/d/e/1FAIpQLSe9D0F7fN-FBGwx7EnUysipzedEHDWBbKJae9i1Kk9CjUrOsg/formResponse', {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'omit',
        body: params
    }).finally(() => {
        form.style.display = 'none';
        formSuccess.classList.add('show');
        formSuccess.focus();
    });
});

resetFormBtn.addEventListener('click', () => {
    form.reset();
    form.classList.remove('was-validated');
    form.style.display = 'block';
    formSuccess.classList.remove('show');
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-send-fill" aria-hidden="true"></i> Send Your Message';
    form.querySelector('input').focus();
});
