// ─── Navbar Scroll Effect ───
const navbar = document.querySelector('.navbar');
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

// ─── Close mobile nav on link click ───
const navCollapse = document.getElementById('mainNav');
const bsCollapse = new bootstrap.Collapse(navCollapse, { toggle: false });
document.querySelectorAll('#mainNav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 992) {
            bsCollapse.hide();
        }
    });
});

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
        // Focus the first invalid field for accessibility
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
            firstInvalid.focus();
        }
        return;
    }

    // Simulate submission
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Sending...';

    setTimeout(() => {
        form.style.display = 'none';
        formSuccess.classList.add('show');
        formSuccess.focus();
    }, 1200);
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
