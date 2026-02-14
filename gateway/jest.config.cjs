'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var readFileSync = require('fs').readFileSync;
// Reading the SWC compilation config for the spec files
var swcJestConfig = JSON.parse(
  readFileSync(''.concat(__dirname, '/.spec.swcrc'), 'utf-8'),
);
// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;
module.exports = {
  displayName: '@focoris/gateway',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
