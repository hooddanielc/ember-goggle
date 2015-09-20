import resolver from './helpers/resolver';
import { setResolver } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

setResolver(resolver);

let ReporterComponent = Ember.Component.extend({
  classNames: 'better-ember-reporter',
  classNameBindings: ['hidePassed:hidePassed'],
  runner: null,
  inc: 0,
  hidePassed: false,

  layout: hbs`
    <header>
      <div class="item left">
        <input class="hide-passed-box" type="checkbox" /> Hide Passed
      </div>
    </header>
    <div class="container">
      {{#each suites as |suite|}}
        <div class="suite" data-id="{{suite._betterID}}">
          <h3>{{suite.title}}</h3>
          {{#each suite.betterTests as |test|}}
            <div class="test {{test.state}} {{test.expandState}}">
              <p class="title"><span class="arrow"></span> {{test.title}}</p>
              <pre>{{{test.funcString}}}</pre>
              {{#if test.err}}
                <pre>{{test.err.message}}</pre>
              {{/if}}
            </div>
          {{/each}}
        </div>
      {{/each}}
    </div>
  `,

  assertInit: Ember.on('init', function () {
    Ember.assert('`runner` must be defined', this.get('runner'));
    this.set('suites', Ember.A());
  }),

  initForm: Ember.on('didInsertElement', function () {
    this.$('.hide-passed-box').change(() => {
      Ember.run(() => {
        if (this.$('.hide-passed-box')[0].checked) {
          this.set('hidePassed', true);
        } else {
          this.set('hidePassed', false);
        }
      });
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
          let el = this.$('[data-id="' + lastSuite._betterID + '"]');
          let failed = false;

          for (let i = 0; i < lastSuite.tests.length; ++i) {
            if (lastSuite.tests[i].state === 'failed') {
              failed = true;
              break;
            }
          }

          if (failed) {
            el.addClass('failed');
          } else {
            el.addClass('passed');
          }
        }

        suite._betterID = this.get('inc');
        let objSuite = Ember.Object.create(suite);
        objSuite.set('betterTests', []);
        this.get('suites').pushObject(objSuite);
        this.incrementProperty('inc');
        this.set('lastSuite', suite);
      });
    },

    testEnd: function () {
      console.log('testEnd', arguments);
    },

    pass: function (test) {
      Ember.run(() => {
        let suite = this.get('suites').objectAt(test.parent._betterID);
        test.pass = true;
        test.funcString = this.normalizeSrc(test.fn.toString());
        test.expandState = '';
        suite.get('betterTests').pushObject(Ember.Object.create(test));
      });
    },

    fail: function (test, err) {
      Ember.run(() => {
        let suite = this.get('suites').objectAt(test.parent._betterID);
        test.fail = true;
        test.funcString = this.normalizeSrc(test.fn.toString());
        test.err = err;
        test.expandState = 'expanded';
        suite.get('betterTests').pushObject(Ember.Object.create(test));
      });
    },

    start: function () {
      console.log('start');
    },

    end: function () {
      // init expansion of test
      this.$('.test .title').on('click', function () {
        Ember.$(this).parent().toggleClass('expanded');
      });

      console.log('end');
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
