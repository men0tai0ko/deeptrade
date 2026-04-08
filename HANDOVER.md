# 深淵商会 — 技術引き継ぎ設計書

**最終更新**: 2026-04-08（S93完了）
**対象**: 次チャットへの完全引き継ぎ用

---

## 次チャットへの指示

> 「HANDOVER.mdを読んで。深淵商会（index.html）の開発を続けたい。index.htmlも添付する。」
> ※ 現在バージョン: **S93**（2026-04-07）

---

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| ゲーム名 | 深淵商会 |
| コンセプト | 冒険 × 放置ショップ × すごろくダンジョン |
| 技術構成 | HTML / CSS / Vanilla JS のみ（単一ファイル） |
| 対象端末 | スマホ基準レスポンシブ（最大幅480px中央寄せ） |
| データ保存 | `localStorage["shinentrade_v1"]`（ゲーム本体）/ `localStorage["shinentrade_logs"]`（ログ）/ `localStorage["shinentrade_analytics"]`（計測） |
| 規模 | 約16,990行 |
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
    autoRun: { active, floor, runs, startGold, startAt, intervalMs, nextRunAt, totalDrops } | null,
    _floor4PoisonAt,
    _watcherReady, _firstHitAvoided, _omenActive, _omenType, _session,
    _shrineAtkBuff,     // 祠バフ：次の戦闘1回のみ与ダメ+30%（S52）
    _shrineLukBuff,     // 祠バフ：フロア中 LUK+5（S52）
    _relicAtkBuff,      // 遺物バフ：次の戦闘1回のみ与ダメ+25%（S82）
    _relicDefBuff,      // 遺物バフ：次の戦闘1回のみ被ダメ-20%（S82）
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
プレイヤー→敵: max(1, floor(str×2×variance×atkDebuffMul×warCryMul×shrineAtkMul - effectiveDef×0.7))
  shrineAtkMul=1.3（祠バフ発動時）/ 1.0（通常）
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
スキル → 冒険録 → 依頼 → 実績 → 鞄拡張 → 転生 → データ → 分析 → **📘ガイド（S52追加）**

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
| .daily-toast | 8210 | bottom:200px固定・デイリー達成通知（S52） |
| _showLegendaryShareModal overlay | 8500 | center配置 |
| affixPoolModal | 9999 | 錬成モーダル内ポップアップ |

---

## CSS変数一覧（S54〜S60 追加分）

```css
:root {
  /* S54 */
  --surface-deep: #1a1a2e;  --surface-base: #0d0d18;
  /* S55 */
  --danger: #e74c3c;  --success: #88ff88;
  /* S56 */
  --damage: #ff8888;  --warning: #ff9999;  --filter-active: #2a2a4e;  --unidentified: #cccc00;
  /* S57 */
  --border-subtle: #444;  --text-disabled: #555;  --info: #4488ff;
  --accent-bg: #1a2a3a;  --bg-deep: #111;  --bg-mid: #222;
  /* S58 */
  --border-dark: #333;  --text-faint: #666;  --text-mid: #888;
  --text-white: #fff;  --text-light: #ccc;  --text-subtle: #aaa;
  /* S59 */
  --bg-darker: #1a1a1a;  --border-list: #1a1a2a;
  /* S60 */
  --boss: #ff2244;  --alert: #ffcc00;  --twitter: #1da1f2;  --track-bg: #1e1e2e;
  --accent-light: #aaaaff;  --border-success: #226622;  --text-muted-blue: #aaaadd;
  --unid-bg: #1a1a00;  --unid-border: #888800;
  /* S61 */
  --gold-dark: #886600;  --bg-canvas: #0a0a14;  --gold-bg: #1a1200;
  --dmg-text: #ff6666;  --danger-dark: #8a2a2a;  --success-bright: #44dd88;
  --surface-alt: #0d0d1a;  --btn-default: #585880;
  --legendary-bright: #e6ac2e;  --green-bright: #2ecc71;
  --text-strike: #888888;  --blackmarket: #ff6688;
}
```
---

## 実装済み機能一覧（S82〜S91）

