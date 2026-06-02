/*
 * Language tables and translation helpers.
 *
 * Most of this file is static copy used by the UI, geo info panel, error
 * messages, and AI language instructions. The helpers at the bottom centralize
 * fallback behavior so missing translations degrade to English instead of
 * breaking the interface.
 *
 * Result-specific text from the AI is not translated here. The selected
 * language is passed to the model through languageInstructions, because the
 * model needs to write natural method and displaySentence fields directly.
 */

// Core UI labels shared across the app.
const TRANSLATIONS = {
    "en": {
        "title": "Photo geolocator",
        "welcome": "Welcome! Upload a photo to identify where it was taken.",
        "upload": "Upload photo",
        "searching": "Identifying location...",
        "view": "View",
        "theme": "Theme",
        "language": "Language",
        "satellite": "Satellite",
        "map": "Map",
        "dark": "Dark",
        "light": "Light",
        "unknownLocation": "The location of this photo could not be identified",
        "unknownLocationShort": "Unknown location",
        "photoTakenIn": "This photo was taken in {place}",
        "methodGPS": "Location identified using GPS coordinates from photo metadata.",
        "moreInformation": "Learn more",
        "readMore": "Read more"
    },
    "ar": {
        "title": "محدد موقع الصور",
        "welcome": "مرحبًا! قم بتحميل صورة لتحديد مكان التقاطها.",
        "upload": "تحميل صورة",
        "searching": "جارٍ تحديد الموقع...",
        "view": "العرض",
        "theme": "المظهر",
        "language": "اللغة",
        "satellite": "القمر الصناعي",
        "map": "خريطة",
        "dark": "داكن",
        "light": "فاتح",
        "unknownLocation": "تعذر تحديد موقع هذه الصورة",
        "unknownLocationShort": "موقع غير معروف",
        "photoTakenIn": "تم التقاط هذه الصورة في {place}",
        "methodGPS": "تم تحديد الموقع باستخدام إحداثيات GPS من بيانات الصورة.",
        "moreInformation": "مزيد من المعلومات"
    },
    "bg": {
        "title": "Геолокатор на снимки",
        "welcome": "Добре дошли! Качете снимка, за да определите къде е направена.",
        "upload": "Качване на снимка",
        "searching": "Определяне на местоположението...",
        "view": "Изглед",
        "theme": "Тема",
        "language": "Език",
        "satellite": "Сателит",
        "map": "Карта",
        "dark": "Тъмна",
        "light": "Светла",
        "unknownLocation": "Местоположението на тази снимка не можа да бъде определено",
        "unknownLocationShort": "Неизвестно местоположение",
        "photoTakenIn": "Тази снимка е направена в {place}",
        "methodGPS": "Местоположението е определено чрез GPS координатите в метаданните на снимката.",
        "moreInformation": "Научете повече"
    },
    "bn": {
        "title": "ছবির অবস্থান নির্ধারক",
        "welcome": "স্বাগতম! ছবিটি কোথায় তোলা হয়েছে তা শনাক্ত করতে একটি ছবি আপলোড করুন।",
        "upload": "ছবি আপলোড করুন",
        "searching": "অবস্থান শনাক্ত করা হচ্ছে...",
        "view": "ভিউ",
        "theme": "থিম",
        "language": "ভাষা",
        "satellite": "স্যাটেলাইট",
        "map": "মানচিত্র",
        "dark": "ডার্ক",
        "light": "লাইট",
        "unknownLocation": "এই ছবির অবস্থান শনাক্ত করা যায়নি",
        "unknownLocationShort": "অজানা অবস্থান",
        "photoTakenIn": "এই ছবিটি {place}-এ তোলা হয়েছে",
        "methodGPS": "ছবির মেটাডেটার GPS স্থানাঙ্ক ব্যবহার করে অবস্থান শনাক্ত করা হয়েছে।",
        "moreInformation": "আরও জানুন"
    },
    "cs": {
        "title": "Geolokátor fotografií",
        "welcome": "Vítejte! Nahrajte fotografii a zjistěte, kde byla pořízena.",
        "upload": "Nahrát fotografii",
        "searching": "Určování polohy...",
        "view": "Pohled",
        "theme": "Motiv",
        "language": "Jazyk",
        "satellite": "Satelit",
        "map": "Mapa",
        "dark": "Tmavý",
        "light": "Světlý",
        "unknownLocation": "Místo této fotografie se nepodařilo určit",
        "unknownLocationShort": "Neznámé místo",
        "photoTakenIn": "Tato fotografie byla pořízena v {place}",
        "methodGPS": "Poloha byla určena pomocí GPS souřadnic z metadat fotografie.",
        "moreInformation": "Zjistit více"
    },
    "da": {
        "title": "Billedgeolokator",
        "welcome": "Velkommen! Upload et billede for at identificere, hvor det blev taget.",
        "upload": "Upload billede",
        "searching": "Identificerer placering...",
        "view": "Visning",
        "theme": "Tema",
        "language": "Sprog",
        "satellite": "Satellit",
        "map": "Kort",
        "dark": "Mørk",
        "light": "Lys",
        "unknownLocation": "Placeringen af dette billede kunne ikke identificeres",
        "unknownLocationShort": "Ukendt placering",
        "photoTakenIn": "Dette billede blev taget i {place}",
        "methodGPS": "Placeringen blev identificeret ved hjælp af GPS-koordinater fra billedets metadata.",
        "moreInformation": "Læs mere"
    },
    "de": {
        "title": "Foto-Geolokalisierer",
        "welcome": "Willkommen! Laden Sie ein Foto hoch, um herauszufinden, wo es aufgenommen wurde.",
        "upload": "Foto hochladen",
        "searching": "Standort wird identifiziert...",
        "view": "Ansicht",
        "theme": "Design",
        "language": "Sprache",
        "satellite": "Satellit",
        "map": "Karte",
        "dark": "Dunkel",
        "light": "Hell",
        "unknownLocation": "Der Ort dieses Fotos konnte nicht identifiziert werden",
        "unknownLocationShort": "Unbekannter Ort",
        "photoTakenIn": "Dieses Foto wurde in {place} aufgenommen",
        "methodGPS": "Der Standort wurde mithilfe der GPS-Koordinaten aus den Fotometadaten identifiziert.",
        "moreInformation": "Mehr erfahren"
    },
    "el": {
        "title": "Γεωεντοπισμός φωτογραφιών",
        "welcome": "Καλώς ήρθατε! Ανεβάστε μια φωτογραφία για να εντοπίσετε πού τραβήχτηκε.",
        "upload": "Μεταφόρτωση φωτογραφίας",
        "searching": "Εντοπισμός τοποθεσίας...",
        "view": "Προβολή",
        "theme": "Θέμα",
        "language": "Γλώσσα",
        "satellite": "Δορυφόρος",
        "map": "Χάρτης",
        "dark": "Σκούρο",
        "light": "Ανοιχτό",
        "unknownLocation": "Δεν ήταν δυνατός ο εντοπισμός της τοποθεσίας αυτής της φωτογραφίας",
        "unknownLocationShort": "Άγνωστη τοποθεσία",
        "photoTakenIn": "Αυτή η φωτογραφία τραβήχτηκε στο {place}",
        "methodGPS": "Η τοποθεσία εντοπίστηκε χρησιμοποιώντας τις συντεταγμένες GPS από τα μεταδεδομένα της φωτογραφίας.",
        "moreInformation": "Μάθετε περισσότερα"
    },
    "es": {
        "title": "Geolocalizador de fotos",
        "welcome": "¡Bienvenido! Sube una foto para identificar dónde fue tomada.",
        "upload": "Subir foto",
        "searching": "Identificando ubicación...",
        "view": "Vista",
        "theme": "Tema",
        "language": "Idioma",
        "satellite": "Satélite",
        "map": "Mapa",
        "dark": "Oscuro",
        "light": "Claro",
        "unknownLocation": "No se pudo identificar la ubicación de esta foto",
        "unknownLocationShort": "Ubicación desconocida",
        "photoTakenIn": "Esta foto fue tomada en {place}",
        "methodGPS": "Ubicación identificada usando las coordenadas GPS de los metadatos de la foto.",
        "moreInformation": "Más información"
    },
    "et": {
        "title": "Foto geolokaator",
        "welcome": "Tere tulemast! Laadi üles foto, et tuvastada, kus see tehti.",
        "upload": "Laadi foto üles",
        "searching": "Asukohta tuvastatakse...",
        "view": "Vaade",
        "theme": "Teema",
        "language": "Keel",
        "satellite": "Satelliit",
        "map": "Kaart",
        "dark": "Tume",
        "light": "Hele",
        "unknownLocation": "Selle foto asukohta ei õnnestunud tuvastada",
        "unknownLocationShort": "Tundmatu asukoht",
        "photoTakenIn": "See foto tehti kohas {place}",
        "methodGPS": "Asukoht tuvastati foto metaandmete GPS-koordinaatide abil.",
        "moreInformation": "Lisateave"
    },
    "fa": {
        "title": "مکان‌یاب عکس",
        "welcome": "خوش آمدید! یک عکس بارگذاری کنید تا محل گرفته شدن آن شناسایی شود.",
        "upload": "بارگذاری عکس",
        "searching": "در حال شناسایی موقعیت...",
        "view": "نمایش",
        "theme": "تم",
        "language": "زبان",
        "satellite": "ماهواره",
        "map": "نقشه",
        "dark": "تیره",
        "light": "روشن",
        "unknownLocation": "موقعیت این عکس قابل شناسایی نبود",
        "unknownLocationShort": "موقعیت نامشخص",
        "photoTakenIn": "این عکس در {place} گرفته شده است",
        "methodGPS": "موقعیت با استفاده از مختصات GPS موجود در فراداده عکس شناسایی شد.",
        "moreInformation": "اطلاعات بیشتر"
    },
    "fi": {
        "title": "Valokuvien paikannin",
        "welcome": "Tervetuloa! Lataa kuva tunnistaaksesi, missä se otettiin.",
        "upload": "Lataa kuva",
        "searching": "Sijaintia tunnistetaan...",
        "view": "Näkymä",
        "theme": "Teema",
        "language": "Kieli",
        "satellite": "Satelliitti",
        "map": "Kartta",
        "dark": "Tumma",
        "light": "Vaalea",
        "unknownLocation": "Tämän kuvan sijaintia ei voitu tunnistaa",
        "unknownLocationShort": "Tuntematon sijainti",
        "photoTakenIn": "Tämä kuva otettiin paikassa {place}",
        "methodGPS": "Sijainti tunnistettiin kuvan metatiedoissa olevien GPS-koordinaattien avulla.",
        "moreInformation": "Lisätietoja"
    },
    "fr": {
        "title": "Géolocalisateur de photo",
        "welcome": "Bienvenue ! Téléchargez une photo pour identifier où elle a été prise.",
        "upload": "Télécharger une photo",
        "searching": "Identification du lieu...",
        "view": "Vue",
        "theme": "Thème",
        "language": "Langue",
        "satellite": "Satellite",
        "map": "Carte",
        "dark": "Sombre",
        "light": "Clair",
        "unknownLocation": "Le lieu de cette photo n'a pas pu être identifié",
        "unknownLocationShort": "Lieu inconnu",
        "photoTakenIn": "Cette photo a été prise à {place}",
        "methodGPS": "Lieu identifié à partir des coordonnées GPS des métadonnées de la photo.",
        "moreInformation": "En savoir plus"
    },
    "he": {
        "title": "מאתר מיקום תמונות",
        "welcome": "ברוכים הבאים! העלו תמונה כדי לזהות היכן היא צולמה.",
        "upload": "העלאת תמונה",
        "searching": "מזהה מיקום...",
        "view": "תצוגה",
        "theme": "ערכת נושא",
        "language": "שפה",
        "satellite": "לוויין",
        "map": "מפה",
        "dark": "כהה",
        "light": "בהיר",
        "unknownLocation": "לא ניתן היה לזהות את מיקום התמונה",
        "unknownLocationShort": "מיקום לא ידוע",
        "photoTakenIn": "התמונה הזו צולמה ב{place}",
        "methodGPS": "המיקום זוהה באמצעות קואורדינטות GPS ממטא־הנתונים של התמונה.",
        "moreInformation": "למידע נוסף"
    },
    "hi": {
        "title": "फोटो जियोलोकेटर",
        "welcome": "स्वागत है! यह पहचानने के लिए एक फोटो अपलोड करें कि इसे कहाँ लिया गया था।",
        "upload": "फोटो अपलोड करें",
        "searching": "स्थान की पहचान की जा रही है...",
        "view": "दृश्य",
        "theme": "थीम",
        "language": "भाषा",
        "satellite": "सैटेलाइट",
        "map": "नक्शा",
        "dark": "डार्क",
        "light": "लाइट",
        "unknownLocation": "इस फोटो का स्थान पहचाना नहीं जा सका",
        "unknownLocationShort": "अज्ञात स्थान",
        "photoTakenIn": "यह फोटो {place} में ली गई थी",
        "methodGPS": "फोटो के मेटाडेटा में मौजूद GPS निर्देशांकों का उपयोग करके स्थान पहचाना गया।",
        "moreInformation": "और जानें"
    },
    "hr": {
        "title": "Geolokator fotografija",
        "welcome": "Dobrodošli! Prenesite fotografiju kako biste identificirali gdje je snimljena.",
        "upload": "Prenesi fotografiju",
        "searching": "Identificiranje lokacije...",
        "view": "Prikaz",
        "theme": "Tema",
        "language": "Jezik",
        "satellite": "Satelit",
        "map": "Karta",
        "dark": "Tamna",
        "light": "Svijetla",
        "unknownLocation": "Lokacija ove fotografije nije mogla biti identificirana",
        "unknownLocationShort": "Nepoznata lokacija",
        "photoTakenIn": "Ova fotografija je snimljena u {place}",
        "methodGPS": "Lokacija je identificirana pomoću GPS koordinata iz metapodataka fotografije.",
        "moreInformation": "Saznaj više"
    },
    "hu": {
        "title": "Fotó geolokátor",
        "welcome": "Üdvözöljük! Töltsön fel egy fényképet annak meghatározásához, hol készült.",
        "upload": "Fotó feltöltése",
        "searching": "Hely meghatározása...",
        "view": "Nézet",
        "theme": "Téma",
        "language": "Nyelv",
        "satellite": "Műhold",
        "map": "Térkép",
        "dark": "Sötét",
        "light": "Világos",
        "unknownLocation": "A fénykép helyét nem sikerült azonosítani",
        "unknownLocationShort": "Ismeretlen hely",
        "photoTakenIn": "Ez a fénykép itt készült: {place}",
        "methodGPS": "A helyet a fénykép metaadataiban található GPS-koordináták alapján azonosítottuk.",
        "moreInformation": "További információ"
    },
    "id": {
        "title": "Pelacak lokasi foto",
        "welcome": "Selamat datang! Unggah foto untuk mengidentifikasi tempat foto tersebut diambil.",
        "upload": "Unggah foto",
        "searching": "Mengidentifikasi lokasi...",
        "view": "Tampilan",
        "theme": "Tema",
        "language": "Bahasa",
        "satellite": "Satelit",
        "map": "Peta",
        "dark": "Gelap",
        "light": "Terang",
        "unknownLocation": "Lokasi foto ini tidak dapat diidentifikasi",
        "unknownLocationShort": "Lokasi tidak diketahui",
        "photoTakenIn": "Foto ini diambil di {place}",
        "methodGPS": "Lokasi diidentifikasi menggunakan koordinat GPS dari metadata foto.",
        "moreInformation": "Pelajari lebih lanjut"
    },
    "is": {
        "title": "Landstaðsetning mynda",
        "welcome": "Velkomin! Hladdu upp mynd til að finna hvar hún var tekin.",
        "upload": "Hlaða upp mynd",
        "searching": "Að staðsetja mynd...",
        "view": "Sýn",
        "theme": "Þema",
        "language": "Tungumál",
        "satellite": "Gervihnöttur",
        "map": "Kort",
        "dark": "Dökkt",
        "light": "Ljóst",
        "unknownLocation": "Ekki tókst að staðsetja þessa mynd",
        "unknownLocationShort": "Óþekkt staðsetning",
        "photoTakenIn": "Þessi mynd var tekin í {place}",
        "methodGPS": "Staðsetning var fundin með GPS-hnitum úr lýsigögnum myndarinnar.",
        "moreInformation": "Frekari upplýsingar"
    },
    "it": {
        "title": "Geolocalizzatore di foto",
        "welcome": "Benvenuto! Carica una foto per identificare dove è stata scattata.",
        "upload": "Carica foto",
        "searching": "Identificazione della posizione...",
        "view": "Vista",
        "theme": "Tema",
        "language": "Lingua",
        "satellite": "Satellite",
        "map": "Mappa",
        "dark": "Scuro",
        "light": "Chiaro",
        "unknownLocation": "Non è stato possibile identificare la posizione di questa foto",
        "unknownLocationShort": "Posizione sconosciuta",
        "photoTakenIn": "Questa foto è stata scattata a {place}",
        "methodGPS": "Posizione identificata utilizzando le coordinate GPS dei metadati della foto.",
        "moreInformation": "Scopri di più"
    },
    "ja": {
        "title": "写真ジオロケーター",
        "welcome": "ようこそ！写真をアップロードして、撮影場所を特定しましょう。",
        "upload": "写真をアップロード",
        "searching": "場所を特定しています...",
        "view": "表示",
        "theme": "テーマ",
        "language": "言語",
        "satellite": "衛星",
        "map": "地図",
        "dark": "ダーク",
        "light": "ライト",
        "unknownLocation": "この写真の場所を特定できませんでした",
        "unknownLocationShort": "不明な場所",
        "photoTakenIn": "この写真は{place}で撮影されました",
        "methodGPS": "写真のメタデータ内のGPS座標を使用して場所を特定しました。",
        "moreInformation": "もっと知る"
    },
    "ko": {
        "title": "사진 위치 추적기",
        "welcome": "환영합니다! 사진이 촬영된 위치를 확인하려면 사진을 업로드하세요.",
        "upload": "사진 업로드",
        "searching": "위치 확인 중...",
        "view": "보기",
        "theme": "테마",
        "language": "언어",
        "satellite": "위성",
        "map": "지도",
        "dark": "다크",
        "light": "라이트",
        "unknownLocation": "이 사진의 위치를 확인할 수 없습니다",
        "unknownLocationShort": "알 수 없는 위치",
        "photoTakenIn": "이 사진은 {place}에서 촬영되었습니다",
        "methodGPS": "사진 메타데이터의 GPS 좌표를 사용하여 위치를 확인했습니다.",
        "moreInformation": "자세히 보기"
    },
    "lt": {
        "title": "Nuotraukų geolokatorius",
        "welcome": "Sveiki! Įkelkite nuotrauką, kad nustatytumėte, kur ji buvo padaryta.",
        "upload": "Įkelti nuotrauką",
        "searching": "Nustatoma vieta...",
        "view": "Vaizdas",
        "theme": "Tema",
        "language": "Kalba",
        "satellite": "Palydovas",
        "map": "Žemėlapis",
        "dark": "Tamsi",
        "light": "Šviesi",
        "unknownLocation": "Nepavyko nustatyti šios nuotraukos vietos",
        "unknownLocationShort": "Nežinoma vieta",
        "photoTakenIn": "Ši nuotrauka buvo padaryta {place}",
        "methodGPS": "Vieta nustatyta naudojant GPS koordinates iš nuotraukos metaduomenų.",
        "moreInformation": "Sužinoti daugiau"
    },
    "lv": {
        "title": "Fotoattēlu ģeolokators",
        "welcome": "Laipni lūdzam! Augšupielādējiet fotoattēlu, lai noteiktu, kur tas uzņemts.",
        "upload": "Augšupielādēt fotoattēlu",
        "searching": "Notiek atrašanās vietas noteikšana...",
        "view": "Skats",
        "theme": "Tēma",
        "language": "Valoda",
        "satellite": "Satelīts",
        "map": "Karte",
        "dark": "Tumšs",
        "light": "Gaišs",
        "unknownLocation": "Šī fotoattēla atrašanās vietu neizdevās noteikt",
        "unknownLocationShort": "Nezināma atrašanās vieta",
        "photoTakenIn": "Šis fotoattēls tika uzņemts {place}",
        "methodGPS": "Atrašanās vieta tika noteikta, izmantojot GPS koordinātas no fotoattēla metadatiem.",
        "moreInformation": "Uzzināt vairāk"
    },
    "nl": {
        "title": "Foto-locatiezoeker",
        "welcome": "Welkom! Upload een foto om te bepalen waar deze is genomen.",
        "upload": "Foto uploaden",
        "searching": "Locatie identificeren...",
        "view": "Weergave",
        "theme": "Thema",
        "language": "Taal",
        "satellite": "Satelliet",
        "map": "Kaart",
        "dark": "Donker",
        "light": "Licht",
        "unknownLocation": "De locatie van deze foto kon niet worden geïdentificeerd",
        "unknownLocationShort": "Onbekende locatie",
        "photoTakenIn": "Deze foto is genomen in {place}",
        "methodGPS": "Locatie geïdentificeerd met behulp van GPS-coördinaten uit de metadata van de foto.",
        "moreInformation": "Meer informatie"
    },
    "no": {
        "title": "Foto-geolokator",
        "welcome": "Velkommen! Last opp et bilde for å identifisere hvor det ble tatt.",
        "upload": "Last opp bilde",
        "searching": "Identifiserer sted...",
        "view": "Visning",
        "theme": "Tema",
        "language": "Språk",
        "satellite": "Satellitt",
        "map": "Kart",
        "dark": "Mørk",
        "light": "Lys",
        "unknownLocation": "Plasseringen til dette bildet kunne ikke identifiseres",
        "unknownLocationShort": "Ukjent sted",
        "photoTakenIn": "Dette bildet ble tatt i {place}",
        "methodGPS": "Plasseringen ble identifisert ved hjelp av GPS-koordinater fra bildets metadata.",
        "moreInformation": "Les mer"
    },
    "pl": {
        "title": "Geolokalizator zdjęć",
        "welcome": "Witamy! Prześlij zdjęcie, aby określić, gdzie zostało wykonane.",
        "upload": "Prześlij zdjęcie",
        "searching": "Identyfikowanie lokalizacji...",
        "view": "Widok",
        "theme": "Motyw",
        "language": "Język",
        "satellite": "Satelita",
        "map": "Mapa",
        "dark": "Ciemny",
        "light": "Jasny",
        "unknownLocation": "Nie udało się zidentyfikować lokalizacji tego zdjęcia",
        "unknownLocationShort": "Nieznana lokalizacja",
        "photoTakenIn": "To zdjęcie zostało wykonane w {place}",
        "methodGPS": "Lokalizacja została określona przy użyciu współrzędnych GPS z metadanych zdjęcia.",
        "moreInformation": "Dowiedz się więcej"
    },
    "pt": {
        "title": "Geolocalizador de fotos",
        "welcome": "Bem-vindo! Envie uma foto para identificar onde ela foi tirada.",
        "upload": "Enviar foto",
        "searching": "Identificando localização...",
        "view": "Vista",
        "theme": "Tema",
        "language": "Idioma",
        "satellite": "Satélite",
        "map": "Mapa",
        "dark": "Escuro",
        "light": "Claro",
        "unknownLocation": "Não foi possível identificar a localização desta foto",
        "unknownLocationShort": "Local desconhecido",
        "photoTakenIn": "Esta foto foi tirada em {place}",
        "methodGPS": "Local identificado usando as coordenadas GPS dos metadados da foto.",
        "moreInformation": "Saiba mais"
    },
    "ro": {
        "title": "Geolocator foto",
        "welcome": "Bun venit! Încarcă o fotografie pentru a identifica unde a fost făcută.",
        "upload": "Încarcă fotografie",
        "searching": "Se identifică locația...",
        "view": "Vedere",
        "theme": "Temă",
        "language": "Limbă",
        "satellite": "Satelit",
        "map": "Hartă",
        "dark": "Întunecat",
        "light": "Deschis",
        "unknownLocation": "Locația acestei fotografii nu a putut fi identificată",
        "unknownLocationShort": "Locație necunoscută",
        "photoTakenIn": "Această fotografie a fost făcută în {place}",
        "methodGPS": "Locația a fost identificată folosind coordonatele GPS din metadatele fotografiei.",
        "moreInformation": "Aflați mai multe"
    },
    "ru": {
        "title": "Геолокатор фотографий",
        "welcome": "Добро пожаловать! Загрузите фотографию, чтобы определить, где она была сделана.",
        "upload": "Загрузить фото",
        "searching": "Определение местоположения...",
        "view": "Вид",
        "theme": "Тема",
        "language": "Язык",
        "satellite": "Спутник",
        "map": "Карта",
        "dark": "Тёмная",
        "light": "Светлая",
        "unknownLocation": "Не удалось определить местоположение этой фотографии",
        "unknownLocationShort": "Неизвестное место",
        "photoTakenIn": "Эта фотография была сделана в {place}",
        "methodGPS": "Местоположение определено с помощью GPS-координат из метаданных фотографии.",
        "moreInformation": "Подробнее"
    },
    "sk": {
        "title": "Geolokátor fotografií",
        "welcome": "Vitajte! Nahrajte fotografiu a zistite, kde bola vytvorená.",
        "upload": "Nahrať fotografiu",
        "searching": "Identifikuje sa poloha...",
        "view": "Pohľad",
        "theme": "Téma",
        "language": "Jazyk",
        "satellite": "Satelit",
        "map": "Mapa",
        "dark": "Tmavý",
        "light": "Svetlý",
        "unknownLocation": "Polohu tejto fotografie sa nepodarilo identifikovať",
        "unknownLocationShort": "Neznáme miesto",
        "photoTakenIn": "Táto fotografia bola vytvorená v {place}",
        "methodGPS": "Poloha bola identifikovaná pomocou GPS súradníc z metadát fotografie.",
        "moreInformation": "Zistiť viac"
    },
    "sl": {
        "title": "Geolokator fotografij",
        "welcome": "Dobrodošli! Naložite fotografijo, da ugotovite, kje je bila posneta.",
        "upload": "Naloži fotografijo",
        "searching": "Prepoznavanje lokacije...",
        "view": "Pogled",
        "theme": "Tema",
        "language": "Jezik",
        "satellite": "Satelit",
        "map": "Zemljevid",
        "dark": "Temna",
        "light": "Svetla",
        "unknownLocation": "Lokacije te fotografije ni bilo mogoče določiti",
        "unknownLocationShort": "Neznana lokacija",
        "photoTakenIn": "Ta fotografija je bila posneta v {place}",
        "methodGPS": "Lokacija je bila določena z uporabo GPS-koordinat iz metapodatkov fotografije.",
        "moreInformation": "Več informacij"
    },
    "sr": {
        "title": "Геолокатор фотографија",
        "welcome": "Добро дошли! Отпремите фотографију да бисте идентификовали где је снимљена.",
        "upload": "Отпреми фотографију",
        "searching": "Идентификација локације...",
        "view": "Приказ",
        "theme": "Тема",
        "language": "Језик",
        "satellite": "Сателит",
        "map": "Мапа",
        "dark": "Тамна",
        "light": "Светла",
        "unknownLocation": "Локација ове фотографије није могла бити идентификована",
        "unknownLocationShort": "Непозната локација",
        "photoTakenIn": "Ова фотографија је снимљена у {place}",
        "methodGPS": "Локација је идентификована помоћу GPS координата из метаподатака фотографије.",
        "moreInformation": "Сазнај више"
    },
    "sv": {
        "title": "Foto-geolokator",
        "welcome": "Välkommen! Ladda upp ett foto för att identifiera var det togs.",
        "upload": "Ladda upp foto",
        "searching": "Identifierar plats...",
        "view": "Vy",
        "theme": "Tema",
        "language": "Språk",
        "satellite": "Satellit",
        "map": "Karta",
        "dark": "Mörk",
        "light": "Ljus",
        "unknownLocation": "Platsen för detta foto kunde inte identifieras",
        "unknownLocationShort": "Okänd plats",
        "photoTakenIn": "Detta foto togs i {place}",
        "methodGPS": "Platsen identifierades med hjälp av GPS-koordinater från fotots metadata.",
        "moreInformation": "Läs mer"
    },
    "ta": {
        "title": "புகைப்பட இடம் கண்டறிவி",
        "welcome": "வரவேற்கிறோம்! படம் எங்கு எடுக்கப்பட்டது என்பதை கண்டறிய ஒரு புகைப்படத்தை பதிவேற்றவும்.",
        "upload": "புகைப்படத்தை பதிவேற்று",
        "searching": "இருப்பிடம் கண்டறியப்படுகிறது...",
        "view": "காட்சி",
        "theme": "தீம்",
        "language": "மொழி",
        "satellite": "செயற்கைக்கோள்",
        "map": "வரைபடம்",
        "dark": "இருண்ட",
        "light": "ஒளிரும்",
        "unknownLocation": "இந்த புகைப்படத்தின் இருப்பிடத்தை கண்டறிய முடியவில்லை",
        "unknownLocationShort": "தெரியாத இடம்",
        "photoTakenIn": "இந்த புகைப்படம் {place} இல் எடுக்கப்பட்டது",
        "methodGPS": "புகைப்படத்தின் மெட்டாடேட்டாவில் உள்ள GPS இணைக்கோட்டுகளை பயன்படுத்தி இருப்பிடம் கண்டறியப்பட்டது.",
        "moreInformation": "மேலும் தகவல்"
    },
    "th": {
        "title": "ตัวระบุตำแหน่งภาพถ่าย",
        "welcome": "ยินดีต้อนรับ! อัปโหลดรูปภาพเพื่อระบุว่าถ่ายที่ไหน",
        "upload": "อัปโหลดรูปภาพ",
        "searching": "กำลังระบุตำแหน่ง...",
        "view": "มุมมอง",
        "theme": "ธีม",
        "language": "ภาษา",
        "satellite": "ดาวเทียม",
        "map": "แผนที่",
        "dark": "มืด",
        "light": "สว่าง",
        "unknownLocation": "ไม่สามารถระบุตำแหน่งของรูปภาพนี้ได้",
        "unknownLocationShort": "ไม่ทราบตำแหน่ง",
        "photoTakenIn": "รูปภาพนี้ถ่ายที่ {place}",
        "methodGPS": "ระบุตำแหน่งโดยใช้พิกัด GPS จากข้อมูลเมตาของรูปภาพ",
        "moreInformation": "ดูข้อมูลเพิ่มเติม"
    },
    "tr": {
        "title": "Fotoğraf konum bulucu",
        "welcome": "Hoş geldiniz! Nerede çekildiğini belirlemek için bir fotoğraf yükleyin.",
        "upload": "Fotoğraf yükle",
        "searching": "Konum belirleniyor...",
        "view": "Görünüm",
        "theme": "Tema",
        "language": "Dil",
        "satellite": "Uydu",
        "map": "Harita",
        "dark": "Koyu",
        "light": "Açık",
        "unknownLocation": "Bu fotoğrafın konumu belirlenemedi",
        "unknownLocationShort": "Bilinmeyen konum",
        "photoTakenIn": "Bu fotoğraf {place} konumunda çekildi",
        "methodGPS": "Konum, fotoğraf meta verilerindeki GPS koordinatları kullanılarak belirlendi.",
        "moreInformation": "Daha fazla bilgi"
    },
    "uk": {
        "title": "Геолокатор фотографій",
        "welcome": "Ласкаво просимо! Завантажте фотографію, щоб визначити, де її було зроблено.",
        "upload": "Завантажити фото",
        "searching": "Визначення місцезнаходження...",
        "view": "Перегляд",
        "theme": "Тема",
        "language": "Мова",
        "satellite": "Супутник",
        "map": "Карта",
        "dark": "Темна",
        "light": "Світла",
        "unknownLocation": "Не вдалося визначити місцезнаходження цієї фотографії",
        "unknownLocationShort": "Невідоме місце",
        "photoTakenIn": "Цю фотографію було зроблено в {place}",
        "methodGPS": "Місцезнаходження визначено за допомогою GPS-координат із метаданих фотографії.",
        "moreInformation": "Дізнатися більше"
    },
    "ur": {
        "title": "تصویر جغرافیائی محل معلوم کرنے والا",
        "welcome": "خوش آمدید! یہ معلوم کرنے کے لیے ایک تصویر اپ لوڈ کریں کہ یہ کہاں لی گئی تھی۔",
        "upload": "تصویر اپ لوڈ کریں",
        "searching": "مقام کی شناخت کی جا رہی ہے...",
        "view": "دیکھیں",
        "theme": "تھیم",
        "language": "زبان",
        "satellite": "سیٹلائٹ",
        "map": "نقشہ",
        "dark": "گہرا",
        "light": "ہلکا",
        "unknownLocation": "اس تصویر کا مقام معلوم نہیں ہو سکا",
        "unknownLocationShort": "نامعلوم مقام",
        "photoTakenIn": "یہ تصویر {place} میں لی گئی تھی",
        "methodGPS": "تصویر کے میٹا ڈیٹا میں موجود GPS نقاط استعمال کرکے مقام کی شناخت کی گئی۔",
        "moreInformation": "مزید معلومات"
    },
    "vi": {
        "title": "Trình định vị ảnh",
        "welcome": "Chào mừng! Tải lên một bức ảnh để xác định nơi nó được chụp.",
        "upload": "Tải ảnh lên",
        "searching": "Đang xác định vị trí...",
        "view": "Chế độ xem",
        "theme": "Giao diện",
        "language": "Ngôn ngữ",
        "satellite": "Vệ tinh",
        "map": "Bản đồ",
        "dark": "Tối",
        "light": "Sáng",
        "unknownLocation": "Không thể xác định vị trí của bức ảnh này",
        "unknownLocationShort": "Vị trí không xác định",
        "photoTakenIn": "Bức ảnh này được chụp tại {place}",
        "methodGPS": "Vị trí được xác định bằng tọa độ GPS từ siêu dữ liệu của ảnh.",
        "moreInformation": "Tìm hiểu thêm"
    },
    "zh": {
        "title": "照片地理定位器",
        "welcome": "欢迎！上传一张照片以识别拍摄地点。",
        "upload": "上传照片",
        "searching": "正在识别位置...",
        "view": "视图",
        "theme": "主题",
        "language": "语言",
        "satellite": "卫星",
        "map": "地图",
        "dark": "深色",
        "light": "浅色",
        "unknownLocation": "无法识别这张照片的位置",
        "unknownLocationShort": "未知位置",
        "photoTakenIn": "这张照片拍摄于{place}",
        "methodGPS": "使用照片元数据中的 GPS 坐标识别了位置。",
        "moreInformation": "了解更多"
    }
}

