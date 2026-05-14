import fs from 'fs';
import path from 'path';

// Hydrate .env manually for SvelteKit Node Adapter
try {
    const envFile = fs.readFileSync(path.resolve('.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.trim().match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].replace(/^["']|["']$/g, '').trim();
            if (!process.env[key]) process.env[key] = val;
        }
    });
} catch (e) {
    console.log("No .env file found or parsed");
}

const { handler } = await import('./build/handler.js');

const port = process.env.PORT || 3000;

// Create a simple server to handle the requests properly
import { createServer } from 'http';

const server = createServer((req, res) => {
    // Add the protocol and host to the request
    req.protocol = 'https';
    req.host = 'disha.amarujaladigital.com';
    
    handler(req, res);
});

server.listen(port, () => {
    console.log(`Listening on ${port}`);
});
