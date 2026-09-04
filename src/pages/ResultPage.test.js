import { fireEvent, render, screen } from '@testing-library/react';
import { setCharacterFeedbackEnabled } from '../feedbackSettings';
import ResultPage from './ResultPage';

const cavityResult = {
  image_size: { width: 1000, height: 700 },
  detections: [
    { class: 'cavity', confidence: 0.91, box: { x1: 100, y1: 120, x2: 260, y2: 310 } },
    { class: 'normal', confidence: 0.88, box: { x1: 300, y1: 120, x2: 460, y2: 310 } },
  ],
  summary: {
    cavity_count: 1,
    normal_count: 1,
    score: 82,
  },
};

beforeEach(() => {
  localStorage.removeItem('smileguard-character-feedback-enabled');
  localStorage.removeItem('smileguard-child-feedback-settings');
});

test('어린이용 충치 피드백과 보호자용 탐지 지표를 분리해 보여준다', () => {
  const { container } = render(
    <ResultPage
      onNavigate={jest.fn()}
      analysisResult={cavityResult}
      capturedUrl="blob:test-image"
    />
  );

  expect(screen.getByText('앗! 주의 깊게 볼 곳이 있어요')).toBeInTheDocument();
  expect(screen.getByText('보호자 확인')).toBeInTheDocument();
  expect(screen.getByText('종합 점수')).toBeInTheDocument();
  expect(screen.getByText('충치 의심')).toBeInTheDocument();
  expect(screen.queryByText('황변 변화')).not.toBeInTheDocument();
  expect(screen.queryByText('잇몸 변화')).not.toBeInTheDocument();
  expect(container.querySelector('[data-feedback-event="CAVITY_ALERT"]')).toBeInTheDocument();
});

test('치아가 감지되지 않으면 재촬영 안내와 이동 버튼을 표시한다', () => {
  const onNavigate = jest.fn();
  render(
    <ResultPage
      onNavigate={onNavigate}
      analysisResult={{ detections: [], summary: {} }}
    />
  );

  expect(screen.getByText('치아가 잘 보이도록 한 번 더!')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다시 촬영하기' }));
  expect(onNavigate).toHaveBeenCalledWith('camera');
});
test('공통 설정에서 캐릭터 피드백을 끄면 일반 결과 안내를 표시한다', () => {
  setCharacterFeedbackEnabled(false);
  const { container } = render(
    <ResultPage
      onNavigate={jest.fn()}
      analysisResult={cavityResult}
    />
  );

  expect(container.querySelector('.feedback-character')).not.toBeInTheDocument();
  expect(container.querySelector('[data-feedback-event]')).not.toBeInTheDocument();
  expect(screen.getByText('확인 필요')).toBeInTheDocument();
});