// For Wikipedia links that appear inside fetched article excerpts.
const READ_MORE_TRANSLATIONS = {
    en: "Read more",
    ar: "اقرأ المزيد",
    bg: "Прочетете още",
    bn: "আরও পড়ুন",
    cs: "Číst dál",
    da: "Læs mere",
    de: "Mehr lesen",
    el: "Διαβάστε περισσότερα",
    es: "Leer más",
    et: "Loe edasi",
    fa: "بیشتر بخوانید",
    fi: "Lue lisää",
    fr: "Lire la suite",
    he: "קרא עוד",
    hi: "और पढ़ें",
    hr: "Pročitajte više",
    hu: "Tovább olvasom",
    id: "Baca selengkapnya",
    is: "Lesa meira",
    it: "Leggi di più",
    ja: "続きを読む",
    ko: "더 읽기",
    lt: "Skaityti daugiau",
    lv: "Lasīt vairāk",
    nl: "Meer lezen",
    no: "Les mer",
    pl: "Czytaj więcej",
    pt: "Ler mais",
    ro: "Citește mai mult",
    ru: "Читать далее",
    sk: "Čítať ďalej",
    sl: "Preberi več",
    sr: "Прочитај више",
    sv: "Läs mer",
    ta: "மேலும் படிக்க",
    th: "อ่านเพิ่มเติม",
    tr: "Devamını oku",
    uk: "Читати далі",
    ur: "مزید پڑھیں",
    vi: "Đọc thêm",
    zh: "继续阅读"
};

