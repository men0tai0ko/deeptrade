# 深淵商会 — 技術引き継ぎ設計書

**最終更新**: 2026-03-28（セッション48完了）
**対象**: 次チャットへの完全引き継ぎ用

---

## 次チャットへの指示

> 「HANDOVER.mdを読んで。深淵商会（index.html）の開発を続けたい。index.htmlも添付する。」

---

## プロジェクト概要

**ゲーム名**: 深淵商会
**コンセプト**: 冒険 × 放置ショップ × すごろくダンジョン
**技術構成**: HTML / CSS / Vanilla JS のみ（単一ファイル）
**対象端末**: スマホ基準レスポンシブ（最大幅480px中央寄せ）
**データ保存**: `localStorage["shinentrade_v1"]`（ゲーム本体）/ `localStorage["shinentrade_logs"]`（ログ永続化）
**規模**: 約14,596行・約710KB

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
    lootSlots: 0,           // 鞄拡張段階（転生後も引き継ぎ・S46変更）
    abyssFloorCleared: 0,   // 真エンドフロア解禁済み最大階層（0=未解禁, 6〜10）
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
    _floor4PoisonAt,  // 4階：5マス後に毒発症カウント
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
    completed: string[],   // 達成済みcolId（"iron_w_n_0"形式）
    maxEnh:    object,     // { "iron_sword_normal": 7, ... }
  },
  achievements: {
    claimed: [],
    stats: { enemyKills, bossKills, totalEnhance, totalPurify, totalReforge,
             totalGradeUp, mercUsed, totalBrew, totalDungeonEnter, totalBmSales,
             poisonKills, legendaryFound, totalRegularBuys,
             totalBulkEnhance, totalColStar },
  },
  meta: { version, lastSave }
}
```

---

## ログシステム

```javascript
const MAX_LOG = 100;      // 全タイプ合計上限
const ALL_LOGS = [];      // { type, cls, msg }[]

// タイプ: "dungeon" / "shop" / "inventory"
addLog(cls, msg)           // dungeon
addShopLog(cls, msg)       // shop
setInventoryMsg(cls, text) // inventory

// 表示
makeFilteredLogHtml("all")      // 全ログ（冒険前画面）
makeFilteredLogHtml("dungeon")  // 冒険中・戦闘中

// 永続化: saveGame()でshinentrade_logsキーに保存、init()で復元
```

---

## ダメージ計算式

```
プレイヤー→敵: max(1, floor(str × 2 × variance × atkDebuffMul × warCryMul - effectiveDef × 0.7))
  variance=0.85〜1.15 / atkDebuffMul=c._atkDebuffMul（恐怖デバフ時0.6）
  effectiveDef = max(0, en.def - c._defDebuffFlat)  ← 盾砕き・呪縛等で低下
敵→プレイヤー: max(1, floor(str² × 5 / (def + str × 5)))
  ボス通常攻撃: _bDef = max(1, total.def - boss.defDebuff)  ← skill_howl等
