import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import MembershipApplication from '../src/models/MembershipApplication.js';

// Official Kerala 14 Districts
const OFFICIAL_DISTRICTS = [
  { en: 'Kasaragod', ml: 'കാസർഗോഡ്' },
  { en: 'Kannur', ml: 'കണ്ണൂർ' },
  { en: 'Wayanad', ml: 'വയനാട്' },
  { en: 'Kozhikode', ml: 'കോഴിക്കോട്' },
  { en: 'Malappuram', ml: 'മലപ്പുറം' },
  { en: 'Palakkad', ml: 'പാലക്കാട്' },
  { en: 'Thrissur', ml: 'തൃശ്ശൂർ' },
  { en: 'Ernakulam', ml: 'എറണാകുളം' },
  { en: 'Idukki', ml: 'ഇടുക്കി' },
  { en: 'Kottayam', ml: 'കോട്ടയം' },
  { en: 'Alappuzha', ml: 'ആലപ്പുഴ' },
  { en: 'Pathanamthitta', ml: 'പത്തനംതിട്ട' },
  { en: 'Kollam', ml: 'കൊല്ലം' },
  { en: 'Thiruvananthapuram', ml: 'തിരുവനന്തപുരം' },
];

// Official Kerala 77 Taluks
const OFFICIAL_TALUKS = [
  // Kasaragod
  { en: 'Kasaragod', ml: 'കാസർഗോഡ്', district: 'Kasaragod' },
  { en: 'Hosdurg', ml: 'ഹോസ്ദുർഗ്', district: 'Kasaragod' },
  { en: 'Manjeshwaram', ml: 'മഞ്ചേശ്വരം', aliases: ['Manjeshwar'], district: 'Kasaragod' },
  { en: 'Vellarikundu', ml: 'വെള്ളരിക്കുണ്ട്', district: 'Kasaragod' },

  // Kannur
  { en: 'Kannur', ml: 'കണ്ണൂർ', district: 'Kannur' },
  { en: 'Thalassery', ml: 'തലശ്ശേരി', aliases: ['Tellicherry', 'Thalasseri'], district: 'Kannur' },
  { en: 'Taliparamba', ml: 'തളിപ്പറമ്പ്', aliases: ['Thaliparamba'], district: 'Kannur' },
  { en: 'Iritty', ml: 'ഇരിട്ടി', district: 'Kannur' },
  { en: 'Payyanur', ml: 'പയ്യന്നൂർ', district: 'Kannur' },

  // Wayanad
  { en: 'Mananthavady', ml: 'മാനന്തവാടി', aliases: ['Mananthavadi'], district: 'Wayanad' },
  { en: 'Sultan Bathery', ml: 'സുൽത്താൻ ബത്തേരി', aliases: ['Sulthan Bathery', 'Sultanbathery'], district: 'Wayanad' },
  { en: 'Vythiri', ml: 'വൈത്തിരി', aliases: ['Vaithiri'], district: 'Wayanad' },

  // Kozhikode
  { en: 'Kozhikode', ml: 'കോഴിക്കോട്', aliases: ['Calicut'], district: 'Kozhikode' },
  { en: 'Koyilandy', ml: 'കൊയിലാണ്ടി', aliases: ['Quilandy', 'Koyilandi'], district: 'Kozhikode' },
  { en: 'Vatakara', ml: 'വടകര', aliases: ['Vadakara', 'Badagara'], district: 'Kozhikode' },
  { en: 'Thamarassery', ml: 'താമരശ്ശേരി', aliases: ['Thamarasseri'], district: 'Kozhikode' },

  // Malappuram
  { en: 'Ernad', ml: 'ഏറനാട്', aliases: ['Eranad', 'Manjeri'], district: 'Malappuram' },
  { en: 'Tirur', ml: 'തിരൂർ', district: 'Malappuram' },
  { en: 'Tirurangadi', ml: 'തിരൂരങ്ങാടി', aliases: ['Thirurangadi'], district: 'Malappuram' },
  { en: 'Ponnani', ml: 'പൊന്നാനി', aliases: ['Ponnanni'], district: 'Malappuram' },
  { en: 'Perinthalmanna', ml: 'പെരിന്തൽമണ്ണ', aliases: ['Perinthalamanna'], district: 'Malappuram' },
  { en: 'Nilambur', ml: 'നിലമ്പൂർ', district: 'Malappuram' },
  { en: 'Kondotty', ml: 'കൊണ്ടോട്ടി', aliases: ['Kondotti'], district: 'Malappuram' },

  // Palakkad
  { en: 'Palakkad', ml: 'പാലക്കാട്', aliases: ['Palghat'], district: 'Palakkad' },
  { en: 'Alathur', ml: 'ആലത്തൂർ', district: 'Palakkad' },
  { en: 'Chittur', ml: 'ചിറ്റൂർ', aliases: ['Chittoor'], district: 'Palakkad' },
  { en: 'Ottappalam', ml: 'ഒറ്റപ്പാലം', aliases: ['Ottapalam'], district: 'Palakkad' },
  { en: 'Mannarkkad', ml: 'മണ്ണാർക്കാട്', aliases: ['Mannarkad'], district: 'Palakkad' },
  { en: 'Pattambi', ml: 'പട്ടാമ്പി', district: 'Palakkad' },
  { en: 'Attappady', ml: 'അട്ടപ്പാടി', aliases: ['Attapadi'], district: 'Palakkad' },

  // Thrissur
  { en: 'Thrissur', ml: 'തൃശ്ശൂർ', aliases: ['Trichur'], district: 'Thrissur' },
  { en: 'Chavakkad', ml: 'ചാവക്കാട്', aliases: ['Chowghat'], district: 'Thrissur' },
  { en: 'Kodungallur', ml: 'കൊടുങ്ങല്ലൂർ', aliases: ['Cranganore'], district: 'Thrissur' },
  { en: 'Mukundapuram', ml: 'മുകുന്ദപുരം', aliases: ['Irinjalakuda'], district: 'Thrissur' },
  { en: 'Chalakudy', ml: 'ചാലക്കുടി', aliases: ['Chalakudi'], district: 'Thrissur' },
  { en: 'Thalapilly', ml: 'തലപ്പിള്ളി', aliases: ['Thalappilly', 'Wadakkanchery'], district: 'Thrissur' },
  { en: 'Kunnamkulam', ml: 'കുന്നംകുളം', district: 'Thrissur' },

  // Ernakulam
  { en: 'Aluva', ml: 'ആലുവ', aliases: ['Alwaye'], district: 'Ernakulam' },
  { en: 'Kanayannur', ml: 'കണയന്നൂർ', aliases: ['Ernakulam'], district: 'Ernakulam' },
  { en: 'Kochi', ml: 'കൊച്ചി', aliases: ['Cochin', 'Fort Kochi'], district: 'Ernakulam' },
  { en: 'Kothamangalam', ml: 'കോതമംഗലം', district: 'Ernakulam' },
  { en: 'Kunnathunad', ml: 'കുന്നത്തുനാട്', aliases: ['Perumbavoor', 'Kunnathunadu'], district: 'Ernakulam' },
  { en: 'Muvattupuzha', ml: 'മൂവാറ്റുപുഴ', district: 'Ernakulam' },
  { en: 'Paravur', ml: 'പറവൂർ', aliases: ['North Paravur', 'North Paravoor', 'Paravoor'], district: 'Ernakulam' },

  // Idukki
  { en: 'Devikulam', ml: 'ദേവികുളം', district: 'Idukki' },
  { en: 'Idukki', ml: 'ഇടുക്കി', district: 'Idukki' },
  { en: 'Peerumade', ml: 'പീരുമേട്', aliases: ['Peerumedu', 'Peermade'], district: 'Idukki' },
  { en: 'Thodupuzha', ml: 'തൊടുപുഴ', district: 'Idukki' },
  { en: 'Udumbanchola', ml: 'ഉടുമ്പൻചോല', district: 'Idukki' },

  // Kottayam
  { en: 'Changanassery', ml: 'ചങ്ങനാശ്ശേരി', aliases: ['Changanacherry'], district: 'Kottayam' },
  { en: 'Kanjirappally', ml: 'കാഞ്ഞിരപ്പള്ളി', aliases: ['Kanjirapally'], district: 'Kottayam' },
  { en: 'Kottayam', ml: 'കോട്ടയം', district: 'Kottayam' },
  { en: 'Meenachil', ml: 'മീനച്ചിൽ', aliases: ['Pala'], district: 'Kottayam' },
  { en: 'Vaikom', ml: 'വൈക്കം', district: 'Kottayam' },

  // Alappuzha
  { en: 'Ambalappuzha', ml: 'അമ്പലപ്പുഴ', aliases: ['Ambalapuzha', 'Alleppey'], district: 'Alappuzha' },
  { en: 'Chengannur', ml: 'ചെങ്ങന്നൂർ', district: 'Alappuzha' },
  { en: 'Cherthala', ml: 'ചേർത്തല', aliases: ['Shertallai'], district: 'Alappuzha' },
  { en: 'Karthikappally', ml: 'കാർത്തികപ്പള്ളി', aliases: ['Karthikapally', 'Haripad'], district: 'Alappuzha' },
  { en: 'Kuttanad', ml: 'കുട്ടനാട്', aliases: ['Kuttanadu', 'Mankombu'], district: 'Alappuzha' },
  { en: 'Mavelikkara', ml: 'മാവേലിക്കര', district: 'Alappuzha' },

  // Pathanamthitta
  { en: 'Adoor', ml: 'അടൂർ', district: 'Pathanamthitta' },
  { en: 'Konni', ml: 'കോന്നി', district: 'Pathanamthitta' },
  { en: 'Kozhencherry', ml: 'കോഴഞ്ചേരി', aliases: ['Pathanamthitta'], district: 'Pathanamthitta' },
  { en: 'Mallappally', ml: 'മല്ലപ്പള്ളി', aliases: ['Mallapally'], district: 'Pathanamthitta' },
  { en: 'Ranni', ml: 'റാന്നി', district: 'Pathanamthitta' },
  { en: 'Thiruvalla', ml: 'തിരുവല്ല', district: 'Pathanamthitta' },

  // Kollam
  { en: 'Kollam', ml: 'കൊല്ലം', aliases: ['Quilon'], district: 'Kollam' },
  { en: 'Karunagappally', ml: 'കരുനാഗപ്പള്ളി', aliases: ['Karunagapally'], district: 'Kollam' },
  { en: 'Kunnathur', ml: 'കുന്നത്തൂർ', aliases: ['Kunnathoor'], district: 'Kollam' },
  { en: 'Kottarakkara', ml: 'കൊട്ടാരക്കര', aliases: ['Kottarakara'], district: 'Kollam' },
  { en: 'Pathanapuram', ml: 'പത്തനാപുരം', district: 'Kollam' },
  { en: 'Punalur', ml: 'പുനലൂർ', district: 'Kollam' },

  // Thiruvananthapuram
  { en: 'Thiruvananthapuram', ml: 'തിരുവനന്തപുരം', aliases: ['Trivandrum'], district: 'Thiruvananthapuram' },
  { en: 'Chirayinkeezhu', ml: 'ചിറയിൻകീഴ്', aliases: ['Attingal', 'Chirayinkil'], district: 'Thiruvananthapuram' },
  { en: 'Nedumangad', ml: 'നെടുമങ്ങാട്', district: 'Thiruvananthapuram' },
  { en: 'Neyyattinkara', ml: 'നെയ്യാറ്റിൻകര', district: 'Thiruvananthapuram' },
  { en: 'Varkala', ml: 'വർക്കല', district: 'Thiruvananthapuram' },
  { en: 'Kattakada', ml: 'കാട്ടാക്കട', district: 'Thiruvananthapuram' },
];

