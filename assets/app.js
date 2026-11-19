/* The demo's whole script: reveal on scroll, one filter, one toggle, one clipboard.
   No framework, no build step, nothing that needs to phone home. */
(function () {
  'use strict';

  /* A framed page is a picture of a screen: its scrollbar belongs to the
     phone frame, not to the page inside it. */
  if (window.self !== window.top) document.documentElement.className += ' embedded';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------- reveal */
  /* Mark the page as scripted once this file runs, so the safety timer in
     the head stops waiting and does not force the hidden blocks open. */
  window.__shelfMotion = 1;

  var rv = $$('.rv');
  /* `now` is the part that belongs to the first screen: it plays once the
     browser has painted the initial state, so the entrance is a transition
     rather than a jump. Everything else waits until it is scrolled into view. */
  var nowEls = rv.filter(function (n) { return n.classList.contains('now'); });
  var later = rv.filter(function (n) { return !n.classList.contains('now'); });

  if (nowEls.length) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nowEls.forEach(function (n) { n.classList.add('in'); });
      });
    });
  }

  if (later.length) {
    var ticking = false;

    var sweep = function () {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var rest = [];
      later.forEach(function (n) {
        var r = n.getBoundingClientRect();
        /* in view, or already scrolled past — an anchor jump must not leave
           the middle of the page invisible behind us */
        if (r.bottom <= 0 || (r.top < vh - 32 && r.bottom > 0)) {
          n.classList.add('in');
        } else {
          rest.push(n);
        }
      });
      later = rest;
      if (!later.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sweep);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    requestAnimationFrame(sweep);
  }

  /* ---------------------------------------------------------- toast */
  var toast = $('#toast');
  var toastText = $('#toast-text');
  var toastTimer;
  function say(text) {
    if (!toast) return;
    toastText.textContent = text;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 2200);
  }

  /* ---------------------------------------------------------- mobile nav */
  $$('[data-nav-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------------------------------------------------------- phone search
     The bar is too narrow for a field, so search is a row that drops under it,
     the way the native clients open theirs. */
  var appBar = $('.app-bar');
  var searchInput = $('#q');
  function setSearch(open) {
    if (!appBar) return;
    appBar.classList.toggle('searching', open);
    $$('[data-search-toggle]').forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    if (open && searchInput) searchInput.focus();
  }
  $$('[data-search-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { setSearch(!appBar.classList.contains('searching')); });
  });
  $$('[data-search]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (!appBar) return;
      e.preventDefault();
      setSearch(true);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && appBar && appBar.classList.contains('searching')) setSearch(false);
  });

  /* ---------------------------------------------------------- library */
  var list = $('#list');
  if (list) {
    var rows = $$('.row-save', list);
    var groups = $$('.group', list);
    var count = $('#count');
    var empty = $('#empty');
    var scope = 'active';
    var topic = 'all';
    var query = '';

    function apply() {
      var shown = 0;
      rows.forEach(function (row) {
        var status = row.getAttribute('data-status');
        var topics = (row.getAttribute('data-topic') || '').split(' ');
        var text = (row.getAttribute('data-text') || '').toLowerCase();
        var ok =
          (scope === 'all' || status === scope) &&
          (topic === 'all' || topics.indexOf(topic) !== -1) &&
          (!query || text.indexOf(query) !== -1);
        row.hidden = !ok;
        if (ok) shown++;
      });

      /* a month with nothing left under it is not a month */
      groups.forEach(function (g) { g.hidden = true; });
      var current = null;
      Array.prototype.forEach.call(list.children, function (child) {
        if (child.classList.contains('group')) current = child;
        else if (child.classList.contains('row-save') && !child.hidden && current) current.hidden = false;
      });

      if (count) {
        count.textContent = shown + ' ' + (scope === 'archived' ? 'archived' : scope === 'all' ? 'saves' : 'active');
      }
      if (empty) empty.hidden = shown !== 0;
    }

    function pickTopic(value) {
      topic = value;
      $$('.chip-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-topic') === value ? 'true' : 'false');
      });
      apply();
    }

    $$('.seg [data-scope]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.seg [data-scope]').forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        scope = btn.getAttribute('data-scope');
        apply();
      });
    });

    $$('[data-topic]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pickTopic(btn.getAttribute('data-topic'));
      });
    });

    /* the rail's topics are filters, not a second page */
    $$('[data-topic-jump]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        pickTopic(link.getAttribute('data-topic-jump'));
        if (window.matchMedia('(max-width: 900px)').matches) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    var search = $('#q');
    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim().toLowerCase();
        apply();
      });
    }

    $$('[data-clear]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (search) search.value = '';
        query = '';
        topic = 'all';
        $$('.chip-btn').forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-topic') === 'all' ? 'true' : 'false');
        });
        apply();
      });
    });

    /* Archive is the one write the demo fakes — it moves the row between
       scopes so the tab does something, instead of printing "demo". */
    $$('[data-archive]', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.row-save');
        var archived = row.getAttribute('data-status') === 'archived';
        row.setAttribute('data-status', archived ? 'active' : 'archived');
        var tags = $('.tags', row);
        var chip = $('.chip:not(.chip-outline)', tags);
        if (archived) {
          if (chip) chip.remove();
          btn.title = 'Archive';
          say('Unarchived — back on the active shelf');
        } else {
          if (!chip) tags.appendChild(Object.assign(document.createElement('span'), { className: 'chip', textContent: 'Archived' }));
          btn.title = 'Unarchive';
          say('Archived — out of the way, still searchable');
        }
        apply();
      });
    });

    /* a search typed on the reading view arrives here as ?q= */
    var initial = '';
    try { initial = new URLSearchParams(location.search).get('q') || ''; } catch (err) {}
    if (initial && search) { search.value = initial; query = initial.trim().toLowerCase(); }

    apply();
  }

  /* the reading view's field is a way back into the shelf */
  if (!list && searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var value = searchInput.value.trim();
      if (!value) return;
      var lib = $('.dock a[href]');
      var href = lib ? lib.getAttribute('href') : 'library.html';
      location.href = href + (href.indexOf('?') === -1 ? '?' : '&') + 'q=' + encodeURIComponent(value);
    });
  }

  /* ---------------------------------------------------------- add a link */
  $$('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      say('Paste a link — the demo stops at the door');
    });
  });

  /* ---------------------------------------------------------- copy a ref */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () {
          say('Ref ' + value + ' copied');
        }, function () { say(value); });
      } else {
        say(value);
      }
    });
  });
})();