クリティカル率: min(60, 5 + luk×0.2 + critBonus + setCritRateBonus + rbCritRatePct)%
クリティカル倍率: ×1.8 + setCritDmgBonus/100
毒ダメ: max(1, ceil(最大HP × 0.03 × poisonMul))  ← 最大HP基準
熱傷ダメ: max(1, ceil(最大HP × 0.02))
ボス貫通: DEFを pierce 割合だけ無視（例: pierce:0.5 → DEF×50%のみ有効）
ボスHP%ダメ: max(1, floor(最大HP × hpPctDmg))  ← 防御無視
```

---

## 階層構成（1〜5階）

| 階層 | マップ変化 | 特殊ルール | ボス | 推奨CP |
|---|---|---|---|---|
| 1階 | なし | なし | 鉄の番人 | 30 |
| 2階 | 罠マス+1 | なし | 影の将軍 | 60 |
| 3階 | 休息マスなし | なし | 影竜 | 110 |
| 4階 | 罠+1・windfall+1 | 5マス後に毒状態 | 沼の蛇神 | 180 |
| 5階 | 溶岩マス×2・罠増・休息なし | 熱傷付与敵あり | 深淵の炎皇 | 280 |

### 溶岩マス（🌋）
踏んだ瞬間に最大HP×5%ダメージ（防御無視・回避不可）

### 5階ボス「深淵の炎皇」スキル
- `skill_pierce`: DEFを50%無視する貫通斬り（×1.3）
- `skill_lava_burst`: DEFを75%無視する熔岩爆発（×1.8）
- `skill_burn`: 熱傷状態付与（ダメなし）
- `skill_inferno`: 最大HPの12%を直接削る業炎の嵐（防御無視）

---

## フェーズ（ng）システム

- ng=0が初期フェーズ（フェーズ1）
- 全5階層クリアでng+1（フェーズN+1に移行）
- 敵強化倍率: ×(1 + ng × 0.5)
- **表示**: 「フェーズN」（タイトル直下に橙色で独立表示・フェーズ2以降のみ）
- ボス撃破画面: 初クリア→「✨ N+1階層が解放された」/ 再クリア→「💀 ボス名、再び沈む」（赤系）
- **再クリア時はselectedFloorを変更しない**（手動周回のため同フロアに留まる）

---

## 収集登録タイミング

| トリガー | 備考 |
|---|---|
| 販売完了（売れた）`checkShopSales` | 商人として最も自然 |
| 装備時 `equipItem` | 自分で使った = 価値認定 |
| 裏取引出品時 `bmListItem` | 鑑定済みのみ |

※ 陳列時・自動陳列時のトリガーは廃止済み

---

## 収集テーマ（36テーマ・2132+コレクション）

★0〜★12の13段階で構成。S46でテーマ体系を全面整理済み。

| 種別 | テーマ数 |
|---|---|
| weapon/armor/accティア系（既存8+inferno+新5ティア） | 14テーマ |
| アクセテーマ（inferno含む）| 12テーマ |
| 部位横断テーマ | 10テーマ |
| **合計** | **36テーマ** |

### テーマ順序（抜粋）
鉄の守り手 → 竜を纏いし者 → 革の旅人 → 深淵の刺客 → 疾風の使者 → 魔術師の系譜 → 星詠みの申し子 → 歴戦の猛者 → 業炎の覇者 → アクセ12種 → 部位横断10種 → 真エンド5ティア（worldRank20解禁後に表示）

### 業炎の覇者（5階ティア）
- weapon: inferno_blade, magma_dagger, heatwall_shield（3種）
- armor: ashen_helm, ember_armor, lava_greaves, pyre_gauntlets, cinderstep（5種）
- 報酬: STR/DEF/VIT特化、全コンプでmaxHpPct+2

### shadow_seal（影の印章）入手経路
- F4ボスドロップ（12%抽選でpower_seal/wisdom_sealと同プール）
- F4 generateDropプール

### inferno_ring・ashcloak
コレクションテーマに属さない独立した上位アクセ装備。将来の上位テーマ追加時に組み込む予定。

---

## UIレイアウト構成

### タブバー
```
⚔ 冒険 | 🏪 ショップ | 🎒 鞄 | 📦 格納庫 | 📊 ステータス | [📋]
```
- `[📋]` ログボタン: ショップ・鞄・格納庫タブで右端に表示。ステータス・冒険タブでは非表示
- タブ切替（`switchTab`）と `render()` でボタン表示状態を同期

### topBar（最上部ヘッダー）
- Lv / CP
- HP（`+○○%` バフ表示付き）/ MP
- EXP: `現在値 / 必要値 (XX.XXXX%)`

### ステータスタブ iconDock
スキル → 冒険録 → 依頼 → 実績 → 鞄拡張 → 転生  
**依頼・鞄拡張はショップから移動済み（S43）**

### ステータスタブ プレイヤー画面
Lv/CP/HP/MP/EXPバー行は削除。SP・転生回数・ステータス詳細のみ表示。

### ショップ iconDock（もっとボタン廃止・全ボタン常時表示）
📋ログ → ⚙棚設定 → 👥雇用人 → ⭐常連客 → 🌑裏取引 → 📥一括取下 → 📊市場 → 💰放置収入

### 棚スロット
アイコン左上に `+N` バッジ（強化値）表示（`invCardEnhLv` クラス）。`updateShopTick` にも反映済み。

### ショップログの商品名
等級カラー（RARITY_MASTER[rarity].color）で色付け。未鑑定品は `#cccc00`。

### 冒険タブ フッター
- 潜入前: `⚔ N階層へ潜入` / `🔄 周回`（傭兵雇用はiconDock経由。同行中はバナー表示）
- 探索中: `▶ 進む` / `🎒 アイテム` / `↩ 帰還する`
- 戦闘中: `⚔ 攻撃` / `🛡 防御` / スキルボタン / `🎒 アイテム`

