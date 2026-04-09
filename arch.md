# 深淵商会 — 技術アーキテクチャ仕様書

**バージョン**: S118
**最終更新**: 2026-04-08（S118）

---

## 1. 技術スタック

| 項目 | 内容 |
|---|---|
| 言語 | HTML / CSS / Vanilla JavaScript |
| フレームワーク | なし（単一ファイル構成） |
| データ永続化 | localStorage（`shinentrade_v1`: ゲーム本体 / `shinentrade_logs`: ログ永続化 / `shinentrade_analytics`: 行動計測）|
| フォント | Google Fonts（Cinzel） |
| ファイル規模 | 約15,842行 / 約780KB |

---

## 2. ファイル構成

`index.html` にゲーム本体、`manifest.json` / `sw.js` をリポジトリルートに配置。

```
index.html
manifest.json  ← PWA定義（A2-PWA）
sw.js          ← ServiceWorker Cache First（A2-PWA）
ogp.png        ← OGP画像 1280×640px（A1-OGP）
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

---

## S49 アーキテクチャ追加事項

### ホスティング
- **GitHub Pages**: https://men0tai0ko.github.io/deeptrade/
- デプロイ: index.html 単一ファイルをリポジトリにコミット → 自動公開

### z-index体系（S49確定）

| 要素 | z-index | 備考 |
|---|---|---|
| .modal-overlay | 100 | 通常モーダル（動的DOM追加で最前面にスタック） |
| .lvup-overlay | 1000 | LvUp演出 |
| .legendary-flash-overlay | 7999 | pointer-events:none |
| .sale-banner | 8000 | top固定・pointer-events:none |
| .ach-toast | 8200 | bottom:140px固定（S49-ACH） |
| .daily-toast | 8210 | bottom:200px固定・デイリー達成通知（S52） |
| _showLegendaryShareModal overlay | 8500 | center配置（S49-SHARE） |
| affixPoolModal | 9999 | 錬成モーダル内ポップアップ |

### SNS共有モジュール（S49-SHARE）

```javascript
buildShareText(type, payload)   // シェアテキスト生成
openShareDialog(type, payload)  // X投稿ウィンドウ（window.open noopener,noreferrer）
_showLegendaryShareModal(item)  // legendary販売専用モーダル
```

### 実績トーストモジュール（S49-ACH）

```javascript
let _achToastQueue  = [];    // 待機中のID配列
let _achToastActive = false; // 処理中フラグ

showAchievementToast(id)       // claimAchievementから呼び出し
_processAchToastQueue()        // キュー処理（再帰的に次を処理）
_dismissAchToast(toast)        // フェードアウト → 次キューへ
```

### OGP / favicon（S49-OGP）

headタグに静的metaタグを追加。JavaScriptによる動的変更なし（og:titleはdocument.titleと独立）。
ogp.png追加後にtwitter:card=summary_large_imageに変更予定。
---

## S50 追加アーキテクチャ

### A1-OGP: ogp.png + summary_large_image

headタグのmetaタグのみ変更。JS/CSS変更なし。

```html
<meta property="og:image"        content="https://men0tai0ko.github.io/deeptrade/ogp.png">
<meta property="og:image:width"  content="1280">
<meta property="og:image:height" content="640">
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:image"       content="https://men0tai0ko.github.io/deeptrade/ogp.png">
```

### A2-PWA: manifest.json + sw.js

```javascript
// manifest.json（主要フィールド）
{ name:"深淵商会", display:"standalone", orientation:"portrait",
  start_url:"/deeptrade/", scope:"/deeptrade/",
  background_color:"#0a0a0f", theme_color:"#7b5ea7" }

// sw.js（Cache First）
const CACHE_NAME = 'shinentrade-v1';
const PRECACHE_URLS = ['/deeptrade/', '/deeptrade/index.html',
                       '/deeptrade/ogp.png', '/deeptrade/manifest.json'];
// install: addAll(PRECACHE_URLS) + skipWaiting
// activate: 旧キャッシュ削除 + clients.claim
// fetch: GETのみ対象。キャッシュヒット→返却。ミス→fetch→キャッシュ追加
```

SW登録（index.html body末尾）：
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: '/deeptrade/' })
      .catch(() => {});  // 登録失敗はサイレント無視
  });
}
```

