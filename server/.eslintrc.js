module.exports = {
  env: { node: true, 'cypress/globals': true },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['cypress'],
  globals: {
    isNaN: true,
    // cy: true,
    // Cypress: true,
    // describe: true,
    // xdescribe: true,
    // xit: true,
    // it: true,
    // before: true,
    // expect: true,
    // after: true,
  },
  rules: {
    'no-use-before-define': 0,
    'no-param-reassign': 0,
    'no-underscore-dangle': 0,
    'no-throw-literal': 0,
    'func-names': 0,
  },
};
