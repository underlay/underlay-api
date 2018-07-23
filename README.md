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
- A GET route that allows one to query or download valid and accepted Assertions sent to the particular underlay.
- A POST route that accepts Assertions.
	- The request sent to this route must contain three things: 1) authentication data, 2) an array with one or more assertions, 3) a webhook URI. See [Example POST body](#example-post-body).
	- The authentication is used to authenticate the request. If authentication fails, a 401 Unauthorized is returned. If authentication succeeds, the array of assertions are staged for processing (through a task queue, or other architecture as determined by the underlay provider).
	- Processing requires:
		- Validating that the properties and relations provided are valid under the provided schema type.
		- Validing that the identifier (if provided) does indeed exist.
		- Fetching foreign assets, storing/caching the content contained locally, and replacing any foreign asset URLs with a locally controlled URL. For example, a submitted image, `http://www.untrustedsite.com/image.jpg` would be scraped, stored, and returned as `https://my-underlay-data.com/hashedfile.jpg`. We call this process 'amberization'.
	- Processing an assertion can take a long time (>500ms). For this reason, the route is expected to be asynchronous. The route, upon receiving the request, authenticating, and staging assertions for processing returns a 202 Accepted with a requestId that will also be returned to the webhook URI.
	- If processing finishes successfuly, a POST request is sent to the provided webhook URI. The POST request contains four keys (see [Example Webhook body](#example-webhook-body)):
		- requestId: uuid matching the requestId provided in response to the intial request.
		- status: Either 'success' or 'failed'.
		- error: If failed, the reason for failure, otherwise null.
		- assertions: If successful, the list of amberized, timestamped, and identified assertions. Otherwise null.

### Example POST body
The following is a sample post:
```javascript
{
	authentication: {
		user: 'my-username',
		key: 'my-api-key-12341234',
	},
	assertions: [{
		type: 'Person',
		name: 'Arnold Schwarzenegger',
		image: 'https://my-images.com/arnold'
	}],
	webhookUri: 'https://api.my-service.com/assertionRequestComplete'
}
```
which would return a 202 Accepted with the following body:
```javascript
{
	requestId: '33fe5817-d22f-2256-a95d-67b910527ca8'
}
```

### Example Webhook body
The following is a sample body POSTed to the provided webhook URI:
```javascript
{
	requestId: '33fe5817-d22f-2256-a95d-67b910527ca8',
	status: 'success',
	error: null,
	assertions: [{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		name: 'Arnold Schwarzenegger',
		image: 'https://underlaycdn.net/asndu1/sdjd831.jpg',
		assertionDate: '2017-11-29T14:45:48+00:00'
	}]
}
```

## Assertions
Assertions are submitted as an array of JSON values. A single assertion must include a `type`. Valid types are listed below in the Schemas section. Assertions are used to create nodes within a graph. These nodes can have multiple schemas and the attributes associated with such schemas. A node must be created as a single schema. Once you have an identifier for a given node, you can specify additional schemas. 

An underlay is expected to maintain a full list of all processed assertions (i.e. amberized, with ids and assertionDates).

**New Node**
Every assertion must be of only a single type. Note, the type we are using, `Person` inherits the attributes of `Thing`. The attributes listed in the following assertion are `Thing` attributes even though we specify a type of `Person`. This is because of the inheritance of attributes. 
```javascript
[
	{
		type: 'Person',
		name: 'Arnold Schwarzenegger',
	}
]
```
This would return the following confirmed assertion:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		name: 'Arnold Schwarzenegger',
		assertionDate: '2017-11-29T14:45:48+00:00'
	}
]
```

**Update existing node**
To update an existing node, provide the existing node's identifier. If an identifier is provided that does not match an existing node, an error will be thrown.
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		familyName: 'Schwarzenegger',
	}
]
```
This would return the following confirmed assertion:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		familyName: 'Schwarzenegger',
		assertionDate: '2017-11-29T14:45:48+00:00'
	}
]
```
Note, that because we are updating an existing node, and we perform no amberization, the only difference is an added assertionDate.

**Assertions with foreign assets**
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Thing',
		image: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Arnold_Schwarzenegger_February_2015.jpg',
	}
]
```
This would return the following confirmed assertion:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Thing',
		image: 'https://underlaycdn.net/asndu1/sdjd831.jpg',
		assertionDate: '2017-11-29T14:45:48+00:00'
	}
]
```
Foreign assets (e.g. images, files, etc) are copied to locally controlled file storage and the assertion is updated with this local asset URL. We call this process 'amberization'. 

### Relations
Some attributes within a given node schema are best represented by a relation. For example, birthPlace. If the following assertions have been issued:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		name: 'Arnold Schwarzenegger',
		birthDate: '1947-07-30T00:00:00+00:00',
		assertionDate: '2017-11-29T14:45:48+00:00'
	},
	{
		identifier: '225b5817-dfaf-4816-b93b-22b910528dy7',
		type: 'Thing',
		name: 'Austria',
		assertionDate: '2017-11-29T14:45:48+00:00'
	},
]
```
we can issue an assertion as follows:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		birthPlace: '225b5817-dfaf-4816-b93b-22b910528dy7'
	}
]
```
which would return:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		birthPlace: '225b5817-dfaf-4816-b93b-22b910528dy7',
		assertionDate: '2017-11-30T14:45:48+00:00'
	}
]
```

