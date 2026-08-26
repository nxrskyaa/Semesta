<div align="center">

<img src="docs/media/banner.svg" alt="SEMESTA — 纯程序化生成的体素动作RPG" width="100%">

<br>

[English](README.md) · [Bahasa Indonesia](README.id.md) · **中文**

<br>

[![立即游玩](https://img.shields.io/badge/▶_立即游玩-semesta--gray.vercel.app-f0c455?style=for-the-badge&labelColor=16264a)](https://semesta-gray.vercel.app/)
[![基于 three.js](https://img.shields.io/badge/three.js-r169-16264a?style=for-the-badge&logo=threedotjs&logoColor=f0c455)](https://threejs.org)
[![Build for Rialo](https://img.shields.io/badge/BUILD_FOR-RIALO-0b6b6b?style=for-the-badge)](https://rialo.io)

*一款直接在浏览器中运行的开放世界体素动作RPG。
所有贴图都在运行时实时绘制，所有音乐都是实时合成。
整个游戏中没有一张图片文件，也没有一个音频文件。*

</div>

---

## Semesta 是什么？

**Semesta**（印尼语，意为「宇宙」）是一款温馨风格的 2.5D 体素动作RPG，故事发生在
**Anavela** 世界——一片由灯笼点亮的土地，有松树林、雪原和九座岛屿组成的群岛。
你是「守灯人（Lanternkeeper）」教团的最后一名学徒，你的使命是重新点亮这个陷入
黑暗的世界。

它同时也是一次技术宣言：整个游戏——地形、角色、怪物、武器、UI 图标、音乐与
音效——全部由**代码程序化生成**。仓库中不包含任何美术资源和音频文件（唯一的
例外是两张品牌 Logo）。一张 16 像素的画布和 WebAudio API 完成了一切。

<div align="center">
<img src="docs/media/village.jpg" width="49%" alt="黄昏时分的 Anavela Universe 主营地">
<img src="docs/media/hollow.jpg" width="49%" alt="The Hollow —— 30 层终局地下城">
<img src="docs/media/skills.jpg" width="49%" alt="圣光之柱 —— 全新技能特效体系">
<img src="docs/media/ocean.jpg" width="49%" alt="群岛 —— 9 座岛屿、游泳与船只">
</div>

---

## 特性 —— 全部已上线，今天就能玩

| 系统 | 内容 |
|---|---|
| ⚔ **职业** | 以 **Origin（无名者）** 开局，只有一把借来的剑；10 级时通过觉醒仪式转职为 **7 大职业**之一——战士（剑*或*斧）、弓手、法师、牧师、刺客、召唤师（火炮 + 召唤物）、格斗家（三段徒手连击）。每个职业有独立技能树，共 48 个技能。 |
| 🏰 **The Hollow 地下城** | **30 层 × 3 种难度**的终局地下城。三个主题区域（石之厅 / 霜之墓 / 余烬之核），**6 种专属怪物与 6 个专属 Boss**，多阶段机制全部有前摇提示，21 件限定掉落。已通关的楼层均可重复挑战。 |
| 🎫 **赛季通行证** | **50 级赛季通行证**，基于 30 天日历，所有客户端无需服务器即可对赛季达成一致。四个赛季轮换，奖励轨道真正各不相同；50 级之后有无限的威望宝箱；还有 **Keeper's Vault** —— 一个*永不重复*的抽取系统。 |
| 🎰 **奇迹扭蛋** | 六稀有度扭蛋，带软保底、手绘扭蛋机、十连抽，以及花钱前可查看的完整奖池与概率。职业感知：抽取永远不会给你无法使用的武器。 |
| 🌍 **开放世界** | 200 格确定性世界：冬季生态、约占地图三分之一的海洋、**9 座手工布置的岛屿**、游泳与潜水、两种可驾驶船只、会对你做出反应的野生动物、天气系统与完整昼夜循环。 |
| 🐾 **收集** | **203 件物品 · 57 把武器 · 60 件时装 · 17 只宠物 · 8 只坐骑** —— 每只宠物都会真的跑去帮你捡战利品。**图鉴（The Index）**记录全部 200 个条目，未发现的条目显示剪影提示。 |
| 🏡 **家园** | 一座可建造的岛屿庄园，三级进阶（小屋 → 农舍 → 别墅）。建造消耗真实时间——你离开时脚手架仍在施工。 |
| 🌾 **生活技能** | 钓鱼、耕种、烹饪各有独立经验与技能树。神话鱼真实存在——而全游戏只有一个节点能解锁它们。 |
| 👥 **多人联机** | 权威服务器掌管时钟、天气、刷怪与世界 Boss。Google 登录、**3 个角色栏位**、永不误删角色的云存档合并。世界频道聊天、好友系统，其他玩家以真实装备渲染。 |
| 🎵 **生成式音频** | **10 首程序化作曲的音乐**，分 4 种氛围，每 16 小节轮换，外加约 60 个合成音效。零音频文件。 |
| 📱 **全平台** | 完整触屏操作，支持双指缩放，按钮布局互不遮挡；图形预设从 LOW 到 ULTRA，并带自适应分辨率。 |

---

## 技术简述

- **渲染** — [three.js](https://threejs.org)，ACES 电影级色调映射、UnrealBloom 泛光、
  可选 N8AO 环境光遮蔽、跟随实测帧预算的自适应渲染分辨率，以及保持可见光源数量
  恒定的灯光裁剪器（光源数量一变就会重编译场景内全部着色器——这正是卡顿的根治）。
- **美术** — 所有贴图、精灵与图标在加载时绘制到 16 px 画布上。时装、武器、怪物与
  建筑由基础网格拼装，经共享几何体/材质缓存，再按建筑静态合批（村庄道具：
  401 → 67 次绘制调用）。
- **世界** — 由固定种子确定性生成。联机服务器从不传输地图；每个客户端生成逐字节
  一致的世界，网络只传输实体。
- **音频** — 和弦进行、旋律与全部音效均在 WebAudio 中合成。

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 生产构建
```

联机为可选项：将 `VITE_GAME_SERVER` 指向已部署的 [`server/`](server/) 实例
（参见 [MULTIPLAYER.md](MULTIPLAYER.md)），主菜单即出现 **🌐 PLAY ONLINE** 入口。
不配置也可完整单机游玩。

---

## 操作

| 输入 | 动作 | | 输入 | 动作 |
|---|---|---|---|---|
| `WASD` / 摇杆 | 移动 | | `N` | 世界地图 + 路径点 |
| `左键` / ⚔ | 攻击（自动瞄准） | | `O` | 衣橱与外观 |
| `右键` / `Shift` | 翻滚 / 潜水 | | `M` | 坐骑 |
| `空格` | 跳跃 | | `B` | 自动战斗 |
| `1–3` | 技能 · `4` 药剂 | | `G` | 挂机钓鱼 |
| `F` / `R` | 交互（主 / 副） | | `J` / `U` | 每日奖励 / 通行证 |
| `T` / `Y` | 传送回家 / 营地 | | `K` / `L` / `Z` / `X` | 技能 / 生活技能 / 属性 / 图鉴 |

---

## Build for Rialo

Semesta 正在为 [**Rialo**](https://rialo.io) 做准备，其测试网
[已经上线](https://playground.rialo.io)。这种契合是架构层面的，而非表面的：
游戏本就在运行赛季时钟、建造计时器与世界 Boss 调度——这正是 Rialo 以
Reactive Transaction 原生执行的异步工作负载。完整链上设计（资产分类、经济防火墙、
四阶段发布计划）见 [docs/Semesta-Chronicle.pdf](docs/Semesta-Chronicle.pdf)。

**路线图** — ① 代币启动平台 → ② 持有者权益 → ③ 代币与金币并行的扭蛋 → ④ 面向活跃玩家的 Genesis NFT 免费铸造。

---

## 团队

| | 职责 | |
|---|---|---|
| **Nxrskyaa** | Game Developer | [x.com/nxrskyaa](https://x.com/nxrskyaa) |
| **Dikzzy** | Game Tester & Bug Hunter | [x.com/diikzzyy__](https://x.com/diikzzyy__) |
| **Baster** | Technical Game Developer | [x.com/Bas_Basterx](https://x.com/Bas_Basterx) |

<div align="center">
<br>

**[▶ 立即游玩 Semesta](https://semesta-gray.vercel.app/)** —— 无需安装、无需钱包、无需下载，一个浏览器就够。

<sub>◆ BUILD FOR RIALO ◆</sub>

</div>
