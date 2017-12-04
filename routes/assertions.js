/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
import Promise from 'bluebird';
import Ajv from 'ajv';
import setupAsync from 'ajv-async';
import uuidv4 from 'uuid/v4';
import app from '../server';
import amberizeFile from '../utilities/amberizeFile';
import { Assertion } from '../sqldb';
import { graphSession } from '../graphdb';
import schemas from '../schemas/index';

function validateIdentifier(schema, data) {
	/* Ensure that a node with the given type and identifier exists */

	/* Regex from https://github.com/epoberezkin/ajv/blob/4d76c6fb813b136b6ec4fe74990bc97233d75dea/lib/compile/formats.js#L18 */
	const uuidRegex = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
	const identifier = typeof data === 'string' ? data : data.identifier;
	const validUUID = uuidRegex.test(identifier);

	if (!validUUID) {
		return new Promise((resolve)=> { resolve(false); });
	}

	return graphSession.run(`MATCH (n:Thing) WHERE n.identifier = "${identifier}" RETURN labels(n)`)
	.then((results)=> {
		/* If no resuls were found, return false */
		if (!results.records.length) { return false; }

		/* If the found node type is not listed as an
		accepteddestinationnode type, return false */
		const labelMatches = results.records[0].get('labels(n)').some((item)=> {
			return schema.type.includes(item);
		});
		if (!labelMatches) { return false; }

		/* If all the checks have passed, return true */
		return true;
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

function generateSetString(itemName, attributesObject) {
	return Object.keys(attributesObject).reduce((prev, curr)=> {
		if (curr === 'type') { return prev; }
		if (curr === 'assertionDate') { return prev; }
		if (curr === 'identifier') { return prev; }
		const commaSpot = prev ? ',' : '';
		return `${prev}${commaSpot} ${itemName}.${curr} = "${attributesObject[curr]}"`;
	}, '');
}

const ajv = setupAsync(new Ajv({
	allErrors: true,
}));

const schemaSpec = ajv.addKeyword('identifierIsValid', {
	async: true,
	validate: validateIdentifier
})
.addKeyword('amberize', {
	async: true,
	validate: amberize
});

/* There is currently a bug that makes this not chainable.
If accepted, we can chain this above. Follow this PR:
https://github.com/epoberezkin/ajv/pull/640
*/
schemaSpec.addSchema(schemas);

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

	/* Create validation calls. Update the assertion to not
	have a type (which is not part of the node schema) */
	const validations = assertions.map((item)=> {
		const nodeData = { ...item };
		delete nodeData.type;
		return schemaSpec.validate(item.type, nodeData);
	});

	return Promise.all(validations)
	.then((data)=> {
		/* Add the type back to the assertions and ensure an identifier is provided
		or created. Add an assertionDate. */
		const results = data.map((item, index)=> {
			return {
				...item,
				type: assertions[index].type,
				identifier: assertions[index].identifier || uuidv4(),
				assertionDate: assertionDate,
			};
		});

		/* Create a bulk cypher statement by iterating over each assertion */
		const cypherStatement = results.reduce((prev, currAssertion, index)=> {
			const schemaDef = schemaSpec._schemas[currAssertion.type].schema;
			const schemaProperties = schemaDef.properties;

			/* Split the assertion attributes into those that will
			create attributes on a node and those that will create
			a relationship */
			const attributes = {};
			const relationships = {};
			Object.keys(currAssertion).forEach((key)=> {
				const item = schemaProperties[key];
				if (item && key !== 'identifier') {
					if (item.identifierIsValid || (item.items && item.items.identifierIsValid)) {
						relationships[key] = currAssertion[key];
					} else {
						attributes[key] = currAssertion[key];
					}
				}
			});

			/* Create the cypher statement that will set all of the attributes to the node */
			const attributeSetString = generateSetString(`item${index}`, attributes);

			/* Create the cypher statement that will set all
			of the relationships defined in the assertion */
			const relationshipSetString = Object.keys(relationships).reduce((prevString, currKey)=> {
				/* Set relationship destination node type. e.g. :Thing:Person */
				// TODO: Can we just always have the destination nodetype be :Thing since we validate the ids earlier?
				// const destinationNodeType = schemaSpec._schemas[schemaProperties[currKey].items.identifierIsValid.type].schema.cypherLabels;
				const destinationNodeType = ':Thing';
				let currString;

				/* If there is an array of uuids, iterate over each to generate set statement
				If there is only one uuid, simply create the set statement */
				if (Array.isArray(relationships[currKey])) {
					currString = relationships[currKey].reduce((prevKeyString, currKeyIdentifier, currKeyIndex)=> {
						/* Generate set string params. e.g. 'item.date = 5, item.name="fish"' */
						const setStringParameters = generateSetString(`r${currKeyIndex}`, currKeyIdentifier);
						/* Generate set string itself. */
						const setString = typeof currKeyIdentifier === 'string' || !setStringParameters
							? ''
							: `SET ${setStringParameters}`;

						/* Get identifier of destination node */
						const toIdentifier = typeof currKeyIdentifier === 'string'
							? currKeyIdentifier
							: currKeyIdentifier.identifier;

						/* Compile setString with identifiers for cypher query */
						return `${prevKeyString}
							${prevKeyString ? 'WITH *' : ''}
							MATCH (from${currKeyIndex}${schemaDef.cypherLabels} { identifier: '${currAssertion.identifier}' }),(to${currKeyIndex}${destinationNodeType} { identifier: '${toIdentifier}' })
							MERGE (from${currKeyIndex})-[r${currKeyIndex}:${currKey}]->(to${currKeyIndex})
							${setString}
						`;
					}, '');
				} else {
					/* Generate set string params. e.g. 'item.date = 5, item.name="fish"' */
					const setStringParameters = generateSetString('r', relationships[currKey]);
					/* Generate set string itself. */
					const setString = typeof relationships[currKey] === 'string' || !setStringParameters
						? ''
						: `SET ${setStringParameters}`;
					currString = `
						MATCH (from${schemaDef.cypherLabels} { identifier: '${currAssertion.identifier}' }),(to${destinationNodeType} { identifier: '${currAssertion[currKey]}' })
						MERGE (from)-[r:${currKey}]->(to)
						${setString}
					`;
				}

				return `${prevString}
					${currString}
				`;
			}, '');

			/* If there is an attributeSetString, generate the full cypher query */
			const attributeMergeString = attributeSetString
				? `MERGE (item${index}${schemaDef.cypherLabels} { identifier: "${currAssertion.identifier}" })
					ON CREATE SET ${attributeSetString}
					ON MATCH SET ${attributeSetString}`
				: '';

			return `${prev}
				${attributeMergeString}
				${attributeSetString && relationshipSetString ? 'WITH *' : ''}
				${relationshipSetString}
			`;
		}, '');

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
		console.log('Error processing assertion', err);
		return res.status(400).json(err);
	});
});
