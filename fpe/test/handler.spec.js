import { handler } from '../src/index.mjs';
import { expect } from 'chai';

describe('Handler Tests', () => {

    it('should return 400 for missing projectId', async () => {
        const event = {
            queryStringParameters: {
                designId: '12345',
            },
        };

        const response = await handler(event);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).error).to.equal('Missing projectId');
    });

    it('should return 400 for missing designId', async () => {
        const event = {
            queryStringParameters: {
                projectId: '12345',
            },
        };

        const response = await handler(event);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).error).to.equal('Missing designId');
    });

    it('should return 200 for valid projectId and designId', async () => {
        const event = {
            queryStringParameters: {
                projectId: '61301631',
                designId: '115981800',
            },
        };

        const response = await handler(event);
        expect(response.statusCode).to.equal(200);
        const body = JSON.parse(response.body);
        expect(body).to.have.property('walls');
    });
});