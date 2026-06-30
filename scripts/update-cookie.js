const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const content = fs.readFileSync(envPath, 'utf8');

const newCookie = 'cf_clearance=BsB5uNJtIRWgqKGQOm0R0TqRtABEZyR_V5kHzfh4_L4-1777658718-1.2.1.1-2Jm3wmp.A7lJkZruFS5HqgjbpMKAY_.xxqIdwDEbabegfw74qEdaV4DmblsXHiDY4ZOcgVEO59CINroc_TimPd8tYe39ATYH0DRyCrWgYMVeEYHyIoFSF6GC2hUO01AO9NalOBKJr0IwuwBE16OwP7OmSv9BHmXs721dM85qoQTFrf47N6EGAvjciylOWIIdBbUidABlWXns26AwPJwIXIzqP0QwEOZtIdJXvhNsL4ytn5tjPYPK.wamw9lj5QpiPYreSIpJnovCVq3KC5VPmaiJDO7q57bb0oWzsaUh_V0Rq9ejVzsyWC99rF9i.FIlPTueuqf5TLmjBrmdha_V5A; stateaX7ReWCH=JF0333C63bI0EH.1780335022423.NinjuoBqUjU8iAGjPn/uNd29FssM5EOov1uwX84JJr8=; state=JF0333C63bI0EH.1780335022702.//tG5uH/SKdzKTVsOTNX3rUjYp0cdM4lNQqDc/q5maM=; sid=QA.CAESECxPh2G6B0SvmtVmFDm8Mu8Yq5is2AYiATEqJDliNjFkZGQzLWY2OGMtNTNhZC1hMWEzLTQzNWYyMGZlODdkMjJAdEuJk2oQoeKXkBT9aG0O5KLcXmLIlE9MkMzPuxJEOO9tD3Yag38jFYrHGGfBv4huG1tJoKyaEk6X1erd8qilFToBMUINLnViZXJlYXRzLmNvbQ.DPBE9NmdgLqpTKd1UMlid02Ip-GE1828J5l1NftljAM; smeta={expiresAt:1795886123534}; _ua={"session_id":"09df53d2-ddb3-443e-a09c-e2881d073e6e","session_time_ms":1780334123818}; jwt-session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNsYXRlLWV4cGlyZXMtYXQiOjE3ODAzMzQ0MjM4MTd9LCJpYXQiOjE3ODAzMzQxMjQsImV4cCI6MTc3Nzk4Njk0M30._wVRgRqoZwyXct3ZMmOcBqFh5igO9U8h7ggb6pbZM5k; mp_adec770be288b16d9008c964acfba5c2_mixpanel=%7B%22distinct_id%22%3A%20%229b61ddd3-f68c-53ad-a1a3-435f20fe87d2%22%2C%22%24device_id%22%3A%20%2219dc6dd01a8517-094b1c460f81968-26061e51-1fa400-19dc6dd01a9a7%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fauth.uber.com%2F%22%2C%22%24initial_referring_domain%22%3A%20%22auth.uber.com%22%2C%22%24user_id%22%3A%20%229b61ddd3-f68c-53ad-a1a3-435f20fe87d2%22%7D';

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
console.log('Contains new jwt-session:', line.includes('_wVRgRqoZwyXct3ZMmOcBqF'));
