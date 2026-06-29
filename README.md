# d-party Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/d-party/d-party-Chrome-Extensions/blob/main/LICENSE)

dアニメストアで『同時視聴』を実現する d-party の Chrome 拡張機能（Manifest V3 / TypeScript）。

## スタック

Manifest V3 · TypeScript · pnpm · rspack · React 18 + shadcn/ui（Tailwind CSS v4）·
Storybook · ESLint · Prettier · orval（型安全な REST クライアント）。
クリーンアーキテクチャで構成しています。詳細は [AGENTS.md](AGENTS.md) を参照。

## 開発

本拡張機能の動作検証にはバックエンドが必要です。
[d-party-Backend](https://github.com/d-party/d-party-Backend) を起動してください。

```bash
pnpm install
pnpm api:generate     # orval で REST クライアント生成
pnpm build            # dist/ を生成
pnpm dev              # ファイル監視ビルド
pnpm typecheck
pnpm lint
pnpm storybook        # UI コンポーネントカタログ
```

`pnpm build` 後、`chrome://extensions` →「パッケージ化されていない拡張機能を読み込む」で
`dist/` を選択します。

### Storybook

UI コンポーネントのカタログを Storybook で公開しています（`main` へのマージ時に GitHub Pages へ自動デプロイ）。

- 公開先: <https://d-party.github.io/chrome-extension/>
- ローカル: `pnpm storybook`（http://localhost:6006）

### 接続先の設定

接続先は [`src/infrastructure/env.ts`](src/infrastructure/env.ts) に集約しています。
既定は `wss://d-party.net`（本番）。ローカルバックエンドへ向ける場合は `BACKEND_HOST` を
`localhost/`、`BACKEND_PROTOCOL` を `http://`、`WEBSOCKET_PROTOCOL` を `ws://` に変更します。

> monorepo のローカル開発スタック（ルートで `docker compose up`）は **dev モード**で
> http / ws・`localhost` 配信、本番は https / wss・`d-party.net` 配信です（env の出し分けは
> ルート README の「環境設定」を参照）。なお dアニメストア実ページから `localhost`
> バックエンドへ繋ぐ際は Chrome の Private Network Access を無効化する必要があります
> （手順は [d-party-Backend の README](https://github.com/d-party/d-party-Backend#chrome-拡張機能からローカルバックエンドへ接続する-pna-の無効化)）。

## ディレクトリ構成

```
src/
  domain/          型（WebSocket プロトコル＝バックエンド streamer/format.py と一致）
  application/     ユースケース（RoomSession 同期ロジック）・ポート
  infrastructure/  WebSocket / chrome.storage / 通知 / orval API クライアント
  presentation/    background・content scripts・popup(React+shadcn)
  components/ui/   shadcn コンポーネント
public/            manifest.json・popup.html・css・icon・images・assets
```

## リアクション素材（サードパーティ）

リアクションのアニメーションは **Google Noto Emoji**（[noto-emoji-animation](https://googlefonts.github.io/noto-emoji-animation/)）の Lottie を使用しています。ライセンスは **Apache License 2.0**。

- デフォルトリアクション（5 種）と、エクストラリアクションのカタログ（最大 100 種、肌色は黄色のみ）の Lottie を `src/presentation/content/party/react/reactions/lottie/`（`extra/` 配下にエクストラ）へ同梱しています。
- 静的アイコン（ピッカー／プレイヤーのバー）は [react-icons](https://react-icons.github.io/react-icons/) を使用します。
- **注意**: エクストラ 100 種を `content-party` バンドルへ静的 import するため、当該バンドルは数 MB 増加します（オフラインで動作する代わりにサイズが大きい）。将来的には id ごとの動的 import チャンク化＋`web_accessible_resources` による遅延読み込みで縮小できます。

## ライセンス

MIT License