### 冒険タブ ログ表示
- 非探索中: **全ログ**（`makeFilteredLogHtml("all")`）をフッター直上まで伸縮
- 探索中・戦闘中: **冒険ログのみ**をフッター直上まで伸縮
- `#screen` は `display:flex; flex-direction:column` / `eventBox` が `flex:1` で伸縮

---

## 一括系モーダル共通フィルターバー

```
行1: ✅（表示中を全選択） ❌（全解除） | N R E L 全
行2: スロットアイコン
行3: 並替 ⚒↑（強化済み優先） ⚒↓（通常優先）  ← 一括出品・分解のみ
     目標 [1]〜[11] ✕                          ← 一括強化のみ
```
- 初期状態は「全」ボタンのみハイライト
- N/R/E/L・スロットは**表示フィルターのみ**（選択変化なし）

---

## 周回モード（AUTO_RUN）

```javascript
AUTO_RUN_CONFIG = {
  1: { intervalSec: 30, dropMin: 1, dropMax: 2 },
  2: { intervalSec: 45, dropMin: 1, dropMax: 3 },
  3: { intervalSec: 60, dropMin: 2, dropMax: 3 },
  4: { intervalSec: 90, dropMin: 2, dropMax: 4 },
  5: { intervalSec:120, dropMin: 2, dropMax: 4 },
  6: { intervalSec:150, dropMin: 2, dropMax: 5 },
  7: { intervalSec:180, dropMin: 3, dropMax: 5 },
  8: { intervalSec:210, dropMin: 3, dropMax: 6 },
  9: { intervalSec:240, dropMin: 3, dropMax: 6 },
 10: { intervalSec:300, dropMin: 4, dropMax: 6 },
}
```

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

## S44 完了内容（2026-03-23）

### バグ修正
- `generateEnemy()` の return に `poisonRate`/`burnRate` が欠落していた重大バグを修正
  - S43以前から全階層で敵毒付与・熱傷付与が完全に無効だった
  - スプレッド構文で条件付きコピーする形に修正

### バランス調整
- `inferno_drake.burnRate`: 60 → 40
- `rollRarity` bonus上限: `Math.min(40, depth×0.5 + luk×0.3 + rarityBonus)`

### ログカラー移行（完了）
- 薬草師HP回復・祠HP回復ログに `healSpan` 適用（全箇所移行完了）

### INFERNO-SET実装
- 新アイテム3種: `inferno_amulet`(neck) / `inferno_bangle`(bracelet) / `inferno_seal`(seal)
- コレクションテーマ2種追加: `inferno_jewelry`「業炎の装身具」/ `inferno_ward`「業炎の封印」
- コレクション総数: 2,028 → **2,132**
- セット効果「業炎の覇道」(`inferno_set`) — 対象: 全アクセ5種
  - 2部位: STR+6・熱傷ダメ-30%（`burnDmgReduce`）
  - 3部位: 攻撃時15%で熱傷付与（`burnRateBonus` / `en._burned` フラグ）
  - 5部位: 熱傷中の敵への与ダメ+20%（`burnDmgBonus`）
- 敵熱傷スリップダメ処理追加（`en._burned` 時 maxHp×3%/ターン）

### 上位装備拡張の方針（確定）
- 今後の上位ティア追加は業炎（inferno）の構造を軸とする
- アクセテーマは「neck/bracelet/ring」と「cloak/seal」の2テーマ構成をパターンとする

---

## S45〜S46 完了内容（2026-03-23）

### 転生システム改修
- **転生条件**: Lv30 → **Lv50** に変更
- **lootSlots**: 転生でリセット → **引き継ぎ**に変更
- **abyssFloorCleared**（新フィールド）: 真エンドフロア解禁状態を永続管理（転生後も維持）

### worldRank節目演出（_showRebirthMilestoneModal）
- 10/50回: ダンジョンログ1行
- **20回**: 専用モーダル「深淵の境地が開かれた」＋転生スキル新グループ解禁（S47変更）
- 99回: 次転生の予告ログ
- 100回: 専用モーダル＋6階解禁（初回のみ abyssFloorCleared = 6 を設定）
- 200回・以降100回ごと: 記念モーダル（内容影響なし）

