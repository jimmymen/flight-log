const GH = 'https://api.github.com';

function ghHeaders(env) {
    return {
        'Authorization': `token ${env.GH_TOKEN}`,
        'User-Agent': 'flight-log',
        'Accept': 'application/vnd.github+json',
    };
}

export async function onRequestGet({ env }) {
    if (!env.GH_TOKEN || !env.GIST_ID) {
        return new Response(JSON.stringify({ error: 'server GH_TOKEN/GIST_ID not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const r = await fetch(`${GH}/gists/${env.GIST_ID}`, { headers: ghHeaders(env) });
    return new Response(r.body, {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function onRequestPatch({ request, env }) {
    if (!env.GH_TOKEN || !env.GIST_ID) {
        return new Response(JSON.stringify({ error: 'server GH_TOKEN/GIST_ID not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const body = await request.text();
    const r = await fetch(`${GH}/gists/${env.GIST_ID}`, {
        method: 'PATCH',
        headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
        body,
    });
    return new Response(r.body, {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
    });
}
