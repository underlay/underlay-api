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

## Schemas

Every node in an underlay can be described by one or more schemas. The used schemas use schema.org standards as a baseline. Unless otherwise noted, all submitted assertions and attributes must comply with the approved schema.org schemas. A list of functioning schemas in this Underlay are provided below:

- [Thing](/schemas/Thing.js)
	- [Person](/schemas/Person.js)
	- [Organization](/schemas/Organization.js)
	- [Creative Work](/schemas/CreativeWork.js)
