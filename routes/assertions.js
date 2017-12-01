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
	/* Ensure that a node with the given type and identifier exists */
	return graphSession.run(`MATCH (n:${schema.type}) WHERE n.identifier = "${data}" RETURN n.identifier`)
	.then((results)=> {
		return !!results.records.length;
	})
	.catch((err)=> {
		console.log('Error checking for identifier ', err);
	});
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

	/* Ensure that every assertion has a type value */
	const allHaveType = assertions.reduce((prev, curr)=> {
		if (!curr.type) { return false; }
		return prev;
	}, true);
	/* If not all assertions have a type, return user error */
	if (!allHaveType) {
		return res.status(400).json('Type required');
	}

	/* Create validation calls. Update the assertion to have an
	identifier and to not have a type (which is not part of the node schema) */
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
		/* Add the type back to the assertions. Add an assertionDate. */
		const results = data.map((item, index)=> {
			return {
				...item,
				type: assertions[index].type,
				assertionDate: assertionDate,
			};
		});

		/* Create the bulk cypher statement by iterating over each assertion */
		const cypherStatement = results.reduce((prev, currAssertion, index)=> {
			const schemaDef = schemaSpec._schemas[currAssertion.type].schema;
			const schemaProperties = schemaDef.properties;

			/* Split the assertion attributes into those that will 
			generate attributes on a node and those that will create
			a relationship */
			const attributes = [];
			const relationships = [];
			Object.keys(currAssertion).forEach((key)=> {
				const item = schemaProperties[key];
				if (item && key !== 'identifier') {
					if (item.format === 'uuid' || (item.items && item.items.format === 'uuid')) {
						relationships.push(key);
					}
					attributes.push(key);
				}
			});

			/* Create the cypher statement that will set all of the attributes to the node */
			const attributeSetString = attributes.reduce((prevString, currKey)=> {
				if (currKey === 'type') { return prevString; }
				if (currKey === 'assertionDate') { return prevString; }
				const commaSpot = prevString ? ',' : '';
				return `${prevString}${commaSpot} item${index}.${currKey} = "${currAssertion[currKey]}"`;
			}, '');

			/* Create the cypher statement that will set all of the relationships defined in the assertion */
			const relationshipSetString = relationships.reduce((prevString, currKey)=> {
				const relationshipType = schemaSpec._schemas[schemaProperties[currKey].items.idExists.type].schema.cypherLabels;
				let currString;

				/* If there is only one uuid, simply create the set statement
				If there is an array of uuids, iterate over each to generate set statement */
				if (typeof currAssertion[currKey] === 'string') {
					currString = `
						MATCH (from${schemaDef.cypherLabels} { identifier: '${currAssertion.identifier}' }),(to${relationshipType} { identifier: '${currAssertion[currKey]}' })
						MERGE (from)-[r:${currKey}]->(to)
					`;
				} else {
					currString = currAssertion[currKey].reduce((prevKeyString, currKeyIdentifier, currKeyIndex)=> {
						return `${prevKeyString}
							${prevKeyString ? 'WITH *' : ''}
							MATCH (from${currKeyIndex}${schemaDef.cypherLabels} { identifier: '${currAssertion.identifier}' }),(to${currKeyIndex}${relationshipType} { identifier: '${currKeyIdentifier}' })
							MERGE (from${currKeyIndex})-[r${currKeyIndex}:${currKey}]->(to${currKeyIndex})
						`;
					}, '');
				}

				return `${prevString}
					${currString}
				`;
			}, '');

			return `${prev}
				MERGE (item${index}${schemaDef.cypherLabels} { identifier: "${currAssertion.identifier}" })
				ON CREATE SET ${attributeSetString}
				ON MATCH SET ${attributeSetString}
				${relationshipSetString ? 'WITH *' : ''}
				${relationshipSetString}
			`;
		}, '');
		// TODO: We don't have a clean way of deleting relationships (or at least marking them inactive)
		// TODO: What if somebody submits an assertion providing their own identifier. 
		// At the moment, we'll just take it and create - but do we want to allow people 
		// to submit their own uuids?

		/* Return the results and run the cypher statement to update the graph db */
		return Promise.all([results, graphSession.run(cypherStatement)]);
	})
	.then(([results])=> {
		/* Add the processed assertions to the SQL list of assertions */
		const sequelizeObjects = results.map((item)=> {
			return {
				assertion: item,
				nodeId: item.identifier,
				nodeType: item.type,
				createdAt: assertionDate,
				modifiedAt: assertionDate,
			};
		});
		return Promise.all([results, Assertion.bulkCreate(sequelizeObjects)]);
	})
	.then(([results])=> {
		console.timeEnd('PostAssertions');
		/* Return the processed assertions with a 201 status */
		return res.status(201).json(results);
	})
	.catch((err)=> {
		console.timeEnd('PostAssertions');
		return res.status(400).json(err);
	});
});
