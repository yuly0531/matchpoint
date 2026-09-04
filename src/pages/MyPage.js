import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

function MyPage({ onNavigate, onBack, onLogout, user, token, provider, selectedChildId }) {
  const userName = user?.name || user?.nickname || '한이음';
  const userEmail = user?.email?.endsWith('@oauth.smileguard.local')
    ? `${provider === 'google' ? 'Google' : provider === 'kakao' ? '카카오' : '소셜'} 계정으로 로그인됨`
    : user?.email || '이메일 정보 없음';
  const profileImage = user?.picture || user?.profileImage || '/profile-avatar.svg';
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const query = selectedChildId ? `?child_id=${selectedChildId}` : '';
    apiFetch(`/api/report/summary${query}`, { token })
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, selectedChildId]);

  const menuItems = [
    { icon: '👤', title: '내 정보 관리', description: '이름과 프로필을 수정해요', onClick: () => onNavigate('profile') },
    { icon: '☺', title: '자녀 프로필', description: '자녀를 등록하고 관리 대상을 선택해요', onClick: () => onNavigate('child-profile') },
    { icon: '⏱', title: '촬영 히스토리', description: '자녀별 촬영 기록을 확인해요', onClick: () => onNavigate('history') },
    { icon: '⚙️', title: '알림 설정', description: '맞춤 촬영 일정과 상태 알림을 관리해요', onClick: () => onNavigate('notification') },
    { icon: '✦', title: '촬영·위생 가이드', description: '위생 커버와 촬영 방법을 확인해요', onClick: () => onNavigate('care-guide') },
  ];

  return (
    <section className="phone">
      <div className="mypage-content">
        <div className="mypage-top">
          <button className="back-button" onClick={onBack || (() => onNavigate('home'))}>
            ← 뒤로
          </button>
          <h1>마이페이지</h1>
          <span className="mypage-top-space" />
        </div>

        <div className="profile-card">
          <div className="profile-image-wrap">
            <img src={profileImage} alt={`${userName} 님 프로필`} />
            <button type="button" className="profile-edit" aria-label="프로필 정보 수정" onClick={() => onNavigate('profile')}>
              ✎
            </button>
          </div>
          <h2>{userName} 님</h2>
          <p>{userEmail}</p>
          <span className="profile-status">SmileGuard와 함께한 지 {summary?.member_since_days ?? 1}일째</span>
        </div>

        <div className="mypage-summary">
          <div><strong>{summary?.current_score ?? 100}</strong><span>최근 촬영 점수</span></div>
          <div><strong>{summary?.total_scans ?? 0}회</strong><span>누적 측정</span></div>
          <div><strong>{summary?.streak_periods ?? 0}회</strong><span>연속 주기</span></div>
        </div>

        <div className="mypage-menu">
          {menuItems.map((item) => (
            <button type="button" className="mypage-menu-item" key={item.title} onClick={item.onClick}>
              <span className="mypage-menu-icon">{item.icon}</span>
              <span className="mypage-menu-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className="mypage-menu-arrow">›</span>
            </button>
          ))}
        </div>

        <button type="button" className="logout-button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </section>
  );
}

export default MyPage;
