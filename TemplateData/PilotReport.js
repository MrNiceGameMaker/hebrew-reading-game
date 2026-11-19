(() => {
  'use strict';
  const cloud = window.learnToReadCloud;
  const byId = id => document.getElementById(id);
  const dialog = byId('pilot-dialog');
  const form = byId('pilot-consent');
  const status = byId('pilot-status');
  const reportOnly = new URLSearchParams(location.search).has('pilot-report');
  const stages = { profiles: 'בחירת פרופיל', onboarding: 'יצירת פרופיל', home: 'בבית', menu: 'בתפריט',
    loading: 'טעינת משחקון', round: 'באמצע משחקון', roundComplete: 'סיום משחקון' };
  const games = { Catch: 'תפיסת אותיות', Mole: 'חפרפרות', Laser: 'לייזר', Drawing: 'חיבור נקודות',
    Rhythm: 'תזמורת האותיות', Match: 'מילה ותמונה', Pairs: 'זוגות', Garage: 'מוסך המילים',
    Choir: 'מקהלת ההברות', PuzzleRoom: 'חדר חידות' };
  const idleLimit = 60000;
  const visitGap = 30 * 60000;
  let owner, consent, admin, visit, visitId, stage = 'profiles', game = '';
  let tickAt = performance.now(), lastInput = tickAt, active = false, activeMs = 0;
  let saving = false, pendingCheckpoint = false, saved = '', lastWrite = -Infinity, authorization = 0;

  function updateClock() {
    const now = performance.now();
    if (visit && active)
      activeMs += Math.max(0, Math.min(now, lastInput + idleLimit) - tickAt);
    tickAt = now;
    active = !!visit && !document.hidden && !document.querySelector('dialog[open]') &&
      ['home', 'round', 'roundComplete'].includes(stage);
  }

  function fields(document) {
    return Object.fromEntries(Object.entries(document?.fields ?? {}).map(([key, field]) =>
      [key, field.stringValue ?? field.booleanValue ?? Number(field.integerValue)]));
  }

  function renderConsent() {
    form.hidden = !consent || consent.enabled;
    byId('pilot-stop').hidden = !consent?.enabled;
    byId('pilot-family').hidden = !consent?.code;
    byId('pilot-family-code').textContent = consent?.code ?? '';
    byId('pilot-admin').hidden = !admin;
  }

  async function readAccount(openReport = false) {
    const generation = ++authorization;
    owner = cloud.pilotAccount();
    consent = admin = null;
    visit = visitId = null;
    activeMs = 0;
    active = false;
    pendingCheckpoint = false;
    saved = '';
    lastWrite = -Infinity;
    if (!owner) { renderConsent(); return; }
    const id = encodeURIComponent(owner);
    try {
      const [permission, preferences] = await Promise.all([
        cloud.pilotDocument('pilotConfig/report').catch(() => null),
        cloud.pilotDocument('pilotConsents/' + id)
      ]);
      if (authorization !== generation) return;
      admin = !!permission;
      consent = fields(preferences);
      renderConsent();
      if (consent.enabled && !reportOnly) startVisit();
      if (openReport) {
        if (!dialog.open) dialog.showModal();
        byId('pilot-settings').hidden = true;
        byId('pilot-verify').hidden = !!admin;
        if (admin) await showReport();
        else status.textContent = '';
      }
    } catch {
      if (authorization !== generation) return;
      status.textContent = 'הפיילוט עדיין לא זמין, או שאין לחשבון גישה.';
      renderConsent();
    }
  }

  function startVisit() {
    const now = Date.now();
    visitId = crypto.randomUUID();
    visit = { owner, code: consent.code, startedAt: now, updatedAt: now,
      seconds: 0, stage, game, completed: 0 };
    activeMs = 0;
    lastInput = performance.now();
    lastWrite = -Infinity;
    updateClock();
    saveVisit(true);
  }

  async function saveVisit(force = false, keepalive = false) {
    if (!visit || !consent?.enabled || cloud.pilotAccount() !== owner)
      return;
    if (saving) {
      pendingCheckpoint ||= force;
      return;
    }
    updateClock();
    const seconds = Math.min(14400, Math.floor(activeMs / 1000));
    const fingerprint = [seconds, visit.stage, visit.game, visit.completed].join('/');
    if (saved === fingerprint || (!force && performance.now() - lastWrite < 25000))
      return;
    const generation = authorization;
    const currentVisit = visit;
    lastWrite = performance.now();
    saving = true;
    try {
      const updatedAt = Math.max(visit.updatedAt, Date.now());
      await cloud.pilotDocument('pilotSessions/' + visitId, { ...visit, seconds, updatedAt }, keepalive);
      if (generation === authorization && visit === currentVisit) {
        visit.updatedAt = updatedAt;
        saved = fingerprint;
      }
    } catch (error) {
      if (error.httpStatus === 403 && generation === authorization && visit === currentVisit)
        visit = null; // Firestore also enforces withdrawal made on another device.
    } finally {
      saving = false;
      if (pendingCheckpoint) {
        pendingCheckpoint = false;
        saveVisit(true, document.hidden);
      }
    }
  }

  function input() {
    if (!visit || document.hidden) return;
    const idle = performance.now() - lastInput;
    updateClock();
    if (idle >= visitGap) startVisit();
    else lastInput = performance.now();
  }

  async function showReport() {
    if (!admin) return;
    byId('pilot-report').hidden = false;
    byId('pilot-settings').hidden = true;
    byId('pilot-verify').hidden = true;
    status.textContent = 'טוענים את דוח הפיילוט…';
    const families = new Map();
    const generation = authorization;
    const cutoff = Date.now() - 30 * 86400000;
    try {
      let cursor = '';
      do {
        const query = new URLSearchParams({ pageSize: '100', orderBy: 'updatedAt desc' });
        if (cursor) query.set('pageToken', cursor);
        const result = await cloud.pilotDocument('pilotSessions?' + query);
        if (generation !== authorization || !admin) return;
        for (const document of result?.documents ?? []) {
          const item = fields(document);
          if (item.updatedAt < cutoff) break;
          const family = families.get(item.code);
          if (family) {
            family.visits++;
            family.seconds += item.seconds;
            family.completed += item.completed;
            family.first = Math.min(family.first, item.startedAt);
          } else families.set(item.code, { ...item, visits: 1, first: item.startedAt });
        }
        const oldest = result?.documents?.at(-1);
        cursor = oldest && fields(oldest).updatedAt >= cutoff ? result.nextPageToken : '';
      } while (cursor);
      const table = document.createElement('table');
      function row(container, values, tag) {
        const line = container.insertRow();
        for (const text of values) {
          const cell = document.createElement(tag);
          cell.textContent = text;
          line.appendChild(cell);
        }
      }
      row(table.createTHead(), ['קוד משפחה', 'ביקורים', 'ביקור ראשון', 'פעילות אחרונה', 'זמן פעיל',
        'משחקונים שהושלמו', 'שלב אחרון'], 'th');
      const list = table.createTBody();
      const dates = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });
      for (const family of families.values()) {
        row(list, [family.code, family.visits, dates.format(family.first), dates.format(family.updatedAt),
          Math.round(family.seconds / 6) / 10 + ' דק׳', family.completed,
          [stages[family.stage], games[family.game]].filter(Boolean).join(' · ')], 'td');
      }
      byId('pilot-table').replaceChildren(table);
      status.textContent = families.size
        ? families.size + ' משפחות ב־30 הימים האחרונים · השלב האחרון משוער לפי השמירה האחרונה'
        : 'עדיין אין נתוני משחק ממשפחות שהצטרפו.';
    } catch {
      status.textContent = 'טעינת הדוח נכשלה. בדקו את החיבור וההרשאה ונסו שוב.';
    }
  }

  function setBusy(busy) {
    byId('pilot-save').disabled = busy;
    byId('pilot-stop').disabled = busy;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!consent || consent.enabled || !owner) return;
    const generation = authorization;
    const password = form.querySelector('input[type=password]');
    setBusy(true);
    try {
      await cloud.confirmPilotParent(password.value);
      if (generation !== authorization) return;
      const code = consent.code ?? [...crypto.getRandomValues(new Uint8Array(6))]
        .map(byte => byte.toString(16).padStart(2, '0')).join('');
      const next = { code, enabled: true, revision: 1 };
      await cloud.pilotDocument('pilotConsents/' + encodeURIComponent(owner), next);
      if (generation !== authorization) return;
      consent = next;
      status.textContent = 'השיתוף הופעל. אפשר למסור למנהל הפיילוט את קוד המשפחה.';
      renderConsent();
      if (!reportOnly) startVisit();
    } catch {
      status.textContent = 'ההצטרפות נכשלה. בדקו את סיסמת ההורה ואת החיבור.';
    } finally { form.reset(); setBusy(false); }
  });

  byId('pilot-stop').onclick = async () => {
    if (!consent?.enabled) return;
    const next = { ...consent, enabled: false };
    const generation = authorization;
    visit = null;
    consent = next;
    setBusy(true);
    try {
      await cloud.pilotDocument('pilotConsents/' + encodeURIComponent(owner), next);
      if (generation === authorization) status.textContent = 'השיתוף הופסק.';
    } catch {
      if (generation === authorization) {
        consent = { ...next, enabled: true };
        status.textContent = 'השיתוף נעצר כאן. כדי להפסיק גם במכשירים אחרים, נסו שוב בחיבור לאינטרנט.';
      }
    } finally { renderConsent(); setBusy(false); }
  };

  byId('open-pilot').onclick = () => {
    byId('cloud-dialog').close();
    byId('pilot-report').hidden = true;
    byId('pilot-settings').hidden = false;
    byId('pilot-verify').hidden = true;
    status.textContent = consent ? '' : 'ממתינים לזמינות שירות הפיילוט.';
    renderConsent();
    dialog.showModal();
    updateClock();
  };
  byId('pilot-close').onclick = () => dialog.close();
  byId('pilot-admin').onclick = byId('pilot-refresh').onclick = showReport;
  async function verifyEmail(send) {
    try {
      await cloud.verifyPilotEmail(send);
      if (send) status.textContent = 'נשלח קישור לכתובת הדוא״ל של החשבון. לאחר האימות לחצו על ״בדיקת אימות מחדש״.';
      else await readAccount(true);
    } catch {
      status.textContent = 'לא הצלחנו להשלים את האימות. נסו שוב בעוד רגע.';
    }
  }
  byId('pilot-send-verification').onclick = () => verifyEmail(true);
  byId('pilot-check-verification').onclick = () => verifyEmail(false);
  dialog.addEventListener('close', () => { form.reset(); updateClock(); });
  document.addEventListener('pointerdown', input, { passive: true, capture: true });
  document.addEventListener('keydown', input, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    updateClock();
    if (document.hidden) saveVisit(true, true);
  });
  window.addEventListener('pagehide', () => saveVisit(true, true));
  setInterval(() => saveVisit(), 15000);

  window.learnToReadPilot = {
    accountChanged: () => readAccount(reportOnly),
    stage(nextStage, nextGame, completed) {
      if (!Object.hasOwn(stages, nextStage) || nextGame && !Object.hasOwn(games, nextGame)) return;
      updateClock();
      stage = nextStage;
      game = nextGame;
      if (!visit) return;
      visit.stage = stage;
      visit.game = game;
      if (completed) visit.completed = Math.min(2000, visit.completed + 1);
      updateClock();
      saveVisit(true);
    }
  };
  cloud.ready.then(() => {
    if (cloud.pilotAccount()) readAccount(reportOnly);
    else if (reportOnly) cloud.open();
  });
})();
