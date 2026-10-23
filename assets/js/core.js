/* =========================================================================
   Kozl Music — lõi: tiện ích, lưu trữ cục bộ, trình phát, waveform
   ========================================================================= */
(function () {
  "use strict";

  const D = window.KOZL_DATA;
  const K = (window.K = {});

  /* ---------------- dữ liệu ---------------- */
  K.data = D;
  K.artistById = Object.fromEntries(D.artists.map((a) => [a.id, a]));
  K.trackById = Object.fromEntries(D.tracks.map((t) => [t.id, t]));
  K.playlistById = Object.fromEntries(D.playlists.map((p) => [p.id, p]));

  K.artistTracks = function (artistId) {
    return D.tracks.filter((t) => t.artistId === artistId);
  };
  K.playlistTracks = function (list) {
    const ids = Array.isArray(list) ? list : list.trackIds;
    return ids.map((id) => K.trackById[id]).filter(Boolean);
  };
  K.totalDuration = function (tracks) {
    return tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  };

  /* ---------------- tiện ích ---------------- */
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  K.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  };

  K.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  };

  K.fmtTime = function (sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return h + ":" + String(m % 60).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }
    return m + ":" + String(s).padStart(2, "0");
  };

  K.fmtLong = function (sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h) return h + " giờ " + m + " phút";
    return m + " phút";
  };

  K.fmtCount = function (n) {
    if (n == null) return "0";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(".", ",") + "K";
    return String(n);
  };

  K.relTime = function (iso) {
    const then = new Date(iso + "T12:00:00").getTime();
    const diff = Date.now() - then;
    const day = 86400000;
    if (diff < 0) return "vừa xong";
    if (diff < 3600000) return Math.max(1, Math.round(diff / 60000)) + " phút trước";
    if (diff < day) return Math.round(diff / 3600000) + " giờ trước";
    if (diff < day * 7) return Math.round(diff / day) + " ngày trước";
    if (diff < day * 30) return Math.round(diff / (day * 7)) + " tuần trước";
    if (diff < day * 365) return Math.round(diff / (day * 30)) + " tháng trước";
    return Math.round(diff / (day * 365)) + " năm trước";
  };

  K.fmtDate = function (iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });
  };

  K.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), ms);
    };
  };

  K.thumbfall = function (name) {
    return String(name || "?").trim().charAt(0).toUpperCase();
  };

  /* màu avatar ổn định theo tên người dùng */
  K.userColor = function (name) {
    let h = 0;
    const s = String(name || "koz");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    const h2 = (h + 38) % 360;
    return "linear-gradient(140deg, hsl(" + h + " 62% 46%), hsl(" + h2 + " 70% 34%))";
  };

  K.avatarStyle = function (name) {
    return "background:" + K.userColor(name);
  };

  /* ---------------- lưu trữ ---------------- */
  const LS_KEY = "kozl.v1";
  const defaults = {
    likes: [],
    savedPlaylists: [],
    followed: [],
    recents: [],
    comments: {},
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: "off",
    lastTrack: null,
    lastPos: 0,
  };

  const stored = (function () {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  })();

  const state = Object.assign({}, defaults, stored);
  state.likes = new Set(state.likes || []);
  state.savedPlaylists = new Set(state.savedPlaylists || []);
  state.followed = new Set(state.followed || []);
  state.recents = Array.isArray(state.recents) ? state.recents.slice(0, 24) : [];
  state.comments = state.comments && typeof state.comments === "object" ? state.comments : {};

  const save = K.debounce(function () {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          likes: Array.from(state.likes),
          savedPlaylists: Array.from(state.savedPlaylists),
          followed: Array.from(state.followed),
          recents: state.recents,
          comments: state.comments,
          volume: state.volume,
          muted: state.muted,
          shuffle: state.shuffle,
          repeat: state.repeat,
          lastTrack: state.lastTrack,
          lastPos: state.lastPos,
        })
      );
    } catch (e) {
      /* localStorage đầy hoặc bị chặn — bỏ qua */
    }
  }, 250);

  K.store = {
    state: state,
    save: save,
    toggleLike(trackId) {
      if (state.likes.has(trackId)) state.likes.delete(trackId);
      else state.likes.add(trackId);
      save();
      return state.likes.has(trackId);
    },
    isLiked(trackId) {
      return state.likes.has(trackId);
    },
    toggleSave(playlistId) {
      if (state.savedPlaylists.has(playlistId)) state.savedPlaylists.delete(playlistId);
      else state.savedPlaylists.add(playlistId);
      save();
      return state.savedPlaylists.has(playlistId);
    },
    isSaved(playlistId) {
      return state.savedPlaylists.has(playlistId);
    },
    toggleFollow(artistId) {
      if (state.followed.has(artistId)) state.followed.delete(artistId);
      else state.followed.add(artistId);
      save();
      return state.followed.has(artistId);
    },
    isFollowing(artistId) {
      return state.followed.has(artistId);
    },
    pushRecent(trackId) {
      const list = state.recents.filter((id) => id !== trackId);
      list.unshift(trackId);
      state.recents = list.slice(0, 24);
      save();
    },
    commentsFor(trackId) {
      return state.comments[trackId] || [];
    },
    addComment(trackId, text, at) {
      const entry = {
        id: "u" + Date.now().toString(36),
        user: "ban",
        mine: true,
        at: Math.max(0, Math.round(at)),
        text: String(text).slice(0, 400),
        timeAgo: "vừa xong",
      };
      state.comments[trackId] = [entry].concat(state.comments[trackId] || []);
      save();
      return entry;
    },
  };

  /* ---------------- emitter nhỏ ---------------- */
  function Emitter() {
    this._h = {};
  }
  Emitter.prototype.on = function (evt, fn) {
    (this._h[evt] || (this._h[evt] = [])).push(fn);
    return () => this.off(evt, fn);
  };
  Emitter.prototype.off = function (evt, fn) {
    const arr = this._h[evt];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i > -1) arr.splice(i, 1);
  };
  Emitter.prototype.emit = function (evt, payload) {
    (this._h[evt] || []).forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(err);
      }
    });
  };
  K.Emitter = Emitter;

  /* ---------------- trình phát ---------------- */
  function Player(audio) {
    Emitter.call(this);
    this.audio = audio;
    this.queue = [];
    this.baseQueue = [];
    this.index = -1;
    this.context = null;
    this.playing = false;
    this.loaded = false;
    this.shuffle = !!state.shuffle;
    this.repeat = state.repeat || "off";
    this.volume = typeof state.volume === "number" ? state.volume : 0.8;
    this.muted = !!state.muted;
    this._seeking = false;
    this._saveTimer = null;

    audio.volume = this.volume;
    audio.muted = this.muted;

    audio.addEventListener("play", () => {
      this.playing = true;
      this.emit("state", this.snapshot());
      this._startLoop();
      this._updateMediaState();
    });
    audio.addEventListener("pause", () => {
      this.playing = false;
      this.emit("state", this.snapshot());
      this._stopLoop();
      this._updateMediaState();
    });
    audio.addEventListener("loadedmetadata", () => {
      this.loaded = true;
      this.emit("time", this.timeInfo());
      this.emit("state", this.snapshot());
    });
    audio.addEventListener("timeupdate", () => this.emit("time", this.timeInfo()));
    audio.addEventListener("ended", () => this._onEnded());
    audio.addEventListener("error", () => {
      if (!audio.currentSrc) return;
      this.emit("error", this.track);
    });
    audio.addEventListener("waiting", () => this.emit("buffering", true));
    audio.addEventListener("playing", () => this.emit("buffering", false));
    audio.addEventListener("canplay", () => this.emit("buffering", false));

    // khôi phục phiên nghe trước đó
    if (state.lastTrack && K.trackById[state.lastTrack]) {
      const t = K.trackById[state.lastTrack];
      this.queue = this.baseQueue = [t.id];
      this.index = 0;
      audio.src = t.src;
      audio.preload = "metadata";
      const pos = Number(state.lastPos) || 0;
      audio.addEventListener("loadedmetadata", () => {
        if (pos > 0 && pos < audio.duration - 2) audio.currentTime = pos;
      }, { once: true });
      this.emit("track", { track: t, index: 0, restored: true });
    }

    window.addEventListener("beforeunload", () => {
      const t = this.track;
      if (t) {
        state.lastTrack = t.id;
        state.lastPos = audio.currentTime || 0;
        save();
      }
    });
  }
  Player.prototype = Object.create(Emitter.prototype);
  Player.prototype.constructor = Player;

  Object.defineProperty(Player.prototype, "track", {
    get: function () {
      return this.queue[this.index] ? K.trackById[this.queue[this.index]] : null;
    },
  });

  Player.prototype.duration = function () {
    const d = this.audio.duration;
    const t = this.track;
    if (isFinite(d) && d > 0) return d;
    return t ? t.duration : 0;
  };

  Player.prototype.timeInfo = function () {
    const dur = this.duration();
    const cur = this.audio.currentTime || 0;
    return { current: cur, duration: dur, ratio: dur ? Math.min(1, cur / dur) : 0 };
  };

  Player.prototype.snapshot = function () {
    return {
      playing: this.playing,
      buffering: this._buffering || false,
      shuffle: this.shuffle,
      repeat: this.repeat,
      muted: this.muted,
      volume: this.volume,
      index: this.index,
      length: this.queue.length,
      context: this.context,
    };
  };

  Player.prototype.playTrack = function (trackId, contextIds, contextLabel) {
    if (!K.trackById[trackId]) return;
    const ids = contextIds && contextIds.length ? contextIds.slice() : [trackId];
    if (ids.indexOf(trackId) === -1) ids.unshift(trackId);
    this.baseQueue = ids;
    this.context = contextLabel || null;
    if (this.shuffle) {
      this.queue = [trackId].concat(shuffle(ids.filter((id) => id !== trackId)));
      this.index = 0;
    } else {
      this.queue = ids.slice();
      this.index = ids.indexOf(trackId);
    }
    this._load(true);
  };

  Player.prototype.toggle = function () {
    if (!this.track) return this.playFirst();
    if (this.audio.paused) {
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      this.audio.pause();
    }
  };

  Player.prototype.play = function () {
    if (!this.track) return this.playFirst();
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => {});
  };

  Player.prototype.playFirst = function () {
    const list = K.playlistById["kozl-essentials"] || K.data.playlists[0];
    const ids = list ? list.trackIds.slice() : [K.data.tracks[0].id];
    this.playTrack(ids[0], ids, list ? list.title : null);
  };

  Player.prototype.pause = function () {
    this.audio.pause();
  };

  Player.prototype._load = function (autoplay) {
    const t = this.track;
    if (!t) return;
    this.audio.src = t.src;
    this.audio.preload = "auto";
    this.audio.load();
    this.loaded = false;
    this.emit("track", { track: t, index: this.index, context: this.context });
    this.emit("queue", this.queueInfo());
    this._setMediaMeta(t);
    this._updateMediaState();
    if (autoplay) {
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    }
    state.lastTrack = t.id;
    state.lastPos = 0;
    save();
  };

  Player.prototype.next = function (auto) {
    if (!this.queue.length) return;
    if (auto && this.repeat === "one") {
      this.audio.currentTime = 0;
      this.play();
      return;
    }
    if (this.index + 1 < this.queue.length) {
      this.index++;
      this._load(true);
    } else if (this.repeat === "all") {
      this.index = 0;
      this._load(true);
    } else {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.emit("state", this.snapshot());
    }
  };

  Player.prototype.prev = function () {
    if (!this.queue.length) return;
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }
    if (this.index > 0) this.index--;
    else this.index = this.queue.length - 1;
    this._load(true);
  };

  Player.prototype._onEnded = function () {
    if (this.repeat === "one") {
      this.audio.currentTime = 0;
      this.play();
      return;
    }
    this.next(true);
  };

  Player.prototype.seek = function (seconds) {
    const dur = this.duration();
    if (!isFinite(seconds)) return;
    const t = Math.max(0, Math.min(seconds, dur || 0));
    try {
      this.audio.currentTime = t;
    } catch (e) {
      /* chưa tải metadata */
    }
    this.emit("time", this.timeInfo());
  };

  Player.prototype.seekRatio = function (ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    const dur = this.duration();
    if (dur) this.seek(dur * ratio);
  };

  Player.prototype.setVolume = function (v) {
    v = Math.max(0, Math.min(1, v));
    this.volume = v;
    this.audio.volume = v;
    this.muted = v === 0 ? this.muted : false;
    this.audio.muted = this.muted;
    state.volume = v;
    save();
    this.emit("state", this.snapshot());
  };

  Player.prototype.toggleMute = function () {
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    state.muted = this.muted;
    save();
    this.emit("state", this.snapshot());
  };

  Player.prototype.toggleShuffle = function () {
    this.shuffle = !this.shuffle;
    state.shuffle = this.shuffle;
    if (this.track) {
      const currentId = this.track.id;
      if (this.shuffle) {
        this.queue = [currentId].concat(shuffle(this.baseQueue.filter((id) => id !== currentId)));
        this.index = 0;
      } else {
        this.queue = this.baseQueue.slice();
        this.index = Math.max(0, this.queue.indexOf(currentId));
      }
      this.emit("queue", this.queueInfo());
    }
    save();
    this.emit("state", this.snapshot());
  };

  Player.prototype.cycleRepeat = function () {
    const order = ["off", "all", "one"];
    this.repeat = order[(order.indexOf(this.repeat) + 1) % order.length];
    state.repeat = this.repeat;
    save();
    this.emit("state", this.snapshot());
  };

  Player.prototype.enqueue = function (trackId, next) {
    if (!K.trackById[trackId]) return;
    if (!this.queue.length) {
      this.playTrack(trackId, [trackId], null);
      return;
    }
    this.baseQueue = this.baseQueue.slice();
    this.baseQueue.push(trackId);
    if (next) {
      this.queue.splice(this.index + 1, 0, trackId);
    } else {
      this.queue.push(trackId);
    }
    this.emit("queue", this.queueInfo());
  };

  Player.prototype.removeFromQueue = function (queueIndex) {
    if (queueIndex <= this.index) return;
    const [removed] = this.queue.splice(queueIndex, 1);
    this.baseQueue = this.baseQueue.filter((id) => id !== removed);
    this.emit("queue", this.queueInfo());
  };

  Player.prototype.clearUpcoming = function () {
    this.queue = this.queue.slice(0, this.index + 1);
    this.baseQueue = this.baseQueue.filter((id) => this.queue.indexOf(id) > -1);
    this.emit("queue", this.queueInfo());
  };

  Player.prototype.queueInfo = function () {
    return {
      current: this.track,
      upcoming: this.queue.slice(this.index + 1).map((id) => K.trackById[id]).filter(Boolean),
      context: this.context,
      shuffle: this.shuffle,
    };
  };

  Player.prototype._startLoop = function () {
    if (this._raf) return;
    const tick = () => {
      this.emit("time", this.timeInfo());
      this._updatePositionState();
      if (this.playing) this._raf = requestAnimationFrame(tick);
      else this._raf = 0;
    };
    this._raf = requestAnimationFrame(tick);
  };
  Player.prototype._stopLoop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  };

  Player.prototype._setMediaMeta = function (t) {
    if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
    try {
      const artist = K.artistById[t.artistId];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: artist ? artist.name : "Kozl",
        album: "Kozl Music",
        artwork: [
          { src: t.cover, sizes: "512x512", type: "image/jpeg" },
        ],
      });
      navigator.mediaSession.setActionHandler("play", () => this.play());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
      navigator.mediaSession.setActionHandler("seekbackward", () => this.seek(this.audio.currentTime - 10));
      navigator.mediaSession.setActionHandler("seekforward", () => this.seek(this.audio.currentTime + 10));
      navigator.mediaSession.setActionHandler("seekto", (e) => {
        if (e && typeof e.seekTime === "number") this.seek(e.seekTime);
      });
    } catch (e) {
      /* trình duyệt không hỗ trợ */
    }
  };

  Player.prototype._updateMediaState = function () {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = this.playing ? "playing" : "paused";
    } catch (e) {}
  };

  Player.prototype._updatePositionState = function () {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    const dur = this.duration();
    if (!dur || !isFinite(dur)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: this.audio.playbackRate || 1,
        position: Math.min(this.audio.currentTime || 0, dur),
      });
    } catch (e) {}
  };

  /* ---------------- radio: hàng chờ gợi ý theo thể loại/tag ---------------- */
  K.radioQueue = function (seedId) {
    const seed = K.trackById[seedId];
    if (!seed) return [];
    const scored = K.data.tracks
      .filter((t) => t.id !== seed.id)
      .map((t) => {
        let score = 0;
        if (t.genre === seed.genre) score += 6;
        score += (t.tags || []).filter((tag) => (seed.tags || []).indexOf(tag) > -1).length * 3;
        if (t.artistId === seed.artistId) score += 2;
        score += Math.min(2, Math.log10((t.plays || 0) + 10) / 2);
        return { id: t.id, score: score + Math.random() * 1.2 };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.id);
    return [seed.id].concat(scored);
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  K.shuffle = shuffle;

  K.Player = Player;

  /* ---------------- waveform ---------------- */
  const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  const peakCache = {};

  function decodePeaks(key, bars) {
    const raw = window.KOZL_PEAKS && window.KOZL_PEAKS[key];
    if (!raw) return null;
    if (peakCache[key]) {
      return resample(peakCache[key], bars);
    }
    const vals = new Float32Array(raw.peaks.length);
    for (let i = 0; i < raw.peaks.length; i++) {
      const idx = ALPHA.indexOf(raw.peaks.charAt(i));
      vals[i] = (idx < 0 ? 0 : idx) / 63;
    }
    peakCache[key] = vals;
    return resample(vals, bars);
  }

  function resample(vals, bars) {
    const out = new Array(bars);
    const step = vals.length / bars;
    for (let i = 0; i < bars; i++) {
      const start = Math.floor(i * step);
      const end = Math.max(start + 1, Math.floor((i + 1) * step));
      let sum = 0, max = 0;
      for (let j = start; j < end && j < vals.length; j++) {
        sum += vals[j];
        if (vals[j] > max) max = vals[j];
      }
      const avg = sum / Math.max(1, end - start);
      out[i] = Math.min(1, avg * 0.55 + max * 0.65);
    }
    return out;
  }

  function barsHTML(vals) {
    let html = "";
    for (let i = 0; i < vals.length; i++) {
      const h = Math.max(3, Math.round(vals[i] * 100));
      html += '<i style="height:' + h + '%"></i>';
    }
    return html;
  }

  K.wave = {
    barsForWidth(width) {
      if (!width) return 96;
      return Math.max(48, Math.min(190, Math.round(width / 4)));
    },
    render(el, trackId, opts) {
      const t = K.trackById[trackId];
      if (!t) return;
      const bars = opts && opts.bars ? opts.bars : K.wave.barsForWidth(el.clientWidth || 320);
      const vals = decodePeaks(t.peaksKey, bars) || new Array(bars).fill(0.25);
      const html =
        '<div class="wave-bars base" aria-hidden="true">' + barsHTML(vals) + "</div>" +
        '<div class="wave-bars played" aria-hidden="true" style="clip-path:inset(0 100% 0 0)">' + barsHTML(vals) + "</div>" +
        '<div class="wave-tip" aria-hidden="true">0:00</div>';
      el.innerHTML = html;
      el.dataset.waveTrack = trackId;
      el.dataset.bars = String(bars);
      el._peaks = vals;
      el.setAttribute("aria-valuemin", "0");
      el.setAttribute("aria-valuemax", "100");
      if (opts && opts.markers) {
        (t.comments || []).concat(K.store.commentsFor(t.id)).forEach((c) => {
          if (!t.duration) return;
          const pct = Math.max(0, Math.min(100, (c.at / t.duration) * 100));
          const m = document.createElement("span");
          m.className = "wave-marker";
          m.style.left = pct + "%";
          m.title = "@" + c.user + ": " + c.text;
          el.appendChild(m);
        });
      }
      K.wave.setProgress(el, 0);
    },
    setProgress(el, ratio) {
      if (!el) return;
      const played = el.querySelector(".wave-bars.played");
      if (!played) return;
      ratio = Math.max(0, Math.min(1, ratio || 0));
      played.style.clipPath = "inset(0 " + ((1 - ratio) * 100).toFixed(2) + "% 0 0)";
      el.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      el.setAttribute("aria-valuetext", K.fmtTime(ratio * (el._duration || 0)) || "");
      el._ratio = ratio;
    },
    tipFor(el, ratio) {
      const tip = el.querySelector(".wave-tip");
      if (!tip) return;
      const dur = el._duration || 0;
      tip.textContent = K.fmtTime(ratio * dur);
      tip.style.left = Math.max(16, Math.min(el.clientWidth - 16, ratio * el.clientWidth)) + "px";
    },
  };
})();
