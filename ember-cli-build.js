/* global require, module */
var EmberApp = require('ember-cli/lib/broccoli/ember-app');
var Funnel = require('broccoli-funnel');

module.exports = function(defaults) {
  var app = new EmberApp(defaults, {
    // Add options here
  });

  const env = process.env.EMBER_ENV;

  if (env === 'test' || env === 'development') {
    app.import('bower_components/pure/pure.css');
    app.import('bower_components/font-awesome/css/font-awesome.css');
    
    var extraAssets = new Funnel('bower_components/font-awesome', {
      srcDir: '/',
      include: ['fonts/*'],
      destDir: '/'
    });

    return app.toTree(extraAssets);
  }

  return app.toTree();
};
