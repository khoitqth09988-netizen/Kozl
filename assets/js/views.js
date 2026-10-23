/* =========================================================================
   Kozl Music — các màn hình
   ========================================================================= */
(function () {
  "use strict";

  const K = window.K;
  const D = K.data;
  const esc = K.esc;
  const icon = K.icon;

  const VERIFIED =
    '<svg class="verified" viewBox="0 0 24 24" aria-label="Đã xác minh"><path d="m12 1.8 2.6 2.3 3.4-.4 1.2 3.2 3 1.7-1 3.3 1 3.3-3 1.7-1.2 3.2-3.4-.4L12 22.2l-2.6-2.3-3.4.4-1.2-3.2-3-1.7 1-3.3-1-3.3 3-1.7 1.2-3.2 3.4.4L12 1.8Z" fill="#4da3ff"/><path d="m7.8 12.2 2.7 2.7 5.7-5.6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const coverOf = (id) => K.store.coverOf(id);
  const plCover = (id) => K.store.playlistCoverOf(id);
  const avatarOf = (id) => K.store.avatarOf(id);

  function byNewest(a, b) {
    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
  }

  function sectionHead(title, sub, linkHref, linkLabel) {
    return (
      '<div class="section-head"><div><h2 class="section-title">' + title + "</h2>" +
      (sub ? '<p class="section-sub">' + sub + "</p>" : "") + "</div>" +
      (linkHref
        ? '<a class="section-link" href="' + linkHref + '">' + esc(linkLabel || "Xem tất cả") + icon("chevron") + "</a>"
        : "") + "</div>"
    );
  }

  function artistLink(t) {
    const a = K.artistById[t.artistId];
    if (!a) return "";
    return '<a href="#/artist/' + a.id + '">' + esc(a.name) + "</a>" + (a.verified ? VERIFIED : "");
  }

  /* ---------------- dòng bài hát ---------------- */
  function trackRow(t, opts) {
    opts = opts || {};
    const artist = K.artistById[t.artistId];
    const liked = K.store.isLiked(t.id);
    return (
      '<div class="track-row" data-track-id="' + esc(t.id) + '">' +
        '<div class="row-art"><img src="' + esc(coverOf(t.id)) + '" alt="Bìa ' + esc(t.title) + '" loading="lazy">' +
          '<button class="row-play" data-play="' + esc(t.id) + '" aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>" +
          '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
        "</div>" +
        '<div class="row-main">' +
          '<a class="row-title" href="#/track/' + esc(t.id) + '">' + esc(t.title) + "</a>" +
          '<div class="row-artist">' + (artist ? artistLink(t) : "") +
            '<span class="sep">·</span><span>' + esc(K.relTime(t.uploadedAt)) + "</span>" +
            '<span class="sep">·</span><span class="row-genre">' + esc(t.genre) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="row-wave"><div class="wave" data-wave data-bars="' + (opts.bars || 84) + '" tabindex="-1" aria-label="Tua ' + esc(t.title) + '"></div></div>' +
        '<div class="row-side">' +
          '<span class="row-stat">' + icon("play") + K.fmtCount(t.plays) + "</span>" +
          (opts.removeFrom
            ? '<button class="icon-btn row-remove" data-remove-from="' + esc(opts.removeFrom) + ":" + esc(t.id) + '" aria-label="Bỏ khỏi danh sách">' + icon("close") + "</button>"
            : "") +
          '<button class="icon-btn row-like' + (liked ? " is-liked" : "") + '" data-like="' + esc(t.id) + '" aria-label="Thích" aria-pressed="' + liked + '">' +
            icon(liked ? "heart-fill" : "heart") + "</button>" +
          '<button class="icon-btn row-more" data-track-menu="' + esc(t.id) + '" aria-label="Tuỳ chọn">' + icon("more") + "</button>" +
          '<span class="row-dur">' + K.fmtTime(t.duration) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  function tracklist(tracks, opts) {
    opts = opts || {};
    if (!tracks.length) {
      return '<div class="empty">' + icon("headphones") + "<div>Chưa có bài nào ở đây.</div></div>";
    }
    return (
      '<div class="tracklist" data-tracklist' + (opts.context ? ' data-page-context="' + esc(opts.context) + '"' : "") + ">" +
      tracks.map((t) => trackRow(t, opts)).join("") +
      "</div>"
    );
  }

  /* ---------------- thẻ ---------------- */
  function trackCard(t, opts) {
    opts = opts || {};
    return (
      '<article class="card">' +
        '<div class="card-art">' +
          '<a href="#/track/' + esc(t.id) + '" aria-label="' + esc(t.title) + '">' +
            "<img src=\"" + esc(coverOf(t.id)) + '" alt="Bìa ' + esc(t.title) + '" loading="lazy"></a>' +
          '<button class="card-play" data-play="' + esc(t.id) + '"' +
            (opts.ids ? ' data-queue-ids="' + esc(opts.ids.join(",")) + '" data-queue-label="' + esc(opts.label || "") + '"' : "") +
            ' aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>" +
          K.covers.coverButton({ type: "track", id: t.id }) +
        "</div>" +
        '<div class="card-body">' +
          '<a class="card-title" href="#/track/' + esc(t.id) + '">' + esc(t.title) + "</a>" +
          '<div class="card-sub">' + esc((K.artistById[t.artistId] || {}).name || "") + " · " + K.fmtTime(t.duration) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function playlistCard(p) {
    const tracks = K.playlistTracks(p);
    const id = p.id;
    return (
      '<article class="card card-playlist">' +
        '<div class="card-art">' +
          '<a href="#/playlist/' + esc(id) + '"><img src="' + esc(plCover(id)) + '" alt="Bìa ' + esc(p.title) + '" loading="lazy"></a>' +
          (tracks.length
            ? '<button class="card-play" data-play-playlist="' + esc(id) + '" aria-label="Phát ' + esc(p.title) + '">' + icon("play") + "</button>"
            : "") +
          K.covers.coverButton({ type: "playlist", id }) +
        "</div>" +
        '<div class="card-body">' +
          '<a class="card-title" href="#/playlist/' + esc(id) + '">' + esc(p.title) + "</a>" +
          '<div class="card-sub">' + tracks.length + " bài · " + esc(p.curator) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function artistCard(a) {
    return (
      '<a class="artist-card" href="#/artist/' + esc(a.id) + '">' +
        '<span class="artist-card-art">' +
          '<img src="' + esc(avatarOf(a.id)) + '" alt="Ảnh ' + esc(a.name) + '" loading="lazy">' +
        "</span>" +
        '<span class="ac-name">' + esc(a.name) + (a.verified ? VERIFIED : "") + "</span>" +
        '<span class="ac-meta">' + K.fmtCount(a.followers) + " người theo dõi</span>" +
      "</a>"
    );
  }

  /* ---------------- bình luận ---------------- */
  function commentListHTML(t, comments) {
    if (!comments.length) {
      return '<div class="empty">' + icon("comment") + "<div>Chưa có bình luận nào. Bạn là người đầu tiên?</div></div>";
    }
    return (
      '<div class="comment-list">' +
      comments
        .map(
          (c) =>
            '<div class="comment">' +
              '<span class="comment-avatar" style="' + K.avatarStyle(c.user) + '">' + esc(K.thumbfall(c.user)) + "</span>" +
              '<div class="comment-body"><div class="comment-top">' +
                '<span class="comment-user">@' + esc(c.user) + "</span>" +
                (typeof c.at === "number" && c.at >= 0
                  ? '<button class="comment-at" data-seek-to="' + c.at + '">' + K.fmtTime(c.at) + "</button>"
                  : "") +
                '<span class="comment-time">' + esc(c.timeAgo || "vừa xong") + "</span>" +
              "</div>" +
              '<p class="comment-text">' + esc(c.text) + "</p></div>" +
            "</div>"
        )
        .join("") +
      "</div>"
    );
  }

  /* ---------------- lời bài hát ---------------- */
  function lyricsHTML(trackId, opts) {
    const lines = K.store.lyricsFor(trackId);
    opts = opts || {};
    if (!lines.length) {
      return (
        '<div class="empty lyrics-empty">' + icon("lyrics") +
          "<div><b>Chưa có lời bài hát</b><br>Thêm lời kèm mốc thời gian để hát theo kiểu karaoke.</div>" +
          '<div class="empty-actions">' +
            '<button class="btn btn-sm btn-outline" data-edit-lyrics="' + esc(trackId) + '">' + icon("pencil") + " Thêm lời</button>" +
            '<button class="btn btn-sm btn-ghost" data-import-lrc="' + esc(trackId) + '">' + icon("upload") + " Nhập file .lrc</button>" +
          "</div></div>"
      );
    }
    return (
      '<div class="lyrics' + (opts.compact ? " is-compact" : "") + '" data-lyrics-track="' + esc(trackId) + '">' +
      lines
        .map(
          (l) =>
            '<button class="lyric-line" data-lyric-at="' + l.t + '"><span class="lyric-time">' + K.fmtTime(l.t) + "</span>" +
            "<span class=\"lyric-text\">" + esc(l.text) + "</span></button>"
        )
        .join("") +
      "</div>" +
      (opts.hideActions
        ? ""
        : '<div class="lyrics-actions">' +
          '<button class="btn btn-sm btn-ghost" data-edit-lyrics="' + esc(trackId) + '">' + icon("pencil") + " Sửa lời</button>" +
          '<button class="btn btn-sm btn-ghost" data-open-lyrics-player="' + esc(trackId) + '">' + icon("lyrics") + " Mở chế độ karaoke</button>" +
          "</div>")
    );
  }

  /* ---------------- TRANG CHỦ ---------------- */
  function home() {
    const featured = D.tracks.slice().sort(byNewest)[0];
    const other = D.tracks.filter((t) => t.id !== featured.id)[0];
    const allIds = D.tracks.map((t) => t.id);
    const st = K.store.state;
    const commentCount =
      D.tracks.reduce((n, t) => n + (t.comments || []).length + K.store.commentsFor(t.id).length, 0) || 0;
    const topLists = K.store.allPlaylists();

    return {
      title: "Trang chủ",
      html:
        '<section class="hero">' +
          '<div class="hero-bg" style="background-image:url(\'' + esc(coverOf(featured.id)) + "')\"></div>" +
          '<div class="hero-content">' +
            '<span class="eyebrow">' + icon("sparkle") + " Bản thu mới · " + esc(K.relTime(featured.uploadedAt)) + "</span>" +
            '<h1 class="hero-title">' + esc(featured.title) + "</h1>" +
            '<p class="hero-desc">' + esc(featured.description) + "</p>" +
            '<div class="hero-meta"><span>Kozl</span><span class="dot">•</span><span>' + esc(featured.genre) + "</span>" +
              '<span class="dot">•</span><span>' + K.fmtTime(featured.duration) + "</span>" +
              '<span class="dot">•</span><span>' + K.fmtCount(featured.plays) + " lượt nghe</span></div>" +
            '<div class="hero-actions">' +
              '<button class="btn btn-primary btn-lg" data-play="' + esc(featured.id) + '" data-queue-ids="' + esc(allIds.join(",")) + '" data-queue-label="Tất cả bản thu">' +
                icon("play") + " Phát</button>" +
              '<button class="btn btn-outline btn-lg" data-play="' + esc(other.id) + '" data-queue-ids="' + esc(allIds.join(",")) + '" data-queue-label="Tất cả bản thu">' +
                icon("headphones") + " " + esc(other.title) + "</button>" +
            "</div>" +
          "</div>" +
          '<div class="hero-art" aria-hidden="true"><div class="hero-stack">' +
            '<img src="' + esc(coverOf(other.id)) + '" alt="">' +
            '<img src="' + esc(avatarOf("kozl")) + '" alt="">' +
            '<img src="' + esc(coverOf(featured.id)) + '" alt="">' +
          "</div></div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("disc") + " Hai bản thu gốc", "Toàn bộ nhạc của Kozl — chỉ hai bài, nghe trọn vẹn") +
          '<div class="feature-grid">' +
            D.tracks.map((t) => {
              const liked = K.store.isLiked(t.id);
              const lyrics = K.store.lyricsFor(t.id);
              return (
                '<article class="feature-card' + (K.player && K.player.track && K.player.track.id === t.id ? " is-current" : "") + '">' +
                  '<div class="feature-art">' +
                    '<img src="' + esc(coverOf(t.id)) + '" alt="Bìa ' + esc(t.title) + '">' +
                    '<button class="feature-play" data-play="' + esc(t.id) + '" data-queue-ids="' + esc(allIds.join(",")) + '" data-queue-label="Tất cả bản thu" aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>" +
                    K.covers.coverButton({ type: "track", id: t.id }) +
                  "</div>" +
                  '<div class="feature-body">' +
                    '<div class="feature-top"><a class="feature-title" href="#/track/' + esc(t.id) + '">' + esc(t.title) + "</a>" +
                      '<span class="badge">' + esc(t.genre) + "</span></div>" +
                    '<p class="feature-desc">' + esc(t.description) + "</p>" +
                    '<div class="feature-meta">' +
                      "<span>" + K.fmtTime(t.duration) + "</span><span class=\"dot\">•</span>" +
                      "<span>" + K.fmtCount(t.plays) + " lượt nghe</span><span class=\"dot\">•</span>" +
                      "<span>" + (t.comments || []).length + " bình luận</span>" +
                      (lyrics.length ? '<span class="dot">•</span><span class="ok">có lời</span>' : "") +
                    "</div>" +
                    '<div class="feature-actions">' +
                      '<button class="icon-btn' + (liked ? " is-liked" : "") + '" data-like="' + esc(t.id) + '" aria-label="Thích">' +
                        icon(liked ? "heart-fill" : "heart") + "</button>" +
                      '<a class="icon-btn" href="#/track/' + esc(t.id) + '" aria-label="Mở trang bài hát">' + icon("chevron") + "</a>" +
                    "</div>" +
                  "</div>" +
                "</article>"
              );
            }).join("") +
          "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("chart") + " Nghe của bạn", "Thống kê lưu ngay trên máy này") +
          '<div class="stat-strip">' +
            '<div class="stat"><span class="stat-num">' + K.fmtLong(st.stats.total || 0) + "</span><span class=\"stat-label\">tổng thời gian nghe</span></div>" +
            '<div class="stat"><span class="stat-num">' + st.likes.size + "</span><span class=\"stat-label\">bài đã thích</span></div>" +
            '<div class="stat"><span class="stat-num">' + (st.gallery.length || 0) + "</span><span class=\"stat-label\">ảnh bìa tự tạo</span></div>" +
            '<div class="stat"><span class="stat-num">' + commentCount + "</span><span class=\"stat-label\">bình luận</span></div>" +
            '<a class="stat-link" href="#/stats">Xem chi tiết' + icon("chevron") + "</a>" +
          "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("library") + " Danh sách phát", "Nghe theo tâm trạng", "#/library", "Thư viện") +
          '<div class="card-grid">' + topLists.map(playlistCard).join("") +
            '<a class="card card-new" href="#/library?new=1"><div class="card-art card-new-art">' + icon("plus") + "</div>" +
            '<div class="card-body"><span class="card-title">Tạo danh sách mới</span><div class="card-sub">Của bạn</div></div></a>' +
          "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("palette") + " Studio ảnh bìa", "Tự tạo bìa cho bài hát — xuất PNG hoặc dùng ngay", "#/studio", "Mở studio") +
          '<div class="studio-promo">' +
            '<div class="studio-promo-art">' +
              D.presets.slice(0, 4).map((p) => '<img src="' + esc(p.src) + '" alt="' + esc(p.name) + '">').join("") +
            "</div>" +
            '<div class="studio-promo-text">' +
              "<h3>Bìa nhạc trong 10 giây</h3>" +
              "<p>Chọn bảng màu, chất liệu, kiểu chữ và vị trí. Hoặc tải ảnh của bạn lên rồi cắt vuông tự động.</p>" +
              '<div class="studio-promo-actions">' +
                '<button class="btn btn-primary" data-open-studio="track:' + esc(D.tracks[0].id) + '">' + icon("sparkle") + " Tạo bìa cho " + esc(D.tracks[0].title) + "</button>" +
                '<a class="btn btn-outline" href="#/studio">' + icon("image") + " Thư viện ảnh</a>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("headphones") + " Nghệ sĩ", null) +
          '<div class="artist-grid">' + D.artists.map(artistCard).join("") + "</div>" +
        "</section>"
    };
  }

  /* ---------------- BẢNG TIN ---------------- */
  function feed() {
    const st = K.store.state;
    const items = [];
    D.tracks.slice().sort(byNewest).forEach((t) => {
      items.push(
        '<article class="feed-item">' +
          '<img class="feed-avatar" src="' + esc(avatarOf("kozl")) + '" alt="">' +
          "<div>" +
            '<div class="feed-line"><b>Kozl</b> đăng bản thu mới' + VERIFIED +
            '<span class="feed-time">' + esc(K.relTime(t.uploadedAt)) + "</span></div>" +
            '<div class="feed-card">' +
              '<a class="feed-card-link" href="#/track/' + esc(t.id) + '">' +
                '<img src="' + esc(coverOf(t.id)) + '" alt="">' +
                '<div class="feed-card-text"><div class="feed-card-title">' + esc(t.title) + "</div>" +
                '<div class="feed-card-sub">' + esc(t.genre) + " · " + K.fmtTime(t.duration) + " · " + K.fmtCount(t.plays) + " lượt nghe</div></div>" +
              "</a>" +
              '<button class="icon-btn" data-play="' + esc(t.id) + '" aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    });
    K.store.allPlaylists().forEach((p) => {
      items.push(
        '<article class="feed-item">' +
          '<img class="feed-avatar" src="' + esc(avatarOf("kozl")) + '" alt="">' +
          '<div><div class="feed-line"><b>Kozl</b> tạo danh sách phát mới<span class="feed-time">' +
            esc(p.custom ? "của bạn" : K.relTime("2026-10-01")) + "</span></div>" +
            '<a class="feed-card" href="#/playlist/' + esc(p.id) + '">' +
              '<img src="' + esc(plCover(p.id)) + '" alt="">' +
              '<div class="feed-card-text"><div class="feed-card-title">' + esc(p.title) + "</div>" +
              '<div class="feed-card-sub">' + K.playlistTracks(p).length + " bài · " + esc(p.genre) + "</div></div>" +
              icon("chevron") +
            "</a></div>" +
        "</article>"
      );
    });
    const myComments = [];
    Object.keys(st.comments).forEach((tid) => {
      (st.comments[tid] || []).forEach((c) => {
        const t = K.trackById[tid];
        if (t) myComments.push({ t, c });
      });
    });
    myComments.slice(0, 6).forEach(({ t, c }) => {
      items.push(
        '<article class="feed-item">' +
          '<span class="comment-avatar feed-avatar" style="' + K.avatarStyle(c.user) + '">' + esc(K.thumbfall(c.user)) + "</span>" +
          "<div><div class=\"feed-line\"><b>Bạn</b> đã bình luận về “" + esc(t.title) + "”<span class=\"feed-time\">" +
            esc(c.timeAgo || "vừa xong") + "</span></div>" +
            '<a class="feed-card" href="#/track/' + esc(t.id) + '">' +
              '<img src="' + esc(coverOf(t.id)) + '" alt="">' +
              '<div class="feed-card-text"><div class="feed-card-title">' + esc(c.text) + "</div>" +
              '<div class="feed-card-sub">tại ' + K.fmtTime(c.at) + " · " + esc(t.title) + "</div></div>" +
              icon("chevron") +
            "</a></div>" +
        "</article>"
      );
    });

    return {
      title: "Bảng tin",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("feed") + " Bảng tin</span>" +
        '<h1 class="page-title">Chuyện mới trên Kozl</h1>' +
        '<p class="page-sub">Bản thu, danh sách phát và bình luận của bạn — theo đúng thứ tự thời gian.</p></div>' +
        '<div class="feed">' + items.join("") + "</div>"
    };
  }

  /* ---------------- THƯ VIỆN ---------------- */
  function library(params) {
    const st = K.store.state;
    const liked = D.tracks.filter((t) => st.likes.has(t.id));
    const lists = K.store.allPlaylists();
    const recent = st.recents.map((id) => K.trackById[id]).filter(Boolean);
    const following = D.artists.filter((a) => st.following.has(a.id));

    const libCard = (href, img, title, sub, round, editTarget) =>
      '<div class="lib-card">' +
        '<a class="lib-art" href="' + href + '"><img src="' + esc(img) + '" alt="" class="' + (round ? "round" : "") + '"></a>' +
        '<div class="lib-text"><a class="lc-title" href="' + href + '">' + esc(title) + "</a>" +
        '<div class="lc-sub">' + esc(sub) + "</div></div>" +
        (editTarget ? K.covers.coverButton(editTarget, "cover-edit cover-edit-sm") : "") +
      "</div>";

    return {
      title: "Thư viện",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("library") + " Thư viện</span>" +
        '<h1 class="page-title">Của bạn</h1>' +
        "<p class=\"page-sub\">Mọi thứ bạn thích, lưu và tạo — nằm trong trình duyệt này.</p>" +
        '<div class="page-actions">' +
          '<button class="btn btn-primary" data-new-playlist>' + icon("plus") + " Danh sách mới</button>" +
          '<a class="btn btn-outline" href="#/studio">' + icon("palette") + " Studio ảnh bìa</a>" +
        "</div></div>" +

        '<section class="section" style="margin-top:0">' +
          sectionHead(icon("heart") + " Bài đã thích", liked.length + " bài", "#/likes", "Mở danh sách") +
          (liked.length
            ? '<div class="library-grid">' + liked.map((t) =>
                libCard("#/track/" + t.id, coverOf(t.id), t.title,
                  (K.artistById[t.artistId] || {}).name + " · " + K.fmtTime(t.duration), false, { type: "track", id: t.id })
              ).join("") + "</div>"
            : '<div class="empty">' + icon("heart") + "<div>Chưa thích bài nào. Nhấn trái tim ở bất kỳ bài hát nào nhé.</div></div>") +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("library") + " Danh sách phát", lists.length + " danh sách", null) +
          '<div class="library-grid">' + lists.map((p) =>
            libCard("#/playlist/" + p.id, plCover(p.id), p.title,
              K.playlistTracks(p).length + " bài" + (p.custom ? " · của bạn" : K.store.isSaved(p.id) ? " · đã lưu" : " · tuyển chọn"), false, { type: "playlist", id: p.id })
          ).join("") +
          '<button class="lib-card lib-card-new" data-new-playlist>' + icon("plus") +
            '<span class="lc-title">Tạo danh sách mới</span></button>' +
          "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("clock") + " Nghe gần đây", recent.length + " bài", null) +
          (recent.length
            ? '<div class="library-grid">' + recent.slice(0, 6).map((t) =>
                libCard("#/track/" + t.id, coverOf(t.id), t.title,
                  (K.artistById[t.artistId] || {}).name + " · " + K.fmtTime(t.duration), false, null)
              ).join("") + "</div>"
            : '<div class="empty">' + icon("clock") + "<div>Chưa nghe bài nào trong phiên này.</div></div>") +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("headphones") + " Nghệ sĩ đang theo dõi", following.length + " nghệ sĩ", null) +
          (following.length
            ? '<div class="artist-grid">' + following.map(artistCard).join("") + "</div>"
            : '<div class="empty">' + icon("headphones") + "<div>Chưa theo dõi ai. Mở trang nghệ sĩ và nhấn “Theo dõi”.</div></div>") +
        "</section>"
    };
  }

  /* ---------------- BÀI ĐÃ THÍCH ---------------- */
  function likes() {
    const list = D.tracks.filter((t) => K.store.state.likes.has(t.id));
    return {
      title: "Bài đã thích",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("heart") + " Bộ sưu tập</span>" +
        '<h1 class="page-title">Bài đã thích</h1>' +
        "<p class=\"page-sub\">" + (list.length ? list.length + " bài · " + K.fmtLong(K.totalDuration(list)) + " âm nhạc." : "Danh sách này đang trống.") + "</p></div>" +
        (list.length
          ? '<div class="detail-actions" style="margin-bottom:22px">' +
            '<button class="btn btn-primary" data-play-list="likes">' + icon("play") + " Phát tất cả</button>" +
            '<button class="btn btn-outline" data-play-list="likes" data-shuffle-play>' + icon("shuffle") + " Xáo trộn</button>" +
            "</div><div data-list-pass=\"likes\">" + tracklist(list) + "</div>"
          : '<div class="empty">' + icon("heart") + "<div>Chưa có bài nào được thích.<br>Quay lại trang chủ và thả tim cho vài bài nhé.</div></div>")
    };
  }

  /* ---------------- TÌM KIẾM ---------------- */
  function search(params) {
    const q = (params.q || "").trim();
    const tab = params.tab || "all";
    const needle = q.toLowerCase();
    const tracks = D.tracks.filter((t) => (t.title + " " + t.genre + " " + (t.tags || []).join(" ")).toLowerCase().includes(needle));
    const lists = K.store.allPlaylists().filter((p) => (p.title + " " + p.description + " " + p.genre + " " + p.curator).toLowerCase().includes(needle));
    const artists = D.artists.filter((a) => (a.name + " " + a.bio).toLowerCase().includes(needle));

    if (!q) {
      return {
        title: "Tìm kiếm",
        html:
          '<div class="page-head"><span class="eyebrow">' + icon("search") + " Tìm kiếm</span>" +
          '<h1 class="page-title">Bạn muốn nghe gì?</h1>' +
          "<p class=\"page-sub\">Có hai bản thu gốc, hai danh sách phát và vài bìa dựng sẵn để thử.</p></div>" +
          '<div class="quick-links">' +
            '<a class="quick" href="#/track/dakey">' + icon("play") + "<span><b>Dakey</b><small>Hip-Hop · 5:05</small></span></a>" +
            '<a class="quick" href="#/track/bloodstained-rose">' + icon("play") + "<span><b>Bloodstained Rose</b><small>Alternative · 5:55</small></span></a>" +
            '<a class="quick" href="#/studio">' + icon("palette") + "<span><b>Studio ảnh bìa</b><small>Tạo bìa cho bài</small></span></a>" +
            '<a class="quick" href="#/stats">' + icon("chart") + "<span><b>Thống kê nghe</b><small>Xem bạn nghe bao nhiêu</small></span></a>" +
          "</div>"
      };
    }

    const tabs = [
      { id: "all", label: "Tất cả", n: tracks.length + lists.length + artists.length },
      { id: "tracks", label: "Bài hát", n: tracks.length },
      { id: "playlists", label: "Danh sách", n: lists.length },
      { id: "artists", label: "Nghệ sĩ", n: artists.length },
    ];
    const base = "#/search?q=" + encodeURIComponent(q) + "&";
    let body = "";
    if ((tab === "all" || tab === "tracks") && tracks.length) {
      body += '<section class="section" style="margin-top:0">' + sectionHead("Bài hát", tracks.length + " kết quả", null) + tracklist(tracks) + "</section>";
    }
    if ((tab === "all" || tab === "playlists") && lists.length) {
      body += '<section class="section"' + (tab === "all" ? "" : ' style="margin-top:0"') + ">" +
        sectionHead("Danh sách phát", lists.length + " kết quả", null) +
        '<div class="card-grid">' + lists.map(playlistCard).join("") + "</div></section>";
    }
    if ((tab === "all" || tab === "artists") && artists.length) {
      body += '<section class="section"' + (tab === "all" ? "" : ' style="margin-top:0"') + ">" +
        sectionHead("Nghệ sĩ", artists.length + " kết quả", null) +
        '<div class="artist-grid">' + artists.map(artistCard).join("") + "</div></section>";
    }
    if (!body) body = '<div class="empty">' + icon("search") + "<div>Không tìm thấy gì cho “" + esc(q) + "”.</div></div>";

    return {
      title: "Tìm kiếm: " + q,
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("search") + " Tìm kiếm</span>" +
        '<h1 class="page-title">' + esc(q) + "</h1>" +
        '<p class="page-sub">' + (tracks.length + lists.length + artists.length) + " kết quả.</p></div>" +
        '<div class="search-tabs">' + tabs.map((t) =>
          '<button class="search-tab' + (t.id === tab ? " is-active" : "") + '" data-goto="' + esc(base + "tab=" + t.id) + '">' +
            esc(t.label) + "<span>" + t.n + "</span></button>"
        ).join("") + "</div>" + body
    };
  }

  /* ---------------- DANH SÁCH PHÁT ---------------- */
  function playlist(params) {
    const p = K.store.playlistById(params.id);
    if (!p) return null;
    const tracks = K.playlistTracks(p);
    const saved = K.store.isSaved(p.id);
    const cover = plCover(p.id);
    return {
      title: p.title,
      html:
        '<section class="detail-head">' +
          '<div class="detail-bg" style="background-image:url(\'' + esc(cover) + "')\"></div>" +
          '<div class="detail-art"><img src="' + esc(cover) + '" alt="">' + K.covers.coverButton({ type: "playlist", id: p.id }) + "</div>" +
          '<div class="detail-info">' +
            '<span class="eyebrow">' + icon("library") + " Danh sách phát" + (p.custom ? " · của bạn" : "") + "</span>" +
            '<h1 class="detail-title">' + esc(p.title) + "</h1>" +
            '<p class="detail-desc">' + esc(p.description || "Chưa có mô tả.") + "</p>" +
            '<div class="detail-meta"><a href="#/artist/kozl">' + esc(p.curator) + "</a><span class=\"dot\">•</span>" +
              "<span>" + tracks.length + " bài</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtLong(K.totalDuration(tracks)) + "</span><span class=\"dot\">•</span>" +
              "<span>" + esc(p.genre) + "</span></div>" +
            '<div class="detail-actions">' +
              (tracks.length ? '<button class="btn btn-primary" data-play-playlist="' + esc(p.id) + '">' + icon("play") + " Phát</button>" +
                '<button class="btn btn-outline" data-shuffle-playlist="' + esc(p.id) + '">' + icon("shuffle") + " Xáo trộn</button>" : "") +
              '<button class="btn btn-outline' + (saved ? " is-saved" : "") + '" data-save="' + esc(p.id) + '">' +
                icon(saved ? "check" : "plus") + "<span>" + (saved ? "Đã lưu" : "Lưu") + "</span></button>" +
              '<button class="btn btn-outline" data-edit-cover="playlist:' + esc(p.id) + '">' + icon("palette") + " Đổi ảnh bìa</button>" +
              (p.custom
                ? '<button class="btn btn-outline" data-rename-playlist="' + esc(p.id) + '">' + icon("pencil") + " Đổi tên</button>" +
                  '<button class="btn btn-ghost" data-delete-playlist="' + esc(p.id) + '">' + icon("trash") + " Xoá</button>"
                : "") +
              '<button class="btn btn-ghost" data-share="' + esc(p.id) + '">' + icon("share") + " Chia sẻ</button>" +
            "</div>" +
          "</div>" +
        "</section>" +
        (tracks.length
          ? tracklist(tracks, { bars: 110, context: p.title, removeFrom: p.custom ? p.id : null })
          : '<div class="empty">' + icon("plus") + "<div>Danh sách còn trống. Thêm bài từ trang bài hát.</div>" +
            '<div class="empty-actions"><a class="btn btn-sm btn-outline" href="#/">Đi tới trang chủ</a></div></div>')
    };
  }

  /* ---------------- BÀI HÁT ---------------- */
  function track(params) {
    const t = K.trackById[params.id];
    if (!t) return null;
    const a = K.artistById[t.artistId];
    const liked = K.store.isLiked(t.id);
    const comments = (t.comments || []).concat(K.store.commentsFor(t.id));
    const other = D.tracks.filter((x) => x.id !== t.id);
    const lyrics = K.store.lyricsFor(t.id);

    return {
      title: t.title,
      html:
        '<div class="track-hero">' +
          '<div class="track-cover"><img src="' + esc(coverOf(t.id)) + '" alt="Bìa ' + esc(t.title) + '">' +
            K.covers.coverButton({ type: "track", id: t.id }) + "</div>" +
          "<div>" +
            '<span class="eyebrow">' + icon("sparkle") + " " + esc(t.genre) + " · " + esc(K.relTime(t.uploadedAt)) + "</span>" +
            '<h1 class="track-title">' + esc(t.title) + "</h1>" +
            '<div class="track-artist">' + (a ? '<img src="' + esc(avatarOf(a.id)) + '" alt="">' : "") +
              (a ? '<a href="#/artist/' + a.id + '">' + esc(a.name) + "</a>" + (a.verified ? VERIFIED : "") : "") + "</div>" +
            '<div class="track-actions">' +
              '<button class="btn btn-primary" data-play="' + esc(t.id) + '">' + icon("play") + " Phát</button>" +
              '<button class="btn btn-outline' + (liked ? " is-liked" : "") + '" data-like="' + esc(t.id) + '" aria-pressed="' + liked + '">' +
                icon(liked ? "heart-fill" : "heart") + '<span class="like-label">' + (liked ? "Đã thích" : "Thích") + "</span>" +
                ' <span class="like-count">' + K.fmtCount(t.likes) + "</span></button>" +
              '<button class="btn btn-outline" data-radio="' + esc(t.id) + '">' + icon("sparkle") + " Radio</button>" +
              '<button class="btn btn-outline" data-enqueue="' + esc(t.id) + '">' + icon("plus") + " Hàng chờ</button>" +
              '<button class="btn btn-outline" data-add-to-playlist="' + esc(t.id) + '">' + icon("library") + " Thêm vào DS</button>" +
              '<button class="btn btn-outline" data-edit-cover="track:' + esc(t.id) + '">' + icon("palette") + " Đổi bìa</button>" +
              '<button class="btn btn-ghost" data-share="' + esc(t.id) + '">' + icon("share") + " Chia sẻ</button>" +
            "</div>" +
            '<div class="track-stats">' +
              "<span><b>" + K.fmtCount(t.plays) + "</b> lượt nghe</span>" +
              "<span><b>" + K.fmtCount(t.likes) + "</b> thích</span>" +
              "<span><b>" + K.fmtCount(t.reposts) + "</b> chia sẻ lại</span>" +
              "<span><b>" + esc(K.fmtDate(t.uploadedAt)) + "</b></span>" +
            "</div>" +
            '<div class="track-wave-wrap">' +
              '<div class="track-wave-head"><span class="eyebrow">' + icon("headphones") + " Waveform</span>" +
                '<div class="ab-status" id="ab-status"></div>' +
                '<span class="time"><span id="track-pos">0:00</span> / ' + K.fmtTime(t.duration) + "</span></div>" +
              '<div class="wave wave-big" id="track-wave" data-wave data-bars="190" tabindex="0" aria-label="Tua ' + esc(t.title) + '"></div>' +
              '<div class="ab-row">' +
                '<button class="btn btn-sm btn-ghost" data-ab="a">' + icon("repeat-one") + " Điểm A</button>" +
                '<button class="btn btn-sm btn-ghost" data-ab="b">' + icon("repeat") + " Điểm B</button>" +
                '<button class="btn btn-sm btn-ghost" data-ab="clear">Xoá A-B</button>' +
                '<span class="small muted">Luyện một đoạn: đặt A rồi B, trình phát tự lặp.</span>' +
              "</div>" +
            "</div>" +
            '<p class="track-desc">' + esc(t.description) + "</p>" +
            '<div class="taglist">' + t.tags.map((tag) => '<a class="tag" href="#/search?q=' + encodeURIComponent(tag) + '">#' + esc(tag) + "</a>").join("") + "</div>" +
          "</div>" +
        "</div>" +

        '<section class="panel">' +
          '<div class="panel-head">' +
            "<div><h2 class=\"section-title\">" + icon("lyrics") + " Lời bài hát</h2>" +
              '<p class="section-sub">' + (lyrics.length ? lyrics.length + " dòng · bấm để tua tới" : "Karaoke theo mốc thời gian") + "</p></div>" +
            '<div class="panel-actions">' +
              (lyrics.length ? '<button class="btn btn-sm btn-outline" data-open-lyrics-player="' + esc(t.id) + '">' + icon("expand") + " Chế độ lớn</button>" : "") +
              '<button class="btn btn-sm btn-outline" data-edit-lyrics="' + esc(t.id) + '">' + icon("pencil") + " " + (lyrics.length ? "Sửa lời" : "Thêm lời") + "</button>" +
            "</div>" +
          "</div>" +
          lyricsHTML(t.id) +
        "</section>" +

        '<section class="comments panel">' +
          '<div class="panel-head"><div><h2 class="section-title">' + icon("comment") + " Bình luận</h2>" +
            '<p class="section-sub">' + comments.length + " bình luận</p></div></div>" +
          '<div id="comment-list">' + commentListHTML(t, comments) + "</div>" +
          '<form class="comment-form" data-comment-form="' + esc(t.id) + '">' +
            '<input type="text" maxlength="400" autocomplete="off" aria-label="Viết bình luận" placeholder="Viết bình luận…" required>' +
            '<span class="at-hint" id="comment-at-hint">tại 0:00</span>' +
            '<button class="btn btn-primary" type="submit">Gửi</button>' +
          "</form>" +
        "</section>" +

        (other.length
          ? '<section class="section">' + sectionHead("Bản thu khác", "Nghe tiếp", null) +
            '<div class="feature-grid">' + other.map((x) => trackCard(x, {})).join("") + "</div></section>"
          : "")
    };
  }

  /* ---------------- NGHỆ SĨ ---------------- */
  function artist(params) {
    const a = K.artistById[params.id];
    if (!a) return null;
    const tracks = K.artistTracks(a.id).sort(byNewest);
    const lists = K.store.allPlaylists().filter((p) => p.curator === a.name || (!p.custom && p.curator === "Kozl"));
    const following = K.store.isFollowing(a.id);
    const totalPlays = tracks.reduce((s, t) => s + t.plays, 0);

    return {
      title: a.name,
      html:
        '<div class="artist-banner"><img src="' + esc(a.banner || "") + '" alt=""></div>' +
        '<section class="detail-head artist-head">' +
          '<div class="detail-art round"><img src="' + esc(avatarOf(a.id)) + '" alt="">' + K.covers.coverButton({ type: "artist", id: a.id }) + "</div>" +
          '<div class="detail-info">' +
            '<span class="eyebrow">' + icon("headphones") + " Nghệ sĩ</span>" +
            '<h1 class="detail-title">' + esc(a.name) + (a.verified ? VERIFIED : "") + "</h1>" +
            '<p class="detail-desc">' + esc(a.bio) + "</p>" +
            '<div class="detail-meta"><span>' + esc(a.location) + '</span><span class="dot">•</span>' +
              "<span><b>" + K.fmtCount(a.followers) + "</b> người theo dõi</span><span class=\"dot\">•</span>" +
              "<span>" + tracks.length + " bài hát</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtCount(totalPlays) + " lượt nghe</span></div>" +
            '<div class="detail-actions">' +
              '<button class="btn btn-primary" data-play-artist="' + esc(a.id) + '">' + icon("play") + " Phát tất cả</button>" +
              '<button class="btn btn-outline" data-follow="' + esc(a.id) + '">' + icon(following ? "check" : "plus") +
                "<span>" + (following ? "Đang theo dõi" : "Theo dõi") + "</span></button>" +
              '<button class="btn btn-outline" data-edit-cover="artist:' + esc(a.id) + '">' + icon("image") + " Đổi ảnh đại diện</button>" +
            "</div>" +
          "</div>" +
        "</section>" +
        '<section class="section" style="margin-top:0">' +
          sectionHead(icon("disc") + " Bài hát", tracks.length + " bản thu", null) +
          tracklist(tracks, { context: a.name }) +
        "</section>" +
        (lists.length
          ? '<section class="section">' + sectionHead(icon("library") + " Danh sách phát", "Do " + esc(a.name) + " tuyển chọn", null) +
            '<div class="card-grid">' + lists.map(playlistCard).join("") + "</div></section>"
          : "")
    };
  }

  /* ---------------- THỐNG KÊ ---------------- */
  function stats() {
    const s = K.store.state.stats;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()], sec: s.days[key] || 0 });
    }
    const maxDay = Math.max(60, ...days.map((d) => d.sec));
    const topTracks = Object.keys(s.tracks)
      .map((id) => ({ t: K.trackById[id], sec: s.tracks[id] }))
      .filter((x) => x.t)
      .sort((a, b) => b.sec - a.sec);
    const maxTrack = Math.max(1, ...topTracks.map((x) => x.sec));
    const sessions = K.store.state.history.slice(0, 14);
    const hasData = (s.total || 0) > 0;

    return {
      title: "Thống kê nghe",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("chart") + " Thống kê</span>" +
        '<h1 class="page-title">Bạn đã nghe gì</h1>' +
        "<p class=\"page-sub\">Số liệu nằm trong trình duyệt này, không gửi đi đâu. Nghe thêm để thấy thay đổi.</p></div>" +

        '<div class="stat-cards">' +
          '<div class="stat-card"><span class="stat-card-label">Tổng thời gian</span>' +
            '<span class="stat-card-value">' + K.fmtLong(s.total || 0) + "</span>" +
            '<span class="stat-card-sub">' + (s.total ? "tương đương " + Math.max(1, Math.round(s.total / 300)) + " lần nghe hết Dakey" : "chưa có dữ liệu") + "</span></div>" +
          '<div class="stat-card"><span class="stat-card-label">Phiên gần đây</span>' +
            '<span class="stat-card-value">' + K.store.state.history.length + "</span><span class=\"stat-card-sub\">lần ghi nhận</span></div>" +
          '<div class="stat-card"><span class="stat-card-label">Bài đã thích</span>' +
            '<span class="stat-card-value">' + K.store.state.likes.size + "</span><span class=\"stat-card-sub\">trong thư viện</span></div>" +
          '<div class="stat-card"><span class="stat-card-label">Bình luận</span>' +
            '<span class="stat-card-value">' + Object.values(K.store.state.comments).reduce((n, a) => n + a.length, 0) + "</span>" +
            '<span class="stat-card-sub">bạn đã viết</span></div>' +
        "</div>" +

        '<section class="panel">' +
          '<div class="panel-head"><div><h2 class="section-title">' + icon("chart") + " 7 ngày qua</h2>" +
            '<p class="section-sub">Thời gian nghe mỗi ngày</p></div></div>' +
          '<div class="bars' + (hasData ? "" : " is-empty") + '">' + days.map((d) =>
            '<div class="bar-col" title="' + d.key + ": " + K.fmtLong(d.sec) + '">' +
              '<span class="bar-value">' + (d.sec ? Math.round(d.sec / 60) + "′" : "") + "</span>" +
              '<span class="bar" style="height:' + Math.max(3, Math.round((d.sec / maxDay) * 100)) + '%"></span>' +
              '<span class="bar-label">' + d.label + "</span>" +
            "</div>"
          ).join("") + "</div>" +
          (hasData ? "" : '<p class="bars-note">Chưa có dữ liệu nghe. Bật một bài rồi quay lại sau vài phút — thống kê được lưu ngay trên máy này.</p>') +
        "</section>" +

        '<section class="panel">' +
          '<div class="panel-head"><div><h2 class="section-title">' + icon("headphones") + " Nghe nhiều nhất</h2>" +
            '<p class="section-sub">' + (topTracks.length ? "tính theo thời gian thực nghe" : "chưa có dữ liệu") + "</p></div></div>" +
          (topTracks.length
            ? '<div class="top-tracks">' + topTracks.map((x) =>
                '<a class="top-track" href="#/track/' + esc(x.t.id) + '">' +
                  '<img src="' + esc(coverOf(x.t.id)) + '" alt="">' +
                  '<div class="tt-main"><span class="tt-title">' + esc(x.t.title) + "</span>" +
                    '<span class="tt-bar"><span style="width:' + Math.round((x.sec / maxTrack) * 100) + '%"></span></span></div>' +
                  '<span class="tt-time">' + K.fmtLong(x.sec) + "</span>" +
                "</a>"
              ).join("") + "</div>"
            : '<div class="empty small-empty">' + icon("headphones") + "<div>Bật một bài rồi quay lại đây sau vài phút.</div></div>") +
        "</section>" +

        '<section class="panel">' +
          '<div class="panel-head"><div><h2 class="section-title">' + icon("clock") + " Lịch sử</h2>" +
            '<p class="section-sub">' + sessions.length + " lần nghe gần nhất</p></div>" +
            '<div class="panel-actions"><button class="btn btn-sm btn-ghost" data-reset-stats>' + icon("trash") + " Xoá dữ liệu</button></div></div>" +
          (sessions.length
            ? '<ul class="history">' + sessions.map((h) => {
                const t = K.trackById[h.id];
                return '<li><img src="' + esc(coverOf(h.id)) + '" alt=""><span class="h-title">' + esc(t ? t.title : "?") + "</span>" +
                  '<span class="h-sec">' + K.fmtLong(h.sec) + "</span>" +
                  '<span class="h-time">' + new Date(h.at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) + "</span></li>";
              }).join("") + "</ul>"
            : '<div class="empty small-empty">' + icon("clock") + "<div>Chưa có lịch sử.</div></div>") +
        "</section>"
    };
  }

  /* ---------------- STUDIO ---------------- */
  function studioPage() {
    const gallery = K.store.state.gallery;
    return {
      title: "Studio ảnh bìa",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("palette") + " Studio ảnh bìa</span>" +
        '<h1 class="page-title">Làm bìa cho bài của bạn</h1>' +
        '<p class="page-sub">Tạo bìa ngay trong trình duyệt: chọn màu, chất liệu, chữ — rồi tải PNG 1024×1024 hoặc gán thẳng vào bài hát.</p>' +
        '<div class="page-actions">' +
          D.tracks.map((t, i) =>
            '<button class="btn ' + (i === 0 ? "btn-primary" : "btn-outline") + '" data-open-studio="track:' + esc(t.id) + '">' + icon("sparkle") + " Bìa cho " + esc(t.title) + "</button>"
          ).join("") +
          '<button class="btn btn-outline" data-open-studio="playlist:kozl-essentials">' + icon("library") + " Bìa cho playlist</button>" +
          '<button class="btn btn-outline" data-open-studio="artist:kozl">' + icon("headphones") + " Ảnh nghệ sĩ</button>" +
        "</div></div>" +

        '<section class="section" style="margin-top:26px">' +
          sectionHead(icon("image") + " Ảnh dựng sẵn", "8 bìa có sẵn trong assets/presets — bấm để tải về máy") +
          '<div class="preset-grid">' + D.presets.map((p) =>
            '<figure class="preset">' +
              '<img src="' + esc(p.src) + '" alt="' + esc(p.name) + '" loading="lazy">' +
              '<figcaption><span>' + esc(p.name) + "</span>" +
                '<a class="icon-btn" href="' + esc(p.src) + '" download="kozl-' + esc(p.id) + '.jpg" aria-label="Tải ' + esc(p.name) + '">' + icon("download") + "</a>" +
              "</figcaption>" +
            "</figure>"
          ).join("") + "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("library") + " Ảnh bạn đã tạo", gallery.length + " ảnh", null) +
          (gallery.length
            ? '<div class="preset-grid">' + gallery.map((g) =>
                '<figure class="preset"><img src="' + esc(g.src) + '" alt="' + esc(g.label) + '">' +
                  '<figcaption><span>' + esc(g.label) + "</span>" +
                    '<a class="icon-btn" href="' + esc(g.src) + '" download="kozl-cover.png" aria-label="Tải ảnh">' + icon("download") + "</a>" +
                  "</figcaption></figure>"
              ).join("") + "</div>"
            : '<div class="empty">' + icon("palette") + "<div>Chưa có ảnh nào. Mở Studio, tạo một bìa rồi bấm “Dùng ảnh này”.</div></div>") +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("image") + " Tải ảnh của bạn", "Thay ảnh bìa cho từng bài hoặc playlist") +
          '<div class="upload-targets">' + D.tracks.map((t) =>
            '<button class="upload-target" data-edit-cover="track:' + esc(t.id) + '">' +
              '<img src="' + esc(coverOf(t.id)) + '" alt="">' +
              "<span>" + esc(t.title) + "</span>" + icon("upload") + "</button>"
          ).join("") + K.store.allPlaylists().map((p) =>
            '<button class="upload-target" data-edit-cover="playlist:' + esc(p.id) + '">' +
              '<img src="' + esc(plCover(p.id)) + '" alt="">' +
              "<span>" + esc(p.title) + "</span>" + icon("upload") + "</button>"
          ).join("") + "</div>" +
        "</section>"
    };
  }

  function notFound() {
    return {
      title: "Không tìm thấy",
      html:
        '<div class="empty" style="margin-top:60px">' + icon("search") +
        '<div><h1 style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px">404</h1>Trang này không tồn tại.</div>' +
        '<div style="margin-top:18px"><a class="btn btn-primary" href="#/">Về trang chủ</a></div></div>'
    };
  }

  K.views = { home, feed, library, likes, search, playlist, track, artist, stats, studio: studioPage, notFound };
  K.viewHelpers = { trackRow, tracklist, commentListHTML, lyricsHTML, playlistCard, coverOf, plCover, avatarOf };
})();