### Relationship Attributes
Relationships can themselves have attributes. If instead of a uuid string, an object is provided, the key:value pairs of that object will be assigned to the resulting relationship. This object must have at least an `identifier` key. The following result in identical behavior.
```javascript
{
	identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
	type: 'Person',
	birthPlace: '225b5817-dfaf-4816-b93b-22b910528dy7',
}
<!-- is the same as -->
{
	identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
	type: 'Person',
	birthPlace: {
		identifier: '225b5817-dfaf-4816-b93b-22b910528dy7'
	}
}
```
Currently, the only allowed property is `removed`. The `remove` property is used in place of deleting a relationship (just as it is for nodes).

To remove a relationship, the following assertion could be submitted:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		birthPlace: {
			identifier: '225b5817-dfaf-4816-b93b-22b910528dy7',
			removed: true
		}
	}
]
```
which would return:
```javascript
[
	{
		identifier: 'fc5b5817-dfff-4856-a93d-67b910528ecf',
		type: 'Person',
		birthPlace: {
			identifier: '225b5817-dfaf-4816-b93b-22b910528dy7',
			removed: true
		}
		assertionDate: '2017-11-30T16:45:48+00:00'
	}
]
```

#### Question about creating relationships to new objects
I'm not sure the best way to handle the simultaneous creation of a node and a relationship. Say for example you want to create an entry for a book, a `CreativeWork`. You also at the same time want to upload a PDF of the book as a `MediaObject`. Finally, you want the `CreativeWork` to use the `associatedMedia` attribute to point to this new `MediaObject`. Because we check for existence of uuids on relation creation, we can't create the relation before the object. Do we handle this as the underlay? Or do we simply encourage people to file multiple assertions? One assertion to create the two objects, and another that uses the returned ids to create the relation. 

I can see why this would be cumbersome for a server to keep track of these ids. But the alternative is that we internally keep track of them. Ideas welcome.

## Schemas

Every node in an underlay can be described by one or more schemas. The used schemas use schema.org standards as a baseline. Unless otherwise noted, all submitted assertions and attributes must comply with the approved schema.org schemas. A list of functioning schemas in this Underlay are provided below:

- [Thing](/schemas/Thing.js)
	- [Person](/schemas/Person.js)
	- [Organization](/schemas/Organization.js)
	- [Creative Work](/schemas/CreativeWork.js)
		- [Media Object](/schemas/MediaObject.js)


# Future assertion model, using N-Quads
We are moving to a new model that stores provenance alongside each assertion.

## Assertions 

An unsigned assertion is a JSON-LD graph of the following form:
```{
  "@context": "https://w3id.org/security#",
  "@graph": [
    {"/": "..."}, {"/": "..."}, ...
  ]
}'''
  
A signed assertion would have the form:
  ```{
  "@context": "https://w3id.org/security#",
  "@graph": [
    {"/": "..."}, {"/": "..."}, ...
  ]
  "signature": {
    "@type": "GraphSignature2012",
    "creator": "...",
    "signatureValue": "..."
  }
}```

So the value of `@graph` is an array of objects that have just one key (`"/"`) with a string value of the CID (~= self-describing hash https://github.com/ipld/cid) of another JSON-LD graph. By convention, *the first element `["@graph"][0]` is your “lowest-level” “payload” data*, and *every subsequent element describes the previous element’s provenance.*

This object `{"/": "..."}` is what Protocol are using as an “IPLD link”, which basically means that it’s what all their resolvers interpret as an external link to the outside IPLD world. So given the hash of an assertion, you could ask IPLD for “<hash>/@graph/0/foo” to get the `foo` property of the first element’s graph directly, wherever it happens to be.
The remaining properties of the assertion object describe a signature (such as `GraphSignature`) as proposed in https://web-payments.org/vocabs/security.  These are nice because they describe how the signature gets inlined inside the data it’s signing, have a spec on how to generate and verify them, and are super extensible w/r/t algorithms. (`GraphSignature` in particular is supposed to canonicalize the graph before signing, so even different reorganizations of the same data would produce the same signature. Not a huge feature for us but kinda cool).
So *tl;dr* is that an assertion is a JSON-LD “signature” object, as defined by a W3C community report, where the only property that gets signed is a single `@graph` array of IPLD links to other JSON-LD graphs, in ascending level of self-reference.

''Why "IPLD Links"'':
- keeps the signature and assertion small
- we get deduplication for free if you want to update provenance

''Why the W3C Security report for signatures'':
- a close existing standard, w/spec and conforming JS implementation @ https://github.com/digitalbazaar/jsonld-signatures
- Lets us bring our own signature algorithms (e.g. can re-use the secp256k1 functions built-in to every IPFS node)
- Includes time (signature-time)

