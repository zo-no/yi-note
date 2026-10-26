# Chrome Manifest V3 迁移说明

本次将 **Chromium 构建迁移为 Manifest V3，Firefox 构建保留 Manifest V2**。没有重写 React UI，也没有添加 B 站专用适配。当前 Chromium 清单要求 Chrome 116+，因为离屏文档查重使用了 `chrome.runtime.getContexts()`。

## 1. 先理解运行环境变化

```text
点击扩展图标
    ↓
Chrome 唤醒 background.js Service Worker
    ↓ tabs.sendMessage
网页里的 content.js → React 笔记面板 → HTML5 video
    │                         │
    │                         └→ browser.storage.local 持久化
    │
    ├→ runtime.sendMessage → 后台打开 options.html
    └→ 复制请求 → 后台 → offscreen.html 的 DOM
```

内容脚本和 options 页面仍然有 `window`、`document`，React UI 可以继续工作。**只有 Chromium 的后台环境变成了 Service Worker**，不能把所有前端 DOM 操作一并删掉。

## 2. 清单不是只把 2 改成 3

对应文件：`packages/extension/manifest.common.json`、`packages/extension/manifest.js`。

| MV2 | 本次 Chromium MV3 实现 |
| --- | --- |
| `manifest_version: 2` | `manifest_version: 3` |
| `browser_action` | `action` |
| `background.scripts` + `persistent` | `background.service_worker: "background.js"` |
| URL 权限放在 `permissions` | 拆分为 `permissions` 和 `host_permissions` |
| `web_accessible_resources` 字符串数组 | 带 `resources`、`matches` 的对象数组 |
| CSP 字符串 | `content_security_policy.extension_pages` |

`manifest.js` 为每次构建深拷贝清单，再生成 Firefox MV2 对应结构，防止一种浏览器的配置污染另一种。

### 权限说明

- `storage`、`unlimitedStorage`：保留原有本地笔记存储。
- `identity`：保留已有第三方 OAuth 能力。
- `clipboardWrite`、`offscreen`：后台复制链接需要离屏文档。
- `downloads`：旧版数据迁移先下载 JSON 备份；Firefox 也用它处理原有文件导出。
- `host_permissions`：沿用通用视频扩展的 HTTP、HTTPS 和 file 范围，支持扩展上下文的跨域访问。内容脚本的注入范围仍由 `content_scripts.matches` 声明；两者不是同一件事。

站点访问范围较广，Chrome 会相应提示权限。若只计划支持 B 站，后续应同时缩小注入范围、主机权限和资源公开范围，并保留确实需要的 OAuth/API 域名。`file://` 仍需用户在扩展详情手动开启“允许访问文件网址”。

## 3. Service Worker 没有 DOM，而且会休眠

对应文件：`packages/extension/src/background/index.js`。

- 使用 `browser.action || browser.browserAction`，兼容两个构建目标。
- 在模块顶层同步注册 `onClicked`、`onMessage`、`onInstalled`，确保每次 worker 被唤醒都能接收事件。
- 后台使用全局 `setTimeout`，不再使用 `window.setTimeout`。
- 不把内存变量当持久化存储；笔记依然保存在 `browser.storage.local`，此次没有修改现有 1.x 页面 ID 和笔记结构。
- 不靠长连接或心跳阻止 worker 休眠。

原先内容页把 `runtime.connect()` 的 `onDisconnect` 当成“扩展已更新”，在 MV3 中会把正常后台生命周期误判为故障。本次移除这条长连接，复用已有 URL 检查定时器读取 `browser.runtime.id`，仅在扩展上下文真正失效时显示刷新提示，不发送定时探活消息。

**普通延迟与持久调度不同：**打开设置页时的短暂重试可以使用 `setTimeout`；需要跨休眠保证执行的长期任务，应使用 `chrome.alarms` 并持久化进度，本次没有引入这类任务。

## 4. 把后台剪贴板 DOM 操作移到 Offscreen Document

对应文件：

- `packages/extension/src/background/clipboard.js`
- `packages/extension/src/offscreen/offscreen.html`
- `packages/extension/src/offscreen/offscreen.js`

