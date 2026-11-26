# 上传到 GitHub 指引

本包 = 完整源码（v2.0.0 提交快照）+ 三个安装包（release/ 目录）+ 本指引。
目标仓库：https://github.com/s15224207965-ai/picktranslator （已通过 API 创建；若推送未成功则为空仓库）。

## 方式一：网页上传（不需要 git 网络推送）

1. 打开仓库页 → Add file → Upload files。
2. 把本包中**除 release/ 以外**的全部文件/文件夹拖进去（src、resources、buildResources、package.json、package-lock.json、tsconfig.json、electron-builder.yml、esbuild.mjs、README.md、LICENSE、.gitignore），commit 到 main。
   - 网页单文件上限 25MB，源码均远小于此；安装包不要走这里。
3. 仓库页 → Releases → Draft a new release：
   - Tag：`v2.0.0`（新建），Target：main；
   - 标题：`PickTranslator v2.0.0`；
   - 附件拖入 release/ 下三个文件：
     - PickTranslator-2.0.0-universal.dmg（macOS）
     - PickTranslator-Setup-2.0.0.exe（Windows 安装版）
     - PickTranslator-2.0.0-portable.exe（Windows 便携版）
   - 描述可直接用 README 的「功能 / 安装 / 已知限制」章节；Publish release。
   - Release 附件单文件上限 2GB，三个包均符合。

## 方式二：git 推送（换到能连 GitHub 的网络时）

```bash
cd PickTranslator          # 本包解压目录（已是完整工作树内容，但无 .git）
git init -b main
git add -A
git commit -m "PickTranslator v2.0.0"
git remote add origin https://github.com/s15224207965-ai/picktranslator.git
git push -u origin main
# 安装包仍建议走 Release 附件（仓库不放二进制）：
# gh release create v2.0.0 release/*.dmg release/*.exe --title "PickTranslator v2.0.0"
```

若提示仓库已有提交（非空），先 `git pull --rebase origin main` 或改用方式一核对内容。

## 包内不含（有意排除）

- `legacy-swift/`：早期 Swift 实现留档，含作者个人翻译规则，仅保留在作者本机，不公开。
- `node_modules/`、`dist/`、`build/`：依赖与中间产物，`npm install && npm run build` 可复现。
- 任何 API Key / 个人场景配置：Key 存系统钥匙串，场景配置在用户数据目录，均不随包分发。

## 本地复现构建

```bash
npm install
npm start          # 开发运行
npm run pack:mac   # macOS universal DMG
npm run pack:win   # Windows 安装版 + 便携版（可跨平台打包）
```