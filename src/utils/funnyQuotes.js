// A small collection of famous, light-hearted quotes shown under the schedule
// image. Attributions are the popularly cited ones.

export const FUNNY_QUOTES = [
  { text: 'שני דברים הם אינסופיים: היקום וטיפשות האדם — ולגבי היקום אני עדיין לא בטוח.', author: 'אלברט איינשטיין' },
  { text: 'אני לא מפחד מהמוות, אני פשוט לא רוצה להיות שם כשזה קורה.', author: 'וודי אלן' },
  { text: 'תמיד סלח לאויביך — שום דבר לא מרגיז אותם יותר.', author: 'אוסקר ויילד' },
  { text: 'אני יכול לעמוד בכל דבר, חוץ מפיתוי.', author: 'אוסקר ויילד' },
  { text: 'אל תיקח את החיים יותר מדי ברצינות; ממילא לא תצא מהם בחיים.', author: 'אלברט איינשטיין' },
  { text: 'אם אתה חושב שאתה קטן מכדי לחולל שינוי, נסה לישון עם יתוש בחדר.', author: 'הדלאי לאמה' },
  { text: 'מאחורי כל גבר מצליח עומדת אישה מופתעת.', author: 'מרי קיי אש' },
  { text: 'מי שאמר שכסף לא קונה אושר פשוט לא ידע איפה לעשות קניות.', author: 'גרטרוד שטיין' },
  { text: 'אני אוהב מועדי הגשה. במיוחד את הצליל שהם עושים כשהם חולפים על פניי.', author: 'דאגלס אדמס' },
  { text: 'יש לי זיכרון פוטוגרפי, פשוט נגמר לי הפילם.', author: 'סטיבן רייט' },
  { text: 'אני לא רוצה להשתייך לשום מועדון שמוכן לקבל אותי כחבר.', author: 'גראוצ׳ו מרקס' },
  { text: 'מחוץ לכלב, ספר הוא הידיד הכי טוב של האדם. בתוך הכלב חשוך מדי לקרוא.', author: 'גראוצ׳ו מרקס' },
  { text: 'אם אתה אומר את האמת, אינך צריך לזכור כלום.', author: 'מארק טווין' },
  { text: 'אפילו אם אתה על המסלול הנכון — תידרס אם פשוט תשב שם.', author: 'ויל רוג׳רס' },
  { text: 'כשאתה מגיע לצומת בדרך, קח אותו.', author: 'יוגי ברה' },
  { text: 'העתיד כבר לא מה שהיה פעם.', author: 'יוגי ברה' },
];

/** Deterministically pick a quote from a seed (stable per schedule). */
export function pickQuote(seed) {
  const s = String(seed ?? Math.random());
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FUNNY_QUOTES[h % FUNNY_QUOTES.length];
}

// Short, funny compliments addressed to the whole team — shown when every
// employee has submitted their availability. Meant to be copy-pasted into the
// team's group chat.
export const TEAM_COMPLIMENTS = [
  'כולם הגישו אילוצים! 🎉 הצוות הכי אחראי מאז שהומצאה המילה "אחריות".',
  'וואו, כולם בזמן! אתם מדויקים יותר משעון שוויצרי ומצחיקים יותר ממנו. ⏱️',
  'הגשתם הכל! מישהו פה ראוי לבונוס — וזה כולכם. (התקציב פחות מסכים, אבל הלב כן.) 💸',
  'כל האילוצים בפנים! הצוות הזה רץ חלק יותר משידור חי בלי תקלות. 📺',
  'כולם הגישו! אתם לא צוות, אתם מכונה משומנת — ומצחיקה במיוחד. 🤖',
  'מלא 100%! הגשתם מהר יותר ממה שלוקח להגיד "סושיאל כאן חדשות". 🚀',
  'כל הכבוד צוות! הגשתם הכל בלי שהייתי צריך לרדוף אחרי אף אחד. שיא חדש! 🏆',
  'כולם הגישו אילוצים — הצוות הזה אמין יותר מהתחזית של מזג האוויר. ☀️',
  'בום! כולם בפנים. אתם הוכחה חיה שאפשר גם לעמוד בדדליין וגם לחייך. 😎',
  'הגשה מלאה! הצוות הזה כל כך מתואם שאפשר לנגן עליו סימפוניה. 🎻',
  'כולם הגישו! אם הייתה מדליה על אחריות, הייתם לוקחים זהב, כסף וארד. 🥇',
  'מאה אחוז הגשה! אתם פשוט אלופים — וגם נחמדים, וזה הצירוף הכי נדיר. 💪',
];

/** Pick a funny team compliment from a seed (random per occurrence). */
export function pickTeamCompliment(seed) {
  const s = String(seed ?? Math.random());
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TEAM_COMPLIMENTS[h % TEAM_COMPLIMENTS.length];
}
