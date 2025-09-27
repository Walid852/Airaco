function setLanguage(lang) {
  const elementsWithTranslations = document.querySelectorAll('[data-en]');
  elementsWithTranslations.forEach(function(element) {
    var value = element.getAttribute('data-' + lang);
    if (value != null) {
      element.textContent = value;
    }
  });

  var dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);

  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    var isCurrent = btn.getAttribute('data-lang') === lang;
    if (isCurrent) {
      btn.setAttribute('aria-current', 'true');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  // Notify components (e.g., slider) about language/dir change
  try {
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang } }));
  } catch (_) {}
}

// Smooth scroll for in-page nav links and active state handling
function initNavigation() {
  var navLinks = document.querySelectorAll('.site-nav .nav-link');
  var sections = Array.prototype.map.call(navLinks, function(link) {
    var id = link.getAttribute('href');
    try {
      return document.querySelector(id);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  // Click smooth scroll
  navLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      var targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Active link on scroll
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = '#' + entry.target.id;
        navLinks.forEach(function(link) {
          if (link.getAttribute('href') === id) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0.1 });

  sections.forEach(function(section) { observer.observe(section); });
}

// Initialize defaults
document.addEventListener('DOMContentLoaded', function() {
  // Always start at top and clear any hash
  if (window.location.hash) {
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
  }
  window.scrollTo(0, 0);
  setLanguage('ar');
  initNavigation();
  initClientSlider();
  initProjectSlider();
  initMobileNav();
});

function initClientSlider() {
  var slider = document.querySelector('.client-slider');
  if (!slider) return;
  var track = slider.querySelector('.slider-track');
  var viewport = slider.querySelector('.slider-viewport');
  var prevBtn = slider.querySelector('.prev');
  var nextBtn = slider.querySelector('.next');
  var dotsEl = slider.querySelector('.slider-dots');
  var position = 0;
  var slideCount = track.children.length;
  var currentIndex = 0;
  // Force LTR layout for slider internals regardless of page dir
  var isRTL = false;

  function slideBy(delta) {
    var max = track.scrollWidth - viewport.clientWidth;
    position = Math.max(0, Math.min(position + delta, max));
    track.style.transform = 'translateX(' + (-position) + 'px)';
  }

  function slideNext() { goTo(currentIndex + 1); }
  function slidePrev() { goTo(currentIndex - 1); }

  prevBtn.addEventListener('click', slidePrev);
  nextBtn.addEventListener('click', slideNext);

  // Dots
  function renderDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (var i = 0; i < slideCount; i++) {
      var b = document.createElement('button');
      b.className = 'slider-dot';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Slide ' + (i+1));
      (function(index) {
        b.addEventListener('click', function() { goTo(index); });
      })(i);
      dotsEl.appendChild(b);
    }
  }

  function syncDots() {
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll('.slider-dot');
    dots.forEach(function(d, i) { d.setAttribute('aria-selected', String(i === currentIndex)); });
  }

  function goTo(index) {
    currentIndex = (index + slideCount) % slideCount;
    position = currentIndex * viewport.clientWidth;
    track.style.transform = 'translateX(' + (-position) + 'px)';
    syncDots();
  }

  function layoutSlides() {
    var width = viewport.clientWidth;
    // Set each slide width explicitly to avoid layout bugs on dir changes
    Array.prototype.forEach.call(track.children, function(child) {
      child.style.minWidth = width + 'px';
      child.style.maxWidth = width + 'px';
      child.style.flex = '0 0 ' + width + 'px';
    });
    // Reset transform to the current index with new width
    track.style.transform = 'translateX(' + (-(currentIndex * width)) + 'px)';
  }

  layoutSlides();
  renderDots();
  syncDots();

  var auto = setInterval(function() {
    goTo(currentIndex + 1);
  }, 3500);
  slider.addEventListener('mouseenter', function() { clearInterval(auto); });
  slider.addEventListener('mouseleave', function() { auto = setInterval(function() { goTo(currentIndex + 1); }, 3500); });

  // Keyboard
  slider.setAttribute('tabindex', '0');
  slider.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') { goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft') { goTo(currentIndex - 1); }
  });

  // Swipe
  var startX = null;
  viewport.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchmove', function(e) {
    if (startX == null) return;
    var dx = e.touches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goTo(currentIndex + 1); else goTo(currentIndex - 1);
      startX = null;
    }
  }, { passive: true });

  // Respond to language/dir changes at runtime to keep slides visible
  function handleLanguageChange() {
    // Recalculate layout and reset to first slide
    currentIndex = 0;
    position = 0;
    layoutSlides();
    syncDots();
    // Force images to load if browser deferred them
    var imgs = track.querySelectorAll('img');
    imgs.forEach(function(img) {
      if (img.loading === 'lazy') {
        var src = img.getAttribute('src');
        img.setAttribute('src', src);
      }
    });
  }
  document.addEventListener('languagechange', handleLanguageChange);

  // Re-layout on resize to keep widths correct
  var resizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      layoutSlides();
    }, 100);
  });
}

