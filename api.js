/* eslint-disable global-require */

if (process.env.PRODUCTION) {
	require('newrelic');
}
require('babel-register');
require('./server.js');
