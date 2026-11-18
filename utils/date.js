const DAY = 86400000;

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => fmtDate(new Date());
const parseD = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s, n) => {
  const d = parseD(s);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
};
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / DAY);

const hLabel = (min) => {
  if (min < 60) return `${min}min`;
  const h = Math.round((min / 60) * 10) / 10;
  return `${h}h`;
};

const fmtClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;
};

module.exports = { DAY, pad2, fmtDate, today, parseD, addDays, diffDays, hLabel, fmtClock };
