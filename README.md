# 社区菜园认领图 Web 前端

## 项目概述

社区菜园认领图是一个单页 Web 应用，用于管理社区菜园的菜畦认领、浇水提醒、巡查记录等功能。应用采用纯前端技术栈，数据通过 localStorage 持久化存储。

## 技术栈

- HTML5
- CSS3 (响应式布局)
- 原生 JavaScript (ES6+)
- Nginx (生产环境部署)
- Docker (容器化部署)

## 功能特性

### 1. 菜园平面图
- 8×6 网格布局，共 48 个菜畦格子
- 颜色区分不同状态：空闲(绿色)、已认领(蓝色)、需浇水(黄色闪烁)
- 鼠标悬停效果，点击可认领或查看详情

### 2. 认领弹窗
- 支持认领空闲菜畦
- 认领人姓名、作物类型选择、备注输入
- **异常处理**：已认领菜畦不能重复认领
- 表单校验：必填项检查

### 3. 提醒面板
- 自动检测需浇水的菜畦（基于作物类型和上次浇水时间）
- 点击提醒项可快速完成浇水
- 支持 8 种作物类型，各有不同的浇水周期

### 4. 巡查记录
- 新增巡查记录（选择菜畦、巡查人、内容、状态）
- 查看最近 10 条巡查记录
- 状态标记：正常、需关注、有问题

### 5. 筛选功能
- 按菜畦状态筛选（全部/空闲/已认领）
- 按作物类型筛选
- 按认领人筛选
- 一键重置筛选条件

### 6. 导出卡片
- 导出所有已认领菜畦为卡片样式
- 支持打印预览
- 卡片包含：菜畦编号、认领人、作物、认领日期、备注

### 7. 数据持久化
- 所有数据存储在浏览器 localStorage
- 刷新页面后数据不丢失
- 支持数据重置

### 8. 健康检查
- 内置系统健康检查功能
- 容器层 HTTP 健康检查端点
- 应用层数据完整性检查

---

## 快速开始

### 方式一：本地直接运行（开发调试）

1. 进入项目目录：
```bash
cd /Users/mingyuan/workspace/sihuo/wangxtw3/801
```

2. 使用任意静态文件服务器启动：
```bash
# Python 3
python3 -m http.server 8080

# 或 Node.js (需安装 http-server)
npx http-server -p 8080

# 或 PHP
php -S localhost:8080
```

3. 访问：http://localhost:8080

---

### 方式二：Docker 容器化部署（推荐）

#### 前置条件
- Docker 已安装并运行
- 8080 端口未被占用

#### 1. 构建镜像
```bash
cd /Users/mingyuan/workspace/sihuo/wangxtw3/801
docker build -t community-garden:latest .
```

**构建验证**：
- 构建过程中会自动验证 Nginx 配置
- 列出所有已复制的文件
- 确保所有静态资源存在

#### 2. 启动容器
```bash
docker run -d \
  --name community-garden \
  -p 8080:80 \
  --restart unless-stopped \
  --memory=128m \
  --cpus=0.5 \
  community-garden:latest
```

#### 3. 容器启动验证步骤

**步骤 1：检查容器运行状态**
```bash
# 查看容器列表
docker ps | grep community-garden

# 预期输出：
# CONTAINER ID   IMAGE                     STATUS          PORTS                  NAMES
# xxxxxxxxxxxx   community-garden:latest   Up 10 seconds   0.0.0.0:8080->80/tcp   community-garden
```

**步骤 2：检查容器日志**
```bash
docker logs community-garden

# 预期输出：Nginx 启动日志，无错误
```

**步骤 3：HTTP 健康检查**
```bash
curl -s http://localhost:8080/health | jq .

# 预期输出：
# {
#   "status": "ok",
#   "timestamp": "2024-01-01T00:00:00+00:00",
#   "service": "community-garden"
# }
```

**步骤 4：Docker 内置健康检查状态**
```bash
docker inspect --format='{{.State.Health.Status}}' community-garden

# 预期输出：healthy
```

**步骤 5：验证首页可访问**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/

# 预期输出：200
```

**步骤 6：验证静态资源加载**
```bash
# 验证 CSS 加载
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/css/style.css

