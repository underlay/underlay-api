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

import { Assertion } from '../sqldb';
import { graphSession } from '../graphdb';

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

	const validations = assertions.map((item, index)=> {
		const nodeData = {
			...item,
			identifier: assertions[index].identifier || uuidv4()
		};
		delete nodeData.type;
		return schemaSpec.validate(item.type, nodeData);
	});

	return Promise.all(validations)
	.then((data)=> {
		const results = data.map((item, index)=> {
			return {
				...item,
				type: assertions[index].type,
				assertionDate: assertionDate,
			};
		});
		const sequelizeObjects = results.map((item)=> {
			return {
				assertion: item,
				nodeId: item.identifier,
				createdAt: assertionDate,
				modifiedAt: assertionDate,
			};
		});
		return Promise.all([results, Assertion.bulkCreate(sequelizeObjects)]);
	})
	.then(([results])=> {
		const cypherStatement = results.reduce((prev, curr, index)=> {
			const createString = Object.keys(curr).reduce((prevString, currKey)=> {
				if (currKey === 'type') { return prevString; }
				if (currKey === 'assertionDate') { return prevString; }
				const commaSpot = prevString ? ',' : '';
				return `${prevString}${commaSpot} item${index}.${currKey} = "${curr[currKey]}"`;
			}, '');
			return `${prev}
				MERGE (item${index}${schemaSpec._schemas[curr.type].schema.cypherLabels} { identifier: "${curr.identifier}" })
				ON CREATE SET ${createString}
				ON MATCH SET ${createString}
			`;
		}, '');
		// TODO: We can merge to ensure we create relationships that are unique as well
		// http://neo4j.com/docs/developer-manual/current/cypher/clauses/merge/
		// I'm not quite sure how we identify which assertions strings are relationships. Is that something we should tip off in the schema?
		// If I see a uuid (or array of uuids) that aren't the identifier, do I assume that's a relationship?
		// Do we need to enfore type, or can we just set it to :Thing?

		// console.log(cypherStatement);
		return Promise.all([results, graphSession.run(cypherStatement)]);
	})
	.then(([results])=> {
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
