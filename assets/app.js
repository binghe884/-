/* 赛点 · 设计竞赛索引
   零依赖：hash 路由 + window.COMPETITIONS 数据。 */

(function () {
  'use strict';

  var SAVED_KEY = 'saidian:saved';

  var DIRECTIONS = [
    { key: '视觉传达', en: 'Visual Communication' },
    { key: '产品工业', en: 'Product & Industrial' },
    { key: '交互数字', en: 'Interaction & Digital' },
    { key: '建筑空间', en: 'Architecture & Space' },
    { key: '服装时尚', en: 'Fashion & Textile' },
    { key: '动画游戏', en: 'Animation & Games' },
    { key: '插画出版', en: 'Illustration & Publishing' },
    { key: '服务社会', en: 'Service & Social' }
  ];
  var DIR_KEYS = DIRECTIONS.map(function (d) { return d.key; });
  var LEVELS = ['国际顶级', '国际知名', '国家级', '行业权威'];
  var MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  var DOW = ['一', '二', '三', '四', '五', '六', '日'];

  var DATA = (window.COMPETITIONS || []).map(normalize).filter(function (c) { return c.slug; });

  var main = document.getElementById('main');
  var savedSet = loadSaved();
  var listQ = '';

  /* ---------- utils ---------- */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function parseISO(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
    var p = s.slice(0, 10).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function daysUntil(iso) {
    var d = parseISO(iso);
    if (!d) return null;
    return Math.round((d - today()) / 86400000);
  }

  function fmtDate(iso) {
    var d = parseISO(iso);
    if (!d) return iso || '—';
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }

  function fmtShort(iso) {
    var d = parseISO(iso);
    if (!d) return '—';
    return pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }

  function isoOf(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function statusOf(c) {
    var d = c.deadline ? daysUntil(c.deadline) : null;
    if (d !== null) {
      if (d < 0) return { key: 'ended', label: '已结束', cls: 'chip--muted', rank: 4 };
      if (d === 0) return { key: 'urgent', label: '今天截止', cls: 'chip--urgent', rank: 0 };
      if (d <= 14) return { key: 'urgent', label: '还有 ' + d + ' 天', cls: 'chip--urgent', rank: 0 };
      if (c.openDate && daysUntil(c.openDate) > 0) return { key: 'soon', label: '待开放', cls: 'chip--muted', rank: 2 };
      return { key: 'open', label: '报名中', cls: 'chip--live', rank: 1 };
    }
    if (c.openDate && daysUntil(c.openDate) > 0) return { key: 'soon', label: '待开放', cls: 'chip--muted', rank: 2 };
    return { key: 'pending', label: '待公布', cls: 'chip--muted', rank: 3 };
  }

  function normalize(raw, i) {
    var directions = Array.isArray(raw.directions) ? raw.directions.filter(function (d) { return DIR_KEYS.indexOf(d) > -1; }) : [];
    return {
      slug: String(raw.slug || '').trim() || 'c-' + i,
      name: raw.name || raw.nameEn || '未命名赛事',
      nameEn: raw.nameEn || '',
      aliases: Array.isArray(raw.aliases) ? raw.aliases.filter(Boolean) : [],
      organizer: raw.organizer || '',
      region: raw.region === '中国' ? '中国' : (raw.region === '国际' ? '国际' : ''),
      country: raw.country || '',
      level: raw.level || '',
      directions: directions,
      audience: Array.isArray(raw.audience) ? raw.audience.filter(Boolean) : [],
      team: raw.team || '',
      fee: raw.fee || '',
      feeType: ['免费', '收费', '学生免费'].indexOf(raw.feeType) > -1 ? raw.feeType : '',
      openDate: parseISO(raw.openDate) ? raw.openDate.slice(0, 10) : null,
      deadline: parseISO(raw.deadline) ? raw.deadline.slice(0, 10) : null,
      resultsDate: raw.resultsDate || '',
      expectedWindow: raw.expectedWindow || '',
      cycle: raw.cycle || '2027',
      awards: raw.awards || '',
      format: raw.format || '',
      requirements: raw.requirements || '',
      site: raw.site || '',
      source: raw.source || raw.site || '',
      sourceVerified: raw.sourceVerified !== false,
      evidence: raw.evidence || '',
      editorNote: raw.editorNote || '',
      verifiedAt: raw.verifiedAt || ''
    };
  }

  function loadSaved() {
    try {
      var v = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      return new Set(Array.isArray(v) ? v : []);
    } catch (e) { return new Set(); }
  }

  function persistSaved() {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(savedSet))); } catch (e) {}
  }

  function isSaved(slug) { return savedSet.has(slug); }

  function latestVerified() {
    var max = '';
    DATA.forEach(function (c) { if (c.verifiedAt && c.verifiedAt > max) max = c.verifiedAt; });
    return max || '';
  }

  function find(slug) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].slug === slug) return DATA[i];
    return null;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function markText(text, q) {
    var safe = esc(text);
    var tokens = String(q || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).map(escapeRe);
    if (!tokens.length) return safe;
    try {
      return safe.replace(new RegExp('(' + tokens.join('|') + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) { return safe; }
  }

  function haystack(c) {
    return [c.name, c.nameEn, c.aliases.join(' '), c.organizer, c.level, c.region, c.directions.join(' '), c.feeType]
      .join(' ').toLowerCase();
  }

  function matches(c, q) {
    var tokens = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    var hay = haystack(c);
    return tokens.every(function (t) { return hay.indexOf(t) > -1; });
  }

  function byDeadline(a, b) {
    var ra = statusOf(a).rank, rb = statusOf(b).rank;
    if (ra !== rb) return ra - rb;
    var da = a.deadline ? parseISO(a.deadline).getTime() : Infinity;
    var db = b.deadline ? parseISO(b.deadline).getTime() : Infinity;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  }

  /* ---------- router ---------- */

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var qi = raw.indexOf('?');
    var path = qi > -1 ? raw.slice(0, qi) : raw;
    var qs = qi > -1 ? raw.slice(qi + 1) : '';
    var parts = path.split('/').filter(Boolean);
    return { parts: parts, params: new URLSearchParams(qs) };
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function setParam(key, value) {
    var r = parseHash();
    if (value) r.params.set(key, value); else r.params.delete(key);
    var qs = r.params.toString();
    var path = r.parts.length ? '/' + r.parts.join('/') : '/';
    go('#' + path + (qs ? '?' + qs : ''));
  }

  function render() {
    var r = parseHash();
    var p = r.parts;
    var html = '';

    if (!p.length) html = viewHome();
    else if (p[0] === 'all') html = viewList(r.params);
    else if (p[0] === 'saved') html = viewSaved(r.params);
    else if (p[0] === 'c' && p[1]) html = viewDetail(decodeURIComponent(p[1]));
    else if (p[0] === 'calendar') html = viewCalendar(r.params);
    else if (p[0] === 'about') html = viewAbout();
    else html = viewNotFound();

    main.innerHTML = html;
    markNav(p[0] || 'home');
    updateSavedCount();
    var fv = document.getElementById('footer-verified');
    if (fv && latestVerified()) {
      fv.textContent = fmtDate(latestVerified()).replace(/\./g, '.');
    }
    bindView(r);
    window.scrollTo(0, 0);
  }

  function markNav(key) {
    var map = { c: 'all', saved: 'saved', calendar: 'calendar', about: 'about', all: 'all' };
    var active = map[key] || '';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function updateSavedCount() {
    var el = document.getElementById('saved-count');
    if (!el) return;
    if (savedSet.size) { el.textContent = String(savedSet.size); el.hidden = false; }
    else { el.textContent = '0'; el.hidden = true; }
  }

  /* ---------- rows ---------- */

  function rowHTML(c) {
    var st = statusOf(c);
    var pending = !c.deadline;
    var dateMain = pending ? '—' : fmtShort(c.deadline);
    var dateSub = pending ? '待公布' : String(parseISO(c.deadline).getFullYear());
    var saved = isSaved(c.slug);
    var dir = c.directions[0] || '';
    var proOnly = c.audience.indexOf('学生') === -1 ? '职业' : '';
    var dirFee = dir && c.feeType ? dir + ' · ' + c.feeType : (dir || c.feeType);
    var meta = [c.level, proOnly, c.region, dirFee].filter(Boolean);
    return '<article class="row' + (st.key === 'ended' ? ' is-ended' : '') + '">' +
      '<a class="row-link" href="#/c/' + encodeURIComponent(c.slug) + '">' +
        '<div class="row-date' + (st.key === 'urgent' ? ' is-urgent' : '') + (pending ? ' is-pending' : '') + '">' +
          '<span class="d">' + esc(dateMain) + '</span>' +
          '<span class="y">' + esc(dateSub) + '</span>' +
        '</div>' +
        '<div class="row-main">' +
          '<h3>' + esc(c.name) + '</h3>' +
          (c.nameEn ? '<span class="en">' + esc(c.nameEn) + '</span>' : '') +
          '<div class="row-meta">' +
            '<span class="chip ' + st.cls + '">' + esc(st.label) + '</span>' +
            meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
        '<span class="row-org">' + esc(c.organizer) + '</span>' +
      '</a>' +
      '<button class="save" type="button" data-save="' + esc(c.slug) + '" aria-pressed="' + saved + '" aria-label="' + (saved ? '取消收藏 ' : '收藏 ') + esc(c.name) + '">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-bookmark"></use></svg>' +
      '</button>' +
    '</article>';
  }

  function rowsHTML(items) {
    return items.map(rowHTML).join('');
  }

  /* ---------- home ---------- */

  function viewHome() {
    var open = DATA.filter(function (c) {
      var s = statusOf(c);
      return s.key === 'open' || s.key === 'urgent';
    }).sort(byDeadline);
    var upcoming = open.slice(0, 5);
    var isFallback = false;
    if (!upcoming.length) {
      upcoming = DATA.slice().sort(byDeadline).slice(0, 5);
      isFallback = true;
    }
    var dirCounts = {};
    DATA.forEach(function (c) {
      c.directions.forEach(function (d) { dirCounts[d] = (dirCounts[d] || 0) + 1; });
    });
    var dirs = DIRECTIONS.map(function (d, i) {
      return '<a class="dir" href="#/all?dir=' + encodeURIComponent(d.key) + '">' +
        '<span class="idx">' + pad(i + 1) + '</span>' +
        '<span class="name">' + esc(d.key) + '</span>' +
        '<span class="en">' + esc(d.en) + '</span>' +
        '<span class="n">' + (dirCounts[d.key] || 0) + '</span>' +
      '</a>';
    }).join('');

    return '<div class="view">' +
      '<section class="hero">' +
        '<div class="hero-glow" aria-hidden="true">' +
          '<span class="orb orb--rose"></span>' +
          '<span class="orb orb--gold"></span>' +
          '<span class="ring"></span>' +
        '</div>' +
        '<div class="wrap hero-inner">' +
          '<div class="hero-copy">' +
            '<p class="eyebrow">Design Competitions · 2026—2027</p>' +
            '<h1>把设计竞赛，<br>查清楚<em>。</em></h1>' +
            '<p class="lede">只收全国性与国际大型赛事。八个设计方向，每条注明来源与核实日期，不堆资讯，只回答：有什么、何时截止、值不值得投。</p>' +
            '<div class="search">' +
              '<div class="search-field">' +
                '<svg class="icon" aria-hidden="true"><use href="#i-search"></use></svg>' +
                '<input id="hero-search" type="search" autocomplete="off" placeholder="搜索赛事、主办方或方向" aria-label="搜索赛事">' +
                '<span class="search-hint">/</span>' +
              '</div>' +
              '<div class="search-results" id="hero-results" role="listbox" aria-label="搜索结果"></div>' +
            '</div>' +
            '<div class="hero-foot">' +
              '<span>收录 <b>' + DATA.length + '</b> 项 · 国内 <b>' + DATA.filter(function (c) { return c.region === '中国'; }).length + '</b> 条</span>' +
              '<span>覆盖 <b>8</b> 个方向</span>' +
              '<span>最近核实 <b>' + esc(fmtDate(latestVerified()) || '—') + '</b></span>' +
              '<a href="#/about">数据说明</a>' +
            '</div>' +
          '</div>' +
          '<aside class="hero-art" aria-hidden="true">' +
            '<div class="art-card">' +
              '<span class="art-k">Index · No. 01</span>' +
              '<span class="art-n">' + DATA.length + '</span>' +
              '<span class="art-l">项赛事 · 八个方向</span>' +
              '<span class="art-s">2026 — 2027</span>' +
            '</div>' +
            '<p class="art-note">把截止日期<br>当作一种<br><em>潮汐</em>。</p>' +
          '</aside>' +
        '</div>' +
      '</section>' +
      '<section class="section wrap">' +
        '<div class="section-head">' +
          '<h2>' + (isFallback ? '赛事一览' : '最近截止') + '<span>' + (isFallback ? 'Overview' : 'Closing Soon') + '</span></h2>' +
          '<a class="section-link" href="#/all">查看全部 <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></a>' +
        '</div>' +
        '<div class="list">' + rowsHTML(upcoming) + '</div>' +
      '</section>' +
      '<section class="section wrap">' +
        '<div class="section-head"><h2>按方向浏览<span>Directions</span></h2>' +
          '<a class="section-link" href="#/all">全部赛事 <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></a>' +
        '</div>' +
        '<div class="dir-grid">' + dirs + '</div>' +
      '</section>' +
      '<section class="section wrap">' +
        '<div class="section-head"><h2>这个站的原则<span>Method</span></h2></div>' +
        '<div class="notes">' +
          '<div class="note"><h3>来源可查</h3><p>每条赛事附官网与参考来源，注明最近核实日期。没公布的日期写「待公布」，不猜。</p></div>' +
          '<div class="note"><h3>状态自动</h3><p>报名中、即将截止、已结束，都由日期推导，不靠人工改标签，避免过期信息。</p></div>' +
          '<div class="note"><h3>不做信息流</h3><p>没有推荐算法，没有广告位。按截止时间排序，把注意力留给赛事本身。</p></div>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  /* ---------- list ---------- */

  function filterState(params) {
    return {
      q: params.get('q') || '',
      dir: params.get('dir') || '',
      level: params.get('level') || '',
      deadline: params.get('deadline') || '',
      fee: params.get('fee') || '',
      region: params.get('region') || '',
      sort: params.get('sort') || 'deadline',
      saved: params.get('saved') === '1'
    };
  }

  function applyFilters(f) {
    return DATA.filter(function (c) {
      if (f.q && !matches(c, f.q)) return false;
      if (f.dir && c.directions.indexOf(f.dir) < 0) return false;
      if (f.level && c.level !== f.level) return false;
      if (f.region && c.region !== f.region) return false;
      if (f.fee && c.feeType !== f.fee) return false;
      if (f.saved && !isSaved(c.slug)) return false;
      if (f.deadline) {
        if (f.deadline === 'pending') { if (c.deadline) return false; }
        else {
          var d = c.deadline ? daysUntil(c.deadline) : null;
          if (d === null || d < 0 || d > Number(f.deadline)) return false;
        }
      }
      return true;
    }).sort(function (a, b) {
      if (f.sort === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN');
      return byDeadline(a, b);
    });
  }

  function selectHTML(name, label, options, value) {
    return '<span class="select"><select data-filter="' + name + '" aria-label="' + esc(label) + '">' +
      options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') +
    '</select></span>';
  }

  function viewList(params) {
    var f = filterState(params);
    listQ = f.q;
    var items = applyFilters(f);
    var levelOpts = [['', '全部级别']].concat(LEVELS.map(function (l) { return [l, l]; }));
    var dirOpts = [['', '全部方向']].concat(DIRECTIONS.map(function (d) { return [d.key, d.key]; }));
    var deadlineOpts = [['', '全部时间'], ['7', '7 天内'], ['30', '30 天内'], ['90', '90 天内'], ['pending', '待公布']];
    var feeOpts = [['', '全部费用'], ['免费', '免费'], ['学生免费', '学生免费'], ['收费', '收费']];
    var regionOpts = [['', '全部地区'], ['中国', '中国'], ['国际', '国际']];

    return '<div class="view">' +
      '<div class="wrap page-head">' +
        '<p class="eyebrow">Index · 全部赛事</p>' +
        '<h1>全部赛事</h1>' +
        '<p class="sub" id="result-count">' + items.length + ' 项 · ' + (f.sort === 'name' ? '按名称排序' : '按截止时间排序') + '</p>' +
      '</div>' +
      '<div class="wrap">' +
        '<div class="filters" role="search">' +
          '<span class="list-search">' +
            '<input id="list-search" type="search" autocomplete="off" placeholder="搜索赛事" aria-label="搜索赛事" value="' + esc(f.q) + '">' +
          '</span>' +
          selectHTML('dir', '按方向筛选', dirOpts, f.dir) +
          selectHTML('level', '按级别筛选', levelOpts, f.level) +
          selectHTML('deadline', '按截止时间筛选', deadlineOpts, f.deadline) +
          selectHTML('fee', '按费用筛选', feeOpts, f.fee) +
          selectHTML('region', '按地区筛选', regionOpts, f.region) +
          selectHTML('sort', '排序方式', [['deadline', '按截止时间'], ['name', '按名称']], f.sort) +
          '<button class="btn btn--ghost btn--sm" type="button" data-filter-saved aria-pressed="' + f.saved + '">' +
            '<svg class="icon" aria-hidden="true"><use href="#i-bookmark"></use></svg>收藏</button>' +
          '<span class="spacer"></span>' +
          '<button class="clear" type="button" data-clear>清除筛选</button>' +
        '</div>' +
      '</div>' +
      '<div class="wrap" id="list-results">' + listResultsHTML(items, f) + '</div>' +
    '</div>';
  }

  function listResultsHTML(items, f) {
    if (!items.length) {
      return '<div class="empty"><p>' + (f.saved ? '还没有收藏。' : '没有匹配的赛事。') + '</p>' +
        '<p style="margin-top:6px">试试更短的关键词，或清除筛选。</p>' +
        '<button class="btn btn--ghost" type="button" data-clear>清除筛选</button></div>';
    }
    return '<div class="list">' + rowsHTML(items) + '</div>';
  }

  function viewSaved(params) {
    var f = filterState(params);
    f.saved = true;
    listQ = f.q;
    var items = applyFilters(f);
    return '<div class="view">' +
      '<div class="wrap page-head">' +
        '<p class="eyebrow">Index · 收藏</p>' +
        '<h1>我的收藏</h1>' +
        '<p class="sub">保存在本机浏览器，不上传。可导出为日历文件。</p>' +
      '</div>' +
      '<div class="wrap">' +
        '<div class="filters">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-ics="saved">' +
            '<svg class="icon" aria-hidden="true"><use href="#i-cal"></use></svg>导出收藏 (.ics)</button>' +
          '<span class="spacer"></span>' +
          '<a class="section-link" href="#/all">浏览全部 <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></a>' +
        '</div>' +
      '</div>' +
      '<div class="wrap" id="list-results">' + (items.length
        ? '<div class="list">' + rowsHTML(items) + '</div>'
        : '<div class="empty"><p>还没有收藏任何赛事。</p><p style="margin-top:6px">在赛事行右侧点击书签图标即可收藏。</p><a class="btn btn--ghost" href="#/all">去看赛事</a></div>') +
      '</div>' +
    '</div>';
  }

  /* ---------- detail ---------- */

  function viewDetail(slug) {
    var c = find(slug);
    if (!c) return viewNotFound();
    var st = statusOf(c);
    var pending = !c.deadline;
    var saved = isSaved(c.slug);
    var dir = c.directions.join(' · ');
    var deadlineText = pending ? '待公布' : fmtDate(c.deadline);
    var deadlineSub = pending
      ? (c.expectedWindow ? '参考：' + c.expectedWindow : '以官网公告为准')
      : (daysUntil(c.deadline) >= 0 ? '还有 ' + daysUntil(c.deadline) + ' 天' : '已结束');
    var fee = c.fee || '见官网';
    var qual = c.audience.length ? c.audience.join(' / ') : '—';
    if (c.team) qual += (qual !== '—' ? ' · ' : '') + c.team;

    var timeline = [];
    if (c.openDate) timeline.push({ t: c.openDate, label: '报名开放', hot: false });
    if (c.deadline) timeline.push({ t: c.deadline, label: '提交截止', hot: true });
    if (c.resultsDate) timeline.push({ t: c.resultsDate, label: '结果公布', hot: false });
    var timelineHTML = timeline.length
      ? '<ul class="timeline">' + timeline.map(function (x) {
          return '<li class="' + (x.hot ? 'is-hot' : '') + '"><time>' + esc(fmtDate(x.t)) + '</time><span>' + esc(x.label) + '</span></li>';
        }).join('') + '</ul>'
      : '<p>时间线尚未公布，请以官网为准。</p>';

    var prose = '';
    if (c.editorNote) prose += '<h2>编辑判断</h2><p>' + esc(c.editorNote) + '</p>';
    prose += '<h2>参赛资格</h2><p>面向' + esc(c.audience.length ? c.audience.join('、') : '设计从业者与学生') +
      (c.team ? '；' + esc(c.team) + '参赛' : '') + '。</p>';
    if (c.requirements) prose += '<h2>作品要求</h2><p>' + esc(c.requirements) + '</p>';
    if (c.format) prose += '<h2>提交方式</h2><p>' + esc(c.format) + '</p>';
    if (c.awards) prose += '<h2>奖项与认可</h2><p>' + esc(c.awards) + '。' + (c.level ? '赛事级别：' + esc(c.level) + '。' : '') + '</p>';
    prose += '<h2>时间线</h2>' + timelineHTML;

    var sourceUrl = c.source || c.site || '';
    prose += '<div class="source">信息来源：' +
      (sourceUrl ? '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener">' + esc(hostOf(sourceUrl)) + '</a>' : '主办方公开资料') +
      ' · 核实于 ' + esc(fmtDate(c.verifiedAt || latestVerified())) + '。' +
      (c.sourceVerified ? '' : '<br>注：核实当时官网未能直接打开，日期来自公开资料，请以官网最新公告为准。') +
      (c.evidence ? '<br>依据：' + esc(c.evidence) : '') +
    '</div>';

    var related = DATA.filter(function (x) {
      return x.slug !== c.slug && x.directions.some(function (d) { return c.directions.indexOf(d) > -1; });
    }).sort(byDeadline).slice(0, 3);

    var aside = '<aside class="aside">' +
      '<h2>关键信息</h2>' +
      '<dl>' +
        (c.organizer ? '<div><dt class="k">主办方</dt><dd class="v">' + esc(c.organizer) + '</dd></div>' : '') +
        (c.region ? '<div><dt class="k">地区</dt><dd class="v">' + esc(c.region + (c.country ? ' · ' + c.country : '')) + '</dd></div>' : '') +
        (dir ? '<div><dt class="k">方向</dt><dd class="v">' + esc(dir) + '</dd></div>' : '') +
        (c.team ? '<div><dt class="k">组队</dt><dd class="v">' + esc(c.team) + '</dd></div>' : '') +
        (c.format ? '<div><dt class="k">提交</dt><dd class="v">' + esc(c.format) + '</dd></div>' : '') +
      '</dl>' +
    '</aside>';

    return '<div class="view detail">' +
      '<div class="wrap">' +
        '<a class="back" href="#/all"><svg class="icon" aria-hidden="true"><use href="#i-back"></use></svg>全部赛事</a>' +
        '<header class="detail-head">' +
          '<p class="eyebrow">Competition File</p>' +
          '<div class="detail-tags">' +
            '<span class="chip ' + st.cls + '">' + esc(st.label) + '</span>' +
            (c.level ? '<span>' + esc(c.level) + '</span>' : '') +
            (c.region ? '<span>' + esc(c.region) + '</span>' : '') +
            (dir ? '<span>' + esc(dir) + '</span>' : '') +
          '</div>' +
          '<h1>' + esc(c.name).replace(/（([^）]*)）/g, '<span class="nb">（$1）</span>') + '</h1>' +
          (c.nameEn ? '<p class="detail-en">' + esc(c.nameEn) + '</p>' : '') +
          '<div class="detail-actions">' +
            (c.site ? '<a class="btn" href="' + esc(c.site) + '" target="_blank" rel="noopener">访问官网 <svg class="icon" aria-hidden="true"><use href="#i-external"></use></svg></a>' : '') +
            '<button class="btn btn--ghost" type="button" data-save="' + esc(c.slug) + '" aria-pressed="' + saved + '"><svg class="icon" aria-hidden="true"><use href="#i-bookmark"></use></svg>' + (saved ? '已收藏' : '收藏') + '</button>' +
            '<button class="btn btn--ghost" type="button" data-ics="' + esc(c.slug) + '"><svg class="icon" aria-hidden="true"><use href="#i-cal"></use></svg>加入日历</button>' +
          '</div>' +
        '</header>' +
        '<dl class="facts">' +
          '<div class="fact"><dt>截止日期</dt><dd class="big' + (st.key === 'urgent' ? ' accent' : '') + '">' + esc(deadlineText) + '<br><small style="font-size:11px;color:var(--muted)">' + esc(deadlineSub) + '</small></dd></div>' +
          '<div class="fact"><dt>报名费</dt><dd>' + esc(fee) + '</dd></div>' +
          '<div class="fact"><dt>参赛资格</dt><dd>' + esc(qual) + '</dd></div>' +
          '<div class="fact"><dt>结果公布</dt><dd>' + esc(c.resultsDate ? fmtDate(c.resultsDate) : '待公布') + '</dd></div>' +
        '</dl>' +
        '<div class="detail-body">' +
          '<div class="prose">' + prose + '</div>' +
          aside +
        '</div>' +
        (related.length ? '<section class="section related">' +
          '<div class="section-head"><h2>同方向赛事<span>Related</span></h2>' + (c.directions[0] ? '<a class="section-link" href="#/all?dir=' + encodeURIComponent(c.directions[0]) + '">更多 <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></a>' : '') + '</div>' +
          '<div class="list">' + rowsHTML(related) + '</div>' +
        '</section>' : '') +
      '</div>' +
    '</div>';
  }

  /* ---------- calendar ---------- */

  function viewCalendar(params) {
    var ym = params.get('ym');
    var now = today();
    var y = now.getFullYear(), m = now.getMonth();
    if (ym && /^\d{4}-\d{2}$/.test(ym)) {
      y = Number(ym.slice(0, 4));
      m = Number(ym.slice(5, 7)) - 1;
    }
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();

    var byDay = {};
    DATA.forEach(function (c) {
      if (!c.deadline) return;
      var d = parseISO(c.deadline);
      if (d.getFullYear() === y && d.getMonth() === m) {
        var k = d.getDate();
        (byDay[k] = byDay[k] || []).push(c);
      }
    });

    var sel = params.get('d');
    if (!sel || !/^\d{4}-\d{2}-\d{2}$/.test(sel)) {
      if (now.getFullYear() === y && now.getMonth() === m) sel = isoOf(now);
      else {
        var withEvents = Object.keys(byDay).map(Number).sort(function (a, b) { return a - b; });
        sel = isoOf(new Date(y, m, withEvents.length ? withEvents[0] : 1));
      }
    }

    var cells = '';
    for (var i = 0; i < 42; i++) {
      var dnum = i - offset + 1;
      var cellDate = new Date(y, m, dnum);
      var out = dnum < 1 || dnum > daysInMonth;
      var iso = isoOf(cellDate);
      var evs = byDay[cellDate.getDate()] && cellDate.getMonth() === m ? byDay[cellDate.getDate()] : [];
      var isToday = iso === isoOf(now);
      var isSel = iso === sel;
      var allDone = evs.length && evs.every(function (c) { return daysUntil(c.deadline) < 0; });
      var evHTML = evs.slice(0, 2).map(function (c) {
        return '<span class="cal-ev' + (daysUntil(c.deadline) >= 0 && daysUntil(c.deadline) <= 14 ? ' hot' : '') + '">' + esc(c.name) + '</span>';
      }).join('');
      cells += '<button type="button" class="cal-cell' + (out ? ' out' : '') + (isToday ? ' today' : '') + (isSel ? ' sel' : '') + (evs.length ? ' has' : '') + (allDone ? ' is-done' : '') + '" data-day="' + iso + '" aria-label="' + iso + (evs.length ? '，' + evs.length + ' 项截止' : '') + '">' +
        '<span class="cal-num">' + cellDate.getDate() + '</span>' +
        '<span class="cal-events">' + evHTML + '</span>' +
        '<span class="cal-dot"></span>' +
      '</button>';
    }

    var dayEvents = DATA.filter(function (c) { return c.deadline === sel; }).sort(byDeadline);
    var selDate = parseISO(sel);
    var panel = '<div class="cal-panel">' +
      '<div class="cal-panel-head">' +
        '<h2>' + (selDate.getMonth() + 1) + ' 月 ' + selDate.getDate() + ' 日</h2>' +
        '<span>' + (dayEvents.length ? dayEvents.length + ' 项截止' : '无赛事截止') + '</span>' +
      '</div>' +
      (dayEvents.length ? '<div class="list">' + rowsHTML(dayEvents) + '</div>' : '<div class="empty" style="padding:36px 0"><p>这一天没有赛事截止。可切换月份查看。</p></div>') +
    '</div>';

    return '<div class="view calendar">' +
      '<div class="wrap">' +
        '<header class="cal-head">' +
          '<div>' +
            '<p class="eyebrow">Calendar · 截止日历</p>' +
            '<h1 class="cal-title">' + y + ' 年 ' + (m + 1) + ' 月</h1>' +
            '<p class="cal-sub">点击日期查看当天截止的赛事 · 共 ' + DATA.filter(function (c) { return c.deadline; }).length + ' 个截止日</p>' +
          '</div>' +
          '<div class="cal-nav">' +
            '<button class="icon-btn" type="button" data-month="' + isoOf(new Date(y, m - 1, 1)).slice(0, 7) + '" aria-label="上一个月"><svg class="icon" aria-hidden="true"><use href="#i-left"></use></svg></button>' +
            '<button class="icon-btn" type="button" data-month="' + isoOf(now).slice(0, 7) + '" aria-label="回到本月">今</button>' +
            '<button class="icon-btn" type="button" data-month="' + isoOf(new Date(y, m + 1, 1)).slice(0, 7) + '" aria-label="下一个月"><svg class="icon" aria-hidden="true"><use href="#i-right"></use></svg></button>' +
            '<button class="btn btn--ghost btn--sm" type="button" data-ics="all"><svg class="icon" aria-hidden="true"><use href="#i-cal"></use></svg>导出 .ics</button>' +
          '</div>' +
        '</header>' +
        '<div class="cal-grid" role="grid" aria-label="' + y + ' 年 ' + (m + 1) + ' 月截止日历">' +
          DOW.map(function (d) { return '<div class="cal-dow" role="columnheader">周' + d + '</div>'; }).join('') +
          cells +
        '</div>' +
        panel +
      '</div>' +
    '</div>';
  }

  /* ---------- about ---------- */

  function viewAbout() {
    return '<div class="view"><div class="wrap about">' +
      '<p class="eyebrow">About · Method</p>' +
      '<h1>关于赛点</h1>' +
      '<p class="lede">设计竞赛的信息散落在官网、公众号、学院通知和学长学姐的聊天记录里。赛点把它们收进一张可搜索的表，只回答三个问题：有什么、什么时候截止、值不值得投。</p>' +
      '<h2>收录范围</h2>' +
      '<p>覆盖八个设计方向：视觉传达、产品工业、交互数字、建筑空间、服装时尚、动画游戏、插画出版、服务社会。</p>' +
      '<p>只收全国性与国际大型赛事。地方性小赛、付费即奖、以拉新为目的的商业赛事不收录。赛事是否收费会明确标注，不做「免费」暗示。</p>' +
      '<p>只面向职业设计师、学生无法投递的赛事会标注「职业」，保留在索引里是为了让你知道它的存在与门槛，而不是鼓励报名。</p>' +
      '<h2>数据从哪里来</h2>' +
      '<p>每条赛事附官网与参考来源，并记录最近核实日期。截止日期优先取自主办方公告；新赛季尚未公布时标注「待公布」，给出参考窗口，不猜具体日期。</p>' +
      '<p>赛事时间可能调整，报名前请以官网最新公告为准。站内信息不构成报名依据。</p>' +
      '<h2>状态怎么算</h2>' +
      '<table><thead><tr><th>状态</th><th>规则</th></tr></thead><tbody>' +
        '<tr><td>报名中</td><td>已开放报名，且截止日期在 14 天之后</td></tr>' +
        '<tr><td>即将截止</td><td>距截止 14 天以内（含今天）</td></tr>' +
        '<tr><td>待开放</td><td>已公布开放日期，但尚未开始</td></tr>' +
        '<tr><td>待公布</td><td>新赛季日期尚未发布</td></tr>' +
        '<tr><td>已结束</td><td>截止日期已过</td></tr>' +
      '</tbody></table>' +
      '<h2>更新与纠错</h2>' +
      '<p>数据由人工整理，最近一次核实见页脚。这是课程作业项目，非商业站点，不提供投稿、广告或合作入口。</p>' +
      '<h2>关于设计</h2>' +
      '<p>午夜蓝作底，奶油白作纸，沙漠金与玫瑰粉是仅有的两种光。标题用衬线斜体，其余交给字号、间距与缓慢的光晕。希望你在三秒内找到要投的比赛，而不是先读一堆推荐语。</p>' +
    '</div></div>';
  }

  function viewNotFound() {
    return '<div class="view"><div class="wrap about">' +
      '<p class="eyebrow">404</p><h1>没有这个页面</h1>' +
      '<p class="lede">链接可能已经失效，或者赛事尚未收录。</p>' +
      '<p style="margin-top:20px"><a class="btn btn--ghost" href="#/all">返回全部赛事</a></p>' +
    '</div></div>';
  }

  /* ---------- bindings ---------- */

  function bindView(r) {
    var hero = document.getElementById('hero-search');
    if (hero) {
      hero.addEventListener('input', function () { renderHeroResults(hero.value); });
      hero.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var q = hero.value.trim();
          go('#/all' + (q ? '?q=' + encodeURIComponent(q) : ''));
        } else if (e.key === 'Escape') {
          hero.value = '';
          renderHeroResults('');
          hero.blur();
        }
      });
      hero.addEventListener('focus', function () { if (hero.value.trim()) renderHeroResults(hero.value); });
      document.addEventListener('click', function close(e) {
        if (!e.target.closest('.search')) {
          var box = document.getElementById('hero-results');
          if (box) box.innerHTML = '';
          document.removeEventListener('click', close);
        }
      });
    }

    var listSearch = document.getElementById('list-search');
    if (listSearch) {
      listSearch.addEventListener('input', function () {
        refreshList(listSearch.value);
      });
    }

    var saveBtn = null;
    document.querySelectorAll('[data-save]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        toggleSave(b.getAttribute('data-save'));
        saveBtn = b;
      });
    });

    document.querySelectorAll('[data-ics]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-ics');
        if (v === 'all') downloadICS(DATA.filter(function (c) { return c.deadline; }), 'saidian-all.ics');
        else if (v === 'saved') downloadICS(DATA.filter(function (c) { return c.deadline && isSaved(c.slug); }), 'saidian-saved.ics');
        else {
          var c = find(v);
          if (c && c.deadline) downloadICS([c], c.slug + '.ics');
        }
      });
    });

    document.querySelectorAll('[data-filter]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var f = filterState(parseHash().params);
        f[sel.getAttribute('data-filter')] = sel.value;
        applyFilterHash(f);
      });
    });

    var savedToggle = document.querySelector('[data-filter-saved]');
    if (savedToggle) {
      savedToggle.addEventListener('click', function () {
        var f = filterState(parseHash().params);
        f.saved = !f.saved;
        applyFilterHash(f);
      });
    }

    document.querySelectorAll('[data-clear]').forEach(function (b) {
      b.addEventListener('click', function () {
        go('#/all');
      });
    });

    document.querySelectorAll('[data-month]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ym = b.getAttribute('data-month');
        go('#/calendar?ym=' + ym);
      });
    });

    document.querySelectorAll('[data-day]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.getAttribute('data-day');
        var ym = d.slice(0, 7);
        go('#/calendar?ym=' + ym + '&d=' + d);
      });
    });
  }

  function renderHeroResults(q) {
    var box = document.getElementById('hero-results');
    if (!box) return;
    q = q.trim();
    if (!q) { box.innerHTML = ''; return; }
    var hits = DATA.filter(function (c) { return matches(c, q); }).sort(byDeadline);
    if (!hits.length) {
      box.innerHTML = '<div class="sr-empty">没有找到「' + esc(q) + '」。试试方向名、赛事简称或主办方。</div>';
      return;
    }
    box.innerHTML = hits.slice(0, 6).map(function (c) {
      var st = statusOf(c);
      return '<a class="sr-item" href="#/c/' + encodeURIComponent(c.slug) + '">' +
        '<span class="sr-name">' + markText(c.name, q) + (c.nameEn ? ' <small>' + esc(c.nameEn) + '</small>' : '') + '</span>' +
        '<small>' + esc(st.label) + '</small>' +
      '</a>';
    }).join('') + (hits.length > 6 ? '<a class="sr-more" href="#/all?q=' + encodeURIComponent(q) + '">查看全部 ' + hits.length + ' 项 →</a>' : '');
  }

  function refreshList(q) {
    var r = parseHash();
    var f = filterState(r.params);
    f.q = q;
    listQ = q;
    var items = applyFilters(f);
    var box = document.getElementById('list-results');
    if (box) box.innerHTML = listResultsHTML(items, f);
    var rc = document.getElementById('result-count');
    if (rc) rc.textContent = items.length + ' 项 · ' + (f.sort === 'name' ? '按名称排序' : '按截止时间排序');    rebindActions();
    try {
      var params = new URLSearchParams(r.params.toString());
      if (q) params.set('q', q); else params.delete('q');
      history.replaceState(null, '', '#/all' + (params.toString() ? '?' + params.toString() : ''));
    } catch (e) {}
  }

  function rebindActions() {
    document.querySelectorAll('[data-save]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault();
        toggleSave(b.getAttribute('data-save'));
      };
    });
    document.querySelectorAll('[data-clear]').forEach(function (b) {
      b.onclick = function () { go('#/all'); };
    });
  }

  function applyFilterHash(f) {
    var params = new URLSearchParams();
    if (f.q) params.set('q', f.q);
    if (f.dir) params.set('dir', f.dir);
    if (f.level) params.set('level', f.level);
    if (f.deadline) params.set('deadline', f.deadline);
    if (f.fee) params.set('fee', f.fee);
    if (f.region) params.set('region', f.region);
    if (f.sort && f.sort !== 'deadline') params.set('sort', f.sort);
    if (f.saved) params.set('saved', '1');
    var base = parseHash().parts[0] === 'saved' ? '#/saved' : '#/all';
    go(base + (params.toString() ? '?' + params.toString() : ''));
  }

  function toggleSave(slug) {
    if (savedSet.has(slug)) savedSet.delete(slug); else savedSet.add(slug);
    persistSaved();
    updateSavedCount();
    document.querySelectorAll('[data-save="' + CSS.escape(slug) + '"]').forEach(function (b) {
      var on = isSaved(slug);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? '取消收藏 ' : '收藏 ') + (find(slug) ? find(slug).name : ''));
      if (b.classList.contains('btn')) b.lastChild.textContent = on ? '已收藏' : '收藏';
    });
    var r = parseHash();
    if (r.parts[0] === 'saved') render();
  }

  /* ---------- ics ---------- */

  function icsEsc(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function icsDate(iso) {
    var d = parseISO(iso);
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function nextICSDate(iso) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function stamp() {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function downloadICS(items, filename) {
    if (!items.length) return;
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Saidian//Design Competitions//CN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    items.forEach(function (c) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + c.slug + '@saidian.local');
      lines.push('DTSTAMP:' + stamp());
      lines.push('DTSTART;VALUE=DATE:' + icsDate(c.deadline));
      lines.push('DTEND;VALUE=DATE:' + nextICSDate(c.deadline));
      lines.push('SUMMARY:' + icsEsc(c.name + ' 截止'));
      lines.push('DESCRIPTION:' + icsEsc((c.organizer ? c.organizer + ' · ' : '') + (c.site || '')));
      if (c.site) lines.push('URL:' + c.site);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'saidian.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  /* ---------- shortcuts ---------- */

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      var input = document.getElementById('hero-search') || document.getElementById('list-search');
      if (input) { e.preventDefault(); input.focus(); }
    }
    if (e.key === 'Escape') {
      var box = document.getElementById('hero-results');
      if (box) box.innerHTML = '';
    }
  });

  window.addEventListener('hashchange', render);

  if (!DATA.length) {
    main.innerHTML = '<div class="wrap empty" style="border:0"><p><b>数据尚未载入。</b></p><p style="margin-top:8px">请确认 <code>data/competitions.js</code> 存在并先于 <code>assets/app.js</code> 加载。</p></div>';
  } else {
    render();
  }
})();
