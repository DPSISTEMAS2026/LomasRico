const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZDVmNjVlZC1iODJjLTRmNDktOWNhMS05YzAyZjgwOTAzOTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjA4NTZkN2YtZjMyOC00MGZiLWEzOGYtODhmNmRkMWUzMzcyIiwiaWF0IjoxNzc3MTAzODUwLCJleHAiOjE3Nzk2ODE2MDB9.xOqRR46GkWgxahtyRcOYNDQqBz6ahJf_zGvwmmAjNRo';
const NEW_URL = process.argv[2] || 'https://random-advise-actively-reg.trycloudflare.com';

async function fix() {
    const r = await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const wf = await r.json();
    let s = JSON.stringify(wf);

    // Find ALL URLs that are NOT n8n cloud
    const allUrls = new Set();
    const regex = /https:\/\/[a-zA-Z0-9._-]+\.(loca\.lt|trycloudflare\.com|onrender\.com)/g;
    let match;
    while ((match = regex.exec(s)) !== null) {
        allUrls.add(match[0]);
    }
    console.log('URLs encontradas:', [...allUrls]);

    // Replace all with new
    for (const url of allUrls) {
        const count = s.split(url).length - 1;
        s = s.split(url).join(NEW_URL);
        console.log(`  ${url} → ${NEW_URL} (${count}x)`);
    }

    const u = JSON.parse(s);
    const res = await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi', {
        method: 'PUT',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: u.name, nodes: u.nodes, connections: u.connections, settings: u.settings })
    });
    console.log('Update:', res.status);

    await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi/activate', {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY }
    });
    console.log('✅ Workflow actualizado a:', NEW_URL);
}

fix();