### 真エンドフェーズ（F-9）実装
- worldRank100到達の転生で6階自動解禁
- 6〜10階のボス・エネミー・装備・マップを実装（骨格版）
- **ボス5体**: 深淵の番兵(6F) / 深淵の幻影(7F) / 深淵の巨人(8F) / 深淵の主権者(9F) / 深淵の意思(10F)
- **エネミー15種**: 各階3種（void/specter/abyss/colossus/sovereign/will/oblivion系）
- **装備50種**: 各新ティア10部位（void/specter/colossus/sovereign/will）
- **素材**: void_core（6〜10F全般ドロップ）
- **マップ**: 溶岩×3・罠増・休息なし（6〜8F）/ 溶岩多・罠多・祠増（9〜10F）
- 推奨CP: 450 / 650 / 900 / 1200 / 1600
- ボス撃破時に abyssFloorCleared 更新・次階解放
- ng+1条件: 真エンドフェーズ中は10階クリアでng+1

### 既存8ティア アクセ補完
- 各ティア（鉄/鋼/竜/革/影/疾風/魔術師/星）にneck/bracelet/ring追加（計24種）

### コレクション体系全面整理
- COLLECTION_THEMEに `acc` パートを追加（既存8ティア）
- 新5ティア（void_tier/specter_tier/colossus_tier/sovereign_tier/will_tier）追加（weapon/armor/acc）
- 新アクセテーマ5種（void_jewelry〜will_jewelry）追加
- 部位横断テーマに `all_neck` / `all_bracelet` / `all_ring` 追加（計10テーマ）
- コレクション合計: **36テーマ**
- コレクションシステム内部（makeColId/checkCollection/retroCheckAchievements/クエスト/UI）をaccパート対応に更新
- COLLECTION_REWARDSに全新テーマ報酬を追加
- **真エンドテーマ非表示制御**: `ABYSS_THEMES`（10テーマ）を定義し、`abyssFloorCleared < 6` の間は冒険録モーダルおよびプレイヤーパネルの進捗カウンターから除外

### 実績追加
- 観測外の踏破者（6階クリア）/ 深淵の意思を超えた者（10階クリア）
- 転生節目実績: worldRank 10/20/50/100/200回

---

## 未実装・将来課題

| # | 内容 | ステータス |
|---|---|---|
| SET効果 | void/specter/colossus/sovereign/will_set | ✅ S47で実装済み |
| 転生スキル拡張 | worldRank20報酬の新スキル枠（深淵の境地5種） | ✅ S47で実装済み |
| AI深化 | 6〜10Fエネミー固有スキルの詳細化 | ✅ S47で実装済み |
| カラー変数化 | #555/#666/#1a1a2e/#0d0d18 等のdisabled/状態表現色 | 🔶 保留（誤置換リスクあり） |
| 6〜10F SET効果深化 | void_set 8部位ブロック等の演出追加 | 🔶 任意 |

---

## S48 完了内容（2026-03-28）

### 体験品質・継続率改善（6機能）

#### S48-GUIDE：初回起動ファーストガイド

- 新規プレイヤーにのみ表示する3ステップモーダル（潜る・鑑定して売る・稼いで強くなる）
- `gs.meta.isFirstPlay: true` フラグで初回判定。「はじめる！」またはスキップで `false` に更新
- `loadGame()` マイグレーションに `isFirstPlay` 補完を追加（既存セーブは `false` に設定）
- `init()` の `render()` 直後に `if(gs.meta.isFirstPlay) showFirstGuideModal()` で呼び出し

#### S48-HINT：帰還後「次の一手」ヒントUI

- 帰還成功後のリザルト「閉じる」ボタン押下時に、冒険タブ最上部へ1件だけヒントをインジェクト
- 優先順位：①未鑑定品あり→格納庫 ②空き棚+在庫あり→ショップ ③CP不足+強化可能→格納庫 ④傭兵代不足→ショップ ⑤デフォルト→次の潜入
- `calcNextAction()` + `makeNextActionHintEl()` の2関数。8秒でフェードアウト
- タップで対応タブへ遷移（`switchTab` 経由）
- **注意**：①の遷移先は `"inventory"`（`"loot"` は帰還後にガードされるため）

#### S48-ANALYTICS：プレイヤー行動計測モジュール

- `localStorage["shinentrade_analytics"]` に独立保存（ゲームセーブとは分離）
- `const Analytics = (() => { ... })()` のIIFEモジュール構成
- 計測イベント：`init(isFirst)` / `guideCompleted()` / `guideSkipped(page)` / `firstEnter()` / `firstReturn()` / `firstSale()` / `tick()`
- フック挿入箇所：`init()` 両分岐 / `showFirstGuideModal._closeGuide系` / `enterDungeon末尾` / `leaveDungeon keepLoot確定後` / `checkShopSales totalSales++直後` / `saveGame末尾`
- 全関数を `try-catch` で保護。計測が死んでもゲームは動く

