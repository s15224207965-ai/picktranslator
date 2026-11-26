# PickTranslator

跨平台划词翻译工具（macOS / Windows）：在任意应用中选中文字，按 **⌥D（macOS）/ Alt+D（Windows）**，鼠标旁即弹出浮窗流式显示译文。托盘常驻，支持多模型平台与完全可自定义的翻译场景。

A cross-platform pick-to-translate tray app for macOS and Windows. Select text anywhere, press **⌥D / Alt+D**, and get a streaming translation in a floating panel. Multi-provider, fully customizable translation scenarios.

## 功能

- **系统级取词**
  - macOS：经系统 System Events 读取选中文本（Accessibility），读不到时自动模拟 Cmd+C 兜底并恢复原剪贴板。
  - Windows：经 UI Automation 读取选中文本，读不到时自动模拟 Ctrl+C 兜底并恢复原剪贴板。
  - 浏览器、PDF、编辑器、终端等大多数应用均可用。
- **多模型平台**：内置阿里云百炼、OpenAI、DeepSeek、Kimi（Moonshot）预设，另支持任意 OpenAI 兼容接口（含本地服务）。API Key 经系统级加密存储（macOS 钥匙串 / Windows DPAPI）。
- **可自定义场景**：内置英译中 / 中译英 / 润色 / 摘要四个通用场景，提示词全部可编辑、可恢复默认；可新增你自己的场景（名称 + 规则），浮窗与托盘菜单随时切换。
- **流式输出**：译文逐字呈现，支持选中复制、一键复制、Esc 或点击窗外关闭。
- **跨平台产物**：macOS universal（Apple Silicon + Intel）DMG；Windows x64 安装版 + 免安装便携版。

## 安装

从 [Releases](../../releases) 下载对应产物：

| 平台 | 产物 | 说明 |
| --- | --- | --- |
| macOS | `PickTranslator-x.y.z-universal.dmg` | 打开后拖入 Applications |
| Windows | `PickTranslator Setup x.y.z.exe` | 安装版，可选安装目录 |
| Windows | `PickTranslator-x.y.z-portable.exe` | 免安装，双击即用 |

**macOS 首次打开**：应用未做 Apple 公证，若提示「无法验证开发者」，右键点击应用 → 打开；或终端执行：

```bash
xattr -dr com.apple.quarantine /Applications/PickTranslator.app
```

**Windows 首次打开**：应用未做代码签名，SmartScreen 可能提示「已保护你的电脑」→ 点「更多信息」→「仍要运行」。

**macOS 授权**：首次取词时系统会弹出授权弹窗（辅助功能 / 自动化，允许控制 System Events），请点允许。若曾拒绝：系统设置 → 隐私与安全性 → 辅助功能 与 自动化，勾选 PickTranslator 后重启应用。

**Windows 授权**：无需额外授权。注意：以管理员身份运行的应用窗口可能无法取词（系统会话隔离限制）。

## 使用

1. 启动后按引导选择平台、填写 API Key（可点「测试连接」验证），保存。
2. 在任意应用选中文字，按 **⌥D / Alt+D**。
3. 浮窗内可切换场景重译、复制译文；Esc 或点击窗外关闭。
4. 托盘菜单：取词翻译、翻译剪贴板、场景切换、设置、退出。

## 自定义场景

设置 → 场景与规则：

- 选中任一内置场景可直接修改其提示词，「恢复默认」可还原；
- 「新增场景」创建你自己的翻译规则（例如特定行业的术语表、文体要求），保存后出现在浮窗下拉与托盘菜单中。

场景配置保存在用户数据目录下的 `modes.json`（macOS：`~/Library/Application Support/picktranslator/`；Windows：`%APPDATA%/picktranslator/`），可备份或分享。从旧版 Swift 实现（`legacy-swift/`）升级时会自动迁移已有场景。

## 从源码构建

需要 Node.js 20+。

```bash
npm install
npm start          # 开发运行（macOS / Windows 本机）
npm run pack:mac   # 打包 macOS universal DMG
npm run pack:win   # 打包 Windows 安装版 + 便携版（可在 macOS 上交叉打包）
```

## 隐私

- API Key 仅存于本机系统级加密存储（macOS 钥匙串 / Windows DPAPI），不写入明文配置。
- 选中文本只发送给你在设置中选择的模型平台，应用本身不收集、不上传任何数据。

## 已知限制

- Windows 取词链路（UI Automation / SendKeys）尚未经过大规模真机验证，欢迎提 issue 反馈具体应用与现象。
- 部分自绘界面应用（如某些游戏、远程桌面）可能无法取词，可用「翻译剪贴板」兜底。
- 未公证 / 未签名分发，首次打开需按上文绕过系统提示；如需消除提示可自行签名公证。

## 致谢

取词与提示词组织机制受 [nextai-translator](https://github.com/nextai-translator/nextai-translator)（AGPL-3.0）启发。本项目为独立实现的原创代码，未包含该项目的任何代码或素材。早期 macOS 原生 Swift 实现由作者本地留档，不随本仓库分发；从该版本升级时会自动迁移已有场景配置。

## License

[MIT](LICENSE)