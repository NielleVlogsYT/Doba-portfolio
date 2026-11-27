/**
 * Logout API - Clears auth cookie
 * POST /api/logout
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Clear cookie
    res.setHeader('Set-Cookie', 'admin_auth=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');

    return res.status(200).json({ success: true, redirect: '/' });
}