// Short unit labels used when metric and imperial values are toggled in the geo panel.
const UNIT_TRANSLATIONS = {
    en: { m: "m", km: "km", mi: "mi", ft: "ft" },
    ar: { m: "م", km: "كم", mi: "ميل", ft: "قدم" },
    bg: { m: "м", km: "км", mi: "ми", ft: "фт" },
    bn: { m: "মি", km: "কিমি", mi: "মাইল", ft: "ফুট" },
    cs: { m: "m", km: "km", mi: "mi", ft: "ft" },
    da: { m: "m", km: "km", mi: "mi", ft: "ft" },
    de: { m: "m", km: "km", mi: "mi", ft: "ft" },
    el: { m: "μ", km: "χλμ", mi: "μίλια", ft: "πόδια" },
    es: { m: "m", km: "km", mi: "mi", ft: "pies" },
    et: { m: "m", km: "km", mi: "mi", ft: "ft" },
    fa: { m: "م", km: "کم", mi: "مایل", ft: "فوت" },
    fi: { m: "m", km: "km", mi: "mi", ft: "ft" },
    fr: { m: "m", km: "km", mi: "mi", ft: "pi" },
    he: { m: "מ׳", km: "ק״מ", mi: "מייל", ft: "רגל" },
    hi: { m: "मी", km: "किमी", mi: "मील", ft: "फुट" },
    hr: { m: "m", km: "km", mi: "mi", ft: "ft" },
    hu: { m: "m", km: "km", mi: "mi", ft: "ft" },
    id: { m: "m", km: "km", mi: "mi", ft: "ft" },
    is: { m: "m", km: "km", mi: "mi", ft: "ft" },
    it: { m: "m", km: "km", mi: "mi", ft: "ft" },
    ja: { m: "m", km: "km", mi: "マイル", ft: "フィート" },
    ko: { m: "m", km: "km", mi: "마일", ft: "피트" },
    lt: { m: "m", km: "km", mi: "mi", ft: "pėd." },
    lv: { m: "m", km: "km", mi: "jūdzes", ft: "pēdas" },
    nl: { m: "m", km: "km", mi: "mi", ft: "ft" },
    no: { m: "m", km: "km", mi: "mi", ft: "ft" },
    pl: { m: "m", km: "km", mi: "mile", ft: "stopy" },
    pt: { m: "m", km: "km", mi: "mi", ft: "pés" },
    ro: { m: "m", km: "km", mi: "mi", ft: "ft" },
    ru: { m: "м", km: "км", mi: "мили", ft: "футы" },
    sk: { m: "m", km: "km", mi: "mi", ft: "ft" },
    sl: { m: "m", km: "km", mi: "mi", ft: "ft" },
    sr: { m: "м", km: "км", mi: "миље", ft: "стопе" },
    sv: { m: "m", km: "km", mi: "mi", ft: "ft" },
    ta: { m: "மீ", km: "கிமீ", mi: "மைல்", ft: "அடி" },
    th: { m: "ม.", km: "กม.", mi: "ไมล์", ft: "ฟุต" },
    tr: { m: "m", km: "km", mi: "mil", ft: "ft" },
    uk: { m: "м", km: "км", mi: "милі", ft: "фути" },
    ur: { m: "m", km: "km", mi: "میل", ft: "فٹ" },
    vi: { m: "m", km: "km", mi: "dặm", ft: "ft" },
    zh: { m: "米", km: "公里", mi: "英里", ft: "英尺" }
};

