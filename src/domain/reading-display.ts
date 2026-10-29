// Kana words already give their reading; add ruby only to text containing kanji.
export const hasKanji = (text: string) => /[\u3400-\u9fff々]/u.test(text);
