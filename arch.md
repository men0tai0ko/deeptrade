# 深淵商会 — 技術アーキテクチャ仕様書

**バージョン**: S48
**最終更新**: 2026-03-28

---

## 1. 技術スタック

| 項目 | 内容 |
|---|---|
| 言語 | HTML / CSS / Vanilla JavaScript |
| フレームワーク | なし（単一ファイル構成） |
| データ永続化 | localStorage（`shinentrade_v1`: ゲーム本体 / `shinentrade_logs`: ログ永続化） |
| フォント | Google Fonts（Cinzel） |
| ファイル規模 | 約14,596行 / 約710KB |

---

## 2. ファイル構成

単一ファイル `index.html` にすべてを収録。

```
index.html
├── <style>        CSS（変数・コンポーネント・アニメーション）
├── <body>         HTML骨格（app, topBar, tabBar, screen, iconDock, actionBar）
└── <script>
    ├── マスターデータ定数
    ├── gameState (gs)
    ├── loadGame / saveGame
    ├── calcStats / recalcHpMp
    ├── ダンジョン処理
    ├── 戦闘処理
    ├── ショップ処理
    ├── UI描画関数 (render*)
    └── モーダル関数 (open*)
```

---

## 3. HTML骨格

```html
<div id="app">
  <div id="topBar"></div>    <!-- Lv/CP + HP/MP/EXPバー -->
  <div id="tabBar"></div>    <!-- 冒険/ショップ/格納庫/ステータス -->
  <div id="screen"></div>    <!-- メインコンテンツ（タブ切替） -->
  <div id="iconDock"></div>  <!-- タブ別アクションアイコン -->
  <div id="actionBar"></div> <!-- 下部固定ボタン -->
</div>
```

モーダルは `document.body.appendChild` で都度生成・削除。

---

## 4. CSS設計

### 4-1. CSS変数（テーマカラー）

```css
:root {
  --bg:       #0a0a14   /* 背景 */
  --surface:  #0d0d1a   /* サーフェス */
  --card:     #12121f   /* カード */
  --border:   #1e1e2e   /* ボーダー */
  --text:     #e0e0f0   /* テキスト */
  --muted:    #6666aa   /* ミュート */
  --accent:   #4a90d9   /* アクセント（青） */
  --accent2:  #a78bfa   /* アクセント2（紫） */
  --gold:     #e6ac2e   /* ゴールド */
  --green:    #27ae60   /* 緑 */
  --red:      #e74c3c   /* 赤 */
}
```

### 4-2. レアリティクラス

```css
.rarity-unidentified { background:#1e1e1e; border:1px solid #3a3a3a }
.rarity-normal       { background:#1e2a1e; border:1px solid #3a4a3a }
.rarity-rare         { background:#1e1e2e; border:1px solid #2a3a6a }
.rarity-epic         { background:#1e1a2e; border:1px solid #4a2a6a }
.rarity-legendary    { background:#2a1e0e; border:1px solid #6a4a1a }
```

### 4-3. list-scroll-mode / screen flex化

格納庫・ショップタブで使用するsticky+スクロール構成。

```css
/* 常時flex columnで冒険タブのログをフッターまで伸縮 */
#screen                            { display:flex; flex-direction:column }
#screen .eventBox[style*="flex:1"] { flex:1; height:auto; overflow-y:auto }
#screen.list-scroll-mode           { padding:0; display:flex; flex-direction:column }
#screen.list-scroll-mode .list-header { flex-shrink:0; position:sticky; top:0 }
#screen.list-scroll-mode .list-body   { flex:1; overflow-y:auto }
```

### 4-4. アニメーション

| クラス | 用途 |
|---|---|
| `diceRoll` | サイコロ回転演出（罠・休息） |
| `diceSettle` | サイコロ停止演出 |
| `trapReveal` | 結果フェードイン |
| `bossPulse` | ボス登場 |
| `phaseFlash` | フェーズ変化フラッシュ |
| `shakeAnim` | ダメージシェイク |
| `floatUp` | ゴールドポップアップ |

---

## 5. gameState (gs) の管理

### 5-1. 初期化

`DEFAULT_STATE()` 関数で初期値を生成。`Object.assign(gs, DEFAULT_STATE())` で上書き。

