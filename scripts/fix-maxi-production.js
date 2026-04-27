/**
 * fix-maxi-production.js
 * 
 * Updates the live "Maxi – WhatsApp Sales Flow" workflow in n8n
 * to point to the correct Render production URL.
 */

const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZDVmNjVlZC1iODJjLTRmNDktOWNhMS05YzAyZjgwOTAzOTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjA4NTZkN2YtZjMyOC00MGZiLWEzOGYtODhmNmRkMWUzMzcyIiwiaWF0IjoxNzc3MTAzODUwLCJleHAiOjE3Nzk2ODE2MDB9.xOqRR46GkWgxahtyRcOYNDQqBz6ahJf_zGvwmmAjNRo';
const N8N_URL = 'https://diegoproyects8.app.n8n.cloud';
const WORKFLOW_ID = '7tp2UignQFVbzMkH17OFi';

const OLD_URL = 'https://pro-lomasrico-api.onrender.com';
const NEW_URL = 'https://pro-lomasrico-api-69je.onrender.com';

async function main() {
    // 1. Download current workflow
    console.log('📥 Downloading workflow...');
    const resp = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const wf = await resp.json();
    console.log(`   Name: ${wf.name} | Nodes: ${wf.nodes.length} | Active: ${wf.active}`);

    // 2. Replace all occurrences of old URL with new
    let raw = JSON.stringify(wf);
    const urlCount = (raw.match(new RegExp(OLD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`🔍 Found ${urlCount} occurrences of old URL`);
    
    raw = raw.replaceAll(OLD_URL, NEW_URL);
    const updated = JSON.parse(raw);

    // 3. Verify the Twilio number  
    const twilioNode = updated.nodes.find(n => n.type === 'n8n-nodes-base.twilio');
    if (twilioNode) {
        console.log(`📱 Twilio from: ${twilioNode.parameters.from}`);
    }

    // 4. Push update (only allowed fields)
    console.log('📤 Pushing update to n8n...');
    const payload = {
        name: updated.name,
        nodes: updated.nodes,
        connections: updated.connections,
        settings: updated.settings
    };

    const putResp = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const result = await putResp.json();
    if (putResp.ok) {
        console.log(`✅ Updated! Version: ${result.versionId} | Active: ${result.active}`);
    } else {
        console.error('❌ Error:', JSON.stringify(result));
    }

    // 5. Save backup
    fs.writeFileSync('n8n-maxi-sales-flow-updated.json', JSON.stringify(result, null, 2));
    console.log('💾 Backup saved to n8n-maxi-sales-flow-updated.json');
}

main().catch(console.error);
