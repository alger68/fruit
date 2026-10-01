const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'survey.json');
const questionsDoc = require('../shared/survey-questions.json');
const QUESTIONS = questionsDoc.questions;
const BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const SUBSIDIARY_OPTION = QUESTIONS.find(q => q.id === 'R0').options[0];
const TYPE_LABEL = { subsidiary: '子公司/合資', agent: '代理行' };

const readDb = () => {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return { invites: [], responses: [] };
    }
};

const writeDb = (db) => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DATA_FILE);
};

const respondentType = (answers) =>
    answers.R0 && answers.R0.selected[0] === SUBSIDIARY_OPTION ? 'subsidiary' : 'agent';

const visibleQuestions = (type) =>
    QUESTIONS.filter(q => q.audience === 'all' || type === 'subsidiary');

// Returns an error string, or null when the answers are acceptable.
const validateAnswers = (answers) => {
    if (!answers || typeof answers !== 'object') return 'answers is required';
    if (!answers.R0 || !Array.isArray(answers.R0.selected) || answers.R0.selected.length !== 1) {
        return 'R0 is required';
    }
    const type = respondentType(answers);
    for (const q of visibleQuestions(type)) {
        const a = answers[q.id];
        const selected = a && Array.isArray(a.selected) ? a.selected : [];
        const other = a && typeof a.other === 'string' ? a.other.trim() : '';
        if (selected.length === 0 && !other) {
            if (q.required) return `${q.id} is required`;
            continue;
        }
        if (q.type === 'single' && selected.length > 1) return `${q.id} accepts one option`;
        for (const s of selected) {
            if (!q.options.includes(s)) return `${q.id} has an invalid option`;
        }
        if (other && !q.allowOther) return `${q.id} does not accept other text`;
        if (other.length > 500) return `${q.id} other text is too long`;
    }
    return null;
};

const clean = (answers) => {
    const type = respondentType(answers);
    const out = {};
    for (const q of visibleQuestions(type)) {
        const a = answers[q.id];
        if (!a) continue;
        const selected = (a.selected || []).filter(s => q.options.includes(s));
        const other = q.allowOther && typeof a.other === 'string' ? a.other.trim() : '';
        if (selected.length || other) out[q.id] = { selected, other };
    }
    return out;
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ---------- public ----------

router.get('/questions', (req, res) => res.json(questionsDoc));

router.get('/invites/:code', (req, res) => {
    const invite = readDb().invites.find(i => i.code === req.params.code);
    if (!invite) return res.status(404).json({ error: 'Unknown code' });
    res.json({ name: invite.name, country: invite.country, type: invite.type });
});

router.post('/responses', (req, res) => {
    const { code, company, country, email, answers } = req.body || {};
    const error = validateAnswers(answers);
    if (error) return res.status(400).json({ error });
    if (!str(company, 200) || !str(country, 100)) {
        return res.status(400).json({ error: 'company and country are required' });
    }

    const db = readDb();
    const inviteCode = str(code, 32);
    if (inviteCode && !db.invites.some(i => i.code === inviteCode)) {
        return res.status(400).json({ error: 'Unknown code' });
    }

    const response = {
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        code: inviteCode || null,
        company: str(company, 200),
        country: str(country, 100),
        email: str(email, 200),
        type: respondentType(answers),
        answers: clean(answers),
    };
    // A partner link keeps only its latest submission.
    if (response.code) db.responses = db.responses.filter(r => r.code !== response.code);
    db.responses.push(response);
    writeDb(db);
    res.status(201).json({ message: 'Thank you', id: response.id });
});

// ---------- admin ----------

const requireAdmin = (req, res, next) => {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) {
        return res.status(503).json({ error: 'ADMIN_TOKEN is not configured on the server' });
    }
    const given = String(req.get('x-admin-token') || '');
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Invalid admin token' });
    }
    next();
};

router.get('/admin/invites', requireAdmin, (req, res) => {
    const db = readDb();
    const responded = new Set(db.responses.map(r => r.code).filter(Boolean));
    res.json(db.invites.map(i => ({ ...i, responded: responded.has(i.code) })));
});

router.post('/admin/invites', requireAdmin, (req, res) => {
    const list = Array.isArray(req.body) ? req.body : req.body && req.body.invites;
    if (!Array.isArray(list) || list.length === 0 || list.length > 500) {
        return res.status(400).json({ error: 'Provide 1-500 invites' });
    }
    const db = readDb();
    const created = [];
    for (const item of list) {
        const name = str(item.name, 200);
        if (!name) return res.status(400).json({ error: 'Each invite needs a name' });
        const type = item.type === 'subsidiary' ? 'subsidiary' : 'agent';
        let code;
        do {
            code = crypto.randomBytes(5).toString('hex').toUpperCase();
        } while (db.invites.some(i => i.code === code) || created.some(i => i.code === code));
        created.push({ code, name, country: str(item.country, 100), type, createdAt: new Date().toISOString() });
    }
    db.invites.push(...created);
    writeDb(db);
    res.status(201).json(created);
});

router.get('/admin/stats', requireAdmin, (req, res) => {
    const db = readDb();
    const invited = db.invites.length;
    const respondedCodes = new Set(db.responses.map(r => r.code).filter(Boolean));
    const byType = (type) => {
        const inv = db.invites.filter(i => i.type === type);
        return {
            invited: inv.length,
            responded: inv.filter(i => respondedCodes.has(i.code)).length,
            responses: db.responses.filter(r => r.type === type).length,
        };
    };

    const questions = QUESTIONS.map(q => {
        const counts = Object.fromEntries(q.options.map(o => [o, 0]));
        let other = 0;
        let answered = 0;
        for (const r of db.responses) {
            const a = r.answers[q.id];
            if (!a) continue;
            answered++;
            a.selected.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
            if (a.other) other++;
        }
        return { id: q.id, section: q.section, text: q.text, type: q.type, answered, counts, other };
    });

    res.json({
        invited,
        respondedInvites: respondedCodes.size,
        totalResponses: db.responses.length,
        responseRate: invited ? respondedCodes.size / invited : null,
        byType: { subsidiary: byType('subsidiary'), agent: byType('agent') },
        pending: db.invites.filter(i => !respondedCodes.has(i.code)).map(i => ({
            code: i.code, name: i.name, country: i.country, type: i.type,
        })),
        questions,
    });
});

const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

router.get('/admin/export.csv', requireAdmin, (req, res) => {
    const db = readDb();
    const head = ['submittedAt', 'code', 'company', 'country', 'email', 'type', ...QUESTIONS.map(q => q.id)];
    const lines = [head.map(csvCell).join(',')];
    for (const r of db.responses) {
        const cells = [r.submittedAt, r.code, r.company, r.country, r.email, TYPE_LABEL[r.type]];
        for (const q of QUESTIONS) {
            const a = r.answers[q.id];
            if (!a) { cells.push(''); continue; }
            const parts = [...a.selected];
            if (a.other) parts.push(`其他:${a.other}`);
            cells.push(parts.join('; '));
        }
        lines.push(cells.map(csvCell).join(','));
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="global-ar-survey.csv"');
    res.send('﻿' + lines.join('\r\n'));
});

module.exports = router;
