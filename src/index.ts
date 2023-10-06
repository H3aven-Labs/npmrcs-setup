#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import npmLogin from 'npm-cli-login';
import child_process from 'child_process';
import yargs from 'yargs/yargs';
import retry from 'retry';
import { rimrafSync } from 'rimraf';
import { hideBin } from 'yargs/helpers';

const npmrcsCall = (npmrcsDirectory: string) => {
  const command = `NPMRC_STORE=${npmrcsDirectory} NPMRC=.npmrc npx npmrc`;

  try {
    child_process.execSync(command);
  } catch (e) {}
}

const npmrcsCreateProfile = (npmrcsDirectory: string, profile: string) => {
  const command = `NPMRC_STORE=${npmrcsDirectory} NPMRC=.npmrc npx npmrc -c ${profile}`;

  try {
    child_process.execSync(command);
  } catch (e) {}
}

const npmrcsChangeProfile = (npmrcsDirectory: string, profile: string) => {
  const command = `NPMRC_STORE=${npmrcsDirectory} NPMRC=.npmrc npx npmrc ${profile}`;

  try {
    child_process.execSync(command);
  } catch (e) {}
}

const retryGetNpmFile = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const operationOptions = {
      retries: 5,
      factor: 3
    };
    const operation = retry.operation(operationOptions);
      operation.attempt((currentAttempt) => {
        if (! fs.existsSync(path)) {
          operation.retry(new Error('File not exists'));
        } else {
          if (currentAttempt > operationOptions.retries) {
            operation.mainError();
          } else {
            resolve(fs.readFileSync(path).toString());
          }
        }
      });
  });
}

(async() => {
  const argv: any = yargs(hideBin(process.argv)).argv

  if (! argv.token) {
    throw new Error('Token is required');
  }
  const token = argv.token;

  if (! argv.scope) {
    throw new Error('Scope is required');
  }
  const scope = argv.scope;

  if (! argv.registry) {
    throw new Error('Registry is required');
  }
  const registry = argv.registry;

  const localUsername = argv.localUsername || 'verdaccio';
  const localPassword = argv.localPassword || 'verdaccio';
  const localEmail = argv.localEmail || 'test@verdaccio.com';
  const localRegistry = argv.localRegistry || 'http://127.0.0.1:4873';

  const npmrcsDirectory = '.npmrcs';

  if (fs.existsSync(npmrcsDirectory)) {
    rimrafSync(npmrcsDirectory);
  }

  if (fs.existsSync('.npmrc')) {
    fs.rmSync('.npmrc');
  }
  npmrcsCall(npmrcsDirectory);
  npmrcsCreateProfile(npmrcsDirectory, 'local');

  const gitignorePath = '.gitignore';

  if (!/\.npmrcs/.test(fs.readFileSync(gitignorePath, 'utf8'))) {
    fs.appendFileSync(gitignorePath, '\n.npmrcs');
  }
  npmLogin(localUsername, localPassword, localEmail, localRegistry, scope, false, '.npmrc_local');

  const npmrcLocal: string = await retryGetNpmFile('.npmrc_local');
  fs.writeFileSync(`${npmrcsDirectory}/local`, npmrcLocal);

  npmrcsChangeProfile(npmrcsDirectory, 'default');

  npmLogin(localUsername, token, localEmail, registry, scope, false, '.npmrc_default');
  const npmrcDefault = await retryGetNpmFile('.npmrc_default');

  fs.writeFileSync(`${npmrcsDirectory}/default`, npmrcDefault);

  rimrafSync('.npmrc_local');
  rimrafSync('.npmrc_default');

  npmrcsChangeProfile(npmrcsDirectory, 'default');
})();
