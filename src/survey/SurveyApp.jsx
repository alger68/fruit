import { useEffect, useMemo, useState } from 'react'
import doc from '../../shared/survey-questions.json'
import './survey.css'

const QUESTIONS = doc.questions
const R0 = QUESTIONS[0]
const SUBSIDIARY_OPTION = R0.options[0]
const COUNTRIES = ['台灣', '中國大陸', '香港', '日本', '韓國', '越南', '泰國', '新加坡', '馬來西亞', '印尼', '菲律賓', '印度', '阿聯酋', '英國', '德國', '荷蘭', '法國', '義大利', '西班牙', '美國', '加拿大', '墨西哥', '巴西', '澳洲', '南非']

const CODE = new URLSearchParams(window.location.search).get('code') || ''
const DRAFT_KEY = `ar-survey-draft-${CODE || 'anon'}`

const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {} } catch { return {} }
}
const saveDraft = (draft) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* storage unavailable */ }
}

const isAnswered = (a) => !!a && (a.selected.length > 0 || (a.otherOn && a.other.trim() !== ''))

function Question({ q, answer, error, onChange }) {
  const a = answer || { selected: [], other: '', otherOn: false }
  const multi = q.type === 'multi'

  const toggle = (opt) => {
    if (multi) {
      const selected = a.selected.includes(opt) ? a.selected.filter(s => s !== opt) : [...a.selected, opt]
      onChange({ ...a, selected })
    } else {
      onChange({ ...a, selected: [opt], otherOn: false, other: '' })
    }
  }
  const toggleOther = () => {
    if (multi) onChange({ ...a, otherOn: !a.otherOn })
    else onChange({ ...a, selected: [], otherOn: true })
  }

  const inputType = multi ? 'checkbox' : 'radio'
  return (
    <div className="sv-card" id={`q-${q.id}`}>
      <div className="sv-q">
        <span className="sv-id">{q.id}</span>{q.text}
        {q.required && <span className="sv-req">*</span>}
        {multi && <span className="sv-hint">可複選</span>}
      </div>
      {q.options.map(opt => (
        <label className="sv-opt" key={opt}>
          <input type={inputType} name={q.id} checked={a.selected.includes(opt)} onChange={() => toggle(opt)} />
          <span>{opt}</span>
        </label>
      ))}
      {q.allowOther && (
        <>
          <label className="sv-opt">
            <input type={inputType} name={q.id} checked={a.otherOn} onChange={toggleOther} />
            <span>其他(請說明)</span>
          </label>
          {a.otherOn && (
            <input className="sv-text sv-other" maxLength={500} value={a.other}
              placeholder="請簡短說明" onChange={e => onChange({ ...a, other: e.target.value })} />
          )}
        </>
      )}
      {error && <p className="sv-errmsg">{error}</p>}
    </div>
  )
}

