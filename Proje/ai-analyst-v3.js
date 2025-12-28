/*
    AI Eğitim Analisti ve Öğrenme Koçu Modülü
    (Gemini API Entegrasyonu)
*/

const AI_ANALYST_SYSTEM_PROMPT = `
Sen bir eğitim analitiği ve ölçme-değerlendirme uzmanı yapay zekasısın.
Görevin, bir öğrencinin çözdüğü sorulara verdiği cevaplara bakarak yanlış yapma biçimini (Hata DNA’sı) çıkarmaktır.
`;

const COACH_SYSTEM_PROMPT = `
Sen benim kişisel AI öğrenme koçumsun.
1) Önce benden çalışmak istediğim KONUYU sor.
2) Konuyu aldıktan sonra, o konuya ait kısa ama etkili bir SEVİYE TESPİT TESTİ hazırla (10 soru, kolay-orta-zor, karışık).
3) Test bittikten sonra cevaplarımı analiz et (Seviye, Güçlü/Zayıf Yönler).
4) Bana özel ÇALIŞMA PLANI oluştur.
`;

class AIAnalyst {
    constructor() {
        this.systemPrompt = AI_ANALYST_SYSTEM_PROMPT;
        this.coachPrompt = COACH_SYSTEM_PROMPT;
        this.apiKey = window.CONFIG?.GEMINI_API_KEY;
        this.apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
    }

    /**
     * Gemini API'ye istek atar.
     */
    async callGemini(userPrompt, systemInstruction = "") {
        if (!this.apiKey || this.apiKey === "YOUR_GEMINI_API_KEY_HERE") {
            throw new Error("Lütfen config.js dosyasına geçerli bir Gemini API anahtarı girin.");
        }

        const url = `${this.apiUrl}?key=${this.apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: userPrompt }]
            }],
            // System instruction is supported in specific models/endpoints, 
            // but for simplicity via simple generateContent we can prepend it or use formatting.
            // gemini-1.5-flash supports system_instruction field but let's keep it simple.
            generationConfig: {
                temperature: 0.7,
                response_mime_type: "application/json" // Force JSON response
            }
        };

        if (systemInstruction) {
            // Basic system prompt injection if needed, though usually part of contents or separate field
            // For strict JSON, we rely on response_mime_type
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`API Hatası: ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) throw new Error("API boş yanıt döndürdü.");

