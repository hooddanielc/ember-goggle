import resolver from './helpers/resolver';
import { setResolver } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

setResolver(resolver);

let ReporterComponent = Ember.Component.extend({
  classNames: 'better-ember-reporter',
  classNameBindings: ['hidePassed:hidePassed'],
  runner: null,
  suites: null,
  incSuite: 0,
  incTest: 0,
  hidePassed: false,
  grep: '',

  layout: hbs`
    <header>
      <form class="pure-form item left">
        <div class="item left">
          <label for="better-ember-reporter-hidepassed">
            <input id="better-ember-reporter-hidepassed" class="hide-passed-box" type="checkbox" /> Hide Passing
          </label>
        </div>
        <div class="item left">
          <input id="better-ember-reporter-grep" class="grep" type="text" placeholder="Filter by test title" /><button id="better-ember-reporter-grep-button" class="pure-button">Search</button>
        </div>
      </form>
    </header>
    <div class="container">
      <div class="suite accordion">
        {{#each suites as |suite|}}
          <div class="title {{suite.state}} {{suite.expandState}}">
            <i class="fa fa-check"></i>
            <i class="fa fa-close"></i>
            {{suite.title}}
            <i class="fa fa-caret-right"></i>
            <i class="fa fa-caret-down"></i>
          </div>
          <div class="content {{suite.state}} {{suite.expandState}}">
            <div class="accordion test">
              {{#each suite.betterTests as |test|}}
                <div class="title {{test.state}} {{test.expandState}}">
                  <i class="fa fa-check"></i>
                  <i class="fa fa-close"></i>
                  {{test.title}}
                  <i class="fa fa-caret-right"></i>
                  <i class="fa fa-caret-down"></i>
                </div>
                <div class="content {{test.state}} {{test.expandState}}">
                  <pre><code data-code-idx="{{test._betterID}}" class="javascript">{{{test.funcString}}}</code></pre>
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

    this.$('header form').submit((e) => {
      e.preventDefault();

      Ember.run(() => {
        if (this.get('grep') !== '' && this.$('#better-ember-reporter-grep').val() === '') {
          this.set('grep', '');
          this.navigateForNewParams(true);
        }
      });
    });

    this.$('.hide-passed-box').change(() => {
      Ember.run(() => {
        if (this.$('.hide-passed-box')[0].checked) {
          this.set('hidePassed', true);
        } else {
          this.set('hidePassed', false);
        }

        this.navigateForNewParams(false);
      });
    });

    this.$('#better-ember-reporter-grep').change(() => {
      Ember.run(() => {
        this.set('grep', this.$('#better-ember-reporter-grep').val());
        this.navigateForNewParams(true);
      });
    });

    this.$('#better-ember-reporter-grep').focusout(() => {
      Ember.run(() => {
        if (this.$('#better-ember-reporter-grep').val() === '') {
          if (this.get('grep') !== '') {
            this.set('grep', '');
            this.navigateForNewParams(true);
          }
        }
      });
    });

    if ($.type(params.hidepassed) === 'string') {
      this.$('.hide-passed-box').prop('checked', true);

      Ember.run(() => {
        this.set('hidePassed', true);
      });
    }

    if (params.grep) {
      Ember.run(() => {
        this.$('#better-ember-reporter-grep').attr('value', params.grep);
        this.set('grep', params.grep);
      });
    }
  },

  navigateForNewParams: function (forceReload) {
    let params = {};

    if (this.get('hidePassed')) {
      params.hidepassed = true;
    }

    if (this.get('grep')) {
      params.grep = this.get('grep');
    }

    let url = '/tests?' + Ember.$.param(params);

    if (window.history && window.history.pushState && !forceReload) {
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

  addStateToLastSuite: function () {
    // look for a test failure
    const suite = this.get('lastSuite');

    if (!suite) {
      return;
    }

    let failed = false;

    for (let i = 0; i < suite.tests.length; ++i) {
      if (suite.tests[i].state === 'failed') {
        failed = true;
        break;
      }
    }

    if (!failed) {
      suite.set('state', 'passed');
      suite.set('expandState', '');
    } else {
      suite.set('state', 'failed');
    }
  },

  actions: {
    suite: function (suite) {
      if (suite.root) {
        return;
      }

      Ember.run(() => {
        this.addStateToLastSuite();

        suite.expandState = 'active';
        suite._betterID = this.get('incSuite');
        suite.state = 'pending';
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
      test._betterID = this.get('incTest');
      let suite = this.get('suites').objectAt(test.parent._betterID);
      test.funcString = this.normalizeSrc(test.fn.toString());
      test.expandState = test.fail ? 'active' : '';
      suite.get('betterTests').pushObject(Ember.Object.create(test));
      this.incrementProperty('incTest');

      const addCodeHighlightWhenAvailable = () => {
        setTimeout(() => {
          Ember.run(() => {
            let el = this.$('[data-code-idx="' + test._betterID + '"]')[0];

            if (el) {
              hljs.highlightBlock(this.$('[data-code-idx="' + test._betterID + '"]')[0]);
            } else {
              addCodeHighlightWhenAvailable();
            }
          });
        }, 100);
      };

      addCodeHighlightWhenAvailable();
    },

    start: function () {
      this.initForm();
    },

    end: function () {
      Ember.run(() => {
        this.addStateToLastSuite();
      });
    },

    pending: function () {
      console.log('pending', arguments);
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