### B1-DAILY: デイリーミッションシステム

#### gs.meta 追加フィールド

```javascript
gs.meta.dailyMissions: [  // 3件固定
  { type: string, desc: string, target: number,
    progress: number, reward: number, claimed: boolean }
]
gs.meta.dailyResetAt: number  // 翌00:00タイムスタンプ（ローカル時刻）
```

#### 新規関数

| 関数 | 役割 |
|---|---|
| `DAILY_MISSION_TYPES` | マスターデータ定数（gen/update/isDone/progressText） |
| `_nextMidnight()` | 翌00:00タイムスタンプ計算 |
| `initDailyMissions()` | 初期化・リセット・自動受取。戻り値: boolean（自動受取発生） |
| `checkDailyMissions(trigger, payload)` | トリガー別進捗更新 |
| `claimDailyMission(idx)` | 手動受取（gold加算・log・render） |

#### トリガー一覧

| トリガー | 発火元 | 対象ミッション |
|---|---|---|
| `"sell"` | `checkQuestProgress` 経由 | daily_sell_gold |
| `"enhance"` | `checkQuestProgress` 経由 | daily_enhance |
| `"dungeon_enter"` | `enterDungeon()` 直接 | daily_enter_dungeon |
| `"shelf_check"` | 1秒setInterval | **除外**（毎秒呼ばれるため） |

#### initDailyMissions 呼び出し箇所（3箇所）

```javascript
// 1. init() — 起動時（自動受取発生時のみrender()）
if(initDailyMissions()) render();

// 2. openQuestModal() — モーダル開放時（自動受取発生時のみrender()）
if(initDailyMissions()) render();

// 3. 1秒setInterval — バックグラウンドリセット検出
//    ダンジョン戦闘中(gs.dungeon.active)はrender()を抑制
if(Date.now() >= (gs.meta.dailyResetAt || 0)) {
  const _dailyClaimed = initDailyMissions();
  if(_dailyClaimed && !gs.dungeon.active) render();
}
```

---

## S51 追加アーキテクチャ（2026-04-02）

### DAILY_MISSION_TYPES の配列化

S50まではオブジェクト形式だったが、ランダム抽選対応のため配列形式に変更。

```javascript
// 変更後（S51）
const DAILY_MISSION_TYPES = [
  { type: "daily_sell_gold",     gen(), update(), isDone(), progressText() },
  { type: "daily_enter_dungeon", gen(), update(), isDone(), progressText() },
  { type: "daily_enhance",       gen(), update(), isDone(), progressText() },
  { type: "daily_sell_rare",     gen(), update(), isDone(), progressText() }, // 新規
  { type: "daily_sell_count",    gen(), update(), isDone(), progressText() }, // 新規
];

// ヘルパー（全6参照箇所で使用。DAILY_MISSION_TYPES[m.type] 形式は廃止）
function _getDailyDef(type) {
  return DAILY_MISSION_TYPES.find(d => d.type === type) || null;
}
```

生成ロジック:
```javascript
const shuffled = [...DAILY_MISSION_TYPES].sort(() => Math.random() - 0.5);
gs.meta.dailyMissions = shuffled.slice(0, 2).map(d => d.gen());
```

### quickListAfterReturn()

```javascript
function quickListAfterReturn() {
  // 除外UID収集: equippedUids / listedUids / bmUid（裏取引中）
  // 全未鑑定品: item.identified = true（直接書き換え）
  // 出品候補: inventory.filter（identified / EQUIP_TYPES / !UNSELLABLE / !equipped / !listed / !locked）
  // 棚への登録: gs.shop.shelves をループ → 空きに { item, listedAt, sellDuration, onSale:false } をセット
  // saveGame() は最後に1回のみ
  return { identifiedCount, listedCount };
}
```

### Analytics.quickList()

```javascript
function quickList(listedCount) {
  _update(r => {
    if(!r.quickList) r.quickList = { used: 0, totalListed: 0 };
    r.quickList.used++;
    r.quickList.totalListed += listedCount || 0;
  });
}
// 公開API に追加: return { ..., quickList };
```

