#!/usr/bin/env node
import { pipeline } from 'stream';
import split from 'split2';
import yargs from 'yargs';
import pinoCloudWatch from '../index';

const argv = yargs(process.argv.slice(2))
  .usage('Sends pino logs to AWS CloudWatch Logs.\nUsage: node index.js | pino-cloudwatch [options]')
  .describe('aws_access_key_id', 'AWS Access Key ID')
  .describe('aws_secret_access_key', 'AWS Secret Access Key')
  .describe('aws_region', 'AWS Region')
  .describe('group', 'AWS CloudWatch log group name')
  .describe('prefix', 'AWS CloudWatch log stream name prefix')
  .describe('stream', 'AWS CloudWatch log stream name, overrides --prefix option')
  .describe('interval', 'The maximum interval (in ms) before flushing the log queue.')
  .describe('stdout', 'Copy stdin to stdout')
  .demandOption('group')
  .default('interval', 1000)
  .default('stdout', false)
  .parseSync();

pipeline(process.stdin, split(), pinoCloudWatch(argv as any), (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