MV2 后台曾直接创建 textarea 并调用 `document.execCommand('copy')`。Worker 中没有 `document`，因此 Chromium 分支改为：

1. `getContexts()` 查询离屏文档是否存在，worker 重启后也能发现既有文档。
2. 没有时调用 `chrome.offscreen.createDocument()`，理由为 `CLIPBOARD`。
3. 并发复制共享同一个创建 Promise，避免重复创建。
4. 后台发送带 `target: 'offscreen'` 的消息。
5. 离屏页完成复制并返回成功/错误；拒绝来自网页 content script 的直接请求，复制结束清空 textarea。

离屏页是随扩展打包的本地 HTML，不是打开给用户看的标签页，也不是新的常驻后台。它只处理剪贴板，按需创建后复用，不发送保活消息。由于离屏文档不能正常获得焦点，此处保留 `execCommand('copy')`，而非直接替换成依赖焦点的 `navigator.clipboard.writeText()`。

现有 vendored `webextension-polyfill` 较旧，不认识 `offscreen` 等新 API。本次对这些新 API 直接使用原生 `chrome.*` Promise 接口，其余代码保留原有 `browser.*`，没有盲目升级所有依赖。

## 5. 消息响应要形成闭环

对应文件：后台入口及 UI/options 的 `containers/App/index.js`。

- `return true` 只表示以后会调用 `sendResponse`，不是响应成功。
- 原来部分监听器返回 `true` 却一直不回应，容易留下未完成消息通道。
- 后台通过已有 polyfill 返回操作 Promise，让成功或异常传回调用者。
- UI 的 `togglePanel` 和 options 的导航消息同步返回 `sendResponse(true)`；组件卸载时移除监听器。
- 打开 options 页面后，后台等待明确的 `true` 确认，最多重试 10 次，避免 React 尚未挂载导致导航丢失。
- 不属于当前上下文的消息不回应，尤其后台不能抢答发给 offscreen 的消息。

不要把所有监听器都无条件写成 `async`：这会为不属于自己的消息也返回 Promise，可能抢走其他监听器的响应。

## 6. 下载和旧数据迁移必须避开 DOM 依赖

对应文件：`src/background/downloads.js`、`src/background/migrations/0.6.4.js`、`packages/common/services/file.js`。

**常规 Chrome 导出原本就走前端 `file-saver`，本次保留。** 不能将原先 Chrome 缺少 `downloads` 权限等同于“所有导出不可用”。Firefox 的 Blob 消息导出路径也保留，并等待下载结束后释放 Blob URL。

只有从历史 0.6.4 升级的迁移备份需要从后台下载：

- Worker 中没有 `FileReader` 或 `URL.createObjectURL()`，JSON 备份改为带版本信息的 data URL。
- 等待下载真正完成，而不是只等 `downloads.download()` 返回 ID。
- 避免从公共 `services/index.js` 聚合入口间接导入 PDF、文件和其他依赖 DOM 的库，改为直接导入所需存储模块。
- 先完成 local、sync 两份备份，再转换数据；转换全部完成后只删旧键，不再 `storage.clear()`。
- 旧笔记使用稳定 ID，让中断后再次调用迁移函数不会重复添加笔记。

这不是新的云同步或自动恢复框架。0.6.4 迁移仍只在对应版本的更新事件中触发；异常会记录日志，未转换完的旧数据保留，必要时需显式重新执行迁移。Worker 中断后的恢复机制不能仅靠一个内存 Promise。普通 1.7.x 用户不触发此历史迁移。

## 7. 构建、安全策略和目录变化

对应文件：`webpack.common.js`、`webpack.config.js`。

- 当前后台是 **classic service worker**，不是 ES module worker。构建时通过只作用于 `background.js` 的 banner，先 `importScripts('vendors/browser-polyfill.js')`，再执行打包后的后台代码。
- `globalObject` 使用 `globalThis`，避免 Webpack 运行时假设有 `window`。
- 基础输出哈希改用 SHA-256，并关闭生产构建的 `concatenateModules`：旧 Webpack 的模块合并会硬编码使用 MD4，不受 `output.hashFunction` 控制。这两项共同避开已发现的 Node 18/OpenSSL 3 哈希兼容问题；未升级整个旧工具链。
- 扩展页 CSP 限制脚本为本地 `'self'`，不加入 `unsafe-eval`；offscreen 脚本通过外部本地文件加载，没有内联 JS。
- 开发构建保留 `inline-source-map`，不改用需要 eval 的 devtool。
- 静态资源通过 CopyWebpackPlugin 复制；浏览器输出目录分开，避免 `yarn build:ext` 的 Firefox 构建覆盖 Chromium。

