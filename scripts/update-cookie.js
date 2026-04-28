const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const content = fs.readFileSync(envPath, 'utf8');

const newCookie = [
  'sid=QA.CAESENAi3UvsMkWGlzpTDpuO30IY6Knq1gYiATEqJDliNjFkZGQzLWY2OGMtNTNhZC1hMWEzLTQzNWYyMGZlODdkMjJAhKZl-P4QLziSaHnK69spOY3lCFG2FEbwEbtmwBTY6fMnbx0vcGzq946ISMizeNdrF-QbcXSgd-0R1cBVc9TpUzoBMUINLnViZXJlYXRzLmNvbQ.sWMGUC-AL3EDxFqLaLRIOBz58cqPaxfjEcsL8pJMtQo',
  'smeta={expiresAt:1792709864023}',
  'cf_clearance=_Yebk_xyR.tym4WEWT7eASsSufj__t.oGJwaf30TJM8-1777346036-1.2.1.1-iELCST7rYkb60PSkfTJD2.sqQ6CaD9lC3k9cAcTOLWwxLWjCTneE4UjcLZPxsfTnHQ5DQ6FZxFZBFDEph0Wd6KptVlQ9KZx6WTqxj4n9WreuzScHE3dh.KUkt.oW_9ZVhu.3MsqWtVmD1W8H9ABbFoQOjhPK5a_IUk3gkKHJR88DUUVY1H.xIqPdYaDLIULh5BWhVyOCyCzCKRtgXR9S9i99DiHOaHWNXPBCKQJfkzGD4D1fS3aYUeRicTbPathATYL7cDxEc9MvyTvBhsR87IxOxj0u8k1zdS9kC4synw2IGuwDJV5uC5EPer0rjI.PeuLjj0D9nsGGA1eyuhmp8A',
  '_ua={"session_id":"d1e3eab0-f46d-442c-b041-224cd3f50f12","session_time_ms":1777393195625}',
  'jwt-session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNsYXRlLWV4cGlyZXMtYXQiOjE3NzczOTQ4MTU5MjF9LCJpYXQiOjE3NzczMzA2NzUsImV4cCI6MTc3NzQxNzA3NX0.ghiaFj9WoMN2dc0mdt45qn_z4AcPFPtz2MafZSg_fLU',
  'mp_adec770be288b16d9008c964acfba5c2_mixpanel=%7B%22distinct_id%22%3A%20%229b61ddd3-f68c-53ad-a1a3-435f20fe87d2%22%2C%22%24device_id%22%3A%20%2219dc6dd01a8517-094b1c460f81968-26061e51-1fa400-19dc6dd01a9a7%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fauth.uber.com%2F%22%2C%22%24initial_referring_domain%22%3A%20%22auth.uber.com%22%2C%22%24user_id%22%3A%20%229b61ddd3-f68c-53ad-a1a3-435f20fe87d2%22%7D',
].join('; ');

const updated = content.replace(
  /^UBER_EATS_COOKIE=.*$/m,
  `UBER_EATS_COOKIE="${newCookie}"`
);

fs.writeFileSync(envPath, updated);
console.log('✅ Cookie actualizada en .env');

// Verify
const verify = fs.readFileSync(envPath, 'utf8');
const line = verify.split('\n').find(l => l.startsWith('UBER_EATS_COOKIE='));
console.log('Length:', line.length);
console.log('Contains new cf_clearance:', line.includes('_Yebk_xyR'));
console.log('Contains new jwt-session:', line.includes('ghiaFj9WoMN2dc0mdt45qn'));
