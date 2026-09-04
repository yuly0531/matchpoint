import { resolveAnalysisFeedback } from '../analysisFeedback';
import { isCharacterFeedbackEnabled } from '../feedbackSettings';
import FeedbackCharacter from '../components/FeedbackCharacter';

function hasMetricValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function formatMetricValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : value;
}

function ResultPage({ onNavigate, analysisResult, capturedUrl }) {
  const summary = analysisResult?.summary || {};
  const cavityCount = summary.cavity_count ?? 0;
  const normalCount = summary.normal_count ?? 0;
  const score = summary.overall_score ?? summary.score;
  const detections = analysisResult?.detections || [];
  const feedback = resolveAnalysisFeedback(analysisResult);
  const hasCavity = feedback.type === 'cavity_alert';
  const hasDetection = detections.length > 0;
  const hasScore = hasMetricValue(score);
  const imageSize = analysisResult?.image_size;
  const characterFeedbackEnabled = isCharacterFeedbackEnabled();

  return (
    <section className="phone">
      <div className="page-content result-page-content">
        <div className="top-row">
          <button className="back-button" onClick={() => onNavigate('home')}>← 홈</button>
          <button className="text-button" onClick={() => onNavigate('report')}>리포트 보기</button>
        </div>

        {characterFeedbackEnabled ? (
          <section
            className={`child-feedback-card ${feedback.type}`}
            data-feedback-event={feedback.sound_event}
            aria-labelledby="child-feedback-title"
          >
            <span className="child-feedback-badge">어린이 구강 탐험 결과</span>
            <FeedbackCharacter type={feedback.type} />
            <h1 id="child-feedback-title">{feedback.title}</h1>
            <p>{feedback.message}</p>
          </section>
        ) : (
          <section className={`plain-feedback-card ${feedback.type}`} aria-labelledby="plain-feedback-title">
            <span>{hasDetection ? (hasCavity ? '확인 필요' : '분석 완료') : '재촬영 필요'}</span>
            <h1 id="plain-feedback-title">{feedback.parentTitle}</h1>
            <p>{feedback.parentMessage}</p>
          </section>
        )}

        <section className="guardian-result-card" aria-labelledby="guardian-result-title">
          <div className="guardian-result-heading">
            <span>보호자 확인</span>
            <div>
              <h2 id="guardian-result-title">{feedback.parentTitle}</h2>
              <p>{feedback.parentMessage}</p>
            </div>
          </div>

          {capturedUrl && imageSize && (
            <div className="result-image">
              <img src={capturedUrl} alt="분석된 구강 사진" />
              {detections.map((d, index) => {
                const left = (d.box.x1 / imageSize.width) * 100;
                const top = (d.box.y1 / imageSize.height) * 100;
                const boxWidth = ((d.box.x2 - d.box.x1) / imageSize.width) * 100;
                const boxHeight = ((d.box.y2 - d.box.y1) / imageSize.height) * 100;
                return (
                  <span
                    key={`${d.class}-${index}`}
                    className={`detect-box ${d.class === 'cavity' ? 'cavity' : 'normal'}`}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${boxWidth}%`, height: `${boxHeight}%` }}
                    title={`${d.class} ${(d.confidence * 100).toFixed(0)}%`}
                  />
                );
              })}
            </div>
          )}

          {hasDetection && (
            <p className="detection-summary">
              전체 인식 {detections.length}곳 · 정상으로 인식 {normalCount}곳
            </p>
          )}

          <div className="metric-grid result-metric-grid">
            <article className={`metric ${!hasScore ? 'pending' : Number(score) >= 80 ? 'good' : 'watch'}`}>
              <span>종합 점수</span>
              <strong>{hasScore ? formatMetricValue(score) : '준비 중'}</strong>
              <span>{hasScore ? '/ 100점' : '분석 결과 대기'}</span>
            </article>
            <article className={`metric ${hasCavity ? 'watch' : 'good'}`}>
              <span>충치 의심</span>
              <strong>{cavityCount}</strong>
              <span>개 부위</span>
            </article>
          </div>

          <div className={`notice ${!hasDetection ? 'retry-notice' : ''}`}>
            <strong>보호자 안내</strong>
            <br />
            이 결과는 건강 관리를 돕는 AI 참고 지표이며 의료 진단을 대신하지 않습니다.
          </div>

          {!hasDetection && (
            <button className="login-button result-retry" onClick={() => onNavigate('camera')}>
              다시 촬영하기
            </button>
          )}
        </section>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => onNavigate('camera')}><span>←</span>재촬영</button>
        <button className="nav-item active"><span>◉</span>결과</button>
        <button className="nav-item" onClick={() => onNavigate('home')}><span>⌂</span>홈</button>
      </nav>
    </section>
  );
}

export default ResultPage;
