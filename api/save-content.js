/**
 * Vercel Serverless Function: Save content to GitHub
 * 
 * Environment Variables Required:
 * - GITHUB_TOKEN: Personal Access Token with repo scope
 * - GITHUB_REPO: Owner/repo (e.g., "niellevlogsyt/Doba-portfolio")
 * - GITHUB_BRANCH: Branch to commit to (default: "main")
 * - GITHUB_FILE_PATH: Path to content.json in repo (default: "content.json")
 * 
 * Deploy to Vercel: vercel deploy
 * Set env vars in Vercel dashboard: Settings > Environment Variables
 */

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth is handled by Vercel Edge Middleware (middleware.ts)
    // which protects /api/save-content route

    try {
        const content = req.body;

        // Validate required fields
        if (!content || !content.site || !content.projects) {
            return res.status(400).json({ error: 'Invalid content structure' });
        }

        // Get env vars
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO;
        const branch = process.env.GITHUB_BRANCH || 'main';
        const filePath = process.env.GITHUB_FILE_PATH || 'content.json';

        if (!token || !repo) {
            console.error('Missing GitHub env vars');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Get current file SHA
        const getFileRes = await fetch(
            `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Doba-Portfolio-Admin'
                }
            }
        );

        let sha = null;
        if (getFileRes.ok) {
            const fileData = await getFileRes.json();
            sha = fileData.sha;
        }

        // Prepare commit
        const message = `chore: update site content via admin panel`;
        const contentBase64 = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

        const commitBody = {
            message,
            content: contentBase64,
            branch,
            ...(sha && { sha })
        };

        const commitRes = await fetch(
            `https://api.github.com/repos/${repo}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Doba-Portfolio-Admin'
                },
                body: JSON.stringify(commitBody)
            }
        );

        if (!commitRes.ok) {
            const error = await commitRes.json();
            console.error('GitHub API error:', error);
            return res.status(500).json({ error: 'Failed to commit to GitHub' });
        }

        const result = await commitRes.json();

        return res.status(200).json({
            success: true,
            commit: result.commit?.sha?.substring(0, 7),
            message: 'Content saved and deployed'
        });

    } catch (err) {
        console.error('Save error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}