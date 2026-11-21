/**
 * Folds text for search so the common ways of typing a name all match: Arabic letter variants
 * (the forms of alef, taa marbuta and yaa, hamza seats), diacritics and tatweel, the Persian and
 * Urdu letter forms some keyboards send, Arabic-Indic digits, Latin accents and case.
 * "الساحل", "الساحل الشمالى" and "ساحل" all find the North Coast; "القاهره" finds Cairo.
 * Only for matching: what people type is never stored folded.
 */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD') // also splits hamza and madda forms (U+0622-0626) into a bare letter plus a mark, removed below
    .replace(/[\u200c\u200d\u200e\u200f\u061c\u2066-\u2069]/g, '') // joiners and direction marks pasted text can carry
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits → 0-9
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Persian digits → 0-9
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '') // Arabic diacritics, hamza and madda marks (never the digits at U+0660)
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // alef with madda, hamza above, hamza below, wasla → bare alef
    .replace(/\u0629/g, '\u0647') // taa marbuta → haa
    .replace(/[\u0649\u06cc]/g, '\u064a') // alef maqsura and the Persian yeh → yaa
    .replace(/[\u06a9\u06af]/g, '\u0643') // Persian kaf and gaf → kaf
    .replace(/[\u06c1\u06d5\u06be]/g, '\u0647') // Urdu and Kurdish heh forms → haa
    .replace(/\u06a4/g, '\u0641') // veh (as in a "villa" spelled with it) → faa
    .replace(/\u067e/g, '\u0628') // peh → baa
    .replace(/\u0686/g, '\u062c') // tcheh → jeem
    .replace(/[\u0300-\u036f]/g, '') // Latin accents
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** True when every word of the query appears in the haystack (both already normalized). */
export function matchesAll(haystack: string, query: string) {
  if (!query) return true;
  return query.split(' ').every((word) => haystack.includes(word));
}
