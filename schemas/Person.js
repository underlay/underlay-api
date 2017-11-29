/* ----------
This schema is based off of schema.org's Person schema.
https://schema.org/Person
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */

const schema = {
	$id: 'Person',
	$async: true,
	type: 'object',
	additionalProperties: false,
	properties: {
		birthDate: {
			/* Date of birth. */
			type: 'string',
			format: 'date-time',
		},
		affiliation: {
			/* An organization that this person is affiliated with.
			For example, a school/university, a club, or a team.
			This needs to be an array of IDs. A person can have
			more than one organization */
			type: 'string',
			format: 'uuid',
			idExists: { type: 'Organization' }
		}
	},
};

export default schema;