### openAnalyticsModal() / window._analyticsReport()

ステータスタブ iconDock に追加:
```javascript
{ icon:'📊', label:'分析', fn:'openAnalyticsModal()' }
```

コンソール用グローバル関数:
```javascript
window._analyticsReport = function() { /* console.table でファネルデータ表示 */ };
```

### 転生スキル「深淵の覇道」（worldRank50解禁）

```javascript
// REBIRTH_SKILL_MASTER への追加
rb_veteran:   { unlockRank:50, requires:["rb_atk","rb_def"],          effect:{ stat:"all", pct:5 } }
rb_fortune:   { unlockRank:50, requires:["rb_gold","rb_shelf"],        effect:{ sellPct:8, extraShelf:1 } }
rb_endurance: { unlockRank:50, requires:["rb_veteran","rb_fortune"],   effect:{ maxHpPct:10, bonusSp:3 } }
```

effectキーの参照箇所（既存コードで自動対応）:
- `stat:"all" / pct:5` → `calcStats` 内 passive_pct ループ
- `sellPct:8` → `itemPrice` 内 `rbSellPct` 集計（type無関係）
- `extraShelf:1` → `learnRebirthSkill` 内の棚スロット更新
- `maxHpPct:10` → `calcStats` 内 `rbHpPct` 集計
- `bonusSp:3` → `calcRebirthPoints` 内 `bonusSp` 集計

UI: `openSkillTree` rbタブに `haiwayIds = ["rb_veteran","rb_fortune","rb_endurance"]` の独立ブロックを追加。worldRank50未満は鍵アイコンで進捗（N/50）表示。

演出: `wr===50` の分岐を `addLog` 1行から `_showRebirthMilestoneModal` モーダル演出に昇格。

---

## S52 追加アーキテクチャ（2026-04-06）

### 祠イベントシステム（SHRINE_EVENTS）

```javascript
// 重み付き抽選テーブル（11種）
const SHRINE_EVENTS = [
  { id:"fatigue_cure",  weight:20, canFire:()=> gs.player.fatigue?.expiresAt > Date.now() },
  { id:"exp",           weight:15, canFire:()=> true },
  { id:"heal",          weight:15, canFire:()=> gs.player.hp < calcStats(gs).maxHp },
  { id:"identify",      weight:14, canFire:()=> gs.inventory.some(i=>!i.identified) },
  { id:"mp_restore",    weight:12, canFire:()=> gs.player.mp < calcStats(gs).maxMp },
  { id:"gold_windfall", weight:10, canFire:()=> true },
  { id:"temp_atk",      weight:10, canFire:()=> !gs.dungeon._shrineAtkBuff },
  { id:"luk_up",        weight: 8, canFire:()=> !gs.dungeon._shrineLukBuff },
  { id:"material",      weight: 8, canFire:()=> true },
  { id:"hint",          weight: 8, canFire:()=> !!gs.dungeon.map[gs.dungeon.progress+1] },
  { id:"divine_sight",  weight: 6, canFire:()=> /* 3マス先まで可視 */ },
];
```

**祠バフの影響範囲:**
- `_shrineAtkBuff`: `doBattle()` のダメージ計算に `shrineAtkMul=1.3` として統合。発動後即 `false` にリセット
- `_shrineLukBuff`: `handleTrap()` / `handleRest()` の lukBonus 計算に `+5` として加算。`leaveDungeon()` でリセット
- DEFAULT_STATE・マイグレーション（`loadGame`）に両フィールドを追加済み

### デイリーミッション達成トースト（showDailyToast）

```javascript
// checkDailyMissions() 内で達成瞬間を検出
const wasDone = def.isDone(m);
const updated = def.update(m, trigger, payload);
if(!wasDone && def.isDone(updated)) showDailyToast(updated);

// トースト表示（.daily-toast / z-index:8210 / bottom:200px）
function showDailyToast(mission) { /* 5秒自動消去・タップで openQuestModal() */ }
```

**注意:** `_dailyToastTimer` は1変数のみ管理。同時達成時は後発が前発を上書き（最大2件のため許容）。

### 一括出品フィルター改善（openListModal）