### 5-2. セーブ・ロード

```javascript
saveGame()   // JSON.stringify → localStorage.setItem（ゲーム本体+ログを別キーで保存）
loadGame()   // localStorage.getItem → JSON.parse → マイグレーション → retroCheckAchievements()
```

### 5-3. マイグレーション

`loadGame` 内で旧セーブデータに存在しないフィールドを追記。

```javascript
if(gs.equipped.sub === undefined) gs.equipped.sub = null;
if(_achStats.totalBrew === undefined) _achStats.totalBrew = 0;
// ...
```

---

## 6. 描画アーキテクチャ

### 6-1. render() メインループ

```javascript
function render() {
  renderTopBar();
  switch(currentTab) {
    case "dungeon":   renderDungeon(sc, ab); break;
    case "shop":      renderShop(sc, ab);    break;
    case "inventory": renderInventory(sc, ab); break;
    case "status":    renderStatus(sc, ab);  break;
  }
  updateIconDock(currentTab);
}
```

### 6-2. ショップ差分更新

毎秒ティックで `updateShopTick()` を実行。  
棚スロットのみ差分更新し、innerHTML全書き換えを避けてスクロール位置を維持。

```javascript
function updateShopTick() {
  const grid = sc.querySelector(".shelfGrid");
  if(!grid) { renderScreen(); return; }
  // 棚スロットを個別更新
  const slots = grid.querySelectorAll(".shelfSlot");
  sh.shelves.forEach((slot, idx) => { /* 差分更新 */ });
}
```

### 6-3. モーダル管理

モーダルはすべて `document.createElement` で生成し `document.body.appendChild`。  
`.modal-overlay` クリックで `overlay.remove()` により閉じる。  
入れ子モーダル（backFn）は `overlay.remove()` + 親モーダルを再開する関数を渡す。

---

## 7. 主要マスターデータ

### 7-1. ITEM_MASTER

全アイテム定義。`{ name, icon, type, basePrice, stats, desc? }`

### 7-2. ENEMY_MASTER / BOSS_MASTER

敵・ボスのステータスとドロップテーブル。  
ボスはフェーズ・スキルパターン・フレーバーテキストを含む。

### 7-3. SKILL_MASTER

スキルツリーノード定義。`{ name, icon, category, cost, requires, desc, effect }`

### 7-4. REBIRTH_SKILL_MASTER

転生スキル定義。`type: "passive_stat" | "passive_pct" | "gameplay"`

### 7-5. STAFF_MASTER

スタッフ定義。`{ base, gain, cap }` でLvUPによる成長を管理。

### 7-6. ACHIEVEMENT_MASTER

`_makeRankedAch()` でランク制実績を動的生成（Rank50まで）。  
`check: () =>` はアロー関数で `gs` を参照。

---

## 8. 戦闘システム

### 8-1. 通常戦闘フロー

```
startCombat() → combatオブジェクト生成
  ↓
doBattle(action) → プレイヤー行動 → 敵行動 → 結果判定
  ↓
敵HP=0 → dropItems() → loot追加
プレイヤーHP=0 → leaveDungeon(false)
```

### 8-2. ボス戦フロー

```
startBossCombat() → showBossIntro() → 戦闘開始
  ↓
doBossBattle(action) → フェーズ判定 → スキルパターン実行
  ↓
ボスHP=0 → dropBossItems() → showBossResult() → showDungeonResult()
プレイヤーHP=0 → leaveDungeon(false)
```

### 8-3. 傭兵の介入

`onCombatStart` / `onPlayerAttack` / `onEnemyAttack` のコールバックで処理。

---

## 9. ダンジョン進行

```javascript
advanceDungeon()
  → d.progress++
  → HP満タン && ev==="rest" → ev="windfall"（差し替え）
  → handleEvent(ev, depth)
    → case "trap": handleTrap(depth)
      → _showTrapDiceModal() → setTimeout(1500) → _applyTrapResult()
    → case "rest": handleRest()
      → _showRestDiceModal() → setTimeout(1500) → _applyRestResult()
    → case "battle": startCombat()
    → ...
```

---

## 10. 実績システム

### 10-1. チェック・付与フロー