function initProjectSlider() {
  var slider = document.querySelector('#projects .project-slider');
  if (!slider) return;
  var track = slider.querySelector('.slider-track');
  var viewport = slider.querySelector('.slider-viewport');
  var prevBtn = slider.querySelector('.prev');
  var nextBtn = slider.querySelector('.next');
  var dotsEl = slider.querySelector('.slider-dots');
  var position = 0;
  var slideCount = track.children.length;
  var currentIndex = 0;

  function goTo(index) {
    currentIndex = (index + slideCount) % slideCount;
    position = currentIndex * viewport.clientWidth;
    track.style.transform = 'translateX(' + (-position) + 'px)';
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll('.slider-dot');
    dots.forEach(function(d, i) { d.setAttribute('aria-selected', String(i === currentIndex)); });
  }

  function layoutSlides() {
    var width = viewport.clientWidth;
    Array.prototype.forEach.call(track.children, function(child) {
      child.style.minWidth = width + 'px';
      child.style.maxWidth = width + 'px';
      child.style.flex = '0 0 ' + width + 'px';
    });
    track.style.transform = 'translateX(' + (-(currentIndex * width)) + 'px)';
  }

  function renderDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (var i = 0; i < slideCount; i++) {
      var b = document.createElement('button');
      b.className = 'slider-dot';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Slide ' + (i+1));
      (function(index) { b.addEventListener('click', function() { goTo(index); }); })(i);
      dotsEl.appendChild(b);
    }
  }

  prevBtn.addEventListener('click', function() { goTo(currentIndex - 1); });
  nextBtn.addEventListener('click', function() { goTo(currentIndex + 1); });

  layoutSlides();
  renderDots();
  goTo(0);

  // Auto-play with pause on hover
  var auto = setInterval(function() { goTo(currentIndex + 1); }, 4000);
  slider.addEventListener('mouseenter', function() { clearInterval(auto); });
  slider.addEventListener('mouseleave', function() { auto = setInterval(function() { goTo(currentIndex + 1); }, 4000); });

  // Keyboard navigation
  slider.setAttribute('tabindex', '0');
  slider.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') { goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft') { goTo(currentIndex - 1); }
  });

  // Swipe gesture
  var startX = null;
  viewport.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchmove', function(e) {
    if (startX == null) return;
    var dx = e.touches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goTo(currentIndex + 1); else goTo(currentIndex - 1);
      startX = null;
    }
  }, { passive: true });

  // Re-layout on resize and on language switch
  var resizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { layoutSlides(); }, 120);
  });

  document.addEventListener('languagechange', function() {
    currentIndex = 0;
    position = 0;
    layoutSlides();
  });
}

function initMobileNav() {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  function closeNav() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function() {
    var isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close on nav link click
  nav.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() { closeNav(); });
  });

  // Close on resize above breakpoint
  var resizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (window.innerWidth > 720) closeNav();
    }, 120);
  });
}
  