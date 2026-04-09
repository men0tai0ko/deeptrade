## 調査メモ（S91）: Legendary売却シェアモーダル

### 実装状況: 既に実装済み（`_showLegendaryShareModal`）

`notifySale()` 内で `rarity === "legendary"` のとき 1秒後に自動表示される。

**抑制ガード（意図的なもの）**:
- ショップタブ以外では非表示
- `.modal-overlay` / `.boss-result-overlay` / `.lvup-overlay` が出ている間は非表示

**「見えない」ケースの原因候補**:
1. LvUP演出・ボス結果等のモーダルと重なって抑制される
2. 1秒遅延中にタブ切替した場合に抑制される
3. ガードが過剰に機能している可能性

**改善候補**: ガードの緩和（モーダルがある場合でもキューに積んで後から表示、等）

---

## UI改善候補（S91追加）

### LEGENDARY-SHARE-MODAL: ✅ S91で削除済み

**対応**: `_showLegendaryShareModal()` 関数を完全削除。`notifySale()` の呼び出し（setTimeout）も削除。
legendary 売却時は `_showSaleBanner` + `_showLegendaryFlash` のみ残存。

**現象**:
- legendary アイテムが売却されるたびに `_showLegendaryShareModal()` が呼ばれる
- 既存ガード: currentTab !== "shop" 時・他モーダル表示中は抑制されるが「毎回」の制限なし

**修正候補**:
- **C案（推奨）**: `achievements.stats.legendaryShareShown` フラグで初回のみ表示
- A案: モーダル完全廃止（シェアボタンを売却バナーに組み込む）
- D案: 10回に1回等の間引き

**実装（C案）**:
```diff
function _showLegendaryShareModal(item) {
  if(currentTab !== "shop") return;
  if(document.querySelector(".modal-overlay, ...")) return;
+ // 初回のみ表示（S92）
+ if(gs.achievements?.stats?.legendaryShareShown) return;
+ if(gs.achievements?.stats) gs.achievements.stats.legendaryShareShown = true;
  ...
}
```

**影響範囲**: `_showLegendaryShareModal` のみ。既存 stats への追記のみ。

---

## SCROLL-QA 動作確認手順（S102記録）

S96〜S99 のスクロール保持修正の統合確認手順。

### 確認項目と手順

#### 1. 格納庫：操作後スクロール位置保持（S96）
1. 格納庫タブを開き、アイテムを20個以上並べる
2. リストを下にスクロール（中間付近まで）
3. アイテムをタップ → ロック/解除
4. **期待**: スクロール位置が保持されること（最上部に戻らない）

#### 2. タブ切替時はリセット（S96 の正常動作）
1. 格納庫でスクロールした状態でショップタブに切替
2. 格納庫タブに戻る
3. **期待**: 先頭に戻っていること（保持しないのが正しい）

#### 3. ソート/フィルタ変更後はリセット（S97）
1. 格納庫でスクロールした状態でソートボタンを変更
2. **期待**: 先頭に戻ること（変更後は先頭表示が正しい）

#### 4. ショップ：売却後スクロール位置保持（S99根本修正）
1. ショップタブを開き、棚に複数アイテムを出品
2. `list-body` をスクロールした状態で待機（アイテム売れるまで）
3. **期待**: 売却テロップ（saleBanner）表示後もスクロール位置が保持されること

### コンソール確認コマンド
```javascript
// スクロール位置確認
document.getElementById("screen").scrollTop
document.querySelector(".list-body")?.scrollTop

// _lastRenderedTab 確認（タブ切替判定用）
_lastRenderedTab
```

---

## UI改善候補（S95追加）

### SCROLL-RESET: アクション後の縦スクロールリセット問題

**現象**:
- 格納庫・ダンジョン等で何かアクション（ロック/強化/鑑定等）を行うと `render()` が呼ばれる
- `renderScreen()` で `sc.innerHTML` が全書き換えされるため `sc.scrollTop` が 0 にリセット
- 特に格納庫（inventory）でアイテムが多い場合、操作後に最上部へ戻る

**原因**:
- `render()` → `renderScreen()` → `sc.innerHTML = ...` → DOM再構築 → scrollTop=0

**修正候補（最小変更）**:
```diff
function render() {
+  const sc = document.getElementById("screen");
+  const _prevTab = _lastRenderedTab;
+  const _savedTop = (sc && currentTab === _prevTab) ? sc.scrollTop : 0;
+  _lastRenderedTab = currentTab;
  updateTabVisibility();
  renderTopBar();
  renderScreen();
  document.querySelectorAll(".eventBox").forEach(el=>{ el.scrollTop = 0; });
  if(pendingLvUp) renderLvUp();
+  if(sc && currentTab === _prevTab && _savedTop > 0) sc.scrollTop = _savedTop;
}
```

**注意点**:
- タブ切替時（currentTab 変更）はリセットが正しいため条件分岐が必要
- ショップタブは `updateShopTick` による差分更新があり、全書き換えは少ない
- `_lastRenderedTab` をグローバル変数として保持する必要あり

**影響範囲**: render() のみ（全タブに影響するが、同一タブ内アクションのスクロール位置のみ保持）

---

## UI改善候補（S98追加）

### SCROLL-SHOPTICK: 売却テロップ時にスクロール最上部へ移動する問題

**現象**:
- アイテムが売れた際にテロップ（saleBanner）が表示されると同時に縦スクロールが最上部へ移動する

**原因（調査済み）**:
- `setInterval(1秒)` 内で `checkShopSales()` → `sold=true` → `render()` が呼ばれる
- S96 の `_savedScrollTop` 保存・復元は `render()` 経由なので正常に動作するはず
- しかし同じ setInterval 内で `updateShopTick()` も呼ばれ、`.shelfGrid` がない場合 `render()` を経由せずに `renderScreen()` を直接呼ぶ
- `renderScreen()` は `_savedScrollTop` の保存・復元ロジックを持たない → scroll リセット

```javascript
// setInterval 内の処理順（問題あり）
checkShopSales();              // sold=true → render() ← スクロール保持あり
...
if(currentTab==="shop") updateShopTick(); // shelfGrid なし → renderScreen() ← 保持なし
```

**修正箇所**（1行のみ）:
```diff
function updateShopTick() {
  const sc = document.getElementById("screen");
  if(!sc || !sc.querySelector(".shelfGrid")) {
-   renderScreen();
+   render(); // S99: render() 経由でスクロール位置を保持
    return;
  }
```

**影響範囲**: `updateShopTick()` の骨格なし時のフォールバックのみ。通常の差分更新パスには影響なし。

---

## 改善候補（S121追加）

### IDLE-TRAINING: 放置型リソース獲得コンテンツ

**背景**: 周回モード（autoRun）ではアイテムのみ獲得。EXP・Goldを放置で稼ぐ手段が専用コンテンツとしては未提供。

**提案内容**: 周回システムと同様の放置型で、以下3種を独立コンテンツとして検討。

| ID | 内容 | 概要 | 参考実装 |
|---|---|---|---|
| IDLE-EXP | 修行モード | 放置でEXP獲得。消耗品コストor疲弊リスクあり | autoRun の `totalDrops` → `gainExp` 相当 |
| IDLE-GOLD | 交易モード | 放置でGold獲得。投資・スタッフ収入とは別枠 | `checkShopIncome` 相当の独立タイマー |
| IDLE-MATERIAL | 採集モード | 放置で素材獲得。錬金術師スタッフとの差別化が必要 | autoRun の dropItem 相当 |

