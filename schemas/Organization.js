/* ----------
This schema is based off of schema.org's Organization schema.
https://schema.org/Organization
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */
import thingData from './Thing';

const schemaName = 'Organization';
const cypherLabels = `${thingData.cypherLabels}:${schemaName}`;

const properties = {
	...thingData.properties,
	foundingDate: {
		/* The date that this organization was founded. */
		type: 'string',
		format: 'date-time',
	},
	legalName: {
		/* The official name of the organization, e.g. the registered company name. */
		type: 'string',
	},
};

export default {
	schemaName,
	cypherLabels,
	properties
};
