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
| 規模 | 約16,200行 |

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

**S63**（2026-04-07 時点）

### 直近の主な変更（S62/S63）
- CSS変数統一完了（`--rare` / `--epic` / `--green` 残存ハードコード18箇所を変数化）
- `calcNextAction()` 疲弊ヒント優先順序修正（棚出品より先に疲弊を表示）
- ドキュメント整備（issues.md / tasks.md / HANDOVER.md を S63 対応に更新）

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
