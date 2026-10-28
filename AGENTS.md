# 项目迭代约定

- 修改 UI 前先阅读 `UI_STYLE_GUIDE.md`，沿用其中的布局、IP 使用和交互约定。
- 设计变量统一维护在 `packages/common/theme.js`，Material UI 映射位于 `packages/common/withTheme.js`。
- 优先改核心页面；不要为了接近参考图添加无功能的按钮、虚构数据或无关新模块。
- 品牌图片必须使用用户提供的实际源文件；不要用重画图冒充原图，不要运行旧素材生成器覆盖新图。
- 保留未提交的现有修改、数据模型和业务流程。界面文案通过现有 i18next 接入。
