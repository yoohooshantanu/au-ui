import { handler } from './build/handler.js';

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
