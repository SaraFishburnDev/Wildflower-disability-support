(function () {
  'use strict';

  // ─── Configuration ───
  var SHEET_ID = '1AtkWq2Mr6c9MbNRRpxxgQXD550Vk1JhvWh4ghdw6-Cs';
  var BASE = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&sheet=';

  // ─── Helpers ───

  // Google Sheets CSV export pads rows with trailing empty columns ("","",…).
  // PapaParse's header-dedup logic chokes on many duplicate "" headers and
  // swallows the first data row into a mangled header string.  Strip them.
  function stripTrailingEmptyCols(text) {
    return text.replace(/(?:,"")+$/gm, '');
  }

  var PAPA_OPTS = {
    header: true,
    skipEmptyLines: true,
    transformHeader: function (h) { return h.trim(); },
    transform: function (v) { return v.trim(); }
  };

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

        // Find ALL separator rows (first cell is "---")
        var sepIndices = [];
        for (var i = 0; i < raw.length; i++) {
          if (raw[i][0] === '---') sepIndices.push(i);
        }

        if (sepIndices.length === 0) {
          // No separator — treat entire sheet as a plain table
          return { config: {}, items: Papa.parse(stripTrailingEmptyCols(text), PAPA_OPTS).data };
        }

        // Config section: row 0 is headers, rows 1..firstSep-1 are data
        var configHeaders = raw[0];
        var config = {};
        for (var c = 1; c < sepIndices[0]; c++) {
          var k = raw[c][configHeaders.indexOf('key')] || raw[c][0];
          var v = raw[c][configHeaders.indexOf('value')] || raw[c][1] || '';
          if (k) config[k] = v;
        }

        // Parse a table section between a separator and the next boundary
        function parseTableSection(startIdx, endIdx) {
          var headingRow = raw[startIdx + 1] || [];
          var heading = headingRow[2] || headingRow[1] || headingRow[0] || '';
          var dataHeaders = raw[startIdx + 2] || [];
          var items = [];
          for (var d = startIdx + 3; d < endIdx; d++) {
            var obj = {};
            for (var h = 0; h < dataHeaders.length; h++) {
              if (dataHeaders[h]) obj[dataHeaders[h]] = raw[d][h] || '';
            }
            items.push(obj);
          }
          return { heading: heading, items: items };
        }

        if (sepIndices.length === 1) {
          // Single separator — backward compatible: return { config, items }
          var table = parseTableSection(sepIndices[0], raw.length);
          return { config: config, items: table.items };
        }

        // Multiple separators — return { config, tables }
        var tables = [];
        for (var t = 0; t < sepIndices.length; t++) {
          var endIdx = (t + 1 < sepIndices.length) ? sepIndices[t + 1] : raw.length;
          tables.push(parseTableSection(sepIndices[t], endIdx));
        }
        return { config: config, tables: tables };
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


  function slugify(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }

  function normalizeIcon(iconClass) {
    if (!iconClass) return iconClass;
    return iconClass.startsWith('bi-') ? iconClass : 'bi-' + iconClass;
  }

  function setIcon(id, iconClass) {
    var el = document.getElementById(id);
    if (el) el.className = 'bi ' + normalizeIcon(iconClass);
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

  // ─── Color Helpers ───

  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function adjustBrightness(hex, factor) {
    var c = hexToRgb(hex);
    var r = Math.round(Math.min(255, Math.max(0, c.r * factor)));
    var g = Math.round(Math.min(255, Math.max(0, c.g * factor)));
    var b = Math.round(Math.min(255, Math.max(0, c.b * factor)));
    return rgbToHex(r, g, b);
  }

  function hexToVariants(hex) {
    var c = hexToRgb(hex);
    return {
      base: hex,
      dark: adjustBrightness(hex, 0.7),
      light: 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.1)',
      overlay: 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.82)'
    };
  }

  // ─── General (site-wide config) ───

  function renderGeneral(config, items) {
    var root = document.documentElement.style;

    // Colors
    if (config.color_primary) {
      var pv = hexToVariants(config.color_primary);
      root.setProperty('--clr-primary', pv.base);
      root.setProperty('--clr-primary-dark', pv.dark);
      root.setProperty('--clr-primary-light', pv.light);
      root.setProperty('--clr-hero-overlay', pv.overlay);
    }
    if (config.color_secondary) {
      root.setProperty('--clr-accent', config.color_secondary);
      root.setProperty('--clr-accent-hover', adjustBrightness(config.color_secondary, 0.8));
    }
    if (config.color_tertiary) {
      var tv = hexToVariants(config.color_tertiary);
      root.setProperty('--clr-pink', tv.base);
      root.setProperty('--clr-pink-dark', tv.dark);
      root.setProperty('--clr-pink-light', tv.light);
    }

    // Favicon
    if (config.favicon) {
      var link = document.querySelector('link[rel="icon"]');
      if (link) link.href = config.favicon;
    }

    // SEO
    if (config.seo_title) {
      document.title = config.seo_title;
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', config.seo_title);
      var twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', config.seo_title);
    }
    if (config.seo_description) {
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', config.seo_description);
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', config.seo_description);
      var twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', config.seo_description);
    }
    if (config.seo_image) {
      var ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute('content', config.seo_image);
      var twImg = document.querySelector('meta[name="twitter:image"]');
      if (twImg) twImg.setAttribute('content', config.seo_image);
    }

    // Gallery CTA
    var galleryCta = document.getElementById('gallery_cta');
    if (galleryCta) {
      if (config.gallery_cta_url) {
        galleryCta.href = config.gallery_cta_url;
        galleryCta.style.display = '';
        var ctaIcon = galleryCta.querySelector('i');
        if (ctaIcon && config.gallery_cta_icon) {
          ctaIcon.className = 'bi bi-' + config.gallery_cta_icon;
        }
        var ctaSpan = galleryCta.querySelector('span');
        if (ctaSpan && config.gallery_cta_text) {
          ctaSpan.textContent = config.gallery_cta_text;
        }
      } else {
        galleryCta.style.display = 'none';
      }
    }

    // Share widget
    var shareWidget = document.getElementById('shareWidget');
    if (shareWidget) {
      if (config.share_bar === 'FALSE') {
        shareWidget.remove();
      } else {
        initShareWidget(config);
      }
    }

    // Social links
    if (items && items.length) {
      renderSocialLinks(items, 'footer_social');
      renderSocialLinks(items, 'contact_social');
      renderMenuSocialLinks(items, 'menu_social');

      // Show contact social wrapper if any links have URLs
      var hasUrls = items.some(function (item) { return item.url; });
      var contactWrapper = document.getElementById('contact_social_wrapper');
      if (contactWrapper && hasUrls) contactWrapper.style.display = '';
    }
  }

  function initShareWidget(config) {
    var url = window.location.href;
    var title = config.seo_title || document.title;
    var metaDesc = document.querySelector('meta[name="description"]');
    var description = config.seo_description || (metaDesc ? metaDesc.getAttribute('content') : '');
    var message = description ? description + '\n\n' + url : url;

    // Facebook
    var fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    var fbDesktop = document.getElementById('shareFacebook');
    var fbMobile = document.getElementById('shareFacebookMobile');
    if (fbDesktop) fbDesktop.href = fbUrl;
    if (fbMobile) fbMobile.href = fbUrl;

    // Email
    var emailUrl = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(message);
    var emailDesktop = document.getElementById('shareEmail');
    var emailMobile = document.getElementById('shareEmailMobile');
    if (emailDesktop) emailDesktop.href = emailUrl;
    if (emailMobile) emailMobile.href = emailUrl;

    // SMS (iOS uses sms:&body= instead of sms:?body=)
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    var smsUrl = isIOS
      ? 'sms:&body=' + encodeURIComponent(message)
      : 'sms:?body=' + encodeURIComponent(message);
    var smsBtn = document.getElementById('shareSMS');
    if (smsBtn) smsBtn.href = smsUrl;
  }

  function renderSocialLinks(items, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var html = items.filter(function (item) { return item.url; }).map(function (item) {
      return '<a href="' + item.url + '" target="_blank" rel="noopener noreferrer" aria-label="' + item.platform + '">' +
        '<i class="bi bi-' + item.icon + '" aria-hidden="true"></i>' +
      '</a>';
    }).join('');
    container.innerHTML = html;
  }

  function renderMenuSocialLinks(items, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var html = items.filter(function (item) { return item.url; }).map(function (item) {
      return '<a class="menu-link menu-link-social" href="' + item.url + '" target="_blank" rel="noopener noreferrer">' +
        '<i class="bi bi-' + item.icon + '" aria-hidden="true"></i> ' + item.platform +
      '</a>';
    }).join('');
    container.innerHTML = html;
  }

  // ─── Nav ───

  var sectionIdMap = {}; // built at load time: { tabName: '#slugified-id', ... }

  function getSectionLabel(data) {
    var config = data.config || {};
    var label = config.section_label || config.label;
    if (label) return label;
    // Flat key-value sheets (contact — no separator)
    if (data.items && data.items.length && data.items[0].key !== undefined) {
      return toKeyValue(data.items).section_label || toKeyValue(data.items).label;
    }
    return null;
  }

  function renderNav(config, items) {
    // Update logo if provided
    if (config.logo) {
      var logoLink = document.getElementById('nav_logo');
      if (logoLink) {
        var img = logoLink.querySelector('img');
        if (img) img.src = config.logo;
      }
    }

    // Update logo link href to hero's dynamic ID
    var logoEl = document.getElementById('nav_logo');
    if (logoEl && sectionIdMap.hero) logoEl.href = sectionIdMap.hero;

    // Build desktop nav links
    var desktopNav = document.getElementById('desktop_nav');
    if (desktopNav) {
      var desktopHTML = items.map(function (item) {
        var href = sectionIdMap[item.link] || '#' + item.link;
        return '<li class="nav-item"><a class="nav-link" href="' + href + '">' + item.name + '</a></li>';
      }).join('');
      // Insert before the CTA button
      var cta = desktopNav.querySelector('.nav-cta');
      if (cta) {
        cta.closest('li').insertAdjacentHTML('beforebegin', desktopHTML);
      } else {
        desktopNav.innerHTML += desktopHTML;
      }
    }

    // Build mobile menu links
    var mobileNav = document.getElementById('mobile_nav');
    if (mobileNav) {
      var mobileHTML = items.map(function (item) {
        var href = sectionIdMap[item.link] || '#' + item.link;
        return '<li><a class="menu-link" href="' + href + '">' + item.name + '</a></li>';
      }).join('');
      // Insert before the Facebook link (first existing <li>)
      var firstLi = mobileNav.querySelector('li');
      if (firstLi) {
        firstLi.insertAdjacentHTML('beforebegin', mobileHTML);
      } else {
        mobileNav.innerHTML += mobileHTML;
      }
    }

    // Set CTA text and link from config
    if (config.cta_text || config.cta_link) {
      var ctaHref = config.cta_link ? (sectionIdMap[config.cta_link] || '#' + config.cta_link) : null;
      document.querySelectorAll('[data-nav-cta]').forEach(function (el) {
        if (config.cta_text) el.textContent = config.cta_text;
        if (ctaHref) el.href = ctaHref;
      });
    }
  }

  // ─── Hero ───

  function renderHero(config, items) {
    setHTML('hero_badge', config.badge);
    setHTML('hero_heading', formatText(config.heading));
    setHTML('hero_description', formatText(config.description));
    renderImage('.hero-img-placeholder', extractImageUrl(config.hero_image),
      'Wildflower Disability Support Services');

    // Dynamic CTA buttons
    var ctaContainer = document.getElementById('hero_ctas');
    if (ctaContainer && items && items.length) {
      ctaContainer.innerHTML = items.map(function (cta) {
        var href = sectionIdMap[cta.link] || '#' + cta.link;
        var btnClass = cta.style === 'secondary' ? 'btn-secondary-custom' : 'btn-primary-custom';
        return (
          '<a href="' + href + '" class="' + btnClass + '">' +
            cta.text +
            ' <i class="bi bi-arrow-right" aria-hidden="true"></i>' +
          '</a>'
        );
      }).join('');
    }

    // Update meta description with live content if available
    if (config.description) {
      var plainDesc = config.description.replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1').replace(/\n/g, ' ').substring(0, 160);
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', plainDesc);
    }
  }

  // ─── About + Values ───

  function renderAbout(config, items) {
    setIcon('about_label_icon', config.label_icon);
    setHTML('about_label', config.label);
    setHTML('about_heading', formatText(config.heading));
    setHTML('about_subtitle', formatText(config.subtitle));
    setHTML('about_body', formatText(config.body));
    setHTML('about_cta', config.cta);
    // Update CTA link href dynamically
    var aboutCtaEl = document.getElementById('about_cta');
    if (aboutCtaEl) {
      var ctaLink = aboutCtaEl.closest('a');
      if (ctaLink && sectionIdMap.contact) ctaLink.href = sectionIdMap.contact;
    }
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
      if (img2) renderImage('#aboutImg2Mobile', img2, 'Wildflower Disability Support Services');
      if (img3) renderImage('#aboutImg3Mobile', img3, 'Wildflower Disability Support Services');
    }

    Fancybox.bind('[data-fancybox="about-gallery"]');

    // Values grid (from the data table in the about sheet)
    var grid = document.getElementById('values_grid');
    if (grid) {
      grid.innerHTML = items.map(function (val) {
        return (
          '<div class="col-sm-6">' +
            '<div class="value-card d-flex flex-sm-column flex-lg-row align-items-sm-center align-items-lg-start text-sm-center text-lg-left">' +
              '<div class="value-icon"><i class="bi ' + normalizeIcon(val.icon || 'bi-star') + '" aria-hidden="true"></i></div>' +
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
    setHTML('services_label', config.section_label);
    setHTML('services_heading', formatText(config.section_heading));
    setHTML('services_subtitle', formatText(config.section_subtitle));

    // Service cards
    var grid = document.getElementById('services_grid');
    if (grid) {
      grid.innerHTML = items.map(function (svc, i) {
        var slug = slugify(svc.title);
        var hasFull = svc.description_full && svc.description_full.trim();
        var iconHtml = '<div class="service-icon"><i class="bi ' + normalizeIcon(svc.icon || 'bi-gear') + '" aria-hidden="true"></i></div>';
        var cardInner =
          iconHtml +
          '<h3>' + svc.title + '</h3>' +
          '<p>' + formatText(svc.description_short) + '</p>';

        if (hasFull) {
          return (
            '<div class="col-md-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
              '<div class="service-card" role="button" tabindex="0" data-service-index="' + i + '" aria-label="Read more about ' + svc.title + '">' +
                cardInner +
                '<span class="service-link">' +
                  'Click to Read More <i class="bi bi-arrow-right" aria-hidden="true"></i>' +
                '</span>' +
              '</div>' +
            '</div>'
          );
        }
        return (
          '<div class="col-md-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<a href="?service=' + slug + (sectionIdMap.contact || '#contact') + '" class="service-card">' +
              cardInner +
              '<span class="service-link">' +
                'Enquire Now <i class="bi bi-arrow-right" aria-hidden="true"></i>' +
              '</span>' +
            '</a>' +
          '</div>'
        );
      }).join('');

      // Service modal click handlers
      grid.addEventListener('click', function (e) {
        var card = e.target.closest('.service-card[data-service-index]');
        if (!card) return;
        var idx = parseInt(card.getAttribute('data-service-index'), 10);
        openServiceModal(items[idx]);
      });
      grid.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          var card = e.target.closest('.service-card[data-service-index]');
          if (!card) return;
          e.preventDefault();
          var idx = parseInt(card.getAttribute('data-service-index'), 10);
          openServiceModal(items[idx]);
        }
      });
    }

    // Service checkboxes in contact form
    var checkboxes = document.getElementById('serviceCheckboxes');
    if (checkboxes) {
      checkboxes.innerHTML = items.map(function (svc) {
        var slug = slugify(svc.title);
        return (
          '<div class="form-check">' +
            '<input class="form-check-input" type="checkbox" ' +
              'id="service-' + slug + '" name="service" value="' + slug + '">' +
            '<label class="form-check-label" for="service-' + slug + '">' +
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

  }

  function openServiceModal(svc) {
    var slug = slugify(svc.title);
    var html =
      '<div class="service-modal-content">' +
        '<div class="service-modal-icon"><i class="bi ' + normalizeIcon(svc.icon || 'bi-gear') + '" aria-hidden="true"></i></div>' +
        '<div class="service-modal-body">' +
          '<h3>' + svc.title + '</h3>' +
          '<div class="service-modal-description">' + formatText(svc.description_full) + '</div>' +
          '<button type="button" class="btn-primary-custom service-modal-cta" data-service-slug="' + slug + '">' +
            'Enquire Now <i class="bi bi-arrow-right" aria-hidden="true"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    Fancybox.show([{ src: html, type: 'html' }], {
      mainClass: 'service-fancybox',
      closeButton: 'top',
      on: {
        done: function (fancybox) {
          var cta = fancybox.container.querySelector('.service-modal-cta');
          if (cta) {
            cta.addEventListener('click', function () {
              var s = cta.getAttribute('data-service-slug');
              var cb = document.getElementById('service-' + s);
              if (cb) cb.checked = true;
              fancybox.close();
              var contactHash = sectionIdMap.contact || '#contact';
              history.replaceState(null, '', '?service=' + s + contactHash);
              var contactEl = document.querySelector(contactHash);
              if (contactEl) contactEl.scrollIntoView({ behavior: 'smooth' });
            });
          }
        }
      }
    });
  }

  // ─── Testimonials ───

  function renderTestimonials(config, items) {
    // Section header
    setIcon('testimonials_label_icon', config.section_label_icon);
    setHTML('testimonials_label', config.section_label);
    setHTML('testimonials_heading', formatText(config.section_heading));

    // Testimonial Splide slides
    var container = document.getElementById('testimonials_grid');
    if (container) {
      container.innerHTML = items.map(function (t) {
        var starCount = parseInt(t.stars) || 5;
        var stars = '';
        for (var s = 0; s < starCount; s++) {
          stars += '<i class="bi bi-star-fill" aria-hidden="true"></i>';
        }
        return (
          '<li class="splide__slide">' +
            '<div class="testimonial-card text-center">' +
              '<div class="stars" role="img" aria-label="' + starCount + ' out of 5 stars">' +
                stars +
              '</div>' +
              '<blockquote>\u201c' + formatText(t.quote) + '\u201d' +
                '<div role="contentinfo" class="mt-3"><cite class="author">' + t.author + '</cite>' +
                '<span class="author-role">' + t.role + '</span></div>' +
              '</blockquote>' +
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
    setHTML('team_label', config.section_label);
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
          '<div class="col-sm-6 col-lg-4 fade-up delay-' + (i + 1) + '">' +
            '<div class="team-card" role="button" tabindex="0" data-team-index="' + i + '" aria-label="Read more about ' + member.name + '">' +
              '<div class="team-photo" role="img" aria-label="Photo of ' + member.name + '">' +
                photoHtml +
              '</div>' +
              '<div class="team-info p-3 p-md-4">' +
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
    setHTML('gallery_label', config.section_label);
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
    var d = (data.config && Object.keys(data.config).length > 0)
      ? data.config
      : toKeyValue(data.items || data);
    var phoneLinkVal = phoneToLink(d.phone);

    // Section header
    setIcon('contact_label_icon', d.label_icon);
    setHTML('contact_label', d.label);
    setHTML('contact_heading', formatText(d.heading));
    setHTML('contact_subtitle', formatText(d.subtitle));

    // Sidebar
    setHTML('contact_sidebar_heading', d.sidebar_heading);
    setHTML('contact_sidebar_text', d.sidebar_text);

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
    if (fe) {
      fe.href = 'mailto:' + d.email;
      fe.textContent = d.email;
    }
  }

  // ─── Footer ───

  function renderFooter(data) {
    var config = data.config || {};
    var tables = data.tables || [];

    // Footer logo
    if (config.logo) {
      var logoImg = document.getElementById('footer_logo');
      if (logoImg) logoImg.src = config.logo;
    }

    // Description and ABN
    setHTML('footer_description', config.description);
    setHTML('footer_abn', config.abn);

    // Dynamic link columns
    for (var i = 0; i < 2; i++) {
      var colNum = i + 1;
      var wrapper = document.getElementById('footer_col' + colNum);
      if (!wrapper) continue;

      if (i < tables.length && tables[i].items.length > 0) {
        var tbl = tables[i];
        setHTML('footer_col' + colNum + '_heading', tbl.heading);
        var ul = document.getElementById('footer_col' + colNum + '_links');
        if (ul) {
          ul.innerHTML = tbl.items.map(function (item) {
            var href = sectionIdMap[item.link] || '#' + item.link;
            return '<li><a href="' + href + '">' + item.name + '</a></li>';
          }).join('');
        }
      } else {
        wrapper.style.display = 'none';
      }
    }
  }

  // ─── Section Visibility ───

  function hideSection(tab) {
    var el = document.querySelector('[data-section="' + tab + '"]');
    if (el) el.style.display = 'none';

    var href = sectionIdMap[tab];
    if (href) {
      document.querySelectorAll('a[href="' + href + '"]').forEach(function (a) {
        var li = a.closest('li');
        if (li) li.style.display = 'none';
        else a.style.display = 'none';
      });
    }
  }

  // ─── Load All Content ───

  var RENDERERS = {
    general:      function (d) { renderGeneral(d.config, d.items); },
    nav:          function (d) { renderNav(d.config, d.items); },
    hero:         function (d) { renderHero(d.config, d.items); },
    about:        function (d) { renderAbout(d.config, d.items); },
    services:     function (d) { renderServices(d.config, d.items); },
    testimonials: function (d) { renderTestimonials(d.config, d.items); },
    team:         function (d) { renderTeam(d.config, d.items); },
    gallery:      function (d) { renderGallery(d.config, d.items); },
    contact:      function (d) { renderContact(d); },
    footer:       function (d) { renderFooter(d); }
  };

  // Discover sections from DOM
  var sectionEls = document.querySelectorAll('[data-section]');
  var tabs = [];
  sectionEls.forEach(function (el) { tabs.push(el.getAttribute('data-section')); });

  // Fetch all sheets in parallel
  var contentData = {};
  Promise.all(
    tabs.map(function (tab) {
      return fetchMixedCSV(BASE + tab).then(function (d) { contentData[tab] = d; });
    })
  )
    .then(function () {
      // Derive section IDs — hero always maps to #top, <main> sections get slugified labels
      sectionEls.forEach(function (el) {
        var tab = el.getAttribute('data-section');
        var data = contentData[tab];
        if (!data) return;

        if (tab === 'hero') {
          el.id = 'top';
          sectionIdMap[tab] = '#top';
          return;
        }

        // Only assign dynamic IDs to sections within <main>
        if (el.closest('main')) {
          var label = getSectionLabel(data);
          var id = label ? slugify(label) : tab;
          el.id = id;
          sectionIdMap[tab] = '#' + id;
        }
      });

      // Determine which sections are hidden
      function isHidden(tab) {
        var data = contentData[tab];
        if (!data) return false;
        var config = data.config || {};
        if (config.hidden === 'TRUE') return true;
        // Flat key-value sheets (contact)
        if (Object.keys(config).length === 0 && data.items) {
          var kv = toKeyValue(data.items);
          return kv.hidden === 'TRUE';
        }
        return false;
      }

      // Render general first (colors/SEO apply to entire page)
      if (contentData.general) RENDERERS.general(contentData.general);

      // Render nav and footer (always visible, no hidden toggle)
      if (contentData.nav) RENDERERS.nav(contentData.nav);
      if (contentData.footer) RENDERERS.footer(contentData.footer);

      // Render remaining sections in DOM order
      tabs.forEach(function (tab) {
        if (tab === 'nav' || tab === 'general' || tab === 'footer') return;
        if (isHidden(tab)) {
          hideSection(tab);
          return;
        }
        var renderer = RENDERERS[tab];
        if (renderer) renderer(contentData[tab]);
      });

      // Edge case: services hidden → hide service checkboxes in contact form
      if (isHidden('services')) {
        var cbFieldset = document.querySelector('#serviceCheckboxes');
        if (cbFieldset) {
          var fieldset = cbFieldset.closest('fieldset');
          if (fieldset) fieldset.style.display = 'none';
        }
      }

      if (typeof window.initDynamicContent === 'function') {
        window.initDynamicContent(sectionIdMap);
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