// Cardinal direction labels for DMS coordinates. These stay compact so coordinates remain readable.
const COORDINATE_TRANSLATIONS = {
    en: { N: "N", S: "S", E: "E", W: "W" },
    ar: { N: "N", S: "S", E: "E", W: "W" },
    bg: { N: "С", S: "Ю", E: "И", W: "З" },
    bn: { N: "N", S: "S", E: "E", W: "W" },
    cs: { N: "S", S: "J", E: "V", W: "Z" },
    da: { N: "N", S: "S", E: "Ø", W: "V" },
    de: { N: "N", S: "S", E: "O", W: "W" },
    el: { N: "Β", S: "Ν", E: "Α", W: "Δ" },
    es: { N: "N", S: "S", E: "E", W: "O" },
    et: { N: "N", S: "S", E: "E", W: "W" },
    fa: { N: "N", S: "S", E: "E", W: "W" },
    fi: { N: "P", S: "E", E: "I", W: "L" },
    fr: { N: "N", S: "S", E: "E", W: "O" },
    he: { N: "N", S: "S", E: "E", W: "W" },
    hi: { N: "N", S: "S", E: "E", W: "W" },
    hr: { N: "S", S: "J", E: "I", W: "Z" },
    hu: { N: "É", S: "D", E: "K", W: "Ny" },
    id: { N: "U", S: "S", E: "T", W: "B" },
    is: { N: "N", S: "S", E: "A", W: "V" },
    it: { N: "N", S: "S", E: "E", W: "O" },
    ja: { N: "北", S: "南", E: "東", W: "西" },
    ko: { N: "북", S: "남", E: "동", W: "서" },
    lt: { N: "Š", S: "P", E: "R", W: "V" },
    lv: { N: "Z", S: "D", E: "A", W: "R" },
    nl: { N: "N", S: "Z", E: "O", W: "W" },
    no: { N: "N", S: "S", E: "Ø", W: "V" },
    pl: { N: "N", S: "S", E: "E", W: "W" },
    pt: { N: "N", S: "S", E: "L", W: "O" },
    ro: { N: "N", S: "S", E: "E", W: "V" },
    ru: { N: "С", S: "Ю", E: "В", W: "З" },
    sk: { N: "S", S: "J", E: "V", W: "Z" },
    sl: { N: "S", S: "J", E: "V", W: "Z" },
    sr: { N: "С", S: "Ј", E: "И", W: "З" },
    sv: { N: "N", S: "S", E: "Ö", W: "V" },
    ta: { N: "N", S: "S", E: "E", W: "W" },
    th: { N: "N", S: "S", E: "E", W: "W" },
    tr: { N: "K", S: "G", E: "D", W: "B" },
    uk: { N: "Пн", S: "Пд", E: "Сх", W: "Зх" },
    ur: { N: "N", S: "S", E: "E", W: "W" },
    vi: { N: "B", S: "N", E: "Đ", W: "T" },
    zh: { N: "北", S: "南", E: "东", W: "西" }
};