**設計上の注意点**:
- 周回モード（autoRun）との重複・競合を避ける（同時起動不可 or 排他設計）
- 「放置で何でも稼げる」とゲームバランスが崩れるため、各モードに適切なコスト・上限を設ける
- 段階的開示（ショップLv or worldRankで解禁）が自然な流れ
- `gs.dungeon.autoRun` と同様の状態管理オブジェクトで実装可能

**優先度**: 中（ループ充実・放置満足感の向上）  
**依存**: autoRun の設計を参照。実装前にバランス設計（balance.md）を先に作成すること

---

## S123 完了内容（2026-04-08）

### 機能追加（1件）・設計（1件）

| 内容 | 詳細 |
|---|---|
| COLLECTION-REWARD表示 | コレクションモーダルにフルコンプバッジ追加。プログレスバーを金色に変更 |
| IDLE-TRAINING バランス設計 | balance.md §23 に IDLE-EXP/IDLE-GOLD の数値設計を先行追記 |

---

## S122 完了内容（2026-04-08）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| COLLECTION-REWARD拡充 | フルコンプ達成時に SP+3 付与。モーダルに表示・冒険ログに記録 |

---

## S121 完了内容（2026-04-08）

### UX改善（1件）

| 内容 | 詳細 |
|---|---|
| 注文成功セリフ6種追加 | REGULAR_SERIFS.orderSuccess を追加。注文購入ログにランダムセリフを適用 |

---

## S120 完了内容（2026-04-08）

### UX改善（1件）

| 内容 | 詳細 |
|---|---|
| 注文発生セリフ5種 | REGULAR_SERIFS.order を追加。注文ログをランダムセリフに変更 |

---

## S119 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| openListModal typeOrder修正 | sub/cloak/seal を typeOrder に追加。TYPE_ICON に cloak:"🧥" を追加 |

---

## S118 完了内容（2026-04-08）

### ドキュメント整備（コード変更なし）

| 内容 | 詳細 |
|---|---|
| spec.md 常連注文UX整理 | §6-4 を S109〜S117 全機能テーブル+テスト手順5件に更新 |
| BUG-HUNT-S117 | clearInterval(undefined) 安全性確認 → 問題なし |
| SKILL-TREE-UI改善評価 | reqLabel 既実装 → 変更不要と確認 |

---

## S117 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| _regAutoTimer スコープ修正 | ローカル変数 → window._regAutoTimer に変更。冒頭 clearInterval で旧タイマー確実停止 |

---

## S116 完了内容（2026-04-08）

### UX改善（1件）

| 内容 | 詳細 |
|---|---|
| ORDER-AUTO-REFRESH | 常連モーダルに 30秒ごとの _regRefresh() 自動呼び出しを追加。クローズ時に clearInterval |

---

## S115 完了内容（2026-04-08）

### UX改善（1件）

| 内容 | 詳細 |
|---|---|
| REGULAR-ORDER-EXPIRE-HINT | 注文バッジに「⏱ あとN分」残り時間表示。残り2分以内は赤色 |
| arch.md S113〜S115更新 | _regRefresh/NAGスロットル/残り時間のアーキテクチャ追記 |

---

## S114 完了内容（2026-04-08）

### バグ修正（2件）

| 内容 | 詳細 |
|---|---|
| _REGREFRESH-LEAK | モーダルクローズ時に window._regRefresh = null を追加 |
| REGULAR-VISIT-NAG-THROTTLE | 「まだかな」ログを lastNagAt で5分スロットル |

---

## S113 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| ORDER-TIMEOUT-UX | タイムアウト時に window._regRefresh?.() を追加。モーダル開放中の注文バッジを即時更新 |
| README 直近変更更新 | S100〜S113 の主要変更に更新 |

---

## S112 完了内容（2026-04-08）

### ドキュメント整備（コード変更なし）

| 内容 | 詳細 |
|---|---|
| arch.md S107〜S111更新 | コレクションボーナスバッジ・boss_slayer・常連注文UX 3件のアーキテクチャ追記 |
| issues.md S107〜S111追記 | 3件の改善履歴を追記 |
| BUG-HUNT-S111/REGULAR-ORDER-CLEAR確認 | 全て問題なし |

---

## S111 完了内容（2026-04-08）

### UX改善（2件）

| 内容 | 詳細 |
|---|---|
| ORDER-NO-STOCK ヒント | filterType在庫なし時に「注文品の在庫がありません」をモーダル内に表示 |
| REGULAR-ORDER-BADGE更新 | 注文品が棚出品済みの場合に緑の「✅ 棚に出品中」バッジに切替 |

---

## S110 完了内容（2026-04-08）

### UX改善（1件）

| 内容 | 詳細 |
|---|---|
| REGULAR-ORDER-FEEDBACK | listItem() に注文一致時ショップログ追加。識別済み品のみ・null安全 |

---

## S109 完了内容（2026-04-08）

### UX改善（1件）

| 内容 | 詳細 |
|---|---|
| 常連注文バッジ → 出品モーダル連携 | 注文バッジをタップで一括出品モーダルを該当タイプフィルタ済みで開く。`openListModal(slotIdx, filterType)` に filterType 引数を追加。後方互換維持 |

---

## S108 完了内容（2026-04-08）

### 機能追加（1件）・修正（1件）

| 内容 | 詳細 |
|---|---|
| SKILL-SITUATIONAL: boss_slayer | 「討魔の心得」スキル追加（atk・cost:3・requires:[execution]・ボス与ダメ+15%）。calcStats/doBattle への統合済み |
| balance.md RELIC_EVENTS修正 | weight実値に修正（exp=25/gold=25/atk=20/def=20/material=10） |

---

## S107 完了内容（2026-04-08）

### 機能改善（1件）・確認（1件）

| 内容 | 詳細 |
|---|---|
| COLLECTION-BONUS UI | フルコンプ時に棚の価格横に 🏆 バッジ表示（renderShop/updateShopTick 2箇所追加・2行変更）|
| BUG-HUNT-S106 | sellMul加算順確認・items.md SET_MASTER全13種確認 → 問題なし |

---

## S106 完了内容（2026-04-08）

### ドキュメント整備（コード変更なし）

| 内容 | 詳細 |
|---|---|
| balance.md 同期 | S47→S106。転生スキル数値根拠・遺物バフ・常連ギフト・フルコンプボーナス・スタッフLv効果追記 |
| items.md 更新 | S47→S106。スタッフLv効果修正後詳細・新マス3種・常連ギフトアイテム追記 |
| BUG-HUNT-S105 | arch.md とコードの整合性確認 → 全て問題なし |

---

## S105 完了内容（2026-04-08）

### ドキュメント整備（コード変更なし）

| 内容 | 詳細 |
|---|---|
| arch.md 同期 | S54→S104 に更新。スクロール保持・名前順ソート・_pickWeighted・新マス3種・コレクションアーキテクチャ・CSS変数追記 |
| items.md 確認 | 新ダンジョンマスはマスイベントのため対象外と確認 |
| spec.md ③.6精度 | HINT-COLLECTION 条件を `completed.length / 全段階総数 < 30%` と明記 |

---

## S104 完了内容（2026-04-08）

### ドキュメント整備・確認（コード変更なし）

