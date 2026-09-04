import { useState } from 'react';
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from '../phone';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');
const NAME_PATTERN = /^[가-힣A-Za-z]+$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const PASSWORD_ASCII_PATTERN = /^[\x21-\x7E]+$/;

function sanitizeEmailInput(value) {
  return value.replace(/[^\x21-\x7E]/g, '').slice(0, 100);
}

function sanitizeNameInput(value) {
  return value.replace(/\s/g, '').slice(0, 20);
}

async function requestSignUp(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || data.message || '회원가입 처리에 실패했습니다.');
  }

  return response.json();
}

function validate(form) {
  const errors = {};
  const normalizedName = form.name.trim();
  const normalizedEmail = form.email.trim();

  if (!normalizedName) {
    errors.name = '이름을 입력해 주세요.';
  } else if (normalizedName.length < 2 || normalizedName.length > 20) {
    errors.name = '이름은 2~20자로 입력해 주세요.';
  } else if (!NAME_PATTERN.test(normalizedName)) {
    errors.name = '이름에는 공백 없이 한글 또는 영문만 사용할 수 있어요.';
  }

  if (!normalizedEmail) {
    errors.email = '이메일을 입력해 주세요.';
  } else if (
    normalizedEmail.length > 100
    || normalizedEmail.includes('..')
    || !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    errors.email = '올바른 이메일 형식이 아니에요.';
  }

  if (!form.phone.trim()) {
    errors.phone = '휴대폰 번호를 입력해 주세요.';
  } else if (!isValidPhoneNumber(form.phone)) {
    errors.phone = '01로 시작하는 휴대폰 번호 10~11자리를 입력해 주세요.';
  }

  if (!form.password) {
    errors.password = '비밀번호를 입력해 주세요.';
  } else if (form.password.length < 8 || form.password.length > 20) {
    errors.password = '비밀번호는 8~20자로 입력해 주세요.';
  } else if (!PASSWORD_ASCII_PATTERN.test(form.password)) {
    errors.password = '비밀번호에는 공백이나 한글을 사용할 수 없어요.';
  } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = '비밀번호에 영문과 숫자를 모두 포함해 주세요.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = '비밀번호를 한 번 더 입력해 주세요.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = '비밀번호가 일치하지 않아요.';
  }

  return errors;
}

function SignUpPage({ onNavigate }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'phone'
      ? formatPhoneNumber(value)
      : name === 'email'
        ? sanitizeEmailInput(value)
        : name === 'name'
          ? sanitizeNameInput(value)
          : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setServerError('');
    setIsSubmitting(true);
    try {
      await requestSignUp({
        email: form.email.trim().toLowerCase(),
        phone: normalizePhoneNumber(form.phone),
        password: form.password,
        name: form.name.trim(),
      });
      setIsDone(true);
    } catch (error) {
      setServerError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <section className="phone login-page">
        <div className="login-decoration login-decoration-one" />
        <div className="login-decoration login-decoration-two" />
        <div className="login-content">
          <div className="brand-mark" aria-hidden="true"><span>✓</span></div>
          <p className="eyebrow">SMILEGUARD</p>
          <h1>가입이 완료되었습니다</h1>
          <p className="subtext">{form.name}님, 환영해요! 이제 로그인하고 시작해 보세요.</p>
          <button type="button" className="login-button" style={{ marginTop: 30 }} onClick={() => onNavigate('login')}>
            로그인하러 가기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="phone login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <div className="login-content">
        <div className="brand-mark" aria-hidden="true"><span>✓</span></div>
        <p className="eyebrow">SMILEGUARD</p>
        <h1>계정을 만들고<br />건강한 미소를 기록하세요</h1>
        <p className="subtext">몇 가지 정보만 입력하면 바로 시작할 수 있어요.</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="input-group">
            <span>이름</span>
            <input name="name" type="text" minLength="2" maxLength="20" value={form.name} onChange={handleChange} placeholder="이름을 입력해 주세요" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'signup-name-error' : undefined} />
            {errors.name && <p id="signup-name-error" className="social-error" role="alert">{errors.name}</p>}
          </label>
          <label className="input-group">
            <span>이메일</span>
            <input name="email" type="email" inputMode="email" maxLength="100" value={form.email} onChange={handleChange} placeholder="이메일을 입력해 주세요" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'signup-email-error' : undefined} />
            {errors.email && <p id="signup-email-error" className="social-error" role="alert">{errors.email}</p>}
          </label>
          <label className="input-group">
            <span>휴대폰 번호</span>
            <input name="phone" type="tel" inputMode="numeric" maxLength="13" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'signup-phone-error' : undefined} />
            {errors.phone && <p id="signup-phone-error" className="social-error" role="alert">{errors.phone}</p>}
          </label>
          <label className="input-group">
            <span>비밀번호 <small>(영문+숫자 8~20자)</small></span>
            <input name="password" type="password" minLength="8" maxLength="20" value={form.password} onChange={handleChange} placeholder="영문과 숫자를 포함해 주세요" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'signup-password-error' : undefined} />
            {errors.password && <p id="signup-password-error" className="social-error" role="alert">{errors.password}</p>}
          </label>
          <label className="input-group">
            <span>비밀번호 확인</span>
            <input name="confirmPassword" type="password" minLength="8" maxLength="20" value={form.confirmPassword} onChange={handleChange} placeholder="비밀번호를 다시 입력해 주세요" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined} />
            {errors.confirmPassword && <p id="signup-confirm-password-error" className="social-error" role="alert">{errors.confirmPassword}</p>}
          </label>
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        {serverError && <p className="social-error" role="alert">{serverError}</p>}

        <p className="join-text">
          이미 계정이 있으신가요?
          <button type="button" className="text-button" onClick={() => onNavigate('login')}>로그인</button>
        </p>
      </div>
    </section>
  );
}

export default SignUpPage;
