
document.addEventListener('DOMContentLoaded', () => {
    // Servisi Başlat
    const authService = new EmailAuthService();

    // DOM Elementleri
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const statusMessage = document.getElementById('statusMessage');

    // Mesaj Gösterme Fonksiyonu (Success veya Error)
    function showStatus(msg, type) {
        if (statusMessage) {
            statusMessage.innerText = msg;
            statusMessage.style.display = 'block';

            // Sınıfları temizle ve yenisini ekle
            statusMessage.classList.remove('success', 'error');
            statusMessage.classList.add(type);
        } else {
            // Eğer element bulunamazsa fallback olarak alert
            alert(msg);
        }
    }

    // Login Sayfası Mantığı
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            // Bekleniyor mesajı (isteğe bağlı)
            // showStatus("Giriş yapılıyor...", 'success'); // Mavi bir "info" tipi de eklenebilir

            try {
                console.log("Giriş yapılıyor...");
                const user = await authService.signIn(email, password);
                showStatus(`Giriş Başarılı! Yönlendiriliyorsunuz...`, 'success');
                // Örnek: 2 saniye sonra yönlendirme
                setTimeout(() => window.location.href = 'dashboard.html', 2000);
            } catch (error) {
                showStatus("Giriş başarısız: " + error.message, 'error');
            }
        });
    }

    // Register Sayfası Mantığı
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                console.log("Kayıt olunuyor...");
                const user = await authService.signUp(email, password, name);

                showStatus("Kayıt Başarılı! Lütfen e-postanızı onaylayın. Giriş sayfasına yönlendiriliyorsunuz...", 'success');

                setTimeout(() => {
                    window.location.href = 'dashboard.html'; // Giriş yapılmış sayıp panele atıyoruz (veya login'e de atabilirsin)
                }, 3000);

            } catch (error) {
                showStatus("Kayıt başarısız: " + error.message, 'error');
            }
        });
    }

    // Google Login Ortak Mantık
    const googleBtn = document.querySelector('.btn-google');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            showStatus("Google ile giriş için Supabase ayarlarının yapılması gerekir.", 'error');
        });
    }
});
