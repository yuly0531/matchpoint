import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { captureWeekdays, getCaptureSchedule } from '../captureSchedule';
import { isCharacterFeedbackEnabled, setCharacterFeedbackEnabled } from '../feedbackSettings';

function ChildProfilePage({ onNavigate, onBack, token, selectedChildId, onSelectChild }) {
  const [children, setChildren] = useState([]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleEditingId, setScheduleEditingId] = useState(null);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [characterFeedbackEnabled, setCharacterFeedbackState] = useState(isCharacterFeedbackEnabled);
  const [error, setError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');

  const loadChildren = () => {
    if (!token) return Promise.resolve();
    setIsLoading(true);
    return apiFetch('/api/children', { token })
      .then((data) => {
        const list = data.children || [];
        setChildren(list);
        if (list.length > 0 && !list.some((child) => child.id === selectedChildId)) {
          onSelectChild(list[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadChildren(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName('');
    setBirthDate('');
    setEditingId(null);
  };

  const startEdit = (child) => {
    setScheduleEditingId(null);
    setEditingId(child.id);
    setName(child.name);
    setBirthDate(child.birthDate || '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (!birthDate) {
      setError('맞춤 촬영 일정을 설정하려면 생년월일을 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const path = editingId ? `/api/children/${editingId}` : '/api/children';
      const child = await apiFetch(path, {
        token,
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), birthDate: birthDate || null }),
      });
      onSelectChild(child.id);
      const schedule = getCaptureSchedule(child.birthDate, child.reminderWeekday);
      setProfileNotice(`${child.name} 님의 앱 내 촬영 일정이 '${schedule.scheduleLabel}'로 자동 설정됐어요.`);
      resetForm();
      await loadChildren();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeekdayChange = async (child, weekday) => {
    setIsScheduleSaving(true);
    setError('');
    try {
      const updatedChild = await apiFetch(`/api/children/${child.id}/schedule`, {
        token,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekday }),
      });
      setChildren((current) => current.map((item) => (
        item.id === updatedChild.id ? updatedChild : item
      )));
      const schedule = getCaptureSchedule(updatedChild.birthDate, updatedChild.reminderWeekday);
      setProfileNotice(`${updatedChild.name} 님의 앱 내 촬영 일정이 '${schedule.scheduleLabel}'로 변경됐어요.`);
      setScheduleEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScheduleSaving(false);
    }
  };

  const handleFeedbackToggle = (enabled) => {
    setCharacterFeedbackEnabled(enabled);
    setCharacterFeedbackState(enabled);
    setProfileNotice(
      `모든 자녀의 캐릭터 피드백을 ${enabled ? '사용하도록' : '표시하지 않도록'} 설정했어요.`
    );
  };

  const handleDelete = async (child, index) => {
    if (index === 0) return;
    const confirmed = window.confirm(
      `${child.name} 프로필과 촬영 기록을 삭제할까요?\n삭제한 데이터는 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    setDeletingId(child.id);
    setError('');
    try {
      const result = await apiFetch(`/api/children/${child.id}`, {
        token,
        method: 'DELETE',
      });
      const remainingChildren = children.filter((item) => item.id !== child.id);
      setChildren(remainingChildren);
      if (editingId === child.id) resetForm();
      if (scheduleEditingId === child.id) setScheduleEditingId(null);
      if (selectedChildId === child.id) {
        onSelectChild(result.selectedChildId ?? remainingChildren[0]?.id ?? null);
      }
      setProfileNotice(`${child.name} 님의 자녀 프로필을 삭제했어요.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="phone">
      <div className="mypage-content">
        <div className="mypage-top">
          <button className="back-button" onClick={onBack || (() => onNavigate('mypage'))}>← 뒤로</button>
          <h1>자녀 프로필</h1>
          <span className="mypage-top-space" />
        </div>

        <div className="section-intro">
          <span className="section-intro-icon">☺</span>
          <div>
            <h2>누구의 기록인가요?</h2>
            <p>촬영 결과와 리포트는 선택한 자녀 기준으로 저장됩니다.</p>
          </div>
        </div>

        <section className="settings-list child-feedback-preference" aria-label="공통 결과 화면 설정">
          <label className="setting-row">
            <span>
              <strong>캐릭터 피드백</strong>
              <small>모든 자녀의 결과 화면에 치아·몬스터 캐릭터를 표시해요.</small>
            </span>
            <input
              type="checkbox"
              checked={characterFeedbackEnabled}
              onChange={(event) => handleFeedbackToggle(event.target.checked)}
            />
            <i aria-hidden="true" />
          </label>
        </section>

        {isLoading ? (
          <p className="subtext page-state">자녀 정보를 불러오는 중이에요...</p>
        ) : (
          <div className="child-profile-list">
            {children.map((child, index) => {
              const schedule = getCaptureSchedule(child.birthDate, child.reminderWeekday);
              const canChooseWeekday = schedule.key === 'preschool';
              const isEditingSchedule = scheduleEditingId === child.id;
              return (
                <article className={`child-profile-item ${child.id === selectedChildId ? 'selected' : ''}`} key={child.id}>
                  <button type="button" className="child-profile-select" onClick={() => onSelectChild(child.id)}>
                    <span className="child-avatar">{child.name.slice(0, 1)}</span>
                    <span>
                      <strong>{child.name}</strong>
                      <small>{child.birthDate || '생년월일 미등록'}</small>
                    </span>
                    <b>{child.id === selectedChildId ? '관리 중' : '선택'}</b>
                  </button>
                  <div className="child-profile-actions">
                    <button type="button" className="child-edit-button" onClick={() => startEdit(child)}>수정</button>
                    {index > 0 && (
                      <button
                        type="button"
                        className="child-delete-button"
                        disabled={deletingId === child.id}
                        aria-label={`${child.name} 프로필 삭제`}
                        onClick={() => handleDelete(child, index)}
                      >
                        {deletingId === child.id ? '삭제 중' : '삭제'}
                      </button>
                    )}
                  </div>

                  {canChooseWeekday ? (
                    <button
                      type="button"
                      className="child-schedule-button"
                      aria-expanded={isEditingSchedule}
                      onClick={() => setScheduleEditingId(isEditingSchedule ? null : child.id)}
                    >
                      <span>◷ {schedule.scheduleLabel}</span>
                      <small>{isEditingSchedule ? '요일 선택 닫기' : '눌러서 요일 변경 ›'}</small>
                    </button>
                  ) : (
                    <div className="child-fixed-schedule">
                      <span>◷ {schedule.scheduleLabel}</span>
                      <small>연령별 자동 일정</small>
                    </div>
                  )}

                  {isEditingSchedule && (
                    <div className="weekday-picker" role="group" aria-label={`${child.name} 촬영 요일 선택`}>
                      {captureWeekdays.map((day) => (
                        <button
                          type="button"
                          key={day.value}
                          className={schedule.reminderWeekday === day.value ? 'active' : ''}
                          disabled={isScheduleSaving}
                          aria-label={`${day.label}로 변경`}
                          onClick={() => handleWeekdayChange(child, day.value)}
                        >
                          {day.shortLabel}
                        </button>
                      ))}
                    </div>
                  )}

                </article>
              );
            })}
          </div>
        )}

        <form className="child-profile-form" onSubmit={handleSubmit}>
          <div className="card-head">
            <h2>{editingId ? '자녀 정보 수정' : '자녀 추가'}</h2>
            {editingId && <button type="button" className="text-button" onClick={resetForm}>취소</button>}
          </div>
          <label className="input-group">
            <span>이름</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 지우" maxLength={20} />
          </label>
          <label className="input-group">
            <span>생년월일 <small>(맞춤 일정 자동 설정)</small></span>
            <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required />
          </label>
          <p className="birthdate-schedule-help">생년월일은 연령별 촬영 일정을 자동으로 설정하는 데 사용돼요.</p>
          <button type="submit" className="login-button" disabled={isSaving || !name.trim() || !birthDate}>
            {isSaving ? '저장 중...' : editingId ? '수정 내용 저장' : '자녀 등록'}
          </button>
        </form>

        {profileNotice && <p className="profile-schedule-notice" role="status">✓ {profileNotice}</p>}
        {error && <p className="social-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

export default ChildProfilePage;
