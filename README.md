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

### 接続先の設定

接続先は [`src/infrastructure/env.ts`](src/infrastructure/env.ts) に集約しています。
既定は `wss://d-party.net`。ローカルバックエンドへ向ける場合は `BACKEND_HOST` を
`localhost/`、`BACKEND_PROTOCOL` を `http://`、`WEBSOCKET_PROTOCOL` を `ws://` に変更します。

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

## ライセンス

MIT License
