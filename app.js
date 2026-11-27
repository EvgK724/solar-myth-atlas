'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const bodies = window.BODIES;
  const byId = new Map(bodies.map(body => [body.id, body]));
  const planets = bodies.filter(body => body.type === 'planet');
  const types = {star:'Звезда', planet:'Планета', moon:'Спутник', dwarf:'Карликовая планета', asteroid:'Астероид', tno:'Объект пояса Койпера'};
  const typeFilters = {planet:'Планеты', moon:'Спутники', dwarf:'Карликовые', other:'Другие тела', all:'Все'};
  const genitive = {sun:'Солнца', earth:'Земли', mars:'Марса', jupiter:'Юпитера', saturn:'Сатурна', uranus:'Урана', neptune:'Нептуна', pluto:'Плутона', eris:'Эриды', haumea:'Хаумеа'};
  const aliases = {sun:'helios sol',earth:'gaia terra gaea',mars:'ares',venus:'aphrodite',jupiter:'zeus',saturn:'cronus kronos крон',mercury:'hermes',neptune:'poseidon',uranus:'ouranos',moon:'selene luna',pluto:'hades аид',ceres:'demeter деметра',tethys:'тефида тетис',iapetus:'иапет',atlas:'атлант',mimas:'мимант',enceladus:'энкелад',pallas:'athena афина',hiiaka:'hiiaka хииака',styx:'styks'};
  const memory = new Map();
  const storageKey = key => 'solar-myth-atlas.v1.' + key;
  const bodyURL = id => '#body/' + id;
  let filter = 'planet';
  let view = '';
  let lastBody = 'saturn';
  let activeAudio;
  let activeButton;
  let noticeTimer;

  function get(key, fallback) {
    try {
      const stored = localStorage.getItem(storageKey(key));
      if (stored !== null) return JSON.parse(stored);
    } catch { /* Private browsing can limit storage. */ }
    return memory.has(key) ? memory.get(key) : fallback;
  }
  function put(key, value) {
    memory.set(key, value);
    try {localStorage.setItem(storageKey(key), JSON.stringify(value));} catch { /* Keep this session available. */ }
  }
  function node(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function link(text, href, cls) {
    const a = node('a', cls, text);
    a.href = href;
    return a;
  }
  function action(text, cls, callback) {
    const b = node('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', callback);
    return b;
  }
  function external(text, url) {
    const a = link(text, url);
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function english(text) {
    const e = node('span','english',text);
    e.lang = 'en'; return e;
  }
  function decorative(el) {el.setAttribute('aria-hidden','true');return el;}
  function animate(el) {
    el.classList.remove('appear');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {void el.offsetWidth; el.classList.add('appear');}
  }
  function notice(message) {
    clearTimeout(noticeTimer);
    $('notice').textContent = message; $('notice').hidden = false;
    noticeTimer = setTimeout(() => {$('notice').hidden = true;}, 3600);
  }
  function stopAudio() {
    if (activeAudio) {activeAudio.pause();activeAudio = null;}
    if (activeButton) {activeButton.setAttribute('aria-pressed','false');activeButton = null;}
  }
  function speaker() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');decorative(svg);
    const path = document.createElementNS(ns,'path');
    path.setAttribute('d','M3 9h4l5-4v14l-5-4H3z M15.5 8a6 6 0 0 1 0 8 M18.5 5a10 10 0 0 1 0 14');
    path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');
    path.setAttribute('stroke-width','1.7');path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');
    svg.append(path);return svg;
  }
  function audioButton(body, label = '', blind = false) {
    const btn = action('', 'sound' + (label ? ' labeled' : ''), () => {
      const same = activeButton === btn;
      stopAudio();
      if (same) return;
      const player = new Audio(window.VOICES[body.id]);
      activeAudio = player;activeButton = btn;btn.setAttribute('aria-pressed','true');
      player.addEventListener('ended', () => {if (activeAudio === player) stopAudio();}, {once:true});
      player.play().catch(() => {
        if (activeAudio === player) {stopAudio();notice('Не удалось включить запись. Попробуйте ещё раз.');}
      });
    });
    btn.setAttribute('aria-label',blind ? 'Прослушать загаданное имя голосом Ryan' : 'Слушать ' + body.en + ' · Ryan');
    btn.setAttribute('aria-pressed','false');btn.dataset.sound = body.id;
    btn.append(speaker());
    if (label) btn.append(document.createTextNode(label));
    return btn;
  }
  window.SOLAR = {bodies, byId, bodyURL, audioButton, stopAudio, get, put};

  function emblem(body) {
    const i = planets.indexOf(body);
    const e = decorative(node('span', 'emblem ' + body.type));
    if (i >= 0) {
      e.classList.add('planet-photo');
      e.style.setProperty('--spot', (i / (planets.length-1) * 100) + '%');
    } else {
      const symbols = {star:'☼',moon:'◐',dwarf:'◉',asteroid:'◇',tno:'◌'};
      e.textContent = symbols[body.type];
    }
    return e;
  }
  function entry(body) {
    const item = node('article','entry');
    const a = link('',bodyURL(body.id),'entry-link');
    const names = node('span','entry-names');
    names.append(node('strong','',body.ru),english(body.en));
    a.append(emblem(body),names);
    item.append(a,audioButton(body));
    return item;
  }
  function normalize(text) {
    return text.toLocaleLowerCase().replaceAll('ё','е').replace(/[ʻ’']/g,'').trim();
  }
  function inGroup(body) {
    if (filter === 'all') return true;
    if (filter === 'other') return ['star','tno','asteroid'].includes(body.type);
    return filter === body.type;
  }
  function drawList() {
    const term = normalize($('search').value);
    const matches = bodies.filter(body => inGroup(body) && normalize([body.ru,body.en,body.figure,aliases[body.id] || ''].join(' ')).includes(term));
    for (const b of $('filters').children) b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
    $('count').textContent = 'Найдено · ' + matches.length;
    $('roster').replaceChildren(...matches.map(entry));
    if (!matches.length) {
      const empty = node('div','empty');
      empty.append(node('p','','Совпадений нет.'), action('Сбросить поиск','button secondary',() => {
        $('search').value = '';filter = 'all';drawList();$('search').focus();
      }));
      $('roster').append(empty);
    }
  }
  for (const [id,label] of Object.entries(typeFilters)) {
    const b = action(label,'',() => {filter = id;drawList();});
    b.dataset.filter = id; $('filters').append(b);
  }
  $('search').addEventListener('input', () => {filter = 'all';drawList();});
  drawList();

  const routes = [
    ['mars','Марс · Фобос · Деймос','Бог войны и его сыновья'],
    ['jupiter','Юпитер · Ио · Европа','Две встречи с Зевсом'],
    ['uranus','Уран · Титания · Оберон','Театр на орбите'],
    ['pluto','Плутон · Харон · Стикс','Дорога в царство мёртвых'],
    ['haumea','Хаумеа · Хииака · Намака','Семья из гавайских преданий'],
    ['psyche','Психея · Эрос','Любовь и душа'],
  ];
  for (const [id,path,title] of routes) {
    const a = link('',bodyURL(id),'route-link');
    a.append(node('span','route-path',path),node('strong','',title));
    $('routes').append(a);
  }
  for (const [type,label] of Object.entries(types)) {
    const group = node('optgroup');group.label = label;
    for (const body of bodies.filter(body => body.type === type)) group.append(new Option(body.ru+' · '+body.en,body.id));
    $('chooser').append(group);
  }
  $('chooser').addEventListener('change',() => {location.hash = bodyURL($('chooser').value);});

  function story(title, paragraph) {
    const section = node('section','story');
    section.append(node('h2','',title),node('p','',paragraph));return section;
  }
  function sourceLabel(href) {
    const host = new URL(href).hostname.replace(/^www\./,'');
    const domains = {'planetarynames.wr.usgs.gov':'МАС / USGS · каталог названий','theoi.com':'Theoi · античные тексты','bosworthtoller.com':'Bosworth–Toller · древнеанглийский словарь','terminy.info':'Этимологический словарь Фасмера','lpi.usra.edu':'Институт Луны и планет'};
    if (/nasa\.gov$/.test(host)) return 'NASA · сведения об объекте';
    if (/iau\.org$/.test(host)) return 'Международный астрономический союз';
    if (/folger\.edu$/.test(host)) return 'Folger Shakespeare Library';
    return domains[host] || host;
  }
  function profile(body) {
    const paper = node('article','paper');
    const header = node('header','body-head'), names = node('div','name-group');
    const title = node('h1','body-name',body.ru);title.id = 'body-name';title.tabIndex = -1;
    names.append(node('p','type-label',types[body.type]),title,english(body.en));
    header.append(emblem(body),names,audioButton(body,'Ryan'));
    const origin = story('Откуда имя',body.origin);
    origin.querySelector('h2').after(node('p','figure',body.figure));
    const cue = node('div','cue');cue.append(node('strong','','Как запомнить'),document.createTextNode(body.cue));
    const refs = node('details','refs');refs.append(node('summary','','Источники этой карточки'));
    for (const href of new Set([body.source,body.source2].filter(Boolean))) refs.append(external(sourceLabel(href),href));
    const hasMoons = bodies.some(item => item.host === body.id && item.type === 'moon');
    const jumpLabel = hasMoons ? 'К спутникам ↓' : body.id === 'sun' ? 'К планетам ↓' : 'К схеме орбиты ↓';
    const jump = action(jumpLabel,'jump',() => {
      const target = document.getElementById('children-title') || document.getElementById('chain-title');
      target.focus({preventScroll:true});target.scrollIntoView({block:'start'});
    });
    paper.append(header,jump,origin,story('Как связаны имена',body.connection),cue,refs);
    $('profile').replaceChildren(paper);
  }
  function moonLink(body) {
    const a = link('',bodyURL(body.id),'moon-link');
    a.append(node('strong','',body.ru),node('span','caption',body.figure),decorative(node('span','next','→')));
    return a;
  }
  function relationships(body) {
    const box = node('div','relations');
    const path = [];
    for (let current=body; current; current=byId.get(current.host)) path.unshift(current);
    const system = node('section');
    const chainTitle = node('h2','','Место в системе');chainTitle.id = 'chain-title';chainTitle.tabIndex = -1;system.append(chainTitle);
    const chain = node('div','orbit-chain');chain.setAttribute('aria-label','От центрального тела к выбранному');
    for (const item of path) {
      if (chain.children.length) chain.append(decorative(node('span','orbit-arrow','›')));
      chain.append(item === body ? node('span','chip here',item.ru) : link(item.ru,bodyURL(item.id),'chip'));
    }
    system.append(chain);
    const description = body.type === 'star' ? 'Солнце — звезда в центре нашей планетной системы.' :
      body.type === 'moon' ? body.ru + ' — спутник ' + genitive[body.host] + '.' : body.ru + ' обращается вокруг Солнца.';
    system.append(node('p','',description));
    if (body.host === 'pluto' || body.id === 'pluto') system.append(node('p','','Плутон и Харон обращаются вокруг общего центра масс в пространстве между ними. Остальные спутники этой системы обращаются вокруг пары.'));
    box.append(system);
    const children = bodies.filter(b => b.host === body.id && (body.id !== 'sun' || b.type === 'planet'));
    if (children.length) {
      const section = node('section');
      const title = node('h2','',body.id === 'sun' ? 'Восемь планет' : 'Спутники ' + genitive[body.id]);
      title.id = 'children-title';title.tabIndex = -1;
      section.append(title,node('p','','Выберите объект, чтобы раскрыть историю его имени.'));
      const list = node('div','moon-list');list.append(...children.map(moonLink));section.append(list);box.append(section);
    } else if (['mercury','venus'].includes(body.id)) {
      system.append(node('p','','У этой планеты нет естественных спутников.'));
    }
    if (body.also?.length) {
      const section = node('section');section.append(node('h2','','Сопоставить истории'));
      const list = node('div','chip-list');
      for (const id of body.also) list.append(link(byId.get(id).ru,bodyURL(id),'chip'));
      section.append(list);box.append(section);
    }
    if (body.type==='moon') {
      const back = node('section');
      back.append(link('Все объекты системы ' + genitive[body.host] + ' →',bodyURL(body.host),'mini-link'));
      box.append(back);
    }
    $('neighbors').replaceChildren(box);
  }
  const saved = get('body', 'saturn');
  if (byId.has(saved)) lastBody = saved;
  $('nav-system').href = bodyURL(lastBody);

  function route() {
    const [section,id] = location.hash.slice(1).split('/');
    if (section === 'content') return;
    const target = section === 'body' && byId.has(id) ? 'system' : section === 'practice' ? 'practice' : 'atlas';
    stopAudio();
    for (const key of ['atlas','system','practice']) {
      $(key).hidden = key !== target;
      if (key === target) $('nav-'+key).setAttribute('aria-current','page');
      else $('nav-'+key).removeAttribute('aria-current');
    }
    if (target === 'system') {
      lastBody = id;put('body',id);
      const body = byId.get(id);
      profile(body);relationships(body);
      $('chooser').value = id;$('nav-system').href = bodyURL(id);
      document.title = body.ru+' · '+body.en+' — Орбиты';
    } else {
      document.title = target === 'practice' ? 'Повторение — Орбиты' : 'Орбиты · Мифология Солнечной системы';
      if (target === 'practice') window.SolarPractice.open();
    }
    if (view) {
      const heading = target==='system' ? $('body-name') : $(target+'-title');
      heading.focus({preventScroll:true});
      window.scrollTo(0,history.state?.atlasScroll || 0);
    }
    animate($(target));view = target;
  }
  document.addEventListener('click', event => {
    const a = event.target.closest?.('a[href^="#"]');
    if (a && a.hash !== location.hash) history.replaceState({...history.state,atlasScroll:scrollY},'');
  });
  window.addEventListener('hashchange',route);
  function setSize(large) {
    document.documentElement.classList.toggle('large',large);$('size').setAttribute('aria-pressed',String(large));
  }
  setSize(get('large',false) === true);
  $('size').addEventListener('click',() => {const large = !$('size').matches('[aria-pressed=true]');setSize(large);put('large',large);});
  route();
  if ('serviceWorker' in navigator) {
    const failed = () => {$('offline').textContent='Для загрузки офлайн-копии откройте атлас с интернетом.';};
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg => {
      const track = () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange',() => {if (w.state === 'redundant' && !reg.active) failed();});
      };
      track();reg.addEventListener('updatefound',track);
      return navigator.serviceWorker.ready;
    }).then(() => {$('offline').textContent='Готово офлайн · атлас и озвучка сохранены';$('offline').classList.add('ready');}).catch(failed);
  } else $('offline').textContent='Этот браузер не поддерживает офлайн-копию.';
})();
