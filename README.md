# Kozl Music

Một không gian nghe nhạc tối giản, lấy cảm hứng bố cục từ SoundCloud: sidebar thư viện,
bảng tin, waveform tương tác, thanh phát cố định và bình luận theo mốc thời gian.

Toàn bộ là **HTML/CSS/JS thuần**, không build, không framework, không backend.
Chỉ cần mở `index.html` qua một máy chủ tĩnh là chạy.

```bash
python3 tools/serve.py          # http://localhost:8080
# hoặc
npx serve .
```

> `tools/serve.py` là máy chủ tĩnh nhỏ có hỗ trợ **HTTP Range** — nhờ đó tua nhạc
> hoạt động mượt. `python3 -m http.server` không hỗ trợ Range nên thanh waveform
> sẽ không tua được.

## Tính năng

**Nghe nhạc**
- Waveform thật cho từng bài (peak được tính sẵn, 1000 mốc/bài), tự co giãn theo bề rộng.
- Bấm / kéo trên waveform để tua, có tooltip thời gian, hiển thị tiến độ theo thời gian thực.
- Phát, tạm dừng, bài trước/sau, xáo trộn, lặp (tắt → toàn bộ → một bài).
- Hàng chờ (queue) có thể xem, nhảy tới bài bất kỳ, xoá từng bài hoặc xoá phần còn lại.
- Màn hình "Đang phát" toàn màn hình với bìa lớn, waveform lớn, điều khiển đầy đủ.
- Khôi phục bài và vị trí đang nghe sau khi tải lại trang.
- Tích hợp Media Session API: điều khiển từ tai nghe/thanh thông báo của hệ điều hành.
- Phím tắt đầy đủ (`?` để xem danh sách).

**Thư viện và tương tác**
- Thích bài hát, lưu danh sách phát, theo dõi nghệ sĩ — lưu trong `localStorage`.
- Trang "Bài đã thích" phát được toàn bộ hoặc xáo trộn.
- Bình luận theo mốc thời gian: bình luận gắn với giây đang phát, bấm vào mốc để tua tới.
- **Radio**: từ một bài, tạo hàng chờ gồm những bài cùng thể loại/tag và phát liền mạch.
- Tìm kiếm tức thời có gợi ý (bài hát / nghệ sĩ / playlist), điều hướng bằng phím mũi tên.
- Trang chủ, bảng tin, thư viện, tìm kiếm theo thể loại, trang bài hát, trang nghệ sĩ.
- Tải lên tệp audio từ máy — chỉ phát cục bộ trong trình duyệt, không gửi đi đâu.

**Chi tiết nhỏ**
- PWA: có manifest + icon, cài được lên màn hình chính.
- Responsive tới 390px, điều hướng đáy trên di động.
- Tôn trọng `prefers-reduced-motion`, có skip-link và nhãn ARIA cho các nút điều khiển.

## Thêm bài hát mới

1. Chép tệp `.mp3` vào `music/` (hoặc `music/sessions/`).
2. Thêm một object vào mảng `tracks` trong `assets/js/data.js`:
   ```js
   {
     id: "ten-bai",                    // duy nhất, dùng trong URL #/track/ten-bai
     title: "Tên bài",
     artistId: "kozl",                 // id trong mảng artists
     src: "music/ten-bai.mp3",
     cover: "assets/covers/ten-bai.jpg",
     blur: "assets/covers/ten-bai-blur.jpg",  // ảnh nền mờ (có thể bỏ trống)
     peaksKey: "ten-bai",              // khoá trong assets/js/peaks.js
     duration: 213,
     genre: "Lo-Fi",
     plays: 0, likes: 0, reposts: 0,
     uploadedAt: "2026-10-23",
     description: "…",
     tags: ["lofi"],
     comments: []
   },
   ```
3. Thêm bài vào `trackIds` của playlist nếu muốn nó xuất hiện ở đó.

### Waveform cho bài mới

Chạy script tính peak (cần `numpy` + `imageio-ffmpeg`):

```bash
python3 tools/gen_peaks.py music/ten-bai.mp3 > /tmp/peaks.json
```

rồi dán giá trị vào `assets/js/peaks.js` theo dạng:

```js
window.KOZL_PEAKS = {
  "ten-bai": { "duration": 213.4, "peaks": "…1000 ký tự…" }
};
```

Nếu không có peak, waveform vẫn hiển thị nhưng chỉ là dạng sóng ước lệ.

> Ghi chú: bốn bản nhạc trong `music/sessions/` (Neon Drift, Midnight Tape,
> Rooftop Rain, Afterglow) là bản phác thảo tổng hợp bằng numpy để làm dữ liệu
> demo cho catalogue — xem `tools/gen_sessions.py`.

## Cấu trúc

```
index.html                 khung ứng dụng + sprite icon SVG
manifest.webmanifest       cấu hình PWA
assets/css/app.css         toàn bộ giao diện
assets/js/data.js          nghệ sĩ, bài hát, playlist, thể loại
assets/js/peaks.js         dữ liệu waveform
assets/js/core.js          tiện ích, localStorage, trình phát, waveform
assets/js/views.js         HTML cho từng màn hình
assets/js/app.js           router, sự kiện, đồng bộ UI
assets/covers/             bìa bài hát (+ bản -blur cho nền)
assets/playlists/          bìa danh sách phát
assets/artists/            avatar + banner nghệ sĩ
music/                     tệp mp3
tools/serve.py             máy chủ tĩnh có HTTP Range
tools/gen_peaks.py         tính waveform cho một tệp mp3
tools/gen_sessions.py      sinh các bản nhạc demo
```

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
| `/` | Tìm kiếm |
| `?` | Bảng phím tắt |
| `Esc` | Đóng lớp đang mở |
