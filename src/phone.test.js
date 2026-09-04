import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from './phone';

test('휴대폰 번호는 숫자만 저장할 수 있도록 정규화한다', () => {
  expect(normalizePhoneNumber('010-1234-5678')).toBe('01012345678');
});

test('휴대폰 번호를 화면 표시 형식으로 변환한다', () => {
  expect(formatPhoneNumber('0111234567')).toBe('011-123-4567');
  expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
});

test('01로 시작하는 10~11자리 휴대폰 번호를 허용한다', () => {
  expect(isValidPhoneNumber('011-123-4567')).toBe(true);
  expect(isValidPhoneNumber('010-1234-5678')).toBe(true);
  expect(isValidPhoneNumber('010-123-456')).toBe(false);
  expect(isValidPhoneNumber('02-1234-5678')).toBe(false);
});
