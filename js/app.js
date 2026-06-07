(function() {
    'use strict';

    class GardenApp {
        constructor() {
            this.currentFilters = {
                status: 'all',
                crop: 'all',
                water: 'all',
                owner: 'all'
            };
            this.tempFilters = {
                status: 'all',
                crop: 'all',
                water: 'all',
                owner: 'all'
            };
            this.isFilterActive = false;
            this.selectedPlotId = null;
            this.initialized = false;
        }

        init() {
            try {
                console.log('[GardenApp] 开始初始化...');
                
                if (!this.checkDependencies()) {
                    throw new Error('依赖检查失败');
                }

                if (!this.checkDOM()) {
                    throw new Error('DOM 元素检查失败');
                }

                this.loadSavedFilters();
                this.bindEvents();
                this.renderGardenMap();
                this.renderStats();
                this.renderFilters();
                this.renderReminders();
                this.renderInspections();
                this.startReminderCheck();
                this.updateFilterActiveBar();
                
                this.initialized = true;
                console.log('[GardenApp] 初始化完成');
                
                if (typeof showApp === 'function') {
                    showApp();
                } else {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('app').style.display = 'flex';
                }
                
            } catch (e) {
                console.error('[GardenApp] 初始化失败:', e);
                if (typeof showErrorScreen === 'function') {
                    showErrorScreen('应用初始化失败: ' + e.message);
                } else {
                    alert('应用初始化失败: ' + e.message);
                }
            }
        }

        checkDependencies() {
            if (typeof gardenData === 'undefined') {
                console.error('gardenData 未定义');
                return false;
            }
            if (typeof CROP_TYPES === 'undefined') {
                console.error('CROP_TYPES 未定义');
                return false;
            }
            console.log('[GardenApp] 依赖检查通过');
            return true;
        }

        checkDOM() {
            const requiredElements = [
                'garden-map', 'stat-total', 'stat-claimed', 'stat-available', 'stat-needs-water',
                'filter-status', 'filter-crop', 'filter-water', 'filter-owner',
                'btn-reset-filter', 'btn-restore-filter', 'btn-apply-filter',
                'btn-filter-toggle', 'btn-clear-active-filter',
                'sidebar-drawer', 'drawer-overlay', 'drawer-close',
                'filter-active-bar', 'filter-active-tags',
                'reminder-list', 'inspection-list', 'btn-add-inspection',
                'btn-export', 'btn-health', 'toast',
                'claim-modal', 'inspection-modal', 'health-modal'
            ];

            for (const id of requiredElements) {
                const el = document.getElementById(id);
                if (!el) {
                    console.error(`DOM 元素 #${id} 不存在`);
                    return false;
                }
            }
            console.log('[GardenApp] DOM 检查通过');
            return true;
        }

        loadSavedFilters() {
            const savedFilters = gardenData.loadFilters();
            if (savedFilters) {
                this.currentFilters = { ...savedFilters };
                this.tempFilters = { ...savedFilters };
                this.isFilterActive = this.hasActiveFilters();
                console.log('[GardenApp] 已加载保存的筛选条件:', savedFilters);
            }
        }

        hasActiveFilters() {
            return this.currentFilters.status !== 'all' ||
                   this.currentFilters.crop !== 'all' ||
                   this.currentFilters.water !== 'all' ||
                   this.currentFilters.owner !== 'all';
        }

        bindEvents() {
            document.getElementById('btn-filter-toggle').addEventListener('click', () => {
                this.openFilterDrawer();
            });

            document.getElementById('drawer-close').addEventListener('click', () => {
                this.closeFilterDrawer();
            });

            document.getElementById('drawer-overlay').addEventListener('click', () => {
                this.closeFilterDrawer();
            });

            document.getElementById('filter-status').addEventListener('change', (e) => {
                this.tempFilters.status = e.target.value;
            });

            document.getElementById('filter-crop').addEventListener('change', (e) => {
                this.tempFilters.crop = e.target.value;
            });

            document.getElementById('filter-water').addEventListener('change', (e) => {
                this.tempFilters.water = e.target.value;
            });

            document.getElementById('filter-owner').addEventListener('change', (e) => {
                this.tempFilters.owner = e.target.value;
            });

            document.getElementById('btn-apply-filter').addEventListener('click', () => {
                this.applyFilters();
            });

            document.getElementById('btn-reset-filter').addEventListener('click', () => {
                this.resetTempFilters();
            });

            document.getElementById('btn-restore-filter').addEventListener('click', () => {
                this.restoreLastFilters();
            });

            document.getElementById('btn-clear-active-filter').addEventListener('click', () => {
                this.clearAllFilters();
            });

            document.getElementById('modal-close').addEventListener('click', () => {
                this.hideClaimModal();
            });

            document.getElementById('btn-cancel-claim').addEventListener('click', () => {
                this.hideClaimModal();
            });

            document.getElementById('btn-confirm-claim').addEventListener('click', () => {
                this.confirmClaim();
            });

            document.getElementById('inspection-modal-close').addEventListener('click', () => {
                this.hideInspectionModal();
            });

            document.getElementById('btn-cancel-inspection').addEventListener('click', () => {
                this.hideInspectionModal();
            });

            document.getElementById('btn-confirm-inspection').addEventListener('click', () => {
                this.confirmInspection();
            });

            document.getElementById('btn-add-inspection').addEventListener('click', () => {
                this.showInspectionModal();
            });

            document.getElementById('btn-export').addEventListener('click', () => {
                this.exportCards();
            });

            document.getElementById('btn-health').addEventListener('click', () => {
                this.showHealthCheck();
            });

            document.getElementById('health-modal-close').addEventListener('click', () => {
                this.hideHealthModal();
            });

            document.getElementById('btn-close-health').addEventListener('click', () => {
                this.hideHealthModal();
            });

            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('show');
                    }
                });
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
                    this.closeFilterDrawer();
                }
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    this.closeFilterDrawer();
                }
            });
        }

        openFilterDrawer() {
            this.tempFilters = { ...this.currentFilters };
            this.updateFilterSelects(this.tempFilters);
            document.getElementById('sidebar-drawer').classList.add('open');
            document.getElementById('drawer-overlay').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        closeFilterDrawer() {
            document.getElementById('sidebar-drawer').classList.remove('open');
            document.getElementById('drawer-overlay').classList.remove('show');
            document.body.style.overflow = '';
        }

        updateFilterSelects(filters) {
            document.getElementById('filter-status').value = filters.status;
            document.getElementById('filter-crop').value = filters.crop;
            document.getElementById('filter-water').value = filters.water;
            document.getElementById('filter-owner').value = filters.owner;
        }

        applyFilters() {
            this.currentFilters = { ...this.tempFilters };
            this.isFilterActive = this.hasActiveFilters();
            
            if (this.isFilterActive) {
                gardenData.saveFilters(this.currentFilters);
            } else {
                gardenData.clearFiltersStorage();
            }
            
            this.renderGardenMap();
            this.renderReminders();
            this.updateFilterActiveBar();
            this.closeFilterDrawer();
            
            const count = gardenData.getPlots(this.currentFilters).length;
            this.showToast(`筛选完成，找到 ${count} 个菜畦`, 'success');
        }

        resetTempFilters() {
            this.tempFilters = {
                status: 'all',
                crop: 'all',
                water: 'all',
                owner: 'all'
            };
            this.updateFilterSelects(this.tempFilters);
            this.showToast('筛选条件已重置', 'success');
        }

        restoreLastFilters() {
            const lastFilters = gardenData.loadLastFilters();
            if (lastFilters) {
                this.tempFilters = { ...lastFilters };
                this.updateFilterSelects(this.tempFilters);
                this.showToast('已恢复最近筛选条件', 'success');
            } else {
                this.showToast('没有保存的筛选条件', 'warning');
            }
        }

        clearAllFilters() {
            this.currentFilters = {
                status: 'all',
                crop: 'all',
                water: 'all',
                owner: 'all'
            };
            this.tempFilters = { ...this.currentFilters };
            this.isFilterActive = false;
            gardenData.clearFiltersStorage();
            this.updateFilterSelects(this.currentFilters);
            this.renderGardenMap();
            this.renderReminders();
            this.updateFilterActiveBar();
            this.showToast('筛选条件已清除', 'success');
        }

        updateFilterActiveBar() {
            const bar = document.getElementById('filter-active-bar');
            const tagsContainer = document.getElementById('filter-active-tags');
            
            if (!this.isFilterActive) {
                bar.style.display = 'none';
                return;
            }
            
            bar.style.display = 'flex';
            const tags = [];
            
            if (this.currentFilters.status !== 'all') {
                const label = this.currentFilters.status === 'available' ? '空闲' : '已认领';
                tags.push(`<span class="filter-tag">状态: ${label}</span>`);
            }
            
            if (this.currentFilters.crop !== 'all') {
                const cropInfo = CROP_TYPES[this.currentFilters.crop];
                const label = cropInfo ? `${cropInfo.emoji} ${cropInfo.name}` : this.currentFilters.crop;
                tags.push(`<span class="filter-tag">作物: ${label}</span>`);
            }
            
            if (this.currentFilters.water !== 'all') {
                const label = this.currentFilters.water === 'needs' ? '需浇水' : '无需浇水';
                tags.push(`<span class="filter-tag">浇水: ${label}</span>`);
            }
            
            if (this.currentFilters.owner !== 'all') {
                tags.push(`<span class="filter-tag">认领人: ${this.currentFilters.owner}</span>`);
            }
            
            tagsContainer.innerHTML = tags.join('');
        }

        renderGardenMap() {
            try {
                const mapContainer = document.getElementById('garden-map');
                const allPlots = gardenData.plots;
                const filteredPlotIds = gardenData.getPlots(this.currentFilters).map(p => p.id);
                const needsWaterIds = gardenData.getNeedsWaterPlots().map(p => p.id);
                
                mapContainer.innerHTML = '';
                
                if (allPlots.length === 0) {
                    mapContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">暂无菜畦数据</div>';
                    return;
                }
                
                allPlots.forEach(plot => {
                    const cell = document.createElement('div');
                    cell.className = 'plot-cell';
                    
                    let cellStatus = plot.status;
                    if (cellStatus === 'claimed' && needsWaterIds.includes(plot.id)) {
                        cellStatus = 'needs-water';
                    }
                    cell.classList.add(`status-${cellStatus}`);
                    
                    if (this.isFilterActive) {
                        if (filteredPlotIds.includes(plot.id)) {
                            cell.classList.add('status-highlighted');
                        } else {
                            cell.classList.add('dimmed');
                        }
                    }
                    
                    cell.dataset.plotId = plot.id;
                    
                    let content = `<div class="plot-id">${plot.id}</div>`;
                    
                    if (plot.status !== 'available' && plot.crop) {
                        const cropInfo = CROP_TYPES[plot.crop];
                        content += `<div class="plot-crop">${cropInfo?.emoji || '🌱'}</div>`;
                        content += `<div class="plot-owner">${plot.owner || ''}</div>`;
                    } else {
                        content += `<div class="plot-crop">🌱</div>`;
                        content += `<div class="plot-owner">空闲</div>`;
                    }
                    
                    cell.innerHTML = content;
                    
                    cell.addEventListener('click', () => {
                        this.handlePlotClick(plot);
                    });
                    
                    mapContainer.appendChild(cell);
                });
            } catch (e) {
                console.error('渲染菜园平面图失败:', e);
            }
        }

        handlePlotClick(plot) {
            if (plot.status === 'available') {
                this.showClaimModal(plot.id);
            } else {
                this.showPlotDetail(plot);
            }
        }

        showClaimModal(plotId) {
            const plot = gardenData.getPlotById(plotId);
            if (!plot || plot.status !== 'available') {
                this.showToast('该菜畦不可认领', 'error');
                return;
            }
            
            this.selectedPlotId = plotId;
            document.getElementById('claim-plot-id').value = plotId;
            document.getElementById('claim-owner').value = '';
            document.getElementById('claim-crop').value = '';
            document.getElementById('claim-remark').value = '';
            document.getElementById('claim-error').style.display = 'none';
            document.getElementById('claim-modal').classList.add('show');
            
            setTimeout(() => {
                document.getElementById('claim-owner').focus();
            }, 100);
        }

        hideClaimModal() {
            document.getElementById('claim-modal').classList.remove('show');
            this.selectedPlotId = null;
        }

        confirmClaim() {
            const owner = document.getElementById('claim-owner').value.trim();
            const crop = document.getElementById('claim-crop').value;
            const remark = document.getElementById('claim-remark').value.trim();
            const errorEl = document.getElementById('claim-error');
            
            const result = gardenData.claimPlot(this.selectedPlotId, owner, crop, remark);
            
            if (result.success) {
                this.hideClaimModal();
                this.showToast(result.message, 'success');
                this.renderGardenMap();
                this.renderStats();
                this.renderFilters();
                this.renderReminders();
                if (this.isFilterActive) {
                    this.updateFilterActiveBar();
                }
            } else {
                errorEl.textContent = result.message;
                errorEl.style.display = 'block';
                this.showToast(result.message, 'error');
            }
        }

        showPlotDetail(plot) {
            const cropInfo = CROP_TYPES[plot.crop];
            const isNeedsWater = gardenData.getNeedsWaterPlots().some(p => p.id === plot.id);
            
            let message = `菜畦 ${plot.id}\n`;
            message += `认领人: ${plot.owner}\n`;
            message += `作物: ${cropInfo?.name || plot.crop} ${cropInfo?.emoji || ''}\n`;
            if (plot.claimDate) {
                message += `认领时间: ${new Date(plot.claimDate).toLocaleDateString()}\n`;
            }
            if (plot.lastWaterDate) {
                message += `上次浇水: ${new Date(plot.lastWaterDate).toLocaleDateString()}\n`;
            }
            if (isNeedsWater) {
                message += `⚠️ 需要浇水\n`;
            }
            if (plot.remark) {
                message += `备注: ${plot.remark}\n`;
            }
            
            const inspections = gardenData.getInspections(plot.id);
            if (inspections.length > 0) {
                message += `\n巡查记录 (${inspections.length}条):\n`;
                inspections.slice(0, 3).forEach(ins => {
                    message += `- ${new Date(ins.date).toLocaleDateString()}: ${ins.person}\n`;
                });
            }
            
            if (isNeedsWater) {
                if (confirm(message + '\n\n是否立即浇水?')) {
                    const waterResult = gardenData.waterPlot(plot.id);
                    if (waterResult.success) {
                        this.showToast(waterResult.message, 'success');
                        this.renderGardenMap();
                        this.renderReminders();
                        this.renderStats();
                    }
                }
            } else {
                alert(message);
            }
        }

        renderStats() {
            try {
                const stats = gardenData.getStats();
                document.getElementById('stat-total').textContent = stats.total;
                document.getElementById('stat-claimed').textContent = stats.claimed;
                document.getElementById('stat-available').textContent = stats.available;
                document.getElementById('stat-needs-water').textContent = stats.needsWater;
            } catch (e) {
                console.error('渲染统计数据失败:', e);
            }
        }

        renderFilters() {
            try {
                const cropSelect = document.getElementById('filter-crop');
                const ownerSelect = document.getElementById('filter-owner');
                
                const currentCrop = this.tempFilters.crop;
                const currentOwner = this.tempFilters.owner;
                
                const crops = gardenData.getUniqueCrops();
                cropSelect.innerHTML = '<option value="all">全部</option>';
                crops.forEach(crop => {
                    const cropInfo = CROP_TYPES[crop];
                    const option = document.createElement('option');
                    option.value = crop;
                    option.textContent = `${cropInfo?.emoji || ''} ${cropInfo?.name || crop}`;
                    cropSelect.appendChild(option);
                });
                cropSelect.value = currentCrop;
                
                const owners = gardenData.getUniqueOwners();
                ownerSelect.innerHTML = '<option value="all">全部</option>';
                owners.forEach(owner => {
                    const option = document.createElement('option');
                    option.value = owner;
                    option.textContent = owner;
                    ownerSelect.appendChild(option);
                });
                ownerSelect.value = currentOwner;
            } catch (e) {
                console.error('渲染筛选器失败:', e);
            }
        }

        renderReminders() {
            try {
                const listContainer = document.getElementById('reminder-list');
                let needsWaterPlots = gardenData.getNeedsWaterPlots();
                
                if (this.isFilterActive) {
                    const filteredIds = gardenData.getPlots(this.currentFilters).map(p => p.id);
                    needsWaterPlots = needsWaterPlots.filter(p => filteredIds.includes(p.id));
                }
                
                if (needsWaterPlots.length === 0) {
                    listContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 16px;">暂无浇水提醒</div>';
                    return;
                }
                
                listContainer.innerHTML = '';
                needsWaterPlots.forEach(plot => {
                    const cropInfo = CROP_TYPES[plot.crop];
                    const item = document.createElement('div');
                    item.className = 'reminder-item';
                    item.innerHTML = `
                        <div class="reminder-title">${plot.id} - ${cropInfo?.name || plot.crop}</div>
                        <div class="reminder-desc">认领人: ${plot.owner} | 点击浇水</div>
                    `;
                    item.addEventListener('click', () => {
                        const result = gardenData.waterPlot(plot.id);
                        if (result.success) {
                            this.showToast(result.message, 'success');
                            this.renderGardenMap();
                            this.renderReminders();
                            this.renderStats();
                        }
                    });
                    listContainer.appendChild(item);
                });
            } catch (e) {
                console.error('渲染提醒面板失败:', e);
            }
        }

        renderInspections() {
            try {
                const listContainer = document.getElementById('inspection-list');
                const inspections = gardenData.getInspections();
                
                if (inspections.length === 0) {
                    listContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 16px;">暂无巡查记录</div>';
                    return;
                }
                
                listContainer.innerHTML = '';
                inspections.slice(0, 10).forEach(ins => {
                    const item = document.createElement('div');
                    item.className = `inspection-item status-${ins.status}`;
                    item.innerHTML = `
                        <div class="inspection-header">
                            <span class="inspection-plot">${ins.plotId}</span>
                            <span class="inspection-date">${new Date(ins.date).toLocaleDateString()}</span>
                        </div>
                        <div class="inspection-person">巡查人: ${ins.person}</div>
                        <div class="inspection-content">${ins.content}</div>
                    `;
                    listContainer.appendChild(item);
                });
            } catch (e) {
                console.error('渲染巡查记录失败:', e);
            }
        }

        showInspectionModal() {
            try {
                const plotSelect = document.getElementById('inspection-plot');
                plotSelect.innerHTML = '';
                
                const plots = gardenData.plots;
                plots.forEach(plot => {
                    const option = document.createElement('option');
                    option.value = plot.id;
                    const cropInfo = plot.crop ? CROP_TYPES[plot.crop] : null;
                    const suffix = plot.status !== 'available' ? ` - ${cropInfo?.name || plot.crop}` : ' - 空闲';
                    option.textContent = plot.id + suffix;
                    plotSelect.appendChild(option);
                });
                
                document.getElementById('inspection-person').value = '';
                document.getElementById('inspection-content').value = '';
                document.getElementById('inspection-status').value = 'normal';
                document.getElementById('inspection-error').style.display = 'none';
                document.getElementById('inspection-modal').classList.add('show');
                
                setTimeout(() => {
                    document.getElementById('inspection-person').focus();
                }, 100);
            } catch (e) {
                console.error('显示巡查弹窗失败:', e);
            }
        }

        hideInspectionModal() {
            document.getElementById('inspection-modal').classList.remove('show');
        }

        confirmInspection() {
            const plotId = document.getElementById('inspection-plot').value;
            const person = document.getElementById('inspection-person').value.trim();
            const content = document.getElementById('inspection-content').value.trim();
            const status = document.getElementById('inspection-status').value;
            const errorEl = document.getElementById('inspection-error');
            
            const result = gardenData.addInspection(plotId, person, content, status);
            
            if (result.success) {
                this.hideInspectionModal();
                this.showToast(result.message, 'success');
                this.renderInspections();
            } else {
                errorEl.textContent = result.message;
                errorEl.style.display = 'block';
                this.showToast(result.message, 'error');
            }
        }

        exportCards() {
            try {
                const cardData = gardenData.exportCardData(this.currentFilters);
                
                if (cardData.length === 0) {
                    this.showToast('暂无符合条件的已认领菜畦可导出', 'warning');
                    return;
                }
                
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>社区菜园认领卡片</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
                                padding: 20px;
                                background: #f5f5f5;
                            }
                            h1 {
                                text-align: center;
                                color: #2d5a27;
                                margin-bottom: 30px;
                            }
                            .filter-info {
                                text-align: center;
                                color: #666;
                                margin-bottom: 20px;
                                font-size: 14px;
                            }
                            .cards-container {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 20px;
                                max-width: 1200px;
                                margin: 0 auto;
                            }
                            .card {
                                background: white;
                                border-radius: 12px;
                                padding: 20px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                border-top: 4px solid #52c41a;
                                break-inside: avoid;
                            }
                            .card-header {
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                margin-bottom: 16px;
                                padding-bottom: 12px;
                                border-bottom: 1px solid #eee;
                            }
                            .card-plot {
                                font-size: 24px;
                                font-weight: bold;
                                color: #2d5a27;
                            }
                            .card-crop {
                                font-size: 32px;
                            }
                            .card-body {
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                            }
                            .card-row {
                                display: flex;
                                justify-content: space-between;
                                font-size: 14px;
                            }
                            .card-label {
                                color: #888;
                            }
                            .card-value {
                                font-weight: 500;
                                color: #333;
                            }
                            .card-remark {
                                margin-top: 12px;
                                padding-top: 12px;
                                border-top: 1px dashed #eee;
                                font-size: 13px;
                                color: #666;
                            }
                            @media print {
                                body {
                                    background: white;
                                    padding: 10px;
                                }
                                .cards-container {
                                    grid-template-columns: repeat(2, 1fr);
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>🌱 社区菜园认领卡片</h1>
                        ${this.isFilterActive ? '<div class="filter-info">（按筛选条件导出）</div>' : ''}
                        <div class="cards-container">
                            ${cardData.map(data => `
                                <div class="card">
                                    <div class="card-header">
                                        <span class="card-crop">${data.cropEmoji}</span>
                                        <span class="card-plot">${data.id}</span>
                                    </div>
                                    <div class="card-body">
                                        <div class="card-row">
                                            <span class="card-label">认领人</span>
                                            <span class="card-value">${data.owner}</span>
                                        </div>
                                        <div class="card-row">
                                            <span class="card-label">作物</span>
                                            <span class="card-value">${data.cropName}</span>
                                        </div>
                                        <div class="card-row">
                                            <span class="card-label">认领日期</span>
                                            <span class="card-value">${new Date(data.claimDate).toLocaleDateString()}</span>
                                        </div>
                                        ${data.remark && data.remark !== '-' ? `
                                            <div class="card-remark">
                                                <strong>备注:</strong> ${data.remark}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                this.showToast(`已导出 ${cardData.length} 张卡片`, 'success');
            } catch (e) {
                console.error('导出卡片失败:', e);
                this.showToast('导出卡片失败: ' + e.message, 'error');
            }
        }

        showHealthCheck() {
            try {
                const results = gardenData.healthCheck();
                const container = document.getElementById('health-results');
                
                container.innerHTML = results.map(r => `
                    <div class="health-item">
                        <span>${r.name}</span>
                        <span class="health-status ${r.status}">
                            ${r.status === 'ok' ? '✅' : '❌'} ${r.message}
                        </span>
                    </div>
                `).join('');
                
                document.getElementById('health-modal').classList.add('show');
            } catch (e) {
                console.error('健康检查失败:', e);
                this.showToast('健康检查失败', 'error');
            }
        }

        hideHealthModal() {
            document.getElementById('health-modal').classList.remove('show');
        }

        showToast(message, type = 'success') {
            try {
                const toast = document.getElementById('toast');
                toast.textContent = message;
                toast.className = `toast show ${type}`;
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 2500);
            } catch (e) {
                console.error('显示提示失败:', e);
            }
        }

        startReminderCheck() {
            setInterval(() => {
                try {
                    this.renderReminders();
                    this.renderGardenMap();
                    this.renderStats();
                } catch (e) {
                    console.error('定时检查失败:', e);
                }
            }, 60000);
        }
    }

    function bootstrap() {
        console.log('[Bootstrap] 启动社区菜园认领图...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.gardenApp = new GardenApp();
                window.gardenApp.init();
            });
        } else {
            window.gardenApp = new GardenApp();
            window.gardenApp.init();
        }
    }

    if (typeof window !== 'undefined') {
        bootstrap();
    }
})();