**週次レポートコマンド（コンソール実行）：**
```javascript
const d = JSON.parse(localStorage.getItem("shinentrade_analytics")||"{}");
const f = (d.sessions||[]).filter(s => s.isFirstSession);
console.table({
  total: f.length,
  guideCompleted: f.filter(s => s.guide?.completedAt).length,
  entered: f.filter(s => s.firstLoop?.enterAt).length,
  returned: f.filter(s => s.firstLoop?.returnAt).length,
  loopCompleted: f.filter(s => s.firstLoop?.completed).length,
  avgMinutes: (f.reduce((a,b)=>a+(b.durationSec||0),0)/f.length/60).toFixed(1),
});
```

#### S48-SAVEDATA：セーブデータ エクスポート/インポート

- ステータスタブ iconDock に「💾 データ」ボタンを追加（`openSaveDataModal()`）
- エクスポート：`localStorage["shinentrade_v1"]` を textarea で表示。クリップボードコピー対応（`navigator.clipboard` → `execCommand` フォールバック）
- インポート：貼り付け→JSON検証（`player`・`meta` 存在チェック）→確認モーダル（背景クリックで閉じる）→`localStorage.setItem`→`location.reload()`
- ダンジョン探索中はインポートボタンを無効化（`gs.dungeon.active` チェック）
- メッセージ表示は `_showMsg(msg, isOk)` による差分更新（DOM全リセットなし）
- XSS対策：`exportData` の表示は `textarea.textContent` で設定（innerHTML 展開なし）

#### S48-SALE：売却快感システム

- `notifySale(item, finalPrice)` をメイン統合関数として追加
- 適用箇所：`checkShopSales`（通常販売）/ `checkRegularVisits`（常連来訪・注文）/ `checkBlackmarket`（裏取引）
- 演出内容：
  - normal：`_showGoldPopFixed` で位置固定goldPop（topBar直下右・18px）
  - rare：青バナースライドイン（2秒）
  - epic：紫バナー（3秒）
  - legendary：橙バナー（4秒）＋`_showLegendaryFlash` 全画面フラッシュ＋スマホ振動
  - 全tier：`_flashGoldDisplay` でtopBarゴールド数値が発光＋1000G以上でカウントアップ
- タブバッジ：ショップタブ以外で rare 以上が売れると `tab-sale-badge` が点滅。ショップタブ切替で消去
- `renderTopBar` の goldDisplay に `id="goldValue"` を追加（カウントアップ用）
- ボス演出中（`.boss-intro-overlay`）・LvUP中（`.lvup-overlay`）はバナーを表示しない
- `_bannerTimer` でバナー重複防止（新規バナー表示時に既存を即削除）

#### S48-ACH：実績解除トースト通知

- `claimAchievement(id)` から `showAchievementToast(id)` を呼び出し
- 画面下部からスライドアップ（`bottom: -120px → 142px`）
- キュー管理：`_achToastQueue` / `_achToastActive` フラグで複数同時解除を順次表示
- 上限：処理中含む総数が3件を超えたら追加しない（`totalInFlight` で判定）
- 表示時間：4500ms → 自動フェードアウト
- タップ時：既存モーダルを全クリアしてから `openAchievementModal()` を開く
- `retroCheckAchievements` は `claimed.push(id)` 直接呼び出しのため、起動時の遡及付与でトーストは出ない（正しい動作）

### バグ修正（S48）

| # | 内容 |
|---|---|
| S48-B1 | `calcNextAction` の「未鑑定品」遷移先が `"loot"` → 帰還後ガードされるため `"inventory"` に修正 |
| S48-B2 | `makeNextActionHintEl` の `hint.action()` 後に不要な `render()` を重複呼び出し → 削除 |
| S48-B3 | `openSaveDataModal` の `_render()` が mc.innerHTML を全上書きしてインポートエリアの入力が消える → `_showMsg()` による差分更新に変更 |
| S48-B4 | `openSaveDataModal` の `exportData` を innerHTML に直接展開していた（XSS）→ `textContent` で設定に変更 |
| S48-B5 | `confirmOverlay` に背景クリック閉じる処理がなかった → `onclick` 追加 |
| S48-B6 | `_showSaleBanner` がボス演出・LvUP演出中も表示されていた → ガード追加 |
| S48-B7 | 常連購入・裏取引に `notifySale` が適用されていなかった → 3箇所に追加 |
| S48-B8 | `showAchievementToast` のトーストが actionBar+iconDock の裏に隠れていた → `bottom: 90px → 142px` |
| S48-B9 | トーストタップ時に既存モーダルが残ったまま実績モーダルが重なっていた → タップ前に全クリア |
| S48-B10 | トーストのキュー上限が処理中を含まない判定だった → `totalInFlight` で修正 |

