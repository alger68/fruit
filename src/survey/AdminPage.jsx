import { useCallback, useState } from 'react'
import './survey.css'

const TOKEN_KEY = 'ar-survey-admin-token'
const TYPE_LABEL = { subsidiary: '子公司/合資', agent: '代理行' }

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—')

function Bars({ q }) {
  const entries = Object.entries(q.counts)
  const max = Math.max(1, ...entries.map(([, n]) => n))
  return (
    <div className="sv-card">
      <div className="sv-q"><span className="sv-id">{q.id}</span>{q.text}
        <span className="sv-hint">已答 {q.answered}</span></div>
      {entries.map(([opt, n]) => (
        <div className="sv-row" key={opt}>
          <span>{opt}</span>
          <div className="sv-bar"><div style={{ width: `${(n / max) * 100}%` }} /></div>
          <span>{n}{q.answered ? `(${pct(n, q.answered)})` : ''}</span>
        </div>
      ))}
      {q.other > 0 && <p className="sv-muted">另有 {q.other} 份填「其他」</p>}
    </div>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
  })
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [invitesText, setInvitesText] = useState('')
  const [created, setCreated] = useState([])

  const api = useCallback(async (path, options = {}) => {
    const res = await fetch(`/api/survey/admin/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, ...options.headers },
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
    return res
  }, [token])

  const load = async () => {
    setError('')
    try {
      setStats(await (await api('stats')).json())
      try { sessionStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
    } catch (e) {
      setStats(null)
      setError(e.message)
    }
  }

  const createInvites = async () => {
    // One partner per line: name, country, type (代理行 or 子公司)
    const invites = invitesText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [name, country = '', type = ''] = line.split(',').map(s => s.trim())
      return { name, country, type: /子公司|合資|sub/i.test(type) ? 'subsidiary' : 'agent' }
    })
    try {
      const res = await api('invites', { method: 'POST', body: JSON.stringify(invites) })
      setCreated(await res.json())
      setInvitesText('')
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const download = async () => {
    try {
      const blob = await (await api('export.csv')).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'global-ar-survey.csv'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setError(e.message)
    }
  }

  const sections = stats ? [...new Set(stats.questions.map(q => q.section))] : []

  return (
    <div className="sv">
      <h1>問卷回收統計</h1>
      <div className="sv-card">
        <p className="sv-muted">請輸入管理密碼(伺服器環境變數 ADMIN_TOKEN)</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="sv-text" type="password" value={token} onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
          <button className="sv-btn" onClick={load}>載入</button>
        </div>
        {error && <p className="sv-errmsg">{error}</p>}
      </div>

      {stats && (
        <>
          <div className="sv-grid">
            <div className="sv-card sv-stat"><span className="sv-muted">已發送連結</span><b>{stats.invited}</b></div>
            <div className="sv-card sv-stat"><span className="sv-muted">已回收</span><b>{stats.respondedInvites}</b></div>
            <div className="sv-card sv-stat"><span className="sv-muted">回收率</span><b>{stats.responseRate == null ? '—' : pct(stats.respondedInvites, stats.invited)}</b></div>
            <div className="sv-card sv-stat"><span className="sv-muted">總回覆份數</span><b>{stats.totalResponses}</b></div>
          </div>

          <div className="sv-card">
            <table>
              <thead><tr><th>身份</th><th>已發送</th><th>已回收</th><th>回收率</th><th>回覆份數</th></tr></thead>
              <tbody>
                {Object.entries(stats.byType).map(([t, v]) => (
                  <tr key={t}><td>{TYPE_LABEL[t]}</td><td>{v.invited}</td><td>{v.responded}</td><td>{pct(v.responded, v.invited)}</td><td>{v.responses}</td></tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}><button className="sv-btn" onClick={download}>匯出 CSV(Excel 可開)</button></p>
          </div>

          <h2>尚未回覆({stats.pending.length})</h2>
          <div className="sv-card">
            {stats.pending.length === 0 ? <p className="sv-muted">全部已回覆</p> : (
              <table>
                <thead><tr><th>名稱</th><th>國家</th><th>身份</th><th>代碼</th></tr></thead>
                <tbody>
                  {stats.pending.map(p => (
                    <tr key={p.code}><td>{p.name}</td><td>{p.country}</td><td>{TYPE_LABEL[p.type]}</td><td className="sv-code">{p.code}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2>建立夥伴連結</h2>
          <div className="sv-card">
            <p className="sv-muted">每行一位夥伴:名稱, 國家, 身份(代理行 或 子公司)</p>
            <textarea value={invitesText} onChange={e => setInvitesText(e.target.value)}
              placeholder={'Yang Ming (America) Corp., 美國, 子公司\nAgent Co. Ltd., 越南, 代理行'} />
            <p><button className="sv-btn" disabled={!invitesText.trim()} onClick={createInvites}>產生連結</button></p>
            {created.length > 0 && (
              <table>
                <thead><tr><th>名稱</th><th>專屬連結</th></tr></thead>
                <tbody>
                  {created.map(c => (
                    <tr key={c.code}><td>{c.name}</td><td className="sv-code">{`${window.location.origin}/survey?code=${c.code}`}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2>各題選項分佈</h2>
          {sections.map(s => (
            <details key={s}>
              <summary>{s}</summary>
              {stats.questions.filter(q => q.section === s).map(q => <Bars key={q.id} q={q} />)}
            </details>
          ))}
        </>
      )}
    </div>
  )
}
