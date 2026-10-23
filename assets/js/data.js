/* =========================================================================
   Kozl Music — dữ liệu catalogue
   Thêm bài mới: copy file mp3 vào /music, thêm 1 object vào tracks bên dưới.
   (Nhớ chạy tools/make_peaks2.py nếu muốn có waveform riêng cho bài mới)
   ========================================================================= */
window.KOZL_DATA = (function () {
  const artists = [
    {
      id: "kozl",
      name: "Kozl",
      handle: "kozl",
      verified: true,
      avatar: "assets/artists/kozl-avatar.jpg",
      banner: "assets/artists/kozl-banner.jpg",
      blur: "assets/artists/kozl-banner-blur.jpg",
      location: "Hưng Yên, Việt Nam",
      followers: 12480,
      following: 87,
      bio:
        "Kozl — không gian âm thanh tối giản. Âm nhạc tự viết, tự thu, tự trộn. " +
        "Nếu bạn nghe thấy điều gì đó vào lúc 3 giờ sáng, rất có thể nó đã thành một bài hát.",
      links: ["instagram.com/kozl", "soundcloud.com/kozl"],
    },
    {
      id: "kozl-studio",
      name: "Kozl Studio",
      handle: "kozlstudio",
      verified: false,
      avatar: "assets/artists/kozl-studio-avatar.jpg",
      banner: "assets/artists/kozl-studio-banner.jpg",
      blur: "assets/artists/kozl-studio-banner-blur.jpg",
      location: "Phòng thu nhỏ, tầng 4",
      followers: 5120,
      following: 12,
      bio:
        "Những bản phác thảo (sketch) ngắn, làm trong một buổi tối và không bao giờ được hoàn thiện. " +
        "Đây là nơi Kozl thử nghiệm chất liệu mới trước khi đưa vào bản chính thức.",
      links: [],
    },
  ];

  const tracks = [
    {
      id: "dakey",
      title: "Dakey",
      artistId: "kozl",
      src: "music/dakey.mp3",
      cover: "assets/covers/dakey.jpg",
      blur: "assets/covers/dakey-blur.jpg",
      peaksKey: "dakey",
      duration: 305,
      genre: "Hip-Hop",
      plays: 128430,
      likes: 8214,
      reposts: 642,
      uploadedAt: "2026-09-18",
      description:
        "Bản thu lúc 2 giờ sáng, giữ nguyên cả tiếng thở và tiếng ồn của phòng. " +
        "Không chỉnh sửa gì thêm sau lần mix đầu tiên.",
      tags: ["rap", "melodic", "late night"],
      comments: [
        { id: "c1", user: "linh.vy", at: 42, text: "Đoạn bass vào ở 0:42 đúng là đỉnh.", timeAgo: "3 ngày" },
        { id: "c2", user: "tuananhh", at: 121, text: "Nghe lúc đi xe buýt về nhà, hợp đến lạ.", timeAgo: "1 tuần" },
        { id: "c3", user: "m.mira", at: 228, text: "mix thoáng quá, nghe được cả tiếng phòng thu 🔥", timeAgo: "2 tuần" },
      ],
    },
    {
      id: "bloodstained-rose",
      title: "Bloodstained Rose",
      artistId: "kozl",
      src: "music/BLOODSTAINED-ROSE.mp3",
      cover: "assets/covers/bloodstained-rose.jpg",
      blur: "assets/covers/bloodstained-rose-blur.jpg",
      peaksKey: "BLOODSTAINED-ROSE",
      duration: 355,
      genre: "Alternative",
      plays: 342918,
      likes: 19204,
      reposts: 2140,
      uploadedAt: "2026-07-02",
      description:
        "Viết trong một tuần mưa. Hoa hồng, thủy tinh và những thứ không thể giữ lại được. " +
        "Đây là bản thu dài nhất của Kozl tính đến hiện tại.",
      tags: ["dark", "cinematic", "gothic"],
      comments: [
        { id: "c4", user: "hai.dang", at: 96, text: "Đoạn drop này mình nghe lại cả chục lần.", timeAgo: "5 ngày" },
        { id: "c5", user: "nhi.le", at: 214, text: "Outro buồn kiểu rất đẹp.", timeAgo: "3 tuần" },
      ],
    },
    {
      id: "neon-drift",
      title: "Neon Drift",
      artistId: "kozl-studio",
      src: "music/sessions/neon-drift.mp3",
      cover: "assets/covers/neon-drift.jpg",
      blur: "assets/covers/neon-drift-blur.jpg",
      peaksKey: "neon-drift",
      duration: 94,
      genre: "Electronic",
      plays: 64120,
      likes: 3820,
      reposts: 214,
      uploadedAt: "2026-10-09",
      description:
        "Sketch số 01 của phòng thu. Lái xe qua thành phố lúc 1 giờ sáng, đèn neon tan vào nước mưa.",
      tags: ["neon", "night drive", "synth"],
      comments: [
        { id: "c6", user: "quang.h", at: 38, text: "Cảm giác như đang chạy xe trên đường vành đai.", timeAgo: "4 ngày" },
      ],
    },
    {
      id: "midnight-tape",
      title: "Midnight Tape",
      artistId: "kozl-studio",
      src: "music/sessions/midnight-tape.mp3",
      cover: "assets/covers/midnight-tape.jpg",
      blur: "assets/covers/midnight-tape-blur.jpg",
      peaksKey: "midnight-tape",
      duration: 98,
      genre: "Lo-Fi",
      plays: 41882,
      likes: 2914,
      reposts: 168,
      uploadedAt: "2026-09-27",
      description:
        "Sketch số 02. Ghi vào băng cát-xét cũ, cố ý để lại tiếng nhiễu và tiếng mưa ngoài cửa sổ.",
      tags: ["lofi", "tape", "study"],
      comments: [
        { id: "c7", user: "minhh", at: 24, text: "Tự nhiên nhớ cái máy cassette của bố.", timeAgo: "1 tuần" },
        { id: "c8", user: "phuong.anh", at: 70, text: "Học bài với bài này là bao nhiêu cũng xong.", timeAgo: "2 tuần" },
      ],
    },
    {
      id: "rooftop-rain",
      title: "Rooftop Rain",
      artistId: "kozl-studio",
      src: "music/sessions/rooftop-rain.mp3",
      cover: "assets/covers/rooftop-rain.jpg",
      blur: "assets/covers/rooftop-rain-blur.jpg",
      peaksKey: "rooftop-rain",
      duration: 87,
      genre: "Chillhop",
      plays: 28340,
      likes: 1988,
      reposts: 96,
      uploadedAt: "2026-10-15",
      description: "Sketch số 03. Thu tiếng mưa thật trên mái nhà rồi đặt nhịp lên trên.",
      tags: ["rain", "chill", "night"],
      comments: [
        { id: "c9", user: "trang.n", at: 15, text: "Tiếng mưa ở đầu bài là thu thật hả? Thật quá.", timeAgo: "2 ngày" },
      ],
    },
    {
      id: "afterglow",
      title: "Afterglow",
      artistId: "kozl-studio",
      src: "music/sessions/afterglow.mp3",
      cover: "assets/covers/afterglow.jpg",
      blur: "assets/covers/afterglow-blur.jpg",
      peaksKey: "afterglow",
      duration: 95,
      genre: "Ambient",
      plays: 19705,
      likes: 1402,
      reposts: 71,
      uploadedAt: "2026-10-21",
      description:
        "Sketch số 04, cũng là bài mới nhất. Không có trống, chỉ có pad và một chút ánh sáng còn lại sau hoàng hôn.",
      tags: ["ambient", "drone", "calm"],
      comments: [],
    },
  ];

  const playlists = [
    {
      id: "late-night-drive",
      title: "Late Night Drive",
      curator: "Kozl",
      description: "Những bài để chạy xe khi thành phố đã ngủ. Đèn đường, nhạc và không nói gì cả.",
      cover: "assets/playlists/late-night-drive.jpg",
      blur: "assets/playlists/late-night-drive-blur.jpg",
      genre: "Electronic",
      plays: 18420,
      trackIds: ["neon-drift", "midnight-tape", "dakey", "rooftop-rain"],
    },
    {
      id: "rainy-window",
      title: "Rainy Window",
      curator: "Kozl",
      description: "Mưa ngoài cửa sổ, một tách trà và không có kế hoạch gì cho hôm nay.",
      cover: "assets/playlists/rainy-window.jpg",
      blur: "assets/playlists/rainy-window-blur.jpg",
      genre: "Chillhop",
      plays: 12730,
      trackIds: ["rooftop-rain", "midnight-tape", "afterglow", "neon-drift"],
    },
    {
      id: "kozl-essentials",
      title: "Kozl Essentials",
      curator: "Kozl",
      description: "Toàn bộ những gì cần biết về Kozl, xếp từ cũ đến mới. Bắt đầu ở đây.",
      cover: "assets/playlists/kozl-essentials.jpg",
      blur: "assets/playlists/kozl-essentials-blur.jpg",
      genre: "Tất cả",
      plays: 30150,
      trackIds: ["bloodstained-rose", "dakey", "neon-drift", "midnight-tape", "rooftop-rain", "afterglow"],
    },
    {
      id: "dark-room",
      title: "Dark Room",
      curator: "Kozl",
      description: "Dành cho những đêm không muốn ngủ và không muốn nói chuyện với ai.",
      cover: "assets/playlists/dark-room.jpg",
      blur: "assets/playlists/dark-room-blur.jpg",
      genre: "Alternative",
      plays: 9860,
      trackIds: ["bloodstained-rose", "dakey", "midnight-tape", "afterglow"],
    },
    {
      id: "focus-mode",
      title: "Focus Mode",
      curator: "Kozl",
      description: "Không lời, không cao trào, không làm bạn phân tâm. Bật lên và làm việc.",
      cover: "assets/playlists/focus-mode.jpg",
      blur: "assets/playlists/focus-mode-blur.jpg",
      genre: "Ambient",
      plays: 15640,
      trackIds: ["afterglow", "midnight-tape", "rooftop-rain", "neon-drift"],
    },
    {
      id: "night-shift",
      title: "Night Shift",
      curator: "Kozl",
      description: "Cho những người làm việc khi cả thành phố đã tắt đèn.",
      cover: "assets/playlists/night-shift.jpg",
      blur: "assets/playlists/night-shift-blur.jpg",
      genre: "Lo-Fi",
      plays: 7310,
      trackIds: ["dakey", "neon-drift", "rooftop-rain", "midnight-tape"],
    },
  ];

  const genres = [
    { id: "all", label: "Tất cả", color: "#ff5500" },
    { id: "Hip-Hop", label: "Hip-Hop", color: "#f5a623" },
    { id: "Alternative", label: "Alternative", color: "#c2185b" },
    { id: "Electronic", label: "Electronic", color: "#7c4dff" },
    { id: "Lo-Fi", label: "Lo-Fi", color: "#26a69a" },
    { id: "Chillhop", label: "Chillhop", color: "#42a5f5" },
    { id: "Ambient", label: "Ambient", color: "#8d9db6" },
  ];

  return { artists, tracks, playlists, genres };
})();
