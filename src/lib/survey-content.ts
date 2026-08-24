import { L } from "./i18n";
import type { Option, Survey } from "./survey-types";

/** Malaysian states and federal territories — same order in both languages. */
/** A grid score at or below this counts as an area needing improvement. */
const LOW_SCORE = 3;

const STATES: Option[] = [
  ["johor", "Johor"],
  ["kedah", "Kedah"],
  ["kelantan", "Kelantan"],
  ["melaka", "Melaka"],
  ["negeri-sembilan", "Negeri Sembilan"],
  ["pahang", "Pahang"],
  ["perak", "Perak"],
  ["perlis", "Perlis"],
  ["pulau-pinang", "Pulau Pinang"],
  ["sabah", "Sabah"],
  ["sarawak", "Sarawak"],
  ["selangor", "Selangor"],
  ["terengganu", "Terengganu"],
  ["kuala-lumpur", "W.P. Kuala Lumpur"],
  ["labuan", "W.P. Labuan"],
  ["putrajaya", "W.P. Putrajaya"],
].map(([value, name]) => ({ value, label: L(name, name) }));

/**
 * Shared between "which challenges have you faced" and "which is the biggest".
 * Keeping one list means the follow-up dropdown can later be narrowed to only
 * the options the agent actually ticked.
 */
const CHALLENGES: Option[] = [
  {
    value: "prospecting",
    label: L("Finding new prospects and leads", "Mencari prospek dan pelanggan berpotensi baharu"),
  },
  {
    value: "closing",
    label: L("Closing sales / converting prospects", "Menutup jualan / menukar prospek kepada pelanggan"),
  },
  {
    value: "product-knowledge",
    label: L("Product knowledge, training or coaching", "Pengetahuan produk, latihan atau bimbingan"),
  },
  {
    value: "pricing",
    label: L("Competitor pricing and market competition", "Harga pesaing dan persaingan pasaran"),
  },
  {
    value: "commission",
    label: L("Commission structure or payout timing", "Struktur komisen atau masa pembayaran"),
  },
  {
    value: "marketing",
    label: L("Marketing materials and content support", "Bahan pemasaran dan sokongan kandungan"),
  },
  {
    value: "operations",
    label: L(
      "System, admin or approval turnaround",
      "Sistem, pentadbiran atau proses kelulusan yang lambat",
    ),
  },
  {
    value: "after-sales",
    label: L(
      "After-sales, claims or customer service",
      "Selepas jualan, tuntutan atau khidmat pelanggan",
    ),
  },
  {
    value: "other",
    label: L("Something else", "Lain-lain"),
    allowsText: true,
  },
];