| 内容 | 詳細 |
|---|---|
| spec.md 同期 | S50止まりを S104 に更新。S53〜S103 主要仕様を21節・22節として追記（新マス3種・ショップLv・常連ギフト・コレクション・スクロール保持・名前順ソート） |
| issues.md S103追記 | ABYSS-FULL-COMPLETE 修正履歴追記・バージョン S104 更新 |
| BUG-HUNT-S104 | colFullSellPct 全呼び出し確認・calcNextAction ③.6 優先順序確認 → 問題なし |

---

## S103 完了内容（2026-04-08）

### バグ修正・機能改善（1件）・確認（2件）

| 内容 | 詳細 |
|---|---|
| ABYSS-FULL-COMPLETE | `doRebirth()` 真エンド解禁ブロックに `collectionFullCompleted=false` リセット1行追加。worldRank100時にabyssテーマ10種が再判定対象に加わる |
| COLLECTION-BONUS確認 | `itemPrice()` の `colFullSellPct=3` 実装確認。null安全・既存sellMul加算で問題なし |
| HINT-COLLECTION確認 | `calcNextAction()` ③.6 実装確認。達成率30%未満+Lv10以上でコレクション誘導。計算正確・軽量 |

---


## S102 完了内容（2026-04-08）

### ドキュメント整備（コード変更なし）

| 内容 | 詳細 |
|---|---|
| issues.md 更新 | S77 止まりから S102 へ更新。S86〜S99 のバグ修正8件を追記 |
| BUG-HUNT-S101確認 | `_checkCollectionFullComplete` の parts ロジックが既存実装と完全一致を確認 |
| HINT-SHOP-LV クローズ | S95 実装済み（Lv7/9 × EXP70%超）と確認 |
| README / HANDOVER 同期 | バージョン S102 に更新 |

---

## S101 完了内容（2026-04-08）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| COLLECTION-REWARD フルコンプ演出 | `_checkCollectionFullComplete()` を新規追加。全36テーマ × part × rarity の★0基本達成で1回限り祝福モーダルを表示。真エンド未解禁テーマ（abyss系10種）はスキップ。`gs.achievements.stats.collectionFullCompleted` フラグで多重表示防止。`registerCollection()` 末尾から自動呼び出し |

---

## S100 完了内容（2026-04-08）

### 機能改善（1件）

| 内容 | 詳細 |
|---|---|
| 名前順ソート | `_compareItemName` ヘルパーを追加。格納庫（デフォルト）・一括強化・一括分解・一括解呪・一括出品 の6箇所に名前順ソートを適用。分解は既存の enhLv ソートの二次キーとして追加 |

---

## S99追加完了（2026-04-08）

### バグ修正（根本原因修正）

| 内容 | 詳細 |
|---|---|
| SCROLL-SHOPTICK 根本修正 | S99修正（`renderScreen()→render()`）は表面的対処だった。真因は `renderShop()` が `sc.className="list-scroll-mode"` を設定することで `#screen` が `overflow:hidden` になり、S96の `sc.scrollTop` 保存が常に0になっていたこと。`renderShop()` に `.list-body` の `scrollTop` 保存・復元を追加して根本修正 |

---

## S99 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| SCROLL-SHOPTICK | `updateShopTick()` の骨格なし時フォールバックを `renderScreen()` → `render()` に変更。`render()` 経由にすることで `_savedScrollTop` の保存・復元が効き、売却時のスクロールリセットを修正 |

---

## S98 完了内容（2026-04-08）

### ドキュメント整備（コード変更なし）

| 内容 | 詳細 |
|---|---|
| HANDOVER-S97 | HANDOVER.md のバージョン日付を S97/2026-04-08 に更新 |
| README-SYNC | README.md を S97 に更新（直近変更を S79〜S97 の主要機能に差し替え） |
| BUG-HUNT-FINAL | `% N === 0` 残存3箇所を確認。worldRank/enhLv は1ずつ増加のため飛び越しなし → 安全 |
| COLLECTION-REWARD | フルコンプ判定が未実装のため実施保留 |

---

## S97 完了内容（2026-04-08）

### バグ修正・改善（1件）

| 内容 | 詳細 |
|---|---|
| SCROLL-SORTFILTER | ソート/フィルタ変更時（3箇所）の onclick に `_lastRenderedTab=null` を追加。変更後は先頭表示に戻る（S96で保持するようになった挙動を修正） |

---

## S96 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| SCROLL-RESET 修正 | `render()` に `_lastRenderedTab` を追加し、同一タブ内アクション時のみ `sc.scrollTop` を保存・復元。タブ切替時は `_savedScrollTop=0` → リセット（正しい動作を維持） |

---

## S95 完了内容（2026-04-08）

### UX改善（2件）

| 内容 | 詳細 |
|---|---|
| REGULAR-SERIF-EXPAND | `REGULAR_SERIFS` を各Lvティア3→6種に拡充。`gift` 専用セリフ5種を追加し、ギフトログに `_giftSerif` を使用 |
| HINT-SHOP-LV | `calcNextAction` の③.25にショップLv7→Lv8（需要動向）・Lv9→Lv10（自動鑑定スタンプ）解禁ヒントを追加（EXP残り30%以下で表示） |

---

## S94 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| retroCheckCollection 追加 | 既存セーブデータの格納庫・装備中アイテムを loadGame 時に遡及コレクション登録。`retroCheckCollection()` を追加し `retroCheckAchievements()` の直後で実行 |

---

## S93 完了内容（2026-04-08）

### バグ修正（1件: 6箇所追加）

| 内容 | 詳細 |
|---|---|
| COLLECTION-REGISTER-FIX | 格納庫にある時点でコレクション登録する仕様を徹底。`identifyItem`・`gradeUpItem`・`leaveDungeon`（loot→inventory）・ボスクリア時・autoRun・古物商スタッフ自動鑑定の6経路に `registerCollection` を追加 |

---

## S92 完了内容（2026-04-08）

### バグ修正・ドキュメント整備（2件）

| 内容 | 詳細 |
|---|---|
| BUG-HUNT-S90 常連ギフト修正 | `purchases % 20 === 0` を `Math.floor(purchases/20) > Math.floor(prev/20)` に変更。unidBonus=1 で20を飛び越す問題を修正 |
| HANDOVER-FINAL | S82〜S91 の実装済み機能一覧テーブルを HANDOVER.md に追加 |

---

## S91追加完了（2026-04-08）

### バグ修正・削除（1件）

| 内容 | 詳細 |
|---|---|
| LEGENDARY-SHARE-MODAL 削除 | legendary 売却ごとに出ていた SNS シェアモーダルを完全削除。`_showLegendaryShareModal()` 関数本体 + `notifySale()` の setTimeout 呼び出しを削除 |

---

## S91 完了内容（2026-04-08）

### バグ修正（1件）

| 内容 | 詳細 |
|---|---|
| DUNGEON-MAP-SCROLL-FIX | `requestAnimationFrame` を double rAF に変更し `scrollIntoView({inline:"center", block:"nearest"})` で現在地マスを中央表示。layout 未確定によるスクロール右端固定を修正 |

---

## UI改善候補（S90追加）

### DUNGEON-MAP-SCROLL: マップスクロール位置が現在地を隠す問題

**現象**:
- 冒険中のマス表示スクロールバーが常に右端固定になる
- 現在位置マスが画面外に隠れて見えない

**原因調査**:
- `sc.innerHTML = ...` の直後に `requestAnimationFrame` でスクロール位置を計算している
- `row.offsetWidth` が layout 未確定（0）のまま計算される場合がある
- `scrollLeft = cellL - 0/2 + cellW/2 = cellL + cellW/2` → 最大値 → 右端固定

