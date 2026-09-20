const E = () => window.GYEngine;
const D = () => window.GY_DATA;
const $ = (s) => document.querySelector(s);

let state = null;
let ui = {
  screen: "title",
  cat: "domestic",
  sub: null,
  targetProvince: null,
  targetClan: null,
  generalId: null,
  soldiers: 400,
  unitType: "ashigaru",
  turnOffset: 0,
  playerCount: 1,
  turnMs: 10 * 60 * 1000,
  genQuery: "",
  genPost: "all",
  showGens: false,
  genDirty: false,
  genScroll: 0,
  genBodyScroll: 0,
  showStash: false,
  showHelp: false,
  showRecords: false,
  recordFocus: null,
  cmdHelp: null,
  troopHelp: null,
  genIntro: null,
  regName: "",
  regMsg: "",
  rosterQuery: "",
  rosterHouse: "",
  popupAt: 0,
  popupKey: "",
  setupPlayers: [{ name: "第一の君主", clanId: "oda" }]
};

function fmt(n) {
  return Math.floor(n).toLocaleString("ja-JP");
}

function troopMini(clan, rec) {
  const types = D().troopTypes || [];
  const src = (rec && rec.troops) || (clan && clan.troops);
  if (!src) return "";
  return types
    .map((t) => t.short + fmt(src[t.id] || 0))
    .join("　");
}

function unitSelectHtml(id) {
  const types = D().troopTypes || [];
  const clan = myClan();
  return (
    '<label class="field">兵種<select id="' +
    id +
    '">' +
    types
      .map((t) => {
        const n = clan && clan.troops ? clan.troops[t.id] || 0 : 0;
        const extra = t.gold || t.rice ? " 金+" + (t.gold || 0) + " 米+" + (t.rice || 0) : "";
        return (
          "<option value=\"" +
          t.id +
          "\"" +
          (ui.unitType === t.id ? " selected" : "") +
          ">" +
          t.name +
          "（" +
          fmt(n) +
          extra +
          "）</option>"
        );
      })
      .join("") +
    "</select></label>"
  );
}

function currentPlayer() {
  if (!state) return null;
  return state.players.find((p) => p.id === state.currentPlayerId) || state.players[0];
}

function myClan() {
  const p = currentPlayer();
  return p ? state.clanById[p.clanId] : null;
}

function hash32(s) {
  let h = 2166136261;
  const t = String(s || "");
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clanArmorColor(clanId) {
  if (!clanId) return null;
  const list = D().clans || [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === clanId) return list[i].color || null;
  }
  return null;
}

const FAMOUS_PORTRAIT_COUNT = 300;

const PORTRAIT_NAMED = {
  "織田信長": "p-nobunaga.png",
  "徳川家康": "p-ieyasu.png",
  "羽柴秀吉": "p-hideyoshi.png",
  "豊臣秀吉": "p-hideyoshi.png",
  "武田信玄": "p-shingen.png",
  "上杉謙信": "p-kenshin.png",
  "伊達政宗": "p-masamune.png",
  "明智光秀": "p-mitsuhide.png",
  "本多忠勝": "p-bushi1.png",
  "福島正則": "p-bushi2.png",
  "井伊直政": "p-kabuto.png",
  "竹中重治": "p-scholar.png",
  "毛利元就": "p-elder.png",
  "帰蝶": "p-hime.png",
  "茶々": "p-hime2.png",
  "関羽": "p-sangoku.png",
  "劉備": "p-r-liubei.png",
  "張飛": "p-r-zhangfei.png",
  "諸葛亮": "p-r-zhuge.png",
  "趙雲": "p-r-zhaoyun.png",
  "馬超": "p-r-machao.png",
  "黄忠": "p-r-huangzhong.png",
  "龐統": "p-r-pangtong.png",
  "姜維": "p-r-jiangwei.png",
  "魏延": "p-r-weiyan.png",
  "曹操": "p-r-caocao.png",
  "司馬懿": "p-r-simayi.png",
  "郭嘉": "p-r-guojia.png",
  "荀彧": "p-r-xunyu.png",
  "賈詡": "p-r-jiaxu.png",
  "夏侯惇": "p-r-xiahoudun.png",
  "張遼": "p-r-zhangliao.png",
  "許褚": "p-r-xuchu.png",
  "典韋": "p-r-dianwei.png",
  "徐晃": "p-r-xuhuang.png",
  "司馬昭": "p-r-simazhao.png",
  "鄧艾": "p-r-dengai.png",
  "鍾会": "p-r-zhonghui.png",
  "孫権": "p-r-sunquan.png",
  "孫策": "p-r-sunce.png",
  "周瑜": "p-r-zhouyu.png",
  "陸遜": "p-r-luxun.png",
  "呂蒙": "p-r-lumeng.png",
  "甘寧": "p-r-ganning.png",
  "太史慈": "p-r-taishici.png",
  "魯粛": "p-r-lusu.png",
  "黄蓋": "p-r-huanggai.png",
  "周泰": "p-r-zhoutai.png",
  "呂布": "p-r-lubu.png",
  "貂蝉": "p-r-diaochan.png",
  "董卓": "p-r-dongzhuo.png",
  "袁紹": "p-r-yuanshao.png",
  "劉表": "p-r-liubiao.png",
  "公孫瓚": "p-r-gongsun.png",
  "左慈": "p-r-zuoci.png",
  "華佗": "p-r-huatuo.png",
  "馬謖": "p-r-masu.png",
  "関平": "p-r-guanping.png",
  "張苞": "p-r-zhangbao.png",
  "孟獲": "p-r-menghuo.png",
  "祝融": "p-r-zhurong.png",
  "大喬": "p-r-daqiao.png",
  "小喬": "p-r-xiaoqiao.png",
  "甄姫": "p-r-zhenji.png",
  "蔡文姫": "p-r-caiwenji.png",
  "牙狼": "p-r-garo.png",
  "MJ": "p-r-mj.png",
  "像": "p-r-statue.png",
  "ハンプティダンプティ": "p-r-humpty.png",
  "かわぐちまっち": "p-r-match.png",
  "宮本武蔵": "p-r-musashi.png",
  "石川五右衛門": "p-r-goemon.png",
  "デカマスター": "p-r-dekamaster.png",
  "宮沢賢治": "p-r-kenji.png",
  "宮沢りえ": "p-r-rie.png",
  "範馬刃牙": "p-r-baki.png",
  "木村モナ": "p-r-mona.png",
  "那須川天心": "p-r-tenshin.png",
  "千利休": "p-r-rikyu.png"
};

const PORTRAIT_STYLE_M_YOUNG = [
  "p-style-m2.png",
  "p-style-m4.png",
  "p-style-m5.png",
  "p-style-m10.png"
];
const PORTRAIT_STYLE_M_MID = ["p-style-m3.png", "p-style-m6.png"];
const PORTRAIT_STYLE_M_ELDER = ["p-style-m9.png"];
const PORTRAIT_STYLE_F_YOUNG = ["p-style-f1.png", "p-style-f2.png"];
const PORTRAIT_STYLE_F_MID = ["p-style-f3.png"];
const PORTRAIT_STYLE_M = PORTRAIT_STYLE_M_YOUNG.concat(PORTRAIT_STYLE_M_MID, PORTRAIT_STYLE_M_ELDER);
const PORTRAIT_STYLE_F = PORTRAIT_STYLE_F_YOUNG.concat(PORTRAIT_STYLE_F_MID);

const FEMALE_NAMES = {
  "貂蝉": 1, "大喬": 1, "小喬": 1, "甄姫": 1, "蔡文姫": 1, "祝融": 1,
  "宮沢りえ": 1, "木村モナ": 1
};

const portraitCache = {};
const oilBitmaps = {};
let famousNameSet = null;
let oilBitmapsReady = false;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isFemaleGen(g) {
  if (!g) return false;
  if (FEMALE_NAMES[g.name]) return true;
  return g.gender === "f";
}

function famousNames() {
  if (famousNameSet) return famousNameSet;
  famousNameSet = {};
  const hist = D().historical || [];
  const ranked = hist.map((h, i) => ({
    name: h[0],
    clan: h[1],
    score: h[2] + h[3] + h[4] + h[5] + h[6] - i * 0.001
  }));
  const bestClan = {};
  ranked.forEach((r) => {
    if (!bestClan[r.clan] || r.score > bestClan[r.clan].score) bestClan[r.clan] = r;
  });
  let n = 0;
  Object.keys(bestClan).forEach((c) => {
    const nm = bestClan[c].name;
    if (!famousNameSet[nm] && n < FAMOUS_PORTRAIT_COUNT) {
      famousNameSet[nm] = 1;
      n++;
    }
  });
  ranked.sort((a, b) => b.score - a.score);
  for (let i = 0; i < ranked.length && n < FAMOUS_PORTRAIT_COUNT; i++) {
    if (!famousNameSet[ranked[i].name]) {
      famousNameSet[ranked[i].name] = 1;
      n++;
    }
  }
  return famousNameSet;
}

function isFamous(g) {
  return !!(g && g.name && famousNames()[g.name]);
}

function portraitSeed(g) {
  return hash32(
    String(g && g.name ? g.name : "武将") +
      "|" +
      String(g && g.id ? g.id : "") +
      "|" +
      (isFemaleGen(g) ? "f" : "m") +
      "|" +
      String(g && g.origin ? g.origin : "") +
      "|" +
      (g && g.rare ? "1" : "0")
  );
}

function rgbStr(r, g, b, a) {
  r = Math.max(0, Math.min(255, r | 0));
  g = Math.max(0, Math.min(255, g | 0));
  b = Math.max(0, Math.min(255, b | 0));
  if (a == null || a >= 1) return "rgb(" + r + "," + g + "," + b + ")";
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

function parseHex(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || ""));
  if (!m) return [90, 58, 32];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function shadeRgb(c, k) {
  return [
    Math.max(0, Math.min(255, c[0] * k)),
    Math.max(0, Math.min(255, c[1] * k)),
    Math.max(0, Math.min(255, c[2] * k))
  ];
}

function varyRgb(c, rng, amt) {
  return [c[0] + (rng() * 2 - 1) * amt, c[1] + (rng() * 2 - 1) * amt, c[2] + (rng() * 2 - 1) * amt];
}

