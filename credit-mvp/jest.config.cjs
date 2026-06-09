module.exports = {
  testEnvironment: 'jsdom',

  collectCoverage: true,

  collectCoverageFrom: [
    'src/services/**/*.js'
  ],

  coverageDirectory: 'coverage'
};