export const SURVEY: Survey = {
  id: "wekongsi-agent-voice",
  version: "draft-1",
  sections: [
    // ─────────────────────────────────────────────────────────── 1. Profile ──
    {
      id: "profile",
      title: L("Little About You", "Sedikit Tentang Anda"),
      description: L(
        "Help us to compare feedback across regions and experience levels.",
        "Bantu kami membandingkan maklum balas mengikut wilayah dan tahap pengalaman.",
      ),
      questions: [
        {
          id: "agent_name",
          type: "short-text",
          label: L("Full name (as per NRIC)", "Nama penuh (seperti dalam NRIC)"),
          placeholder: L("e.g. Nurul Aisyah binti Rahman", "cth. Nurul Aisyah binti Rahman"),
          required: true,
          maxLength: 80,
          width: "half",
        },
        {
          id: "nric",
          type: "nric",
          label: L("NRIC No.", "No. NRIC"),
          placeholder: L("e.g. 030405-10-1234", "cth. 030405-10-1234"),
          required: true,
          maxLength: 14,
          width: "half",
        },
        {
          id: "phone",
          type: "phone",
          label: L("Phone No.", "No. Telefon"),
          placeholder: L("e.g. 012-345 6789", "cth. 012-345 6789"),
          required: true,
          maxLength: 20,
          width: "half",
        },
        {
          id: "region",
          type: "dropdown",
          label: L("State you operate in", "Negeri tempat anda beroperasi"),
          options: STATES,
          required: true,
          width: "half",
        },
        {
          id: "tenure",
          type: "radio",
          label: L("How long have you been with We Kongsi?", "Berapa lamakah anda bersama We Kongsi?"),
          required: true,
          options: [
            { value: "lt-6m", label: L("Less than 6 months", "Kurang daripada 6 bulan") },
            { value: "6-12m", label: L("6 to 12 months", "6 hingga 12 bulan") },
            { value: "1-2y", label: L("1 to 2 years", "1 hingga 2 tahun") },
            { value: "gt-2y", label: L("More than 2 years", "Lebih daripada 2 tahun") },
          ],
        },
        {
          id: "commitment",
          type: "radio",
          label: L("Is this your full-time work?", "Adakah ini kerja sepenuh masa anda?"),
          required: true,
          options: [
            {
              value: "full-time",
              label: L("Yes, I'm a full-time agent.", "Ya, saya ejen sepenuh masa."),
            },
            {
              value: "part-time",
              label: L("No, I'm a part-timer.", "Tidak, saya ejen sambilan."),
            },
          ],
        },
        {
          id: "referrals_3m",
          type: "dropdown",
          label: L(
            "How many members have you successfully referred within the past 3 months?",
            "Berapa ramai ahli yang berjaya anda rujuk dalam tempoh 3 bulan lepas?",
          ),
          options: [
            { value: "0", label: L("0", "0") },
            { value: "1-3", label: L("1 - 3", "1 - 3") },
            { value: "4-6", label: L("4 - 6", "4 - 6") },
            // 7, not 6 — your draft had 4-6 and 6-9 overlapping on 6.
            { value: "7-9", label: L("7 - 9", "7 - 9") },
            { value: "10-plus", label: L("10 and above", "10 dan ke atas") },
          ],
          required: true,
        },
      ],
    },

    // ────────────────────────────────────────────────── 2. Overall experience ──
    {
      id: "experience",
      title: L("Your experience so far", "Pengalaman anda setakat ini"),
      description: L(
        "Answer shall be based on the past 6 months.",
        "Jawapan hendaklah berdasarkan 6 bulan yang lalu.",
      ),
      questions: [
        {
          id: "overall_satisfaction",
          type: "scale",
          label: L(
            "How satisfied are you working as a We Kongsi agent?",
            "Sejauh manakah anda berpuas hati bekerja sebagai ejen We Kongsi?",
          ),
          scale: {
            min: 1,
            max: 5,
            minLabel: L("Very dissatisfied", "Sangat tidak berpuas hati"),
            maxLabel: L("Very satisfied", "Sangat berpuas hati"),
          },
          required: true,
        },
        {
          id: "recommend_likelihood",
          type: "scale",
          label: L(
            "How likely are you to recommend We Kongsi to a friend who is looking for a job?",
            "Sejauh manakah kemungkinan anda mengesyorkan We Kongsi kepada rakan yang sedang mencari pekerjaan?",
          ),
          scale: {
            min: 1,
            max: 5,
            minLabel: L("Not at all", "Tidak sama sekali"),
            maxLabel: L("Extremely likely", "Sangat mungkin"),
          },
          required: true,
        },
        {
          id: "dissatisfaction_reason",
          type: "long-text",
          label: L(
            "You rated your satisfaction on the lower end — what is driving that?",
            "Anda memberikan penilaian kepuasan yang rendah — apakah puncanya?",
          ),
          help: L(
            "Be specific. This is the answer we act on fastest.",
            "Nyatakan dengan jelas. Inilah jawapan yang paling cepat kami ambil tindakan.",
          ),
          placeholder: L("Tell us what happened…", "Ceritakan apa yang berlaku…"),
          required: true,
          maxLength: 600,
          // Demonstrates the conditional engine; real branching rules come next round.
          showIf: { field: "overall_satisfaction", op: "lte", value: 2 },
        },
        {
          id: "best_thing",
          type: "short-text",
          label: L(
            "What do you value most about being with We Kongsi?",
            "Apakah perkara yang paling anda hargai tentang berada bersama We Kongsi?",
          ),
          placeholder: L("The one thing you would not want us to change…", "Satu perkara yang anda tidak mahu kami ubah…"),
          maxLength: 120,
        },
      ],
    },

    // ─────────────────────────────────────────────────────────── 3. Challenges ──
    {
      id: "challenges",
      title: L("What is getting in your way?", "Apakah yang menghalang anda?"),
      description: L(
        "Think about what slows you down in a normal working week.",
        "Fikirkan apa yang melambatkan anda dalam minggu bekerja biasa.",
      ),
      questions: [
        {
          id: "challenges_faced",
          type: "checkbox",
          label: L(
            "Which of these have been a challenge for you in the last 6 months?",
            "Antara berikut, yang manakah menjadi cabaran kepada anda dalam 6 bulan lalu?",
          ),
          help: L("Choose all that apply.", "Pilih semua yang berkenaan."),
          options: CHALLENGES,
          required: true,
        },
        {
          id: "biggest_challenge",
          type: "dropdown",
          label: L(
            "Out of those, which one hurts you the most?",
            "Antara semua itu, yang manakah paling menjejaskan anda?",
          ),
          // Offers back only what the agent ticked above.
          // Hidden automatically unless at least two challenges were ticked.
          optionsFrom: "challenges_faced",
          required: true,
        },
        {
          id: "challenge_detail",
          type: "long-text",
          label: L(
            "Describe that challenge in your own words.",
            "Terangkan cabaran tersebut dalam perkataan anda sendiri.",
          ),
          help: L(
            "A real example helps more than a general comment.",
            "Contoh sebenar lebih membantu berbanding komen umum.",
          ),
          placeholder: L(
            "e.g. Last month a client walked away because…",
            "cth. Bulan lepas seorang pelanggan menarik diri kerana…",
          ),
          required: true,
          maxLength: 800,
          showIf: { field: "challenges_faced", op: "answered" },
        },
        {
          id: "help_channel",
          type: "radio",
          label: L(
            "When you run into a problem, who do you usually turn to first?",
            "Apabila anda menghadapi masalah, kepada siapa anda biasanya merujuk terlebih dahulu?",
          ),
          required: true,
          options: [
            { value: "team", label: L("My upline or another agent", "Upline atau ejen lain") },
            {
              value: "whatsapp",
              label: L("Referrer's WhatsApp community", "Komuniti WhatsApp perujuk"),
            },
            {
              value: "hq",
              label: L("Headquarters support team", "Pasukan sokongan ibu pejabat"),
            },
            { value: "self", label: L("Work it out myself", "Selesaikan sendiri") },
            {
              value: "no-one",
              label: L(
                "No one — I'm not sure who to ask",
                "Tiada sesiapa — saya tidak pasti hendak bertanya kepada siapa",
              ),
            },
            { value: "other", label: L("Someone else", "Orang lain"), allowsText: true },
          ],
        },
      ],
    },

    // ────────────────────────────────────────────────── 4. Support and tools ──
    {
      id: "support",
      title: L("How good is the company support?", "Seberapa baik sokongan syarikat?"),
      description: L(
        "Low scores tell us where to focus first.",
        "Skor rendah menunjukkan kepada kami apa yang perlu diutamakan.",
      ),
      questions: [
        {
          id: "support_ratings",
          type: "rating-grid",
          label: L("Rate each area below", "Nilaikan setiap bidang di bawah"),
          required: true,
          scale: {
            min: 1,
            max: 5,
            minLabel: L("Poor", "Lemah"),
            maxLabel: L("Excellent", "Cemerlang"),
          },
          rows: [
            {
              id: "training",
              label: L(
                "Product knowledge, training and coaching",
                "Pengetahuan produk, latihan dan bimbingan",
              ),
            },
            {
              id: "marketing",
              label: L("Marketing materials and content", "Bahan pemasaran dan kandungan"),
            },
            { id: "leads", label: L("Lead generation support", "Sokongan penjanaan prospek") },
            {
              id: "operations",
              label: L(
                "Systems, admin and approval turnaround",
                "Sistem, pentadbiran dan proses kelulusan",
              ),
            },
            { id: "leadership", label: L("Leadership communication", "Komunikasi kepimpinan") },
            { id: "recognition", label: L("Recognition and incentives", "Pengiktirafan dan insentif") },
          ],
        },
        {
          id: "improvement_area",
          type: "dropdown",
          label: L(
            "Which of these needs the most improvement?",
            "Antara ini, yang manakah paling memerlukan penambahbaikan?",
          ),
          // Only the areas tied at the agent's lowest score, and only when that
          // score is weak. A single clear worst area needs no question.
          optionsFrom: "support_ratings",
          optionsFromMaxScore: LOW_SCORE,
          required: true,
        },
        {
          id: "tools_missing",
          type: "radio",
          label: L(
            "Is there a tool, template or piece of information you wish to have?",
            "Adakah terdapat alat, templat atau maklumat yang anda ingin miliki?",
          ),
          options: [
            { value: "yes", label: L("Yes", "Ya") },
            { value: "no", label: L("No", "Tidak") },
          ],
        },
        {
          id: "tools_missing_detail",
          type: "short-text",
          label: L("Please specify", "Sila nyatakan"),
          placeholder: L(
            "e.g. A one-page comparison sheet I can send on WhatsApp…",
            "cth. Helaian perbandingan satu muka surat untuk dihantar melalui WhatsApp…",
          ),
          required: true,
          maxLength: 150,
          showIf: { field: "tools_missing", op: "equals", value: "yes" },
        },
      ],
    },

    // ─────────────────────────────────────────────────────── 5. Improvements ──
    {
      id: "improvements",
      title: L("Training and development", "Latihan dan pembangunan"),
      description: L(
        "Tell us what would actually help you sell more.",
        "Beritahu kami apa yang benar-benar membantu anda menjual lebih banyak.",
      ),
      questions: [
        {
          id: "training_topics",
          type: "checkbox",
          label: L(
            "Which training would actually help you sell more?",
            "Latihan manakah yang benar-benar membantu anda menjual lebih banyak?",
          ),
          help: L("Choose all that apply.", "Pilih semua yang berkenaan."),
          options: [
            { value: "prospecting", label: L("Prospecting and lead generation", "Mencari dan menjana prospek") },
            { value: "closing", label: L("Closing techniques and objection handling", "Teknik menutup jualan dan mengendalikan bantahan") },
            { value: "product", label: L("Deeper product knowledge", "Pengetahuan produk yang lebih mendalam") },
            { value: "digital", label: L("Social media and digital marketing", "Media sosial dan pemasaran digital") },
            { value: "compliance", label: L("Compliance and documentation", "Pematuhan dan dokumentasi") },
            { value: "leadership", label: L("Team building and leadership", "Membina pasukan dan kepimpinan") },
            { value: "finance", label: L("Managing your own income and taxes", "Menguruskan pendapatan dan cukai sendiri") },
            { value: "other", label: L("Something else", "Lain-lain"), allowsText: true },
          ],
        },
        {
          id: "training_format",
          type: "radio",
          label: L("How do you prefer to learn?", "Bagaimanakah anda lebih suka belajar?"),
          required: true,
          options: [
            { value: "physical", label: L("In person at a branch or event", "Bersemuka di cawangan atau acara") },
            { value: "online-live", label: L("Live online session", "Sesi dalam talian secara langsung") },
            { value: "self-paced", label: L("Short videos I can watch anytime", "Video pendek yang boleh ditonton bila-bila masa") },
            { value: "one-to-one", label: L("One-to-one coaching with my leader", "Bimbingan satu dengan satu bersama ketua saya") },
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────── 6. Closing ──
    {
      id: "closing",
      title: L("Almost done", "Hampir selesai"),
      description: L(
        "One question before you go.",
        "Satu soalan sebelum anda pergi.",
      ),
      questions: [
        {
          id: "followup_ok",
          type: "radio",
          label: L(
            "May we contact you to discuss your feedback, if required?",
            "Bolehkah kami menghubungi anda untuk membincangkan maklum balas anda, jika perlu?",
          ),
          required: true,
          options: [
            { value: "yes", label: L("Yes, I'm happy to talk", "Ya, saya sudi berbincang") },
            { value: "no", label: L("No, thank you", "Tidak, terima kasih") },
          ],
        },
        {
          id: "consent",
          type: "consent",
          label: L(
            "Consent to process your responses",
            "Persetujuan untuk memproses jawapan anda",
          ),
          required: true,
          options: [
            {
              value: "agreed",
              label: L(
                "I agree that We Kongsi may store and analyse my responses to improve agent support, in line with the Personal Data Protection Act 2010 (PDPA).",
                "Saya bersetuju bahawa We Kongsi boleh menyimpan dan menganalisis jawapan saya untuk menambah baik sokongan ejen, selaras dengan Akta Perlindungan Data Peribadi 2010 (PDPA).",
              ),
            },
          ],
        },
      ],
    },
  ],
};
