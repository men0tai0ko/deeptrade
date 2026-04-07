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