export default function SurveyApp() {
  const draft = useMemo(loadDraft, [])
  const [profile, setProfile] = useState(draft.profile || { company: '', country: '', email: '' })
  const [answers, setAnswers] = useState(draft.answers || {})
  const [step, setStep] = useState(draft.step || 0)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('editing') // editing | sending | done
  const [submitError, setSubmitError] = useState('')
  const [inviteError, setInviteError] = useState('')

  // Prefill company, country and respondent type from the partner link.
  useEffect(() => {
    if (!CODE) return
    fetch(`/api/survey/invites/${encodeURIComponent(CODE)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('bad code'))))
      .then(inv => {
        setProfile(p => ({ ...p, company: p.company || inv.name, country: p.country || inv.country }))
        setAnswers(prev => {
          if (prev.R0) return prev
          const r0 = inv.type === 'subsidiary' ? SUBSIDIARY_OPTION : R0.options[1]
          return { ...prev, R0: { selected: [r0], other: '', otherOn: false } }
        })
      })
      .catch(() => setInviteError('此連結代碼無效,請向總部確認。'))
  }, [])

  const isSubsidiary = !!answers.R0 && answers.R0.selected[0] === SUBSIDIARY_OPTION
  const visible = useMemo(
    () => QUESTIONS.filter(q => q.id !== 'R0' && (q.audience === 'all' || isSubsidiary)),
    [isSubsidiary],
  )
  const sections = useMemo(() => [...new Set(visible.map(q => q.section))], [visible])
  const totalSteps = sections.length + 1 // step 0 = profile + routing
  const last = step >= totalSteps - 1

  useEffect(() => { saveDraft({ profile, answers, step }) }, [profile, answers, step])

  const requiredCount = visible.filter(q => q.required).length
  const answeredRequired = visible.filter(q => q.required && isAnswered(answers[q.id])).length

  const validateStep = () => {
    const errs = {}
    if (step === 0) {
      if (!profile.company.trim()) errs.company = '請填寫公司名稱'
      if (!profile.country.trim()) errs.country = '請選擇國家 / 地區'
      if (!isAnswered(answers.R0)) errs.R0 = '請選擇'
    } else {
      for (const q of visible.filter(x => x.section === sections[step - 1])) {
        if (q.required && !isAnswered(answers[q.id])) errs[q.id] = '此題為必填'
      }
    }
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      const target = first === 'company' || first === 'country' ? 'profile' : `q-${first}`
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return !first
  }

  const go = (delta) => {
    if (delta > 0 && !validateStep()) return
    setStep(s => Math.max(0, Math.min(totalSteps - 1, s + delta)))
    window.scrollTo({ top: 0 })
  }

  const submit = async () => {
    if (!validateStep()) return
    setStatus('sending')
    setSubmitError('')
    const payload = {}
    for (const [id, a] of Object.entries(answers)) {
      payload[id] = { selected: a.selected, other: a.otherOn ? a.other : '' }
    }
    try {
      const res = await fetch('/api/survey/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: CODE, ...profile, answers: payload }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'failed')
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      setStatus('done')
    } catch (e) {
      setSubmitError(`送出失敗:${e.message}。您的答案已暫存,可稍後再試。`)
      setStatus('editing')
    }
  }

  if (status === 'done') {
    return (
      <div className="sv">
        <h1>感謝您的填寫</h1>
        <p>問卷已送出。如需修改,請使用原連結重新填寫,系統只保留最新一份。</p>
      </div>
    )
  }

  const pct = Math.round((step / Math.max(totalSteps - 1, 1)) * 100)
  const sectionQs = step > 0 ? visible.filter(q => q.section === sections[step - 1]) : []

  return (
    <div className="sv">
      <h1>Global AR 問卷盤點</h1>
      <p className="sv-muted">
        全部為選擇題,約 {visible.length} 題;標 <span className="sv-req">*</span> 為必填。答案會自動暫存在本機瀏覽器。
      </p>
      {inviteError && <p className="sv-errmsg">{inviteError}</p>}
      <div className="sv-bar"><div style={{ width: `${pct}%` }} /></div>
      <p className="sv-muted">
        第 {step + 1} / {totalSteps} 頁{step > 0 && `|${sections[step - 1]}|必填 ${answeredRequired} / ${requiredCount}`}
      </p>

      {step === 0 && (
        <>
          <div className="sv-card" id="profile">
            <div className="sv-q">基本資料</div>
            <p className="sv-muted">公司名稱(必填)</p>
            <input className={`sv-text ${errors.company ? 'sv-err' : ''}`} maxLength={200} value={profile.company}
              onChange={e => setProfile({ ...profile, company: e.target.value })} />
            {errors.company && <p className="sv-errmsg">{errors.company}</p>}
            <p className="sv-muted" style={{ marginTop: 12 }}>國家 / 地區(必填)</p>
            <input className={`sv-text ${errors.country ? 'sv-err' : ''}`} list="sv-countries" maxLength={100} value={profile.country}
              placeholder="可直接輸入或從清單選擇" onChange={e => setProfile({ ...profile, country: e.target.value })} />
            <datalist id="sv-countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
            {errors.country && <p className="sv-errmsg">{errors.country}</p>}
            <p className="sv-muted" style={{ marginTop: 12 }}>聯絡 Email(選填,供補問使用)</p>
            <input className="sv-text" type="email" maxLength={200} value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <Question q={{ ...R0, required: true }} answer={answers.R0} error={errors.R0}
            onChange={a => setAnswers({ ...answers, R0: a })} />
        </>
      )}

      {sectionQs.map(q => (
        <Question key={q.id} q={q} answer={answers[q.id]} error={errors[q.id]}
          onChange={a => setAnswers({ ...answers, [q.id]: a })} />
      ))}

      {submitError && <p className="sv-errmsg">{submitError}</p>}
      <div className="sv-nav">
        <button className="sv-btn sv-ghost" disabled={step === 0} onClick={() => go(-1)}>上一頁</button>
        {last
          ? <button className="sv-btn" disabled={status === 'sending'} onClick={submit}>{status === 'sending' ? '送出中…' : '送出問卷'}</button>
          : <button className="sv-btn" onClick={() => go(1)}>下一頁</button>}
      </div>
    </div>
  )
}
