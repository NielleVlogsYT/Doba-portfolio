/**
 * Login API - Sets auth cookie on successful password verification
 * POST /api/login { password }
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { password } = req.body;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    if (!expectedHash) {
        return res.status(500).json({ error: 'Auth not configured' });
    }

    // Verify password using pepper (same as middleware)
    const pepper = process.env.ADMIN_PASSWORD_PEPPER || 'default-pepper-change-me';
    const encoder = new TextEncoder();
    const data = encoder.encode(password + pepper);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedHash !== expectedHash) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    // Set HTTP-only secure cookie (stores the hash as proof of auth)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = `admin_auth=${expectedHash}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}${isProduction ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieOptions);

    return res.status(200).json({ success: true, redirect: '/admin' });
}