# 深淵商会

**冒険 × 放置ショップ × すごろくダンジョン — 放置型ループRPG**

🎮 **プレイ**: https://men0tai0ko.github.io/deeptrade/

---

## ゲーム概要

ダンジョンを潜って装備を集め、ショップで売って強くなる。転生を重ねるほど深まる放置型ループRPG。

```
潜入 → 探索・戦闘 → 帰還 → 鑑定・出品 → 放置販売 → 資金獲得 → 次の潜入
```

## 技術スタック

| 項目 | 内容 |
|---|---|
| 言語 | HTML / CSS / Vanilla JavaScript |
| 構成 | 単一ファイル（index.html）+ manifest.json + sw.js |
| データ保存 | localStorage |
| ホスティング | GitHub Pages |
| 規模 | 約17,468行 |

## ファイル構成

```
index.html      ← ゲーム本体（CSS・HTML・JS すべて含む）
manifest.json   ← PWA定義
sw.js           ← ServiceWorker（Cache First）
ogp.png         ← OGP画像（1280×640px）
```

## ドキュメント構成

| ファイル | 役割 |
|---|---|
| `README.md` | 本ファイル。概要・入口 |
| `HANDOVER.md` | 開発引き継ぎ用。現在の状態・gameState構造・主要関数 |
| `spec.md` | ゲームプレイ仕様。機能・挙動の確定情報 |
| `arch.md` | 技術アーキテクチャ。システム構造・データフロー |
| `items.md` | アイテム・敵・ボスのデータ一覧 |
| `balance.md` | バランス設計。ダメージ計算式・確率・数値根拠 |
| `tasks.md` | 開発タスク・進捗管理 |
| `issues.md` | バグ・既知問題の一覧 |

## 現在のバージョン

**S118**（2026-04-08 時点）

### 直近の主な変更（S100〜S113）
- 格納庫・一括モーダルに名前順ソートを追加（S100）
- コレクション全テーマ達成でフルコンプ祝福モーダルを表示（S101）
- フルコンプ時 売値+3%ボーナス・棚に🏆バッジ表示（S103/S107）
- ボス戦特化スキル「討魔の心得」追加（+15%・S108）
- **常連客注文バッジをタップで出品モーダルへ直接連携（S109〜S111）**
- 注文品出品時のショップログ・出品済みバッジ・在庫なしヒント追加（S110〜S111）
- 注文タイムアウト時のモーダル即時更新修正（S113）
- 注文バッジに残り時間カウントダウン表示・30秒自動更新（S115〜S116）
- **常連注文UX全体の完成（S109〜S116）**

→ 詳細は [tasks.md](tasks.md) / [issues.md](issues.md) を参照

## 開発ガイド

### セットアップ
```bash
# リポジトリをクローンしてindex.htmlをブラウザで開くだけで動作
git clone https://github.com/men0tai0ko/deeptrade.git
open index.html
```

### デプロイ
```bash
git add index.html
git commit -m "feat: ..."
git push origin main
# GitHub Pagesに自動反映（数十秒）
```

### Analytics確認（コンソール）
```javascript
_analyticsReport()  // 初回ループファネルをconsole.tableで表示
```

### セーブデータ操作（コンソール）
```javascript
// リセット
localStorage.removeItem("shinentrade_v1"); location.reload();

// デイリーリセットテスト
gs.meta.dailyResetAt = 0; saveGame();
```
