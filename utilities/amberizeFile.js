import crypto from 'crypto';
import request from 'request';

const AWS = require('aws-sdk');

AWS.config.region = 'us-east-1';
const s3bucket = new AWS.S3({ params: { Bucket: 'www.underlaycdn.net' } });

export default function amberizeFIle(fileUrl) {
	const extension = fileUrl.split('.').pop();
	const folderName = process.env.IS_PRODUCTION_API === 'true'
		? crypto.randomBytes(4).toString('hex') // Produces 8 random characters
		: '_testing';
	const filename = `${crypto.randomBytes(4).toString('hex')}.${extension}`;
	const pathname = `${folderName}/${filename}`;

	return new Promise((resolve, reject)=> {
		request({
			uri: fileUrl,
			encoding: null
		}, (error, response, body)=> {
			if (error || response.statusCode !== 200) {
				console.log('failed to get image');
				console.log(error);
			} else {
				s3bucket.putObject({
					Body: body,
					Key: pathname,
					ACL: 'public-read',
					ContentType: response.headers['content-type'],
				}, (s3error)=> {
					if (error) {
						console.log('error downloading image to s3', s3error);
						reject('Error downloading file to s3');
					} else {
						resolve(`https://www.underlaycdn.net/${pathname}`);
					}
				});
			}
		});
	});
}
