# Kozl Music

Site nghe nhạc **hai bản thu gốc** của Kozl — *Dakey* và *Bloodstained Rose* — dựng theo
bố cục SoundCloud: sidebar thư viện, bảng tin, waveform tương tác, thanh phát cố định,
bình luận theo mốc thời gian. Kèm theo là một **hệ thống ảnh bìa**: tải ảnh của bạn lên,
chọn từ 8 bìa dựng sẵn, hoặc tự phối bìa trong Studio rồi xuất PNG.

Toàn bộ là **HTML/CSS/JS thuần** — không build, không framework, không backend, không CDN.
Chỉ cần một máy chủ tĩnh là chạy, kể cả khi offline.

```bash
python3 tools/serve.py 8099     # http://localhost:8099
```

> `tools/serve.py` là máy chủ tĩnh nhỏ có hỗ trợ **HTTP Range** — nhờ đó tua nhạc mượt.
> `python3 -m http.server` không hỗ trợ Range nên kéo waveform sẽ không nhảy đúng.

## Hai bài hát, và ảnh bìa

| Bài | Thời lượng | Thể loại | Bìa gốc |
| --- | --- | --- | --- |
| `Dakey` | 5:05 | Hip-Hop | `assets/covers/dakey.jpg` |
| `Bloodstained Rose` | 5:55 | Alternative | `assets/covers/bloodstained-rose.jpg` |

Bìa **không bị khoá cứng** trong code. Có ba cách thay:

1. **Tải ảnh của bạn** — bấm nút ảnh ở góc bìa (hoặc `Đổi bìa` / `Đổi ảnh bìa`). Ảnh được
   cắt vuông, thu về 720×720 JPEG rồi lưu vào `localStorage`, nên hiện ngay ở trang chủ,
   trang bài hát, thanh phát và màn hình "Đang phát". Kéo–thả ảnh vào ô nét đứt cũng được.
2. **Ảnh dựng sẵn** — 8 bìa trong `assets/presets/` (Crimson, Teal Noir, Sunset, Neon Grid,
   Cream, VHS, Vinyl, Faded Photo), bấm là dùng, hoặc tải về làm ảnh riêng.
3. **Studio ảnh bìa** — canvas 1024×1024: 8 bảng màu × 6 chất liệu (trơn, nhiễu, lưới,
   vòng, scan, quầng) × 3 kiểu chữ × 3 vị trí, có nút ngẫu nhiên. Xuất PNG 1024×1024
   hoặc gán thẳng vào bài hát / playlist / ảnh nghệ sĩ.

Mọi ảnh đã dùng đều nằm lại trong **Thư viện của bạn** (12 ảnh gần nhất) để dùng lại.
Muốn đổi ảnh gốc trên đĩa thì chỉ cần ghi đè `assets/covers/*.jpg` — nút *Dùng lại ảnh gốc*
trong trình chọn ảnh sẽ quay về đúng tệp đó.

## Tính năng

**Nghe nhạc**
- Waveform thật cho từng bài (1000 mốc/bài, tính sẵn từ mp3), tự co giãn theo bề rộng.
- Bấm / kéo để tua, có tooltip thời gian; cập nhật tiến độ theo thời gian thực.
- Phát, tạm dừng, trước/sau, xáo trộn, lặp (tắt → toàn bộ → một bài).
- **Hàng chờ** kéo–thả để đổi thứ tự, xoá từng bài, xoá phần còn lại, nhảy tới bài bất kỳ.
- **Radio**: từ một bài, tự xếp hàng chờ theo thể loại/tag rồi phát liền mạch.
- **Lặp đoạn A-B** để luyện một câu hát: đặt A, đặt B, trình phát tự quay lại.
- **Hẹn giờ tắt** 15/30/60 phút, tự giảm âm lượng rồi dừng.
- **Tốc độ phát** 0,75× – 1,5×.
- **Bộ cân bằng 3 dải + visualizer** bằng Web Audio (tự tắt an toàn nếu trình duyệt chặn).
- Khôi phục bài và vị trí đang nghe, Media Session API (tai nghe / thanh thông báo).
- Màn hình "Đang phát" toàn màn hình: bìa lớn, waveform lớn, lời karaoke cuộn theo nhạc.

**Lời bài hát**
- Cả hai bài đã có lời kèm mốc thời gian, tự cuộn và tô sáng câu đang hát.
- **Sửa lời** ngay trong trình duyệt: chèn mốc thời gian tại đúng giây đang phát,
  nhập tệp `.lrc` hoặc `.txt`, hoặc dán tay theo dạng `[phút:giây] nội dung`.
- Bấm một câu lời để tua thẳng tới mốc đó.

**Thư viện & tương tác**
- Thích bài, lưu playlist, theo dõi nghệ sĩ — lưu trong `localStorage` (khoá `kozl.v2`).
- Tạo **danh sách phát của riêng bạn**: chọn bài, đặt tên, mô tả, đổi tên, xoá, đổi bìa.
- Bình luận gắn với mốc thời gian; bấm mốc để tua. Marker hiện trên waveform.
- **Thống kê nghe** trên máy: tổng thời gian, 7 ngày gần nhất, bài nghe nhiều nhất,
  lịch sử từng phiên, nút xoá dữ liệu.
