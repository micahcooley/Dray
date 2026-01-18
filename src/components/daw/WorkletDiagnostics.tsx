import React, { useEffect, useState } from 'react';
import { audioScheduler } from '../../lib/scheduler';

export default function WorkletDiagnostics() {
  const [diag, setDiag] = useState(audioScheduler.getDiagnostics());
  const [threshold, setThreshold] = useState(2);
  const [poll, setPoll] = useState(6);

  useEffect(() => {
    const t = setInterval(() => setDiag(audioScheduler.getDiagnostics()), 250);
    return () => clearInterval(t);
  }, []);

  const applySettings = () => {
    audioScheduler.setNotifyThreshold(Number(threshold));
    audioScheduler.setPollInterval(Number(poll));
  };

  return (
    <div style={{ padding: 8, background: '#0b0b14', border: '1px solid #222', color: '#ddd', borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Worklet Diagnostics</div>
      <div>SAB used: {diag.sabUsed ? 'yes' : 'no'}</div>
      <div>Head: {diag.head} Tail: {diag.tail} Unread: {diag.unread}</div>
      <div>Avg Latency: {diag.avgLatencyMs.toFixed(2)} ms ({diag.samples} samples)</div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Notify threshold:
          <input value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ width: 60 }} />
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Poll ms:
          <input value={poll} onChange={e => setPoll(Number(e.target.value))} style={{ width: 60 }} />
        </label>
        <button onClick={applySettings} style={{ background: '#5865f2', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 6 }}>Apply</button>
      </div>
    </div>
  );
}
