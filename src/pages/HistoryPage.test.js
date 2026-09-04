import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../api';
import HistoryPage from './HistoryPage';

jest.mock('../api', () => ({
  apiFetch: jest.fn(),
  apiFetchBlob: jest.fn(),
}));

const records = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  created_at: `2026-08-${String(index + 1).padStart(2, '0')}T03:00:00+00:00`,
  score: 90,
  cavity_count: 0,
  normal_count: 4,
  has_image: false,
}));

beforeEach(() => {
  apiFetch.mockImplementation((path) => {
    if (path.startsWith('/api/history')) return Promise.resolve({ records });
    return Promise.resolve({ children: [{ id: 7, name: '지우' }] });
  });
});

test('촬영 히스토리를 10개씩 더 보여준다', async () => {
  render(
    <HistoryPage
      onNavigate={jest.fn()}
      token="test-token"
      selectedChildId={7}
      onSelectChild={jest.fn()}
    />
  );

  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: /촬영 기록 보기/ })).toHaveLength(10);
  });
  const moreButton = screen.getByRole('button', { name: /더보기/ });
  expect(moreButton).toHaveTextContent('10/12');

  fireEvent.click(moreButton);

  expect(screen.getAllByRole('button', { name: /촬영 기록 보기/ })).toHaveLength(12);
  expect(screen.queryByRole('button', { name: /더보기/ })).not.toBeInTheDocument();
});