```javascript
// 未鑑定品がある場合のみ「❓」ボタンを末尾に追加
const hasUnidentified = available.some(i => !i.identified);

// getFiltered() の分岐ロジック
const showUnidOnly    = activeRarities.has("unidentified"); // ❓選択中
const hasRarityFilter = activeRarities.size > 0 && !showUnidOnly; // N/R/E/L選択中
const noFilter        = activeRarities.size === 0 && activeTypes.size === 0; // [全]状態

// 等級指定中は未鑑定を除外 / [全]時は未鑑定を含む / ❓選択時は未鑑定のみ
```

### 周回リザルト強化（startAutoRun / stopAutoRun / showDungeonResult）

```javascript
// startAutoRun: startAt を追加
gs.dungeon.autoRun = { ..., startAt: Date.now() };

// stopAutoRun: 集計して session に追加
const autoRunEarnedGold = Math.max(0, gs.player.gold - (ar.startGold || gs.player.gold));
const elapsedSec = ar.startAt ? Math.floor((Date.now() - ar.startAt) / 1000) : null;
// session.autoRunEarnedGold / autoRunElapsedSec / autoRunFloor

// showDungeonResult: _autoRunSummaryCards で
// 💰獲得Gold / 📊1周平均 / ⏱経過時間 / ⚡Gold/分 を表示
// タイトル: autoRunRuns > 0 ? '🔄 周回リザルト' : '📋 探索リザルト'
```

### 需要バッジ（_demandBadge）

```javascript
// shelvesHtml・updateShopTick 両方で共通ロジック
// demand >= 80 → 🔥需要旺盛（緑・太字）
// demand >= 60 → 📈需要N%（薄緑）
// demand >= 40 → 📊需要N%（黄）
// demand <  40 → ⚠需要低下 N%（赤・太字）
// visitor 表示中はバッジを非表示（既存優先順位を維持）
```

### ステータスタブ iconDock（S52追加）

```javascript
{ icon:'📘', label:'ガイド', fn:'showFirstGuideModal(true)' }
// forceShow=true: isFirstPlay フラグを変更しない再表示モード
```

### チュートリアル改善（showFirstGuideModal）

- PAGES 配列に STEP4「⛩ 祠と消耗品を活用」を追加
- `forceShow` 引数追加（true時は `isFirstPlay` を変更せず、Analytics計測もスキップ）
- 各ページに `tip` フィールド追加（ヒントバー表示）
- ステップごとの色分け（accent/green/gold/#cc88ff）
- Analytics skipDist を `[0,0,0,0]`（4要素）に拡張

### Analytics強化（openAnalyticsModal / _analyticsReport）

- `recent5 = sessions.slice(-5).reverse()` で直近5セッション取得
- `funnelBar()` ヘルパーで横バー可視化
- `dropEnter / dropReturn / dropSale / dropComplete` で各ステップ離脱率表示
- KPI色判定: 帰還→販売率 ≥50%=緑 / ≥30%=黄 / <30%=赤
- `_analyticsReport()` に `enter_to_return_pct` / `quicklist_rate` / 直近5セッション console.table を追加

---

## S54 追加アーキテクチャ（2026-04-06）

### Fisher-Yatesシャッフル（initDailyMissions）

```javascript
// 変更前（偏りあり）
const shuffled = [...DAILY_MISSION_TYPES].sort(() => Math.random() - 0.5);

// 変更後（一様分布保証）
const _pool = [...DAILY_MISSION_TYPES];
for(let _i = _pool.length - 1; _i > 0; _i--) {
  const _j = Math.floor(Math.random() * (_i + 1));
  [_pool[_i], _pool[_j]] = [_pool[_j], _pool[_i]];
}
gs.meta.dailyMissions = _pool.slice(0, 2).map(d => d.gen());
```

### CSS変数追加（S44 COLOR-VAR）

```css
:root {
  /* 既存変数に追加 */
  --surface-deep: #1a1a2e;  /* UIボタン・コンポーネント背景（27箇所） */
  --surface-base: #0d0d18;  /* 最暗背景・カード内背景（12箇所） */
}
```

対象外カラー（誤置換リスクで保留）: `#e74c3c`・`#88ff88`・`#ff8888`・`#555`・`#666`・`#444` 等

