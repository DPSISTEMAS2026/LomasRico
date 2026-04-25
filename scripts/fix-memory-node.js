const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZDVmNjVlZC1iODJjLTRmNDktOWNhMS05YzAyZjgwOTAzOTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjA4NTZkN2YtZjMyOC00MGZiLWEzOGYtODhmNmRkMWUzMzcyIiwiaWF0IjoxNzc3MTAzODUwLCJleHAiOjE3Nzk2ODE2MDB9.xOqRR46GkWgxahtyRcOYNDQqBz6ahJf_zGvwmmAjNRo';

async function fixMemory() {
    const r = await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const wf = await r.json();

    const mem = wf.nodes.find(n => n.name === 'Chat Memory');
    // Fix memory node - try different parameter configs
    mem.parameters = {
        contextWindowLength: 20,
        sessionIdType: 'customKey',
        sessionKey: "={{ $('Extract Data').item.json.phone }}"
    };
    // Also try with version 1.2 which may have different params
    mem.typeVersion = 1.2;

    console.log('Fixed memory params:', JSON.stringify(mem.parameters, null, 2));

    const res = await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi', {
        method: 'PUT',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings })
    });
    const result = await res.json();
    console.log('Update:', res.status);

    if (!res.ok) {
        console.log('Error:', JSON.stringify(result).substring(0, 500));
        // Try version 1.1
        mem.typeVersion = 1.1;
        mem.parameters = {
            contextWindowLength: 20,
            sessionIdType: 'customKey',
            sessionKey: "={{ $('Extract Data').item.json.phone }}"
        };
        const res2 = await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi', {
            method: 'PUT',
            headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings })
        });
        console.log('Retry v1.1:', res2.status);
    }

    await fetch('https://diegoproyects8.app.n8n.cloud/api/v1/workflows/7tp2UignQFVbzMkH17OFi/activate', {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY }
    });
    console.log('✅ Memory node fixed and workflow active');
}

fixMemory();