function oilStroke(ctx, x, y, len, thick, ang, rgb, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = a == null ? 1 : a;
  ctx.fillStyle = rgbStr(rgb[0], rgb[1], rgb[2]);
  ctx.beginPath();
  ctx.ellipse(0, 0, len, thick, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function oilFill(ctx, rng, cx, cy, rx, ry, rgb, count, len, thick, ang0, angJ, minA) {
  const a0 = minA == null ? 0.28 : minA;
  for (let i = 0; i < count; i++) {
    const t = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    oilStroke(
      ctx,
      cx + Math.cos(t) * rx * r,
      cy + Math.sin(t) * ry * r,
      len * (0.55 + rng() * 0.9),
      thick * (0.45 + rng() * 0.8),
      ang0 + (rng() - 0.5) * angJ,
      varyRgb(rgb, rng, 28),
      a0 + rng() * 0.5
    );
  }
}

function drawOilPhoto(ctx, img, size) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.min(iw, ih);
  const sx = (iw - s) / 2;
  const sy = Math.max(0, (ih - s) * 0.08);
  ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
}

function oilifyCanvas(ctx, size, rng, count, strokeScale) {
  let src;
  try {
    src = ctx.getImageData(0, 0, size, size);
  } catch (e) {
    return;
  }
  const d = src.data;
  const sample = (x, y) => {
    const xx = Math.max(0, Math.min(size - 1, x | 0));
    const yy = Math.max(0, Math.min(size - 1, y | 0));
    const i = (yy * size + xx) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const n = count || 260;
  const sc = strokeScale == null ? 1 : strokeScale;
  for (let i = 0; i < n; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const col = sample(x + (rng() - 0.5) * 3, y + (rng() - 0.5) * 3);
    const ang = -0.45 + rng() * 0.9 + (y / size) * 0.18;
    const len = size * (0.012 + rng() * 0.028) * sc;
    oilStroke(ctx, x, y, len, len * (0.22 + rng() * 0.32), ang, varyRgb(col, rng, 8), 0.22 + rng() * 0.38);
  }
}

function fillOval(ctx, x, y, rx, ry, rgb, a) {
  ctx.save();
  ctx.globalAlpha = a == null ? 1 : a;
  ctx.fillStyle = rgbStr(rgb[0], rgb[1], rgb[2]);
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.4, rx), Math.max(0.4, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintOilFrame(ctx, size, rare, famous) {
  const vig = ctx.createRadialGradient(size * 0.46, size * 0.36, size * 0.18, size * 0.5, size * 0.5, size * 0.8);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(12,7,4,0.32)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = rare ? "rgba(232,196,96,0.92)" : famous ? "rgba(210,176,86,0.82)" : "rgba(168,132,72,0.5)";
  ctx.lineWidth = size * 0.04;
  ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
}

const NONFAMOUS_M_COUNT = 80;
const NONFAMOUS_F_COUNT = 20;

function patternFileName(g) {
  const female = isFemaleGen(g);
  const n = female ? NONFAMOUS_F_COUNT : NONFAMOUS_M_COUNT;
  const idx = portraitSeed(g) % n;
  const pad = idx < 10 ? "0" + idx : String(idx);
  return female ? "p-nf-" + pad + ".jpg" : "p-nm-" + pad + ".jpg";
}

function pickStyleBitmap(g) {
  const file = patternFileName(g);
  const baked = oilBitmaps[file];
  if (baked && baked.naturalWidth) return baked;
  const female = isFemaleGen(g);
  const age = (g && g.age) || 0;
  let pool;
  if (female) {
    pool = age >= 48 ? PORTRAIT_STYLE_F_MID.concat(PORTRAIT_STYLE_F_YOUNG) : PORTRAIT_STYLE_F_YOUNG.slice();
  } else if (age >= 58) {
    pool = PORTRAIT_STYLE_M_ELDER.concat(PORTRAIT_STYLE_M_MID);
  } else if (age >= 44) {
    pool = PORTRAIT_STYLE_M_MID.concat(PORTRAIT_STYLE_M_YOUNG);
  } else {
    pool = PORTRAIT_STYLE_M_YOUNG.slice();
  }
  if (g && g.origin === "sangokushi" && !female) {
    pool = ["p-sangoku.png"].concat(pool);
  }
  const avail = pool.filter((f) => oilBitmaps[f] && oilBitmaps[f].naturalWidth);
  if (!avail.length) return null;
  return oilBitmaps[avail[portraitSeed(g) % avail.length]];
}

function remapOilPortrait(ctx, size, rng, clanRgb) {
  let src;
  try {
    src = ctx.getImageData(0, 0, size, size);
  } catch (e) {
    return;
  }
  const s = src.data;
  const dst = ctx.createImageData(size, size);
  const d = dst.data;
  const hue = (rng() - 0.5) * 14;
  const bright = 0.97 + rng() * 0.06;
  const clanT = 0.04 + rng() * 0.06;
  const cr = clanRgb || [40, 28, 18];
  for (let i = 0; i < s.length; i += 4) {
    const ny = ((i / 4 / size) | 0) / size;
    const armor = ny > 0.62 ? 1.15 : 0.12;
    let r = s[i] * bright + hue * 0.18 + cr[0] * clanT * armor;
    let g = s[i + 1] * bright + hue * 0.04 + cr[1] * clanT * armor;
    let b = s[i + 2] * bright - hue * 0.12 + cr[2] * clanT * armor;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    d[i + 3] = 255;
  }
  ctx.putImageData(dst, 0, 0);
}

function stampPortrait(ctx, size, g, bg) {
  const bits = portraitSeed(g);
  const r = bg ? (bits & 255) * 0.06 + bg[0] * 0.94 : (bits & 255) * 0.05;
  ctx.fillStyle = rgbStr(r, bg ? bg[1] : 18, bg ? bg[2] : 10);
  ctx.fillRect(size - 3, size - 3, 2, 2);
  if (bg) ctx.fillRect(1, size - 3, 2, 2);
}

function paintOilFeatures(ctx, size, rng, cx, faceY, faceW, faceH, turn, skin, hair, female, age) {
  const brow = shadeRgb(hair, age >= 54 ? 1.35 : 0.92);
  const browY = faceY - faceH * 0.28;
  const eY = faceY - faceH * 0.06;
  const nY = faceY + faceH * 0.12;
  const mY = faceY + faceH * 0.42;
  const lEye = cx - faceW * (0.34 - turn * 0.22);
  const rEye = cx + faceW * (0.34 + turn * 0.22);
  const lW = faceW * (turn > 0.12 ? 0.2 : 0.26);
  const rW = faceW * (turn < -0.12 ? 0.2 : 0.26);
  oilStroke(ctx, lEye, browY, lW, size * 0.012, 0.12 + turn * 0.2, brow, 0.88);
  oilStroke(ctx, rEye, browY, rW, size * 0.012, -0.12 + turn * 0.2, brow, 0.88);
  const white = [236, 226, 214];
  fillOval(ctx, lEye, eY, lW * 0.42, faceH * 0.09, white, 0.95);
  fillOval(ctx, rEye, eY, rW * 0.42, faceH * 0.09, white, 0.95);
  const iris = [42 + rng() * 18, 28, 18];
  fillOval(ctx, lEye + turn * 1.2, eY, size * 0.018, size * 0.02, iris, 1);
  fillOval(ctx, rEye + turn * 1.2, eY, size * 0.018, size * 0.02, iris, 1);
  fillOval(ctx, lEye + turn * 1.2, eY, size * 0.008, size * 0.009, [16, 10, 8], 1);
  fillOval(ctx, rEye + turn * 1.2, eY, size * 0.008, size * 0.009, [16, 10, 8], 1);
  fillOval(ctx, lEye - size * 0.006, eY - size * 0.005, size * 0.005, size * 0.004, [250, 246, 236], 0.8);
  fillOval(ctx, rEye - size * 0.006, eY - size * 0.005, size * 0.005, size * 0.004, [250, 246, 236], 0.8);
  oilStroke(ctx, lEye, eY - faceH * 0.07, lW * 0.5, size * 0.006, 0.08, shadeRgb(hair, 0.7), 0.7);
  oilStroke(ctx, rEye, eY - faceH * 0.07, rW * 0.5, size * 0.006, -0.08, shadeRgb(hair, 0.7), 0.7);
  const nose = shadeRgb(skin, 0.72);
  fillOval(ctx, cx + turn * faceW * 0.18, nY, size * 0.022, faceH * 0.16, nose, 0.55);
  fillOval(ctx, cx + turn * faceW * 0.28, nY + faceH * 0.08, size * 0.018, size * 0.014, shadeRgb(skin, 0.62), 0.45);
  fillOval(ctx, cx + turn * faceW * 0.08, nY - faceH * 0.04, size * 0.012, size * 0.03, mixRgb(skin, [255, 230, 196], 0.25), 0.4);
  const lip = female ? [156, 78, 72] : [124, 72, 62];
  fillOval(ctx, cx + turn * faceW * 0.06, mY, faceW * 0.22, size * 0.016, lip, 0.85);
  fillOval(ctx, cx + turn * faceW * 0.06, mY + size * 0.008, faceW * 0.18, size * 0.01, shadeRgb(lip, 0.78), 0.7);
  if (!female && rng() < 0.62) {
    oilFill(ctx, rng, cx + turn * faceW * 0.08, mY - faceH * 0.08, faceW * 0.38, size * 0.018, hair, 10, size * 0.02, size * 0.007, 0.05, 0.4, 0.7);
  }
  if (!female && rng() < 0.48) {
    oilFill(ctx, rng, cx + turn * faceW * 0.06, mY + faceH * 0.16, faceW * (0.22 + rng() * 0.22), faceH * (0.08 + rng() * 0.1), hair, 12, size * 0.018, size * 0.01, 0.2, 0.7, 0.65);
  }
}

function preloadOilBitmaps(done) {
  if (oilBitmapsReady) {
    done();
    return;
  }
  if (!preloadOilBitmaps.waiters) preloadOilBitmaps.waiters = [];
  preloadOilBitmaps.waiters.push(done);
  if (preloadOilBitmaps.started) return;
  preloadOilBitmaps.started = true;
  const files = [];
  const seen = {};
  Object.keys(PORTRAIT_NAMED).forEach((n) => {
    const f = PORTRAIT_NAMED[n];
    if (f && !seen[f]) {
      seen[f] = 1;
      files.push(f);
    }
  });
  PORTRAIT_STYLE_M.concat(PORTRAIT_STYLE_F).forEach((f) => {
    if (f && !seen[f]) {
      seen[f] = 1;
      files.push(f);
    }
  });
  for (let i = 0; i < NONFAMOUS_M_COUNT; i++) {
    const f = "p-nm-" + (i < 10 ? "0" + i : i) + ".jpg";
    if (!seen[f]) {
      seen[f] = 1;
      files.push(f);
    }
  }
  for (let i = 0; i < NONFAMOUS_F_COUNT; i++) {
    const f = "p-nf-" + (i < 10 ? "0" + i : i) + ".jpg";
    if (!seen[f]) {
      seen[f] = 1;
      files.push(f);
    }
  }
  const flush = () => {
    oilBitmapsReady = true;
    const q = preloadOilBitmaps.waiters || [];
    preloadOilBitmaps.waiters = [];
    q.forEach((fn) => fn());
  };
  if (!files.length) {
    flush();
    return;
  }
  let left = files.length;
  const finish = () => {
    left--;
    if (left <= 0) flush();
  };
  files.forEach((f) => {
    const img = new Image();
    img.onload = () => {
      oilBitmaps[f] = img;
      finish();
    };
    img.onerror = finish;
    img.src = "assets/portraits/" + f + "?v=58";
  });
}

function drawPaintedPortrait(ctx, g, size) {
  const rng = mulberry32(portraitSeed(g));
  const n = (lo, hi) => lo + rng() * (hi - lo);
  const female = isFemaleGen(g);
  const rare = !!(g && g.rare);
  const famous = isFamous(g);
  const namedFile = PORTRAIT_NAMED[g && g.name];
  const photo = namedFile && oilBitmaps[namedFile];
  if (photo && photo.naturalWidth) {
    drawOilPhoto(ctx, photo, size);
    oilifyCanvas(ctx, size, rng, famous || rare ? 280 : 220, 0.85);
    paintOilFrame(ctx, size, rare, famous);
    stampPortrait(ctx, size, g, null);
    return;
  }
  const sangoku = g && g.origin === "sangokushi";
  const guest = g && g.origin === "guest";
  const age = (g && g.age) || 0;
  const valor = (g && g.valor) || 50;
  const intellect = (g && g.intellect) || 50;
  const clan = parseHex(clanArmorColor(g && g.clanId));
  const armorBase = sangoku
    ? mixRgb(clan, [48, 92, 58], 0.42)
    : guest
      ? mixRgb(clan, [88, 42, 108], 0.38)
      : mixRgb(clan, [28, 18, 12], 0.18);
  const styleImg = pickStyleBitmap(g);
  if (styleImg) {
    drawOilPhoto(ctx, styleImg, size);
    oilifyCanvas(ctx, size, rng, famous || rare ? 90 : 70, 0.42);
    paintOilFrame(ctx, size, rare, famous);
    stampPortrait(ctx, size, g, armorBase);
    return;
  }
  const skins = [
    [214, 176, 138],
    [198, 158, 118],
    [186, 144, 108],
    [168, 126, 92],
    [222, 186, 150]
  ];
  const skin = skins[(rng() * skins.length) | 0];
  const hairSets = female
    ? [
        [28, 18, 12],
        [46, 28, 16],
        [16, 11, 9],
        [64, 38, 24]
      ]
    : [
        [14, 10, 8],
        [26, 18, 14],
        [10, 8, 7],
        [38, 28, 20]
      ];
  let hair = hairSets[(rng() * hairSets.length) | 0];
  if (age >= 54 || (intellect >= 88 && valor < 68 && rng() < 0.5)) {
    hair = mixRgb(hair, [176, 170, 158], 0.45 + rng() * 0.28);
  }
  const umber = sangoku ? [48, 30, 18] : guest ? [36, 22, 40] : [44, 28, 16];
  const bg = mixRgb(umber, armorBase, 0.08);
  ctx.fillStyle = rgbStr(bg[0], bg[1], bg[2]);
  ctx.fillRect(0, 0, size, size);
  const rich = famous || rare ? 1.4 : 1;
  for (let i = 0; i < 90 * rich; i++) {
    oilStroke(
      ctx,
      n(0, size),
      n(0, size),
      n(size * 0.05, size * 0.2),
      n(size * 0.014, size * 0.045),
      n(-0.5, 0.95),
      varyRgb(mixRgb(bg, [96, 62, 32], rng() * 0.4), rng, 16),
      n(0.1, 0.34)
    );
  }

  const turn = n(-0.28, 0.28);
  const cx = size * (0.5 + turn * 0.08);
  const faceW = size * (female ? n(0.27, 0.31) : n(0.29, 0.34));
  const faceH = size * n(0.36, 0.42);
  const faceY = size * (0.4 + n(-0.015, 0.02));
  const scholar = !female && intellect >= 80 && rng() < 0.32;
  const shY = size * 0.68;
  const cloth = female ? mixRgb(armorBase, [148, 46, 42], 0.5 + rng() * 0.28) : shadeRgb(armorBase, 0.55 + rng() * 0.2);
  const gold = [196, 160, 74];
  const shadow = shadeRgb(skin, 0.62);
  const hi = mixRgb(skin, [255, 228, 190], 0.28);

  ctx.fillStyle = rgbStr(cloth[0], cloth[1], cloth[2]);
  ctx.beginPath();
  ctx.moveTo(size * 0.02, size);
  ctx.quadraticCurveTo(size * 0.12, shY, cx - faceW * 1.15, shY + size * 0.04);
  ctx.lineTo(cx + faceW * 1.15, shY + size * 0.04);
  ctx.quadraticCurveTo(size * 0.88, shY, size * 0.98, size);
  ctx.closePath();
  ctx.fill();
  oilFill(ctx, rng, cx, shY + size * 0.18, size * 0.5, size * 0.26, shadeRgb(cloth, 0.78), 28 * rich, size * 0.08, size * 0.028, 0.08, 0.55, 0.5);
  oilFill(ctx, rng, cx + turn * size * 0.12, shY + size * 0.08, size * 0.38, size * 0.16, mixRgb(cloth, gold, 0.08), 22 * rich, size * 0.06, size * 0.02, 0.02, 0.45, 0.45);
  if (!female) {
    for (let r = 0; r < 5; r++) {
      const y = shY + size * (0.06 + r * 0.05);
      ctx.strokeStyle = rgbStr(gold[0], gold[1], gold[2]);
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = size * 0.012;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.28, y);
      ctx.quadraticCurveTo(cx, y + 2, cx + size * 0.28, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    fillOval(ctx, cx, shY + size * 0.12, size * 0.045, size * 0.045, gold, 0.7);
  } else {
    oilFill(ctx, rng, cx, shY + size * 0.04, size * 0.2, size * 0.05, mixRgb(cloth, [232, 210, 180], 0.35), 10, size * 0.04, size * 0.014, 0.1, 0.4, 0.5);
  }

  const neck = shadeRgb(skin, 0.76);
  fillOval(ctx, cx + turn * faceW * 0.1, faceY + faceH * 0.92, size * 0.08, size * 0.11, neck, 1);
  oilFill(ctx, rng, cx, faceY + faceH * 0.92, size * 0.08, size * 0.1, neck, 8, size * 0.028, size * 0.012, 1.15, 0.35, 0.5);

  fillOval(ctx, cx + turn * faceW * 0.05, faceY - faceH * (female ? 0.02 : 0.12), faceW * (female ? 1.42 : 1.18), faceH * (female ? 1.28 : 0.82), hair, 1);
  oilFill(ctx, rng, cx, faceY - faceH * 0.08, faceW * 1.2, faceH, hair, (female ? 32 : 20) * rich, size * 0.05, size * 0.018, 0.25, 0.8, 0.55);

  ctx.fillStyle = rgbStr(skin[0], skin[1], skin[2]);
  ctx.beginPath();
  ctx.ellipse(cx, faceY, faceW, faceH, turn * 0.12, 0, Math.PI * 2);
  ctx.fill();
  oilFill(ctx, rng, cx + turn * faceW * 0.15, faceY + faceH * 0.08, faceW * 0.7, faceH * 0.7, shadow, 12, size * 0.045, size * 0.02, 0.5, 0.55, 0.4);
  oilFill(ctx, rng, cx - turn * faceW * 0.2, faceY - faceH * 0.12, faceW * 0.5, faceH * 0.42, hi, 10, size * 0.032, size * 0.014, -0.2, 0.45, 0.42);
  oilFill(ctx, rng, cx, faceY, faceW * 0.85, faceH * 0.85, skin, 18 * rich, size * 0.04, size * 0.016, 0.25, 0.6, 0.35);

  fillOval(ctx, cx - faceW * (0.98 - turn * 0.15), faceY + faceH * 0.02, size * 0.032, size * 0.046, shadeRgb(skin, 0.88), 1);
  fillOval(ctx, cx + faceW * (0.98 + turn * 0.15), faceY + faceH * 0.02, size * 0.032, size * 0.046, shadeRgb(skin, 0.8), 1);

  if (female) {
    fillOval(ctx, cx, faceY - faceH * 0.55, faceW * 1.12, faceH * 0.46, hair, 1);
    oilFill(ctx, rng, cx, faceY - faceH * 0.52, faceW * 1.05, faceH * 0.4, hair, 14, size * 0.04, size * 0.015, 0.1, 0.6, 0.55);
    if (rng() < 0.5) fillOval(ctx, cx + faceW * 0.9, faceY - faceH * 0.12, size * 0.05, size * 0.055, [154, 42, 40], 0.85);
  } else if (scholar) {
    ctx.fillStyle = rgbStr(16, 12, 10);
    ctx.beginPath();
    ctx.moveTo(cx - faceW * 1.05, faceY - faceH * 0.42);
    ctx.quadraticCurveTo(cx, faceY - faceH * 1.22, cx + faceW * 1.05, faceY - faceH * 0.42);
    ctx.closePath();
    ctx.fill();
    oilFill(ctx, rng, cx, faceY - faceH * 0.62, faceW * 0.95, faceH * 0.4, [16, 12, 10], 12, size * 0.04, size * 0.014, 0.1, 0.4, 0.6);
  } else {
    fillOval(ctx, cx, faceY - faceH * 0.62, faceW * 1.02, faceH * 0.36, hair, 1);
    oilFill(ctx, rng, cx, faceY - faceH * 0.62, faceW * 0.95, faceH * 0.32, hair, 12, size * 0.036, size * 0.014, 0.12, 0.5, 0.55);
    fillOval(ctx, cx - turn * faceW * 0.15, faceY - faceH * 0.98, size * 0.07, size * 0.07, hair, 1);
    oilStroke(ctx, cx - turn * faceW * 0.35, faceY - faceH * 0.82, size * 0.05, size * 0.018, 0.9, mixRgb(hair, [70, 40, 90], 0.35), 0.7);
  }

  const featSeed = (portraitSeed(g) ^ 0xa5a5a5a5) >>> 0;
  paintOilFeatures(ctx, size, mulberry32(featSeed), cx, faceY, faceW, faceH, turn, skin, hair, female, age);
  oilifyCanvas(ctx, size, rng, famous || rare ? 200 : 160, 0.7);
  paintOilFeatures(ctx, size, mulberry32(featSeed), cx, faceY, faceW, faceH, turn, skin, hair, female, age);
  oilifyCanvas(ctx, size, rng, 70, 0.45);
  paintOilFrame(ctx, size, rare, famous);

  const bits = portraitSeed(g);
  ctx.fillStyle = rgbStr((bits & 255) * 0.06 + bg[0] * 0.94, bg[1], bg[2]);
  ctx.fillRect(size - 3, size - 3, 2, 2);
  ctx.fillRect(1, size - 3, 2, 2);
}

function portraitKey(g) {
  const age = (g && g.age) || 0;
  const band = age >= 58 ? "E" : age >= 44 ? "M" : "Y";
  return "oil12|" + String(portraitSeed(g)) + "|" + String((g && g.clanId) || "") + "|" + band + "|" + (isFamous(g) ? "F" : "n");
}

function portraitClass(g) {
  if (g && g.rare) return "portrait rare-port";
  if (isFamous(g)) return "portrait famous-port";
  return "portrait";
}

function portraitRim(g) {
  if (g && g.rare) return "#f0d078";
  if (isFamous(g)) return "#e6c36a";
  return clanArmorColor(g && g.clanId) || "#c4a056";
}

function portraitPayload(g) {
  return {
    name: g.name,
    id: g.id || "",
    gender: g.gender || "",
    origin: g.origin || "",
    rare: !!(g && g.rare),
    clanId: g.clanId || "",
    valor: g.valor || 0,
    intellect: g.intellect || 0,
    age: g.age || 0
  };
}

function portraitHTML(g) {
  if (!g) return "";
  const name = String(g.name || "武将").replace(/[&<>"]/g, "");
  const cls = portraitClass(g);
  const rim = portraitRim(g);
  const key = portraitKey(g);
  if (portraitCache[key]) {
    return (
      '<img class="' +
      cls +
      '" src="' +
      portraitCache[key] +
      '" width="44" height="44" alt="' +
      name +
      'の肖像" style="box-shadow:0 0 0 1.5px ' +
      rim +
      '">'
    );
  }
  return (
    '<canvas class="' +
    cls +
    ' js-port" width="128" height="128" data-pk="' +
    key.replace(/"/g, "") +
    '" data-g="' +
    encodeURIComponent(JSON.stringify(portraitPayload(g))) +
    '" style="box-shadow:0 0 0 1.5px ' +
    rim +
    '"></canvas>'
  );
}

function paintQueuedPortraits() {
  const nodes = document.querySelectorAll("canvas.js-port");
  if (!nodes.length) return;
  preloadOilBitmaps(() => {
    let i = 0;
    const paintOne = (cv) => {
      if (!cv || !cv.getContext) return;
      let g = null;
      try {
        g = JSON.parse(decodeURIComponent(cv.getAttribute("data-g") || "%7B%7D"));
      } catch (e) {}
      if (!g) return;
      drawPaintedPortrait(cv.getContext("2d"), g, cv.width);
      const key = cv.getAttribute("data-pk") || portraitKey(g);
      let url = "";
      try {
        url = cv.toDataURL("image/jpeg", 0.88);
        if (key) portraitCache[key] = url;
      } catch (e) {}
      if (url && cv.parentNode) {
        const img = document.createElement("img");
        img.className = cv.className.replace("js-port", "").replace(/\s+/g, " ").trim();
        img.src = url;
        img.width = 44;
        img.height = 44;
        img.alt = String(g.name || "武将") + "の肖像";
        img.style.cssText = cv.getAttribute("style") || "";
        cv.parentNode.replaceChild(img, cv);
      } else {
        cv.classList.remove("js-port");
      }
    };
    const first = Math.min(nodes.length, 24);
    while (i < first) paintOne(nodes[i++]);
    const run = () => {
      const t0 = typeof performance !== "undefined" ? performance.now() : 0;
      while (i < nodes.length) {
        paintOne(nodes[i++]);
        if (typeof performance !== "undefined" && performance.now() - t0 > 12) break;
      }
      if (i < nodes.length) requestAnimationFrame(run);
    };
    if (i < nodes.length) requestAnimationFrame(run);
  });
}

function resIcon(key) {
  const r = D().resources.find((x) => x.key === key);
  return r ? r.img : D().images.castle;
}

function catalogGenerals() {
  const names = {};
  D().clans.forEach((c) => {
    names[c.id] = c.name;
  });
  const list = [];
  (D().historical || []).forEach((h) => {
    list.push({
      name: h[0],
      clanId: h[1],
      house: names[h[1]] || "",
      leadership: h[2],
      valor: h[3],
      intellect: h[4],
      politics: h[5],
      charm: h[6],
      gender: "m",
      rare: false,
      origin: "sengoku"
    });
  });
  (D().famousDaughters || []).forEach((d) => {
    list.push({
      name: d.name,
      clanId: d.clanId,
      house: names[d.clanId] || "",
      leadership: d.leadership,
      valor: d.valor,
      intellect: d.intellect,
      politics: d.politics,
      charm: d.charm,
      gender: "f",
      rare: false,
      origin: "sengoku"
    });
  });
  list.sort((a, b) => (a.house || "").localeCompare(b.house, "ja") || (b.leadership || 0) - (a.leadership || 0));
  return list;
}

function rosterFiltered() {
  const q = (ui.rosterQuery || "").trim();
  const house = ui.rosterHouse || "";
  return catalogGenerals().filter((g) => {
    if (house && g.clanId !== house) return false;
    if (q && g.name.indexOf(q) < 0 && (g.house || "").indexOf(q) < 0) return false;
    return true;
  });
}

function rosterHouseOptions() {
  const seen = {};
  const opts = [{ id: "", name: "すべての家" }];
  catalogGenerals().forEach((g) => {
    if (g.clanId && !seen[g.clanId]) {
      seen[g.clanId] = 1;
      opts.push({ id: g.clanId, name: g.house || g.clanId });
    }
  });
  opts.sort((a, b) => (!a.id ? -1 : !b.id ? 1 : a.name.localeCompare(b.name, "ja")));
  return opts;
}

function rosterListHtml() {
  const list = rosterFiltered();
  if (!list.length) return '<div class="tiny">該当する武将はいない。</div>';
  return list
    .map((g) => {
      return (
        '<div class="gen">' +
        '<span class="gen-icon">' +
        portraitHTML(g) +
        "</span>" +
        "<div class=\"gen-body\"><b>" +
        (g.gender === "f" ? "姫　" : "") +
        g.name +
        "</b><div class=\"tiny\">" +
        (g.house || "浪人") +
        "</div><div class=\"tiny\">統" +
        g.leadership +
        " 武" +
        g.valor +
        " 知" +
        g.intellect +
        " 政" +
        g.politics +
        " 魅" +
        g.charm +
        "</div></div></div>"
      );
    })
    .join("");
}

function renderTitle() {
  const saved = E().hasSave();
  const houseOpts = rosterHouseOptions()
    .map(
      (o) =>
        "<option value=\"" +
        o.id +
        "\"" +
        (ui.rosterHouse === o.id ? " selected" : "") +
        ">" +
        o.name +
        "</option>"
    )
    .join("");
  return (
    '<div class="screen" style="--title-img:url(\'assets/castle.jpg\')">' +
    '<div class="title-wrap">' +
    '<img class="crest" src="assets/battle.png" alt="長篠の戦い図屏風">' +
    " <h1 class=\"game-title\">群雄覇業</h1>" +
    '<p class="game-sub">六十余州制覇</p>' +
    '<div class="panel" style="text-align:left">' +
    '<div class="row">' +
    '<label class="field">人数（1〜6）<select id="pc">' +
    [1, 2, 3, 4, 5, 6].map((n) => "<option" + (ui.playerCount === n ? " selected" : "") + ">" + n + "</option>").join("") +
    "</select></label>" +
    '<label class="field">1期の時間<select id="tm">' +
    [
      [600000, "10分（本則）"],
      [180000, "3分"],
      [60000, "1分"],
      [30000, "30秒"],
      [10000, "10秒（試遊）"]
    ]
      .map((x) => "<option value=\"" + x[0] + "\"" + (ui.turnMs === x[0] ? " selected" : "") + ">" + x[1] + "</option>")
      .join("") +
    "</select></label>" +
    "</div>" +
    '<div class="player-reg">' +
    '<div class="row">' +
    '<label class="field grow">プレイヤー名で登録<input id="reg-name" maxlength="16" placeholder="例：織田の者" value="' +
    (ui.regName || "").replace(/"/g, "&quot;") +
    '"></label>' +
    '<button class="btn gold" id="btn-reg">登録</button>' +
    "</div>" +
    (ui.regMsg ? '<p class="tiny reg-msg">' + ui.regMsg + "</p>" : '<p class="tiny">登録した名は席で選べ、戦績に残る（最大' + D().MAX_RECORD_PLAYERS + "名）。</p>") +
    "</div>" +
    '<div class="setup-grid" id="psetup"></div>' +
    '<div class="row" style="margin-top:12px;justify-content:center">' +
    (saved ? '<button class="btn gold" id="btn-continue">続きから</button>' : "") +
    '<button class="btn gold" id="btn-start">開戦</button>' +
    '<button class="btn ghost" id="btn-help">遊び方</button>' +
    '<button class="btn ghost" id="btn-records">戦績</button>' +
    '<button class="btn ghost" id="btn-roster">武将一覧</button>' +
    "</div></div>" +
    '<div class="panel title-roster" id="title-roster">' +
    " <h2>武将一覧</h2>" +
    '<div class="row">' +
    '<input class="search" id="roster-q" placeholder="名や家で探す" value="' +
    (ui.rosterQuery || "").replace(/"/g, "&quot;") +
    '">' +
    '<label class="field">家<select id="roster-house">' +
    houseOpts +
    "</select></label>" +
    "</div>" +
    '<div class="gen-list title-gen-list" id="roster-list">' +
    rosterListHtml() +
    "</div></div>" +
    '<p class="tiny" style="margin-top:18px">画像は Wikimedia Commons のパブリックドメイン／CC作品を使用。城・米・甲冑・小判・長篠図屏風など。</p>' +
    "</div></div>"
  );
}

function playableClans() {
  return D().clans.filter((c) => c.playable);
}

function ensureSeats() {
  const playable = playableClans();
  const n = D().SEAT_COUNT || 6;
  const ord = ["一", "二", "三", "四", "五", "六"];
  const seats = [];
  const usedClan = new Set();
  const usedStart = new Set();
  for (let i = 0; i < n; i++) {
    const prev = (ui.setupPlayers || [])[i] || {};
    const isHuman = i < ui.playerCount;
    let clanId = prev.clanId;
    if (!clanId || usedClan.has(clanId)) {
      const free = playable.find((c) => !usedClan.has(c.id));
      clanId = free ? free.id : playable[i % playable.length].id;
    }
    usedClan.add(clanId);
    const clan = D().clans.find((c) => c.id === clanId);
    let start = prev.startProvince || (clan && clan.home);
    if (!start || usedStart.has(start)) start = clan && clan.home;
    if (!start || usedStart.has(start)) {
      const freeP = D().provinces.find((p) => !usedStart.has(p.id));
      start = freeP ? freeP.id : D().provinces[i].id;
    }
    usedStart.add(start);
    const humanName = "第" + ord[i] + "の君主";
    const pcName = "PC・" + (clan ? clan.name : "群雄");
    let name = prev.name || (isHuman ? humanName : pcName);
    if (isHuman && String(name).indexOf("PC・") === 0) name = humanName;
    if (!isHuman) name = pcName;
    seats.push({ name, clanId, startProvince: start, ai: !isHuman });
  }
  ui.setupPlayers = seats;
}

function renderSetupPlayers() {
  ensureSeats();
  const playable = playableClans();
  const used = ui.setupPlayers.map((p) => p.clanId);
  const usedStart = ui.setupPlayers.map((p) => p.startProvince);
  const box = $("#psetup");
  if (!box) return;
  const hall = E().loadHall();
  const names = (hall.players || []).map((p) => p.name);
  const datalist =
    '<datalist id="plist">' +
    names.map((n) => "<option value=\"" + n.replace(/"/g, "&quot;") + "\"></option>").join("") +
    "</datalist>";
  box.innerHTML =
    datalist +
    ui.setupPlayers
    .map((p, i) => {
      const clanOpts = playable
        .map((c) => {
          const taken = used.includes(c.id) && c.id !== p.clanId;
          return (
            "<option value=\"" +
            c.id +
            "\"" +
            (c.id === p.clanId ? " selected" : "") +
            (taken ? " disabled" : "") +
            ">" +
            c.name +
            "</option>"
          );
        })
        .join("");
      const startOpts = D()
        .provinces.map((pr) => {
          const taken = usedStart.includes(pr.id) && pr.id !== p.startProvince;
          return (
            "<option value=\"" +
            pr.id +
            "\"" +
            (pr.id === p.startProvince ? " selected" : "") +
            (taken ? " disabled" : "") +
            ">" +
            pr.name +
            "（" +
            pr.region +
            "）</option>"
          );
        })
        .join("");
      return (
        '<div class="player-card' +
        (p.ai ? " pc" : "") +
        '"><div class="tiny">第' +
        (i + 1) +
        "席<br>" +
        (p.ai ? "PC" : "人間") +
        "</div>" +
        '<label class="field">プレイヤー名<input data-i="' +
        i +
        '" class="pname" list="plist" maxlength="16" value="' +
        (p.name || "").replace(/"/g, "&quot;") +
        '"' +
        (p.ai ? " readonly" : "") +
        "></label>" +
        '<label class="field">家<select data-i="' +
        i +
        '" class="pclan">' +
        clanOpts +
        "</select></label>" +
        '<label class="field">開始する国<select data-i="' +
        i +
        '" class="pstart">' +
        startOpts +
        "</select></label></div>"
      );
    })
    .join("");
}

function renderHelp() {
  return (
    '<div class="modal-bg" id="help-bg"><div class="modal" role="dialog" aria-labelledby="help-title">' +
    '<div class="modal-head"><h2 id="help-title">遊び方</h2>' +
    '<button class="btn ghost" type="button" data-close="help" aria-label="閉じる">閉じる</button></div>' +
    '<img class="hero" src="assets/castle2.jpg" alt="姫路城">' +
    '<div class="body">' +
    "<p>令制国66（六十余州）を舞台に、1〜6人で争う。開始時に選べる家は24。各家の始めの武将は6名。6人に満たない席はPCが代行する。勝利は国土の60％支配のみ。文化度は勝利条件ではなく、高いほどお恵み・来訪・お宝が寄りやすく、天災は避けやすい。</p>" +
    "<ul>" +
    "<li>プレイヤー名で登録できる。同じ名は重複して登録できない。席では登録済みの名を選べる。戦績は最大50名、各100件。</li>" +
    "<li>開始時に家と、開始する国を選べる。</li>" +
    "<li>1期は最大10分。全員が「今期確定」すれば、時間を待たずに進む。</li>" +
    "<li>方針は内政・外交・戦争・特殊・文化の5系統、各15。1期に3つまで。</li>" +
    "<li>方針と兵士の解説は一覧に出さない。右クリック、または長押しでHelpを開く。上部の兵士ワクを同じく右クリック／長押しすると、兵種の内訳が出る。</li>" +
    "<li>100期先まで予約できる。空欄をお任せにすれば、家臣が方針を代行する。お任せは一つ消せば空欄になり、新しい方針を入れられる。全削除もできる。お任せで満杯の期に後から予約すると、お任せを上書きする。</li>" +
    "<li>未婚の姫を縁組し、長い婚姻の盟を結べる。</li>" +
    "<li>すべてを捨てて放浪できる。そのときは敗北となる。</li>" +
    "<li>武将は内政・軍事・文化へ配属できる。配属中は能力が上がり、適性に応じて成長する。武将帳から自領へ駐在を選べる。駐在している領地は守り・農・商がやや上がる。各武将の「紹介」で来歴が読める。</li>" +
    "<li>能力は信長の野望に倣い、統率・武勇・知略・政治・魅力に義理と野心を添える。</li>" +
    "<li>家中は初め6名。探索、来訪、戦争の捕虜、引き抜き、浪人登用で増える。</li>" +
    "<li>お宝は装備品、内政の使い捨て道具、永続の家宝がある。蔵帳から使う。</li>" +
    "<li>地図は現代の日本列島の輪郭に合わせた六十余州図。領に合わせると、国名・領主・規模など表向きの情報が分かる。</li>" +
    "<li>城の守り・兵数・金米など内情は、忍者派遣・密偵・諜報で探る。密報は十期ほど地図に残る。</li>" +
    "<li>天災・お恵み・天才来訪・お宝は低確率。文化度が高い家ほど、お恵み・来訪・お宝へ傾く。</li>" +
    "<li>ブラウザを閉じても時は進む。不在のあいだに勝敗が決まったときは、次に開いたときに報告し、戦績にも残る。</li>" +
    "<li>期が来て方針が空なら、スキップせず家臣がお任せで動く。</li>" +
    "<li>天災・お恵み・人材発見など、通知は「承知」で消すか、5秒で自動で閉じる。戦争終了の順位窓だけは、承知を押すまで消えない。</li>" +
    "<li>勝者が決まると祝勝利の儀を行い、参加した六家の一位から六位までを発表して戦績に残す。戦争終了を押せば、その時点の国土と文化度で順位を定めて乱世を閉じる。</li>" +
    "<li>兵士は足軽・騎馬兵・弓兵・鉄砲兵・盾もちの五種。金米と強さが違い、戦いでは相性がある。兵士のワクを右クリック、または長押しすると内訳が出る。</li>" +
    "<li>資本は米・お金・土地・兵士・民衆・文化度。</li>" +
    "</ul>" +
    "</div>" +
    '<div class="modal-foot"><button class="btn gold" type="button" data-close="help">閉じる</button></div>' +
    "</div></div>"
  );
}

function cmdHelpBody(id) {
  const found = E().findCmd(id);
  if (!found) return "<p>方針の解説がない。</p>";
  const c = found.def;
  const cost = c.cost || {};
  const cs = [cost.gold ? "金" + cost.gold : "", cost.rice ? "米" + cost.rice : ""].filter(Boolean).join("　");
  const tgt =
    c.target === "province" ? "地図上の国をクリックして対象にする。" : c.target === "clan" ? "相手の家を選ぶ。" : "対象は不要。";
  const cat = (D().catLabels && D().catLabels[found.cat]) || found.cat;
  let extra = "";
  if (found.cat === "culture") extra += "<p>文化度は一度で大きくは動かない。高く積もるほどお恵み・来訪・お宝が寄りやすく、天災は避けやすい。勝利条件ではない。</p>";
  if (c.soldiers) extra += "<p>出兵数と兵種を指定し、隣接する敵領へ向かう。</p>";
  if (c.unit) extra += "<p>兵種を選ぶ。追加の金米と募れる人数は兵種で異なる。</p>";
  if (c.soldiers || c.unit) {
    extra +=
      "<p>相性：足軽は弓に強く騎馬に弱い。騎馬は足軽・弓に強く鉄砲・盾もちに弱い。弓は足軽・鉄砲に強く騎馬・盾もちに弱い。鉄砲は騎馬・盾もちに強く弓に弱い。盾もちは弓・足軽に強く鉄砲・騎馬に弱い。</p>";
  }
  if (c.id === "dip-konin") extra += "<p>未婚の姫を担当に選び、相手家へ輿入れさせる。</p>";
  if (c.id === "sp-tansaku" || c.id === "sp-ronin" || c.id === "dip-hikinuki") extra += "<p>家中は始め6名。この方針で士を増やせる。</p>";
  return (
    '<p class="tiny">' +
    cat +
    "</p><p>" +
    c.desc +
    "</p><p>費用：" +
    (cs || "なし") +
    "</p><p>" +
    tgt +
    "</p>" +
    extra
  );
}

function renderCmdHelp() {
  const found = E().findCmd(ui.cmdHelp);
  const title = found ? found.def.name : "方針";
  return (
    '<div class="modal-bg" id="cmdhelp-bg"><div class="modal" role="dialog" aria-labelledby="cmdhelp-title">' +
    '<div class="modal-head"><h2 id="cmdhelp-title">' +
    title +
    '</h2><button class="btn ghost" type="button" data-close="cmdhelp" aria-label="閉じる">閉じる</button></div>' +
    '<div class="body cmdhelp-body">' +
    cmdHelpBody(ui.cmdHelp) +
    "</div>" +
    '<div class="modal-foot"><button class="btn gold" type="button" data-close="cmdhelp">閉じる</button></div>' +
    "</div></div>"
  );
}

function troopById(id) {
  return (D().troopTypes || []).find((t) => t.id === id) || null;
}

function matchTag(m) {
  if (m >= 1.2) return "有利";
  if (m <= 0.8) return "不利";
  return "互角";
}

function troopHelpBody(id) {
  const t = troopById(id);
  if (!t) return "<p>兵士の解説がない。</p>";
  const clan = myClan();
  const n = clan && clan.troops ? clan.troops[t.id] || 0 : 0;
  const types = D().troopTypes || [];
  const row = (D().troopMatch || {})[t.id] || {};
  const vs = types
    .map((o) => {
      const m = row[o.id];
      if (m == null) return "";
      return o.name + "に" + matchTag(m) + "（" + m + "）";
    })
    .filter(Boolean)
    .join("、");
  const cost =
    (t.gold ? "金+" + t.gold : "金+0") +
    "　" +
    (t.rice ? "米+" + t.rice : "米+0") +
    "　一度に" +
    t.recruit;
  return (
    "<p>" +
    t.desc +
    "</p><p>いまの人数：" +
    fmt(n) +
    "</p><p>攻撃 " +
    t.atk +
    "　防御 " +
    t.def +
    "　維持 " +
    t.upkeep +
    "</p><p>募兵：" +
    cost +
    "</p><p>相性：" +
    vs +
    "</p>"
  );
}

function troopBreakBody() {
  const clan = myClan();
  const types = D().troopTypes || [];
  const total = types.reduce((s, t) => s + (clan && clan.troops ? clan.troops[t.id] || 0 : 0), 0);
  const rows = types
    .map((t) => {
      const n = clan && clan.troops ? clan.troops[t.id] || 0 : 0;
      const pct = total ? Math.round((n * 1000) / total) / 10 : 0;
      return (
        '<div class="troop-break-row"><b>' +
        t.name +
        "</b> " +
        fmt(n) +
        "（" +
        pct +
        "%）<div class=\"tiny\">" +
        t.desc +
        "　攻" +
        t.atk +
        " 防" +
        t.def +
        " 維持" +
        t.upkeep +
        "</div></div>"
      );
    })
    .join("");
  return rows + "<p>合計 " + fmt(total) + (clan ? "／兵 " + fmt(clan.soldiers || 0) : "") + "</p>";
}

function renderTroopHelp() {
  const all = ui.troopHelp === "all";
  const t = all ? null : troopById(ui.troopHelp);
  const title = all ? "兵種の内訳" : t ? t.name : "兵士";
  return (
    '<div class="modal-bg" id="troophelp-bg"><div class="modal" role="dialog" aria-labelledby="troophelp-title">' +
    '<div class="modal-head"><h2 id="troophelp-title">' +
    title +
    '</h2><button class="btn ghost" type="button" data-close="troophelp" aria-label="閉じる">閉じる</button></div>' +
    '<div class="body cmdhelp-body">' +
    (all ? troopBreakBody() : troopHelpBody(ui.troopHelp)) +
    "</div>" +
    '<div class="modal-foot"><button class="btn gold" type="button" data-close="troophelp">閉じる</button></div>' +
    "</div></div>"
  );
}

function renderGenIntro() {
  const g = state && ui.genIntro ? state.generals.find((x) => x.id === ui.genIntro) : null;
  const intro = E().generalIntro(state, g);
  const house = g && g.clanId && state.clanById[g.clanId] ? state.clanById[g.clanId].name : "浪人";
  const posts = D().postLabels;
  const stats = g
    ? '<div class="tiny">統' +
      E().statOf(g, "leadership") +
      " 武" +
      E().statOf(g, "valor") +
      " 知" +
      E().statOf(g, "intellect") +
      " 政" +
      E().statOf(g, "politics") +
      " 魅" +
      E().statOf(g, "charm") +
      "　齢" +
      g.age +
      (g.skill ? "　" + g.skill : "") +
      "</div>"
    : "";
  return (
    '<div class="modal-bg over" id="intro-bg" data-gid="' +
    (g ? g.id : "") +
    '"><div class="modal" role="dialog" aria-labelledby="intro-title">' +
    '<div class="modal-head"><h2 id="intro-title">武将紹介</h2>' +
    '<button class="btn ghost" type="button" data-close="intro" aria-label="閉じる">閉じる</button></div>' +
    '<div class="body cmdhelp-body intro-body">' +
    (g ? '<div class="intro-head"><span class="gen-icon">' + portraitHTML(g) + "</span><div><b class=\"" + (g.rare ? "rare" : "") + "\">" + (g.rare ? "★レア　" : "") + (g.gender === "f" ? "姫　" : "") + g.name + "</b><div class=\"tiny\">" + house + "　" + (posts[g.post] || "未配属") + "</div>" + stats + "</div></div>" : "") +
    "<p>" +
    (intro.text || "") +
    "</p></div>" +
    '<div class="modal-foot"><button class="btn gold" type="button" data-close="intro">閉じる</button></div>' +
    "</div></div>"
  );
}

function moveMapTip(e) {
  const wrap = $("#map");
  const tip = $("#map-tip");
  if (!wrap || !tip || tip.hidden) return;
  const box = wrap.getBoundingClientRect();
  let x = e.clientX - box.left + 14;
  let y = e.clientY - box.top + 14;
  const tw = tip.offsetWidth || 200;
  const th = tip.offsetHeight || 120;
  if (x + tw > box.width - 8) x = Math.max(8, box.width - tw - 8);
  if (y + th > box.height - 8) y = Math.max(8, e.clientY - box.top - th - 10);
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}

function mapTipHtml(pid) {
  const p = state.provById[pid];
  if (!p) return "";
  const clan = myClan();
  const v = E().intelView(state, clan, p);
  const ownerName = v.owner ? v.owner.name : "無主";
  const rel = v.own ? "自領" : v.allied ? "同盟" : v.war ? "交戦" : v.adj ? "隣接" : "遠国";
  const hide = '<span class="unk">不明</span>';
  const age = (ok, n) => (ok && n > 0 ? '<div class="tiny">密報は' + n + "期前</div>" : "");
  let body = "";
  if (v.own) {
    const mods = E().provMods(state, p);
    const stLine =
      mods.names && mods.names.length
        ? '<div class="tiny">駐在 ' +
          mods.names.join("、") +
          "（守り+" +
          mods.fort +
          " 農+" +
          mods.agri +
          " 商+" +
          mods.commerce +
          "）</div>"
        : "";
    body =
      "<div>守り " +
      E().provStat(state, p, "fort") +
      "　民衆 " +
      fmt(p.pop) +
      "　動揺 " +
      Math.floor(p.unrest) +
      "</div><div>農 " +
      E().provStat(state, p, "agri") +
      "　商 " +
      E().provStat(state, p, "commerce") +
      "</div><div>金 " +
      fmt(clan.gold) +
      "　米 " +
      fmt(clan.rice) +
      "　兵 " +
      fmt(clan.soldiers) +
      "</div>" +
      '<div class="tiny">' +
      troopMini(clan) +
      "</div>" +
      stLine;
  } else {
    const fort = v.piOk && v.pi ? "守り " + v.pi.fort : "守り " + hide;
    const pop = v.piOk && v.pi ? "民衆 " + fmt(v.pi.pop) : "民衆 " + hide;
    const unrest = v.piOk && v.pi ? "動揺 " + Math.floor(v.pi.unrest) : "動揺 " + hide;
    const agri = v.piOk && v.pi ? "農 " + v.pi.agri : "農 " + hide;
    const com = v.piOk && v.pi ? "商 " + v.pi.commerce : "商 " + hide;
    const gold = v.ciOk && v.ci ? "金 " + fmt(v.ci.gold) : "金 " + hide;
    const rice = v.ciOk && v.ci ? "米 " + fmt(v.ci.rice) : "米 " + hide;
    const sol = v.ciOk && v.ci ? "兵 " + fmt(v.ci.soldiers) : "兵 " + hide;
    const troopLine = v.ciOk && v.ci && v.ci.troops ? '<div class="tiny">' + troopMini(null, v.ci) + "</div>" : "";
    const needSpy = !(v.piOk || v.ciOk);
    body =
      "<div>" +
      fort +
      "　" +
      pop +
      "　" +
      unrest +
      "</div><div>" +
      agri +
      "　" +
      com +
      "</div><div>" +
      gold +
      "　" +
      rice +
      "　" +
      sol +
      "</div>" +
      troopLine +
      age(v.piOk, v.piAge) +
      age(v.ciOk && !v.piOk, v.ciAge) +
      (needSpy ? '<div class="unk">詳細は忍者・密偵・諜報で探れ。</div>' : "");
  }
  return (
    "<b>" +
    p.name +
    "</b>（" +
    p.region +
    "）<div>領主 " +
    ownerName +
    "　" +
    rel +
    "</div><div>規模 " +
    v.size +
    (v.own ? "（石高" + p.land + "）" : "") +
    "</div>" +
    body
  );
}

function clipHalf(poly, mx, my, dx, dy) {
  const inside = (p) => (p[0] - mx) * dx + (p[1] - my) * dy <= 0.2;
  const hit = (a, b) => {
    const a0 = (a[0] - mx) * dx + (a[1] - my) * dy;
    const b0 = (b[0] - mx) * dx + (b[1] - my) * dy;
    const t = a0 / (a0 - b0 || 1e-6);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia && ib) out.push(b);
    else if (ia && !ib) out.push(hit(a, b));
    else if (!ia && ib) {
      out.push(hit(a, b));
      out.push(b);
    }
  }
  return out;
}

function voronoiCell(site, sites) {
  let poly = [
    [0, 0],
    [900, 0],
    [900, 640],
    [0, 640]
  ];
  sites.forEach((other) => {
    if (other.id === site.id) return;
    const dx = other.x - site.x;
    const dy = other.y - site.y;
    if (!dx && !dy) return;
    poly = clipHalf(poly, (site.x + other.x) / 2, (site.y + other.y) / 2, dx, dy);
  });
  return poly;
}

function polyPath(poly) {
  if (!poly || poly.length < 3) return "";
  return (
    "M" +
    poly
      .map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1))
      .join("L") +
    "Z"
  );
}

function islandPath(e) {
  if (!e) return "";
  return (
    "M" +
    (e.cx - e.rx) +
    " " +
    e.cy +
    "a" +
    e.rx +
    " " +
    e.ry +
    " 0 1 0 " +
    e.rx * 2 +
    " 0a" +
    e.rx +
    " " +
    e.ry +
    " 0 1 0 " +
    -e.rx * 2 +
    " 0"
  );
}

function landD(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return islandPath(v);
}

function mapGroup(id) {
  if (id === "sado" || id === "oki" || id === "awaji") return "isle";
  if (
    id === "buzen" ||
    id === "bungo" ||
    id === "chikuzen" ||
    id === "chikugo" ||
    id === "hizen" ||
    id === "higo" ||
    id === "hyuga" ||
    id === "osumi" ||
    id === "satsuma"
  )
    return "kyushu";
  if (id === "awa_shikoku" || id === "sanuki" || id === "iyo" || id === "tosa") return "shikoku";
  return "honshu";
}

function mapSVG() {
  const clan = myClan();
  const land = D().japanLand || {};
  const byGroup = { honshu: [], kyushu: [], shikoku: [] };
  state.provinces.forEach((p) => {
    const g = mapGroup(p.id);
    if (byGroup[g]) byGroup[g].push(p);
  });
  const otherKunis = [];
  const mineKunis = [];
  const otherMarks = [];
  const mineMarks = [];
  const mineNames = [];
  state.provinces.forEach((p) => {
    const c = state.clanById[p.owner];
    const col = c ? c.color : "#5a4630";
    const sel = ui.targetProvince === p.id ? " sel" : "";
    const mine = !!(clan && p.owner === clan.id);
    const isHome = mine && clan && p.id === clan.home;
    const s = (0.85 + p.land * 0.12).toFixed(2);
    const g = mapGroup(p.id);
    let region = "";
    let clip = "jp-honshu";
    if (g === "isle" && land[p.id]) {
      region = landD(land[p.id]);
      clip = "jp-" + p.id;
    } else {
      region = polyPath(voronoiCell(p, byGroup[g] || byGroup.honshu));
      clip = "jp-" + g;
    }
    if (!region) {
      region = "M" + p.x + " " + (p.y - 22) + "a22 22 0 1 1 0.1 0Z";
    }
    const kuniEl =
      '<g data-pid="' +
      p.id +
      '" class="pg' +
      (mine ? " own" : "") +
      '">' +
      '<path class="kuni' +
      sel +
      (mine ? " mine" : "") +
      (isHome ? " home" : "") +
      '" clip-path="url(#' +
      clip +
      ')" d="' +
      region +
      '" fill="' +
      col +
      '"/>' +
      (mine
        ? '<path class="kuni-hatch" clip-path="url(#' +
          clip +
          ')" d="' +
          region +
          '" fill="url(#ownHatch)"/>'
        : "") +
      "</g>";
    const markEl =
      '<g class="castle' +
      sel +
      (mine ? " mine" : "") +
      (isHome ? " home" : "") +
      '" transform="translate(' +
      p.x +
      "," +
      p.y +
      ") scale(" +
      s +
      ')">' +
      (mine
        ? '<circle class="own-ring' +
          (isHome ? " home" : "") +
          '" r="' +
          (isHome ? 17 : 14) +
          '" cx="0" cy="0"/>'
        : "") +
      '<path d="M-9 7 L-9 -1 L-6 -1 L-6 -5 L-2 -5 L-2 -1 L2 -1 L2 -8 L6 -8 L6 -1 L9 -1 L9 7 Z" fill="' +
      col +
      '" />' +
      (mine ? '<text class="own-tag" x="0" y="-12">' + (isHome ? "本" : "自") + "</text>" : "") +
      (function () {
        const st = E().stationedAt(state, p.id);
        return st && st.length
          ? '<text class="station-tag" x="12" y="-8">駐' + st.length + "</text>"
          : "";
      })() +
      "</g>" +
      '<text class="prov-label' +
      (mine ? " mine" : "") +
      '" x="' +
      p.x +
      '" y="' +
      (p.y + 20) +
      '">' +
      p.name +
      "</text>";
    if (mine) {
      mineKunis.push(kuniEl);
      mineMarks.push(markEl);
      mineNames.push(p.name + (isHome ? "（本拠）" : ""));
    } else {
      otherKunis.push(kuniEl);
      otherMarks.push(markEl);
    }
  });
  const kunis = otherKunis.concat(mineKunis);
  const marks = otherMarks.concat(mineMarks);
  const share = clan ? E().landShare(state, clan.id) : 0;
  const landKeys = ["honshu", "kyushu", "shikoku", "sado", "awaji", "oki", "tsushima", "iki", "shodo", "amakusa"];
  function clipPathEl(id, inner) {
    return inner ? '<clipPath id="' + id + '">' + inner + "</clipPath>" : "";
  }
  const landClips =
    clipPathEl("jp-honshu", landD(land.honshu) ? '<path d="' + landD(land.honshu) + '"/>' : "") +
    clipPathEl("jp-kyushu", landD(land.kyushu) ? '<path d="' + landD(land.kyushu) + '"/>' : "") +
    clipPathEl("jp-shikoku", landD(land.shikoku) ? '<path d="' + landD(land.shikoku) + '"/>' : "") +
    ["sado", "oki", "awaji"]
      .map((k) => {
        const d = landD(land[k]);
        return d ? clipPathEl("jp-" + k, '<path d="' + d + '"/>') : "";
      })
      .join("");
  const landDraw = landKeys
    .map((k) => {
      const d = landD(land[k]);
      return d ? '<path class="japan-land" d="' + d + '" fill="url(#landg)"/>' : "";
    })
    .join("");
  return (
    '<svg viewBox="0 0 900 640" role="img" aria-label="戦国時代の六十余州図">' +
    "<defs>" +
    '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#1e3a4a"/><stop offset="1" stop-color="#102028"/></linearGradient>' +
    '<linearGradient id="landg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#d8c49a"/><stop offset="1" stop-color="#b89a6a"/></linearGradient>' +
    '<pattern id="ownHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">' +
    '<rect width="9" height="9" fill="none"/>' +
    '<path d="M0 0 L0 9" stroke="#fff6c4" stroke-width="2.4" opacity="0.8"/>' +
    "</pattern>" +
    '<filter id="ownGlow" x="-20%" y="-20%" width="140%" height="140%">' +
    '<feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#ffe08a" flood-opacity="0.9"/>' +
    "</filter>" +
    landClips +
    "</defs>" +
    '<rect class="map-sea" width="900" height="640" fill="url(#sea)"/>' +
    '<text class="map-title" x="28" y="36">六十余州図</text>' +
    '<text class="map-title-sub" x="28" y="54">永禄の日本</text>' +
    landDraw +
    kunis.join("") +
    '<g class="map-marks">' +
    marks.join("") +
    "</g>" +
    '<g class="compass" transform="translate(860,590)">' +
    '<circle r="22" fill="rgba(12,8,4,.45)" stroke="#d4b45a" stroke-width="1"/>' +
    '<polygon points="0,-16 4,0 0,6 -4,0" fill="#ead9b0"/>' +
    '<text y="32" text-anchor="middle" class="prov-label">北</text></g>' +
    "</svg>" +
    '<div class="legend">選択中: ' +
    (clan ? clan.name : "") +
    "<br>国土 " +
    Math.round(share * 1000) / 10 +
    "% / 勝利60%　文化 " +
    (clan ? clan.culture : 0) +
    "/99<div class=\"win-share\"><div style=\"width:" +
    Math.min(100, (share / 0.6) * 100) +
    '%"></div></div>' +
    (ui.targetProvince ? "<br>対象国: " + state.provById[ui.targetProvince].name : "") +
    "<br><span class=\"own-legend\">自領 " +
    (mineNames.length ? mineNames.join("、") : "なし") +
    "</span>" +
    "<br><span class=\"tiny\">金色の縞と「自／本」がいまの家の領国。城に合わせると表向きの情報。内情は忍者・密偵・諜報。</span></div>" +
    '<div class="map-tip" id="map-tip" hidden></div>'
  );
}

function cmdPanel() {
  const cats = D().catLabels;
  const list = D().commands[ui.cat];
  const found = ui.sub ? E().findCmd(ui.sub) : null;
  const clan = myClan();
  const isKonin = found && found.def.id === "dip-konin";
  const gens = clan
    ? (isKonin ? E().daughtersOf(state, clan.id) : E().generalsOf(state, clan.id))
        .slice()
        .sort((a, b) => E().statOf(b, isKonin ? "charm" : "leadership") - E().statOf(a, isKonin ? "charm" : "leadership"))
        .slice(0, 40)
    : [];
  const others = state.clans.filter((c) => c.alive && (!clan || c.id !== clan.id));
  return (
    '<div class="tabs">' +
    Object.keys(cats)
      .map((k) => '<button class="tab' + (ui.cat === k ? " on" : "") + '" data-cat="' + k + '">' + cats[k] + "</button>")
      .join("") +
    "</div>" +
    '<div class="cmd-grid">' +
    list
      .map((c) => {
        const cost = c.cost || {};
        const cs = [cost.gold ? "金" + cost.gold : "", cost.rice ? "米" + cost.rice : ""].filter(Boolean).join(" ");
        return (
          '<button class="cmd' +
          (ui.sub === c.id ? " on" : "") +
          '" data-sub="' +
          c.id +
          '">' +
          c.name +
          (cs ? "<small>" + cs + "</small>" : "") +
          "</button>"
        );
      })
      .join("") +
    "</div>" +
    '<div class="panel" style="margin-top:8px">' +
    (found
      ? "<div class=\"tiny\">対象: " +
        (found.def.target === "province" ? "地図の国をクリック" : found.def.target === "clan" ? "相手家を選択" : "なし") +
        (found.def.id === "dip-konin" ? " ／ 縁組する姫を選ぶ" : "") +
        (found.def.soldiers ? " ／ 出兵数と兵種を指定" : "") +
        (found.def.unit ? " ／ 兵種を選ぶ" : "") +
        "</div>"
      : "<div class=\"tiny\">方針を選び、対象と担当武将を決めて予約する。</div>") +
    '<div class="row" style="margin-top:8px">' +
    '<label class="field">何期先<select id="off">' +
    Array.from({ length: 100 }, (_, i) => "<option value=\"" + i + "\"" + (ui.turnOffset === i ? " selected" : "") + ">" + (i === 0 ? "今期" : i + "期先") + "</option>").join("") +
    "</select></label>" +
    '<label class="field">' +
    (isKonin ? "縁組する姫" : "担当武将") +
    '<select id="gen">' +
    '<option value="">' +
    (isKonin ? "姫を選ぶ" : "自動（適材）") +
    "</option>" +
    gens
      .map(
        (g) =>
          "<option value=\"" +
          g.id +
          "\"" +
          (ui.generalId === g.id ? " selected" : "") +
          ">" +
          (g.rare ? "★" : "") +
          (g.gender === "f" ? "姫 " : "") +
          g.name +
          " " +
          ((D().postLabels || {})[g.post] || "") +
          (isKonin ? " 魅" + E().statOf(g, "charm") : " 統" + E().statOf(g, "leadership")) +
          "</option>"
      )
      .join("") +
    "</select></label>" +
    (found && found.def.target === "clan"
      ? '<label class="field">相手家<select id="tclan">' +
        others
          .map(
            (c) =>
              "<option value=\"" +
              c.id +
              "\"" +
              (ui.targetClan === c.id ? " selected" : "") +
              ">" +
              c.name +
              "</option>"
          )
          .join("") +
        "</select></label>"
      : "") +
    (found && found.def.soldiers
      ? '<label class="field">出兵<input id="sold" type="number" min="80" step="20" value="' + ui.soldiers + '"></label>'
      : "") +
    (found && (found.def.soldiers || found.def.unit) ? unitSelectHtml("unit") : "") +
    "</div>" +
    '<div class="row" style="margin-top:8px">' +
    '<button class="btn gold" id="btn-queue">この期に予約</button>' +
    '<button class="btn ghost" id="btn-gens">武将帳（' +
    (clan ? E().generalsOf(state, clan.id).length : 0) +
    "）</button>" +
    '<button class="btn ghost" id="btn-stash">蔵帳（' +
    (clan && clan.stash ? clan.stash.length : 0) +
    "）</button>" +
    '<button class="btn ghost" id="btn-auto">' +
    (clan && clan.autoQueue ? "お任せ中" : "空欄をお任せ") +
    "</button>" +
    (clan && clan.alive ? '<button class="btn ghost" id="btn-wander">放浪する</button>' : "") +
    "</div></div>"
  );
}

function queuePanel() {
  const clan = myClan();
  if (!clan) return "";
  const q = state.queues[clan.id] || [];
  const maxT = D().QUEUE_TURNS;
  const maxC = D().MAX_CMD_PER_TURN;
  const rows = [];
  for (let i = 0; i < maxT; i++) {
    const slot = q[i] || [];
    const held = E().isQueueHeld(state, clan.id, i);
    if (!slot.length && !held && i !== ui.turnOffset) continue;
    const labels = slot.length
      ? slot
          .map((cmd, idx) => {
            const f = E().findCmd(cmd.sub);
            const t = cmd.targetProvince ? state.provById[cmd.targetProvince] : cmd.targetClan ? state.clanById[cmd.targetClan] : null;
            const u = cmd.unit ? E().troopLabel(cmd.unit) : "";
            return (
              (cmd.auto ? '<span class="q-auto">任</span>' : "") +
              (f ? f.def.name : cmd.sub) +
              (u ? "・" + u : "") +
              (t ? "→" + t.name : "") +
              ' <button class="btn ghost" data-qi="' +
              i +
              '" data-qj="' +
              idx +
              '" style="padding:0 6px">×</button>'
            );
          })
          .join("、")
      : '<span class="tiny">空欄　ここに予約できる</span>';
    rows.push(
      '<div class="q-row"><b>' +
        (i === 0 ? "今期" : "+" + i) +
        "</b><div>" +
        labels +
        "</div><span class=\"tiny\">" +
        slot.length +
        "/" +
        maxC +
        "</span></div>"
    );
  }
  const shown = rows.slice(0, 12);
  if (rows.length > 12) {
    shown.push('<div class="tiny">ほか' + (rows.length - 12) + "期分は省略（お任せ含む）。</div>");
  }
  const filled = q.filter((s) => s && s.length).length;
  const cmdN = q.reduce((n, s) => n + (s ? s.length : 0), 0);
  return (
    '<div class="panel queue"><div class="tiny">先行入力 ' +
    filled +
    "/" +
    maxT +
    "期　方針 " +
    cmdN +
    "/" +
    maxT * maxC +
    (clan.autoQueue ? "　空きはお任せ" : "") +
    "　×で一つ消すと空欄　満杯ならお任せを上書き " +
    '<button class="btn ghost" id="btn-auto-clear">お任せを全削除</button></div>' +
    (shown.length ? shown.join("") : "<div class=\"tiny\">まだ予約はない。</div>") +
    "</div>"
  );
}

function logPanel() {
  return (
    '<div class="log">' +
    state.log
      .slice(0, 40)
      .map((l) => '<div class="' + l.kind + '">[' + l.era + "] " + l.text + "</div>")
      .join("") +
    "</div>"
  );
}

function remainMs() {
  if (!state || state.winner) return 0;
  if (state.paused) return Math.max(0, state.pauseLeft || 0);
  return Math.max(0, state.turnEndsAt - Date.now());
}

function humansReady() {
  return state.players.every((p) => {
    const c = state.clanById[p.clanId];
    if (!c || !c.alive) return true;
    return !!state.ready[p.id];
  });
}

function timerLabel() {
  const ms = remainMs();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return m + ":" + ss;
}

function renderGame() {
  const clan = myClan();
  const p = currentPlayer();
  const share = clan ? E().landShare(state, clan.id) : 0;
  const dai = clan ? E().daimyoOf(state, clan.id) : null;
  return (
    '<div class="hud">' +
    '<header class="topbar">' +
    '<div><div class="brand">群雄覇業</div><div class="tiny">' +
    E().eraLabel(state.year, state.month) +
    "　第" +
    state.turn +
    "期</div></div>" +
    '<div class="res-bar">' +
    D()
      .resources.map((r) => {
        let v = 0;
        if (r.key === "land") v = clan ? E().landOf(state, clan.id) : 0;
        else v = clan ? clan[r.key] : 0;
        return (
          '<div class="res' +
          (r.key === "soldiers" ? " troop-frame" : "") +
          '"' +
          (r.key === "soldiers" ? ' data-troop-break="1"' : "") +
          '><img src="' +
          r.img +
          '" alt="' +
          r.name +
          '"><div><b>' +
          r.name +
          "</b><div>" +
          fmt(v) +
          "</div></div></div>"
        );
      })
      .join("") +
    "</div>" +
    '<div class="timer-box"><div class="timer' +
    (remainMs() < 60000 ? " warn" : "") +
    '" id="clock">' +
    timerLabel() +
    '</div><div class="tiny">' +
    (state.paused ? "時は止まっている　" : "今期の残り　") +
    "勝利は国土60%　残り国土 " +
    Math.max(0, Math.ceil((0.6 - share) * E().totalLand(state))) +
    " / 文化 " +
    (clan ? clan.culture : 0) +
    '/99（高いほどお恵みが寄る）</div>' +
    '<div class="row" style="margin-top:6px;justify-content:flex-end">' +
    '<button class="btn ghost" id="btn-help">遊び方</button>' +
    '<button class="btn ghost" id="btn-records">戦績</button>' +
    (state.winner && state.winNoticeAck ? '<button class="btn gold" id="btn-new">新たなる乱世</button>' : "") +
    "</div></div></header>" +
    '<div class="layout"><div class="map-wrap" id="map">' +
    mapSVG() +
    '</div><aside class="side">' +
    '<div class="panel row">' +
    state.players
      .map((pl) => {
        const c = state.clanById[pl.clanId];
        return (
          '<button class="btn' +
          (pl.id === state.currentPlayerId ? " gold" : "") +
          '" data-pl="' +
          pl.id +
          '">' +
          pl.name +
          (c ? "・" + c.name : "") +
          (c && !c.alive ? "（滅亡）" : "") +
          (state.ready[pl.id] ? " ✓" : "") +
          "</button>"
        );
      })
      .join("") +
    '<button class="btn" id="btn-ready">' +
    (state.ready[p.id] ? "確定済" : "今期確定") +
    "</button>" +
    '<button class="btn ghost" id="btn-save">保存</button>' +
    '<button class="btn ghost" id="btn-pause">' +
    (state.paused ? "時を進める" : "時を止める") +
    "</button>" +
    (state.winner ? "" : '<button class="btn ghost" id="btn-endwar">戦争終了</button>') +
    "</div>" +
    '<div class="tiny">当主 ' +
    (dai ? dai.name : "不在") +
    "　同盟 " +
    (clan ? [...E().alliesOf(state, clan.id)].map((id) => state.clanById[id].name).join("、") || "なし" : "") +
    "　家中 " +
    (clan ? E().generalsOf(state, clan.id).length : 0) +
    "　浪人 " +
    state.generals.filter((g) => g.status === "ronin" && g.alive && !g.rare).length +
    (function () {
      const shown = state.generals.filter((g) => g.rare && g.alive && g.status !== "hidden").length;
      return shown ? "（登場レア" + shown + "）" : "";
    })() +
    "</div>" +
    (clan && !clan.alive
      ? '<div class="panel" style="border-color:#8b1c1c">この家は滅びた。地図は観戦できる。新たなる乱世を始めるか、他の君主へ切り替えよ。</div>'
      : "") +
    (function () {
      const offers = (state.offers || []).filter((o) => clan && o.to === clan.id && o.until >= state.turn);
      if (!offers.length) return "";
      return (
        '<div class="panel">' +
        offers
          .map((o) => {
            const from = state.clanById[o.from];
            return (
              '<div class="row"><span>' +
              (from ? from.name : o.from) +
              "から同盟の申し入れ</span>" +
              '<button class="btn gold" data-accept="' +
              o.from +
              '">受諾</button>' +
              '<button class="btn ghost" data-reject="' +
              o.from +
              '">却下</button></div>'
            );
          })
          .join("") +
        "</div>"
      );
    })() +
    cmdPanel() +
    queuePanel() +
    "</aside></div>" +
    logPanel() +
    (state.winner && !state.winNoticeAck ? winModal() : state.popup ? eventModal(state.popup) : "") +
    (ui.showStash ? stashModal() : "") +
    overlayHtml() +
    "</div>"
  );
}

function eventModal(pop) {
  return (
    '<div class="modal-bg" id="ev-bg"><div class="modal">' +
    '<img class="hero" src="' +
    pop.img +
    '" alt="">' +
    '<div class="body"><h2>' +
    pop.title +
    "</h2><p>" +
    pop.text +
    '</p><p class="tiny">承知で閉じるか、5秒後に自動で消える。時は止まらない。</p>' +
    '<button class="btn gold" id="ev-ok">承知</button></div></div></div>'
  );
}

function winModal() {
  const w = state.clanById[state.winner.clanId];
  const wName = (w && w.name) || state.winner.name || "";
  const humanWin = state.players.some((p) => p.clanId === state.winner.clanId);
  const standings = state.standings || (state.winner && state.winner.standings) || E().buildStandings(state);
  const whyTag =
    state.winner.why === "wander"
      ? "放浪の果て"
      : state.winner.why === "endwar"
        ? "戦争終了"
        : "国土六割";
  const lead =
    (state.awayEnded ? "不在のあいだに勝敗が決まった。戦績に残した。" : "") +
    (state.popup && state.popup.text
      ? state.popup.text
      : humanWin
        ? wName + "が天下人となった。"
        : wName + "が覇業を成した。") +
    "（" + whyTag + "）";
  const board = (standings || [])
    .map((s) => {
      const mark = s.wandered ? "（放浪）" : s.alive ? "" : "（滅亡）";
      const cls =
        "rank-row" +
        (s.rank === 1 ? " rank-1" : "") +
        (s.winner ? " is-winner" : "") +
        (s.alive ? "" : " is-dead");
      return (
        '<li class="' +
        cls +
        '"><span class="rank-num">' +
        E().rankLabel(s.rank) +
        '</span><span class="rank-house">' +
        s.clanName +
        mark +
        '</span><span class="rank-player">' +
        (s.playerName || (s.ai ? "PC" : "")) +
        '</span><span class="rank-stat">国土' +
        s.share +
        "%　文化" +
        s.culture +
        "</span></li>"
      );
    })
    .join("");
  const img = (state.popup && state.popup.img) || D().images.battle || "assets/battle.png";
  return (
    '<div class="modal-bg"><div class="modal win-modal">' +
    '<img class="hero" src="' +
    img +
    '" alt="' +
    (state.winner.why === "endwar" ? "戦争終了" : "祝勝利") +
    '">' +
    '<div class="body"><h2>' +
    ((state.popup && state.popup.title) || (state.winner.why === "endwar" ? "戦争終了" : "祝勝利")) +
    "</h2>" +
    "<p>" +
    lead +
    "</p>" +
    "<p class=\"tiny\">この時点の国土と文化度で、群雄一位から六位までを発表し、戦績に残す。</p>" +
    '<ol class="rank-board">' +
    board +
    "</ol>" +
    '<p class="tiny">' +
    (state.winner.why === "endwar"
      ? "承知を押すまで、この順位は消えません。"
      : "承知で閉じるか、5秒後に自動で消える。") +
    "</p>" +
    '<div class="row" style="margin-top:10px">' +
    '<button class="btn gold" id="ev-ok">承知</button>' +
    '<button class="btn gold" id="btn-new">新たなる乱世</button></div></div></div></div>'
  );
}

function genModal() {
  const clan = myClan();
  const q = ui.genQuery.trim();
  const posts = D().postLabels;
  let list;
  if (q) {
    list = state.generals.filter((g) => g.alive && g.status !== "hidden" && g.name.indexOf(q) >= 0);
  } else if (clan && clan.alive) {
    const own = E().generalsOf(state, clan.id);
    const ronin = state.generals.filter((g) => g.status === "ronin" && g.alive && !g.rare);
    list = own.concat(ronin);
  } else {
    list = state.generals.filter((g) => g.alive && g.status !== "hidden" && (g.rare || g.status === "ronin"));
  }
  if (ui.genPost && ui.genPost !== "all") {
    list = list.filter((g) => g.post === ui.genPost);
  }
  list = list
    .slice()
    .sort((a, b) => {
      const mineA = clan && a.clanId === clan.id ? 1 : 0;
      const mineB = clan && b.clanId === clan.id ? 1 : 0;
      if (mineB !== mineA) return mineB - mineA;
      return b.rare - a.rare || E().statOf(b, "leadership") - E().statOf(a, "leadership");
    })
    .slice(0, 80);
  const slotOpts = (slot, g) => {
    if (!clan) return "<option value=\"\">なし</option>";
    const owned = {};
    (clan.stash || []).forEach((it) => {
      const def = E().treasureDef(it.itemId);
      if (def && def.kind === "equip" && def.slot === slot) owned[it.itemId] = def;
    });
    const cur = g.equip && g.equip[slot];
    let html = "<option value=\"\">なし</option>";
    Object.keys(owned).forEach((id) => {
      html +=
        "<option value=\"" +
        id +
        "\"" +
        (cur === id ? " selected" : "") +
        ">" +
        owned[id].name +
        "</option>";
    });
    return html;
  };
  return (
    '<div class="modal-bg" id="g-bg"><div class="modal wide"><div class="body" id="g-body">' +
    "<h2>武将帳</h2>" +
    '<div class="row"><input class="search" id="gq" placeholder="名で探す（一千人）" value="' +
    ui.genQuery +
    '"><button class="btn gold" id="g-search">探す</button></div>' +
    '<div class="tabs" style="margin:8px 0">' +
    '<button class="tab' +
    (ui.genPost === "all" ? " on" : "") +
    '" data-gpost="all">すべて</button>' +
    Object.keys(posts)
      .filter((k) => k !== "none")
      .map(
        (k) =>
          '<button class="tab' +
          (ui.genPost === k ? " on" : "") +
          '" data-gpost="' +
          k +
          '">' +
          posts[k] +
          "</button>"
      )
      .join("") +
    "</div>" +
    '<div class="tiny">統率・武勇・知略・政治・魅力は信長の野望に倣う。配属すると能力が上がり、適性に応じて成長する。数字は装備と配属込み。駐在は自領から選び、その国の守り・農・商がやや上がる。「紹介」で来歴が読める。</div>' +
    '<div class="gen-list" id="gen-list">' +
    list
      .map((g) => {
        const house = g.clanId && state.clanById[g.clanId] ? state.clanById[g.clanId].name : "浪人";
        const mine = clan && g.clanId === clan.id;
        const eq = g.equip || {};
        const eqNames = ["weapon", "armor", "horse", "item"]
          .map((s) => {
            const d = eq[s] && E().treasureDef(eq[s]);
            return d ? d.name : "";
          })
          .filter(Boolean)
          .join("・");
        return (
          '<div class="gen tall" data-gid="' +
          g.id +
          '">' +
          '<span class="gen-icon">' +
          portraitHTML(g) +
          "</span>" +
          "<div class=\"gen-body\"><b class=\"" +
          (g.rare ? "rare" : "") +
          "\">" +
          (g.rare ? "★レア　" : "") +
          (g.gender === "f" ? "姫　" : "") +
          g.name +
          "</b><div class=\"tiny\" data-gen-meta>" +
          house +
          "　" +
          (g.marriedTo && state.clanById[g.marriedTo] ? "縁組済・" + state.clanById[g.marriedTo].name + "　" : "") +
          (posts[g.post] || "未配属") +
          (g.station && state.provById[g.station] ? "　駐在 " + state.provById[g.station].name : "") +
          "　齢" +
          g.age +
          "　義" +
          E().statOf(g, "duty") +
          " 野" +
          E().statOf(g, "ambition") +
          "</div><div class=\"tiny\" data-gen-stats>統" +
          E().statOf(g, "leadership") +
          " 武" +
          E().statOf(g, "valor") +
          " 知" +
          E().statOf(g, "intellect") +
          " 政" +
          E().statOf(g, "politics") +
          " 魅" +
          E().statOf(g, "charm") +
          (g.skill ? "　" + g.skill : "") +
          "</div><div class=\"tiny\" data-gen-eq>適性 内" +
          E().aptLabel(g.apt && g.apt.domestic) +
          " 軍" +
          E().aptLabel(g.apt && g.apt.military) +
          " 文" +
          E().aptLabel(g.apt && g.apt.culture) +
          "　経験" +
          (g.exp || 0) +
          (eqNames ? "　装備 " + eqNames : "") +
          "</div>" +
          (g.skillText ? '<div class="tiny">' + g.skillText + "</div>" : "") +
          (mine
            ? '<div class="row gen-actions">' +
              '<button class="btn ghost" data-post="' +
              g.id +
              '" data-to="domestic">内政</button>' +
              '<button class="btn ghost" data-post="' +
              g.id +
              '" data-to="military">軍事</button>' +
              '<button class="btn ghost" data-post="' +
              g.id +
              '" data-to="culture">文化</button>' +
              '<button class="btn ghost" data-post="' +
              g.id +
              '" data-to="none">解任</button>' +
              '<label class="field">駐在<select data-station="' +
              g.id +
              '"><option value="">なし</option>' +
              E()
                .clanProvinces(state, clan.id)
                .map(
                  (pr) =>
                    '<option value="' +
                    pr.id +
                    '"' +
                    (g.station === pr.id ? " selected" : "") +
                    ">" +
                    pr.name +
                    "</option>"
                )
                .join("") +
              "</select></label>" +
              "</div>" +
              '<div class="row gen-actions">' +
              '<label class="field">武器<select data-eq="' +
              g.id +
              '" data-slot="weapon">' +
              slotOpts("weapon", g) +
              "</select></label>" +
              '<label class="field">鎧<select data-eq="' +
              g.id +
              '" data-slot="armor">' +
              slotOpts("armor", g) +
              "</select></label>" +
              '<label class="field">馬<select data-eq="' +
              g.id +
              '" data-slot="horse">' +
              slotOpts("horse", g) +
              "</select></label>" +
              '<label class="field">道具<select data-eq="' +
              g.id +
              '" data-slot="item">' +
              slotOpts("item", g) +
              "</select></label>" +
              "</div>"
            : "") +
          "</div>" +
          '<div class="gen-side">' +
          '<button class="btn ghost" type="button" data-intro="' +
          g.id +
          '">紹介</button>' +
          '<button class="btn ghost" data-pick="' +
          g.id +
          '"' +
          (mine ? "" : " disabled") +
          ">" +
          (mine ? "担当" : g.status === "ronin" ? "浪人" : "他領") +
          "</button></div></div>"
        );
      })
      .join("") +
    "</div>" +
    '<button class="btn" id="g-close">閉じる</button>' +
    "</div></div></div>"
  );
}

function stashModal() {
  const clan = myClan();
  const items = clan ? clan.stash || [] : [];
  const kindName = { equip: "装備", consumable: "道具（一度きり）", relic: "永続の家宝" };
  return (
    '<div class="modal-bg" id="s-bg"><div class="modal wide"><div class="body">' +
    " <h2>蔵帳</h2>" +
    '<p class="tiny">装備は武将帳から帯びる。道具は自領を選んで使う。家宝は毎期、家に効く。</p>' +
    (items.length
      ? items
          .map((it) => {
            const def = E().treasureDef(it.itemId);
            if (!def) return "";
            const wearer = (clan ? E().generalsOf(state, clan.id) : []).find(
              (g) => g.equip && Object.keys(g.equip).some((k) => g.equip[k] === def.id)
            );
            return (
              '<div class="stash-row"><div><b>' +
              def.name +
              "</b>　<span class=\"tiny\">" +
              (kindName[def.kind] || def.kind) +
              (wearer ? "　" + wearer.name + "が帯びる" : "") +
              "</span><div class=\"tiny\">" +
              def.text +
              "</div></div>" +
              (def.kind === "consumable"
                ? '<button class="btn gold" data-use="' + it.uid + '">使う</button>'
                : "") +
              "</div>"
            );
          })
          .join("")
      : "<div class=\"tiny\">蔵は空である。宝探しや偶然で品が入る。</div>") +
    '<button class="btn" id="s-close">閉じる</button>' +
    "</div></div></div>"
  );
}

function renderRecords() {
  const hall = E().loadHall();
  const focus = ui.recordFocus && hall.players.find((p) => p.id === ui.recordFocus);
  const why = { land: "国土六割", culture: "文治天下", wander: "放浪", endwar: "戦争終了" };
  return (
    '<div class="modal-bg" id="rec-bg"><div class="modal wide" role="dialog" aria-labelledby="rec-title">' +
    '<div class="modal-head"><h2 id="rec-title">登録済み一覧</h2>' +
    '<button class="btn ghost" type="button" data-close="records" aria-label="閉じる">閉じる</button></div>' +
    '<div class="body">' +
    "<p class=\"tiny\">プレイヤー名で登録する。最大" +
    D().MAX_RECORD_PLAYERS +
    "名。同じ名は重複登録できない。各名の過去の戦績は" +
    D().MAX_RECORDS +
    "件まで。開戦時の席の名も記録される。</p>" +
    (ui.regMsg ? '<p class="tiny reg-msg">' + ui.regMsg + "</p>" : "") +
    '<div class="row" style="margin-bottom:10px">' +
    '<label class="field grow">プレイヤー名<input id="rec-reg-name" maxlength="16" placeholder="新規登録"></label>' +
    '<button class="btn gold" type="button" id="rec-reg">登録</button>' +
    "</div>" +
    (focus
      ? '<p><b>' +
        focus.name +
        "</b>　過去の戦績 " +
        (focus.records || []).length +
        "件　<button class=\"btn ghost\" id=\"rec-back\">一覧へ</button> " +
        '<button class="btn ghost" data-recdel="' +
        focus.id +
        '">この名を削除</button></p>' +
        '<div class="gen-list">' +
        ((focus.records || []).length
          ? focus.records
              .map((r) => {
                const res = r.result === "win" ? "勝利" : r.result === "lose" ? "敗北" : "途中";
                const when = r.t ? new Date(r.t).toLocaleString("ja-JP") : "";
                const rank = r.rank ? E().rankLabel(r.rank) : "";
                const board = (r.standings || [])
                  .map((s) => E().rankLabel(s.rank) + " " + (s.clanName || ""))
                  .join("　");
                return (
                  '<div class="stash-row"><div>' +
                  res +
                  (rank ? "　" + rank : "") +
                  "　" +
                  (r.clanName || "") +
                  "　第" +
                  r.turn +
                  "期 " +
                  (r.era || "") +
                  '<div class="tiny">国土' +
                  r.share +
                  "%　文化" +
                  r.culture +
                  (r.why ? "　" + (why[r.why] || r.why) : "") +
                  (when ? "　" + when : "") +
                  "</div>" +
                  (board ? '<div class="tiny rank-mini">' + board + "</div>" : "") +
                  "</div></div>"
                );
              })
              .join("")
          : "<div class=\"tiny\">まだ戦績はない。</div>") +
        "</div>"
      : '<div class="gen-list">' +
        (hall.players.length
          ? hall.players
              .map((p) => {
                const recs = p.records || [];
                const last = recs[0];
                const wins = recs.filter((r) => r.result === "win").length;
                const loses = recs.filter((r) => r.result === "lose").length;
                return (
                  '<div class="stash-row"><div><b>' +
                  p.name +
                  "</b><div class=\"tiny\">戦績 " +
                  recs.length +
                  "件（勝" +
                  wins +
                  "　敗" +
                  loses +
                  "）" +
                  (last ? "　直近 " + (last.result === "win" ? "勝利" : last.result === "lose" ? "敗北" : "途中") + (last.rank ? " " + E().rankLabel(last.rank) : "") + " " + (last.clanName || "") : "") +
                  "</div></div>" +
                  '<button class="btn gold" data-rec="' +
                  p.id +
                  '">過去の戦績</button>' +
                  '<button class="btn ghost" data-recdel="' +
                  p.id +
                  '">削除</button></div>'
                );
              })
              .join("")
          : "<div class=\"tiny\">まだ登録されたプレイヤーはいない。</div>") +
        "</div>") +
    "</div>" +
    '<div class="modal-foot"><button class="btn gold" type="button" data-close="records">閉じる</button></div>' +
    "</div></div>"
  );
}

function overlayHtml() {
  return (
    (ui.showHelp ? renderHelp() : "") +
    (ui.showRecords ? renderRecords() : "") +
    (ui.cmdHelp ? renderCmdHelp() : "") +
    (ui.troopHelp ? renderTroopHelp() : "")
  );
}

function floatRoot() {
  let el = document.getElementById("float");
  if (!el) {
    el = document.createElement("div");
    el.id = "float";
    document.body.appendChild(el);
  }
  return el;
}

function mountHtml(html) {
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.firstElementChild;
}

function saveGenScroll() {
  const list = $("#gen-list");
  if (list) ui.genScroll = list.scrollTop;
  const body = $("#g-body") || $("#g-bg .body");
  if (body) ui.genBodyScroll = body.scrollTop;
}

function restoreGenScroll() {
  const apply = () => {
    const list = $("#gen-list");
    if (list && ui.genScroll != null) list.scrollTop = ui.genScroll;
    const body = $("#g-body") || $("#g-bg .body");
    if (body && ui.genBodyScroll != null) body.scrollTop = ui.genBodyScroll;
  };
  apply();
  requestAnimationFrame(apply);
}

function patchGenCard(g) {
  if (!g) return;
  const row = document.querySelector('.gen[data-gid="' + g.id + '"]');
  if (!row) return;
  const posts = D().postLabels;
  const house = g.clanId && state.clanById[g.clanId] ? state.clanById[g.clanId].name : "浪人";
  const meta = row.querySelector("[data-gen-meta]");
  if (meta) {
    meta.textContent =
      house +
      "　" +
      (g.marriedTo && state.clanById[g.marriedTo] ? "縁組済・" + state.clanById[g.marriedTo].name + "　" : "") +
      (posts[g.post] || "未配属") +
      (g.station && state.provById[g.station] ? "　駐在 " + state.provById[g.station].name : "") +
      "　齢" +
      g.age +
      "　義" +
      E().statOf(g, "duty") +
      " 野" +
      E().statOf(g, "ambition");
  }
  const stats = row.querySelector("[data-gen-stats]");
  if (stats) {
    stats.textContent =
      "統" +
      E().statOf(g, "leadership") +
      " 武" +
      E().statOf(g, "valor") +
      " 知" +
      E().statOf(g, "intellect") +
      " 政" +
      E().statOf(g, "politics") +
      " 魅" +
      E().statOf(g, "charm") +
      (g.skill ? "　" + g.skill : "");
  }
  const eqLine = row.querySelector("[data-gen-eq]");
  if (eqLine) {
    const eq = g.equip || {};
    const eqNames = ["weapon", "armor", "horse", "item"]
      .map((s) => {
        const d = eq[s] && E().treasureDef(eq[s]);
        return d ? d.name : "";
      })
      .filter(Boolean)
      .join("・");
    eqLine.textContent =
      "適性 内" +
      E().aptLabel(g.apt && g.apt.domestic) +
      " 軍" +
      E().aptLabel(g.apt && g.apt.military) +
      " 文" +
      E().aptLabel(g.apt && g.apt.culture) +
      "　経験" +
      (g.exp || 0) +
      (eqNames ? "　装備 " + eqNames : "");
  }
}

function keepRosterEdit(g) {
  saveGenScroll();
  const leaveFilter = ui.genPost && ui.genPost !== "all" && g && g.post !== ui.genPost;
  if (leaveFilter) {
    refreshRoster();
    return;
  }
  ui.genDirty = false;
  render();
  patchGenCard(g);
  restoreGenScroll();
}

function clearGenLayer() {
  const bg = $("#g-bg");
  if (bg) bg.remove();
  const intro = $("#intro-bg");
  if (intro) intro.remove();
  const host = document.getElementById("float");
  if (host) host.replaceChildren();
}

function syncIntroLayer() {
  const host = floatRoot();
  const old = $("#intro-bg");
  if (!ui.genIntro || !ui.showGens) {
    if (old) old.remove();
    return;
  }
  if (old && old.dataset.gid === String(ui.genIntro)) return;
  const next = mountHtml(renderGenIntro());
  if (old) old.replaceWith(next);
  else host.appendChild(next);
  document.querySelectorAll("#intro-bg [data-close]").forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      closeOverlay("intro");
    };
  });
  const bg = $("#intro-bg");
  if (bg) {
    bg.onclick = (e) => {
      if (e.target === bg) closeOverlay("intro");
    };
  }
  paintQueuedPortraits();
}

function syncGenLayer() {
  const host = floatRoot();
  if (ui.screen !== "game" || !ui.showGens) {
    ui.genIntro = null;
    clearGenLayer();
    ui.genDirty = false;
    return;
  }
  let bg = $("#g-bg");
  if (!bg || ui.genDirty) {
    saveGenScroll();
    const next = mountHtml(genModal());
    if (bg) bg.replaceWith(next);
    else host.appendChild(next);
    ui.genDirty = false;
    bindGenModal();
    restoreGenScroll();
    paintQueuedPortraits();
    const wrap = $("#g-bg");
    if (wrap) {
      wrap.onclick = (e) => {
        if (e.target === wrap) {
          ui.showGens = false;
          ui.genIntro = null;
          syncGenLayer();
        }
      };
    }
  }
  syncIntroLayer();
}

function refreshRoster() {
  ui.genDirty = true;
  syncGenLayer();
}

function render() {
  const app = $("#app");
  const keep = {
    log: $(".log") && $(".log").scrollTop,
    queue: $(".queue") && $(".queue").scrollTop,
    cmd: $(".cmd-grid") && $(".cmd-grid").scrollTop,
    gens: $("#gen-list") && $("#gen-list").scrollTop,
    focus: document.activeElement && document.activeElement.id,
    gq: $("#gq") && $("#gq").selectionStart,
    roster: $("#roster-list") && $("#roster-list").scrollTop
  };
  if (ui.screen === "title") {
    ui.showGens = false;
    ui.genIntro = null;
    clearGenLayer();
    app.innerHTML = renderTitle() + overlayHtml();
    renderSetupPlayers();
    bindTitle();
    if (keep.roster && $("#roster-list")) $("#roster-list").scrollTop = keep.roster;
    paintQueuedPortraits();
    return;
  }
  if (keep.gens != null) ui.genScroll = keep.gens;
  const gBody = $("#g-body") || $("#g-bg .body");
  if (gBody) ui.genBodyScroll = gBody.scrollTop;
  app.innerHTML = renderGame();
  bindGame();
  syncGenLayer();
  paintQueuedPortraits();
  if (keep.log && $(".log")) $(".log").scrollTop = keep.log;
  if (keep.queue && $(".queue")) $(".queue").scrollTop = keep.queue;
  if (keep.cmd && $(".cmd-grid")) $(".cmd-grid").scrollTop = keep.cmd;
  if (keep.focus && $("#" + keep.focus) && keep.focus !== "clock") {
    const el = $("#" + keep.focus);
    el.focus();
    if (keep.focus === "gq" && typeof keep.gq === "number" && el.setSelectionRange) {
      try {
        el.setSelectionRange(keep.gq, keep.gq);
      } catch (e) {}
    }
  }
}

function bindTitle() {
  $("#pc").onchange = (e) => {
    ui.playerCount = Number(e.target.value);
    ensureSeats();
    renderSetupPlayers();
    bindSetupFields();
  };
  $("#tm").onchange = (e) => {
    ui.turnMs = Number(e.target.value);
  };
  bindSetupFields();
  const go = () => {
    const names = new Set();
    const starts = new Set();
    const seenNames = new Set();
    for (const p of ui.setupPlayers) {
      if (!p.ai) p.name = E().normName(p.name) || "無名の君主";
      if (names.has(p.clanId)) {
        alert("同じ家は選べません。");
        return;
      }
      names.add(p.clanId);
      if (starts.has(p.startProvince)) {
        alert("同じ開始国は選べません。");
        return;
      }
      starts.add(p.startProvince);
      if (!p.ai) {
        if (seenNames.has(p.name)) {
          alert("同じプレイヤー名は重複できません。");
          return;
        }
        seenNames.add(p.name);
      }
    }
    const hall = E().loadHall();
    const humans = ui.setupPlayers.filter((p) => !p.ai);
    const fresh = humans.filter((p) => !hall.players.some((h) => E().normName(h.name) === E().normName(p.name)));
    if (hall.players.length + fresh.length > (D().MAX_RECORD_PLAYERS || 50)) {
      alert("戦績に残せる君主は50名までです。既存の名を使うか、タイトルの戦績から古い名を消してください。開戦はできますが、新しい名は記録されません。");
    }
    state = E().createGame({
      players: ui.setupPlayers,
      turnMs: ui.turnMs,
      seed: Date.now()
    });
    ui.screen = "game";
    E().save(state);
    render();
  };
  $("#btn-start").onclick = go;
  const cont = $("#btn-continue");
  if (cont) {
    cont.onclick = () => {
      state = E().load();
      if (!state) {
        alert("乱世の記録を読み込めなかった。開戦し直すか、別の記録を試してください。");
        return;
      }
      ui.screen = "game";
      render();
    };
  }
  const regName = $("#reg-name");
  if (regName) {
    regName.oninput = () => {
      ui.regName = regName.value;
    };
  }
  const btnReg = $("#btn-reg");
  if (btnReg) {
    btnReg.onclick = () => {
      const inp = $("#reg-name");
      registerPlayerName(inp ? inp.value : ui.regName);
    };
  }
  bindRoster();
  bindOverlays();
}

function bindRoster() {
  const q = $("#roster-q");
  const house = $("#roster-house");
  const list = $("#roster-list");
  const apply = () => {
    if (q) ui.rosterQuery = q.value;
    if (house) ui.rosterHouse = house.value;
    if (list) list.innerHTML = rosterListHtml();
    paintQueuedPortraits();
  };
  if (q) q.oninput = apply;
  if (house) house.onchange = apply;
  const jump = $("#btn-roster");
  if (jump) {
    jump.onclick = () => {
      const el = $("#title-roster");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }
}

function registerPlayerName(raw) {
  const n = E().normName(raw);
  if (!n) {
    ui.regMsg = "プレイヤー名を入れてください。";
    render();
    return;
  }
  if (n.indexOf("PC・") === 0) {
    ui.regMsg = "PC用の名は登録できません。";
    render();
    return;
  }
  if (E().playerNameTaken(n)) {
    ui.regMsg = n + " はすでに登録されています。同じ名は重複できません。席で選べます。";
    ui.regName = n;
    render();
    return;
  }
  const rec = E().upsertPlayer(n);
  if (!rec) {
    ui.regMsg = "登録は50名までです。一覧から古い名を削除してください。";
    render();
    return;
  }
  ui.regMsg = n + " を登録した。";
  ui.regName = "";
  render();
}

function closeOverlay(kind) {
  if (kind === "help") ui.showHelp = false;
  if (kind === "records") {
    ui.showRecords = false;
    ui.recordFocus = null;
  }
  if (kind === "cmdhelp") ui.cmdHelp = null;
  if (kind === "troophelp") ui.troopHelp = null;
  if (kind === "intro") {
    ui.genIntro = null;
    syncIntroLayer();
    return;
  }
  render();
}

function bindOverlays() {
  const helpBtn = $("#btn-help");
  if (helpBtn) {
    helpBtn.onclick = () => {
      ui.showHelp = true;
      ui.cmdHelp = null;
      ui.troopHelp = null;
      ui.genIntro = null;
      render();
    };
  }
  const recBtn = $("#btn-records");
  if (recBtn) {
    recBtn.onclick = () => {
      ui.showRecords = true;
      ui.recordFocus = null;
      ui.cmdHelp = null;
      ui.troopHelp = null;
      ui.genIntro = null;
      render();
    };
  }
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      closeOverlay(el.dataset.close);
    };
  });
  [
    ["help-bg", "help"],
    ["rec-bg", "records"],
    ["cmdhelp-bg", "cmdhelp"],
    ["troophelp-bg", "troophelp"],
    ["intro-bg", "intro"]
  ].forEach((pair) => {
    const bg = $("#" + pair[0]);
    if (!bg) return;
    bg.onclick = (e) => {
      if (e.target === bg) closeOverlay(pair[1]);
    };
  });
  const recBack = $("#rec-back");
  if (recBack) {
    recBack.onclick = () => {
      ui.recordFocus = null;
      render();
    };
  }
  document.querySelectorAll("[data-rec]").forEach((el) => {
    el.onclick = () => {
      ui.recordFocus = el.dataset.rec;
      render();
    };
  });
  document.querySelectorAll("[data-recdel]").forEach((el) => {
    el.onclick = () => {
      if (!confirm("このプレイヤー名と過去の戦績を削除するか？")) return;
      E().deleteRecordPlayer(el.dataset.recdel);
      if (ui.recordFocus === el.dataset.recdel) ui.recordFocus = null;
      render();
    };
  });
  const recReg = $("#rec-reg");
  if (recReg) {
    recReg.onclick = () => {
      const inp = $("#rec-reg-name");
      ui.showRecords = true;
      registerPlayerName(inp ? inp.value : "");
    };
  }
}

function bindSetupFields() {
  document.querySelectorAll(".pname").forEach((el) => {
    el.oninput = () => {
      ui.setupPlayers[Number(el.dataset.i)].name = el.value;
    };
  });
  document.querySelectorAll(".pclan").forEach((el) => {
    el.onchange = () => {
      const i = Number(el.dataset.i);
      ui.setupPlayers[i].clanId = el.value;
      const clan = D().clans.find((c) => c.id === el.value);
      const taken = ui.setupPlayers.some((s, j) => j !== i && s.startProvince === (clan && clan.home));
      if (clan && !taken) ui.setupPlayers[i].startProvince = clan.home;
      if (ui.setupPlayers[i].ai && clan) ui.setupPlayers[i].name = "PC・" + clan.name;
      renderSetupPlayers();
      bindSetupFields();
    };
  });
  document.querySelectorAll(".pstart").forEach((el) => {
    el.onchange = () => {
      ui.setupPlayers[Number(el.dataset.i)].startProvince = el.value;
      renderSetupPlayers();
      bindSetupFields();
    };
  });
}

function attachHoldHelp(el, onOpen) {
  let timer = 0;
  let held = false;
  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  };
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    onOpen();
  });
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    held = false;
    clear();
    timer = setTimeout(() => {
      held = true;
      timer = 0;
      onOpen();
    }, 520);
  });
  el.addEventListener("pointerup", clear);
  el.addEventListener("pointercancel", clear);
  el.addEventListener("pointerleave", clear);
  return {
    wasHeld: () => {
      if (held) {
        held = false;
        return true;
      }
      return false;
    }
  };
}

