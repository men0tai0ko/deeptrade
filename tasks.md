# 深淵商会 — タスク・進捗管理

**バージョン**: S55
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