**修正候補**:
```diff
- requestAnimationFrame(() => {
-   const row = document.getElementById("dungeonMapRow");
-   if(!row) return;
-   const cell = row.children[prog];
-   if(!cell) return;
-   const rowW  = row.offsetWidth;
-   const cellL = cell.offsetLeft;
-   const cellW = cell.offsetWidth;
-   row.scrollLeft = cellL - rowW / 2 + cellW / 2;
- });
+ requestAnimationFrame(() => {
+   requestAnimationFrame(() => {
+     const row = document.getElementById("dungeonMapRow");
+     if(!row) return;
+     const cell = row.children[prog];
+     if(!cell) return;
+     cell.scrollIntoView({ inline: "center", behavior: "auto", block: "nearest" });
+   });
+ });
```

**影響範囲**: renderScreen のダンジョン表示のみ

---

## S90 完了内容（2026-04-08）

### 機能追加・ドキュメント整備（2件）

| 内容 | 詳細 |
|---|---|
| FEATURE-REGULAR-GIFT | 常連客が20回購入ごとにギフト（gem/ancient_coin ランダム1個）を持参。`processRegularPurchase` 末尾に追加 |
| HANDOVER-SYNC-S89 | HANDOVER.md にショップLv解禁機能一覧（Lv2/5/8/10）を追加 |

---

## S89 完了内容（2026-04-08）

### バグ修正・安全性確認（1件）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-S88 自動鑑定スタンプ | 呪い付きアイテム鑑定時のログに `_curseNote`（「⚠ 呪い【label】が判明！」）を追加 |
| REGULAR-DEEPENING | 常連客: `processRegularPurchase` / `regularSerif` 構造確認。gift/特別注文は未実装 |
| BALANCE-NEW-CELLS | 確認済み（S88）|
| HINT-SHOP-LV | calcNextAction のLv8/10 ヒント追加は効果薄→ 保留 |

---

## S88 完了内容（2026-04-07）

### 機能追加・確認（3件）

| 内容 | 詳細 |
|---|---|
| FEATURE-SHOP-TIER-LV10 | ショップLv10解禁「自動鑑定スタンプ」実装。`listItem()` に `gs.shop.level >= 10` 判定を追加。未鑑定品の出品時に自動鑑定 + ショップログ追加 |
| shopLv バッジ | shopExpBar に Lv8「📊需要動向」・Lv10「🔍鑑定スタンプ」バッジを表示 |
| BALANCE-NEW-CELLS | relic/merchant/curse_chest の出現率: 各 6〜8% 程度。1〜2回/フロアのバランスで適切と判断 |

---

## S87 完了内容（2026-04-07）

### UX改善（2件）

| 内容 | 詳細 |
|---|---|
| STAFF-NEXT-LV-HINT | スタッフモーダルに「▲ 次Lv: N分→M分」ヒントを追加（alchemist/antiquarian/stockManager の3スタッフ・上限時は非表示） |
| STAFF-DESC-UPDATE | 3スタッフの `desc` に「Lv1: N分/個・Lv上昇で短縮」を追記 |

---

## S86 完了内容（2026-04-07）

### バグ修正・UX改善（3件）

| 内容 | 詳細 |
|---|---|
| STAFF-SPEEDBONUS-BUG | `alchemist`/`antiquarian` の `speedBonus` が `base` に未定義で `getStaffEffect` に計算されずLv上昇が効かなかった。`base` に `speedBonus:0` を追加し `gain`/`cap` を整合 |
| STAFF-STOCKMANAGER-FIX | `stockManager` の `autoShelfSpeed` が tick 間隔に未反映でLv上昇無効だった。`_shelfInterval = Math.max(1, Math.round(2/eff.autoShelfSpeed))` に修正 |
| STAFF-EFFECT-DISPLAY | スタッフモーダルの効果表示を「消耗品自動生成（N分/個）」等の具体的な間隔表示に変更 |

---

## スタッフ改善候補（S85追加）

### 現状の問題：レベル効果が UI 上で不明瞭

以下3スタッフはレベルアップ時の効果変化が説明文・雇用モーダルに表示されていない。

#### 錬金術師（alchemist）
- `base.alchemyIntervalMin: 5`（5分ごとに1個生成）
- `gain.alchemySpeedBonus: 2`/Lv（生産間隔を最大80%短縮）
- Lv1=5分、Lv10≒4分、Lv20≒3分、Lv40=1分（上限Lv50で80%短縮→1分）
- **問題**: 何分ごとに生成するか・Lv上昇で何が変わるか UI に未表示

#### 商品管理人（stockManager）
- `base.autoShelfSpeed: 1`、`gain.autoShelfSpeed: 0.02`/Lv
- 実際の動作: `shelfTick >= 2`（2分ごとにチェック）→ `autoShelfSpeed` は現在**未使用**
- **問題**: Lv上昇の効果が実装されていない（speed 係数を参照するコードがない）
- **改善候補**: `shelfTick >= Math.max(1, Math.round(2 / eff.autoShelfSpeed))` にして高Lvで頻度アップ

#### 古物商（antiquarian）
- `base.autoIdentifyIntervalMin: 3`（3分ごとに1個鑑定）
- `gain.autoIdentifySpeedBonus: 2`/Lv（鑑定間隔を最大80%短縮）
- Lv1=3分、Lv20≒2分、Lv40=0.6分（最速 `Math.max(1,...)` で1分）
- **問題**: 何分ごとに鑑定するか UI に未表示

### 改善タスク

| 優先 | ID | 内容 | コスト |
|---|---|---|---|
| 高 | STAFF-STOCKMANAGER-FIX | `stockManager` の `autoShelfSpeed` を実際の tick 間隔に反映（Lv効果の空実装を修正） | 低 |
| 中 | STAFF-EFFECT-DISPLAY | 3スタッフの雇用モーダル・スタッフモーダルにレベル別効果（N分ごと・次のLvで○分）を表示 | 中 |
| 低 | STAFF-DESC-UPDATE | `desc` 文字列に「Lv1: 5分ごと」等の具体的な数値を追記 | 極低 |

---

## S85 完了内容（2026-04-07）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| FEATURE-CURSE-CHEST | `curse_chest` マス実装。`handleCurseChest()` 追加。`generateDrop(depth+5)` で高品質アイテム生成＋`rollCurse` で強制呪い付与。「開ける/見逃す」選択モーダル。3F以上の pool に追加 |

---

## S84 完了内容（2026-04-07）

### 品質改善・機能追加（3件）

| 内容 | 詳細 |
|---|---|
| RELIC-SHRINE-DEDUP | `_pickWeighted(events)` ヘルパー追加。`handleRelic`・`handleShrine` の重み付き抽選ロジック（各6行）を共通化 |
| FEATURE-DEMAND-FORECAST | ショップLv8解禁「需要動向」バナー追加。`demandHistory` 直近2スナップを比較し武器/防具/装飾品/消耗品の上昇↑/下降↓/横ばい→を表示 |
| BUG-HUNT-S83 | merchant QA：disabled処理・consumables追加ともに問題なし |

---

## S83 完了内容（2026-04-07）

### 安全性確認・機能追加（1件）

| 内容 | 詳細 |
|---|---|
| BUG-HUNT-S82 | autoRun 中 relic 不踏・出現率6〜9%・calcStats 統合不要 → 全項目問題なし |
| FEATURE-MERCHANT | `merchant`（旅の商人）マス実装。3種消耗品（herb/potion/antidote）を basePrice×2×階層補正で購入可能。`handleMerchant()` 追加、`handleEvent` case追加、`generateMap` pool追加 |

