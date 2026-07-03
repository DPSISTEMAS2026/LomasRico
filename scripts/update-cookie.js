const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const content = fs.readFileSync(envPath, 'utf8');

const newCookie = 'cf_clearance=YOUR_CF_CLEARANCE_COOKIE; sid=YOUR_SID_COOKIE; jwt-session=YOUR_JWT_SESSION_COOKIE;';

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
