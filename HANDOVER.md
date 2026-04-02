# 深淵商会 — 技術引き継ぎ設計書

**最終更新**: 2026-04-02（S51完了）
**対象**: 次チャットへの完全引き継ぎ用

---

## 次チャットへの指示

> 「HANDOVER.mdを読んで。深淵商会（index.html）の開発を続けたい。index.htmlも添付する。」

---

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| ゲーム名 | 深淵商会 |
| コンセプト | 冒険 × 放置ショップ × すごろくダンジョン |
| 技術構成 | HTML / CSS / Vanilla JS のみ（単一ファイル） |
| 対象端末 | スマホ基準レスポンシブ（最大幅480px中央寄せ） |
| データ保存 | `localStorage["shinentrade_v1"]`（ゲーム本体）/ `localStorage["shinentrade_logs"]`（ログ）/ `localStorage["shinentrade_analytics"]`（計測） |
| 規模 | 約16,200行 |
| ホスティング | GitHub Pages — https://men0tai0ko.github.io/deeptrade/ |

---

## gameState 構造

```javascript
gs = {
  player: {
    level, exp, nextExp,
    base: { str, def, agi, vit, int, luk },
    hp, maxHp, mp, maxMp, gold, status,
    skills: [], skillPoints: 0,
    worldRank: 0, rebirthPoints: 0, rebirthSkills: [],
    lootSlots: 0,           // 鞄拡張段階（転生後も引き継ぎ）
    abyssFloorCleared: 0,   // 真エンドフロア解禁済み最大階層（0=未解禁）
    fatigue: { expiresAt: timestamp } | null,
  },
  equipped: {
    weapon, sub, head, body, cloak, legs,
    arms, feet, neck, bracelet, ring, seal  // uid参照 or null
  },
  inventory: [{
    uid, itemId, rarity, demand, affixes, cursed, curse,
    identified, enhLv, statOverride, locked
  }],
  dungeon: {
    active, floor, activeFloor, clearedFloor, ng, selectedFloor,
    attempts, map, progress, loot, combat, isReplay,
    mercenary, poisoned, burned, consumables,
    omamoriPriority: "low" | "high",
    autoHeal: { enabled: boolean, threshold: number },
    autoRun: { active, floor, runs, startGold, intervalMs, nextRunAt, totalDrops } | null,
    _floor4PoisonAt,
    _watcherReady, _firstHitAvoided, _omenActive, _omenType, _session,
  },
  shop: {
    level, exp, nextExp, totalSales,
    shelves: [{ item, listedAt, sellDuration, specialType, onSale } | null],
    pendingComplaints, demand, trend, blackmarket, staff,
    investment, guildReward, lastIncomeAt, earnings,
    demandHistory, regulars, autoShelfRarities: [],
  },
  collection: {
    entries:   string[],   // 旧形式（互換保持）
    completed: string[],   // 達成済みcolId
    maxEnh:    object,
  },
  achievements: {
    claimed: [],
    stats: { enemyKills, bossKills, totalEnhance, totalPurify, totalReforge,
             totalGradeUp, mercUsed, totalBrew, totalDungeonEnter, totalBmSales,
             poisonKills, legendaryFound, totalRegularBuys,
             totalBulkEnhance, totalColStar },
  },
  quests: [],
  meta: {
    version, lastSave, isFirstPlay,
    dailyMissions: [  // 毎日ランダム2種（S51: 5種プールから抽選）
      { type, desc, target, progress, reward, claimed }
    ],
    dailyResetAt: number,  // 翌00:00タイムスタンプ（ローカル時刻）
  }
}
```

---

## ログシステム

```javascript
const MAX_LOG = 100;
const ALL_LOGS = [];  // { type, cls, msg }[]

addLog(cls, msg)           // dungeon
addShopLog(cls, msg)       // shop
setInventoryMsg(cls, text) // inventory

makeFilteredLogHtml("all")     // 全ログ
makeFilteredLogHtml("dungeon") // 冒険ログのみ
```

---

## ダメージ計算式

