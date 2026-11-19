/* The demo's whole script: reveal on scroll, one filter, one toggle, one clipboard.
   No framework, no build step, nothing that needs to phone home. */
(function () {
  'use strict';

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

  /* ---------------------------------------------------------- library */
  var list = $('#list');
  if (list) {
    var rows = $$('.row-save', list);
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
      if (count) {
        count.textContent = shown + ' ' + (scope === 'archived' ? 'archived' : scope === 'all' ? 'saves' : 'active');
      }
      if (empty) empty.hidden = shown !== 0;
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
        $$('.chip-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        topic = btn.getAttribute('data-topic');
        apply();
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

    apply();
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
