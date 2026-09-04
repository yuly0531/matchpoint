import { render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../api';
import MonthlyReportPage from './MonthlyReportPage';

jest.mock('../api', () => ({ apiFetch: jest.fn() }));
jest.mock('react-chartjs-2', () => ({
  Line: ({ data }) => <div data-testid="monthly-chart">{data.labels.join(',')}</div>,
}));

const records = [
  { id: 1, created_at: '2026-07-05T03:00:00+00:00', score: 90, cavity_count: 1, yellowing_index: 80, gum_inflammation_index: 90, color_baseline_source: 'personal' },
  { id: 2, created_at: '2026-07-12T03:00:00+00:00', score: 100, cavity_count: 0, yellowing_index: 90, gum_inflammation_index: 100, color_baseline_source: 'personal' },
  { id: 3, created_at: '2026-06-20T03:00:00+00:00', score: 90, cavity_count: 0 },
];

beforeEach(() => {
  apiFetch.mockImplementation((path) => {
    if (path.startsWith('/api/history')) return Promise.resolve({ records });
    return Promise.resolve({ children: [{ id: 7, name: '지우' }] });
  });
});

test('알림에서 선택한 월의 상세 리포트를 표시한다', async () => {
  render(
    <MonthlyReportPage
      onNavigate={jest.fn()}
      token="test-token"
      selectedChildId={7}
      reportMonth="2026-07"
    />
  );

  expect(screen.getByRole('heading', { name: '2026년 7월 월간 리포트' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('지우 님의 한 달 구강 관리 기록이에요.')).toBeInTheDocument());
  expect(screen.getByText('그 전 달보다 평균 점수가 5점 올랐어요.')).toBeInTheDocument();
  expect(screen.getByTestId('monthly-chart')).toHaveTextContent('7/5,7/12');
  expect(screen.getByText('7월 12일')).toBeInTheDocument();
  expect(screen.getByText('7월 5일')).toBeInTheDocument();
  expect(screen.queryByText('치아 색상')).not.toBeInTheDocument();
  expect(screen.queryByText('잇몸 상태')).not.toBeInTheDocument();
});
