/* ----------
This schema is based off of schema.org's Person schema.
https://schema.org/Person
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */
import { properties as thingProperties } from './Thing';

export const properties = {
	...thingProperties,
	birthDate: {
		/* Date of birth. */
		type: 'string',
		format: 'date-time',
	},
	affiliation: {
		/* An organization that this person is affiliated with.
		For example, a school/university, a club, or a team. */
		type: 'array',
		uniqueItems: true,
		items: {
			// type: 'string',
			type: ['string', 'object'],
			identifierIsValid: { type: 'Organization' }
		}
	}
};

const schema = {
	$id: 'Person',
	$async: true,
	type: 'object',
	additionalProperties: false,
	properties: properties,
	// TODO: Is there a way to programattically import the thing at top and generate the label here?
	cypherLabels: ':Thing:Person',
};

export default schema;
