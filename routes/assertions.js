/* eslint-disable no-param-reassign */
import Ajv from 'ajv';
import setupAsync from 'ajv-async';
import uuidv4 from 'uuid/v4';
import app from '../server';
import amberizeFile from '../utilities/amberizeFile';

import Thing from '../schemas/Thing';
import Person from '../schemas/Person';
import Organization from '../schemas/Organization';
import CreativeWork from '../schemas/CreativeWork';

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

function amberize(schema, data, parentSchema, currentDataPath, parentData, propertyName) {
	return amberizeFile(parentData[propertyName])
	.then((amberizedUrl)=> {
		parentData[propertyName] = amberizedUrl;
		return true;
	})
	.catch((err)=> {
		console.log('Error Amberizing ', err);
		return false;
	});
}

const ajv = setupAsync(new Ajv({
	allErrors: true,
}));

const schemaSpec = ajv.addKeyword('idExists', {
	async: true,
	validate: checkIdExists
})
.addKeyword('amberize', {
	async: true,
	validate: amberize
})
.addSchema(Thing, 'Thing')
.addSchema(Person, 'Person')
.addSchema(Organization, 'Organization')
.addSchema(CreativeWork, 'CreativeWork');

app.post('/assertions', (req, res)=> {
	if (!req.body.type) {
		return res.status(400).json('Type required');
	}

	console.time('PostAssertions');
	const assertionDate = new Date();
	const assertionData = {
		...req.body,
		identifier: req.body.identifier || uuidv4(),
	};

	delete assertionData.type;

	return schemaSpec.validate(req.body.type, assertionData)
	.then((data)=> {
		console.timeEnd('PostAssertions');
		return res.status(201).json({
			...data,
			type: req.body.type,
			assertionDate: assertionDate,

		});
	})
	.catch((err)=> {
		console.timeEnd('PostAssertions');
		return res.status(400).json(err);
	});
});

/* Post Assertion */
// validate
// Add to sql
// Add to neo4j
// return assertion