# 验证 JS 加载
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/js/data.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/js/app.js

# 全部预期输出：200
```

#### 4. 常用容器操作
```bash
# 查看容器日志（实时）
docker logs -f community-garden

# 停止容器
docker stop community-garden

# 启动已停止的容器
docker start community-garden

# 重启容器
docker restart community-garden

# 删除容器（需先停止）
docker rm community-garden

# 查看容器资源使用
docker stats community-garden --no-stream
```

---

### 方式三：docker-compose 部署

创建 `docker-compose.yml` 文件：
```yaml
version: '3.8'

services:
  community-garden:
    build: .
    image: community-garden:latest
    container_name: community-garden
    ports:
      - "8080:80"
    restart: unless-stopped
    mem_limit: 128m
    cpus: '0.5'
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
    labels:
      - "app=community-garden"
      - "version=1.0.0"
```

启动命令：
```bash
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

---

## 应用初始化流程

### 初始化机制
应用采用分层初始化设计，确保容器环境下稳定运行：

```
1. 页面加载
   ↓
2. 显示加载屏幕（🌱 动画）
   ↓
3. 检查依赖项（gardenData、CROP_TYPES）
   ↓
4. 检查 DOM 元素完整性
   ↓
5. 数据模块初始化
   ├─ 检查 localStorage
   ├─ 无数据则自动创建 48 个菜畦
   └─ 保存初始数据
   ↓
6. 应用模块初始化
   ├─ 绑定事件
   ├─ 渲染菜园平面图
   ├─ 渲染统计数据
   ├─ 渲染筛选器
   ├─ 渲染提醒面板
   └─ 渲染巡查记录
   ↓
7. 隐藏加载屏幕，显示应用
   ↓
8. 启动定时检查（每分钟检查浇水提醒）
```

### 数据持久化验证
数据保存在浏览器 localStorage 中，键名：
- `community_garden_plots` - 菜畦数据
- `community_garden_inspections` - 巡查记录
- `community_garden_initialized` - 初始化标记

### 重置数据
如需重置数据，可在浏览器控制台执行：
```javascript
gardenData.resetData()
```
或在浏览器开发者工具中清除 localStorage。

---

## 健康检查详解

### 1. 容器层健康检查
- **端点**：`GET /health`
- **间隔**：30 秒
- **超时**：10 秒
- **重试**：3 次
- **启动等待**：5 秒

### 2. 应用层健康检查
点击页面右上角「健康检查」按钮，可查看以下检查项：

| 检查项 | 说明 | 正常状态 |
|--------|------|----------|
| 本地存储 | 浏览器 localStorage 可用性 | ✅ localStorage 可用 |
| 数据初始化 | 菜畦数据是否正常加载 | ✅ 已加载 48 个菜畦 |
| 数据完整性 | 所有菜畦数据是否完整 | ✅ 所有菜畦数据完整 |
| 数据持久化 | 数据保存功能是否正常 | ✅ 数据保存正常 |

---

## 验收验证步骤（完整流程）

### ✅ 验证 1：容器启动后页面正常显示（修复空白问题）

**前置条件**：容器已启动，http://localhost:8080 可访问

**操作步骤**：
1. 打开浏览器访问 http://localhost:8080
2. **验证加载屏幕**：
   - 短暂显示 🌱 加载动画和「正在加载社区菜园...」文字
   - 加载完成后自动隐藏
3. **验证主界面显示**：
   - 顶部绿色导航栏显示「🌱 社区菜园认领图」
   - 左侧显示筛选面板、浇水提醒、巡查记录三个面板
   - 右侧显示统计栏（总菜畦: 48, 已认领: 0, 空闲: 48, 需浇水: 0）
   - 中间显示 8×6 网格的菜园平面图，所有格子为绿色（空闲）
   - 底部显示图例
4. **验证无控制台错误**：
   - 打开浏览器开发者工具 (F12)
   - Console 面板无红色错误
   - 可看到 `[GardenApp] 初始化完成` 日志

---

### ✅ 验证 2：认领空闲菜畦并刷新验证状态被保存

