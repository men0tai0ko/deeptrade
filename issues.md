# 深淵商会 — バグ・課題一覧

**最終更新**: 2026-04-08（S117）

---

## 凡例

| ステータス | 意味 |
|---|---|
| 🔴 OPEN | 未着手・対応必要 |
| 🟡 PENDING | 保留中（影響小・後回し） |
| ✅ FIXED | 修正済み（バージョン記載） |

---

## 🟡 保留中の課題

*現在、保留中の課題はありません。*

---

## ✅ 改善済み（S107〜S111）

### COLLECTION-BONUS-UI（S107）
- **内容**: フルコンプ達成時の売値+3% が棚UI に視覚表示されていなかった
- **修正**: `renderShop()` / `updateShopTick()` の `dispPrice` に `🏆` バッジを追加
- **影響範囲**: 棚の価格表示のみ。未達成・未鑑定時は空文字

### SKILL-SITUATIONAL-boss_slayer（S108）
- **内容**: ボス戦特化の通常スキルが存在しなかった（rb_apex は転生スキルで敷居が高い）
- **修正**: `SKILL_MASTER` に `boss_slayer`（ボス与ダメ+15%・cost:3・requires:execution）を追加。`calcStats` に `skillBossDmgPct` 集計・`doBattle` に適用

### REGULAR-ORDER-UX（S109〜S111）
- **内容**: 常連客の注文バッジが静的テキストのみで、出品操作への導線がなかった
- **修正1（S109）**: 注文バッジをタップ可能にし `openListModal(null, filterType)` を起動。`openListModal` に `filterType` 引数追加
- **修正2（S110）**: `listItem()` に注文品一致チェックを追加。出品時にショップログを出力
- **修正3（S111）**: 注文品が既に棚出品済みの場合、バッジを「✅ 棚に出品中」（緑）に切替。在庫なし時のヒントメッセージを追加
- **影響範囲**: 常連客カード表示・`openListModal`・`listItem` のみ。後方互換維持

---

## ✅ 修正済み（S117）

### _REGAUTOTIMER-SCOPE（S117）
- **内容**: `openRegularsModal()` を連続呼び出しすると旧タイマーが停止されなかった
- **原因**: `_regAutoTimer` がローカルスコープのため旧モーダルの `DOM削除` 時に `clearInterval` が呼ばれなかった
- **修正**: `window._regAutoTimer` に格納。`openRegularsModal()` 冒頭で `clearInterval(window._regAutoTimer)` を追加
- **影響範囲**: `openRegularsModal()` のタイマー管理のみ

---

## ✅ 改善済み（S115〜S116）

### REGULAR-ORDER-EXPIRE-HINT（S115）
- **内容**: 注文タイムアウト残り時間が常連カードに表示されていなかった
- **修正**: 未出品時の注文バッジに「⏱ あとN分」を追加。残り2分以内は赤色表示
- **影響範囲**: 常連客カードの注文バッジ表示のみ

### ORDER-AUTO-REFRESH（S116）
- **内容**: 常連モーダルが開いていても残り時間カウントダウンが自動更新されなかった
- **修正**: `openRegularsModal()` 内に `setInterval(30000)` を追加。30秒ごとに `_regRefresh()` を呼び出し。クローズ時に `clearInterval` でクリア
- **影響範囲**: `openRegularsModal()` のタイマー処理のみ

---

## ✅ 修正済み（S113〜S114）

### ORDER-TIMEOUT-UX（S113）
- **内容**: 常連客の注文が10分タイムアウトした際、常連モーダルが開いていても注文バッジが更新されなかった
- **原因**: タイムアウト処理で `saveGame()` のみで `render()` / `_regRefresh()` が未呼び出し
- **修正**: `reg.order = null; saveGame();` の直後に `window._regRefresh?.()` を追加（1行）
- **影響範囲**: `checkRegularVisits()` のタイムアウトブロックのみ

