/* 群雄覇業 — シミュレーションエンジン */
window.GYEngine = (function () {
  const D = () => window.GY_DATA;
  const STORAGE = "gunyu-hagyo-v1";
  const RECORD_STORAGE = "gunyu-hagyo-records-v1";

  function rng(seed) {
    let s = seed | 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pick(rand, arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  function eraLabel(year, month) {
    const eras = D().eraNames;
    let name = "永禄";
    let start = 1558;
    for (const e of eras) {
      if (year >= e.y) {
        name = e.n;
        start = e.y;
      }
    }
    return name + (year - start + 1) + "年" + month + "月";
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function adjacent(state, aId, bId) {
    if (aId === bId) return false;
    const n = D().neighbors;
    if (n) {
      if (n[aId] && n[aId].indexOf(bId) >= 0) return true;
      if (n[bId] && n[bId].indexOf(aId) >= 0) return true;
      if (n[aId] || n[bId]) return false;
    }
    const a = state.provById[aId];
    const b = state.provById[bId];
    if (!a || !b) return false;
    return dist(a, b) < 92;
  }

  function clanProvinces(state, clanId) {
    return state.provinces.filter((p) => p.owner === clanId);
  }

  function landOf(state, clanId) {
    return clanProvinces(state, clanId).reduce((s, p) => s + p.land, 0);
  }

  function totalLand(state) {
    return state.provinces.reduce((s, p) => s + p.land, 0);
  }

  function landShare(state, clanId) {
    return landOf(state, clanId) / totalLand(state);
  }

  function troopList() {
    return D().troopTypes || [];
  }

  function emptyTroops() {
    const o = {};
    troopList().forEach((t) => {
      o[t.id] = 0;
    });
    return o;
  }

  function troopDef(id) {
    return troopList().find((t) => t.id === id) || troopList()[0];
  }

  function troopTotal(clan) {
    if (!clan || !clan.troops) return Math.max(0, Math.floor((clan && clan.soldiers) || 0));
    return troopList().reduce((s, t) => s + Math.max(0, Math.floor(clan.troops[t.id] || 0)), 0);
  }

  function syncSoldiers(clan) {
    if (!clan) return 0;
    clan.soldiers = troopTotal(clan);
    return clan.soldiers;
  }

  function ensureTroops(clan) {
    if (!clan) return emptyTroops();
    if (!clan.troops) {
      clan.troops = emptyTroops();
      clan.troops.ashigaru = Math.max(0, Math.floor(clan.soldiers || 0));
    }
    troopList().forEach((t) => {
      clan.troops[t.id] = Math.max(0, Math.floor(clan.troops[t.id] || 0));
    });
    syncSoldiers(clan);
    return clan.troops;
  }

  function splitStartingTroops(total, clanId, rand) {
    const w = { ashigaru: 52, cavalry: 12, archer: 18, gun: 5, shield: 13 };
    if (clanId === "takeda") {
      w.cavalry += 20;
      w.ashigaru -= 12;
    }
    if (clanId === "oda") {
      w.gun += 16;
      w.ashigaru -= 8;
    }
    if (clanId === "shimazu") w.ashigaru += 8;
    if (clanId === "mori") w.archer += 8;
    if (clanId === "uesugi") w.shield += 8;
    const sumW = Object.keys(w).reduce((s, k) => s + w[k], 0);
    const out = emptyTroops();
    let left = Math.max(0, Math.floor(total));
    const ids = troopList().map((t) => t.id);
    ids.forEach((id, i) => {
      if (i === ids.length - 1) out[id] = left;
      else {
        const n = Math.floor((total * w[id]) / sumW);
        out[id] = n;
        left -= n;
      }
    });
    return out;
  }

  function addTroops(clan, unitId, n) {
    ensureTroops(clan);
    const id = (troopDef(unitId) || {}).id || "ashigaru";
    clan.troops[id] = Math.max(0, (clan.troops[id] || 0) + Math.floor(n || 0));
    return syncSoldiers(clan);
  }

  function loseTroopsFrom(clan, fromCounts, loss) {
    ensureTroops(clan);
    let left = Math.max(0, Math.floor(loss || 0));
    if (left <= 0) return 0;
    const src = Object.assign({}, fromCounts || clan.troops);
    const tot = troopList().reduce((s, t) => s + Math.max(0, src[t.id] || 0), 0) || troopTotal(clan);
    if (tot <= 0) return 0;
    troopList().forEach((t) => {
      const share = Math.floor(left * ((src[t.id] || 0) / tot));
      const take = Math.min(clan.troops[t.id] || 0, share);
      clan.troops[t.id] = Math.max(0, (clan.troops[t.id] || 0) - take);
      left -= take;
    });
    if (left > 0) {
      troopList().forEach((t) => {
        if (left <= 0) return;
        const take = Math.min(clan.troops[t.id] || 0, left);
        clan.troops[t.id] -= take;
        left -= take;
      });
    }
    syncSoldiers(clan);
    return Math.max(0, Math.floor(loss) - left);
  }

  function scaleTroopCounts(src, n) {
    const want = Math.max(0, Math.floor(n || 0));
    const out = emptyTroops();
    const tot = troopList().reduce((s, t) => s + Math.max(0, (src && src[t.id]) || 0), 0);
    if (tot <= 0) {
      out.ashigaru = want;
      return out;
    }
    let used = 0;
    troopList().forEach((t, i, arr) => {
      if (i === arr.length - 1) out[t.id] = Math.max(0, want - used);
      else {
        const v = Math.floor((want * ((src[t.id] || 0)) / tot));
        out[t.id] = v;
        used += v;
      }
    });
    return out;
  }

  function matchupFactor(atkType, defCounts) {
    const table = (D().troopMatch || {})[atkType] || {};
    const tot = troopList().reduce((s, t) => s + Math.max(0, (defCounts && defCounts[t.id]) || 0), 0);
    if (!tot) return 1;
    let s = 0;
    troopList().forEach((t) => {
      s += (((defCounts && defCounts[t.id]) || 0) / tot) * (table[t.id] || 1);
    });
    return s;
  }

  function troopCombatPower(myCounts, theirCounts, role) {
    let p = 0;
    troopList().forEach((t) => {
      const n = (myCounts && myCounts[t.id]) || 0;
      if (!n) return;
      const stat = role === "def" ? t.def : t.atk;
      p += n * stat * matchupFactor(t.id, theirCounts);
    });
    return p;
  }

  function richestTroop(clan) {
    ensureTroops(clan);
    let best = "ashigaru";
    let n = -1;
    troopList().forEach((t) => {
      const v = clan.troops[t.id] || 0;
      if (v > n) {
        n = v;
        best = t.id;
      }
    });
    return best;
  }

  function troopLabel(id) {
    const t = troopDef(id);
    return t ? t.name : "";
  }

  function holdQueue(state, clanId, i) {
    const maxT = D().QUEUE_TURNS;
    if (!state.queueHold) state.queueHold = {};
    if (!state.queueHold[clanId]) state.queueHold[clanId] = Array.from({ length: maxT }, () => 0);
    while (state.queueHold[clanId].length < maxT) state.queueHold[clanId].push(0);
    state.queueHold[clanId][i] = 1;
  }

  function isQueueHeld(state, clanId, i) {
    return !!(state.queueHold && state.queueHold[clanId] && state.queueHold[clanId][i]);
  }

  function clearQueueHolds(state, clanId) {
    const maxT = D().QUEUE_TURNS;
    if (!state.queueHold) state.queueHold = {};
    state.queueHold[clanId] = Array.from({ length: maxT }, () => 0);
  }

  function shiftQueueHolds(state, clanId) {
    const maxT = D().QUEUE_TURNS;
    if (!state.queueHold || !state.queueHold[clanId]) return;
    state.queueHold[clanId].shift();
    state.queueHold[clanId].push(0);
    while (state.queueHold[clanId].length < maxT) state.queueHold[clanId].push(0);
  }

  function clearAutoQueue(state, clanId) {
    const q = state.queues[clanId];
    if (!q) return 0;
    let n = 0;
    q.forEach((slot, i) => {
      if (!slot || !slot.length) return;
      const keep = slot.filter((cmd) => !cmd.auto);
      n += slot.length - keep.length;
      if (keep.length !== slot.length) q[i] = keep;
    });
    const c = state.clanById && state.clanById[clanId];
    if (c) c.autoQueue = false;
    clearQueueHolds(state, clanId);
    return n;
  }

  function alliesOf(state, clanId) {
    const set = new Set();
    state.alliances.forEach((al) => {
      if (al.until < state.turn) return;
      if (al.a === clanId) set.add(al.b);
      if (al.b === clanId) set.add(al.a);
    });
    return set;
  }

  function isAllied(state, a, b) {
    return alliesOf(state, a).has(b);
  }

  function atWar(state, a, b) {
    const c = state.clans.find((x) => x.id === a);
    return c && c.warWith.includes(b);
  }

  function setWar(state, a, b, on) {
    const A = state.clans.find((x) => x.id === a);
    const B = state.clans.find((x) => x.id === b);
    if (!A || !B) return;
    if (on) {
      if (!A.warWith.includes(b)) A.warWith.push(b);
      if (!B.warWith.includes(a)) B.warWith.push(a);
    } else {
      A.warWith = A.warWith.filter((x) => x !== b);
      B.warWith = B.warWith.filter((x) => x !== a);
    }
  }

  function log(state, text, kind, clanId) {
    state.log.unshift({
      turn: state.turn,
      era: eraLabel(state.year, state.month),
      text,
      kind: kind || "info",
      clanId: clanId || null,
      t: Date.now()
    });
    if (state.log.length > 400) state.log.length = 400;
  }

  function snapRes(clan, prov) {
    if (!clan) return null;
    return {
      gold: clan.gold || 0,
      rice: clan.rice || 0,
      culture: clan.culture || 0,
      honor: clan.honor || 0,
      soldiers: troopTotal(clan),
      disasterResist: clan.disasterResist || 0,
      people: clan.people || 0,
      cap: clan.cap || 0,
      train: clan.train || 0,
      fort: prov ? prov.fort || 0 : null,
      agri: prov ? prov.agri || 0 : null,
      commerce: prov ? prov.commerce || 0 : null,
      pop: prov ? prov.pop || 0 : null,
      unrest: prov ? prov.unrest || 0 : null,
      land: prov ? prov.land || 0 : null
    };
  }

  function deltaText(before, after) {
    if (!before || !after) return "";
    const labels = [
      ["gold", "金"],
      ["rice", "米"],
      ["culture", "文化"],
      ["honor", "名誉"],
      ["soldiers", "兵"],
      ["disasterResist", "天災耐性"],
      ["people", "民衆"],
      ["cap", "蔵上限"],
      ["train", "訓練"],
      ["fort", "守り"],
      ["agri", "農"],
      ["commerce", "商"],
      ["pop", "人口"],
      ["unrest", "動揺"],
      ["land", "国土"]
    ];
    const parts = [];
    labels.forEach(([k, lab]) => {
      if (before[k] == null || after[k] == null) return;
      let n = after[k] - before[k];
      if (k === "train") {
        if (Math.abs(n) < 0.05) return;
        n = Math.round(n * 10) / 10;
      } else {
        n = Math.round(n);
        if (!n) return;
      }
      parts.push(lab + (n > 0 ? "+" : "") + n);
    });
    return parts.join("　");
  }

  function appendDelta(state, before, after) {
    const d = deltaText(before, after);
    if (!d || !state.log || !state.log[0]) return d;
    const line = state.log[0];
    if (line.text && line.text.indexOf(d) < 0) line.text = line.text.replace(/\s*$/, "") + " " + d;
    return d;
  }

  function isTalentPopup(pop) {
    if (!pop) return false;
    if (pop.kind === "genius") return true;
    const t = pop.title || "";
    return t === "人材発見" || t === "天才登用" || t === "異国の豪傑来訪" || t === "天才来訪";
  }

  function generalsOf(state, clanId) {
    return state.generals.filter((g) => g.clanId === clanId && g.alive);
  }

  function daimyoOf(state, clanId) {
    const c = state.clans.find((x) => x.id === clanId);
    if (!c) return null;
    return state.generals.find((g) => g.id === c.daimyoId) || generalsOf(state, clanId)[0] || null;
  }

  function bestGeneral(state, clanId, stat) {
    const gs = generalsOf(state, clanId);
    gs.sort((a, b) => statOf(b, stat) - statOf(a, stat));
    return gs[0];
  }

  function aptGrade(n) {
    if (n >= 175) return 4;
    if (n >= 145) return 3;
    if (n >= 115) return 2;
    if (n >= 85) return 1;
    return 0;
  }

  function aptFromStats(g) {
    return {
      domestic: aptGrade((g.politics || 0) + (g.intellect || 0)),
      military: aptGrade((g.leadership || 0) + (g.valor || 0)),
      culture: aptGrade((g.charm || 0) + (g.intellect || 0))
    };
  }

  function makeCaps(g) {
    const bump = g.rare ? 8 : 6;
    return {
      leadership: clamp((g.leadership || 40) + bump, 1, 100),
      valor: clamp((g.valor || 40) + bump, 1, 100),
      intellect: clamp((g.intellect || 40) + bump, 1, 100),
      politics: clamp((g.politics || 40) + bump, 1, 100),
      charm: clamp((g.charm || 40) + bump, 1, 100)
    };
  }

  let histByName = null;
  function histRow(name) {
    if (!histByName) {
      histByName = {};
      (D().historical || []).forEach((h) => {
        histByName[h[0]] = h;
      });
    }
    return histByName[name] || null;
  }

  function traitLine(g) {
    const lead = g.leadership || 0;
    const val = g.valor || 0;
    const intel = g.intellect || 0;
    const pol = g.politics || 0;
    const ch = g.charm || 0;
    const max = Math.max(lead, val, intel, pol, ch);
    if (g.gender === "f" && ch >= 78) return "容姿と才覚で人を動かす。";
    if (max === val && val >= 78) return "戦場の武勇に定評がある。";
    if (max === intel && intel >= 78) return "知略に長け、計略と軍配を任されやすい。";
    if (max === pol && pol >= 78) return "政と金回りに明るく、領国の仕置向きである。";
    if (max === lead && lead >= 78) return "兵をまとめる統率に優れ、大将の器とされる。";
    if (max === ch && ch >= 78) return "人望があり、招きと縁談に向く。";
    return "目立たぬが、乱世を生き抜く実務の士である。";
  }

  function generalIntro(state, g) {
    if (!g) return { title: "武将紹介", name: "", text: "その士の記録はない。" };
    const named = (D().bios || {})[g.name];
    const row = histRow(g.name);
    const originClan = row && state.clanById[row[1]] ? state.clanById[row[1]] : null;
    const nowClan = g.clanId && state.clanById[g.clanId] ? state.clanById[g.clanId] : null;
    const house = originClan || nowClan;
    const home = house && state.provById[house.home];
    const lines = [];
    if (named) {
      lines.push(named);
    } else if (g.origin === "sangokushi") {
      lines.push(g.name + "は三国の乱世に名を残した士。この国の戦国へ稀に現れる客将である。");
      lines.push(traitLine(g));
    } else if (g.origin === "guest") {
      lines.push(g.name + "は時代を超えて現れた稀代の客将である。");
      lines.push(traitLine(g));
    } else if (g.gender === "f") {
      if (house) {
        lines.push(
          g.name +
            "は" +
            house.name +
            "の姫" +
            (home ? "。" + home.name + "に育ち、縁組によって家と家を結ぶ" : "") +
            "。"
        );
      } else {
        lines.push(g.name + "は乱世の姫。仕える家を求めている。");
      }
      lines.push(traitLine(g));
    } else if (row && house) {
      lines.push(
        g.name +
          "は" +
          house.name +
          "の士" +
          (home ? "。" + home.name + (home.region ? "（" + home.region + "）" : "") + "の戦に名を連ねる" : "") +
          "。"
      );
      lines.push(traitLine(g));
    } else if (nowClan) {
      const p = state.provById[nowClan.home];
      lines.push(
        g.name +
          "は" +
          nowClan.name +
          "の旗下に入った士" +
          (p ? "。" + p.name + "を本拠とする家に仕える" : "") +
          "。"
      );
      lines.push(traitLine(g));
    } else {
      lines.push(g.name + "は仕官の家を持たぬ浪人。諸国を渡り、旗下に入る機会をうかがっている。");
      lines.push(traitLine(g));
    }
    if (g.skill && g.skillText) {
      lines.push("特技は「" + g.skill + "」。" + g.skillText + "。");
    }
    if (g.status === "ronin") lines.push("いまは浪人である。");
    else if (g.status === "hidden") lines.push("まだ乱世に姿を現していない。");
    else if (g.status === "captured") lines.push("いまは捕虜の身である。");
    else if (nowClan) {
      if (originClan && nowClan.id !== originClan.id) {
        lines.push("出自は" + originClan.name + "、いまは" + nowClan.name + "に仕えている。");
      } else {
        lines.push("いまは" + nowClan.name + "に仕えている。");
      }
    }
    return {
      title: "武将紹介",
      name: g.name,
      text: lines.filter(Boolean).join(""),
      rare: !!g.rare
    };
  }

  function finishGeneral(g, rand) {
    const r = rand || function () { return 0.5; };
    const per = (D().persona || {})[g.name];
    if (g.duty == null) {
      g.duty = per ? per.duty : clamp(38 + Math.floor((g.charm || 40) * 0.28) + Math.floor(r() * 22), 1, 100);
    }
    if (g.ambition == null) {
      g.ambition = per
        ? per.ambition
        : clamp(28 + Math.floor((g.leadership || 40) * 0.22) + Math.floor((g.valor || 40) * 0.12) + Math.floor(r() * 24), 1, 100);
    }
    if (!g.apt) g.apt = aptFromStats(g);
    if (!g.cap) g.cap = makeCaps(g);
    if (g.exp == null) g.exp = 0;
    if (!g.post) g.post = "none";
    if (g.station === undefined) g.station = null;
    if (!g.equip) g.equip = { weapon: null, armor: null, horse: null, item: null };
    if (!g.gender) g.gender = "m";
    if (g.marriedTo === undefined) g.marriedTo = null;
    return g;
  }

  function treasureDef(id) {
    return (D().treasures || []).find((t) => t.id === id) || null;
  }

  function aptLabel(n) {
    return (D().aptGrades || ["D", "C", "B", "A", "S"])[clamp(n || 0, 0, 4)];
  }

  function clanStash(clan) {
    if (!clan.stash) clan.stash = [];
    return clan.stash;
  }

  function findStash(clan, uid) {
    return clanStash(clan).find((x) => x.uid === uid) || null;
  }

  function statOf(g, key) {
    if (!g) return 40;
    let v = g[key] || 0;
    const post = g.post;
    const apt = (g.apt && post && g.apt[post]) || 0;
    if (post === "domestic" && (key === "politics" || key === "intellect")) v += 4 + apt;
    if (post === "military" && (key === "leadership" || key === "valor")) v += 4 + apt;
    if (post === "culture" && (key === "charm" || key === "intellect")) v += 4 + apt;
    const slots = g.equip || {};
    ["weapon", "armor", "horse", "item"].forEach((slot) => {
      const def = treasureDef(slots[slot]);
      if (def && def.bonus && def.bonus[key]) v += def.bonus[key];
    });
    if (key === "duty" || key === "ambition") return clamp(v, 1, 100);
    return clamp(v, 1, 120);
  }

  function pickTreasureDef(rand, prefer) {
    const pool = (D().treasures || []).filter((t) => !prefer || t.kind === prefer || t.slot === prefer);
    const list = pool.length ? pool : D().treasures || [];
    if (!list.length) return null;
    const weights = list.map((t) => Math.max(1, 7 - (t.rarity || 2)));
    let sum = 0;
    weights.forEach((w) => (sum += w));
    let n = rand() * sum;
    for (let i = 0; i < list.length; i++) {
      n -= weights[i];
      if (n <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function grantTreasure(state, clan, rand, prefer) {
    const def = pickTreasureDef(rand, prefer);
    if (!def || !clan) return null;
    const item = { uid: uid("t"), itemId: def.id };
    clanStash(clan).push(item);
    return { item, def };
  }

  function unequipGeneral(g) {
    if (!g || !g.equip) return;
    g.equip = { weapon: null, armor: null, horse: null, item: null };
  }

  function equipItem(state, clan, general, itemId, slot) {
    const def = treasureDef(itemId);
    if (!def || def.kind !== "equip") return "その品は装備できない。";
    const useSlot = slot || def.slot;
    if (def.slot !== useSlot) return "部位が合わない。";
    const owned = clanStash(clan).some((x) => x.itemId === itemId);
    if (!owned) return "蔵にその品はない。";
    const held = generalsOf(state, clan.id).filter((x) => x.equip && x.equip[useSlot] === itemId).length;
    const copies = clanStash(clan).filter((x) => x.itemId === itemId).length;
    if (held >= copies && (!general.equip || general.equip[useSlot] !== itemId)) return "その品はすでに他の士が帯びている。";
    if (!general.equip) general.equip = { weapon: null, armor: null, horse: null, item: null };
    general.equip[useSlot] = itemId;
    return "";
  }

  function setPost(state, clan, general, post) {
    if (!general || general.clanId !== clan.id || !general.alive) return "その武将は配属できない。";
    if (["none", "domestic", "military", "culture"].indexOf(post) < 0) return "配属先が不明です。";
    general.post = post;
    return "";
  }

  function stationedAt(state, provId) {
    return (state.generals || []).filter(
      (g) => g.alive && g.status === "active" && g.station === provId
    );
  }

  function provMods(state, prov) {
    const gs = prov ? stationedAt(state, prov.id) : [];
    const n = gs.length;
    return {
      fort: Math.min(3, n),
      agri: Math.min(2, n),
      commerce: Math.min(2, n),
      names: gs.map((g) => g.name)
    };
  }

  function provStat(state, prov, key) {
    if (!prov) return 0;
    return (prov[key] || 0) + (provMods(state, prov)[key] || 0);
  }

  function setStation(state, clan, general, provinceId) {
    if (!general || general.clanId !== clan.id || !general.alive) return "その武将は駐在できない。";
    if (!provinceId) {
      general.station = null;
      return "";
    }
    const p = state.provById[provinceId];
    if (!p || p.owner !== clan.id) return "自領の国を選んでください。";
    general.station = provinceId;
    return "";
  }

  function clearStationIf(state, pred) {
    (state.generals || []).forEach((g) => {
      if (g.station && pred(g)) g.station = null;
    });
  }

  function relicMods(clan) {
    const mods = { gold: 0, culture: 0, honor: 0, train: 0, resist: 0 };
    clanStash(clan).forEach((it) => {
      const def = treasureDef(it.itemId);
      if (!def || def.kind !== "relic" || !def.relic) return;
      Object.keys(def.relic).forEach((k) => {
        mods[k] = (mods[k] || 0) + def.relic[k];
      });
    });
    return mods;
  }

  function useConsumable(state, clan, uid, provinceId) {
    const it = findStash(clan, uid);
    if (!it) return "蔵にその道具はない。";
    const def = treasureDef(it.itemId);
    if (!def || def.kind !== "consumable") return "それは使い捨てではない。";
    const prov = provinceId ? state.provById[provinceId] : clanProvinces(state, clan.id)[0];
    const needProv = def.use === "kenchi" || def.use === "agri" || def.use === "fort" || def.use === "land" || def.use === "heal";
    if (needProv && (!prov || prov.owner !== clan.id)) return "自領の国を対象に選んでください。";
    if (def.use === "kenchi") {
      prov.commerce += 2;
      const pg = bestGeneral(state, clan.id, "politics");
      clan.gold += 160 + Math.floor(statOf(pg, "politics") * 1.5);
    } else if (def.use === "agri") {
      prov.agri += 2;
      clan.rice += 90;
    } else if (def.use === "gold") {
      clan.gold += 220 + Math.floor(randRef(state)() * 180);
    } else if (def.use === "fort") {
      prov.fort += 2;
      clan.fortBonus += 2;
    } else if (def.use === "land") {
      if (prov.land >= 8) return prov.name + "はこれ以上開墾できない。";
      prov.land += 1;
      prov.agri += 1;
    } else if (def.use === "heal") {
      prov.unrest = Math.max(0, prov.unrest - 12);
      prov.pop += 10;
    } else if (def.use === "polgold") {
      clan.gold += 140;
    } else if (def.use === "rice") {
      clan.rice += 160;
    }
    clan.stash = clanStash(clan).filter((x) => x.uid !== uid);
    log(state, clan.name + "が「" + def.name + "」を用いた。" + def.text, "dom", clan.id);
    return "";
  }

  function autoAssignClan(state, clanId) {
    const gs = generalsOf(state, clanId).filter((g) => g.status === "active" && g.alive);
    const want = { domestic: 3, military: 3, culture: 2 };
    const used = new Set(gs.filter((g) => g.post && g.post !== "none").map((g) => g.id));
    const fill = (post, key) => {
      const free = gs.filter((g) => !used.has(g.id)).sort((a, b) => statOf(b, key) - statOf(a, key));
      let n = gs.filter((g) => g.post === post).length;
      for (let i = 0; i < free.length && n < want[post]; i++) {
        free[i].post = post;
        used.add(free[i].id);
        n += 1;
      }
    };
    fill("military", "valor");
    fill("domestic", "politics");
    fill("culture", "charm");
  }

  function growAssigned(state) {
    const rand = randRef(state);
    state.clans.forEach((c) => {
      if (!c.alive) return;
      generalsOf(state, c.id).forEach((g) => {
        if (!g.alive || g.post === "none") return;
        const apt = (g.apt && g.apt[g.post]) || 0;
        g.exp = (g.exp || 0) + 7 + apt * 5;
        if (g.duty > 70) g.loyalty = clamp((g.loyalty || 50) + 1, 1, 100);
        if (g.exp < 100) return;
        g.exp -= 100;
        const keys =
          g.post === "domestic"
            ? ["politics", "intellect"]
            : g.post === "military"
              ? ["leadership", "valor"]
              : ["charm", "intellect"];
        const grew = [];
        keys.forEach((k) => {
          const cap = (g.cap && g.cap[k]) || 100;
          if (g[k] < cap && rand() < 0.62 + apt * 0.08) {
            g[k] += 1;
            grew.push(k);
          }
        });
        if (grew.length && (g.rare || rand() < 0.22)) {
          log(state, g.name + "が配属先で腕を上げた（" + grew.join("・") + "）。", "cul", c.id);
        }
      });
    });
  }

  function emptyHall() {
    return { players: [] };
  }

  function loadHall() {
    try {
      const raw = localStorage.getItem(RECORD_STORAGE);
      if (!raw) return emptyHall();
      const hall = JSON.parse(raw);
      if (!hall || !Array.isArray(hall.players)) return emptyHall();
      return hall;
    } catch {
      return emptyHall();
    }
  }

  function saveHall(hall) {
    try {
      localStorage.setItem(RECORD_STORAGE, JSON.stringify(hall));
    } catch (e) {
      console.warn(e);
    }
  }

  function upsertPlayer(name) {
    const n = normName(name) || "無名の君主";
    const hall = loadHall();
    let p = hall.players.find((x) => normName(x.name) === n);
    if (p) return p;
    if (hall.players.length >= (D().MAX_RECORD_PLAYERS || 50)) return null;
    p = { id: uid("h"), name: n, createdAt: Date.now(), records: [] };
    hall.players.unshift(p);
    saveHall(hall);
    return p;
  }

  function playerNameTaken(name, exceptId) {
    const n = normName(name);
    if (!n) return false;
    return loadHall().players.some((p) => p.id !== exceptId && normName(p.name) === n);
  }

  function normName(name) {
    return String(name || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }

  function deleteRecordPlayer(id) {
    const hall = loadHall();
    hall.players = hall.players.filter((p) => p.id !== id);
    saveHall(hall);
    return hall;
  }

  function addRecord(playerId, rec) {
    const hall = loadHall();
    const p = hall.players.find((x) => x.id === playerId);
    if (!p) return;
    if (!p.records) p.records = [];
    p.records.unshift(rec);
    if (p.records.length > (D().MAX_RECORDS || 100)) p.records.length = D().MAX_RECORDS || 100;
    saveHall(hall);
  }

  function rankLabel(n) {
    return ["一位", "二位", "三位", "四位", "五位", "六位"][n - 1] || n + "位";
  }

  function ensureGameSeats(state) {
    if (state.seats && state.seats.length) return state.seats;
    const seats = [];
    const used = {};
    (state.players || []).forEach((p) => {
      if (!p || !p.clanId || used[p.clanId]) return;
      used[p.clanId] = 1;
      seats.push({
        clanId: p.clanId,
        name: p.name || "",
        ai: false,
        recordId: p.recordId || null
      });
    });
    (state.clans || []).forEach((c) => {
      if (seats.length >= 6) return;
      if (!c.playable || used[c.id]) return;
      used[c.id] = 1;
      seats.push({
        clanId: c.id,
        name: "PC・" + c.name,
        ai: true,
        recordId: null
      });
    });
    state.seats = seats.slice(0, 6);
    return state.seats;
  }

  function cultureMax() {
    return D().CULTURE_MAX || 99;
  }

  function cultureLuck(culture) {
    return clamp((culture || 0) / cultureMax(), 0, 1);
  }

  function eventPickWeight(ev, luck) {
    const w = ev && ev.weight ? ev.weight : 1;
    if (ev && ev.kind === "disaster") return w * (1 - 0.45 * luck);
    return w * (1 + 0.7 * luck);
  }

  function debugCultureEvents(n, culture, seed) {
    const rand = rng(seed || 1);
    const luck = cultureLuck(culture);
    const events = D().events || [];
    let fire = 0;
    let good = 0;
    let bad = 0;
    let dodge = 0;
    for (let i = 0; i < n; i++) {
      if (rand() > 0.11) continue;
      fire += 1;
      const ev = weightedPick(rand, events, (e) => eventPickWeight(e, luck));
      if (ev && ev.kind === "disaster") {
        if (rand() < luck * 0.12) dodge += 1;
        else bad += 1;
      } else {
        good += 1;
      }
    }
    return {
      n: n,
      culture: culture,
      luck: luck,
      fire: fire,
      good: good,
      bad: bad,
      dodge: dodge,
      goodRate: n ? good / n : 0,
      badRate: n ? bad / n : 0
    };
  }

  function weightedPick(rand, items, weightFn) {
    let total = 0;
    const ws = items.map((item) => {
      const w = Math.max(0, weightFn(item));
      total += w;
      return w;
    });
    if (total <= 0) return pick(rand, items);
    let r = rand() * total;
    for (let i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function clanRankScore(state, clan, tot) {
    if (!clan) return 0;
    const landNeed = D().WIN_RATIO || 0.6;
    const cultNeed = cultureMax();
    const landPart = tot ? landOf(state, clan.id) / tot / landNeed : 0;
    const cultPart = (clan.culture || 0) / cultNeed;
    return Math.round((landPart + cultPart) * 1000) / 1000;
  }

  function buildStandings(state, opts) {
    opts = opts || {};
    const tot = totalLand(state) || 1;
    const winnerId = state.winner && state.winner.clanId;
    const byScore = !!(opts.byScore || (state.winner && state.winner.why === "endwar"));
    const rows = ensureGameSeats(state).slice(0, 6).map((s) => {
      const c = state.clanById && state.clanById[s.clanId];
      const land = c ? landOf(state, c.id) : 0;
      return {
        clanId: s.clanId,
        clanName: c ? c.name : s.clanId,
        playerName: s.name || "",
        ai: !!s.ai,
        alive: !!(c && c.alive),
        wandered: !!(c && c.wandered),
        share: Math.round((land / tot) * 1000) / 10,
        culture: c ? c.culture || 0 : 0,
        land: land,
        gold: c ? c.gold || 0 : 0,
        score: clanRankScore(state, c, tot),
        winner: winnerId === s.clanId
      };
    });
    rows.sort((a, b) => {
      if (!byScore && a.winner !== b.winner) return a.winner ? -1 : 1;
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (byScore && b.score !== a.score) return b.score - a.score;
      if (b.land !== a.land) return b.land - a.land;
      if (b.culture !== a.culture) return b.culture - a.culture;
      return (b.gold || 0) - (a.gold || 0);
    });
    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
    return rows;
  }

  function writeGameRecords(state) {
    if (!state || state.recordWritten) return;
    const w = state.winner;
    const standings = state.standings || buildStandings(state);
    state.standings = standings;
    const slim = standings.map((s) => ({
      rank: s.rank,
      clanId: s.clanId,
      clanName: s.clanName,
      playerName: s.playerName,
      share: s.share,
      culture: s.culture,
      land: s.land,
      score: s.score,
      ai: s.ai,
      winner: !!s.winner
    }));
    (state.players || []).forEach((p) => {
      if (!p.recordId) {
        const rec = upsertPlayer(p.name);
        if (rec) p.recordId = rec.id;
      }
      if (!p.recordId) return;
      const clan = state.clanById[p.clanId];
      const win = !!(w && w.clanId === p.clanId);
      const mine = standings.find((s) => s.clanId === p.clanId);
      addRecord(p.recordId, {
        t: Date.now(),
        era: eraLabel(state.year, state.month),
        turn: state.turn,
        clanId: p.clanId,
        clanName: clan ? clan.name : "",
        result: w ? (win ? "win" : "lose") : "mid",
        why: w ? w.why : "",
        share: clan ? Math.round(landShare(state, clan.id) * 1000) / 10 : 0,
        culture: clan ? clan.culture : 0,
        rank: mine ? mine.rank : null,
        score: mine ? mine.score : 0,
        standings: slim
      });
    });
    state.recordWritten = true;
  }

  function findCmd(id) {
    const C = D().commands;
    for (const cat of Object.keys(C)) {
      const hit = C[cat].find((c) => c.id === id);
      if (hit) return { cat, def: hit };
    }
    return null;
  }

  function canPay(clan, cost) {
    if (!cost) return true;
    if ((cost.gold || 0) > clan.gold) return false;
    if ((cost.rice || 0) > clan.rice) return false;
    return true;
  }

  function pay(clan, cost) {
    if (!cost) return;
    clan.gold = Math.max(0, clan.gold - (cost.gold || 0));
    clan.rice = Math.max(0, clan.rice - (cost.rice || 0));
  }

  function staffStartingGenerals(list, rand) {
    const n = D().START_GENERALS || 6;
    const power = (g) => (g.leadership || 0) + (g.politics || 0) + (g.rare ? 40 : 0);
    D().clans.forEach((c) => {
      const gs = list.filter((g) => g.clanId === c.id && g.alive && g.status === "active");
      const hime = gs.find((g) => g.gender === "f");
      const males = gs.filter((g) => g.gender !== "f").sort((a, b) => power(b) - power(a));
      const keep = [];
      males.forEach((g) => {
        if (keep.length < (hime ? n - 1 : n)) keep.push(g);
      });
      if (hime && keep.length < n) keep.push(hime);
      gs.sort((a, b) => power(b) - power(a)).forEach((g) => {
        if (keep.length < n && keep.indexOf(g) < 0) keep.push(g);
      });
      const keepSet = {};
      keep.forEach((g) => {
        keepSet[g.id] = 1;
      });
      gs.forEach((g) => {
        if (!keepSet[g.id]) {
          unequipGeneral(g);
          g.post = "none";
          g.station = null;
          g.clanId = null;
          g.status = "ronin";
        }
      });
      const pool = list.filter((g) => g.status === "ronin" && g.alive && !g.rare && g.origin === "sengoku");
      while (keep.length < n && pool.length) {
        const t = pool.shift();
        t.clanId = c.id;
        t.status = "active";
        t.loyalty = 58 + Math.floor(rand() * 22);
        keep.push(t);
      }
    });
  }

  function makeGenerals(rand) {
    const data = D();
    const used = new Set();
    const list = [];
    let n = 0;

    function add(g) {
      if (used.has(g.name)) return;
      used.add(g.name);
      finishGeneral(g, rand);
      list.push(g);
      n += 1;
    }

    data.historical.forEach((h) => {
      add({
        id: "g" + n,
        name: h[0],
        clanId: h[1],
        origin: "sengoku",
        rare: false,
        alive: true,
        leadership: h[2],
        valor: h[3],
        intellect: h[4],
        politics: h[5],
        charm: h[6],
        loyalty: 70 + Math.floor(rand() * 25),
        age: 18 + Math.floor(rand() * 40),
        skill: null,
        skillText: "",
        status: "active"
      });
    });

    data.sangokushi.forEach((s, i) => {
      add({
        id: "r" + i,
        name: s.name,
        clanId: null,
        origin: "sangokushi",
        rare: true,
        alive: true,
        leadership: s.leadership,
        valor: s.valor,
        intellect: s.intellect,
        politics: s.politics,
        charm: s.charm,
        loyalty: 40 + Math.floor(rand() * 30),
        age: 20 + Math.floor(rand() * 30),
        skill: s.skill,
        skillText: s.skillText,
        status: "hidden"
      });
    });

    (data.guestRares || []).forEach((s, i) => {
      add({
        id: "x" + i,
        name: s.name,
        clanId: null,
        origin: "guest",
        rare: true,
        alive: true,
        gender: s.gender || "m",
        leadership: s.leadership,
        valor: s.valor,
        intellect: s.intellect,
        politics: s.politics,
        charm: s.charm,
        loyalty: 45 + Math.floor(rand() * 25),
        age: s.age || 18 + Math.floor(rand() * 20),
        skill: s.skill,
        skillText: s.skillText,
        status: "hidden"
      });
    });

    (data.famousDaughters || []).forEach((s, i) => {
      add({
        id: "d" + i,
        name: s.name,
        clanId: s.clanId,
        origin: "sengoku",
        rare: false,
        alive: true,
        gender: "f",
        marriedTo: null,
        leadership: s.leadership,
        valor: s.valor,
        intellect: s.intellect,
        politics: s.politics,
        charm: s.charm,
        loyalty: 70 + Math.floor(rand() * 20),
        age: 21 + Math.floor(rand() * 10),
        skill: "姫",
        skillText: "縁組で家と家を結ぶ",
        status: "active"
      });
    });
    const himePool = data.himeNames || ["松", "菊", "梅"];
    data.clans.forEach((c) => {
      let have = list.filter((g) => g.clanId === c.id && g.gender === "f").length;
      let hi = 0;
      const prefix = String(c.name || "").replace(/家$|衆$|一揆$|将軍家$/, "");
      while (have < 1 && hi < himePool.length) {
        const nm = prefix + himePool[hi] + "姫";
        hi += 1;
        const before = list.length;
        add({
          id: "d" + list.length,
          name: nm,
          clanId: c.id,
          origin: "sengoku",
          rare: false,
          alive: true,
          gender: "f",
          marriedTo: null,
          leadership: 28 + Math.floor(rand() * 24),
          valor: 12 + Math.floor(rand() * 20),
          intellect: 40 + Math.floor(rand() * 30),
          politics: 40 + Math.floor(rand() * 30),
          charm: 60 + Math.floor(rand() * 30),
          loyalty: 70 + Math.floor(rand() * 20),
          age: 21 + Math.floor(rand() * 10),
          skill: "姫",
          skillText: "縁組で家と家を結ぶ",
          status: "active"
        });
        if (list.length > before) have += 1;
      }
    });

    let guard = 0;
    while (list.length < data.TOTAL_GENERALS && guard < 20000) {
      guard += 1;
      const sur = pick(rand, data.surnames);
      const a = pick(rand, data.nameA);
      const b = pick(rand, data.nameB);
      const name = sur + a + b;
      const roll = rand();
      let leadership, valor, intellect, politics, charm;
      if (roll < 0.28) {
        leadership = 48 + Math.floor(rand() * 38);
        valor = 52 + Math.floor(rand() * 40);
        intellect = 18 + Math.floor(rand() * 40);
        politics = 14 + Math.floor(rand() * 38);
        charm = 20 + Math.floor(rand() * 40);
      } else if (roll < 0.52) {
        leadership = 28 + Math.floor(rand() * 36);
        valor = 16 + Math.floor(rand() * 36);
        intellect = 42 + Math.floor(rand() * 40);
        politics = 52 + Math.floor(rand() * 38);
        charm = 32 + Math.floor(rand() * 40);
      } else if (roll < 0.72) {
        leadership = 34 + Math.floor(rand() * 38);
        valor = 18 + Math.floor(rand() * 38);
        intellect = 54 + Math.floor(rand() * 40);
        politics = 38 + Math.floor(rand() * 38);
        charm = 28 + Math.floor(rand() * 40);
      } else {
        leadership = 28 + Math.floor(rand() * 42);
        valor = 28 + Math.floor(rand() * 42);
        intellect = 24 + Math.floor(rand() * 42);
        politics = 24 + Math.floor(rand() * 42);
        charm = 24 + Math.floor(rand() * 40);
      }
      add({
        id: "g" + list.length,
        name,
        clanId: null,
        origin: "sengoku",
        rare: false,
        alive: true,
        leadership,
        valor,
        intellect,
        politics,
        charm,
        loyalty: 50 + Math.floor(rand() * 40),
        age: 16 + Math.floor(rand() * 45),
        skill: null,
        skillText: "",
        status: "ronin"
      });
    }

    staffStartingGenerals(list, rand);
    return list.slice(0, data.TOTAL_GENERALS);
  }

  function emptyQueue() {
    return Array.from({ length: D().QUEUE_TURNS }, () => []);
  }

  function applyStartingCountries(provinces, seats) {
    const homes = {};
    D().clans.forEach((c) => {
      homes[c.id] = c.home;
    });
    (seats || []).forEach((seat) => {
      if (!seat || !seat.clanId || !seat.startProvince) return;
      const dest = provinces.find((p) => p.id === seat.startProvince);
      if (!dest) return;
      const prev = dest.owner;
      const oldHome = provinces.find((p) => p.id === homes[seat.clanId]);
      dest.owner = seat.clanId;
      homes[seat.clanId] = dest.id;
      if (prev !== seat.clanId && oldHome && oldHome.id !== dest.id && oldHome.owner === seat.clanId) {
        oldHome.owner = prev;
        if (homes[prev] === dest.id) homes[prev] = oldHome.id;
      }
    });
    return homes;
  }

  function createGame(opts) {
    const data = D();
    const seed = (opts.seed || Date.now()) >>> 0;
    const rand = rng(seed);
    const generals = makeGenerals(rand);
    const seats = opts.players || [];

    const provinces = data.provinces.map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      land: p.land,
      def: p.def,
      region: p.region,
      owner: p.start,
      fort: p.def,
      agri: 2 + Math.floor(rand() * 3),
      commerce: 1 + Math.floor(rand() * 3),
      pop: 40 + p.land * 18 + Math.floor(rand() * 20),
      unrest: Math.floor(rand() * 8)
    }));
    const homes = applyStartingCountries(provinces, seats);

    const clans = data.clans.map((c) => {
      const owned = provinces.filter((p) => p.owner === c.id);
      const land = owned.reduce((s, p) => s + p.land, 0) || 1;
      const people = owned.reduce((s, p) => s + p.pop, 0);
      const gs = generals.filter((g) => g.clanId === c.id && g.status === "active");
      gs.sort((a, b) => b.leadership + b.politics - (a.leadership + a.politics));
      const dai = gs.find((g) => g.gender !== "f") || gs[0];
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        mon: c.mon,
        playable: c.playable,
        home: homes[c.id] || c.home,
        ai: true,
        rice: 700 + land * 160,
        gold: 620 + land * 140,
        soldiers: 420 + land * 160,
        troops: splitStartingTroops(420 + land * 160, c.id, rand),
        people,
        culture: 6 + Math.floor(rand() * 7),
        fortBonus: 0,
        train: 1,
        cap: 2500 + land * 400,
        disasterResist: 0,
        honor: 50,
        alive: owned.length > 0,
        warWith: [],
        daimyoId: dai ? dai.id : null,
        lastIntel: {},
        provIntel: {},
        stash: [],
        autoQueue: false,
        wandered: false
      };
    });

    generals.forEach((g) => {
      if (g.rare || g.origin === "sangokushi" || g.origin === "guest") {
        g.clanId = null;
        g.status = "hidden";
      } else if (!g.clanId) {
        g.status = "ronin";
      }
    });

    const humans = seats.filter((p) => !p.ai);
    const humanClanIds = humans.map((p) => p.clanId);
    clans.forEach((c) => {
      c.ai = !humanClanIds.includes(c.id);
      const gs = generals.filter((g) => g.clanId === c.id && g.status === "active");
      gs.sort((a, b) => b.leadership + b.politics - (a.leadership + a.politics));
      const dai = gs.find((g) => g.gender !== "f") || gs[0];
      if (dai) c.daimyoId = dai.id;
    });

    const queues = {};
    clans.forEach((c) => {
      queues[c.id] = emptyQueue();
    });

    const state = {
      seed,
      year: 1560,
      month: 1,
      turn: 1,
      turnMs: opts.turnMs || data.DEFAULT_TURN_MS,
      turnEndsAt: Date.now() + (opts.turnMs || data.DEFAULT_TURN_MS),
      players: humans.map((p, i) => {
        const rec = upsertPlayer(p.name || "君主" + (i + 1));
        return {
          id: "p" + i,
          name: p.name || "君主" + (i + 1),
          clanId: p.clanId,
          recordId: rec ? rec.id : null
        };
      }),
      currentPlayerId: "p0",
      clans,
      provinces,
      generals,
      alliances: [],
      offers: [],
      queues,
      log: [],
      popup: null,
      winner: null,
      standings: null,
      seats: seats.map((p) => ({
        clanId: p.clanId,
        name: p.name || "",
        ai: !!p.ai
      })),
      ready: {},
      paused: true,
      pauseLeft: opts.turnMs || data.DEFAULT_TURN_MS,
      recordWritten: false,
      lastSeenAt: Date.now(),
      awayTurns: 0,
      awayEnded: false
    };
    index(state);
    state.clans.forEach((c) => {
      autoAssignClan(state, c.id);
      if (c.playable) {
        grantTreasure(state, c, rand, "equip");
        grantTreasure(state, c, rand, "consumable");
      }
    });
    log(state, "永禄三年、六十余州に群雄が起つ。国土の六割を制した家が天下人となる。文化はお恵みや来訪を寄せる。", "system");
    return state;
  }

  function index(state) {
    state.provById = {};
    state.provinces.forEach((p) => {
      state.provById[p.id] = p;
    });
    state.clanById = {};
    state.clans.forEach((c) => {
      c.people = clanProvinces(state, c.id).reduce((s, p) => s + p.pop, 0);
      c.alive = clanProvinces(state, c.id).length > 0;
      c.culture = clamp(c.culture || 0, 0, cultureMax());
      ensureTroops(c);
      state.clanById[c.id] = c;
    });
  }

  function skillHas(g, word) {
    return g && g.rare && g.skillText && g.skillText.indexOf(word) >= 0;
  }

  function officer(state, cmd, clanId) {
    if (cmd.generalId) {
      const g = state.generals.find((x) => x.id === cmd.generalId);
      if (g && g.alive && g.clanId === clanId) return g;
    }
    const found = findCmd(cmd.sub);
    const cat = found ? found.cat : "";
    const post = cat === "domestic" ? "domestic" : cat === "war" ? "military" : cat === "culture" ? "culture" : null;
    const key = post === "domestic" ? "politics" : post === "culture" ? "charm" : "leadership";
    if (post) {
      const posted = generalsOf(state, clanId).filter((x) => x.post === post);
      if (posted.length) {
        posted.sort((a, b) => statOf(b, key) - statOf(a, key));
        return posted[0];
      }
    }
    return bestGeneral(state, clanId, key);
  }

  function successRoll(rand, chance) {
    return rand() < clamp(chance, 0.05, 0.95);
  }

  function visibleRonin(state) {
    return state.generals.filter((g) => g.status === "ronin" && g.alive && !g.rare);
  }

  function hiddenRares(state) {
    return state.generals.filter((g) => g.rare && g.alive && g.status === "hidden");
  }

  function pickRecruit(state, rand, preferBest) {
    const rate = D().RARE_APPEAR == null ? 0.01 : D().RARE_APPEAR;
    if (rand() < rate) {
      const rares = hiddenRares(state);
      if (rares.length) return pick(rand, rares);
    }
    const ronin = visibleRonin(state);
    if (!ronin.length) return null;
    if (preferBest) {
      ronin.sort((a, b) => (b.leadership || 0) - (a.leadership || 0));
      return ronin[0];
    }
    return pick(rand, ronin);
  }

  function enlistGeneral(g, clan, loyalty) {
    if (!g || !clan) return;
    g.clanId = clan.id;
    g.status = "active";
    g.loyalty = loyalty;
    g.post = "none";
    g.station = null;
  }

  function tryCulture(state, clan, chance, charm) {
    if (!clan) return 0;
    const rand = randRef(state);
    const p = clamp((chance || 0) + (charm || 0) / 900, 0.04, 0.48);
    if (!successRoll(rand, p)) return 0;
    const before = clan.culture || 0;
    clan.culture = clamp(before + 1, 0, cultureMax());
    return clan.culture > before ? 1 : 0;
  }

  function cultureTail(gained) {
    return gained ? "文化+1。" : "";
  }

  function captureOfficer(state, winner, loser, chance) {
    if (!winner || !loser) return null;
    const rand = randRef(state);
    if (rand() > chance) return null;
    const cands = generalsOf(state, loser.id).filter((g) => g.id !== loser.daimyoId);
    if (!cands.length) return null;
    cands.sort((a, b) => (a.loyalty || 50) - (b.loyalty || 50));
    const t = cands[0];
    unequipGeneral(t);
    t.post = "none";
    t.station = null;
    t.clanId = winner.id;
    t.status = "active";
    t.loyalty = 26 + Math.floor(rand() * 24);
    log(state, winner.name + "が戦いのあと" + t.name + "を捕虜とし、自軍に加えた。", "war", winner.id);
    return t;
  }

  function takeProvince(state, prov, newOwner, reason) {
    const old = prov.owner;
    if (old === newOwner) return;
    clearStationIf(state, (g) => g.station === prov.id);
    prov.owner = newOwner;
    prov.unrest = Math.min(40, prov.unrest + 12);
    const oc = state.clanById[old];
    const nc = state.clanById[newOwner];
    if (oc && !clanProvinces(state, old).length) {
      oc.alive = false;
      const gs = generalsOf(state, old).slice();
      const captured = [];
      gs.forEach((g) => {
        unequipGeneral(g);
        g.post = "none";
        g.station = null;
        if (randRef(state)() < 0.6) {
          g.clanId = newOwner;
          g.loyalty = 35 + Math.floor(randRef(state)() * 20);
          g.status = "active";
          captured.push(g);
        } else {
          g.clanId = null;
          g.status = "ronin";
        }
      });
      log(state, oc.name + "は滅び、" + nc.name + "が" + prov.name + "を含む遺領を接収した。", "war", newOwner);
      if (captured.length) {
        log(state, nc.name + "が" + captured.map((g) => g.name).join("、") + "を捕虜として仕えた。", "war", newOwner);
      }
    } else {
      log(state, nc.name + "が" + prov.name + "を制した。" + (reason ? reason : ""), "war", newOwner);
      captureOfficer(state, nc, oc, 0.42);
    }
  }

  let _rand = null;
  function randRef(state) {
    if (!_rand) _rand = rng(state.seed + state.turn * 997);
    return _rand;
  }

  function battle(state, atkClan, prov, g, soldiers, style, unit) {
    const rand = randRef(state);
    const defClan = state.clanById[prov.owner];
    if (!defClan || !defClan.alive) return;
    if (isAllied(state, atkClan.id, defClan.id) && style !== "break") {
      log(state, atkClan.name + "は同盟中の" + defClan.name + "を攻められず、信義を守った。", "dip", atkClan.id);
      return;
    }
    if (isAllied(state, atkClan.id, defClan.id)) {
      state.alliances = state.alliances.filter(
        (al) => !((al.a === atkClan.id && al.b === defClan.id) || (al.a === defClan.id && al.b === atkClan.id))
      );
      atkClan.honor = Math.max(0, atkClan.honor - 20);
    }
    setWar(state, atkClan.id, defClan.id, true);
    ensureTroops(atkClan);
    ensureTroops(defClan);

    const want = Math.min(soldiers || Math.floor(troopTotal(atkClan) * 0.35), troopTotal(atkClan));
    const unitId = unit && troopDef(unit) ? troopDef(unit).id : null;
    let atkCounts;
    if (unitId) {
      const have = atkClan.troops[unitId] || 0;
      atkCounts = emptyTroops();
      atkCounts[unitId] = Math.min(want, have);
    } else {
      atkCounts = scaleTroopCounts(atkClan.troops, want);
    }
    const send = troopList().reduce((s, t) => s + (atkCounts[t.id] || 0), 0);
    if (send < 80) {
      log(state, atkClan.name + "は兵が足りず、" + prov.name + "へ出られなかった。", "war", atkClan.id);
      return;
    }

    const defG = bestGeneral(state, defClan.id, "leadership") || generalsOf(state, defClan.id).find((x) => x.post === "military");
    let atkMod = 1;
    let defMod = 1 + provStat(state, prov, "fort") * 0.12 + defClan.fortBonus * 0.05;
    if (style === "kyoshu") atkMod += 0.35;
    if (style === "yashu") atkMod += g && statOf(g, "intellect") > 75 ? 0.5 : 0.1;
    if (style === "kakei") atkMod += g && (statOf(g, "intellect") > 80 || g.skill === "美周郎") ? 0.55 : 0.15;
    if (style === "kihei") {
      atkMod += 0.3 + (g && statOf(g, "valor") > 85 ? 0.2 : 0);
      if ((atkCounts.cavalry || 0) / send >= 0.4) atkMod += 0.18;
    }
    if (style === "teppo") {
      atkMod += 0.4;
      defMod *= 0.7;
      if ((atkCounts.gun || 0) / send >= 0.4) atkMod += 0.16;
    }
    if (style === "hoi") defMod *= 0.85;
    if (style === "fukuhei") defMod += 0.25;
    if (g && g.rare && g.skill === "飛将") atkMod += 0.35;
    if (g && g.rare && g.skill === "義勇") atkMod += 0.2;
    if (g && g.rare && g.skill === "遼来来") atkMod += 0.18;

    const atkPow =
      troopCombatPower(atkCounts, defClan.troops, "atk") *
      (0.55 + (g ? statOf(g, "valor") + statOf(g, "leadership") : 80) / 280) *
      atkMod *
      (0.85 + (atkClan.train + relicMods(atkClan).train) * 0.08);
    const defPow =
      Math.max(180, troopCombatPower(defClan.troops, atkCounts, "def") * 0.42) *
      (0.5 + (defG ? statOf(defG, "leadership") + statOf(defG, "valor") : 70) / 280) *
      defMod;

    const ratio = atkPow / (defPow + 1);
    const atkLoss = Math.floor(send * clamp(0.12 + (1 - Math.min(ratio, 1.6)) * 0.28, 0.08, 0.7));
    const defLoss = Math.floor(troopTotal(defClan) * clamp(0.08 + ratio * 0.18, 0.05, 0.55));
    loseTroopsFrom(atkClan, atkCounts, atkLoss);
    loseTroopsFrom(defClan, Object.assign({}, defClan.troops), defLoss);
    prov.pop = Math.max(8, prov.pop - Math.floor(8 + rand() * 10));
    const unitNote = unitId ? troopLabel(unitId) + "で" : "";

    if (ratio > 1.12 && (style !== "hyoro" && style !== "hoi" || ratio > 1.35)) {
      takeProvince(state, prov, atkClan.id, g ? g.name + "の武功。" : "");
      const back = Math.floor(send * 0.25);
      if (unitId) addTroops(atkClan, unitId, back);
      else {
        const give = scaleTroopCounts(atkCounts, back);
        troopList().forEach((t) => addTroops(atkClan, t.id, give[t.id] || 0));
      }
      if (g) g.loyalty = clamp(g.loyalty + 3, 0, 100);
    } else if (style === "hoi" || style === "hyoro" || style === "mizuzeme") {
      prov.fort = Math.max(0, prov.fort - 1);
      defClan.rice = Math.max(0, defClan.rice - 60);
      if (ratio > 0.9) captureOfficer(state, atkClan, defClan, 0.14);
      log(
        state,
        atkClan.name + "が" + unitNote + prov.name + "を圧迫した（損害 攻" + atkLoss + "／守" + defLoss + "）。城兵は疲弊している。",
        "war",
        atkClan.id
      );
    } else {
      log(
        state,
        atkClan.name + "は" + unitNote + prov.name + "で敗退した（損害 攻" + atkLoss + "／守" + defLoss + "）。",
        "war",
        atkClan.id
      );
    }
  }

  function exec(state, clan, cmd) {
    const rand = randRef(state);
    const found = findCmd(cmd.sub);
    if (!found || !clan.alive) return;
    const bad = validateCmd(state, clan, cmd);
    if (bad) {
      if (!clan.ai) log(state, clan.name + "の「" + found.def.name + "」は不発（" + bad + "）。", "fail", clan.id);
      return;
    }
    const def = found.def;
    if (!canPay(clan, def.cost)) {
      log(state, clan.name + "は財が足りず「" + def.name + "」を行えなかった。", "fail", clan.id);
      return;
    }
    const g = officer(state, cmd, clan.id);
    const pol = statOf(g, "politics");
    const intel = statOf(g, "intellect");
    const cha = statOf(g, "charm");
    const lead = statOf(g, "leadership");
    const val = statOf(g, "valor");
    const prov = cmd.targetProvince ? state.provById[cmd.targetProvince] : null;
    const other = cmd.targetClan ? state.clanById[cmd.targetClan] : null;
    const id = def.id;
    const before = snapRes(clan, prov);
    pay(clan, def.cost);

    function ownProv() {
      return prov && prov.owner === clan.id;
    }

    function easeOwnUnrest(n) {
      const ps = clanProvinces(state, clan.id).slice().sort((a, b) => b.unrest - a.unrest);
      if (!ps.length) return "";
      const p = ps[0];
      const cut = Math.min(n, p.unrest);
      p.unrest = Math.max(0, p.unrest - n);
      return cut ? p.name + "の動揺-" + cut : "";
    }

    function missRecruit(kind) {
      const gold = 12 + Math.floor(rand() * 22);
      clan.gold += gold;
      clan.honor += 1;
      const unrest = easeOwnUnrest(2);
      log(
        state,
        clan.name + "は" + kind + "を得られなかったが、路銀" + gold + "と風聞を得た。" + (unrest ? unrest + "。" : ""),
        "sp",
        clan.id
      );
    }

    if (id === "dom-kaikon" && ownProv()) {
      if (prov.land >= 8) {
        prov.agri += 1;
        log(state, prov.name + "は開墾の余地が尽きたが、田を手入れし農が上がった。", "dom", clan.id);
      } else {
        prov.land += 1;
        prov.agri += 1;
        log(state, clan.name + "が" + prov.name + "を開墾し、国土が広がった。", "dom", clan.id);
      }
    } else if (id === "dom-chisui" && ownProv()) {
      clan.disasterResist += 1;
      prov.agri += 1;
      log(state, clan.name + "が" + prov.name + "の治水を進めた。", "dom", clan.id);
    } else if (id === "dom-kanno" && ownProv()) {
      const add = 80 + Math.floor(pol * 1.4);
      clan.rice += add;
      log(state, clan.name + "の勧農で米が" + add + "増えた。", "dom", clan.id);
    } else if (id === "dom-kenchi" && ownProv()) {
      prov.commerce += 1;
      clan.gold += 40 + pol;
      log(state, clan.name + "が" + prov.name + "を検地した。", "dom", clan.id);
    } else if (id === "dom-chozei" && ownProv()) {
      const tax = 70 + pol * 2;
      clan.gold += tax;
      prov.unrest += 8;
      prov.pop = Math.max(8, prov.pop - 4);
      log(state, clan.name + "は徴税で金" + tax + "を得た。民の顔は暗い。", "dom", clan.id);
    } else if (id === "dom-kenyaku") {
      clan.gold += 40;
      clan.culture = Math.max(0, clan.culture - 1);
      log(state, clan.name + "は倹約令を出した。", "dom", clan.id);
    } else if (id === "dom-shogyo" && ownProv()) {
      prov.commerce += 2;
      log(state, clan.name + "が" + prov.name + "の商いを盛んにした。", "dom", clan.id);
    } else if (id === "dom-jokaku" && ownProv()) {
      prov.fort += 2;
      log(state, clan.name + "が" + prov.name + "の城郭を修築した。", "dom", clan.id);
    } else if (id === "dom-kaido" && ownProv()) {
      prov.commerce += 1;
      clan.train += 0.1;
      log(state, clan.name + "が街道を整えた。", "dom", clan.id);
    } else if (id === "dom-tonden" && ownProv()) {
      clan.rice += 50 + Math.floor(lead);
      log(state, clan.name + "が屯田を置き、兵糧を得た。", "dom", clan.id);
    } else if (id === "dom-shomin" && ownProv()) {
      const add = 12 + Math.floor(cha / 8);
      prov.pop += add;
      log(state, clan.name + "が民を招き、" + prov.name + "の人口が" + add + "増えた。", "dom", clan.id);
    } else if (id === "dom-soko") {
      clan.cap += 400;
      log(state, clan.name + "が倉庫を拡充した。", "dom", clan.id);
    } else if (id === "dom-kozan" && ownProv()) {
      const hit = successRoll(rand, 0.45 + intel / 250);
      const gold = hit ? 180 + Math.floor(rand() * 220) : 40;
      clan.gold += gold;
      log(state, clan.name + "の鉱山開発で金" + gold + "を得た。", "dom", clan.id);
    } else if (id === "dom-kanga" && ownProv()) {
      prov.agri += 2;
      log(state, clan.name + "が灌漑を行った。", "dom", clan.id);
    } else if (id === "dom-ichiba" && ownProv()) {
      prov.commerce += 2;
      log(state, clan.name + "が" + prov.name + "に市を開いた。", "dom", clan.id);
    } else if (id === "dip-domei" && other && other.id !== clan.id) {
      const chance = 0.25 + cha / 180 + clan.honor / 250 + (isAllied(state, clan.id, other.id) ? 1 : 0);
      if (!other.ai) {
        const existing = state.offers.find(
          (o) => o.type === "ally" && o.from === other.id && o.to === clan.id && o.until >= state.turn
        );
        if (existing) {
          state.alliances.push({ a: clan.id, b: other.id, until: state.turn + 12, type: "ally" });
          state.offers = state.offers.filter((o) => o !== existing);
          log(state, clan.name + "と" + other.name + "が同盟を結んだ。", "dip", clan.id);
        } else {
          state.offers.push({ type: "ally", from: clan.id, to: other.id, until: state.turn + 3, kind: "ally" });
          log(state, clan.name + "が" + other.name + "に同盟を申し入れた。相手も同盟を選べば成立する。", "dip", clan.id);
        }
      } else if (successRoll(rand, chance) && !atWar(state, clan.id, other.id)) {
        state.alliances.push({ a: clan.id, b: other.id, until: state.turn + 12, type: "ally" });
        log(state, clan.name + "と" + other.name + "が同盟を結んだ。", "dip", clan.id);
      } else log(state, other.name + "は" + clan.name + "の同盟を拒んだ。", "dip", clan.id);
    } else if (id === "dip-haki" && other) {
      state.alliances = state.alliances.filter(
        (al) => !((al.a === clan.id && al.b === other.id) || (al.a === other.id && al.b === clan.id))
      );
      clan.honor = Math.max(0, clan.honor - 8);
      log(state, clan.name + "は" + other.name + "との盟を破棄した。", "dip", clan.id);
    } else if (id === "dip-konin" && other && other.id !== clan.id) {
      const daughter = g && g.gender === "f" && g.clanId === clan.id && !g.marriedTo ? g : null;
      if (!daughter) {
        log(state, clan.name + "に縁組できる姫がいなかった。", "fail", clan.id);
      } else {
        const chance = 0.35 + statOf(daughter, "charm") / 160 + clan.honor / 280;
        const accept = !other.ai || successRoll(rand, chance);
        if (!accept) {
          log(state, other.name + "は" + daughter.name + "との縁組を辞退した。", "dip", clan.id);
        } else {
          daughter.marriedTo = other.id;
          daughter.clanId = other.id;
          daughter.post = "culture";
          daughter.loyalty = 62;
          state.alliances.push({ a: clan.id, b: other.id, until: state.turn + 24, type: "marriage" });
          clan.honor += 5;
          other.honor += 3;
          tryCulture(state, other, 0.18, statOf(daughter, "charm"));
          log(
            state,
            clan.name + "の姫" + daughter.name + "が" + other.name + "へ輿入れし、婚姻の盟が結ばれた。",
            "dip",
            clan.id
          );
        }
      }
    } else if (id === "dip-hitojichi" && other) {
      state.alliances.push({ a: clan.id, b: other.id, until: state.turn + 16, type: "hostage" });
      log(state, clan.name + "と" + other.name + "が人質を交わした。", "dip", clan.id);
    } else if (id === "dip-zoyo" && other) {
      other.gold += 80;
      other.rice += 80;
      other.honor += 2;
      log(state, clan.name + "が" + other.name + "へ贈り物をした。", "dip", clan.id);
    } else if (id === "dip-choko" && other) {
      const cg = tryCulture(state, clan, 0.12, cha);
      clan.honor += 3;
      other.gold += 40;
      log(state, clan.name + "が" + other.name + "へ朝貢した。" + cultureTail(cg), "dip", clan.id);
    } else if (id === "dip-kowu" && other) {
      setWar(state, clan.id, other.id, false);
      log(state, clan.name + "と" + other.name + "が講和した。", "dip", clan.id);
    } else if (id === "dip-sensen" && other) {
      setWar(state, clan.id, other.id, true);
      clan.honor += 1;
      log(state, clan.name + "が" + other.name + "へ宣戦した。", "war", clan.id);
    } else if (id === "dip-fukashin" && other) {
      state.alliances.push({ a: clan.id, b: other.id, until: state.turn + 8, type: "nap" });
      log(state, clan.name + "と" + other.name + "が不可侵を約した。", "dip", clan.id);
    } else if (id === "dip-kyodo" && other && isAllied(state, clan.id, other.id)) {
      loseTroopsFrom(other, other.troops, 40);
      const foes = state.provinces.filter((p) => p.owner !== clan.id && p.owner !== other.id);
      const near = foes.find((p) => clanProvinces(state, other.id).some((op) => adjacent(state, op.id, p.id)));
      if (near) {
        near.fort = Math.max(0, near.fort - 1);
        log(state, clan.name + "と" + other.name + "が共同で" + near.name + "へ圧力をかけた。守り-1。", "dip", clan.id);
      } else {
        clan.honor += 1;
        other.honor += 1;
        log(state, clan.name + "と" + other.name + "は共同出兵の備えを整え、盟を固めた。", "dip", clan.id);
      }
    } else if (id === "dip-hikinuki" && other) {
      const cands = generalsOf(state, other.id).filter((x) => x.id !== other.daimyoId);
      cands.sort((a, b) => a.loyalty - b.loyalty);
      const t = cands[0];
      const chance = t ? 0.15 + (100 - t.loyalty) / 160 + cha / 300 : 0;
      if (t && successRoll(rand, chance)) {
        t.clanId = clan.id;
        t.status = "active";
        t.loyalty = 55;
        log(state, clan.name + "が" + t.name + "を" + other.name + "から引き抜いた。", "dip", clan.id);
      } else log(state, clan.name + "の引き抜きは失敗した。", "fail", clan.id);
    } else if (id === "dip-choho" && other) {
      recordClanIntel(state, clan, other);
      clanProvinces(state, other.id).forEach((p) => recordProvIntel(state, clan, p));
      log(
        state,
        other.name + "の内情を探った — 金" + Math.floor(other.gold) + " 米" + Math.floor(other.rice) + " 兵" + Math.floor(other.soldiers) + " 国土" + landOf(state, other.id) + "。地図に十期ほど残る。",
        "dip",
        clan.id
      );
    } else if (id === "dip-tsusho" && other) {
      clan.gold += 50;
      other.gold += 50;
      log(state, clan.name + "と" + other.name + "が通商した。", "dip", clan.id);
    } else if (id === "dip-chukai" && other) {
      const wars = other.warWith.slice();
      if (wars[0]) {
        setWar(state, other.id, wars[0], false);
        clan.honor += 2;
        log(state, clan.name + "の仲介で" + other.name + "が和睦へ動いた。", "dip", clan.id);
      } else {
        clan.honor += 2;
        other.honor += 1;
        log(state, clan.name + "は" + other.name + "と交誼を温め、戦なき世を約した。", "dip", clan.id);
      }
    } else if (id === "dip-kofuku" && other) {
      const myL = landOf(state, clan.id);
      const thL = landOf(state, other.id);
      if (other.ai && myL > thL * 2.2 && other.soldiers < clan.soldiers * 0.45) {
        clanProvinces(state, other.id).forEach((p) => {
          p.owner = clan.id;
        });
        log(state, other.name + "が" + clan.name + "の勧告に応じ、降った。", "war", clan.id);
      } else log(state, other.name + "は降伏勧告を一蹴した。", "dip", clan.id);
    } else if (id.indexOf("war-") === 0) {
      if (id === "war-boe" && ownProv()) {
        prov.fort += 1;
        clan.fortBonus += 1;
        log(state, clan.name + "が" + prov.name + "の守りを固めた。", "war", clan.id);
      } else if (id === "war-chohei" && ownProv()) {
        if (prov.pop < 20) {
          addTroops(clan, "ashigaru", 12);
          log(state, prov.name + "は人が少ないが、志願の足軽が12加わった。", "war", clan.id);
        } else {
          const tdef = troopDef(cmd.unit || "ashigaru");
          const extra = { gold: tdef.gold || 0, rice: tdef.rice || 0 };
          if (!canPay(clan, extra)) {
            log(state, clan.name + "は金米が足りず、" + tdef.name + "を徴兵できなかった。", "fail", clan.id);
          } else {
            pay(clan, extra);
            const n = (tdef.recruit || 60) + Math.floor(lead * (tdef.atk || 1) * 0.7);
            const take = Math.min(n, Math.floor(prov.pop * 0.7));
            addTroops(clan, tdef.id, take);
            prov.pop = Math.max(12, prov.pop - Math.floor(take / 10));
            log(state, clan.name + "が" + tdef.name + "を徴兵し、+" + take + "。", "war", clan.id);
          }
        }
      } else if (id === "war-kunren") {
        clan.train += 0.35;
        log(state, clan.name + "が軍を訓練した。", "war", clan.id);
      } else if (id === "war-tenshin" && ownProv()) {
        if (g) setStation(state, clan, g, prov.id);
        prov.fort += 1;
        prov.unrest = Math.max(0, prov.unrest - 3);
        clan.train += 0.12;
        const tdef = troopDef(cmd.unit || "ashigaru");
        log(
          state,
          clan.name +
            "が" +
            (tdef ? tdef.name : "兵") +
            "を" +
            prov.name +
            "へ転進させ、布陣を固めた。" +
            (g ? g.name + "が駐在した。" : ""),
          "war",
          clan.id
        );
      } else if (id === "war-tettai") {
        addTroops(clan, "ashigaru", 40);
        log(state, clan.name + "は兵を本拠へ退かせ、傷を癒した。", "war", clan.id);
      } else if (prov && prov.owner !== clan.id) {
        const myAdj = clanProvinces(state, clan.id).some((p) => adjacent(state, p.id, prov.id));
        if (!myAdj) {
          log(state, prov.name + "は隣接しておらず、出陣できなかった。", "fail", clan.id);
        } else {
          const styleMap = {
            "war-shutsujin": "normal",
            "war-kyoshu": "kyoshu",
            "war-hoi": "hoi",
            "war-yashu": "yashu",
            "war-kakei": "kakei",
            "war-mizuzeme": "mizuzeme",
            "war-hyoro": "hyoro",
            "war-fukuhei": "fukuhei",
            "war-kihei": "kihei",
            "war-teppo": "teppo"
          };
          battle(state, clan, prov, g, cmd.soldiers, styleMap[id] || "normal", cmd.unit);
        }
      }
    } else if (id === "sp-ninja" && prov && prov.owner !== clan.id) {
      prov.fort = Math.max(0, prov.fort - 1);
      recordProvIntel(state, clan, prov);
      const oc = state.clanById[prov.owner];
      if (oc) recordClanIntel(state, clan, oc);
      log(
        state,
        "忍者が" + prov.name + "を探った。守り" + prov.fort + " 民衆" + Math.floor(prov.pop) + " 動揺" + Math.floor(prov.unrest) + "。" + (oc ? oc.name + "の兵" + Math.floor(oc.soldiers) : ""),
        "sp",
        clan.id
      );
    } else if (id === "sp-ansatsu" && other) {
      const gs = generalsOf(state, other.id).filter((x) => x.id !== other.daimyoId);
      const t = pick(rand, gs.length ? gs : generalsOf(state, other.id));
      if (t && successRoll(rand, 0.12 + intel / 400)) {
        t.alive = false;
        t.status = "dead";
        log(state, clan.name + "の凶刃が" + t.name + "を討った。", "sp", clan.id);
      } else {
        clan.honor = Math.max(0, clan.honor - 12);
        setWar(state, clan.id, other.id, true);
        log(state, "暗殺は露見し、" + other.name + "の怒りを買った。", "fail", clan.id);
      }
    } else if (id === "sp-ryugen" && other) {
      generalsOf(state, other.id).forEach((x) => {
        x.loyalty = clamp(x.loyalty - 6, 1, 100);
      });
      log(state, clan.name + "の流言が" + other.name + "の家中を揺らした。忠誠-6。", "sp", clan.id);
    } else if (id === "sp-choryaku" && prov && prov.owner !== clan.id) {
      prov.fort = Math.max(0, prov.fort - 2);
      log(state, clan.name + "が" + prov.name + "を調略し、守りが緩んだ。", "sp", clan.id);
    } else if (id === "sp-naiou" && prov && prov.owner !== clan.id) {
      if (successRoll(rand, 0.18 + intel / 280)) {
        takeProvince(state, prov, clan.id, "内応により開城。");
      } else {
        recordProvIntel(state, clan, prov);
        log(state, prov.name + "の内応工作は失敗したが、城の気配は掴んだ。守り" + prov.fort + "。", "fail", clan.id);
      }
    } else if (id === "sp-mittei" && other) {
      recordClanIntel(state, clan, other);
      clanProvinces(state, other.id).forEach((p) => recordProvIntel(state, clan, p));
      const stashN = (other.stash || []).length;
      log(
        state,
        "密偵が" + other.name + "を探った。兵" + Math.floor(other.soldiers) + " 金" + Math.floor(other.gold) + (stashN ? " 蔵の気配" + stashN : "") + "。",
        "sp",
        clan.id
      );
    } else if (id === "sp-takara" && ownProv()) {
      if (successRoll(rand, 0.28 + intel / 300)) {
        const gold = 80 + Math.floor(rand() * 140);
        clan.gold += gold;
        const prefer = rand() < 0.45 ? "equip" : rand() < 0.7 ? "consumable" : "relic";
        const got = grantTreasure(state, clan, rand, prefer);
        const extra = got ? " 「" + got.def.name + "」（" + (got.def.kind === "equip" ? "装備" : got.def.kind === "relic" ? "永続" : "道具") + "）を得た。" : "";
        state.popup = {
          kind: "treasure",
          title: "お宝発見",
          text: prov.name + "で黄金" + gold + "と品を得た。" + extra + (got ? " " + got.def.text : ""),
          img: D().images.gold
        };
        log(state, clan.name + "が" + prov.name + "で宝を見つけ、金" + gold + extra, "event", clan.id);
      } else {
        const gold = 18 + Math.floor(rand() * 28);
        clan.gold += gold;
        if (ownProv()) prov.unrest = Math.max(0, prov.unrest - 2);
        log(state, clan.name + "は" + prov.name + "で宝を逃したが、金" + gold + "の手がかりを拾った。", "sp", clan.id);
      }
    } else if (id === "sp-kito") {
      clan.disasterResist += 2;
      log(state, clan.name + "が祈祷を行い、天の加護を願った。", "sp", clan.id);
    } else if (id === "sp-tansaku") {
      const chance = 0.4 + intel / 220 + cha / 380;
      if (successRoll(rand, chance)) {
        const t = pickRecruit(state, rand, false);
        if (t) {
          enlistGeneral(t, clan, 52 + Math.floor(rand() * 22));
          log(state, clan.name + "の探索で" + t.name + "を見出した。" + (t.rare ? "【レア】" : ""), "sp", clan.id);
          if (t.rare) {
            state.popup = {
              kind: "genius",
              title: "人材発見",
              text: t.name + (t.skill ? "（" + t.skill + "）" : "") + "が" + clan.name + "の探索に応じた。",
              img: D().images.samurai
            };
          }
        } else missRecruit("仕える士");
      } else missRecruit("仕える士");
    } else if (id === "sp-inkyo") {
      const gs = generalsOf(state, clan.id).slice().sort((a, b) => b.leadership - a.leadership);
      if (gs[0] && gs[0].id !== clan.daimyoId) {
        clan.daimyoId = gs[0].id;
        log(state, gs[0].name + "が新たな当主となった。", "sp", clan.id);
      } else {
        const d = daimyoOf(state, clan.id);
        if (d) {
          d.politics = clamp(d.politics + 1, 1, 100);
          clan.honor += 1;
          log(state, d.name + "は隠居せず、政務を引き締めた。政+1。", "sp", clan.id);
        } else {
          clan.honor += 1;
          log(state, clan.name + "は家督を整え、名誉を保った。", "sp", clan.id);
        }
      }
    } else if (id === "sp-ronin") {
      const t = pickRecruit(state, rand, true);
      if (t) {
        enlistGeneral(t, clan, 60);
        log(state, clan.name + "が浪人" + t.name + "を登用した。" + (t.rare ? "【レア】" : ""), "sp", clan.id);
        if (t.rare) {
          state.popup = {
            kind: "genius",
            title: "天才登用",
            text: t.name + "（" + t.skill + "）が" + clan.name + "に仕えた。",
            img: D().images.samurai
          };
        }
      } else missRecruit("浪人");
    } else if (id === "sp-kinri") {
      const cg = tryCulture(state, clan, 0.28, cha);
      clan.honor += 8;
      log(state, clan.name + "が禁裏に働きかけ、大義を得た。" + cultureTail(cg), "sp", clan.id);
    } else if (id === "sp-ikki" && prov && prov.owner !== clan.id) {
      const oc = state.clanById[prov.owner];
      if (oc) {
        loseTroopsFrom(oc, oc.troops, 90);
        prov.unrest += 15;
        prov.pop = Math.max(8, prov.pop - 8);
        log(state, prov.name + "で一揆が起き、" + oc.name + "が混乱した。", "sp", clan.id);
      }
    } else if (id === "sp-nanban") {
      clan.gold += 140;
      clan.train += 0.2;
      log(state, clan.name + "が南蛮と交易し、金と新器を得た。", "sp", clan.id);
    } else if (id === "sp-kisaku") {
      if (successRoll(rand, 0.4 + intel / 200)) {
        clan.gold += 200;
        addTroops(clan, richestTroop(clan), 150);
        log(state, (g ? g.name : "軍師") + "の奇策が当たり、家中が潤った。", "sp", clan.id);
      } else {
        clan.gold = Math.max(0, clan.gold - 40);
        clan.honor = Math.max(0, clan.honor - 4);
        log(state, "奇策は外れた。", "fail", clan.id);
      }
    } else if (id === "cul-cha") {
      clan.honor += 1;
      const cg = tryCulture(state, clan, 0.22, cha);
      log(state, clan.name + "が茶の湯を催した。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-noh") {
      clanProvinces(state, clan.id).forEach((p) => {
        p.unrest = Math.max(0, p.unrest - 3);
      });
      const cg = tryCulture(state, clan, 0.26, cha);
      log(state, clan.name + "が能を興行した。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-jiin" && ownProv()) {
      clan.disasterResist += 1;
      prov.unrest = Math.max(0, prov.unrest - 6);
      const cg = tryCulture(state, clan, 0.38, cha);
      log(state, clan.name + "が" + prov.name + "に寺社を建立した。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-gakumon") {
      generalsOf(state, clan.id).slice(0, 5).forEach((x) => {
        x.intellect = clamp(x.intellect + 1, 1, 100);
      });
      const cg = tryCulture(state, clan, 0.26, cha);
      log(state, clan.name + "が学問を奨励した。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-joka" && ownProv()) {
      prov.pop += 6;
      prov.commerce += 1;
      log(state, clan.name + "が" + prov.name + "の城下を整えた。", "cul", clan.id);
    } else if (id === "cul-rakuichi" && ownProv()) {
      prov.commerce += 3;
      const cg = tryCulture(state, clan, 0.16, cha);
      log(state, clan.name + "が楽市楽座を敷いた。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-renga") {
      const cg = tryCulture(state, clan, 0.22, cha);
      log(state, clan.name + "が連歌の会を開いた。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-token") {
      clan.train += 0.25;
      const cg = tryCulture(state, clan, 0.12, cha);
      log(state, clan.name + "が刀剣を鍛え、士気が上がった。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-nanbunka") {
      const cg = tryCulture(state, clan, 0.4, cha);
      log(state, clan.name + "が南蛮文化を取り入れた。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-jugaku") {
      generalsOf(state, clan.id).slice(0, 3).forEach((x) => {
        x.politics = clamp(x.politics + 1, 1, 100);
      });
      const cg = tryCulture(state, clan, 0.26, cha);
      log(state, clan.name + "が儒学を盛んにした。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-waka") {
      if (g) g.charm = clamp(g.charm + 2, 1, 100);
      const cg = tryCulture(state, clan, 0.2, cha);
      log(state, clan.name + "が和歌を詠んだ。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-teien" && ownProv()) {
      prov.unrest = Math.max(0, prov.unrest - 4);
      const cg = tryCulture(state, clan, 0.24, cha);
      log(state, clan.name + "が庭園を築いた。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-butsuzo" && ownProv()) {
      prov.unrest = Math.max(0, prov.unrest - 5);
      const cg = tryCulture(state, clan, 0.24, cha);
      log(state, clan.name + "が仏像を造立した。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-tenshu" && ownProv()) {
      prov.fort += 3;
      clan.honor += 5;
      const cg = tryCulture(state, clan, 0.42, cha);
      log(state, clan.name + "が" + prov.name + "に天守を築いた。" + cultureTail(cg), "cul", clan.id);
    } else if (id === "cul-shisho") {
      clan.honor += 4;
      const cg = tryCulture(state, clan, 0.36, cha);
      log(state, clan.name + "が史書を編纂した。" + cultureTail(cg), "cul", clan.id);
    } else {
      log(state, "「" + def.name + "」は対象が合わず不発だった。", "fail", clan.id);
    }
    appendDelta(state, before, snapRes(clan, prov));
  }

  function production(state) {
    state.clans.forEach((c) => {
      if (!c.alive) return;
      const ps = clanProvinces(state, c.id);
      let rice = 0;
      let gold = 0;
      ps.forEach((p) => {
        rice += p.land * (18 + provStat(state, p, "agri") * 7);
        gold += p.land * (10 + provStat(state, p, "commerce") * 5);
        p.pop = Math.min(220, p.pop + (p.unrest > 20 ? 0 : 1));
        p.unrest = Math.max(0, p.unrest - 1);
      });
      const cult = 1 + Math.floor(c.culture / 40);
      const posted = generalsOf(state, c.id);
      const nDom = posted.filter((g) => g.post === "domestic").length;
      const nMil = posted.filter((g) => g.post === "military").length;
      const nCul = posted.filter((g) => g.post === "culture").length;
      const relics = relicMods(c);
      const rnd = randRef(state);
      let culTick = 0;
      if (nCul > 0 && rnd() < 0.07 + Math.min(3, nCul) * 0.03) culTick = 1;
      else if ((relics.culture || 0) > 0 && rnd() < 0.14 * relics.culture) culTick = 1;
      c.rice = Math.min(c.cap, c.rice + rice + nDom * 8);
      c.gold = Math.min(c.cap, c.gold + gold + cult + nDom * 10 + (relics.gold || 0));
      c.people = ps.reduce((s, p) => s + p.pop, 0);
      c.train = Math.min(6, c.train + nMil * 0.015);
      c.culture = clamp((c.culture || 0) + culTick, 0, cultureMax());
      if (relics.honor) c.honor = clamp((c.honor || 0) + relics.honor, 0, 120);
      ensureTroops(c);
      const upkeep = Math.floor(
        troopList().reduce((s, t) => s + ((c.troops[t.id] || 0) * (t.upkeep || 1)) / 28, 0)
      );
      c.rice = Math.max(0, c.rice - upkeep);
      if (c.rice < 10 && troopTotal(c) > 200) {
        const desert = Math.floor(troopTotal(c) * 0.08);
        loseTroopsFrom(c, c.troops, desert);
        log(state, c.name + "は兵糧が尽き、兵が離れた（-" + desert + "）。", "fail", c.id);
      }
      c.fortBonus = Math.max(0, c.fortBonus - 1);
    });
  }

  function fireEvent(state) {
    if (state.winner) return;
    const rand = randRef(state);
    if (rand() > 0.11) return;
    const alive = state.clans.filter((c) => c.alive);
    if (!alive.length) return;
    const clan = weightedPick(rand, alive, (c) => 1 + 1.15 * cultureLuck(c.culture));
    if (!clan) return;
    const luck = cultureLuck(clan.culture);
    const ev = weightedPick(rand, D().events, (e) => eventPickWeight(e, luck));
    if (!ev) return;
    const ps = clanProvinces(state, clan.id);
    const prov = ps.length ? pick(rand, ps) : null;
    const resist = clan.disasterResist * 0.04 + relicMods(clan).resist * 0.05 + luck * 0.12;
    const geniusBonus = generalsOf(state, clan.id).some((g) => g.skill === "仙術");
    const doctor = generalsOf(state, clan.id).some((g) => g.skill === "医聖");

    const before = snapRes(clan, prov);
    if (ev.kind === "disaster") {
      if (rand() < resist) {
        log(state, clan.name + "は備えがあり、" + ev.name + "の被害を免れた。", "event", clan.id);
        return;
      }
      if (ev.id === "plague" && doctor) {
        log(state, "華佗の流れを汲む医術が疫病を鎮めた。", "event", clan.id);
        return;
      }
      if (prov) {
        clan.rice = Math.max(0, clan.rice - 80);
        clan.gold = Math.max(0, clan.gold - 40);
        prov.pop = Math.max(8, prov.pop - 10);
        if (ev.id === "quake" || ev.id === "fire") prov.fort = Math.max(0, prov.fort - 1);
        if (ev.id === "flood" || ev.id === "famine") prov.agri = Math.max(1, prov.agri - 1);
      }
      if (geniusBonus && rand() < 0.5) clan.rice += 40;
      const d = deltaText(before, snapRes(clan, prov));
      const tail = d ? " " + d : "";
      state.popup = { kind: "disaster", title: ev.name, text: clan.name + " — " + ev.text + tail, img: D().images.sakura };
      log(state, "【天災】" + clan.name + "に" + ev.name + "。" + ev.text + tail, "event", clan.id);
    } else if (ev.kind === "blessing") {
      if (ev.id === "harvest") clan.rice += 180;
      if (ev.id === "goldmine") clan.gold += 220;
      if (ev.id === "babyboom" && prov) prov.pop += 14;
      if (ev.id === "rain") clan.rice += 90;
      if (ev.id === "fair") clan.gold += 120;
      const d = deltaText(before, snapRes(clan, prov));
      const tail = d ? " " + d : "";
      state.popup = { kind: "blessing", title: ev.name, text: clan.name + " — " + ev.text + tail, img: D().images.rice };
      log(state, "【お恵み】" + clan.name + "に" + ev.name + "。" + ev.text + tail, "event", clan.id);
    } else if (ev.kind === "genius" || ev.id === "sangoku") {
      const g = pickRecruit(state, rand, false);
      if (g) {
        enlistGeneral(g, clan, 50 + Math.floor(rand() * 20));
        state.popup = {
          kind: "genius",
          title: g.rare ? "異国の豪傑来訪" : "天才来訪",
          text: g.name + (g.skill ? "（" + g.skill + " — " + g.skillText + "）" : "") + "が" + clan.name + "の門を叩いた。",
          img: D().images.samurai
        };
        log(state, "【来訪】" + g.name + "が" + clan.name + "に仕えた。" + (g.rare ? "【レア】" : ""), "event", clan.id);
      }
    } else if (ev.kind === "treasure") {
      const gold = 60 + Math.floor(rand() * 160);
      clan.gold += gold;
      const prefer = ev.id === "sword" ? "equip" : ev.id === "scroll" ? "consumable" : rand() < 0.5 ? "relic" : "equip";
      const got = grantTreasure(state, clan, rand, prefer);
      if (ev.id === "sword") clan.train += 0.15;
      const extra = got ? " 「" + got.def.name + "」を得た。" + got.def.text : "";
      state.popup = {
        kind: "treasure",
        title: ev.name,
        text: clan.name + " — " + ev.text + " 金+" + gold + extra,
        img: D().images.gold
      };
      log(state, "【お宝】" + clan.name + "が" + ev.name + "（金+" + gold + extra + "）。", "event", clan.id);
    }
  }

  function recordClanIntel(state, clan, other) {
    if (!clan || !other) return;
    if (!clan.lastIntel) clan.lastIntel = {};
    clan.lastIntel[other.id] = {
      gold: Math.floor(other.gold),
      rice: Math.floor(other.rice),
      soldiers: Math.floor(other.soldiers),
      troops: other.troops ? Object.assign({}, other.troops) : null,
      people: Math.floor(other.people || 0),
      land: landOf(state, other.id),
      culture: other.culture || 0,
      honor: other.honor || 0,
      turn: state.turn
    };
  }

  function recordProvIntel(state, clan, prov) {
    if (!clan || !prov) return;
    if (!clan.provIntel) clan.provIntel = {};
    clan.provIntel[prov.id] = {
      fort: provStat(state, prov, "fort"),
      unrest: prov.unrest,
      pop: Math.floor(prov.pop),
      agri: provStat(state, prov, "agri"),
      commerce: provStat(state, prov, "commerce"),
      owner: prov.owner,
      turn: state.turn
    };
  }

  function intelFresh(state, rec) {
    if (!rec || rec.turn == null) return false;
    return state.turn - rec.turn <= (D().INTEL_FRESH || 10);
  }

  function intelView(state, clan, province) {
    const own = !!(clan && province && province.owner === clan.id);
    const owner = province && province.owner ? state.clanById[province.owner] : null;
    const adj = !!(
      clan &&
      province &&
      clanProvinces(state, clan.id).some((p) => adjacent(state, p.id, province.id))
    );
    const size = !province ? "" : province.land >= 4 ? "大国" : province.land >= 2 ? "中国" : "小国";
    const pi = clan && province && clan.provIntel ? clan.provIntel[province.id] : null;
    const ci = clan && owner && clan.lastIntel ? clan.lastIntel[owner.id] : null;
    return {
      own,
      owner,
      adj,
      size,
      allied: !!(clan && owner && isAllied(state, clan.id, owner.id)),
      war: !!(clan && owner && atWar(state, clan.id, owner.id)),
      pi,
      ci,
      piOk: own || intelFresh(state, pi),
      ciOk: own || intelFresh(state, ci),
      piAge: pi ? state.turn - pi.turn : null,
      ciAge: ci ? state.turn - ci.turn : null
    };
  }

  function daughtersOf(state, clanId) {
    return generalsOf(state, clanId).filter((g) => g.gender === "f" && g.alive && !g.marriedTo && (g.age || 21) >= 21);
  }

  function clanSalt(id) {
    let s = 0;
    String(id || "").split("").forEach((ch) => {
      s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    });
    return s;
  }

  function planCommands(state, c, slotIndex, existing) {
    const max = D().MAX_CMD_PER_TURN;
    const have = existing || [];
    const need = max - have.length;
    if (need <= 0) return [];
    const used = {};
    have.forEach((cmd) => {
      if (cmd && cmd.sub) used[cmd.sub] = 1;
    });
    const salt = clanSalt(c.id) + ((slotIndex || 0) * 104729);
    const rand = rng((state.seed + (state.turn + (slotIndex || 0) + 1) * 7919 + salt) >>> 0);
    const mine = clanProvinces(state, c.id);
    const home = mine[0];
    const weakAgri = mine.slice().sort((a, b) => a.agri - b.agri)[0] || home;
    const weakFort = mine.slice().sort((a, b) => a.fort - b.fort)[0] || home;
    const weakCom = mine.slice().sort((a, b) => a.commerce - b.commerce)[0] || home;
    const others = state.clans.filter((x) => x.alive && x.id !== c.id);
    const foes = others.filter((x) => !isAllied(state, c.id, x.id));
    const targets = [];
    mine.forEach((p) => {
      state.provinces.forEach((o) => {
        if (o.owner !== c.id && adjacent(state, p.id, o.id) && !isAllied(state, c.id, o.owner)) targets.push(o);
      });
    });
    const out = [];
    function add(cmd) {
      if (!cmd || !cmd.sub || used[cmd.sub] || out.length >= need) return false;
      used[cmd.sub] = 1;
      out.push(cmd);
      return true;
    }
    function cmd(cat, sub, extra) {
      return Object.assign({ cat: cat, sub: sub, generalId: null, auto: true }, extra || {});
    }
    const levyUnit =
      c.gold > 520 && rand() < 0.28 ? "gun" : c.gold > 380 && rand() < 0.4 ? "cavalry" : c.gold > 300 && rand() < 0.45 ? "archer" : c.gold > 280 && rand() < 0.35 ? "shield" : "ashigaru";
    if (c.rice < 280 && home) add(cmd("domestic", "dom-kanno", { targetProvince: home.id }));
    if (c.gold < 260 && home) add(cmd("domestic", "dom-shogyo", { targetProvince: (weakCom || home).id }));
    if (c.soldiers < 800 && home && (home.pop || 0) >= 24) add(cmd("war", "war-chohei", { targetProvince: home.id, unit: levyUnit }));
    if (generalsOf(state, c.id).length < 9 && rand() < 0.45) add(cmd("special", "sp-tansaku"));
    if (foes.length && generalsOf(state, c.id).length < 11 && rand() < 0.28) {
      add(cmd("diplomacy", "dip-hikinuki", { targetClan: pick(rand, foes).id }));
    }
    if (targets.length && c.soldiers > 520 && c.rice > 60 && (c.ai || rand() < 0.42)) {
      const t = pick(rand, targets);
      const unit = richestTroop(c);
      add(
        cmd("war", pick(rand, ["war-shutsujin", "war-kyoshu", "war-hoi", "war-yashu"]), {
          targetProvince: t.id,
          generalId: (bestGeneral(state, c.id, "valor") || {}).id,
          soldiers: Math.floor(Math.max(120, (c.troops[unit] || c.soldiers) * 0.28)),
          unit: unit
        })
      );
    }
    if (foes.length && rand() < 0.35) add(cmd("diplomacy", "dip-domei", { targetClan: pick(rand, foes).id }));
    if (home) {
      const pool = [
        cmd("domestic", "dom-kenchi", { targetProvince: home.id }),
        cmd("domestic", "dom-jokaku", { targetProvince: (weakFort || home).id }),
        cmd("domestic", "dom-ichiba", { targetProvince: home.id }),
        cmd("domestic", "dom-kanga", { targetProvince: (weakAgri || home).id }),
        cmd("domestic", "dom-chisui", { targetProvince: home.id }),
        cmd("culture", "cul-joka", { targetProvince: home.id })
      ];
      if (rand() < 0.16) pool.push(cmd("culture", "cul-cha"));
      while (out.length < need && pool.length) {
        const i = Math.floor(rand() * pool.length);
        add(pool.splice(i, 1)[0]);
      }
    }
    if (out.length < need && foes.length) add(cmd("diplomacy", "dip-tsusho", { targetClan: pick(rand, foes).id }));
    if (out.length < need && home) add(cmd("domestic", "dom-kanno", { targetProvince: home.id }));
    return out;
  }

  function fillAutoQueue(state, clanId) {
    if (!state || !state.clanById) return 0;
    const c = state.clanById[clanId];
    if (!c) return 0;
    if (!state.queues[clanId]) state.queues[clanId] = emptyQueue();
    const q = state.queues[clanId];
    const maxT = D().QUEUE_TURNS;
    const maxC = D().MAX_CMD_PER_TURN;
    while (q.length < maxT) q.push([]);
    if (q.length > maxT) q.length = maxT;
    let n = 0;
    for (let i = 0; i < q.length; i++) {
      if (!q[i]) q[i] = [];
      if (q[i].length || isQueueHeld(state, clanId, i)) continue;
      const before = q[i].length;
      planCommands(state, c, i, q[i]).forEach((cmd) => {
        if (q[i].length < maxC) q[i].push(cmd);
      });
      if (q[i].length > before) n += 1;
    }
    return n;
  }

  function fillIdleHumanTurns(state) {
    const maxC = D().MAX_CMD_PER_TURN;
    state.clans.forEach((c) => {
      if (!c.alive || c.ai) return;
      const q = state.queues[c.id];
      if (!q) return;
      if (!q[0]) q[0] = [];
      if (q[0].length) return;
      if (isQueueHeld(state, c.id, 0)) return;
      planCommands(state, c, 0, q[0]).forEach((cmd) => {
        if (q[0].length < maxC) q[0].push(cmd);
      });
      if (q[0].length) {
        log(state, c.name + "の方針が空だったため、家臣がお任せで動いた。", "system", c.id);
      }
    });
  }

  function wanderClan(state, clan) {
    if (!clan || clan.wandered) return "すでに家を捨てている。";
    if (!clan.alive) return "その家はすでに滅びている。";
    const mine = clanProvinces(state, clan.id).slice();
    const others = state.clans.filter((x) => x.alive && x.id !== clan.id);
    const rand = randRef(state);
    mine.forEach((p) => {
      const adj = [];
      state.provinces.forEach((o) => {
        if (o.owner && o.owner !== clan.id && adjacent(state, p.id, o.id)) adj.push(o.owner);
      });
      const take = adj.length ? pick(rand, adj) : others.length ? pick(rand, others).id : null;
      p.owner = take;
    });
    generalsOf(state, clan.id).forEach((g) => {
      unequipGeneral(g);
      g.post = "none";
      g.station = null;
      g.clanId = null;
      g.status = "ronin";
    });
    clan.alive = false;
    clan.wandered = true;
    clan.soldiers = 0;
    clan.troops = emptyTroops();
    clan.rice = 0;
    clan.gold = 0;
    clan.autoQueue = false;
    log(state, clan.name + "は国土も家も捨て、放浪の身となった。", "system", clan.id);
    index(state);
    const humansLeft = (state.players || []).filter((p) => {
      const c = state.clanById[p.clanId];
      return c && c.alive;
    });
    const pl = (state.players || []).find((p) => p.clanId === clan.id);
    if (pl && pl.recordId && humansLeft.length) {
      addRecord(pl.recordId, {
        t: Date.now(),
        era: eraLabel(state.year, state.month),
        turn: state.turn,
        clanId: clan.id,
        clanName: clan.name,
        result: "lose",
        why: "wander",
        share: 0,
        culture: clan.culture || 0
      });
    }
    if (!humansLeft.length) {
      const seatIds = {};
      ensureGameSeats(state).forEach((s) => {
        seatIds[s.clanId] = 1;
      });
      const pool = others.filter((c) => seatIds[c.id]);
      const top = (pool.length ? pool : others).slice().sort((a, b) => landOf(state, b.id) - landOf(state, a.id))[0];
      state.winner = {
        clanId: top ? top.id : clan.id,
        name: top ? top.name : clan.name,
        share: top ? landShare(state, top.id) : 0,
        why: "wander",
        loser: clan.name
      };
      finishWin(state);
    }
    return "";
  }

  function aiFill(state) {
    state.clans.forEach((c) => {
      if (!c.alive) return;
      if (!c.ai && !c.autoQueue) return;
      autoAssignClan(state, c.id);
      if (c.autoQueue && !c.ai) {
        fillAutoQueue(state, c.id);
        return;
      }
      const q = state.queues[c.id];
      if (!q) return;
      if (!q[0]) q[0] = [];
      if (q[0].length < D().MAX_CMD_PER_TURN) {
        planCommands(state, c, 0, q[0]).forEach((cmd) => {
          if (q[0].length < D().MAX_CMD_PER_TURN) q[0].push(cmd);
        });
      }
    });
  }

  function checkWin(state) {
    if (state.winner) return;
    const tot = totalLand(state);
    const need = D().WIN_RATIO;
    state.clans.forEach((c) => {
      if (state.winner || !c.alive) return;
      if (tot && landOf(state, c.id) / tot >= need) {
        state.winner = { clanId: c.id, name: c.name, share: landOf(state, c.id) / tot, why: "land" };
      }
    });
    if (state.winner) finishWin(state);
  }

  function finishWin(state) {
    if (!state || !state.winner) return;
    const standings = buildStandings(state);
    state.standings = standings;
    state.winner.standings = standings;
    const humanWin = (state.players || []).some((p) => p.clanId === state.winner.clanId);
    const byWander = state.winner.why === "wander";
    const byEnd = state.winner.why === "endwar";
    const feat = byWander
      ? "群雄が家を捨てたあと首位となり"
      : byEnd
        ? "この時点の国土と文化度で首位となり"
        : "国土の六割を制し";
    const rankLine = standings
      .map((s) => rankLabel(s.rank) + s.clanName + (s.playerName ? "（" + s.playerName + "）" : ""))
      .join("、");
    log(state, (byEnd ? "【戦争終了】" : "【祝勝利】") + state.winner.name + "が" + feat + "、一位となった！", "system");
    log(state, "【順位発表】" + rankLine, "system");
    const text = byWander
      ? (state.winner.loser || "") + "はすべてを捨てて放浪した。残った家のなかで" + state.winner.name + "が首位となった。"
      : byEnd
        ? "戦争を終えた。この時点の国土と文化度で六家の順位を定め、" + state.winner.name + "が一位となった。"
        : humanWin
          ? state.winner.name + "が" + feat + "、六十余州の覇者となった。"
          : state.winner.name + "が" + feat + "た。あなたの家は及ばなかった。";
    state.popup = {
      kind: "win",
      title: byEnd ? "戦争終了" : "祝勝利",
      text: text,
      img: D().images.battle
    };
    writeGameRecords(state);
  }

  function endWar(state) {
    if (!state) return "乱世がない。";
    if (state.winner) return "すでに乱世の勝敗は決まっている。";
    index(state);
    const standings = buildStandings(state, { byScore: true });
    const top = standings.find((s) => s.alive) || standings[0];
    if (!top) return "順位を付けられない。";
    const tot = totalLand(state) || 1;
    state.winner = {
      clanId: top.clanId,
      name: top.clanName,
      share: tot ? top.land / tot : 0,
      why: "endwar"
    };
    standings.forEach((s, i) => {
      s.winner = s.clanId === top.clanId;
      s.rank = i + 1;
    });
    state.standings = standings;
    finishWin(state);
    return "";
  }

  function resolveTurn(state, opts) {
    if (state.winner) return state;
    opts = opts || {};
    const prevEnd = state.turnEndsAt || Date.now();
    _rand = rng((state.seed + state.turn * 7919) >>> 0);
    aiFill(state);
    fillIdleHumanTurns(state);
    production(state);
    const order = state.clans.filter((c) => c.alive).slice();
    order.sort((a, b) => {
      const da = daimyoOf(state, a.id);
      const db = daimyoOf(state, b.id);
      return (db ? db.leadership : 0) - (da ? da.leadership : 0);
    });
    order.forEach((c) => {
      const slot = state.queues[c.id][0] || [];
      slot.forEach((cmd) => exec(state, c, cmd));
    });
    fireEvent(state);
    growAssigned(state);
    state.clans.forEach((c) => {
      const q = state.queues[c.id];
      q.shift();
      q.push([]);
      shiftQueueHolds(state, c.id);
      if (c.alive && c.autoQueue && !c.ai) fillAutoQueue(state, c.id);
    });
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    state.turn += 1;
    const ms = state.turnMs || D().DEFAULT_TURN_MS;
    state.turnEndsAt = opts.keepClock ? prevEnd + ms : Date.now() + ms;
    state.ready = {};
    state.alliances = state.alliances.filter((al) => al.until >= state.turn);
    index(state);
    checkWin(state);
    log(state, eraLabel(state.year, state.month) + "が明けた。第" + state.turn + "期。", "system");
    if (opts.catchUp) {
      if (isTalentPopup(state.popup)) state.pendingTalent = state.popup;
      if (!state.winner) state.popup = null;
    }
    return state;
  }

  const OWN_PROV = {
    "dom-kaikon": 1, "dom-chisui": 1, "dom-kanno": 1, "dom-kenchi": 1, "dom-chozei": 1,
    "dom-shogyo": 1, "dom-jokaku": 1, "dom-kaido": 1, "dom-tonden": 1, "dom-shomin": 1,
    "dom-kozan": 1, "dom-kanga": 1, "dom-ichiba": 1, "war-boe": 1, "war-chohei": 1,
    "war-tenshin": 1, "sp-takara": 1, "cul-jiin": 1, "cul-joka": 1, "cul-rakuichi": 1,
    "cul-teien": 1, "cul-butsuzo": 1, "cul-tenshu": 1
  };
  const ENEMY_PROV = {
    "war-shutsujin": 1, "war-kyoshu": 1, "war-hoi": 1, "war-yashu": 1, "war-kakei": 1,
    "war-mizuzeme": 1, "war-hyoro": 1, "war-fukuhei": 1, "war-kihei": 1, "war-teppo": 1,
    "sp-ninja": 1, "sp-choryaku": 1, "sp-naiou": 1, "sp-ikki": 1
  };
  const WAR_ADJ = {
    "war-shutsujin": 1, "war-kyoshu": 1, "war-hoi": 1, "war-yashu": 1, "war-kakei": 1,
    "war-mizuzeme": 1, "war-hyoro": 1, "war-fukuhei": 1, "war-kihei": 1, "war-teppo": 1
  };

  function validateCmd(state, clan, cmd) {
    if (!clan || !clan.alive) return "その家はすでに滅びている。";
    const found = findCmd(cmd.sub);
    if (!found) return "方針が不明です。";
    const def = found.def;
    const prov = cmd.targetProvince ? state.provById[cmd.targetProvince] : null;
    const other = cmd.targetClan ? state.clanById[cmd.targetClan] : null;
    if (def.target === "province" && !prov) return "地図上の国を対象に選んでください。";
    if (def.target === "clan" && !other) return "相手家を選んでください。";
    if (other && other.id === clan.id) return "自らの家は選べません。";
    if (OWN_PROV[def.id] && prov && prov.owner !== clan.id) return "自領の国を選んでください。";
    if (ENEMY_PROV[def.id] && prov && prov.owner === clan.id) return "敵領の国を選んでください。";
    if (WAR_ADJ[def.id] && prov) {
      const myAdj = clanProvinces(state, clan.id).some((p) => adjacent(state, p.id, prov.id));
      if (!myAdj) return prov.name + "は隣接していないため出陣できません。";
      if (isAllied(state, clan.id, prov.owner)) return "同盟中の家は攻められません。";
    }
    if (def.id === "dip-konin") {
      const d = cmd.generalId ? state.generals.find((x) => x.id === cmd.generalId) : null;
      if (!d || d.gender !== "f" || d.clanId !== clan.id || d.marriedTo) {
        return "縁組できる未婚の姫を選んでください。";
      }
    }
    if (def.unit || def.soldiers) {
      if (cmd.unit && !troopDef(cmd.unit)) return "兵種を選んでください。";
    }
    if (def.id === "war-chohei" && cmd.unit) {
      const tdef = troopDef(cmd.unit);
      if (tdef && ((tdef.gold || 0) > clan.gold || (tdef.rice || 0) > clan.rice)) {
        return tdef.name + "の徴兵には金" + (tdef.gold || 0) + "・米" + (tdef.rice || 0) + "がさらに要る。";
      }
    }
    if (def.soldiers && cmd.unit) {
      ensureTroops(clan);
      const have = clan.troops[cmd.unit] || 0;
      if (have < 80) return troopLabel(cmd.unit) + "が足りない（80以上必要）。";
    }
    return "";
  }

  function acceptOffer(state, clanId, fromId) {
    const offer = (state.offers || []).find(
      (o) => o.type === "ally" && o.from === fromId && o.to === clanId && o.until >= state.turn
    );
    if (!offer) return false;
    state.alliances.push({ a: clanId, b: fromId, until: state.turn + 12, type: "ally" });
    state.offers = state.offers.filter((o) => o !== offer);
    const a = state.clanById[clanId];
    const b = state.clanById[fromId];
    if (a && b) log(state, a.name + "が" + b.name + "の同盟を受け、盟を結んだ。", "dip", clanId);
    return true;
  }

  function rejectOffer(state, clanId, fromId) {
    const offer = (state.offers || []).find(
      (o) => o.type === "ally" && o.from === fromId && o.to === clanId && o.until >= state.turn
    );
    if (!offer) return false;
    state.offers = state.offers.filter((o) => o !== offer);
    const a = state.clanById[clanId];
    const b = state.clanById[fromId];
    if (a && b) log(state, a.name + "は" + b.name + "の同盟の申し入れを却下した。", "dip", clanId);
    return true;
  }

  function catchUpTurns(state) {
    if (!state || state.winner) return 0;
    const ms = state.turnMs || D().DEFAULT_TURN_MS;
    const max = D().MAX_CATCHUP || 720;
    const now = Date.now();
    if (state.paused) {
      const seen = state.lastSeenAt || 0;
      if (seen && now - seen > 3000) {
        state.turnEndsAt = seen + Math.max(0, state.pauseLeft || 0);
        state.paused = false;
        state.pauseLeft = 0;
      } else {
        return 0;
      }
    }
    const hadWin = !!state.winner;
    if (!state.turnEndsAt) {
      state.turnEndsAt = now + ms;
      return 0;
    }
    let due = 0;
    let t = state.turnEndsAt || 0;
    while (due < max && now >= t) {
      due += 1;
      t += ms;
    }
    let n = 0;
    while (!state.winner && n < due) {
      const suppress = due > 1 && n < due - 1;
      resolveTurn(state, { keepClock: true, catchUp: suppress });
      n += 1;
    }
    if (n >= max && !state.winner && Date.now() >= (state.turnEndsAt || 0)) {
      state.turnEndsAt = Date.now() + ms;
    }
    if (n) {
      if (due > 1) {
        state.awayTurns = (state.awayTurns || 0) + n;
        log(state, "不在のあいだに" + n + "期が進んだ。", "system");
        if (state.winner && !hadWin) state.awayEnded = true;
        if (!state.winner && state.pendingTalent) {
          state.popup = state.pendingTalent;
          state.pendingTalent = null;
        }
      }
    }
    return n;
  }

  function resumeTimer(state) {
    catchUpTurns(state);
    return state;
  }

  function hasSave() {
    try {
      return !!localStorage.getItem(STORAGE);
    } catch {
      return false;
    }
  }

  function enqueue(state, clanId, turnOffset, cmd) {
    const q = state.queues[clanId];
    if (!q || turnOffset < 0 || turnOffset >= D().QUEUE_TURNS) return false;
    const slot = q[turnOffset];
    if (!slot) return false;
    const maxC = D().MAX_CMD_PER_TURN;
    const next = Object.assign({}, cmd || {}, { auto: false });
    if (slot.length < maxC) {
      slot.push(next);
      return true;
    }
    const i = slot.findIndex((c) => c && c.auto);
    if (i < 0) return false;
    slot.splice(i, 1);
    slot.push(next);
    return "replaced";
  }

  function removeQueued(state, clanId, turnOffset, idx) {
    const q = state.queues[clanId];
    if (!q || !q[turnOffset]) return;
    q[turnOffset].splice(idx, 1);
    holdQueue(state, clanId, turnOffset);
  }

  function serialize(state) {
    const copy = Object.assign({}, state);
    delete copy.provById;
    delete copy.clanById;
    return JSON.stringify(copy);
  }

  function ensureListedRares(state) {
    const data = D();
    const listed = [];
    (data.sangokushi || []).forEach((s) => listed.push({ def: s, origin: "sangokushi" }));
    (data.guestRares || []).forEach((s) => listed.push({ def: s, origin: "guest" }));
    const have = {};
    (state.generals || []).forEach((g) => {
      if (g && g.name) have[g.name] = g;
    });
    listed.forEach((row, i) => {
      const s = row.def;
      let g = have[s.name];
      if (g) {
        g.rare = true;
        g.origin = row.origin;
        if (s.skill) g.skill = s.skill;
        if (s.skillText) g.skillText = s.skillText;
        if (s.gender) g.gender = s.gender;
        if (!g.clanId && g.status !== "active") g.status = "hidden";
        finishGeneral(g);
        return;
      }
      g = {
        id: (row.origin === "guest" ? "x" : "r") + "h" + i,
        name: s.name,
        clanId: null,
        origin: row.origin,
        rare: true,
        alive: true,
        gender: s.gender || "m",
        leadership: s.leadership,
        valor: s.valor,
        intellect: s.intellect,
        politics: s.politics,
        charm: s.charm,
        loyalty: 50,
        age: s.age || 24,
        skill: s.skill,
        skillText: s.skillText,
        status: "hidden"
      };
      finishGeneral(g);
      state.generals.push(g);
      have[g.name] = g;
    });
  }

  function hydrate(state) {
    if (!state.offers) state.offers = [];
    if (!state.alliances) state.alliances = [];
    if (!state.ready || Array.isArray(state.ready)) state.ready = {};
    if (!state.log) state.log = [];
    if (!state.queueHold) state.queueHold = {};
    if (!state.queues) state.queues = {};
    (state.clans || []).forEach((c) => {
      if (!state.queues[c.id]) state.queues[c.id] = emptyQueue();
      while (state.queues[c.id].length < D().QUEUE_TURNS) state.queues[c.id].push([]);
      if (!c.warWith) c.warWith = [];
      if (!c.stash) c.stash = [];
      if (c.autoQueue == null) c.autoQueue = false;
      if (c.wandered == null) c.wandered = false;
      if (!c.lastIntel) c.lastIntel = {};
      if (!c.provIntel) c.provIntel = {};
      ensureTroops(c);
      if (c.autoQueue) {
        (state.queues[c.id] || []).forEach((slot) => {
          (slot || []).forEach((cmd) => {
            if (cmd && cmd.auto == null) cmd.auto = true;
          });
        });
      }
    });
    (state.generals || []).forEach((g) => {
      finishGeneral(g);
      if (g.origin === "sangokushi" || g.origin === "guest") {
        g.rare = true;
        if (!g.clanId && g.status !== "active") {
          if (g.status === "ronin" || !g.status) g.status = "hidden";
        }
      }
    });
    ensureListedRares(state);
    if (!state.recordWritten) state.recordWritten = false;
    if (state.awayTurns == null) state.awayTurns = 0;
    if (state.awayEnded == null) state.awayEnded = false;
    if (state.winNoticeAck == null) state.winNoticeAck = false;
    (state.provinces || []).forEach((p) => {
      const src = (D().provinces || []).find((x) => x.id === p.id);
      if (src) {
        p.x = src.x;
        p.y = src.y;
      }
    });
    index(state);
    (state.generals || []).forEach((g) => {
      if (!g.station) return;
      const p = state.provById[g.station];
      if (!p || p.owner !== g.clanId) g.station = null;
    });
    (state.clans || []).forEach((c) => {
      if (c.autoQueue && c.alive && !c.ai) fillAutoQueue(state, c.id);
    });
    ensureGameSeats(state);
    if (state.winner && !state.standings) state.standings = buildStandings(state);
    const anyPost = (state.generals || []).some((g) => g.post && g.post !== "none");
    if (!anyPost) {
      state.clans.forEach((c) => {
        if (c.alive) autoAssignClan(state, c.id);
      });
    }
    return state;
  }

  function save(state) {
    try {
      if (state) state.lastSeenAt = Date.now();
      localStorage.setItem(STORAGE, serialize(state));
    } catch (e) {
      console.warn(e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return null;
      const state = hydrate(JSON.parse(raw));
      catchUpTurns(state);
      if (!state.winner) checkWin(state);
      else if (!state.recordWritten) finishWin(state);
      save(state);
      return state;
    } catch (e) {
      console.warn("群雄覇業: 続きからの読み込みに失敗した", e);
      return null;
    }
  }

  function clearSave() {
    localStorage.removeItem(STORAGE);
  }

  return {
    createGame,
    resolveTurn,
    enqueue,
    removeQueued,
    save,
    load,
    clearSave,
    landOf,
    landShare,
    totalLand,
    clanProvinces,
    adjacent,
    alliesOf,
    isAllied,
    generalsOf,
    daimyoOf,
    eraLabel,
    findCmd,
    hydrate,
    validateCmd,
    acceptOffer,
    rejectOffer,
    resumeTimer,
    STORAGE,
    statOf,
    aptLabel,
    treasureDef,
    setPost,
    setStation,
    stationedAt,
    provMods,
    provStat,
    generalIntro,
    equipItem,
    useConsumable,
    loadHall,
    upsertPlayer,
    playerNameTaken,
    normName,
    deleteRecordPlayer,
    writeGameRecords,
    daughtersOf,
    fillAutoQueue,
    wanderClan,
    intelView,
    pickRecruit,
    catchUpTurns,
    hasSave,
    isTalentPopup,
    cultureLuck,
    eventPickWeight,
    debugCultureEvents,
    buildStandings,
    rankLabel,
    finishWin,
    checkWin,
    endWar,
    clearAutoQueue,
    clearQueueHolds,
    troopLabel,
    troopDef,
    troopTotal,
    ensureTroops,
    isQueueHeld
  };
})();