---

## S47 完了内容（2026-03-24）

### SET効果実装（5セット）

| セット名 | ティア | 特徴 |
|---|---|---|
| 虚空の侵食 (void_set) | void | 被ダメ軽減・ブロック・HP回復増加 |
| 亡霊の幻舞 (specter_set) | specter | 回避・クリティカル特化。ボス戦は攻撃時10%で確定クリティカル |
| 崩壊の鉄壁 (colossus_set) | colossus | DEF強化・被ダメ軽減・反撃 |
| 主権者の覇気 (sovereign_set) | sovereign | クリティカル・2連撃 |
| 意思の具現 (will_set) | will | 全ステ・ボス特効・ボス撃破ゴールドボーナス |

新フラグ：`_specterCounterReady` / `setVoidBlockPct` / `setColossusCounterPct` / `setSovereignDoubleStrike` / `setWillBossDmgBonus` / `setWillBossGoldBonus` / `setVoidHealBonus`

### 6〜10Fエネミー固有スキル（specialSkill）

- 14種全エネミーに `specialSkill` フィールドを追加
- `type` 種別：`poison_burst` / `hp_pct_dmg` / `heal_block` / `evade_seal` / `pierce_strike` / `def_debuff` / `heavy_strike` / `atk_debuff` / `ancient_curse`
- HP50%以下で発動率が20%→40%に上昇（激昂演出付き）
- デバフは `c._defDebuffFlat` / `c._healBlockedTurns` / `c._evadeSealedTurns` / `c._atkDebuffMul` / `c._atkDebuffTurns` に保持（回避時も消費）

### ボス新スキルタイプ

- `healBlock`（回復封印・7Fボス）
- `defDebuffPct`（DEF割合デバフ・8Fボス）
- `fearDebuff`（与ダメ低下・9Fボス）
- 10Fボス「深淵の意思」に `skill_will_rend`（複合デバフ）・終幕の3ヒット化を追加

### 転生スキル新枠「深淵の境地」（worldRank20解禁）

| スキル | 効果 | 適用箇所 |
|---|---|---|
| rb_crit 深淵の眼光 | クリ率 +3% | `doBattle`・ステータス |
| rb_autorun 深淵の歩み | 周回インターバル -10% | `_calcAutoRunInterval` |
| rb_demand 商人の洞察 | 需要変動幅 -20% | `fluctuateDemand` |
| rb_rarity 深淵の引き | rare確率 +10%・normal -10% | `rollRarity` |
| rb_mastery 深淵の極意 | 全ステ +2%・売値 +3% | `calcStats`・`itemPrice` |

`learnRebirthSkill` に `unlockRank` ガード追加済み。

### バグ修正

| # | 内容 |
|---|---|
| B-1 | デバフ消費が `isEvade=true` 時に走らない → else外に移動 |
| B-2 | void_setブロック時ボスのrage未加算 → rage×0.02追加 |
| B-3 | `openRebirthModal` 重複テキスト削除 |
| B-4 | B-1修正副作用で `const ev` 消失 → 復元 |
| A | `boss.defDebuff` が `_bDef`/`_baseDef` に未反映 → 両方に組み込み |
| B | `learnRebirthSkill` が `unlockRank` を無視 → ガード追加 |
| C | `leaveDungeon` でタイマーリーク → 冒頭で `stopAutoRun()` 追加 |

### デザイン統一

- D-1: モーダル高さを全28箇所で `max-height:85vh` に統一
- D-2〜D-4: カラー変数化
  - `#ffcc44` → `var(--gold)`（39件）
  - `#a78bfa` → `var(--accent2)`（24件）
  - `color:#aaa` / `color:#888` → `var(--muted)`（39件）
- D-4: 呪いカラー変数新設（`--curse` / `--curse-border` / `--curse-bg`）

### 保留事項（次セッション以降）

- `#555` / `#666`（disabled状態表現）、`#1a1a2e` / `#0d0d18`（背景直書き）の変数化は誤置換リスクがあるため保留