- Bảng tin, thư viện, tìm kiếm (gợi ý + điều hướng bằng phím), trang nghệ sĩ, trang bài hát.
- Chia sẻ bằng liên kết có mốc thời gian (`#/track/dakey?t=120`) hoặc Web Share API.

**Giao diện**
- Sáng/tối, 6 màu nhấn, tất cả lưu lại giữa các lần mở.
- PWA: manifest + icon, cài lên màn hình chính, service worker giữ app shell để mở offline.
- Responsive tới 390px; thanh điều hướng đáy, player 2 tầng trên di động, không tràn ngang.
- `prefers-reduced-motion`, skip-link, nhãn ARIA cho các nút điều khiển.

## Cấu trúc

```
index.html                 khung ứng dụng, sprite icon SVG, modal, drawer
manifest.webmanifest       cấu hình PWA
sw.js                      service worker (app shell, không cache mp3)
assets/css/app.css         toàn bộ giao diện (token, layout, responsive)
assets/js/data.js          nghệ sĩ, 2 bài hát (kèm lời), playlist, presets
assets/js/peaks.js         dữ liệu waveform cho 2 bài
assets/js/core.js          tiện ích, localStorage, AudioFX, Player, waveform
assets/js/covers.js        trình chọn ảnh bìa + Studio canvas
assets/js/views.js         HTML cho từng màn hình
assets/js/app.js           router, sự kiện, đồng bộ UI
assets/covers/             bìa 2 bài (+ bản -blur)
assets/playlists/          bìa 2 danh sách phát (+ bản -blur)
assets/presets/            8 bìa dựng sẵn để chọn / tải về
assets/artists/            avatar + banner nghệ sĩ
music/                     dakey.mp3, BLOODSTAINED-ROSE.mp3
tools/serve.py             máy chủ tĩnh có HTTP Range
tools/gen_peaks.py         tính waveform cho một tệp mp3
tools/make_covers.py       sinh lại 8 preset + bìa playlist
```

## Đổi ảnh bìa trên đĩa (không cần code)

- Bài hát: ghi đè `assets/covers/dakey.jpg` / `assets/covers/bloodstained-rose.jpg`
  (ảnh vuông, từ 800×800 trở lên). Bản `-blur.jpg` là nền mờ, có thể bỏ qua.
- Danh sách phát: `assets/playlists/kozl-essentials.jpg`, `after-hours.jpg`.
- Preset: `assets/presets/01-crimson.jpg` … `08-faded-photo.jpg`.

Sinh lại toàn bộ ảnh dựng sẵn bằng script (cần `pillow` + `numpy`):

```bash
python3 -m venv .venv && .venv/bin/pip install numpy pillow imageio-ffmpeg
.venv/bin/python tools/make_covers.py
```

## Thêm bài hát mới

1. Chép `.mp3` vào `music/`.
2. Thêm object vào `tracks` trong `assets/js/data.js`:
   ```js
   {
     id: "ten-bai",                       // dùng trong URL #/track/ten-bai
     title: "Tên bài", artistId: "kozl",
     src: "music/ten-bai.mp3",
     cover: "assets/covers/ten-bai.jpg",
     peaksKey: "ten-bai", duration: 213,
     genre: "Lo-Fi", plays: 0, likes: 0, reposts: 0,
     uploadedAt: "2026-10-23",
     description: "…", tags: ["lofi"],
     lyrics: [{ t: 0, text: "…" }],       // tuỳ chọn
     comments: []
   }
   ```
3. Thêm id vào `trackIds` của playlist nếu muốn.
4. Tính waveform rồi dán vào `assets/js/peaks.js`:

```bash
python3 tools/gen_peaks.py music/ten-bai.mp3 > /tmp/peaks.json
```

Không có peak thì waveform vẫn hiện (dạng ước lệ), chỉ là không khớp âm thanh thật.

## Phím tắt

| Phím | Tác dụng |
| --- | --- |
| `Space` / `K` | Phát / tạm dừng |
| `←` `→` | Tua 5 giây |
| `J` `L` | Tua 10 giây |
| `↑` `↓` | Tăng / giảm âm lượng |
| `M` | Tắt / bật tiếng |
| `N` / `P` | Bài tiếp / bài trước |
| `S` / `R` | Xáo trộn / đổi chế độ lặp |
| `Q` | Hàng chờ |
| `T` | Công cụ phát (tốc độ, hẹn giờ, EQ) |
| `Shift` + `L` | Mở trình phát lớn |
| `/` | Tìm kiếm |
| `?` | Bảng phím tắt |
| `Esc` | Đóng lớp đang mở |

## Ghi chú kỹ thuật

- Dữ liệu người dùng nằm trong `localStorage` khoá `kozl.v2` (tự đọc `kozl.v1` một lần để
  chuyển dữ liệu cũ). Dùng ảnh base64 nên có thể chạm giới hạn ~5 MB; khi lưu thất bại,
  ứng dụng báo "Bộ nhớ trình duyệt đã đầy" thay vì im lặng.
- Web Audio chỉ được khởi tạo sau thao tác đầu tiên của người dùng (theo chính sách autoplay);
  nếu môi trường chặn, EQ/visualizer tự tắt và phần phát vẫn chạy bình thường.
- Service worker chỉ đăng ký khi chạy qua HTTPS (hoặc `localhost`).
