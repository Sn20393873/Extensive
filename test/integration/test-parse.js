var common = require('../common');
var assert = common.assert;
var stackTrace = require(common.dir.lib + '/stack-trace');

(function testObjectInMethodName() {
  var err = {};
  err.stack =
'Error: Foo\n' +
'    at [object Object].global.every [as _onTimeout] (/Users/hoitz/develop/test.coffee:36:3)\n' +
'    at Timer.listOnTimeout [as ontimeout] (timers.js:110:15)\n';

  var trace = stackTrace.parse(err);

  assert.strictEqual(trace[0].getFileName(), "/Users/hoitz/develop/test.coffee");
  assert.strictEqual(trace[1].getFileName(), "timers.js");
})();

(function testBasic() {
  var err = new Error('something went wrong');
  var trace = stackTrace.parse(err);

  assert.strictEqual(trace[0].getFileName(), __filename);
  assert.strictEqual(trace[0].getFunctionName(), 'testBasic');
})();

(function testWrapper() {
  (function testBelowFn() {
    var err = new Error('something went wrong');
    var trace = stackTrace.parse(err);
    assert.strictEqual(trace[0].getFunctionName(), 'testBelowFn');
    assert.strictEqual(trace[1].getFunctionName(), 'testWrapper');
  })();
})();

(function testNoStack() {
  var err = {stack: undefined};
  var trace = stackTrace.parse(err);

  assert.deepEqual(trace, []);
})();


(function testCorruptStack() {
  var err = {};
  err.stack =
'AssertionError: true == false\n' +
'    fuck' +
'    at Test.run (/Users/felix/code/node-fast-or-slow/lib/test.js:45:10)\n' +
'oh no' +
'    at TestCase.run (/Users/felix/code/node-fast-or-slow/lib/test_case.js:61:8)\n';

  var trace = stackTrace.parse(err);
  assert.equal(trace.length, 2);
})();

(function testTraceWitoutColumnNumbers() {
  var err = {};
  err.stack =
'AssertionError: true == false\n' +
'    at Test.fn (/Users/felix/code/node-fast-or-slow/test/fast/example/test-example.js:6)\n' +
'    at Test.run (/Users/felix/code/node-fast-or-slow/lib/test.js:45)';

  var trace = stackTrace.parse(err);
  assert.strictEqual(trace[0].getFileName(), "/Users/felix/code/node-fast-or-slow/test/fast/example/test-example.js");
  assert.strictEqual(trace[0].getLineNumber(), 6);
  assert.strictEqual(trace[0].getColumnNumber(), null);
})();

(function testCompareRealWithParsedStackTrace() {
  var realTrace, err;
  function TestClass() {
  }
  TestClass.prototype.testFunc = function () {
    realTrace = stackTrace.get(); err = new Error('something went wrong');
  }
  var testObj = new TestClass();
  testObj.testFunc();
  var parsedTrace = stackTrace.parse(err);

  realTrace.forEach(function(real, i) {
    var parsed = parsedTrace[i];

    function compare(method, exceptions) {
      var realValue = real[method]();
      var parsedValue = parsed[method]();

      if (exceptions && typeof exceptions[i] != 'undefined') {
        realValue = exceptions[i];
      }

      var realJson = JSON.stringify(realValue);
      var parsedJson = JSON.stringify(parsedValue);

      var message =
        method + ': ' + realJson + ' != ' + parsedJson + ' (#' + i + ')';

      assert.strictEqual(realValue, parsedValue, message);
    }

    compare('getFileName');
    compare('getFunctionName');
    compare('getTypeName', {
      1: null, //for 0.12.x
      8: null, //for 0.12.x
      9: null
    });
    compare('getMethodName', {
      6: '_load',  //for 0.12.x
      7: 'runMain' //for 0.12.x
    });
    compare('getLineNumber');
    compare('getColumnNumber', {
      0: 41
    });
    compare('isNative');
  });
})();

(function testStackWithNativeCall() {
  var err = {};
  err.stack =
'AssertionError: true == false\n' +
'    at Test.fn (/Users/felix/code/node-fast-or-slow/test/fast/example/test-example.js:6:10)\n' +
'    at Test.run (/Users/felix/code/node-fast-or-slow/lib/test.js:45:10)\n' +
'    at TestCase.runNext (/Users/felix/code/node-fast-or-slow/lib/test_case.js:73:8)\n' +
'    at TestCase.run (/Users/felix/code/node-fast-or-slow/lib/test_case.js:61:8)\n' +
'    at Array.0 (native)\n' +
'    at EventEmitter._tickCallback (node.js:126:26)';

  var trace = stackTrace.parse(err);
  var nativeCallSite = trace[4];

  assert.strictEqual(nativeCallSite.getFileName(), null);
  assert.strictEqual(nativeCallSite.getFunctionName(), 'Array.0');
  assert.strictEqual(nativeCallSite.getTypeName(), 'Array');
  assert.strictEqual(nativeCallSite.getMethodName(), '0');
  assert.strictEqual(nativeCallSite.getLineNumber(), null);
  assert.strictEqual(nativeCallSite.getColumnNumber(), null);
  assert.strictEqual(nativeCallSite.isNative(), true);
})();

(function testStackWithFileOnly() {
  var err = {};
  err.stack =
'AssertionError: true == false\n' +
'   at /Users/felix/code/node-fast-or-slow/lib/test_case.js:80:10';

  var trace = stackTrace.parse(err);
  var callSite = trace[0];

  assert.strictEqual(callSite.getFileName(), '/Users/felix/code/node-fast-or-slow/lib/test_case.js');
  assert.strictEqual(callSite.getFunctionName(), null);
  assert.strictEqual(callSite.getTypeName(), null);
  assert.strictEqual(callSite.getMethodName(), null);
  assert.strictEqual(callSite.getLineNumber(), 80);
  assert.strictEqual(callSite.getColumnNumber(), 10);
  assert.strictEqual(callSite.isNative(), false);
})();

(function testStackWithMultilineMessage() {
  var err = {};
  err.stack =
'AssertionError: true == false\nAnd some more shit\n' +
'   at /Users/felix/code/node-fast-or-slow/lib/test_case.js:80:10';

  var trace = stackTrace.parse(err);
  var callSite = trace[0];

  assert.strictEqual(callSite.getFileName(), '/Users/felix/code/node-fast-or-slow/lib/test_case.js');
})();

(function testStackWithAnonymousFunctionCall() {
  var err = {};
  err.stack =
'AssertionError: expected [] to be arguments\n' +
'    at Assertion.prop.(anonymous function) (/Users/den/Projects/should.js/lib/should.js:60:14)\n';

  var trace = stackTrace.parse(err);
  var callSite0 = trace[0];

  assert.strictEqual(callSite0.getFileName(), '/Users/den/Projects/should.js/lib/should.js');
  assert.strictEqual(callSite0.getFunctionName(), 'Assertion.prop.(anonymous function)');
  assert.strictEqual(callSite0.getTypeName(), "Assertion.prop");
  assert.strictEqual(callSite0.getMethodName(), "(anonymous function)");
  assert.strictEqual(callSite0.getLineNumber(), 60);
  assert.strictEqual(callSite0.getColumnNumber(), 14);
  assert.strictEqual(callSite0.isNative(), false);
})();