function bindGenModal() {
  const gc = $("#g-close");
  if (gc) {
    gc.onclick = () => {
      ui.showGens = false;
      ui.genIntro = null;
      syncGenLayer();
    };
  }
  const gq = $("#gq");
  if (gq) {
    gq.oninput = (e) => {
      ui.genQuery = e.target.value;
    };
    gq.onkeydown = (e) => {
      if (e.key === "Enter") {
        ui.genQuery = gq.value;
        refreshRoster();
      }
    };
  }
  const gs = $("#g-search");
  if (gs) {
    gs.onclick = () => {
      const box = $("#gq");
      ui.genQuery = box ? box.value : ui.genQuery;
      refreshRoster();
    };
  }
  document.querySelectorAll("[data-pick]").forEach((el) => {
    el.onclick = () => {
      if (el.disabled) return;
      ui.generalId = el.dataset.pick;
      ui.showGens = false;
      ui.genIntro = null;
      render();
    };
  });
  document.querySelectorAll("[data-intro]").forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      ui.genIntro = el.dataset.intro;
      ui.cmdHelp = null;
      ui.troopHelp = null;
      syncIntroLayer();
    };
  });
  document.querySelectorAll("[data-gpost]").forEach((el) => {
    el.onclick = () => {
      ui.genPost = el.dataset.gpost;
      refreshRoster();
    };
  });
  document.querySelectorAll("[data-post]").forEach((el) => {
    el.onclick = () => {
      const clan = myClan();
      const g = state.generals.find((x) => x.id === el.dataset.post);
      if (!clan || !g) return;
      const err = E().setPost(state, clan, g, el.dataset.to);
      if (err) {
        alert(err);
        return;
      }
      E().save(state);
      keepRosterEdit(g);
    };
  });
  document.querySelectorAll("[data-station]").forEach((el) => {
    el.onchange = () => {
      const clan = myClan();
      const g = state.generals.find((x) => x.id === el.dataset.station);
      if (!clan || !g) return;
      const err = E().setStation(state, clan, g, el.value || null);
      if (err) {
        alert(err);
        return;
      }
      E().save(state);
      keepRosterEdit(g);
    };
  });
  document.querySelectorAll("[data-eq]").forEach((el) => {
    el.onchange = () => {
      const clan = myClan();
      const g = state.generals.find((x) => x.id === el.dataset.eq);
      if (!clan || !g) return;
      if (!el.value) {
        if (!g.equip) g.equip = { weapon: null, armor: null, horse: null, item: null };
        g.equip[el.dataset.slot] = null;
        E().save(state);
        keepRosterEdit(g);
        return;
      }
      const err = E().equipItem(state, clan, g, el.value, el.dataset.slot);
      if (err) {
        alert(err);
        return;
      }
      E().save(state);
      keepRosterEdit(g);
    };
  });
}