### REGULAR-VISIT-NAG-THROTTLE（S114）
- **内容**: 注文中に注文品の在庫がない場合、最速36秒ごとに「まだかな」ログが出力されスパム状態になっていた
- **修正**: `reg.order.lastNagAt` タイムスタンプを追加。5分以上経過した場合のみログを出力
- **影響範囲**: `checkRegularVisits()` の注文品未在庫ブロックのみ

### _REGREFRESH-LEAK（S114）
- **内容**: 常連モーダルを閉じても `window._regRefresh` に古いクロージャが残存していた
- **症状**: タイムアウト時に閉じたモーダルの DOM に対して `_regRefresh()` が実行される（軽微なメモリリーク）
- **修正**: `modal.onclick` のモーダルクローズ時に `window._regRefresh = null` を追加
- **影響範囲**: `openRegularsModal()` のクローズハンドラのみ

---

## ✅ 修正済み（S103）

### ABYSS-FULL-COMPLETE（S103）
- **内容**: 真エンド解禁（worldRank100）後、`collectionFullCompleted=true` のプレイヤーが abyssテーマ追加後も再フルコンプ判定を受けられなかった
- **原因**: `collectionFullCompleted` フラグが立ったまま解禁テーマが増えても `_checkCollectionFullComplete()` の冒頭 early return で即終了していた
- **修正**: `doRebirth()` の `abyssFloorCleared=6` セット直後に `collectionFullCompleted=false` リセットを1行追加
- **影響範囲**: `doRebirth()` の真エンド解禁ブロックのみ

---


## ✅ 修正済み（S99〜S101）

### SCROLL-SHOPTICK-ROOT（S99追加・S99根本修正）
- **内容**: ショップ売却時に `.list-body` スクロールが最上部にリセットされる
- **原因**: `renderShop()` が `sc.className="list-scroll-mode"` を設定し `#screen` が `overflow:hidden` になるため、`sc.scrollTop` 保存が常に0だった
- **修正**: `renderShop()` に `.list-body.scrollTop` の保存・復元を追加（根本修正）。`updateShopTick()` のフォールバックを `renderScreen()` → `render()` に変更（S99初期修正）
- **影響範囲**: `renderShop()` / `updateShopTick()` のみ

### SCROLL-SORTFILTER（S97）
- **内容**: ソート/フィルタ変更後もスクロール位置が保持され、先頭に戻らなかった
- **修正**: ソート/フィルタ変更時の onclick に `_lastRenderedTab=null` を追加（変更後は先頭表示）
- **影響範囲**: 格納庫ソート・フィルタボタン3箇所のみ

### SCROLL-RESET（S96）
- **内容**: 格納庫等で操作後 `render()` が呼ばれると `sc.scrollTop` が 0 にリセットされる
- **修正**: `render()` に `_lastRenderedTab` 変数を追加。同一タブ内の `render()` 呼び出し時のみスクロール位置を保存・復元
- **影響範囲**: `render()` のみ

---

## ✅ 修正済み（S92〜S94）

### BUG-REGULAR-GIFT-MODULO（S92）
- **内容**: 常連ギフト判定 `purchases % 20 === 0` が `unidBonus=1` 等で20を飛び越した場合に未発火
- **修正**: `Math.floor(purchases/20) > Math.floor(prev/20)` に変更（飛び越し対応）
- **影響範囲**: `processRegularPurchase()` の gifting 判定のみ

### COLLECTION-REGISTER-FIX（S93）
- **内容**: コレクション登録が `listItem()` 経由でしか行われず、他経路で格納庫に入ったアイテムが未登録
- **修正**: `identifyItem` / `gradeUpItem` / `leaveDungeon`（loot→inventory）/ ボスクリア / autoRun / 古物商自動鑑定の6経路に `registerCollection()` を追加
- **影響範囲**: 各関数末尾への追加のみ

### COLLECTION-RETRO（S94）
- **内容**: 既存セーブデータの格納庫・装備中アイテムがコレクション未登録
- **修正**: `retroCheckCollection()` を追加し `loadGame()` の `retroCheckAchievements()` 直後で実行
- **影響範囲**: `loadGame()` の初期化フローのみ