---

## S82 完了内容（2026-04-07）

### 機能追加（1件）

| 内容 | 詳細 |
|---|---|
| DUNGEON-EVENT-NEW: 遺物マス実装 | `RELIC_EVENTS`（5種・重み付き抽選）+ `handleRelic()` 追加。`handleEvent()` に `case "relic"` 追加。`generateMap()` の pool に `"relic"` を追加（全フロア・1枠）。バフ2種（与ダメ+25% / 被ダメ-20%）を `doBattle()` に統合。セーブデータマイグレーション・`leaveDungeon` リセット処理追加 |

### 変更箇所
- `RELIC_EVENTS` テーブル（5種: relic_exp / relic_gold / relic_atk / relic_def / relic_material）
- `handleRelic()` 関数追加
- `handleEvent()` に `case "relic"` 追加
- `generateMap()` pool に `"relic"` 1枠追加（全フロア）
- `doBattle()` に `relicAtkMul`（与ダメ+25%）/ `_relicDefMul`（被ダメ-20%）適用
- `loadGame()` マイグレーション補完追加
- `leaveDungeon()` バフリセット追加
- `evNames` 2箇所に `relic:"遺物"` / `relic:"🏺遺物"` 追加

---

## S81 完了内容（2026-04-07）

### 安全性確認・機能設計（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-FINAL leaveDungeon | active チェック / autoRun停止 / 帰還コスト確認 完備 |
| BUG-HUNT-FINAL startAutoRun | _autoRunTimer 多重実行防止ガード済み |
| SPEC-SYNC | S62〜S80 は技術的変更のみ → spec.md 更新不要 |
| 次期機能設計 | DUNGEON-EVENT-NEW / SHOP-TIER-UNLOCK の設計メモを追記 |

---

## 次期機能設計メモ（S81）

### DUNGEON-EVENT-NEW: 新ダンジョンマス設計

実装箇所:
- `generateMap()`: pool に新タイプを追加
- `handleEvent()`: switch に case を追加
- 新 `handle*()` 関数を追加

候補マスタイプ:
| type | 内容 | 難度 |
|---|---|---|
| `relic` | 遺物発見：ランダムバフ or アイテム（祠の軽量版） | 低 |
| `curse_chest` | 呪われた宝箱：高価値アイテムだが呪い付与リスク | 中 |
| `merchant` | 旅の商人：消耗品を購入できる（Gold消費） | 中 |

### SHOP-TIER-UNLOCK: ショップLv連動解禁設計

現状:
- Lv2: 鑑定解禁
- Lv5: 裏取引解禁（`bmUnlocked()`）
- Lv8〜10: 新サービス枠が空き

候補:
| Lv | 解禁内容 |
|---|---|
| Lv8 | 需要予報（次の需要波動をプレビュー） |
| Lv10 | 自動鑑定スタンプ（出品時に自動鑑定） |

---

## S80 完了内容（2026-04-07）

### 安全性確認・ドキュメント整備（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-34 openListModal | 空き棚0 / 陳列可能0 / 二重陳列（shelfUids除外）全てガード済み |
| BUG-HUNT-35 showDungeonResult | session null 時の全プロパティに ?. / \|\| 0 完備 |
| HANDOVER-SYNC | HANDOVER.md / README.md の行数を 16,200行 → 16,990行 に更新 |
| CONTENT-PROPOSAL | ロードマップ方針（ループ充実・選択の意味・段階的開示）を確認。新機能候補は下記セクション参照 |

### 次期機能追加候補（ロードマップ方針に沿って）

| 優先 | ID | 内容 | 方針 |
|---|---|---|---|
| A | DUNGEON-EVENT-NEW | ダンジョン新イベントマス追加（例：隠し通路・遺物発見・呪われた宝箱） | ループ充実 |
| B | SKILL-SITUATIONAL | 状況依存スキル追加（例：ボス戦特化・低HP発動・高階層ボーナス） | 選択の意味 |
| C | SHOP-TIER-UNLOCK | ショップLvに応じた新サービス解禁（例：Lv8で自動鑑定・Lv10で需要予報） | 段階的開示 |
| D | REGULAR-DEEPENING | 常連客の個性強化（固定セリフ強化・特別注文・ギフト） | ループ充実 |
| E | COLLECTION-REWARD | コレクション達成時の演出強化（フルコンプ特別ボーナス） | 段階的開示 |

---

## S79 完了内容（2026-04-07）

### 安全性確認・ドキュメント整備（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-32 learnRebirthSkill | includes 重複防止 / unlockRank / requires / RP不足 全ガード済み |
| BUG-HUNT-33 openBagModal/buyLootSlot | slots>=maxSlots 上限 / Gold不足 二重ガード済み |
| HANDOVER-FINAL | 共通グローバル定数一覧セクション（EQUIP_TYPE_COLOR/RARITY_SHORT_LABEL/RARITY_ORDER_MAP）を HANDOVER.md に追記 |

---

## S78 完了内容（2026-04-07）

### 安全性確認・DEDUP最終スキャン（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| DEDUP-FINAL | `BTN` 3パターン・`TYPE_ICON` 内容不一致のため共通化不適切。重複定数整理は S73〜S77 で完了 |
| BUG-HUNT-31 openSkillTree | タブ存在チェック / learnSkill 二重確認 → 安全 |
| README-SYNC | バージョンを S78 に更新 |

---

## S77 完了内容（2026-04-07）

### 品質改善（1件）

| 内容 | 詳細 |
|---|---|
| RARITY_ORDER_MAP 共通化 | `RARITY_ORDER = {normal:0,rare:1,epic:2,legendary:3}` が4箇所に重複コピー。`RARITY_ORDER_MAP` グローバル定数として集約（S73/S76と同パターン） |

---

## S76 完了内容（2026-04-07）

### 品質改善（1件）

| 内容 | 詳細 |
|---|---|
| RARITY_SHORT_LABEL 共通化 | `RARITY_SHORT` / `RARITY_LABEL`（同一内容）が5箇所に重複コピー。`RARITY_SHORT_LABEL` グローバル定数として集約 |

---

## S75 完了内容（2026-04-07）

### バグ修正・品質改善（1件）

| 内容 | 詳細 |
|---|---|
| TYPE_ICON-BRACELET | `openBulkDecomposeModal` の `bracelet:"🔗"` を他3箇所と同じ `"🔮"` に統一。フィルタボタンアイコンの UI不一致を修正 |

---

## S74 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| TYPE_ICON-REVIEW | 4箇所で内容が意図的に異なる（cloak有無・bracelet:🔮 vs 🔗・consumable有無）。共通化不適切 |
| BUG-HUNT-23 claimDailyMission/claimAchievement | claimed チェックで重複防止済み。Gold加算は reward.gold truthy 時のみ |
| BUG-HUNT-24 gradeUpItem/openReforgeModal | canGradeUp/canReforge で Gold・素材・crystal 不足を全てガード済み |

---

## S73 完了内容（2026-04-07）

### 安全性確認・品質改善（1件）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-21 openStackDetail | allUids.length===0 で早期 return。m/r は inventory 存在確認後に参照 → 安全 |
| BUG-HUNT-22 retroCheckAchievements | 全 check() を try/catch でガード済み → エラー耐性あり |
| PERF-CALCSTATS | setInterval 内で直接呼ばれない。render() はユーザー操作起点のみ → キャッシュ不要 |
| CONTENT-REVIEW | バランス調整は仕様変更につき対象外 |
| TYPE_COLOR 共通化 | 4箇所に重複コピーされていた `TYPE_COLOR` 定数を `EQUIP_TYPE_COLOR` グローバル定数として共通化 |

