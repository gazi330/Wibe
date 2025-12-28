# 🎓 WibePortal - Akıllı Eğitim Platformu

WibePortal, öğrencilerin öğrenme süreçlerini optimize etmek, kişiselleştirilmiş ders çalışma planları oluşturmak ve yapay zeka desteğiyle eksiklerini kapatmak için tasarlanmış modern bir web tabanlı eğitim platformudur.

![WibePortal Ana Sayfa](https://via.placeholder.com/800x400?text=WibePortal+Dashboard)

## 🌟 Öne Çıkan Özellikler

### 🤖 Yapay Zeka Destekli Eğitim Koçu (AI Coach)
Gemini AI teknolojisi ile güçlendirilmiş akıllı asistanımız öğrencilere şu konularda destek olur:
- **Seviye Tespit Testleri:** Seçilen konuda kullanıcıya özel testler hazırlar.
- **Kişiselleştirilmiş Çalışma Planı:** Test sonuçlarına göre güçlü/zayıf yön analizi yapar ve haftalık çalışma programı oluşturur.
- **Hata DNA Analizi:** Öğrencinin yanlışlarına odaklanarak eksik olduğu kavramları belirler.
- **Akıllı Video Önerileri:** Öğrencinin seviyesine ve eksiğine en uygun YouTube eğitim videolarını bulur.

### 📊 Detaylı İstatistikler ve Takip
- **Günlük Seri (Streak):** Öğrencinin düzenli çalışma alışkanlığı kazanması için gün serisi takibi.
- **İzleme Geçmişi:** İzlenen ders videolarının kaydı ve detaylı analizi.
- **Favori Hocalar:** Beğenilen eğitmenleri ve kanalları favorilere ekleyip kolayca erişebilme.

### 🌓 Modern ve Kullanıcı Dostu Arayüz
- **Gece/Gündüz Modu:** Göz yormayan, kullanıcı tercihine göre değişebilen tema desteği.
- **Responsive Tasarım:** Mobil ve masaüstü uyumlu akıcı arayüz.
- **Profil Yönetimi:** Avatar seçimi, isim güncelleme ve kişisel ayarlar.

## 🛠️ Teknolojiler

Bu proje, performans ve modern web standartları gözetilerek geliştirilmiştir:

- **Frontend:** HTML5, CSS3 (Modern Variables & Flexbox/Grid), Vanilla JavaScript (ES6+)
- **Backend / Veritabanı:** [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **Yapay Zeka:** [Google Gemini API](https://deepmind.google/technologies/gemini/)
- **Build Tool:** Vite
- **Diğer Kütüphaneler:** 
  - `html2pdf.js` (Raporları PDF olarak indirme)
  - `marked.js` (Markdown içerikleri render etme)
  - `FontAwesome` (İkon seti)

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/kullaniciadi/wibeportal.git
cd wibeportal
```

### 2. Bağımlılıkları Yükleyin
Node.js paketlerinizi yükleyin:
```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın
Proje ana dizininde `assets/js/config.js` dosyasını oluşturun veya mevcut `config.js` dosyasını düzenleyin. Aşağıdaki API anahtarlarını eklemeniz gerekmektedir:

```javascript
// assets/js/config.js
window.CONFIG = {
    GEMINI_API_KEY: "SENIN_GEMINI_API_KEYIN",
    SUPABASE_URL: "SENIN_SUPABASE_PROJECT_URL",
    SUPABASE_ANON_KEY: "SENIN_SUPABASE_ANON_KEY",
    YOUTUBE_API_KEY: "SENIN_YOUTUBE_API_KEY" // Opsiyonel, eğer kullanılıyorsa
};
```

### 4. Supabase Veritabanı Kurulumu
Supabase projenizde aşağıdaki tabloları oluşturmanız gerekebilir:
- `user_video_history` (İzleme geçmişi)
- `youtube_channel_likes` (Favori kanallar)
- `user_profiles` (Kullanıcı profilleri)

### 5. Uygulamayı Başlatın
Geliştirme sunucusunu başlatmak için:
```bash
npm run dev
```
Tarayıcınızda `http://localhost:5173` (veya terminalde belirtilen port) adresine gidin.

## 📂 Dosya Yapısı

```
wibeportal/
├── assets/
│   ├── css/          # Stil dosyaları (style.css, theme.css)
│   ├── js/           # Uygulama mantığı
│   │   ├── ai-analyst.js  # Yapay zeka entegrasyonu
│   │   ├── auth.js        # Supabase kimlik doğrulama
│   │   ├── dashboard.js   # Ana panel işlemleri
│   │   ├── theme.js       # Tema yönetimi
│   │   └── ...
│   └── images/
├── index.html        # Giriş sayfası
├── register.html     # Kayıt sayfası
├── dashboard.html    # Ana panel
├── app.js            # Giriş sayfası scripti
└── package.json
```

## 🤝 Katkıda Bulunma

Herhangi bir öneriniz veya hata bildiriminiz varsa, lütfen bir "Issue" açın veya "Pull Request" gönderin.

1. Fork'layın
2. Feature branch oluşturun (`git checkout -b ozellik/YeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi pushlayın (`git push origin ozellik/YeniOzellik`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje [ISC](LICENSE) lisansı ile lisanslanmıştır.