---

## ✅ 修正済み（S86）

### STAFF-SPEEDBONUS-BUG（S86）
- **内容**: `alchemist` / `antiquarian` の `speedBonus` が `base` に未定義で `getStaffEffect` に計算されずLv上昇が完全に無効だった
- **修正**: `base` に `speedBonus:0` を追加し `gain` / `cap` を整合
- **影響範囲**: スタッフデータ定義のみ

### STAFF-STOCKMANAGER-FIX（S86）
- **内容**: `stockManager` の `autoShelfSpeed` が tick 間隔に未反映でLv上昇無効（空実装）
- **修正**: `_shelfInterval = Math.max(1, Math.round(2/eff.autoShelfSpeed))` に変更
- **影響範囲**: `checkStaffIncome()` の棚自動補充 tick 計算のみ

---

## ✅ 修正済み（S77）

### RARITY_ORDER_MAP-DEDUP
- **内容**: `RARITY_ORDER = {normal:0,rare:1,epic:2,legendary:3}` が4箇所に重複コピー（スペース違いあり）
- **修正**: `RARITY_ORDER_MAP` グローバル定数を `RARITY_SHORT_LABEL` 直後に追加し4箇所を参照に置き換え。配列型（11740行）は別用途のため対象外
- **影響範囲**: 表示・動作変更なし。保守性向上のみ

---

## ✅ 修正済み（S76）

### RARITY_SHORT_LABEL-DEDUP
- **内容**: `RARITY_SHORT` / `RARITY_LABEL`（同一内容: `{normal:"N", rare:"R", epic:"E", legendary:"L"}`）が5箇所に重複コピー
- **修正**: `RARITY_SHORT_LABEL` グローバル定数を `RARITY_MASTER` 直後に追加し、5箇所の参照に置き換え（S73の `EQUIP_TYPE_COLOR` と同様のパターン）
- **影響範囲**: 表示動作変更なし。保守性向上のみ

---

## ✅ 修正済み（S75）

### TYPE_ICON-BRACELET
- **内容**: `openBulkDecomposeModal` の `TYPE_ICON` で `bracelet:"🔗"` が他3箇所（`openBulkPurifyModal` / `openBulkEnhanceModal` / `openShelfSettingsModal`）の `"🔮"` と不一致
- **修正**: `"🔗"` → `"🔮"` に統一
- **影響範囲**: 分解モーダルのタイプフィルタボタンのアイコン表示のみ。動作変更なし

---

## ✅ 修正済み（S73）

### TYPE_COLOR-DEDUP
- **内容**: 装備タイプ別表示カラー定数 `TYPE_COLOR` が `openBulkPurifyModal` / `openBulkDecomposeModal` / `openBulkEnhanceModal` / `openShelfSettingsModal` の4箇所に同一内容でコピーされていた
- **リスク**: 将来の変更時に一部箇所への適用漏れが発生するリスク
- **修正**: `EQUIP_TYPE_COLOR` グローバル定数を `EQUIP_TYPES` の直後（1761行）に追加し、4箇所のローカル定数を参照に置き換え
- **影響範囲**: 表示動作変更なし。保守性向上のみ

---

## ✅ 修正済み（S66）

### FLUCTUATE-DEMAND-SHUFFLE
- **内容**: `fluctuateDemand()` のカテゴリシャッフルに `sort(() => Math.random()-0.5)` を使用。4カテゴリで `weapon`/`armor`（先頭2つ）が選ばれやすい偏りがあった
- **原因**: S54 で `initDailyMissions()` を Fisher-Yates 修正した際に同関数が漏れていた
- **修正**: `[...cats]` コピー + Fisher-Yates シャッフルに置換。`O(n)` で一様分布を保証
- **影響範囲**: `fluctuateDemand()` のシャッフル処理のみ

---

## ✅ 修正済み（S65）