function isMalayalam(str) {
  return /[\u0D00-\u0D7F]/.test(str);
}

function levenshtein(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return (maxLen - dist) / maxLen;
}

const runAudit = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully. Scanning MembershipApplications...\n');

    // Aggregate distinct Taluks with exact counts and raw case samples
    const talukStats = await MembershipApplication.aggregate([
      {
        $match: {
          thaluk: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: { $trim: { input: '$thaluk' } },
          count: { $sum: 1 },
          district: { $first: '$district' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log(`Total distinct taluk variations in DB: ${talukStats.length}`);

    const cleanOfficialMatches = [];
    const casingVariations = [];
    const malayalamEntries = [];
    const suspectedTypos = [];
    const unmappedEntries = [];

    for (const item of talukStats) {
      const raw = item._id;
      const count = item.count;
      const dbDistrict = item.district;

      // 1. Is Malayalam?
      if (isMalayalam(raw)) {
        // Try to match Malayalam official name
        let matchedTaluk = OFFICIAL_TALUKS.find(
          (t) => t.ml === raw || raw.includes(t.ml) || t.ml.includes(raw)
        );
        malayalamEntries.push({
          raw,
          count,
          matchedOfficial: matchedTaluk ? matchedTaluk.en : 'Unrecognized Malayalam',
          officialMl: matchedTaluk ? matchedTaluk.ml : null,
          dbDistrict,
        });
        continue;
      }

      // 2. Exact match with official English name
      const exactMatch = OFFICIAL_TALUKS.find((t) => t.en === raw);
      if (exactMatch) {
        cleanOfficialMatches.push({ raw, count, official: exactMatch.en });
        continue;
      }

      // 3. Case-insensitive match (e.g. ALATHUR, alathur)
      const caseMatch = OFFICIAL_TALUKS.find(
        (t) => t.en.toLowerCase() === raw.toLowerCase()
      );
      if (caseMatch) {
        casingVariations.push({
          raw,
          count,
          official: caseMatch.en,
          reason: 'UPPERCASE / mixed casing variation',
        });
        continue;
      }

      // 4. Check known aliases (e.g. Manjeri -> Ernad, Haripad -> Karthikappally)
      const aliasMatch = OFFICIAL_TALUKS.find(
        (t) => t.aliases && t.aliases.some((a) => a.toLowerCase() === raw.toLowerCase())
      );
      if (aliasMatch) {
        suspectedTypos.push({
          raw,
          count,
          target: aliasMatch.en,
          score: 1.0,
          reason: `Known local town / alias for ${aliasMatch.en}`,
        });
        continue;
      }

      // 5. Fuzzy match / Levenshtein distance
      let bestMatch = null;
      let highestScore = 0;

      for (const t of OFFICIAL_TALUKS) {
        const sim = similarity(raw, t.en);
        if (sim > highestScore) {
          highestScore = sim;
          bestMatch = t;
        }
        if (t.aliases) {
          for (const al of t.aliases) {
            const alSim = similarity(raw, al);
            if (alSim > highestScore) {
              highestScore = alSim;
              bestMatch = t;
            }
          }
        }
      }

      if (highestScore >= 0.70) {
        suspectedTypos.push({
          raw,
          count,
          target: bestMatch.en,
          score: Math.round(highestScore * 100),
          reason: `Typo / spelling variation (${Math.round(highestScore * 100)}% match)`,
        });
      } else {
        unmappedEntries.push({ raw, count, dbDistrict, bestGuess: bestMatch?.en, score: Math.round(highestScore * 100) });
      }
    }

    // Print Report
    console.log('\n================================================================');
    console.log('           AALIA MEMBERSHIP DATABASE LOCATION AUDIT');
    console.log('================================================================\n');

    console.log(`[1] EXACT OFFICIAL MATCHES (${cleanOfficialMatches.length} variations)`);
    console.log('----------------------------------------------------------------');
    console.log(
      cleanOfficialMatches
        .slice(0, 10)
        .map((m) => `  ✓ ${m.raw.padEnd(22)} (${m.count} members)`)
        .join('\n')
    );
    if (cleanOfficialMatches.length > 10) {
      console.log(`  ... and ${cleanOfficialMatches.length - 10} more official taluks`);
    }

    console.log(`\n[2] CASING / UPPERCASE VARIATIONS (${casingVariations.length} items)`);
    console.log('----------------------------------------------------------------');
    if (casingVariations.length === 0) {
      console.log('  None found.');
    } else {
      casingVariations.forEach((c) => {
        console.log(`  ⚠ "${c.raw}" (${c.count} members) -> Should be standard: "${c.official}"`);
      });
    }

    console.log(`\n[3] MALAYALAM ENTRIES (${malayalamEntries.length} items)`);
    console.log('----------------------------------------------------------------');
    if (malayalamEntries.length === 0) {
      console.log('  None found.');
    } else {
      malayalamEntries.forEach((m) => {
        console.log(`  🌐 "${m.raw}" (${m.count} members) -> Maps to: "${m.matchedOfficial}"`);
      });
    }

    console.log(`\n[4] SUSPECTED SPELLING TYPOS & ALIASES (${suspectedTypos.length} items)`);
    console.log('----------------------------------------------------------------');
    if (suspectedTypos.length === 0) {
      console.log('  No spelling typos found.');
    } else {
      suspectedTypos.forEach((t) => {
        console.log(`  ❌ "${t.raw}" (${t.count} members) -> Fix to: "${t.target}" [${t.reason}]`);
      });
    }

    console.log(`\n[5] UNMAPPED / OTHER ENTRIES (${unmappedEntries.length} items)`);
    console.log('----------------------------------------------------------------');
    if (unmappedEntries.length === 0) {
      console.log('  None found.');
    } else {
      unmappedEntries.forEach((u) => {
        console.log(`  ❓ "${u.raw}" (${u.count} members, Dist: ${u.dbDistrict || 'N/A'}) [Best guess: ${u.bestGuess} (${u.score}%)]`);
      });
    }

    console.log('\n================================================================');
    console.log('                      AUDIT SUMMARY');
    console.log('================================================================');
    console.log(`- Official exact spellings : ${cleanOfficialMatches.reduce((acc, m) => acc + m.count, 0)} records`);
    console.log(`- Casing differences      : ${casingVariations.reduce((acc, c) => acc + c.count, 0)} records`);
    console.log(`- Malayalam entries       : ${malayalamEntries.reduce((acc, m) => acc + m.count, 0)} records`);
    console.log(`- Spelling typos / aliases: ${suspectedTypos.reduce((acc, t) => acc + t.count, 0)} records`);
    console.log(`- Unmapped entries        : ${unmappedEntries.reduce((acc, u) => acc + u.count, 0)} records`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
};

runAudit();
