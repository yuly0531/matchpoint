import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiFetch } from '../api';
import { getDefaultWeeklyScheduleLabel } from '../captureSchedule';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function createTrendOptions(metricLabel, unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: (context) => `${metricLabel}: ${context.parsed.y}${unit}`,
          afterLabel: (context) => {
            const count = context.dataset.scanCounts?.[context.dataIndex] || 1;
            if (context.dataset.periodType === 'monthly') {
              return `해당 월 ${count}회 촬영 평균`;
            }
            return count > 1 ? `당일 ${count}회 촬영 평균` : '당일 촬영 기록';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#8a94a6', font: { size: 10 }, maxTicksLimit: 7 },
      },
      y: {
        min: 0,
        max: 100,
        border: { display: false },
        grid: { color: '#edf1f6' },
        ticks: { stepSize: 20, color: '#8a94a6', font: { size: 10 } },
      },
    },
  };
}

function scoreCopy(score) {
  if (score == null) return '첫 촬영을 기다리고 있어요.';
  if (score >= 80) return '현재 기록은 안정적인 범위예요.';
  if (score >= 50) return '조금 더 주의 깊게 관찰해 주세요.';
  return '변화가 커서 치과 상담을 권장해요.';
}

function yearComparisonCopy(change) {
  if (change === 0) return '작년 같은 기간과 동일하게 기록됐어요';
  return `작년 같은 기간보다 ${Math.abs(change)}점 ${change > 0 ? '높게' : '낮게'} 기록됐어요`;
}

