# Underlay API

An underlay must provide an API that provides a set of minimum features for issuing assertions. Additional features are left to the providers discretion.

An underlay consists of nodes, attributes, and relations. All nodes, attributes, and relations are created through a set of Assertions.

Assertions are append-only and once issued, can never be revoked.

An assertion can be made to:
1. Create a node,
2. Set attributes,
3. Set relations, or
4. Any combination of the above


## Minimal features
- A POST route that accepts an Assertion.
	- The route must fetch foreign URLs, store/cache the content contained locally, and replace any foreign URLs with a locally controlled URL. For example, a submitted URL, `http://www.untrustedsite.com/image.jpg` would be scraped, stored, and returned as `https://my-underlay-data.com/hashedfile.jpg`. We call this process 'amberization'.
	- The route must verify that the assertion and it associated content are valid schema content.
	- Invalid schema content must return an 400 error.
	- If an Assertion is valid and succesfully amberized, the route should return the amberized assertion (i.e. the original assertion if no amberization is required) as a 201.
- A GET route that allows one to query or download valid and accepted Assertions sent to the particular underlay.

## Schemas

Every node in an underlay can be described by one or more schemas. The used schemas use schema.org standards as a baseline. Unless otherwise noted, all submitted assertions and attributes must comply with the approved schema.org schemas. A list of functioning schemas in this Underlay are provided below:

- [Thing](https://schema.org/Thing)
*Additional Fields:*
UploadedDate: DateTime
	- [Person](https://schema.org/Person)
	- [Organization](https://schema.org/Organization)
	- [Creative Work](https://schema.org/CreativeWork)
		- [Article](https://schema.org/Article)
		*Additional Fields:*
		CPC Code: Text