```
プレイヤー→敵: max(1, floor(str×2×variance×atkDebuffMul×warCryMul - effectiveDef×0.7))
  variance=0.85〜1.15
  effectiveDef = max(0, en.def - c._defDebuffFlat)

敵→プレイヤー: max(1, floor(str²×5 / (def + str×5)))
  ボス: _bDef = max(1, total.def - boss.defDebuff)

クリティカル率: min(60, 5 + luk×0.2 + critBonus + setCritRateBonus + rbCritRatePct)%
クリティカル倍率: ×1.8 + setCritDmgBonus/100
毒ダメ: max(1, ceil(最大HP×0.03×poisonMul))
熱傷ダメ: max(1, ceil(最大HP×0.02))
```

---

## 階層構成（1〜5階通常 / 6〜10階真エンド）

| 階層 | 推奨CP | ボス | 特殊ルール |
|---|---|---|---|
| 1階 | 30 | 鉄の番人 | なし |
| 2階 | 60 | 影の将軍 | 罠マス+1 |
| 3階 | 110 | 影竜 | 休息マスなし |
| 4階 | 180 | 沼の蛇神 | 罠+1・5マス後に毒 |
| 5階 | 280 | 深淵の炎皇 | 溶岩×2・罠増・休息なし |
| 6〜10階★ | 450〜1600 | 深淵の番兵〜深淵の意思 | worldRank100解禁 |

---

## フェーズ（ng）システム

- ng=0が初期（フェーズ1）
- 全5階層クリアでng+1
- 敵強化倍率: ×(1 + ng×0.5)
- 表示: 「フェーズN」（フェーズ2以降のみ）

---

## 主要定数

```javascript
LOOT_LIMIT_BASE = 8
LOOT_SLOT_UPGRADES = [500, 2000, 8000, 32000]
ENHANCE_MAX = 12
STAFF_MAX_LV = 50
FLOOR_RECOMMENDED_CP = { 1:30, 2:60, 3:110, 4:180, 5:280, 6:450, 7:650, 8:900, 9:1200, 10:1600 }
```

---

## 周回モード（AUTO_RUN）

```javascript
AUTO_RUN_CONFIG = {
  1:  { intervalSec:30,  dropMin:1, dropMax:2 },
  2:  { intervalSec:45,  dropMin:1, dropMax:3 },
  3:  { intervalSec:60,  dropMin:2, dropMax:3 },
  4:  { intervalSec:90,  dropMin:2, dropMax:4 },
  5:  { intervalSec:120, dropMin:2, dropMax:4 },
  6:  { intervalSec:150, dropMin:2, dropMax:5 },
  7:  { intervalSec:180, dropMin:3, dropMax:5 },
  8:  { intervalSec:210, dropMin:3, dropMax:6 },
  9:  { intervalSec:240, dropMin:3, dropMax:6 },
  10: { intervalSec:300, dropMin:4, dropMax:6 },
}
```

---

## UIレイアウト構成

### タブバー
```
⚔ 冒険 | 🏪 ショップ | 🎒 鞄 | 📦 格納庫 | 📊 ステータス | [📋]
```
- `[📋]` ログボタン: ショップ・鞄・格納庫タブのみ表示

### topBar（最上部ヘッダー）
- Lv / CP / HP（バフ表示付き）/ MP / EXP

### ステータスタブ iconDock
スキル → 冒険録 → 依頼 → 実績 → 鞄拡張 → 転生 → データ → **分析（S51追加）**

### ショップ iconDock（常時表示）
📋ログ → ⚙棚設定 → 👥雇用人 → ⭐常連客 → 🌑裏取引 → 📥一括取下 → 📊市場 → 💰放置収入

---

## z-index体系

| 要素 | z-index | 備考 |
|---|---|---|
| .modal-overlay | 100 | 通常モーダル |
| .lvup-overlay | 1000 | LvUp演出 |
| .legendary-flash-overlay | 7999 | pointer-events:none |
| .sale-banner | 8000 | top固定・pointer-events:none |
| .ach-toast | 8200 | bottom:140px固定 |
| _showLegendaryShareModal overlay | 8500 | center配置 |
| affixPoolModal | 9999 | 錬成モーダル内ポップアップ |

---

## デイリーミッションシステム（S51）

### DAILY_MISSION_TYPES（配列・5種）

