/* eslint-disable global-require */
import { v1 as neo4j } from 'neo4j-driver';

if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const driver = neo4j.driver(process.env.GRAPHENEDB_BOLT_URL, neo4j.auth.basic(process.env.GRAPHENEDB_BOLT_USER, process.env.GRAPHENEDB_BOLT_PASSWORD));
const graphSession = driver.session();

export default {
	graphSession: graphSession
};
