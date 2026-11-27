'use strict';

window.SolarPractice = (() => {
  const modes = { names: 'Имена', listen: 'На слух', myths: 'Мифы' };
  const intervals = [1, 3, 7, 14];
  const day = 86400000;
  const session = new Map();

  // Each question keeps its own review history even if its wording or position changes.
  const myths = [
    ['mars-companions', 'mars', 'Какая родственная связь объясняет имена обеих лун Марса?', 'У Гесиода Фобос и Деймос — сыновья Ареса и Афродиты. Арес — греческий бог войны, соответствующий римскому Марсу.'],
    ['characters-as-cattle', 'europa', 'В историях Ио и Европы появляются корова и бык. Кто в кого превращается?', 'Ио превращается в корову. В истории Европы сам Зевс принимает облик быка и увозит царевну на Крит.'],
    ['three-generations', 'uranus', 'Юпитер, Сатурн, Уран. Какому порядку поколений соответствует этот путь от Солнца?', 'Сначала внук, затем его отец и дед. В греческом мифе Зевс — сын Кроноса, а Кронос — сын Урана.'],
    ['tritons-father', 'triton', 'Почему имя Тритон особенно подходит спутнику Нептуна?', 'Тритон — сын морского бога Посейдона и Амфитриты. Римляне называли владыку моря Нептуном.'],
    ['royal-couple', 'titania', 'Откуда на орбитах Урана появились король и королева фей? Назовите обоих.', 'Оберон и Титания правят феями в комедии Шекспира «Сон в летнюю ночь». Их имена получили два спутника Урана.'],
    ['plutos-ferryman', 'charon', 'Какое занятие связывает Харона с царством Плутона?', 'Харон перевозит души умерших через реку в подземное царство. Его имя получил крупнейший спутник Плутона.'],
    ['cupbearer', 'ganymede', 'Как звали юношу, которого орёл унёс на Олимп, и что он там делал?', 'Ганимед стал виночерпием богов. В одной из версий мифа орлом обернулся сам Зевс.'],
    ['quarrel-and-lawlessness', 'dysnomia', 'Раздор и Беззаконие — какая карликовая планета и её спутник образуют эту пару?', 'Эрида олицетворяет раздор. Её спутник назван в честь Дисномии, дочери Эриды и олицетворения беззакония.'],
    ['fast-messenger', 'mercury', 'Чьё имя получил мир с самым коротким годом среди планет Солнечной системы?', 'Имя Меркурия, быстроногого вестника римских богов. Планета облетает Солнце примерно за 88 земных суток.'],
    ['hawaiian-daughters', 'haumea', 'Как спутники карликовой планеты Хаумеа связаны с ней в гавайских преданиях?', 'Оба носят имена дочерей Хаумеа. Хииака связана с танцем хула, Намака — с водой.'],
    ['grain-word', 'ceres', 'Какая богиня дала имя карликовой планете и оставила след в английском слове cereal?', 'Церера, римская богиня зерна и урожая. Карликовая планета Церера находится в главном поясе астероидов.'],
    ['keeper-of-infant', 'amalthea', 'Какое отношение Амальтея имела к Зевсу ещё до того, как он стал царём богов?', 'Амальтея была кормилицей младенца Зевса. В одном из вариантов она — нимфа, которая кормила его козьим молоком.'],
    ['poetic-earth', 'earth', 'Что связывает английское Earth с почвой под ногами, а Гею — с Ураном?', 'Earth восходит к германскому слову со значением «земля, почва». Гея — греческое олицетворение Земли и мать Урана в «Теогонии».'],
    ['goddess-on-map', 'venus', 'Почему на поверхности Венеры есть возвышенность под названием Земля Афродиты?', 'Римская Венера и греческая Афродита — богини любви. Одно имя досталось планете, другое — области на её поверхности.'],
    ['creator-island', 'makemake', 'С какого острова происходит образ бога-творца, давшего имя Макемаке?', 'С Рапа-Нуи, известного также как остров Пасхи. Имя карликовой планеты отсылает к местному преданию о творце.'],
    ['egyptian-name', 'bennu', 'Какой астероид, образцы которого доставила миссия OSIRIS-REx, носит имя священной птицы Египта?', 'Бенну. В древнеегипетской традиции так зовут мифическую птицу.'],
    ['sun-terms', 'sun', 'Какие древние названия Солнца скрыты в словах «гелиосфера» и solar?', 'В первом — греческое имя Гелиос, во втором — латинское sol, «солнце». Оба ведут к нашей звезде.'],
    ['sky-word', 'arrokoth', 'Что означает имя Аррокот на языке поухатан?', '«Небо». Имя объекта в поясе Койпера выбрали с согласия старейшин народа поухатан.']
  ].map(([id, bodyId, question, answer]) => ({id, bodyId, question, answer}));

  let mode;
  let deck;
  let current;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  function read(key, fallback) {
    return window.SOLAR.get(key, session.get(key) ?? fallback);
  }

  function save(key, value) {
    session.set(key, value);
    window.SOLAR.put(key, value);
  }

  function stateKey() { return 'practice.v1.' + mode; }

  function readState() {
    const state = read(stateKey(), null);
    return state && state.records && Number.isSafeInteger(state.turn)
      ? state : {records: {}, turn: 0, current: null};
  }

  function getDeck() {
    const {bodies, byId} = window.SOLAR;
    if (mode === 'myths') return myths.filter(card => byId.has(card.bodyId));
    const sequence = mode === 'listen' ? [...bodies.slice(3), ...bodies.slice(0, 3)] : bodies;
    return sequence.map(body => ({id: body.id, bodyId: body.id}));
  }

  function choose(state) {
    const now = Date.now();
    const due = deck.filter(card => state.records[card.id]?.due <= now)
      .sort((a, b) => state.records[a.id].due - state.records[b.id].due);
    return due.find(card => (state.records[card.id].after || 0) <= state.turn) ||
      deck.find(card => !state.records[card.id]) || due[0] || null;
  }

  function mark(remembered) {
    const state = readState();
    // Another open tab may already have rated the card displayed here.
    if (state.current !== current.id) { render(true); return; }
    state.turn += 1;
    const step = remembered ? Math.min((state.records[current.id]?.step || 0) + 1, intervals.length) : 0;
    state.records[current.id] = {
      step, due: Date.now() + (step ? intervals[step - 1] * day : 0),
      after: step ? 0 : state.turn + 2
    };
    state.current = null;
    save(stateKey(), state);
    render(true);
  }

  function setMode(next, controls) {
    mode = next;
    save('practice.mode', mode);
    deck = getDeck();
    for (const node of controls.children) node.setAttribute('aria-pressed', String(node.dataset.mode === mode));
    render(false);
  }

  function render(focus) {
    const {audioButton, byId, bodyURL, stopAudio} = window.SOLAR;
    stopAudio();
    const view = document.getElementById('practice-card');
    const note = document.getElementById('practice-note');
    const state = readState();
    current = deck.find(card => card.id === state.current) || choose(state);
    view.replaceChildren();
    if (!current) {
      note.textContent = '';
      const head = element('h2', 'prompt', 'На сегодня всё');
      head.tabIndex = -1;
      view.append(head);
      const next = [...deck].sort((a, b) => state.records[a.id].due - state.records[b.id].due)[0];
      if (next) {
        const date = new Date(state.records[next.id].due).toLocaleDateString('ru', {day: 'numeric', month: 'long'});
        view.append(element('p', 'muted', 'Следующее повторение — ' + date + '.'),
          button('Повторить раньше', 'button secondary', () => {
            state.current = next.id;
            save(stateKey(), state);
            render(true);
          }));
      }
      if (focus) head.focus({preventScroll: true});
      return;
    }

    state.current = current.id;
    save(stateKey(), state);
    note.textContent = '«Ещё раз» вернёт карточку после двух других, если они доступны. После «Вспомнил» интервалы растут от одного дня до двух недель.';
    const body = byId.get(current.bodyId);
    const label = {names: 'Назовите по-английски', listen: 'Узнайте на слух', myths: 'Вспомните миф'};
    const question = mode === 'myths' ? current.question : mode === 'names' ? body.ru : 'Какое название произносит Ryan?';
    const head = element('h2', 'prompt', question);
    head.tabIndex = -1;
    view.append(element('p', 'eyebrow', label[mode]), head);
    if (mode === 'listen') view.append(audioButton(body, 'Послушать', true));

    const answer = element('div', 'answer');
    answer.id = 'practice-answer';
    answer.hidden = true;
    const references = element('div', 'action-row');
    if (mode === 'myths') answer.append(element('p', '', current.answer));
    else {
      const translation = element('strong', 'english', body.en);
      translation.lang = 'en';
      answer.append(translation);
      if (mode === 'listen') answer.append(element('p', '', body.ru));
      references.append(audioButton(body, 'Произношение'));
    }
    const link = element('a', 'mini-link', 'Открыть карточку');
    link.href = bodyURL(body.id);
    references.append(link);
    answer.append(references);
    const ratings = element('div', 'action-row');
    ratings.append(button('Ещё раз', 'button secondary', () => mark(false)),
      button('Вспомнил', 'button primary', () => mark(true)));
    answer.append(ratings);
    const toggle = button('Показать ответ', 'button primary', () => {
      answer.hidden = !answer.hidden;
      toggle.textContent = answer.hidden ? 'Показать ответ' : 'Скрыть ответ';
      toggle.setAttribute('aria-expanded', String(!answer.hidden));
      if (answer.hidden) stopAudio();
    });
    toggle.setAttribute('aria-controls', answer.id);
    toggle.setAttribute('aria-expanded', 'false');
    const actions = element('div', 'action-row');
    actions.append(toggle);
    view.append(actions, answer);
    if (focus) head.focus({preventScroll: true});
  }

  function open() {
    const controls = document.getElementById('practice-modes');
    controls.replaceChildren();
    for (const [id, label] of Object.entries(modes)) {
      const node = button(label, '', () => setMode(id, controls));
      node.dataset.mode = id;
      controls.append(node);
    }
    const savedMode = read('practice.mode', 'names');
    setMode(Object.hasOwn(modes, savedMode) ? savedMode : 'names', controls);
  }

  return {open};
})();
