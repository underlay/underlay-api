/* eslint-disable global-require */
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';

/* -------------------------------- */
/* Initialize development variables */
/* -------------------------------- */
if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}
/* -------------------------------- */
/* -------------------------------- */

const app = express();
export default app;
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());


// Catch the browser's favicon request. You can still
// specify one as long as it doesn't have this exact name and path.
app.get('/favicon.ico', (req, res)=> {
	res.writeHead(200, { 'Content-Type': 'image/x-icon' });
	res.end();
});

// Handle errors.
app.use((err, req, res, next)=> {
	console.log(`Error!  ${err}`);
	next();
});

/* ------------------- */
/* API Endpoints */
/* ------------------- */
require('./routes/assertions.js');

/* ------------------- */
/* ------------------- */

const port = process.env.PORT || 9876;
app.listen(port, (err) => {
	if (err) { console.error(err); }
	console.info('----\n==> 🌎  API is running on port %s', port);
	console.info('==> 💻  Send requests to http://localhost:%s', port);
});
