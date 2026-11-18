const store = require('../../utils/store');
const calc = require('../../utils/calc');
const D = require('../../utils/date');

Page({
  data: {
    p: null, goalText: '', accText: '',
    timeText: '00:00:00', stateText: '已暂停',
    running: false, hasSession: false
  },

  onLoad(q) { this.id = q.id; },

  onShow() {
    const p = store.planById(this.id);
    if (!p) { wx.navigateBack(); return; }
    const s = store.load().session;
    if (s && s.planId !== this.id) {
      wx.showToast({ title: '请先结束正在进行的计时', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ p, goalText: `每日目标 ${D.hLabel(p.targetMin)}` });
    wx.setNavigationBarTitle({ title: p.name });
    this.tick();
    this.startLoop();
  },
  onHide() { this.stopLoop(); },
  onUnload() { this.stopLoop(); },

  elapsed() {
    const s = store.load().session;
    if (!s || s.planId !== this.id) return 0;
    return s.accruedSec + (s.state === 'running' ? (Date.now() - s.startedAt) / 1000 : 0);
  },

  tick() {
    const s = store.load().session;
    const sec = this.elapsed();
    const baseSec = calc.todayMin(store.segsOf(this.id)) * 60;
    const totalSec = baseSec + sec;
    this.setData({
      timeText: D.fmtClock(sec),
      accText: `今日已累计 ${D.fmtClock(totalSec)}`,
      stateText: s && s.state === 'running' ? '计时中' : '已暂停',
      running: !!s && s.state === 'running',
      hasSession: !!s
    });
    this.drawRing(Math.min(1, totalSec / 60 / this.data.p.targetMin));
  },

  startLoop() { this.stopLoop(); this.timer = setInterval(() => this.tick(), 500); },
  stopLoop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },

  drawRing(prog) {
    const ctx = wx.createCanvasContext('ring', this);
    const c = 140, r = 124;
    ctx.setLineWidth(12);
    ctx.setStrokeStyle('#ececec');
    ctx.beginPath();
    ctx.arc(c, c, r, 0, 2 * Math.PI);
    ctx.stroke();
    const a = -Math.PI / 2 + 2 * Math.PI * prog;
    if (prog > 0) {
      ctx.setStrokeStyle('#111111');
      ctx.setLineCap('round');
      ctx.beginPath();
      ctx.arc(c, c, r, -Math.PI / 2, a);
      ctx.stroke();
    }
    ctx.setFillStyle('#111111');
    ctx.beginPath();
    ctx.arc(c + r * Math.cos(a), c + r * Math.sin(a), 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.draw();
  },

  start() {
    store.setSession({ planId: this.id, state: 'running', accruedSec: 0, startedAt: Date.now() });
    this.tick();
  },
  pause() {
    const s = store.load().session;
    if (!s) return;
    store.setSession({ planId: this.id, state: 'paused', accruedSec: this.elapsed(), startedAt: null });
    this.tick();
  },
  resume() {
    const s = store.load().session;
    if (!s) return;
    store.setSession({ planId: this.id, state: 'running', accruedSec: s.accruedSec, startedAt: Date.now() });
    this.tick();
  },
  end() {
    const sec = this.elapsed();
    const min = Math.round(sec / 60);
    store.setSession(null);
    if (min >= 1) store.addSeg(this.id, D.today(), min, 'timer');
    this.stopLoop();
    wx.showModal({
      title: '本次计时结束',
      content: min >= 1 ? `本次 ${D.fmtClock(sec)}，已计入今天` : '不足 1 分钟，本次未计入',
      showCancel: false,
      success: () => wx.navigateBack()
    });
  },

  manual() { wx.navigateTo({ url: `/pages/manual/manual?planId=${this.id}` }); }
});
