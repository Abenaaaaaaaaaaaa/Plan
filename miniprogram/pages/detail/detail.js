const store = require('../../utils/store');
const calc = require('../../utils/calc');
const D = require('../../utils/date');

const BADGE = { '进行中': 'run', '未开始': 'soon', '已结束': 'done', '已过期': 'exp' };

Page({
  data: {
    p: null, tab: 'overview', ov: null,
    months: [], hasSegs: false, daySheet: null,
    footLabel: '开始计时', footDisabled: false
  },

  onLoad(q) {
    this.id = q.id;
    if (q.tab === 'record') this.setData({ tab: 'record' });
  },
  onShow() { this.refresh(); },

  refresh() {
    const p = store.planById(this.id);
    if (!p || p.deletedAt) { wx.navigateBack(); return; }
    const segs = store.segsOf(p.id);
    const st = calc.statusOf(segs, p);
    const acc = calc.accumulated(segs);
    const tt = calc.targetTotal(p);
    const c = tt ? (acc / tt) * 100 : 0;
    const tm = calc.todayMin(segs);
    const gap = calc.gapMin(segs, p);

    const ov = {
      status: st,
      badgeClass: BADGE[st],
      pinned: !!p.pinnedAt,
      pct: c.toFixed(1),
      barWidth: Math.min(100, c),
      accLabel: D.hLabel(acc),
      ttLabel: D.hLabel(tt),
      overLabel: c > 100 ? `已超额 ${D.hLabel(acc - tt)}` : '',
      sched: st === '进行中' ? {
        due: D.hLabel(calc.dueMin(p)),
        acc: D.hLabel(acc),
        gapLabel: gap ? D.hLabel(gap) : '已跟上',
        isGap: !!gap
      } : null,
      todayK: st === '进行中' ? '今日' : st,
      todayV: st === '进行中' ? String(tm) : '',
      todayU: st === '进行中' ? `/ ${p.targetMin} 分钟`
        : st === '未开始' ? `距开始还有 ${Math.max(0, D.diffDays(p.start, D.today()))} 天 · 目标 ${D.hLabel(tt)}`
        : st === '已结束' ? `共 ${calc.planDays(p)} 天 · 累计 ${D.hLabel(acc)}`
        : `差 ${D.hLabel(Math.max(0, tt - acc))} 未完成`,
      targetLabel: D.hLabel(p.targetMin),
      targetMin: p.targetMin,
      start: p.start.replace(/-/g, '.'),
      end: p.end.replace(/-/g, '.'),
      days: calc.planDays(p),
      activeDays: calc.activeDays(segs, p),
      metDays: calc.metDays(segs, p),
      changedAt: p.changedAt ? `目标已于 ${p.changedAt} 调整（第 ${p.targetVersion} 版）` : ''
    };

    let footLabel = '开始计时', footDisabled = st === '未开始';
    if (st === '已结束' || st === '已过期') footLabel = '再建一个';

    this.setData({
      p, ov, footLabel, footDisabled,
      hasSegs: segs.length > 0,
      months: this.data.tab === 'record' ? this.buildMonths(p, segs) : []
    });
    wx.setNavigationBarTitle({ title: p.name });
  },

  buildMonths(p, segs) {
    const dm = calc.dayMap(segs);
    const anchor = D.parseD(D.today() < p.end ? D.today() : p.end);
    const stop = D.parseD(p.start);
    const months = [];
    let cur = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const stopMonth = new Date(stop.getFullYear(), stop.getMonth(), 1);
    while (cur >= stopMonth && months.length < 12) {
      const y = cur.getFullYear(), m = cur.getMonth();
      const dim = new Date(y, m + 1, 0).getDate();
      const lead = (new Date(y, m, 1).getDay() + 6) % 7;
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push({ key: `x${i}`, cls: 'out' });
      let mMet = 0, mMin = 0;
      for (let d = 1; d <= dim; d++) {
        const date = `${y}-${D.pad2(m + 1)}-${D.pad2(d)}`;
        const v = dm[date] || 0;
        let cls = 'none', txt = '';
        if (date < p.start || date > p.end) cls = 'out';
        else {
          if (v > 0) mMin += v;
          if (v >= p.targetMin) { cls = 'met'; mMet++; txt = `${v}m`; }
          else if (v > 0) { cls = 'part'; txt = `${v}m`; }
        }
        cells.push({
          key: date, date, d, cls, txt,
          today: date === D.today(),
          manual: segs.some((s) => s.date === date && s.source === 'manual')
        });
      }
      months.push({ key: `${y}-${m}`, title: `${y}年${m + 1}月`, summary: `达标 ${mMet} 天 · ${D.hLabel(mMin)}`, cells });
      cur = new Date(y, m - 1, 1);
    }
    return months;
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'record') {
      this.setData({ months: this.buildMonths(this.data.p, store.segsOf(this.id)) });
    }
  },

  more() {
    const p = this.data.p;
    wx.showActionSheet({
      itemList: ['编辑计划', p.pinnedAt ? '取消置顶' : '置顶', '删除计划'],
      success: (r) => {
        if (r.tapIndex === 0) wx.navigateTo({ url: `/pages/form/form?id=${p.id}` });
        else if (r.tapIndex === 1) { store.togglePin(p.id); this.refresh(); }
        else if (r.tapIndex === 2) {
          wx.showModal({
            title: `删除「${p.name}」？`,
            content: '该计划的计时记录将一并删除，删除后不可恢复。',
            confirmText: '删除', confirmColor: '#e64340',
            success: (m) => { if (m.confirm) { store.softDelete(p.id); wx.navigateBack(); } }
          });
        }
      }
    });
  },

  foot() {
    const st = this.data.ov.status;
    if (st === '已结束' || st === '已过期') { wx.navigateTo({ url: '/pages/form/form' }); return; }
    wx.navigateTo({ url: `/pages/timer/timer?id=${this.id}` });
  },

  openDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    const p = this.data.p;
    const list = store.segsOf(p.id).filter((s) => s.date === date)
      .map((s) => ({ id: s.id, min: s.min, source: s.source === 'manual' ? '补录' : '计时' }));
    const total = list.reduce((a, s) => a + s.min, 0);
    const canAdd = date >= p.start && date <= p.end && date <= D.today();
    this.setData({
      daySheet: { date, list, total, target: p.targetMin, met: total >= p.targetMin, canAdd }
    });
  },
  closeDay() { this.setData({ daySheet: null }); },
  addManual() {
    const date = this.data.daySheet.date;
    this.closeDay();
    wx.navigateTo({ url: `/pages/manual/manual?planId=${this.id}&date=${date}` });
  },
  manual() { wx.navigateTo({ url: `/pages/manual/manual?planId=${this.id}` }); }
});
