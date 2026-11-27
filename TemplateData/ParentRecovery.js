(() => {
  'use strict';
  const t = window.learnToReadLanguage?.t ?? (value => value);

  window.createParentRecovery = ({ project, apiKey, authenticate, request, dialog, usernameKey,
    userToken, renderDialog, getSession }) => {
    const database = 'projects/' + project + '/databases/(default)';
    const endpoint = 'https://firestore.googleapis.com/v1/' + database + '/documents';
    const baseUrl = new URL('./', location.href);
    const byId = id => document.getElementById('cloud-' + id);
    const form = byId('parent-form');
    const address = byId('parent-address');
    const password = byId('parent-password');
    const replacement = byId('parent-new');
    const message = byId('parent-message');
    const confirmationDuration = 24 * 60 * 60 * 1000;
    const resetDuration = 10 * 60 * 1000;
    let mode = '';
    let username = '';
    let link;
    let proof;
    let busy = false;
    let enabled = false;

    function syntheticAddress(key, generation = '') {
      return 'tulitown-' + key + (generation ? '-' + generation : '') + '@example.com';
    }

    async function read(path, headers = {}) {
      try {
        const snapshot = await request(endpoint + '/' + path, { headers, cache: 'no-store' });
        return {
          version: snapshot.updateTime,
          ...Object.fromEntries(Object.entries(snapshot.fields).map(([key, value]) =>
            [key, value.stringValue ?? Number(value.integerValue)]))
        };
      } catch (error) {
        if (error.httpStatus === 404) return null;
        throw error;
      }
    }

    function write(path, data, currentDocument) {
      const fields = Object.fromEntries(Object.entries(data).map(([key, value]) =>
        [key, typeof value === 'string' ? { stringValue: value } : { integerValue: String(value) }]));
      return { update: { name: database + '/documents/' + path, fields }, currentDocument };
    }

    function commit(headers, writes) {
      return request(endpoint + ':commit', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes })
      });
    }

    const bearer = token => ({ Authorization: 'Bearer ' + token });
    const readRoute = key => read('usernameRoutes/' + key);
    const accessPath = family => 'familyAccess/' + family;
    const resetPath = family => 'familyResets/' + family;

    async function loginCredential(name) {
      const key = await usernameKey(name);
      // Older accounts can keep signing in before a recovery address is attached.
      let route;
      try {
        route = await readRoute(key);
        enabled = true;
      } catch (error) {
        if (error.httpStatus !== 403 || enabled) throw error;
      }
      return { key, family: route?.family, email: syntheticAddress(key, route?.generation) };
    }

    async function refreshAvailability() {
      if (enabled) return true;
      try {
        await readRoute('0'.repeat(48));
        enabled = true;
      } catch { /* Account sign-in still works while recovery is unavailable. */ }
      return enabled;
    }

    function sendLink(kind, key, email) {
      const continuation = new URL(baseUrl);
      continuation.searchParams.set('parent-email', kind);
      continuation.searchParams.set('account', key);
      return authenticate('sendOobCode', {
        requestType: 'EMAIL_SIGNIN', email, continueUrl: continuation.href, canHandleCodeInApp: true
      });
    }

    function fromEmailUrl() {
      let url = new URL(location.href);
      if (url.searchParams.has('link')) {
        try { url = new URL(url.searchParams.get('link')); } catch { return; }
      }
      const parameters = url.searchParams;
      if (parameters.get('mode') !== 'signIn' || !parameters.get('oobCode')
        || parameters.get('apiKey') !== apiKey) return;
      let continuation = url;
      if (parameters.has('continueUrl')) {
        try { continuation = new URL(parameters.get('continueUrl')); } catch { return; }
      }
      if (continuation.origin !== baseUrl.origin || continuation.pathname !== baseUrl.pathname) return;
      const kind = continuation.searchParams.get('parent-email');
      const key = continuation.searchParams.get('account');
      if (!['confirm', 'reset'].includes(kind) || !/^[0-9a-f]{48}$/.test(key || '')) return;
      return { kind, key, code: parameters.get('oobCode') };
    }

    function open(next) {
      mode = next;
      form.reset();
      form.hidden = false;
      byId('auth').hidden = true;
      byId('signed-in').hidden = true;
      byId('status').hidden = true;
      password.hidden = byId('parent-password-label').hidden = next !== 'add';
      password.required = !password.hidden;
      replacement.hidden = byId('parent-new-label').hidden = next !== 'reset';
      replacement.required = !replacement.hidden;
      byId('parent-submit').hidden = false;
      byId('parent-back').textContent = t('חזרה');
      const content = {
        add: [t('דוא״ל לשחזור הסיסמה'), t('הקלידו את כתובת הדוא״ל של ההורה ואת סיסמת החשבון. נשלח קישור לאישור הכתובת.'), t('שליחת קישור אישור')],
        request: [t('שכחנו את הסיסמה'), t('הקלידו את כתובת הדוא״ל שכבר אושרה בחשבון. נשלח קישור לבחירת סיסמה חדשה.'), t('שליחת קישור איפוס')],
        confirm: [t('אישור דוא״ל ההורה'), t('הקלידו את הכתובת שאליה הגיע הקישור כדי לחבר אותה לחשבון המשחק.'), t('אישור כתובת')],
        reset: [t('בחירת סיסמה חדשה'), t('הקלידו את הכתובת שאליה הגיע הקישור ובחרו סיסמה באורך שמונה תווים לפחות.'), t('שמירת הסיסמה')]
      }[next];
      [byId('title').textContent, byId('parent-hint').textContent, byId('parent-submit').textContent] = content;
      message.textContent = '';
      address.readOnly = false;
      address.focus();
    }

    function close() {
      mode = '';
      form.reset();
      form.hidden = true;
      byId('title').textContent = t('החשבון שלי');
      byId('status').hidden = false;
    }

    function openLink() {
      link = fromEmailUrl();
      if (!link) return false;
      history.replaceState(null, '', baseUrl);
      document.getElementById('game').hidden = true;
      dialog.showModal();
      open(link.kind);
      return true;
    }

    function back() {
      if (link) {
        location.replace(baseUrl.href);
        return;
      }
      close();
      renderDialog();
      showStatus();
    }

    async function showStatus() {
      const target = byId('parent-status');
      target.textContent = '';
      const account = getSession();
      if (!account?.username || byId('parent-add').hidden) return;
      try {
        const recovery = await read(accessPath(account.id), await userToken(account));
        if (getSession() !== account) return;
        const text = [];
        if (recovery?.email) text.push(t('דוא״ל לשחזור מאומת'));
        if (recovery?.pendingUntil > Date.now()) text.push(t('ממתינים לאישור הקישור שנשלח'));
        target.textContent = text.join(' · ');
      } catch { /* Sign-in and synchronization remain available. */ }
    }

    async function addAddress(email) {
      const account = getSession();
      if (!account?.username) throw new Error('Sign-in required');
      const credential = await loginCredential(account.username);
      const recent = await authenticate('signInWithPassword', {
        email: credential.email, password: password.value, returnSecureToken: true
      });
      if (getSession() !== account || recent.localId !== (account.authId || account.id))
        throw new Error('Account changed');
      const headers = bearer(recent.idToken);
      const path = accessPath(account.id);
      const existing = await read(path, headers);
      const pending = { pending: email, pendingUntil: Date.now() + confirmationDuration };
      if (existing) {
        await commit(headers, [write(path, {
          username: existing.username, owner: existing.owner, email: existing.email, ...pending
        }, { updateTime: existing.version })]);
      } else {
        await commit(headers, [
          write(path, { username: credential.key, owner: recent.localId, email: '', ...pending }, { exists: false }),
          write('usernameRoutes/' + credential.key, { family: account.id, generation: '' }, { exists: false })
        ]);
      }
      await sendLink('confirm', credential.key, email);
      return t('שלחנו קישור לאישור הכתובת. דוא״ל השחזור יופעל אחרי פתיחת הקישור ואישור הכתובת.');
    }

    async function useLink(email) {
      if (!proof) {
        const verified = await authenticate('signInWithEmailLink', { email, oobCode: link.code });
        proof = bearer(verified.idToken);
        address.readOnly = true;
      }
      const route = await readRoute(link.key);
      if (!route) throw new Error('No recovery account');
      const path = accessPath(route.family);
      const recovery = await read(path, proof);
      if (link.kind === 'confirm') {
        await commit(proof, [write(path, {
          username: link.key, owner: recovery.owner, email, pending: '', pendingUntil: 0
        }, { updateTime: recovery.version })]);
        return t('הכתובת אושרה. מעכשיו אפשר לאפס דרכה את סיסמת המשחק.');
      }
      if (recovery.email !== email) throw new Error('Wrong recovery address');
      const generation = Array.from(crypto.getRandomValues(new Uint8Array(16)),
        byte => byte.toString(16).padStart(2, '0')).join('');
      const reset = resetPath(route.family);
      // Only the verified mailbox can create this short-lived authorization. Even
      // the old game credential cannot read it. The new credential consumes it atomically.
      await commit(proof, [write(reset, { email, generation, until: Date.now() + resetDuration })]);
      const login = await authenticate('signUp', {
        email: syntheticAddress(link.key, generation), password: replacement.value, returnSecureToken: true
      });
      await commit(bearer(login.idToken), [
        write(path, {
          username: link.key, owner: login.localId, email, pending: '', pendingUntil: 0
        }, { updateTime: recovery.version }),
        write('usernameRoutes/' + link.key, { family: route.family, generation }, { updateTime: route.version }),
        { delete: database + '/documents/' + reset }
      ]);
      return t('הסיסמה עודכנה. אפשר לחזור למשחק ולהיכנס עם אותו שם משתמש והסיסמה החדשה.');
    }

    byId('parent-add').onclick = () => open('add');
    byId('parent-back').onclick = back;
    dialog.addEventListener('cancel', event => {
      if (busy || link) event.preventDefault();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !mode) return;
      busy = true;
      byId('parent-submit').disabled = byId('parent-back').disabled = byId('close').disabled = true;
      message.textContent = t('רגע, אנחנו מטפלים בזה…');
      const email = address.value.trim().toLowerCase();
      try {
        if (mode === 'add') message.textContent = await addAddress(email);
        else if (mode === 'request') {
          await sendLink('reset', await usernameKey(username), email);
          message.textContent = t('אם הכתובת תואמת לדוא״ל שאושר בחשבון, אפשר לאפס את הסיסמה דרך הקישור.');
        } else {
          message.textContent = await useLink(email);
          byId('parent-submit').hidden = true;
          byId('parent-back').textContent = t('חזרה למשחק');
        }
      } catch (error) {
        const errors = {
          INVALID_LOGIN_CREDENTIALS: t('הסיסמה הנוכחית אינה תואמת.'),
          INVALID_PASSWORD: t('הסיסמה הנוכחית אינה תואמת.'),
          INVALID_EMAIL: t('בדקו את כתובת הדוא״ל ונסו שוב.'),
          INVALID_OOB_CODE: t('הקישור אינו תקף. נסו לבקש קישור חדש.'),
          EXPIRED_OOB_CODE: t('תוקף הקישור פג. בקשו קישור חדש.'),
          TOO_MANY_ATTEMPTS_TRY_LATER: t('בוצעו ניסיונות רבים. נסו שוב מאוחר יותר.'),
          WEAK_PASSWORD: t('בחרו סיסמה ארוכה יותר.')
        };
        message.textContent = errors[error.code] || (link
          ? t('לא הצלחנו לאשר את הפעולה. ודאו שזו הכתובת המתאימה ובקשו קישור חדש לפי הצורך.')
          : t('לא הצלחנו לשלוח קישור כרגע. אפשר לנסות שוב.'));
      } finally {
        password.value = replacement.value = '';
        busy = false;
        byId('parent-submit').disabled = byId('parent-back').disabled = byId('close').disabled = false;
      }
    });

    byId('close').addEventListener('click', () => { if (link) back(); });
    return {
      loginCredential, close, openLink, showStatus, refreshAvailability, available: () => enabled,
      openRequest(name) {
        username = name;
        open('request');
      }
    };
  };
})();
