/* eslint-disable global-require */
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import Ajv from 'ajv';
import setupAsync from 'ajv-async';

import Thing from './schemas/Thing';
import Person from './schemas/Person';
import Organization from './schemas/Organization';
import CreativeWork from './schemas/CreativeWork';

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
// require('./routes/citations.js'); // Remove this soon.

function checkIdExists(schema, data) {
	// return new Promise((resolve)=> {
	// 	setTimeout(()=> {
	// 		resolve(true);
	// 	}, 0);
	// });
	return true;
	// return knex(schema.table)
	// .select('id')
	// .where('id', data)
	// .then(function (rows) {
	//   return !!rows.length; // true if record is found
	// });
}

const ajv = setupAsync(new Ajv({
	allErrors: true,
}));
ajv.addKeyword('idExists', {
	async: true,
	validate: checkIdExists
});


const schemaSpec = ajv.addSchema(Thing, 'Thing')
.addSchema(Person, 'Person')
.addSchema(Organization, 'Organization')
.addSchema(CreativeWork, 'CreativeWork');

app.get('/hi', (req, res)=> {
	console.time('Process');
	schemaSpec.validate('Thing', {
		identifier: '83bbad53-48e7-4ca9-bbb0-99db3aadef21',
		image: 'http://cat.com',
		name: 'Cat',
	})
	.then((data)=> {
		console.timeEnd('Process');
		return res.status(201).json(data);
	})
	.catch((err)=> {
		console.timeEnd('Process');
		return res.status(400).json(err);
	});

	// if (!valid) console.log(validate.errors);
	// return res.status(201).json({ isValid: valid, errors: schemaSpec.errors });
});

/* ------------------- */
/* ------------------- */

const port = process.env.PORT || 9876;
app.listen(port, (err) => {
	if (err) { console.error(err); }
	console.info('----\n==> 🌎  API is running on port %s', port);
	console.info('==> 💻  Send requests to http://localhost:%s', port);
});
