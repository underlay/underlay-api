/* eslint-disable no-param-reassign */
import Promise from 'bluebird';
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

	console.time('PostAssertions');
	const assertions = req.body;
	const assertionDate = new Date();
	const allHaveType = assertions.reduce((prev, curr)=> {
		if (!curr.type) { return false; }
		return prev;
	}, true);
	if (!allHaveType) {
		return res.status(400).json('Type required');
	}

	const allHaveIdentifier = assertions.reduce((prev, curr)=> {
		/* If there is no identifier, and it is not of type Thing (i.e. a new node),
		return false; */
		if (!curr.identifier && curr.type !== 'Thing') { return false; }
		return prev;
	}, true);
	if (!allHaveIdentifier) {
		return res.status(400).json('Identifier required');
	}

	const validations = assertions.map((item)=> {
		const nodeData = { ...item };
		if (item.type !== 'Thing') {
			delete nodeData.identifier;
		}
		delete nodeData.type;
		return schemaSpec.validate(item.type, nodeData);
	});

	return Promise.all(validations)
	// schemaSpec.validate(req.body.type, assertionData)
	.then((data)=> {
		const results = data.map((item, index)=> {
			return {
				...item,
				type: assertions[index].type,
				identifier: assertions[index].identifier || uuidv4(),
				assertionDate: assertionDate,
			};
		});
		console.timeEnd('PostAssertions');
		return res.status(201).json(results);
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
