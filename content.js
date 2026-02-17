(function () {
  'use strict';

  // ─── Configuration ───
  var SHEET_ID = '1AtkWq2Mr6c9MbNRRpxxgQXD550Vk1JhvWh4ghdw6-Cs';
  var BASE = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&sheet=';

  var DATA_SOURCES = {
    hero:         BASE + 'hero',
    about:        BASE + 'about',
    services:     BASE + 'services',
    testimonials: BASE + 'testimonials',
    team:         BASE + 'team',
    contact:      BASE + 'contact',
    gallery:      BASE + 'gallery',
    cta:          BASE + 'cta',
    footer:       BASE + 'footer'
  };

  // ─── Helpers ───

  var PAPA_OPTS = {
    header: true,
    skipEmptyLines: true,
    transformHeader: function (h) { return h.trim(); },
    transform: function (v) { return v.trim(); }
  };

  function fetchCSV(url) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + url);
        return r.text();
      })
      .then(function (text) {
        return Papa.parse(text, PAPA_OPTS).data;
      });
  }

  /**
   * Fetch a sheet that contains a key-value config section at the top,
   * a "---" separator row, then a data table below.
   * Returns { config: {key: value, ...}, items: [{col: val, ...}, ...] }
   */
  function fetchMixedCSV(url) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + url);
        return r.text();
      })
      .then(function (text) {
        // Parse without headers first so PapaParse handles quoted
        // multi-line fields correctly (text.split('\n') cannot).
        var raw = Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          transform: function (v) { return v.trim(); }
        }).data;

        // Find the separator row (first cell is "---")
        var sepIdx = -1;
        for (var i = 0; i < raw.length; i++) {
          if (raw[i][0] === '---') { sepIdx = i; break; }
        }

        if (sepIdx === -1) {
          // No separator — treat entire sheet as a plain table
          return { config: {}, items: Papa.parse(text, PAPA_OPTS).data };
        }

        // Config section: row 0 is headers, rows 1..sepIdx-1 are data
        var configHeaders = raw[0];
        var config = {};
        for (var c = 1; c < sepIdx; c++) {
          var k = raw[c][configHeaders.indexOf('key')] || raw[c][0];
          var v = raw[c][configHeaders.indexOf('value')] || raw[c][1] || '';
          if (k) config[k] = v;
        }

        // Data section: row after separator is a heading label (skip),
        // next row is column headers, rest is data
        var dataHeaders = raw[sepIdx + 2] || [];
        var items = [];
        for (var d = sepIdx + 3; d < raw.length; d++) {
          var obj = {};
          for (var h = 0; h < dataHeaders.length; h++) {
            if (dataHeaders[h]) obj[dataHeaders[h]] = raw[d][h] || '';
          }
          items.push(obj);
        }

        return { config: config, items: items };
      });
  }

  function toKeyValue(rows) {
    var obj = {};
    rows.forEach(function (row) {
      if (row.key) obj[row.key.trim()] = row.value || '';
    });
    return obj;
  }

  /**
   * Adds markdown-style formatting on top of existing HTML content.
   * Does NOT escape HTML — content from the sheet is trusted.
   */
  function formatText(text) {
    if (!text) return '';
    var s = String(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  function phoneToLink(phone) {
    if (!phone) return '';
    var digits = phone.replace(/[\s\-()]/g, '');
    if (digits.charAt(0) === '0') {
      return '+61' + digits.substring(1);
    }
    return digits;
  }

  function extractImageUrl(value) {
    if (!value) return '';
    var s = value.trim();
    var match = s.match(/^=IMAGE\("([^"]+)"\)/i);
    if (match) s = match[1];
    // Convert any Google Drive URL to a direct-serve thumbnail URL
    var driveMatch = s.match(/drive\.google\.com\/file\/d\/([^/]+)/)
      || s.match(/drive\.google\.com\/uc\?.*id=([^&]+)/)
      || s.match(/drive\.google\.com\/thumbnail\?.*id=([^&]+)/);
    if (driveMatch) return 'https://drive.google.com/thumbnail?id=' + driveMatch[1] + '&sz=w1000';
    return s;
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

  // ─── Image Rendering ───

  function renderImage(selector, url, alt, fancyboxGroup) {
    if (!url) return;
    var placeholder = document.querySelector(selector);
    if (!placeholder) return;
    var img = document.createElement('img');
    img.src = url;
    img.alt = alt || '';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '20px';
    placeholder.innerHTML = '';
    if (fancyboxGroup) {
      var link = document.createElement('a');
      link.href = url;
      link.setAttribute('data-fancybox', fancyboxGroup);
      link.appendChild(img);
      placeholder.appendChild(link);
    } else {
      placeholder.appendChild(img);
    }
    placeholder.style.border = 'none';
    placeholder.style.background = 'none';
    placeholder.style.opacity = '1';
  }

  // ─── Hero ───

  function renderHero(data) {
    var d = toKeyValue(data);
    setText('hero_badge', d.badge);
    setHTML('hero_heading', formatText(d.heading));
    setHTML('hero_description', formatText(d.description));
    setText('hero_cta_primary', d.cta_primary);
    setText('hero_cta_secondary', d.cta_secondary);
    renderImage('.hero-img-placeholder', extractImageUrl(d.hero_image),
      'Wildflower Disability Support Services');
  }

  // ─── About + Values ───

  function renderAbout(config, items) {
    setIcon('about_label_icon', config.label_icon);
    setText('about_label', config.label);
    setHTML('about_heading', formatText(config.heading));
    setHTML('about_subtitle', formatText(config.subtitle));
    setHTML('about_body', formatText(config.body));
    setText('about_cta', config.cta);
    renderImage('#aboutImg1', extractImageUrl(config.about_image),
      'Wildflower Disability Support Services team', 'about-gallery');

    var img2 = extractImageUrl(config.about_image_2);
    var img3 = extractImageUrl(config.about_image_3);
    if (img2 || img3) {
      // Desktop: inside the gallery column, hidden on mobile
      var desktopRow = document.createElement('div');
      desktopRow.className = 'about-gallery-small d-none d-lg-grid';
      if (img2) {
        var dd2 = document.createElement('div');
        dd2.className = 'about-img-placeholder';
        dd2.id = 'aboutImg2Desktop';
        desktopRow.appendChild(dd2);
      }
      if (img3) {
        var dd3 = document.createElement('div');
        dd3.className = 'about-img-placeholder';
        dd3.id = 'aboutImg3Desktop';
        desktopRow.appendChild(dd3);
      }
      document.getElementById('aboutGallery').appendChild(desktopRow);
      if (img2) renderImage('#aboutImg2Desktop', img2, 'Wildflower Disability Support Services', 'about-gallery');
      if (img3) renderImage('#aboutImg3Desktop', img3, 'Wildflower Disability Support Services', 'about-gallery');

      // Mobile: separate column after text, hidden on desktop
      var mobileContainer = document.getElementById('aboutSmallGallery');
      var mobileRow = document.createElement('div');
      mobileRow.className = 'about-gallery-small';
      if (img2) {
        var md2 = document.createElement('div');
        md2.className = 'about-img-placeholder';
        md2.id = 'aboutImg2Mobile';
        mobileRow.appendChild(md2);
      }
      if (img3) {
        var md3 = document.createElement('div');
        md3.className = 'about-img-placeholder';
        md3.id = 'aboutImg3Mobile';
        mobileRow.appendChild(md3);
      }
      mobileContainer.appendChild(mobileRow);
      mobileContainer.classList.remove('d-none');
      if (img2) renderImage('#aboutImg2Mobile', img2, 'Wildflower Disability Support Services', 'about-gallery');
      if (img3) renderImage('#aboutImg3Mobile', img3, 'Wildflower Disability Support Services', 'about-gallery');
    }

    Fancybox.bind('[data-fancybox="about-gallery"]');

    // Values grid (from the data table in the about sheet)
    var grid = document.getElementById('values_grid');
    if (grid) {
      grid.innerHTML = items.map(function (val) {
        return (
          '<div class="col-sm-6">' +
            '<div class="value-card d-flex flex-sm-column flex-lg-row align-items-sm-center align-items-lg-start text-sm-center text-lg-left">' +
              '<div class="value-icon"><i class="bi ' + (val.icon || 'bi-star') + '" aria-hidden="true"></i></div>' +
              '<div>' +
                '<h4>' + val.title + '</h4>' +
                '<p>' + formatText(val.description) + '</p>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  // ─── Services ───

  function renderServices(config, items) {
    // Section header
    setIcon('services_label_icon', config.section_label_icon);
    setText('services_label', config.section_label);
    setHTML('services_heading', formatText(config.section_heading));
    setHTML('services_subtitle', formatText(config.section_subtitle));

    // Service cards
    var grid = document.getElementById('services_grid');
    if (grid) {
      grid.innerHTML = items.map(function (svc, i) {
        return (
          '<div class="col-md-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<a href="?service=' + svc.id + '#contact" class="service-card">' +
              '<div class="service-icon"><i class="bi ' + (svc.icon || 'bi-gear') + '" aria-hidden="true"></i></div>' +
              '<h3>' + svc.title + '</h3>' +
              '<p>' + formatText(svc.description) + '</p>' +
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
      checkboxes.innerHTML = items.map(function (svc) {
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
      footerSvc.innerHTML = items.map(function (svc) {
        return '<li><a href="#services">' + svc.title + '</a></li>';
      }).join('');
    }
  }

  // ─── Testimonials ───

  function renderTestimonials(config, items) {
    // Section header
    setIcon('testimonials_label_icon', config.section_label_icon);
    setText('testimonials_label', config.section_label);
    setHTML('testimonials_heading', formatText(config.section_heading));

    // Testimonial Splide slides
    var container = document.getElementById('testimonials_grid');
    if (container) {
      container.innerHTML = items.map(function (t) {
        var starCount = parseInt(t.stars) || 5;
        var stars = '';
        for (var s = 0; s < starCount; s++) {
          stars += '<i class="bi bi-star-fill"></i>';
        }
        return (
          '<li class="splide__slide">' +
            '<div class="testimonial-card">' +
              '<div class="stars" aria-label="' + starCount + ' out of 5 stars">' +
                stars +
              '</div>' +
              '<blockquote>\u201c' + formatText(t.quote) + '\u201d</blockquote>' +
              '<div class="author">' + t.author + '</div>' +
              '<div class="author-role">' + t.role + '</div>' +
            '</div>' +
          '</li>'
        );
      }).join('');
    }

    // Initialise Splide
    if (typeof Splide !== 'undefined') {
      new Splide('#testimonialSplide', {
        type: 'loop',
        perPage: 2,
        gap: '1.5rem',
        autoplay: true,
        interval: 6000,
        pauseOnHover: true,
        pagination: false,
        breakpoints: {
          991: { perPage: 1 }
        }
      }).mount();
    }
  }

  // ─── Team ───

  function renderTeam(config, items) {
    // Section header
    setIcon('team_label_icon', config.section_label_icon);
    setText('team_label', config.section_label);
    setHTML('team_heading', formatText(config.section_heading));
    setHTML('team_subtitle', formatText(config.section_subtitle));

    // Team cards
    var grid = document.getElementById('team_grid');
    if (grid) {
      grid.innerHTML = items.map(function (member, i) {
        var photoUrl = extractImageUrl(member.photo_url);
        var photoHtml = photoUrl
          ? '<img src="' + photoUrl + '" alt="Photo of ' + member.name + '">'
          : '<i class="bi bi-person-fill" aria-hidden="true"></i>';
        return (
          '<div class="col-md-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<div class="team-card" role="button" tabindex="0" data-team-index="' + i + '" aria-label="Read more about ' + member.name + '">' +
              '<div class="team-photo" role="img" aria-label="Photo of ' + member.name + '">' +
                photoHtml +
              '</div>' +
              '<div class="team-info">' +
                '<h3>' + member.name + '</h3>' +
                '<span class="team-role">' + member.role + '</span>' +
                '<p>' + formatText(member.bio_short) + '</p>' +
                '<span class="team-read-more"><strong>click to read more</strong></span>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      // Team modal click handlers
      grid.addEventListener('click', function (e) {
        var card = e.target.closest('.team-card');
        if (!card) return;
        var idx = parseInt(card.getAttribute('data-team-index'), 10);
        openTeamModal(items[idx]);
      });
      grid.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          var card = e.target.closest('.team-card');
          if (!card) return;
          e.preventDefault();
          var idx = parseInt(card.getAttribute('data-team-index'), 10);
          openTeamModal(items[idx]);
        }
      });
    }
  }

  function openTeamModal(member) {
    console.log('Team member data:', member);
    var photoUrl = extractImageUrl(member.photo_url);
    var photoHtml = photoUrl
      ? '<img src="' + photoUrl + '" alt="Photo of ' + member.name + '">'
      : '<div class="team-modal-icon"><i class="bi bi-person-fill" aria-hidden="true"></i></div>';

    var html =
      '<div class="team-modal-content">' +
        '<div class="team-modal-photo">' + photoHtml + '</div>' +
        '<div class="team-modal-body">' +
          '<h3>' + member.name + '</h3>' +
          '<span class="team-role">' + member.role + '</span>' +
          '<div class="team-modal-bio">' + formatText(member.bio_full || member.bio_short) + '</div>' +
        '</div>' +
      '</div>';

    Fancybox.show([{ src: html, type: 'html' }], {
      mainClass: 'team-fancybox',
      closeButton: 'top',
    });
  }

  // ─── Gallery ───

  function renderGallery(config, items) {
    // Section header
    setIcon('gallery_label_icon', config.section_label_icon);
    setText('gallery_label', config.section_label);
    setHTML('gallery_heading', formatText(config.section_heading));
    setHTML('gallery_subtitle', formatText(config.section_subtitle));

    // Gallery slides
    var container = document.getElementById('gallery_grid');
    if (container) {
      container.innerHTML = items.map(function (item) {
        var imgUrl = extractImageUrl(item.image_url);
        if (!imgUrl) return '';
        var caption = item.caption || '';
        var alt = item.alt || caption || 'Gallery image';
        var captionHtml = caption
          ? '<div class="gallery-slide-caption">' + caption + '</div>'
          : '';
        return (
          '<li class="splide__slide">' +
            '<div class="gallery-slide">' +
              '<a href="' + imgUrl + '" data-fancybox="gallery"' +
                (caption ? ' data-caption="' + caption.replace(/"/g, '&quot;') + '"' : '') + '>' +
                '<img src="' + imgUrl + '" alt="' + alt.replace(/"/g, '&quot;') + '" loading="lazy">' +
              '</a>' +
              captionHtml +
            '</div>' +
          '</li>'
        );
      }).filter(Boolean).join('');
    }

    // Initialise Splide
    if (typeof Splide !== 'undefined') {
      new Splide('#gallerySplide', {
        type: 'loop',
        perPage: 3,
        gap: '1.5rem',
        autoplay: true,
        interval: 5000,
        pauseOnHover: true,
        pagination: true,
        breakpoints: {
          991: { perPage: 2 },
          575: { perPage: 1 }
        }
      }).mount();
    }

    // Bind Fancybox
    Fancybox.bind('[data-fancybox="gallery"]', {
      mainClass: 'gallery-fancybox',
      Thumbs: { type: 'classic' },
      Toolbar: {
        display: {
          left: [],
          middle: [],
          right: ['close']
        }
      }
    });
  }

  // ─── Contact ───

  function renderContact(data) {
    var d = toKeyValue(data);
    var phoneLinkVal = phoneToLink(d.phone);

    // Section header
    setIcon('contact_label_icon', d.label_icon);
    setText('contact_label', d.label);
    setHTML('contact_heading', formatText(d.heading));
    setHTML('contact_subtitle', formatText(d.subtitle));

    // Sidebar
    setText('contact_sidebar_heading', d.sidebar_heading);
    setText('contact_sidebar_text', d.sidebar_text);

    var phoneEl = document.getElementById('contact_phone');
    if (phoneEl) {
      phoneEl.href = 'tel:' + phoneLinkVal;
      phoneEl.textContent = d.phone;
    }

    var emailEl = document.getElementById('contact_email');
    if (emailEl) {
      emailEl.href = 'mailto:' + d.email;
      emailEl.textContent = d.email;
    }

    setHTML('contact_area', formatText(d.area));
    setHTML('contact_hours',
      formatText(d.hours_weekday) + '<br>' +
      formatText(d.hours_saturday) + '<br>' +
      formatText(d.hours_sunday) + '<br><br>' +
      '<strong>' + formatText(d.hours_note) + '</strong>'
    );

    // Footer contact links
    var fp = document.getElementById('footer_phone');
    if (fp) {
      fp.href = 'tel:' + phoneLinkVal;
      fp.textContent = d.phone;
    }

    var fe = document.getElementById('footer_email');
    if (fe) fe.href = 'mailto:' + d.email;

    setHTML('footer_area', formatText(d.area));
  }

  // ─── CTA Banner ───

  function renderCTA(data, contactPhone) {
    var d = toKeyValue(data);
    setText('cta_heading', d.heading);
    setText('cta_description', d.description);
    setAttr('cta_phone_link', 'href', 'tel:' + phoneToLink(contactPhone || ''));
    setText('cta_phone_display', d.phone_display);
  }

  // ─── Footer ───

  function renderFooter(data) {
    var d = toKeyValue(data);
    setText('footer_description', d.description);
    setText('footer_abn', d.abn);
    setAttr('footer_facebook', 'href', d.facebook);
    setAttr('nav_facebook', 'href', d.facebook);
    setAttr('menu_facebook', 'href', d.facebook);
    setAttr('gallery_facebook', 'href', d.facebook);
  }

  // ─── Load All Content ───

  var contentData = {};

  Promise.all([
    fetchCSV(DATA_SOURCES.hero).then(function (d) { contentData.hero = d; }),
    fetchMixedCSV(DATA_SOURCES.about).then(function (d) { contentData.about = d; }),
    fetchMixedCSV(DATA_SOURCES.services).then(function (d) { contentData.services = d; }),
    fetchMixedCSV(DATA_SOURCES.testimonials).then(function (d) { contentData.testimonials = d; }),
    fetchMixedCSV(DATA_SOURCES.team).then(function (d) { contentData.team = d; }),
    fetchMixedCSV(DATA_SOURCES.gallery).then(function (d) { contentData.gallery = d; }),
    fetchCSV(DATA_SOURCES.contact).then(function (d) { contentData.contact = d; }),
    fetchCSV(DATA_SOURCES.cta).then(function (d) { contentData.cta = d; }),
    fetchCSV(DATA_SOURCES.footer).then(function (d) { contentData.footer = d; })
  ])
    .then(function () {
      var contactKV = toKeyValue(contentData.contact);

      renderHero(contentData.hero);
      renderAbout(contentData.about.config, contentData.about.items);
      renderServices(contentData.services.config, contentData.services.items);
      renderTestimonials(contentData.testimonials.config, contentData.testimonials.items);
      renderTeam(contentData.team.config, contentData.team.items);
      renderGallery(contentData.gallery.config, contentData.gallery.items);
      renderContact(contentData.contact);
      renderCTA(contentData.cta, contactKV.phone);
      renderFooter(contentData.footer);

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
