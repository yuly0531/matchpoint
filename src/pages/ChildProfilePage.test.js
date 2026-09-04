import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../api';
import { isCharacterFeedbackEnabled } from '../feedbackSettings';
import ChildProfilePage from './ChildProfilePage';

jest.mock('../api', () => ({ apiFetch: jest.fn() }));

beforeEach(() => {
  localStorage.removeItem('smileguard-character-feedback-enabled');
  localStorage.removeItem('smileguard-child-feedback-settings');
  const children = [{
      id: 7,
      name: '지우',
      birthDate: '2021-05-12',
      reminderWeekday: 6,
      colorBaseline: { yellowingSampleCount: 2, gumSampleCount: 1 },
    }, {
      id: 8,
      name: '민준',
      birthDate: '2022-03-10',
      reminderWeekday: 1,
      colorBaseline: { yellowingSampleCount: 0, gumSampleCount: 0 },
    }];
  apiFetch.mockImplementation((path, options = {}) => {
    if (options.method === 'DELETE') {
      return Promise.resolve({ deleted: true, selectedChildId: 7 });
    }
    return Promise.resolve({ children });
  });
});

test('모든 자녀에게 적용되는 캐릭터 피드백 토글을 한 번만 표시한다', async () => {
  render(
    <ChildProfilePage
      onNavigate={jest.fn()}
      onBack={jest.fn()}
      token="test-token"
      selectedChildId={7}
      onSelectChild={jest.fn()}
    />
  );

  const toggles = await screen.findAllByRole('checkbox', { name: /캐릭터 피드백/ });
  expect(toggles).toHaveLength(1);
  const [toggle] = toggles;
  expect(toggle).toBeChecked();

  fireEvent.click(toggle);

  expect(toggle).not.toBeChecked();
  expect(isCharacterFeedbackEnabled()).toBe(false);
  expect(screen.getByRole('status')).toHaveTextContent('모든 자녀');
  expect(screen.queryByText(/치아 색상/)).not.toBeInTheDocument();
});

test('첫 번째 자녀는 보호하고 두 번째 자녀부터 삭제할 수 있다', async () => {
  const onSelectChild = jest.fn();
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(
    <ChildProfilePage
      onNavigate={jest.fn()}
      onBack={jest.fn()}
      token="test-token"
      selectedChildId={8}
      onSelectChild={onSelectChild}
    />
  );

  await screen.findByText('민준');
  expect(screen.queryByRole('button', { name: '지우 프로필 삭제' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '민준 프로필 삭제' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/children/8', {
    token: 'test-token',
    method: 'DELETE',
  }));
  expect(onSelectChild).toHaveBeenCalledWith(7);
  expect(screen.queryByText('민준')).not.toBeInTheDocument();
  confirmSpy.mockRestore();
});
