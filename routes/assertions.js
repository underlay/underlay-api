import Promise from 'bluebird';
import uuidv4 from 'uuid/v4';
import app from '../server';
import { addMessage } from '../messageQueue';

/* This is just used for debugging locally */
app.post('/completed', (req, res)=> {
	console.log(JSON.stringify(req.body, null, 2));
	return res.status(201).json('Webhook recieved data');
});

app.post('/assertions', (req, res)=> {
	console.time('assertionRoute');
	const authentication = req.body.authentication;
	const assertions = req.body.assertions;
	const webhookUri = req.body.webhookUri;
	const assertionDate = new Date();
	const requestId = uuidv4();

	if (!authentication) {
		return res.status(400).json('Authentication required');
	}
	if (!assertions) {
		return res.status(400).json('Assertions array required');
	}

	/* Perform Authentication */

	/* If authenticated, add to message queue */
	return new Promise((resolve, reject)=> {
		const messageData = {
			assertions: assertions,
			assertionDate: assertionDate,
			webhookUri: webhookUri,
			requestId: requestId
		};
		const messageAdded = addMessage(JSON.stringify(messageData));
		if (!messageAdded) { reject('Failed to Add Message'); }
		resolve();
	})
	.then(()=> {
		return res.status(202).json({
			requestId: requestId,
		});
	})
	.catch((err)=> {
		console.log('Error processing assertion request', err);
		return res.status(500).json(err);
	})
	.finally(()=> {
		console.timeEnd('assertionRoute');
	});
});