function bindGame() {
  bindOverlays();
  document.querySelectorAll("[data-cat]").forEach((el) => {
    el.onclick = () => {
      ui.cat = el.dataset.cat;
      ui.sub = D().commands[ui.cat][0].id;
      render();
    };
  });
  document.querySelectorAll("[data-sub]").forEach((el) => {
    const id = el.dataset.sub;
    const hold = attachHoldHelp(el, () => {
      ui.cmdHelp = id;
      ui.troopHelp = null;
      render();
    });
    el.onclick = (e) => {
      if (hold.wasHeld()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      ui.sub = id;
      if (ui.sub === "dip-konin") ui.generalId = null;
      render();
    };
  });
  document.querySelectorAll("[data-troop-break]").forEach((el) => {
    attachHoldHelp(el, () => {
      ui.troopHelp = "all";
      ui.cmdHelp = null;
      render();
    });
  });
  document.querySelectorAll(".pg").forEach((g) => {
    g.onclick = () => {
      ui.targetProvince = g.dataset.pid;
      render();
    };
    g.onmouseenter = (e) => {
      const tip = $("#map-tip");
      if (!tip) return;
      tip.innerHTML = mapTipHtml(g.dataset.pid);
      tip.hidden = false;
      moveMapTip(e);
    };
    g.onmousemove = (e) => moveMapTip(e);
    g.onmouseleave = () => {
      const tip = $("#map-tip");
      if (tip) tip.hidden = true;
    };
  });
  document.querySelectorAll("[data-pl]").forEach((el) => {
    el.onclick = () => {
      state.currentPlayerId = el.dataset.pl;
      render();
    };
  });
  const off = $("#off");
  if (off) off.onchange = () => (ui.turnOffset = Number(off.value));
  const gen = $("#gen");
  if (gen) gen.onchange = () => (ui.generalId = gen.value || null);
  const tc = $("#tclan");
  if (tc) {
    ui.targetClan = ui.targetClan || tc.value;
    tc.onchange = () => (ui.targetClan = tc.value);
  }
  const sold = $("#sold");
  if (sold) sold.onchange = () => (ui.soldiers = Number(sold.value) || 400);
  const unitEl = $("#unit");
  if (unitEl) unitEl.onchange = () => (ui.unitType = unitEl.value || "ashigaru");
  const bq = $("#btn-queue");
  if (bq) {
    bq.onclick = () => {
      const clan = myClan();
      if (!clan || !clan.alive) {
        alert("この家はすでに滅びている。");
        return;
      }
      if (!ui.sub) {
        alert("方針を選んでください。");
        return;
      }
      const f = E().findCmd(ui.sub);
      if (!f) {
        alert("方針が不明です。");
        return;
      }
      const cmd = {
        cat: f.cat,
        sub: ui.sub,
        targetProvince: ui.targetProvince,
        targetClan: ui.targetClan,
        generalId: ui.generalId,
        soldiers: ui.soldiers,
        unit: ui.unitType || "ashigaru",
        auto: false
      };
      const err = E().validateCmd(state, clan, cmd);
      if (err) {
        alert(err);
        return;
      }
      const ok = E().enqueue(state, clan.id, ui.turnOffset, cmd);
      if (!ok) {
        alert("その期は3つまでです。お任せ以外の予約がいっぱいです。");
        return;
      }
      E().save(state);
      render();
    };
  }
  document.querySelectorAll("[data-qi]").forEach((el) => {
    el.onclick = () => {
      E().removeQueued(state, myClan().id, Number(el.dataset.qi), Number(el.dataset.qj));
      E().save(state);
      render();
    };
  });
  document.querySelectorAll("[data-accept]").forEach((el) => {
    el.onclick = () => {
      const clan = myClan();
      if (!clan) return;
      E().acceptOffer(state, clan.id, el.dataset.accept);
      E().save(state);
      render();
    };
  });
  document.querySelectorAll("[data-reject]").forEach((el) => {
    el.onclick = () => {
      const clan = myClan();
      if (!clan) return;
      E().rejectOffer(state, clan.id, el.dataset.reject);
      E().save(state);
      render();
    };
  });
  const br = $("#btn-ready");
  if (br) {
    br.onclick = () => {
      const p = currentPlayer();
      state.ready[p.id] = true;
      if (humansReady()) {
        resolving = true;
        E().resolveTurn(state);
        resolving = false;
        if (state.paused) state.pauseLeft = state.turnMs || 600000;
        E().save(state);
      }
      render();
    };
  }
  const bs = $("#btn-save");
  if (bs) {
    bs.onclick = () => {
      E().save(state);
      alert("この乱世を保存した。");
    };
  }
  const bp = $("#btn-pause");
  if (bp) {
    bp.onclick = () => {
      if (!state || state.winner) return;
      if (state.paused) {
        state.turnEndsAt = Date.now() + (state.pauseLeft || state.turnMs || 0);
        state.paused = false;
        state.pauseLeft = 0;
      } else {
        state.paused = true;
        state.pauseLeft = Math.max(0, state.turnEndsAt - Date.now());
      }
      E().save(state);
      render();
    };
  }
  const bg = $("#btn-gens");
  if (bg) {
    bg.onclick = () => {
      ui.showGens = true;
      ui.showStash = false;
      ui.genDirty = true;
      syncGenLayer();
    };
  }
  const bst = $("#btn-stash");
  if (bst) {
    bst.onclick = () => {
      ui.showStash = true;
      ui.showGens = false;
      ui.genIntro = null;
      clearGenLayer();
      render();
    };
  }
  const ba = $("#btn-auto");
  if (ba) {
    ba.onclick = () => {
      const clan = myClan();
      if (!clan || !clan.alive) return;
      if (clan.autoQueue) {
        clan.autoQueue = false;
        E().save(state);
        alert("お任せをやめた。すでに予約した期はそのまま残る。");
        render();
        return;
      }
      E().clearQueueHolds(state, clan.id);
      const n = E().fillAutoQueue(state, clan.id);
      clan.autoQueue = true;
      const q = state.queues[clan.id] || [];
      const cmdN = q.reduce((s, slot) => s + (slot ? slot.length : 0), 0);
      E().save(state);
      alert("空欄" + n + "期を埋め、方針" + cmdN + "件を予約した。これからの空きも家臣が代行する。");
      render();
    };
  }
  const bac = $("#btn-auto-clear");
  if (bac) {
    bac.onclick = () => {
      const clan = myClan();
      if (!clan || !clan.alive) return;
      const n = E().clearAutoQueue(state, clan.id);
      E().save(state);
      alert(n ? "お任せの方針" + n + "件を消し、空欄にした。" : "お任せの方針はなかった。");
      render();
    };
  }
  const bw = $("#btn-wander");
  if (bw) {
    bw.onclick = () => {
      const clan = myClan();
      if (!clan || !clan.alive) return;
      if (!confirm("国土も家もすべて捨てて放浪するか。これは敗北となる。")) return;
      const err = E().wanderClan(state, clan);
      if (err) {
        alert(err);
        return;
      }
      if (!state.winner) {
        const next = (state.players || []).find((p) => {
          const c = state.clanById[p.clanId];
          return c && c.alive;
        });
        if (next) state.currentPlayerId = next.id;
      }
      E().save(state);
      render();
    };
  }
  const bew = $("#btn-endwar");
  if (bew) {
    bew.onclick = () => {
      if (!state || state.winner) return;
      if (!confirm("戦争を終えるか。この時点の国土と文化度で六家の順位を定め、乱世を閉じる。")) return;
      const err = E().endWar(state);
      if (err) {
        alert(err);
        return;
      }
      E().save(state);
      render();
    };
  }
  const sc = $("#s-close");
  if (sc) {
    sc.onclick = () => {
      ui.showStash = false;
      render();
    };
    document.querySelectorAll("[data-use]").forEach((el) => {
      el.onclick = () => {
        const clan = myClan();
        if (!clan) return;
        const err = E().useConsumable(state, clan, el.dataset.use, ui.targetProvince);
        if (err) alert(err);
        else E().save(state);
        render();
      };
    });
  }
  const ev = $("#ev-ok");
  if (ev) {
    ev.onclick = () => {
      dismissNotice();
      render();
    };
  }
  const nw = $("#btn-new");
  if (nw) {
    nw.onclick = () => {
      E().clearSave();
      state = null;
      ui.screen = "title";
      render();
    };
  }
}

let clockTimer = null;
let resolving = false;

function popupKeyOf(pop) {
  if (state && state.winner && !state.winNoticeAck) return "win|" + (state.winner.why || "") + "|" + (state.winner.clanId || "");
  if (!pop) return "";
  return (pop.kind || "") + "|" + (pop.title || "") + "|" + (pop.text || "");
}

function dismissNotice() {
  if (!state) return false;
  ui.popupAt = 0;
  ui.popupKey = "";
  if (state.winner && !state.winNoticeAck) {
    state.winNoticeAck = true;
    state.popup = null;
    E().save(state);
    return true;
  }
  if (state.popup) {
    state.popup = null;
    return true;
  }
  return false;
}

function persistAway() {
  if (!state) return;
  if (state.winner) {
    E().save(state);
    return;
  }
  if (state.paused) {
    state.turnEndsAt = Date.now() + Math.max(0, state.pauseLeft || 0);
    state.paused = false;
    state.pauseLeft = 0;
  }
  E().save(state);
}

function resumePresence() {
  if (!state || state.winner) return;
  resolving = true;
  const n = E().catchUpTurns(state);
  resolving = false;
  if (n) {
    E().save(state);
    if (ui.screen === "game") render();
  }
}

function tick() {
  if (resolving || ui.screen !== "game" || !state) return;
  const notice = (state.winner && !state.winNoticeAck) || !!state.popup;
  if (notice) {
    const key = popupKeyOf(state.popup);
    if (ui.popupKey !== key) {
      ui.popupKey = key;
      ui.popupAt = Date.now();
    }
    const endwarHold = state.winner && !state.winNoticeAck && state.winner.why === "endwar";
    const wait = D().POP_MS || D().TALENT_POP_MS || 5000;
    if (!endwarHold && ui.popupAt && Date.now() - ui.popupAt >= wait) {
      dismissNotice();
      render();
    }
  }
  if (state.winner) return;
  if (state.paused) {
    const el = $("#clock");
    if (el) {
      el.textContent = timerLabel();
      el.classList.toggle("warn", remainMs() < 60000);
    }
    return;
  }
  const el = $("#clock");
  if (el) {
    el.textContent = timerLabel();
    el.classList.toggle("warn", remainMs() < 60000);
  }
  if (remainMs() <= 0) {
    resolving = true;
    const n = E().catchUpTurns(state);
    resolving = false;
    if (n) {
      E().save(state);
      render();
    }
  }
}

function boot() {
  ui.sub = D().commands.domestic[0].id;
  ensureSeats();
  clearGenLayer();
  E().load();
  render();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tick, 250);
  window.addEventListener("pagehide", () => persistAway(true));
  window.addEventListener("beforeunload", () => persistAway(true));
  window.addEventListener("freeze", () => persistAway(true));
  window.addEventListener("pageshow", () => resumePresence());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) persistAway(false);
    else resumePresence();
  });
}

document.addEventListener("DOMContentLoaded", boot);
window.GY = {
  state: () => state,
  ui: () => ui,
  render: () => render(),
  portraitDebug: () => {
    const fn = famousNames();
    const fileToNames = {};
    Object.keys(PORTRAIT_NAMED).forEach((n) => {
      const f = PORTRAIT_NAMED[n];
      if (!fileToNames[f]) fileToNames[f] = [];
      fileToNames[f].push(n);
    });
    const els = document.querySelectorAll("img.portrait, canvas.portrait");
    const srcCount = {};
    Array.prototype.forEach.call(els, (el) => {
      const s = el.currentSrc || el.src || el.tagName;
      srcCount[s] = (srcCount[s] || 0) + 1;
    });
    const reused = Object.keys(srcCount).filter((s) => srcCount[s] > 1);
    return {
      famous: Object.keys(fn).length,
      painted: els.length,
      leftoverCanvas: document.querySelectorAll("canvas.js-port").length,
      reused: reused.length,
      reusedSamples: reused.slice(0, 8).map((s) => ({ n: srcCount[s], s: s.slice(0, 80) })),
      namedFiles: fileToNames
    };
  }
};