```javascript
// ゲームイベント発生時にカウンタ更新
if(gs.achievements?.stats) gs.achievements.stats.totalBrew += times;

// ロード時に一括チェック
retroCheckAchievements();

// モーダル表示時に都度チェック
hasUnclaimedAchievement();

// 受取時
claimAchievement(id) → reward付与 → claimed.push(id)
```

### 10-2. ランク制実績の表示ロジック

モーダルでは各rankBaseの「次に達成するランク1件のみ」を表示。  
受取済み最大ランク+1のエントリを `ACHIEVEMENT_MASTER.find()` で取得。

---

## 11. タイマー・tick処理

```javascript
// メインタイマー（1秒ごと）
setInterval(() => {
  if(!gs) return;
  updateShopTick();      // 棚の販売判定・差分更新
  updatePassiveIncome(); // 放置収入
  checkAchievements();   // 実績チェック
  // ...
}, 1000);
```

---

## 12. グローバル変数（window）

モーダル内のonclick属性から参照するため一部をwindowに格納。

| 変数 | 用途 |
|---|---|
| `window._achCat` | 実績フィルタータブ状態 |
| `window._achRefresh` | 実績モーダル再描画 |
| `window._achClaimAll` | 一括受取 |
| `window._staffTab` | 雇用人フィルタータブ状態 |
| `window._brewQty` | 調合数量操作 |
| `window._execBrew` | 調合実行 |
| `window._synthQty` | 素材合成数量操作 |
| `window._execSynth` | 素材合成実行 |
| `window._brewRefresh` | 調合モーダル再描画 |
| `window._synthRefresh` | 素材合成モーダル再描画 |
| `window._colExpanded` | 収集モーダルのテーマ展開状態 |
| `window._colCardExpanded` | 収集モーダルのカード展開状態 |
| `window._colToggle` | 収集テーマ展開トグル |
| `window._colCardToggle` | 収集カード展開トグル |
| `window._openTabLog` | tabBarログボタンのハンドラ |

---

## 13. ユーティリティ関数

```javascript
uuid()              // UID生成（uid_timestamp_random）
goldSpan(text)      // 金色テキストspan
dmgSpan(text)       // 赤色ダメージspan
healSpan(text)      // 緑色回復span
hitSpan(text)       // 青緑色ヒットspan
statusSpan(text)    // 紫色状態span
rarityItemSpan()    // レアリティ色アイテム名span
enemySpan(text)     // 敵名span
cpSpan(val)         // CP表示span
goldBadge()         // Gold残高バッジ
itemPrice(item)     // アイテム売値計算
itemDisplayName()   // アイテム表示名（未鑑定考慮）
calcStats(gs)       // 全ステータス計算（装備・スキルボーナス含む）
calcItemCP()        // アイテムCP計算
calcCharCP()        // キャラクターCP計算
```

---

## 14. デッドコード整理履歴

S31時点でデッドコードはすべて除去済み。

### 過去に存在したデッドコード（除去済み）
- `_omamoriActive`: S30でセット処理削除と同時に除去
- `deathWardPct`: S30でcalcStatsから除去

### 誤記訂正（S31確認）
- `death_ward` スキル: 「鉄の意志」として `dmgReducePct:5` 効果が calcStats 内で有効に機能している（デッドコードではない）
- `rb_deathsave1〜3` スキル: 「深淵の器 I〜III」転生スキルとして `extraLoot` / `noPenaltyOnRetreat` / `goldSaveOnDeath` 効果が有効に機能している（デッドコードではない）

---

## 15. パフォーマンス考慮事項

- ショップ画面のみ差分更新（毎秒のスクロールリセットを防止）
- Canvasパーティクル上限300個
- ALL_LOGS上限100件（古いログを自動削除）
- ログはshinentrade_logsキーで永続化（saveGame/init時に保存・復元）
- モーダルは開くたびに生成・閉じたら即削除（メモリリーク防止）

---

## 16. S45〜S46 追加アーキテクチャ

### 16-1. abyssFloorCleared（新フィールド）

```javascript
gs.player.abyssFloorCleared: number  // 0=未解禁, 6〜10=解禁済み最大階層
```