| セッション | カテゴリ | 内容 |
|---|---|---|
| S82 | ダンジョン | `relic`（遺物）マス: 5種イベント・バフ2種（与ダメ+25%/被ダメ-20%） |
| S83 | ダンジョン | `merchant`（旅の商人）マス: 消耗品3種を販売（価格=basePrice×2×階層補正） |
| S84 | リファクタ・機能 | `_pickWeighted()` ヘルパー化。ショップLv8「需要動向」バナー |
| S85 | ダンジョン | `curse_chest`（呪い箱）マス: 高品質アイテム+強制呪い。開ける/見逃す選択（3F以上） |
| S86 | バグ修正 | スタッフ speedBonus が未計算でLv上昇無効だった問題を修正。stockManager tick 動的化 |
| S87 | UX | スタッフモーダルに「▲次Lv: N分→M分」ヒント。3スタッフ desc に Lv1 間隔を追記 |
| S88 | 機能 | ショップLv10「自動鑑定スタンプ」: 出品時に未鑑定品を自動鑑定 + shopExpBar バッジ |
| S89 | バグ修正 | 自動鑑定スタンプのログに呪い情報（`_curseNote`）を追加 |
| S90 | 機能 | 常連客ギフト: 20回購入ごとに gem/ancient_coin をプレゼント |
| S91 | バグ修正 | ダンジョンマップスクロール右端固定を double rAF + scrollIntoView で修正 |
| S91+ | 削除 | legendary 売却時の SNS シェアモーダルを完全削除 |

---

## ショップLv解禁機能一覧（S84〜S90）

| Lv | 機能 | 実装 |
|---|---|---|
| Lv2 | 鑑定機能解禁 | `identifyItem()` |
| Lv5 | 裏取引解禁 | `bmUnlocked()` |
| Lv8 | 需要動向バナー | `demandForecastBanner`（renderShop 内）|
| Lv10 | 自動鑑定スタンプ | `listItem()` 内で `!item.identified && gs.shop.level >= 10` |

---

## 共通グローバル定数（S73〜S77追加）

| 定数名 | 内容 | 追加 |
|---|---|---|
| `EQUIP_TYPE_COLOR` | 装備タイプ別表示カラー（weapon/#e8d5a0 等12種） | S73 |
| `RARITY_SHORT_LABEL` | レアリティ短縮表記 `{normal:"N", rare:"R", epic:"E", legendary:"L"}` | S76 |
| `RARITY_ORDER_MAP` | レアリティ昇順ソート用 `{normal:0, rare:1, epic:2, legendary:3}` | S77 |

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


## S53 完了内容（2026-04-06）

### 機能追加・バグ修正（5件）

| 内容 | 詳細 |
|---|---|
| SKILL-EXPAND | worldRank100解禁転生スキル3種追加（rb_apex: 全ステ+8%・ボス与ダメ+10% / rb_hoard: 売値+12%・棚+2 / rb_transcend: 全ステ+5%・maxHP+15%・SP+5） |
| REBIRTH-PROGRESS | `renderDungeon` 潜入前カードに転生条件進捗インジケーター（`rebirthHint`）追加 |
| DAILY-UX | `initDailyMissions()` リセット時に `addShopLog` でログ追加 |
| COMBAT-SKILL-UX | `buildCombatSkillBtn` 複数スキル時に `_hasUsable` 判定でdisabled化 |
| BAG-COST-UX | `openBagModal` にGold差額ヒント表示を追加 |

---

## S52 完了内容（2026-04-06）

### 機能追加（8件）

