/* ----------
This schema is based off of schema.org's Organization schema.
https://schema.org/Organization
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */
import { properties as thingProperties } from './Thing';

export const properties = {
	...thingProperties,
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

const schema = {
	$id: 'Organization',
	type: 'object',
	additionalProperties: false,
	properties: properties,
	cypherLabels: ':Thing:Organization',
};

export default schema;
