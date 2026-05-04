const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const content = fs.readFileSync(envPath, 'utf8');

const newCookie = [
  'sid=QA.CAESENAi3UvsMkWGlzpTDpuO30IY6Knq1gYiATEqJDliNjFkZGQzLWY2OGMtNTNhZC1hMWEzLTQzNWYyMGZlODdkMjJAhKZl-P4QLziSaHnK69spOY3lCFG2FEbwEbtmwBTY6fMnbx0vcGzq946ISMizeNdrF-QbcXSgd-0R1cBVc9TpUzoBMUINLnViZXJlYXRzLmNvbQ.sWMGUC-AL3EDxFqLaLRIOBz58cqPaxfjEcsL8pJMtQo',
  'smeta={expiresAt:1792709864023}',
  'cf_clearance=BsB5uNJtIRWgqKGQOm0R0TqRtABEZyR_V5kHzfh4_L4-1777658718-1.2.1.1-2Jm3wmp.A7lJkZruFS5HqgjbpMKAY_.xxqIdwDEbabegfw74qEdaV4DmblsXHiDY4ZOcgVEO59CINroc_TimPd8tYe39ATYH0DRyCrWgYMVeEYHyIoFSF6GC2hUO01AO9NalOBKJr0IwuwBE16OwP7OmSv9BHmXs721dM85qoQTFrf47N6EGAvjciylOWIIdBbUidABlWXns26AwPJwIXIzqP0QwEOZtIdJXvhNsL4ytn5tjPYPK.wamw9lj5QpiPYreSIpJnovCVq3KC5VPmaiJDO7q57bb0oWzsaUh_V0Rq9ejVzsyWC99rF9i.FIlPTueuqf5TLmjBrmdha_V5A',
  '_ua={"session_id":"df3ee182-e486-4e41-8504-a05cabd25079","session_time_ms":1777900542874}',
  'jwt-session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNsYXRlLWV4cGlyZXMtYXQiOjE3Nzc5MDA4NDI4NzN9LCJpYXQiOjE3Nzc5MDA1NDMsImV4cCI6MTc3Nzk4Njk0M30.FtMmn2rSEU9NPGTJ-DDw3h4j39HCbdg3UyrFck6gSig',
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
console.log('Contains new cf_clearance:', line.includes('BsB5uNJtIRWgqKGQOm0R0'));
console.log('Contains new jwt-session:', line.includes('FtMmn2rSEU9NPGTJ'));
