const store = require('../../utils/store');
const D = require('../../utils/date');

Page({
  data: {
    id: '', name: '',
    presets: [30, 60, 90, 120],
    targetMin: 60, custom: false, customVal: '',
    start: '', end: '',
    title: '新建计划'
  },

  onLoad(q) {
    if (q.id) {
      const p = store.planById(q.id);
      if (!p) { wx.navigateBack(); return; }
      const preset = this.data.presets.includes(p.targetMin);
      this.setData({
        id: p.id, name: p.name, targetMin: p.targetMin,
        custom: !preset, customVal: preset ? '' : String(p.targetMin),
        start: p.start, end: p.end, title: '编辑计划'
      });
    } else {
      this.setData({ start: D.today(), end: D.addDays(D.today(), 364) });
    }
    wx.setNavigationBarTitle({ title: this.data.title });
  },

  onName(e) { this.setData({ name: e.detail.value }); },

  choose(e) {
    this.setData({ targetMin: Number(e.currentTarget.dataset.min), custom: false, customVal: '' });
  },
  chooseCustom() {
    this.setData({ custom: true, customVal: this.data.customVal || String(this.data.targetMin) });
  },
  onCustom(e) {
    const v = e.detail.value.replace(/[^0-9]/g, '');
    this.setData({ customVal: v, targetMin: Number(v) || 0 });
  },

  onStart(e) {
    const start = e.detail.value;
    const patch = { start };
    if (this.data.end < start) patch.end = D.addDays(start, 364);
    this.setData(patch);
  },
  onEnd(e) { this.setData({ end: e.detail.value }); },

  save() {
    const { id, name, targetMin, start, end } = this.data;
    if (!name.trim()) { wx.showToast({ title: '请填写计划名称', icon: 'none' }); return; }
    if (!targetMin || targetMin < 1) { wx.showToast({ title: '请设置每日目标分钟数', icon: 'none' }); return; }
    if (end < start) { wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' }); return; }
    const data = { name: name.trim().slice(0, 20), targetMin, start, end };
    if (id) {
      const p = store.planById(id);
      const patch = Object.assign({}, data);
      if (p.targetMin !== targetMin) {
        patch.targetVersion = (p.targetVersion || 1) + 1;
        patch.changedAt = D.today();
      }
      store.updatePlan(id, patch);
      wx.showToast({ title: '已保存', icon: 'success' });
    } else {
      store.addPlan(data);
      wx.showToast({ title: '已创建', icon: 'success' });
    }
    setTimeout(() => wx.navigateBack(), 400);
  }
});
