// ─── Navbar Scroll Effect ───
const navbar = document.querySelector('.navbar');
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
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');

function updateActiveNav() {
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

function openMenu() {
    const container = navbarIsland.closest('.container');
    const cs = getComputedStyle(container);
    const containerWidth = container.offsetWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    menuContainer.style.width = containerWidth + 'px';
    const openHeight = Math.min(menuContainer.scrollHeight, window.innerHeight - 24);
    menuContainer.style.height = openHeight + 'px';
    menuContainer.classList.add('open');
    menuToggleBtn.classList.add('active');
    menuToggleLabel.textContent = 'CLOSE';
    menuOverlay.style.display = 'block';
    requestAnimationFrame(() => { menuOverlay.style.opacity = '1'; });
    menuToggleBtn.setAttribute('aria-expanded', 'true');

    focusableEls = [...menuContainer.querySelectorAll(focusableSelector)];
    firstFocusable = focusableEls[0];
    lastFocusable = focusableEls[focusableEls.length - 1];
    if (firstFocusable) firstFocusable.focus();
}

function closeMenu(returnFocus) {
    menuContainer.style.width = '';
    menuContainer.style.height = '';
    menuContainer.classList.remove('open');
    menuToggleBtn.classList.remove('active');
    menuToggleLabel.textContent = 'MENU';
    menuOverlay.style.opacity = '0';
    setTimeout(() => { menuOverlay.style.display = 'none'; }, 400);
    menuToggleBtn.setAttribute('aria-expanded', 'false');
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

// Close menu & instant scroll on menu link click
document.querySelectorAll('#menuContainer .menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            closeMenu(false);
            const target = document.querySelector(href);
            if (target) {
                window.scrollTo({ top: target.offsetTop - 90, behavior: 'instant' });
            }
        }
    });
});

// ─── Mobile header contact button instant scroll ───
const mobileContactBtn = document.getElementById('mobileContactBtn');
if (mobileContactBtn) {
    mobileContactBtn.addEventListener('click', (e) => {
        if (window.innerWidth < 992) {
            e.preventDefault();
            const target = document.querySelector('#contact');
            if (target) {
                window.scrollTo({ top: target.offsetTop - 90, behavior: 'instant' });
            }
        }
    });
}

// ─── Dynamic Content Initialization ───
// Called by content.js after CSV content has been rendered into the DOM
window.initDynamicContent = function() {
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
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Intercept enquire links so they don't cause a full page reload
    document.querySelectorAll('a.service-card[href*="?service="]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = new URL(link.href);
            const svc = url.searchParams.get('service');
            if (svc) {
                checkService(svc);
                history.replaceState(null, '', `?service=${svc}#contact`);
            }
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        });
    });
};

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
