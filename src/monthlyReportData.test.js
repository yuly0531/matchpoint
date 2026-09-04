import { buildMonthlyReportData, previousMonthKey, shiftMonthKey } from './monthlyReportData';

test('선택한 월의 촬영 기록과 전달 대비를 집계한다', () => {
  const report = buildMonthlyReportData([
    { id: 1, created_at: '2026-07-05T03:00:00+00:00', score: 90, cavity_count: 1, yellowing_index: 80, gum_inflammation_index: 90, color_baseline_source: 'personal' },
    { id: 2, created_at: '2026-07-12T03:00:00+00:00', score: 100, cavity_count: 0, yellowing_index: 90, gum_inflammation_index: 100, color_baseline_source: 'personal' },
    { id: 3, created_at: '2026-06-20T03:00:00+00:00', score: 90, cavity_count: 0 },
  ], '2026-07');

  expect(report.scanCount).toBe(2);
  expect(report.overallAverage).toBe(95);
  expect(report.scoreChange).toBe(5);
  expect(report.yellowingAverage).toBeUndefined();
  expect(report.gumAverage).toBeUndefined();
  expect(report.trend.labels).toEqual(['7/5', '7/12']);
});

test('연도가 바뀌는 이전 달을 계산한다', () => {
  expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  expect(previousMonthKey(new Date(2026, 0, 15))).toBe('2025-12');
});
