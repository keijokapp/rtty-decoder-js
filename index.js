#!/usr/bin/node

const http = require('http');
const app = require('./lib/app');

const server = http.createServer(app);

server.on('error', e => {
	console.error('Server error: ', e);
});

server.listen(3000, () => {
	const address = server.address();
	console.log('Listening on %s:%d', address.address, address.port);
});
