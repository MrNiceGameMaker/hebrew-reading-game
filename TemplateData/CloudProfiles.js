(() => {
  'use strict';

  const project = document.querySelector('meta[name="firebase-project-id"]')?.content.trim();
  const apiKey = document.querySelector('meta[name="firebase-web-api-key"]')?.content.trim();
  if (!/^[a-z0-9-]+$/.test(project || '') || !apiKey) return;
  const authEndpoint = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const tokenEndpoint = 'https://securetoken.googleapis.com/v1/token';
  const firestoreDocuments = 'projects/' + project + '/databases/(default)/documents';
  const firestoreEndpoint = 'https://firestore.googleapis.com/v1/' + firestoreDocuments;
  const keyQuery = '?key=' + encodeURIComponent(apiKey);
  const reportOnly = new URLSearchParams(location.search).has('pilot-report');
  const sessionKey = 'LearnToRead.Firebase.' + project;
  const accountKey = id => sessionKey + '.profiles.' + id;
  const checkpointKey = id => accountKey(id) + '.checkpoint';
  const backupValues = new Map();
  const storageFailures = new Set();
  let lastStorageWrite = 0;
  let backupDatabase;
  // A family with many drawings can exhaust localStorage. Keep its newest
  // records in IndexedDB when that happens, including across browser restarts.
  const backupReady = new Promise(resolve => {
    let open;
    try { open = indexedDB.open('LearnToRead.CloudBackup', 1); }
    catch { resolve(); return; }
    open.onupgradeneeded = () => open.result.createObjectStore('records');
    open.onerror = () => resolve();
    open.onblocked = () => resolve();
    open.onsuccess = () => {
      backupDatabase = open.result;
      backupDatabase.onversionchange = () => backupDatabase.close();
      const transaction = backupDatabase.transaction('records', 'readonly');
      const cursor = transaction.objectStore('records').openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        if (entry.key.startsWith(sessionKey)) backupValues.set(entry.key, entry.value);
        entry.continue();
      };
      transaction.oncomplete = transaction.onabort = () => resolve();
    };
  });
  const empty = () => ({ snapshot: { schemaVersion: 1, profiles: [], deletedProfileIds: [], selected: '' },
    clocks: {}, selectedClock: '' });
  function decode(value, fallback) {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }
  function read(key, fallback) {
    let local;
    try { local = decode(localStorage.getItem(key), null); } catch { /* Try the backup. */ }
    const backup = backupValues.get(key);
    const latest = storageOrder(backup) >= storageOrder(local) && backupValues.has(key) ? backup : local;
    lastStorageWrite = Math.max(lastStorageWrite, storageOrder(latest));
    return storageValue(latest) ?? fallback;
  }
  function storageOrder(record) {
    return record?.storageVersion === 1 ? Number(record.writtenAt) || 0 : 0;
  }
  function storageValue(record) {
    return record?.storageVersion === 1 ? record.data : record;
  }
  function write(key, data) {
    const hadBackup = backupValues.has(key);
    // Compare both durable copies after a restart even if cleanup of an old
    // backup was interrupted. Old, unwrapped saves remain readable.
    read(key, null);
    lastStorageWrite = Math.max(Date.now() * 1000, lastStorageWrite + 1);
    const record = { storageVersion: 1, writtenAt: lastStorageWrite, data };
    let stored = false;
    try {
      localStorage.setItem(key, JSON.stringify(record));
      stored = true;
    } catch { /* Use the larger IndexedDB store below. */ }
    if (stored) {
      backupValues.delete(key);
      storageFailures.delete(key);
    }
    else backupValues.set(key, record);
    if (stored && !hadBackup) return;
    if (!backupDatabase) {
      if (!stored) failedLocalSave(key);
      return;
    }
    try {
      const transaction = backupDatabase.transaction('records', 'readwrite');
      const records = transaction.objectStore('records');
      if (stored) records.delete(key);
      else records.put(record, key);
      transaction.oncomplete = () => {
        if (storageFailures.delete(key)) updateStatus(status);
      };
      transaction.onabort = () => {
        if (!stored) failedLocalSave(key);
      };
    } catch {
      if (!stored) failedLocalSave(key);
    }
  }
  function failedLocalSave(key) {
    storageFailures.add(key);
    updateStatus(status);
  }
  function normalize(snapshot) {
    return {
      schemaVersion: 1,
      profiles: (snapshot?.profiles ?? []).filter(profile => profile?.id),
      deletedProfileIds: [...new Set(snapshot?.deletedProfileIds ?? [])].sort(),
      selected: snapshot?.selected ?? ''
    };
  }
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  function merge(remote, local) {
    const result = empty();
    result.snapshot.deletedProfileIds = [...new Set([...remote.snapshot.deletedProfileIds,
      ...local.snapshot.deletedProfileIds])].sort();
    const deleted = new Set(result.snapshot.deletedProfileIds);
    const profiles = new Map();
    for (const record of [remote, local]) {
      for (const profile of record.snapshot.profiles) {
        if (deleted.has(profile.id)) continue;
        const modified = record.clocks[profile.id] || '';
        if (!profiles.has(profile.id) || modified > result.clocks[profile.id]) {
          profiles.set(profile.id, profile);
          result.clocks[profile.id] = modified;
        }
      }
    }
    result.snapshot.profiles = [...profiles.values()];
    const selection = local.selectedClock > remote.selectedClock ? local : remote;
    result.selectedClock = selection.selectedClock;
    result.snapshot.selected = profiles.has(selection.snapshot.selected) ? selection.snapshot.selected : '';
    return result;
  }

  let session;
  let cached = empty();
  let checkpoint = empty();
  let anonymous;
  let rendered;
  const writer = [...crypto.getRandomValues(new Uint8Array(8))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  let lastChange = 0;
  let syncTimer = 0;
  let syncOperation;
  let refreshGame;
  let refreshPending = false;
  let switchingAccount = false;
  let authRequired = false;
  let status = '';

  function stamp() {
    lastChange = Math.max(Date.now(), lastChange + 1, ...Object.values(cached.clocks)
      .concat(cached.selectedClock).map(value => Number(value.split('.')[0]) + 1));
    return String(lastChange).padStart(14, '0') + '.' + writer;
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { ...options, credentials: 'omit', signal: controller.signal });
      const result = await response.json();
      if (!response.ok) {
        const error = new Error('Firebase request failed');
        error.code = (result.error?.message || '').split(' : ')[0];
        error.status = result.error?.status;
        error.httpStatus = response.status;
        throw error;
      }
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  function authenticate(operation, body) {
    return request(authEndpoint + operation + keyQuery, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  }

  async function usernameKey(username) {
    // A username routes to a synthetic Firebase credential. Real addresses are private.
    const bytes = new TextEncoder().encode('tuli-town-username-v1:' + username);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return [...hash.slice(0, 24)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  const normalizeUsername = name => name.trim().normalize('NFKC').toLowerCase();
  const validUsername = name => /^[\p{L}\p{N}][\p{L}\p{N}_.-]{2,23}$/u.test(name);

  async function userToken(account) {
    if (!account.token || account.expires < Date.now() + 60000) {
      const result = await request(tokenEndpoint + keyQuery, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: account.refresh })
      });
      if (result.user_id !== (account.authId || account.id)) throw new Error('Unexpected Firebase account');
      account.token = result.id_token;
      account.refresh = result.refresh_token;
      account.expires = Date.now() + Number(result.expires_in) * 1000;
      if (account === session) write(sessionKey, account);
    }
    return { Authorization: 'Bearer ' + account.token };
  }

  async function synchronizeAccount(account, local, keepalive = false) {
    const path = '/families/' + encodeURIComponent(account.id);
    const url = firestoreEndpoint + path;
    const headers = await userToken(account);
    for (let attempt = 0; attempt < 4; attempt++) {
      let remote = empty();
      let currentDocument = { exists: false };
      try {
        const response = await request(url, { headers, cache: 'no-store' });
        remote = JSON.parse(response.fields.state.stringValue);
        if (remote?.snapshot?.schemaVersion !== 1 || !response.updateTime)
          throw new Error('Unrecognized cloud profile format');
        currentDocument = { updateTime: response.updateTime };
      } catch (error) {
        if (error.status !== 'NOT_FOUND') throw error;
      }
      const merged = merge(remote, local(remote));
      if (same(remote, merged)) return merged;
      try {
        const update = { name: firestoreDocuments + path, fields: { state: { stringValue: JSON.stringify(merged) } } };
        const body = JSON.stringify({ writes: [{ update, currentDocument }] });
        await request(firestoreEndpoint + ':commit', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body, keepalive: keepalive && new TextEncoder().encode(body).length < 60000 });
        return merged;
      } catch (error) {
        if (!['FAILED_PRECONDITION', 'ALREADY_EXISTS', 'ABORTED', 'NOT_FOUND'].includes(error.status) ||
            attempt === 3) throw error;
      }
    }
  }

  function cache() {
    if (session) write(accountKey(session.id), cached);
  }
  function saveCheckpoint() {
    if (session) write(checkpointKey(session.id), checkpoint);
  }
  function checkpointLocalChanges() {
    checkpoint = merge(read(checkpointKey(session.id), empty()), cached);
    saveCheckpoint();
  }
  function updateStatus(message) {
    status = message;
    document.getElementById('cloud-status').textContent = storageFailures.size
      ? 'אין אפשרות לשמור במכשיר. אפשר לפנות מקום ולנסות שוב'
      : message;
  }
  function refreshIfNeeded() {
    if (!rendered || same(rendered, cached.snapshot)) return;
    refreshPending = true;
    refreshGame?.();
  }
  function schedule(delay = 700) {
    if (!session || authRequired) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => sync(), delay);
  }
  function needsLogin(error) {
    return error.httpStatus === 401 || ['PERMISSION_DENIED', 'TOKEN_EXPIRED', 'INVALID_REFRESH_TOKEN', 'USER_DISABLED',
      'USER_NOT_FOUND', 'INVALID_GRANT'].includes(error.code);
  }
  function sync(keepalive = false) {
    if (reportOnly || !session || authRequired) return Promise.resolve(false);
    if (syncOperation) return syncOperation;
    clearTimeout(syncTimer);
    const account = session;
    const queued = () => merge(read(checkpointKey(account.id), empty()), checkpoint);
    syncOperation = synchronizeAccount(account, queued, keepalive).then(merged => {
      if (session !== account) return false;
      checkpoint = merge(merged, queued());
      saveCheckpoint();
      cached = merge(checkpoint, merge(read(accountKey(account.id), empty()), cached));
      cache();
      refreshIfNeeded();
      if (!same(checkpoint, merged)) schedule();
      else updateStatus(same(checkpoint, cached) ? 'שמירות המשחק מסונכרנות' : 'השינויים הבאים יישמרו בענן בסוף המשחקון');
      return true;
    }).catch(error => {
      if (session !== account) return false;
      authRequired = needsLogin(error);
      updateStatus(authRequired ? 'יש להתחבר מחדש כדי להמשיך לסנכרן' : 'השינויים שמורים כאן. ממתינים לחיבור לענן');
      if (!authRequired) schedule(12000);
      return false;
    }).finally(() => { syncOperation = null; });
    return syncOperation;
  }

  async function syncNow() {
    const account = session;
    if (reportOnly || !account || authRequired) return;
    checkpointLocalChanges();
    if (syncOperation) await syncOperation;
    if (session === account) return sync();
  }

  function importLocal(remote) {
    const imported = empty();
    imported.snapshot.profiles = anonymous.profiles.filter(profile =>
      !remote.snapshot.profiles.some(existing => existing.id === profile.id));
    for (const profile of imported.snapshot.profiles) imported.clocks[profile.id] = stamp();
    if (!remote.snapshot.selected && anonymous.selected) {
      imported.snapshot.selected = anonymous.selected;
      imported.selectedClock = stamp();
    }
    return merge(remote, imported);
  }

  const dialog = document.getElementById('cloud-dialog');
  const form = document.getElementById('cloud-auth');
  const signedIn = document.getElementById('cloud-signed-in');
  const identifier = document.getElementById('cloud-email');
  const password = document.getElementById('cloud-password');
  const importCheckbox = document.getElementById('cloud-import');
  const legacy = document.getElementById('cloud-legacy');
  const submitButtons = [...dialog.querySelectorAll('button, input')];
  let sending = false;
  let emailMode = reportOnly;

  function renderDialog() {
    form.hidden = !!session && !authRequired;
    signedIn.hidden = !form.hidden;
    document.getElementById('cloud-account-name').textContent = session?.label ? 'מחובר לחשבון ' + session.label : '';
    document.getElementById('cloud-sync-now').hidden = reportOnly;
    document.getElementById('cloud-import-label').hidden = reportOnly || !anonymous?.profiles.length;
    document.getElementById('cloud-identifier-label').textContent = emailMode ? 'כתובת דוא״ל' : 'שם משתמש';
    identifier.type = emailMode ? 'email' : 'text';
    identifier.dir = emailMode ? 'ltr' : 'auto';
    document.getElementById('cloud-credential-hint').hidden = emailMode;
    document.getElementById('cloud-register').hidden = emailMode && !reportOnly;
    document.getElementById('cloud-recovery').textContent = emailMode ? 'איפוס סיסמה בדוא״ל' : 'שכחנו את הסיסמה';
    document.getElementById('cloud-recovery').hidden = !emailMode && !parent.available();
    document.getElementById('cloud-parent-add').hidden = reportOnly || !session?.username || !parent.available();
    legacy.hidden = reportOnly;
    legacy.textContent = emailMode ? 'כניסה בשם משתמש' : 'יש לי חשבון עם דוא״ל';
    updateStatus(status);
  }

  legacy.onclick = () => {
    emailMode = !emailMode;
    identifier.value = '';
    password.value = '';
    status = '';
    renderDialog();
    identifier.focus();
  };

  const parent = window.createParentRecovery({
    project, apiKey, authenticate, request, dialog, identifier, usernameKey, userToken,
    renderDialog, updateStatus, getSession: () => session
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const operation = event.submitter?.value || 'login';
    const registering = operation === 'register';
    const label = identifier.value.trim();
    const username = emailMode ? '' : normalizeUsername(label);
    if (!emailMode && !validUsername(username)) {
      updateStatus('בחרו שם משתמש באורך 3–24 תווים, עם אותיות או ספרות. אפשר גם מקף, נקודה וקו תחתון.');
      identifier.focus();
      return;
    }
    if (!emailMode && registering && password.value.length < 8) {
      updateStatus('בחרו סיסמה באורך שמונה תווים לפחות.');
      password.focus();
      return;
    }
    if (emailMode && !identifier.checkValidity()) {
      identifier.reportValidity();
      return;
    }
    if (registering && emailMode && !reportOnly) return;
    if (operation === 'recover' && !emailMode) {
      password.value = '';
      parent.openRequest(username);
      return;
    }
    let created = false;
    sending = true;
    submitButtons.forEach(control => { control.disabled = true; });
    updateStatus(registering ? 'פותחים חשבון…' : 'מתחברים וטוענים שמירות…');
    try {
      const credential = emailMode ? { email: label } : await parent.loginCredential(username);
      const email = credential.email;
      if (operation === 'recover') {
        await authenticate('sendOobCode', { requestType: 'PASSWORD_RESET', email });
        updateStatus('אם קיים חשבון בכתובת הזו, יגיע אליו קישור לאיפוס הסיסמה.');
        return;
      }
      const login = await authenticate(registering ? 'signUp' : 'signInWithPassword', {
        email, password: password.value, returnSecureToken: true
      });
      created = registering;
      const account = {
        id: credential.family || login.localId, authId: login.localId,
        token: login.idToken, refresh: login.refreshToken, label, username,
        expires: Date.now() + Number(login.expiresIn) * 1000
      };
      if (!account.authId || !account.token || !account.refresh) throw new Error('Incomplete Firebase sign-in');
      const stored = read(checkpointKey(account.id), empty());
      const merged = reportOnly ? stored : await synchronizeAccount(account, remote => {
        const existing = merge(remote, stored);
        return importCheckbox.checked && anonymous?.profiles.length ? importLocal(existing) : existing;
      });
      clearTimeout(syncTimer);
      switchingAccount = true;
      session = account;
      checkpoint = merged;
      cached = merge(checkpoint, read(accountKey(account.id), empty()));
      authRequired = false;
      cache();
      saveCheckpoint();
      write(sessionKey, account);
      updateStatus(reportOnly ? 'מחוברים' : 'שמירות המשחק מסונכרנות');
      importCheckbox.checked = false;
      refreshPending = true;
      refreshGame?.();
      dialog.close();
      window.learnToReadPilot?.accountChanged();
    } catch (error) {
      if (operation === 'recover' && error.code === 'EMAIL_NOT_FOUND') {
        updateStatus('אם קיים חשבון בכתובת הזו, יגיע אליו קישור לאיפוס הסיסמה.');
        return;
      }
      const messages = {
        INVALID_LOGIN_CREDENTIALS: emailMode ? 'בדקו את כתובת הדוא״ל והסיסמה' : 'בדקו את שם המשתמש והסיסמה',
        INVALID_PASSWORD: emailMode ? 'בדקו את כתובת הדוא״ל והסיסמה' : 'בדקו את שם המשתמש והסיסמה',
        EMAIL_NOT_FOUND: emailMode ? 'בדקו את כתובת הדוא״ל והסיסמה' : 'בדקו את שם המשתמש והסיסמה',
        EMAIL_EXISTS: emailMode ? 'הכתובת כבר רשומה. אפשר להתחבר או לאפס סיסמה' : 'שם המשתמש תפוס. אפשר להתחבר או לבחור שם אחר',
        INVALID_EMAIL: emailMode ? 'בדקו את כתובת הדוא״ל' : 'לא הצלחנו להשתמש בשם המשתמש הזה',
        WEAK_PASSWORD: 'בחרו סיסמה ארוכה יותר',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'ניסיונות רבים מדי. אפשר לנסות שוב מאוחר יותר'
      };
      updateStatus(created ? 'החשבון נוצר. התחברו שוב כדי לטעון את שמירות המשחק.'
        : messages[error.code] || 'הפעולה לא הושלמה. אפשר לנסות שוב');
    } finally {
      sending = false;
      password.value = '';
      submitButtons.forEach(control => { control.disabled = false; });
      renderDialog();
    }
  });

  document.getElementById('cloud-close').onclick = () => dialog.close();
  dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    password.value = '';
    parent.close();
    document.getElementById('game').focus();
  });
  document.getElementById('cloud-sync-now').onclick = syncNow;
  document.getElementById('cloud-sign-out').onclick = async () => {
    if (sending) return;
    sending = true;
    submitButtons.forEach(control => { control.disabled = true; });
    await syncNow();
    clearTimeout(syncTimer);
    switchingAccount = true;
    session = null;
    window.learnToReadPilot?.accountChanged();
    authRequired = false;
    write(sessionKey, null);
    cached = empty();
    checkpoint = empty();
    identifier.value = '';
    importCheckbox.checked = false;
    emailMode = reportOnly;
    status = '';
    sending = false;
    submitButtons.forEach(control => { control.disabled = false; });
    renderDialog();
    refreshPending = true;
    refreshGame?.();
    if (reportOnly) identifier.focus();
    else dialog.close();
  };

  window.learnToReadCloud = {
    ready: backupReady.then(() => {
      session = read(sessionKey, null);
      cached = session ? read(accountKey(session.id), empty()) : empty();
      checkpoint = session ? read(checkpointKey(session.id), empty()) : empty();
      status = session ? 'בודקים את השמירה בענן…' : '';
      if (session && !reportOnly) sync();
    }),
    hasAccount: () => !!session && !authRequired,
    pilotAccount: () => authRequired ? null : session?.id,
    pilotEmailAccount: () => !!session && !session.username,
    async pilotDocument(path, data, keepalive = false) {
      const account = session;
      if (!account || authRequired) throw new Error('Sign in required');
      const headers = await userToken(account);
      if (session !== account) throw new Error('The parent changed');
      const url = firestoreEndpoint + '/' + path;
      if (!data) {
        try { return await request(url, { headers, cache: 'no-store' }); }
        catch (error) { if (error.httpStatus === 404) return null; throw error; }
      }
      const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => {
        const field = typeof value === 'boolean' ? { booleanValue: value } :
          typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value };
        return [key, field];
      }));
      return request(url, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }), keepalive });
    },
    async confirmPilotParent(password) {
      const account = session;
      if (!account || authRequired) throw new Error('Sign in required');
      await userToken(account);
      const lookup = await authenticate('lookup', { idToken: account.token });
      const email = lookup.users?.[0]?.email;
      if (!email || session !== account) throw new Error('Sign in required');
      const login = await authenticate('signInWithPassword', { email, password, returnSecureToken: true });
      if (session !== account || login.localId !== (account.authId || account.id)) throw new Error('The parent changed');
      account.token = login.idToken;
      account.refresh = login.refreshToken;
      account.expires = Date.now() + Number(login.expiresIn) * 1000;
      write(sessionKey, account);
    },
    async verifyPilotEmail(send) {
      const account = session;
      if (!account || authRequired || account.username) throw new Error('An email account is required');
      if (!send) account.expires = 0;
      await userToken(account);
      if (session !== account) throw new Error('The parent changed');
      if (send) await authenticate('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: account.token });
    },
    readSnapshot(local) {
      anonymous = normalize(decode(local, null));
      rendered = session ? cached.snapshot : anonymous;
      refreshPending = false;
      switchingAccount = false;
      return session ? JSON.stringify(rendered) : local;
    },
    saveSnapshot(json, syncAtCheckpoint) {
      if (switchingAccount) return true;
      const snapshot = normalize(decode(json, null));
      if (!session) {
        anonymous = snapshot;
        rendered = snapshot;
        return false;
      }
      const changed = empty();
      const previous = new Map((rendered?.profiles || []).map(profile => [profile.id, profile]));
      changed.snapshot.deletedProfileIds = snapshot.deletedProfileIds;
      changed.snapshot.profiles = snapshot.profiles.filter(profile => !same(previous.get(profile.id), profile));
      for (const profile of changed.snapshot.profiles) changed.clocks[profile.id] = stamp();
      if (snapshot.selected !== rendered?.selected) {
        changed.snapshot.selected = snapshot.selected;
        changed.selectedClock = stamp();
      }
      rendered = snapshot;
      cached = merge(merge(read(accountKey(session.id), empty()), cached), changed);
      cache();
      if (syncAtCheckpoint) {
        checkpointLocalChanges();
        updateStatus('שומר בענן…');
        schedule();
      } else {
        updateStatus('השינויים הבאים יישמרו בענן בסוף המשחקון');
      }
      return true;
    },
    open() {
      renderDialog();
      dialog.showModal();
      parent.showStatus();
      if (!reportOnly && !parent.available()) {
        parent.refreshAvailability().then(available => {
          if (available && dialog.open && document.getElementById('cloud-parent-form').hidden) {
            renderDialog();
            parent.showStatus();
          }
        });
      }
      if (session && !authRequired) sync();
    },
    openParentLink: () => parent.openLink(),
    attach(refresh) {
      refreshGame = refresh;
      if (refreshPending) refresh();
    }
  };

  window.addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => sync(document.hidden));
  window.addEventListener('storage', event => {
    if (event.key !== sessionKey) return;
    const other = storageValue(decode(event.newValue, null));
    if ((session?.authId ?? session?.id ?? '') !== (other?.authId ?? other?.id ?? '')) location.reload();
  });
})();
