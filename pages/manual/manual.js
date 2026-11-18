const store = require('../../utils/store');
const D = require('../../utils/date');

Page({
  data: { planId: '', name: '', date: '', min: '', start: '', maxDate: '' },

  onLoad(q) {
    const p = store.planById(q.planId);
    if (!p) { wx.navigateBack(); return; }
    const maxDate = D.today() < p.end ? D.today() : p.end;
    let date = q.date || D.today();
    if (date > maxDate) date = maxDate;
    if (date < p.start) date = p.start;
    this.setData({ planId: p.id, name: p.name, date, start: p.start, maxDate });
  },

  onDate(e) { this.setData({ date: e.detail.value }); },
  onMin(e) { this.setData({ min: e.detail.value.replace(/[^0-9]/g, '') }); },

  save() {
    const min = Number(this.data.min);
    if (!min || min < 1 || min > 1440) {
      wx.showToast({ title: '请输入 1–1440 之间的分钟数', icon: 'none' });
      return;
    }
    store.addSeg(this.data.planId, this.data.date, min, 'manual');
    wx.showToast({ title: '已补录', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 400);
  }
});
