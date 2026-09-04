(function () {
  'use strict';

  var CONFIG = window.EV_CONFIG;
  var STORAGE_KEY = 'evbot:prefs';

  var REFERENCE = null;
  var MARKET_FAMILIES = {};
  var BOOKS = []; // [{ canonical, value }]

  var state = {
    league: null,
    groupId: null,
    markets: new Set(),
    name: '',
    sharps: new Set(CONFIG.DEFAULTS.sharps),
    book: CONFIG.DEFAULTS.book,
    minBooks: CONFIG.DEFAULTS.minBooks,
    minLimit: CONFIG.DEFAULTS.minLimit,
    isMain: false
  };

  var els = {};

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    els.tabFavorites = $('tab-favorites');
    els.tabBuilder = $('tab-builder');
    els.panelFavorites = $('panel-favorites');
    els.panelBuilder = $('panel-builder');
    els.favoritesList = $('favorites-list');
    els.leagueChips = $('league-chips');
    els.groupChips = $('group-chips');
    els.marketsContainer = $('markets-container');
    els.nameInput = $('name-input');
    els.sharpsChips = $('sharps-chips');
    els.bookSelect = $('book-select');
    els.minBooksInput = $('min-books-input');
    els.minLimitInput = $('min-limit-input');
    els.isMainToggle = $('is-main-toggle');
    els.validationList = $('validation-list');
    els.resetBtn = $('reset-btn');
    els.commandText = $('command-text');
    els.copyBtn = $('copy-btn');
    els.fatalError = $('fatal-error');
  }

  // ---------- Reference / book helpers ----------

  function bookValue(canonical, tokens) {
    if (CONFIG.BOOK_TOKEN_OVERRIDES[canonical]) return CONFIG.BOOK_TOKEN_OVERRIDES[canonical];
    if (tokens.length === 1) return tokens[0];
    return tokens[1];
  }

  function buildBooksList(booksGrouped) {
    return booksGrouped.map(function (b) {
      return { canonical: b.canonical, value: bookValue(b.canonical, b.tokens) };
    });
  }

  function findLeague(id) {
    for (var i = 0; i < CONFIG.LEAGUES.length; i++) {
      if (CONFIG.LEAGUES[i].id === id) return CONFIG.LEAGUES[i];
    }
    return null;
  }

  function findGroup(leagueId, groupId) {
    var groups = CONFIG.MARKET_GROUPS[leagueId];
    if (!groups) return null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === groupId) return groups[i];
    }
    return null;
  }

  // Resolves a group's market list from its source (ALL_MARKETS sentinel,
  // prefix filter over a family, or an explicit curated array), de-duplicating
  // while preserving order. Explicit arrays are validated for membership in
  // validateConfigAgainstReference(); prefix/ALL results are correct by
  // construction since they're derived directly from the reference.
  function resolveGroupMarkets(group, league) {
    if (group.markets === CONFIG.ALL_MARKETS) {
      return (MARKET_FAMILIES[league.marketFamily] || []).slice();
    }
    var sourceFamily = MARKET_FAMILIES[group.family || league.marketFamily] || [];
    if (group.prefixes) {
      return sourceFamily.filter(function (m) {
        return group.prefixes.some(function (p) { return m.indexOf(p) === 0; });
      });
    }
    var seen = new Set();
    var result = [];
    (group.markets || []).forEach(function (m) {
      if (!seen.has(m)) { seen.add(m); result.push(m); }
    });
    return result;
  }

  function currentMarketsList() {
    if (!state.league || !state.groupId) return null;
    var group = findGroup(state.league, state.groupId);
    if (!group) return null;
    var leagueObj = findLeague(state.league);
    return resolveGroupMarkets(group, leagueObj);
  }

  function orderedSelectedMarkets() {
    var list = currentMarketsList();
    if (list) return list.filter(function (m) { return state.markets.has(m); });
    return Array.from(state.markets);
  }

  function orderedSelectedSharps() {
    // Keep the canonical default order (pinny,circa,bm,novig) first when those
    // are selected, then append any other selected books in reference order.
    var ordered = [];
    var seen = new Set();
    CONFIG.DEFAULTS.sharps.forEach(function (v) {
      if (state.sharps.has(v)) { ordered.push(v); seen.add(v); }
    });
    BOOKS.forEach(function (b) {
      if (state.sharps.has(b.value) && !seen.has(b.value)) { ordered.push(b.value); seen.add(b.value); }
    });
    return ordered;
  }

  // Dev-time validation of the grouping config against the reference JSON.
  // Checks (per the market-grouping spec):
  //   1. every explicitly-grouped market exists verbatim in its source family
  //   2. no group is empty
  //   3. duplicate entries within a single group's authored list are caught
  //   4. every league has an "All Markets" (ALL_MARKETS) fallback group
  // A market appearing in multiple DIFFERENT groups is expected and is never
  // flagged. Also produces a coverage report: source markets not reachable
  // from any convenience group other than All Markets, per league and for
  // the shared futures family.
  function validateConfigAgainstReference() {
    var problems = [];
    var coverageReport = {};

    CONFIG.LEAGUES.forEach(function (league) {
      var family = MARKET_FAMILIES[league.marketFamily];
      if (!family) {
        problems.push('League "' + league.id + '" references unknown market family "' + league.marketFamily + '"');
        return;
      }
      var groups = CONFIG.MARKET_GROUPS[league.id] || [];
      var hasAllMarkets = false;
      var covered = new Set();

      groups.forEach(function (group) {
        if (group.markets === CONFIG.ALL_MARKETS) {
          hasAllMarkets = true;
          return;
        }

        var sourceFamilyName = group.family || league.marketFamily;
        var sourceFamily = MARKET_FAMILIES[sourceFamilyName] || [];
        var resolved = resolveGroupMarkets(group, league);

        if (resolved.length === 0) {
          problems.push('Market group "' + league.id + '/' + group.id + '" resolves to zero markets');
        }

        if (group.markets && !group.prefixes) {
          // explicit curated list: check membership + catch authoring duplicates
          var seen = new Set();
          group.markets.forEach(function (m) {
            if (sourceFamily.indexOf(m) === -1) {
              problems.push('Market group "' + league.id + '/' + group.id + '" has unknown market "' + m + '" (not in ' + sourceFamilyName + ')');
            }
            if (seen.has(m)) {
              problems.push('Market group "' + league.id + '/' + group.id + '" has a duplicate entry: "' + m + '"');
            }
            seen.add(m);
          });
        }

        // Only groups sourced from the league's OWN family count toward its
        // "convenience coverage" — a Futures group pulls from a different
        // family entirely and shouldn't mask gaps in the league's own list.
        if (!group.family) {
          resolved.forEach(function (m) { covered.add(m); });
        }
      });

      if (!hasAllMarkets) {
        problems.push('League "' + league.id + '" has no All Markets fallback group');
      }

      var uncovered = family.filter(function (m) { return !covered.has(m); });
      coverageReport[league.id] = uncovered;
    });

    CONFIG.PRESETS.forEach(function (preset) {
      var league = findLeague(preset.league);
      if (!league) { problems.push('Preset "' + preset.id + '" has unknown league "' + preset.league + '"'); return; }
      var family = MARKET_FAMILIES[league.marketFamily] || [];
      preset.markets.forEach(function (m) {
        if (family.indexOf(m) === -1) {
          problems.push('Preset "' + preset.id + '" has unknown market "' + m + '"');
        }
      });
    });

    var bookValues = BOOKS.map(function (b) { return b.value; });
    CONFIG.DEFAULTS.sharps.forEach(function (s) {
      if (bookValues.indexOf(s) === -1) problems.push('Default sharp "' + s + '" is not a known book token');
    });
    if (bookValues.indexOf(CONFIG.DEFAULTS.book) === -1) {
      problems.push('Default book "' + CONFIG.DEFAULTS.book + '" is not a known book token');
    }

    if (problems.length) {
      console.warn('[EV Bot config] ' + problems.length + ' issue(s) found:\n' + problems.join('\n'));
    }

    var coverageLines = [];
    Object.keys(coverageReport).forEach(function (leagueId) {
      var gaps = coverageReport[leagueId];
      if (gaps.length) {
        coverageLines.push(leagueId + ' (' + gaps.length + '): ' + gaps.join(', '));
      }
    });
    if (coverageLines.length) {
      console.info('[EV Bot config] Markets only reachable via All Markets (no convenience group):\n' + coverageLines.join('\n'));
    }

    return { problems: problems, coverageReport: coverageReport };
  }

  // ---------- Persistence ----------

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var prefs = JSON.parse(raw);
      if (prefs.league && findLeague(prefs.league)) state.league = prefs.league;
      if (prefs.book) state.book = prefs.book;
      if (Array.isArray(prefs.sharps) && prefs.sharps.length) state.sharps = new Set(prefs.sharps);
      if (typeof prefs.minBooks === 'number') state.minBooks = prefs.minBooks;
      if (typeof prefs.minLimit === 'number') state.minLimit = prefs.minLimit;
    } catch (e) {
      // ignore corrupt/blocked storage
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        league: state.league,
        book: state.book,
        sharps: Array.from(state.sharps),
        minBooks: state.minBooks,
        minLimit: state.minLimit
      }));
    } catch (e) {
      // ignore
    }
  }

  // ---------- Command generation ----------

  function generateCommand(s) {
    var parts = ['/run command_name:all'];
    if (s.league) parts.push('leagues:' + s.league);
    if (s.sharps && s.sharps.length) parts.push('sharps:' + s.sharps.join(','));
    if (s.markets && s.markets.length) parts.push('markets:' + s.markets.join(','));
    if (s.book) parts.push('books:' + s.book);
    if (s.name && String(s.name).trim()) parts.push('name:' + String(s.name).trim());
    if (s.minBooks !== '' && s.minBooks !== null && s.minBooks !== undefined) parts.push('min_books:' + s.minBooks);
    if (s.minLimit !== '' && s.minLimit !== null && s.minLimit !== undefined) parts.push('min_limit:' + s.minLimit);
    if (s.isMain) parts.push('is_main:true');
    return parts.join(' ');
  }

  function currentCommandState() {
    return {
      league: state.league,
      sharps: orderedSelectedSharps(),
      markets: orderedSelectedMarkets(),
      book: state.book,
      name: state.name,
      minBooks: state.minBooks,
      minLimit: state.minLimit,
      isMain: state.isMain
    };
  }

  function presetCommandState(preset) {
    return {
      league: preset.league,
      sharps: preset.sharps || CONFIG.DEFAULTS.sharps,
      markets: preset.markets,
      book: preset.book || CONFIG.DEFAULTS.book,
      name: preset.name || '',
      minBooks: preset.minBooks != null ? preset.minBooks : CONFIG.DEFAULTS.minBooks,
      minLimit: preset.minLimit != null ? preset.minLimit : CONFIG.DEFAULTS.minLimit,
      isMain: !!preset.isMain
    };
  }

  function validate(s) {
    var issues = [];
    if (!s.league) issues.push('Select a league.');
    if (!s.markets || !s.markets.length) issues.push('Select at least one market.');
    if (!s.sharps || !s.sharps.length) issues.push('Select at least one sharp book.');
    if (!s.book) issues.push('Select a target book.');
    return issues;
  }

  // ---------- Clipboard ----------

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('execCommand copy failed'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function flashCopied(btn, defaultLabel) {
    var original = defaultLabel !== undefined ? defaultLabel : btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1400);
  }

  // ---------- Rendering: tabs ----------

  function switchTab(tab) {
    var isFav = tab === 'favorites';
    els.tabFavorites.setAttribute('aria-selected', String(isFav));
    els.tabBuilder.setAttribute('aria-selected', String(!isFav));
    els.panelFavorites.hidden = !isFav;
    els.panelBuilder.hidden = isFav;
    if (!isFav) window.scrollTo(0, 0);
  }

  // ---------- Rendering: favorites ----------

  function renderFavorites() {
    els.favoritesList.innerHTML = '';
    CONFIG.LEAGUES.forEach(function (league) {
      var presets = CONFIG.PRESETS.filter(function (p) { return p.league === league.id; });
      if (!presets.length) return;

      var group = document.createElement('section');
      group.className = 'league-group';

      var heading = document.createElement('h2');
      heading.textContent = league.label;
      group.appendChild(heading);

      presets.forEach(function (preset) {
        group.appendChild(buildPresetCard(preset));
      });

      els.favoritesList.appendChild(group);
    });
  }

  function buildPresetCard(preset) {
    var card = document.createElement('div');
    card.className = 'preset-card';

    var title = document.createElement('div');
    title.className = 'preset-card-title';
    title.textContent = preset.label;
    card.appendChild(title);

    if (preset.description) {
      var desc = document.createElement('div');
      desc.className = 'preset-card-desc';
      desc.textContent = preset.description;
      card.appendChild(desc);
    }

    var actions = document.createElement('div');
    actions.className = 'preset-card-actions';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn small';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function () {
      var cmd = generateCommand(presetCommandState(preset));
      copyToClipboard(cmd).then(function () {
        flashCopied(copyBtn, 'Copy');
      }).catch(function () {
        copyBtn.textContent = 'Copy failed';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
      });
    });

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn small primary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', function () {
      loadPresetIntoBuilder(preset);
    });

    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    card.appendChild(actions);

    return card;
  }

  function loadPresetIntoBuilder(preset) {
    state.league = preset.league;
    state.groupId = 'custom';
    state.markets = new Set(preset.markets);
    state.name = preset.name || '';
    state.sharps = new Set(preset.sharps || CONFIG.DEFAULTS.sharps);
    state.book = preset.book || CONFIG.DEFAULTS.book;
    state.minBooks = preset.minBooks != null ? preset.minBooks : CONFIG.DEFAULTS.minBooks;
    state.minLimit = preset.minLimit != null ? preset.minLimit : CONFIG.DEFAULTS.minLimit;
    state.isMain = !!preset.isMain;

    switchTab('builder');
    renderLeagueChips();
    renderGroupChips();
    renderMarkets();
    els.nameInput.value = state.name;
    renderSharpsChips();
    els.bookSelect.value = state.book;
    els.minBooksInput.value = state.minBooks;
    els.minLimitInput.value = state.minLimit;
    els.isMainToggle.checked = state.isMain;
    updateCommand();
    savePrefs();
  }

  // ---------- Rendering: builder ----------

  function hintEl(text) {
    var p = document.createElement('p');
    p.className = 'field-hint';
    p.textContent = text;
    return p;
  }

  function makeChip(label, pressed, onClick) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('aria-pressed', String(pressed));
    chip.textContent = label;
    chip.addEventListener('click', onClick);
    return chip;
  }

  function renderLeagueChips() {
    els.leagueChips.innerHTML = '';
    CONFIG.LEAGUES.forEach(function (league) {
      var chip = makeChip(league.label, state.league === league.id, function () {
        selectLeague(league.id);
      });
      els.leagueChips.appendChild(chip);
    });
  }

  function selectLeague(id) {
    if (state.league === id) return;
    state.league = id;
    state.groupId = null;
    state.markets = new Set();
    state.name = '';
    renderLeagueChips();
    renderGroupChips();
    renderMarkets();
    els.nameInput.value = state.name;
    updateCommand();
    savePrefs();
  }

  function renderGroupChips() {
    els.groupChips.innerHTML = '';
    if (!state.league) {
      els.groupChips.appendChild(hintEl('Select a league first.'));
      return;
    }
    var groups = CONFIG.MARKET_GROUPS[state.league] || [];
    groups.forEach(function (group) {
      var chip = makeChip(group.label, state.groupId === group.id, function () {
        selectGroup(group.id);
      });
      els.groupChips.appendChild(chip);
    });
  }

  function selectGroup(groupId) {
    state.groupId = groupId;
    state.markets = new Set();
    var group = findGroup(state.league, groupId);
    state.name = (group && group.defaultName) ? group.defaultName : '';
    renderGroupChips();
    renderMarkets();
    els.nameInput.value = state.name;
    updateCommand();
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function renderMarkets() {
    var container = els.marketsContainer;
    container.innerHTML = '';

    if (!state.league) {
      container.appendChild(hintEl('Select a league first.'));
      return;
    }
    if (!state.groupId) {
      container.appendChild(hintEl('Select a market group above.'));
      return;
    }
    var list = currentMarketsList();
    if (!list || !list.length) {
      container.appendChild(hintEl('No markets available for this group.'));
      return;
    }

    var bulkRow = document.createElement('div');
    bulkRow.className = 'bulk-row';

    var selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'btn small ghost';
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.addEventListener('click', function () {
      list.forEach(function (m) { state.markets.add(m); });
      renderMarkets();
      updateCommand();
    });

    var clearAllBtn = document.createElement('button');
    clearAllBtn.type = 'button';
    clearAllBtn.className = 'btn small ghost';
    clearAllBtn.textContent = 'Clear All';
    clearAllBtn.addEventListener('click', function () {
      list.forEach(function (m) { state.markets.delete(m); });
      renderMarkets();
      updateCommand();
    });

    bulkRow.appendChild(selectAllBtn);
    bulkRow.appendChild(clearAllBtn);
    container.appendChild(bulkRow);

    var wrap = document.createElement('div');
    wrap.className = 'market-list';

    list.forEach(function (market, idx) {
      var row = document.createElement('div');
      row.className = 'market-row';

      var checkboxId = 'market-' + idx + '-' + slugify(market);
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.id = checkboxId;
      input.checked = state.markets.has(market);
      input.addEventListener('change', function () {
        if (input.checked) state.markets.add(market); else state.markets.delete(market);
        updateCommand();
      });

      var label = document.createElement('label');
      label.setAttribute('for', checkboxId);
      label.textContent = market;

      row.appendChild(input);
      row.appendChild(label);
      wrap.appendChild(row);
    });

    container.appendChild(wrap);
  }

  function renderSharpsChips() {
    els.sharpsChips.innerHTML = '';
    BOOKS.forEach(function (book) {
      var chip = makeChip(book.canonical, state.sharps.has(book.value), function () {
        if (state.sharps.has(book.value)) state.sharps.delete(book.value);
        else state.sharps.add(book.value);
        chip.setAttribute('aria-pressed', String(state.sharps.has(book.value)));
        updateCommand();
        savePrefs();
      });
      els.sharpsChips.appendChild(chip);
    });
  }

  function renderBookSelect() {
    els.bookSelect.innerHTML = '';
    BOOKS.forEach(function (book) {
      var opt = document.createElement('option');
      opt.value = book.value;
      opt.textContent = book.canonical;
      els.bookSelect.appendChild(opt);
    });
    els.bookSelect.value = state.book;
  }

  function renderValidation() {
    var issues = validate(currentCommandState());
    els.validationList.innerHTML = '';
    issues.forEach(function (msg) {
      var li = document.createElement('li');
      li.textContent = msg;
      els.validationList.appendChild(li);
    });
    els.copyBtn.disabled = issues.length > 0;
    return issues;
  }

  function updateCommand() {
    var cmd = generateCommand(currentCommandState());
    els.commandText.textContent = cmd;
    renderValidation();
  }

  function resetBuilder() {
    state.league = null;
    state.groupId = null;
    state.markets = new Set();
    state.name = '';
    state.sharps = new Set(CONFIG.DEFAULTS.sharps);
    state.book = CONFIG.DEFAULTS.book;
    state.minBooks = CONFIG.DEFAULTS.minBooks;
    state.minLimit = CONFIG.DEFAULTS.minLimit;
    state.isMain = false;

    renderLeagueChips();
    renderGroupChips();
    renderMarkets();
    els.nameInput.value = '';
    renderSharpsChips();
    els.bookSelect.value = state.book;
    els.minBooksInput.value = state.minBooks;
    els.minLimitInput.value = state.minLimit;
    els.isMainToggle.checked = false;
    updateCommand();
    savePrefs();
  }

  // ---------- Bind events ----------

  function bindStaticEvents() {
    els.tabFavorites.addEventListener('click', function () { switchTab('favorites'); });
    els.tabBuilder.addEventListener('click', function () { switchTab('builder'); });

    els.nameInput.addEventListener('input', function () {
      state.name = els.nameInput.value;
      updateCommand();
    });

    els.bookSelect.addEventListener('change', function () {
      state.book = els.bookSelect.value;
      updateCommand();
      savePrefs();
    });

    els.minBooksInput.addEventListener('input', function () {
      var v = els.minBooksInput.value;
      state.minBooks = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0);
      updateCommand();
      savePrefs();
    });

    els.minLimitInput.addEventListener('input', function () {
      var v = els.minLimitInput.value;
      state.minLimit = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0);
      updateCommand();
      savePrefs();
    });

    els.isMainToggle.addEventListener('change', function () {
      state.isMain = els.isMainToggle.checked;
      updateCommand();
    });

    els.resetBtn.addEventListener('click', resetBuilder);

    els.copyBtn.addEventListener('click', function () {
      var cmd = generateCommand(currentCommandState());
      copyToClipboard(cmd).then(function () {
        flashCopied(els.copyBtn, 'Copy Command');
      }).catch(function () {
        els.copyBtn.textContent = 'Copy failed';
        setTimeout(function () { els.copyBtn.textContent = 'Copy Command'; }, 1400);
      });
    });
  }

  function showFatalError(msg) {
    if (!els.fatalError) return;
    els.fatalError.textContent = msg;
    els.fatalError.hidden = false;
  }

  // ---------- Init ----------

  function init() {
    cacheEls();
    fetch('./data/ev-bot-reference.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        REFERENCE = data.ev_bot_reference_v1;
        MARKET_FAMILIES = REFERENCE.markets;
        BOOKS = buildBooksList(REFERENCE.books.books_grouped);

        validateConfigAgainstReference();
        loadPrefs();
        bindStaticEvents();

        renderFavorites();
        renderLeagueChips();
        renderGroupChips();
        renderMarkets();
        els.nameInput.value = state.name;
        renderSharpsChips();
        renderBookSelect();
        els.minBooksInput.value = state.minBooks;
        els.minLimitInput.value = state.minLimit;
        els.isMainToggle.checked = state.isMain;
        updateCommand();

        switchTab('favorites');
      })
      .catch(function (err) {
        showFatalError('Failed to load EV Bot reference data (' + err.message + '). Try reloading.');
      });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {
          // offline install is a nice-to-have; ignore failures
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
