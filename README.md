---
title: BMD Landing Page
description: BMD bookmarkdown 多語系落地頁的開發、驗證與 Cloudflare 部署指南
---

## 專案

BMD・bookmarkdown 的英文優先落地頁，支援繁體中文與簡體中文。
採用 Vite、原生 JavaScript 與 Lucide，
不需要資料庫、React 或外部 Agent API。

預設部署至 Cloudflare Workers Static Assets，也可使用 Cloudflare Pages。
兩者共用同一份 `dist/`，選擇一種部署即可。
正式入口是 [index.html](index.html)，網站根網址 `/` 會提供此頁面。

## 本機開發

需求：Node.js 22.12 以上、pnpm 10。

```bash
pnpm install
pnpm dev
```

開啟 <http://localhost:5173/>。若 5173 已被使用，可指定其他埠號：

```bash
pnpm dev --port 5174
```

使用實際 Workers runtime 預覽正式產物：

```bash
pnpm preview
```

開啟 <http://localhost:8787/>。
若 8787 已被使用，先建置再指定其他埠號：

```bash
pnpm build
pnpm exec wrangler dev --port 8786 --inspector-port 9230
```

同時啟動多個 Wrangler 服務時，HTTP 與 inspector 埠號都必須不同。

## 語言

導覽列保留自動、English、繁體中文與簡體中文選項，切換不會重設書籤互動。
選擇順序為網址 `lang` 參數、已儲存的手動選擇、瀏覽器語言，最後回退至英文。
手動選擇使用 `localStorage` 記憶；選擇自動會清除偏好。

* `?lang=en`、`?lang=zh-Hant`、`?lang=zh-Hans` 指定語言
* `?lang=auto` 忽略已儲存偏好，依瀏覽器語言選擇
* `zh-TW`、`zh-HK`、`zh-MO` 對應繁體；`zh-CN`、`zh-SG`、`zh` 對應簡體

HTML 與無 JavaScript 的內容預設英文，翻譯及中繼資料更新在瀏覽器執行。

## 專案結構

```text
index.html                      正式首頁
src/main.js                     搜尋、篩選、標籤與導覽互動
src/i18n.js                     語言選擇與三語文案
src/styles/tokens.css           設計 tokens
src/styles/landing.css          響應式版面與元件樣式
src/worker.js                   Workers 首頁路由與安全標頭
public/                         favicon、分享圖片、爬蟲與 Pages 路由規則
wrangler.jsonc                  Workers 部署設定
cloudflare/pages/wrangler.jsonc Pages 獨立部署設定
vite.config.js                  開發路由與正式建置入口
tests/                          語系、Worker 路由與瀏覽器測試
.agents/skills/                 已安裝的 Astro skills，目前未進行框架遷移
dist/                           建置產物，不加入 Git
```

## 部署至 Workers

本機首次部署時登入 Cloudflare，登入流程在瀏覽器完成：

```bash
pnpm exec wrangler login
pnpm run deploy
```

`pnpm run deploy` 會先建置，再根據 [wrangler.jsonc](wrangler.jsonc) 上傳 Worker 與靜態資產。
名稱預設為 `bmd-landing-page`，Wrangler 完成後會顯示實際的 `workers.dev` 網址。
若帳號有多個 account，請依 Wrangler 提示選擇，或自行設定 `account_id`。

不要使用 `pnpm deploy`，那是 pnpm 自己的部署指令；此專案必須使用 `pnpm run deploy`。

從 Cloudflare Dashboard 連接 Git 時：

| 設定 | 值 |
| --- | --- |
| 專案根目錄 | 儲存庫根目錄 |
| Build command | `pnpm build` |
| Deploy command | `pnpm exec wrangler deploy` |
| Wrangler configuration | 根目錄的 `wrangler.jsonc` |

在 Workers & Pages 的專案設定中加入自訂網域，不需要先把網域寫死在程式內。
標準首頁由資產處理器提供；Worker 將相容路由 `/landing`、`/landing.html` 重寫為 `/`，保留查詢參數。
使用標準 HTML 路由處理；未知路由回傳 404，不使用 SPA fallback。

## 部署至 Pages

Pages 專案使用獨立設定目錄，避免讀到根目錄的 Worker `main` 設定。
Wrangler Pages 不支援自訂 `--config` 檔名，因此透過 `--cwd` 載入標準設定檔。

```bash
pnpm exec wrangler login
pnpm exec wrangler pages project create bmd-landing-page --production-branch main
pnpm run deploy:pages
```

如果 Pages 專案已存在，略過 `project create`。
Pages 設定中的 `name` 必須與現有專案名稱一致。
部署成功後，Wrangler 會顯示實際的 `pages.dev` 網址。

Git 整合請使用以下設定：

| 設定 | 值 |
| --- | --- |
| Framework preset | None |
| 專案根目錄 | 儲存庫根目錄 |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Node.js | 22.12 以上 |

Pages Git 整合只需建置並發布 `dist/`，不需執行 Worker 的 deploy command。
Pages 直接提供標準首頁；[相容路由](public/_redirects) 將舊網址轉址至 `/`，保留查詢參數。
[HTTP 標頭](public/_headers) 提供安全設定與首頁 canonical。

本機 Pages 預覽：

```bash
pnpm build
pnpm exec wrangler pages dev --cwd cloudflare/pages --port 8789
```

## 互動展示

書籤搜尋可比對標題、網域與標籤；搜尋與分類篩選可以同時使用。
點擊標籤可移除，Agent 展示可新增或復原標籤；
復原只移除本次新增的標籤，不會還原其他手動變更。

Agent 是固定指令的本機展示，不會呼叫 AI、不讀取 Chrome 書籤、
不送出或保存個人資料，重新整理會還原示例。
導覽支援鍵盤、skip link、黏性導覽列位置校正與 reduced motion。

## 驗證

首次安裝 Chromium 後執行檢查：

```bash
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` 依序執行語系與 Worker 單元測試、正式建置與 Playwright。
若只執行 `pnpm test:e2e`，請先執行 `pnpm build`。
瀏覽器測試會自行啟動並關閉 8788 的 Workers 與 8789 的 Pages 服務，
這兩個埠必須未被其他程式占用。

測試涵蓋語系優先順序、手動切換與偏好記憶、搜尋、分類、空結果、loading、新增與復原、手動變更保留、
鍵盤焦點、Workers / Pages 路由、部署資產與無 JavaScript 的基本內容。
尺寸矩陣為 360、390、430、600、820、1024、1366、1440、1920px，
三種語言皆檢查橫向溢出與文字容器，截圖輸出至 `test-results/`。

## 正式上線

* 綁定正式網域後，將 [index.html](index.html) 的 `og:image` 改為該網域的完整 HTTPS 網址，並加入 `og:url`
* 分享圖片是實際產品預覽的截圖，位於 [public/og-bmd.png](public/og-bmd.png)
* HTTP `Link: </>; rel="canonical"` 指向目前網域首頁；若網站改為子路徑，需同步修改路由與 canonical
* CI 使用 Cloudflare 官方環境變數 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`
* 憑證只放在 CI secret，不提交至 Git
* 部署前執行 `pnpm check`；此專案不預設任何正式帳號、網域或 Cloudflare 憑證
