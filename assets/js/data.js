/* =========================================================================
   Kozl Music — dữ liệu catalogue
   Chỉ còn 2 bản thu gốc: Dakey & Bloodstained Rose.
   Thêm bài mới: chép mp3 vào /music, thêm object vào tracks, chạy
   tools/gen_peaks.py rồi dán kết quả vào assets/js/peaks.js
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
      location: "Hưng Yên, Việt Nam",
      followers: 12480,
      following: 87,
      bio:
        "Kozl — không gian âm thanh tối giản. Nhạc tự viết, tự thu, tự trộn. " +
        "Hiện có hai bản thu gốc, tất cả đều nghe được ở đây, không cần tài khoản.",
      links: ["instagram.com/kozl", "soundcloud.com/kozl"],
    },
  ];

  const tracks = [
    {
      id: "bloodstained-rose",
      title: "Bloodstained Rose",
      artistId: "kozl",
      src: "music/BLOODSTAINED-ROSE.mp3",
      cover: "assets/covers/bloodstained-rose.jpg",
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
        { id: "c6", user: "trang.n", at: 41, text: "Mở đầu bằng tiếng thở rồi mới vào nhạc, hay thật.", timeAgo: "1 tháng" },
      ],
      lyrics: [
        { t: 6, text: "Mưa rơi qua ô cửa chưa khép" },
        { t: 18, text: "Tôi giữ lại mùi hương cũ" },
        { t: 31, text: "Một đoá hồng đỏ như vết son" },
        { t: 45, text: "Nở trong bóng tối rồi tàn" },
        { t: 62, text: "Nếu có thể giữ lại một giây" },
        { t: 76, text: "Tôi chọn giây phút em còn ở đây" },
        { t: 94, text: "Thủy tinh vỡ dưới chân, không sao" },
        { t: 112, text: "Vì tim cũng vỡ từ lâu rồi" },
        { t: 134, text: "Đừng gọi tên tôi trong mưa" },
        { t: 153, text: "Đừng hứa những điều không thể giữ" },
        { t: 178, text: "Hoa hồng máu, máu trên tay" },
        { t: 200, text: "Tôi vẫn chờ dù chẳng còn ai" },
        { t: 224, text: "Mưa tạnh rồi, chỉ còn tôi" },
        { t: 250, text: "Và một đoá hồng không còn đỏ" },
        { t: 282, text: "Khép lại — khép lại — khép lại" }
      ]
    },
    {
      id: "dakey",
      title: "Dakey",
      artistId: "kozl",
      src: "music/dakey.mp3",
      cover: "assets/covers/dakey.jpg",
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
      lyrics: [
        { t: 4, text: "2 giờ sáng, thành phố ngủ im" },
        { t: 16, text: "Tôi vẫn thức, viết tiếp câu chuyện mình" },
        { t: 29, text: "Tiếng quạt trần, tiếng thở dài" },
        { t: 41, text: "Bass vào — mọi thứ đổi thay" },
        { t: 60, text: "Dakey, dakey, tôi đi qua đêm" },
        { t: 74, text: "Không cần ai hiểu, chỉ cần mình êm" },
        { t: 92, text: "Nếu mai này có người nghe lại" },
        { t: 110, text: "Thì đây là tất cả tôi có" },
        { t: 128, text: "Không auto-tune, không son phấn" },
        { t: 146, text: "Chỉ có phòng thu và cơn mộng" },
        { t: 168, text: "Giữ nguyên tiếng thở, giữ nguyên nỗi nhớ" },
        { t: 190, text: "Ánh đèn đường làm nhòe con chữ" },
        { t: 214, text: "Ngủ đi, mai còn phải sống" },
        { t: 240, text: "Dakey — dakey — tắt đèn" }
      ]
    },
  ];

  const playlists = [
    {
      id: "kozl-essentials",
      title: "Kozl Essentials",
      curator: "Kozl",
      description: "Cả hai bản thu gốc, xếp từ cũ đến mới. Bắt đầu ở đây nếu bạn mới biết Kozl.",
      cover: "assets/playlists/kozl-essentials.jpg",
      genre: "Tất cả",
      plays: 30150,
      trackIds: ["bloodstained-rose", "dakey"],
    },
    {
      id: "after-hours",
      title: "After Hours",
      curator: "Kozl",
      description: "Nghe lúc khuya, đèn tắt, không nói gì. Hai bài, đủ cho một đêm.",
      cover: "assets/playlists/after-hours.jpg",
      genre: "Late night",
      plays: 12730,
      trackIds: ["dakey", "bloodstained-rose"],
    },
  ];

  const genres = [
    { id: "all", label: "Tất cả", color: "#ff5500" },
    { id: "Hip-Hop", label: "Hip-Hop", color: "#f5a623" },
    { id: "Alternative", label: "Alternative", color: "#c2185b" },
  ];

  /* Ảnh bìa dựng sẵn — dùng được ngay trong trình đổi ảnh */
  const presets = [
    { id: "p1", name: "Crimson", src: "assets/presets/01-crimson.jpg" },
    { id: "p2", name: "Teal Noir", src: "assets/presets/02-teal-noir.jpg" },
    { id: "p3", name: "Sunset", src: "assets/presets/03-sunset.jpg" },
    { id: "p4", name: "Neon Grid", src: "assets/presets/04-neon-grid.jpg" },
    { id: "p5", name: "Cream", src: "assets/presets/05-cream.jpg" },
    { id: "p6", name: "VHS", src: "assets/presets/06-vhs.jpg" },
    { id: "p7", name: "Vinyl", src: "assets/presets/07-vinyl.jpg" },
    { id: "p8", name: "Faded Photo", src: "assets/presets/08-faded-photo.jpg" },
  ];

  return { artists, tracks, playlists, genres, presets };
})();
