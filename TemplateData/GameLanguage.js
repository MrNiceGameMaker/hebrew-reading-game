(() => {
  const messages = {
  "טוענים את המשחק…": "Loading the game…",
  "התקדמות הטעינה": "Loading progress",
  "נסו שוב": "Try again",
  "מסך מלא": "Fullscreen",
  "עדכון זמין · לטעון עכשיו": "Update available · Reload now",
  "שם הילד או הילדה": "Child's name",
  "אישור": "OK",
  "ביטול": "Cancel",
  "מקלדת שם": "Name keyboard",
  "אותיות גדולות": "Capital letters",
  "רווח": "Space",
  "מחיקה": "Delete",
  "לחוויה הטובה ביותר בטלפון ובטאבלט, מומלץ להתקין את המשחק למסך הבית.": "For the best experience on a phone or tablet, install Tuli Town on your home screen.",
  "מתקין…": "Installing…",
  "כשהאייקון של טולי טאון מופיע במסך הבית, פתחו ממנו את המשחק וסגרו את הלשונית הזו.": "When the Tuli Town icon appears on your home screen, open it and close this tab.",
  "התקנה": "Install",
  "פתח את טולי טאון": "Open Tuli Town",
  "המשך באתר": "Play on the website",
  "החשבון שלי": "My account",
  "איפוס במכשיר הזה": "Reset this device",
  "שם משתמש": "Username",
  "סיסמה": "Password",
  "בחשבון חדש בחרו שם משתמש שאינו השם המלא של הילד, ושמרו את שם המשתמש והסיסמה.": "Choose a username other than your child's full name. Save the username and password somewhere safe.",
  "לצרף לחשבון את המשחקים שכבר שמורים במכשיר": "Add the games already saved on this device",
  "כניסה": "Sign in",
  "פתיחת חשבון": "Create an account",
  "יש לי חשבון עם דוא״ל": "Sign in with email",
  "שכחנו את הסיסמה": "Forgot password",
  "דוא״ל הורה לשחזור": "Parent email for recovery",
  "סנכרן עכשיו": "Sync now",
  "יציאה מהחשבון": "Sign out",
  "השתתפות בפיילוט": "Join the pilot",
  "כתובת דוא״ל של ההורה": "Parent email address",
  "סיסמה נוכחית": "Current password",
  "סיסמה חדשה": "New password",
  "שליחת קישור": "Send link",
  "חזרה": "Back",
  "חזרה למשחק": "Back to the game",
  "להתחיל מחדש במכשיר הזה?": "Start over on this device?",
  "השמירות המקומיות והכניסה לחשבון יימחקו מהמכשיר. משחקים שכבר סונכרנו לענן יהיו זמינים כשתתחברו שוב.": "This removes local game saves and signs you out. Games synced to the cloud will be available after you sign back in.",
  "לפני האיפוס, סגרו עותקים אחרים של טולי טאון שפתוחים במכשיר.": "Close any other open copies of Tuli Town before resetting.",
  "להורים · פתרו את התרגיל": "Parents only · Solve the sum",
  "מחיקה והתחלה מחדש": "Erase and start over",
  "פיילוט טולי טאון": "Tuli Town Pilot",
  "בהסכמת הורה, דוח הפיילוט כולל קוד משפחה, ביקורים, זמן פעיל ושלב אחרון במשחק. אפשר להפסיק את השיתוף בכל עת.": "With a parent's permission, the pilot report includes a family code, visits, active play time, and the last game stage. You can stop sharing any time.",
  "קוד המשפחה": "Family code",
  "אני הורה ומאשר/ת לשתף נתוני שימוש לפיילוט.": "I am a parent and agree to share play data for the pilot.",
  "סיסמת חשבון ההורה": "Parent account password",
  "הצטרפות לפיילוט": "Join the pilot",
  "הפסקת השיתוף": "Stop sharing",
  "דוח לפי משפחה": "Family report",
  "כדי לפתוח את הדוח, התחברו בחשבון מנהל הפיילוט ואמתו את כתובת הדוא״ל.": "To open the report, sign in as the pilot administrator and verify your email.",
  "שליחת קישור אימות": "Send verification link",
  "בדיקת אימות מחדש": "Check verification again",
  "רענון הדוח": "Refresh report",
  "מעבר לחשבון המנהל": "Switch to administrator",
  "סגירה": "Close",
  "ב־Safari פתחו את תפריט השיתוף, בחרו ״הוספה למסך הבית״ והפעילו ״פתיחה כיישום אינטרנט״.": "In Safari, open Share, choose Add to Home Screen, and turn on Open as Web App.",
  "בתפריט הדפדפן ⋮ בחרו ״התקנת אפליקציה״ או ״הוספה למסך הבית״.": "In your browser menu ⋮, choose Install app or Add to Home screen.",
  "מוריד עדכון…": "Downloading an update…",
  "המשחק לא נטען. בדקו את החיבור לאינטרנט ונסו שוב.": "The game didn't load. Check your connection and try again.",
  "התשובה לא מתאימה. נסו תרגיל חדש.": "That answer doesn't match. Try a new sum.",
  "מאפסים את השמירה…": "Resetting saved games…",
  "האיפוס לא הושלם. סגרו חלונות אחרים של המשחק ונסו שוב.": "The reset didn't finish. Close any other copies of the game and try again.",
  "דוח הפיילוט של טולי טאון": "Tuli Town Pilot Report",
  "פתיחת המשחק": "Open the game",
  "טולי": "Tuli",
  "טאון": "Town",
  "טולי טאון": "Tuli Town",
  "אין אפשרות לשמור במכשיר. אפשר לפנות מקום ולנסות שוב": "Couldn't save on this device. Free some space and try again.",
  "שמירות המשחק מסונכרנות": "Your saved games are in sync.",
  "השינויים הבאים יישמרו בענן בסוף המשחקון": "The next changes will sync after the mini-game.",
  "יש להתחבר מחדש כדי להמשיך לסנכרן": "Sign in again to continue syncing.",
  "השינויים שמורים כאן. ממתינים לחיבור לענן": "Changes are saved here while we reconnect.",
  "מחובר לחשבון ": "Signed in as ",
  "כתובת דוא״ל": "Email address",
  "איפוס סיסמה בדוא״ל": "Reset password by email",
  "כניסה בשם משתמש": "Sign in with username",
  "בחרו שם משתמש באורך 3–24 תווים, עם אותיות או ספרות. אפשר גם מקף, נקודה וקו תחתון.": "Choose 3–24 letters or numbers. You can also use a hyphen, period, or underscore.",
  "בחרו סיסמה באורך שמונה תווים לפחות.": "Choose a password with at least eight characters.",
  "פותחים חשבון…": "Creating your account…",
  "מתחברים וטוענים שמירות…": "Signing in and loading saves…",
  "אם קיים חשבון בכתובת הזו, יגיע אליו קישור לאיפוס הסיסמה.": "If an account uses that address, a password reset link will arrive by email.",
  "מחוברים": "Signed in",
  "בדקו את כתובת הדוא״ל והסיסמה": "Check the email address and password.",
  "בדקו את שם המשתמש והסיסמה": "Check the username and password.",
  "הכתובת כבר רשומה. אפשר להתחבר או לאפס סיסמה": "That email is registered. Sign in or reset your password.",
  "שם המשתמש תפוס. אפשר להתחבר או לבחור שם אחר": "This username is taken. Sign in or choose another name.",
  "בדקו את כתובת הדוא״ל": "Check the email address.",
  "לא הצלחנו להשתמש בשם המשתמש הזה": "We couldn't use that username.",
  "בחרו סיסמה ארוכה יותר": "Choose a longer password.",
  "בחרו סיסמה ארוכה יותר.": "Choose a longer password.",
  "ניסיונות רבים מדי. אפשר לנסות שוב מאוחר יותר": "Too many attempts. Try again later.",
  "החשבון נוצר. התחברו שוב כדי לטעון את שמירות המשחק.": "Your account was created. Sign in again to load your games.",
  "הפעולה לא הושלמה. אפשר לנסות שוב": "That didn't go through. Try again.",
  "בודקים את השמירה בענן…": "Checking cloud saves…",
  "שומר בענן…": "Saving to the cloud…",
  "דוא״ל לשחזור הסיסמה": "Password recovery email",
  "הקלידו את כתובת הדוא״ל של ההורה ואת סיסמת החשבון. נשלח קישור לאישור הכתובת.": "Enter the parent's email and the account password. We'll send a link to verify the email address.",
  "שליחת קישור אישור": "Send verification link",
  "הקלידו את כתובת הדוא״ל שכבר אושרה בחשבון. נשלח קישור לבחירת סיסמה חדשה.": "Enter the verified email for this account. We'll send a link to set a new password.",
  "שליחת קישור איפוס": "Send reset link",
  "אישור דוא״ל ההורה": "Verify the parent email",
  "הקלידו את הכתובת שאליה הגיע הקישור כדי לחבר אותה לחשבון המשחק.": "Enter the address that received the link to connect it to your game account.",
  "אישור כתובת": "Verify email",
  "בחירת סיסמה חדשה": "Choose a new password",
  "הקלידו את הכתובת שאליה הגיע הקישור ובחרו סיסמה באורך שמונה תווים לפחות.": "Enter the email address that received the link and choose a password with at least eight characters.",
  "שמירת הסיסמה": "Save password",
  "דוא״ל לשחזור מאומת": "Recovery email verified",
  "ממתינים לאישור הקישור שנשלח": "Waiting for email verification",
  "שלחנו קישור לאישור הכתובת. דוא״ל השחזור יופעל אחרי פתיחת הקישור ואישור הכתובת.": "We sent a verification link. Open it and verify the email address to enable recovery.",
  "הכתובת אושרה. מעכשיו אפשר לאפס דרכה את סיסמת המשחק.": "The email is verified. You can now use it to reset the game password.",
  "הסיסמה עודכנה. אפשר לחזור למשחק ולהיכנס עם אותו שם משתמש והסיסמה החדשה.": "The password was updated. Return to the game and sign in with the same username and your new password.",
  "רגע, אנחנו מטפלים בזה…": "One moment…",
  "אם הכתובת תואמת לדוא״ל שאושר בחשבון, אפשר לאפס את הסיסמה דרך הקישור.": "If that email matches the verified address on the account, it will receive a password reset link.",
  "הסיסמה הנוכחית אינה תואמת.": "The current password doesn't match.",
  "בדקו את כתובת הדוא״ל ונסו שוב.": "Check the email address and try again.",
  "הקישור אינו תקף. נסו לבקש קישור חדש.": "This link is invalid. Request a new one.",
  "תוקף הקישור פג. בקשו קישור חדש.": "This link expired. Request a new one.",
  "בוצעו ניסיונות רבים. נסו שוב מאוחר יותר.": "Too many attempts. Try again later.",
  "לא הצלחנו לאשר את הפעולה. ודאו שזו הכתובת המתאימה ובקשו קישור חדש לפי הצורך.": "We couldn't verify the request. Check the address or ask for a new link.",
  "לא הצלחנו לשלוח קישור כרגע. אפשר לנסות שוב.": "We couldn't send a link right now. Try again.",
  "בחירת פרופיל": "Choosing a player",
  "יצירת פרופיל": "Creating a player",
  "בבית": "At home",
  "בתפריט": "In the menu",
  "טעינת משחקון": "Loading a mini-game",
  "באמצע משחקון": "Playing a mini-game",
  "סיום משחקון": "Finishing a mini-game",
  "תפיסת אותיות": "Letter Catch",
  "חפרפרות": "Letter Moles",
  "לייזר": "Laser Tower",
  "חיבור נקודות": "Connect the Letters",
  "תזמורת האותיות": "Letter Orchestra",
  "מילה ותמונה": "Word and Picture",
  "זוגות": "Picture Memory",
  "מוסך המילים": "Word Garage",
  "מקהלת ההברות": "Syllable Choir",
  "חדר חידות": "Puzzle Room",
  "הדוח נפתח עם כתובת הדוא״ל של מנהל הפיילוט.": "Sign in with the pilot administrator's email to open the report.",
  "הפיילוט עדיין לא זמין, או שאין לחשבון גישה.": "The pilot is unavailable or this account doesn't have access.",
  "טוענים את דוח הפיילוט…": "Loading the pilot report…",
  "קוד משפחה": "Family code",
  "ביקורים": "Visits",
  "ביקור ראשון": "First visit",
  "פעילות אחרונה": "Last active",
  "זמן פעיל": "Play time",
  "משחקונים שהושלמו": "Mini-games completed",
  "שלב אחרון": "Last stage",
  " דק׳": " min",
  " משפחות ב־30 הימים האחרונים · השלב האחרון משוער לפי השמירה האחרונה": " families in the last 30 days · The last stage comes from the most recent save",
  "עדיין אין נתוני משחק ממשפחות שהצטרפו.": "No play data from participating families yet.",
  "טעינת הדוח נכשלה. בדקו את החיבור וההרשאה ונסו שוב.": "The report couldn't load. Check the connection and access, then try again.",
  "השיתוף הופעל. אפשר למסור למנהל הפיילוט את קוד המשפחה.": "Sharing is on. You can give the family code to the pilot administrator.",
  "ההצטרפות נכשלה. בדקו את סיסמת ההורה ואת החיבור.": "Couldn't join. Check the parent password and your connection.",
  "השיתוף הופסק.": "Sharing stopped.",
  "השיתוף נעצר כאן. כדי להפסיק גם במכשירים אחרים, נסו שוב בחיבור לאינטרנט.": "Sharing stopped here. Reconnect and try again to stop sharing on other devices.",
  "ממתינים לזמינות שירות הפיילוט.": "Waiting for the pilot service.",
  "נשלח קישור לכתובת הדוא״ל של החשבון. לאחר האימות לחצו על ״בדיקת אימות מחדש״.": "We sent a link to the account email. After verifying it, select Check verification again.",
  "לא הצלחנו להשלים את האימות. נסו שוב בעוד רגע.": "We couldn't verify your email. Try again in a moment."
};
  const key = 'LearnToRead.Language';
  const url = new URL(location.href);
  const requested = url.searchParams.get('lang');
  let saved;
  try { saved = localStorage.getItem(key); } catch { /* Storage is optional. */ }
  const language = requested === 'en' || requested === 'he' ? requested : saved === 'en' ? 'en' : 'he';
  try { localStorage.setItem(key, language); } catch { /* The current URL preserves the preference. */ }
  const english = language === 'en';
  const t = value => english && Object.hasOwn(messages, value) ? messages[value] : value;

  function change(next) {
    if (next === language) return;
    url.searchParams.set('lang', next);
    location.assign(url.href);
  }

  function localize() {
    document.documentElement.lang = language;
    document.documentElement.dir = english ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-language-switch]').forEach(button => {
      button.textContent = english ? 'עברית' : 'English';
      button.onclick = () => change(english ? 'he' : 'en');
    });
    if (!english) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest('script, style, [data-language-switch]')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const source = node.data.trim();
      const translated = t(source);
      if (translated !== source) node.data = node.data.replace(source, translated);
    }
    for (const element of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
      for (const attribute of ['aria-label','title','placeholder']) {
        if (element.hasAttribute(attribute)) {
          const source = element.getAttribute(attribute);
          element.setAttribute(attribute, t(source));
        }
      }
    }
    document.title = 'Tuli Town';
  }

  window.learnToReadLanguage = { language, english, change, localize, t };
})();
