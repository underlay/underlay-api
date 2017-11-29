/* ----------
This schema is based off of schema.org's CreativeWork schema.
https://schema.org/CreativeWork
Additional attributes beyond the schema.org specification
are listed as such

The used schema syntax is defined by JSON Schema: http://json-schema.org/
---------- */

const schema = {
	$id: 'CreativeWork',
	type: 'object',
	additionalProperties: false,
	properties: {
		author: {
			/* The author of this content or rating. Please
			note that author is special in that HTML 5
			provides a special mechanism for indicating authorship
			via the rel tag. That is equivalent to this and may
			be used interchangeably. */
			type: 'string',
			format: 'uuid',
			idExists: { type: ['Organization', 'Person'] }
		},
		datePublished: {
			/* Date of first broadcast/publication. */
			type: 'string',
			format: 'date-time',
		},
		fileFormat: {
			/* Media type, typically MIME format (see IANA site)
			of the content e.g. application/zip of a SoftwareApplication
			binary. In cases where a CreativeWork has several media type
			representations, 'encoding' can be used to indicate each
			MediaObject alongside particular fileFormat information. Unregistered
			or niche file formats can be indicated instead via the most appropriate
			URL, e.g. defining Web page or a Wikipedia entry. */
			type: 'string',
		},
		headline: {
			/* Headline of the article. */
			type: 'string',
		},
		headline: {
			/* Keywords or tags used to describe this content. Multiple entries in a keywords list are typically delimited by commas. */
			type: 'string',
		},
		text: {
			/* The textual content of this CreativeWork. */
			type: 'string',
		},
		
		/* ----------------------- */
		/* Non-Schema.org attribute*/
		/* ----------------------- */
		cpcCode: {
			/* The generated CPC code for this CreativeWork. */
			type: 'string',
		},
		
	},
};

export default schema;