| type | トリガー | 内容 |
|---|---|---|
| daily_sell_gold | sell | 本日の売上N G達成 |
| daily_enter_dungeon | dungeon_enter | ダンジョンにN回潜入 |
| daily_enhance | enhance | 装備をN回強化 |
| daily_sell_rare | sell（rarity判定） | Rare以上をN個売却 |
| daily_sell_count | sell（count） | アイテムをN個売却 |

### `_getDailyDef(type)` ヘルパー
配列化に伴い、全6参照箇所でこのヘルパーを使用。`DAILY_MISSION_TYPES[m.type]` 形式は廃止。

### `initDailyMissions()` 呼び出し3箇所
```javascript
// 1. init() — 起動時
if(initDailyMissions() && !gs.dungeon.active) render();

// 2. openQuestModal() — モーダル開放時
if(initDailyMissions() && !gs.dungeon.active) render();

// 3. 1秒setInterval — バックグラウンドリセット検出
if(Date.now() >= (gs.meta.dailyResetAt || 0)) {
  const _dailyClaimed = initDailyMissions();
  if(_dailyClaimed && !gs.dungeon.active) render();
}
```

---

## Analytics モジュール（S51）

```javascript
const Analytics = (() => {
  const KEY = "shinentrade_analytics";
  // 公開API:
  return { init, guideCompleted, guideSkipped,
           firstEnter, firstReturn, firstSale, tick, quickList };
})();
```

### セッションスキーマ
```json
{
  "sessionId": "abc123_18fa2b",
  "startAt": 1711555200000,
  "isFirstSession": true,
  "guide": { "shown": true, "completedAt": null, "skippedAtPage": null },
  "firstLoop": { "enterAt": null, "returnAt": null, "firstSaleAt": null, "completed": false },
  "quickList": { "used": 0, "totalListed": 0 },
  "endAt": null,
  "durationSec": null
}
```

### コンソールコマンド
```javascript
_analyticsReport()  // 詳細ファネルをconsole.tableで表示
```

---

## 転生スキル一覧（S51時点）

| グループ | スキルID | 名称 | 解禁条件 |
|---|---|---|---|
| 経営強化 | rb_gold / rb_shelf / rb_fullheal / rb_sp | 商人の才 等 | 即時 |
| 戦闘強化 | rb_atk / rb_def / rb_hp / rb_loot | 深淵の力 等 | 即時 |
| 守護の加護 | rb_deathsave1〜3 | 深淵の器I〜III | 即時 |
| 深淵の境地 | rb_crit / rb_autorun / rb_demand / rb_rarity / rb_mastery | 深淵の眼光 等 | worldRank20 |
| 深淵の覇道 | rb_veteran / rb_fortune / rb_endurance | 深淵の覇気 等 | worldRank50 |

### worldRank節目一覧

| worldRank | 演出 | ゲーム内影響 |
|---|---|---|
| 10 | ログ1行 | なし |
| 20 | 専用モーダル「深淵の境地が開かれた」 | 深淵の境地スキル解禁 |
| 50 | 専用モーダル「深淵の覇道が開かれた」（S51） | 深淵の覇道スキル解禁 |
| 99 | 予告ログ | なし |
| 100 | 専用モーダル「観測外領域へようこそ」 | 6階解禁 |
| 200・300… | 100回ごとに記念モーダル | なし |

---

## 帰還後「まとめて出品する」ボタン（S51）

### `quickListAfterReturn()` 関数
- 未鑑定品を全て無料鑑定（Gold消費なし・Lv制限なし）
- 空き棚に装備品を一括出品
- saveGame は最後に1回のみ
- 除外対象: 装備中 / 棚出品中 / 裏取引中 / locked / UNSELLABLE_ITEMS

### 設計上の注意
- `listItem()` は内部で毎回 `saveGame()` を呼ぶため流用しない
- `identifyItem()` はGold消費・Lv制限・render・モーダルremoveを含むため流用しない

---

## 保留課題（tasks.md に詳細）

| # | 内容 | ステータス |
|---|---|---|
| DAILY-UX | 2件化への混乱懸念 | 🟡 保留 |
| ANALYTICS-EVAL | まとめて出品ボタンのKPI観測 | 🟡 観測待ち |
| COLOR-VAR | 未変数化カラーの変数化 | 🟢 保留（誤置換リスク） |
| SKILL-EXPAND | worldRank100解禁転生スキル追加 | 🟢 設計待ち |
