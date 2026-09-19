const DEFAULT_AI_URL = 'https://api.deepseek.com/chat/completions';
const GH = 'https://api.github.com';

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

async function isAuthorized(env, auth) {
    if (!auth || !env.GH_TOKEN || !env.GIST_ID) return false;
    const r = await fetch(`${GH}/gists/${env.GIST_ID}`, {
        headers: {
            'Authorization': `token ${env.GH_TOKEN}`,
            'User-Agent': 'flight-log',
            'Accept': 'application/vnd.github+json',
        },
    });
    if (!r.ok) return false;
    const g = await r.json();
    const f = g.files && g.files['accounts.json'];
    if (!f || !f.content) return false;
    let ac;
    try {
        ac = JSON.parse(f.content);
    } catch (e) {
        return false;
    }
    const users = ac.users || {};
    for (const name of Object.keys(users)) {
        const entry = users[name];
        if (entry && entry.password && entry.password === auth) return true;
    }
    return false;
}

export async function onRequestPost({ request, env }) {
    if (!(await isAuthorized(env, request.headers.get('x-auth') || ''))) {
        return json({ error: 'unauthorized' }, 401);
    }

    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return json({ error: 'invalid json' }, 400);
    }

    const { model, messages, temperature } = payload || {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return json({ error: 'messages is required' }, 400);
    }
    if (!env.AI_KEY) {
        return json({ error: 'server AI_KEY not configured' }, 500);
    }

    const upstream = await fetch(env.AI_URL || DEFAULT_AI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AI_KEY}`,
        },
        body: JSON.stringify({
            model: model || env.AI_MODEL || 'deepseek-flash',
            messages,
            temperature: typeof temperature === 'number' ? temperature : 0.1,
            stream: false,
        }),
    });

    const text = await upstream.text();
    return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
    });
}
