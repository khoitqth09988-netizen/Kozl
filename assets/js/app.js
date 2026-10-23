/* =========================================================================
   Kozl Music — khởi động ứng dụng: router, tương tác, trình phát UI
   ========================================================================= */
(function () {
  "use strict";

  const K = window.K;
  const D = K.data;
  const esc = K.esc;
  const icon = K.icon;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const viewEl = $("#view");
  const audio = $("#audio");
  const player = new K.Player(audio);
  K.player = player;

  let currentRoute = { name: "home", params: {} };
  let waveEls = [];
  let pendingSeekRatio = null;

  /* ================= tiện ích UI ================= */
  function toast(message, iconName) {
    const root = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = icon(iconName || "check") + "<span>" + esc(message) + "</span>";
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 260);
    }, 2400);
  }
  K.toast = toast;

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
    switch (head) {
      case "":
        return { name: "home", params };
      case "feed":
        return { name: "feed", params };
      case "library":
        return { name: "library", params };
      case "likes":
        return { name: "likes", params };
      case "search":
        return { name: "search", params };
      case "playlist":
        return { name: "playlist", params: { id: parts[1] }, nav: "home" };
      case "track":
        return { name: "track", params: { id: parts[1] }, nav: "home" };
      case "artist":
        return { name: "artist", params: { id: parts[1] }, nav: "home" };
      default:
        return { name: "notFound", params };
    }
  }

  function render() {
    const route = resolveRoute();
    const fn = K.views[route.name] || K.views.notFound;
    const view = fn(route.params) || K.views.notFound();

    currentRoute = route;
    viewEl.innerHTML = view.html;
    document.title = view.title + " · Kozl Music";
    $("#main").scrollTop = 0;

    const navKey = route.nav || route.name;
    $$(".nav-link, .mobilenav a").forEach((a) => {
      if (a.dataset.nav === navKey) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    if (route.name === "search") {
      const q = route.params.q || "";
      if (q && $("#search-input").value !== q) $("#search-input").value = q;
    }

    hydrateWaves();
    syncAll();
    if (route.name === "track") {
      const t = K.trackById[route.params.id];
      if (t) updateCommentHint(t);
    }
    closeSidebar();
  }

  window.addEventListener("hashchange", render);

  /* ================= waveform ================= */
  function hydrateWaves() {
    $$("[data-wave]", viewEl).forEach((el) => {
      const row = el.closest("[data-track-id]");
      // waveform lớn ở trang bài hát không nằm trong .track-row
      let trackId = el.dataset.waveTrack || (row && row.dataset.trackId);
      if (!trackId && el.id === "track-wave" && currentRoute.name === "track") {
        trackId = currentRoute.params.id;
      }
      const t = trackId && K.trackById[trackId];
      if (!t) return;
      let bars = parseInt(el.dataset.bars, 10) || undefined;
      if (el.id === "track-wave") {
        bars = Math.max(48, Math.min(170, Math.round((el.clientWidth || 640) / 4)));
      }
      K.wave.render(el, t.id, { bars, markers: el.id === "track-wave" });
      el._duration = t.duration;
      if (el.id === "track-wave") el.dataset.waveTrack = t.id;
      if (!el._bound) {
        bindWave(el);
        el._bound = true;
      }
    });
    refreshWaveList();
  }

  function refreshWaveList() {
    waveEls = $$(".wave").filter((el) => el.dataset.waveTrack);
  }

  function ratioFromEvent(el, e) {
    const rect = el.getBoundingClientRect();
    if (!rect.width) return 0;
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  function waveTrackId(el) {
    const row = el.closest("[data-track-id]");
    return el.dataset.waveTrack || (row && row.dataset.trackId) || null;
  }

  function bindWave(el) {
    const tip = () => el.querySelector(".wave-tip");
    let dragging = false;

    el.addEventListener("pointermove", (e) => {
      const r = ratioFromEvent(el, e);
      const t = tip();
      if (t) {
        const dur = el._duration || (player.track && player.track.duration) || 0;
        t.textContent = K.fmtTime(r * dur);
        const x = Math.max(20, Math.min(el.clientWidth - 20, r * el.clientWidth));
        t.style.left = x + "px";
      }
      if (dragging) previewRatio(el, r);
    });

    el.addEventListener("pointerleave", () => {
      if (!dragging) previewRatio(el, null);
    });

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const trackId = waveTrackId(el);
      if (!trackId) return;
      const r = ratioFromEvent(el, e);
      dragging = true;
      el.classList.add("is-scrubbing");
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}

      const isCurrent = player.track && player.track.id === trackId;
      if (isCurrent) {
        player.seekRatio(r);
        K.wave.setProgress(el, r);
      } else {
        pendingSeekRatio = r;
        const context = contextFor(el, trackId);
        player.playTrack(trackId, context.ids, context.label);
      }
    });

    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-scrubbing");
      const trackId = waveTrackId(el);
      const r = ratioFromEvent(el, e);
      if (player.track && player.track.id === trackId) {
        player.seekRatio(r);
      }
      previewRatio(el, null);
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
      const base = el._ratio || 0;
      const next = Math.max(0, Math.min(1, base + (e.key === "ArrowRight" ? step : -step)));
      if (player.track && player.track.id === waveTrackId(el)) {
        player.seekRatio(next);
        K.wave.setProgress(el, next);
      }
    });
  }

  function previewRatio(el, ratio) {
    if (ratio === null) {
      updateWaveProgress(el, true);
      return;
    }
    K.wave.setProgress(el, ratio);
  }

  /* ================= hàng chờ / ngữ cảnh ================= */
  function idsFromTracklist(listEl) {
    if (!listEl) return [];
    return $$("[data-track-id]", listEl).map((r) => r.dataset.trackId);
  }

  function contextFor(el, trackId) {
    const list = el.closest("[data-tracklist]");
    if (list) {
      const ids = idsFromTracklist(list);
      if (ids.length) {
        let label = "Danh sách";
        const page = el.closest("[data-page-context]");
        if (page) label = page.dataset.pageContext;
        return { ids, label };
      }
    }
    const listPass = el.closest("[data-list-pass]");
    if (listPass && listPass.dataset.listPass === "likes") {
      const ids = idsFromTracklist(listPass);
      return { ids, label: "Bài đã thích" };
    }
    return { ids: [trackId], label: null };
  }

  function playFrom(el, trackId, explicitIds, label) {
    if (explicitIds && explicitIds.length) {
      player.playTrack(trackId, explicitIds, label);
      return;
    }
    const ctx = contextFor(el, trackId);
    player.playTrack(trackId, ctx.ids, ctx.label);
  }

  function playlistIds(id) {
    const p = K.playlistById[id];
    return p ? K.playlistTracks(p).map((t) => t.id) : [];
  }

  function artistIds(id) {
    return K.artistTracks(id).slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).map((t) => t.id);
  }

  function startRadio(trackId) {
    const ids = K.radioQueue(trackId);
    if (!ids.length) return;
    const seed = K.trackById[trackId];
    const wasShuffle = player.shuffle;
    if (!player.shuffle) player.toggleShuffle();
    player.playTrack(ids[0], ids, "Radio · " + (seed ? seed.title : "Kozl"));
    toast("Radio: " + (seed ? seed.title : "") + " và những bài tương tự", "sparkle");
    if (!wasShuffle) { /* giữ xáo trộn để radio luôn đổi thứ tự */ }
  }

  function likedIds() {
    return D.tracks.filter((t) => K.store.isLiked(t.id)).map((t) => t.id);
  }

  /* ================= sự kiện chung ================= */
  document.addEventListener("click", (e) => {
    const target = e.target;

    const shortcutsOpen = target.closest("[data-open-shortcuts]");
    if (shortcutsOpen) return openShortcuts();

    const closeModalBtn = target.closest("[data-close-modal]");
    if (closeModalBtn) return closeModal();

    const closeDrawer = target.closest("[data-close-drawer]");
    if (closeDrawer) return closeDrawerUI();

    const openNp = target.closest("[data-open-nowplaying]");
    if (openNp) return openNowPlaying();

    const closeNp = target.closest("[data-close-nowplaying]");
    if (closeNp) return closeNowPlaying();

    const tab = target.closest("[data-search-tab]");
    if (tab) {
      e.preventDefault();
      location.hash = tab.dataset.searchTab;
      return;
    }

    const playBtn = target.closest("[data-play]");
    if (playBtn) {
      e.preventDefault();
      const id = playBtn.dataset.play;
      // bấm lại vào bài đang phát = tạm dừng / phát tiếp
      if (player.track && player.track.id === id && !playBtn.dataset.queue) {
        player.toggle();
        return;
      }
      const ctxId = playBtn.dataset.queue;
      const ctxIds = playBtn.dataset.queueIds;
      if (ctxIds) playFrom(playBtn, id, ctxIds.split(",").filter(Boolean), playBtn.dataset.queueLabel || null);
      else if (ctxId) playFrom(playBtn, id, playlistIds(ctxId), (K.playlistById[ctxId] || {}).title);
      else playFrom(playBtn, id);
      return;
    }

    const plPlay = target.closest("[data-play-playlist]");
    if (plPlay) {
      e.preventDefault();
      const ids = playlistIds(plPlay.dataset.playPlaylist);
      if (ids.length) player.playTrack(ids[0], ids, (K.playlistById[plPlay.dataset.playPlaylist] || {}).title);
      return;
    }

    const plShuffle = target.closest("[data-shuffle-playlist]");
    if (plShuffle) {
      e.preventDefault();
      const ids = playlistIds(plShuffle.dataset.shufflePlaylist);
      if (ids.length) {
        const shuffled = K.shuffle(ids);
        if (!player.shuffle) player.toggleShuffle();
        player.playTrack(shuffled[0], ids, (K.playlistById[plShuffle.dataset.shufflePlaylist] || {}).title);
      }
      return;
    }

    const listPlay = target.closest("[data-play-list]");
    if (listPlay) {
      e.preventDefault();
      const ids = likedIds();
      if (!ids.length) return toast("Chưa có bài nào được thích", "heart");
      if (listPlay.hasAttribute("data-shuffle-play") && !player.shuffle) player.toggleShuffle();
      const first = listPlay.hasAttribute("data-shuffle-play") ? K.shuffle(ids)[0] : ids[0];
      player.playTrack(first, ids, "Bài đã thích");
      return;
    }

    const artistPlay = target.closest("[data-play-artist]");
    if (artistPlay) {
      e.preventDefault();
      const ids = artistIds(artistPlay.dataset.playArtist);
      if (ids.length) player.playTrack(ids[0], ids, (K.artistById[artistPlay.dataset.playArtist] || {}).name);
      return;
    }

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
      render();
      return;
    }

    const followBtn = target.closest("[data-follow]");
    if (followBtn) {
      e.preventDefault();
      const now = K.store.toggleFollow(followBtn.dataset.follow);
      toast(now ? "Đang theo dõi nghệ sĩ" : "Đã bỏ theo dõi", now ? "check" : "close");
      render();
      return;
    }

    const enqueueBtn = target.closest("[data-enqueue]");
    if (enqueueBtn) {
      e.preventDefault();
      const id = enqueueBtn.dataset.enqueue;
      player.enqueue(id, false);
      toast("Đã thêm vào hàng chờ: " + (K.trackById[id] || {}).title, "queue");
      return;
    }

    const radioBtn = target.closest("[data-radio]");
    if (radioBtn) {
      e.preventDefault();
      startRadio(radioBtn.dataset.radio);
      return;
    }

    const shareBtn = target.closest("[data-share]");
    if (shareBtn) {
      e.preventDefault();
      share(shareBtn.dataset.share);
      return;
    }

    const seekComment = target.closest("[data-seek-to]");
    if (seekComment) {
      const at = parseFloat(seekComment.dataset.seekTo);
      const trackEl = seekComment.closest("[data-track-id]");
      const trackId = trackEl ? trackEl.dataset.trackId : currentRoute.params.id;
      if (player.track && player.track.id === trackId) {
        player.seek(at);
        player.play();
      } else if (trackId) {
        pendingSeekRatio = null;
        player.playTrack(trackId, [trackId], null);
        audio.addEventListener("loadedmetadata", function once() {
          audio.removeEventListener("loadedmetadata", once);
          player.seek(at);
        });
      }
      return;
    }

    const removeQ = target.closest("[data-queue-remove]");
    if (removeQ) {
      e.preventDefault();
      player.removeFromQueue(parseInt(removeQ.dataset.queueRemove, 10));
      return;
    }

    const mobileNavPlay = target.closest("[data-open-queue]");
    if (mobileNavPlay) return openDrawer();
  });

  /* ================= thích / chia sẻ ================= */
  function toggleLike(trackId) {
    const liked = K.store.toggleLike(trackId);
    syncLikeButtons();
    if (liked) toast("Đã thêm vào bài đã thích", "heart-fill");
    const btn = $('[data-like="' + trackId + '"][aria-pressed]');
    if (btn) btn.setAttribute("aria-pressed", String(liked));
    if (currentRoute.name === "likes") render();
  }

  async function share(id) {
    const isTrack = !!K.trackById[id];
    const title = isTrack ? K.trackById[id].title : (K.playlistById[id] || {}).title || "Kozl Music";
    const url = location.origin + location.pathname + "#/" + (isTrack ? "track/" : "playlist/") + id;
    try {
      if (navigator.share) {
        await navigator.share({ title: title + " · Kozl Music", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Đã copy liên kết", "share");
    } catch (err) {
      toast("Liên kết: " + url, "share");
    }
  }

  /* ================= phát / điều khiển ================= */
  function bindControls() {
    $("#btn-play").addEventListener("click", () => player.toggle());
    $("#btn-prev").addEventListener("click", () => player.prev());
    $("#btn-next").addEventListener("click", () => player.next());
    $("#btn-shuffle").addEventListener("click", () => player.toggleShuffle());
    $("#btn-repeat").addEventListener("click", () => player.cycleRepeat());
    $("#np-like").addEventListener("click", () => {
      if (player.track) toggleLike(player.track.id);
    });
    $("#btn-volume").addEventListener("click", () => player.toggleMute());
    $("#btn-queue").addEventListener("click", () => openDrawer());
    $("#btn-expand").addEventListener("click", () => openNowPlaying());
    $("#btn-menu").addEventListener("click", () => toggleSidebar());

    const volume = $("#volume");
    volume.addEventListener("input", (e) => player.setVolume(e.target.value / 100));
    volume.addEventListener("change", (e) => player.setVolume(e.target.value / 100));

    $("#big-play").addEventListener("click", () => player.toggle());
    $("#big-prev").addEventListener("click", () => player.prev());
    $("#big-next").addEventListener("click", () => player.next());
    $("#big-shuffle").addEventListener("click", () => player.toggleShuffle());
    $("#big-repeat").addEventListener("click", () => player.cycleRepeat());
    $("#big-like").addEventListener("click", () => {
      if (player.track) toggleLike(player.track.id);
    });
    $("#big-queue").addEventListener("click", () => {
      closeNowPlaying();
      openDrawer();
    });
    $("#big-goto").addEventListener("click", () => {
      if (!player.track) return;
      const id = player.track.id;
      closeNowPlaying();
      location.hash = "#/track/" + id;
    });

    $("#btn-upload").addEventListener("click", openUpload);
    $("#btn-shortcuts").addEventListener("click", openShortcuts);
    $("#np-art").addEventListener("click", (e) => {
      e.preventDefault();
      openNowPlaying();
    });

    // chọn bài bằng cách bấm vào dòng (không phải nút/link/waveform)
    viewEl.addEventListener("click", (e) => {
      if (e.target.closest("a, button, input, .wave, .row-play")) return;
      const row = e.target.closest(".track-row");
      if (row && row.dataset.trackId) playFrom(row, row.dataset.trackId);
    });
  }

  /* ================= đồng bộ UI ================= */
  function syncAll() {
    syncLikeButtons();
    syncTransport();
    syncTrackInfo();
    syncQueueBadge();
    refreshWaveList();
    updateAllWaves();
    syncRows();
  }

  function syncLikeButtons() {
    const likesCount = $("#likes-count");
    if (likesCount) likesCount.textContent = String(K.store.state.likes.size);
    $$("[data-like]").forEach((btn) => {
      const id = btn.dataset.like;
      const liked = K.store.isLiked(id);
      btn.classList.toggle("is-liked", liked);
      btn.setAttribute("aria-pressed", String(liked));
      const use = btn.querySelector("use");
      if (use) use.setAttribute("href", liked ? "#i-heart-fill" : "#i-heart");
      const label = btn.querySelector(".like-label");
      if (label) label.textContent = liked ? "Đã thích" : "Thích";
      const count = btn.querySelector(".like-count");
      if (count) {
        const t = K.trackById[id];
        if (t) count.textContent = K.fmtCount(t.likes + (liked && !isInitiallyLiked(t) ? 1 : 0));
      }
    });
    const npLike = $("#np-like");
    const cur = player.track;
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

  // liked mặc định không có trong dữ liệu, nên chỉ cần trả về false
  function isInitiallyLiked() {
    return false;
  }

  function setUse(el, name) {
    const use = el && el.querySelector("use");
    if (use) use.setAttribute("href", "#i-" + name);
  }

  function syncTransport() {
    const s = player.snapshot();
    setUse($("#btn-play"), s.playing ? "pause" : "play");
    $("#btn-play").setAttribute("aria-label", s.playing ? "Tạm dừng" : "Phát");
    setUse($("#big-play"), s.playing ? "pause" : "play");

    $("#btn-shuffle").classList.toggle("is-active", s.shuffle);
    $("#btn-shuffle").setAttribute("aria-pressed", String(s.shuffle));
    $("#big-shuffle").classList.toggle("is-active", s.shuffle);
    $("#big-shuffle").setAttribute("aria-pressed", String(s.shuffle));

    const repeatName = s.repeat === "one" ? "repeat-one" : "repeat";
    setUse($("#btn-repeat"), repeatName);
    setUse($("#big-repeat"), repeatName);
    $("#btn-repeat").classList.toggle("is-active", s.repeat !== "off");
    $("#big-repeat").classList.toggle("is-active", s.repeat !== "off");
    $("#btn-repeat").title = "Lặp lại: " + ({ off: "tắt", all: "toàn bộ", one: "một bài" }[s.repeat]);
    $("#btn-repeat").setAttribute("aria-pressed", String(s.repeat !== "off"));
    $("#big-repeat").setAttribute("aria-pressed", String(s.repeat !== "off"));

    setUse($("#btn-volume"), s.muted || s.volume === 0 ? "volume-mute" : "volume");
    $("#volume").value = String(Math.round(s.volume * 100));
    $("#volume").style.setProperty("--fill", Math.round(s.volume * 100) + "%");
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
      art.classList.remove("is-playing");
      $("#time-total").textContent = "0:00";
      $("#time-current").textContent = "0:00";
      return;
    }
    const a = K.artistById[t.artistId];
    $("#np-title").textContent = t.title;
    $("#np-title").href = "#/track/" + t.id;
    $("#np-artist").textContent = a ? a.name : "Kozl";
    $("#np-artist").href = "#/artist/" + t.artistId;
    art.style.backgroundImage = 'url("' + t.cover + '")';
    art.classList.toggle("is-playing", player.playing);
    $("#time-total").textContent = K.fmtTime(t.duration);

    // màn hình đang phát
    $("#np-cover").src = t.cover;
    $("#np-cover").alt = "Bìa " + t.title;
    $("#np-bg").style.backgroundImage = 'url("' + (t.blur || t.cover) + '")';
    $("#np-big-title").textContent = t.title;
    $("#np-big-artist").textContent = a ? a.name : "Kozl";
    $("#np-big-artist").href = "#/artist/" + t.artistId;
    $("#np-big-sub").textContent = [t.genre, K.fmtTime(t.duration), K.relTime(t.uploadedAt)].join(" · ");
    $("#big-total").textContent = K.fmtTime(t.duration);

    const playerWave = $("#player-wave");
    if (playerWave && playerWave.dataset.waveTrack !== t.id) {
      K.wave.render(playerWave, t.id, { bars: Math.max(60, Math.min(160, Math.round((playerWave.clientWidth || 400) / 4))) });
      playerWave._duration = t.duration;
      if (!playerWave._bound) {
        bindWave(playerWave);
        playerWave._bound = true;
      }
      refreshWaveList();
    }
    const bigWave = $("#big-wave");
    if (bigWave) {
      if (bigWave.dataset.waveTrack !== t.id) {
        K.wave.render(bigWave, t.id, { bars: 150, markers: true });
        bigWave._duration = t.duration;
        if (!bigWave._bound) {
          bindWave(bigWave);
          bigWave._bound = true;
        }
        refreshWaveList();
      }
    }
    if ("mediaSession" in navigator && navigator.mediaSession.setActionHandler) {
      /* media session đã được core xử lý */
    }
  }

  function syncQueueBadge() {
    const badge = $("#queue-count");
    if (badge) badge.textContent = player.queue.length > player.index + 1
      ? "(" + (player.queue.length - player.index - 1) + ")"
      : "";
  }

  function syncRows() {
    const cur = player.track;
    $$("[data-track-id]").forEach((row) => {
      const isCurrent = cur && row.dataset.trackId === cur.id;
      row.classList.toggle("is-current", !!isCurrent);
      row.classList.toggle("is-playing", !!isCurrent && player.playing);
      const playBtn = row.querySelector(".row-play");
      if (playBtn) {
        playBtn.setAttribute("aria-label", (isCurrent && player.playing ? "Tạm dừng " : "Phát ") + (row.querySelector(".row-title") || {}).textContent);
      }
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

  function updateAllWaves() {
    waveEls.forEach((el) => updateWaveProgress(el));
  }

  function updateWaveProgress(el, force) {
    const cur = player.track;
    const id = el.dataset.waveTrack;
    if (!id) return;
    if (!cur || cur.id !== id) {
      if (el._ratio !== 0) K.wave.setProgress(el, 0);
      return;
    }
    const dur = audio.duration && isFinite(audio.duration) ? audio.duration : cur.duration;
    const ratio = dur ? Math.min(1, (audio.currentTime || 0) / dur) : 0;
    el._duration = dur;
    K.wave.setProgress(el, ratio);
    if (el.id === "player-wave" || el.id === "big-wave") {
      $("#time-current").textContent = K.fmtTime(audio.currentTime || 0);
      $("#big-current").textContent = K.fmtTime(audio.currentTime || 0);
    }
    if (el.id === "track-wave") {
      const pos = $("#track-pos");
      if (pos) pos.textContent = K.fmtTime(audio.currentTime || 0);
    }
    if (el.id === "big-wave") {
      const hint = $("#comment-at-hint");
      if (hint && currentRoute.name === "track") hint.textContent = "tại " + K.fmtTime(audio.currentTime || 0);
    }
  }

  /* ================= sự kiện của trình phát ================= */
  player.on("track", ({ track, restored }) => {
    K.store.pushRecent(track.id);
    syncAll();
    if (restored && K.store.state.lastPos > 0) {
      /* vị trí được khôi phục bởi core */
    }
    if (!restored) {
      const meta = document.querySelector('meta[property="og:title"]');
      if (meta) meta.setAttribute("content", track.title + " · Kozl Music");
    }
  });

  player.on("state", () => {
    syncTransport();
    syncRows();
    syncLikeButtons();
  });

  player.on("time", (info) => {
    if (pendingSeekRatio !== null && info.duration > 0) {
      const r = pendingSeekRatio;
      pendingSeekRatio = null;
      player.seekRatio(r);
    }
    waveEls.forEach((el) => updateWaveProgress(el));
    $("#time-current").textContent = K.fmtTime(info.current);
    $("#big-current").textContent = K.fmtTime(info.current);
    $("#time-total").textContent = K.fmtTime(info.duration || 0);
    $("#big-total").textContent = K.fmtTime(info.duration || 0);
    if (currentRoute.name === "track") {
      const hint = $("#comment-at-hint");
      if (hint) hint.textContent = "tại " + K.fmtTime(info.current);
    }
  });

  player.on("queue", () => {
    syncQueueBadge();
    if ($("#queue-drawer").classList.contains("is-open")) renderQueue();
  });

  player.on("buffering", (busy) => {
    $("#btn-play").classList.toggle("is-loading", busy);
    $("#big-play").classList.toggle("is-loading", busy);
  });

  player.on("error", (t) => {
    toast("Không phát được “" + (t ? t.title : "bài hát") + "”", "close");
  });

  /* ================= hàng chờ ================= */
  function queueRow(t, index, opts) {
    const a = K.artistById[t.artistId];
    return (
      '<div class="track-row" data-track-id="' + esc(t.id) + '">' +
        '<div class="row-art"><img src="' + esc(t.cover) + '" alt="">' +
          '<button class="row-play" data-play="' + esc(t.id) + '" aria-label="Phát ' + esc(t.title) + '">' + icon("play") + "</button>" +
        "</div>" +
        '<div class="row-main">' +
          '<span class="row-title">' + esc(t.title) + "</span>" +
          '<div class="row-artist">' + esc(a ? a.name : "") + "</div>" +
        "</div>" +
        '<div class="row-side">' +
          (opts && opts.removable
            ? '<button class="icon-btn q-remove" data-queue-remove="' + index + '" aria-label="Bỏ khỏi hàng chờ">' + icon("close") + "</button>"
            : '<span class="row-dur">' + K.fmtTime(t.duration) + "</span>") +
        "</div>" +
      "</div>"
    );
  }

  function renderQueue() {
    const info = player.queueInfo();
    $("#queue-context").textContent = info.context ? "Từ: " + info.context : "Chưa có gì đang phát";
    $("#queue-now").innerHTML = info.current
      ? queueRow(info.current, player.index, {})
      : '<div class="queue-empty">Chưa có bài nào đang phát.</div>';
    $("#queue-count").textContent = info.upcoming.length ? "(" + info.upcoming.length + ")" : "";
    $("#queue-list").innerHTML = info.upcoming.length
      ? info.upcoming.map((t, i) => queueRow(t, player.index + 1 + i, { removable: true })).join("")
      : '<li class="queue-empty">Hàng chờ trống. Bấm “+” ở một bài hát để thêm vào.</li>';
    const clear = $("#queue-clear");
    if (clear) clear.hidden = !info.upcoming.length;
  }

  function openDrawer() {
    renderQueue();
    const drawer = $("#queue-drawer");
    const back = $("#drawer-backdrop");
    back.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      back.classList.add("is-open");
    });
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
  }

  function closeDrawerUI() {
    const drawer = $("#queue-drawer");
    const back = $("#drawer-backdrop");
    drawer.classList.remove("is-open");
    back.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    setTimeout(() => {
      back.hidden = true;
    }, 320);
  }

  $("#drawer-backdrop").addEventListener("click", closeDrawerUI);

  // bấm vào một dòng trong hàng chờ = nhảy tới bài đó
  $("#queue-drawer").addEventListener("click", (e) => {
    if (e.target.closest("a, button.q-remove, input")) return;
    const row = e.target.closest(".track-row");
    if (!row || !row.dataset.trackId) return;
    const idx = player.queue.indexOf(row.dataset.trackId);
    if (idx === -1) return;
    if (idx === player.index) {
      player.toggle();
    } else {
      player.index = idx;
      player._load(true);
    }
  });

  // bấm ra ngoài (vùng trống) để đóng trình phát lớn
  $("#nowplaying").addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, .wave, .np-cover-wrap, .np-vinyl")) return;
    closeNowPlaying();
  });
  const queueClearBtn = $("#queue-clear");
  if (queueClearBtn) {
    queueClearBtn.addEventListener("click", () => {
      player.clearUpcoming();
      toast("Đã xoá phần còn lại của hàng chờ", "trash");
    });
  }

  /* ================= màn hình đang phát ================= */
  function openNowPlaying() {
    const el = $("#nowplaying");
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("np-open");
    if (player.track) syncTrackInfo();
    setTimeout(() => {
      const bigWave = $("#big-wave");
      if (bigWave && !bigWave.dataset.waveTrack && player.track) {
        K.wave.render(bigWave, player.track.id, { bars: 150, markers: true });
        refreshWaveList();
      }
    }, 60);
  }

  function closeNowPlaying() {
    const el = $("#nowplaying");
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("np-open");
  }

  /* ================= sidebar di động ================= */
  function toggleSidebar() {
    $("#sidebar").classList.toggle("is-open");
  }
  function closeSidebar() {
    $("#sidebar").classList.remove("is-open");
  }

  /* ================= modal phím tắt ================= */
  function openShortcuts() {
    const back = $("#modal-backdrop");
    back.hidden = false;
    requestAnimationFrame(() => back.classList.add("is-open"));
    document.body.classList.add("modal-open");
    const closeBtn = back.querySelector("[data-close-modal]");
    if (closeBtn) closeBtn.focus();
  }
  function closeModal() {
    const back = $("#modal-backdrop");
    back.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    setTimeout(() => {
      back.hidden = true;
    }, 220);
  }
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });

  /* ================= tải lên (cục bộ) ================= */
  function openUpload() {
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.id = "upload-backdrop";
    back.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Tải lên bản thu của bạn">' +
        '<header class="modal-head"><h2>Tải lên bản thu</h2>' +
          '<button class="icon-btn" data-close-upload aria-label="Đóng">' + icon("close") + "</button></header>" +
        '<div class="upload-body">' +
          '<label class="dropzone" for="upload-file">' +
            icon("upload") +
            "<strong>Chọn một tệp âm thanh</strong>" +
            "<span>mp3, wav, m4a, ogg — tệp chỉ nằm trong trình duyệt của bạn, không tải lên máy chủ nào.</span>" +
            '<input id="upload-file" type="file" accept="audio/*" hidden>' +
          "</label>" +
          '<p class="upload-note">Bản thu sẽ được thêm vào hàng chờ với tên tệp của bạn, kèm waveform tự động.</p>' +
        "</div>" +
      "</div>";
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add("is-open"));
    document.body.classList.add("modal-open");

    const close = () => {
      back.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      setTimeout(() => back.remove(), 240);
    };
    back.addEventListener("click", (e) => {
      if (e.target === back || e.target.closest("[data-close-upload]")) close();
    });
    $("#upload-file").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const local = URL.createObjectURL(file);
      const id = "local-" + Date.now().toString(36);
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Bản thu chưa đặt tên";
      K.trackById[id] = {
        id,
        title,
        artistId: "kozl",
        src: local,
        cover: "assets/covers/afterglow.jpg",
        peaksKey: null,
        duration: 0,
        genre: "Bản nháp",
        plays: 0,
        likes: 0,
        reposts: 0,
        uploadedAt: new Date().toISOString().slice(0, 10),
        description: "Tệp bạn vừa mở trong trình duyệt. Không được tải lên máy chủ.",
        tags: ["bản nháp", "cục bộ"],
        comments: [],
      };
      const probe = new Audio(local);
      probe.addEventListener("loadedmetadata", () => {
        K.trackById[id].duration = Math.round(probe.duration) || 0;
      });
      player.playTrack(id, [id], "Bản nháp của bạn");
      toast("Đang phát: " + title, "upload");
      close();
    });
  }

  /* ================= tìm kiếm gợi ý ================= */
  const searchInput = $("#search-input");
  const searchPanel = $("#search-panel");
  let searchIndex = -1;

  function searchResults(q) {
    const needle = q.toLowerCase();
    const tracks = D.tracks.filter((t) => {
      const a = K.artistById[t.artistId] || { name: "" };
      return (t.title + " " + a.name + " " + t.genre).toLowerCase().indexOf(needle) > -1;
    }).slice(0, 5);
    const playlists = D.playlists.filter((p) => (p.title + " " + p.genre).toLowerCase().indexOf(needle) > -1).slice(0, 3);
    const artists = D.artists.filter((a) => a.name.toLowerCase().indexOf(needle) > -1).slice(0, 3);
    return { tracks, playlists, artists };
  }

  function renderSearchPanel(q) {
    if (!q) {
      searchPanel.hidden = true;
      searchPanel.innerHTML = "";
      searchInput.setAttribute("aria-expanded", "false");
      return;
    }
    const r = searchResults(q);
    let html = "";
    if (r.tracks.length) {
      html += '<div class="sp-group">Bài hát</div>' + r.tracks.map((t) =>
        '<button class="sp-item" role="option" data-goto="#/track/' + esc(t.id) + '">' +
          '<img class="sp-thumb" src="' + esc(t.cover) + '" alt="">' +
          '<span class="sp-text"><span class="sp-title">' + esc(t.title) + "</span>" +
          '<span class="sp-sub">' + esc((K.artistById[t.artistId] || {}).name) + " · " + K.fmtTime(t.duration) + "</span></span>" +
        "</button>"
      ).join("");
    }
    if (r.artists.length) {
      html += '<div class="sp-group">Nghệ sĩ</div>' + r.artists.map((a) =>
        '<button class="sp-item" role="option" data-goto="#/artist/' + esc(a.id) + '">' +
          '<img class="sp-thumb round" src="' + esc(a.avatar) + '" alt="">' +
          '<span class="sp-text"><span class="sp-title">' + esc(a.name) + "</span>" +
          '<span class="sp-sub">' + K.fmtCount(a.followers) + " người theo dõi</span></span>" +
        "</button>"
      ).join("");
    }
    if (r.playlists.length) {
      html += '<div class="sp-group">Danh sách phát</div>' + r.playlists.map((p) =>
        '<button class="sp-item" role="option" data-goto="#/playlist/' + esc(p.id) + '">' +
          '<img class="sp-thumb" src="' + esc(p.cover) + '" alt="">' +
          '<span class="sp-text"><span class="sp-title">' + esc(p.title) + "</span>" +
          '<span class="sp-sub">' + esc(p.genre) + " · " + K.playlistTracks(p).length + " bài</span></span>" +
        "</button>"
      ).join("");
    }
    if (!html) html = '<div class="sp-empty">Không tìm thấy “' + esc(q) + '”.</div>';
    html += '<button class="sp-all" data-goto="#/search?q=' + encodeURIComponent(q) + '">' +
      icon("search") + " Xem tất cả kết quả cho “" + esc(q) + "”</button>";
    searchPanel.innerHTML = html;
    searchPanel.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    searchIndex = -1;
  }

  searchInput.addEventListener("input", K.debounce((e) => renderSearchPanel(e.target.value.trim()), 90));
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) renderSearchPanel(searchInput.value.trim());
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
      searchIndex = e.key === "ArrowDown"
        ? (searchIndex + 1) % items.length
        : (searchIndex - 1 + items.length) % items.length;
      items.forEach((it, i) => it.setAttribute("aria-selected", String(i === searchIndex)));
      items[searchIndex].scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      if (searchIndex > -1 && items[searchIndex]) {
        items[searchIndex].click();
        return;
      }
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
    const t = K.trackById[trackId];
    const all = (t.comments || []).concat(K.store.commentsFor(trackId));
    const list = $("#comment-list");
    if (list) list.innerHTML = commentListHTML(t, all);
    const markers = $("#track-wave");
    if (markers && markers.dataset.waveTrack === trackId) {
      const bars = Math.max(48, Math.min(170, Math.round((markers.clientWidth || 640) / 4)));
      K.wave.render(markers, trackId, { bars, markers: true });
      markers._duration = t.duration;
      refreshWaveList();
      updateAllWaves();
    }
    toast("Đã gửi bình luận", "comment");
  });

  function commentListHTML(t, comments) {
    if (!comments.length) return "";
    return '<div class="comment-list">' + comments.map((c) =>
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
    ).join("") + "</div>";
  }

  function updateCommentHint(t) {
    const hint = $("#comment-at-hint");
    if (!hint) return;
    const at = player.track && player.track.id === t.id ? audio.currentTime || 0 : 0;
    hint.textContent = "tại " + K.fmtTime(at);
  }

  /* ================= phím tắt ================= */
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;

    if (e.key === "Escape") {
      if ($("#modal-backdrop").classList.contains("is-open")) closeModal();
      else if ($("#nowplaying").classList.contains("is-open")) closeNowPlaying();
      else if ($("#queue-drawer").classList.contains("is-open")) closeDrawerUI();
      else if ($("#sidebar").classList.contains("is-open")) closeSidebar();
      return;
    }
    if (typing) return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        player.toggle();
        break;
      case "k":
      case "K":
        e.preventDefault();
        player.toggle();
        break;
      case "ArrowRight":
        if (e.shiftKey) return;
        e.preventDefault();
        player.seek((audio.currentTime || 0) + 5);
        break;
      case "ArrowLeft":
        if (e.shiftKey) return;
        e.preventDefault();
        player.seek((audio.currentTime || 0) - 5);
        break;
      case "l":
      case "L":
        player.seek((audio.currentTime || 0) + 10);
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
        toast("Lặp lại: " + ({ off: "tắt", all: "toàn bộ", one: "một bài" }[player.repeat]), "repeat");
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

  /* ================= khởi động ================= */
  function renderSidebar() {
    const lists = $("#side-playlists");
    lists.innerHTML = D.playlists.map((p) =>
      '<a class="side-item" href="#/playlist/' + esc(p.id) + '" data-side="' + esc(p.id) + '">' +
        '<img src="' + esc(p.cover) + '" alt="">' +
        '<span class="si-text"><span class="si-name">' + esc(p.title) + "</span>" +
        '<span class="si-meta">' + K.playlistTracks(p).length + " bài</span></span></a>"
    ).join("");

    const artists = $("#side-artists");
    artists.innerHTML = D.artists.map((a) =>
      '<a class="side-item" href="#/artist/' + esc(a.id) + '">' +
        '<img class="round" src="' + esc(a.avatar) + '" alt="">' +
        '<span class="si-text"><span class="si-name">' + esc(a.name) + "</span>" +
        '<span class="si-meta">' + K.artistTracks(a.id).length + " bài</span></span></a>"
    ).join("");
  }

  function markSidebar() {
    $$("[data-side]").forEach((el) => {
      if (currentRoute.name === "playlist" && el.dataset.side === currentRoute.params.id) {
        el.setAttribute("aria-current", "page");
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }

  function updateClockBasedGreeting() {
    /* chỗ dành cho phần chào theo giờ nếu cần */
  }

  function bindGlobal() {
    window.addEventListener("resize", K.debounce(() => {
      const playerWave = $("#player-wave");
      if (playerWave && playerWave.dataset.waveTrack) {
        K.wave.render(playerWave, playerWave.dataset.waveTrack, {
          bars: Math.max(60, Math.min(160, Math.round((playerWave.clientWidth || 400) / 4))),
        });
        playerWave._duration = player.duration();
        refreshWaveList();
        updateAllWaves();
      }
    }, 220));

    window.addEventListener("resize", K.debounce(() => {
      const tw = $("#track-wave");
      if (tw && tw.dataset.waveTrack) {
        const bars = Math.max(48, Math.min(170, Math.round((tw.clientWidth || 640) / 4)));
        K.wave.render(tw, tw.dataset.waveTrack, { bars, markers: true });
        tw._duration = player.duration();
        refreshWaveList();
        updateAllWaves();
      }
    }, 220));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        const t = player.track;
        if (t) {
          K.store.state.lastTrack = t.id;
          K.store.state.lastPos = audio.currentTime || 0;
          K.store.save();
        }
      }
    });

    setInterval(() => {
      if (player.playing && player.track) {
        K.store.state.lastTrack = player.track.id;
        K.store.state.lastPos = audio.currentTime || 0;
        K.store.save();
      }
    }, 5000);
  }

  function init() {
    renderSidebar();
    bindControls();
    bindGlobal();
    render();
    markSidebar();
    window.addEventListener("hashchange", markSidebar);

    if (player.track) {
      syncTrackInfo();
      updateAllWaves();
    }

    // avatar trong topbar
    const av = document.querySelector('[data-avatar="kozl"]');
    if (av) av.style.backgroundImage = 'url("' + K.artistById.kozl.avatar + '")';

    // Chọn sẵn bài mới nhất (không tự phát) để thanh phát luôn có nội dung
    if (!player.track) {
      const first = D.tracks.slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      player.queue = player.baseQueue = [first.id];
      player.index = 0;
      audio.src = first.src;
      syncAll();
      syncTrackInfo();
    }
    syncAll();

    // cập nhật thông tin bài khi đổi route
    window.addEventListener("hashchange", () => setTimeout(syncAll, 0));

    // PWA: đăng ký service worker (chỉ chạy trên https hoặc localhost)
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
