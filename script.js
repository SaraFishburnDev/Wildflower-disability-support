// ─── Navbar Scroll Effect ───
const navbar = document.querySelector('.navbar');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 50;
    navbar.classList.toggle('scrolled', scrolled);
    backToTop.classList.toggle('visible', window.scrollY > 400);
});

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

// ─── Fade-up Animation on Scroll ───
const fadeElements = document.querySelectorAll('.fade-up');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

fadeElements.forEach(el => observer.observe(el));

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
