const store = require('../../utils/store');
const D = require('../../utils/date');

const shortName = (n) => n.length <= 2 ? n : n.replace(/计划$/, '').slice(0, 2);

Page({
  data: {
    title: '', y: 0, m: 0, cells: [],
    stats: { days: 0, met: 0, hours: '0.0' },
    daySheet: null, pulse: ''
  },

  onShow() {
    const s = store.load();
    this.setData({ y: s.calYM.y, m: s.calYM.m });
    this.build();
  },

  build() {
    const { y, m } = this.data;
    store.setCalYM(y, m);
    const today = D.today();
    const dim = new Date(y, m + 1, 0).getDate();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const rows = Math.ceil((lead + dim) / 7);
    const plans = store.activePlans();
    const segs = store.load().segs;

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push({ key: `h${i}`, cls: 'out' });
    let recDays = 0, metDays = 0, totalMin = 0;
    for (let d = 1; d <= dim; d++) {
      const date = `${y}-${D.pad2(m + 1)}-${D.pad2(d)}`;
      const daySegs = segs.filter((s) => s.date === date);
      const perPlan = plans.map((p) => {
        const min = daySegs.filter((s) => s.planId === p.id).reduce((a, s) => a + s.min, 0);
        return { p, min };
      }).filter((x) => x.min > 0);
      const dayTotal = perPlan.reduce((a, x) => a + x.min, 0);
      if (dayTotal > 0) recDays++;
      if (perPlan.some((x) => x.min >= x.p.targetMin)) metDays++;
      totalMin += dayTotal;
      cells.push({
        key: date, date, d,
        cls: 'in',
        today: date === today,
        future: date > today,
        chips: perPlan.slice(0, 3).map((x) => ({
          label: shortName(x.p.name),
          cls: x.min >= x.p.targetMin ? 'g' : 'y'
        })),
        more: perPlan.length > 3 ? `+${perPlan.length - 3}` : '',
        manual: daySegs.some((s) => s.source === 'manual')
      });
    }
    while (cells.length < rows * 7) cells.push({ key: `t${cells.length}`, cls: 'out' });

    this.setData({
      title: `${y}年${m + 1}月`,
      cells,
      stats: { days: recDays, met: metDays, hours: (totalMin / 60).toFixed(1) }
    });
  },

  nav(e) {
    const n = Number(e.currentTarget.dataset.n);
    let { y, m } = this.data;
    m += n;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    this.setData({ y, m, pulse: '' });
    this.build();
  },

  goToday() {
    const d = new Date();
    this.setData({ y: d.getFullYear(), m: d.getMonth(), pulse: D.today() });
    this.build();
  },

  /* 左右滑动切月，纵向滑动不拦截 */
  onTouchStart(e) { this.touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; },
  onTouchEnd(e) {
    const t = this.touch;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this.nav({ currentTarget: { dataset: { n: dx < 0 ? 1 : -1 } } });
    }
    this.touch = null;
  },

  openDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    const plans = store.activePlans();
    const list = plans.map((p) => {
      const min = store.segsOf(p.id).filter((s) => s.date === date).reduce((a, s) => a + s.min, 0);
      return { id: p.id, name: p.name, min, met: min >= p.targetMin };
    }).filter((x) => x.min > 0);
    this.setData({ daySheet: { date, list, canAdd: date <= D.today() } });
  },
  closeDay() { this.setData({ daySheet: null }); },

  addManual() {
    const date = this.data.daySheet.date;
    const plans = store.activePlans();
    if (!plans.length) return;
    if (plans.length === 1) {
      this.closeDay();
      wx.navigateTo({ url: `/pages/manual/manual?planId=${plans[0].id}&date=${date}` });
      return;
    }
    wx.showActionSheet({
      itemList: plans.map((p) => p.name),
      success: (r) => {
        this.closeDay();
        wx.navigateTo({ url: `/pages/manual/manual?planId=${plans[r.tapIndex].id}&date=${date}` });
      }
    });
  },

  legend() {
    wx.showModal({
      title: '日历色块',
      content: '绿色 = 当天该计划已达标，橙色 = 有记录但未达标，日期旁蓝点 = 含手动补录。每格最多显示 3 个计划，更多以 +N 表示。',
      showCancel: false
    });
  }
});
