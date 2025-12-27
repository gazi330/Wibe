
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
            .select('id,channel_name,channel_url,lesson, exam, youtube_channel_likes(user_id, created_at)');

        if (error) {
            console.error("Kanal verileri çekilemedi:", error);
        } else {
            globalChannels = data || [];
            console.log(`${globalChannels.length} kanal yüklendi.`);
        }
    } catch (err) {
        console.error("Supabase hatası:", err);
    }


    const schema = {
        'LGS': {
            icon: 'fa-graduation-cap',
            desc: 'Liseye Geçiş Sınavı',
            subjects: {
                'LGS Matematik': {},
                'LGS Fen Bilimleri': {}
            }
        },
        'YKS': {
            icon: 'fa-university',
            desc: 'Üniversite sınavına hazırlık',
            subCategories: {
                'TYT': {
                    desc: 'Temel Yeterlilik Testi',
                    subjects: { 'Matematik': {}, 'Fizik': {}, 'Kimya': {}, 'Biyoloji': {}, 'Türkçe': {}, 'Tarih': {}, 'Coğrafya': {} }
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
            subjects: { 'Veri Bilimi': {}, 'Big Data': {}, 'Machine Learning': {}, 'SQL': {}, 'Veri Analizi': {} }
        },

    };


    // --- 3. NAVİGASYON MANTIĞI ---
    const contentGrid = document.getElementById('contentGrid');
    const navBar = document.getElementById('navBar');
    const backBtn = document.getElementById('backBtn');
    const pageTitle = document.getElementById('pageTitle');

    // State
    let currentLevel = 'main'; // main -> category -> subCategory -> subject -> teacher -> playlist -> video
    let selectedCategory = null;
    let selectedSubCategory = null;
    let selectedSubject = null;
    let selectedTeacher = null;
    let selectedPlaylist = null;

    // Başlangıç
    renderMainCategories();

    backBtn.addEventListener('click', () => {
        if (currentLevel === 'video') {
            renderTeacherContent(selectedTeacher); // Video -> Hoca İçeriği'ne dön
        } else if (currentLevel === 'playlist') { // Artık playlist ve popüler videolar aynı seviyede (Teacher Content)
            renderTeachers(selectedSubject); // Hoca İçeriği -> Hoca Listesi'ne dön
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

    // --- DATA FETCHING & API ---

    async function fetchTeacherData(examType, lessonType) {
        if (!globalChannels || globalChannels.length === 0) {
            console.warn("Global kanal listesi boş, fetchTeacherData iptal.");
            return [];
        }

        // Normalizasyon
        const normalize = (str) => str ? str.toString().trim().toLocaleLowerCase('tr-TR') : '';

        const searchExam = normalize(examType);
        const searchLesson = normalize(lessonType);
        const searchLessonShort = normalize(lessonType.replace(/^(LGS|KPSS|DİL)\s+/i, ''));

        // Filtreleme
        let filtered = globalChannels.filter(ch => {
            const dbExam = normalize(ch.exam);
            const dbLesson = normalize(ch.lesson);
            if (dbExam !== searchExam) return false;
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
                <div class="like-badge" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.9); padding:5px 10px; border-radius:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:flex; align-items:center; gap:5px; z-index:2;">
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

            teacher.popularVideos.forEach(video => {
                const card = document.createElement('div');
                card.className = 'video-card';

                const thumbUrl = video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url;
                const title = video.snippet?.title;
                const viewCount = video.statistics?.viewCount || 0;
                // viewCount formatla (örn: 1.5M, 100K)
                const formattedViews = new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(viewCount);

                card.addEventListener('click', () => {
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
                contentGrid.appendChild(card);
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

    // --- ÇIKIŞ YAP ---
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (supabaseClient) await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});