**操作步骤**：
1. 点击一个绿色的空闲菜畦（如 A01）
2. 在弹出的认领窗口中：
   - 认领人输入：`测试用户`
   - 作物类型选择：`🍅 番茄`
   - 备注输入：`测试认领功能`
3. 点击「确认认领」按钮
4. **验证认领成功**：
   - 弹窗自动关闭
   - 右上角显示绿色成功提示「认领成功」
   - 菜畦 A01 颜色从绿色变为蓝色
   - 菜畦显示番茄图标和「测试用户」
   - 顶部统计栏：已认领 +1（变为 1），空闲 -1（变为 47）
5. **刷新浏览器页面**（F5 或 Cmd+R）
6. **验证数据持久化**：
   - 菜畦 A01 仍为蓝色（已认领状态）
   - 显示番茄图标和「测试用户」
   - 统计栏数字保持不变（已认领: 1, 空闲: 47）
   - 点击该菜畦可查看认领详情
7. **验证 localStorage**：
   - 打开浏览器控制台，执行：
     ```javascript
     localStorage.getItem('community_garden_plots')
     ```
   - 返回的 JSON 数据中包含 A01 的认领信息

---

### ✅ 验证 3：已认领菜畦不能重复认领（异常分支）

**前置条件**：菜畦 A01 已被认领

**操作步骤**：
1. 点击已认领的菜畦 A01（蓝色）
2. **验证不显示认领窗口**：
   - 不会弹出认领表单
   - 而是显示该菜畦的详情对话框
   - 详情包含：菜畦编号、认领人、作物、认领时间、上次浇水时间
3. **代码层面验证**：
   - 打开浏览器控制台，执行：
     ```javascript
     gardenData.claimPlot('A01', '用户2', 'cucumber', '')
     ```
   - **验证返回结果**：
     ```javascript
     { success: false, message: "该菜畦已被认领，不能重复认领" }
     ```
   - 菜畦 A01 的状态不发生变化
   - 认领人仍然是「测试用户」

---

### ✅ 验证 4：浇水提醒面板功能

**操作步骤**：
1. 认领一个菜畦并选择「🥒 黄瓜」（浇水周期 1 天）
2. 打开浏览器控制台，执行以下代码模拟时间流逝：
   ```javascript
   const plot = gardenData.getPlotById('A01');
   plot.lastWaterDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
   gardenData.saveToStorage();
   gardenApp.renderReminders();
   gardenApp.renderGardenMap();
   ```
3. **验证提醒出现**：
   - 菜畦 A01 变为黄色并闪烁
   - 左侧「浇水提醒」面板出现该菜畦的提醒
   - 顶部统计栏「需浇水」数字变为 1
4. **点击提醒项浇水**：
   - 点击左侧提醒列表中的 A01 提醒
   - 显示「浇水成功」提示
   - 菜畦恢复蓝色
   - 提醒项消失
   - 「需浇水」数字变回 0

---

### ✅ 验证 5：筛选功能

**操作步骤**：
1. 认领 3-4 个菜畦，选择不同的作物和认领人
2. **按状态筛选**：
   - 左侧「菜畦状态」选择「已认领」
   - 菜园平面图只显示已认领的蓝色菜畦
3. **按作物筛选**：
   - 「作物类型」选择特定作物（如「🍅 番茄」）
   - 只显示种植番茄的菜畦
4. **按认领人筛选**：
   - 「认领人」选择特定用户
   - 只显示该用户认领的菜畦
5. **组合筛选**：
   - 同时设置状态和作物筛选
   - 只显示同时满足两个条件的菜畦
6. **重置筛选**：
   - 点击「重置筛选」按钮
   - 所有筛选条件恢复默认
   - 显示所有菜畦

---

### ✅ 验证 6：导出卡片功能

**操作步骤**：
1. 确保至少有 2-3 个已认领菜畦
2. 点击右上角「导出卡片」按钮
3. **验证导出结果**：
   - 打开新窗口
   - 标题显示「🌱 社区菜园认领卡片」
   - 以卡片网格形式展示所有已认领菜畦
   - 每张卡片包含：菜畦编号、作物图标、认领人、作物名称、认领日期、备注