---

## S72 完了内容（2026-04-07）

### 安全性確認・ドキュメント整備（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-18 doBossAttack | skill=b.skills[action] が undefined なら else if(skill) に入らない |
| BUG-HUNT-19 checkRegularOrders | orderType = reg.preferType \|\| types[random] フォールバック完備 |
| BUG-HUNT-20 openCollectionModal | gs.collection?.completed \|\| [] で null 参照保護済み |
| HANDOVER-NEXTCHAT | 保留課題テーブル・安全性確認済み範囲（S62〜S72）を HANDOVER.md に追記 |

---

## S71 完了内容（2026-04-07）

### 安全性確認・全修正反映確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-14 identifyItem | shopLv2 / 未鑑定 / Gold 不足の各ガード完備 |
| BUG-HUNT-15 checkQuestProgress | q.done で重複防止。daily_* の gs.quests 混入なし |
| BUG-HUNT-16 gainExp | maxLv 上限なしは転生リセット設計による仕様 |
| BUG-HUNT-17 openShelfSettingsModal | _shelfSetType/_shelfSetAll ともに item 存在時のみ sellDuration 再計算 |
| FEATURE-REVIEW | S62〜S66 全修正（COLOR-VAR / 疲弊ヒント / findIndex / Fisher-Yates）の反映を確認 |

---

## S70 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| UX-REVIEW-PREP 疲弊中潜入 | spec.md に潜入禁止記述なし。ペナルティ付き潜入可が仕様。renderShop のバナー誘導で対処済み |
| BUG-HUNT-11 learnSkill/resetSkill | includes() 重複防止 / requires チェック / SP・Gold 不足ガード完備 |
| BUG-HUNT-12 handleTrap/handleLava | Math.max(0, hp-dmg) + hp<=0 → leaveDungeon(false) の死亡処理あり |
| BUG-HUNT-13 openBrewModal | times<=0 ガード / ループ内で素材・Gold 不足時 break あり |

---

## S69 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| calcStats 転生スキル集計 | rb_apex/rb_hoard/rb_transcend の全 effect 適用確認済み。extraShelf は棚スロット計算で直接集計 |
| checkShopIncome / checkStaffIncome / checkInvestmentReturn | income<=0 ガード・Math.max(1,...) で負値・NaN 発生なし |
| generateMap 境界値 | len=14+floor×3（1F=17, 10F=44）。pool 枯渇なし。boss マスは getBossIdForFloor 判定済み |
| SAVEDATA-SIZE | ゲームログ MAX_LOG=100・Analytics sessions 上限100 で肥大化防止済み |
| confirmEnterDungeon UX | CP不足ダイアログ・疲弊/Gold不足は calcNextAction() による誘導で対応済み |

---

## S69 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| BUG-HUNT-8 calcStats 転生スキル集計 | sellPct/extraShelf/extraLoot/bonusSp は各呼び出し元で個別 reduce。calcStats 内は stat.pct/maxHpPct/bossDmgPct/critRatePct を集計。分担明確・漏れなし |
| BUG-HUNT-9 Gold加算 NaN/負値 | checkShopIncome: income<=0 ガード。checkStaffIncome: truthy 時のみ加算。checkInvestmentReturn: Math.max(1,...) で最低1G保証 |
| BUG-HUNT-10 generateMap 境界値 | floor=1(len=17)/floor=10(len=44) 正常。getBossIdForFloor は null 返却でボスなし処理済み |
| SAVEDATA-SIZE | ALL_LOGS: MAX_LOG=100 で pop() 制御済み。Analytics: sessions.slice(-100) で上限制御済み |

---

## S68 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| toggleLock / equipItemByUid / unequipItem | uid/item null ガード済み → 安全 |
| doRebirth 重複実行 | `openRebirthModal` 冒頭 `if(!canRebirth()) return` で防止済み |
| HINT-FULL-CLEAR | 全クリア後も `canRebirth()` → ①転生促進ヒント → 正常動作 |
| itemPrice の onSale 整合 | `gs.shop.shelves.find` 経由で `onSale` 参照。checkShopSales・常連購入ともに整合 |
| render() 呼び出し頻度 | setInterval 内は `sold=true` 時のみ。shop タブは `updateShopTick()` 差分更新 → 問題なし |
| doRebirth 後 dungeon フィールド | `poisoned`/`burned`/`_omenActive` 等は全て falsy 参照のみ。`_session` は enterDungeon 内で即設定 → 安全 |

---

## S67 完了内容（2026-04-07）

### 安全性確認（コード変更なし）

| 確認項目 | 結論 |
|---|---|
| HINT-ABYSS | 10Fクリア後 `ng++` → `selectedFloor=1` にリセット。"11階層へ潜入" は発生しない |
| doBattle/doBossAttack | 冒頭 `if(!c) return` ガード済み |
| openBulkIdentifyModal/openBulkPurifyModal | フィルタ・コスト計算ともにガード済み。ゼロ除算なし |
| renderLoot null | `loot`タブは `dungeon.active` でアクセス制限済み（16610行） |
| SAVEDATA-MIGRATE | S62以降の新フィールドなし。全フィールドに `undefined` 補完処理あり |

---

## S66 完了内容（2026-04-07）

### バグ修正・品質改善（2件）

| 内容 | 詳細 |
|---|---|
| FLUCTUATE-DEMAND-SHUFFLE | `fluctuateDemand()` のシャッフルを Fisher-Yates に置換。4カテゴリで先頭2つ（weapon/armor）が選ばれやすい偏りを修正。`initDailyMissions` と同様の問題（S54漏れ） |
| COLOR-VAR-ALPHA-DEFER | アルファ付き3箇所（`#3498db44`/`#9b59b644`/`#27ae6044`）を設計制約として正式記録・クローズ |

---

## S65 完了内容（2026-04-07）

### バグ修正・品質改善（3件）

| 内容 | 詳細 |
|---|---|
| BUG-REGULAR-FINDINDEX | `checkRegularVisits()` 来訪購入の `findIndex` に `s.item` チェック漏れ。`item:null` の特化スロットが棚にある状態で常連来訪時 `shelves[-1]` 参照 → TypeError クラッシュ。`s.item &&` 追加・`slotIdx < 0` ガード追加 |
| BUG-ORDER-FINDINDEX | `checkRegularOrders()` 注文購入の `findIndex` にも同様の `s.item` チェック漏れ。`slotIdx >= 0` ガード済みのためクラッシュには至らないが条件を統一 |
| TASKS-S63-SYNC | tasks.md に S63 完了セクション（ドキュメント整備3件）を追記 |

---

## S63 完了内容（2026-04-07）

### ドキュメント整備（3件）

| 内容 | 詳細 |
|---|---|
| ISSUES-UPDATE | issues.md を S54 止まりから S63 対応に更新。S55〜S62 の修正内容を全追記 |
| DAILY-UX-2-CLOSE / DAILY-LOGIC-4-CLOSE | 保留課題2件を S64 にてクローズ（実害なし・根本原因修正済み） |
| README-VERSION-SYNC | README.md バージョンを S51→S63 に更新。直近変更を S62/S63 内容に差し替え |

---

