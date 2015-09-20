import {
  describeModule,
  it
} from 'ember-mocha';

describe('something', function () {
  it('something', function () {
    throw new Error("asdf");
  });

  it('something else', function () {
    console.log('i passed');
  });

  it('runs async', function (done) {
    setTimeout(function () {
      done();
    }, 1000);
  });
});
