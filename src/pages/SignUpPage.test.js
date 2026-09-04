import { fireEvent, render, screen } from '@testing-library/react';
import SignUpPage from './SignUpPage';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('필수 입력값과 일반적인 형식을 검사한다', () => {
  render(<SignUpPage onNavigate={jest.fn()} />);

  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김1' } });
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'smileguard@' } });
  fireEvent.change(screen.getByLabelText('휴대폰 번호'), { target: { value: '0101234' } });
  fireEvent.change(screen.getByLabelText(/비밀번호 \(영문\+숫자/), { target: { value: 'abcdefgh' } });
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'abcdefg1' } });
  fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

  expect(screen.getByText('이름에는 공백 없이 한글 또는 영문만 사용할 수 있어요.')).toBeInTheDocument();
  expect(screen.getByText('올바른 이메일 형식이 아니에요.')).toBeInTheDocument();
  expect(screen.getByText('01로 시작하는 휴대폰 번호 10~11자리를 입력해 주세요.')).toBeInTheDocument();
  expect(screen.getByText('비밀번호에 영문과 숫자를 모두 포함해 주세요.')).toBeInTheDocument();
  expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('이름의 공백과 이메일의 한글·공백을 제거하고 휴대폰 번호를 자동 포맷한다', () => {
  render(<SignUpPage onNavigate={jest.fn()} />);

  const nameInput = screen.getByLabelText('이름');
  const emailInput = screen.getByLabelText('이메일');
  const phoneInput = screen.getByLabelText('휴대폰 번호');

  fireEvent.change(nameInput, { target: { value: '김 하늘' } });
  fireEvent.change(emailInput, { target: { value: '한글 smile@example.com' } });
  fireEvent.change(phoneInput, { target: { value: '01012345678' } });

  expect(nameInput).toHaveValue('김하늘');
  expect(emailInput).toHaveValue('smile@example.com');
  expect(phoneInput).toHaveValue('010-1234-5678');
});

test('10자리 휴대폰 번호도 허용하고 알맞게 표시한다', () => {
  render(<SignUpPage onNavigate={jest.fn()} />);

  const phoneInput = screen.getByLabelText('휴대폰 번호');
  fireEvent.change(phoneInput, { target: { value: '0111234567' } });

  expect(phoneInput).toHaveValue('011-123-4567');
});

test('올바른 값은 정리해서 회원가입 API로 전송한다', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ user: { id: 1 } }),
  });
  render(<SignUpPage onNavigate={jest.fn()} />);

  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김하늘' } });
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'SmileGuard@Example.com' } });
  fireEvent.change(screen.getByLabelText('휴대폰 번호'), { target: { value: '01012345678' } });
  fireEvent.change(screen.getByLabelText(/비밀번호 \(영문\+숫자/), { target: { value: 'smile1234' } });
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'smile1234' } });
  fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

  expect(await screen.findByText('가입이 완료되었습니다')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/auth/email', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      email: 'smileguard@example.com',
      phone: '01012345678',
      password: 'smile1234',
      name: '김하늘',
    }),
  }));
});
