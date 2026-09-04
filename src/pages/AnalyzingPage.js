import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../api';

function AnalyzingPage({ onNavigate, capturedBlob, token, selectedChildId, onAnalysisComplete }) {
  const [error, setError] = useState(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (!capturedBlob) {
      onNavigate('camera');
      return;
    }

    // StrictMode 개발 모드는 effect를 mount→cleanup→mount로 두 번 실행한다.
    // AbortController로 첫 요청을 중단해도 로컬 서버는 이미 처리를 끝내버려 DB에 중복 저장되므로,
    // ref로 두 번째 실행 자체에서 fetch가 생성되지 않도록 막는다.
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const formData = new FormData();
    formData.append('file', capturedBlob, 'capture.jpg');
    if (selectedChildId != null) formData.append('child_id', String(selectedChildId));

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${API_BASE}/analyze`, { method: 'POST', body: formData, headers })
      .then((res) => {
        if (!res.ok) throw new Error('분석 요청이 실패했어요.');
        return res.json();
      })
      .then((data) => {
        onAnalysisComplete(data);
        onNavigate('result');
      })
      .catch((err) => {
        setError(err.message || '분석 중 오류가 발생했어요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedBlob]);

  if (error) {
    return (
      <section className="phone center-page">
        <p className="eyebrow">AI ANALYSIS</p>
        <h1>분석에 실패했어요</h1>
        <p className="subtext">
          {error}
          <br />
          백엔드 서버(localhost:8000)가 켜져 있는지 확인해주세요.
        </p>
        <button className="action primary" style={{ marginTop: 24, padding: '14px 22px' }} onClick={() => onNavigate('camera')}>
          다시 촬영하기
        </button>
      </section>
    );
  }

  return (
    <section className="phone center-page">
      <div className="loader" />
      <p className="eyebrow">AI ANALYSIS</p>
      <h1>구강 상태를 분석하고 있어요</h1>
      <p className="subtext">
        치아 영역과 충치 의심 부위를 확인 중입니다.
        <br />
        잠시만 기다려 주세요.
      </p>
      <div className="progress">
        <span />
      </div>
    </section>
  );
}
export default AnalyzingPage;
