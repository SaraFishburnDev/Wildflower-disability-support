(function () {
  'use strict';

  // ─── Configuration ───
  var SHEET_ID = '1AtkWq2Mr6c9MbNRRpxxgQXD550Vk1JhvWh4ghdw6-Cs';
  var BASE = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=';

  var DATA_SOURCES = {
    hero:         BASE + 'hero',
    about:        BASE + 'about',
    values:       BASE + 'values',
    services:     BASE + 'services',
    testimonials: BASE + 'testimonials',
    team:         BASE + 'team',
    contact:      BASE + 'contact',
    cta:          BASE + 'cta',
    footer:       BASE + 'footer'
  };

  // ─── Helpers ───

  function fetchCSV(url) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + url);
        return r.text();
      })
      .then(function (text) {
        return Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: function (h) { return h.trim(); },
          transform: function (v) { return v.trim(); }
        }).data;
      });
  }

  function toKeyValue(rows) {
    var obj = {};
    rows.forEach(function (row) { obj[row.key] = row.value; });
    return obj;
  }

  function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setIcon(id, iconClass) {
    var el = document.getElementById(id);
    if (el) el.className = 'bi ' + iconClass;
  }

  function setAttr(id, attr, value) {
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }

  // ─── Hero ───

  function renderHero(data) {
    var d = toKeyValue(data);
    setText('hero_badge', d.badge);
    setHTML('hero_heading', d.heading);
    setHTML('hero_description', d.description);
    setText('hero_cta_primary', d.cta_primary);
    setText('hero_cta_secondary', d.cta_secondary);
  }

  // ─── About ───

  function renderAbout(data) {
    var d = toKeyValue(data);
    setIcon('about_label_icon', d.label_icon);
    setText('about_label', d.label);
    setHTML('about_heading', d.heading);
    setHTML('about_subtitle', d.subtitle);
    setHTML('about_body', d.body);
    setText('about_cta', d.cta);
  }

  // ─── Values (cards — generated since count is data-driven) ───

  function renderValues(data) {
    var grid = document.getElementById('values_grid');
    if (!grid) return;

    grid.innerHTML = data.map(function (val) {
      return (
        '<div class="col-sm-6">' +
          '<div class="value-card">' +
            '<div class="value-icon"><i class="bi ' + val.icon + '" aria-hidden="true"></i></div>' +
            '<div>' +
              '<h4>' + val.title + '</h4>' +
              '<p>' + val.description + '</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ─── Services (header text + generated cards) ───

  function renderServices(data) {
    var meta = data[0];

    // Section header
    setIcon('services_label_icon', meta.section_label_icon);
    setText('services_label', meta.section_label);
    setHTML('services_heading', meta.section_heading);
    setHTML('services_subtitle', meta.section_subtitle);

    // Service cards
    var grid = document.getElementById('services_grid');
    if (grid) {
      grid.innerHTML = data.map(function (svc, i) {
        return (
          '<div class="col-md-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<a href="?service=' + svc.id + '#contact" class="service-card">' +
              '<div class="service-icon"><i class="bi ' + svc.icon + '" aria-hidden="true"></i></div>' +
              '<h3>' + svc.title + '</h3>' +
              '<p>' + svc.description + '</p>' +
              '<span class="service-link">' +
                'Enquire Now <i class="bi bi-arrow-right" aria-hidden="true"></i>' +
              '</span>' +
            '</a>' +
          '</div>'
        );
      }).join('');
    }

    // Service checkboxes in contact form
    var checkboxes = document.getElementById('serviceCheckboxes');
    if (checkboxes) {
      checkboxes.innerHTML = data.map(function (svc) {
        return (
          '<div class="form-check">' +
            '<input class="form-check-input" type="checkbox" ' +
              'id="service-' + svc.id + '" name="service" value="' + svc.id + '">' +
            '<label class="form-check-label" for="service-' + svc.id + '">' +
              svc.title +
            '</label>' +
          '</div>'
        );
      }).join('') +
      '<div class="form-check">' +
        '<input class="form-check-input" type="checkbox" id="service-other" name="service" value="other">' +
        '<label class="form-check-label" for="service-other">Something Else / Not Sure</label>' +
      '</div>';
    }

    // Footer service links
    var footerSvc = document.getElementById('footer_services');
    if (footerSvc) {
      footerSvc.innerHTML = data.map(function (svc) {
        return '<li><a href="#services">' + svc.title + '</a></li>';
      }).join('');
    }
  }

  // ─── Testimonials (header text + generated cards) ───

  function renderTestimonials(data) {
    var meta = data[0];

    // Section header
    setIcon('testimonials_label_icon', meta.section_label_icon);
    setText('testimonials_label', meta.section_label);
    setHTML('testimonials_heading', meta.section_heading);

    // Testimonial cards
    var grid = document.getElementById('testimonials_grid');
    if (grid) {
      grid.innerHTML = data.map(function (t, i) {
        var starCount = parseInt(t.stars) || 5;
        var stars = '';
        for (var s = 0; s < starCount; s++) {
          stars += '<i class="bi bi-star-fill"></i>';
        }
        return (
          '<div class="col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<div class="testimonial-card">' +
              '<div class="stars" aria-label="' + starCount + ' out of 5 stars">' +
                stars +
              '</div>' +
              '<blockquote>\u201c' + t.quote + '\u201d</blockquote>' +
              '<div class="author">' + t.author + '</div>' +
              '<div class="author-role">' + t.role + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  // ─── Team (header text + generated cards) ───

  function renderTeam(data) {
    var meta = data[0];

    // Section header
    setIcon('team_label_icon', meta.section_label_icon);
    setText('team_label', meta.section_label);
    setHTML('team_heading', meta.section_heading);
    setHTML('team_subtitle', meta.section_subtitle);

    // Team cards
    var grid = document.getElementById('team_grid');
    if (grid) {
      grid.innerHTML = data.map(function (member, i) {
        var photoHtml = member.photo_url
          ? '<img src="' + member.photo_url + '" alt="Photo of ' + member.name + '">'
          : '<i class="bi bi-person-fill" aria-hidden="true"></i>';
        return (
          '<div class="col-md-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<div class="team-card">' +
              '<div class="team-photo" role="img" aria-label="Photo of ' + member.name + '">' +
                photoHtml +
              '</div>' +
              '<div class="team-info">' +
                '<h3>' + member.name + '</h3>' +
                '<span class="team-role">' + member.role + '</span>' +
                '<p>' + member.bio + '</p>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  // ─── Contact ───

  function renderContact(data) {
    var d = toKeyValue(data);

    // Section header
    setIcon('contact_label_icon', d.label_icon);
    setText('contact_label', d.label);
    setHTML('contact_heading', d.heading);
    setHTML('contact_subtitle', d.subtitle);

    // Sidebar
    setText('contact_sidebar_heading', d.sidebar_heading);
    setText('contact_sidebar_text', d.sidebar_text);

    var phoneEl = document.getElementById('contact_phone');
    if (phoneEl) {
      phoneEl.href = 'tel:' + d.phone_link;
      phoneEl.textContent = d.phone;
    }

    var emailEl = document.getElementById('contact_email');
    if (emailEl) {
      emailEl.href = 'mailto:' + d.email;
      emailEl.textContent = d.email;
    }

    setHTML('contact_area', d.area);
    setHTML('contact_hours',
      d.hours_weekday + '<br>' +
      d.hours_saturday + '<br>' +
      d.hours_sunday + '<br><br>' +
      '<strong>' + d.hours_note + '</strong>'
    );

    // Footer contact links
    var fp = document.getElementById('footer_phone');
    if (fp) {
      fp.href = 'tel:' + d.phone_link;
      fp.textContent = d.phone;
    }

    var fe = document.getElementById('footer_email');
    if (fe) fe.href = 'mailto:' + d.email;

    setHTML('footer_area', d.area);
  }

  // ─── CTA Banner ───

  function renderCTA(data) {
    var d = toKeyValue(data);
    setText('cta_heading', d.heading);
    setText('cta_description', d.description);
    setAttr('cta_phone_link', 'href', 'tel:' + d.phone_link);
    setText('cta_phone_display', d.phone_display);
  }

  // ─── Footer ───

  function renderFooter(data) {
    var d = toKeyValue(data);
    setText('footer_description', d.description);
    setText('footer_abn', d.abn);
    setAttr('footer_facebook', 'href', d.facebook);
    setAttr('nav_facebook', 'href', d.facebook);
  }

  // ─── Load All Content ───

  Promise.all([
    fetchCSV(DATA_SOURCES.hero).then(renderHero),
    fetchCSV(DATA_SOURCES.about).then(renderAbout),
    fetchCSV(DATA_SOURCES.values).then(renderValues),
    fetchCSV(DATA_SOURCES.services).then(renderServices),
    fetchCSV(DATA_SOURCES.testimonials).then(renderTestimonials),
    fetchCSV(DATA_SOURCES.team).then(renderTeam),
    fetchCSV(DATA_SOURCES.contact).then(renderContact),
    fetchCSV(DATA_SOURCES.cta).then(renderCTA),
    fetchCSV(DATA_SOURCES.footer).then(renderFooter)
  ])
    .then(function () {
      if (typeof window.initDynamicContent === 'function') {
        window.initDynamicContent();
      }

      // Dismiss loading screen
      var loader = document.getElementById('loadingScreen');
      if (loader) {
        loader.classList.add('fade-out');
        loader.addEventListener('transitionend', function () {
          loader.remove();
        });
      }
    })
    .catch(function (err) {
      console.error('Content loading error:', err);
    });

})();
