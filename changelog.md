# 深淵商会 — 変更履歴

---

## [S50] 2026-03-29

### Added

#### A1-OGP: ogp.png作成 + summary_large_image化
- `ogp.png`（1280×640px）を新規作成・リポジトリに追加
  - デザイン：黒背景グラデーション / ⚔アイコン / 「深淵商会」ゴールドタイトル / 紫サブタイトル / CTAバッジ
- `index.html` headタグのOGPメタタグを以下の通り変更（JS/CSS変更ゼロ）
  - `twitter:card` : `summary` → `summary_large_image`
  - `og:image` / `og:image:width` / `og:image:height` / `twitter:image` を新規追加
  - コメントを `S49-OGP / A1更新: summary_large_image化` に更新
- 効果：X（Twitter）シェア時にテキストのみ→大型画像カード表示に昇格。SNS流入率改善期待。

---

## [S49] 2026-03-29

### Added

#### S49-SHARE: X（Twitter）SNS共有ボタン
- `buildShareText(type, payload)` — タイプ別シェアテキスト生成（boss / rebirth / legendary）
- `openShareDialog(type, payload)` — X投稿ウィンドウを開く（noopener,noreferrer）
- `_showLegendaryShareModal(item)` — legendary販売専用シェアモーダル（バナーはpointer-events:noneのため独立実装）
- 挿入箇所：showBossResult（続けるボタン下）/ _showRebirthMilestoneModal（深淵へ戻るボタン上）/ notifySale legendary分岐（setTimeout 1000ms後）
- URL生成：hash・queryを除去。file://ローカルURLは空文字に置換しURLなしで投稿

#### S49-ACH: 実績解除トースト通知
- `showAchievementToast(id)` / `_processAchToastQueue()` / `_dismissAchToast(toast)` を新規追加
- CSS `.ach-toast` / `.ach-toast.visible` — bottom:-120px → bottom:140px スライドアップ
- キュー上限3件（totalInFlight判定）/ 表示4500ms / タップで実績モーダルを開く
- retroCheckAchievements（起動時サイレント付与）ではトーストを出さない
- ※ HANDOVER.md S48記載の「S48-ACH実装済み」は誤記。S49で初実装。

#### S49-D1: タブタイトル変更フック（D1継続率改善）
- `_initTabTitleHook()` — init()末尾から呼び出し
- visibilitychangeでタブ離脱時に次の売却残り時間をブラウザタブタイトルに表示
- `shelves.filter(s => s && s.item)` — item:null棚設定済み枠を正しく除外（filter(Boolean)バグ修正）
- 時間表示にMath.floorを使用（Math.ceilだと61秒が「約2分後」になる誤表示を修正）

#### S49-BOSS-REVEAL: ボスマス段階的フェードイン
- bossCellクラス付与を ahead <= 2 のみに変更（遠方での赤枠漏れを防止）
- 距離別表示：ahead > 5 = ? / ahead === 5 = opacity:0.2 / ahead 3〜4 = opacity:0.5 / ahead <= 2 = フル表示
- 仕様変更：spec.md「ボスマス | 常に💀表示」→「距離に応じた段階表示」

#### S49-OGP: OGPメタタグ + SVG favicon
- headタグに追加（既存JS/CSS変更ゼロ）
- favicon: SVG dataURI ⚔（追加ファイル不要・主要ブラウザ対応）
- OGPタグ: og:type / og:url / og:title / og:description / og:locale
- Twitterカード: twitter:card=summary（画像なし版）
- og:url: https://men0tai0ko.github.io/deeptrade/

### Fixed (S49)

- S49-B1: `doBossAttack()` に `const c = gs.dungeon.combat` が未宣言だったReferenceErrorを修正。7〜10Fボスのデバフスキル発動時にクラッシュ（S47起因）
- S49-B2: `_showLegendaryShareModal` のガード条件に `.lvup-overlay` / `.boss-intro-overlay` を追加。LvUp演出中に重なる問題を修正
- S49-B3: `_showLegendaryShareModal` に `currentTab !== "shop"` チェックを追加。1秒遅延中のタブ切替後に不正表示される問題を修正
- S49-B4: `buildShareText` で `#hash` が除去されない問題と `file://` URLが混入する問題を修正
- S49-B5: ボス撃破モーダルのシェアボタンを「続ける」ボタンの下に移動。誤タップ防止のためopacity:0.85・font-size:12pxに変更

---

## [S48] 2026-03-28

### Added

