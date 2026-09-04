(function () {
  'use strict';

  var CONFIG = window.EV_CONFIG;
  var STORAGE_KEY = 'evbot:prefs';

  var REFERENCE = null;
  var MARKET_FAMILIES = {};
  var BOOKS = []; // [{ canonical, value }]

  var MARKET_MODES = [
    { id: 'all', label: 'All Markets', value: 'all' },
    { id: 'player', label: 'Player Props Only', value: 'player' },
    { id: 'nonplayer', label: 'Non-Player Markets', value: '!player' }
  ];

  var LIVE_OPTIONS = [
    { value: 'pregame', label: 'Pregame' },
    { value: 'live', label: 'Live' },
    { value: 'all', label: 'All' }
  ];

  // state.leagues: multi-select. In single-league mode, groupId/markets drive
  // the detailed taxonomy from the market-grouping config. In multi-league
  // mode, marketMode drives one of the bot's cross-sport selectors instead
  // (all / player / !player) — the two are mutually exclusive by league count.
  var state = {
    leagues: [],
    groupId: null,
    markets: new Set(),
    marketMode: null,
    name: '',
    sharps: new Set(CONFIG.DEFAULTS.sharps),
    books: new Set(CONFIG.DEFAULTS.books),
    minBooks: CONFIG.DEFAULTS.minBooks,
    minLimit: CONFIG.DEFAULTS.minLimit,
    hoursTillEvent: CONFIG.DEFAULTS.hoursTillEvent,
    evMin: '',
    minOdds: '',
    maxOdds: '',
    teams: '',
    players: '',
    live: '',
    boostPercentage: '',
    isMain: false,
    excludeOneWays: false,
    devigType: '',   // '' = inherited from the saved `all` command (synth)
    devigMethod: ''  // '' = inherited from the saved `all` command (probit)
  };

  var els = {};

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    els.tabFavorites = $('tab-favorites');
    els.tabBuilder = $('tab-builder');
    els.panelFavorites = $('panel-favorites');
    els.panelBuilder = $('panel-builder');
    els.favoritesList = $('favorites-list');
    els.fatalError = $('fatal-error');

    els.leagueChips = $('league-chips');
    els.leagueSelectAll = $('league-select-all');
    els.leagueClearAll = $('league-clear-all');
    els.marketSectionHint = $('market-section-hint');
    els.marketGroupBlock = $('market-group-block');
    els.groupSelect = $('group-select');
    els.marketsBlock = $('markets-block');
    els.marketsContainer = $('markets-container');
    els.marketModeBlock = $('market-mode-block');
    els.marketModeChips = $('market-mode-chips');
    els.nameInput = $('name-input');

    els.sharpsChips = $('sharps-chips');
    els.booksChips = $('books-chips');
    els.minBooksInput = $('min-books-input');
    els.minLimitInput = $('min-limit-input');
    els.hoursInput = $('hours-input');

    els.filtersDetails = $('filters-details');
    els.evMinInput = $('ev-min-input');
    els.minOddsInput = $('min-odds-input');
    els.maxOddsInput = $('max-odds-input');
    els.teamsInput = $('teams-input');
    els.playersInput = $('players-input');
    els.liveSegmented = $('live-segmented');

    els.advancedDetails = $('advanced-details');
    els.boostInput = $('boost-input');
    els.isMainToggle = $('is-main-toggle');
    els.excludeOneWaysToggle = $('exclude-one-ways-toggle');
    els.devigTypeSelect = $('devig-type-select');
    els.devigMethodSelect = $('devig-method-select');

    els.validationList = $('validation-list');
    els.commandText = $('command-text');
    els.copyBtn = $('copy-btn');
    els.resetBtn = $('reset-btn');
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
    if (state.leagues.length !== 1 || !state.groupId) return null;
    var group = findGroup(state.leagues[0], state.groupId);
    if (!group) return null;
    var leagueObj = findLeague(state.leagues[0]);
    return resolveGroupMarkets(group, leagueObj);
  }

  function orderedSelectedMarkets() {
    var list = currentMarketsList();
    if (list) return list.filter(function (m) { return state.markets.has(m); });
    return Array.from(state.markets);
  }

  // Keeps a canonical default order first (when those items are selected),
  // then appends any other selections in reference/config order. Used for
  // sharps, books, and leagues so output is stable regardless of click order.
  function orderedBySet(selectedSet, canonicalOrder, fallbackOrder) {
    var ordered = [];
    var seen = new Set();
    canonicalOrder.forEach(function (v) {
      if (selectedSet.has(v)) { ordered.push(v); seen.add(v); }
    });
    fallbackOrder.forEach(function (v) {
      if (selectedSet.has(v) && !seen.has(v)) { ordered.push(v); seen.add(v); }
    });
    return ordered;
  }

  function orderedSelectedSharps() {
    return orderedBySet(state.sharps, CONFIG.DEFAULTS.sharps, BOOKS.map(function (b) { return b.value; }));
  }

  function orderedSelectedBooks() {
    return orderedBySet(state.books, CONFIG.DEFAULTS.books, BOOKS.map(function (b) { return b.value; }));
  }

  function orderedSelectedLeagues() {
    var leagueIds = CONFIG.LEAGUES.map(function (l) { return l.id; });
    return orderedBySet(new Set(state.leagues), leagueIds, leagueIds);
  }

  // Resolves the `markets:` param value as a ready-to-use string: a CSV list
  // of exact market strings in single-league mode, or one of the bot's
  // cross-sport selectors (all / player / !player) in multi-league mode.
  function resolveMarketsParam() {
    if (state.leagues.length > 1) {
      var mode = MARKET_MODES.filter(function (m) { return m.id === state.marketMode; })[0];
      return mode ? mode.value : '';
    }
    var list = orderedSelectedMarkets();
    return list.length ? list.join(',') : '';
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

        if (!group.family) {
          resolved.forEach(function (m) { covered.add(m); });
        }
      });

      if (!hasAllMarkets) {
        problems.push('League "' + league.id + '" has no All Markets fallback group');
      }

      coverageReport[league.id] = family.filter(function (m) { return !covered.has(m); });
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
    CONFIG.DEFAULTS.books.forEach(function (b) {
      if (bookValues.indexOf(b) === -1) problems.push('Default book "' + b + '" is not a known book token');
    });

    if (problems.length) {
      console.warn('[EV Bot config] ' + problems.length + ' issue(s) found:\n' + problems.join('\n'));
    }

    var coverageLines = [];
    Object.keys(coverageReport).forEach(function (leagueId) {
      var gaps = coverageReport[leagueId];
      if (gaps.length) coverageLines.push(leagueId + ' (' + gaps.length + '): ' + gaps.join(', '));
    });
    if (coverageLines.length) {
      console.info('[EV Bot config] Markets only reachable via All Markets (no convenience group):\n' + coverageLines.join('\n'));
    }

    return { problems: problems, coverageReport: coverageReport };
  }

  // ---------- Persistence ----------
  // Only durable, low-friction preferences are persisted (last leagues,
  // sharps, books, thresholds, hours). Ephemeral per-scan state — the
  // selected market group, exact markets, and one-off filters — is never
  // persisted, and a preset's canonical config is never rewritten by
  // Builder edits; see resetBuilder()/loadPresetIntoBuilder() below.

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var prefs = JSON.parse(raw);
      if (Array.isArray(prefs.leagues)) {
        state.leagues = prefs.leagues.filter(function (id) { return !!findLeague(id); });
      }
      if (Array.isArray(prefs.sharps) && prefs.sharps.length) state.sharps = new Set(prefs.sharps);
      if (Array.isArray(prefs.books) && prefs.books.length) state.books = new Set(prefs.books);
      if (typeof prefs.minBooks === 'number') state.minBooks = prefs.minBooks;
      if (typeof prefs.minLimit === 'number') state.minLimit = prefs.minLimit;
      if (typeof prefs.hoursTillEvent === 'number') state.hoursTillEvent = prefs.hoursTillEvent;
    } catch (e) {
      // ignore corrupt/blocked storage
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        leagues: state.leagues,
        sharps: Array.from(state.sharps),
        books: Array.from(state.books),
        minBooks: state.minBooks,
        minLimit: state.minLimit,
        hoursTillEvent: state.hoursTillEvent
      }));
    } catch (e) {
      // ignore
    }
  }

  // ---------- Command generation ----------

  function notEmpty(v) { return v !== '' && v !== null && v !== undefined; }

  // Parameter order per spec: leagues, sharps, markets, books, name,
  // min_books, min_limit, ev_min, min_odds, max_odds, teams, players, live,
  // hours_till_event, boost_percentage, devig_type, devig_method, is_main,
  // exclude_one_ways. Every optional field is simply omitted when unset —
  // never emitted as an empty `field:` token.
  function generateCommand(s) {
    var parts = ['/run command_name:all'];
    if (s.leagues && s.leagues.length) parts.push('leagues:' + s.leagues.join(','));
    if (s.sharps && s.sharps.length) parts.push('sharps:' + s.sharps.join(','));
    if (s.markets) parts.push('markets:' + s.markets);
    if (s.books && s.books.length) parts.push('books:' + s.books.join(','));
    if (s.name && String(s.name).trim()) parts.push('name:' + String(s.name).trim());
    if (notEmpty(s.minBooks)) parts.push('min_books:' + s.minBooks);
    if (notEmpty(s.minLimit)) parts.push('min_limit:' + s.minLimit);
    if (notEmpty(s.evMin)) parts.push('ev_min:' + s.evMin);
    if (notEmpty(s.minOdds)) parts.push('min_odds:' + s.minOdds);
    if (notEmpty(s.maxOdds)) parts.push('max_odds:' + s.maxOdds);
    if (s.teams && String(s.teams).trim()) parts.push('teams:' + String(s.teams).trim());
    if (s.players && String(s.players).trim()) parts.push('players:' + String(s.players).trim());
    if (s.live) parts.push('live:' + s.live);
    if (notEmpty(s.hoursTillEvent)) parts.push('hours_till_event:' + s.hoursTillEvent);
    if (notEmpty(s.boostPercentage)) parts.push('boost_percentage:' + s.boostPercentage);
    if (s.devigType) parts.push('devig_type:' + s.devigType);
    if (s.devigMethod) parts.push('devig_method:' + s.devigMethod);
    if (s.isMain) parts.push('is_main:true');
    if (s.excludeOneWays) parts.push('exclude_one_ways:true');
    return parts.join(' ');
  }

  function currentCommandState() {
    return {
      leagues: orderedSelectedLeagues(),
      sharps: orderedSelectedSharps(),
      markets: resolveMarketsParam(),
      books: orderedSelectedBooks(),
      name: state.name,
      minBooks: state.minBooks,
      minLimit: state.minLimit,
      evMin: state.evMin,
      minOdds: state.minOdds,
      maxOdds: state.maxOdds,
      teams: state.teams,
      players: state.players,
      live: state.live,
      hoursTillEvent: state.hoursTillEvent,
      boostPercentage: state.boostPercentage,
      devigType: state.devigType,
      devigMethod: state.devigMethod,
      isMain: state.isMain,
      excludeOneWays: state.excludeOneWays
    };
  }

  // Every standard preset explicitly uses the application defaults (sharps,
  // books, min_books, min_limit, hours_till_event) unless it overrides one —
  // it never relies on the saved `all` command's own broad inherited config.
  function presetCommandState(preset) {
    return {
      leagues: [preset.league],
      sharps: preset.sharps || CONFIG.DEFAULTS.sharps,
      markets: (preset.markets || []).join(','),
      books: preset.books || CONFIG.DEFAULTS.books,
      name: preset.name || '',
      minBooks: preset.minBooks != null ? preset.minBooks : CONFIG.DEFAULTS.minBooks,
      minLimit: preset.minLimit != null ? preset.minLimit : CONFIG.DEFAULTS.minLimit,
      evMin: preset.evMin || '',
      minOdds: preset.minOdds != null ? preset.minOdds : '',
      maxOdds: preset.maxOdds != null ? preset.maxOdds : '',
      teams: preset.teams || '',
      players: preset.players || '',
      live: preset.live || '',
      hoursTillEvent: preset.hoursTillEvent != null ? preset.hoursTillEvent : CONFIG.DEFAULTS.hoursTillEvent,
      boostPercentage: preset.boostPercentage != null ? preset.boostPercentage : '',
      devigType: preset.devigType || '',
      devigMethod: preset.devigMethod || '',
      isMain: !!preset.isMain,
      excludeOneWays: !!preset.excludeOneWays
    };
  }

  function validate(s) {
    var issues = [];
    if (!s.leagues || !s.leagues.length) issues.push('Select at least one league.');
    if (!s.markets) issues.push('Select markets (or a market mode for multi-league scans).');
    if (!s.sharps || !s.sharps.length) issues.push('Select at least one sharp book.');
    if (!s.books || !s.books.length) issues.push('Select at least one target book.');
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

  // ---------- Rendering: favorites (compact rows, collapsible per league) ----------

  function renderFavorites() {
    els.favoritesList.innerHTML = '';
    CONFIG.LEAGUES.forEach(function (league) {
      var presets = CONFIG.PRESETS.filter(function (p) { return p.league === league.id; });
      if (!presets.length) return;

      var details = document.createElement('details');
      details.className = 'league-section';
      details.open = true;

      var summary = document.createElement('summary');
      summary.textContent = league.label + ' (' + presets.length + ')';
      details.appendChild(summary);

      var rows = document.createElement('div');
      rows.className = 'preset-rows';
      presets.forEach(function (preset) { rows.appendChild(buildPresetRow(preset)); });
      details.appendChild(rows);

      els.favoritesList.appendChild(details);
    });
  }

  function buildPresetRow(preset) {
    var row = document.createElement('div');
    row.className = 'preset-row';
    if (preset.description) row.title = preset.description;

    var label = document.createElement('span');
    label.className = 'preset-row-label';
    label.textContent = preset.label;
    row.appendChild(label);

    var actions = document.createElement('div');
    actions.className = 'preset-row-actions';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn tiny';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function () {
      var cmd = generateCommand(presetCommandState(preset));
      copyToClipboard(cmd).then(function () {
        flashCopied(copyBtn, 'Copy');
      }).catch(function () {
        copyBtn.textContent = 'Failed';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
      });
    });

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn tiny primary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', function () { loadPresetIntoBuilder(preset); });

    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    row.appendChild(actions);

    return row;
  }

  function loadPresetIntoBuilder(preset) {
    state.leagues = [preset.league];
    state.groupId = 'custom';
    state.markets = new Set(preset.markets);
    state.marketMode = null;
    state.name = preset.name || '';
    state.sharps = new Set(preset.sharps || CONFIG.DEFAULTS.sharps);
    state.books = new Set(preset.books || CONFIG.DEFAULTS.books);
    state.minBooks = preset.minBooks != null ? preset.minBooks : CONFIG.DEFAULTS.minBooks;
    state.minLimit = preset.minLimit != null ? preset.minLimit : CONFIG.DEFAULTS.minLimit;
    state.hoursTillEvent = preset.hoursTillEvent != null ? preset.hoursTillEvent : CONFIG.DEFAULTS.hoursTillEvent;
    state.evMin = preset.evMin || '';
    state.minOdds = preset.minOdds != null ? preset.minOdds : '';
    state.maxOdds = preset.maxOdds != null ? preset.maxOdds : '';
    state.teams = preset.teams || '';
    state.players = preset.players || '';
    state.live = preset.live || '';
    state.boostPercentage = preset.boostPercentage != null ? preset.boostPercentage : '';
    state.devigType = preset.devigType || '';
    state.devigMethod = preset.devigMethod || '';
    state.isMain = !!preset.isMain;
    state.excludeOneWays = !!preset.excludeOneWays;

    switchTab('builder');
    renderLeagueChips();
    renderMarketSection();
    els.nameInput.value = state.name;
    renderSharpsChips();
    renderBooksChips();
    syncScalarInputs();
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

  function makeChip(label, pressed, onClick, title) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('aria-pressed', String(pressed));
    chip.textContent = label;
    if (title) chip.title = title;
    chip.addEventListener('click', onClick);
    return chip;
  }

  // ----- League (multi-select) -----

  function renderLeagueChips() {
    els.leagueChips.innerHTML = '';
    CONFIG.LEAGUES.forEach(function (league) {
      var selected = state.leagues.indexOf(league.id) !== -1;
      var chip = makeChip(league.label, selected, function () { toggleLeague(league.id); });
      els.leagueChips.appendChild(chip);
    });
  }

  function onLeaguesChanged() {
    state.groupId = null;
    state.markets = new Set();
    state.marketMode = null;
    state.name = '';
    renderLeagueChips();
    renderMarketSection();
    els.nameInput.value = state.name;
    updateCommand();
    savePrefs();
  }

  function toggleLeague(id) {
    var idx = state.leagues.indexOf(id);
    if (idx === -1) state.leagues.push(id); else state.leagues.splice(idx, 1);
    onLeaguesChanged();
  }

  function selectAllLeagues() {
    state.leagues = CONFIG.LEAGUES.map(function (l) { return l.id; });
    onLeaguesChanged();
  }

  function clearAllLeagues() {
    state.leagues = [];
    onLeaguesChanged();
  }

  // ----- Market section: single-league detailed taxonomy vs multi-league mode -----

  function renderMarketSection() {
    var count = state.leagues.length;
    els.marketSectionHint.hidden = count > 0;
    els.marketGroupBlock.hidden = count !== 1;
    els.marketsBlock.hidden = count !== 1;
    els.marketModeBlock.hidden = count <= 1;

    if (count === 1) {
      renderGroupSelect();
      renderMarkets();
    } else if (count > 1) {
      renderMarketModeChips();
    }
  }

  function renderGroupSelect() {
    var leagueId = state.leagues[0];
    var groups = CONFIG.MARKET_GROUPS[leagueId] || [];
    els.groupSelect.innerHTML = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a market group…';
    els.groupSelect.appendChild(placeholder);

    groups.forEach(function (group) {
      var opt = document.createElement('option');
      opt.value = group.id;
      opt.textContent = group.label;
      els.groupSelect.appendChild(opt);
    });

    els.groupSelect.value = state.groupId || '';
  }

  function selectGroup(groupId) {
    state.groupId = groupId || null;
    state.markets = new Set();
    var group = groupId ? findGroup(state.leagues[0], groupId) : null;
    state.name = (group && group.defaultName) ? group.defaultName : '';
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
    selectAllBtn.className = 'btn tiny ghost';
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.addEventListener('click', function () {
      list.forEach(function (m) { state.markets.add(m); });
      renderMarkets();
      updateCommand();
    });

    var clearAllBtn = document.createElement('button');
    clearAllBtn.type = 'button';
    clearAllBtn.className = 'btn tiny ghost';
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

  function renderMarketModeChips() {
    els.marketModeChips.innerHTML = '';
    MARKET_MODES.forEach(function (mode) {
      var chip = makeChip(mode.label, state.marketMode === mode.id, function () {
        state.marketMode = state.marketMode === mode.id ? null : mode.id;
        renderMarketModeChips();
        updateCommand();
      });
      els.marketModeChips.appendChild(chip);
    });
  }

  // ----- Sharps / Books (compact multi-select chips, abbreviated labels) -----

  function renderSharpsChips() {
    els.sharpsChips.innerHTML = '';
    BOOKS.forEach(function (book) {
      var chip = makeChip(book.value.toUpperCase(), state.sharps.has(book.value), function () {
        if (state.sharps.has(book.value)) state.sharps.delete(book.value);
        else state.sharps.add(book.value);
        chip.setAttribute('aria-pressed', String(state.sharps.has(book.value)));
        updateCommand();
        savePrefs();
      }, book.canonical);
      els.sharpsChips.appendChild(chip);
    });
  }

  function renderBooksChips() {
    els.booksChips.innerHTML = '';
    BOOKS.forEach(function (book) {
      var chip = makeChip(book.value.toUpperCase(), state.books.has(book.value), function () {
        if (state.books.has(book.value)) state.books.delete(book.value);
        else state.books.add(book.value);
        chip.setAttribute('aria-pressed', String(state.books.has(book.value)));
        updateCommand();
        savePrefs();
      }, book.canonical);
      els.booksChips.appendChild(chip);
    });
  }

  // ----- Live segmented control (tri-state, tap again to clear) -----

  function renderLiveSegmented() {
    els.liveSegmented.innerHTML = '';
    LIVE_OPTIONS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'segment';
      btn.setAttribute('aria-pressed', String(state.live === opt.value));
      btn.textContent = opt.label;
      btn.addEventListener('click', function () {
        state.live = state.live === opt.value ? '' : opt.value;
        renderLiveSegmented();
        updateCommand();
      });
      els.liveSegmented.appendChild(btn);
    });
  }

  // ----- Scalar field <-> state sync (used by init/reset/preset-load) -----

  function syncScalarInputs() {
    els.minBooksInput.value = state.minBooks;
    els.minLimitInput.value = state.minLimit;
    els.hoursInput.value = state.hoursTillEvent;
    els.evMinInput.value = state.evMin;
    els.minOddsInput.value = state.minOdds;
    els.maxOddsInput.value = state.maxOdds;
    els.teamsInput.value = state.teams;
    els.playersInput.value = state.players;
    els.boostInput.value = state.boostPercentage;
    els.devigTypeSelect.value = state.devigType;
    els.devigMethodSelect.value = state.devigMethod;
    els.isMainToggle.checked = state.isMain;
    els.excludeOneWaysToggle.checked = state.excludeOneWays;
    renderLiveSegmented();
  }

  function bindNumberField(el, key, opts) {
    opts = opts || {};
    el.addEventListener('input', function () {
      var raw = el.value;
      if (raw === '' || raw === '-') { state[key] = ''; updateCommand(); if (opts.persist) savePrefs(); return; }
      var n = parseInt(raw, 10);
      if (isNaN(n)) { state[key] = ''; } else { state[key] = opts.allowNegative ? n : Math.max(0, n); }
      updateCommand();
      if (opts.persist) savePrefs();
    });
  }

  function bindTextField(el, key) {
    el.addEventListener('input', function () {
      state[key] = el.value;
      updateCommand();
    });
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
    state.leagues = [];
    state.groupId = null;
    state.markets = new Set();
    state.marketMode = null;
    state.name = '';
    state.sharps = new Set(CONFIG.DEFAULTS.sharps);
    state.books = new Set(CONFIG.DEFAULTS.books);
    state.minBooks = CONFIG.DEFAULTS.minBooks;
    state.minLimit = CONFIG.DEFAULTS.minLimit;
    state.hoursTillEvent = CONFIG.DEFAULTS.hoursTillEvent;
    state.evMin = '';
    state.minOdds = '';
    state.maxOdds = '';
    state.teams = '';
    state.players = '';
    state.live = '';
    state.boostPercentage = '';
    state.devigType = '';
    state.devigMethod = '';
    state.isMain = false;
    state.excludeOneWays = false;

    renderLeagueChips();
    renderMarketSection();
    els.nameInput.value = '';
    renderSharpsChips();
    renderBooksChips();
    syncScalarInputs();
    updateCommand();
    savePrefs();
  }

  // ---------- Bind events ----------

  function bindStaticEvents() {
    els.tabFavorites.addEventListener('click', function () { switchTab('favorites'); });
    els.tabBuilder.addEventListener('click', function () { switchTab('builder'); });

    els.leagueSelectAll.addEventListener('click', selectAllLeagues);
    els.leagueClearAll.addEventListener('click', clearAllLeagues);

    els.groupSelect.addEventListener('change', function () { selectGroup(els.groupSelect.value); });

    els.nameInput.addEventListener('input', function () {
      state.name = els.nameInput.value;
      updateCommand();
    });

    bindNumberField(els.minBooksInput, 'minBooks', { persist: true });
    bindNumberField(els.minLimitInput, 'minLimit', { persist: true });
    bindNumberField(els.hoursInput, 'hoursTillEvent', { allowNegative: true, persist: true });
    bindNumberField(els.evMinInput, 'evMin', {});
    bindNumberField(els.minOddsInput, 'minOdds', { allowNegative: true });
    bindNumberField(els.maxOddsInput, 'maxOdds', { allowNegative: true });
    bindNumberField(els.boostInput, 'boostPercentage', {});
    bindTextField(els.teamsInput, 'teams');
    bindTextField(els.playersInput, 'players');

    els.devigTypeSelect.addEventListener('change', function () {
      state.devigType = els.devigTypeSelect.value;
      updateCommand();
    });
    els.devigMethodSelect.addEventListener('change', function () {
      state.devigMethod = els.devigMethodSelect.value;
      updateCommand();
    });

    els.isMainToggle.addEventListener('change', function () {
      state.isMain = els.isMainToggle.checked;
      updateCommand();
    });
    els.excludeOneWaysToggle.addEventListener('change', function () {
      state.excludeOneWays = els.excludeOneWaysToggle.checked;
      updateCommand();
    });

    els.commandText.addEventListener('click', function () {
      var expanded = els.commandText.classList.toggle('expanded');
      els.commandText.setAttribute('aria-expanded', String(expanded));
    });
    els.commandText.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.commandText.click(); }
    });

    els.resetBtn.addEventListener('click', resetBuilder);

    els.copyBtn.addEventListener('click', function () {
      var cmd = generateCommand(currentCommandState());
      copyToClipboard(cmd).then(function () {
        flashCopied(els.copyBtn, 'COPY');
      }).catch(function () {
        els.copyBtn.textContent = 'FAILED';
        setTimeout(function () { els.copyBtn.textContent = 'COPY'; }, 1400);
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
        renderMarketSection();
        els.nameInput.value = state.name;
        renderSharpsChips();
        renderBooksChips();
        syncScalarInputs();
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
