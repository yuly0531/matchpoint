import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../api';
import ReportPage from './ReportPage';

jest.mock('../api', () => ({ apiFetch: jest.fn() }));
jest.mock('react-chartjs-2', () => ({
  Line: ({ data }) => <div data-testid="trend-chart">{data.labels.join(',')}</div>,
}));

const metricBase = {
  key: 'overall',
  label: '종합 점수',
  unit: '점',
  available: true,
  recorded_days: 4,
  latest_change: 2,
  month_change: 5,
  weekly_trend: { labels: ['8/18', '8/19', '8/20', '8/21'], scores: [80, 90, 95, 100], scan_counts: [1, 1, 1, 1] },
  monthly_trend: { labels: ['7월', '8월'], scores: [90, 95], scan_counts: [2, 3] },
  yearly_trend: { labels: ['26.7', '26.8'], scores: [90, 95], scan_counts: [2, 3] },
};

beforeEach(() => {
  apiFetch.mockResolvedValue({
    current_score: 100,
    current_month_average: 95,
    previous_month_average: 90,
    month_change: 5,
    current_month_scan_count: 3,
    previous_month_scan_count: 2,
    total_scans: 5,
    recorded_days: 4,
    score_change: 2,
    attention_required: false,
    notification_schedule_label: '매주 일요일',
    streak_periods: 2,
    weekly_trend: metricBase.weekly_trend,
    monthly_trend: metricBase.monthly_trend,
    yearly_trend: metricBase.yearly_trend,
    metrics: {
      overall: metricBase,
    },
    year_comparison: { available: false, days_remaining: 300 },
  });
});

test('이번 달 평균과 전월 대비를 표시하고 6개월 그래프를 월별로 전환한다', async () => {
  const { container } = render(<ReportPage token="test-token" selectedChildId={1} onNavigate={jest.fn()} />);

  await waitFor(() => {
    expect(container.querySelector('.report-record-summary')).toHaveTextContent('이번 달 3회 · 지난달 2회 · 누적 5회 촬영');
  });
  expect(screen.getByText('이번 달 평균')).toBeInTheDocument();
  expect(screen.getByText('전월 대비')).toBeInTheDocument();
  expect(screen.queryByText('황변 변화')).not.toBeInTheDocument();
  expect(screen.queryByText('잇몸 변화')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '최근 6개월' }));
  expect(screen.getByTestId('trend-chart')).toHaveTextContent('7월,8월');
  expect(screen.getByText('지난달보다 5점 올랐어요')).toBeInTheDocument();
});
