import { useEffect, useState } from 'react';
import { apiFetch, apiFetchBlob } from '../api';

const RECORDS_PER_PAGE = 10;

function scoreTone(score) {
  return score >= 80 ? 'good' : 'watch';
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function HistoryPage({ onNavigate, onBack, token, selectedChildId, onSelectChild }) {
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(selectedChildId);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newChildName, setNewChildName] = useState('');
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [error, setError] = useState('');
  const [visibleRecordCount, setVisibleRecordCount] = useState(RECORDS_PER_PAGE);

  useEffect(() => {
    if (!token) {
      setIsLoadingChildren(false);
      return undefined;
    }
    let cancelled = false;
    apiFetch('/api/children', { token })
      .then((data) => {
        if (cancelled) return;
        const list = data.children || [];
        setChildren(list);
        if (list.length > 0) {
          const nextId = list.some((child) => child.id === selectedChildId) ? selectedChildId : list[0].id;
          setActiveChildId(nextId);
          onSelectChild(nextId);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingChildren(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedChildId, onSelectChild]);

  useEffect(() => {
    if (!token || activeChildId == null) {
      setRecords([]);
      return undefined;
    }
    let cancelled = false;
    setSelectedRecord(null);
    setVisibleRecordCount(RECORDS_PER_PAGE);
    setIsLoadingRecords(true);
    apiFetch(`/api/history?child_id=${activeChildId}`, { token })
      .then((data) => {
        if (!cancelled) setRecords(data.records || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecords(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeChildId]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    const loadImages = async () => {
      const entries = await Promise.all(
        records
          .filter((record) => record.has_image)
          .map(async (record) => {
            try {
              const blob = await apiFetchBlob(`/api/history/${record.id}/image`, { token });
              const url = URL.createObjectURL(blob);
              objectUrls.push(url);
              return [record.id, url];
            } catch {
              return null;
            }
          })
      );

      if (!cancelled) {
        setImageUrls(Object.fromEntries(entries.filter(Boolean)));
      }
    };

    setImageUrls({});
    if (token && records.length > 0) loadImages();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [records, token]);

  const handleAddChild = async (event) => {
    event.preventDefault();
    const name = newChildName.trim();
    if (!name) return;

    try {
      const child = await apiFetch('/api/children', {
        token,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setChildren((prev) => [...prev, child]);
      setActiveChildId(child.id);
      onSelectChild(child.id);
      setNewChildName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedChild = children.find((child) => child.id === activeChildId);
  const visibleRecords = records.slice(0, visibleRecordCount);
  const hasMoreRecords = visibleRecordCount < records.length;

  return (
    <section className="phone">
      <div className="mypage-content">
        <div className="mypage-top">
          <button className="back-button" onClick={onBack || (() => onNavigate('mypage'))}>
            ← 뒤로
          </button>
          <h1>촬영 히스토리</h1>
          <span className="mypage-top-space" />
        </div>

        {isLoadingChildren && (
          <p className="subtext" style={{ textAlign: 'center', marginTop: 40 }}>불러오는 중이에요...</p>
        )}

        {!isLoadingChildren && children.length === 0 && (
          <form className="child-add-form" onSubmit={handleAddChild}>
            <p className="subtext" style={{ marginTop: 0 }}>등록된 자녀가 없어요. 먼저 추가해 주세요.</p>
            <label className="input-group">
              <span>자녀 이름</span>
              <input
                type="text"
                value={newChildName}
                onChange={(event) => setNewChildName(event.target.value)}
                placeholder="예: 지우"
              />
            </label>
            <button type="submit" className="login-button">자녀 추가</button>
          </form>
        )}

        {!isLoadingChildren && children.length > 0 && (
          <>
            <div className="child-selector">
              <button
                type="button"
                className="child-selector-trigger"
                onClick={() => setIsDropdownOpen((open) => !open)}
              >
                <span className="child-avatar">{selectedChild?.name?.slice(0, 1)}</span>
                <span className="child-selector-name">{selectedChild?.name}</span>
                <span className="child-selector-arrow" aria-hidden="true">⌄</span>
              </button>

              {isDropdownOpen && (
                <div className="child-selector-menu">
                  {children.map((child) => (
                    <button
                      type="button"
                      key={child.id}
                      className={`child-selector-item ${child.id === activeChildId ? 'active' : ''}`}
                      onClick={() => {
                        setActiveChildId(child.id);
                        onSelectChild(child.id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="child-avatar small">{child.name.slice(0, 1)}</span>
                      {child.name}
                    </button>
                  ))}
                  <form className="child-add-inline" onSubmit={handleAddChild}>
                    <input
                      type="text"
                      value={newChildName}
                      onChange={(event) => setNewChildName(event.target.value)}
                      placeholder="자녀 이름 추가"
                    />
                    <button type="submit">추가</button>
                  </form>
                </div>
              )}
            </div>

            {isLoadingRecords && (
              <p className="subtext" style={{ textAlign: 'center', marginTop: 30 }}>기록을 불러오는 중이에요...</p>
            )}

            {!isLoadingRecords && records.length === 0 && (
              <p className="subtext" style={{ textAlign: 'center', marginTop: 30 }}>
                아직 촬영 기록이 없어요.
              </p>
            )}

            {!isLoadingRecords && records.length > 0 && (
              <ul className="history-list">
                {visibleRecords.map((record) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      className="history-item"
                      onClick={() => setSelectedRecord(record)}
                      aria-label={`${formatDate(record.created_at)} 촬영 기록 보기`}
                    >
                      <span className={`history-thumbnail ${imageUrls[record.id] ? 'has-image' : ''}`}>
                        {imageUrls[record.id] ? (
                          <img src={imageUrls[record.id]} alt="" />
                        ) : (
                          <span aria-hidden="true">{record.has_image ? '…' : '📷'}</span>
                        )}
                      </span>
                      <span className="history-meta">
                        <strong>{formatDate(record.created_at)}</strong>
                        <span>충치 의심 {record.cavity_count}곳</span>
                      </span>
                      <span className="history-item-end">
                        <span className={`history-badge ${scoreTone(record.score)}`}>{record.score}점</span>
                        <span className="history-chevron" aria-hidden="true">›</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!isLoadingRecords && hasMoreRecords && (
              <button
                type="button"
                className="records-load-more history-load-more"
                onClick={() => setVisibleRecordCount((count) => count + RECORDS_PER_PAGE)}
              >
                더보기 <span>({Math.min(visibleRecordCount, records.length)}/{records.length})</span>
              </button>
            )}
          </>
        )}

        {error && (
          <p className="social-error" role="alert" style={{ textAlign: 'center', marginTop: 20 }}>{error}</p>
        )}
      </div>

      {selectedRecord && (
        <div className="history-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-modal-head">
              <div>
                <small>촬영 기록</small>
                <h2 id="history-detail-title">{formatDateTime(selectedRecord.created_at)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} aria-label="닫기">×</button>
            </div>

            <div className="history-detail-image">
              {imageUrls[selectedRecord.id] ? (
                <img src={imageUrls[selectedRecord.id]} alt={`${formatDate(selectedRecord.created_at)} 촬영 이미지`} />
              ) : (
                <div className="history-image-empty">
                  <span aria-hidden="true">📷</span>
                  <p>{selectedRecord.has_image ? '이미지를 불러오는 중이에요.' : '이전 기록에는 저장된 이미지가 없어요.'}</p>
                </div>
              )}
            </div>

            <div className="history-detail-metrics">
              <div><span>구강 점수</span><strong>{selectedRecord.score}점</strong></div>
              <div><span>충치 의심</span><strong>{selectedRecord.cavity_count}곳</strong></div>
              <div><span>정상 치아</span><strong>{selectedRecord.normal_count}곳</strong></div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default HistoryPage;
