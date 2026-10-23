/* =========================================================================
   Kozl Music — khởi động: router, tương tác, trình phát UI, công cụ
   ========================================================================= */
(function () {
  "use strict";

  const K = window.K;
  const D = K.data;
  const esc = K.esc;
  const icon = K.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  const viewEl = $("#view");
  const audio = $("#audio");
  const player = new K.Player(audio);
  K.player = player;

  let currentRoute = { name: "home", params: {} };
  let waveEls = [];
  let pendingSeekRatio = null;
  let menuEl = null;

  /* ================= tiện ích UI ================= */
  function toast(message, iconName) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = icon(iconName || "check") + "<span>" + esc(message) + "</span>";
    $("#toasts").appendChild(el);
    setTimeout(() => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }
  K.toast = toast;

  /* ================= giao diện sáng/tối + màu nhấn ================= */
  const ACCENTS = [
    { id: "orange", color: "#ff5500", name: "Cam" },
    { id: "rose", color: "#ff3d6e", name: "Hồng" },
    { id: "violet", color: "#8b5cf6", name: "Tím" },
    { id: "teal", color: "#14b8a6", name: "Ngọc" },
    { id: "blue", color: "#3b82f6", name: "Xanh" },
    { id: "lime", color: "#84cc16", name: "Lá" },
  ];

  function applyTheme() {
    const st = K.store.state;
    document.documentElement.dataset.theme = st.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.accent = st.accent || "orange";
    const tBtn = $("#btn-theme");
    if (tBtn) tBtn.querySelector("use").setAttribute("href", st.theme === "light" ? "#i-sun" : "#i-moon");
    const npBtn = $("#np-theme");
    if (npBtn) npBtn.querySelector("use").setAttribute("href", st.theme === "light" ? "#i-sun" : "#i-moon");
    const dot = $("#btn-accent .accent-dot");
    const acc = ACCENTS.find((a) => a.id === st.accent) || ACCENTS[0];
    if (dot) dot.style.background = acc.color;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", st.theme === "light" ? "#f4f1ec" : "#0b0b0d");
  }

  function renderAccentList() {
    const list = $("#accent-list");
    if (!list) return;
    list.innerHTML = ACCENTS.map(
      (a) =>
        '<button class="accent-item' + ((K.store.state.accent || "orange") === a.id ? " is-active" : "") + '" data-accent="' + a.id + '" title="' + a.name + '">' +
          '<span style="background:' + a.color + '"></span></button>'
    ).join("");
  }

  function toggleTheme() {
    K.store.state.theme = K.store.state.theme === "light" ? "dark" : "light";
    K.store.save();
    applyTheme();
    toast(K.store.state.theme === "light" ? "Giao diện sáng" : "Giao diện tối", "sun");
  }

  /* ================= router ================= */
  function parseHash() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const [path, query] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = {};
    new URLSearchParams(query || "").forEach((v, k) => (params[k] = v));
    return { parts, params };
  }

  function resolveRoute() {
    const { parts, params } = parseHash();
    const head = parts[0] || "";
    const map = {
      "": "home",
      feed: "feed",
      library: "library",
      likes: "likes",
      search: "search",
      stats: "stats",
      studio: "studio",
    };
    if (map[head] !== undefined) return { name: map[head], params };
    if (["playlist", "track", "artist"].includes(head)) {
      return { name: head, params: Object.assign({}, params, { id: parts[1] }), nav: "home" };
    }
    return { name: "notFound", params };
  }

  function render(keepScroll) {
    const route = resolveRoute();
    const fn = K.views[route.name] || K.views.notFound;
    const view = fn(route.params) || K.views.notFound();
    const scroll = $("#main").scrollTop;
    currentRoute = route;
    viewEl.innerHTML = view.html;
    document.title = view.title + " · Kozl Music";
    if (!keepScroll) $("#main").scrollTop = 0;
    else $("#main").scrollTop = scroll;

    const navKey = route.nav || route.name;
    $$(".nav-link, .mobilenav a").forEach((a) => {
      if (a.dataset.nav === navKey) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (route.name === "search" && route.params.q) $("#search-input").value = route.params.q;

    hydrateWaves();
    applyTimeParam(route);
    syncSidebar();
    syncAll();
    renderNpLyrics();
    closeSidebar();
    if (route.name === "library" && route.params.new) {
      history.replaceState(null, "", "#/library");
      setTimeout(openNewPlaylist, 60);
    }
  }

  window.addEventListener("hashchange", () => render());

  K.rerender = () => render(true);
  K.emitChange = () => {
    syncAll();
    syncSidebar();
  };

  /* ================= ?t= trên liên kết chia sẻ ================= */
  let lastTimeParam = "";
  function applyTimeParam(route) {
    const raw = route.params && route.params.t;
    if (raw == null) return;
    const id = route.params.id;
    const t = parseFloat(raw);
    if (!id || !K.trackById[id] || !isFinite(t) || t <= 0) return;
    if (lastTimeParam === id + ":" + t) return;
    lastTimeParam = id + ":" + t;
    const go = () => {
      player.seek(t);
      toast("Đã tua tới " + K.fmtTime(t), "clock");
    };
    player.restorePos = null;
    if (player.track && player.track.id === id) {
      if (audio.readyState >= 1) go();
      else audio.addEventListener("loadedmetadata", go, { once: true });
      return;
    }
    player.baseQueue = [id];
    player.queue = [id];
    player.index = 0;
    player.context = null;
    audio.src = K.trackById[id].src;
    audio.load();
    player.emit("track", { track: K.trackById[id], index: 0, context: null });
    audio.addEventListener("loadedmetadata", go, { once: true });
  }

  /* ================= waveform ================= */
  function hydrateWaves() {
    $$("[data-wave]", viewEl).forEach((el) => {
      const row = el.closest("[data-track-id]");
      let trackId = el.dataset.waveTrack || (row && row.dataset.trackId);
      if (!trackId && el.id === "track-wave" && currentRoute.name === "track") trackId = currentRoute.params.id;
      if (!trackId) return;
      const t = K.trackById[trackId];
      if (!t) return;
      let bars = parseInt(el.dataset.bars, 10) || undefined;
      if (el.id === "track-wave") bars = Math.max(48, Math.min(170, Math.round((el.clientWidth || 640) / 4)));
      K.wave.render(el, t.id, { bars, markers: el.id === "track-wave" });
      if (!el._bound) {
        bindWave(el);
        el._bound = true;
      }
    });
    waveEls = $$(".wave").filter((el) => el.dataset.waveTrack);
  }

  function ratioFromEvent(el, e) {
    const r = el.getBoundingClientRect();
    if (!r.width) return 0;
    return K.clamp((e.clientX - r.left) / r.width, 0, 1);
  }

  function waveTrackId(el) {
    const row = el.closest("[data-track-id]");
    return el.dataset.waveTrack || (row && row.dataset.trackId) || null;
  }

  function bindWave(el) {
    let dragging = false;

    el.addEventListener("pointermove", (e) => {
      const tip = el.querySelector(".wave-tip");
      if (!tip) return;
      const r = ratioFromEvent(el, e);
      const dur = el._duration || (player.track && player.track.duration) || 0;
      tip.textContent = K.fmtTime(r * dur);
      tip.style.left = Math.max(20, Math.min(el.clientWidth - 20, r * el.clientWidth)) + "px";
      if (dragging) K.wave.setProgress(el, r);
    });

    el.addEventListener("pointerleave", () => {
      if (!dragging) K.wave.setProgress(el, el._liveRatio || 0);
    });

    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const trackId = waveTrackId(el);
      if (!trackId) return;
      const r = ratioFromEvent(el, e);
      dragging = true;
      el.classList.add("is-scrubbing");
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (player.track && player.track.id === trackId) {
        player.seekRatio(r);
        K.wave.setProgress(el, r);
      } else {
        pendingSeekRatio = r;
        const ctx = contextFor(el, trackId);
        player.playTrack(trackId, ctx.ids, ctx.label);
      }
    });

    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-scrubbing");
      const trackId = waveTrackId(el);
      const r = ratioFromEvent(el, e);
      if (player.track && player.track.id === trackId) player.seekRatio(r);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    el.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      e.stopPropagation();
      const step = (e.shiftKey ? 10 : 3) / (el._duration || 1);
      const next = K.clamp((el._ratio || 0) + (e.key === "ArrowRight" ? step : -step), 0, 1);
      if (player.track && player.track.id === waveTrackId(el)) {
        player.seekRatio(next);
        K.wave.setProgress(el, next);
      }
    });
  }

  /* ================= ngữ cảnh phát ================= */
  function contextFor(el, trackId) {
    const list = el.closest("[data-tracklist]");
    if (list) {
      const ids = $$("[data-track-id]", list).map((r) => r.dataset.trackId);
      const page = el.closest("[data-page-context]");
      return { ids: ids.length ? ids : [trackId], label: page ? page.dataset.pageContext : "Danh sách" };
    }
    return { ids: [trackId], label: null };
  }

  function playlistIds(id) {
    const p = K.store.playlistById(id);
    return p ? K.playlistTracks(p).map((t) => t.id) : [];
  }

  function playlistTitles(id) {
    const p = K.store.playlistById(id);
    return p ? p.title : null;
  }

  function playFrom(el, trackId, ids, label) {
    if (!ids && player.track && player.track.id === trackId) return player.toggle();
    if (ids && ids.length) return player.playTrack(trackId, ids, label);
    const ctx = contextFor(el, trackId);
    player.playTrack(trackId, ctx.ids, ctx.label);
  }

  /* ================= like ================= */
  function toggleLike(id) {
    const liked = K.store.toggleLike(id);
    syncLikeButtons();
    if (liked) toast("Đã thêm vào bài đã thích", "heart-fill");
    if (currentRoute.name === "likes" || currentRoute.name === "library") render(true);
    return liked;
  }

  async function share(id) {
    const t = K.trackById[id];
    const p = !t && K.store.playlistById(id);
    const title = t ? t.title : p ? p.title : "Kozl Music";
    let url = location.origin + location.pathname + "#/" + (t ? "track/" : "playlist/") + id;
    if (t && audio.currentTime > 2) url += "?t=" + Math.round(audio.currentTime);
    try {
      if (navigator.share) {
        await navigator.share({ title: title + " · Kozl Music", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Đã copy liên kết" + (t && audio.currentTime > 2 ? " kèm mốc thời gian" : ""), "share");
    } catch (e) {
      toast("Liên kết: " + url, "share");
    }
  }

  /* ================= menu ngữ cảnh ================= */
  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  function openMenu(html, x, y) {
    closeMenu();
    menuEl = document.createElement("div");
    menuEl.className = "ctx-menu";
    menuEl.innerHTML = html;
    document.body.appendChild(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x - r.width / 2)) + "px";
    menuEl.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y)) + "px";
    setTimeout(() => document.addEventListener("click", closeMenu, { once: true }), 0);
  }

  function trackMenu(id, x, y) {
    const t = K.trackById[id];
    if (!t) return;
    const liked = K.store.isLiked(id);
    const lists = K.store.allPlaylists();
    openMenu(
      '<div class="ctx-head">' + esc(t.title) + "</div>" +
        '<button class="ctx-item" data-play="' + esc(id) + '">' + icon("play") + " Phát ngay</button>" +
        '<button class="ctx-item" data-enqueue="' + esc(id) + '">' + icon("queue") + " Thêm vào hàng chờ</button>" +
        '<button class="ctx-item" data-like="' + esc(id) + '">' + icon(liked ? "heart-fill" : "heart") + " " + (liked ? "Bỏ thích" : "Thích") + "</button>" +
        '<button class="ctx-item" data-edit-cover="track:' + esc(id) + '">' + icon("image") + " Đổi ảnh bìa</button>" +
        '<button class="ctx-item" data-open-studio="track:' + esc(id) + '">' + icon("palette") + " Tạo bìa trong Studio</button>" +
        '<button class="ctx-item" data-edit-lyrics="' + esc(id) + '">' + icon("lyrics") + " Thêm / sửa lời</button>" +
        '<button class="ctx-item" data-share="' + esc(id) + '">' + icon("share") + " Chia sẻ</button>" +
        (lists.length
          ? '<div class="ctx-sep"></div><div class="ctx-sub">Thêm vào danh sách</div>' +
            lists.map((p) => '<button class="ctx-item" data-add-to="' + esc(p.id) + ":" + esc(id) + '">' + icon("plus") + " " + esc(p.title) + "</button>").join("")
          : ""),
      x,
      y
    );
  }

  /* ================= sự kiện chung ================= */
  document.addEventListener("click", (e) => {
    const target = e.target;

    /* --- tiện ích topbar --- */
    if (target.closest("[data-open-shortcuts]")) return openShortcuts();
    if (target.closest("[data-close-modal]")) return closeModal();
    if (target.closest("[data-close-drawer]")) return closeDrawerUI();
    if (target.closest("[data-close-tools]")) return hideTools();
    if (target.closest("[data-open-nowplaying]")) return openNowPlaying();
    if (target.closest("[data-close-nowplaying]")) return closeNowPlaying();

    const accent = target.closest("#accent-list [data-accent]");
    if (accent) {
      K.store.state.accent = accent.dataset.accent;
      K.store.save();
      applyTheme();
      renderAccentList();
      $("#accent-pop").hidden = true;
      toast("Đã đổi màu nhấn", "palette");
      return;
    }

    /* --- điều hướng trong trang --- */
    const goto = target.closest("[data-goto]");
    if (goto) {
      location.hash = goto.dataset.goto;
      return;
    }

    /* --- phát --- */
    const playBtn = target.closest("[data-play]");
    if (playBtn) {
      e.preventDefault();
      const id = playBtn.dataset.play;
      if (playBtn.closest("#queue-drawer")) {
        const qi = player.queue.indexOf(id);
        if (qi > -1) {
          player.jumpTo(qi);
          renderQueue();
        }
        return;
      }
      const ids = playBtn.dataset.queueIds ? playBtn.dataset.queueIds.split(",").filter(Boolean) : null;
      if (!ids && player.track && player.track.id === id) return player.toggle();
      playFrom(playBtn, id, ids, playBtn.dataset.queueLabel || null);
      return;
    }

    const plPlay = target.closest("[data-play-playlist]");
    if (plPlay) {
      e.preventDefault();
      const ids = playlistIds(plPlay.dataset.playPlaylist);
      if (ids.length) player.playTrack(ids[0], ids, playlistTitles(plPlay.dataset.playPlaylist));
      return;
    }

    const plShuffle = target.closest("[data-shuffle-playlist]");
    if (plShuffle) {
      e.preventDefault();
      const ids = playlistIds(plShuffle.dataset.shufflePlaylist);
      if (ids.length) {
        if (!player.shuffle) player.toggleShuffle();
        player.playTrack(K.shuffle(ids)[0], ids, playlistTitles(plShuffle.dataset.shufflePlaylist));
      }
      return;
    }

    const listPlay = target.closest("[data-play-list]");
    if (listPlay) {
      e.preventDefault();
      const ids = D.tracks.filter((t) => K.store.isLiked(t.id)).map((t) => t.id);
      if (!ids.length) return toast("Chưa có bài nào được thích", "heart");
      if (listPlay.hasAttribute("data-shuffle-play") && !player.shuffle) player.toggleShuffle();
      player.playTrack(listPlay.hasAttribute("data-shuffle-play") ? K.shuffle(ids)[0] : ids[0], ids, "Bài đã thích");
      return;
    }

    const artistPlay = target.closest("[data-play-artist]");
    if (artistPlay) {
      e.preventDefault();
      const ids = K.artistTracks(artistPlay.dataset.playArtist).map((t) => t.id);
      if (ids.length) player.playTrack(ids[0], ids, K.artistById[artistPlay.dataset.playArtist].name);
      return;
    }

    const radio = target.closest("[data-radio]");
    if (radio) {
      e.preventDefault();
      const id = radio.dataset.radio;
      const ids = K.radioQueue(id);
      if (!ids.length) return;
      if (!player.shuffle) player.toggleShuffle();
      player.playTrack(ids[0], ids, "Radio · " + K.trackById[id].title);
      toast("Radio: " + K.trackById[id].title + " và những bài tương tự", "sparkle");
      return;
    }

    /* --- tương tác --- */
    const likeBtn = target.closest("[data-like]");
    if (likeBtn) {
      e.preventDefault();
      toggleLike(likeBtn.dataset.like);
      return;
    }

    const saveBtn = target.closest("[data-save]");
    if (saveBtn) {
      e.preventDefault();
      const now = K.store.toggleSave(saveBtn.dataset.save);
      toast(now ? "Đã lưu vào thư viện" : "Đã bỏ lưu", now ? "check" : "trash");
      render(true);
      return;
    }

    const followBtn = target.closest("[data-follow]");
    if (followBtn) {
      e.preventDefault();
      const now = K.store.toggleFollow(followBtn.dataset.follow);
      toast(now ? "Đang theo dõi nghệ sĩ" : "Đã bỏ theo dõi", now ? "check" : "close");
      render(true);
      return;
    }

    const enqueue = target.closest("[data-enqueue]");
    if (enqueue) {
      e.preventDefault();
      player.enqueue(enqueue.dataset.enqueue, false);
      toast("Đã thêm vào hàng chờ: " + (K.trackById[enqueue.dataset.enqueue] || {}).title, "queue");
      return;
    }

    const shareBtn = target.closest("[data-share]");
    if (shareBtn) {
      e.preventDefault();
      share(shareBtn.dataset.share);
      return;
    }

    const menuBtn = target.closest("[data-track-menu]");
    if (menuBtn) {
      e.preventDefault();
      const r = menuBtn.getBoundingClientRect();
      trackMenu(menuBtn.dataset.trackMenu, r.left + r.width / 2, r.bottom + 6);
      return;
    }

    const addTo = target.closest("[data-add-to]");
    if (addTo) {
      e.preventDefault();
      const [pid, tid] = addTo.dataset.addTo.split(":");
      const ok = K.store.addToPlaylist(pid, tid);
      toast(ok ? "Đã thêm vào danh sách" : "Bài này đã có trong danh sách", ok ? "check" : "close");
      closeMenu();
      render(true);
      return;
    }

    const addToPlaylistBtn = target.closest("[data-add-to-playlist]");
    if (addToPlaylistBtn) {
      e.preventDefault();
      openAddToPlaylist(addToPlaylistBtn.dataset.addToPlaylist);
      return;
    }

    const removeFrom = target.closest("[data-remove-from]");
    if (removeFrom) {
      e.preventDefault();
      const [pid, tid] = removeFrom.dataset.removeFrom.split(":");
      K.store.removeFromPlaylist(pid, tid);
      toast("Đã bỏ khỏi danh sách", "trash");
      render(true);
      return;
    }

    /* --- ảnh bìa --- */
    const editCover = target.closest("[data-edit-cover]");
    if (editCover) {
      e.preventDefault();
      const t = K.covers.parseTarget(editCover.dataset.editCover);
      if (t) K.covers.openPicker(t);
      return;
    }

    const openStudio = target.closest("[data-open-studio]");
    if (openStudio) {
      e.preventDefault();
      const t = K.covers.parseTarget(openStudio.dataset.openStudio);
      if (t) K.covers.openStudio(t);
      return;
    }

    /* --- lời bài hát --- */
    const editLyrics = target.closest("[data-edit-lyrics]");
    if (editLyrics) {
      e.preventDefault();
      openLyricsEditor(editLyrics.dataset.editLyrics);
      return;
    }

    const importLrc = target.closest("[data-import-lrc]");
    if (importLrc) {
      e.preventDefault();
      openLyricsEditor(importLrc.dataset.importLrc, true);
      return;
    }

    const openLyricsPlayer = target.closest("[data-open-lyrics-player]");
    if (openLyricsPlayer) {
      e.preventDefault();
      if (!player.track || player.track.id !== openLyricsPlayer.dataset.openLyricsPlayer) {
        const id = openLyricsPlayer.dataset.openLyricsPlayer;
        player.playTrack(id, [id], null);
      }
      openNowPlaying();
      setTimeout(() => {
        const panel = $("#np-lyrics");
        if (panel) panel.scrollTop = 0;
      }, 200);
      return;
    }

    const lyricLine = target.closest("[data-lyric-at]");
    if (lyricLine) {
      const at = parseFloat(lyricLine.dataset.lyricAt);
      const holder = lyricLine.closest("[data-lyrics-track]");
      const trackId = holder && holder.dataset.lyricsTrack;
      if (trackId) {
        if (!player.track || player.track.id !== trackId) player.playTrack(trackId, [trackId], null);
        setTimeout(() => {
          player.seek(at);
          player.play();
        }, player.track && player.track.id === trackId ? 0 : 280);
      }
      return;
    }

    /* --- playlist --- */
    const newPl = target.closest("[data-new-playlist]");
    if (newPl) {
      e.preventDefault();
      openNewPlaylist();
      return;
    }

    const renamePl = target.closest("[data-rename-playlist]");
    if (renamePl) {
      e.preventDefault();
      openRenamePlaylist(renamePl.dataset.renamePlaylist);
      return;
    }

    const delPl = target.closest("[data-delete-playlist]");
    if (delPl) {
      e.preventDefault();
      if (confirm("Xoá danh sách này?")) {
        K.store.deletePlaylist(delPl.dataset.deletePlaylist);
        toast("Đã xoá danh sách", "trash");
        location.hash = "#/library";
        render();
      }
      return;
    }

    const resetStats = target.closest("[data-reset-stats]");
    if (resetStats) {
      if (confirm("Xoá toàn bộ dữ liệu nghe?")) {
        K.store.resetStats();
        toast("Đã xoá dữ liệu thống kê", "trash");
        render(true);
      }
      return;
    }

    /* --- A-B --- */
    const abBtn = target.closest("[data-ab]");
    if (abBtn) {
      e.preventDefault();
      player.setAB(abBtn.dataset.ab);
      const ab = player.ab;
      toast(
        abBtn.dataset.ab === "clear"
          ? "Đã xoá đoạn lặp"
          : "Đã đặt điểm " + abBtn.dataset.ab.toUpperCase() + (ab.a != null && ab.b != null ? ": " + K.fmtTime(ab.a) + " → " + K.fmtTime(ab.b) : ""),
        "repeat"
      );
      return;
    }

    /* --- seek tới bình luận --- */
    const seekComment = target.closest("[data-seek-to]");
    if (seekComment) {
      const at = parseFloat(seekComment.dataset.seekTo);
      const row = seekComment.closest("[data-track-id]");
      const trackId = row ? row.dataset.trackId : currentRoute.params.id;
      if (!trackId) return;
      if (player.track && player.track.id === trackId) {
        player.seek(at);
        player.play();
      } else {
        player.playTrack(trackId, [trackId], null);
        audio.addEventListener(
          "loadedmetadata",
          () => {
            player.seek(at);
            player.play();
          },
          { once: true }
        );
      }
      return;
    }

    /* --- hàng chờ --- */
    const removeQ = target.closest("[data-queue-remove]");
    if (removeQ) {
      e.preventDefault();
      player.removeFromQueue(parseInt(removeQ.dataset.queueRemove, 10));
      return;
    }

    const tab = target.closest("[data-search-tab]");
    if (tab) {
      e.preventDefault();
      location.hash = tab.dataset.searchTab;
    }
  });

  /* ================= add to playlist ================= */
  function openAddToPlaylist(trackId) {
    const lists = K.store.allPlaylists();
    const el = document.createElement("div");
    el.className = "modal-backdrop";
    el.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<header class="modal-head"><div><h2>Thêm vào danh sách</h2>' +
        '<p class="modal-sub">' + esc(K.trackById[trackId].title) + "</p></div>" +
        '<button class="icon-btn" data-close-simple aria-label="Đóng">' + icon("close") + "</button></header>" +
        '<div class="modal-body">' +
          lists.map((p) =>
            '<button class="pick-row" data-pick="' + esc(p.id) + '" data-track="' + esc(trackId) + '">' +
              '<img src="' + esc(K.store.playlistCoverOf(p.id)) + '" alt="">' +
              '<span class="pick-text"><span>' + esc(p.title) + "</span>" +
              '<small>' + K.playlistTracks(p).length + " bài" + (p.custom ? " · của bạn" : "") + "</small></span>" +
              (p.trackIds.includes(trackId) ? icon("check") : icon("plus")) +
            "</button>"
          ).join("") +
          '<button class="pick-row pick-new" data-new-from-track="' + esc(trackId) + '">' + icon("plus") +
            "<span class=\"pick-text\"><span>Tạo danh sách mới</span><small>với bài này</small></span></button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    document.body.classList.add("modal-open");
    const close = () => {
      el.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      setTimeout(() => el.remove(), 240);
    };
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-close-simple]")) return close();
      const pick = e.target.closest("[data-pick]");
      if (pick) {
        const ok = K.store.addToPlaylist(pick.dataset.pick, pick.dataset.track);
        toast(ok ? "Đã thêm vào danh sách" : "Bài này đã có trong danh sách", ok ? "check" : "close");
        close();
        render(true);
        return;
      }
      const nw = e.target.closest("[data-new-from-track]");
      if (nw) {
        close();
        openNewPlaylist(nw.dataset.newFromTrack);
      }
    });
  }

  /* ================= playlist mới / đổi tên ================= */
  function openNewPlaylist(seedTrackId) {
    const el = document.createElement("div");
    el.className = "modal-backdrop";
    el.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<header class="modal-head"><div><h2>Danh sách mới</h2>' +
        '<p class="modal-sub">Chọn bài, đặt tên, xong.</p></div>' +
        '<button class="icon-btn" data-close-simple aria-label="Đóng">' + icon("close") + "</button></header>" +
        '<div class="modal-body">' +
          '<label class="field"><span>Tên danh sách</span>' +
            '<input id="np-title-input" type="text" maxlength="60" placeholder="Ví dụ: Nghe lúc khuya" value="' + (seedTrackId ? esc(K.trackById[seedTrackId].title + " — bản chọn") : "") + '"></label>' +
          '<label class="field"><span>Mô tả (không bắt buộc)</span>' +
            '<input id="np-desc-input" type="text" maxlength="120" placeholder="Một dòng về danh sách này"></label>' +
          '<div class="field"><span>Bài hát</span>' +
            D.tracks.map((t) =>
              '<label class="check-row"><input type="checkbox" value="' + esc(t.id) + '"' +
                (seedTrackId === t.id ? " checked" : "") + ">" +
                '<img src="' + esc(K.store.coverOf(t.id)) + '" alt=""><span>' + esc(t.title) + "</span>" +
                '<small>' + K.fmtTime(t.duration) + "</small></label>"
            ).join("") +
          "</div>" +
        "</div>" +
        '<footer class="modal-foot">' +
          '<button class="btn btn-ghost" data-close-simple>Huỷ</button>' +
          '<button class="btn btn-primary" id="create-playlist">' + icon("check") + " Tạo danh sách</button>" +
        "</footer>" +
      "</div>";
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    document.body.classList.add("modal-open");
    setTimeout(() => $("#np-title-input", el).focus(), 120);
    const close = () => {
      el.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      setTimeout(() => el.remove(), 240);
    };
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-close-simple]")) close();
    });
    $("#create-playlist", el).addEventListener("click", () => {
      const title = $("#np-title-input", el).value.trim();
      const desc = $("#np-desc-input", el).value.trim();
      const ids = $$("input[type=checkbox]:checked", el).map((c) => c.value);
      if (!title) return toast("Đặt tên cho danh sách đã", "close");
      const p = K.store.createPlaylist(title, desc, ids);
      close();
      toast("Đã tạo “" + p.title + "”", "check");
      location.hash = "#/playlist/" + p.id;
      render();
    });
  }

  function openRenamePlaylist(id) {
    const p = K.store.playlistById(id);
    if (!p) return;
    const title = prompt("Tên mới cho danh sách:", p.title);
    if (title == null) return;
    const desc = prompt("Mô tả:", p.description || "");
    K.store.updatePlaylist(id, { title: title.trim() || p.title, description: desc == null ? p.description : desc });
    toast("Đã cập nhật danh sách", "check");
    render(true);
  }

  /* ================= lời bài hát ================= */
  function parseLrc(text) {
    const out = [];
    String(text || "")
      .split(/\r?\n/)
      .forEach((raw) => {
        const line = raw.trim();
        if (!line) return;
        let m = line.match(/^\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]\s*(.*)$/);
        if (m) {
          out.push({ t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: m[3] });
          return;
        }
        m = line.match(/^(\d{1,2}):(\d{2})\s+(.*)$/);
        if (m) {
          out.push({ t: parseInt(m[1], 10) * 60 + parseInt(m[2], 10), text: m[3] });
          return;
        }
        m = line.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
        if (m) {
          out.push({ t: parseFloat(m[1]), text: m[2] });
          return;
        }
        out.push({ t: 0, text: line });
      });
    return out;
  }

  function lyricsToText(lines) {
    return lines.map((l) => "[" + K.fmtTime(l.t) + "] " + l.text).join("\n");
  }

  function openLyricsEditor(trackId, focusImport) {
    const t = K.trackById[trackId];
    if (!t) return;
    const lines = K.store.lyricsFor(trackId);
    const el = document.createElement("div");
    el.className = "modal-backdrop";
    el.innerHTML =
      '<div class="modal modal-wide-lg" role="dialog" aria-modal="true">' +
        '<header class="modal-head"><div><h2>Lời bài hát · ' + esc(t.title) + "</h2>" +
        '<p class="modal-sub">Mỗi dòng bắt đầu bằng <code>[phút:giây]</code>. Không có mốc thì mặc định 0:00.</p></div>' +
        '<button class="icon-btn" data-close-simple aria-label="Đóng">' + icon("close") + "</button></header>" +
        '<div class="modal-body">' +
          '<div class="lyrics-toolbar">' +
            '<button class="btn btn-sm btn-outline" id="lyr-stamp">' + icon("clock") + " Chèn mốc hiện tại</button>" +
            '<button class="btn btn-sm btn-outline" id="lyr-import">' + icon("upload") + " Nhập .lrc / .txt</button>" +
            '<button class="btn btn-sm btn-ghost" id="lyr-clear">' + icon("trash") + " Xoá hết</button>" +
            '<span class="small muted" id="lyr-hint">' + (player.track && player.track.id === trackId ? "Đang phát " + K.fmtTime(audio.currentTime) : "Mở bài này để chèn mốc nhanh") + "</span>" +
          "</div>" +
          '<textarea id="lyrics-text" class="lyrics-textarea" spellcheck="false" rows="12" ' +
            'placeholder="[0:00] Dòng đầu tiên&#10;[0:14] Dòng thứ hai&#10;[0:28] …">' + esc(lyricsToText(lines)) + "</textarea>" +
          '<input type="file" id="lyr-file" accept=".lrc,.txt,text/plain" hidden>' +
        "</div>" +
        '<footer class="modal-foot">' +
          '<button class="btn btn-ghost" data-close-simple>Huỷ</button>' +
          '<button class="btn btn-primary" id="lyr-save">' + icon("check") + " Lưu lời</button>" +
        "</footer>" +
      "</div>";
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    document.body.classList.add("modal-open");
    const area = $("#lyrics-text", el);
    const close = () => {
      el.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      setTimeout(() => el.remove(), 240);
    };
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-close-simple]")) close();
    });

    $("#lyr-stamp", el).addEventListener("click", () => {
      const cur = player.track && player.track.id === trackId ? audio.currentTime || 0 : 0;
      const stamp = "[" + K.fmtTime(cur) + "] ";
      const start = area.selectionStart || area.value.length;
      const before = area.value.slice(0, start);
      const needsNl = before && !before.endsWith("\n");
      area.value = before + (needsNl ? "\n" : "") + stamp + area.value.slice(start);
      area.focus();
      const pos = area.value.length;
      area.setSelectionRange(pos, pos);
      $("#lyr-hint", el).textContent = "Đã chèn mốc " + K.fmtTime(cur);
    });

    $("#lyr-import", el).addEventListener("click", () => $("#lyr-file", el).click());
    $("#lyr-file", el).addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const text = await f.text();
      const parsed = parseLrc(text);
      area.value = lyricsToText(parsed);
      $("#lyr-hint", el).textContent = "Đã nhập " + parsed.length + " dòng từ " + f.name;
    });

    $("#lyr-clear", el).addEventListener("click", () => {
      area.value = "";
      area.focus();
    });

    $("#lyr-save", el).addEventListener("click", () => {
      const parsed = parseLrc(area.value);
      K.store.setLyrics(trackId, parsed);
      close();
      toast("Đã lưu " + parsed.length + " dòng lời", "check");
      render(true);
      renderNpLyrics();
    });

    if (focusImport) setTimeout(() => $("#lyr-file", el).click(), 150);
  }

  /* ================= điều khiển phát ================= */
  function bindControls() {
    $("#btn-play").addEventListener("click", () => player.toggle());
    $("#btn-prev").addEventListener("click", () => player.prev());
    $("#btn-next").addEventListener("click", () => player.next());
    $("#btn-shuffle").addEventListener("click", () => player.toggleShuffle());
    $("#btn-repeat").addEventListener("click", () => player.cycleRepeat());
    $("#np-like").addEventListener("click", () => player.track && toggleLike(player.track.id));
    $("#btn-volume").addEventListener("click", () => player.toggleMute());
    $("#btn-queue").addEventListener("click", () => openDrawer());
    $("#btn-expand").addEventListener("click", () => openNowPlaying());
    $("#btn-menu").addEventListener("click", () => $("#sidebar").classList.toggle("is-open"));
    $("#btn-shortcuts").addEventListener("click", openShortcuts);
    $("#btn-theme").addEventListener("click", toggleTheme);
    $("#np-theme").addEventListener("click", toggleTheme);
    $("#btn-accent").addEventListener("click", (e) => {
      e.stopPropagation();
      $("#accent-pop").hidden = !$("#accent-pop").hidden;
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".accent-wrap")) {
        const pop = $("#accent-pop");
        if (pop) pop.hidden = true;
      }
    });

    const vol = $("#volume");
    vol.addEventListener("input", (e) => player.setVolume(e.target.value / 100));

    $("#big-play").addEventListener("click", () => player.toggle());
    $("#big-prev").addEventListener("click", () => player.prev());
    $("#big-next").addEventListener("click", () => player.next());
    $("#big-shuffle").addEventListener("click", () => player.toggleShuffle());
    $("#big-repeat").addEventListener("click", () => player.cycleRepeat());
    $("#big-like").addEventListener("click", () => player.track && toggleLike(player.track.id));
    $("#big-queue").addEventListener("click", () => {
      closeNowPlaying();
      openDrawer();
    });
    $("#big-tools").addEventListener("click", () => {
      closeNowPlaying();
      showTools();
    });
    $("#big-goto").addEventListener("click", () => {
      if (!player.track) return;
      const id = player.track.id;
      closeNowPlaying();
      location.hash = "#/track/" + id;
    });
    $("#np-edit-cover").addEventListener("click", () => {
      if (player.track) K.covers.openPicker({ type: "track", id: player.track.id });
    });
    $("#np-studio").addEventListener("click", () => {
      if (player.track) K.covers.openStudio({ type: "track", id: player.track.id });
    });
    $("#np-download").addEventListener("click", async () => {
      if (!player.track) return;
      const src = K.store.coverOf(player.track.id);
      const a = document.createElement("a");
      a.href = src.startsWith("data:") ? src : await K.covers.srcToDataURL(src, 1024);
      a.download = "kozl-" + player.track.id + "-cover.jpg";
      a.click();
      toast("Đã tải ảnh bìa", "download");
    });
    $("#np-edit-lyrics").addEventListener("click", () => {
      if (player.track) openLyricsEditor(player.track.id);
    });
    $("#np-art").addEventListener("click", (e) => {
      e.preventDefault();
      openNowPlaying();
    });

    // click ra ngoài để đóng now playing
    $("#nowplaying").addEventListener("click", (e) => {
      if (e.target.closest("a, button, input, .wave, .np-cover-wrap, .np-lyrics, .np-vinyl")) return;
      closeNowPlaying();
    });

    // bấm vào dòng bài hát (không phải nút/link/waveform) = phát
    viewEl.addEventListener("click", (e) => {
      if (e.target.closest("a, button, input, .wave, .row-play")) return;
      const row = e.target.closest(".track-row");
      if (row && row.dataset.trackId) playFrom(row, row.dataset.trackId);
    });

    /* --- công cụ --- */
    $("#btn-tools").addEventListener("click", (e) => {
      e.stopPropagation();
      $("#tools-pop").hidden ? showTools() : hideTools();
    });
    $("#tools-pop").addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#tools-pop") && !e.target.closest("#btn-tools")) hideTools();
    });

    $("#speed-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-speed]");
      if (!b) return;
      player.setSpeed(parseFloat(b.dataset.speed));
      syncTools();
      toast("Tốc độ " + b.textContent, "gauge");
    });
    $("#sleep-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sleep]");
      if (!b) return;
      player.setSleep(parseInt(b.dataset.sleep, 10));
      syncTools();
      toast(b.dataset.sleep === "0" ? "Đã tắt hẹn giờ" : "Hẹn giờ tắt sau " + b.dataset.sleep + " phút", "timer");
    });
    $("#eq-presets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-eq]");
      if (!b) return;
      applyEqPreset(b.dataset.eq);
    });
    ["bass", "mid", "treble"].forEach((band) => {
      $("#eq-" + band).addEventListener("input", (e) => {
        K.store.state.eq = Object.assign({}, K.store.state.eq, { enabled: true, preset: "custom", [band]: parseInt(e.target.value, 10) });
        K.store.save();
        player.fx.ensure();
        player.fx.apply(K.store.state.eq);
        syncTools();
      });
    });
    $("#viz-toggle").addEventListener("change", (e) => {
      K.store.state.visualizer = e.target.checked;
      K.store.save();
      if (e.target.checked) player.fx.ensure();
      syncTools();
    });
    $("#btn-visualizer").addEventListener("click", () => {
      K.store.state.visualizer = !K.store.state.visualizer;
      K.store.save();
      if (K.store.state.visualizer) player.fx.ensure();
      syncTools();
    });
  }

  function applyEqPreset(id) {
    const presets = {
      flat: { bass: 0, mid: 0, treble: 0, enabled: false },
      bass: { bass: 8, mid: -1, treble: 1, enabled: true },
      vocal: { bass: -3, mid: 6, treble: 2, enabled: true },
      bright: { bass: 1, mid: 0, treble: 8, enabled: true },
    };
    const p = presets[id] || presets.flat;
    K.store.state.eq = Object.assign({}, p, { preset: id });
    K.store.save();
    player.fx.resume();
    player.fx.apply(K.store.state.eq);
    $("#eq-bass").value = p.bass;
    $("#eq-mid").value = p.mid;
    $("#eq-treble").value = p.treble;
    syncTools();
    toast(id === "flat" ? "Đã tắt cân bằng" : "EQ: " + id, "sliders");
  }

  function showTools() {
    $("#tools-pop").hidden = false;
    syncTools();
  }
  function hideTools() {
    const p = $("#tools-pop");
    if (p) p.hidden = true;
  }

  function syncTools() {
    const st = K.store.state;
    const s = player.snapshot();
    $$("#speed-chips [data-speed]").forEach((b) => b.classList.toggle("is-active", parseFloat(b.dataset.speed) === s.speed));
    $("#speed-value").textContent = String(s.speed).replace(".", ",") + "×";
    const remain = s.sleepUntil ? Math.max(0, Math.round((s.sleepUntil - Date.now()) / 60000)) : 0;
    $("#sleep-value").textContent = s.sleepUntil ? "còn ~" + Math.max(1, remain) + "′" : "";
    const eq = st.eq || {};
    $$("#eq-presets [data-eq]").forEach((b) => b.classList.toggle("is-active", (eq.preset || "flat") === b.dataset.eq));
    $("#eq-value").textContent = eq.enabled ? "Bật" : "Tắt";
    $("#eq-bass").value = eq.bass || 0;
    $("#eq-mid").value = eq.mid || 0;
    $("#eq-treble").value = eq.treble || 0;
    const ab = player.ab;
    $("#ab-value").textContent = ab.a != null && ab.b != null ? K.fmtTime(ab.a) + " → " + K.fmtTime(ab.b) : ab.a != null ? "A " + K.fmtTime(ab.a) : "";
    const viz = !!st.visualizer;
    $("#viz-toggle").checked = viz;
    $("#btn-visualizer").setAttribute("aria-pressed", String(viz));
    $("#btn-visualizer").classList.toggle("is-active", viz);
    const abStatus = $("#ab-status");
    if (abStatus) {
      abStatus.innerHTML =
        ab.a != null || ab.b != null
          ? '<span class="ab-pill">A ' + (ab.a != null ? K.fmtTime(ab.a) : "—") + "</span>" +
            '<span class="ab-pill">B ' + (ab.b != null ? K.fmtTime(ab.b) : "—") + "</span>"
          : "";
    }
  }

  /* ================= đồng bộ UI ================= */
  function syncAll() {
    syncLikeButtons();
    syncTransport();
    syncTrackInfo();
    refreshWaveList();
    updateAllWaves();
    syncRows();
    syncTools();
    applyTheme();
  }

  function syncLikeButtons() {
    $("#likes-count").textContent = String(K.store.state.likes.size);
    $$("[data-like]").forEach((btn) => {
      const id = btn.dataset.like;
      const liked = K.store.isLiked(id);
      btn.classList.toggle("is-liked", liked);
      btn.setAttribute("aria-pressed", String(liked));
      const use = btn.querySelector("use");
      if (use) use.setAttribute("href", liked ? "#i-heart-fill" : "#i-heart");
      const label = btn.querySelector(".like-label");
      if (label) label.textContent = liked ? "Đã thích" : "Thích";
    });
    const cur = player.track;
    const npLike = $("#np-like");
    if (npLike && cur) {
      const liked = K.store.isLiked(cur.id);
      npLike.classList.toggle("is-liked", liked);
      npLike.setAttribute("aria-pressed", String(liked));
      npLike.querySelector("use").setAttribute("href", liked ? "#i-heart-fill" : "#i-heart");
    }
    const bigLike = $("#big-like");
    if (bigLike && cur) {
      const liked = K.store.isLiked(cur.id);
      bigLike.classList.toggle("is-liked", liked);
      bigLike.querySelector("use").setAttribute("href", liked ? "#i-heart-fill" : "#i-heart");
      const span = bigLike.querySelector("span");
      if (span) span.textContent = liked ? "Đã thích" : "Thích";
    }
  }

  const setUse = (el, name) => {
    const use = el && el.querySelector("use");
    if (use) use.setAttribute("href", "#i-" + name);
  };

  function syncTransport() {
    const s = player.snapshot();
    setUse($("#btn-play"), s.playing ? "pause" : "play");
    $("#btn-play").setAttribute("aria-label", s.playing ? "Tạm dừng" : "Phát");
    setUse($("#big-play"), s.playing ? "pause" : "play");
    $("#big-play").setAttribute("aria-label", s.playing ? "Tạm dừng" : "Phát");

    ["#btn-shuffle", "#big-shuffle"].forEach((sel) => {
      const el = $(sel);
      el.classList.toggle("is-active", s.shuffle);
      el.setAttribute("aria-pressed", String(s.shuffle));
    });

    const repeatName = s.repeat === "one" ? "repeat-one" : "repeat";
    ["#btn-repeat", "#big-repeat"].forEach((sel) => {
      const el = $(sel);
      setUse(el, repeatName);
      el.classList.toggle("is-active", s.repeat !== "off");
      el.setAttribute("aria-pressed", String(s.repeat !== "off"));
      el.title = "Lặp lại: " + { off: "tắt", all: "toàn bộ", one: "một bài" }[s.repeat];
    });

    setUse($("#btn-volume"), s.muted || s.volume === 0 ? "volume-mute" : "volume");
    const vol = $("#volume");
    vol.value = String(Math.round(s.volume * 100));
    vol.style.setProperty("--fill", Math.round(s.volume * 100) + "%");
    $("#player").classList.toggle("is-playing", s.playing);
  }

  function syncTrackInfo() {
    const t = player.track;
    const art = $("#np-art");
    if (!t) {
      $("#np-title").textContent = "Chưa chọn bài";
      $("#np-artist").textContent = "Kozl Music";
      $("#np-title").removeAttribute("href");
      $("#np-artist").removeAttribute("href");
      art.style.backgroundImage = "none";
      $("#time-total").textContent = "0:00";
      $("#time-current").textContent = "0:00";
      return;
    }
    const a = K.artistById[t.artistId];
    const cover = K.store.coverOf(t.id);
    $("#np-title").textContent = t.title;
    $("#np-title").href = "#/track/" + t.id;
    $("#np-artist").textContent = a ? a.name : "Kozl";
    $("#np-artist").href = "#/artist/" + t.artistId;
    art.style.backgroundImage = 'url("' + cover + '")';
    art.classList.toggle("is-playing", player.playing);
    $("#time-total").textContent = K.fmtTime(t.duration);

    $("#np-cover").src = cover;
    $("#np-cover").alt = "Bìa " + t.title;
    $("#np-bg").style.backgroundImage = 'url("' + cover + '")';
    $("#np-big-title").textContent = t.title;
    $("#np-big-artist").textContent = a ? a.name : "Kozl";
    $("#np-big-artist").href = "#/artist/" + t.artistId;
    $("#np-big-sub").textContent = [t.genre, K.fmtTime(t.duration), K.relTime(t.uploadedAt)].join(" · ");
    $("#big-total").textContent = K.fmtTime(t.duration);
    $("#np-context").textContent = player.context ? "Từ: " + player.context : "";

    const pw = $("#player-wave");
    if (pw && pw.dataset.waveTrack !== t.id) {
      K.wave.render(pw, t.id, { bars: Math.max(60, Math.min(160, Math.round((pw.clientWidth || 400) / 4))) });
      if (!pw._bound) {
        bindWave(pw);
        pw._bound = true;
      }
    }
    const bw = $("#big-wave");
    if (bw && bw.dataset.waveTrack !== t.id) {
      K.wave.render(bw, t.id, { bars: 130, markers: true });
      if (!bw._bound) {
        bindWave(bw);
        bw._bound = true;
      }
    }
    refreshWaveList();
  }

  function syncRows() {
    const cur = player.track;
    $$("[data-track-id]").forEach((row) => {
      const isCurrent = cur && row.dataset.trackId === cur.id;
      row.classList.toggle("is-current", !!isCurrent);
      row.classList.toggle("is-playing", !!isCurrent && player.playing);
      const likeBtn = row.querySelector("[data-like]");
      if (likeBtn) {
        const liked = K.store.isLiked(row.dataset.trackId);
        likeBtn.classList.toggle("is-liked", liked);
        const use = likeBtn.querySelector("use");
        if (use) use.setAttribute("href", liked ? "#i-heart-fill" : "#i-heart");
      }
    });
    $("#np-art").classList.toggle("is-playing", !!cur && player.playing);
  }

  function refreshWaveList() {
    waveEls = $$(".wave").filter((el) => el.dataset.waveTrack);
  }

  function updateAllWaves() {
    waveEls.forEach((el) => updateWaveProgress(el));
  }

  function updateWaveProgress(el) {
    const cur = player.track;
    const id = el.dataset.waveTrack;
    if (!cur || cur.id !== id) {
      if (el._ratio !== 0) K.wave.setProgress(el, 0);
      return;
    }
    const dur = audio.duration && isFinite(audio.duration) ? audio.duration : cur.duration;
    const ratio = dur ? K.clamp((audio.currentTime || 0) / dur, 0, 1) : 0;
    el._duration = dur;
    el._liveRatio = ratio;
    if (!el.classList.contains("is-scrubbing")) K.wave.setProgress(el, ratio);
    if (el.id === "track-wave") {
      const pos = $("#track-pos");
      if (pos) pos.textContent = K.fmtTime(audio.currentTime || 0);
    }
  }

  /* ================= hàng chờ ================= */
  function queueRow(t, index, opts) {
    const a = K.artistById[t.artistId];
    return (
      '<div class="track-row' + (opts && opts.drag ? " draggable-row" : "") + '" data-track-id="' + esc(t.id) + '"' +
        (opts && opts.drag ? ' draggable="true" data-qindex="' + index + '"' : "") + ">" +
        (opts && opts.drag ? '<span class="q-grip">' + icon("drag") + "</span>" : "") +
        '<div class="row-art"><img src="' + esc(K.store.coverOf(t.id)) + '" alt="">' +
          '<button class="row-play" data-play="' + esc(t.id) + '" aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button></div>" +
        '<div class="row-main"><span class="row-title">' + esc(t.title) + "</span>" +
          '<div class="row-artist">' + esc(a ? a.name : "") + "</div></div>" +
        '<div class="row-side">' +
          (opts && opts.removable
            ? '<button class="icon-btn q-remove" data-queue-remove="' + index + '" aria-label="Bỏ khỏi hàng chờ">' + icon("close") + "</button>"
            : '<span class="row-dur">' + K.fmtTime(t.duration) + "</span>") +
        "</div></div>"
    );
  }

  function renderQueue() {
    const info = player.queueInfo();
    $("#queue-context").textContent = info.context
      ? "Từ: " + info.context
      : info.current
      ? "Đang phát: " + info.current.title
      : "Chưa có gì đang phát";
    $("#queue-now").innerHTML = info.current ? queueRow(info.current, player.index, {}) : '<div class="queue-empty">Chưa có bài nào.</div>';
    $("#queue-count").textContent = info.upcoming.length ? "(" + info.upcoming.length + ")" : "";
    $("#queue-list").innerHTML = info.upcoming.length
      ? info.upcoming.map((t, i) => queueRow(t, player.index + 1 + i, { removable: true, drag: true })).join("")
      : '<li class="queue-empty">Hàng chờ trống. Bấm “+” ở một bài hát để thêm vào.</li>';
    const clear = $("#queue-clear");
    if (clear) clear.hidden = !info.upcoming.length;

    // kéo để đổi thứ tự
    $$("#queue-list .draggable-row").forEach((row) => {
      row.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", row.dataset.qindex);
        row.classList.add("is-dragging");
      });
      row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        row.classList.add("is-drop");
      });
      row.addEventListener("dragleave", () => row.classList.remove("is-drop"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("is-drop");
        const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
        const to = parseInt(row.dataset.qindex, 10);
        if (isNaN(from) || isNaN(to) || from === to) return;
        player.moveInQueue(from, to);
        renderQueue();
      });
    });
  }

  function openDrawer() {
    renderQueue();
    $("#drawer-backdrop").hidden = false;
    requestAnimationFrame(() => {
      $("#queue-drawer").classList.add("is-open");
      $("#drawer-backdrop").classList.add("is-open");
    });
    $("#queue-drawer").setAttribute("aria-hidden", "false");
  }

  function closeDrawerUI() {
    $("#queue-drawer").classList.remove("is-open");
    $("#drawer-backdrop").classList.remove("is-open");
    $("#queue-drawer").setAttribute("aria-hidden", "true");
    setTimeout(() => ($("#drawer-backdrop").hidden = true), 320);
  }

  $("#drawer-backdrop").addEventListener("click", closeDrawerUI);
  $("#queue-clear").addEventListener("click", () => {
    player.clearUpcoming();
    toast("Đã xoá phần còn lại của hàng chờ", "trash");
    renderQueue();
  });
  $("#queue-drawer").addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    const row = e.target.closest(".track-row");
    if (!row || !row.dataset.trackId) return;
    const idx = player.queue.indexOf(row.dataset.trackId);
    if (idx > -1) {
      player.jumpTo(idx);
      renderQueue();
    }
  });

  /* ================= màn hình đang phát ================= */
  function openNowPlaying() {
    const el = $("#nowplaying");
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("np-open");
    if (player.track) {
      syncTrackInfo();
      renderNpLyrics();
    }
    if (K.store.state.visualizer) player.fx.ensure();
  }
  function closeNowPlaying() {
    $("#nowplaying").classList.remove("is-open");
    $("#nowplaying").setAttribute("aria-hidden", "true");
    document.body.classList.remove("np-open");
  }

  function renderNpLyrics() {
    const panel = $("#np-lyrics");
    if (!panel) return;
    const t = player.track;
    if (!t) {
      panel.innerHTML = "";
      return;
    }
    const lines = K.store.lyricsFor(t.id);
    if (!lines.length) {
      panel.innerHTML =
        '<div class="np-lyrics-empty">' + icon("lyrics") +
        "<div>Chưa có lời cho bài này.</div>" +
        '<button class="btn btn-sm btn-outline" data-edit-lyrics="' + esc(t.id) + '">' + icon("pencil") + " Thêm lời</button></div>";
      return;
    }
    panel.innerHTML =
      '<div class="lyrics" data-lyrics-track="' + esc(t.id) + '">' +
      lines.map(
        (l) =>
          '<button class="lyric-line" data-lyric-at="' + l.t + '"><span class="lyric-time">' + K.fmtTime(l.t) + "</span>" +
          '<span class="lyric-text">' + esc(l.text) + "</span></button>"
      ).join("") +
      "</div>";
  }

  function highlightLyrics(current) {
    $$(".lyrics").forEach((box) => {
      const trackId = box.dataset.lyricsTrack;
      if (!player.track || player.track.id !== trackId) return;
      const lines = $$(".lyric-line", box);
      let active = -1;
      lines.forEach((l, i) => {
        if (parseFloat(l.dataset.lyricAt) <= current + 0.15) active = i;
      });
      lines.forEach((l, i) => l.classList.toggle("is-active", i === active));
      const inPanel = box.closest("#np-lyrics");
      if (inPanel && active > -1) {
        const el = lines[active];
        const boxRect = box.getBoundingClientRect();
        const lineRect = el.getBoundingClientRect();
        if (lineRect.top < boxRect.top + 20 || lineRect.bottom > boxRect.bottom - 20) {
          box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
        }
      }
    });
  }

  /* ================= visualizer ================= */
  let vizRaf = 0;
  function drawViz() {
    const canvas = $("#np-viz");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
    }
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff5500";
    const data = player.fx.spectrum();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!data) {
      vizRaf = requestAnimationFrame(drawViz);
      return;
    }
    const bars = 48;
    const step = Math.max(1, Math.floor(data.length / bars));
    const bw = canvas.width / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const bh = Math.max(2 * dpr, v * canvas.height * 0.85);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.12 + v * 0.5;
      ctx.fillRect(i * bw + bw * 0.2, canvas.height - bh, bw * 0.6, bh);
    }
    ctx.globalAlpha = 1;
    vizRaf = requestAnimationFrame(drawViz);
  }

  function startViz() {
    const canvas = $("#np-viz");
    if (!canvas) return;
    canvas.style.opacity = K.store.state.visualizer ? "1" : "0";
    if (K.store.state.visualizer && !vizRaf) {
      player.fx.ensure();
      drawViz();
    }
    if (!K.store.state.visualizer && vizRaf) {
      cancelAnimationFrame(vizRaf);
      vizRaf = 0;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ================= sự kiện trình phát ================= */
  player.on("track", ({ track }) => {
    K.store.pushRecent(track.id);
    syncAll();
    renderNpLyrics();
    if ($("#queue-drawer").classList.contains("is-open")) renderQueue();
  });

  player.on("state", () => {
    syncTransport();
    syncRows();
    syncLikeButtons();
    syncTools();
    startViz();
  });

  player.on("time", (info) => {
    if (pendingSeekRatio !== null && info.duration > 0) {
      const r = pendingSeekRatio;
      pendingSeekRatio = null;
      player.seekRatio(r);
    }
    waveEls.forEach(updateWaveProgress);
    $("#time-current").textContent = K.fmtTime(info.current);
    $("#big-current").textContent = K.fmtTime(info.current);
    $("#time-total").textContent = K.fmtTime(info.duration || 0);
    $("#big-total").textContent = K.fmtTime(info.duration || 0);
    highlightLyrics(info.current);
    if (currentRoute.name === "track") {
      const hint = $("#comment-at-hint");
      if (hint) hint.textContent = "tại " + K.fmtTime(info.current);
    }
  });

  player.on("queue", () => {
    if ($("#queue-drawer").classList.contains("is-open")) renderQueue();
  });

  player.on("buffering", (busy) => {
    $("#btn-play").classList.toggle("is-loading", busy);
    $("#big-play").classList.toggle("is-loading", busy);
  });

  player.on("error", (t) => toast("Không phát được “" + (t ? t.title : "bài hát") + "”", "close"));

  player.on("sleep", (info) => {
    syncTools();
    if (!info.minutes) toast("Đã tắt hẹn giờ", "timer");
  });

  player.on("ab", () => syncTools());

  /* ================= bình luận ================= */
  viewEl.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-comment-form]");
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    const trackId = form.dataset.commentForm;
    const at = player.track && player.track.id === trackId ? audio.currentTime || 0 : 0;
    K.store.addComment(trackId, text, at);
    input.value = "";
    render(true);
    toast("Đã gửi bình luận tại " + K.fmtTime(at), "comment");
  });

  /* ================= tìm kiếm ================= */
  const searchInput = $("#search-input");
  const searchPanel = $("#search-panel");
  let searchIndex = -1;

  function searchResults(q) {
    const needle = q.toLowerCase();
    const tracks = D.tracks.filter((t) => (t.title + " " + t.genre + " " + (t.tags || []).join(" ")).toLowerCase().includes(needle));
    const playlists = K.store.allPlaylists().filter((p) => (p.title + " " + p.genre).toLowerCase().includes(needle));
    const artists = D.artists.filter((a) => a.name.toLowerCase().includes(needle));
    return { tracks, playlists, artists };
  }

  function renderPanel(q) {
    if (!q) {
      searchPanel.hidden = true;
      searchInput.setAttribute("aria-expanded", "false");
      return;
    }
    const r = searchResults(q);
    let html = "";
    if (r.tracks.length) {
      html += '<div class="sp-group">Bài hát</div>' + r.tracks.map((t) =>
        '<button class="sp-item" role="option" data-goto="#/track/' + esc(t.id) + '">' +
          '<img class="sp-thumb" src="' + esc(K.store.coverOf(t.id)) + '" alt="">' +
          '<span class="sp-text"><span class="sp-title">' + esc(t.title) + "</span>" +
          '<span class="sp-sub">' + esc(t.genre) + " · " + K.fmtTime(t.duration) + "</span></span></button>"
      ).join("");
    }
    if (r.playlists.length) {
      html += '<div class="sp-group">Danh sách</div>' + r.playlists.map((p) =>
        '<button class="sp-item" role="option" data-goto="#/playlist/' + esc(p.id) + '">' +
          '<img class="sp-thumb" src="' + esc(K.store.playlistCoverOf(p.id)) + '" alt="">' +
          '<span class="sp-text"><span class="sp-title">' + esc(p.title) + "</span>" +
          '<span class="sp-sub">' + K.playlistTracks(p).length + " bài</span></span></button>"
      ).join("");
    }
    if (r.artists.length) {
      html += '<div class="sp-group">Nghệ sĩ</div>' + r.artists.map((a) =>
        '<button class="sp-item" role="option" data-goto="#/artist/' + esc(a.id) + '">' +
          '<img class="sp-thumb round" src="' + esc(K.store.avatarOf(a.id)) + '" alt="">' +
          '<span class="sp-text"><span class="sp-title">' + esc(a.name) + "</span>" +
          '<span class="sp-sub">' + K.fmtCount(a.followers) + " người theo dõi</span></span></button>"
      ).join("");
    }
    if (!html) html = '<div class="sp-empty">Không tìm thấy “' + esc(q) + "”.</div>";
    html += '<button class="sp-all" data-goto="#/search?q=' + encodeURIComponent(q) + '">' + icon("search") + " Xem tất cả kết quả</button>";
    searchPanel.innerHTML = html;
    searchPanel.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    searchIndex = -1;
  }

  searchInput.addEventListener("input", K.debounce((e) => renderPanel(e.target.value.trim()), 90));
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) renderPanel(searchInput.value.trim());
  });
  searchPanel.addEventListener("click", (e) => {
    const item = e.target.closest("[data-goto]");
    if (!item) return;
    searchPanel.hidden = true;
    searchInput.blur();
    location.hash = item.dataset.goto;
  });
  searchInput.addEventListener("keydown", (e) => {
    const items = $$(".sp-item, .sp-all", searchPanel);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      searchIndex = e.key === "ArrowDown" ? (searchIndex + 1) % items.length : (searchIndex - 1 + items.length) % items.length;
      items.forEach((it, i) => it.setAttribute("aria-selected", String(i === searchIndex)));
      items[searchIndex].scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      if (searchIndex > -1 && items[searchIndex]) return items[searchIndex].click();
      if (q) {
        searchPanel.hidden = true;
        searchInput.blur();
        location.hash = "#/search?q=" + encodeURIComponent(q);
      }
    }
    if (e.key === "Escape") {
      searchPanel.hidden = true;
      searchInput.blur();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search")) searchPanel.hidden = true;
  });

  /* ================= modal / phím tắt ================= */
  function openShortcuts() {
    const back = $("#modal-backdrop");
    back.hidden = false;
    requestAnimationFrame(() => back.classList.add("is-open"));
    document.body.classList.add("modal-open");
  }
  function closeModal() {
    const back = $("#modal-backdrop");
    back.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    setTimeout(() => (back.hidden = true), 220);
  }
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop" || e.target.closest("[data-close-modal]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;

    if (e.key === "Escape") {
      if (menuEl) return closeMenu();
      if (document.querySelector("#cover-backdrop")) {
        K.covers.closeModal();
        return;
      }
      if (document.querySelector(".modal-backdrop.is-open")) {
        const m = document.querySelector(".modal-backdrop.is-open");
        m.classList.remove("is-open");
        document.body.classList.remove("modal-open");
        setTimeout(() => m.remove(), 240);
        return;
      }
      if ($("#nowplaying").classList.contains("is-open")) return closeNowPlaying();
      if ($("#queue-drawer").classList.contains("is-open")) return closeDrawerUI();
      if (!$("#tools-pop").hidden) return hideTools();
      if ($("#sidebar").classList.contains("is-open")) return $("#sidebar").classList.remove("is-open");
      return;
    }
    if (typing) return;

    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault();
        player.toggle();
        break;
      case "ArrowRight":
        e.preventDefault();
        player.seek((audio.currentTime || 0) + 5);
        break;
      case "ArrowLeft":
        e.preventDefault();
        player.seek((audio.currentTime || 0) - 5);
        break;
      case "l":
        player.seek((audio.currentTime || 0) + 10);
        break;
      case "L":
        openNowPlaying();
        break;
      case "j":
      case "J":
        player.seek((audio.currentTime || 0) - 10);
        break;
      case "ArrowUp":
        e.preventDefault();
        player.setVolume(Math.min(1, player.volume + 0.05));
        break;
      case "ArrowDown":
        e.preventDefault();
        player.setVolume(Math.max(0, player.volume - 0.05));
        break;
      case "m":
      case "M":
        player.toggleMute();
        break;
      case "n":
      case "N":
        player.next();
        break;
      case "p":
      case "P":
        player.prev();
        break;
      case "s":
      case "S":
        player.toggleShuffle();
        toast(player.shuffle ? "Đã bật xáo trộn" : "Đã tắt xáo trộn", "shuffle");
        break;
      case "r":
      case "R":
        player.cycleRepeat();
        toast("Lặp lại: " + { off: "tắt", all: "toàn bộ", one: "một bài" }[player.repeat], "repeat");
        break;
      case "t":
      case "T":
        $("#tools-pop").hidden ? showTools() : hideTools();
        break;
      case "q":
      case "Q":
        $("#queue-drawer").classList.contains("is-open") ? closeDrawerUI() : openDrawer();
        break;
      case "/":
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
        break;
      case "?":
        openShortcuts();
        break;
      default:
        break;
    }
  });

  /* ================= sidebar ================= */
  function syncSidebar() {
    const lists = K.store.allPlaylists();
    $("#side-playlists").innerHTML = lists
      .map(
        (p) =>
          '<a class="side-item" href="#/playlist/' + esc(p.id) + '" data-side="' + esc(p.id) + '">' +
            '<img src="' + esc(K.store.playlistCoverOf(p.id)) + '" alt="">' +
            '<span class="si-text"><span class="si-name">' + esc(p.title) + "</span>" +
            '<span class="si-meta">' + K.playlistTracks(p).length + " bài" + (p.custom ? " · của bạn" : "") + "</span></span></a>"
      )
      .join("");

    $("#side-artists").innerHTML = D.artists
      .map(
        (a) =>
          '<a class="side-item" href="#/artist/' + esc(a.id) + '">' +
            '<img class="round" src="' + esc(K.store.avatarOf(a.id)) + '" alt="">' +
            '<span class="si-text"><span class="si-name">' + esc(a.name) + "</span>" +
            '<span class="si-meta">' + K.artistTracks(a.id).length + " bài</span></span></a>"
      )
      .join("");

    $$("[data-side]").forEach((el) => {
      if (currentRoute.name === "playlist" && el.dataset.side === currentRoute.params.id) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  }

  function closeSidebar() {
    $("#sidebar").classList.remove("is-open");
  }

  document.addEventListener("click", (e) => {
    const bar = $("#sidebar");
    if (!bar.classList.contains("is-open")) return;
    if (e.target.closest("#sidebar") || e.target.closest("#btn-menu")) return;
    closeSidebar();
  });

  /* ================= PWA ================= */
  let installEvent = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    $("#btn-install").hidden = false;
  });
  $("#btn-install").addEventListener("click", async () => {
    if (!installEvent) return toast("Trình duyệt chưa cho cài lúc này", "install");
    installEvent.prompt();
    const res = await installEvent.userChoice;
    if (res && res.outcome === "accepted") toast("Đang cài Kozl Music", "install");
    installEvent = null;
    $("#btn-install").hidden = true;
  });

  /* ================= toàn cục ================= */
  function bindGlobal() {
    window.addEventListener(
      "resize",
      K.debounce(() => {
        const pw = $("#player-wave");
        if (pw && pw.dataset.waveTrack) {
          K.wave.render(pw, pw.dataset.waveTrack, { bars: Math.max(60, Math.min(160, Math.round((pw.clientWidth || 400) / 4))) });
          refreshWaveList();
          updateAllWaves();
        }
        const tw = $("#track-wave");
        if (tw && tw.dataset.waveTrack) {
          const bars = Math.max(48, Math.min(170, Math.round((tw.clientWidth || 640) / 4)));
          K.wave.render(tw, tw.dataset.waveTrack, { bars, markers: true });
          refreshWaveList();
          updateAllWaves();
        }
      }, 220)
    );

    // đồng hồ hiển thị hẹn giờ + lưu vị trí
    setInterval(() => {
      if (player.sleepUntil) syncTools();
    }, 15000);

  }

  /* ================= init ================= */
  function init() {
    applyTheme();
    renderAccentList();
    bindControls();
    bindGlobal();
    syncSidebar();
    render();
    startViz();
    const av = document.querySelector('[data-avatar="kozl"]');
    if (av) av.style.backgroundImage = 'url("' + K.store.avatarOf("kozl") + '")';

    // chưa chọn bài: nạp bài mới nhất để thanh phát có nội dung
    if (!player.track) {
      const first = D.tracks.slice().sort(byNewest)[0];
      player.queue = player.baseQueue = [first.id];
      player.index = 0;
      audio.src = first.src;
      syncAll();
      renderNpLyrics();
    }

    if ("serviceWorker" in navigator && location.protocol === "https:") {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  function byNewest(a, b) {
    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