### BUG-REGULAR-FINDINDEX 🔴 クリティカル
- **内容**: `checkRegularVisits()` 来訪購入の `findIndex` に `s.item` チェックが漏れていた
- **症状**: `item:null` の特化スロットが棚にある状態で `preferType` 持ちの常連客が来訪すると `slotIdx = -1` → `shelves[-1] = undefined` → `shelf.item` で **TypeError クラッシュ**
- **再現**: 特化スロット設定後に商品を出品しない状態 + 常連来訪
- **修正**: `findIndex` 条件に `s.item &&` を追加。`slotIdx < 0` の早期 `return` ガードを追加
- **影響範囲**: `checkRegularVisits()` 来訪購入ブロックのみ

### BUG-ORDER-FINDINDEX
- **内容**: `checkRegularOrders()` 注文購入の `findIndex` にも同様の `s.item` チェック漏れ
- **症状**: `slotIdx >= 0` ガードが既存のため実クラッシュには至らないが条件不整合
- **修正**: `findIndex` 条件に `s.item &&` を追加（来訪購入と統一）
- **影響範囲**: `checkRegularOrders()` 注文購入ブロックのみ

---

## ✅ 対処済み・クローズ（S64）

### DAILY-UX-2（旧UX-2）
- **内容**: デイリーミッション件数が3件→2件に変わったことによるプレイヤーの混乱懸念
- **対処**: ヘッダー説明文追加（S51）・リセット時ショップログ追加（S53）で実害なしと判断
- **判断**: S64クローズ。実害報告なし・プレイヤーへの周知は十分

### DAILY-LOGIC-4（旧LOGIC-4）
- **内容**: `initDailyMissions()` のシャッフルに `Math.random()-0.5` を使用しており厳密な一様分布でなかった
- **対処**: Fisher-Yatesシャッフルに置換済み（S54）
- **判断**: S64クローズ。根本原因修正済み

---

## ✅ 修正済み（S62）