| 内容 | 詳細 |
|---|---|
| 祠イベント拡充 | SHRINE_EVENTSテーブル11種（重み付き抽選）に刷新。鑑定・MP回復・素材・Gold・一時バフ等を追加 |
| 祠バフ統合 | `_shrineAtkBuff`（次戦+30%）/ `_shrineLukBuff`（フロア中LUK+5）を戦闘・罠計算に統合 |
| チュートリアルSTEP4追加 | 「⛩ 祠と消耗品」ステップを追加。tip表示・ステップ色分け・forceShow引数対応 |
| ガイド再表示ボタン | ステータスタブ iconDock に「📘 ガイド」ボタン追加（任意再表示） |
| Analytics強化 | ファネルバー可視化・離脱率・直近5セッション・KPI色判定・STEP4スキップ集計 |
| デイリー達成トースト | 達成瞬間に緑トースト（.daily-toast）表示。タップで依頼モーダル直行 |
| 一括出品フィルター改善 | 未鑑定専用「❓」ボタン追加。等級指定中は未鑑定を非表示、[全]時のみ表示 |
| 周回リザルト強化 | 獲得Gold・1周平均・経過時間・Gold/分カードを追加。タイトルを「🔄 周回リザルト」に変更 |
| 需要UI改善 | 棚の需要表示を4段階バッジ（🔥旺盛/📈上昇/📊中程度/⚠低下）に強化 |

## S54 完了内容（2026-04-06）

### バグ修正・品質改善（3件）

| 内容 | 詳細 |
|---|---|
| DAILY-RANDOM | デイリーシャッフルをFisher-Yatesに置換（一様分布保証） |
| SKILL-EXPAND補足 | `rb_apex` ボス与ダメ適用箇所を確認（`doBattle` 統合処理で正しく動作・変更なし） |
| COLOR-VAR | `--surface-deep`（#1a1a2e）・`--surface-base`（#0d0d18）をCSS変数化。計39箇所置換 |

---

## S93 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| コレクション登録漏れ修正 | 格納庫にある時点で登録を徹底。6経路に `registerCollection` を追加（identifyItem / gradeUpItem / leaveDungeon / ボスクリア / autoRun / 古物商tick） |

---

## S92 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| 常連ギフト判定修正 | `% 20` → `floor(n/20) > floor(prev/20)` に変更。unidBonus=1 で 20 を飛び越す問題を修正 |

---

## S91追加完了（2026-04-08）

### 削除（1件）

| 内容 | 詳細 |
|---|---|
| LEGENDARY-SHARE-MODAL 削除 | legendary 売却ごとのSNSシェアモーダルを完全削除 |

---

## S91 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| DUNGEON-MAP-SCROLL-FIX | ダンジョンマップ現在地マスが右端固定になる問題を修正。double rAF + scrollIntoView({inline:"center"}) に変更 |

---

## S90 完了内容（2026-04-08）

### 機能追加（1件）・ドキュメント整備（1件）

| 内容 | 詳細 |
|---|---|
| 常連客ギフト | `processRegularPurchase` に20回購入ごとのギフト処理追加（gem/ancient_coin ランダム） |
| ショップLv解禁一覧 | HANDOVER.md に Lv2/5/8/10 解禁機能テーブルを追加 |

---

## S89 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| 自動鑑定スタンプ 呪いログ漏れ修正 | `listItem()` の自動鑑定後、呪い付き時に「⚠ 呪い【label】が判明！」をログに追加 |

---

## S88 完了内容（2026-04-07）

### 機能追加（2件）

| 内容 | 詳細 |
|---|---|
| Lv10 自動鑑定スタンプ | `listItem()` に Lv10 判定を追加。出品時に未鑑定品を自動鑑定 |
| shopLv バッジ | shopExpBar に Lv8/Lv10 解禁機能バッジを表示 |

---

## S87 完了内容（2026-04-07）

### UX改善（2件）

| 内容 | 詳細 |
|---|---|
| STAFF-NEXT-LV-HINT | 3スタッフの育成ボタン下に「▲ 次Lv: N分→M分」ヒント表示 |
| STAFF-DESC-UPDATE | 3スタッフの desc に Lv1 の具体的な間隔を追記 |

---

## S86 完了内容（2026-04-07）

### バグ修正（2件）・UX改善（1件）

| 内容 | 詳細 |
|---|---|
| STAFF-SPEEDBONUS-BUG | alchemist/antiquarian の speedBonus が base に未定義 → Lv上昇で速度変化なし。base に 0 追加で修正 |
| STAFF-STOCKMANAGER-FIX | stockManager の autoShelfSpeed が tick 未反映 → Lv上昇無効。動的 interval 計算に修正 |
| STAFF-EFFECT-DISPLAY | effParts に具体的な間隔（N分/個）を表示 |