// Distance sentence templates. The formatted number and unit are inserted as {distance}.
const DISTANCE_TRANSLATIONS = {
    en: "{distance} from you",
    ar: "على بُعد {distance} منك",
    bg: "на {distance} от вас",
    bn: "আপনার থেকে {distance} দূরে",
    cs: "{distance} od vás",
    da: "{distance} fra dig",
    de: "{distance} von dir entfernt",
    el: "{distance} από εσάς",
    es: "a {distance} de ti",
    et: "{distance} sinust",
    fa: "{distance} از شما فاصله دارد",
    fi: "{distance} päässä sinusta",
    fr: "à {distance} de vous",
    he: "{distance} ממך",
    hi: "आपसे {distance} दूर",
    hr: "{distance} od vas",
    hu: "{distance} távolságra tőled",
    id: "{distance} dari Anda",
    is: "{distance} frá þér",
    it: "a {distance} da te",
    ja: "あなたから{distance}",
    ko: "현재 위치에서 {distance}",
    lt: "{distance} nuo jūsų",
    lv: "{distance} no jums",
    nl: "{distance} van jou",
    no: "{distance} fra deg",
    pl: "{distance} od Ciebie",
    pt: "a {distance} de você",
    ro: "la {distance} de tine",
    ru: "{distance} от вас",
    sk: "{distance} od vás",
    sl: "{distance} od vas",
    sr: "{distance} од вас",
    sv: "{distance} från dig",
    ta: "உங்களிடமிருந்து {distance} தொலைவில்",
    th: "ห่างจากคุณ {distance}",
    tr: "senden {distance} uzakta",
    uk: "{distance} від вас",
    ur: "آپ سے {distance} دور",
    vi: "cách bạn {distance}",
    zh: "距您{distance}"
};

