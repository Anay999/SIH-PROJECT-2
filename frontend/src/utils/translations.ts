/**
 * Multilingual Translation Engine & Text-to-Speech Accessibility for ThermoSafe AI.
 * Supports 8 Indian languages:
 * 1. English (en)
 * 2. Tamil - தமிழ் (ta)
 * 3. Hindi - हिन्दी (hi)
 * 4. Telugu - తెలుగు (te)
 * 5. Kannada - ಕನ್ನಡ (kn)
 * 6. Malayalam - മലയാളം (ml)
 * 7. Bengali - বাংলা (bn)
 * 8. Marathi - मराठी (mr)
 */

export type SupportedLanguage = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'bn' | 'mr';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  speechCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    app_title: "THERMOSAFE AI",
    heat_recommendations: "Personalized Heat Recommendations",
    worker_protocols: "Outdoor Worker Safety Protocols",
    why_am_i_seeing_this: "Why am I seeing this?",
    read_aloud: "Read Aloud",
    stop_audio: "Stop Audio",
    offline_notice: "Offline Mode Active",
    last_synced: "Last synchronized",
    care_circle_title: "Care Circle (Vulnerable Contacts)",
    care_circle_desc: "Voluntary emergency registry to safeguard elders, infants, and vulnerable dependents during severe heatwaves.",
    add_contact: "Add Vulnerable Contact",
    check_on_loved_ones: "Heat risk is High! Please check on your Care Circle contacts immediately.",
    community_report_title: "Community Heat & Water Issue Reporting",
    report_issue_btn: "Report Water / Heat Issue",
    water_points_title: "Public Drinking Water & Hydration Stations",
    schools_title: "School Heat Safety Planning & Advisories",
    model_uncalibrated: "RESEARCH ESTIMATION • MODEL NOT CALIBRATED",
    hydration_tip: "Drink at least 250ml of water or electrolyte solution every 30 minutes.",
    rest_break_tip: "Mandatory 15-minute shaded cooling pause for every 45 minutes of physical exertion.",
    sun_avoidance_tip: "Avoid direct outdoor sunlight exposure between 11:30 AM and 3:30 PM.",
    symptoms_warning: "If dizziness, nausea, or confusion occurs: stop labor, seek cool shade, and call 108.",
  },
  ta: {
    app_title: "தெர்மோசேஃப் ஏஐ",
    heat_recommendations: "தனிப்பயனாக்கப்பட்ட வெப்ப பாதுகாப்பு வழிகாட்டுதல்கள்",
    worker_protocols: "வெளிப்புற தொழிலாளர் பாதுகாப்பு நெறிமுறைகள்",
    why_am_i_seeing_this: "இந்த எச்சரிக்கையை நான் ஏன் பார்க்கிறேன்?",
    read_aloud: "குரல் வழி கேட்கவும்",
    stop_audio: "குரலை நிறுத்தவும்",
    offline_notice: "ஆஃப்லைன் பயன்முறை செயல்படுகிறது",
    last_synced: "கடைசியாக புதுப்பிக்கப்பட்டது",
    care_circle_title: "பாதுகாப்பு வட்டம் (முதியவர்கள் & குழந்தைகள்)",
    care_circle_desc: "கடுமையான வெப்பத்தின் போது முதியவர்கள், குழந்தைகள் மற்றும் நோய்வாய்ப்பட்டவர்களை கண்காணிக்க தன்னார்வ பதிவு.",
    add_contact: "பாதிக்கப்படக்கூடிய நபரைச் சேர்க்கவும்",
    check_on_loved_ones: "வெப்ப அபாயம் அதிகம்! உடனடியாக உங்கள் பாதுகாப்பு வட்டத்திலுள்ள உறவினர்களை நலம் விசாரிக்கவும்.",
    community_report_title: "குடிநீர் & வெப்ப பிரச்சனை புகார் பதிவு",
    report_issue_btn: "குடிநீர்/வெப்ப சிக்கலை புகாரளிக்கவும்",
    water_points_title: "பொது குடிநீர் & நீரேற்ற மையங்கள்",
    schools_title: "பள்ளிகள் வெப்ப பாதுகாப்பு வழிகாட்டுதல்",
    model_uncalibrated: "ஆராய்ச்சி மாதிரி • மருத்துவ ரீதியாக அளவீடு செய்யப்படவில்லை",
    hydration_tip: "ஒவ்வொரு 30 நிமிடங்களுக்கும் குறைந்தது 250 மிலி தண்ணீர் அல்லது எலக்ட்ரோலைட் குடிக்கவும்.",
    rest_break_tip: "ஒவ்வொரு 45 நிமிட உடல் உழைப்புக்கும் 15 நிமிட நிழலான ஓய்வு கட்டாயம்.",
    sun_avoidance_tip: "காலை 11:30 முதல் மதியம் 3:30 வரை நேரடி வெயிலில் செல்வதைத் தவிர்க்கவும்.",
    symptoms_warning: "தலைச்சுற்றல், வாந்தி அல்லது குழப்பம் ஏற்பட்டால்: வேலையை நிறுத்தி 108 ஆம்புலன்ஸை அழைக்கவும்.",
  },
  hi: {
    app_title: "थर्मोसेफ एआई",
    heat_recommendations: "व्यक्तिगत ताप सुरक्षा दिशानिर्देश",
    worker_protocols: "श्रमिक सुरक्षा एवं कार्य/विश्राम नियम",
    why_am_i_seeing_this: "मुझे यह सलाह क्यों दिखाई दे रही है?",
    read_aloud: "बोलकर सुनें",
    stop_audio: "आवाज़ बंद करें",
    offline_notice: "ऑफ़लाइन मोड सक्रिय है",
    last_synced: "अंतिम समन्वय",
    care_circle_title: "केयर सर्कल (संवेदनशील परिजन)",
    care_circle_desc: "भीषण गर्मी में बुजुर्गों, बच्चों और बीमार लोगों की सुरक्षा हेतु स्वैच्छिक सहायता सूची।",
    add_contact: "नया संपर्क जोड़ें",
    check_on_loved_ones: "लू का खतरा अधिक है! कृपया अपने केयर सर्कल के प्रियजनों से तुरंत संपर्क करें।",
    community_report_title: "पेयजल एवं लू संबंधी समस्या रिपोर्ट",
    report_issue_btn: "जल/लू समस्या दर्ज करें",
    water_points_title: "सार्वजनिक पेयजल एवं हाइड्रेशन केंद्र",
    schools_title: "स्कूल ताप सुरक्षा एवं बाहरी खेल सलाह",
    model_uncalibrated: "अनुसंधान अनुमान • मॉडल चिकित्सकीय रूप से कैलिब्रेट नहीं है",
    hydration_tip: "हर 30 मिनट में कम से कम 250 मिलीलीटर पानी या ओआरएस घोल पिएं।",
    rest_break_tip: "प्रत्येक 45 मिनट के श्रम के बाद 15 मिनट छायादार जगह पर विश्राम अनिवार्य है।",
    sun_avoidance_tip: "सुबह 11:30 से दोपहर 3:30 बजे के बीच सीधी धूप में निकलने से बचें।",
    symptoms_warning: "चक्कर आना, उल्टी या भ्रम होने पर: तुरंत काम रोकें, छाया में जाएं और 108 पर कॉल करें।",
  },
  te: {
    app_title: "థర్మోసేఫ్ ఏఐ",
    heat_recommendations: "వ్యక్తిగత ఎండవేడిమి భద్రతా సూచనలు",
    worker_protocols: "కార్మికుల భద్రత మరియు విశ్రాంతి నియమాలు",
    why_am_i_seeing_this: "ఈ హెచ్చరిక ఎందుకు చూపబడుతోంది?",
    read_aloud: "వినండి",
    stop_audio: "ఆపండి",
    offline_notice: "ఆఫ్‌లైన్ మోడ్ యాక్టివ్‌గా ఉంది",
    last_synced: "చివరిగా అప్‌డేట్ చేయబడింది",
    care_circle_title: "రక్షణ వలయం (వృద్ధులు & పిల్లలు)",
    care_circle_desc: "తీవ్రమైన వేడి సమయంలో వృద్ధులు మరియు పిల్లల బాగోగులు తెలుసుకోవడానికి స్వచ్ఛంద నమోదు.",
    add_contact: "సంరక్షణ సభ్యుడిని చేర్చండి",
    check_on_loved_ones: "వేడి తీవ్రత ఎక్కువగా ఉంది! వెంటనే మీ ఆప్తుల బాగోగులు కనుక్కోండి.",
    community_report_title: "తాగునీరు మరియు వేడి సమస్యల ఫిర్యాదు",
    report_issue_btn: "సమస్యను నివేదించండి",
    water_points_title: "ప్రజా తాగునీటి కేంద్రాలు",
    schools_title: "పాఠశాలల వేడిమి భద్రతా సలహాలు",
    model_uncalibrated: "పరిశోధనా అంచనా • వైద్యపరంగా ప్రామాణీకరించబడలేదు",
    hydration_tip: "ప్రతి 30 నిమిషాలకు కనీసం 250 మి.లీ నీరు లేదా ఓఆర్ఎస్ త్రాగండి.",
    rest_break_tip: "ప్రతి 45 నిమిషాల కఠిన శ్రమకు 15 నిమిషాల నీడ విశ్రాంతి తప్పనిసరి.",
    sun_avoidance_tip: "ఉదయం 11:30 నుండి మధ్యాహ్నం 3:30 వరకు ఎండలో తిరగవద్దు.",
    symptoms_warning: "తలతిరగడం లేదా వాంతులు వచ్చినట్లయితే పని ఆపి 108కి కాల్ చేయండి.",
  },
  kn: {
    app_title: "ಥರ್ಮೋಸೇಫ್ ಎಐ",
    heat_recommendations: "ವೈಯಕ್ತಿಕ ಶಾಖ ರಕ್ಷಣಾ ಮಾರ್ಗಸೂಚಿಗಳು",
    worker_protocols: "ಹೊರಾಂಗಣ ಕಾರ್ಮಿಕರ ಸುರಕ್ಷತಾ ಶಿಷ್ಟಾಚಾರಗಳು",
    why_am_i_seeing_this: "ನಾನು ಇದನ್ನು ಏಕೆ ನೋಡುತ್ತಿದ್ದೇನೆ?",
    read_aloud: "ಆಲಿಸಿ",
    stop_audio: "ನಿಲ್ಲಿಸಿ",
    offline_notice: "ಆಫ್‌ಲೈನ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ",
    last_synced: "ಕೊನೆಯ ಸಿಂಕ್",
    care_circle_title: "ಆರೈಕೆ ವಲಯ (ಹಿರಿಯರು & ಮಕ್ಕಳು)",
    care_circle_desc: "ತೀವ್ರ ಬಿಸಿಲಿನ ಸಮಯದಲ್ಲಿ ಹಿರಿಯರು ಮತ್ತು ಮಕ್ಕಳ ರಕ್ಷಣೆಗಾಗಿ ಸ್ವಯಂಪ್ರೇರಿತ ನೋಂದಣಿ.",
    add_contact: "ಸಂಪರ್ಕವನ್ನು ಸೇರಿಸಿ",
    check_on_loved_ones: "ಶಾಖದ ಅಪಾಯ ಹೆಚ್ಚಾಗಿದೆ! ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರೀತಿಪಾತ್ರರನ್ನು ತಕ್ಷಣ ವಿಚಾರಿಸಿ.",
    community_report_title: "ಕುಡಿಯುವ ನೀರು ಮತ್ತು ಶಾಖದ ಸಮಸ್ಯೆ ವರದಿ",
    report_issue_btn: "ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ",
    water_points_title: "ಸಾರ್ವಜನಿಕ ಕುಡಿಯುವ ನೀರಿನ ಕೇಂದ್ರಗಳು",
    schools_title: "ಶಾಲೆಗಳ ಶಾಖ ಸುರಕ್ಷತಾ ಮಾರ್ಗದರ್ಶನ",
    model_uncalibrated: "ಸಂಶೋಧನಾ ಅಂದಾಜು • ವೈದ್ಯಕೀಯವಾಗಿ ಮಾಪನಾಂಕ ನಿರ್ಣಯಿಸಲಾಗಿಲ್ಲ",
    hydration_tip: "ಪ್ರತಿ 30 ನಿಮಿಷಗಳಿಗೊಮ್ಮೆ ಕನಿಷ್ಠ 250 ಮಿಲಿ ನೀರು ಅಥವಾ ಓಆರ್‌ಎಸ್ ಕುಡಿಯಿರಿ.",
    rest_break_tip: "ಪ್ರತಿ 45 ನಿಮಿಷಗಳ ಕೆಲಸದ ನಂತರ 15 ನಿಮಿಷಗಳ ನೆರಳಿನ ವಿಶ್ರಾಂತಿ ಕಡ್ಡಾಯ.",
    sun_avoidance_tip: "ಬೆಳಿಗ್ಗೆ 11:30 ರಿಂದ ಮಧ್ಯಾಹ್ನ 3:30 ರವರೆಗೆ ನೇರ ಬಿಸಿಲಿನಲ್ಲಿ ಹೋಗಬೇಡಿ.",
    symptoms_warning: "ತಲೆಸುತ್ತು ಅಥವಾ ವಾಂತಿ ಉಂಟಾದರೆ: ಕೆಲಸ ನಿಲ್ಲಿಸಿ 108 ಕರೆ ಮಾಡಿ.",
  },
  ml: {
    app_title: "തെർമോസേഫ് എഐ",
    heat_recommendations: "വ്യക്തിഗത താപ സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ",
    worker_protocols: "തൊഴിലാളി സുരക്ഷാ മുൻകരുതലുകൾ",
    why_am_i_seeing_this: "ഞാൻ ഇത് എന്തിനാണ് കാണുന്നത്?",
    read_aloud: "ശ്രദ്ധിക്കുക",
    stop_audio: "നിർത്തുക",
    offline_notice: "ഓഫ്‌ലൈൻ മോഡ് സജീവമാണ്",
    last_synced: "അവസാനം പുതുക്കിയത്",
    care_circle_title: "കെയർ സർക്കിൾ (പ്രായമായവരും കുട്ടികളും)",
    care_circle_desc: "കടുത്ത ചൂടിൽ മുതിർന്നവരെയും കുട്ടികളെയും സംരക്ഷിക്കാനുള്ള സഹായ രജിസ്ട്രി.",
    add_contact: "വ്യക്തിയെ ചേർക്കുക",
    check_on_loved_ones: "ചൂട് വളരെ കൂടുതലാണ്! ഉടൻ തന്നെ നിങ്ങളുടെ പ്രിയപ്പെട്ടവരെ വിളിക്കുക.",
    community_report_title: "കുടിവെള്ള, ചൂട് പ്രശ്നങ്ങൾ റിപ്പോർട്ട് ചെയ്യുക",
    report_issue_btn: "പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    water_points_title: "പൊതു കുടിവെള്ള കേന്ദ്രങ്ങൾ",
    schools_title: "സ്കൂൾ ചൂട് സുരക്ഷാ മുന്നറിയിപ്പ്",
    model_uncalibrated: "ഗവേഷണ മാതൃക • ക്ലിനിക്കലായി സ്ഥിരീകരിച്ചിട്ടില്ല",
    hydration_tip: "ഓരോ 30 മിനിറ്റിലും 250 മില്ലി ലിറ്റർ വെള്ളമോ ഒ.ആർ.എസോ കുടിക്കുക.",
    rest_break_tip: "ഓരോ 45 മിനിറ്റ് ജോലിക്കും 15 മിനിറ്റ് തണലിലുള്ള വിശ്രമം നിർബന്ധമാണ്.",
    sun_avoidance_tip: "രാവിലെ 11:30 മുതൽ ഉച്ചതിരിഞ്ഞ് 3:30 വരെ നേരിട്ടുള്ള വെയിൽ ഒഴിവാക്കുക.",
    symptoms_warning: "തലകറക്കമോ ക്ഷീണമോ ഉണ്ടായാൽ: ജോലി നിർത്തി 108 വിളിക്കുക.",
  },
  bn: {
    app_title: "থার্মোসেফ এআই",
    heat_recommendations: "ব্যক্তিগত তাপ সুরক্ষা নির্দেশিকা",
    worker_protocols: "শ্রমিক সুরক্ষা ও কাজের নিয়মাবলী",
    why_am_i_seeing_this: "আমি এই সতর্কতা কেন দেখছি?",
    read_aloud: "শুনে নিন",
    stop_audio: "থামান",
    offline_notice: "অফলাইন মোড সক্রিয়",
    last_synced: "সর্বশেষ সিঙ্ক",
    care_circle_title: "কেয়ার সার্কেল (বয়স্ক ও শিশুরা)",
    care_circle_desc: "তীব্র তাপপ্রবাহের সময় পরিবারের বয়স্ক ও শিশুদের সুরক্ষার তালিকা।",
    add_contact: "পরিচিত যোগ করুন",
    check_on_loved_ones: "তাপমাত্রার ঝুঁকি অত্যন্ত বেশি! এখনই আপনার প্রিয়জনদের খবর নিন।",
    community_report_title: "পানীয় জল ও তাপ সংক্রান্ত সমস্যা রিপোর্ট",
    report_issue_btn: "সমস্যা রিপোর্ট করুন",
    water_points_title: "জনসাধারণের পানীয় জল কেন্দ্র",
    schools_title: "বিদ্যালয় তাপ সুরক্ষা নির্দেশিকা",
    model_uncalibrated: "গবেষণামূলক অনুমান • চিকিৎসাগতভাবে যাচাইকৃত নয়",
    hydration_tip: "প্রতি ৩০ মিনিট অন্তর অন্তত ২৫০ মিলি জল অথবা ওআরএস পান করুন।",
    rest_break_tip: "প্রতি ৪৫ মিনিট শারীরিক শ্রমের পর ১৫ মিনিট ছায়ায় বিশ্রাম বাধ্যতামূলক।",
    sun_avoidance_tip: "সকাল ১১:৩০ থেকে বিকেল ৩:৩০ পর্যন্ত সরাসরি রোদ এড়িয়ে চলুন।",
    symptoms_warning: "মাথা ঘোরা বা বমি বমি ভাব হলে: কাজ বন্ধ করে ১০৮ নম্বরে কল করুন।",
  },
  mr: {
    app_title: "थर्मोसेफ एआय",
    heat_recommendations: "वैयक्तिक उष्णता सुरक्षा मार्गदर्शक",
    worker_protocols: "कामगार सुरक्षा व विश्रांती नियम",
    why_am_i_seeing_this: "मला ही सूचना का दिसत आहे?",
    read_aloud: "ऐका",
    stop_audio: "बंद करा",
    offline_notice: "ऑफलाइन मोड सक्रिय आहे",
    last_synced: "शेवटचे अद्यतन",
    care_circle_title: "केअर सर्कल (ज्येष्ठ व बालके)",
    care_circle_desc: "कडक उन्हाळ्यात ज्येष्ठ नागरिक आणि लहान मुलांच्या सुरक्षेसाठी संपर्क सूची.",
    add_contact: "व्यक्ती जोडा",
    check_on_loved_ones: "उष्णतेचा धोका जास्त आहे! त्वरित आपल्या प्रियजनांशी संपर्क साधा.",
    community_report_title: "पिण्याचे पाणी व उष्णता समस्या तक्रार",
    report_issue_btn: "तक्रार नोंदवा",
    water_points_title: "सार्वजनिक पिण्याचे पाणी केंद्र",
    schools_title: "शाळा उष्णता सुरक्षा मार्गदर्शक",
    model_uncalibrated: "संशोधन अंदाज • मॉडेल वैद्यकीयदृष्ट्या कॅलिब्रेट केलेले नाही",
    hydration_tip: "दर ३० मिनिटांनी किमान २५० मिली पाणी किंवा ओआरएस प्या.",
    rest_break_tip: "प्रत्येक ४५ मिनिटांच्या कामानंतर १५ मिनिटे सावलीत विश्रांती घेणे आवश्यक आहे.",
    sun_avoidance_tip: "सकाळी ११:३० ते दुपारी ३:३० दरम्यान थेट उन्हात जाणे टाळा.",
    symptoms_warning: "चक्कर येणे किंवा उलट्या झाल्यास: ताबडतोब काम थांबवा आणि १०८ वर कॉल करा.",
  }
};

/**
 * High-performance speech synthesis for safety instructions.
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakSafetyGuidance(
  text: string,
  lang: SupportedLanguage = 'en',
  onEnd?: () => void
): boolean {
  if (!('speechSynthesis' in window)) return false;

  window.speechSynthesis.cancel();

  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langMeta.speechCode;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function isSpeakingNow(): boolean {
  return currentUtterance !== null;
}

export function stopSafetySpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