---

## S85 完了内容（2026-04-07）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| curse_chest マス実装 | `handleCurseChest()` 追加。高品質アイテム＋強制呪い付与。「開ける/見逃す」選択モーダル。3F以上で出現 |

---

## S84 完了内容（2026-04-07）

### 品質改善・機能追加（2件）

| 内容 | 詳細 |
|---|---|
| _pickWeighted 共通化 | RELIC/SHRINE の重み付き抽選を `_pickWeighted(events)` ヘルパーに集約 |
| 需要動向バナー | ショップLv8解禁。`demandHistory` 直近2スナップ比較で4カテゴリの動向を表示 |

---

## S83 完了内容（2026-04-07）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| merchant マス実装 | `handleMerchant()` 追加。herb/potion/antidote を basePrice×2×階層補正で販売。購入後 dungeon.consumables に直接追加 |

---

## S82 完了内容（2026-04-07）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| relic マス実装 | `RELIC_EVENTS`(5種) + `handleRelic()` 追加。バフ2種を doBattle に統合。マイグレーション追加 |

新フィールド（dungeon）:
- `_relicAtkBuff`: boolean — 次の戦闘1回のみ与ダメ+25%
- `_relicDefBuff`: boolean — 次の戦闘1回のみ被ダメ-20%

---

## S81 完了内容（2026-04-07）

### 安全性確認・機能設計（コード変更なし）

- leaveDungeon / startAutoRun 全ガード確認済み
- 次期機能設計（DUNGEON-EVENT-NEW / SHOP-TIER-UNLOCK）を tasks.md に記録

---

## S80 完了内容（2026-04-07）

### 安全性確認・ドキュメント整備（コード変更なし）

- openListModal / showDungeonResult 全ガード確認済み
- 行数を 16,990行 に更新
- 次期機能候補を tasks.md に記録（DUNGEON-EVENT-NEW / SKILL-SITUATIONAL 等5件）

---

## S79 完了内容（2026-04-07）

### 安全性確認・ドキュメント整備（コード変更なし）

- learnRebirthSkill / buyLootSlot 全ガード確認済み
- HANDOVER.md に共通グローバル定数一覧セクション追加

---

## S78 完了内容（2026-04-07）

### 安全性確認（コード変更なし）・重複定数整理完了

- DEDUP最終スキャン: BTN は3パターン・TYPE_ICON は内容不一致のため対象外。重複整理は S73〜S77 で完了
- openSkillTree ガード確認済み

---

## S77 完了内容（2026-04-07）

### 品質改善（1件）

| 内容 | 詳細 |
|---|---|
| RARITY_ORDER_MAP 共通化 | `RARITY_ORDER` オブジェクト型4箇所を `RARITY_ORDER_MAP` グローバル定数に集約 |

---

## S76 完了内容（2026-04-07）

### 品質改善（1件）

| 内容 | 詳細 |
|---|---|
| RARITY_SHORT_LABEL 共通化 | `RARITY_SHORT`(3箇所) / `RARITY_LABEL`(2箇所) を `RARITY_SHORT_LABEL` グローバル定数に集約 |

---

## S75 完了内容（2026-04-07）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| TYPE_ICON-BRACELET | `openBulkDecomposeModal` の `bracelet:"🔗"` を `"🔮"` に修正（他3箇所と統一） |

---

## S74 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

- TYPE_ICON差異確認（意図的）/ claimAchievement / gradeUpItem / openReforgeModal を全スキャン
- 全て問題なし確認

---

## S73 完了内容（2026-04-07）

### 品質改善（1件）・安全性確認

| 内容 | 詳細 |
|---|---|
| TYPE_COLOR 共通化 | 4箇所に重複コピーされていた装備タイプ別カラー定数を `EQUIP_TYPE_COLOR` グローバル定数として集約。動作変更なし |

---

## S72 完了内容（2026-04-07）

