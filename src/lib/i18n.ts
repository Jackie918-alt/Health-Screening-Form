/**
 * Bilingual plumbing for the agent survey.
 *
 * Every piece of author-supplied copy in this app is a `Localized` pair, so a
 * missing translation is a type error rather than a silent English fallback.
 */

export const LANGS = ["en", "ms"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

export type Localized = { en: string; ms: string };

export const LANG_META: Record<Lang, { label: string; short: string; htmlLang: string }> = {
  en: { label: "English", short: "EN", htmlLang: "en-MY" },
  ms: { label: "Bahasa Melayu", short: "BM", htmlLang: "ms-MY" },
};

export function t(text: Localized, lang: Lang): string {
  return text[lang];
}

/** Terse helper so the survey schema stays readable: `L("Full name", "Nama penuh")`. */
export function L(en: string, ms: string): Localized {
  return { en, ms };
}

/** UI chrome — everything that is not a question. */
export const UI = {
  brandTagline: L(
    "Agent Voice Survey 2026",
    "Kaji Selidik Suara Ejen 2026",
  ),
  formTitle: L(
    "What's helping you — and what's holding you back",
    "Apa yang membantu anda — dan apa yang menghalang anda",
  ),
  formIntro: L(
    "Your day-to-day experience is the clearest picture we have of how We Kongsi is really running. Answer honestly — your feedback helps us prioritise what to fix first.",
    "Pengalaman harian anda ialah gambaran paling jelas tentang keadaan sebenar We Kongsi. Jawab dengan jujur — maklum balas anda membantu kami menentukan keutamaan perkara yang perlu diperbaiki dahulu.",
  ),
  confidentialityNote: L(
    "Individual answers are kept confidential and strictly for internal use only.",
    "Jawapan individu dirahsiakan dan untuk kegunaan dalaman sahaja.",
  ),
  minutes: L("About 10 minutes", "Kira-kira 10 minit"),
  sections: L("sections", "bahagian"),
  languageLabel: L("Language", "Bahasa"),
  switchLanguage: L("Switch language", "Tukar bahasa"),

  // Navigation
  start: L("Start", "Mula"),
  next: L("Next", "Seterusnya"),
  back: L("Back", "Kembali"),
  submit: L("Submit", "Hantar"),
  submitting: L("Submitting…", "Menghantar…"),
  stepOf: L("Section {current} of {total}", "Bahagian {current} daripada {total}"),
  percentComplete: L("{percent}% complete", "{percent}% selesai"),

  // Field chrome
  required: L("Required", "Wajib"),
  optional: L("Optional", "Pilihan"),
  selectPlaceholder: L("Please select…", "Sila pilih…"),
  otherPlaceholder: L("Please specify…", "Sila nyatakan…"),
  chooseUpTo: L("Choose up to {max}", "Pilih sehingga {max}"),
  selectedCount: L("{count} selected", "{count} dipilih"),
  charactersLeft: L("{count} characters left", "{count} aksara lagi"),

  // Scale anchors
  scaleLow: L("Very dissatisfied", "Sangat tidak berpuas hati"),
  scaleHigh: L("Very satisfied", "Sangat berpuas hati"),
  npsLow: L("Not at all likely", "Sangat tidak mungkin"),
  npsHigh: L("Extremely likely", "Sangat mungkin"),
  ratingLow: L("Poor", "Lemah"),
  ratingHigh: L("Excellent", "Cemerlang"),
  notApplicable: L("N/A", "Tidak berkenaan"),

  // Validation
  errorRequired: L("This question needs an answer.", "Soalan ini perlu dijawab."),
  errorSelectOne: L("Please choose at least one option.", "Sila pilih sekurang-kurangnya satu pilihan."),
  errorMaxSelect: L("Please choose no more than {max}.", "Sila pilih tidak lebih daripada {max}."),
  errorEmail: L("Please enter a valid email address.", "Sila masukkan alamat e-mel yang sah."),
  errorPhone: L("Please enter a valid Malaysian phone number.", "Sila masukkan nombor telefon Malaysia yang sah."),
  errorNric: L(
    "Please enter a valid 12-digit NRIC number.",
    "Sila masukkan nombor NRIC 12 digit yang sah.",
  ),
  errorSpecify: L("Please specify your answer.", "Sila nyatakan jawapan anda."),
  errorStaleOption: L(
    "Your earlier answer changed — please choose again.",
    "Jawapan anda sebelum ini telah berubah — sila pilih semula.",
  ),
  errorSummary: L(
    "{count} question(s) on this section still need your attention.",
    "{count} soalan dalam bahagian ini masih memerlukan perhatian anda.",
  ),

  // Draft
  draftSaved: L("Draft saved on this device", "Draf disimpan pada peranti ini"),
  draftRestored: L("We restored your saved answers.", "Kami memulihkan jawapan yang anda simpan."),
  clearDraft: L("Clear and start over", "Kosongkan dan mula semula"),
  clearDraftConfirm: L(
    "Clear all answers and start over?",
    "Kosongkan semua jawapan dan mula semula?",
  ),

  // Submit states
  thanksTitle: L("Terima kasih!", "Terima kasih!"),
  thanksBody: L(
    "Your responses have been recorded. The People & Agency Development team reviews every submission, and we will share what we heard — and what we are changing — at the next agency townhall.",
    "Jawapan anda telah direkodkan. Pasukan People & Agency Development menyemak setiap penghantaran, dan kami akan berkongsi apa yang kami dengar — serta apa yang akan kami ubah — pada townhall agensi yang seterusnya.",
  ),
  thanksAnother: L("Submit another response", "Hantar jawapan lain"),
  submitError: L(
    "We could not submit your responses. Please check your connection and try again.",
    "Kami tidak dapat menghantar jawapan anda. Sila semak sambungan anda dan cuba lagi.",
  ),
  retry: L("Try again", "Cuba lagi"),

  // Response window
  notOpenTitle: L("This survey opens soon", "Kaji selidik ini dibuka tidak lama lagi"),
  notOpenBody: L(
    "The response period runs from {period}. Please come back on the opening date — your answers will not be recorded before then.",
    "Tempoh maklum balas ialah {period}. Sila kembali pada tarikh pembukaan — jawapan anda tidak akan direkodkan sebelum itu.",
  ),
  closedTitle: L("This survey has closed", "Kaji selidik ini telah ditutup"),
  closedBody: L(
    "The response period ran from {period} and is now over. Thank you to everyone who took part — the People & Agency Development team is going through what you told us.",
    "Tempoh maklum balas ialah {period} dan kini telah berakhir. Terima kasih kepada semua yang mengambil bahagian — pasukan People & Agency Development sedang meneliti maklum balas anda.",
  ),
  submitDuplicate: L(
    "A response has already been recorded for this NRIC. Each agent may answer once. If you think this is a mistake, please contact the People & Agency Development team.",
    "Satu jawapan telah pun direkodkan untuk NRIC ini. Setiap ejen hanya boleh menjawab sekali. Jika anda rasa ini satu kesilapan, sila hubungi pasukan People & Agency Development.",
  ),
  submitClosed: L(
    "The survey closed before this could be submitted, so your answers were not recorded.",
    "Kaji selidik telah ditutup sebelum ini dapat dihantar, jadi jawapan anda tidak direkodkan.",
  ),

  footerRights: L("We Kongsi. All rights reserved.", "We Kongsi. Hak cipta terpelihara."),
} as const;

/** Fills `{token}` placeholders: `interpolate(UI.stepOf, lang, { current: 2, total: 6 })`. */
export function interpolate(
  text: Localized,
  lang: Lang,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce<string>(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    text[lang],
  );
}