```text
packages/extension/dist/
├── chromium/     Chrome MV3，加载此目录
└── firefox/      Firefox MV2
artifactory/
├── yi-note-extension_chromium_1.7.0.zip
└── yi-note-extension_firefox_1.7.0.zip
```

所有可执行逻辑应随扩展打包，不能下载远程脚本绕过 MV3 的远程代码限制。打包成功也不等于通过 Chrome Web Store 审核；老旧第三方 SDK、OAuth 配置和商店政策仍需单独检查。

## 8. 构建、安装与测试

在仓库根目录执行（Yarn Classic 1.x，Node 18+）：

```sh
yarn install --frozen-lockfile
yarn workspace @yi-note/extension build:chromium
node --test packages/extension/tests/*.test.cjs
```

本仓库还包含 landing 等不参与扩展构建的工作区。仅准备扩展时，可使用 `yarn install --frozen-lockfile --ignore-scripts --non-interactive` 避开其他工作区原生依赖的安装脚本；不要据此认为 landing 等原生依赖也已可运行。

如果旧工具链仍报 `ERR_OSSL_EVP_UNSUPPORTED`，可暂时用下面的兼容选项运行构建（仅作为旧 Webpack 的过渡办法）：

```sh
NODE_OPTIONS=--openssl-legacy-provider yarn workspace @yi-note/extension build:chromium
```

Chrome 打开 `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择 `packages/extension/dist/chromium`。更新代码并重新构建后，先重新加载扩展，再刷新视频标签页。

**数据提醒：**卸载扩展会删除它的本地存储；不同扩展 ID 的开发版与商店版不共享笔记。迁移前先在旧版本导出 JSON，不要通过卸载重装验证数据兼容性。

### 自动测试覆盖

测试使用 Node 内置 `node:test` 和 VM，无需安装 npm 依赖：

- Chromium/Firefox 清单隔离及构建配置。
- 无 DOM 的后台启动、图标点击、options 导航重试及消息响应。
- Worker 休眠不再由 port 断开触发刷新提示，真正失效时只跳转一次。
- Offscreen 并发创建、重启复用、复制成功和失败传播。
- 下载完成竞态、中断、超时、Blob URL 清理。
- 旧数据迁移备份失败不改数据、各持久写入前后中断可重试。

这些是逻辑测试，**不替代 Webpack 完整构建和真实浏览器验收**。

### 浏览器手动验收清单

- [ ] 扩展加载无 manifest/CSP/Service Worker 注册错误。
- [ ] 打开普通 HTML5 视频页面，点击图标能展开/关闭面板。
- [ ] 新增时间戳笔记、点击跳转、刷新后笔记仍存在。
- [ ] 打开管理页、按标签筛选、跳到某条视频详情。
- [ ] 复制分享链接，实际粘贴确认内容。
- [ ] JSON/Markdown/PDF 导出和 JSON 导入。
- [ ] 关闭 worker DevTools，等待后台自然休眠后仍可操作；不能只在 DevTools 保活状态测试。
- [ ] 重载扩展后旧网页显示刷新提示，刷新后恢复。
- [ ] Firefox MV2 构建单独回归。
- [ ] Google Docs/OneNote/Evernote 使用实际 OAuth 配置单独验证。

### 本次验证记录

迁移逻辑测试通过；依赖安装在 Linking 阶段达到 180 秒工具时限而被终止，尚未完成。按用户要求，不再继续耗时的安装和浏览器自动验收，完整构建、Chrome 实机加载和 B 站验收由用户在本地执行。不能把源码迁移完成当作已经确认所有功能可用。

B 站仍走原有 HTML5 `<video>` 通用适配；本次不包含分 P、BV 号归一化、播放器重建等专项支持。
