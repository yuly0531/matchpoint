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
import { buildMonthlyReportData, previousMonthKey } from '../monthlyReportData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const RECORDS_PER_PAGE = 10;

const monthlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: (context) => `구강 건강 점수 ${context.parsed.y}점`,
        afterLabel: (context) => {
          const count = context.dataset.scanCounts?.[context.dataIndex] || 1;
          return count > 1 ? `당일 ${count}회 촬영 평균` : '당일 촬영 기록';
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8a94a6', font: { size: 10 } } },
    y: { min: 0, max: 100, border: { display: false }, grid: { color: '#edf1f6' }, ticks: { stepSize: 20, color: '#8a94a6', font: { size: 10 } } },
  },
};

function changeCopy(change) {
  if (change == null) return '그 전 달 기록이 없어 이번 달부터 비교를 시작해요.';
  if (change === 0) return '그 전 달과 같은 평균 점수를 유지했어요.';
  return `그 전 달보다 평균 점수가 ${Math.abs(change)}점 ${change > 0 ? '올랐어요.' : '낮아졌어요.'}`;
}

function MonthlyReportPage({ onNavigate, onBack, token, selectedChildId, reportMonth }) {
  const activeMonth = reportMonth || previousMonthKey();
  const [records, setRecords] = useState([]);
  const [childName, setChildName] = useState('자녀');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleRecordCount, setVisibleRecordCount] = useState(RECORDS_PER_PAGE);

  useEffect(() => {
    setVisibleRecordCount(RECORDS_PER_PAGE);
  }, [activeMonth, selectedChildId]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return undefined;
    }
    let cancelled = false;
    const query = selectedChildId ? `?child_id=${selectedChildId}` : '';
    setIsLoading(true);
    Promise.all([
      apiFetch(`/api/history${query}`, { token }),
      apiFetch('/api/children', { token }),
    ])
      .then(([historyData, childData]) => {
        if (cancelled) return;
        setRecords(historyData.records || []);
        const child = (childData.children || []).find((item) => item.id === selectedChildId);
        setChildName(child?.name || '자녀');
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [token, selectedChildId]);

  const report = useMemo(
    () => buildMonthlyReportData(records, activeMonth),
    [records, activeMonth]
  );
  const chartData = useMemo(() => ({
    labels: report.trend.labels,
    datasets: [{
      label: '구강 건강 점수',
      data: report.trend.scores,
      scanCounts: report.trend.scan_counts,
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
  }), [report.trend]);
  const visibleRecords = report.records.slice(0, visibleRecordCount);
  const hasMoreRecords = visibleRecordCount < report.records.length;

  return (
    <section className="phone">
      <header className="monthly-report-header">
        <button className="back-button" onClick={onBack || (() => onNavigate('notification'))}>← 알림</button>
        <p className="eyebrow">MONTHLY REPORT</p>
        <h1>{report.monthLabel} 월간 리포트</h1>
        <p>{childName} 님의 한 달 구강 관리 기록이에요.</p>
      </header>

      <div className="report-body monthly-report-body">
        {isLoading ? (
          <p className="page-state">월간 리포트를 불러오는 중이에요...</p>
        ) : error ? (
          <p className="social-error" role="alert">{error}</p>
        ) : report.scanCount === 0 ? (
          <div className="monthly-report-empty">
            <span>▥</span>
            <h2>이 달의 촬영 기록이 없어요</h2>
            <p>촬영 기록이 쌓이면 월평균과 변화를 확인할 수 있어요.</p>
            <button className="login-button" onClick={() => onNavigate('pre-capture')}>촬영 준비하기</button>
          </div>
        ) : (
          <>
            <section className="monthly-score-grid">
              <article><small>촬영 횟수</small><strong>{report.scanCount}</strong><span>회</span></article>
              <article><small>월평균</small><strong>{report.overallAverage}</strong><span>점</span></article>
              <article><small>전달 대비</small><strong className={report.scoreChange < 0 ? 'down' : 'up'}>{report.scoreChange == null ? '--' : `${report.scoreChange > 0 ? '+' : ''}${report.scoreChange}`}</strong><span>{report.scoreChange == null ? '' : '점'}</span></article>
            </section>

            <div className={`monthly-change-banner ${report.scoreChange < 0 ? 'down' : 'up'}`}>
              <span>{report.scoreChange < 0 ? '!' : '✓'}</span>
              <div><strong>{changeCopy(report.scoreChange)}</strong><p>{report.recordedDays}일 동안 {report.scanCount}회 기록했어요.</p></div>
            </div>

            <article className="monthly-trend-card">
              <div className="card-head"><h2>일자별 변화</h2><span>{report.monthLabel}</span></div>
              <div className="monthly-trend-chart"><Line data={chartData} options={monthlyChartOptions} /></div>
            </article>

            <section className="monthly-metric-grid">
              <article><span>치아 색상</span><strong>{report.yellowingAverage ?? '--'}</strong><small>{report.yellowingAverage == null ? '맞춤 기준 설정 중' : '점 평균'}</small></article>
              <article><span>잇몸 상태</span><strong>{report.gumAverage ?? '--'}</strong><small>{report.gumAverage == null ? '맞춤 기준 설정 중' : '점 평균'}</small></article>
              <article><span>충치 의심</span><strong className={report.cavityCount > 0 ? 'watch' : ''}>{report.cavityCount}</strong><small>누적 부위</small></article>
            </section>

            <section className="monthly-record-list">
              <div className="card-head"><h2>이달의 촬영 기록</h2><span>{report.scanCount}회</span></div>
              {visibleRecords.map((record) => (
                <article key={record.id}>
                  <span>{record.dateLabel}</span>
                  <div><strong>{record.displayScore}점</strong><small>{record.cavity_count > 0 ? `충치 의심 ${record.cavity_count}곳` : '주의 부위 없음'}</small></div>
                </article>
              ))}
              {hasMoreRecords && (
                <button
                  type="button"
                  className="records-load-more"
                  onClick={() => setVisibleRecordCount((count) => count + RECORDS_PER_PAGE)}
                >
                  더보기 <span>({Math.min(visibleRecordCount, report.records.length)}/{report.records.length})</span>
                </button>
              )}
            </section>
          </>
        )}

        <p className="medical-disclaimer">월간 리포트는 촬영 상태와 AI 분석에 따른 참고 지표이며 의료진의 진단을 대신하지 않습니다.</p>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => onNavigate('home')}><span>⌂</span>홈</button>
        <button className="nav-item active"><span>▥</span>월간</button>
        <button className="nav-item" onClick={() => onNavigate('report')}><span>⌁</span>전체 추이</button>
      </nav>
    </section>
  );
}

export default MonthlyReportPage;
