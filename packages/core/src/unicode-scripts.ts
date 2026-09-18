/** Unicode 17.0 Script aliases from the fixed UCD PropertyValueAliases.txt.
 * https://www.unicode.org/Public/17.0.0/ucd/PropertyValueAliases.txt
 * SHA-256: 64e9a5f76f7a1e8b5a47d6a1f9a26522a251208f5276bdfa1559dac7cf2e827a
 * Unicode License V3: see NOTICE.md. Common/Inherited are neutral, not scripts
 * contributing to a mixed-script warning. Runtime regexes classify code points;
 * this list includes every UCD script, not just scripts using Latin neighbours. */
const aliases =
  "Adlm Aghb Ahom Arab Armi Armn Avst Bali Bamu Bass Batk Beng Berf Bhks Bopo Brah Brai Bugi Buhd Cakm Cans Cari Cham Cher Chrs Copt Cpmn Cprt Cyrl Deva Diak Dogr Dsrt Dupl Egyp Elba Elym Ethi Gara Geor Glag Gong Gonm Goth Gran Grek Gujr Gukh Guru Hang Hani Hano Hatr Hebr Hira Hluw Hmng Hmnp Hrkt Hung Ital Java Kali Kana Kawi Khar Khmr Khoj Kits Knda Krai Kthi Lana Laoo Latn Lepc Limb Lina Linb Lisu Lyci Lydi Mahj Maka Mand Mani Marc Medf Mend Merc Mero Mlym Modi Mong Mroo Mtei Mult Mymr Nagm Nand Narb Nbat Newa Nkoo Nshu Ogam Olck Onao Orkh Orya Osge Osma Ougr Palm Pauc Perm Phag Phli Phlp Phnx Plrd Prti Rjng Rohg Runr Samr Sarb Saur Sgnw Shaw Shrd Sidd Sidt Sind Sinh Sogd Sogo Sora Soyo Sund Sunu Sylo Syrc Tagb Takr Tale Talu Taml Tang Tavt Tayo Telu Tfng Tglg Thaa Thai Tibt Tirh Tnsa Todr Tols Toto Tutg Ugar Vaii Vith Wara Wcho Xpeo Xsux Yezi Yiii Zanb";
const scripts = aliases.split(" ").flatMap((alias) => {
  try {
    return [new RegExp(`\\p{Script=${alias}}`, "u")];
  } catch {
    // Older supported browser Unicode tables may not know a newly assigned
    // script. Do not make importing the locale fail for unrelated ASCII text.
    return [];
  }
});

export function hasMixedScripts(word: string): boolean {
  let first: RegExp | undefined;
  for (const letter of word) {
    if (!/\p{L}/u.test(letter)) continue;
    const script = scripts.find((candidate) => candidate.test(letter));
    if (!script) continue;
    if (first && first !== script) return true;
    first = script;
  }
  return false;
}
