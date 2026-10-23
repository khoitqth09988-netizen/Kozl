/* =========================================================================
   Kozl Music — ảnh bìa: tải ảnh lên, thư viện ảnh dựng sẵn, Studio ảnh bìa
   Tất cả xử lý trong trình duyệt, ảnh lưu bằng localStorage (dataURL).
   ========================================================================= */
(function () {
  "use strict";

  const K = window.K;
  const esc = K.esc;
  const icon = K.icon;
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------------- xử lý ảnh ---------------- */
  const IMG_MAX = 720;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function squareCanvas(img, size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const s = Math.min(img.width || img.naturalWidth, img.height || img.naturalHeight);
    const sx = ((img.width || img.naturalWidth) - s) / 2;
    const sy = ((img.height || img.naturalHeight) - s) / 2;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    return c;
  }

  async function fileToDataURL(file, size) {
    const raw = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
    const img = await loadImage(raw);
    const c = squareCanvas(img, size || IMG_MAX);
    return c.toDataURL("image/jpeg", 0.84);
  }

  /* canvas 1024 → JPEG vừa đủ để lưu localStorage, vẫn nét khi hiển thị */
  function canvasToDataURL(canvas, size, quality) {
    const c = document.createElement("canvas");
    c.width = c.height = size || IMG_MAX;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality || 0.82);
  }

  async function srcToDataURL(src, size) {
    const img = await loadImage(src);
    return squareCanvas(img, size || IMG_MAX).toDataURL("image/jpeg", 0.86);
  }

  /* ---------------- đối tượng đích ---------------- */
  function targetInfo(target) {
    if (!target) return { name: "Ảnh bìa", current: "", subtitle: "" };
    if (target.type === "artist") {
      const a = K.artistById[target.id];
      return { name: a ? a.name : "Nghệ sĩ", current: K.store.avatarOf(target.id), subtitle: "Ảnh đại diện nghệ sĩ" };
    }
    if (target.type === "playlist") {
      const p = K.store.playlistById(target.id);
      return { name: p ? p.title : "Danh sách", current: K.store.playlistCoverOf(target.id), subtitle: "Ảnh bìa danh sách phát" };
    }
    const t = K.trackById[target.id];
    return { name: t ? t.title : "Bài hát", current: K.store.coverOf(target.id), subtitle: "Ảnh bìa bài hát" };
  }

  function applyTarget(target, dataUrl, label) {
    const ok = K.store.setCover(target, dataUrl);
    if (!ok) {
      K.toast("Bộ nhớ trình duyệt đã đầy — thử ảnh nhỏ hơn", "close");
      return false;
    }
    if (label) K.store.addToGallery(dataUrl, label);
    K.emitChange && K.emitChange();
    K.toast("Đã cập nhật ảnh bìa: " + targetInfo(target).name, "image");
    return true;
  }

  /* ---------------- modal chung ---------------- */
  let modalEl = null;

  function openModal(html, opts) {
    closeModal();
    opts = opts || {};
    modalEl = document.createElement("div");
    modalEl.className = "modal-backdrop";
    modalEl.id = "cover-backdrop";
    modalEl.innerHTML = '<div class="modal ' + (opts.wide ? "modal-wide" : "") + '" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(modalEl);
    requestAnimationFrame(() => modalEl.classList.add("is-open"));
    document.body.classList.add("modal-open");
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl || e.target.closest("[data-close-cover]")) closeModal();
    });
    return modalEl;
  }

  function closeModal() {
    if (!modalEl) return;
    const el = modalEl;
    modalEl = null;
    el.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    setTimeout(() => el.remove(), 240);
  }

  /* ---------------- trình chọn ảnh bìa ---------------- */
  function openPicker(target) {
    if (!target) return;
    const info = targetInfo(target);
    const presets = K.data.presets;
    const gallery = K.store.state.gallery;

    const el = openModal(
      '<header class="modal-head">' +
        "<div>" +
          '<h2>Đổi ảnh bìa</h2>' +
          '<p class="modal-sub">' + esc(info.subtitle) + " · " + esc(info.name) + "</p>" +
        "</div>" +
        '<button class="icon-btn" data-close-cover aria-label="Đóng">' + icon("close") + "</button>" +
      "</header>" +
      '<div class="cover-body">' +
        '<div class="cover-current">' +
          '<div class="cover-preview" id="cover-preview" style="background-image:url(\'' + esc(info.current) + "')\">" +
            '<span class="cover-preview-tag">Ảnh hiện tại</span>' +
          "</div>" +
          '<div class="cover-current-info">' +
            '<strong id="cover-name">' + esc(info.name) + "</strong>" +
            '<span class="small muted">Ảnh vuông, tối thiểu 512×512 để đẹp nhất</span>' +
            '<div class="cover-current-actions">' +
              '<button class="btn btn-sm btn-outline" id="cover-upload">' + icon("upload") + " Tải ảnh lên</button>" +
              '<button class="btn btn-sm btn-outline" id="cover-studio">' + icon("palette") + " Studio</button>" +
              '<a class="btn btn-sm btn-ghost" id="cover-download" download="kozl-cover.jpg" href="' + esc(info.current) + '">' +
                icon("download") + " Tải về</a>" +
            "</div>" +
            '<button class="btn btn-sm btn-ghost cover-reset" id="cover-reset">' + icon("trash") + " Dùng lại ảnh gốc</button>" +
          "</div>" +
        "</div>" +
        '<input type="file" id="cover-file" accept="image/*" hidden>' +
        '<div class="cover-drop" id="cover-drop">' +
          icon("image") +
          "<div><strong>Kéo ảnh vào đây</strong> hoặc bấm để chọn từ máy</div>" +
          '<span class="small muted">JPG, PNG, WebP · ảnh sẽ được cắt vuông và nén lại</span>' +
        "</div>" +
        '<div class="cover-tabs" role="tablist">' +
          '<button class="cover-tab is-active" data-cover-tab="presets" role="tab">Ảnh dựng sẵn (' + presets.length + ")</button>" +
          '<button class="cover-tab" data-cover-tab="gallery" role="tab">Thư viện của bạn (' + gallery.length + ")</button>" +
        "</div>" +
        '<div class="cover-grid" id="cover-grid"></div>' +
        '<p class="cover-hint">' + icon("sparkle") +
          " Mẹo: mở <b>Studio</b> để tự phối màu, thêm chữ và xuất file PNG cho bìa này.</p>" +
      "</div>"
    );

    const grid = $("#cover-grid", el);
    const fileInput = $("#cover-file", el);

    function renderGrid(tab) {
      const items = tab === "gallery" ? gallery : presets;
      if (!items.length) {
        grid.innerHTML = '<div class="empty small-empty">' + icon("image") + "<div>Chưa có ảnh nào. Tải ảnh lên hoặc tạo trong Studio.</div></div>";
        return;
      }
      grid.innerHTML = items
        .map(
          (p) =>
            '<button class="cover-tile" data-use-src="' + esc(p.src) + '" title="' + esc(p.name || "Ảnh của bạn") + '">' +
              '<img src="' + esc(p.src) + '" alt="' + esc(p.name || "") + '" loading="lazy">' +
              '<span class="cover-tile-name">' + esc(p.name || "Của bạn") + "</span>" +
            "</button>"
        )
        .join("");
    }
    renderGrid("presets");

    el.addEventListener("click", async (e) => {
      const tab = e.target.closest("[data-cover-tab]");
      if (tab) {
        el.querySelectorAll("[data-cover-tab]").forEach((b) => b.classList.toggle("is-active", b === tab));
        renderGrid(tab.dataset.coverTab);
        return;
      }
      const tile = e.target.closest("[data-use-src]");
      if (tile) {
        try {
          const url = await srcToDataURL(tile.dataset.useSrc);
          if (applyTarget(target, url)) {
            $("#cover-preview", el).style.backgroundImage = 'url("' + url + '")';
            closeModal();
            K.rerender && K.rerender();
          }
        } catch (err) {
          K.toast("Không đọc được ảnh này", "close");
        }
      }
    });

    $("#cover-upload", el).addEventListener("click", () => fileInput.click());
    $("#cover-drop", el).addEventListener("click", () => fileInput.click());
    $("#cover-studio", el).addEventListener("click", () => {
      closeModal();
      openStudio(target);
    });
    $("#cover-reset", el).addEventListener("click", () => {
      K.store.resetCover(target);
      K.toast("Đã quay lại ảnh gốc", "check");
      closeModal();
      K.rerender && K.rerender();
    });

    async function handleFiles(files) {
      const file = files && files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) return K.toast("Chỉ nhận tệp ảnh", "close");
      try {
        const url = await fileToDataURL(file, IMG_MAX);
        if (applyTarget(target, url, "Ảnh của bạn")) {
          $("#cover-preview", el).style.backgroundImage = 'url("' + url + '")';
          closeModal();
          K.rerender && K.rerender();
        }
      } catch (err) {
        K.toast("Không đọc được ảnh", "close");
      }
    }

    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

    const drop = $("#cover-drop", el);
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("is-over");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("is-over");
      })
    );
    drop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  }

  /* ---------------- Studio ảnh bìa ---------------- */
  const STYLES = [
    { id: "crimson", name: "Crimson", colors: ["#12030a", "#7c0a1c", "#ff4d5e"], light: false },
    { id: "teal", name: "Teal", colors: ["#03141b", "#0c4a52", "#7ff2df"], light: false },
    { id: "sunset", name: "Sunset", colors: ["#1b0a33", "#b83a6b", "#ffb45c"], light: false },
    { id: "neon", name: "Neon", colors: ["#06021a", "#41107a", "#ff3d8b"], light: false },
    { id: "cream", name: "Cream", colors: ["#f3ecdf", "#e2d3bd", "#c24a3a"], light: true },
    { id: "vhs", name: "VHS", colors: ["#0c0218", "#3c0a55", "#ff7ac0"], light: false },
    { id: "vinyl", name: "Vinyl", colors: ["#0f0f13", "#2a2a33", "#f0552a"], light: false },
    { id: "mono", name: "Mono", colors: ["#0b0b0e", "#3a3a44", "#ececf2"], light: false },
  ];
  const TEXTURES = [
    { id: "none", name: "Trơn" },
    { id: "grain", name: "Nhiễu" },
    { id: "grid", name: "Lưới" },
    { id: "rings", name: "Vòng" },
    { id: "scan", name: "Scan" },
    { id: "glow", name: "Quầng" },
  ];
  const FONTS = [
    { id: "system", name: "Hiện đại", stack: "system-ui, 'Segoe UI', Roboto, sans-serif", weight: 800 },
    { id: "serif", name: "Cổ điển", stack: "Georgia, 'Times New Roman', serif", weight: 700 },
    { id: "mono", name: "Máy móc", stack: "'SF Mono', ui-monospace, Menlo, monospace", weight: 700 },
  ];

  let studio = null;

  function drawCover(canvas, cfg) {
    const ctx = canvas.getContext("2d");
    const S = canvas.width;
    const style = STYLES.find((s) => s.id === cfg.style) || STYLES[0];
    const g = ctx.createLinearGradient(cfg.angle === "diag" ? 0 : S / 2, 0, cfg.angle === "diag" ? S : S / 2, S);
    g.addColorStop(0, style.colors[0]);
    g.addColorStop(0.55, style.colors[1]);
    g.addColorStop(1, style.colors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // texture
    if (cfg.texture === "glow") {
      const rg = ctx.createRadialGradient(S * 0.5, S * 0.42, S * 0.02, S * 0.5, S * 0.45, S * 0.75);
      rg.addColorStop(0, style.colors[2] + "cc");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, S, S);
    }
    if (cfg.texture === "grid") {
      ctx.strokeStyle = "rgba(255,255,255,.13)";
      ctx.lineWidth = Math.max(1, S / 900);
      const step = S / 18;
      for (let i = 0; i <= S; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, S);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(S, i);
        ctx.stroke();
      }
    }
    if (cfg.texture === "rings") {
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = Math.max(1, S / 700);
      for (let r = S * 0.06; r < S * 0.8; r += S * 0.032) {
        ctx.beginPath();
        ctx.arc(S * 0.5, S * 0.5, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (cfg.texture === "scan") {
      ctx.fillStyle = "rgba(0,0,0,.22)";
      for (let y = 0; y < S; y += Math.max(3, S / 220)) ctx.fillRect(0, y, S, Math.max(1, S / 900));
    }
    if (cfg.texture === "grain") {
      const img = ctx.getImageData(0, 0, S, S);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 26;
        d[i] += n;
        d[i + 1] += n;
        d[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    }

    // vignette
    const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.5)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, S, S);

    // text
    const font = FONTS.find((f) => f.id === cfg.font) || FONTS[0];
    const ink = style.light ? "#1b1712" : "#ffffff";
    const subInk = style.light ? "rgba(27,23,18,.62)" : "rgba(255,255,255,.68)";
    const title = (cfg.title || "").trim();
    const sub = (cfg.subtitle || "").trim();
    const maxW = S * 0.78;
    let y = cfg.pos === "top" ? S * 0.2 : cfg.pos === "center" ? S * 0.5 : S * 0.74;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let size = S * 0.115;
    const lines = [];
    ctx.font = font.weight + " " + size + "px " + font.stack;
    if (title) {
      const words = title.split(/\s+/);
      let line = "";
      words.forEach((w) => {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = w;
        } else line = test;
      });
      if (line) lines.push(line);
    }
    const totalH = lines.length * size * 1.06;
    let startY = y - (cfg.pos === "center" ? totalH / 2 : cfg.pos === "top" ? 0 : totalH) + size * 0.5;

    ctx.fillStyle = ink;
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = S * 0.02;
    lines.forEach((ln, i) => {
      ctx.fillText(ln, S / 2, startY + i * size * 1.06);
    });
    ctx.shadowBlur = 0;

    if (sub) {
      const subSize = S * 0.036;
      ctx.font = "600 " + subSize + "px " + font.stack;
      ctx.fillStyle = subInk;
      const subY = startY + (lines.length - 1) * size * 1.06 + size * 0.62;
      ctx.fillText(sub.toUpperCase(), S / 2, subY, maxW);
    }

    // small kozl mark
    ctx.font = "700 " + S * 0.026 + "px system-ui, sans-serif";
    ctx.fillStyle = subInk;
    ctx.fillText("KOZL MUSIC", S / 2, S * 0.93);
  }

  function defaultConfig(target) {
    const info = targetInfo(target);
    return {
      style: "crimson",
      texture: "grain",
      pos: "bottom",
      font: "system",
      angle: "diag",
      title: info.name,
      subtitle: target && target.type === "track" ? "KOZL" : "KOZL MUSIC",
    };
  }

  function openStudio(target) {
    studio = { target, cfg: defaultConfig(target) };
    const el = openModal(
      '<header class="modal-head">' +
        "<div><h2>Studio ảnh bìa</h2>" +
        '<p class="modal-sub">Tự phối màu, thêm chữ, xuất PNG · ' + esc(targetInfo(target).name) + "</p></div>" +
        '<button class="icon-btn" data-close-cover aria-label="Đóng">' + icon("close") + "</button>" +
      "</header>" +
      '<div class="studio-body">' +
        '<div class="studio-left">' +
          '<canvas id="studio-canvas" width="1024" height="1024" aria-label="Xem trước ảnh bìa"></canvas>' +
          '<div class="studio-actions">' +
            '<button class="btn btn-primary" id="studio-apply">' + icon("check") + " Dùng ảnh này</button>" +
            '<button class="btn btn-outline" id="studio-download">' + icon("download") + " Tải PNG</button>" +
            '<button class="btn btn-ghost" id="studio-random">' + icon("sparkle") + " Ngẫu nhiên</button>" +
          "</div>" +
          '<p class="small muted studio-note">Ảnh xuất ở 1024×1024 PNG, dùng được làm bìa nhạc, avatar, thumbnail.</p>' +
        "</div>" +
        '<div class="studio-right">' +
          '<div class="studio-field"><label>Bảng màu</label><div class="swatches" id="studio-styles"></div></div>' +
          '<div class="studio-field"><label>Chất liệu</label><div class="chips small" id="studio-textures"></div></div>' +
          '<div class="studio-field"><label>Kiểu chữ</label><div class="chips small" id="studio-fonts"></div></div>' +
          '<div class="studio-field"><label>Vị trí chữ</label><div class="chips small" id="studio-pos">' +
            '<button class="chip" data-pos="top">Trên</button>' +
            '<button class="chip" data-pos="center">Giữa</button>' +
            '<button class="chip" data-pos="bottom">Dưới</button>' +
          "</div></div>" +
          '<div class="studio-field"><label for="studio-title">Tên bài / tiêu đề</label>' +
            '<input id="studio-title" type="text" maxlength="60" value="' + esc(studio.cfg.title) + '"></div>' +
          '<div class="studio-field"><label for="studio-subtitle">Dòng phụ</label>' +
            '<input id="studio-subtitle" type="text" maxlength="40" value="' + esc(studio.cfg.subtitle) + '"></div>' +
        "</div>" +
      "</div>",
      { wide: true }
    );

    const canvas = $("#studio-canvas", el);

    function paint() {
      drawCover(canvas, studio.cfg);
      $("#studio-styles", el).innerHTML = STYLES.map(
        (s) =>
          '<button class="swatch' + (s.id === studio.cfg.style ? " is-active" : "") + '" data-style="' + s.id + '" title="' + s.name + '">' +
            '<span style="background:linear-gradient(140deg,' + s.colors[0] + "," + s.colors[1] + "," + s.colors[2] + ')"></span>' +
          "</button>"
      ).join("");
      $("#studio-textures", el).innerHTML = TEXTURES.map(
        (t) => '<button class="chip' + (t.id === studio.cfg.texture ? " is-active" : "") + '" data-texture="' + t.id + '">' + t.name + "</button>"
      ).join("");
      $("#studio-fonts", el).innerHTML = FONTS.map(
        (f) => '<button class="chip' + (f.id === studio.cfg.font ? " is-active" : "") + '" data-font="' + f.id + '">' + f.name + "</button>"
      ).join("");
      el.querySelectorAll("[data-pos]").forEach((b) => b.classList.toggle("is-active", b.dataset.pos === studio.cfg.pos));
    }
    paint();

    el.addEventListener("click", (e) => {
      const s = e.target.closest("[data-style]");
      if (s) {
        studio.cfg.style = s.dataset.style;
        paint();
        return;
      }
      const t = e.target.closest("[data-texture]");
      if (t) {
        studio.cfg.texture = t.dataset.texture;
        paint();
        return;
      }
      const f = e.target.closest("[data-font]");
      if (f) {
        studio.cfg.font = f.dataset.font;
        paint();
        return;
      }
      const p = e.target.closest("[data-pos]");
      if (p) {
        studio.cfg.pos = p.dataset.pos;
        paint();
      }
    });

    el.addEventListener("input", (e) => {
      if (e.target.id === "studio-title") {
        studio.cfg.title = e.target.value;
        paint();
      }
      if (e.target.id === "studio-subtitle") {
        studio.cfg.subtitle = e.target.value;
        paint();
      }
    });

    $("#studio-random", el).addEventListener("click", () => {
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      studio.cfg.style = pick(STYLES).id;
      studio.cfg.texture = pick(TEXTURES).id;
      studio.cfg.font = pick(FONTS).id;
      studio.cfg.pos = pick(["top", "center", "bottom"]);
      studio.cfg.angle = pick(["diag", "vertical"]);
      paint();
    });

    $("#studio-download", el).addEventListener("click", () => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "kozl-cover-" + (studio.cfg.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        K.toast("Đã tải PNG 1024×1024", "download");
      }, "image/png");
    });

    $("#studio-apply", el).addEventListener("click", () => {
      // thu về 800px để không đầy localStorage, PNG tải về vẫn 1024px
      const url = canvasToDataURL(canvas, 800, 0.82);
      if (applyTarget(studio.target, url, studio.cfg.title)) {
        closeModal();
        K.rerender && K.rerender();
      }
    });
  }

  /* ---------------- tiện ích cho view ---------------- */
  function coverButton(target, cls) {
    return (
      '<button class="' + (cls || "cover-edit") + '" data-edit-cover="' + target.type + ":" + esc(target.id) + '" ' +
      'title="Đổi ảnh bìa" aria-label="Đổi ảnh bìa">' + icon("image") + "</button>"
    );
  }

  function parseTarget(str) {
    const [type, id] = String(str || "").split(":");
    return type && id ? { type, id } : null;
  }

  K.covers = {
    openPicker,
    openStudio,
    coverButton,
    parseTarget,
    fileToDataURL,
    srcToDataURL,
    canvasToDataURL,
    targetInfo,
    applyTarget,
    closeModal,
    STYLES,
  };
})();
