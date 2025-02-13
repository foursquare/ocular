// Launch script for various Node test configurations

// Enables ES2015 import/export in Node.js
const {resolve} = require('path');

// Register module aliases
const moduleAlias = require('module-alias');

const {getOcularConfig} = require('../src/helpers/get-ocular-config');

// Browser test is opt-in by installing @probe.gl/test-utils
let BrowserTestDriver = null;
try {
  BrowserTestDriver = require('@probe.gl/test-utils').BrowserTestDriver;
} catch (error) {
  BrowserTestDriver = null;
}

const ocularConfig = getOcularConfig();

const webpackVersion = ocularConfig.webpack.version;
const webpackConfigPath = ocularConfig.webpack.configPath; // Could we deduce version?
const webpackCommand = webpackVersion === 5 ? 'webpack' : 'webpack-dev-server';

const mode = process.argv.length >= 3 ? process.argv[2] : 'default';

console.log(`Running ${mode} tests...`); // eslint-disable-line

moduleAlias.addAliases(ocularConfig.aliases);

switch (mode) {
  case 'cover':
  case 'node':
    require(resolveEntry('test')); // Run the tests
    break;

  case 'dist':
    const distConfig = getOcularConfig({aliasMode: 'dist'});
    // Load deck.gl itself from the dist folder
    moduleAlias.addAliases(distConfig.aliases);
    require(resolveEntry('test')); // Run the tests
    break;

  case 'bench':
    require(resolveEntry('bench')); // Run the benchmarks
    break;

  case 'browser':
  case 'browser-headless':
    runBrowserTest({
      server: {
        command: webpackCommand,
        arguments:
          webpackVersion === 5
            ? ['serve', '--config', webpackConfigPath, '--env', 'mode=test']
            : ['--config', webpackConfigPath, '--env.mode=test']
      },
      headless: mode === 'browser-headless'
    });
    break;

  case 'bench-browser':
    runBrowserTest({
      server: {
        command: webpackCommand,
        arguments:
          webpackVersion === 5
            ? ['serve', '--config', webpackConfigPath, '--env', 'mode=bench']
            : ['--config', webpackConfigPath, '--env.mode=bench']
      }
    });
    break;

  default:
    if (/\bbrowser\b/.test(mode)) {
      const testMode = mode.replace('-browser', '').replace('-headless', '');
      runBrowserTest({
        server: {
          command: webpackCommand,
          arguments:
            webpackVersion === 5
              ? ['serve', '--config', webpackConfigPath, `--env`, `mode=${testMode}`]
              : ['--config', webpackConfigPath, `--env.mode=${testMode}`]
        },
        headless: /\bheadless\b/.test(mode)
      });
    } else if (mode in ocularConfig.entry) {
      require(resolveEntry(mode));
    } else {
      throw new Error(`Unknown test mode ${mode}`);
    }
}

function resolveEntry(key) {
  return resolve(ocularConfig.entry[key]);
}

function runBrowserTest(opts) {
  if (BrowserTestDriver === null) {
    console.log('@probe.gl/test-utils is not installed, skipping browser test');
    // console.log('\033[93m@probe.gl/test-utils is not installed, skipping browser test\033[0m');
    process.exit(0);
  }
  const userConfig = ocularConfig.browserTest || {};
  const options = Object.assign({}, opts, userConfig, {
    server: Object.assign({}, opts.server, userConfig.server),
    browser: Object.assign({}, opts.browser, userConfig.browser)
  });
  return new BrowserTestDriver().run(options);
}
