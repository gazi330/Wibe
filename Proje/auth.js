
// ÇAKIŞMAYI ÖNLEMEK İÇİN İSİM DEĞİŞİKLİĞİ:
// "supabase" ismi CDN kütüphanesi tarafından global olarak kullanılıyor olabilir.
// Bu yüzden kendi değişkenimize "supabaseClient" adını veriyoruz.

let supabaseClient;
const isDemoMode = false;

function initSupabase() {
  // 1. config.js dosyasından değerleri okuyoruz
  // (config.js dosyasının auth.js'den ÖNCE sayfaya eklendiğinden emin olun)

  let supabaseUrl, supabaseKey;

  if (window.CONFIG) {
    supabaseUrl = window.CONFIG.SUPABASE_URL;
    supabaseKey = window.CONFIG.SUPABASE_KEY;
  } else {
    console.error("HATA: config.js dosyası yüklenmemiş veya bulunamadı!");
    console.error("Lütfen HTML dosyanızda <script src='config.js'></script> satırının auth.js'den önce olduğundan emin olun.");
    return null;
  }

  // Window üzerinden kütüphaneye erişim (CDN)
  if (window.supabase) {
    return window.supabase.createClient(supabaseUrl, supabaseKey);
  } else {
    console.error("Supabase Kütüphanesi Yüklenemedi! CDN scriptini kontrol edin.");
    return null;
  }
}

// Client'ı başlat
supabaseClient = initSupabase();

class EmailAuthService {

  // Sahte Bekleme Süresi
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async signIn(email, password) {
    if (!supabaseClient) {
      await this._delay(1000);
      console.log(`[DEMO] Giriş Yapıldı: ${email}`);
      return { id: "demo-user-123", email: email };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      return data.user;
    } catch (e) {
      console.error("Giriş Hatası:", e.message);
      throw e;
    }
  }

  async signUp(email, password, displayName) {
    if (!supabaseClient) {
      await this._delay(1500);
      return {
        id: "demo-new-user-456",
        email: email,
        user_metadata: { display_name: displayName }
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;
      return data.user;
    } catch (e) {
      console.error("Kayıt Hatası:", e.message);
      throw e;
    }
  }

  async signInWithGoogle() {
    if (!supabaseClient) {
      console.error("Supabase client not initialized");
      return;
    }
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard.html'
        }
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Google Login Error:", e.message);
      throw e;
    }
  }
}
