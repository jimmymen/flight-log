const GH = 'https://api.github.com';

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function onRequestPost({ request, env }) {
    if (!env.GH_TOKEN || !env.GIST_ID) {
        return json({ error: 'server not configured' }, 500);
    }
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return json({ error: 'invalid json' }, 400);
    }
    const username = (body && body.username) || '';
    const pwdHash = (body && body.pwdHash) || '';
    if (!username || !pwdHash) {
        return json({ error: 'username and pwdHash required' }, 400);
    }

    const r = await fetch(`${GH}/gists/${env.GIST_ID}`, {
        headers: {
            'Authorization': `token ${env.GH_TOKEN}`,
            'User-Agent': 'flight-log',
            'Accept': 'application/vnd.github+json',
        },
    });
    if (!r.ok) {
        return json({ error: 'gist read failed' }, 502);
    }
    const g = await r.json();
    const f = g.files && g.files['accounts.json'];
    if (!f || !f.content) {
        return json({ error: 'accounts file missing' }, 500);
    }
    let ac;
    try {
        ac = JSON.parse(f.content);
    } catch (e) {
        return json({ error: 'invalid accounts' }, 500);
    }
    const entry = ac.users && ac.users[username];
    if (!entry || entry.password !== pwdHash) {
        return json({ ok: false, error: 'invalid credentials' }, 401);
    }
    return json({
        ok: true,
        username: username,
        type: entry.type || 'user',
        base_salary_net: entry.base_salary_net,
        base_salary_gross: entry.base_salary_gross,
    });
}
