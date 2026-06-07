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
- 检查项：本地存储可用性、数据初始化、数据完整性、数据持久化

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

### 巡查记录 (Inspection)
```javascript
{
  id: "I1704067200000",   // 记录ID
  plotId: "A01",          // 菜畦编号
  person: "李四",         // 巡查人
  content: "巡查内容",    // 巡查内容
  status: "normal",       // 状态: normal / warning / issue
  date: "2024-01-01T00:00:00.000Z"  // 巡查时间
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

## 部署说明

### 方式一：本地直接运行（开发调试）

1. 进入项目目录：
```bash
cd /Users/mingyuan/workspace/sihuo/wangxtw3/801
```

2. 使用任意静态文件服务器启动，例如 Python：
```bash
# Python 3
python3 -m http.server 8080

# 或 Python 2
python -m SimpleHTTPServer 8080
```

3. 访问：http://localhost:8080

---

### 方式二：Docker 容器化部署

#### 1. 构建镜像
```bash
cd /Users/mingyuan/workspace/sihuo/wangxtw3/801
docker build -t community-garden:latest .
```

#### 2. 启动容器
```bash
docker run -d \
  --name community-garden \
  -p 8080:80 \
  --restart unless-stopped \
  community-garden:latest
```

#### 3. 验证容器运行
```bash
docker ps | grep community-garden
```

#### 4. 查看容器日志
```bash
docker logs community-garden
```

#### 5. 停止/删除容器
```bash
# 停止容器
docker stop community-garden

# 删除容器
docker rm community-garden
```

---

### 方式三：docker-compose 部署

创建 `docker-compose.yml` 文件：
```yaml
version: '3.8'
services:
  community-garden:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

启动：
```bash
docker-compose up -d
```

---

## 数据初始化

### 初始化机制
应用在首次加载时自动初始化数据：
1. 检查 localStorage 中是否存在已保存的数据
2. 如无数据，自动创建 6×8 = 48 个菜畦，全部标记为空闲状态
3. 初始化完成后自动保存到 localStorage

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
或清除浏览器 localStorage。

---

## 健康检查

### 1. 容器健康检查
Docker 内置健康检查，每 30 秒检查一次：
```bash
# 查看容器健康状态
docker inspect --format='{{.State.Health.Status}}' community-garden
```

### 2. HTTP 健康检查接口
Nginx 配置了 `/health` 端点：
```bash
curl http://localhost:8080/health
```
响应示例：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00+00:00"
}
```

### 3. 应用内健康检查
点击页面右上角「健康检查」按钮，可查看以下检查项：
- ✅ 本地存储：浏览器 localStorage 可用性
- ✅ 数据初始化：菜畦数据是否正常加载
- ✅ 数据完整性：所有菜畦数据是否完整
- ✅ 数据持久化：数据保存功能是否正常

---

## 验收验证步骤

### 验证 1：认领空闲菜畦并刷新验证状态被保存

**前置条件**：应用已正常启动，访问首页可见菜园平面图

**操作步骤**：
1. 点击一个绿色的空闲菜畦（如 A01）
2. 在弹出的认领窗口中：
   - 认领人输入：`测试用户`
   - 作物类型选择：`🍅 番茄`
   - 备注输入：`测试认领`
3. 点击「确认认领」按钮
4. 观察页面：
   - 菜畦颜色从绿色变为蓝色
   - 顶部统计栏「已认领」数字 +1，「空闲」数字 -1
   - 显示成功提示
5. **刷新浏览器页面**（F5 或 Cmd+R）
6. **验证结果**：
   - 菜畦 A01 仍为蓝色（已认领状态）
   - 认领人显示「测试用户」
   - 作物显示番茄图标
   - 统计栏数字保持不变
   - 点击该菜畦可查看认领详情

---

### 验证 2：已认领菜畦不能重复认领（异常分支验证）

**前置条件**：菜畦 A01 已被认领

**操作步骤**：
1. 点击已认领的菜畦 A01（蓝色）
2. **验证结果**：
   - 不会弹出认领窗口
   - 而是显示该菜畦的详情信息
   - 包含认领人、作物、认领时间等信息

**额外验证**：
1. 尝试通过控制台直接调用认领接口：
   ```javascript
   gardenData.claimPlot('A01', '用户2', 'cucumber', '')
   ```
2. **验证结果**：
   - 返回 `{ success: false, message: "该菜畦已被认领，不能重复认领" }`
   - 菜畦状态不发生变化

---

### 验证 3：浇水提醒功能

**操作步骤**：
1. 认领一个菜畦并选择「🥒 黄瓜」（浇水周期 1 天）
2. 在浏览器控制台执行（模拟时间流逝）：
   ```javascript
   const plot = gardenData.getPlotById('A01');
   plot.lastWaterDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
   gardenData.saveToStorage();
   gardenApp.renderReminders();
   gardenApp.renderGardenMap();
   ```
3. **验证结果**：
   - 菜畦变为黄色并闪烁
   - 左侧「浇水提醒」面板出现该菜畦的提醒
   - 点击提醒项可完成浇水，恢复正常状态

---

### 验证 4：筛选功能

**操作步骤**：
1. 认领几个不同作物的菜畦
2. 在左侧筛选面板：
   - 选择「菜畦状态」→「已认领」
   - 选择「作物类型」→ 特定作物
   - 选择「认领人」→ 特定用户
3. **验证结果**：菜园平面图只显示符合所有筛选条件的菜畦

---

### 验证 5：导出卡片

**操作步骤**：
1. 确保至少有一个已认领菜畦
2. 点击右上角「导出卡片」按钮
3. **验证结果**：
   - 打开新窗口展示所有已认领菜畦的卡片
   - 每张卡片包含菜畦编号、认领人、作物、认领日期
   - 支持打印功能

---

### 验证 6：巡查记录

**操作步骤**：
1. 点击左侧「+ 新增巡查」按钮
2. 填写巡查信息并保存
3. **验证结果**：
   - 巡查记录出现在左侧列表
   - 记录带有状态颜色标记（绿色/黄色/红色）
   - 刷新页面后记录仍然存在

---

## 项目结构

```
/Users/mingyuan/workspace/sihuo/wangxtw3/801/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── data.js         # 数据管理模块
│   └── app.js          # 应用逻辑模块
├── Dockerfile          # Docker 构建配置
├── nginx.conf          # Nginx 配置
├── .dockerignore       # Docker 忽略文件
├── .gitignore          # Git 忽略文件
└── README.md           # 本文档
```

---

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

需支持 ES6+ 和 localStorage 功能。

---

## 注意事项

1. **数据存储**：数据保存在浏览器本地，清除浏览器数据会导致数据丢失
2. **跨设备同步**：当前版本不支持跨设备数据同步
3. **数据备份**：重要数据建议定期导出或截图留存
4. **浇水周期**：浇水提醒基于浏览器本地时间，关闭页面期间不会主动提醒