// UN M49 continent codes mapped to display names for the country card.
const CONTINENT_TRANSLATIONS = {
    en: { "002": "Africa", "019": "Americas", "142": "Asia", "150": "Europe", "009": "Oceania", "010": "Antarctica" },
    ar: { "002": "إفريقيا", "019": "الأمريكتان", "142": "آسيا", "150": "أوروبا", "009": "أوقيانوسيا", "010": "أنتاركتيكا" },
    bg: { "002": "Африка", "019": "Америка", "142": "Азия", "150": "Европа", "009": "Океания", "010": "Антарктида" },
    bn: { "002": "আফ্রিকা", "019": "আমেরিকা", "142": "এশিয়া", "150": "ইউরোপ", "009": "ওশেনিয়া", "010": "অ্যান্টার্কটিকা" },
    cs: { "002": "Afrika", "019": "Amerika", "142": "Asie", "150": "Evropa", "009": "Oceánie", "010": "Antarktida" },
    da: { "002": "Afrika", "019": "Amerika", "142": "Asien", "150": "Europa", "009": "Oceanien", "010": "Antarktis" },
    de: { "002": "Afrika", "019": "Amerika", "142": "Asien", "150": "Europa", "009": "Ozeanien", "010": "Antarktis" },
    el: { "002": "Αφρική", "019": "Αμερική", "142": "Ασία", "150": "Ευρώπη", "009": "Ωκεανία", "010": "Ανταρκτική" },
    es: { "002": "África", "019": "Américas", "142": "Asia", "150": "Europa", "009": "Oceanía", "010": "Antártida" },
    et: { "002": "Aafrika", "019": "Ameerika", "142": "Aasia", "150": "Euroopa", "009": "Okeaania", "010": "Antarktika" },
    fa: { "002": "آفریقا", "019": "قاره آمریکا", "142": "آسیا", "150": "اروپا", "009": "اقیانوسیه", "010": "جنوبگان" },
    fi: { "002": "Afrikka", "019": "Amerikka", "142": "Aasia", "150": "Eurooppa", "009": "Oseania", "010": "Etelämanner" },
    fr: { "002": "Afrique", "019": "Amériques", "142": "Asie", "150": "Europe", "009": "Océanie", "010": "Antarctique" },
    he: { "002": "אפריקה", "019": "אמריקה", "142": "אסיה", "150": "אירופה", "009": "אוקיאניה", "010": "אנטארקטיקה" },
    hi: { "002": "अफ़्रीका", "019": "अमेरिका", "142": "एशिया", "150": "यूरोप", "009": "ओशिआनिया", "010": "अंटार्कटिका" },
    hr: { "002": "Afrika", "019": "Amerika", "142": "Azija", "150": "Europa", "009": "Oceanija", "010": "Antarktika" },
    hu: { "002": "Afrika", "019": "Amerika", "142": "Ázsia", "150": "Európa", "009": "Óceánia", "010": "Antarktisz" },
    id: { "002": "Afrika", "019": "Amerika", "142": "Asia", "150": "Eropa", "009": "Oseania", "010": "Antarktika" },
    is: { "002": "Afríka", "019": "Ameríka", "142": "Asía", "150": "Evrópa", "009": "Eyjaálfa", "010": "Suðurskautslandið" },
    it: { "002": "Africa", "019": "Americhe", "142": "Asia", "150": "Europa", "009": "Oceania", "010": "Antartide" },
    ja: { "002": "アフリカ", "019": "アメリカ大陸", "142": "アジア", "150": "ヨーロッパ", "009": "オセアニア", "010": "南極" },
    ko: { "002": "아프리카", "019": "아메리카", "142": "아시아", "150": "유럽", "009": "오세아니아", "010": "남극" },
    lt: { "002": "Afrika", "019": "Amerika", "142": "Azija", "150": "Europa", "009": "Okeanija", "010": "Antarktida" },
    lv: { "002": "Āfrika", "019": "Amerika", "142": "Āzija", "150": "Eiropa", "009": "Okeānija", "010": "Antarktīda" },
    nl: { "002": "Afrika", "019": "Amerika", "142": "Azië", "150": "Europa", "009": "Oceanië", "010": "Antarctica" },
    no: { "002": "Afrika", "019": "Amerika", "142": "Asia", "150": "Europa", "009": "Oseania", "010": "Antarktis" },
    pl: { "002": "Afryka", "019": "Ameryka", "142": "Azja", "150": "Europa", "009": "Oceania", "010": "Antarktyda" },
    pt: { "002": "África", "019": "Américas", "142": "Ásia", "150": "Europa", "009": "Oceania", "010": "Antártida" },
    ro: { "002": "Africa", "019": "America", "142": "Asia", "150": "Europa", "009": "Oceania", "010": "Antarctica" },
    ru: { "002": "Африка", "019": "Америка", "142": "Азия", "150": "Европа", "009": "Океания", "010": "Антарктида" },
    sk: { "002": "Afrika", "019": "Amerika", "142": "Ázia", "150": "Európa", "009": "Oceánia", "010": "Antarktída" },
    sl: { "002": "Afrika", "019": "Amerika", "142": "Azija", "150": "Evropa", "009": "Oceanija", "010": "Antarktika" },
    sr: { "002": "Африка", "019": "Америка", "142": "Азија", "150": "Европа", "009": "Океанија", "010": "Антарктик" },
    sv: { "002": "Afrika", "019": "Amerika", "142": "Asien", "150": "Europa", "009": "Oceanien", "010": "Antarktis" },
    ta: { "002": "ஆப்பிரிக்கா", "019": "அமெரிக்கா", "142": "ஆசியா", "150": "ஐரோப்பா", "009": "ஓஷியானியா", "010": "அண்டார்டிகா" },
    th: { "002": "แอฟริกา", "019": "อเมริกา", "142": "เอเชีย", "150": "ยุโรป", "009": "โอเชียเนีย", "010": "แอนตาร์กติกา" },
    tr: { "002": "Afrika", "019": "Amerika", "142": "Asya", "150": "Avrupa", "009": "Okyanusya", "010": "Antarktika" },
    uk: { "002": "Африка", "019": "Америка", "142": "Азія", "150": "Європа", "009": "Океанія", "010": "Антарктида" },
    ur: { "002": "افریقہ", "019": "امریکہ", "142": "ایشیا", "150": "یورپ", "009": "اوشیانا", "010": "انٹارکٹیکا" },
    vi: { "002": "Châu Phi", "019": "Châu Mỹ", "142": "Châu Á", "150": "Châu Âu", "009": "Châu Đại Dương", "010": "Châu Nam Cực" },
    zh: { "002": "非洲", "019": "美洲", "142": "亚洲", "150": "欧洲", "009": "大洋洲", "010": "南极洲" }
};

// User-facing errors
const ERROR_TRANSLATIONS = {
    en: {
        network: "Network error. Please try again.",
        file: "Please upload a JPG or PNG image file."
    },
    ar: {
        network: "حدث خطأ في الشبكة. يُرجى المحاولة مرة أخرى.",
        file: "يُرجى تحميل ملف صورة بصيغة JPG أو PNG."
    },
    bg: {
        network: "Грешка в мрежата. Моля, опитайте отново.",
        file: "Моля, качете файл с изображение във формат JPG или PNG."
    },
    bn: {
        network: "নেটওয়ার্ক ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        file: "অনুগ্রহ করে JPG বা PNG ছবি ফাইল আপলোড করুন।"
    },
    cs: {
        network: "Chyba sítě. Zkuste to prosím znovu.",
        file: "Nahrajte prosím soubor obrázku ve formátu JPG nebo PNG."
    },
    da: {
        network: "Netværksfejl. Prøv igen.",
        file: "Upload venligst en billedfil i JPG- eller PNG-format."
    },
    de: {
        network: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
        file: "Bitte laden Sie eine Bilddatei im JPG- oder PNG-Format hoch."
    },
    el: {
        network: "Σφάλμα δικτύου. Δοκιμάστε ξανά.",
        file: "Ανεβάστε ένα αρχείο εικόνας σε μορφή JPG ή PNG."
    },
    es: {
        network: "Error de red. Inténtalo de nuevo.",
        file: "Sube un archivo de imagen en formato JPG o PNG."
    },
    et: {
        network: "Võrguviga. Palun proovige uuesti.",
        file: "Palun laadige üles JPG- või PNG-vormingus pildifail."
    },
    fa: {
        network: "خطای شبکه. لطفاً دوباره تلاش کنید.",
        file: "لطفاً یک فایل تصویر با فرمت JPG یا PNG بارگذاری کنید."
    },
    fi: {
        network: "Verkkovirhe. Yritä uudelleen.",
        file: "Lataa JPG- tai PNG-muotoinen kuvatiedosto."
    },
    fr: {
        network: "Erreur réseau. Veuillez réessayer.",
        file: "Veuillez télécharger un fichier image au format JPG ou PNG."
    },
    he: {
        network: "שגיאת רשת. נסה שוב.",
        file: "נא להעלות קובץ תמונה בפורמט JPG או PNG."
    },
    hi: {
        network: "नेटवर्क त्रुटि। कृपया फिर से प्रयास करें।",
        file: "कृपया JPG या PNG प्रारूप वाली छवि फ़ाइल अपलोड करें।"
    },
    hr: {
        network: "Mrežna pogreška. Pokušajte ponovno.",
        file: "Prenesite slikovnu datoteku u JPG ili PNG formatu."
    },
    hu: {
        network: "Hálózati hiba. Kérjük, próbálja újra.",
        file: "Kérjük, töltsön fel JPG vagy PNG formátumú képfájlt."
    },
    id: {
        network: "Kesalahan jaringan. Silakan coba lagi.",
        file: "Silakan unggah file gambar dalam format JPG atau PNG."
    },
    is: {
        network: "Netvilla. Reyndu aftur.",
        file: "Hladdu upp myndskrá á JPG- eða PNG-sniði."
    },
    it: {
        network: "Errore di rete. Riprova.",
        file: "Carica un file immagine in formato JPG o PNG."
    },
    ja: {
        network: "ネットワークエラーです。もう一度お試しください。",
        file: "JPGまたはPNG形式の画像ファイルをアップロードしてください。"
    },
    ko: {
        network: "네트워크 오류입니다. 다시 시도해 주세요.",
        file: "JPG 또는 PNG 형식의 이미지 파일을 업로드해 주세요."
    },
    lt: {
        network: "Tinklo klaida. Bandykite dar kartą.",
        file: "Įkelkite JPG arba PNG formato vaizdo failą."
    },
    lv: {
        network: "Tīkla kļūda. Lūdzu, mēģiniet vēlreiz.",
        file: "Lūdzu, augšupielādējiet JPG vai PNG formāta attēla failu."
    },
    nl: {
        network: "Netwerkfout. Probeer het opnieuw.",
        file: "Upload een afbeeldingsbestand in JPG- of PNG-formaat."
    },
    no: {
        network: "Nettverksfeil. Prøv igjen.",
        file: "Last opp en bildefil i JPG- eller PNG-format."
    },
    pl: {
        network: "Błąd sieci. Spróbuj ponownie.",
        file: "Prześlij plik obrazu w formacie JPG lub PNG."
    },
    pt: {
        network: "Erro de rede. Tente novamente.",
        file: "Envie um arquivo de imagem no formato JPG ou PNG."
    },
    ro: {
        network: "Eroare de rețea. Încercați din nou.",
        file: "Încărcați un fișier imagine în format JPG sau PNG."
    },
    ru: {
        network: "Ошибка сети. Повторите попытку.",
        file: "Загрузите файл изображения в формате JPG или PNG."
    },
    sk: {
        network: "Chyba siete. Skúste to znova.",
        file: "Nahrajte súbor obrázka vo formáte JPG alebo PNG."
    },
    sl: {
        network: "Napaka omrežja. Poskusite znova.",
        file: "Naložite slikovno datoteko v formatu JPG ali PNG."
    },
    sr: {
        network: "Грешка са мрежом. Покушајте поново.",
        file: "Отпремите датотеку слике у JPG или PNG формату."
    },
    sv: {
        network: "Nätverksfel. Försök igen.",
        file: "Ladda upp en bildfil i JPG- eller PNG-format."
    },
    ta: {
        network: "நெட்வொர்க் பிழை. மீண்டும் முயற்சிக்கவும்.",
        file: "JPG அல்லது PNG வடிவிலான படக் கோப்பைப் பதிவேற்றவும்."
    },
    th: {
        network: "เกิดข้อผิดพลาดของเครือข่าย โปรดลองอีกครั้ง",
        file: "โปรดอัปโหลดไฟล์รูปภาพในรูปแบบ JPG หรือ PNG"
    },
    tr: {
        network: "Ağ hatası. Lütfen tekrar deneyin.",
        file: "Lütfen JPG veya PNG formatında bir görsel dosyası yükleyin."
    },
    uk: {
        network: "Помилка мережі. Спробуйте ще раз.",
        file: "Завантажте файл зображення у форматі JPG або PNG."
    },
    ur: {
        network: "نیٹ ورک کی خرابی۔ براہِ کرم دوبارہ کوشش کریں۔",
        file: "براہِ کرم JPG یا PNG فارمیٹ کی تصویری فائل اپ لوڈ کریں۔"
    },
    vi: {
        network: "Lỗi mạng. Vui lòng thử lại.",
        file: "Vui lòng tải lên tệp hình ảnh ở định dạng JPG hoặc PNG."
    },
    zh: {
        network: "网络错误。请重试。",
        file: "请上传 JPG 或 PNG 格式的图片文件。"
    }
};

