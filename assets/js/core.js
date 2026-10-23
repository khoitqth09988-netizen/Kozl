/* =========================================================================
   Kozl Music — lõi: tiện ích, lưu trữ, trình phát, EQ, waveform, thống kê
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
  K.artistTracks = (artistId) => D.tracks.filter((t) => t.artistId === artistId);
  K.playlistTracks = (list) =>
    (Array.isArray(list) ? list : list.trackIds).map((id) => K.trackById[id]).filter(Boolean);
  K.totalDuration = (tracks) => tracks.reduce((s, t) => s + (t.duration || 0), 0);

  /* ---------------- tiện ích ---------------- */
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  K.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  K.icon = (name, cls) =>
    '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  K.fmtTime = function (sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return m + ":" + String(s).padStart(2, "0");
  };

  K.fmtLong = function (sec) {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h) return h + " giờ " + m + " phút";
    if (m) return m + " phút";
    return sec + " giây";
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

  K.fmtDate = (iso) =>
    new Date(iso + "T12:00:00").toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });

  K.todayKey = () => new Date().toISOString().slice(0, 10);

  K.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), ms);
    };
  };

  K.thumbfall = (name) => String(name || "?").trim().charAt(0).toUpperCase();

  K.userColor = function (name) {
    let h = 0;
    const s = String(name || "koz");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return "linear-gradient(140deg, hsl(" + h + " 62% 46%), hsl(" + ((h + 38) % 360) + " 70% 34%))";
  };
  K.avatarStyle = (name) => "background:" + K.userColor(name);

  K.uid = (p) => (p || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------------- lưu trữ ---------------- */
  const LS_KEY = "kozl.v2";
  const defaults = {
    likes: [],
    savedPlaylists: [],
    following: [],
    recents: [],
    comments: {},
    covers: {},
    playlistCovers: {},
    artistAvatars: {},
    gallery: [],
    lyrics: {},
    customPlaylists: [],
    history: [],
    stats: { total: 0, tracks: {}, days: {} },
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: "off",
    speed: 1,
    lastTrack: null,
    lastPos: 0,
    eq: { preset: "flat", bass: 0, mid: 0, treble: 0, enabled: false },
    visualizer: false,
    theme: "dark",
    accent: "orange",
  };

  const stored = (function () {
    try {
      const raw = localStorage.getItem(LS_KEY) || localStorage.getItem("kozl.v1");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  })();

  const state = Object.assign({}, defaults, stored);
  state.likes = new Set(state.likes || []);
  state.savedPlaylists = new Set(state.savedPlaylists || []);
  state.following = new Set(state.following || []);
  state.recents = Array.isArray(state.recents) ? state.recents.slice(0, 24) : [];
  state.comments = state.comments && typeof state.comments === "object" ? state.comments : {};
  state.covers = state.covers || {};
  state.playlistCovers = state.playlistCovers || {};
  state.artistAvatars = state.artistAvatars || {};
  state.gallery = Array.isArray(state.gallery) ? state.gallery : [];
  state.lyrics = state.lyrics || {};
  state.customPlaylists = Array.isArray(state.customPlaylists) ? state.customPlaylists : [];
  state.history = Array.isArray(state.history) ? state.history.slice(0, 300) : [];
  state.stats = Object.assign({ total: 0, tracks: {}, days: {} }, state.stats || {});
  state.eq = Object.assign({}, defaults.eq, state.eq || {});
  if (typeof state.accent !== "string" || state.accent.charAt(0) === "#") state.accent = "orange";
  if (state.theme !== "light") state.theme = "dark";
  K.state = state;

  const persist = function () {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          likes: Array.from(state.likes),
          savedPlaylists: Array.from(state.savedPlaylists),
          following: Array.from(state.following),
          recents: state.recents,
          comments: state.comments,
          covers: state.covers,
          playlistCovers: state.playlistCovers,
          artistAvatars: state.artistAvatars,
          gallery: state.gallery.slice(-12),
          lyrics: state.lyrics,
          customPlaylists: state.customPlaylists,
          history: state.history.slice(0, 300),
          stats: state.stats,
          volume: state.volume,
          muted: state.muted,
          shuffle: state.shuffle,
          repeat: state.repeat,
          speed: state.speed,
          lastTrack: state.lastTrack,
          lastPos: state.lastPos,
          eq: state.eq,
          visualizer: state.visualizer,
          theme: state.theme,
          accent: state.accent,
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  };
  const save = K.debounce(persist, 300);
  K.saveNow = persist;
  K.saveState = save;

  K.store = {
    state,
    save,
    toggleLike(id) {
      state.likes.has(id) ? state.likes.delete(id) : state.likes.add(id);
      save();
      return state.likes.has(id);
    },
    isLiked: (id) => state.likes.has(id),
    toggleSave(id) {
      state.savedPlaylists.has(id) ? state.savedPlaylists.delete(id) : state.savedPlaylists.add(id);
      save();
      return state.savedPlaylists.has(id);
    },
    isSaved: (id) => state.savedPlaylists.has(id),
    toggleFollow(id) {
      state.following.has(id) ? state.following.delete(id) : state.following.add(id);
      save();
      return state.following.has(id);
    },
    isFollowing: (id) => state.following.has(id),

    pushRecent(id) {
      state.recents = [id, ...state.recents.filter((x) => x !== id)].slice(0, 24);
      save();
    },

    commentsFor: (id) => state.comments[id] || [],
    addComment(trackId, text, at) {
      const entry = {
        id: K.uid("c"),
        user: "ban",
        mine: true,
        at: Math.max(0, Math.round(at)),
        text: String(text).slice(0, 400),
        timeAgo: "vừa xong",
        likes: 0,
      };
      state.comments[trackId] = [entry, ...(state.comments[trackId] || [])];
      save();
      return entry;
    },

    /* --- ảnh bìa --- */
    coverOf(id) {
      return state.covers[id] || (K.trackById[id] ? K.trackById[id].cover : "");
    },
    playlistCoverOf(id) {
      const p = K.playlistById[id] || state.customPlaylists.find((x) => x.id === id);
      return state.playlistCovers[id] || (p ? p.cover : "");
    },
    avatarOf(artistId) {
      const a = K.artistById[artistId];
      return state.artistAvatars[artistId] || (a ? a.avatar : "");
    },
    setCover(target, dataUrl) {
      if (!dataUrl) return false;
      if (target.type === "artist") state.artistAvatars[target.id] = dataUrl;
      else if (target.type === "playlist") state.playlistCovers[target.id] = dataUrl;
      else state.covers[target.id] = dataUrl;
      return persist();
    },
    resetCover(target) {
      if (target.type === "artist") delete state.artistAvatars[target.id];
      else if (target.type === "playlist") delete state.playlistCovers[target.id];
      else delete state.covers[target.id];
      persist();
    },
    addToGallery(dataUrl, label) {
      const item = { id: K.uid("g"), src: dataUrl, label: label || "Ảnh của bạn", at: Date.now() };
      state.gallery = [item, ...state.gallery.filter((g) => g.src !== dataUrl)].slice(0, 12);
      persist();
      return item;
    },

    /* --- playlist tự tạo --- */
    createPlaylist(title, description, trackIds) {
      const p = {
        id: K.uid("pl"),
        title: title || "Danh sách mới",
        description: description || "",
        curator: "Bạn",
        cover: (trackIds && trackIds[0] && K.store.coverOf(trackIds[0])) || "assets/playlists/kozl-essentials.jpg",
        genre: "Của bạn",
        plays: 0,
        custom: true,
        trackIds: trackIds ? trackIds.slice() : [],
        createdAt: new Date().toISOString(),
      };
      state.customPlaylists = [p, ...state.customPlaylists];
      save();
      return p;
    },
    updatePlaylist(id, patch) {
      const p = state.customPlaylists.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, patch);
      save();
      return p;
    },
    deletePlaylist(id) {
      state.customPlaylists = state.customPlaylists.filter((x) => x.id !== id);
      delete state.playlistCovers[id];
      save();
    },
    addToPlaylist(playlistId, trackId) {
      const p = state.customPlaylists.find((x) => x.id === playlistId);
      if (!p) return false;
      if (p.trackIds.includes(trackId)) return false;
      p.trackIds.push(trackId);
      if (!state.playlistCovers[playlistId]) p.cover = K.store.coverOf(trackId);
      save();
      return true;
    },
    removeFromPlaylist(playlistId, trackId) {
      const p = state.customPlaylists.find((x) => x.id === playlistId);
      if (!p) return;
      p.trackIds = p.trackIds.filter((id) => id !== trackId);
      save();
    },
    allPlaylists() {
      return D.playlists.concat(state.customPlaylists);
    },
    playlistById(id) {
      return K.playlistById[id] || state.customPlaylists.find((x) => x.id === id) || null;
    },

    /* --- lời bài hát --- */
    lyricsFor(trackId) {
      if (state.lyrics[trackId]) return state.lyrics[trackId];
      const t = K.trackById[trackId];
      return (t && t.lyrics) || [];
    },
    setLyrics(trackId, lines) {
      state.lyrics[trackId] = (lines || [])
        .filter((l) => l && String(l.text || "").trim())
        .map((l) => ({ t: Math.max(0, Number(l.t) || 0), text: String(l.text).trim() }))
        .sort((a, b) => a.t - b.t);
      save();
      return state.lyrics[trackId];
    },

    /* --- thống kê --- */
    logListen(trackId, seconds) {
      if (!trackId || seconds <= 0) return;
      const s = state.stats;
      s.total += seconds;
      s.tracks[trackId] = (s.tracks[trackId] || 0) + seconds;
      const day = K.todayKey();
      s.days[day] = (s.days[day] || 0) + seconds;
      state.history = [{ id: trackId, at: Date.now(), sec: seconds }, ...state.history].slice(0, 300);
    },
    resetStats() {
      state.stats = { total: 0, tracks: {}, days: {} };
      state.history = [];
      save();
    },
  };

  /* ---------------- emitter ---------------- */
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

  /* ---------------- hiệu ứng âm thanh (Web Audio) ---------------- */
  function AudioFX(audio) {
    this.audio = audio;
    this.ready = false;
    this.failed = false;
    this.ctx = null;
  }

  AudioFX.prototype.ensure = function () {
    if (this.ready || this.failed) return this.ready;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error("no audiocontext");
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(this.audio);
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 200;
      const mid = ctx.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 1000;
      mid.Q.value = 0.9;
      const treble = ctx.createBiquadFilter();
      treble.type = "highshelf";
      treble.frequency.value = 4200;
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;

      src.connect(bass).connect(mid).connect(treble).connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      this.ctx = ctx;
      this.src = src;
      this.bands = { bass, mid, treble };
      this.gain = gain;
      this.analyser = analyser;
      this.freqData = new Uint8Array(analyser.frequencyBinCount);
      this.ready = true;
      this.apply(K.state.eq);
      return true;
    } catch (e) {
      this.failed = true;
      return false;
    }
  };

  AudioFX.prototype.resume = function () {
    if (!this.ensure()) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  };

  AudioFX.prototype.apply = function (eq) {
    if (!this.ready) return;
    const flat = !eq || !eq.enabled;
    const map = flat ? { bass: 0, mid: 0, treble: 0 } : { bass: eq.bass || 0, mid: eq.mid || 0, treble: eq.treble || 0 };
    Object.keys(map).forEach((k) => {
      try {
        this.bands[k].gain.value = map[k];
      } catch (e) {}
    });
  };

  AudioFX.prototype.spectrum = function () {
    if (!this.ready) return null;
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  };

  K.AudioFX = AudioFX;

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
    this.speed = Number(state.speed) || 1;
    this.sleepUntil = 0;
    this.ab = { a: null, b: null };
    this._listenStart = 0;
    this._listened = 0;
    this._tick = null;
    this.fx = new AudioFX(audio);

    audio.volume = this.volume;
    audio.muted = this.muted;
    audio.playbackRate = this.speed;

    audio.addEventListener("play", () => {
      this.playing = true;
      this._listenStart = Date.now();
      this._startTick();
      this.emit("state", this.snapshot());
      this._updateMediaState();
    });

    audio.addEventListener("pause", () => {
      this._flushListen();
      this.playing = false;
      this.emit("state", this.snapshot());
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
      if (audio.currentSrc) this.emit("error", this.track);
    });
    audio.addEventListener("waiting", () => this.emit("buffering", true));
    audio.addEventListener("playing", () => this.emit("buffering", false));
    audio.addEventListener("canplay", () => this.emit("buffering", false));

    // khôi phục phiên trước
    if (state.lastTrack && K.trackById[state.lastTrack]) {
      const t = K.trackById[state.lastTrack];
      this.queue = this.baseQueue = [t.id];
      this.index = 0;
      audio.src = t.src;
      audio.preload = "metadata";
      this.restorePos = Number(state.lastPos) || 0;
      audio.addEventListener(
        "loadedmetadata",
        () => {
          const pos = this.restorePos;
          this.restorePos = null;
          if (pos > 0 && pos < audio.duration - 2) audio.currentTime = pos;
        },
        { once: true }
      );
      this.emit("track", { track: t, index: 0, restored: true });
    }

    const persist = () => {
      const t = this.track;
      if (t) {
        state.lastTrack = t.id;
        state.lastPos = audio.currentTime || 0;
        save();
      }
    };
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this._flushListen();
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
    if (isFinite(d) && d > 0) return d;
    return this.track ? this.track.duration : 0;
  };

  Player.prototype.timeInfo = function () {
    const dur = this.duration();
    const cur = this.audio.currentTime || 0;
    return { current: cur, duration: dur, ratio: dur ? Math.min(1, cur / dur) : 0 };
  };

  Player.prototype.snapshot = function () {
    return {
      playing: this.playing,
      buffering: !!this._buffering,
      shuffle: this.shuffle,
      repeat: this.repeat,
      muted: this.muted,
      volume: this.volume,
      speed: this.speed,
      index: this.index,
      length: this.queue.length,
      context: this.context,
      sleepUntil: this.sleepUntil,
      ab: this.ab,
    };
  };

  Player.prototype.playTrack = function (trackId, contextIds, contextLabel) {
    if (!K.trackById[trackId]) return;
    const ids = contextIds && contextIds.length ? contextIds.slice() : [trackId];
    if (ids.indexOf(trackId) === -1) ids.unshift(trackId);
    this.baseQueue = ids;
    this.context = contextLabel || null;
    if (this.shuffle) {
      this.queue = [trackId].concat(K.shuffle(ids.filter((id) => id !== trackId)));
      this.index = 0;
    } else {
      this.queue = ids.slice();
      this.index = ids.indexOf(trackId);
    }
    this._load(true);
  };

  Player.prototype.toggle = function () {
    if (!this.track) return this.playFirst();
    if (this.audio.paused) this.play();
    else this.pause();
  };

  Player.prototype.play = function () {
    if (!this.track) return this.playFirst();
    this.fx.resume();
    this.fx.apply(state.eq);
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => {});
  };

  Player.prototype.pause = function () {
    this.audio.pause();
  };

  Player.prototype.playFirst = function () {
    const list = K.playlistById["kozl-essentials"] || D.playlists[0];
    const ids = list ? list.trackIds.slice() : [D.tracks[0].id];
    this.playTrack(ids[0], ids, list ? list.title : null);
  };

  Player.prototype._load = function (autoplay) {
    const t = this.track;
    if (!t) return;
    this.audio.src = t.src;
    this.audio.preload = "auto";
    this.audio.playbackRate = this.speed;
    this.audio.load();
    this.loaded = false;
    this.ab = { a: null, b: null };
    this.emit("track", { track: t, index: this.index, context: this.context });
    this.emit("queue", this.queueInfo());
    this._setMediaMeta(t);
    this._updateMediaState();
    if (autoplay) {
      this.fx.resume();
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    }
    state.lastTrack = t.id;
    state.lastPos = 0;
    save();
  };

  Player.prototype.next = function (auto) {
    this._flushListen();
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
    this._flushListen();
    this.index = this.index > 0 ? this.index - 1 : this.queue.length - 1;
    this._load(true);
  };

  Player.prototype._onEnded = function () {
    this._flushListen();
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
    const t = K.clamp(seconds, 0, dur || 0);
    try {
      this.audio.currentTime = t;
    } catch (e) {}
    this.emit("time", this.timeInfo());
  };

  Player.prototype.seekRatio = function (r) {
    const dur = this.duration();
    if (dur) this.seek(K.clamp(r, 0, 1) * dur);
  };

  Player.prototype.setVolume = function (v) {
    v = K.clamp(v, 0, 1);
    this.volume = v;
    this.audio.volume = v;
    if (v > 0 && this.muted) {
      this.muted = false;
      this.audio.muted = false;
    }
    state.volume = v;
    state.muted = this.muted;
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

  Player.prototype.setSpeed = function (v) {
    this.speed = Number(v) || 1;
    this.audio.playbackRate = this.speed;
    state.speed = this.speed;
    save();
    this.emit("state", this.snapshot());
  };

  Player.prototype.toggleShuffle = function () {
    this.shuffle = !this.shuffle;
    state.shuffle = this.shuffle;
    const cur = this.track ? this.track.id : null;
    if (cur) {
      if (this.shuffle) {
        this.queue = [cur].concat(K.shuffle(this.baseQueue.filter((id) => id !== cur)));
        this.index = 0;
      } else {
        this.queue = this.baseQueue.slice();
        this.index = Math.max(0, this.queue.indexOf(cur));
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
    if (!this.queue.length) return this.playTrack(trackId, [trackId], null);
    this.baseQueue = this.baseQueue.concat([trackId]);
    if (next) this.queue.splice(this.index + 1, 0, trackId);
    else this.queue.push(trackId);
    this.emit("queue", this.queueInfo());
  };

  Player.prototype.removeFromQueue = function (i) {
    if (i <= this.index) return;
    const [removed] = this.queue.splice(i, 1);
    this.baseQueue = this.baseQueue.filter((id) => id !== removed);
    this.emit("queue", this.queueInfo());
  };

  Player.prototype.moveInQueue = function (from, to) {
    if (from <= this.index || to <= this.index) return;
    const [item] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, item);
    this.emit("queue", this.queueInfo());
  };

  Player.prototype.jumpTo = function (i) {
    if (i < 0 || i >= this.queue.length) return;
    if (i === this.index) return this.toggle();
    this._flushListen();
    this.index = i;
    this._load(true);
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

  /* --- hẹn giờ tắt --- */
  Player.prototype.setSleep = function (minutes) {
    this.sleepUntil = minutes > 0 ? Date.now() + minutes * 60000 : 0;
    this.emit("state", this.snapshot());
    this.emit("sleep", { minutes: minutes, until: this.sleepUntil });
  };

  /* --- lặp đoạn A-B --- */
  Player.prototype.setAB = function (which) {
    const cur = this.audio.currentTime || 0;
    if (which === "a") {
      this.ab = { a: cur, b: this.ab.b && this.ab.b > cur ? this.ab.b : null };
    } else if (which === "b") {
      this.ab = { a: this.ab.a, b: cur > (this.ab.a || 0) ? cur : null };
    } else {
      this.ab = { a: null, b: null };
    }
    this.emit("state", this.snapshot());
    this.emit("ab", this.ab);
  };

  Player.prototype._checkAB = function () {
    const { a, b } = this.ab;
    if (a == null || b == null) return;
    const t = this.audio.currentTime || 0;
    if (t >= b) this.seek(a);
  };

  Player.prototype._flushListen = function () {
    if (!this._listenStart || !this.track) return;
    const sec = (Date.now() - this._listenStart) / 1000;
    this._listenStart = 0;
    if (sec > 1.2) {
      K.store.logListen(this.track.id, Math.min(sec, 3600));
      save();
      this.emit("listen", { track: this.track, seconds: sec });
    }
  };

  Player.prototype._startTick = function () {
    if (this._tick) return;
    let last = 0;
    let lastFlush = Date.now();
    this._tick = setInterval(() => {
      const now = Date.now();
      if (this.sleepUntil && now >= this.sleepUntil) {
        this.sleepUntil = 0;
        const a = this.audio;
        const step = () => {
          if (a.volume > 0.05) {
            a.volume = Math.max(0, a.volume - 0.05);
            setTimeout(step, 220);
          } else {
            a.pause();
            a.volume = this.volume;
            this.emit("sleep", { minutes: 0, until: 0 });
          }
        };
        step();
        this.emit("state", this.snapshot());
      }
      this._checkAB();
      if (!this.audio.paused && now - lastFlush > 10000) {
        lastFlush = now;
        this._flushListen();
        if (!this.audio.paused) this._listenStart = Date.now();
      }
      if (now - last > 4000) {
        last = now;
        if (this.track) {
          state.lastTrack = this.track.id;
          state.lastPos = this.audio.currentTime || 0;
          save();
        }
      }
    }, 500);
  };

  Player.prototype._setMediaMeta = function (t) {
    if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
    try {
      const artist = K.artistById[t.artistId];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: artist ? artist.name : "Kozl",
        album: "Kozl Music",
        artwork: [{ src: K.store.coverOf(t.id), sizes: "512x512", type: "image/jpeg" }],
      });
      const set = (k, fn) => {
        try {
          navigator.mediaSession.setActionHandler(k, fn);
        } catch (e) {}
      };
      set("play", () => this.play());
      set("pause", () => this.pause());
      set("nexttrack", () => this.next());
      set("previoustrack", () => this.prev());
      set("seekbackward", () => this.seek(this.audio.currentTime - 10));
      set("seekforward", () => this.seek(this.audio.currentTime + 10));
      set("seekto", (e) => {
        if (e && typeof e.seekTime === "number") this.seek(e.seekTime);
      });
    } catch (e) {}
  };

  Player.prototype._updateMediaState = function () {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = this.playing ? "playing" : "paused";
    } catch (e) {}
    if (navigator.mediaSession.setPositionState) {
      const dur = this.duration();
      if (dur && isFinite(dur)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: this.audio.playbackRate || 1,
            position: Math.min(this.audio.currentTime || 0, dur),
          });
        } catch (e) {}
      }
    }
  };

  K.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  K.Player = Player;

  /* ---------------- radio: hàng chờ gợi ý ---------------- */
  K.radioQueue = function (seedId) {
    const seed = K.trackById[seedId];
    if (!seed) return [];
    const scored = D.tracks
      .filter((t) => t.id !== seed.id)
      .map((t) => {
        let score = 0;
        if (t.genre === seed.genre) score += 6;
        score += (t.tags || []).filter((tag) => (seed.tags || []).indexOf(tag) > -1).length * 3;
        if (t.artistId === seed.artistId) score += 2;
        return { id: t.id, score: score + Math.random() * 1.2 };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.id);
    return [seed.id].concat(scored);
  };

  /* ---------------- waveform ---------------- */
  const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  const peakCache = {};

  function decodePeaks(key, bars) {
    const raw = window.KOZL_PEAKS && window.KOZL_PEAKS[key];
    if (!raw) return null;
    if (!peakCache[key]) {
      const vals = new Float32Array(raw.peaks.length);
      for (let i = 0; i < raw.peaks.length; i++) {
        const idx = ALPHA.indexOf(raw.peaks.charAt(i));
        vals[i] = (idx < 0 ? 0 : idx) / 63;
      }
      peakCache[key] = vals;
    }
    return resample(peakCache[key], bars);
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
      out[i] = Math.min(1, (sum / Math.max(1, end - start)) * 0.55 + max * 0.65);
    }
    return out;
  }

  function barsHTML(vals) {
    let html = "";
    for (let i = 0; i < vals.length; i++) {
      html += '<i style="height:' + Math.max(3, Math.round(vals[i] * 100)) + '%"></i>';
    }
    return html;
  }

  K.wave = {
    barsForWidth(width) {
      return Math.max(48, Math.min(190, Math.round((width || 320) / 4)));
    },
    render(el, trackId, opts) {
      const t = K.trackById[trackId];
      if (!t) return;
      opts = opts || {};
      const bars = opts.bars || K.wave.barsForWidth(el.clientWidth);
      const vals = decodePeaks(t.peaksKey, bars) || new Array(bars).fill(0.28);
      el.innerHTML =
        '<div class="wave-bars base" aria-hidden="true">' + barsHTML(vals) + "</div>" +
        '<div class="wave-bars played" aria-hidden="true" style="clip-path:inset(0 100% 0 0)">' + barsHTML(vals) + "</div>" +
        '<div class="wave-tip" aria-hidden="true">0:00</div>';
      el.dataset.waveTrack = trackId;
      el.dataset.bars = String(bars);
      el._peaks = vals;
      el._duration = t.duration;
      el.setAttribute("role", "slider");
      el.setAttribute("aria-valuemin", "0");
      el.setAttribute("aria-valuemax", "100");
      if (opts.markers) {
        (t.comments || []).concat(K.store.commentsFor(t.id)).forEach((c) => {
          if (!t.duration) return;
          const pct = K.clamp((c.at / t.duration) * 100, 0, 100);
          const m = document.createElement("span");
          m.className = "wave-marker";
          m.style.left = pct + "%";
          m.title = "@" + c.user + ": " + c.text;
          el.appendChild(m);
        });
      }
      K.wave.setProgress(el, el._ratio || 0);
    },
    setProgress(el, ratio) {
      if (!el) return;
      const played = el.querySelector(".wave-bars.played");
      if (!played) return;
      ratio = K.clamp(ratio || 0, 0, 1);
      played.style.clipPath = "inset(0 " + ((1 - ratio) * 100).toFixed(2) + "% 0 0)";
      el._ratio = ratio;
      el.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      el.setAttribute("aria-valuetext", K.fmtTime(ratio * (el._duration || 0)));
    },
  };
})();
