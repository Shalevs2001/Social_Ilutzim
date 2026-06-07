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
