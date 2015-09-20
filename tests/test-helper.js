import resolver from './helpers/resolver';
import { setResolver } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

setResolver(resolver);

let ReporterComponent = Ember.Component.extend({
  classNames: 'better-ember-reporter',
  classNameBindings: ['hidePassed:hidePassed'],
  runner: null,
  incSuite: 0,
  incTest: 0,
  hidePassed: false,

  layout: hbs`
    <header>
      <form class="item left">
        <div class="item left">
          <input class="hide-passed-box" type="checkbox" /> Hide Passed
        </div>
      </form>
    </header>
    <div class="container">
      <div class="suite accordion">
        {{#each suites as |suite|}}
            <div class="title {{suite.state}} {{suite.expandState}}">{{suite.title}}</div>
            <div class="content {{suite.state}} {{suite.expandState}}">
              <div class="accordion test">
                {{#each suite.betterTests as |test|}}
                  <div class="title {{test.state}} {{test.expandState}}">{{test.title}}</div>
                  <div class="content {{test.state}} {{test.expandState}}">
                    <pre>{{{test.funcString}}}</pre>
                    {{#if test.err}}
                      <pre>{{test.err.message}}</pre>
                    {{/if}}
                  </div>
                {{/each}}
              </div>
            </div>
        {{/each}}
      </div>
    </div>
  `,

  assertInit: Ember.on('init', function () {
    Ember.assert('`runner` must be defined', this.get('runner'));
    this.set('suites', Ember.A());
  }),

  getUrlParams: function () {
    let match;
    const pl = /\+/g;
    const search = /([^&=]+)=?([^&]*)/g;
    const decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
    const query = window.location.search.substring(1);
    const urlParams = {};

    while (match = search.exec(query)) {
      urlParams[decode(match[1])] = decode(match[2]);
    }

    return urlParams;
  },

  initForm: function () {
    const params = this.getUrlParams();

    this.$('form').change(() => {
      this.navigateForNewParams();
    });

    this.$('.hide-passed-box').change(() => {
      Ember.run(() => {
        if (this.$('.hide-passed-box')[0].checked) {
          this.set('hidePassed', true);
        } else {
          this.set('hidePassed', false);
        }
      });
    });

    if ($.type(params.hidepassed) === 'string') {
      this.$('.hide-passed-box').prop('checked', true);

      Ember.run(() => {
        this.set('hidePassed', true);
      });
    }
  },

  navigateForNewParams: function () {
    let params = {};

    if (this.get('hidePassed')) {
      params.hidepassed = true;
    }

    let url = '/tests?' + Ember.$.param(params);

    if (window.history && window.history.pushState) {
      window.history.pushState(null, null, url);
    } else {
      window.location = url;
    }
  },

  initAccordions: Ember.on('didInsertElement', function () {
    Ember.$(document).on('click', '.better-ember-reporter .accordion .title', function () {
      let el = Ember.$(this);
      el.toggleClass('active');
      el.next().toggleClass('active');
    });
  }),

  attachReporter: Ember.on('init', function () {
    const self = this;
    const runner = this.get('runner');
    runner.on('start', function () { self.send('start'); });
    runner.on('suite', function (suite) { self.send('suite', suite); });
    runner.on('test end', function () { self.send('testEnd'); });
    runner.on('pass', function (test) { self.send('pass', test); });
    runner.on('fail', function (test, err) { self.send('fail', test, err); });
    runner.on('end', function () { self.send('end', arguments); });
    runner.on('pending', function () { self.send('pending', arguments); });
  }),

  normalizeSrc: function (src) {
    let lines = src.split('\n');
    let s = lines[lines.length - 1].length - lines[lines.length - 1].trim().length;

    for (let i = 0; i < s; ++i) {
      lines[0] = ' ' + lines[0];
    }

    return lines.join('\n');
  },

  actions: {
    suite: function (suite) {
      if (suite.root) {
        return;
      }

      Ember.run(() => {
        let lastSuite = this.get('lastSuite');

        if (lastSuite) {
          // look for a test failure
          let failed = false;

          for (let i = 0; i < lastSuite.tests.length; ++i) {
            if (lastSuite.tests[i].state === 'failed') {
              failed = true;
              break;
            }
          }

          if (!failed) {
            lastSuite.set('state', 'passed');
            lastSuite.set('expandState', '');
          } else {
            lastSuite.set('state', 'failed');
          }
        }

        suite.expandState = 'active';
        suite._betterID = this.get('incSuite');
        let objSuite = Ember.Object.create(suite);
        objSuite.set('betterTests', []);
        this.get('suites').pushObject(objSuite);
        this.incrementProperty('incSuite');
        this.set('lastSuite', objSuite);
      });
    },

    testEnd: function () {
      // TODO console.log('test end', arguments);
    },

    pass: function (test) {
      Ember.run(() => {
        test.pass = true;
        this.send('testFinished', test);
      });
    },

    fail: function (test, err) {
      Ember.run(() => {
        test.fail = true;
        test.err = err;
        this.send('testFinished', test);
      });
    },

    testFinished: function (test) {
      let suite = this.get('suites').objectAt(test.parent._betterID);
      test.funcString = this.normalizeSrc(test.fn.toString());
      test.expandState = test.fail ? 'active' : '';
      suite.get('betterTests').pushObject(Ember.Object.create(test));
      this.incrementProperty('incTest');
    },

    start: function () {
      this.initForm();
    },

    end: function () {
      // TODO
      // console.log('it ended');
    },

    pending: function () {
      console.log('pending');
    }
  }
});

function Reporter(runner) {
  Ember.run(() => {
    this.app = ReporterComponent.create({
      runner: runner
    }).append();
  });
}

mocha.reporter(Reporter);
