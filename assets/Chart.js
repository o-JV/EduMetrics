/* ============================================================
   chart.js — mini biblioteca de gráficos de LINHA (sem dependências)
   Substitui o Chart.js da CDN: expõe `window.Chart` com a mesma
   forma de uso que o EduMetrics já emprega:

     const g = new Chart(canvas, {
       type: "line",
       data: { labels: [...], datasets: [{ label, data, borderColor,
               backgroundColor, fill, tension, pointRadius,
               pointBackgroundColor, borderWidth, borderDash }] },
       options: { responsive, maintainAspectRatio, aspectRatio,
                  animation, plugins: { legend, tooltip },
                  scales: { x: { grid }, y: { min, max, grid } } }
     });
     g.destroy();  g.update();

   Suporta apenas gráfico de linha (o único tipo usado no projeto).
   Coloque este arquivo em assets/chart.js.
   ============================================================ */
(function (global) {
  "use strict";

  var instances = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  /* ---------- utilidades ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 4); }
  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }

  function niceStep(range, maxTicks) {
    var rough = range / maxTicks;
    var pow = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
    var n = rough / pow;
    var f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return f * pow;
  }

  /* pontos de controle da curva (mesma ideia do Chart.js, com "tension") */
  function spline(prev, cur, next, t) {
    var d01 = dist(prev, cur), d12 = dist(cur, next);
    var sum = d01 + d12 || 1;
    var fa = t * (d01 / sum), fb = t * (d12 / sum);
    var dx = next.x - prev.x, dy = next.y - prev.y;
    return {
      prev: { x: cur.x - fa * dx, y: cur.y - fa * dy },
      next: { x: cur.x + fb * dx, y: cur.y + fb * dy }
    };
  }

  function tracePath(ctx, pts, tension, yMin, yMax) {
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length < 2) return;
    var cps = pts.map(function (p, i) {
      return spline(pts[i - 1] || p, p, pts[i + 1] || p, tension);
    });
    for (var i = 1; i < pts.length; i++) {
      var b = pts[i];
      if (!tension) { ctx.lineTo(b.x, b.y); continue; }
      var c1 = cps[i - 1].next, c2 = cps[i].prev;
      ctx.bezierCurveTo(c1.x, clamp(c1.y, yMin, yMax), c2.x, clamp(c2.y, yMin, yMax), b.x, b.y);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fmt(v) {
    if (typeof v !== "number") return String(v);
    return String(+v.toFixed(2));
  }

  /* ---------- classe Chart ---------- */
  function Chart(canvas, config) {
    if (!(this instanceof Chart)) throw new TypeError("Use: new Chart(canvas, config)");
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("Chart: canvas inválido.");
    }
    var prev = instances && instances.get(canvas);
    if (prev) prev.destroy();

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.config = config || {};
    this.type = this.config.type || "line";
    this.data = this.config.data || { labels: [], datasets: [] };
    this.options = this.config.options || {};
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.destroyed = false;
    this._progress = 1;
    this._animated = false;
    this._hover = -1;
    this._layout = null;
    this._measure = "";
    this._raf = null;
    this._fam = "sans-serif";
    try { this._fam = global.getComputedStyle(canvas).fontFamily || this._fam; } catch (e) { /* ignora */ }

    if (instances) instances.set(canvas, this);
    this._bind();
    this.resize();
  }

  Chart.prototype._bind = function () {
    var self = this, c = this.canvas;
    this._onMove = function (e) { self._pointer(e); };
    this._onLeave = function () {
      if (self._hover !== -1) { self._hover = -1; self._redraw(); }
    };
    c.addEventListener("pointermove", this._onMove);
    c.addEventListener("pointerdown", this._onMove);
    c.addEventListener("pointerleave", this._onLeave);

    var parent = c.parentElement;
    if (typeof global.ResizeObserver !== "undefined" && parent) {
      this._ro = new global.ResizeObserver(function () { self.resize(); });
      this._ro.observe(parent);
    } else {
      this._onWin = function () { self.resize(); };
      global.addEventListener("resize", this._onWin);
    }
  };

  Chart.prototype.resize = function () {
    if (this.destroyed) return;
    var c = this.canvas, p = c.parentElement, o = this.options;
    var fixedH = o.maintainAspectRatio === false;
    var w, h;
    if (p) {
      var cs = global.getComputedStyle(p);
      var px = function (k) { return parseFloat(cs[k]) || 0; };
      w = p.clientWidth - px("paddingLeft") - px("paddingRight");
      h = fixedH ? p.clientHeight - px("paddingTop") - px("paddingBottom") : w / (o.aspectRatio || 2);
    } else {
      w = c.clientWidth || 300;
      h = fixedH ? (c.clientHeight || 150) : w / (o.aspectRatio || 2);
    }
    w = Math.floor(w);
    h = Math.floor(h);
    if (!(w > 0 && h > 0)) return;            // oculto (display:none): redesenha quando aparecer

    var key = w + "x" + h;
    if (key === this._measure) return;
    this._measure = key;

    var dpr = global.devicePixelRatio || 1;
    c.style.display = "block";
    c.style.maxWidth = "100%";
    c.style.width = w + "px";
    c.style.height = h + "px";
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    this.width = w;
    this.height = h;
    this.dpr = dpr;

    if (!this._animated) { this._animated = true; this._animate(); }
    else this.draw();
  };

  Chart.prototype._animate = function () {
    var self = this, o = this.options;
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (o.animation === false || reduce) { this._progress = 1; this.draw(); return; }
    var dur = (o.animation && o.animation.duration) || 800, t0 = null;
    this._progress = 0;
    function step(ts) {
      if (self.destroyed) return;
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur);
      self._progress = ease(t);
      self.draw();
      self._raf = t < 1 ? global.requestAnimationFrame(step) : null;
    }
    this._raf = global.requestAnimationFrame(step);
  };

  Chart.prototype._redraw = function () { if (!this._raf) this.draw(); };

  Chart.prototype._pointer = function (e) {
    var L = this._layout;
    if (!L || this.destroyed) return;
    var r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var mx = (e.clientX - r.left) * (this.width / r.width);
    var my = (e.clientY - r.top) * (this.height / r.height);
    var idx = -1;
    if (L.n > 0 && mx >= L.left - 12 && mx <= L.left + L.w + 12 && my >= L.top - 8 && my <= L.top + L.h + 8) {
      idx = L.n > 1 ? Math.round((mx - L.left) / L.w * (L.n - 1)) : 0;
      idx = clamp(idx, 0, L.n - 1);
    }
    if (idx !== this._hover) { this._hover = idx; this._redraw(); }
  };

  Chart.prototype.update = function () {
    if (this.destroyed) return;
    this._progress = 1;
    this.draw();
  };

  Chart.prototype.destroy = function () {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this._raf) global.cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    if (this._onWin) global.removeEventListener("resize", this._onWin);
    this.canvas.removeEventListener("pointermove", this._onMove);
    this.canvas.removeEventListener("pointerdown", this._onMove);
    this.canvas.removeEventListener("pointerleave", this._onLeave);
    if (instances) instances.delete(this.canvas);
    try {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } catch (e) { /* ignora */ }
  };

  /* ---------- desenho ---------- */
  Chart.prototype.draw = function () {
    var ctx = this.ctx, W = this.width, H = this.height;
    if (this.destroyed || !W || !H) return;

    var o = this.options, sc = o.scales || {}, ys = sc.y || {}, xs = sc.x || {}, plug = o.plugins || {};
    var labels = this.data.labels || [], sets = this.data.datasets || [];
    var n = labels.length, fs = 12, fam = this._fam, prog = this._progress;
    var textColor = "#737373", defGrid = "rgba(0,0,0,0.08)";

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = fs + "px " + fam;

    /* legenda (embaixo) */
    var lg = plug.legend || {}, lb = lg.labels || {};
    var showLegend = lg.display !== false && sets.some(function (d) { return d.label; });
    var boxW = lb.boxWidth != null ? lb.boxWidth : 40;
    var boxH = lb.boxHeight != null ? lb.boxHeight : fs;
    var lpad = lb.padding != null ? lb.padding : 10;
    var legendH = showLegend ? Math.max(boxH, fs) + lpad + 8 : 0;

    /* área do gráfico */
    var top = 14, bottom = 30 + legendH;
    var areaH = H - top - bottom;
    if (areaH < 20) return;

    /* escala Y */
    var vals = [];
    sets.forEach(function (d) {
      (d.data || []).forEach(function (v) { if (v != null && isFinite(v)) vals.push(+v); });
    });
    var dmin = vals.length ? Math.min.apply(null, vals) : 0;
    var dmax = vals.length ? Math.max.apply(null, vals) : 1;
    var min = ys.min != null ? ys.min : (ys.beginAtZero ? Math.min(0, dmin) : dmin);
    var max = ys.max != null ? ys.max : dmax;
    if (min === max) { min -= 1; max += 1; }
    var maxTicks = clamp(Math.floor(areaH / 34), 2, 11);
    var step = niceStep(max - min, maxTicks);
    if (ys.min == null) min = Math.floor(min / step) * step;
    if (ys.max == null) max = Math.ceil(max / step) * step;
    var ticks = [];
    for (var tv = min; tv <= max + step * 1e-6; tv += step) ticks.push(+tv.toFixed(10));

    var widest = 0;
    ticks.forEach(function (t) { widest = Math.max(widest, ctx.measureText(fmt(t)).width); });
    var firstW = n ? ctx.measureText(String(labels[0])).width : 0;
    var lastW = n ? ctx.measureText(String(labels[n - 1])).width : 0;
    var left = Math.max(widest + 16, firstW / 2 + 6);
    var right = Math.max(16, lastW / 2 + 6);
    var areaW = W - left - right;
    if (areaW < 20) return;

    var baseBottom = top + areaH;
    var X = function (i) { return n > 1 ? left + i * areaW / (n - 1) : left + areaW / 2; };
    var Y = function (v) { return top + areaH - (v - min) / (max - min) * areaH; };
    this._layout = { left: left, top: top, w: areaW, h: areaH, n: n };

    /* grade horizontal + rótulos do eixo Y */
    var showYGrid = !(ys.grid && ys.grid.display === false);
    var yGridColor = (ys.grid && ys.grid.color) || defGrid;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ticks.forEach(function (t) {
      var y = Math.round(Y(t)) + 0.5;
      if (showYGrid) {
        ctx.strokeStyle = yGridColor;
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + areaW, y); ctx.stroke();
      }
      ctx.fillStyle = textColor;
      ctx.fillText(fmt(t), left - 10, y);
    });

    /* grade vertical (opcional) + rótulos do eixo X */
    var showXGrid = !(xs.grid && xs.grid.display === false);
    var xGridColor = (xs.grid && xs.grid.color) || defGrid;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var i = 0; i < n; i++) {
      var gx = Math.round(X(i)) + 0.5;
      if (showXGrid) {
        ctx.strokeStyle = xGridColor;
        ctx.beginPath(); ctx.moveTo(gx, top); ctx.lineTo(gx, baseBottom); ctx.stroke();
      }
      ctx.fillStyle = textColor;
      ctx.fillText(String(labels[i]), X(i), baseBottom + 10);
    }

    /* linha de hover */
    var hv = this._hover;
    if (hv >= 0 && hv < n) {
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(X(hv), top); ctx.lineTo(X(hv), baseBottom); ctx.stroke();
      ctx.restore();
    }

    /* séries */
    var fillBase = Y(clamp(0, min, max));
    var self = this;
    sets.forEach(function (ds) {
      var pts = [];
      (ds.data || []).forEach(function (v, idx) {
        if (v == null || !isFinite(v)) return;
        var ty = Y(+v);
        pts.push({ x: X(idx), y: baseBottom + (ty - baseBottom) * prog, idx: idx, v: +v });
      });
      if (!pts.length) return;

      var tension = ds.tension || 0;
      var color = ds.borderColor || "#999";

      if (ds.fill && pts.length > 1) {
        ctx.beginPath();
        tracePath(ctx, pts, tension, top, baseBottom);
        var fb = baseBottom + (fillBase - baseBottom) * prog;
        ctx.lineTo(pts[pts.length - 1].x, fb);
        ctx.lineTo(pts[0].x, fb);
        ctx.closePath();
        ctx.fillStyle = ds.backgroundColor || "rgba(0,0,0,0.1)";
        ctx.fill();
      }

      ctx.save();
      ctx.beginPath();
      tracePath(ctx, pts, tension, top, baseBottom);
      ctx.lineWidth = ds.borderWidth != null ? ds.borderWidth : 3;
      ctx.strokeStyle = color;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash(ds.borderDash || []);
      ctx.stroke();
      ctx.restore();

      var rad = ds.pointRadius != null ? ds.pointRadius : 3;
      if (rad > 0) {
        pts.forEach(function (p) {
          var r = p.idx === hv ? rad + 2 : rad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = ds.pointBackgroundColor || color;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        });
      }
    });

    /* legenda */
    if (showLegend) {
      var items = sets.filter(function (d) { return d.label; }).map(function (d) {
        return { d: d, tw: ctx.measureText(d.label).width };
      });
      var total = 0;
      items.forEach(function (it, k) { total += boxW + 8 + it.tw + (k ? lpad : 0); });
      var lx = Math.max(4, (W - total) / 2), cy = H - legendH / 2 + 2;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      items.forEach(function (it) {
        ctx.fillStyle = it.d.borderColor || "#999";
        roundRect(ctx, lx, cy - boxH / 2, boxW, boxH, Math.min(3, boxH / 2));
        ctx.fill();
        ctx.fillStyle = "#525252";
        ctx.fillText(it.d.label, lx + boxW + 8, cy);
        lx += boxW + 8 + it.tw + lpad;
      });
    }

    /* tooltip */
    var tt = plug.tooltip || {};
    if (tt.enabled !== false && hv >= 0 && hv < n && prog >= 1) {
      var rows = [];
      sets.forEach(function (ds) {
        var v = (ds.data || [])[hv];
        if (v == null) return;
        rows.push({ color: ds.borderColor || "#999", text: (ds.label ? ds.label + ": " : "") + fmt(+v), y: Y(+v) });
      });
      if (rows.length) {
        var title = String(labels[hv]);
        ctx.font = "600 " + fs + "px " + fam;
        var tw = ctx.measureText(title).width;
        ctx.font = fs + "px " + fam;
        rows.forEach(function (r) { tw = Math.max(tw, ctx.measureText(r.text).width + 16); });
        var pad = 10, lh = 18;
        var bw = tw + pad * 2, bh = pad * 2 + lh * (rows.length + 1) - 4;
        var bx = X(hv) + 14, by = Math.min.apply(null, rows.map(function (r) { return r.y; })) - bh / 2;
        if (bx + bw > W - 4) bx = X(hv) - 14 - bw;
        bx = Math.max(4, bx);
        by = clamp(by, 4, H - bh - 4);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "rgba(10,10,10,0.94)";
        roundRect(ctx, bx, by, bw, bh, 8);
        ctx.fill();
        ctx.restore();
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.font = "600 " + fs + "px " + fam;
        ctx.fillText(title, bx + pad, by + pad + lh / 2 - 2);
        ctx.font = fs + "px " + fam;
        rows.forEach(function (r, k) {
          var ry = by + pad + lh * (k + 1) + lh / 2 - 2;
          ctx.fillStyle = r.color;
          ctx.fillRect(bx + pad, ry - 5, 10, 10);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + pad + 0.5, ry - 4.5, 9, 9);
          ctx.fillStyle = "#fff";
          ctx.fillText(r.text, bx + pad + 16, ry);
        });
      }
    }
  };

  /* ---------- API estática mínima (compatibilidade) ---------- */
  Chart.defaults = { font: { family: "sans-serif", size: 12 }, color: "#737373" };
  Chart.register = function () {};
  Chart.getChart = function (canvas) { return (instances && instances.get(canvas)) || undefined; };
  Chart.version = "mini-1.0";

  global.Chart = Chart;
})(typeof window !== "undefined" ? window : this);