// Text for the locate-user button hint
const LOCATE_HINT_TRANSLATIONS = {
    en: "Click to show distance from you",
    ar: "انقر لعرض المسافة منك",
    bg: "Щракнете, за да видите разстоянието от вас",
    bn: "আপনার থেকে দূরত্ব দেখতে ক্লিক করুন",
    cs: "Kliknutím zobrazíte vzdálenost od vás",
    da: "Klik for at vise afstanden fra dig",
    de: "Klicken, um die Entfernung von dir anzuzeigen",
    el: "Κάντε κλικ για να δείτε την απόσταση από εσάς",
    es: "Haz clic para ver la distancia desde ti",
    et: "Klõpsa, et näha kaugust sinust",
    fa: "برای نمایش فاصله از شما کلیک کنید",
    fi: "Näytä etäisyys sinusta napsauttamalla",
    fr: "Cliquez pour afficher la distance qui vous sépare de ce lieu",
    he: "לחצו כדי להציג את המרחק ממך",
    hi: "आपसे दूरी दिखाने के लिए क्लिक करें",
    hr: "Kliknite za prikaz udaljenosti od vas",
    hu: "Kattintson a távolság megjelenítéséhez",
    id: "Klik untuk menampilkan jarak dari Anda",
    is: "Smelltu til að sýna fjarlægðina frá þér",
    it: "Clicca per mostrare la distanza da te",
    ja: "あなたからの距離を表示するにはクリック",
    ko: "내 위치로부터의 거리를 보려면 클릭하세요",
    lt: "Spustelėkite, kad matytumėte atstumą nuo jūsų",
    lv: "Noklikšķiniet, lai parādītu attālumu no jums",
    nl: "Klik om de afstand vanaf jou te tonen",
    no: "Klikk for å vise avstanden fra deg",
    pl: "Kliknij, aby pokazać odległość od Ciebie",
    pt: "Clique para mostrar a distância de você",
    ro: "Faceți clic pentru a afișa distanța față de dvs.",
    ru: "Нажмите, чтобы показать расстояние от вас",
    sk: "Kliknutím zobrazíte vzdialenosť od vás",
    sl: "Kliknite za prikaz razdalje od vas",
    sr: "Кликните да прикажете удаљеност од вас",
    sv: "Klicka för att visa avståndet från dig",
    ta: "உங்களிடமிருந்து உள்ள தூரத்தைக் காட்ட கிளிக் செய்யவும்",
    th: "คลิกเพื่อแสดงระยะทางจากคุณ",
    tr: "Sizden olan mesafeyi göstermek için tıklayın",
    uk: "Натисніть, щоб показати відстань від вас",
    ur: "آپ سے فاصلہ دکھانے کے لیے کلک کریں",
    vi: "Nhấp để hiển thị khoảng cách từ bạn",
    zh: "点击显示与你的距离"
};

/*
 * Extra prompt instructions appended to the AI request.
 *
 * The image may contain signs or text in a different language from the UI. These
 * instructions tell the model to keep user-facing fields in the selected UI
 * language anyway, while the place field remains English for geocoding.
 */