---

## S55〜S104 追加アーキテクチャ（2026-04-06〜08）

**バージョン**: S118（2026-04-08 更新）

---

### 共通グローバル定数（S73〜S77）

重複コピーされていた定数を1箇所に集約。

```javascript
// S73: 装備タイプ別表示カラー（4箇所の重複を解消）
const EQUIP_TYPE_COLOR = { weapon:"#e8d5a0", sub:"#e8d5a0", ... };

// S76: レアリティ短縮表記（5箇所の重複を解消）
const RARITY_SHORT_LABEL = { normal:"N", rare:"R", epic:"E", legendary:"L" };

// S77: レアリティ昇順ソート用（4箇所の重複を解消）
const RARITY_ORDER_MAP = { normal:0, rare:1, epic:2, legendary:3 };
```

---

### スクロール位置保持アーキテクチャ（S96〜S99）

```javascript
let _lastRenderedTab = null; // グローバル変数（S96追加）

function render() {
  const _sc = document.getElementById("screen");
  // 同一タブ内アクション時のみ scrollTop を保存・復元
  const _savedScrollTop = (_sc && currentTab === _lastRenderedTab) ? _sc.scrollTop : 0;
  _lastRenderedTab = currentTab;
  // ... renderScreen() ...
  if(_sc && _savedScrollTop > 0) _sc.scrollTop = _savedScrollTop;
}
```

**ショップタブの特殊対応（S99）:**
- `#screen` は `list-scroll-mode` により `overflow:hidden` → `sc.scrollTop` は常に0
- 実際のスクロール要素は `.list-body`
- `renderShop()` 内で `.list-body.scrollTop` を保存・復元
- `updateShopTick()` のフォールバック（骨格なし時）を `renderScreen()` → `render()` に変更

**ソート/フィルタ変更時（S97）:**
- 変更ボタンの onclick に `_lastRenderedTab=null` を追加
- → 次回 `render()` でスクロールリセット（変更後は先頭表示が正しい）

---

### 名前順ソートヘルパー（S100）

```javascript
// 格納庫・一括モーダルの共通ソート関数
const _compareItemName = (a, b) => {
  const na = ITEM_MASTER[a.itemId]?.name || "";
  const nb = ITEM_MASTER[b.itemId]?.name || "";
  return na.localeCompare(nb, "ja");
};
```

適用箇所: 格納庫（デフォルト）/ 一括強化・分解（enhLv の二次キー）/ 一括解呪・出品 / 一括出品 available リスト

---

### 重み付きランダム抽選ヘルパー（S84）

```javascript
// RELIC_EVENTS / SHRINE_EVENTS で共用
function _pickWeighted(events) {
  // events: { weight, canFire(), fire() }[]
  const eligible = events.filter(e => e.canFire());
  if(eligible.length === 0) return null;
  const totalWeight = eligible.reduce((s, e) => s + e.weight, 0);
  let rand = Math.random() * totalWeight;
  for(const e of eligible) {
    rand -= e.weight;
    if(rand <= 0) return e;
  }
  return eligible[eligible.length - 1];
}
```

---

### 新ダンジョンマス（S82〜S85）

```javascript
// 遺物マス（S82）
function handleRelic()      // RELIC_EVENTS 5種・_pickWeighted で抽選
                             // バフ: gs.dungeon._relicAtkBuff / _relicDefBuff

// 旅の商人マス（S83）
function handleMerchant()   // herb/potion/antidote を basePrice×2×階層補正で販売
                             // 購入モーダル・Gold消費・consumables追加

// 呪われた宝箱マス（S85）
function handleCurseChest() // generateDrop(depth+5) で高品質ドロップ + rollCurse 強制付与
                             // 「開ける/見逃す」選択モーダル（3F以上で出現）
```

`handleEvent()` の switch に各 case を追加。`generateMap()` の pool に追加。

---

### コレクション登録・フルコンプアーキテクチャ（S93〜S103）