            // Temizlik (Markdown işaretlerini kaldır)
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }

    // --- HATA DNA ANALİZİ (Eski - Mock Kalabilir veya API'ye bağlanabilir) ---
    async analyze(data) {
        // Şimdilik eski işlevselliği koruyalım, istenirse burası da API'ye bağlanabilir.
        console.log("AI Analizi (Legacy Mock) Başlatılıyor...");
        await new Promise(r => setTimeout(r, 1000));
        return {
            "hata_dna": { "kavram_eksikligi": 15, "soru_koku_yanlis_anlama": 10, "islem_hatasi": 20, "zaman_yonetimi": 40, "dikkat_hatasi": 15 },
            "baskin_hatalar": ["Zaman Yönetimi"],
            "ogrenci_profili": "Mock Profil",
            "kisa_oneri": "Mock Öneri"
        };
    }

    // --- AI ÖĞRENME KOÇU (Gerçek API) ---

    /**
     * Konuya göre 10 soruluk test oluşturur.
     */
    async generateQuiz(topic) {
        console.log(`Quiz hazırlanıyor (Gemini): ${topic}`);

        const prompt = `
        Konu: ${topic}
        Görev: Bu konuyla ilgili 10 adet seviye tespit sorusu hazırla.
        Sorular kolaydan zora doğru gitmeli. Çoktan seçmeli (multiple) veya boşluk doldurma (text) olabilir.
        Çıktı Formatı (JSON):
        {
            "topic": "${topic}",
            "questions": [
                { "id": 1, "type": "multiple", "text": "Soru metni", "options": ["A", "B", "C", "D"], "correct": "Doğru Şık Metni" },
                { "id": 2, "type": "text", "text": "Açık uçlu soru metni" }
            ]
        }
        Lütfen sadece saf JSON döndür.
        `;

        try {
            return await this.callGemini(prompt);
        } catch (err) {
            console.error("Quiz oluşturulamadı, mock veriye dönülüyor:", err);
            alert("API Hatası: " + err.message + "\nLütfen API anahtarınızı kontrol edin. (Mock veri kullanılıyor)");
            // Fallback to simple mock
            return {
                topic: topic,
                questions: [{ id: 1, type: 'text', text: 'API Hatası nedeniyle soru yüklenemedi. Lütfen config.js dosyasını kontrol et.' }]
            };
        }
    }

    /**
     * Test sonuçlarını değerlendirir ve plan oluşturur.
     */
    async evaluateQuiz(topic, userAnswers) {
        console.log("Cevaplar analiz ediliyor (Gemini)...");

        const answersStr = JSON.stringify(userAnswers);
        const prompt = `
        Konu: ${topic}
        Öğrenci Cevapları: ${answersStr}
        
        Görev: Öğrencinin seviyesini belirle, eksiklerini bul ve bir çalışma planı oluştur.
        Çıktı Formatı (JSON):
        {
            "level": "Başlangıç / Orta / İleri",
            "strengths": ["Güçlü yön 1", "Güçlü yön 2"],
            "weaknesses": ["Zayıf yön 1", "Zayıf yön 2"],
            "plan": {
                "suggestion": "Genel tavsiye cümlesi",
                "schedule": "Haftalık Program Başlığı",
                "tasks": [
                    "Pazartesi: Görev 1",
                    "Çarşamba: Görev 2",
                    "Cuma: Görev 3"
                ]
            }
        }
        Lütfen sadece saf JSON döndür.
        `;

        try {
            return await this.callGemini(prompt);
        } catch (err) {
            console.error("Analiz yapılamadı:", err);
            return {
                level: "Hata",
                strengths: [],
                weaknesses: ["API Bağlantı Hatası"],
                plan: { suggestion: "Lütfen API anahtarınızı kontrol edin.", schedule: "", tasks: [] }
            };
        }
    }

    /**
     * Konu Analizi ve İçerik Üretimi (Smart Bubble)
     */
    async analyzeTopic(topic) {
        console.log(`Konu Analizi Yapılıyor (Gemini): ${topic}`);

        const prompt = `
        Kullanıcının girdiği konu: "${topic}"

        Görevin bu konuyla ilgili bir öğrenme seansı hazırlamak.
        Bana aşağıdaki 3 parça veriyi VE video aramak için uygun anahtar kelimeleri JSON formatında ver.

        1. "videoSearchQuery": Bu konuyu YouTube'da en iyi anlatan videoyu bulmak için KISA ve ÖZ bir arama terimi. (Örn: "Türev konu anlatımı" veya "Photosynthesis lecture")
        2. "quiz": Konuyla ilgili 5 adet çoktan seçmeli soru.
        3. "notes": Konuyla ilgili ders notları. Markdown formatında olsun (Başlıklar, maddeler). Uzun ve açıklayıcı olsun.

        Çıktı Formatı (Saf JSON):
        {
            "videoSearchQuery": "...",
            "quiz": [
                { "question": "Soru 1?", "options": ["A", "B", "C", "D"], "correct": 0 }, 
                { "question": "Soru 2?", "options": ["A", "B", "C", "D"], "correct": 2 }
            ],
            "notes": "# Konu Başlığı\n\n## Alt Başlık\nblabla..."
        }
        `;

        try {
            return await this.callGemini(prompt);
        } catch (err) {
            console.error("Konu analizi hatası:", err);
            throw err;
        }
    }
}

// Global erişim için
window.AIAnalyst = new AIAnalyst();