- `worldRank >= 100` 時に `doRebirth()` 内で `= 6` に設定（6階解禁）
- 各真エンドボス撃破時に `Math.max(current, clearedFloor)` で更新
- 転生後も引き継ぎ（`doRebirth` の `keepAbyssFloor`）

### 16-2. コレクションテーマの acc パート拡張

既存の `weapon` / `armor` に加えて `acc`（装身具）パートを追加。

```javascript
// テーマ定義例
iron: {
  weapon: ['iron_sword','iron_shield'],
  armor:  ['iron_helm','iron_armor',...],
  acc:    ['iron_amulet','iron_bangle','iron_ring_acc'],  // 新追加
}
```

- `acc` パートなしのテーマ（inferno等）は `hasAcc:true` で透過スキップ
- `makeColId`: `part === 'acc'` → キー `'acc'` を付与
- `parts` 配列: `isAcc/isSlot` 以外は `["weapon","armor","acc","all"]`
- コレクション報酬キー形式: `iron_acc_n` / `iron_acc_r` 等

### 16-3. 真エンドフェーズの最終ボス判定

```javascript
const isAbyssFloor = !!(BOSS_MASTER[en.id]?.abyssFloor);
const currentMaxFloor = (gs.player.abyssFloorCleared >= 6) ? maxBossFloor : 5;
if(clearedFloor >= currentMaxFloor) { gs.dungeon.ng += 1; ... }
```

通常フェーズ（5階まで）と真エンドフェーズ（10階まで）で `ng+1` の条件を分岐。

### 16-4. _showRebirthMilestoneModal（新関数）

転生節目演出用のモーダル生成関数。`doRebirth()` 末尾から呼ばれる。

```javascript
_showRebirthMilestoneModal({ icon, title, color, lines, badge })
```

worldRank 10/20/50/99/100/200/N×100 の各タイミングで実行。

### 16-5. 冒険録（コレクション）真エンドテーマ非表示制御

`openCollectionModal()` 内のテーマ描画ループ先頭で、`abyssFloorCleared < 6` の場合に真エンドテーマをスキップする。

```javascript
const ABYSS_THEMES = new Set([
  "void_tier","specter_tier","colossus_tier","sovereign_tier","will_tier",
  "void_jewelry","specter_jewelry","colossus_jewelry","sovereign_jewelry","will_jewelry",
]);
const abyssUnlocked = (gs.player.abyssFloorCleared || 0) >= 6;

for(const [themeId, theme] of Object.entries(COLLECTION_THEME)) {
  if(ABYSS_THEMES.has(themeId) && !abyssUnlocked) continue;
  // ... 通常の描画処理
}
```

同様に `renderHeader()` の `total` 集計・メイン画面の冒険録カウンターも同条件でフィルタ済み。解禁後は自動的に表示される（再起動不要）。

---

## 17. S47 システム構造マップ・追加アーキテクチャ

**バージョン**: S47  
**最終更新**: 2026-03-24

---

### 17-1. ゲームシステム全体構造

コアループ:
```
潜入 → 探索(マス進行) → 戦闘/イベント → 帰還 → 格納庫 → 陳列 → 売却
  ↑___________ Gold・装備・EXP _____________________________________|
```

| システム | 主要関数 | 備考 |
|---|---|---|
| ダンジョン進行 | `handleEvent` / `generateMap` / `advanceDungeon` | マスイベント8種 + lava/shortcut |
| 通常戦闘 | `doBattle` | specialSkill(6〜10F)・デバフ5種 |
| ボス戦 | `doBossAttack` | フェーズ制・rage演出専用 |
| 周回モード | `_autoRunTick` / `startAutoRun` | CP比でインターバル短縮 |
| ショップ販売 | `checkShopSales` / `updateShopTick` | 毎秒差分更新 |
| 需要変動 | `fluctuateDemand` | 30秒ごと / rb_demandで安定化 |
| 転生 | `doRebirth` / `calcRebirthPoints` | Lv50必須・14スキル |
| コレクション | `registerCollection` / `calcCollectionBonus` | 36テーマ・2132+エントリ |
| 実績 | `_makeRankedAch` / `retroCheckAchievements` | ランク制(最大50) |

---

### 17-2. 戦闘ダメージ計算の乗算順序

