# ⚖️ SAMR 反垄断案件数据库

> 自动采集、管理和检索全国市场监管总局（SAMR）反垄断执法案件的工具套件。

**当前版本**: v1.1.0 · **案件总量**: 5,000+ · **数据来源**: 6 个省级/中央网站

---

## 📋 功能概览

### 🖥️ 完整版（本地部署）

| 模块 | 功能 |
|---|---|
| **数据采集** | 自动抓取北京、上海、重庆、陕西、广东、总局 6 个来源的反垄断案件 |
| **附件管理** | 附件自动下载（.docx / .doc / .pdf）、去重、批量下载本页 |
| **搜索检索** | 全库关键词搜索、分页浏览、按分类筛选 |
| **案件预览** | 在线预览案件正文（Word → HTML 转换），无需先下载 |
| **数据导出** | 一键导出 CSV（Excel 兼容，UTF-8 BOM） |
| **阅读器** | 内置案件阅读器，支持 Word 文档在线渲染 |

### 🌐 公开版（GitHub Pages）

面向公众的移动端 H5 网页，通过微信公众号菜单访问。

| 功能 | 说明 |
|---|---|
| **统计看板** | 案件总数、三类案件分布、省份柱状图、最新更新日期 |
| **搜索筛选** | 按标题搜索、按省份/类别筛选、分页浏览 |
| **查看原文** | 点击案件卡片跳转至政府官网原始链接 |
| **数据安全** | 不含正文、附件、本地路径等敏感信息 |
| **自动部署** | push 到 main 后 GitHub Actions 自动构建 + 部署 |

🔗 **公开版地址**: [chenyuanxi1988.github.io/samr-viewer-public](https://chenyuanxi1988.github.io/samr-viewer-public/)

---

## 🏗️ 项目结构

```
samr-viewer-public/                      # 公开版 H5 前端
│   ├── index.html               # 移动端首页
│   ├── style.css                # 深色主题样式
│   ├── app.js                   # 搜索/筛选/统计逻辑
│   └── data/                    # 构建产物（自动生成）
│       ├── public_data.json     # 脱敏案件列表
│       └── stats.json           # 统计摘要
```

---

本仓库为**私有仓库**。公开版通过构建脚本自动脱敏：

---

## 🛠️ 技术栈

| 层级 | 技术 |
|---|---|
| 后端 | Python 3 · Flask · BeautifulSoup4 |
| 完整版前端 | HTML · CSS · Vanilla JS |
| 公开版前端 | 移动端 H5 · 深色主题 · 纯静态 |
| 数据存储 | JSON 文件 |
| 文档转换 | python-docx · mammoth（Word → HTML）|
| 部署 | GitHub Pages · GitHub Actions |



开发者：

![Image](https://mmbiz.qpic.cn/sz_mmbiz_jpg/J8A14Cg26R2Jo7cTNQ5yia1lT93uEUAuwHIvclC95wW3bBr6PRlSp9T8s5uGND8ibElYTCffVCrTlG2QWEr5CMDMoODSHF8g4ToV8wbX5dvJk/640?wx_fmt=jpeg&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=2)



## 📄 许可

本项目仅供法律研究参考，不构成法律意见。数据来源于国家市场监督管理总局及各省级市场监管局公开信息。