## S62 完了内容（2026-04-07）

### 品質改善（2件）

| 内容 | 詳細 |
|---|---|
| COLOR-VAR-RESIDUAL | `:root` 定義済みの `--rare`(#3498db) / `--epic`(#9b59b6) / `--green`(#27ae60) の残存ハードコード18箇所を変数化（CSS9箇所・JS9箇所）。アルファ付き・JSデータ定義は除外 |
| HINT-ORDER-FATIGUE | `calcNextAction()` の疲弊ヒントを③.2→②.5に移動。棚出品ヒックより前に疲弊を優先表示 |

---

## S61 完了内容（2026-04-06）

### 品質改善（3件）

| 内容 | 詳細 |
|---|---|
| COLOR-VAR-LAST | `--gold-dark`/#886600 / `--bg-canvas`/#0a0a14 / `--gold-bg`/#1a1200 / `--dmg-text`/#ff6666 / `--danger-dark`/#8a2a2a / `--success-bright`/#44dd88 / `--surface-alt`/#0d0d1a / `--btn-default`/#585880 を変数化（計51箇所） |
| COLOR-JS-CONST | `--legendary-bright`/#e6ac2e / `--green-bright`/#2ecc71 / `--text-strike`/#888888 / `--blackmarket`/#ff6688 を変数化（計25箇所） |
| HINT-FATIGUE | `calcNextAction()` に疲弊中ヒントを追加（ショップ休息へ誘導） |

---

## S60 完了内容（2026-04-06）

### 品質改善（4件）

| 内容 | 詳細 |
|---|---|
| COLOR-VAR-MINOR | `--boss`(#ff2244) / `--alert`(#ffcc00) / `--twitter`(#1da1f2) / `--track-bg`(#1e1e2e) / `--accent-light`(#aaaaff) / `--border-success`(#226622) / `--text-muted-blue`(#aaaadd) を変数化（計52箇所） |
| COLOR-VAR-UNID-SET | `--unid-bg`(#1a1a00・7箇所) / `--unid-border`(#888800・7箇所) を変数化 |
| HINT-INVEST | `calcNextAction()` に投資ヒント追加（Gold≥5000・投資上限未満の時） |
| DOC-SYNC | HANDOVER.md の CSS変数セクションを S54〜S60 の一覧形式に整理 |

---

## S59 完了内容（2026-04-06）

### バグ修正・品質改善（3件）

| 内容 | 詳細 |
|---|---|
| ACH-STATMAP-FIX | 実績進捗バーの `_statMap` に6種追加・`_baseReqMap` 補完。`_statKey` 未設定時は非表示に変更 |
| HINT-POST-REBIRTH | `calcNextAction()` にSP未消費/RP未消費ヒントを追加。スキルツリーへ誘導 |
| COLOR-VAR-FINAL | `--bg-darker`(#1a1a1a・7箇所) / `--border-list`(#1a1a2a・6箇所) を変数化 |

---

## S58 完了内容（2026-04-06）

### 品質改善（3件）

| 内容 | 詳細 |
|---|---|
| COLOR-VAR-5 | `--border-subtle`(#444・54箇所) / `--text-disabled`(#555・42箇所) を変数化 |
| COLOR-VAR-6 | `--info`(#4488ff・11箇所) / `--accent-bg`(#1a2a3a・9箇所) を変数化 |
| COLOR-VAR-7 | `--border-dark`(#333・30箇所) / `--text-faint`(#666・29箇所) / `--text-mid`(#888・16箇所) / `--text-white`(#fff・14箇所) / `--text-light`(#ccc・11箇所) / `--text-subtle`(#aaa・8箇所) を変数化。計14変数・合計108箇所 |

---

# 深淵商会 — タスク・進捗管理

**バージョン**: S61
**最終更新**: 2026-04-06

---

## 現在の完成度

### ✅ コアループ（完成）
- ダンジョン探索（10階層・ボス10体・マス8種＋溶岩）
- 戦闘システム（通常・ボスフェーズ制・傭兵5種・specialSkill・デバフシステム）
- 装備システム（12スロット・強化・昇級・錬成・呪い・解呪）
- ショップシステム（放置販売・需要変動・常連客・裏取引）
- スタッフ15種・転生システム・実績システム
- SET効果（13セット）・コレクション（36テーマ）・クエスト・周回モード

### ✅ 公開・配布基盤（完成）
- GitHub Pages ホスティング
- OGP（ogp.png + summary_large_image）
- PWA（manifest.json + sw.js・Cache First）
- SNS共有ボタン（ボス撃破・転生節目・legendary販売）

### ✅ 体験品質・継続率（完成）
- 初回起動ファーストガイド（4ステップモーダル・S52でSTEP4追加・ガイド再表示対応）
- 帰還後「次の一手」ヒントUI
- 帰還後「📦 まとめて出品する」ボタン（S51追加）
- タブタイトル変更フック（離脱時に売却残り時間を表示）
- 売却快感システム（レアリティ別バナー・topBar発光・タブバッジ）
- 実績解除トースト通知

### ✅ デイリーミッションシステム（S51完成）
- 5種プールからランダム2種を毎日00:00に抽選
- ミッション種別: sell_gold / enter_dungeon / enhance / sell_rare / sell_count
- 達成済み未受取の自動受取（日付またぎ対応）
- 依頼モーダルにデイリーセクション表示
- **達成瞬間トースト通知（S52追加）**

### ✅ 計測・分析（S51完成）
- Analytics モジュール（localStorage独立保存・7+1イベント）
- Analytics可視化モーダル（ステータスタブ「📊 分析」）
- `window._analyticsReport()` コンソール関数
- 計測イベント: init / guideCompleted / guideSkipped / firstEnter / firstReturn / firstSale / tick / quickList
- **ファネルバー可視化・離脱率・直近5セッションパネル（S52強化）**

### ✅ セーブデータ管理（完成）
- エクスポート / インポート（ステータスiconDock「💾 データ」）

### ✅ 長期コンテンツ（完成）
- 真エンドフェーズ（worldRank100解禁・6〜10階）
- 転生スキル「深淵の境地」（worldRank20解禁・5種）
- 転生スキル「深淵の覇道」（worldRank50解禁・3種）（S51追加）

---

## 保留課題（優先度順）

| # | ID | 内容 | 優先度 | 難度 |
|---|---|---|---|---|
| 1 | DAILY-UX | デイリー件数を3→2にした際のプレイヤーへの周知不足 | ✅ S53完了 | — |
| 2 | ANALYTICS-EVAL | Analytics可視化モーダル強化（ファネル/ドロップ率/直近5セッション） | ✅ S52完了 | — |
| 3 | DAILY-RANDOM | Fisher-Yatesシャッフルに置換 | ✅ S54完了 | — |
| 4 | SKILL-EXPAND | worldRank100解禁スキル3種追加・ボス与ダメ適用確認 | ✅ S53完了 | — |
| 5 | COLOR-VAR | --surface-deep / --surface-base 変数化（39箇所） | ✅ S54完了 | — |

---

## S53 完了内容（2026-04-06）

### 機能追加・バグ修正（5件）

| 内容 | 詳細 |
|---|---|
| SKILL-EXPAND | worldRank100解禁転生スキル3種追加（rb_apex/rb_hoard/rb_transcend）・calcStats集計・doBattle適用・スキルツリーUIブロック・節目モーダル追記 |
| REBIRTH-PROGRESS | 潜入前カードに転生条件進捗インジケーター追加（ng未達/Lv不足を個別表示） |
| DAILY-UX | デイリーリセット時に「本日の2件」ショップログを追加 |
| COMBAT-SKILL-UX | 複数戦闘スキル時、全スキルMP不足の場合にボタンをdisabled化 |
| BAG-COST-UX | 鞄拡張モーダルにGold差額「あとNGold」ヒント表示を追加 |

---

## S52 完了内容（2026-04-06）

### 機能追加（9件）

| 内容 | 詳細 |
|---|---|
| 祠イベント拡充 | SHRINE_EVENTSテーブル11種に刷新（重み付き抽選）。鑑定・MP回復・素材・Gold・一時攻撃/LUKバフ・3マス透視等 |
| 祠バフ戦闘統合 | `_shrineAtkBuff`（次の戦闘与ダメ+30%）/ `_shrineLukBuff`（フロア中LUK+5）を戦闘・罠・休息計算に統合 |
| チュートリアル改善 | STEP4「⛩ 祠と消耗品」追加。tip表示・ステップ色・forceShow引数・ガイド再表示ボタン（statusタブ） |
| Analytics可視化強化 | ファネルバー・離脱率・直近5セッション・KPI色判定・STEP4スキップ集計 |
| デイリー達成トースト | 達成瞬間に緑スライドアップトースト。タップで依頼モーダル直行。5秒自動消去 |
| 一括出品フィルター改善 | 未鑑定専用「❓」ボタン追加。等級指定中は未鑑定を非表示、[全]時のみ表示 |
| 周回リザルト強化 | stopAutoRunに startAt / earnedGold / elapsedSec を追加。リザルトに獲得Gold・1周平均・経過時間・Gold/分表示 |
| 需要UI改善 | 棚の需要を4段階バッジ（🔥需要旺盛 / 📈上昇 / 📊中程度 / ⚠低下）に強化。shelvesHtml・updateShopTick両対応 |

---

## S51 完了内容（2026-04-02）

### バグ修正（5件）

| ID | 内容 | 修正箇所 |
|---|---|---|
| LOGIC-3 | daily_sell_gold の progress がtarget超えで過大表示 | `update()` に `Math.min` 追加 |
| UX-2 | 自動受取時に `showGoldPop()` 未呼び出し | `initDailyMissions()` 自動受取ブロック |
| BUG-3 | `openQuestModal()` / `init()` の `render()` に `dungeon.active` ガードなし | 3箇所を統一 |
| LOGIC-1 | `initDailyMissions()` 呼び出し箇所に保守コメントなし | コメント追記 |
| BUG-3b | `init()` 側のガードが `setInterval` / `openQuestModal` 側と不一致 | `init()` 側に追加 |

### 機能追加（6件）

| 内容 | 詳細 |
|---|---|
| 「📦 まとめて出品する」ボタン | 帰還リザルトにワンタップ全鑑定+一括出品ボタン追加 |
| Analytics可視化モーダル | ステータスタブに「📊 分析」ボタン。ファネルKPIを表示 |
| `window._analyticsReport()` | コンソール用詳細レポート関数 |
| Analytics quickList計測 | まとめて出品ボタン使用をAnalyticsに記録 |
| デイリーミッションランダム2種化 | 5種プール→毎日ランダム2種抽選。新種別2種追加 |
| 転生スキル「深淵の覇道」3種 | worldRank50解禁。rb_veteran / rb_fortune / rb_endurance |
| wr===50 節目演出昇格 | addLog1行 → _showRebirthMilestoneModal モーダル演出 |

---

## S50 完了内容（2026-03-29）

| 内容 | 詳細 |
|---|---|
| ogp.png作成 | 1280×640px。twitter:card=summary_large_image化 |
| PWA対応 | manifest.json + sw.js（Cache First） |
| デイリーミッションシステム | 3種固定（S51でランダム2種に変更） |

---

## S49 完了内容（2026-03-29）

| 内容 | 詳細 |
|---|---|
| SNS共有ボタン | ボス撃破・転生節目・legendary販売の3箇所 |
| 実績解除トースト | claimAchievement時にスライドアップ通知 |
| タブタイトル変更フック | 離脱時に次の売却残り時間をタイトルに表示 |
| ボスマス段階的フェードイン | 距離に応じた4段階表示 |
| OGPメタタグ + SVG favicon | headタグに静的追加 |

---

## ロードマップ（方針）

### やること
- ループの充実（1周あたり30〜60分の満足感）
- 選択の意味（「正解がある」のではなく「状況次第」）
- 段階的な開示（新要素はプレイ進行に合わせて自然に解放）

### やらないこと
- PvP・マルチプレイ（単独プレイの完成度を優先）
- ガチャ・課金要素（ゲームデザインの純粋さを保つ）
- 複雑すぎるシステム（1ファイルの保守性を考慮し追加は最小限）


## S57 完了内容（2026-04-06）

### 品質改善（3件）

| 内容 | 詳細 |
|---|---|
| ACH-FILTERBAR-RANK50 | 実績モーダルcatListのRank50到達後エントリ欠損バグを修正（S55取り残し） |
| COLOR-VAR-3/4 | `--damage`(#ff8888) / `--warning`(#ff9999) / `--filter-active`(#2a2a4e) / `--unidentified`(#cccc00) 変数化 |
| HINT-DAILY-COMPLETE | `calcNextAction()` にデイリー未受取ヒントを追加 |

---

## S56 完了内容（2026-04-06）

### バグ修正・品質改善（5件）

| 内容 | 詳細 |
|---|---|
| ACH-FILTERBAR-RANK50 | 実績モーダルのカテゴリバッジカウントがRank50到達後にエントリを追加しないバグを修正（S55の取り残し） |
| COLOR-VAR-3 | `--damage`（#ff8888・11箇所）/ `--warning`（#ff9999・17箇所）/ `--filter-active`（#2a2a4e・10箇所）を変数化 |
| HINT-DAILY-COMPLETE | `calcNextAction()` にデイリー未受取ヒントを追加（依頼モーダルへ誘導） |
| DOC-S53-BACKFILL | tasks.md・HANDOVER.md に欠落していた S53 完了セクションを補完 |
| COLOR-VAR-4 | `--unidentified`（#cccc00・10箇所）を変数化 |

---

## S55 完了内容（2026-04-06）

### バグ修正・品質改善（4件）

| 内容 | 詳細 |
|---|---|
| BUG-SALE-LISTEDAT | `toggleSale()` に `slot.listedAt = Date.now()` 追加。セール切替時の即売れバグを修正 |
| HINT-REBIRTH | `calcNextAction()` に転生可能ヒントを追加。ステータスタブへ誘導 |
| BUG-3-CLOSE | `openQuestModal` ガードの動作確認・issues.md 整理（コード変更なし） |
| COLOR-VAR-2 | `--danger`（#e74c3c・28箇所）/ `--success`（#88ff88・30箇所）をCSS変数化 |
| ACH-RANK-POST50 | 数量系実績Rank50到達後も最大ランクエントリを実績モーダルに表示 |

---

## S54 完了内容（2026-04-06）

### 品質改善（2件）

| 内容 | 詳細 |
|---|---|
| DAILY-RANDOM | `initDailyMissions` のシャッフルを Fisher-Yates に置換。5種プールから2種選択の一様分布を保証 |
| COLOR-VAR | CSS変数 `--surface-deep`（#1a1a2e・27箇所）/ `--surface-base`（#0d0d18・12箇所）を追加・全置換 |

---

