const GH = 'https://api.github.com';

function ghHeaders(env) {
    return {
        'Authorization': `token ${env.GH_TOKEN}`,
        'User-Agent': 'flight-log',
        'Accept': 'application/vnd.github+json',
    };
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function authFromGist(gist, auth) {
    if (!auth) return null;
    const f = gist.files && gist.files['accounts.json'];
    if (!f || !f.content) return null;
    let ac;
    try {
        ac = JSON.parse(f.content);
    } catch (e) {
        return null;
    }
    const users = ac.users || {};
    for (const name of Object.keys(users)) {
        const entry = users[name];
        if (entry && entry.password && entry.password === auth) {
            return { name: name, type: entry.type || 'user' };
        }
    }
    return null;
}

export async function onRequestGet({ request, env }) {
    if (!env.GH_TOKEN || !env.GIST_ID) {
        return json({ error: 'server not configured' }, 500);
    }
    const r = await fetch(`${GH}/gists/${env.GIST_ID}`, { headers: ghHeaders(env) });
    if (!r.ok) {
        return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json' } });
    }
    const g = await r.json();
    const user = authFromGist(g, request.headers.get('x-auth') || '');
    if (!user) {
        return json({ error: 'unauthorized' }, 401);
    }
    if (user.type !== 'admin') {
        const keep = 'data_' + user.name + '.json';
        const files = {};
        if (g.files && g.files[keep]) files[keep] = g.files[keep];
        g.files = files;
    }
    return json(g);
}

export async function onRequestPatch({ request, env }) {
    if (!env.GH_TOKEN || !env.GIST_ID) {
        return json({ error: 'server not configured' }, 500);
    }
    let files;
    try {
        files = JSON.parse(await request.text()).files || {};
    } catch (e) {
        return json({ error: 'invalid json' }, 400);
    }

    const ar = await fetch(`${GH}/gists/${env.GIST_ID}`, { headers: ghHeaders(env) });
    if (!ar.ok) {
        return json({ error: 'gist read failed' }, 502);
    }
    const g = await ar.json();
    const user = authFromGist(g, request.headers.get('x-auth') || '');
    if (!user) {
        return json({ error: 'unauthorized' }, 401);
    }

    for (const name of Object.keys(files)) {
        const isOwnData = name === 'data_' + user.name + '.json';
        const isAccounts = name === 'accounts.json';
        if (isAccounts && user.type !== 'admin') {
            return json({ error: 'forbidden' }, 403);
        }
        if (!isOwnData && !isAccounts) {
            return json({ error: 'forbidden' }, 403);
        }
    }

    const r = await fetch(`${GH}/gists/${env.GIST_ID}`, {
        method: 'PATCH',
        headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
    });
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json' } });
}
