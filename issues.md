# 深淵商会 — バグ・課題一覧

**最終更新**: 2026-04-02

---

## 凡例

| ステータス | 意味 |
|---|---|
| 🔴 OPEN | 未着手・対応必要 |
| 🟡 PENDING | 保留中（影響小・後回し） |
| ✅ FIXED | 修正済み（バージョン記載） |

---

## 🟡 保留中の課題

### DAILY-UX-2（旧UX-2）
- **内容**: デイリーミッション件数が3件→2件に変わったことをプレイヤーが混乱する可能性
- **現状**: ヘッダーに「毎日ランダムで2種類出題されます」の説明文を追加済み（S51）
- **残課題**: 旧セーブ（3件）から2件に切り替わるリセット直後の体験

### DAILY-LOGIC-4（旧LOGIC-4）
- **内容**: ミッション種別のシャッフルに `Math.random()-0.5` を使用しており厳密な一様分布ではない
- **現状**: 実用上の偏りは観測されていない
- **判断**: 許容範囲。分布確認のみ

### BUG-3-OPEN
- **内容**: `openQuestModal()` の `render()` に `dungeon.active` ガードを追加したが、通常プレイではタブ制限によりダンジョン中に依頼モーダルを開けないため実害の確認が困難
- **確認方法**: コンソールから `openQuestModal()` を直接実行してテスト

---

## ✅ 修正済み（S51）

### LOGIC-3
- **内容**: `daily_sell_gold` の progress がtarget超えで「1,500/1,000G」と過大表示
- **原因**: `update()` 内で `Math.min` による上限制御がなかった（他2種は制御済みだった）
- **修正**: `update()` に `Math.min(m.progress + payload.gold, m.target)` を追加
- **影響範囲**: `checkDailyMissions` 経由の sell トリガー発火時のみ

### UX-2
- **内容**: 日付またぎの自動受取時に `showGoldPop()` が未呼び出しで演出なし
- **原因**: `initDailyMissions()` 内の自動受取ブロックに `showGoldPop` が抜けていた
- **修正**: 自動受取ブロックに `showGoldPop(m.reward)` を追加
- **影響範囲**: `initDailyMissions()` の自動受取パスのみ

### BUG-3
- **内容**: `openQuestModal()` と `init()` の `render()` 呼び出しに `dungeon.active` ガードなし
- **原因**: `setInterval` 側にはガードがあったが他2箇所が未対応で不一致だった
- **修正**: `initDailyMissions() && !gs.dungeon.active` 条件を3箇所すべてに統一
- **影響範囲**: `render()` 呼び出し判断のみ。モーダルのDOM生成には影響なし

### LOGIC-1
- **内容**: `initDailyMissions()` 呼び出し3箇所に保守コメントなし
- **修正**: `openQuestModal()` 内の呼び出し箇所にコメント3行追記

---

## ✅ 修正済み（S49）

### S49-B1
- **内容**: `doBossAttack()` 内で `const c = gs.dungeon.combat` が未宣言 → ReferenceError
- **症状**: 7〜10Fボスのデバフスキル発動時にクラッシュ
- **原因**: S47 での実装時に変数宣言が抜けた
- **修正**: `const c = gs.dungeon.combat` を冒頭に追加

### S49-B2 / B3
- **内容**: `_showLegendaryShareModal` がLvUp演出中・タブ切替後に不正表示
- **修正**: `.lvup-overlay` / `.boss-intro-overlay` チェックと `currentTab !== "shop"` チェックを追加

### S49-B4
- **内容**: `buildShareText` で `#hash` が除去されない / `file://` URL が混入
- **修正**: `.split("#")[0]` 追加・file://除外処理追加

### S49-B5
- **内容**: ボス撃破モーダルのシェアボタンが「続ける」の上にあり誤タップしやすい
- **修正**: ボタンを下に移動・opacity:0.85・font-size:12px

---

## ✅ 修正済み（S48）

### S48-B1〜B10
- B1: `calcNextAction` 遷移先 `"loot"` → `"inventory"` 誤記
- B2: `hint.action()` 後の重複 `render()` 削除
- B3: `openSaveDataModal` の mc.innerHTML 全リセット問題 → 差分更新
- B4: `exportData` の innerHTML 展開（XSS）→ `textContent` 設定
- B5: `confirmOverlay` に背景クリック閉じる処理追加
- B6: `_showSaleBanner` がボス演出・LvUP演出中も表示 → ガード追加
- B7: 常連購入・裏取引に `notifySale` が未適用
- B8: トースト `bottom:90px` → actionBar 裏に隠れる → `142px`
- B9: トーストタップ時モーダルが二重表示 → タップ前に全クリア
- B10: トーストのキュー上限チェックが処理中を含まない判定 → `totalInFlight` で修正

---

## ✅ 修正済み（S47）

| # | 内容 |
|---|---|
| B-1 | `isEvade=true` 時デバフターン消費が走らない → `else` 外に移動 |
| B-2 | void_setブロック成功時ボスのrage未加算 |
| B-3 | `openRebirthModal` に重複テキスト |
| B-4 | B-1修正副作用で `const ev` 消失 |
| A | `boss.defDebuff` がダメージ計算に未反映（`skill_howl` 等が効果ゼロ） |
| B | `learnRebirthSkill` が `unlockRank` を無視 |
| C | `leaveDungeon` で `_autoRunTimer` が残存 → `stopAutoRun()` 追加 |

---

## 既知の設計上の制約（バグではない）

| # | 内容 | 判断 |
|---|---|---|
| 未変数化カラー | `#555` / `#666` / `#1a1a2e` 等が直接記述されている箇所あり | 誤置換リスクのため保留 |
| `DAILY_MISSION_TYPES` シャッフルの分布 | `Math.random()-0.5` は厳密な一様分布でない | 実用上許容 |
| `openQuestModal` の `render()` ガード | ダンジョン中タブ制限で通常は到達不可 | 現状実害なし |
| Analytics データがローカル端末のみ | localStorage のため複数端末間で集計不可 | 仕様（個人開発の制約） |
