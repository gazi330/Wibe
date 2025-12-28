/* ================================
   YouTube Data API v3 Service
   ================================ */

const YOUTUBE_API_KEY = "AIzaSyAm0CjFKZ-Rheauy0Qvp5xCyfsjYYEkMcc";

window.YouTubeService = {

    /* --------------------------------
       1️⃣ Kanal URL -> Channel ID
    -------------------------------- */
    async getChannelIdFromUrl(channelUrl) {
        try {
            // /channel/ID
            if (channelUrl.includes("/channel/")) {
                return channelUrl.split("/channel/")[1].split(/[/?]/)[0];
            }

            // @username veya /c/ veya /user/
            const name = channelUrl
                .replace("https://www.youtube.com/", "")
                .replace("@", "")
                .split("/")[0];

            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${name}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();

            if (!data.items?.length) {
                console.warn("Channel ID bulunamadı:", channelUrl);
                return null;
            }

            return data.items[0].snippet.channelId;
        } catch (error) {
            console.error("getChannelIdFromUrl hatası:", error);
            return null;
        }
    },

    /* --------------------------------
       2️⃣ Kanal Videoları (ID)
    -------------------------------- */
    async getChannelVideoIds(channelId, maxResults = 20) {
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();

            return (data.items || []).map(v => v.id.videoId);
        } catch (error) {
            console.error("getChannelVideoIds hatası:", error);
            return [];
        }
    },

    /* --------------------------------
       3️⃣ Video Detayları + İstatistik
    -------------------------------- */
    async getVideosByIds(videoIds) {
        if (!videoIds || !videoIds.length) return [];

        try {
            const ids = videoIds.join(",");

            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();

            return data.items || [];
        } catch (error) {
            console.error("getVideosByIds hatası:", error);
            return [];
        }
    },

    /* --------------------------------
       4️⃣ Popüler Videolar
    -------------------------------- */
    async getPopularVideosByChannelUrl(channelUrl, maxResults = 20) {
        const channelId = await this.getChannelIdFromUrl(channelUrl);
        if (!channelId) return [];

        const videoIds = await this.getChannelVideoIds(channelId, maxResults);
        const videos = await this.getVideosByIds(videoIds);

        return videos.sort(
            (a, b) =>
                Number(b.statistics.viewCount) -
                Number(a.statistics.viewCount)
        );
    },

    /* --------------------------------
       5️⃣ Kanal Playlistleri
    -------------------------------- */
    async getPlaylistsByChannelUrl(channelUrl, maxResults = 20) {
        const channelId = await this.getChannelIdFromUrl(channelUrl);
        if (!channelId) return [];

        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();

            return data.items || [];
        } catch (error) {
            console.error("getPlaylistsByChannelUrl hatası:", error);
            return [];
        }
    },

    /* --------------------------------
       6️⃣ Playlist Videoları
    -------------------------------- */
    async getPlaylistVideos(playlistId, maxResults = 50) {
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();

            return data.items || [];
        } catch (error) {
            console.error("getPlaylistVideos hatası:", error);
            return [];
        }
    },

    /* --------------------------------
       7️⃣ Playlist Videoları + İstatistik
    -------------------------------- */
    async getPlaylistVideosWithStats(playlistId, maxResults = 50) {
        const items = await this.getPlaylistVideos(playlistId, maxResults);
        if (!items.length) return [];

        const videoIds = items.map(item => item.snippet.resourceId.videoId);
        const stats = await this.getVideosByIds(videoIds);

        // İstatistikleri item'larla birleştir
        return items.map(item => {
            const vidStat = stats.find(s => s.id === item.snippet.resourceId.videoId);
            if (vidStat) {
                item.statistics = vidStat.statistics;
                // contentDetails (duration vb) de eklenebilir
                item.contentDetails = vidStat.contentDetails;
            }
            return item;
        });
    },

    /* --------------------------------
       8️⃣ Kanal İçi Video Arama (Query ile)
    -------------------------------- */
    async searchVideosByChannel(channelUrl, query, maxResults = 5) {
        const channelId = await this.getChannelIdFromUrl(channelUrl);
        if (!channelId) return [];

        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();
            return data.items || [];
        } catch (error) {
            console.error("searchVideosByChannel hatası:", error);
            return [];
        }
    },

    /* --------------------------------
       9️⃣ Genel Video Arama (Kanal Bağımsız)
    -------------------------------- */
    async searchVideos(query, maxResults = 5) {
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();
            return data.items || [];
        } catch (error) {
            console.error("searchVideos hatası:", error);
            return [];
        }
    }
};
