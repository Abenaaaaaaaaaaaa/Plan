/* 本地存储：小程序缓存按「小程序 + 微信用户」隔离，天然支持多用户 */
const KEY = 'plan_timer_state_v1';

let state = null;

function blank() {
  const d = new Date();
  return {
    v: 1,
    plans: [],
    segs: [],
    session: null,
    profile: { nick: '', avatar: '' },
    calYM: { y: d.getFullYear(), m: d.getMonth() }
  };
}

function load() {
  if (state) return state;
  let raw = null;
  try { raw = wx.getStorageSync(KEY); } catch (e) { raw = null; }
  state = raw && Array.isArray(raw.plans) ? raw : blank();
  state.segs = Array.isArray(state.segs) ? state.segs : [];
  state.session = state.session || null;
  state.profile = state.profile || { nick: '', avatar: '' };
  if (!state.calYM || typeof state.calYM.m !== 'number') {
    const d = new Date();
    state.calYM = { y: d.getFullYear(), m: d.getMonth() };
  }
  return state;
}

function save() {
  try { wx.setStorageSync(KEY, state); }
  catch (e) { wx.showToast({ title: '存储失败，请检查空间', icon: 'none' }); }
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const planById = (id) => load().plans.find((p) => p.id === id);
const activePlans = () => load().plans.filter((p) => !p.deletedAt);
const segsOf = (planId) => load().segs.filter((s) => s.planId === planId);

function addPlan(data) {
  const p = Object.assign({
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinnedAt: null,
    deletedAt: null,
    targetVersion: 1,
    changedAt: null
  }, data);
  load().plans.unshift(p);
  save();
  return p;
}

function updatePlan(id, patch) {
  const p = planById(id);
  if (!p) return;
  Object.assign(p, patch, { updatedAt: Date.now() });
  save();
}

function softDelete(id) {
  updatePlan(id, { deletedAt: Date.now() });
  const s = load();
  if (s.session && s.session.planId === id) { s.session = null; save(); }
}

function togglePin(id) {
  const p = planById(id);
  if (p) updatePlan(id, { pinnedAt: p.pinnedAt ? null : Date.now() });
}

function addSeg(planId, date, min, source) {
  load().segs.push({
    id: uid(), planId, date, min,
    source: source || 'timer',
    reason: 'user_end',
    startTs: null, endTs: null
  });
  save();
}

function setSession(session) { load().session = session; save(); }
function setCalYM(y, m) { load().calYM = { y, m }; save(); }
function setProfile(patch) { Object.assign(load().profile, patch); save(); }

function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

function replace(obj) {
  state = obj;
  state.session = null;
  save();
}

module.exports = {
  load, save, uid, planById, activePlans, segsOf,
  addPlan, updatePlan, softDelete, togglePin, addSeg,
  setSession, setCalYM, setProfile, exportJSON, replace
};