#### S48-GUIDE: 初回起動ファーストガイド
- 新規プレイヤーにのみ表示する3ステップモーダル（`showFirstGuideModal`）
- `gs.meta.isFirstPlay: true` で初回判定。完読/スキップで `false` に更新・saveGame
- `loadGame()` マイグレーションに `isFirstPlay` 補完を追加

#### S48-HINT: 帰還後「次の一手」ヒントUI
- 帰還リザルト「閉じる」押下後に冒険タブ最上部へヒントを1件表示（8秒で自動消去）
- `calcNextAction()` が状態を判定：未鑑定→鑑定 / 空き棚→出品 / CP不足→強化 / 傭兵代不足→待機 / デフォルト→潜入
- タップで対応タブへ遷移

#### S48-ANALYTICS: プレイヤー行動計測モジュール
- `localStorage["shinentrade_analytics"]` に独立保存（ゲームセーブと完全分離）
- 計測イベント7種：init / guideCompleted / guideSkipped / firstEnter / firstReturn / firstSale / tick
- 全関数を try-catch で保護

#### S48-SAVEDATA: セーブデータ エクスポート/インポート
- ステータスタブ iconDock に「💾 データ」ボタンを追加
- エクスポート：クリップボードコピー（navigator.clipboard → execCommand フォールバック）
- インポート：JSON検証 → 確認モーダル → location.reload()
- ダンジョン中はインポート無効化

#### S48-SALE: 売却快感システム
- `notifySale(item, finalPrice)` を追加。checkShopSales / checkRegularVisits(2箇所) / checkBlackmarket から呼び出し
- 演出：rare=青バナー(2s) / epic=紫バナー(3s) / legendary=橙バナー(4s)+全画面フラッシュ+触覚
- topBar goldDisplay に `id="goldValue"` 追加。1000G以上の売却でカウントアップアニメ
- ショップタブ以外で rare 以上が売れるとタブにバッジ点滅。タブ切替でクリア
- ボス演出中・LvUP演出中はバナーを抑制

### Fixed (S48)

- S48-B1: `calcNextAction` の未鑑定品遷移先 `"loot"` → `"inventory"` に修正（帰還後ガード対策）
- S48-B2: `makeNextActionHintEl` で `hint.action()` 後の重複 `render()` を削除
- S48-B3: `openSaveDataModal` の mc.innerHTML 全リセット問題 → `_showMsg()` 差分更新に変更
- S48-B4: `exportData` の innerHTML 直接展開（XSS）→ `textContent` 設定に変更
- S48-B5: `confirmOverlay` に背景クリック閉じる処理を追加
- S48-B6: `_showSaleBanner` がボス演出・LvUP演出中も表示されていた → ガード追加
- S48-B7: 常連購入・裏取引に `notifySale` が未適用 → 3箇所に追加
- S48-B8: トーストが actionBar+iconDock の裏に隠れていた → `bottom: 90px → 142px`
- S48-B9: トーストタップ時にモーダルが二重表示されていた → タップ前に全クリア
- S48-B10: トーストのキュー上限チェックが処理中を含まない判定 → `totalInFlight` で修正

---

## [S47] 2026-03-24

### Added

- SET効果5種実装（void_set / specter_set / colossus_set / sovereign_set / will_set）
- 6〜10Fエネミー固有スキル深化（14種・specialSkill・激昂システム・9タイプ）
- ボス新スキル3種（healBlock / defDebuffPct / fearDebuff）
- 転生スキル「深淵の境地」5種（worldRank20解禁）

#### デザイン統一
- D-1: モーダル高さを全28箇所でmax-height:85vhに統一
- D-2/3: #ffcc44→var(--gold)（39件）/ #a78bfa→var(--accent2)（24件）
- D-3: color:#aaa / color:#888 → var(--muted)（計39件）
- D-4: 呪いシステム専用カラー変数を:rootに新設（--curse / --curse-border / --curse-bg）

### Fixed (S47)

- B-1: デバフ消費が isEvade=true 時に走らない → else外に移動
- B-2: void_setブロック時ボスのrage未加算 → rage×0.02追加
- B-3: openRebirthModal 重複テキスト削除
- B-4: B-1修正副作用で const ev 消失 → 復元
- A: boss.defDebuff が _bDef/_baseDef に未反映 → 両方に組み込み
- B: learnRebirthSkill が unlockRank を無視 → ガード追加
- C: leaveDungeon でタイマーリーク → 冒頭で stopAutoRun() 追加