const languageInstructions = {
    en: "Respond with field values in English ONLY. Do not switch to any other language regardless of what text, signage, or visual context appears in the image. The user has selected English.",

    ar: "أجب بقيم الحقول باللغة العربية فقط. لا تنتقل إلى أي لغة أخرى مهما ظهر من نصوص أو لافتات أو سياق بصري في الصورة. لقد اختار المستخدم اللغة العربية.",

    bg: "Отговаряй със стойностите на полетата само на български. Не преминавай към друг език независимо от текста, табелите или визуалния контекст в изображението. Потребителят е избрал български език.",

    bn: "শুধুমাত্র বাংলায় ক্ষেত্রগুলোর মান প্রদান করুন। ছবিতে যেকোনো লেখা, সাইনবোর্ড বা ভিজ্যুয়াল প্রেক্ষাপট দেখা গেলেও অন্য কোনো ভাষায় পরিবর্তন করবেন না। ব্যবহারকারী বাংলা নির্বাচন করেছেন।",

    cs: "Odpovídej hodnotami polí pouze v češtině. Nepřepínej do jiného jazyka bez ohledu na text, značky nebo vizuální kontext na obrázku. Uživatel si vybral češtinu.",

    da: "Svar kun med felternes værdier på dansk. Skift ikke til noget andet sprog uanset tekst, skilte eller visuel kontekst i billedet. Brugeren har valgt dansk.",

    de: "Antworte mit den Feldwerten ausschließlich auf Deutsch. Wechsle nicht in eine andere Sprache, unabhängig davon, welcher Text, welche Beschilderung oder welcher visuelle Kontext im Bild erscheint. Der Nutzer hat Deutsch ausgewählt.",

    el: "Απάντησε με τις τιμές των πεδίων μόνο στα ελληνικά. Μην αλλάξεις σε άλλη γλώσσα ανεξάρτητα από το κείμενο, τις πινακίδες ή το οπτικό περιεχόμενο της εικόνας. Ο χρήστης έχει επιλέξει ελληνικά.",

    es: "Responde con los valores de los campos únicamente en español. No cambies a ningún otro idioma independientemente del texto, señales o contexto visual que aparezca en la imagen. El usuario ha seleccionado español.",

    et: "Vasta väljade väärtustega ainult eesti keeles. Ära vaheta teise keele peale olenemata sellest, milline tekst, märgistus või visuaalne kontekst pildil on. Kasutaja valis eesti keele.",

    fa: "فقط با مقادیر فیلدها به زبان فارسی پاسخ بده. صرف‌نظر از هر متن، تابلو یا محتوای تصویری موجود در تصویر، به زبان دیگری تغییر نده. کاربر زبان فارسی را انتخاب کرده است.",

    fi: "Vastaa kenttien arvoilla vain suomeksi. Älä vaihda mihinkään muuhun kieleen riippumatta siitä, mitä tekstiä, kylttejä tai visuaalista sisältöä kuvassa näkyy. Käyttäjä on valinnut suomen kielen.",

    fr: "Réponds avec les valeurs des champs uniquement en français. Ne passe à aucune autre langue, quel que soit le texte, les panneaux ou le contexte visuel présents dans l’image. L’utilisateur a sélectionné le français.",

    he: "השב עם ערכי השדות בעברית בלבד. אל תעבור לשפה אחרת ללא קשר לטקסט, לשילוט או להקשר החזותי שמופיעים בתמונה. המשתמש בחר בעברית.",

    hi: "फ़ील्ड के मान केवल हिंदी में दें। चित्र में चाहे कोई भी पाठ, संकेत या दृश्य संदर्भ दिखाई दे, किसी अन्य भाषा में स्विच न करें। उपयोगकर्ता ने हिंदी चुनी है।",

    hr: "Odgovori vrijednostima polja samo na hrvatskom jeziku. Nemoj prelaziti na drugi jezik bez obzira na tekst, znakove ili vizualni kontekst na slici. Korisnik je odabrao hrvatski.",

    hu: "A mezők értékeivel kizárólag magyarul válaszolj. Ne válts más nyelvre, függetlenül attól, milyen szöveg, felirat vagy vizuális környezet látható a képen. A felhasználó a magyart választotta.",

    id: "Berikan nilai field hanya dalam bahasa Indonesia. Jangan beralih ke bahasa lain apa pun teks, tanda, atau konteks visual yang muncul pada gambar. Pengguna telah memilih bahasa Indonesia.",

    is: "Svaraðu með gildum reitanna eingöngu á íslensku. Ekki skipta yfir á annað tungumál óháð texta, skiltum eða sjónrænu samhengi á myndinni. Notandinn hefur valið íslensku.",

    it: "Rispondi con i valori dei campi solo in italiano. Non passare a nessun'altra lingua indipendentemente dal testo, dalla segnaletica o dal contesto visivo presenti nell'immagine. L'utente ha selezionato l'italiano.",

    ja: "フィールドの値は日本語のみで回答してください。画像内にどのような文字、標識、視覚的な情報が含まれていても、他の言語に切り替えないでください。ユーザーは日本語を選択しています。",

    ko: "필드 값은 한국어로만 응답하세요. 이미지에 어떤 텍스트, 표지판 또는 시각적 맥락이 나타나더라도 다른 언어로 전환하지 마세요. 사용자가 한국어를 선택했습니다.",

    lt: "Atsakyk laukų reikšmėmis tik lietuvių kalba. Nepereik į kitą kalbą, nepaisant paveikslėlyje esančio teksto, ženklų ar vaizdinio konteksto. Vartotojas pasirinko lietuvių kalbą.",

    lv: "Atbildi ar lauku vērtībām tikai latviešu valodā. Nepārslēdzies uz citu valodu neatkarīgi no attēlā redzamā teksta, zīmēm vai vizuālā konteksta. Lietotājs ir izvēlējies latviešu valodu.",

    nl: "Antwoord uitsluitend met de veldwaarden in het Nederlands. Schakel niet over naar een andere taal, ongeacht welke tekst, borden of visuele context in de afbeelding verschijnen. De gebruiker heeft Nederlands geselecteerd.",

    no: "Svar kun med feltverdiene på norsk. Ikke bytt til noe annet språk uansett hvilken tekst, skilting eller visuell kontekst som vises i bildet. Brukeren har valgt norsk.",

    pl: "Odpowiadaj wartościami pól wyłącznie po polsku. Nie przełączaj się na inny język niezależnie od tekstu, znaków lub kontekstu wizualnego widocznego na obrazie. Użytkownik wybrał język polski.",

    pt: "Responda com os valores dos campos somente em português brasileiro. Não mude para nenhum outro idioma, independentemente do texto, das placas ou do contexto visual presentes na imagem. O usuário selecionou português brasileiro.",

    ro: "Răspunde cu valorile câmpurilor numai în limba română. Nu trece la altă limbă indiferent de textul, semnele sau contextul vizual din imagine. Utilizatorul a selectat limba română.",

    ru: "Отвечай значениями полей только на русском языке. Не переключайся на другой язык независимо от текста, вывесок или визуального контекста на изображении. Пользователь выбрал русский язык.",

    sk: "Odpovedaj hodnotami polí iba v slovenčine. Neprepínaj sa do iného jazyka bez ohľadu na text, značky alebo vizuálny kontext na obrázku. Používateľ si vybral slovenčinu.",

    sl: "Odgovori z vrednostmi polj samo v slovenščini. Ne preklapljaj v drug jezik ne glede na besedilo, znake ali vizualni kontekst na sliki. Uporabnik je izbral slovenščino.",

    sr: "Одговори вредностима поља искључиво на српском језику. Не прелази на други језик без обзира на текст, знакове или визуелни контекст на слици. Корисник је изабрао српски језик.",

    sv: "Svara endast med fältvärdena på svenska. Byt inte till något annat språk oavsett vilken text, skyltning eller visuell kontext som visas i bilden. Användaren har valt svenska.",

    ta: "புலங்களின் மதிப்புகளை தமிழில் மட்டும் பதிலளிக்கவும். படத்தில் எந்த உரை, பலகை அல்லது காட்சி சூழல் இருந்தாலும் வேறு மொழிக்கு மாற வேண்டாம். பயனர் தமிழைத் தேர்ந்தெடுத்துள்ளார்.",

    th: "ตอบกลับค่าของฟิลด์เป็นภาษาไทยเท่านั้น ห้ามเปลี่ยนเป็นภาษาอื่นไม่ว่าภาพจะมีข้อความ ป้าย หรือบริบททางภาพใด ๆ ผู้ใช้ได้เลือกภาษาไทยไว้แล้ว",

    tr: "Alan değerleriyle yalnızca Türkçe olarak yanıt ver. Görselde hangi metin, tabela veya görsel bağlam bulunursa bulunsun başka bir dile geçme. Kullanıcı Türkçeyi seçti.",

    uk: "Відповідай значеннями полів лише українською мовою. Не переходь на іншу мову незалежно від тексту, знаків чи візуального контексту на зображенні. Користувач обрав українську мову.",

    ur: "فیلڈز کی قدریں صرف اردو میں فراہم کریں۔ تصویر میں چاہے کوئی بھی متن، سائن یا بصری سیاق موجود ہو، کسی دوسری زبان میں تبدیل نہ ہوں۔ صارف نے اردو منتخب کی ہے۔",

    vi: "Trả lời với các giá trị trường chỉ bằng tiếng Việt. Không chuyển sang bất kỳ ngôn ngữ nào khác bất kể văn bản, biển báo hay ngữ cảnh hình ảnh xuất hiện trong ảnh. Người dùng đã chọn tiếng Việt.",

    zh: "请仅使用中文填写字段值。无论图片中出现什么文字、标识或视觉内容，都不要切换到其他语言。用户已选择中文。",
};

/**
 * Returns a core UI label in the active language.
 * Falls back to English so missing keys do not leak undefined into the page.
 */
function translate(key) {
    return TRANSLATIONS[uiLang][key] || TRANSLATIONS.en[key] || key;
}

/**
 * Returns a compact unit label for metric or imperial values.
 * Unit strings are handled separately from normal UI text because they need to
 * stay short inside the geo info cards.
 */
function unit(key) {
    return (UNIT_TRANSLATIONS[uiLang] && UNIT_TRANSLATIONS[uiLang][key])
        || UNIT_TRANSLATIONS.en[key]
        || key;
}

/**
 * Returns the localized cardinal direction used in DMS coordinates.
 * This keeps coordinate formatting language-aware without duplicating the full
 * coordinate formatter for every language.
 */
function coord(key) {
    return (COORDINATE_TRANSLATIONS[uiLang] && COORDINATE_TRANSLATIONS[uiLang][key])
        || COORDINATE_TRANSLATIONS.en[key]
        || key;
}

// Returns a localized error message.
function error(key) {
    return (ERROR_TRANSLATIONS[uiLang] && ERROR_TRANSLATIONS[uiLang][key])
        || ERROR_TRANSLATIONS.en[key]
        || key;
}

//Returns the locate-user hint in the active language.
function locateHintText() {
    return LOCATE_HINT_TRANSLATIONS[uiLang] || LOCATE_HINT_TRANSLATIONS.en;
}

/**
 * Applies the selected language to static UI elements.
 * Result content is rebuilt via a new search when needed, because place names, wiki
 * excerpts, geo info, and AI sentences depend on the current AI result.
 */
function changeLanguage() {
    document.title = translate("title");

    document.getElementById("welcome").textContent = translate("welcome");
    document.getElementById("searchingText").innerHTML = " " + translate("searching");
    document.getElementById("imageInputLabel").textContent = translate("upload");
    document.querySelector("#showToggleView .toggle-text").textContent = translate("view");
    document.querySelector("#showToggleTheme .toggle-text").textContent = translate("theme");

    document.querySelector(".learn-more-text").textContent = translate("moreInformation");
    document.querySelector(".hint-text").textContent = locateHintText();

    updateToggles();

    setTimeout(alignToggleChevrons, 50);
}