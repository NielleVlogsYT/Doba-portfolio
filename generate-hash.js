/**
 * Password Hash Generator
 * Run with: node generate-hash.js "your-password"
 * 
 * Outputs the pepper and hash to add to Vercel Environment Variables
 */

import { randomBytes, createHash } from 'crypto';

const password = process.argv[2];

if (!password) {
    console.error('Usage: node generate-hash.js "your-password"');
    process.exit(1);
}

// Generate a random pepper (16 bytes = 32 hex chars)
const pepper = randomBytes(16).toString('hex');

// Compute hash: SHA256(password + pepper)
const hash = createHash('sha256').update(password + pepper).digest('hex');

console.log('\n===========================================');
console.log('Add these to Vercel Environment Variables:');
console.log('===========================================\n');
console.log(`ADMIN_PASSWORD_PEPPER=${pepper}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log('\n===========================================');
console.log('Test login at: https://your-site.vercel.app/login');
console.log('===========================================\n');