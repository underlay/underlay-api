/* ----------
This schema is based off of schema.org's Thing schema.
https://schema.org/Thing
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */
const schemaName = 'Thing';
const cypherLabels = `:${schemaName}`;

const properties = {
	alternateName: {
		/* An alias for the item. */
		type: 'string'
	},
	description: {
		/* A description of the item. */
		type: 'string'
	},
	disambiguatingDescription: {
		/* A sub property of description. A short description
		of the item used to disambiguate from other, similar items.
		Information from other properties (in particular, name) may
		be necessary for the description to be useful for
		disambiguation. */
		type: 'string'
	},
	identifier: {
		/* Unique, immutable identifier for a node. Conforms to UUID spec. */
		type: 'string',
		format: 'uuid',
		identifierIsValid: { type: ['Thing'] }
	},
	image: {
		/* An image of the item. */
		type: 'string',
		format: 'url',
		amberize: true,
	},
	name: {
		/* The name of the item. */
		type: 'string',
	},
	removed: {
		/* Whether the item is marked as removed. Used as
		an alternative to deleting nodes */
		type: 'boolean',
	},
	url: {
		/* URL of the item. */
		type: 'string',
		format: 'url',
	},
};

export default {
	schemaName,
	cypherLabels,
	properties
};