```
プレイヤー→敵:
  base = str×2×variance×bossGuardMul×warCryMul×atkDebuffMul - effectiveDef×0.7
  → 処刑人/血の昂り補正 → setBurnDmgBonus → setWillBossDmgBonus → critMul
  → (sovereign二連撃) → (skill二連撃) → (setOnHitPct追加ダメ)

effectiveDef = max(0, en.def - c._defDebuffFlat)  ← 盾砕き・呪縛等

ボス→プレイヤー（通常攻撃）:
  _bDef = max(1, r.total.def - boss.defDebuff)     ← skill_howl等
  dmg = _bStr² × 5 / (_bDef + _bStr×5)
  → setDmgReducePct → voidBlockPct判定 → HP反映
```

---

### 17-3. デバフシステム（S47追加）

`gs.dungeon.combat` オブジェクトに以下フラグを保持。戦闘ごとに新規生成されるため前戦闘への引き継ぎはない。

| フラグ | 意味 | 消費タイミング |
|---|---|---|
| `_defDebuffFlat` | プレイヤーDEF固定値ダウン | `_defDebuffTurns` カウントダウン |
| `_defDebuffTurns` | DEFデバフ残ターン数 | 敵行動後（回避時も消費） |
| `_healBlockedTurns` | 回復封印残ターン数 | 敵行動後（回避時も消費） |
| `_evadeSealedTurns` | 回避封印残ターン数 | 敵行動後（回避時も消費） |
| `_atkDebuffMul` | 与ダメ乗算デバフ | `_atkDebuffTurns` カウントダウン |
| `_atkDebuffTurns` | 攻撃力低下残ターン数 | 敵行動後（回避時も消費） |

`boss.defDebuff`: ボス固有フィールド。`skill_howl` 等の `defDown` スキルで加算され `_bDef` 計算に反映（永続・累積・リセットなし）。

**重要**: デバフ消費は `isEvade=true` 時も実行される（else外に配置）。`tryAutoHeal` も `_healBlockedTurns > 0` の場合は発動しない。

---

### 17-4. 転生スキルシステム（S47追加）

永続スキル14種・4グループ:

| グループ | スキル数 | 解禁条件 |
|---|---|---|
| 経営強化 | 4 (`rb_gold` / `rb_shelf` / `rb_fullheal` / `rb_sp`) | 即時 |
| 戦闘強化 | 4 (`rb_atk` / `rb_def` / `rb_hp` / `rb_loot`) | 即時 |
| 守護の加護 | 3 (`rb_deathsave1〜3`) | 即時 |
| 深淵の境地 | 5 (`rb_crit` / `rb_autorun` / `rb_demand` / `rb_rarity` / `rb_mastery`) | worldRank20 |

**解禁制御**: `learnRebirthSkill` の冒頭で `sk.unlockRank && worldRank < sk.unlockRank` のガードあり。UIは `worldRank < 20` で非表示。

**calcStats適用順序**:
```
通常スキル補正 → 永続スキルstat%補正(rb_mastery「all」含む) → セット効果allStatPct
→ お守りallStatPct → 冒険録ボーナス
```

`rb_mastery` の `sellPct:3` は `itemPrice` の `rbSellPct` 集計に自動包含（calcStats返却値には含まない）。

---

### 17-5. S47バグ修正履歴

| # | 内容 | 修正箇所 |
|---|---|---|
| B-1 | `isEvade=true` 時デバフターン消費が走らない → `else` 外に移動 | `doBattle` |
| B-2 | void_setブロック成功時ボスのrage未加算 → `boss.rage += dmg×0.02` 追加 | `doBossAttack` |
| B-3 | `openRebirthModal` に「すべてを手放し」が2行重複 → 1行削除 | `openRebirthModal` |
| B-4 | B-1修正副作用で `else` 内の `const ev` 宣言消失 → 復元 | `doBattle` |
| A | `boss.defDebuff` がダメージ計算に未反映（`skill_howl` 等が効果ゼロ） → `_bDef` / `_baseDef` に組み込み | `doBossAttack` |
| B | `learnRebirthSkill` が `unlockRank` を無視 → ガード追加 | `learnRebirthSkill` |
| C | `leaveDungeon` で `_autoRunTimer` が残存 → 冒頭で `stopAutoRun()` 追加 | `leaveDungeon` |

---

