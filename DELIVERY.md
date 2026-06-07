# 社区菜园认领图 - 交付说明

## 🚀 启动方式

### 方式一：直接打开
```bash
cd /path/to/project
open index.html
```

### 方式二：本地HTTP服务（推荐）
```bash
cd /path/to/project
python3 -m http.server 8080
# 访问 http://localhost:8080
```

### 方式三：Docker
```bash
docker build -t community-garden .
docker run -d -p 80:80 community-garden
```

---

## ✅ 验收脚本

### 使用方法
1. 打开浏览器，访问应用
2. 按F12打开开发者工具
3. 切换到Console面板
4. 运行以下命令：

```javascript
// 建议先清除缓存
localStorage.clear();
location.reload();

// 等待页面加载完成后，运行验收测试
const runAcceptanceTests = function() {
    console.log('🧪 开始运行验收测试...\n');
    let passed = 0, failed = 0;
    function test(name, fn) {
        try { fn(); console.log('✅ PASS: ' + name); passed++; }
        catch (e) { console.log('❌ FAIL: ' + name + ' - ' + e.message); failed++; }
    }
    function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

    console.log('='.repeat(60));
    console.log('测试组 1: 数据层验证');
    console.log('='.repeat(60));

    test('GardenData实例已创建', () => {
        assert(typeof gardenData !== 'undefined', 'gardenData未定义');
        assert(gardenData.plots.length > 0, '菜畦数据未初始化');
    });

    test('按状态筛选空闲菜畦', () => {
        const available = gardenData.getPlots({ status: 'available' });
        assert(available.every(p => p.status === 'available'), '筛选结果包含非空闲菜畦');
    });

    test('浇水提醒筛选', () => {
        const needsWater = gardenData.getPlots({ water: 'needs' });
        const needsWaterIds = gardenData.getNeedsWaterPlots().map(p => p.id);
        assert(needsWater.every(p => needsWaterIds.includes(p.id)), '筛选结果包含不需要浇水的菜畦');
    });

    console.log('\n' + '='.repeat(60));
    console.log('测试组 2: 认领功能验证');
    console.log('='.repeat(60));

    let testPlotId = null;

    test('成功认领一个空闲菜畦', () => {
        const plot = gardenData.plots.find(p => p.status === 'available');
        assert(plot, '没有找到空闲菜畦');
        testPlotId = plot.id;
        const result = gardenData.claimPlot(testPlotId, '测试用户', 'tomato', '测试备注');
        assert(result.success === true, '认领失败: ' + result.message);
        assert(result.plot.status === 'claimed', '菜畦状态未更新');
        assert(result.plot.owner === '测试用户', '认领人未正确保存');
        console.log('   认领菜畦成功: ' + testPlotId);
    });

    test('【关键验收点】认领后按状态筛选能定位该菜畦', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        const claimed = gardenData.getPlots({ status: 'claimed' });
        const found = claimed.find(p => p.id === testPlotId);
        assert(found !== undefined, '按已认领筛选未找到菜畦 ' + testPlotId);
        assert(found.owner === '测试用户', '筛选结果中认领人信息不正确');
        assert(found.crop === 'tomato', '筛选结果中作物信息不正确');
        console.log('   ✅ 成功定位到菜畦: ' + found.id + ', 认领人: ' + found.owner);
    });

    test('按作物筛选能定位该菜畦', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        const tomatoPlots = gardenData.getPlots({ crop: 'tomato' });
        const found = tomatoPlots.find(p => p.id === testPlotId);
        assert(found !== undefined, '按番茄筛选未找到菜畦 ' + testPlotId);
    });

    test('【关键验收点】重复认领返回拒绝', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        const result = gardenData.claimPlot(testPlotId, '另一个用户', 'cucumber', '');
        assert(result.success === false, '重复认领应该返回失败');
        assert(result.message.includes('不能重复认领') || result.message.includes('已被认领'), 
            '错误信息不正确: ' + result.message);
        console.log('   ✅ 重复认领已被正确拒绝: ' + result.message);
    });

    console.log('\n' + '='.repeat(60));
    console.log('测试组 3: 数据持久化验证');
    console.log('='.repeat(60));

    test('筛选条件持久化', () => {
        const testFilters = { status: 'claimed', crop: 'tomato', water: 'all', owner: 'all' };
        const saveResult = gardenData.saveFilters(testFilters);
        assert(saveResult === true, '保存筛选条件失败');
        const loaded = gardenData.loadFilters();
        assert(loaded !== null, '未加载到保存的筛选条件');
        assert(loaded.status === 'claimed', '状态筛选条件未正确保存');
        console.log('   ✅ 筛选条件持久化验证通过');
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));
    console.log('✅ 通过: ' + passed);
    console.log('❌ 失败: ' + failed);
    console.log('📝 总计: ' + (passed + failed));
    if (failed === 0) console.log('\n🎉 所有验收测试通过！');
    else console.log('\n⚠️  有 ' + failed + ' 个测试失败');
    return { passed, failed, total: passed + failed };
};
runAcceptanceTests();
```

---

## 🔍 手动验收要点

### 1. 组合筛选与平面图高亮
- 点击"🔍 筛选"按钮打开筛选面板
- 选择"状态：已认领" + "作物：番茄"，点击"应用筛选"
- **预期**：符合条件的菜畦紫色边框高亮，不符合的变暗

### 2. 窄屏筛选抽屉
- 将浏览器窗口缩小到宽度 < 768px
- 点击顶部"🔍 筛选"按钮
- **预期**：从左侧滑出筛选抽屉，点击遮罩或×按钮可关闭

### 3. 筛选条件持久化
- 设置一组筛选条件并应用
- 刷新浏览器页面（F5）
- **预期**：筛选条件和菜畦认领状态都保留

### 4. 已认领菜畦不能二次认领
- 找到一个已认领的菜畦（蓝色或黄色），点击它
- **预期**：显示详情弹窗，不会弹出认领窗口

---

## 📁 文件变更清单

| 文件 | 说明 |
|------|------|
| index.html | 添加筛选抽屉、浇水提醒筛选、高亮图例 |
| css/style.css | 添加筛选抽屉样式、高亮样式、响应式适配 |
| js/data.js | 增强筛选逻辑、筛选条件持久化API |
| js/app.js | 筛选抽屉交互、组合筛选逻辑、平面图高亮 |
| scripts/acceptance-test.js | 验收测试脚本 |
