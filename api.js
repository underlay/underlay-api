/* eslint-disable global-require */
if (process.env.PRODUCTION) {
	require('newrelic');
}
require('babel-register');
const throng = require('throng');

throng({
	workers: process.env.WEB_CONCURRENCY || 1,
	lifetime: Infinity,
}, ()=> {
	require('./server.js');
});

