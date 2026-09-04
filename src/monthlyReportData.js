const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKoreaParts(isoDate) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const koreaDate = new Date(parsed.getTime() + KOREA_OFFSET_MS);
  return {
    year: koreaDate.getUTCFullYear(),
    month: koreaDate.getUTCMonth() + 1,
    day: koreaDate.getUTCDate(),
  };
}

function monthKey(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

function average(values) {
  const validValues = values.map(Number).filter(Number.isFinite);
  if (!validValues.length) return null;
  return Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
}

export function shiftMonthKey(value, offset) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const monthIndex = Number(match[1]) * 12 + Number(match[2]) - 1 + offset;
  return `${Math.floor(monthIndex / 12)}-${String((monthIndex % 12) + 1).padStart(2, '0')}`;
}

export function previousMonthKey(today = new Date()) {
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  return shiftMonthKey(currentKey, -1);
}

export function buildMonthlyReportData(records, selectedMonth) {
  const normalized = (records || []).map((record) => {
    const parts = toKoreaParts(record.created_at);
    return parts ? { ...record, parts, monthKey: monthKey(parts) } : null;
  }).filter(Boolean);
  const previousMonth = shiftMonthKey(selectedMonth, -1);
  const selectedRecords = normalized.filter((record) => record.monthKey === selectedMonth);
  const previousRecords = normalized.filter((record) => record.monthKey === previousMonth);
  const overallAverage = average(selectedRecords.map((record) => record.score ?? record.overall_score));
  const previousAverage = average(previousRecords.map((record) => record.score ?? record.overall_score));

  const dailyGroups = new Map();
  selectedRecords.forEach((record) => {
    const key = `${record.parts.year}-${record.parts.month}-${record.parts.day}`;
    const group = dailyGroups.get(key) || { parts: record.parts, scores: [] };
    const score = Number(record.score ?? record.overall_score);
    if (Number.isFinite(score)) group.scores.push(score);
    dailyGroups.set(key, group);
  });
  const dailyTrend = [...dailyGroups.values()]
    .sort((a, b) => a.parts.day - b.parts.day)
    .filter((group) => group.scores.length > 0);
  const [year, month] = (selectedMonth || '').split('-').map(Number);

  return {
    monthKey: selectedMonth,
    monthLabel: year && month ? `${year}년 ${month}월` : '월간',
    scanCount: selectedRecords.length,
    recordedDays: dailyTrend.length,
    overallAverage,
    previousAverage,
    scoreChange: overallAverage != null && previousAverage != null
      ? overallAverage - previousAverage
      : null,
    cavityCount: selectedRecords.reduce((sum, record) => sum + Number(record.cavity_count || 0), 0),
    trend: {
      labels: dailyTrend.map((group) => `${group.parts.month}/${group.parts.day}`),
      scores: dailyTrend.map((group) => average(group.scores)),
      scan_counts: dailyTrend.map((group) => group.scores.length),
    },
    records: [...selectedRecords]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((record) => ({
        ...record,
        dateLabel: `${record.parts.month}월 ${record.parts.day}일`,
        displayScore: record.score ?? record.overall_score,
      })),
  };
}
