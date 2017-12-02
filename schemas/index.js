import thingData from './Thing';
import personData from './Person';
import organizationData from './Organization';
import creativeWorkData from './CreativeWork';

function generateSchema(schemaData) {
	return {
		$id: schemaData.schemaName,
		$async: true,
		type: 'object',
		additionalProperties: false,
		properties: schemaData.properties,
		cypherLabels: schemaData.cypherLabels
	};
}

export default [
	generateSchema(thingData),
	generateSchema(personData),
	generateSchema(organizationData),
	generateSchema(creativeWorkData),
];
