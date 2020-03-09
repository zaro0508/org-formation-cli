import { S3, SharedIniFileCredentials } from 'aws-sdk';
import { unlinkSync } from 'fs';
import { v4 } from 'uuid';
import { InitOrganizationCommand } from '~commands/index';
import { AwsUtil } from '../../src/aws-util';
import { IIntegrationTestContext, baseBeforeAll, baseAfterAll } from './base-integration-test';

jest.setTimeout(99999999);

const profileForTests = 'org-formation-test-v2'

describe('when calling org-formation init', () => {
    let context: IIntegrationTestContext;
    const templatePath = `./test/integration-tests/temp/${v4()}.yml`;

    beforeAll(async () => {
        context = await baseBeforeAll();
        const command = {stateBucketName: context.stateBucketName, stateObject: 'state.json', profile: profileForTests, verbose: true, region: 'eu-west-1' };

        await InitOrganizationCommand.Perform({...command, file: templatePath})
    });

    test('creates bucket in the right region', async () => {
        const response = await context.s3client.getBucketLocation({Bucket: context.stateBucketName}).promise();
        expect(response.LocationConstraint).toBe('eu-west-1');
    });

    test('creates encrypted bucket', async () => {
        const response = await context.s3client.getBucketEncryption({Bucket: context.stateBucketName}).promise();
        expect(response.ServerSideEncryptionConfiguration).toBeDefined();
    });

    test('creates bucket with public access block ', async () => {
        const response = await context.s3client.getPublicAccessBlock({Bucket: context.stateBucketName}).promise();
        expect(response.PublicAccessBlockConfiguration).toBeDefined();
        expect(response.PublicAccessBlockConfiguration.BlockPublicAcls).toBe(true);
        expect(response.PublicAccessBlockConfiguration.BlockPublicPolicy).toBe(true);
        expect(response.PublicAccessBlockConfiguration.IgnorePublicAcls).toBe(true);
        expect(response.PublicAccessBlockConfiguration.RestrictPublicBuckets).toBe(true);
    });

    test('creates state file within bucket ', async () => {
        const response = await context.s3client.getObject({Bucket: context.stateBucketName, Key: 'state.json'}).promise();
        expect(response.Body).toBeDefined();
        const state = JSON.parse(response.Body.toString());
        expect(state.masterAccountId).toBeDefined();
    });

    afterAll(async () => {
        await baseAfterAll(context);
        unlinkSync(templatePath);
    });
});