```javascript
function registerCollection(item)        // identifyItem/gradeUpItem/leaveDungeon 等6経路から呼び出し
                                          // 末尾で _checkCollectionFullComplete() を呼び出し（S101）

function retroCheckCollection()          // loadGame() 時に1回実行（S94）
                                          // 既存セーブの格納庫・装備中を遡及登録

function _checkCollectionFullComplete()  // S101追加
  // 全36テーマ×part×rarity★0 が completed に揃ったら祝福モーダル表示
  // gs.achievements.stats.collectionFullCompleted フラグで1回限り
  // abyssThemes は abyssFloorCleared >= 6 解禁後に判定対象に追加
  // worldRank100（真エンド解禁）時にフラグをリセット → 再挑戦可能（S103）
```

**フルコンプボーナス（S103）:**
```javascript
// itemPrice() 内
const colFullSellPct = gs?.achievements?.stats?.collectionFullCompleted ? 3 : 0;
const sellMul = 1 + (rbSellPct + staffSellPct + colFullSellPct) / 100;
```

---

### CSS変数追加（S55〜S62）

S54以降に追加されたCSS変数（:root）:

```css
/* S55 */ --danger: #e74c3c;  --success: #88ff88;
/* S56 */ --damage: #ff8888;  --warning: #ff9999;  --filter-active: #2a2a4e;  --unidentified: #cccc00;
/* S57 */ --border-subtle: #444;  --text-disabled: #555;  --info: #4488ff;  --accent-bg: #1a2a3a;
/* S58 */ --border-dark: #333;  --text-faint: #666;  --text-mid: #888;
          --text-white: #fff;  --text-light: #ccc;  --text-subtle: #aaa;
/* S59 */ --bg-darker: #1a1a1a;  --border-list: #1a1a2a;
/* S60 */ --boss: #ff2244;  --alert: #ffcc00;  --twitter: #1da1f2;
          --track-bg: #1e1e2e;  --accent-light: #aaaaff;
          --border-success: #226622;  --text-muted-blue: #aaaadd;
          --unid-bg: #1a1a00;  --unid-border: #888800;
/* S61 */ --gold-dark: #886600;  --bg-canvas: #0a0a14;  --gold-bg: #1a1200;
          --dmg-text: #ff6666;  --danger-dark: #8a2a2a;  --success-bright: #44dd88;
          --surface-alt: #0d0d1a;  --btn-default: #585880;
          --legendary-bright: #e6ac2e;  --green-bright: #2ecc71;
          --text-strike: #888888;  --blackmarket: #ff6688;
```

設計制約（変数化不可）: アルファ付き3色（`#3498db44` 等）/ RARITY_MASTER・SHELF_CATEGORY の color フィールド

---

## S107〜S111 追加アーキテクチャ（2026-04-08）

**バージョン**: S118（2026-04-08 更新）

---

### コレクションフルコンプ 売値ボーナスバッジ（S107）

```javascript
// renderShop() / updateShopTick() の dispPrice 行
const _colBonus = (!isUnid && gs.achievements?.stats?.collectionFullCompleted)
  ? ` <span style="font-size:8px;color:var(--legendary-bright)" title="コレクション+3%">🏆</span>`
  : "";
const dispPrice = `${itemPrice(item)}G${_colBonus}`;
```

フルコンプ達成時のみ棚の価格横に 🏆 バッジを表示。未達成・未鑑定時は空文字。

---

### 通常スキル「討魔の心得」アーキテクチャ（S108）

```javascript
// calcStats() の追加変数
let skillBossDmgPct = 0;

// スキル集計ループ内
if(sk.effect.bossDmgPct) skillBossDmgPct += sk.effect.bossDmgPct;

// return オブジェクト
{ ..., skillBossDmgPct }

// doBattle() の適用箇所（rbBossDmgPct の直後）
if((r.skillBossDmgPct||0) > 0 && en.isBoss) {
  dmg = Math.floor(dmg * (1 + r.skillBossDmgPct / 100));
}
```

`SKILL_MASTER` に `boss_slayer`（ボス与ダメ+15%・requires:[execution]）を追加。

---

### 常連注文 UX 改善アーキテクチャ（S109〜S111）

#### openListModal の filterType 引数（S109）

```javascript
function openListModal(slotIdx, filterType) {
  // ...
  // filterType が typeKeys に含まれる場合のみ初期フィルタをセット
  if(filterType && typeKeys.includes(filterType)) {
    activeTypes.add(filterType);
  }
  renderModal();
}
```

