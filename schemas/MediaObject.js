/* ----------
This schema is based off of schema.org's MediaObject schema.
https://schema.org/MediaObject
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */
import creativeWorkData from './CreativeWork';

// TODO: Test mediaObject with some creative works.

const schemaName = 'MediaObject';
const cypherLabels = `${creativeWorkData.cypherLabels}:${schemaName}`;

const properties = {
	...creativeWorkData.properties,
	contentUrl: {
		/* Actual bytes of the media object, for example the image file or video file. */
		type: 'string',
		format: 'url',
		amberize: true,
	},
};

export default {
	schemaName,
	cypherLabels,
	properties
};