### 17-6. specter_set 8部位のボス戦対応（S47）

通常戦は「回避成功後→次攻撃が確定クリティカル」（`_specterCounterReady` フラグ）。
ボス戦は回避判定がないため、**攻撃ごとに独立した10%確率で確定クリティカル**（`_specterBossProc`）を追加。
両フラグが同時成立した場合は1回のクリティカルにまとめ二重適用を防止。

```javascript
const _specterCounterReady = r.setSpecterCounterCrit && c._specterCounterReady;
const _specterBossProc     = r.setSpecterCounterCrit && en.isBoss && Math.random()*100 < 10;
const _specterForceCrit    = _specterCounterReady || _specterBossProc;
```

---

## 18. S48 追加システム

### 18-1. 計測モジュール（Analytics）

```javascript
const Analytics = (() => {
  const KEY = "shinentrade_analytics"; // gsとは別キー
  let _sid = null; // セッションID（重複init防止）
  // 公開API: init / guideCompleted / guideSkipped /
  //          firstEnter / firstReturn / firstSale / tick
  return { init, guideCompleted, guideSkipped, firstEnter, firstReturn, firstSale, tick };
})();
```

セッションスキーマ：
```json
{
  "sessionId": "abc123_18fa2b",
  "startAt": 1711555200000,
  "isFirstSession": true,
  "guide": { "shown": true, "completedAt": null, "skippedAtPage": null },
  "firstLoop": { "enterAt": null, "returnAt": null, "firstSaleAt": null, "completed": false },
  "endAt": null,
  "durationSec": null
}
```

### 18-2. 売却快感システム（notifySale）

呼び出し元（3箇所）：
- `checkShopSales`：通常棚販売
- `checkRegularVisits`：常連来訪購入・注文購入（2箇所）
- `checkBlackmarket`：裏取引成立

演出判定ロジック：
```javascript
const rarity = item.identified ? item.rarity : "normal"; // 未鑑定はnormal扱い
// ボス演出・LvUP演出中はバナーを抑制
if(document.querySelector(".boss-intro-overlay, .lvup-overlay")) return;
```

topBar goldDisplay に `id="goldValue"` を付与。カウントアップは `requestAnimationFrame` + `el.isConnected` チェックで render() 競合を回避。

### 18-3. 実績トーストキュー

```
_achToastQueue: string[]    // 待機中のachievement ID
_achToastActive: boolean    // 処理中フラグ

上限判定: (_achToastActive ? 1 : 0) + _achToastQueue.length >= 3
位置: bottom:142px（actionBar:72px + iconDock:58px + 余白:12px）
表示時間: 4500ms → フェードアウト(300ms)
```

### 18-4. セーブデータ管理

- アクセス：ステータスタブ iconDock「💾 データ」
- エクスポート：`textarea.textContent = exportData`（XSS防止）
- インポート：JSON.parse → `player` / `meta` 存在チェック → 確認モーダル → `location.reload()`
- ダンジョン中：インポートボタンを `disabled` + 警告テキスト表示

### 18-5. S48バグ修正履歴

| # | 内容 | 修正箇所 |
|---|---|---|
| B1 | `calcNextAction` 遷移先 `"loot"` → `"inventory"` | `calcNextAction` |
| B2 | `hint.action()` 後の重複 `render()` 削除 | `makeNextActionHintEl` |
| B3 | mc.innerHTML 全リセット → `_showMsg` 差分更新 | `openSaveDataModal` |
| B4 | `exportData` の innerHTML 展開（XSS）→ `textContent` | `openSaveDataModal` |
| B5 | `confirmOverlay` 背景クリック閉じる処理追加 | `openSaveDataModal` |
| B6 | バナーがボス演出・LvUP演出中も表示 → ガード追加 | `_showSaleBanner` |
| B7 | 常連購入・裏取引に `notifySale` 未適用 | `checkRegularVisits`, `checkBlackmarket` |
| B8 | トースト `bottom:90px` → actionBar 裏に隠れる → `142px` | `.ach-toast` CSS |
| B9 | トーストタップ時モーダル二重表示 → タップ前に全クリア | `_showOneAchToast` |
| B10 | キュー上限が処理中を含まない → `totalInFlight` で修正 | `showAchievementToast` |
