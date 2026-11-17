/* CV içeriği. Oyundaki her bölüm bulvar boyunca bir kule-evdir; karakterle evin arsasına
 * girince içerik panelde açılır. Sadece bu dosyayı düzenlemen yeterli.
 *
 * Bölüm alanları:
 *   id      benzersiz kısa ad
 *   title   tabelada ve panelde görünen başlık
 *   icon    emoji
 *   color   çatı / bayrak rengi (hex)
 *   floors  kulenin kat sayısı (1-8)
 *   text    (isteğe bağlı) üstte bir paragraf
 *   facts   (isteğe bağlı) [{ label, value, href }] kısa bilgi satırları
 *   items   (isteğe bağlı) [{ heading, sub, date, text, bullets: [], links: [{ label, href }], tags: [], link }]
 *   tags    (isteğe bağlı) ["JavaScript", ...] etiket bulutu
 *   links   (isteğe bağlı) [{ label, href }] büyük link butonları
 */
window.CV = {
  name: "Sezer Bölük",
  title: "Full Stack Developer",
  /* açılıştaki karşılama: satırlar sırayla yazılır. {key} yerine dokunmatikte "haritaya dokun",
   * klavyede "M tuşuna bas" gelir. */
  intro: [
    "Merhaba, yolcu…",
    "Ben Sezer Bölük.",
    "Bu kasabadaki her ev, hikâyemin bir parçasını saklıyor.",
    "Kimi kapılar geçmişime açılır, kimi yarına.",
    "Beni tanımaya nereden başlamak istersin?",
    "Yolunu bulmak için {key}. Harita sana kapıları gösterecek.",
  ],
  /* indirilebilir PDF (files/ klasöründe); kaldırmak için satırı sil */
  pdf: "files/sezer-boluk-cv.pdf",
  sections: [
    {
      id: "profile",
      title: "Profil",
      icon: "👋",
      color: "#f0b63d",
      floors: 3,
      text: "Yazılım geliştirme alanında 10 yılı aşkın süredir çalışıyorum. Ön yüz tarafta React ve Next.js, sunucu tarafta .NET ve Laravel ile projeler geliştiriyorum. ERP ve randevu sistemi gibi iş uygulamalarında hem arayüzü hem sunucu tarafını birlikte geliştirebiliyorum.",
      facts: [
        { label: "Konum", value: "Ankara, Etimesgut" },
        { label: "Telefon", value: "0542 433 63 96", href: "tel:+905424336396" },
        { label: "E-posta", value: "white.code.text@gmail.com", href: "mailto:white.code.text@gmail.com" },
        { label: "GitHub", value: "github.com/Sayzera", href: "https://github.com/Sayzera" },
      ],
    },
    {
      id: "experience",
      title: "İş Deneyimi",
      icon: "💼",
      color: "#eb5e22",
      floors: 7,
      items: [
        {
          heading: "Niltek Yazılım",
          sub: "Full Stack Developer",
          date: "2022 – Günümüz",
          bullets: [
            ".NET 7 ile ERP projesinin sunucu geliştirmesinde görev alıyorum.",
            "Aynı projede ön yüz geliştirmesini de yürüterek uçtan uca çalışıyorum.",
          ],
          tags: [".NET 7", "C#", "ERP"],
        },
        {
          heading: "No-code proje geliştirme ve ön yüz mimarisi",
          date: "2022",
          bullets: [
            "No-code projelerin fikir aşamasından üretime kadar tüm süreçlerini uçtan uca yönettim, ekibe eğitim verdim.",
            "Symfony ile sıfırdan geliştirilen marka takip yazılımının analiz, geliştirme ve uygulama süreçlerinde aktif görev aldım.",
            "Şirket içi ön yüz projelerinin mimarisini tasarladım ve ekip arasında görev dağılımı yaptım.",
            "WhatsApp bot geliştirdim ve işletim süreçlerini yönettim.",
            "Doktorlar için randevu takip sistemi geliştirdim, yayına aldım ve iyileştirdim.",
          ],
          tags: ["Symfony", "No-code", "WhatsApp Bot"],
        },
        {
          heading: "Proxima Yazılım",
          date: "2021 – 2022 · 1 yıl 7 ay",
          bullets: [
            "Laravel, MySQL, JavaScript ve Bootstrap ile sıfırdan sunucu ve ön yüz geliştirdim, mimari tasarım ve gereksinim analizi yaptım.",
            "React Native ile Ustaya Gel mobil uygulamasını geliştirdim ve App Store ile Play Store'a yayınladım.",
            "Mikro, Nebim, Hepsiburada, N11 ve Trendyol entegrasyonlarını planladım ve uyguladım.",
          ],
          tags: ["Laravel", "MySQL", "React Native"],
        },
      ],
    },
    {
      id: "projects",
      title: "Kişisel Projeler",
      icon: "🚀",
      color: "#6ec6ff",
      floors: 8,
      items: [
        {
          heading: "Hızlı Takvim Ürün Ailesi",
          sub: "Randevu, takvim ve CRM platformu",
          date: "2026",
          bullets: [
            "C# sunucu, TypeScript web paneli ve Flutter mobil uygulama.",
            "Flutter uygulamasını Google Play'de yayınladım.",
            "Çok kiracılı (multi-tenant) mimari kurdum: her firma firmaadi.hizlitakvim.com şeklinde kendi alt alan adına sahip. Rol ve yetki yönetimi, Google Takvim ve WhatsApp entegrasyonları ekledim.",
            "Her tenant'a kendi web sitesi görünümü kazandırdım.",
            "Next.js ve MUI ile çok dilli tanıtım web sitesini hazır şablon üzerine özelleştirdim.",
          ],
          links: [
            { label: "hizlitakvim.com", href: "https://hizlitakvim.com" },
            { label: "Örnek tenant", href: "https://devin.hizlitakvim.com/tr" },
          ],
          tags: ["C#", "TypeScript", "Flutter", "Next.js", "MUI", "Multi-tenant"],
        },
        {
          heading: "Hızlı Bulur",
          sub: "Çekici ve Yol Yardım Platformu",
          date: "2026",
          bullets: [
            "Node.js, Express ve Handlebars ile çekici ve yol yardım hizmetleri için web uygulaması geliştirdim.",
            "Gerçek zamanlı iletişim: ws kütüphanesiyle WebSocket sunucusu kurdum. Bağlantı kurulurken kimlik doğrulama ve yetki kontrolü yapılıyor; canlı oturumlarda veri anlık olarak iki yönlü akıyor.",
            "Google'dan yaklaşık 96.000 firma verisi topladım; her firma için kategorisine göre web sitesi tasarladım.",
            "PostgreSQL ile çok kiracılı (multi-tenant) yapıyı kurdum. Her kiracı kendi admin panelini yönetebiliyor.",
            "DDoS, istek sınırlama (rate limit) ve toplu saldırılara karşı özel güvenlik katmanları geliştirdim: bot tespiti ve geçici engelleme dahil.",
            "Hem sunucu tarafında hem Node.js üzerinde SEO tekniklerine dikkat ettim.",
            "Excel içe aktarma, ödeme entegrasyonu (iyzico) ve Gemini tabanlı içerik üretimi ekledim.",
          ],
          links: [
            { label: "hizlibulur.com", href: "https://hizlibulur.com" },
            { label: "Örnek tenant", href: "https://hizlibulur.com/acar-oto-lastik" },
          ],
          tags: ["Node.js", "Express", "Handlebars", "WebSocket", "PostgreSQL", "iyzico", "Gemini"],
        },
        {
          heading: "İstanbul Baraj Doluluk ve Veri Toplama",
          date: "2026",
          bullets: [
            "Next.js, TypeScript ve Puppeteer ile web veri kazıma (scraping) sistemi geliştirdim.",
            "Baraj doluluk, ihale ve ilan verilerini toplayan otomasyon işleri tasarladım.",
            "Prisma, PostgreSQL, Docker ve PM2 ile veri modelleme ve dağıtım yaptım.",
          ],
          tags: ["Next.js", "Puppeteer", "Prisma", "Docker", "PM2"],
        },
        {
          heading: "CalendarKit Pro v2",
          sub: "Açık Kaynak React Takvim Bileşeni",
          date: "2026",
          bullets: [
            "Sürükle-bırak, tekrarlayan etkinlik, saat dilimi ve kaynak planlama özelliklerine sahip bir React takvim kütüphanesi yazdım.",
            "Paketi npm'de yayınladım ve sürümlerini yönetiyorum.",
          ],
          tags: ["React", "npm", "Açık kaynak"],
        },
        {
          heading: "CV Analizer",
          sub: "Chrome Uzantısı",
          date: "2025 – 2026",
          bullets: [
            "React, Vite ve TypeScript ile bir Chrome uzantısı geliştirdim.",
            "Word (DOCX) şablon desteği ve API entegrasyonu ekledim.",
          ],
          tags: ["React", "Vite", "TypeScript"],
        },
        {
          heading: "Karadeniz Palet",
          date: "2024",
          bullets: ["Web sitesini geliştirdim ve tüm SEO tekniklerine dikkat ettim."],
          links: [{ label: "karadenizpalet.com", href: "https://karadenizpalet.com" }],
          tags: ["SEO"],
        },
        {
          heading: "Başsız (headless) ve özel CMS projeleri",
          bullets: [
            "Sanity ile başsız (headless) CMS mimarisi kurup React ve GraphQL ile entegre ettim.",
            "Payload CMS ile özel içerik yönetim sistemi geliştirdim; Next.js ve PostgreSQL kullandım.",
          ],
          tags: ["Sanity", "Payload CMS", "GraphQL"],
        },
        {
          heading: "Angular Araç Yönetim Uygulaması",
          date: "2025",
          bullets: [
            "Angular 19 ve TypeScript ile araç listeleme ve yönetim arayüzü geliştirdim: ekleme, güncelleme, silme ve ayarlar.",
            "Leaflet ile harita üzerinde araçları gösterdim.",
            "NgRx ile durum yönetimi, Formly ile dinamik formlar ve PrimeNG ile Tailwind CSS tabanlı bileşenler kullandım.",
          ],
          tags: ["Angular 19", "NgRx", "Leaflet", "PrimeNG"],
        },
      ],
    },
    {
      id: "skills",
      title: "Teknik Beceriler",
      icon: "🧠",
      color: "#32d583",
      floors: 6,
      items: [
        { heading: "Ön yüz", tags: ["TypeScript", "JavaScript (ES6+)", "React", "Next.js", "Angular", "React Native", "Flutter"] },
        { heading: "React ekosistemi", tags: ["Context API", "Redux", "RTK Query", "Zustand", "Material UI", "Shadcn", "TailwindCSS"] },
        { heading: "Sunucu", tags: [".NET 7", "Entity Framework Core", "C#", "Node.js", "Express", "Laravel", "Symfony"] },
        { heading: "Veritabanı ve altyapı", tags: ["PostgreSQL", "MySQL", "Prisma", "Docker", "PM2"] },
        { heading: "Diğer", tags: ["MQTT", "GraphQL", "Puppeteer", "Google Maps API", "WhatsApp entegrasyonları", "Git"] },
      ],
    },
    {
      id: "ai",
      title: "Yapay Zekâ Araçları",
      icon: "🤖",
      color: "#b692f6",
      floors: 4,
      items: [
        {
          heading: "Günlük kullanım",
          bullets: [
            "2021 yılından beri GitHub Copilot kullanıyorum; bugün Cursor ve Claude'u aktif olarak kullanıyorum.",
            "Projeler için Markdown tabanlı kural (rules) ve skill dosyaları hazırlıyor, yapay zekânın projeye özgü davranışını bu dosyalarla yönlendiriyorum.",
            "Token kullanımını en aza indirecek şekilde bağlam yönetiyorum: gereksiz dosya okumayı azaltıyor, görevleri kısa ve odaklı tutuyorum.",
          ],
          tags: ["GitHub Copilot", "Cursor", "Claude"],
        },
      ],
    },
    {
      id: "education",
      title: "Eğitim & Diller",
      icon: "🎓",
      color: "#ff7ab6",
      floors: 3,
      items: [
        { heading: "Selçuk Üniversitesi", sub: "Spor Bilimleri Fakültesi, Spor Yöneticiliği", date: "Mezuniyet: 2020" },
        { heading: "Türkçe", sub: "Ana dil" },
        { heading: "İngilizce", sub: "A2 (Temel seviye)" },
      ],
    },
    {
      id: "contact",
      title: "İletişim",
      icon: "✉️",
      color: "#e5484d",
      floors: 2,
      text: "Benimle iletişime geç:",
      links: [
        { label: "E-posta · white.code.text@gmail.com", href: "mailto:white.code.text@gmail.com" },
        { label: "Telefon · 0542 433 63 96", href: "tel:+905424336396" },
        { label: "GitHub · github.com/Sayzera", href: "https://github.com/Sayzera" },
        { label: "⬇ CV'yi PDF olarak indir", href: "files/sezer-boluk-cv.pdf", download: true },
      ],
    },
  ],
};