常連注文バッジのタップで `openListModal(null, reg.order.itemType)` を呼び出し。

#### listItem() の注文フィードバック（S110）

```javascript
// listItem() の shelf 登録後
if(item.identified) {
  const m = ITEM_MASTER[item.itemId];
  const matchedReg = (gs.shop.regulars||[]).find(r => r.order && r.order.itemType === m?.type);
  if(matchedReg) {
    addShopLog("good", `⭐ ${matchedReg.icon}${matchedReg.name}の注文品（${m.name}）を棚に出した！`);
  }
}
```

**注意**: `quickListAfterReturn()` は `listItem()` を呼ばないため、フィードバックは発火しない（設計上の制約）。

#### isOrderFilled バッジ状態（S111）

```javascript
// 常連客カード内で注文タイプが棚に出品済みか確認
const isOrderFilled = hasOrder && (gs.shop.shelves||[]).some(
  s => s && s.item && s.item.identified && ITEM_MASTER[s.item.itemId]?.type === reg.order.itemType
);
// 出品済み: 緑バッジ「✅ 棚に出品中」
// 未出品: 金バッジ「📋 注文中」（タップで出品モーダル起動）
```

性能: `shelves.some()` はショートサーキット。棚最大15本で問題なし。


---

## S113〜S115 追加アーキテクチャ（2026-04-08）

### 注文タイムアウト モーダル即時更新（S113）

```javascript
// checkRegularVisits() タイムアウト処理
reg.order = null;
saveGame();
window._regRefresh?.(); // モーダル開放中に注文バッジを即時更新
```

### _regRefresh クロージャリーク修正（S114）

```javascript
// openRegularsModal() モーダルクローズハンドラ
modal.onclick = e => {
  if(e.target === modal) { modal.remove(); window._regRefresh = null; }
};
```

`window._regRefresh` はモーダル open 時にセット、close 時に null クリア。
`setInterval` の `checkRegularVisits()` からは `?.()` で安全呼び出し。

### 「まだかな」ログ スロットル（S114）

```javascript
// reg.order オブジェクトに lastNagAt を動的追加
const _nagInterval = 5 * 60 * 1000;
if(!reg.order.lastNagAt || now - reg.order.lastNagAt >= _nagInterval) {
  addShopLog(...);
  reg.order.lastNagAt = now;
}
```

セーブデータ互換: `lastNagAt` は動的追加のため旧セーブでは undefined → `!reg.order.lastNagAt` が true → 初回は正常にログ出力。マイグレーション不要。

### 注文タイムアウト残り時間表示（S115）

```javascript
// 常連客カード内変数
const _orderExpireMs = 10 * 60 * 1000;
const _orderRemainMs = hasOrder ? Math.max(0, _orderExpireMs - (Date.now() - reg.order.requestedAt)) : 0;
const _orderRemainMin = Math.ceil(_orderRemainMs / 60000); // 最小1分
// 残り2分以内 → 赤色表示
```


---

## S116〜S117 追加アーキテクチャ（2026-04-08）

### 常連モーダル 残り時間自動更新（S116・S117）

```javascript
// openRegularsModal()
function openRegularsModal() {
  clearInterval(window._regAutoTimer); // S117: 旧タイマーを確実に停止
  document.querySelector('.regulars-modal')?.remove();
  // ...
  window._regAutoTimer = null;
  modal.onclick = e => {
    if(e.target === modal) {
      modal.remove();
      window._regRefresh = null;
      clearInterval(window._regAutoTimer);
      window._regAutoTimer = null;
    }
  };
  // ...
  window._regAutoTimer = setInterval(() => {
    if(window._regRefresh) window._regRefresh();
    else { clearInterval(window._regAutoTimer); window._regAutoTimer = null; }
  }, 30000);
}
```

**設計方針:**
- `window._regAutoTimer` に格納することで複数呼び出し時の旧タイマー停止を保証
- `clearInterval(null)` は無害なため初回呼び出しも安全
- 30秒間隔で `_orderRemainMin` を自動再計算・表示更新
- `_regRefresh = null` 後はコールバック内の else で自動停止

