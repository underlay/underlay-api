/* eslint-disable global-require */
import amqplib from 'amqplib';

if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const queueName = 'assertionQueue';
let openChannel;
amqplib.connect(process.env.CLOUDAMQP_URL).then((conn)=> {
	return conn.createChannel().then((channel)=> {
		return channel.assertQueue(queueName, { durable: true })
		.then(()=> {
			openChannel = channel;
		});
	});
});
const addMessage = (message)=> {
	return openChannel.sendToQueue(queueName, Buffer.from(message), { deliveryMode: true });
};

export default {
	addMessage: addMessage
};
