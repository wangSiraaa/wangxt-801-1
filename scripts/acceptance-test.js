/**
 * 社区菜园认领图 - 验收测试脚本
 * 
 * 使用方法：
 * 1. 在浏览器中打开应用
 * 2. 打开开发者工具 (F12)
 * 3. 切换到 Console 面板
 * 4. 将此文件内容粘贴到控制台并运行
 * 
 * 或者在 Node.js 环境下运行：
 * node scripts/acceptance-test.js
 */

const runAcceptanceTests = function() {
    console.log('🧪 开始运行验收测试...\n');
    
    let passed = 0;
    let failed = 0;
    
    function test(name, fn) {
        try {
            fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (e) {
            console.log(`❌ FAIL: ${name}`);
            console.log(`   错误: ${e.message}`);
            failed++;
        }
    }
    
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || '断言失败');
        }
    }
    
    console.log('='.repeat(60));
    console.log('测试组 1: 数据层功能验证');
    console.log('='.repeat(60));
    
    test('GardenData 实例已创建', () => {
        assert(typeof gardenData !== 'undefined', 'gardenData 未定义');
        assert(gardenData.plots.length > 0, '菜畦数据未初始化');
    });
    
    test('筛选功能 - 按状态筛选空闲菜畦', () => {
        const availablePlots = gardenData.getPlots({ status: 'available' });
        const allAvailable = gardenData.plots.filter(p => p.status === 'available');
        assert(availablePlots.length === allAvailable.length, 
            `空闲菜畦数量不匹配: 期望 ${allAvailable.length}, 实际 ${availablePlots.length}`);
        assert(availablePlots.every(p => p.status === 'available'), 
            '筛选结果包含非空闲菜畦');
    });
    
    test('筛选功能 - 按状态筛选已认领菜畦', () => {
        const claimedPlots = gardenData.getPlots({ status: 'claimed' });
        const allClaimed = gardenData.plots.filter(p => p.status !== 'available');
        assert(claimedPlots.length === allClaimed.length, 
            `已认领菜畦数量不匹配: 期望 ${allClaimed.length}, 实际 ${claimedPlots.length}`);
        assert(claimedPlots.every(p => p.status !== 'available'), 
            '筛选结果包含空闲菜畦');
    });
    
    test('筛选功能 - 按作物类型筛选', () => {
        const plotsWithTomato = gardenData.getPlots({ crop: 'tomato' });
        assert(plotsWithTomato.every(p => p.crop === 'tomato' || p.crop === null), 
            '筛选结果包含非番茄菜畦');
    });
    
    test('筛选功能 - 浇水提醒筛选', () => {
        const needsWaterPlots = gardenData.getPlots({ water: 'needs' });
        const needsWaterIds = gardenData.getNeedsWaterPlots().map(p => p.id);
        assert(needsWaterPlots.every(p => needsWaterIds.includes(p.id)), 
            '筛选结果包含不需要浇水的菜畦');
    });
    
    test('组合筛选 - 状态+作物', () => {
        const result = gardenData.getPlots({ status: 'claimed', crop: 'tomato' });
        assert(result.every(p => p.status !== 'available'), '组合筛选包含空闲菜畦');
        assert(result.every(p => p.crop === 'tomato' || p.crop === null), '组合筛选包含非番茄菜畦');
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('测试组 2: 认领功能验证');
    console.log('='.repeat(60));
    
    test('查找一个空闲菜畦用于测试', () => {
        const availablePlot = gardenData.plots.find(p => p.status === 'available');
        assert(availablePlot, '没有找到空闲菜畦用于测试');
        console.log(`   使用测试菜畦: ${availablePlot.id}`);
    });
    
    let testPlotId = null;
    
    test('成功认领一个空闲菜畦', () => {
        const availablePlot = gardenData.plots.find(p => p.status === 'available');
        assert(availablePlot, '没有找到空闲菜畦');
        
        testPlotId = availablePlot.id;
        const result = gardenData.claimPlot(testPlotId, '测试用户', 'tomato', '测试备注');
        
        assert(result.success === true, '认领失败: ' + result.message);
        assert(result.plot !== null, '认领结果未返回菜畦数据');
        assert(result.plot.status === 'claimed', '菜畦状态未更新为已认领');
        assert(result.plot.owner === '测试用户', '认领人未正确保存');
        assert(result.plot.crop === 'tomato', '作物类型未正确保存');
    });
    
    test('认领后按状态筛选能定位该菜畦', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        
        const claimedPlots = gardenData.getPlots({ status: 'claimed' });
        const found = claimedPlots.find(p => p.id === testPlotId);
        
        assert(found !== undefined, `按已认领筛选未找到菜畦 ${testPlotId}`);
        assert(found.owner === '测试用户', '筛选结果中认领人信息不正确');
        assert(found.crop === 'tomato', '筛选结果中作物信息不正确');
        console.log(`   成功定位到菜畦: ${found.id}, 认领人: ${found.owner}, 作物: ${found.crop}`);
    });
    
    test('认领后按作物筛选能定位该菜畦', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        
        const tomatoPlots = gardenData.getPlots({ crop: 'tomato' });
        const found = tomatoPlots.find(p => p.id === testPlotId);
        
        assert(found !== undefined, `按番茄筛选未找到菜畦 ${testPlotId}`);
        console.log(`   按番茄筛选成功定位到菜畦: ${found.id}`);
    });
    
    test('重复认领返回拒绝', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        
        const result = gardenData.claimPlot(testPlotId, '另一个用户', 'cucumber', '');
        
        assert(result.success === false, '重复认领应该返回失败');
        assert(result.message.includes('不能重复认领') || result.message.includes('已被认领'), 
            '错误信息不正确: ' + result.message);
        console.log(`   重复认领已被正确拒绝: ${result.message}`);
    });
    
    test('按认领人筛选能定位该菜畦', () => {
        assert(testPlotId, '测试菜畦ID未设置');
        
        const ownerPlots = gardenData.getPlots({ owner: '测试用户' });
        const found = ownerPlots.find(p => p.id === testPlotId);
        
        assert(found !== undefined, `按认领人筛选未找到菜畦 ${testPlotId}`);
        console.log(`   按认领人筛选成功定位到菜畦: ${found.id}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('测试组 3: 数据持久化验证');
    console.log('='.repeat(60));
    
    test('筛选条件持久化 - 保存筛选条件', () => {
        const testFilters = { status: 'claimed', crop: 'tomato', water: 'all', owner: 'all' };
        const result = gardenData.saveFilters(testFilters);
        assert(result === true, '保存筛选条件失败');
    });
    
    test('筛选条件持久化 - 加载筛选条件', () => {
        const saved = gardenData.loadFilters();
        assert(saved !== null, '未加载到保存的筛选条件');
        assert(saved.status === 'claimed', '状态筛选条件未正确保存');
        assert(saved.crop === 'tomato', '作物筛选条件未正确保存');
        console.log(`   加载到的筛选条件:`, saved);
    });
    
    test('最近筛选条件恢复', () => {
        const lastFilters = gardenData.loadLastFilters();
        assert(lastFilters !== null, '未加载到最近筛选条件');
        console.log(`   最近筛选条件:`, lastFilters);
    });
    
    test('清除筛选条件', () => {
        const result = gardenData.clearFiltersStorage();
        assert(result === true, '清除筛选条件失败');
        
        const cleared = gardenData.loadFilters();
        assert(cleared === null, '筛选条件未被清除');
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('测试组 4: 导出功能验证');
    console.log('='.repeat(60));
    
    test('导出卡片数据 - 全部数据', () => {
        const allData = gardenData.exportCardData({});
        const allClaimed = gardenData.plots.filter(p => p.status !== 'available');
        assert(allData.length === allClaimed.length, 
            `导出数据数量不匹配: 期望 ${allClaimed.length}, 实际 ${allData.length}`);
    });
    
    test('导出卡片数据 - 带筛选条件', () => {
        const filteredData = gardenData.exportCardData({ crop: 'tomato' });
        const tomatoClaimed = gardenData.plots.filter(p => 
            p.status !== 'available' && p.crop === 'tomato'
        );
        assert(filteredData.length === tomatoClaimed.length, 
            `筛选后导出数据数量不匹配: 期望 ${tomatoClaimed.length}, 实际 ${filteredData.length}`);
        assert(filteredData.every(d => d.crop === 'tomato'), 
            '导出数据包含非番茄作物');
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('测试组 5: 浇水提醒功能验证');
    console.log('='.repeat(60));
    
    test('需浇水菜畦检测功能正常', () => {
        const needsWater = gardenData.getNeedsWaterPlots();
        assert(Array.isArray(needsWater), '返回结果不是数组');
        assert(needsWater.every(p => p.status !== 'available'), 
            '需浇水列表包含空闲菜畦');
        console.log(`   当前需浇水菜畦数量: ${needsWater.length}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📝 总计: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 所有验收测试通过！');
    } else {
        console.log(`\n⚠️  有 ${failed} 个测试失败，请检查代码`);
    }
    
    return { passed, failed, total: passed + failed };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAcceptanceTests };
    console.log('验收测试脚本已加载，请在浏览器控制台运行 runAcceptanceTests()');
} else {
    window.runAcceptanceTests = runAcceptanceTests;
    console.log('验收测试脚本已加载，请运行 runAcceptanceTests()');
}