4. **验证打印功能**：
   - 在新窗口按 Cmd+P / Ctrl+P
   - 打印预览正常显示卡片布局

---

### ✅ 验证 7：巡查记录功能

**操作步骤**：
1. 点击左侧「+ 新增巡查」按钮
2. 填写巡查信息：
   - 巡查菜畦：选择 A01
   - 巡查人：`巡查员张三`
   - 巡查内容：`作物生长良好，无病虫害`
   - 问题状态：`正常`
3. 点击「保存记录」
4. **验证记录保存**：
   - 弹窗关闭
   - 左侧「巡查记录」面板出现新记录
   - 记录左侧有绿色边框（正常状态）
   - 显示菜畦编号、日期、巡查人、内容
5. **添加不同状态的记录**：
   - 新增一条「需关注」状态的记录（黄色边框）
   - 新增一条「有问题」状态的记录（红色边框）
6. **刷新页面验证持久化**：
   - 刷新后所有巡查记录仍然存在

---

## 项目结构

```
/Users/mingyuan/workspace/sihuo/wangxtw3/801/
├── index.html              # 主页面（含加载屏幕、错误屏幕）
├── css/
│   └── style.css           # 完整样式（响应式、动画、组件）
├── js/
│   ├── data.js             # 数据管理模块（48个菜畦初始化）
│   └── app.js              # 应用逻辑（健壮初始化、错误处理）
├── Dockerfile              # Docker 构建配置（含构建验证）
├── nginx.conf              # Nginx 配置（健康检查、MIME、缓存）
├── .dockerignore           # Docker 忽略文件
├── .gitignore              # Git 忽略文件
└── README.md               # 本文档
```

---

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

需支持 ES6+ 和 localStorage 功能。

---

## 数据模型

### 菜畦数据 (Plot)
```javascript
{
  id: "A01",              // 菜畦编号
  row: 0,                 // 行索引
  col: 0,                 // 列索引
  status: "available",    // 状态: available / claimed
  owner: "张三",          // 认领人
  crop: "tomato",         // 作物类型
  claimDate: "2024-01-01T00:00:00.000Z",  // 认领时间
  lastWaterDate: "2024-01-01T00:00:00.000Z", // 上次浇水时间
  remark: "备注信息"       // 备注
}
```

### 作物类型配置
| 作物 | 浇水周期(天) | Emoji |
|------|-------------|-------|
| 番茄 | 2 | 🍅 |
| 黄瓜 | 1 | 🥒 |
| 胡萝卜 | 3 | 🥕 |
| 生菜 | 1 | 🥬 |
| 辣椒 | 2 | 🌶️ |
| 茄子 | 2 | 🍆 |
| 土豆 | 4 | 🥔 |
| 洋葱 | 3 | 🧅 |

---

## 常见问题排查

### Q: 容器启动后页面空白？
**A**: 按以下步骤排查：
```bash
# 1. 检查容器是否正常运行
docker ps | grep community-garden

# 2. 检查容器日志
docker logs community-garden

# 3. 验证健康检查端点
curl http://localhost:8080/health

# 4. 验证静态资源
curl -I http://localhost:8080/css/style.css
curl -I http://localhost:8080/js/app.js

# 5. 重建容器
docker stop community-garden
docker rm community-garden
docker build -t community-garden:latest .
docker run -d --name community-garden -p 8080:80 community-garden:latest
```

### Q: 刷新页面后数据丢失？
**A**: 检查浏览器是否禁用了 localStorage，或使用了无痕浏览模式。

### Q: 浇水提醒不更新？
**A**: 浇水提醒每分钟自动检查一次，也可手动刷新页面触发检查。

---

## 注意事项

1. **数据存储**：数据保存在浏览器本地，清除浏览器数据会导致数据丢失
2. **跨设备同步**：当前版本不支持跨设备数据同步
3. **数据备份**：重要数据建议定期导出或截图留存
4. **浇水周期**：浇水提醒基于浏览器本地时间，关闭页面期间不会主动推送
5. **容器资源**：建议分配至少 64MB 内存，Nginx 静态服务资源消耗很低