### COLOR-VAR-RESIDUAL
- **内容**: `:root` で定義済みの `--rare`(#3498db) / `--epic`(#9b59b6) / `--green`(#27ae60) がCSS・JSの18箇所でハードコード残存
- **修正**: CSS 9箇所・JS 9箇所を `var(--rare)` / `var(--epic)` / `var(--green)` に置換
- **除外**: `#3498db44` 等アルファ付き16進・`RARITY_MASTER` / `SHELF_CATEGORY` の color フィールド（JS実行環境でCSS変数未解決）
- **影響範囲**: 描画結果変わらず。保守性向上のみ

### HINT-ORDER-FATIGUE
- **内容**: `calcNextAction()` で疲弊チェック（③.2）が棚出品ヒント（②）より後にあり、棚が空＋疲弊中の状態でも疲弊に気づかない
- **修正**: 疲弊チェックを②.5（未鑑定チェックの直後・棚ヒントの前）に移動
- **影響範囲**: `calcNextAction()` の優先順序のみ。他ロジック変更なし

---

## ✅ 修正済み（S61）

### COLOR-VAR-LAST
- **内容**: `--gold-dark`/#886600 / `--bg-canvas`/#0a0a14 / `--gold-bg`/#1a1200 / `--dmg-text`/#ff6666 / `--danger-dark`/#8a2a2a / `--success-bright`/#44dd88 / `--surface-alt`/#0d0d1a / `--btn-default`/#585880 がハードコード残存
- **修正**: CSS変数化（計51箇所置換）
- **影響範囲**: CSS定義追加のみ。レンダリング結果変わらず

### COLOR-JS-CONST
- **内容**: `--legendary-bright`/#e6ac2e / `--green-bright`/#2ecc71 / `--text-strike`/#888888 / `--blackmarket`/#ff6688 がハードコード残存
- **修正**: CSS変数化（計25箇所置換）
- **影響範囲**: CSS定義追加のみ

### HINT-FATIGUE
- **内容**: 疲弊中のヒントが `calcNextAction()` に存在せず、ショップ休息への誘導がなかった
- **修正**: `calcNextAction()` に疲弊中ヒントを追加
- **影響範囲**: `calcNextAction()` のみ

---

## ✅ 修正済み（S60）

### COLOR-VAR-MINOR
- **内容**: `--boss`(#ff2244) / `--alert`(#ffcc00) / `--twitter`(#1da1f2) / `--track-bg`(#1e1e2e) / `--accent-light`(#aaaaff) / `--border-success`(#226622) / `--text-muted-blue`(#aaaadd) がハードコード残存
- **修正**: CSS変数化（計52箇所置換）

### COLOR-VAR-UNID-SET
- **内容**: `--unid-bg`(#1a1a00・7箇所) / `--unid-border`(#888800・7箇所) がハードコード残存
- **修正**: CSS変数化

### HINT-INVEST
- **内容**: `calcNextAction()` に投資促進ヒントがなく、Gold が十分あっても投資に誘導されなかった
- **修正**: Gold≥5000・投資上限未満の条件でヒント追加

---

## ✅ 修正済み（S59）

### ACH-STATMAP-FIX
- **内容**: 実績進捗バーの `_statMap` に6種欠落・`_baseReqMap` 未補完。`_statKey` 未設定実績でエラー
- **修正**: `_statMap` に6種追加・`_baseReqMap` 補完。`_statKey` 未設定時は進捗バーを非表示に変更
- **影響範囲**: 実績モーダルの進捗バー表示のみ

### HINT-POST-REBIRTH
- **内容**: `calcNextAction()` に転生後のSP/RP未消費ヒントがなく、スキルツリーへの誘導なし
- **修正**: SP未消費・RP未消費の各ヒントを追加

### COLOR-VAR-FINAL
- **内容**: `--bg-darker`(#1a1a1a・7箇所) / `--border-list`(#1a1a2a・6箇所) がハードコード残存
- **修正**: CSS変数化

---

## ✅ 修正済み（S58）

### COLOR-VAR-5/6/7
- **内容**: `--border-subtle`(#444) / `--text-disabled`(#555) / `--info`(#4488ff) / `--accent-bg`(#1a2a3a) / `--border-dark`(#333) / `--text-faint`(#666) / `--text-mid`(#888) / `--text-white`(#fff) / `--text-light`(#ccc) / `--text-subtle`(#aaa) がハードコード残存
- **修正**: CSS変数化（計14変数・108箇所置換）
- **影響範囲**: CSS定義追加のみ

---

## ✅ 修正済み（S57）

### ACH-FILTERBAR-RANK50（S56取り残し分）
- **内容**: 実績モーダル `catList` の Rank50 到達後エントリが欠損（S56修正の取り残し）
- **修正**: S57 で完全修正

### COLOR-VAR-3/4
- **内容**: `--damage`(#ff8888) / `--warning`(#ff9999) / `--filter-active`(#2a2a4e) / `--unidentified`(#cccc00) がハードコード残存
- **修正**: CSS変数化

### HINT-DAILY-COMPLETE
- **内容**: デイリーミッション達成・未受取時に `calcNextAction()` が誘導しなかった
- **修正**: 未受取ヒントを追加（依頼モーダルへ誘導）

---

## ✅ 修正済み（S56）

### ACH-FILTERBAR-RANK50
- **内容**: 実績モーダルのカテゴリバッジカウントが Rank50 到達後にエントリを追加しないバグ
- **修正**: 最大ランクエントリを常にモーダルへ表示するよう修正
- **影響範囲**: 実績モーダルのカテゴリバッジ表示のみ

### COLOR-VAR-3
- **内容**: `--damage` / `--warning` / `--filter-active` がハードコード残存
- **修正**: CSS変数化（3種・計38箇所）

### HINT-DAILY-COMPLETE（初出）
- **内容**: `calcNextAction()` にデイリー未受取ヒントを追加

### COLOR-VAR-4
- **内容**: `--unidentified`（#cccc00・10箇所）がハードコード残存
- **修正**: CSS変数化

---

## ✅ 修正済み（S55）

### BUG-SALE-LISTEDAT
- **内容**: `toggleSale()` でセール切替時に `listedAt` が更新されず、切替直後に即売れするバグ
- **原因**: `listedAt` のリセット処理が未実装
- **修正**: `toggleSale()` に `slot.listedAt = Date.now()` を追加
- **影響範囲**: `toggleSale()` のみ

### HINT-REBIRTH
- **内容**: `calcNextAction()` に転生可能ヒントがなく、転生条件を満たしても誘導なし
- **修正**: `canRebirth()` 判定でステータスタブへ誘導するヒントを追加

### BUG-3-CLOSE
- **内容**: `openQuestModal()` の `dungeon.active` ガード動作確認
- **確認結果**: コンソールから `openQuestModal()` を直接実行しても正しく機能することを確認（S55）
- **判断**: 正常動作。設計上の制約として整理

### COLOR-VAR-2
- **内容**: `--danger`（#e74c3c・28箇所）/ `--success`（#88ff88・30箇所）がハードコード残存
- **修正**: CSS変数化

### ACH-RANK-POST50
- **内容**: 数量系実績 Rank50 到達後、最大ランクエントリが実績モーダルに表示されなかった
- **修正**: Rank50 到達後も最大ランクエントリを表示するよう修正

---

## ✅ 修正済み（S54）

### DAILY-RANDOM
- **内容**: デイリーシャッフルに `sort(() => Math.random() - 0.5)` を使用しており先頭要素が選ばれやすい偏りがあった
- **修正**: Fisher-Yatesシャッフルに置換。`O(n)` で真の一様分布を保証
- **影響範囲**: `initDailyMissions()` のシャッフル処理のみ

### COLOR-VAR
- **内容**: `#1a1a2e`（27箇所）・`#0d0d18`（12箇所）がインラインstyleとCSSクラスに散在
- **修正**: `:root` に `--surface-deep` / `--surface-base` を追加し計39箇所を置換
- **影響範囲**: CSS定義追加のみ。レンダリング結果は変わらない

---

## ✅ 修正済み（S52）

### SHRINE-EXPAND
- **内容**: 祠マスのイベントが解呪・小バフのみで単調だった
- **修正**: SHRINE_EVENTSテーブル（11種・重み付き抽選）に刷新。`handleShrine()` を全面改修
- **影響範囲**: `handleShrine()` のみ。既存の呪い装備時フロー（openShrineModal）は維持

### DAILY-FEEDBACK
- **内容**: デイリーミッション達成時の進捗がサイレント更新のみでフィードバック不足
- **修正**: `checkDailyMissions()` に達成瞬間検出を追加。`showDailyToast()` で緑トースト表示
- **影響範囲**: `checkDailyMissions()` のmap処理内のみ。クレームフローは変更なし

### AUTORUN-RESULT
- **内容**: 周回リザルトに獲得Goldと経過時間が表示されず放置の手応えが薄かった
- **修正**: `startAutoRun()` に `startAt` 記録追加。`stopAutoRun()` で `autoRunEarnedGold` / `autoRunElapsedSec` を計算し session に追加。`showDungeonResult()` の周回ブロックを拡充
- **影響範囲**: 周回モード停止フローのみ。通常探索リザルトには影響なし

### DEMAND-UI
- **内容**: 棚の需要表示が `需要N%` テキストのみで低需要に気づきにくかった
- **修正**: 4段階バッジ（🔥旺盛/📈上昇/📊中程度/⚠低下）に置換。`shelvesHtml` と `updateShopTick` の両箇所を統一
- **影響範囲**: ショップタブの棚表示のみ。需要値計算ロジックは変更なし

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
| 未変数化カラー（アルファ付き） | `#3498db44`/`#9b59b644`/`#27ae6044` の3箇所。`color-mix()` 未使用環境でCSS変数+alpha非対応のためハードコード維持（S66確定） | 仕様・クローズ済み |
| RARITY_MASTER / SHELF_CATEGORY color フィールド | JS実行環境でCSS変数未解決のためハードコード維持 | 仕様 |
| Analytics データがローカル端末のみ | localStorage のため複数端末間で集計不可 | 仕様（個人開発の制約） |
