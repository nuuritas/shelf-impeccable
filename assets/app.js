/* The demo's whole script: reveal on scroll, one filter, one fold, one clipboard.
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

  function copyRef(value) {
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        say('Ref ' + value + ' copied');
      }, function () { say(value); });
    } else {
      say(value);
    }
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
  $$('[data-focus-search]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (!searchInput) return;
      e.preventDefault();
      if (appBar && getComputedStyle(searchInput).display === 'none') setSearch(true);
      searchInput.focus();
      searchInput.select && searchInput.select();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && appBar && appBar.classList.contains('searching')) setSearch(false);
  });

  /* ---------------------------------------------------------- library */
  var list = $('#list');
  if (list) {
    var cards = $$('.save', list);
    var countTotal = $('#total');
    var empty = $('#empty');
    var state = { source: '', folder: '', label: '', view: 'active' };

    function cs(card, key) { return (card.getAttribute(key) || '').split(' '); }

    function matches(card) {
      var text = (card.getAttribute('data-text') || '').toLowerCase();
      return (
        (!state.source || card.getAttribute('data-source') === state.source) &&
        (!state.folder || cs(card, 'data-topic').indexOf(state.folder) !== -1) &&
        (!state.label || cs(card, 'data-label').indexOf(state.label) !== -1) &&
        (!query || text.indexOf(query) !== -1)
      );
    }

    function tally(attr, value, status) {
      return cards.filter(function (c) {
        var hit = attr === 'data-source' ? c.getAttribute('data-source') === value : cs(c, attr).indexOf(value) !== -1;
        return hit && (!status || c.getAttribute('data-status') === status);
      }).length;
    }

    function apply() {
      var active = 0;
      var archived = 0;
      cards.forEach(function (card) {
        var status = card.getAttribute('data-status');
        if (status === 'archived') archived++; else active++;
        card.hidden = status !== state.view || !matches(card);
      });

      var shown = cards.filter(function (c) { return !c.hidden; }).length;
      var filtered = state.source || state.folder || state.label || query;

      if (countTotal) {
        countTotal.textContent = filtered
          ? shown + (shown === 1 ? ' save' : ' saves')
          : (state.view === 'archived' ? archived + ' archived' : active + ' active');
      }
      if (empty) empty.hidden = shown !== 0;

      /* the menus keep their own tallies, so a count is never stale after an
         archive moved a save from one view to the other */
      [['source', 'data-source'], ['folder', 'data-topic'], ['label', 'data-label']].forEach(function (pair) {
        $$('[data-set^="' + pair[0] + ':"]').forEach(function (item) {
          var value = item.getAttribute('data-set').split(':')[1];
          var n = item.querySelector('.n');
          if (value && n) n.textContent = tally(pair[1], value);
        });
      });
      $$('[data-count="active"]').forEach(function (n) { n.textContent = active; });
      $$('[data-count="archived"]').forEach(function (n) { n.textContent = archived; });
      $$('[data-count="view"]').forEach(function (n) { n.textContent = state.view === 'archived' ? archived : active; });
    }

    function paintMenus() {
      $$('[data-menu]').forEach(function (menu) {
        var key = menu.getAttribute('data-menu');
        var chosen = state[key];
        var val = menu.querySelector('.fval');
        var item = menu.querySelector('[data-set="' + key + ':' + (chosen || '') + '"]');
        menu.classList.toggle('is-set', key === 'view' ? true : !!chosen);
        if (key === 'view') {
          val.textContent = chosen === 'archived' ? 'Archived' : 'Active';
        } else {
          val.textContent = chosen ? (item ? item.getAttribute('data-label') : chosen) : 'All';
        }
        $$('[data-set]', menu).forEach(function (a) { a.removeAttribute('aria-current'); });
        if (item) item.setAttribute('aria-current', 'true');
      });
      $$('[data-topic-jump]').forEach(function (a) {
        if (state.folder && a.getAttribute('data-topic-jump') === state.folder) a.setAttribute('data-on', '');
        else a.removeAttribute('data-on');
      });
    }

    $$('[data-set]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var bits = item.getAttribute('data-set').split(':');
        state[bits[0]] = bits[1];
        paintMenus();
        apply();
        var menu = item.closest('details');
        if (menu) menu.open = false;
      });
    });

    /* clicking away closes a menu, like every filter menu does */
    document.addEventListener('click', function (e) {
      $$('[data-menu][open]').forEach(function (menu) {
        if (!menu.contains(e.target)) menu.open = false;
      });
    });

    function setFolder(value) {
      state.folder = value || '';
      paintMenus();
      apply();
    }

    $$('[data-topic-jump]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        setFolder(link.getAttribute('data-topic-jump'));
        if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    $$('[data-label-jump]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        state.label = link.getAttribute('data-label-jump');
        paintMenus();
        apply();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    var query = '';
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
        state.source = state.folder = state.label = '';
        paintMenus();
        apply();
      });
    });

    /* ---------------------------------------------------------- the fold
       A tap on the card reads the rest of it, the way the app does; nothing
       opens. The actions a card needs when it is open — archive, copy the ref,
       leave for the source — arrive with the fold, so they cost no pixels
       while the shelf is being scanned. */
    function actionsFor(card) {
      var acts = $('.acts', card);
      if (acts) return acts;
      acts = document.createElement('div');
      acts.className = 'acts';

      var archived = card.getAttribute('data-status') === 'archived';
      var archive = document.createElement('button');
      archive.type = 'button';
      archive.setAttribute('data-archive', '');
      archive.textContent = archived ? 'Unarchive' : 'Archive';
      archive.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasArchived = card.getAttribute('data-status') === 'archived';
        card.setAttribute('data-status', wasArchived ? 'active' : 'archived');
        say(wasArchived ? 'Back on the shelf' : 'Archived — still searchable');
        apply();
      });
      acts.appendChild(archive);

      var refBtn = $('.ref', card);
      if (refBtn) {
        var copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copy ref';
        copy.addEventListener('click', function (e) {
          e.stopPropagation();
          copyRef(refBtn.getAttribute('data-copy'));
        });
        acts.appendChild(copy);
      }

      var note = card.getAttribute('data-source') === 'note';
      var link = note ? $('h2 a, h3 a', card) : $('a.src', card);
      if (link) {
        var out = document.createElement('a');
        out.href = link.getAttribute('href');
        if (!note) {
          out.target = '_blank';
          out.rel = 'noreferrer';
          out.textContent = 'Open ' + $('.src', card).textContent + ' ↗';
        } else {
          out.textContent = 'Open artifact ↗';
        }
        out.className = 'sp';
        acts.appendChild(out);
      }

      card.appendChild(acts);
      return acts;
    }

    function setOpen(card, open) {
      card.classList.toggle('is-open', open);
      var fold = $('.fold', card);
      if (fold) fold.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) actionsFor(card);
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('a,button,input,textarea,select')) return;
        setOpen(card, !card.classList.contains('is-open'));
      });
      var fold = $('.fold', card);
      if (fold) {
        fold.addEventListener('click', function (e) {
          e.stopPropagation();
          setOpen(card, !card.classList.contains('is-open'));
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      cards.forEach(function (card) {
        if (card.classList.contains('is-open')) setOpen(card, false);
      });
    });

    /* a search typed on the reading view arrives here as ?q= */
    var initial = '';
    try { initial = new URLSearchParams(location.search).get('q') || ''; } catch (err) {}
    if (initial && search) { search.value = initial; query = initial.trim().toLowerCase(); }

    paintMenus();
    apply();
  }

  /* the reading view's field is a way back into the shelf */
  if (!list && searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var value = searchInput.value.trim();
      if (!value) return;
      location.href = 'library.html?q=' + encodeURIComponent(value);
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
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      copyRef(btn.getAttribute('data-copy'));
    });
  });

  /* ------------------------------------------- four sources, one phone stage
     The share loop is 7.5s per source: the sheet rises, the save lands, and
     the next beat belongs to the next app. The radio moves when the loop comes
     round, so the label above the phone always names the screen behind it. */
  (function () {
    var stage = $('.showcase-ways');
    if (!stage) return;
    var shell = $('.ph-sheet', stage);
    var sources = $$('.ways-src', stage);
    if (!shell || sources.length < 2) return;
    var at = 0;
    for (var i = 0; i < sources.length; i++) if (sources[i].checked) at = i;
    shell.addEventListener('animationiteration', function () {
      at = (at + 1) % sources.length;
      sources[at].checked = true;
    });
  })();

  /* the artifact reader's archive is the same fake write, with one row */
  $$('[data-archive-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () { say('Archived — still searchable'); });
  });
})();
