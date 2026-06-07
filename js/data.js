const CROP_TYPES = {
    tomato: { name: '番茄', emoji: '🍅', waterDays: 2 },
    cucumber: { name: '黄瓜', emoji: '🥒', waterDays: 1 },
    carrot: { name: '胡萝卜', emoji: '🥕', waterDays: 3 },
    lettuce: { name: '生菜', emoji: '🥬', waterDays: 1 },
    pepper: { name: '辣椒', emoji: '🌶️', waterDays: 2 },
    eggplant: { name: '茄子', emoji: '🍆', waterDays: 2 },
    radish: { name: '土豆', emoji: '🥔', waterDays: 4 },
    onion: { name: '洋葱', emoji: '🧅', waterDays: 3 }
};

const STORAGE_KEYS = {
    PLOTS: 'community_garden_plots',
    INSPECTIONS: 'community_garden_inspections',
    INITIALIZED: 'community_garden_initialized'
};

class GardenData {
    constructor() {
        this.plots = [];
        this.inspections = [];
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const plotsData = localStorage.getItem(STORAGE_KEYS.PLOTS);
            const inspectionsData = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
            
            if (plotsData) {
                this.plots = JSON.parse(plotsData);
            } else {
                this.initializePlots();
            }
            
            if (inspectionsData) {
                this.inspections = JSON.parse(inspectionsData);
            } else {
                this.inspections = [];
            }
        } catch (e) {
            console.error('加载数据失败:', e);
            this.initializePlots();
            this.inspections = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.PLOTS, JSON.stringify(this.plots));
            localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(this.inspections));
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
            return true;
        } catch (e) {
            console.error('保存数据失败:', e);
            return false;
        }
    }

    initializePlots() {
        this.plots = [];
        const rows = 6;
        const cols = 8;
        let id = 1;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const plotId = `A${String(id).padStart(2, '0')}`;
                this.plots.push({
                    id: plotId,
                    row: r,
                    col: c,
                    status: 'available',
                    owner: null,
                    crop: null,
                    claimDate: null,
                    lastWaterDate: null,
                    remark: null
                });
                id++;
            }
        }
        
        this.saveToStorage();
    }

    getPlotById(plotId) {
        return this.plots.find(p => p.id === plotId);
    }

    getPlots(filters = {}) {
        let result = [...this.plots];
        
        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'available') {
                result = result.filter(p => p.status === 'available');
            } else if (filters.status === 'claimed') {
                result = result.filter(p => p.status !== 'available');
            }
        }
        
        if (filters.crop && filters.crop !== 'all') {
            result = result.filter(p => p.crop === filters.crop);
        }
        
        if (filters.owner && filters.owner !== 'all') {
            result = result.filter(p => p.owner === filters.owner);
        }
        
        return result;
    }

    claimPlot(plotId, owner, crop, remark = '') {
        const plot = this.getPlotById(plotId);
        
        if (!plot) {
            return { success: false, message: '菜畦不存在' };
        }
        
        if (plot.status !== 'available') {
            return { success: false, message: '该菜畦已被认领，不能重复认领' };
        }
        
        if (!owner || owner.trim() === '') {
            return { success: false, message: '请输入认领人姓名' };
        }
        
        if (!crop || !CROP_TYPES[crop]) {
            return { success: false, message: '请选择作物类型' };
        }
        
        plot.status = 'claimed';
        plot.owner = owner.trim();
        plot.crop = crop;
        plot.claimDate = new Date().toISOString();
        plot.lastWaterDate = new Date().toISOString();
        plot.remark = remark || null;
        
        this.saveToStorage();
        return { success: true, message: '认领成功', plot };
    }

    waterPlot(plotId) {
        const plot = this.getPlotById(plotId);
        if (!plot) {
            return { success: false, message: '菜畦不存在' };
        }
        if (plot.status === 'available') {
            return { success: false, message: '空闲菜畦无需浇水' };
        }
        plot.lastWaterDate = new Date().toISOString();
        this.saveToStorage();
        return { success: true, message: '浇水成功' };
    }

    getNeedsWaterPlots() {
        const now = new Date();
        return this.plots.filter(plot => {
            if (plot.status === 'available' || !plot.lastWaterDate) {
                return false;
            }
            const cropInfo = CROP_TYPES[plot.crop];
            if (!cropInfo) return false;
            
            const lastWater = new Date(plot.lastWaterDate);
            const daysSinceWater = Math.floor((now - lastWater) / (1000 * 60 * 60 * 24));
            return daysSinceWater >= cropInfo.waterDays;
        });
    }

    getStats() {
        const total = this.plots.length;
        const claimed = this.plots.filter(p => p.status !== 'available').length;
        const available = total - claimed;
        const needsWater = this.getNeedsWaterPlots().length;
        
        return { total, claimed, available, needsWater };
    }

    getUniqueOwners() {
        const owners = this.plots
            .filter(p => p.owner)
            .map(p => p.owner);
        return [...new Set(owners)];
    }

    getUniqueCrops() {
        const crops = this.plots
            .filter(p => p.crop)
            .map(p => p.crop);
        return [...new Set(crops)];
    }

    addInspection(plotId, person, content, status = 'normal') {
        if (!plotId) {
            return { success: false, message: '请选择巡查菜畦' };
        }
        if (!person || person.trim() === '') {
            return { success: false, message: '请输入巡查人姓名' };
        }
        if (!content || content.trim() === '') {
            return { success: false, message: '请输入巡查内容' };
        }
        
        const inspection = {
            id: 'I' + Date.now(),
            plotId,
            person: person.trim(),
            content: content.trim(),
            status,
            date: new Date().toISOString()
        };
        
        this.inspections.unshift(inspection);
        this.saveToStorage();
        return { success: true, message: '巡查记录已保存', inspection };
    }

    getInspections(plotId = null) {
        if (plotId) {
            return this.inspections.filter(i => i.plotId === plotId);
        }
        return [...this.inspections];
    }

    resetData() {
        localStorage.removeItem(STORAGE_KEYS.PLOTS);
        localStorage.removeItem(STORAGE_KEYS.INSPECTIONS);
        localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
        this.initializePlots();
        this.inspections = [];
        return { success: true, message: '数据已重置' };
    }

    healthCheck() {
        const results = [];
        
        results.push({
            name: '本地存储',
            status: typeof Storage !== 'undefined' ? 'ok' : 'error',
            message: typeof Storage !== 'undefined' ? 'localStorage 可用' : '浏览器不支持本地存储'
        });
        
        results.push({
            name: '数据初始化',
            status: this.plots.length > 0 ? 'ok' : 'error',
            message: this.plots.length > 0 ? `已加载 ${this.plots.length} 个菜畦` : '菜畦数据未加载'
        });
        
        results.push({
            name: '数据完整性',
            status: this.plots.every(p => p.id) ? 'ok' : 'error',
            message: this.plots.every(p => p.id) ? '所有菜畦数据完整' : '存在数据不完整的菜畦'
        });
        
        const saved = this.saveToStorage();
        results.push({
            name: '数据持久化',
            status: saved ? 'ok' : 'error',
            message: saved ? '数据保存正常' : '数据保存失败'
        });
        
        return results;
    }

    exportCardData() {
        return this.plots
            .filter(p => p.status !== 'available')
            .map(plot => ({
                id: plot.id,
                owner: plot.owner,
                crop: plot.crop,
                cropName: CROP_TYPES[plot.crop]?.name || plot.crop,
                cropEmoji: CROP_TYPES[plot.crop]?.emoji || '🌱',
                claimDate: plot.claimDate,
                remark: plot.remark || '-'
            }));
    }
}

const gardenData = new GardenData();
