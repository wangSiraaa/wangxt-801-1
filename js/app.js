class GardenApp {
    constructor() {
        this.currentFilters = {
            status: 'all',
            crop: 'all',
            owner: 'all'
        };
        this.selectedPlotId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderGardenMap();
        this.renderStats();
        this.renderFilters();
        this.renderReminders();
        this.renderInspections();
        this.startReminderCheck();
    }

    bindEvents() {
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.renderGardenMap();
        });

        document.getElementById('filter-crop').addEventListener('change', (e) => {
            this.currentFilters.crop = e.target.value;
            this.renderGardenMap();
        });

        document.getElementById('filter-owner').addEventListener('change', (e) => {
            this.currentFilters.owner = e.target.value;
            this.renderGardenMap();
        });

        document.getElementById('btn-reset-filter').addEventListener('click', () => {
            this.resetFilters();
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
    }

    renderGardenMap() {
        const mapContainer = document.getElementById('garden-map');
        const plots = gardenData.getPlots(this.currentFilters);
        const needsWaterIds = gardenData.getNeedsWaterPlots().map(p => p.id);
        
        mapContainer.innerHTML = '';
        
        plots.forEach(plot => {
            const cell = document.createElement('div');
            cell.className = 'plot-cell';
            
            let cellStatus = plot.status;
            if (cellStatus === 'claimed' && needsWaterIds.includes(plot.id)) {
                cellStatus = 'needs-water';
            }
            cell.classList.add(`status-${cellStatus}`);
            
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
    }

    handlePlotClick(plot) {
        if (plot.status === 'available') {
            this.showClaimModal(plot.id);
        } else {
            this.showPlotDetail(plot);
        }
    }

    showClaimModal(plotId) {
        this.selectedPlotId = plotId;
        document.getElementById('claim-plot-id').value = plotId;
        document.getElementById('claim-owner').value = '';
        document.getElementById('claim-crop').value = '';
        document.getElementById('claim-remark').value = '';
        document.getElementById('claim-error').style.display = 'none';
        document.getElementById('claim-modal').classList.add('show');
    }

    hideClaimModal() {
        document.getElementById('claim-modal').classList.remove('show');
        this.selectedPlotId = null;
    }

    confirmClaim() {
        const owner = document.getElementById('claim-owner').value;
        const crop = document.getElementById('claim-crop').value;
        const remark = document.getElementById('claim-remark').value;
        const errorEl = document.getElementById('claim-error');
        
        const result = gardenData.claimPlot(this.selectedPlotId, owner, crop, remark);
        
        if (result.success) {
            this.hideClaimModal();
            this.showToast(result.message, 'success');
            this.renderGardenMap();
            this.renderStats();
            this.renderFilters();
            this.renderReminders();
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
        
        const actions = ['确定'];
        if (isNeedsWater) {
            actions.unshift('浇水');
        }
        
        const action = confirm(message + '\n\n点击"确定"关闭，或查看详细信息');
        if (isNeedsWater && action) {
            const waterResult = gardenData.waterPlot(plot.id);
            if (waterResult.success) {
                this.showToast(waterResult.message, 'success');
                this.renderGardenMap();
                this.renderReminders();
            }
        }
    }

    renderStats() {
        const stats = gardenData.getStats();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-claimed').textContent = stats.claimed;
        document.getElementById('stat-available').textContent = stats.available;
        document.getElementById('stat-needs-water').textContent = stats.needsWater;
    }

    renderFilters() {
        const cropSelect = document.getElementById('filter-crop');
        const ownerSelect = document.getElementById('filter-owner');
        
        const crops = gardenData.getUniqueCrops();
        cropSelect.innerHTML = '<option value="all">全部</option>';
        crops.forEach(crop => {
            const cropInfo = CROP_TYPES[crop];
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = `${cropInfo?.emoji || ''} ${cropInfo?.name || crop}`;
            cropSelect.appendChild(option);
        });
        cropSelect.value = this.currentFilters.crop;
        
        const owners = gardenData.getUniqueOwners();
        ownerSelect.innerHTML = '<option value="all">全部</option>';
        owners.forEach(owner => {
            const option = document.createElement('option');
            option.value = owner;
            option.textContent = owner;
            ownerSelect.appendChild(option);
        });
        ownerSelect.value = this.currentFilters.owner;
    }

    resetFilters() {
        this.currentFilters = {
            status: 'all',
            crop: 'all',
            owner: 'all'
        };
        document.getElementById('filter-status').value = 'all';
        document.getElementById('filter-crop').value = 'all';
        document.getElementById('filter-owner').value = 'all';
        this.renderGardenMap();
    }

    renderReminders() {
        const listContainer = document.getElementById('reminder-list');
        const needsWaterPlots = gardenData.getNeedsWaterPlots();
        
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
                <div class="reminder-desc">认领人: ${plot.owner} | 需要浇水</div>
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
    }

    renderInspections() {
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
    }

    showInspectionModal() {
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
    }

    hideInspectionModal() {
        document.getElementById('inspection-modal').classList.remove('show');
    }

    confirmInspection() {
        const plotId = document.getElementById('inspection-plot').value;
        const person = document.getElementById('inspection-person').value;
        const content = document.getElementById('inspection-content').value;
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
        const cardData = gardenData.exportCardData();
        
        if (cardData.length === 0) {
            this.showToast('暂无已认领菜畦可导出', 'warning');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>社区菜园认领卡片</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    h1 {
                        text-align: center;
                        color: #2d5a27;
                        margin-bottom: 30px;
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
                        }
                        .cards-container {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                </style>
            </head>
            <body>
                <h1>🌱 社区菜园认领卡片</h1>
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
        this.showToast('卡片导出成功', 'success');
    }

    showHealthCheck() {
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
    }

    hideHealthModal() {
        document.getElementById('health-modal').classList.remove('show');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    startReminderCheck() {
        setInterval(() => {
            this.renderReminders();
            this.renderGardenMap();
            this.renderStats();
        }, 60000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gardenApp = new GardenApp();
});
