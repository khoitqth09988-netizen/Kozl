/* =========================================================================
   Kozl Music — các màn hình (sinh HTML)
   ========================================================================= */
(function () {
  "use strict";

  const K = window.K;
  const D = K.data;
  const esc = K.esc;
  const icon = K.icon;

  const verifiedBadge = '<svg class="verified" viewBox="0 0 24 24" aria-label="Đã xác minh"><path d="m12 1.8 2.6 2.3 3.4-.4 1.2 3.2 3 1.7-1 3.3 1 3.3-3 1.7-1.2 3.2-3.4-.4L12 22.2l-2.6-2.3-3.4.4-1.2-3.2-3-1.7 1-3.3-1-3.3 3-1.7 1.2-3.2 3.4.4L12 1.8Z" fill="#4da3ff"/><path d="m7.8 12.2 2.7 2.7 5.7-5.6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function artistLink(track) {
    const a = K.artistById[track.artistId];
    if (!a) return "";
    return '<a href="#/artist/' + a.id + '">' + esc(a.name) + "</a>" +
      (a.verified ? verifiedBadge : "");
  }

  function playBtnHTML(t, ids, label, cls) {
    return (
      '<button class="' + (cls || "card-play") + '" data-play="' + esc(t.id) + '"' +
      (ids && ids.length
        ? ' data-queue-ids="' + esc(ids.join(",")) + '" data-queue-label="' + esc(label || "") + '"'
        : "") +
      ' aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>"
    );
  }

  function trackRow(t, opts) {
    opts = opts || {};
    const artist = K.artistById[t.artistId];
    const liked = K.store.isLiked(t.id);
    const index = typeof opts.index === "number"
      ? '<span class="row-index">' + String(opts.index + 1).padStart(2, "0") + "</span>"
      : "";
    return (
      '<div class="track-row" data-track-id="' + esc(t.id) + '">' +
        '<div class="row-art">' +
          '<img src="' + esc(t.cover) + '" alt="Bìa ' + esc(t.title) + '" loading="lazy" decoding="async">' +
          '<button class="row-play" data-play="' + esc(t.id) + '" aria-label="Phát ' + esc(t.title) + '">' +
            icon("play") + "</button>" +
          '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
        "</div>" +
        '<div class="row-main">' +
          '<a class="row-title" href="#/track/' + esc(t.id) + '">' + esc(t.title) + "</a>" +
          '<div class="row-artist">' + (artist ? artistLink(t) : "") +
            '<span class="sep">·</span><span>' + esc(K.relTime(t.uploadedAt)) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="row-wave"><div class="wave" data-wave data-bars="' + (opts.bars || 84) +
          '" role="slider" tabindex="-1" aria-label="Tua ' + esc(t.title) + '"></div></div>' +
        '<div class="row-side">' +
          '<span class="row-stat">' + icon("play") + K.fmtCount(t.plays) + "</span>" +
          '<button class="icon-btn row-like' + (liked ? " is-liked" : "") + '" data-like="' + esc(t.id) +
            '" aria-label="Thích" aria-pressed="' + liked + '">' + icon(liked ? "heart-fill" : "heart") + "</button>" +
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
      '<div class="tracklist" data-tracklist' +
        (opts.context ? ' data-page-context="' + esc(opts.context) + '"' : "") + ">" +
      tracks.map((t, i) => trackRow(t, Object.assign({ index: i }, opts))).join("") +
      "</div>"
    );
  }

  function playlistCard(p, opts) {
    opts = opts || {};
    const tracks = K.playlistTracks(p);
    const playable = tracks.length > 0;
    return (
      '<article class="card">' +
        '<div class="card-art">' +
          '<a href="#/playlist/' + esc(p.id) + '" aria-label="' + esc(p.title) + '">' +
            '<img src="' + esc(p.cover) + '" alt="Bìa playlist ' + esc(p.title) + '" loading="lazy" decoding="async">' +
          "</a>" +
          (playable
            ? '<button class="card-play" data-play-playlist="' + esc(p.id) + '" aria-label="Phát ' + esc(p.title) + '">' +
              icon("play") + "</button>"
            : "") +
        "</div>" +
        '<div class="card-body">' +
          '<a class="card-title" href="#/playlist/' + esc(p.id) + '">' + esc(p.title) + "</a>" +
          '<div class="card-sub">' + (opts.sub || esc(p.genre + " · " + tracks.length + " bài")) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function artistCard(a) {
    return (
      '<a class="artist-card" href="#/artist/' + esc(a.id) + '">' +
        '<img src="' + esc(a.avatar) + '" alt="Ảnh ' + esc(a.name) + '" loading="lazy" decoding="async">' +
        '<span class="ac-name">' + esc(a.name) + (a.verified ? verifiedBadge : "") + "</span>" +
        '<span class="ac-meta">' + K.fmtCount(a.followers) + " người theo dõi</span>" +
      "</a>"
    );
  }

  function sectionHead(title, sub, linkHref, linkLabel) {
    return (
      '<div class="section-head">' +
        "<div>" +
          '<h2 class="section-title">' + title + "</h2>" +
          (sub ? '<p class="section-sub">' + sub + "</p>" : "") +
        "</div>" +
        (linkHref
          ? '<a class="section-link" href="' + linkHref + '">' + esc(linkLabel || "Xem tất cả") +
            icon("chevron") + "</a>"
          : "") +
      "</div>"
    );
  }

  function newestFirst(a, b) {
    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
  }

  function commentBlock(t, comments) {
    if (!comments.length) {
      return '<div class="empty">' + icon("comment") +
        "<div>Chưa có bình luận nào. Bạn là người đầu tiên?</div></div>";
    }
    return (
      '<div class="comment-list">' +
      comments.map((c) =>
        '<div class="comment">' +
          '<span class="comment-avatar" style="' + K.avatarStyle(c.user) + '">' + esc(K.thumbfall(c.user)) + "</span>" +
          '<div class="comment-body">' +
            '<div class="comment-top">' +
              '<span class="comment-user">@' + esc(c.user) + "</span>" +
              (typeof c.at === "number" && c.at >= 0
                ? '<button class="comment-at" data-seek-to="' + c.at + '" title="Tua tới ' + K.fmtTime(c.at) + '">' +
                  K.fmtTime(c.at) + "</button>"
                : "") +
              '<span class="comment-time">' + esc(c.timeAgo || "vừa xong") + "</span>" +
            "</div>" +
            '<p class="comment-text">' + esc(c.text) + "</p>" +
          "</div>" +
        "</div>"
      ).join("") +
      "</div>"
    );
  }

  /* ---------------- TRANG CHỦ ---------------- */
  function home() {
    const featured = K.trackById["afterglow"] || D.tracks[0];
    const featuredArtist = K.artistById[featured.artistId];
    const newest = D.tracks.slice().sort(newestFirst);
    const essentials = K.playlistById["kozl-essentials"];
    const stack = newest.filter((t) => t.id !== featured.id).slice(0, 2).map((t) => t.cover);
    const recent = K.store.state.recents.map((id) => K.trackById[id]).filter(Boolean).slice(0, 6);
    const topPlaylists = D.playlists.slice(0, 5);
    const genres = D.genres.filter((g) => g.id !== "all");

    return {
      title: "Trang chủ",
      html:
        '<section class="hero">' +
          '<div class="hero-bg" style="background-image:url(\'' + esc(featured.blur || featured.cover) + '\')"></div>' +
          '<div class="hero-content">' +
            '<span class="eyebrow">' + icon("sparkle") + " Mới phát hành · " + esc(K.relTime(featured.uploadedAt)) + "</span>" +
            '<h1 class="hero-title">' + esc(featured.title) + "</h1>" +
            '<p class="hero-desc">' + esc(featured.description) + "</p>" +
            '<div class="hero-meta">' +
              '<span>' + esc(featuredArtist ? featuredArtist.name : "Kozl") + "</span><span class=\"dot\">•</span>" +
              "<span>" + esc(featured.genre) + "</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtTime(featured.duration) + "</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtCount(featured.plays) + " lượt nghe</span>" +
            "</div>" +
            '<div class="hero-actions">' +
              '<button class="btn btn-primary btn-lg" data-play="' + esc(featured.id) + '" data-queue="kozl-essentials">' +
                icon("play") + " Phát ngay</button>" +
              '<button class="btn btn-outline btn-lg" data-play-playlist="kozl-essentials">' +
                icon("queue") + " Nghe trọn bộ Kozl</button>" +
            "</div>" +
          "</div>" +
          '<div class="hero-art" aria-hidden="true"><div class="hero-stack">' +
            stack.map((src) => '<img src="' + esc(src) + '" alt="" loading="lazy">').join("") +
            '<img src="' + esc(featured.cover) + '" alt="">' +
          "</div></div>" +
        "</section>" +

        (recent.length
          ? '<section class="section">' +
            sectionHead(icon("clock") + " Nghe tiếp", "Những bài bạn mở gần đây") +
            '<div class="card-row">' + recent.map((t) =>
              '<article class="card"><div class="card-art">' +
                '<a href="#/track/' + esc(t.id) + '"><img src="' + esc(t.cover) + '" alt="" loading="lazy"></a>' +
                playBtnHTML(t, recent.map((x) => x.id), "Nghe tiếp", "card-play is-visible") + "</div>" +
                '<div class="card-body"><a class="card-title" href="#/track/' + esc(t.id) + '">' + esc(t.title) + "</a>" +
                '<div class="card-sub">' + K.fmtTime(t.duration) + " · " + esc(t.genre) + "</div></div></article>"
            ).join("") + "</div></section>"
          : "") +

        '<section class="section">' +
          sectionHead("Mới phát hành", "Tất cả bản thu mới nhất, xếp theo ngày đăng", null) +
          '<div class="card-grid">' + newest.map((t) => {
            const a = K.artistById[t.artistId];
            return '<article class="card"><div class="card-art">' +
              '<a href="#/track/' + esc(t.id) + '"><img src="' + esc(t.cover) + '" alt="Bìa ' + esc(t.title) + '" loading="lazy"></a>' +
              playBtnHTML(t, newest.map((x) => x.id), "Mới phát hành") + "</div>" +
              '<div class="card-body"><a class="card-title" href="#/track/' + esc(t.id) + '">' + esc(t.title) + "</a>" +
              '<div class="card-sub">' + esc(a ? a.name : "Kozl") + " · " + K.fmtTime(t.duration) + "</div></div></article>";
          }).join("") + "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead("Danh sách phát", "Nghe theo tâm trạng, không cần chọn bài", "#/library", "Thư viện") +
          '<div class="card-grid">' + topPlaylists.map((p) => playlistCard(p)).join("") + "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead("Nghệ sĩ", "Những cái tên đang có mặt trên Kozl", null) +
          '<div class="artist-grid">' + D.artists.map(artistCard).join("") + "</div>" +
        "</section>" +

        '<section class="section">' +
          sectionHead("Khám phá theo thể loại", "Chọn một thể loại để tìm bài hát phù hợp", null) +
          '<div class="card-grid">' + genres.map((g) => {
            const list = D.playlists.filter((p) => p.genre === g.label)[0];
            const cover = list ? list.cover : D.tracks[0].cover;
            return '<a class="card" href="#/search?genre=' + encodeURIComponent(g.label) + '">' +
              '<div class="card-art" style="display:grid;place-items:center;background:linear-gradient(150deg,' + g.color + '44,' + g.color + '12)">' +
                '<span style="font-size:13px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:' + g.color + '">' +
                esc(g.label) + "</span>" +
              "</div>" +
              '<div class="card-body"><span class="card-title">' + esc(g.label) + "</span>" +
              '<div class="card-sub">' + D.tracks.filter((t) => t.genre === g.id).length + " bài hát</div></div></a>";
          }).join("") + "</div>" +
        "</section>"
    };
  }

  /* ---------------- BẢNG TIN ---------------- */
  function feed() {
    const items = [];
    D.tracks.slice().sort(newestFirst).forEach((t) => {
      const a = K.artistById[t.artistId];
      items.push(
        '<article class="feed-item">' +
          '<img class="feed-avatar" src="' + esc(a.avatar) + '" alt="">' +
          "<div>" +
            '<div class="feed-line"><b>' + esc(a.name) + "</b> đã đăng một bài hát mới" +
              (a.verified ? verifiedBadge : "") +
              '<span class="feed-time">' + esc(K.relTime(t.uploadedAt)) + "</span></div>" +
            '<div class="feed-card">' +
              '<a class="feed-card-link" href="#/track/' + esc(t.id) + '">' +
                '<img src="' + esc(t.cover) + '" alt="">' +
                '<div class="feed-card-text">' +
                  '<div class="feed-card-title">' + esc(t.title) + "</div>" +
                  '<div class="feed-card-sub">' + esc(t.genre) + " · " + K.fmtTime(t.duration) + " · " + K.fmtCount(t.plays) + " lượt nghe</div>" +
                "</div>" +
              "</a>" +
              '<button class="icon-btn" data-play="' + esc(t.id) + '" aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    });

    items.push(
      '<article class="feed-item">' +
        '<img class="feed-avatar" src="' + esc(K.artistById.kozl.avatar) + '" alt="">' +
        "<div>" +
          '<div class="feed-line"><b>Kozl</b> đã tạo một danh sách phát mới<span class="feed-time">2 tuần trước</span></div>' +
          '<a class="feed-card" href="#/playlist/focus-mode">' +
            '<img src="' + esc(K.playlistById["focus-mode"].cover) + '" alt="">' +
            '<div class="feed-card-text"><div class="feed-card-title">Focus Mode</div>' +
            '<div class="feed-card-sub">4 bài · Ambient · để làm việc</div></div>' +
            icon("chevron") +
          "</a>" +
        "</div>" +
      "</article>"
    );

    return {
      title: "Bảng tin",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("feed") + " Bảng tin</span>" +
        '<h1 class="page-title">Chuyện mới trên Kozl</h1>' +
        '<p class="page-sub">Mọi bản thu, mọi danh sách phát, theo đúng thứ tự thời gian. Không thuật toán, không đề xuất vô tận.</p></div>' +
        '<div class="feed">' + items.join("") + "</div>"
    };
  }

  /* ---------------- THƯ VIỆN ---------------- */
  function library() {
    const st = K.store.state;
    const liked = D.tracks.filter((t) => st.likes.has(t.id));
    const saved = D.playlists.filter((p) => st.savedPlaylists.has(p.id));
    const following = D.artists.filter((a) => st.followed.has(a.id));
    const recent = st.recents.map((id) => K.trackById[id]).filter(Boolean);

    const card = (href, img, title, sub, round) =>
      '<a class="lib-card" href="' + href + '">' +
        '<img src="' + esc(img) + '" alt="" class="' + (round ? "round" : "") + '">' +
        '<div><div class="lc-title">' + esc(title) + '</div><div class="lc-sub">' + esc(sub) + "</div></div>" +
      "</a>";

    return {
      title: "Thư viện",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("library") + " Thư viện</span>" +
        '<h1 class="page-title">Của bạn</h1>' +
        '<p class="page-sub">Mọi thứ bạn thích, lưu và nghe lại — chỉ nằm trong trình duyệt của bạn.</p></div>' +

        '<section class="section" style="margin-top:0">' +
          sectionHead(icon("heart") + " Bài đã thích", liked.length + " bài", "#/likes", "Mở danh sách") +
          (liked.length
            ? '<div class="library-grid">' + liked.slice(0, 6).map((t) =>
                card("#/track/" + t.id, t.cover, t.title,
                  (K.artistById[t.artistId] || {}).name + " · " + K.fmtTime(t.duration))
              ).join("") + "</div>"
            : '<div class="empty">' + icon("heart") + "<div>Chưa thích bài nào. Nhấn vào trái tim ở bất kỳ bài hát nào nhé.</div></div>") +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("library") + " Danh sách phát đã lưu", saved.length + " danh sách", null) +
          (saved.length
            ? '<div class="library-grid">' + saved.map((p) =>
                card("#/playlist/" + p.id, p.cover, p.title,
                  K.playlistTracks(p).length + " bài · " + K.fmtLong(K.totalDuration(K.playlistTracks(p))))
              ).join("") + "</div>"
            : '<div class="empty">' + icon("plus") + "<div>Nhấn “Lưu” trong một danh sách phát để giữ nó ở đây.</div></div>") +
        "</section>" +

        '<section class="section">' +
          sectionHead(icon("clock") + " Nghe gần đây", recent.length + " bài", null) +
          (recent.length
            ? '<div class="library-grid">' + recent.slice(0, 8).map((t) =>
                card("#/track/" + t.id, t.cover, t.title,
                  (K.artistById[t.artistId] || {}).name + " · " + K.fmtTime(t.duration))
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
    const st = K.store.state;
    const list = D.tracks.filter((t) => st.likes.has(t.id));
    return {
      title: "Bài đã thích",
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("heart") + " Bộ sưu tập</span>" +
        '<h1 class="page-title">Bài đã thích</h1>' +
        '<p class="page-sub">' + (list.length ? list.length + " bài · " + K.fmtLong(K.totalDuration(list)) + " âm nhạc." : "Danh sách này đang trống.") + "</p></div>" +
        (list.length
          ? '<div class="detail-actions" style="margin-bottom:22px">' +
            '<button class="btn btn-primary" data-play-list="likes">' + icon("play") + " Phát tất cả</button>" +
            '<button class="btn btn-outline" data-play-list="likes" data-shuffle-play>' + icon("shuffle") + " Xáo trộn</button>" +
            "</div>" +
            '<div data-list-pass="likes">' + tracklist(list, { context: "Bài đã thích" }) + "</div>"
          : '<div class="empty">' + icon("heart") +
            "<div>Chưa có bài nào được thích.<br>Hãy quay lại trang chủ và thả tim cho vài bài nhé.</div></div>")
    };
  }

  /* ---------------- TÌM KIẾM ---------------- */
  function search(params) {
    const q = (params.q || "").trim();
    const genre = params.genre || "";
    const tab = params.tab || "all";

    if (!q && !genre) {
      return {
        title: "Tìm kiếm",
        html:
          '<div class="page-head"><span class="eyebrow">' + icon("search") + " Tìm kiếm</span>" +
          '<h1 class="page-title">Bạn muốn nghe gì?</h1>' +
          '<p class="page-sub">Tìm theo tên bài hát, nghệ sĩ hoặc danh sách phát. Hoặc chọn một thể loại bên dưới.</p></div>' +
          '<div class="card-grid">' + D.genres.filter((g) => g.id !== "all").map((g) =>
            '<a class="card" href="#/search?genre=' + encodeURIComponent(g.label) + '">' +
              '<div class="card-art" style="display:grid;place-items:center;background:linear-gradient(150deg,' + g.color + '44,' + g.color + '12)">' +
                '<span style="font-size:13px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:' + g.color + '">' + esc(g.label) + "</span></div>" +
              '<div class="card-body"><span class="card-title">' + esc(g.label) + "</span>" +
              '<div class="card-sub">' + D.tracks.filter((t) => t.genre === g.id).length + " bài hát</div></div></a>"
          ).join("") + "</div>"
      };
    }

    const needle = q.toLowerCase();
    const tracks = D.tracks.filter((t) => {
      const artist = K.artistById[t.artistId] || { name: "" };
      const hay = (t.title + " " + artist.name + " " + t.genre + " " + (t.tags || []).join(" ")).toLowerCase();
      const okQ = !q || hay.indexOf(needle) > -1;
      const okG = !genre || t.genre === genre;
      return okQ && okG;
    });
    const playlists = D.playlists.filter((p) => {
      if (genre && p.genre !== genre) return false;
      if (!q) return true;
      return (p.title + " " + p.description + " " + p.genre).toLowerCase().indexOf(needle) > -1;
    });
    const artists = D.artists.filter((a) => !q || (a.name + " " + a.bio).toLowerCase().indexOf(needle) > -1);

    const tabs = [
      { id: "all", label: "Tất cả", n: tracks.length + playlists.length + artists.length },
      { id: "tracks", label: "Bài hát", n: tracks.length },
      { id: "playlists", label: "Danh sách phát", n: playlists.length },
      { id: "artists", label: "Nghệ sĩ", n: artists.length },
    ];
    const base = "#/search?" + (q ? "q=" + encodeURIComponent(q) + "&" : "") + (genre ? "genre=" + encodeURIComponent(genre) + "&" : "");

    let body = "";
    if (tab === "all" || tab === "tracks") {
      if (tracks.length) {
        body += '<section class="section" style="margin-top:0">' +
          sectionHead("Bài hát", tracks.length + " kết quả", null) + tracklist(tracks) + "</section>";
      }
    }
    if (tab === "all" || tab === "playlists") {
      if (playlists.length) {
        body += '<section class="section"' + (tab === "all" ? "" : ' style="margin-top:0"') + ">" +
          sectionHead("Danh sách phát", playlists.length + " kết quả", null) +
          '<div class="card-grid">' + playlists.map((p) => playlistCard(p)).join("") + "</div></section>";
      }
    }
    if (tab === "all" || tab === "artists") {
      if (artists.length) {
        body += '<section class="section"' + (tab === "all" ? "" : ' style="margin-top:0"') + ">" +
          sectionHead("Nghệ sĩ", artists.length + " kết quả", null) +
          '<div class="artist-grid">' + artists.map(artistCard).join("") + "</div></section>";
      }
    }
    if (!body) {
      body = '<div class="empty">' + icon("search") + "<div>Không tìm thấy gì cho “" +
        esc(q || genre) + "”. Thử một từ khác nhé.</div></div>";
    }

    return {
      title: "Tìm kiếm: " + (q || genre),
      html:
        '<div class="page-head"><span class="eyebrow">' + icon("search") + " Tìm kiếm</span>" +
        '<h1 class="page-title">' + esc(q || genre) + "</h1>" +
        '<p class="page-sub">' + (tracks.length + playlists.length + artists.length) + " kết quả" +
        (genre ? " trong thể loại " + esc(genre) : "") + ".</p></div>" +
        '<div class="search-tabs">' + tabs.map((t) =>
          '<button class="search-tab' + (t.id === tab ? " is-active" : "") + '" data-search-tab="' +
          esc(base + "tab=" + t.id) + '">' + esc(t.label) + "<span>" + t.n + "</span></button>"
        ).join("") + "</div>" + body
    };
  }

  /* ---------------- CHI TIẾT DANH SÁCH PHÁT ---------------- */
  function playlist(params) {
    const p = K.playlistById[params.id];
    if (!p) return null;
    const tracks = K.playlistTracks(p);
    const saved = K.store.isSaved(p.id);
    const total = K.totalDuration(tracks);
    const curator = D.artists.find((a) => a.name === p.curator) || D.artists[0];

    return {
      title: p.title,
      html:
        '<section class="detail-head">' +
          '<div class="detail-bg" style="background-image:url(\'' + esc(p.blur || p.cover) + '\')"></div>' +
          '<div class="detail-art"><img src="' + esc(p.cover) + '" alt="Bìa ' + esc(p.title) + '"></div>' +
          '<div class="detail-info">' +
            '<span class="eyebrow">' + icon("library") + " Danh sách phát</span>" +
            '<h1 class="detail-title">' + esc(p.title) + "</h1>" +
            '<p class="detail-desc">' + esc(p.description) + "</p>" +
            '<div class="detail-meta">' +
              '<a href="#/artist/' + esc(curator.id) + '">' + esc(p.curator) + "</a><span class=\"dot\">•</span>" +
              "<span>" + tracks.length + " bài</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtLong(total) + "</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtCount(p.plays) + " lượt nghe</span><span class=\"dot\">•</span>" +
              "<span>" + esc(p.genre) + "</span>" +
            "</div>" +
            '<div class="detail-actions">' +
              '<button class="btn btn-primary" data-play-playlist="' + esc(p.id) + '">' + icon("play") + " Phát</button>" +
              '<button class="btn btn-outline" data-shuffle-playlist="' + esc(p.id) + '">' + icon("shuffle") + " Xáo trộn</button>" +
              '<button class="btn btn-outline' + (saved ? " is-saved" : "") + '" data-save="' + esc(p.id) + '">' +
                icon(saved ? "check" : "plus") + "<span>" + (saved ? "Đã lưu" : "Lưu") + "</span></button>" +
              '<button class="btn btn-ghost" data-share="' + esc(p.id) + '">' + icon("share") + " Chia sẻ</button>" +
            "</div>" +
          "</div>" +
        "</section>" +
        tracklist(tracks, { bars: 110, context: p.title })
    };
  }

  /* ---------------- CHI TIẾT BÀI HÁT ---------------- */
  function track(params) {
    const t = K.trackById[params.id];
    if (!t) return null;
    const a = K.artistById[t.artistId];
    const liked = K.store.isLiked(t.id);
    const comments = (t.comments || []).concat(K.store.commentsFor(t.id));
    const sameGenre = D.tracks.filter((x) => x.id !== t.id && (x.genre === t.genre || x.tags.some((g) => t.tags.indexOf(g) > -1))).slice(0, 3);
    const more = sameGenre.length ? sameGenre : D.tracks.filter((x) => x.id !== t.id).slice(0, 3);

    return {
      title: t.title,
      html:
        '<div class="track-hero">' +
          '<div class="track-cover"><img src="' + esc(t.cover) + '" alt="Bìa ' + esc(t.title) + '"></div>' +
          "<div>" +
            '<span class="eyebrow">' + icon("sparkle") + " " + esc(t.genre) + " · " + esc(K.relTime(t.uploadedAt)) + "</span>" +
            '<h1 class="track-title">' + esc(t.title) + "</h1>" +
            '<div class="track-artist">' +
              (a ? '<img src="' + esc(a.avatar) + '" alt="">' : "") +
              (a ? '<a href="#/artist/' + a.id + '">' + esc(a.name) + "</a>" + (a.verified ? verifiedBadge : "") : "") +
            "</div>" +
            '<div class="track-actions">' +
              '<button class="btn btn-primary" data-play="' + esc(t.id) + '">' + icon("play") + " Phát</button>" +
              '<button class="btn btn-outline' + (liked ? " is-liked" : "") + '" data-like="' + esc(t.id) + '" aria-pressed="' + liked + '">' +
                icon(liked ? "heart-fill" : "heart") + "<span class=\"like-label\">" + (liked ? "Đã thích" : "Thích") + "</span>" +
                " <span class=\"like-count\">" + K.fmtCount(t.likes) + "</span></button>" +
              '<button class="btn btn-outline" data-radio="' + esc(t.id) + '">' + icon("sparkle") + " Radio</button>" +
              '<button class="btn btn-outline" data-enqueue="' + esc(t.id) + '">' + icon("plus") + " Hàng chờ</button>" +
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
                '<span class="time"><span id="track-pos">0:00</span> / ' + K.fmtTime(t.duration) + "</span></div>" +
              '<div class="wave wave-big" id="track-wave" data-wave data-bars="190" role="slider" tabindex="0" ' +
                'aria-label="Tua ' + esc(t.title) + '"></div>' +
            "</div>" +
            '<p class="track-desc">' + esc(t.description) + "</p>" +
            '<div class="taglist">' + t.tags.map((tag) => '<a class="tag" href="#/search?q=' + encodeURIComponent(tag) + '">#' + esc(tag) + "</a>").join("") + "</div>" +
          "</div>" +
        "</div>" +

        '<section class="comments">' +
          sectionHead(icon("comment") + " Bình luận", comments.length + " bình luận", null) +
          '<div id="comment-list">' + commentBlock(t, comments) + "</div>" +
          '<form class="comment-form" data-comment-form="' + esc(t.id) + '">' +
            '<input type="text" maxlength="400" autocomplete="off" aria-label="Viết bình luận" ' +
              'placeholder="Viết bình luận…" required>' +
            '<span class="at-hint" id="comment-at-hint">tại 0:00</span>' +
            '<button class="btn btn-primary" type="submit">Gửi</button>' +
          "</form>" +
        "</section>" +

        '<section class="section">' +
          sectionHead("Nghe tiếp", "Những bài cùng không khí", null) +
          '<div class="card-grid">' + more.map((x) =>
            '<article class="card"><div class="card-art">' +
              '<a href="#/track/' + esc(x.id) + '"><img src="' + esc(x.cover) + '" alt="" loading="lazy"></a>' +
              playBtnHTML(x, more.map((y) => y.id), t.title + " · nghe tiếp") + "</div>" +
              '<div class="card-body"><a class="card-title" href="#/track/' + esc(x.id) + '">' + esc(x.title) + "</a>" +
              '<div class="card-sub">' + esc((K.artistById[x.artistId] || {}).name || "") + " · " + K.fmtTime(x.duration) + "</div></div></article>"
          ).join("") + "</div>" +
        "</section>"
    };
  }

  /* ---------------- TRANG NGHỆ SĨ ---------------- */
  function artist(params) {
    const a = K.artistById[params.id];
    if (!a) return null;
    const tracks = K.artistTracks(a.id).sort(newestFirst);
    const lists = D.playlists.filter((p) => p.curator === a.name);
    const following = K.store.isFollowing(a.id);
    const totalPlays = tracks.reduce((s, t) => s + t.plays, 0);

    return {
      title: a.name,
      html:
        '<div class="artist-banner"><img src="' + esc(a.banner) + '" alt=""></div>' +
        '<section class="detail-head artist-head" style="background:transparent;border:0;padding:0 0 0 4px;margin-bottom:26px">' +
          '<div class="detail-art round"><img src="' + esc(a.avatar) + '" alt="Ảnh ' + esc(a.name) + '"></div>' +
          '<div class="detail-info">' +
            '<span class="eyebrow">' + icon("headphones") + " Nghệ sĩ</span>" +
            '<h1 class="detail-title">' + esc(a.name) + (a.verified ? verifiedBadge : "") + "</h1>" +
            '<p class="detail-desc">' + esc(a.bio) + "</p>" +
            '<div class="detail-meta">' +
              "<span>" + esc(a.location) + "</span><span class=\"dot\">•</span>" +
              "<span><b>" + K.fmtCount(a.followers) + "</b> người theo dõi</span><span class=\"dot\">•</span>" +
              "<span>" + tracks.length + " bài hát</span><span class=\"dot\">•</span>" +
              "<span>" + K.fmtCount(totalPlays) + " lượt nghe</span>" +
            "</div>" +
            '<div class="detail-actions">' +
              '<button class="btn btn-primary" data-play-artist="' + esc(a.id) + '">' + icon("play") + " Phát tất cả</button>" +
              '<button class="btn ' + (following ? "btn-outline" : "btn-outline") + '" data-follow="' + esc(a.id) + '">' +
                icon(following ? "check" : "plus") + "<span>" + (following ? "Đang theo dõi" : "Theo dõi") + "</span></button>" +
              (a.links[0] ? '<a class="btn btn-ghost" href="https://' + esc(a.links[0]) + '" target="_blank" rel="noopener">' + icon("share") + " " + esc(a.links[0].split("/")[0]) + "</a>" : "") +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="section" style="margin-top:0">' +
          sectionHead(icon("sparkle") + " Bài hát", tracks.length + " bản thu", null) +
          tracklist(tracks, { context: a.name }) +
        "</section>" +

        (lists.length
          ? '<section class="section">' + sectionHead(icon("library") + " Danh sách phát", "Do " + esc(a.name) + " tuyển chọn", null) +
            '<div class="card-grid">' + lists.map((p) => playlistCard(p)).join("") + "</div></section>"
          : "")
    };
  }

  function notFound() {
    return {
      title: "Không tìm thấy",
      html:
        '<div class="empty" style="margin-top:60px">' + icon("search") +
        "<div><h1 style=\"font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px\">404</h1>" +
        "Trang này không tồn tại trên Kozl.</div>" +
        '<div style="margin-top:18px"><a class="btn btn-primary" href="#/">Về trang chủ</a></div></div>'
    };
  }

  K.views = { home, feed, library, likes, search, playlist, track, artist, notFound };
})();
