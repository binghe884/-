# 赛点 · 设计竞赛索引

面向设计类学生的设计竞赛索引。只收全国性与国际性大型赛事，按截止时间排序，一条赛事一张决策卡：有没有、什么时候截止、要不要钱、值不值得投。

当前收录 69 条，覆盖八个方向，其中 46 条国内赛事、23 条有明确截止日期；只面向职业设计师的赛事会标注「职业」，保留在索引里但不建议学生投递。

课程作业项目，纯静态实现，无构建步骤、无后端、无第三方依赖。

## 本地打开

直接双击 `index.html` 即可。数据以 `data/competitions.js`（`window.COMPETITIONS`）形式加载，因此 `file://` 协议下也能正常工作。

也可以用任意静态服务器：

```bash
python -m http.server 8000
# http://localhost:8000
```

## 页面

| 路由 | 内容 |
| --- | --- |
| `#/` | 首页：搜索、最近截止 5 条、八个方向 |
| `#/all` | 全部赛事：即时搜索 + 方向/级别/时间/费用/地区筛选 + 收藏筛选 + 排序 |
| `#/c/:slug` | 详情：关键事实、编辑判断、参赛要求、时间线、来源与核实日期 |
| `#/calendar` | 截止日历：按月查看、点击日期、导出 `.ics` |
| `#/saved` | 收藏（`localStorage`，键 `saidian:saved`） |
| `#/about` | 关于与数据说明 |

筛选与搜索状态写在 hash query 中（`q/dir/level/deadline/fee/region/saved/sort`），可复制链接。

## 目录

```
index.html              页面骨架、SVG symbol、页头页脚
assets/styles.css       设计系统与全部组件
assets/app.js           零依赖 hash 路由、搜索筛选、日历、收藏、.ics
data/research-a.json    视觉传达 / 插画出版
data/research-b.json    产品工业 / 服务社会
data/research-c.json    交互数字 / 动画游戏
data/research-d.json    建筑空间 / 服装时尚
data/competitions.js    由脚本合并生成，页面实际加载的数据
scripts/build-data.mjs  合并、去重、排序、补 verifiedAt
scripts/shot.mjs        CDP 截图（可选，开发用）
scripts/check.mjs       交互自检（可选，开发用）
scripts/audit.mjs       数据体检：重名、缺来源、日期倒置（可选，开发用）
```

## 更新数据

1. 编辑 `data/research-*.json`，每条一个对象，字段见下。
2. 运行合并脚本：

```bash
node scripts/build-data.mjs
```

脚本会去掉 slug 重复项、补 `verifiedAt`、按地区与名称排序，写出 `data/competitions.js`。刷新页面即可。

### 字段

| 字段 | 说明 |
| --- | --- |
| `slug` | URL 标识，唯一，小写连字符 |
| `name` / `nameEn` / `aliases` | 中文名、英文名、搜索别名 |
| `organizer` / `region` / `country` | 主办方、地区（国际/中国）、国家 |
| `level` | 国际顶级 / 国际知名 / 国家级 / 行业权威 |
| `directions` | 方向数组，取值见 `assets/app.js` 的 `DIRECTIONS` |
| `audience` / `team` | 学生或职业、个人或团队 |
| `fee` / `feeType` | 费用说明、免费/收费/学生免费 |
| `openDate` / `deadline` | ISO 日期；官网未公布填 `null` |
| `expectedWindow` | 未公布时的参考窗口，如“通常 3 月开放” |
| `resultsDate` | 结果公布时间，可为大致月份 |
| `cycle` | 举办周期 |
| `awards` / `format` / `requirements` | 奖项、提交形式、作品要求 |
| `site` / `source` | 官网、核实来源 |
| `sourceVerified` | 核实当时官网是否可打开 |
| `evidence` | 日期或规则对应的原文依据 |
| `editorNote` | 编辑判断，一句话说清值不值得投 |
| `verifiedAt` | 最后核实日期，构建时自动补齐 |

状态不手写，由日期推导：截止已过为「已结束」，14 天内为「即将截止」，未开放为「待开放」，无截止为「待公布」，其余为「报名中」。

## 数据原则与限制

- 只收全国性、国际性大型赛事；地方小赛、付费即奖、停止举办的赛事不收。
- 截止日期只写官网明确公布的日期；未公布一律 `null`，另附参考窗口，不用往年日期冒充当年。
- 每条都保留来源链接、核实日期与原文依据；核实当时打不开官网的，详情页会明确提示。
- 报名费以官网公示为准。部分赛事官网未公示费用，行内只写计费方式，不猜金额。
- 数据为人工整理，最后核实日期见页脚；「持续更新」不等于实时，投递前请以官网为准。

## 设计

午夜蓝 `#1a1a3e` 为骨，奶油白 `#f0ece4` 为纸，沙漠金 `#d4a574` 与玫瑰粉 `#c38d94` 作光。标题用衬线斜体，正文用系统无衬线栈，数字等宽。模糊光晕、非对称圆角与 800ms 缓动构成整体节奏；不用纯白、不用霓虹色、不用对称网格与硬阴影。

## 截图（可选）

无头 Edge 在 Windows 下有最小窗口宽度，直接 `--window-size=390` 会得到 496px 布局。`scripts/shot.mjs` 通过 CDP 精确设置视口：

```bash
# 先启动带调试端口的 Edge
msedge --headless=new --remote-debugging-port=9222 --user-data-dir=.edge2 about:blank
# 再截图
node scripts/shot.mjs "file:///D:/网页设计/index.html" 390 844 shot.png 1
```

最后一个参数为 `1` 时截全页。
