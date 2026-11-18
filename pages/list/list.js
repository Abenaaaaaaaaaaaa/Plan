const store = require('../../utils/store');
const calc = require('../../utils/calc');
const D = require('../../utils/date');

const BADGE = { '进行中': 'run', '未开始': 'soon', '已结束': 'done', '已过期': 'exp' };
const OPEN_OFFSET = -160;   // 左滑展开后露出的操作区宽度(px)

Page({
  data: { today: '', cards: [] },

  onShow() { this.refresh(); },

  refresh() {
    const plans = store.activePlans().slice().sort((a, b) => {
      if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
      if (a.pinnedAt && b.pinnedAt) return b.pinnedAt - a.pinnedAt;
      return b.createdAt - a.createdAt;
    });
    const cards = plans.map((p) => {
      const segs = store.segsOf(p.id);
      const st = calc.statusOf(segs, p);
      const acc = calc.accumulated(segs);
      const tt = calc.targetTotal(p);
      const c = tt ? (acc / tt) * 100 : 0;
      const tm = calc.todayMin(segs);
      let line3 = '';
      if (st === '未开始') line3 = `距开始还有 ${Math.max(0, D.diffDays(p.start, D.today()))} 天`;
      else if (st === '进行中') line3 = `今日 ${tm} / ${p.targetMin} 分钟 · ${tm >= p.targetMin ? '✓ 已达标' : '未达标'}`;
      else if (st === '已结束') line3 = `已结束 · 共 ${calc.planDays(p)} 天`;
      else line3 = `已过期 · 差 ${D.hLabel(Math.max(0, tt - acc))} 未完成`;
      return {
        id: p.id,
        name: p.name,
        pinned: !!p.pinnedAt,
        status: st,
        badgeClass: BADGE[st],
        pct: c.toFixed(1),
        barWidth: Math.min(100, c),
        line3,
        line4: `累计 ${D.hLabel(acc)} / 目标 ${D.hLabel(tt)} · 第 ${calc.dayIndex(p)} 天 / 共 ${calc.planDays(p)} 天`,
        dead: st === '已结束' || st === '已过期',
        offset: 0
      };
    });
    this.setData({ today: D.today(), cards });
  },

  goMe() { wx.navigateTo({ url: '/pages/me/me' }); },
  newPlan() { wx.navigateTo({ url: '/pages/form/form' }); },

  openDetail(e) {
    const { id, index } = e.currentTarget.dataset;
    if (this.data.cards[index].offset !== 0) { this.closeSwipe(index); return; }
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  /* ---- 左滑出现 置顶/删除 ---- */
  onTouchStart(e) {
    const { index } = e.currentTarget.dataset;
    this.touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, index, swiping: false };
  },
  onTouchMove(e) {
    const t = this.touch;
    if (!t) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (!t.swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) t.swiping = true;
    if (!t.swiping) return;
    const base = this.data.cards[t.index].offset;
    const off = Math.max(OPEN_OFFSET, Math.min(0, base + dx));
    t.x = e.touches[0].clientX;
    this.setData({ [`cards[${t.index}].offset`]: off });
  },
  onTouchEnd() {
    const t = this.touch;
    if (!t) return;
    if (t.swiping) {
      const cur = this.data.cards[t.index].offset;
      this.setData({ [`cards[${t.index}].offset`]: cur < OPEN_OFFSET / 2 ? OPEN_OFFSET : 0 });
    }
    this.touch = null;
  },
  closeSwipe(index) { this.setData({ [`cards[${index}].offset`]: 0 }); },

  onPin(e) {
    store.togglePin(e.currentTarget.dataset.id);
    this.refresh();
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const p = store.planById(id);
    const n = calc.activeDays(store.segsOf(id), p);
    wx.showModal({
      title: `删除「${p.name}」？`,
      content: `该计划的 ${n} 天计时记录将一并删除，删除后不可恢复，建议先导出备份。`,
      confirmText: '删除',
      confirmColor: '#e64340',
      success: (r) => {
        if (r.confirm) { store.softDelete(id); this.refresh(); }
      }
    });
  }
});