### 安全性確認・HANDOVER最終整備（コード変更なし）

- doBossAttack skill undefined / checkRegularOrders orderType fallback / openCollectionModal null参照 を確認
- 全て問題なし。保留課題テーブル・安全性確認済み範囲を HANDOVER.md に追記

---

## S71 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

- identifyItem / checkQuestProgress / gainExp / openShelfSettingsModal / S62〜S66全修正反映を確認
- 全て問題なし

---

## S70 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

- UX-REVIEW-PREP / learnSkill / handleTrap / openBrewModal を全スキャン
- 全て問題なし確認

---

## S69 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

- calcStats 転生スキル集計 / Gold加算 NaN防止 / generateMap 境界値 / SAVEDATA-SIZE を全スキャン
- 全て問題なし確認

---

## S68 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

- toggleLock / equipItemByUid / unequipItem / doRebirth / render頻度 / dungeon リセット後フィールド を全スキャン
- 全て既存ガードで保護済みと確認

---

## S67 完了内容（2026-04-07）

### 安全性確認（コード変更なし・全項目問題なし）

- HINT-ABYSS / doBattle / openBulkModal 各種 / renderLoot / SAVEDATA-MIGRATE をスキャン
- 全て既存ガードで保護済みと確認

---

## S66 完了内容（2026-04-07）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| FLUCTUATE-DEMAND-SHUFFLE | `fluctuateDemand()` カテゴリシャッフルを Fisher-Yates に置換。weapon/armor 偏り修正 |

---

## S65 完了内容（2026-04-07）

### バグ修正（2件）

| 内容 | 詳細 |
|---|---|
| BUG-REGULAR-FINDINDEX | `checkRegularVisits()` 来訪購入 `findIndex` に `s.item` チェック追加・`slotIdx < 0` ガード追加。`item:null` 特化スロット存在時のクラッシュを修正 |
| BUG-ORDER-FINDINDEX | `checkRegularOrders()` 注文購入 `findIndex` に `s.item` チェック追加（条件統一） |

---

## S62 完了内容（2026-04-07）

### 品質改善（2件）

| 内容 | 詳細 |
|---|---|
| COLOR-VAR-RESIDUAL | `--rare`(#3498db) / `--epic`(#9b59b6) / `--green`(#27ae60) の残存ハードコード18箇所をCSS変数に置換（CSS9箇所・JS9箇所） |
| HINT-ORDER-FATIGUE | `calcNextAction()` 疲弊ヒントを②.5に移動（棚出品ヒックより優先表示） |

---

## 保留課題（tasks.md に詳細）

| # | 内容 | ステータス |
|---|---|---|
| DAILY-UX | 2件化への混乱懸念 | ✅ S53完了 |
| ANALYTICS-EVAL | Analytics可視化モーダル強化 | ✅ S52完了 |
| COLOR-VAR | 未変数化カラーの変数化 | ✅ S62完了（アルファ付き・JSデータ定義は仕様として除外） |
| DAILY-UX-2 / DAILY-LOGIC-4 | 保留課題 | ✅ S64クローズ |
| SKILL-EXPAND | worldRank100解禁転生スキル追加 | 🟢 設計待ち（現状は機能として完成） |

## 安全性確認済み範囲（S62〜S72）

S62〜S72 の BUG-HUNT セッションで以下を全スキャン・問題なしと確認：

- toggleLock / equipItemByUid / unequipItem / doRebirth / gainExp / identifyItem
- checkRegularVisits（S65でfindIndexバグ修正）/ checkRegularOrders / processRegularPurchase
- checkShopSales / checkBlackmarket / checkShopIncome / checkStaffIncome / checkInvestmentReturn
- doBattle / doBossAttack / handleTrap / handleLava / generateMap
- openBulkEnhanceModal / openBulkDecomposeModal / openBulkIdentifyModal / openBulkPurifyModal / openBrewModal
- learnSkill / resetSkill / checkQuestProgress / openCollectionModal / openShelfSettingsModal
- fluctuateDemand（S66でFisher-Yates修正）/ calcStats 転生スキル集計 / render() 呼び出し頻度
