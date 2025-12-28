
// Client'ı başlat
supabaseClient = initSupabase();

document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. OTURUM VE PROFİL VERİLERİ ---
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Elemanlar
    const userEmailEl = document.getElementById('userEmail');
    const userNameEl = document.getElementById('userName');
    const userImageEl = document.getElementById('userImage');
    const streakCountEl = document.getElementById('streakCount');

    // Sidebar Edit Elemanları
    const sidebarMainView = document.getElementById('sidebarMainView');
    const sidebarEditView = document.getElementById('sidebarEditView');
    const btnProfileEdit = document.getElementById('btnProfileEdit');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const btnNewAvatar = document.getElementById('btnNewAvatar');

    const editDisplayName = document.getElementById('editDisplayName');
    const editUserImage = document.getElementById('editUserImage');

    userEmailEl.innerText = user.email;
    if (user.user_metadata && user.user_metadata.display_name) {
        userNameEl.innerText = user.user_metadata.display_name;
    }

    // DB'den avatar ve streak çek
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*, login_streaks(streak_count)')
        .eq('id', user.id)
        .single();

    let currentAvatarUrl = '';
    let profileExists = false; // Profil var mı kontrolü

    if (profile) {
        profileExists = true; // Profil bulundu
        currentAvatarUrl = profile.avatar_url || user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;

        userNameEl.innerText = profile.display_name || user.user_metadata.display_name;
        userImageEl.src = currentAvatarUrl;

        // Streak Mantığı
        let streak = 0;
        if (profile.login_streaks) {
            if (Array.isArray(profile.login_streaks) && profile.login_streaks.length > 0) {
                streak = profile.login_streaks[0].streak_count;
            } else if (typeof profile.login_streaks === 'object') {
                streak = profile.login_streaks.streak_count || 0;
            }
        }

        if (streakCountEl) {
            streakCountEl.innerText = `🔥 ${streak} Günlük Seri`;
            streakCountEl.style.color = '#ff9f1c';
            streakCountEl.style.fontWeight = 'bold';
            streakCountEl.style.fontSize = '0.9rem';
        }

    } else {
        currentAvatarUrl = user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
        userImageEl.src = currentAvatarUrl;
    }

    // --- PROFİL DÜZENLEME MANTIĞI ---

    // Edit Modunu Aç
    btnProfileEdit.addEventListener('click', () => {
        sidebarMainView.style.display = 'none';
        sidebarEditView.style.display = 'flex';

        // Mevcut verileri doldur
        editDisplayName.value = userNameEl.innerText;
        editUserImage.src = userImageEl.src;
    });

    // İptal Et
    btnCancelEdit.addEventListener('click', () => {
        sidebarEditView.style.display = 'none';
        sidebarMainView.style.display = 'flex';
    });

    // Yeni Random Avatar
    btnNewAvatar.addEventListener('click', () => {
        const randomSeed = Math.random().toString(36).substring(7);
        const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
        editUserImage.src = newUrl;
    });

    // Kaydet
    btnSaveProfile.addEventListener('click', async () => {
        const newName = editDisplayName.value.trim();
        const newAvatar = editUserImage.src;

        if (!newName) {
            alert("İsim boş olamaz!");
            return;
        }

        btnSaveProfile.innerText = "Kaydediliyor...";

        // Supabase İşlemi (Update veya Insert)
        let error;

        if (profileExists) {
            // Profil varsa GÜNCELLE (Update)
            const res = await supabaseClient
                .from('profiles')
                .update({
                    display_name: newName,
                    avatar_url: newAvatar,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
            error = res.error;
        } else {
            // Profil yoksa EKLE (Insert)
            const res = await supabaseClient
                .from('profiles')
                .insert({
                    id: user.id,
                    display_name: newName,
                    avatar_url: newAvatar,
                    updated_at: new Date().toISOString()
                });
            error = res.error;
        }

        if (error) {
            console.error('Hata Detayı:', error);
            alert(`Kaydetme başarısız!\nHata: ${error.message}`);
            btnSaveProfile.innerText = "Kaydet";
        } else {
            // UI Güncelle
            userNameEl.innerText = newName;
            userImageEl.src = newAvatar;

            // Eğer yeni oluşturulduysa flag'i güncelle
            profileExists = true;

            // Görünüm Değiştir
            sidebarEditView.style.display = 'none';
            sidebarMainView.style.display = 'flex';

            btnSaveProfile.innerText = "Kaydet";

            // Başarı mesajı (Opsiyonel)
            // alert("Profil başarıyla güncellendi!");
        }
    });


    // --- 2. HİYERARŞİK VERİ YAPISI: Kategori -> Ders -> Hoca -> Playlist -> Videolar ---
    // --- 2. HİYERARŞİK VERİ YAPISI ---

    // Verileri global değişken olarak tutalım
    let globalChannels = [];

    try {
        const { data, error } = await supabaseClient
            .from('youtube_channels')
            .select('id,channel_name,channel_url,lesson, exam, difficulty_level, youtube_channel_likes(user_id, created_at)');

        if (error) {
            console.error("Kanal verileri çekilemedi:", error);
        } else {
            globalChannels = data || [];
            console.log(`${globalChannels.length} kanal yüklendi.`);
        }
    } catch (err) {
        console.error("Supabase hatası:", err);
    }


    // Dinamik Şema (İskelet)
    // Subjects kısımları kodla doldurulacak
    const schema = {
        'LGS': {
            icon: 'fa-graduation-cap',
            desc: 'Liseye Geçiş Sınavı',
            subjects: {
                'Matematik': {},
                'Fen Bilimleri': {},
                'Türkçe': {},
                'İnkılap Tarihi': {},
                'İngilizce': {},
                'Din Kültürü': {}
            }
        },
        'YKS': {
            icon: 'fa-university',
            desc: 'Üniversite sınavına hazırlık',
            subCategories: {
                'TYT': {
                    desc: 'Temel Yeterlilik Testi',
                    subjects: { 'Matematik': {}, 'Fizik': {}, 'Kimya': {}, 'Biyoloji': {}, 'Türkçe': {}, 'Tarih': {}, 'Coğrafya': {}, 'Felsefe': {}, 'Din Kültürü': {} }
                },
                'AYT': {
                    desc: 'Alan Yeterlilik Testleri',
                    subjects: { 'Matematik': {}, 'Fizik': {}, 'Kimya': {}, 'Biyoloji': {}, 'Edebiyat': {}, 'Tarih': {}, 'Coğrafya': {} }
                }
            }
        },
        'KODLAMA': {
            icon: 'fa-laptop-code',
            desc: 'Yazılım ve Teknoloji',
            subjects: { 'Veri Bilimi': {}, 'Python': {}, 'Javascript': {}, 'Java': {}, 'C#': {} }
        },
        'KPSS': {
            icon: 'fa-book-open',
            desc: 'Kamu Personeli Seçme Sınavı',
            subjects: { 'KPSS Tarih': {}, 'KPSS Coğrafya': {}, 'KPSS Vatandaşlık': {}, 'KPSS Türkçe': {}, 'KPSS Matematik': {} }
        },
        'DİL': {
            icon: 'fa-language',
            desc: 'Yabancı dil eğitimi',
            subjects: { 'İngilizce': {}, 'Almanca': {}, 'Fransızca': {} }
        },
        'VERİ EĞİTİMİ': {
            icon: 'fa-database',
            desc: 'Veri Bilimi ve Analitiği',
            subjects: {} // DB'den dolacak (Hala dinamik kalsın istenebilir, aksi belirtilmedi)
        }
    };

    function populateSchemaFromChannels(channels) {
        // İskeleti temizle (tekrar çağrılırsa diye)
        // DİKKAT: Artık çoğu statik olduğu için hepsini temizlememeliyiz.
        // Sadece dinamik olanları temizleyelim.
        if (schema['VERİ EĞİTİMİ'] && schema['VERİ EĞİTİMİ'].subjects) {
            schema['VERİ EĞİTİMİ'].subjects = {};
        }

        channels.forEach(ch => {
            if (!ch.exam || !ch.lesson) return;

            const exam = ch.exam.trim().toUpperCase(); // LGS, TYT, AYT, KODLAMA...
            const lesson = ch.lesson.trim();

            // ALIAS: CODING -> KODLAMA eşleştirmesi
            let schemaKey = exam;
            if (exam === 'CODING') schemaKey = 'KODLAMA';

            // STATİK OLANLARI ATLA
            // LGS, YKS (TYT, AYT), KODLAMA, KPSS, DİL statik.
            // Sadece VERİ EĞİTİMİ (veya tanımlı olmayan yeni kategoriler) dinamik olabilir.

            if (['LGS', 'TYT', 'AYT', 'KODLAMA', 'KPSS', 'DİL'].includes(schemaKey)) {
                return;
            }

            // 1. Durum: Ana Kategoriler
            if (schema[schemaKey]) {
                if (!schema[schemaKey].subjects) schema[schemaKey].subjects = {};
                schema[schemaKey].subjects[lesson] = {};
            }
            // 2. Durum: Alt Kategorili Sınavlar (Varsa)
            else {
                // YKS statik olduğu için buradaki TYT/AYT kontrolüne gerek kalmadı ama
                // yine de genel yapı bozulmasın diye bırakılabilir veya kaldırılabilir.
            }
        });
    }

    // Veriler 170. satırda çekilmişti, şimdi şemayı doldur:
    populateSchemaFromChannels(globalChannels);


    // --- 3. NAVİGASYON MANTIĞI ---
    const contentGrid = document.getElementById('contentGrid');
    const navBar = document.getElementById('navBar');
    const backBtn = document.getElementById('backBtn');
    const pageTitle = document.getElementById('pageTitle');

    // Sidebar Menu Elemanları
    const menuHome = document.getElementById('menuHome');
    const menuVideos = document.getElementById('menuVideos');
    const menuFavorites = document.getElementById('menuFavorites');
    const menuStats = document.getElementById('menuStats');
    const menuAI = document.getElementById('menuAI');
    const allMenuItems = document.querySelectorAll('.menu ul li');

    function setActiveMenu(selectedItem) {
        allMenuItems.forEach(item => item.classList.remove('active'));
        if (selectedItem) selectedItem.parentElement.classList.add('active');
    }

    menuHome.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuHome);
        renderMainCategories();
    });

    menuVideos.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuVideos);
        renderMyVideosPage();
    });

    menuFavorites.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuFavorites);
        renderFavoritesPage();
    });

    menuStats.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuStats);
        renderStatsPage();
    });

    menuAI.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuAI);
        renderAIPage();
    });

    // State
    let currentLevel = 'main'; // main -> category -> subCategory -> subject -> teacher -> playlist -> video
    let selectedCategory = null;
    let selectedSubCategory = null;
    let selectedSubject = null;
    let selectedTeacher = null;
    let selectedPlaylist = null;

    // Başlangıç
    renderMainCategories();

    // ... (Back button logic) ...


    backBtn.addEventListener('click', () => {
        if (currentLevel === 'favorites') {
            renderMainCategories();
        } else if (currentLevel === 'video') {
            renderTeacherContent(selectedTeacher); // Video -> Hoca İçeriği'ne dön
        } else if (currentLevel === 'playlist') { // Artık playlist ve popüler videolar aynı seviyede (Teacher Content)
            if (selectedSubject) {
                renderTeachers(selectedSubject);
            } else {
                // Favorilerden gelmiş olabiliriz, geri dönünce favorilere gitsin
                renderFavoritesPage();
            }
        } else if (currentLevel === 'teacher') {
            renderSubjects(selectedCategory); // Hoca -> Ders'e dön
        } else if (currentLevel === 'subject') {
            if (selectedSubCategory) {
                renderSubCategories(selectedCategory); // Ders -> Alt Kategoriye (TYT/AYT) dön
            } else {
                renderMainCategories(); // Ders -> Ana Sayfa'ya dön
            }
        } else if (currentLevel === 'subCategory') {
            renderMainCategories(); // Alt Kategori -> Ana Sayfa
        } else {
            renderMainCategories();
        }
    });

    // --- FAVORİLER SAYFASI ---
    async function renderFavoritesPage() {
        currentLevel = 'favorites';
        navBar.style.display = 'none';
        contentGrid.innerHTML = '';

        // Başlık ve Tablar
        const header = document.createElement('div');
        header.style.gridColumn = '1 / -1';
        header.innerHTML = `
            <h2><i class="fas fa-heart" style="color:#e74c3c;"></i> Favorilerim</h2>
            <div style="display:flex; gap:15px; margin-top:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <button id="tabTeachers" style="background:var(--primary-color); color:white; border:none; padding:8px 20px; border-radius:20px; cursor:pointer;">Hocalar</button>
                <button id="tabVideos" style="background:#f0f0f0; color:#666; border:none; padding:8px 20px; border-radius:20px; cursor:pointer;">Videolar</button>
            </div>
        `;
        contentGrid.appendChild(header);

        // İçerik Alanı
        const favContent = document.createElement('div');
        favContent.style.gridColumn = '1 / -1';
        favContent.style.display = 'grid';
        favContent.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))'; // Teacher card grid
        favContent.style.gap = '20px';
        favContent.style.marginTop = '20px';
        favContent.id = 'favContent';
        contentGrid.appendChild(favContent);

        // Default: Hocalar
        loadFavoriteTeachers(favContent);

        // Event Listeners
        document.getElementById('tabTeachers').addEventListener('click', (e) => {
            updateTabStyles(e.target, document.getElementById('tabVideos'));
            loadFavoriteTeachers(favContent);
        });

        document.getElementById('tabVideos').addEventListener('click', (e) => {
            updateTabStyles(e.target, document.getElementById('tabTeachers'));
            favContent.innerHTML = '<p style="margin-top:20px; color:#666;">Favori videolar özelliği yakında eklenecek.</p>';
        });

        function updateTabStyles(active, inactive) {
            active.style.background = 'var(--primary-color)';
            active.style.color = 'white';
            inactive.style.background = '#f0f0f0';
            inactive.style.color = '#666';
        }
    }

    async function loadFavoriteTeachers(container) {
        container.innerHTML = '<p>Yükleniyor...</p>';

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        try {
            // youtube_channel_likes üzerinden kanalları çek
            // Join işlemi: youtube_channel_likes -> youtube_channels
            const { data, error } = await supabaseClient
                .from('youtube_channel_likes')
                .select(`
                    channel_id,
                    youtube_channels (
                        id, channel_name, channel_url, lesson, exam, youtube_channel_likes(user_id)
                    )
                `)
                .eq('user_id', user.id);

            if (error) throw error;

            container.innerHTML = '';

            if (!data || data.length === 0) {
                container.innerHTML = '<p>Henüz favori hocan yok.</p>';
                return;
            }

            const teachers = data.map(item => {
                const ch = item.youtube_channels;
                // Like count'u hesaplamak için global datadan veya yeniden sorgudan faydalanabiliriz. 
                // Buradaki join sadece user'ın like'larını getirdiğinden count eksik olabilir mi?
                // Evet, youtube_channel_likes(user_id) sadece bu relation'ı getirir. 
                // Basitlik adına statik veya "1" gösterebiliriz ya da globalChannels'dan bulabiliriz.

                // Global'den bulmaya çalışalım (performanslı)
                const globalCh = globalChannels.find(g => g.id === ch.id);
                const count = globalCh ? (globalCh.youtube_channel_likes?.length || 0) : 1;

                return {
                    name: ch.channel_name,
                    image: `https://api.dicebear.com/7.x/initials/svg?seed=${ch.channel_name}`,
                    isLiked: true, // Zaten favorilerdeyiz
                    likeCount: count,
                    dbId: ch.id,
                    channelUrl: ch.channel_url
                };
            });

            // Kartları Render Et (Reusing render logic slightly)
            teachers.forEach(teacher => {
                const div = document.createElement('div');
                div.className = 'teacher-card';
                div.style.position = 'relative';

                const heartColor = '#e74c3c';
                const heartClass = 'fas';

                div.innerHTML = `
                    <div class="like-badge" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.9); padding:5px 10px; border-radius:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:flex; align-items:center; gap:5px; z-index:2; cursor:pointer;">
                        <i class="${heartClass} fa-heart" style="color:${heartColor};"></i>
                        <span style="font-size:0.9rem; font-weight:bold; color:#333;">${teacher.likeCount}</span>
                    </div>
                    <div class="teacher-avatar">
                       <img src="${teacher.image}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                    </div>
                    <h3>${teacher.name}</h3>
                    <p>${teacher.name} Kanalı</p>
                 `;

                // Kalp Tıklama
                const likeBadge = div.querySelector('.like-badge');
                likeBadge.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await toggleChannelLike(teacher, likeBadge);
                    // Favorilerden kaldırdıysak anında listeden sil
                    if (!teacher.isLiked) {
                        div.remove();
                        if (container.children.length === 0) container.innerHTML = '<p>Henüz favori hocan yok.</p>';
                    }
                });

                div.addEventListener('click', () => {
                    selectedTeacher = teacher;
                    // Lazy load logic... (Kopyalamak yerine, renderTeachers içindeki mantığı fonksiyona çevirmek daha iyi olurdu ama şimdilik duplicate)
                    // Basitçe:
                    teacher.playlists = [];
                    teacher.popularVideos = [];

                    // Lazy load
                    (async () => {
                        try {
                            const [pl, pop] = await Promise.all([
                                YouTubeService.getPlaylistsByChannelUrl(teacher.channelUrl),
                                YouTubeService.getPopularVideosByChannelUrl(teacher.channelUrl)
                            ]);
                            teacher.playlists = pl || [];
                            teacher.popularVideos = pop || [];
                            renderTeacherContent(teacher);
                        } catch (e) { console.error(e); }
                    })();
                    renderTeacherContent(teacher); // İlk boş açılır, sonra dolar (veya loading eklenir)
                });

                container.appendChild(div);
            });

        } catch (err) {
            console.error(err);
            container.innerHTML = '<p>Hata oluştu.</p>';
        }
    }

    async function toggleChannelLike(teacher, badgeElement) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const icon = badgeElement.querySelector('i');
        const countSpan = badgeElement.querySelector('span');

        // Optimistic UI Update
        const wasLiked = teacher.isLiked;
        teacher.isLiked = !wasLiked;
        teacher.likeCount = wasLiked ? teacher.likeCount - 1 : teacher.likeCount + 1;

        icon.className = teacher.isLiked ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = teacher.isLiked ? '#e74c3c' : '#ccc';
        countSpan.innerText = teacher.likeCount;

        try {
            if (wasLiked) {
                // Sil (Unlike)
                const { error } = await supabaseClient
                    .from('youtube_channel_likes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('channel_id', teacher.dbId);
                if (error) throw error;
            } else {
                // Ekle (Like)
                const { error } = await supabaseClient
                    .from('youtube_channel_likes')
                    .insert({ user_id: user.id, channel_id: teacher.dbId });
                if (error) throw error;
            }

            // Global arrayi de güncelle ki diğer sayfalarda doğru görünsün
            const globalCh = globalChannels.find(g => g.id === teacher.dbId);
            if (globalCh) {
                if (!globalCh.youtube_channel_likes) globalCh.youtube_channel_likes = [];
                if (wasLiked) {
                    // Remove user like
                    globalCh.youtube_channel_likes = globalCh.youtube_channel_likes.filter(l => l.user_id !== user.id);
                } else {
                    // Add user like
                    globalCh.youtube_channel_likes.push({ user_id: user.id });
                }
            }

        } catch (err) {
            console.error("Like işlemi hatası:", err);
            // Revert UI
            teacher.isLiked = wasLiked;
            teacher.likeCount = wasLiked ? teacher.likeCount : teacher.likeCount - 1; // Revert count
            icon.className = wasLiked ? 'fas fa-heart' : 'far fa-heart';
            icon.style.color = wasLiked ? '#e74c3c' : '#ccc';
            countSpan.innerText = teacher.likeCount;
            alert("İşlem başarısız.");
        }
    }


    // --- YARDIMCI FONKSİYONLAR ---

    async function saveVideoHistory(channelId, videoUrl, lesson, exam) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        try {
            const { error } = await supabaseClient
                .from('user_video_history')
                .insert({
                    user_id: user.id,
                    channel_id: channelId,
                    video_url: videoUrl,
                    lesson: lesson,
                    exam: exam
                });

            if (error) console.error("History Save Error:", error);
            else console.log("Video history saved.");
        } catch (err) {
            console.error("History Save Exception:", err);
        }
    }

    // --- RENDER FONKSİYONLARI ---

    function renderMainCategories() {
        currentLevel = 'main';
        selectedSubCategory = null; // Reset
        navBar.style.display = 'none';
        contentGrid.innerHTML = '';

        Object.keys(schema).forEach(catKey => {
            const cat = schema[catKey];
            const div = document.createElement('div');
            div.className = 'category-card';

            // Special case for Data Education to have inverted theme
            if (catKey === 'VERİ EĞİTİMİ') {
                div.classList.add('special-inverted-card');
            }

            div.innerHTML = `
                <div class="category-icon"><i class="fas ${cat.icon}"></i></div>
                <h3>${catKey}</h3>
                <p>${cat.desc}</p>
            `;
            div.addEventListener('click', () => {
                selectedCategory = catKey;
                if (cat.subCategories) {
                    renderSubCategories(catKey);
                } else {
                    renderSubjects(catKey);
                }
            });
            contentGrid.appendChild(div);
        });
    }

    // ... (renderSubCategories and renderSubjects remain unchanged, skipping to renderPopularVideosList update) ...

    function renderSubCategories(catKey) {
        currentLevel = 'subCategory';
        navBar.style.display = 'flex';
        pageTitle.innerText = `${catKey} - Alan Seçimi`;
        contentGrid.innerHTML = '';

        const subCategories = schema[catKey].subCategories;
        Object.keys(subCategories).forEach(subKey => {
            const sub = subCategories[subKey];
            const div = document.createElement('div');
            div.className = 'category-card'; // Reuse category card styling
            div.innerHTML = `
                <div class="category-icon" style="font-size: 2.5rem; width: 70px; height: 70px;"><i class="fas fa-layer-group"></i></div>
                <h3>${subKey}</h3>
                <p>${sub.desc}</p>
            `;
            div.addEventListener('click', () => {
                selectedSubCategory = subKey;
                renderSubjects(catKey);
            });
            contentGrid.appendChild(div);
        });
    }

    function renderSubjects(catKey) {
        currentLevel = 'subject';
        navBar.style.display = 'flex';
        contentGrid.innerHTML = '';

        let subjects;
        if (selectedSubCategory) {
            subjects = schema[catKey].subCategories[selectedSubCategory].subjects;
            pageTitle.innerText = `${catKey} ${selectedSubCategory} - Ders Seçimi`;
        } else {
            subjects = schema[catKey].subjects;
            pageTitle.innerText = `${catKey} - Ders Seçimi`;
        }

        const subjectNames = Object.keys(subjects);

        subjectNames.forEach(subName => {
            const div = document.createElement('div');
            div.className = 'subject-card';
            div.innerHTML = `
                <div class="subject-info">
                    <h4>${subName}</h4>
                    <span>${selectedSubCategory ? selectedSubCategory : catKey}</span>
                </div>
                <div class="subject-arrow"><i class="fas fa-chevron-right"></i></div>
            `;
            div.addEventListener('click', () => {
                selectedSubject = subName;
                renderTeachers(subName);
            });
            contentGrid.appendChild(div);
        });
    }

    // ... (fetchTeacherData, renderTeachers, toggleChannelLike, renderTeacherContent unchanged) ...


    // --- DATA FETCHING & API ---

    async function fetchTeacherData(examType, lessonType) {
        if (!globalChannels || globalChannels.length === 0) {
            console.warn("Global kanal listesi boş, fetchTeacherData iptal.");
            return [];
        }

        // Normalizasyon
        const normalize = (str) => str ? str.toString().trim().toLocaleLowerCase('tr-TR') : '';

        // SEARCH EXAM: Gelen examType "KODLAMA" ise, DB'de "coding" de olabilir.
        const searchExam = normalize(examType);

        const searchLesson = normalize(lessonType);
        const searchLessonShort = normalize(lessonType.replace(/^(LGS|KPSS|DİL)\s+/i, ''));

        // Filtreleme
        let filtered = globalChannels.filter(ch => {
            const dbExam = normalize(ch.exam);
            let dbLesson = normalize(ch.lesson);

            // ALIAS: DB'den gelen özel formatları düzelt
            if (dbLesson === 'veri_bilimi') dbLesson = 'veri bilimi';
            if (dbLesson === 'csharp') dbLesson = 'c#';

            // KODLAMA - CODING Eşleşmesi
            let matchesExam = false;
            if (dbExam === searchExam) matchesExam = true;
            else if (searchExam === 'kodlama' && dbExam === 'coding') matchesExam = true; // Özel Alias
            else if (searchExam === 'coding' && dbExam === 'kodlama') matchesExam = true; // Ters Alias

            if (!matchesExam) return false;

            return dbLesson === searchLesson || dbLesson === searchLessonShort;
        });

        if (filtered.length === 0) {
            return [];
        }

        const teachers = [];
        for (const item of filtered) {

            // YouTube verilerini sonraya sakla (Lazy Load)
            const teacherName = item.channel_name;
            const teacherImage = `https://api.dicebear.com/7.x/initials/svg?seed=${teacherName}`;

            // Like durumu
            const likes = item.youtube_channel_likes || [];
            const isLiked = likes.some(like => like.user_id === user.id);
            const likeCount = likes.length;

            teachers.push({
                name: teacherName,
                image: teacherImage,
                playlists: null,       // Yüklenecek
                popularVideos: null,   // Yüklenecek
                isLiked: isLiked,
                likeCount: likeCount,
                dbId: item.id,
                channelUrl: item.channel_url
            });
        }

        return teachers;
    }





    async function renderTeachers(subject) {
        currentLevel = 'teacher';
        pageTitle.innerText = `${subject} - Eğitmen Seçimi`;
        contentGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Eğitmenler Yükleniyor...</p>';

        let teachers = [];
        let examType = selectedSubCategory ? selectedSubCategory : selectedCategory;

        // ÖZEL DURUM: Eğer ana kategori LGS, KPSS, DİL ise examType = Kategori Adı
        // Eğer YKS ise examType = TYT veya AYT (selectedSubCategory)

        // Veritabanı sorgusu yap
        teachers = await fetchTeacherData(examType, subject);

        contentGrid.innerHTML = '';

        if (teachers.length === 0) {
            contentGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">Bu ders için kayıtlı eğitmen bulunamadı.</p>`;
            return;
        }

        teachers.forEach(teacher => {
            const div = document.createElement('div');
            div.className = 'teacher-card';
            div.style.position = 'relative'; // icon için

            const heartColor = teacher.isLiked ? '#e74c3c' : '#ccc';
            const heartClass = teacher.isLiked ? 'fas' : 'far';

            div.innerHTML = `
                <div class="like-badge" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.9); padding:5px 10px; border-radius:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:flex; align-items:center; gap:5px; z-index:2; cursor:pointer;">
                    <i class="${heartClass} fa-heart" style="color:${heartColor};"></i>
                    <span style="font-size:0.9rem; font-weight:bold; color:#333;">${teacher.likeCount}</span>
                </div>
                <div class="teacher-avatar">
                   <img src="${teacher.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + teacher.name}" 
                        style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
                <h3>${teacher.name}</h3>
                <p>Kanalı Görüntüle</p>
             `;

            // Kalp Tıklama
            const likeBadge = div.querySelector('.like-badge');
            likeBadge.addEventListener('click', async (e) => {
                e.stopPropagation();
                await toggleChannelLike(teacher, likeBadge);
            });

            div.addEventListener('click', async (e) => {
                selectedTeacher = teacher;

                // Eğer veriler henüz yüklenmediyse yükle
                if (!teacher.playlists || !teacher.popularVideos) {
                    // Loading göster (örneğin contentGrid'de)
                    // Basit bir loading modal veya içerik değişimi yapabiliriz
                    // Şimdilik renderTeacherContent içinde 'Yükleniyor' diyerek halledelim veya burada bekletelim.

                    // UI'da loading hissi vermek için:
                    div.style.opacity = '0.5';
                    div.style.cursor = 'wait';

                    try {
                        const [playlists, popularVideos] = await Promise.all([
                            YouTubeService.getPlaylistsByChannelUrl(teacher.channelUrl),
                            YouTubeService.getPopularVideosByChannelUrl(teacher.channelUrl)
                        ]);

                        teacher.playlists = playlists || [];
                        teacher.popularVideos = popularVideos || [];
                    } catch (err) {
                        console.error("Lazy load hatası:", err);
                        teacher.playlists = [];
                        teacher.popularVideos = [];
                    } finally {
                        div.style.opacity = '1';
                        div.style.cursor = 'pointer';
                    }
                }

                renderTeacherContent(teacher);
            });
            contentGrid.appendChild(div);
        });
    }

    function renderTeacherContent(teacher) {
        currentLevel = 'playlist'; // Geri butonu mantığı için playlist seviyesinde tutalım veya yeni bir seviye tanımlayalım
        pageTitle.innerText = `${teacher.name} - İçerikler`;
        contentGrid.innerHTML = '';

        // --- BÖLÜM 1: OYNATMA LİSTELERİ ---
        if (teacher.playlists && teacher.playlists.length > 0) {
            const h3Pl = document.createElement('h3');
            h3Pl.style.gridColumn = '1 / -1';
            h3Pl.style.marginTop = '20px';
            h3Pl.style.borderBottom = '2px solid #eee';
            h3Pl.style.paddingBottom = '10px';
            h3Pl.innerText = '📚 Oynatma Listeleri';
            contentGrid.appendChild(h3Pl);

            teacher.playlists.forEach(playlist => {
                const div = document.createElement('div');
                div.className = 'playlist-card';
                div.innerHTML = `
                     <div class="playlist-icon"><i class="fas fa-layer-group"></i></div>
                     <h3>${playlist.snippet?.title || playlist.title}</h3>
                     <p>${playlist.contentDetails?.itemCount || '?'} Video</p>
                `;
                div.addEventListener('click', () => {
                    // Playlist detayına git
                    selectedPlaylist = playlist;
                    renderPlaylistVideos(playlist);
                });
                contentGrid.appendChild(div);
            });
        }

        // --- BÖLÜM 2: POPÜLER VİDEOLAR ---
        if (teacher.popularVideos && teacher.popularVideos.length > 0) {
            const h3Vid = document.createElement('h3');
            h3Vid.style.gridColumn = '1 / -1';
            h3Vid.style.marginTop = '40px';
            h3Vid.style.borderBottom = '2px solid #eee';
            h3Vid.style.paddingBottom = '10px';
            h3Vid.innerText = '🔥 Popüler Videolar';
            contentGrid.appendChild(h3Vid);

            // --- Sorting Controls for Popular Videos ---
            const controlsContainer = document.createElement('div');
            controlsContainer.style.gridColumn = '1 / -1';
            controlsContainer.style.display = 'flex';
            controlsContainer.style.gap = '10px';
            controlsContainer.style.justifyContent = 'flex-end';
            controlsContainer.style.marginBottom = '20px';

            const btnSortView = document.createElement('button');
            btnSortView.innerHTML = '<i class="fas fa-eye"></i> En Çok İzlenen';
            btnSortView.className = 'sort-btn'; // Use existing class if available or style inline (reusing from playlist view style)
            btnSortView.style.padding = '8px 15px';
            btnSortView.style.cursor = 'pointer';
            btnSortView.style.border = '1px solid #ddd';
            btnSortView.style.borderRadius = '5px';
            btnSortView.style.backgroundColor = 'white';

            const btnSortLike = document.createElement('button');
            btnSortLike.innerHTML = '<i class="fas fa-thumbs-up"></i> En Çok Beğenilen';
            btnSortLike.className = 'sort-btn';
            btnSortLike.style.padding = '8px 15px';
            btnSortLike.style.cursor = 'pointer';
            btnSortLike.style.border = '1px solid #ddd';
            btnSortLike.style.borderRadius = '5px';
            btnSortLike.style.backgroundColor = 'white';

            controlsContainer.appendChild(btnSortView);
            controlsContainer.appendChild(btnSortLike);
            contentGrid.appendChild(controlsContainer);

            // --- Video Grid Container for Popular Videos ---
            const popularVideoGrid = document.createElement('div');
            popularVideoGrid.style.gridColumn = '1 / -1';
            popularVideoGrid.style.display = 'grid';
            popularVideoGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            popularVideoGrid.style.gap = '20px';
            contentGrid.appendChild(popularVideoGrid); // Append specific grid to main content grid

            function renderPopularVideosList(list) {
                popularVideoGrid.innerHTML = '';
                list.forEach(video => {
                    const card = document.createElement('div');
                    card.className = 'video-card';

                    const thumbUrl = video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url;
                    const title = video.snippet?.title;
                    const viewCount = video.statistics?.viewCount || 0;
                    const formattedViews = new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(viewCount);

                    card.addEventListener('click', () => {
                        // History Save
                        const mainCategory = selectedCategory; // örn: YKS
                        const subCat = selectedSubCategory; // örn: TYT

                        // Exam Type Logic
                        // Eğer subCat varsa exam = subCat (TYT), yoksa exam = mainCategory (KPSS)
                        const examType = subCat ? subCat : mainCategory;

                        saveVideoHistory(teacher.dbId, `https://www.youtube.com/watch?v=${video.id}`, selectedSubject, examType);

                        window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank');
                    });

                    card.innerHTML = `
                        <div class="thumbnail-container">
                            <img src="${thumbUrl}" alt="${title}">
                            <span class="badge" style="background: var(--error);"><i class="fab fa-youtube"></i> YouTube</span>
                        </div>
                        <div class="video-info">
                            <h3 style="font-size: 1rem; line-height:1.4;">${title}</h3>
                            <div class="video-footer" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                                <div style="font-size: 0.8rem; color: #666; display:flex; gap:10px;">
                                    <span><i class="fas fa-eye"></i> ${formattedViews}</span>
                                    <span><i class="fas fa-thumbs-up"></i> ${new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(video.statistics?.likeCount || 0)}</span>
                                </div>
                                <button class="watch-btn" style="padding: 5px 10px; font-size: 0.8rem;">İzle</button>
                            </div>
                        </div>
                    `;
                    popularVideoGrid.appendChild(card);
                });
            }

            // Initial render
            renderPopularVideosList(teacher.popularVideos);

            // Event Listeners
            btnSortView.addEventListener('click', () => {
                const sorted = [...teacher.popularVideos].sort((a, b) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0));
                renderPopularVideosList(sorted);
            });

            btnSortLike.addEventListener('click', () => {
                const sorted = [...teacher.popularVideos].sort((a, b) => Number(b.statistics?.likeCount || 0) - Number(a.statistics?.likeCount || 0));
                renderPopularVideosList(sorted);
            });
        } else {
            if (!teacher.playlists || teacher.playlists.length === 0) {
                contentGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">Bu eğitmen için içerik bulunamadı.</p>`;
            }
        }
    }

    async function renderPlaylistVideos(playlist) {
        currentLevel = 'video';
        const title = playlist.snippet?.title || playlist.title;
        pageTitle.innerText = `${title}`;
        contentGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Videolar Yükleniyor... (İstatistikler alınıyor)</p>';

        const playlistId = playlist.id;
        // İstatistikli veriyi çek
        let videos = await YouTubeService.getPlaylistVideosWithStats(playlistId);

        contentGrid.innerHTML = '';

        if (!videos || videos.length === 0) {
            contentGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">Bu listede video bulunamadı.</p>`;
            return;
        }

        // --- SIRALAMA UI ---
        const controlsContainer = document.createElement('div');
        controlsContainer.style.gridColumn = '1 / -1';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.gap = '10px';
        controlsContainer.style.marginBottom = '20px';
        controlsContainer.style.justifyContent = 'flex-end';

        const btnSortView = document.createElement('button');
        btnSortView.innerHTML = '<i class="fas fa-eye"></i> En Çok İzlenen';
        btnSortView.className = 'sort-btn';
        btnSortView.style.padding = '8px 15px';
        btnSortView.style.cursor = 'pointer';
        btnSortView.style.border = '1px solid #ddd';
        btnSortView.style.borderRadius = '5px';
        btnSortView.style.backgroundColor = 'white';

        const btnSortLike = document.createElement('button');
        btnSortLike.innerHTML = '<i class="fas fa-thumbs-up"></i> En Çok Beğenilen';
        btnSortLike.className = 'sort-btn';
        btnSortLike.style.padding = '8px 15px';
        btnSortLike.style.cursor = 'pointer';
        btnSortLike.style.border = '1px solid #ddd';
        btnSortLike.style.borderRadius = '5px';
        btnSortLike.style.backgroundColor = 'white';

        controlsContainer.appendChild(btnSortView);
        controlsContainer.appendChild(btnSortLike);
        contentGrid.appendChild(controlsContainer);

        // Video Grid Container
        const videoGrid = document.createElement('div');
        videoGrid.style.gridColumn = '1 / -1';
        videoGrid.style.display = 'grid';
        videoGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        videoGrid.style.gap = '20px';
        contentGrid.appendChild(videoGrid);

        function renderSortedVideos(list) {
            videoGrid.innerHTML = '';
            list.forEach(item => {
                const video = item;
                const videoId = video.snippet.resourceId.videoId;

                const card = document.createElement('div');
                card.className = 'video-card';

                const thumbUrl = video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url;
                const viewCount = Number(video.statistics?.viewCount || 0);
                const likeCount = Number(video.statistics?.likeCount || 0);

                const formattedViews = new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(viewCount);
                const formattedLikes = new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(likeCount);

                card.addEventListener('click', () => {
                    // History Save
                    // Not: Burada 'selectedTeacher' global değişkenini kullanabiliriz çünkü playlist'e girerken teacher seçiliydi
                    // Ancak veri güvenliği için teacher objesi parametre olarak gelse daha iyi olurdu. 
                    // Şimdilik selectedTeacher global değişkenine güveniyoruz.

                    const mainCategory = selectedCategory;
                    const subCat = selectedSubCategory;
                    const examType = subCat ? subCat : mainCategory;

                    // selectedTeacher global değişkeni renderTeachers fonksiyonunda atanıyordu.
                    const channelId = selectedTeacher ? selectedTeacher.dbId : null;

                    if (channelId) {
                        saveVideoHistory(channelId, `https://www.youtube.com/watch?v=${videoId}`, selectedSubject, examType);
                    }

                    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                });

                card.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${thumbUrl}" alt="${video.snippet.title}">
                        <span class="badge" style="background: var(--error);"><i class="fab fa-youtube"></i> YouTube</span>
                    </div>
                    <div class="video-info">
                        <h3 style="font-size: 1rem; line-height:1.4;">${video.snippet.title}</h3>
                        <div class="video-footer" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                             <div style="font-size: 0.8rem; color: #666; display:flex; gap:10px;">
                                <span><i class="fas fa-eye"></i> ${formattedViews}</span>
                                <span><i class="fas fa-thumbs-up"></i> ${formattedLikes}</span>
                            </div>
                            <button class="watch-btn" style="padding:5px 10px;">İzle</button>
                        </div>
                    </div>
                `;
                videoGrid.appendChild(card);
            });
        }

        renderSortedVideos(videos);

        btnSortView.addEventListener('click', () => {
            const sorted = [...videos].sort((a, b) => Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0));
            renderSortedVideos(sorted);
        });

        btnSortLike.addEventListener('click', () => {
            const sorted = [...videos].sort((a, b) => Number(b.statistics?.likeCount || 0) - Number(a.statistics?.likeCount || 0));
            renderSortedVideos(sorted);
        });
    }

    // --- İSTATİSTİKLER SAYFASI ---
    async function renderStatsPage() {
        currentLevel = 'stats';
        navBar.style.display = 'none';
        contentGrid.innerHTML = '';
        pageTitle.innerText = ''; // Header içinde zaten yazacağız ya da burayı kullanabiliriz.

        // Header
        const header = document.createElement('div');
        header.style.gridColumn = '1/-1';
        header.innerHTML = '<h2>📊 İstatistikler</h2>';
        contentGrid.appendChild(header);

        // Container
        const container = document.createElement('div');
        container.style.gridColumn = '1 / -1';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
        container.style.gap = '30px';
        container.style.marginTop = '20px';
        contentGrid.appendChild(container);

        // --- SOL: Konu Seviyeleri ---
        const leftCol = document.createElement('div');
        leftCol.className = 'stats-card';
        leftCol.innerHTML = '<h3 style="margin-bottom:15px; color:var(--primary-color);">📚 Konu Seviyeleri</h3><p>Yükleniyor...</p>';
        container.appendChild(leftCol);

        // --- SAĞ: Bugün İzlenen Kanallar ---
        const rightCol = document.createElement('div');
        rightCol.className = 'stats-card';
        rightCol.innerHTML = '<h3 style="margin-bottom:15px; color:#e74c3c;">📺 Bugün İzlenen Kanallar</h3><p>Yükleniyor...</p>';
        container.appendChild(rightCol);

        try {
            // Verileri Çek
            const [prefs, history] = await Promise.all([
                fetchUserLearningPreferences(),
                fetchTodayVideoHistory()
            ]);

            // --- Render Left (Preferences) ---
            if (prefs && prefs.length > 0) {
                let html = '<h3 style="margin-bottom:15px; color:var(--primary-color);">📚 Konu Seviyeleri</h3>';
                html += '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;">';
                html += '<thead><tr style="background:var(--secondary-color); text-align:left;"><th style="padding:10px;">Konu</th><th style="padding:10px;">Seviye</th></tr></thead>';
                html += '<tbody>';
                prefs.forEach(p => {
                    html += `<tr style="border-bottom:1px solid var(--input-border);"><td style="padding:10px;">${p.topic}</td><td style="padding:10px; font-weight:bold; color:var(--text-color);">${p.level}</td></tr>`;
                });
                html += '</tbody></table></div>';
                leftCol.innerHTML = html;
            } else {
                leftCol.innerHTML = '<h3 style="margin-bottom:15px; color:var(--primary-color);">📚 Konu Seviyeleri</h3><p style="color:#666; font-style:italic;">Henüz seviye tespiti yapılmadı. AI Koç ile teste başla!</p>';
            }

            // --- Render Right (History) ---
            if (history && history.length > 0) {
                let html = '<h3 style="margin-bottom:15px; color:#e74c3c;">📺 Bugün İzlenen Kanallar</h3>';
                html += '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;">';
                html += '<thead><tr style="background:var(--secondary-color); text-align:left;"><th style="padding:10px;">Kanal</th><th style="padding:10px;">Ders</th><th style="padding:10px;">İşlem</th></tr></thead>';
                html += '<tbody>';

                history.forEach(h => {
                    // Kanal ismini bul
                    const ch = globalChannels.find(g => g.id === h.channel_id);
                    const chName = ch ? ch.channel_name : 'Bilinmeyen Kanal';
                    // Link
                    const link = h.video_url;

                    html += `<tr style="border-bottom:1px solid var(--input-border);">
                        <td style="padding:10px; display:flex; align-items:center; gap:10px;">
                            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${chName}" style="width:24px; height:24px; border-radius:50%;">
                            ${chName}
                        </td>
                        <td style="padding:10px;">${h.lesson || '-'}</td>
                        <td style="padding:10px;"><a href="${link}" target="_blank" style="color:#e74c3c; text-decoration:none; font-weight:bold;"><i class="fas fa-play"></i> İzle</a></td>
                    </tr>`;
                });

                html += '</tbody></table></div>';
                rightCol.innerHTML = html;
            } else {
                rightCol.innerHTML = '<h3 style="margin-bottom:15px; color:#e74c3c;">📺 Bugün İzlenen Kanallar</h3><p style="color:#666; font-style:italic;">Bugün henüz video izlenmedi.</p>';
            }

        } catch (err) {
            console.error(err);
            leftCol.innerHTML += '<p style="color:red;">Hata oluştu.</p>';
            rightCol.innerHTML += '<p style="color:red;">Hata oluştu.</p>';
        }
    }

    // --- VİDEOLARIM SAYFASI (ÖNERİLER) ---
    async function renderMyVideosPage() {
        currentLevel = 'my_videos';
        navBar.style.display = 'none';
        contentGrid.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.gridColumn = '1/-1';
        header.innerHTML = '<h2><i class="fas fa-play-circle" style="color:#e74c3c;"></i> Videolarım & Öneriler</h2>';
        contentGrid.appendChild(header);

        // Container
        const container = document.createElement('div');
        container.style.gridColumn = '1 / -1';
        container.style.marginTop = '20px';
        container.innerHTML = '<p>Yükleniyor...</p>';
        contentGrid.appendChild(container);

        try {
            const prefs = await fetchUserLearningPreferences();

            if (prefs && prefs.length > 0) {
                const recommendations = await fetchRecommendations(prefs);

                if (recommendations && recommendations.length > 0) {
                    let html = '<h3 style="margin-bottom:15px; color:#2ecc71;"><i class="fas fa-lightbulb"></i> Sana Özel Video Önerileri</h3>';
                    html += '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">';

                    recommendations.forEach(rec => {
                        html += `
                        <div class="video-card" style="box-shadow:none; border:1px solid #eee;">
                             <div class="thumbnail-container">
                                <img src="${rec.thumbnail}" alt="${rec.title}">
                                <span class="badge" style="background: var(--success);"><i class="fas fa-check"></i> Önerilen</span>
                            </div>
                            <div class="video-info">
                                <h3 style="font-size: 1rem; line-height:1.4;">${rec.title}</h3>
                                <p style="font-size:0.8rem; color:#666; margin-top:5px;">${rec.channelName} • ${rec.reason} Seviye</p>
                                <button onclick="window.open('${rec.url}', '_blank')" class="watch-btn" style="width:100%; margin-top:10px; padding:8px;">Hemen İzle</button>
                            </div>
                        </div>
                        `;
                    });

                    html += '</div>';
                    container.innerHTML = html;

                } else {
                    container.innerHTML = '<h3 style="margin-bottom:15px; color:#2ecc71;"><i class="fas fa-lightbulb"></i> Sana Özel Video Önerileri</h3><p style="color:#666;">Şu an için uygun bir öneri bulunamadı.</p>';
                }
            } else {
                container.innerHTML = `
                    <div style="text-align:center; padding:50px; background:white; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
                        <i class="fas fa-robot fa-3x" style="color:var(--primary-color); margin-bottom:20px;"></i>
                        <h3>Henüz Seviye Tespiti Yapılmadı</h3>
                        <p style="color:#666; margin-bottom:20px;">Sana özel video önerileri sunabilmemiz için önce AI Koç ile seviyeni öğrenmelisin.</p>
                        <button id="btnGoToAI" class="btn-save" style="padding:10px 30px;">AI Koça Git</button>
                    </div>
                 `;

                setTimeout(() => {
                    document.getElementById('btnGoToAI').addEventListener('click', () => {
                        setActiveMenu(document.getElementById('menuAI'));
                        renderAIPage();
                    });
                }, 0);
            }
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p style="color:red;">Hata oluştu.</p>';
        }
    }

    // --- ÖNERİ SİSTEMİ (Direct AI Mode) ---
    async function fetchRecommendations(preferences) {
        // Not: Artık globalChannels'a bağımlı değiliz, direkt YouTube araması yapıyoruz.
        const recommendations = [];

        // İlk 3 tercihi alalım
        const activePrefs = preferences.slice(0, 3);

        for (const pref of activePrefs) {
            // Rate Limit önlemi: Her istek arasında 2 saniye bekle
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                // 1. AI'dan arama terimi iste
                const aiParams = await window.AIAnalyst.getRecommendationParams(pref.topic, pref.level);
                const searchQuery = aiParams.searchQuery;

                console.log(`AI Önerisi: ${pref.topic} (${pref.level}) -> "${searchQuery}"`);

                // 2. YouTube'da genel arama yap
                const searchResults = await YouTubeService.searchVideos(searchQuery, 1); // Sadece 1 adet en iyi sonuç

                if (searchResults && searchResults.length > 0) {
                    const vid = searchResults[0];
                    const videoId = vid.id?.videoId || vid.id;

                    recommendations.push({
                        title: vid.snippet.title,
                        thumbnail: vid.snippet.thumbnails?.medium?.url,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        channelName: vid.snippet.channelTitle, // Arama sonucundan gelen kanal adı
                        reason: `${pref.topic} (${pref.level})`,
                        topic: pref.topic
                    });
                }
            } catch (e) {
                console.error("Öneri hatası:", e);
            }

            if (recommendations.length >= 6) break;
        }

        return recommendations;
    }

    async function fetchUserLearningPreferences() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabaseClient
            .from('user_learning_preferences')
            .select('topic, level')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }); // En sonuncular üstte

        if (error) {
            console.error("fetchUserLearningPreferences error:", error);
            return [];
        }
        return data;
    }

    async function fetchTodayVideoHistory() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return [];

        // Bugünün başlangıcı
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const { data, error } = await supabaseClient
            .from('user_video_history')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', todayStr)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("fetchTodayVideoHistory error:", error);
            return [];
        }
        return data;
    }

    async function renderAIPage() {
        currentLevel = 'ai_coach';
        navBar.style.display = 'none';
        contentGrid.innerHTML = '';

        // Container
        const container = document.createElement('div');
        container.style.gridColumn = '1 / -1';
        container.style.maxWidth = '800px';
        container.style.margin = '0 auto';
        container.className = 'ai-container';
        // Inline styles removed, handled by CSS class 'ai-container'
        contentGrid.appendChild(container);

        // Header
        container.innerHTML = `
            <div style="text-align:center; margin-bottom:30px;">
                <h2 style="color:var(--primary-color); font-size:2rem;"><i class="fas fa-robot"></i> AI Öğrenme Koçu</h2>
                <p style="color:#666;">Sana özel çalışma planı ve seviye tespiti.</p>
            </div>
            <div id="coachContent"></div>
        `;

        const coachContent = document.getElementById('coachContent');

        // --- STEP 1: KONU SEÇİMİ ---
        function renderStep1() {
            coachContent.innerHTML = `
                <div style="text-align:center;">
                    <h3 style="margin-bottom:20px;">Hangi konuyu çalışmak istiyorsun?</h3>
                    <input type="text" id="topicInput" placeholder="Örn: Üslü Sayılar, Python Döngüler..." 
                           style="width:100%; padding:15px; border:2px solid #eee; border-radius:10px; font-size:1.1rem; margin-bottom:20px;">
                    <button id="btnStartQuiz" class="btn-save" style="width:100%; padding:15px; font-size:1.1rem;">Testi Hazırla <i class="fas fa-arrow-right"></i></button>
                </div>
            `;

            document.getElementById('btnStartQuiz').addEventListener('click', async () => {
                const topic = document.getElementById('topicInput').value.trim();
                if (!topic) {
                    alert("Lütfen bir konu gir.");
                    return;
                }

                // Loading
                coachContent.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-3x" style="color:var(--primary-color);"></i><p style="margin-top:20px;">${topic} için seviye tespit testi hazırlanıyor...</p></div>`;

                try {
                    const quizData = await window.AIAnalyst.generateQuiz(topic);
                    renderStep2(quizData);
                } catch (err) {
                    console.error(err);
                    alert("Hata oluştu.");
                    renderStep1();
                }
            });
        }

        // --- STEP 2: TEST ÇÖZME ---
        function renderStep2(quizData) {
            let html = `<h3 style="text-align:center; margin-bottom:20px;">📝 ${quizData.topic} Seviye Tespit Testi</h3>`;
            html += `<form id="quizForm">`;

            quizData.questions.forEach((q, index) => {
                html += `
                    <div class="quiz-question-card">
                        <p style="font-weight:bold; margin-bottom:10px;">${q.text}</p>
                `;

                if (q.type === 'multiple') {
                    q.options.forEach(opt => {
                        html += `
                            <label style="display:block; margin-bottom:5px; cursor:pointer;">
                                <input type="radio" name="q${q.id}" value="${opt}" required> ${opt}
                            </label>
                        `;
                    });
                } else {
                    html += `<input type="text" name="q${q.id}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;">`;
                }
                html += `</div>`;
            });

            html += `
                <button type="submit" class="btn-save" style="width:100%; padding:15px; font-size:1.1rem; margin-top:10px;">Testi Bitir ve Analiz Et</button>
            `;
            html += `</form>`;

            coachContent.innerHTML = html;

            document.getElementById('quizForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const answers = {};
                for (let [key, value] of formData.entries()) {
                    answers[key] = value;
                }

                // Loading
                coachContent.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-microchip fa-spin fa-3x" style="color:var(--primary-color);"></i><p style="margin-top:20px;">Cevapların analiz ediliyor ve çalışma planın oluşturuluyor...</p></div>`;

                try {
                    const result = await window.AIAnalyst.evaluateQuiz(quizData.topic, answers);
                    renderStep3(quizData.topic, result);
                    saveResultToDB(quizData.topic, result);
                } catch (err) {
                    console.error(err);
                    alert("Analiz hatası.");
                }
            });
        }

        // --- STEP 3: SONUÇ VE PLAN ---
        function renderStep3(topic, result) {
            const html = `
                <div style="text-align:center; margin-bottom:30px;">
                    <h3 style="color:var(--success);">Analiz Tamamlandı! 🎉</h3>
                    <p style="font-size:1.2rem;">Seviyen: <strong>${result.level}</strong></p>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:30px;">
                    <div class="result-box-success">
                        <h4 style="margin-bottom:10px;"><i class="fas fa-check-circle"></i> Güçlü Yönlerin</h4>
                        <ul>
                            ${result.strengths.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="result-box-danger">
                        <h4 style="margin-bottom:10px;"><i class="fas fa-exclamation-circle"></i> Geliştirmen Gerekenler</h4>
                        <ul>
                            ${result.weaknesses.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                <div class="result-box-warning">
                    <h3 style="margin-bottom:15px;"><i class="fas fa-calendar-alt"></i> Sana Özel Çalışma Planı</h3>
                    <p style="margin-bottom:15px; font-style:italic;">"${result.plan.suggestion}"</p>
                    <div style="background:white; padding:15px; border-radius:5px;">
                        <h5 style="margin-bottom:10px;">Program: ${result.plan.schedule}</h5>
                        <ul style="list-style-type:none; padding:0;">
                            ${result.plan.tasks.map(t => `<li style="padding:8px 0; border-bottom:1px solid #eee;"><i class="fas fa-angle-right" style="color:#ef6c00;"></i> ${t}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div style="text-align:center; margin-top:30px;">
                    <button id="btnNewTopic" class="btn-cancel" style="padding:10px 30px;">Yeni Konu Çalış</button>
                </div>
            `;

            coachContent.innerHTML = html;

            document.getElementById('btnNewTopic').addEventListener('click', () => {
                renderStep1();
            });
        }

        async function saveResultToDB(topic, result) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            // user_infos { user_id, data: JSON } (Existing Logic)
            try {
                // Mevcut veriyi al
                let { data: currentRecord } = await supabaseClient
                    .from('user_infos')
                    .select('data')
                    .eq('user_id', user.id)
                    .single();

                let currentData = [];
                if (currentRecord && currentRecord.data) {
                    currentData = Array.isArray(currentRecord.data) ? currentRecord.data : [currentRecord.data];
                }

                // Yeni sonucu ekle
                const newEntry = {
                    topic: topic,
                    date: new Date().toISOString(),
                    result: result
                };
                currentData.push(newEntry);

                // Kaydet (Original Table)
                const { error } = await supabaseClient
                    .from('user_infos')
                    .upsert({ user_id: user.id, data: currentData });

                if (error) console.error("DB Error (user_infos):", error);

            } catch (err) {
                console.error("Save process error (user_infos):", err);
            }

            // --- YENİ TABLOYA KAYIT (user_learning_preferences) ---
            try {
                // Konu ve Seviye bilgisini kaydet
                // Tablo: user_learning_preferences
                // Kolonlar: user_id, topic, level
                const { error: errorPref } = await supabaseClient
                    .from('user_learning_preferences')
                    .insert({
                        user_id: user.id,
                        topic: topic,
                        level: result.level  // result objesinden gelen seviye bilgisi (String)
                    });

                if (errorPref) {
                    console.error("DB Error (user_learning_preferences):", errorPref);
                } else {
                    console.log("Learning preference saved successfully.");
                }

            } catch (err) {
                console.error("Save process error (user_learning_preferences):", err);
            }
        }

        renderStep1();
    }


    // --- ÇIKIŞ YAP ---
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (supabaseClient) await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});
