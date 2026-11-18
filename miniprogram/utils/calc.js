const { today, diffDays } = require('./date');

const planDays = (p) => diffDays(p.end, p.start) + 1;
const accumulated = (segs) => segs.reduce((a, s) => a + s.min, 0);
const targetTotal = (p) => planDays(p) * p.targetMin;

const elapsedDays = (p) =>
  Math.max(0, Math.min(planDays(p), diffDays(today(), p.start) + 1));

const dueMin = (p) => elapsedDays(p) * p.targetMin;
const gapMin = (segs, p) => Math.max(0, dueMin(p) - accumulated(segs));

function statusOf(segs, p) {
  const t = today();
  if (t < p.start) return '未开始';
  if (t <= p.end) return '进行中';
  return accumulated(segs) >= targetTotal(p) ? '已结束' : '已过期';
}

function dayMap(segs) {
  const m = {};
  segs.forEach((s) => { m[s.date] = (m[s.date] || 0) + s.min; });
  return m;
}

const todayMin = (segs) => dayMap(segs)[today()] || 0;
const completion = (segs, p) => {
  const tt = targetTotal(p);
  return tt ? (accumulated(segs) / tt) * 100 : 0;
};

function activeDays(segs, p) {
  const dm = dayMap(segs);
  return Object.keys(dm).filter((d) => dm[d] > 0 && d >= p.start && d <= p.end).length;
}

function metDays(segs, p) {
  const dm = dayMap(segs);
  return Object.keys(dm).filter((d) => dm[d] >= p.targetMin && d >= p.start && d <= p.end).length;
}

const dayIndex = (p) => Math.max(0, Math.min(planDays(p), diffDays(today(), p.start) + 1));

module.exports = {
  planDays, accumulated, targetTotal, elapsedDays, dueMin, gapMin,
  statusOf, dayMap, todayMin, completion, activeDays, metDays, dayIndex
};
