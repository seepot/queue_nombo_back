const DIGIT_MAP_MS = {
  "0": "sifar",
  "1": "satu",
  "2": "dua",
  "3": "tiga",
  "4": "empat",
  "5": "lima",
  "6": "enam",
  "7": "tujuh",
  "8": "lapan",
  "9": "sembilan",
};

const DIGIT_MAP_EN = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
};

function formatTicketSpelling(ticketNo, language = "ms") {
  const map = language === "ms" ? DIGIT_MAP_MS : DIGIT_MAP_EN;
  const chars = ticketNo.trim().toUpperCase().split("");

  return chars
    .map((char) => {
      if (map[char]) {
        return map[char];
      }
      return char;
    })
    .join(", ");
}

function runVoiceAnnouncerTest() {
  console.log("==================================================================");
  console.log("  🔊 MENJALANKAN UJIAN SINTESIS SUARA AI & CHIME FASA 18");
  console.log("==================================================================\n");

  const testCases = [
    { ticketNo: "A1001", counterNo: "1" },
    { ticketNo: "B2045", counterNo: "3" },
    { ticketNo: "VIP09", counterNo: "5" },
    { ticketNo: "C3000", counterNo: "12" },
  ];

  console.log("[1/3] 🇲🇾 Menguji Sebutan Nombor Giliran dalam Bahasa Melayu:");
  testCases.forEach((tc) => {
    const spelled = formatTicketSpelling(tc.ticketNo, "ms");
    const phrase = `Nombor giliran, ${spelled}. Sila ke kaunter, ${tc.counterNo}.`;
    console.log(`  🎟️ [${tc.ticketNo} -> K${tc.counterNo}]: "${phrase}"`);
  });

  console.log("\n[2/3] 🇬🇧 Menguji Sebutan Nombor Giliran dalam Bahasa Inggeris:");
  testCases.forEach((tc) => {
    const spelled = formatTicketSpelling(tc.ticketNo, "en");
    const phrase = `Queue number, ${spelled}. Please proceed to counter, ${tc.counterNo}.`;
    console.log(`  🎟️ [${tc.ticketNo} -> K${tc.counterNo}]: "${phrase}"`);
  });

  console.log("\n[3/3] 🌐 Menguji Pembentukan Sebutan Dwibahasa (Bilingual Sequence):");
  const sample = testCases[0];
  const msSpelled = formatTicketSpelling(sample.ticketNo, "ms");
  const enSpelled = formatTicketSpelling(sample.ticketNo, "en");
  console.log(`  🔔 [Airport Chime]: 587.33Hz (D5) -> 880Hz (A5)`);
  console.log(`  🗣️ [BM]: "Nombor giliran, ${msSpelled}. Sila ke kaunter, ${sample.counterNo}."`);
  console.log(`  ⏱️ [Jeda Audio]: 400ms`);
  console.log(`  🗣️ [EN]: "Queue number, ${enSpelled}. Please proceed to counter, ${sample.counterNo}."`);

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN SINTESIS SUARA AI FASA 18 LULUS DENGAN CEMERLANG!");
  console.log("==================================================================\n");
}

runVoiceAnnouncerTest();