function ReportPage({ onNavigate, onBack, token, selectedChildId }) {
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState('weekly');
  const metric = 'overall';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    const query = selectedChildId ? `?child_id=${selectedChildId}` : '';
    setIsLoading(true);
    apiFetch(`/api/report/summary${query}`, { token })
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [token, selectedChildId]);

  const metricOptions = [
    summary?.metrics?.overall || { key: 'overall', label: '종합 점수', unit: '점', available: true },
  ];
  const activeMetric = summary?.metrics?.[metric] || metricOptions.find((item) => item.key === metric);
  const trend = range === 'weekly'
    ? activeMetric?.weekly_trend || summary?.weekly_trend
    : range === 'monthly'
      ? activeMetric?.monthly_trend || summary?.monthly_trend
      : activeMetric?.yearly_trend || summary?.yearly_trend;
  const totalScans = summary?.total_scans ?? 0;
  const currentScore = summary?.current_score;
  const trendPointCount = trend?.scores?.length ?? 0;
  const recordedDays = activeMetric?.recorded_days ?? summary?.recorded_days ?? 0;
  const hasTrend = Boolean(activeMetric?.available) && recordedDays >= 3 && trendPointCount > 0;
  const yearComparison = summary?.year_comparison;
  const monthChange = summary?.month_change;
  const metricLabel = activeMetric?.label || '종합 점수';
  const metricUnit = activeMetric?.unit || '점';

  const trendOptions = useMemo(
    () => createTrendOptions(metricLabel, metricUnit),
    [metricLabel, metricUnit]
  );

  const data = useMemo(() => ({
    labels: trend?.labels || [],
    datasets: [{
      label: metricLabel,
      data: trend?.scores || [],
      scanCounts: trend?.scan_counts || [],
      periodType: range === 'weekly' ? 'daily' : 'monthly',
      borderColor: '#2f80ed',
      backgroundColor: 'rgba(47, 128, 237, 0.12)',
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#2f80ed',
      pointBorderWidth: 2,
      pointRadius: 4,
      borderWidth: 3,
      tension: 0.35,
      fill: true,
    }],
  }), [trend, range, metricLabel]);

  const changeLabel = range === 'yearly' && metric === 'overall'
    ? yearComparison?.available
      ? yearComparisonCopy(yearComparison.change)
      : '작년 같은 기간과 비교할 기록을 모으고 있어요'
    : range === 'monthly'
      ? activeMetric?.month_change == null
        ? '이번 달과 지난달에 모두 기록이 있어야 비교할 수 있어요'
        : activeMetric.month_change === 0
          ? '지난달 평균과 동일해요'
          : `지난달보다 ${Math.abs(activeMetric.month_change)}${metricUnit} ${activeMetric.month_change > 0 ? '올랐어요' : '내렸어요'}`
      : activeMetric?.latest_change == null
      ? '비교할 이전 기록이 없어요'
      : activeMetric.latest_change === 0
        ? '이전 기록일 평균과 동일해요'
        : `이전 기록일 평균보다 ${Math.abs(activeMetric.latest_change)}${metricUnit} ${activeMetric.latest_change > 0 ? '올랐어요' : '내렸어요'}`;

  return (
    <section className="phone">
      <header className="report-header">
        <button className="back-button" onClick={onBack || (() => onNavigate('home'))}>← 뒤로</button>
        <p className="eyebrow" style={{ color: '#cfe3ff' }}>HEALTH REPORT</p>
        <h1>구강 건강 리포트</h1>
        <p>{scoreCopy(currentScore)}</p>
      </header>

      <div className="report-body">
        <div className="report-score-grid">
          <article><small>최근 촬영 점수</small><strong>{totalScans ? currentScore : '--'}</strong><span>점</span></article>
          <article><small>이번 달 평균</small><strong>{summary?.current_month_average ?? '--'}</strong><span>점</span></article>
          <article>
            <small>전월 대비</small>
            <strong className={monthChange == null ? '' : monthChange < 0 ? 'down' : 'up'}>
              {monthChange == null ? '--' : `${monthChange > 0 ? '+' : ''}${monthChange}`}
            </strong>
            <span>{monthChange == null ? '' : '점'}</span>
          </article>
        </div>
        <p className="report-record-summary">
          이번 달 {summary?.current_month_scan_count ?? 0}회 · 지난달 {summary?.previous_month_scan_count ?? 0}회 · 누적 {totalScans}회 촬영
        </p>

        {summary?.attention_required && (
          <div className="attention-banner"><span>!</span><div><strong>점수 하락이 감지됐어요</strong><p>같은 환경에서 다시 촬영하고 변화가 계속되면 치과 상담을 권장해요.</p></div></div>
        )}

        <div className="period">
          <div><h2>변화 그래프</h2><p>{changeLabel}</p></div>
          <div className="range-tabs" aria-label="리포트 기간">
            <button className={range === 'weekly' ? 'active' : ''} onClick={() => setRange('weekly')}>최근 8주</button>
            <button className={range === 'monthly' ? 'active' : ''} onClick={() => setRange('monthly')}>최근 6개월</button>
            <button className={range === 'yearly' ? 'active' : ''} onClick={() => setRange('yearly')}>최근 1년</button>
          </div>
        </div>

        <article className="trend-card report-trend-card">
          {isLoading ? (
            <p className="page-state">리포트를 불러오는 중이에요...</p>
          ) : error ? (
            <p className="social-error" role="alert">{error}</p>
          ) : hasTrend ? (
            <div className="trend-line large"><Line data={data} options={trendOptions} /></div>
          ) : (
            <div className="report-onboarding">
              <span>▥</span>
              <h3>그래프 분석까지 {Math.max(3 - recordedDays, 0)}회 남았어요</h3>
              <p>권장 주기에 맞춰 서로 다른 날짜에 3회 이상 기록하면 {range === 'weekly' ? '날짜별' : '월별'} 변화를 확인할 수 있어요.</p>
              <button className="login-button" onClick={() => onNavigate('pre-capture')}>촬영 준비하기</button>
            </div>
          )}
        </article>

        {range === 'yearly' && metric === 'overall' && (
          <article className={`year-compare-card ${yearComparison?.available ? 'available' : 'waiting'}`}>
            <div className="card-head"><h3>작년 같은 기간과 비교</h3><span>30일 평균</span></div>
            {yearComparison?.available ? (
              <>
                <div className="year-compare-values">
                  <div><small>작년 같은 기간</small><strong>{yearComparison.previous_average}점</strong><span>{yearComparison.previous_period_label}</span></div>
                  <b aria-hidden="true">→</b>
                  <div><small>최근 30일</small><strong>{yearComparison.current_average}점</strong><span>{yearComparison.current_count}일 기록 평균</span></div>
                </div>
                <p className={yearComparison.change < 0 ? 'down' : 'up'}>
                  {yearComparisonCopy(yearComparison.change)}.
                </p>
              </>
            ) : (
              <div className="year-compare-empty">
                <span>◷</span>
                <div>
                  <strong>1년 비교를 위한 기록이 더 필요해요</strong>
                  <p>{yearComparison?.days_remaining > 0
                    ? `첫 촬영일 기준 약 ${yearComparison.days_remaining}일 후부터 비교할 수 있어요.`
                    : '작년 같은 기간과 최근 30일에 모두 촬영 기록이 있어야 비교할 수 있어요.'}</p>
                </div>
              </div>
            )}
            <small className="year-compare-note">성장과 치아 교체, 촬영 환경에 따라 차이가 생길 수 있어 참고 추이로만 확인해 주세요.</small>
          </article>
        )}

        <article className="weekly-report-card">
          <div className="card-head"><h3>관리 주기 요약</h3><span>{summary?.notification_schedule_label || getDefaultWeeklyScheduleLabel()}</span></div>
          <div className="weekly-summary-row">
            <div><span>기록 습관</span><strong>{summary?.streak_periods ?? 0}주기 연속</strong></div>
            <div><span>전월 변화</span><strong className={monthChange < 0 ? 'down' : ''}>{monthChange == null ? '--' : `${monthChange > 0 ? '+' : ''}${monthChange}점`}</strong></div>
          </div>
          <p>맞춤 촬영 일정에 따라 비슷한 시간대에 촬영하면 조명 차이를 줄여 비교하기 좋아요.</p>
        </article>

        <p className="medical-disclaimer">이 결과는 촬영 상태와 AI 분석에 따른 참고 지표이며 의료진의 진단을 대신하지 않습니다.</p>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => onNavigate('home')}><span>⌂</span>홈</button>
        <button className="nav-item active"><span>▥</span>리포트</button>
        <button className="nav-item" onClick={() => onNavigate('pre-capture')}><span>◎</span>촬영</button>
      </nav>
    </section>
  );
}

export default ReportPage;
