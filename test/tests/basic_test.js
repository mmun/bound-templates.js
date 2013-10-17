import { compileSpec, hydrate } from "bound-templates/compiler";
import { test, module, ok } from "test_helpers";
import { merge } from "htmlbars/utils";
import Stream from "bound-templates/stream";
import HTMLElement from "bound-templates/wrappers/html-element";

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.node.cloneNode(true));

  equal(div.innerHTML, html);
}

function compile(string, options) {
  var spec = compileSpec(string);

  var defaultExtensions = {
    PathObserver: PathObserver
  };

  options = options || {};
  var extensions = options.extensions || {};

  return hydrate(spec, {
    extensions: merge(extensions, defaultExtensions)
  });
}

function PathObserver(model, path) {
  var observer = this;

  var stream = new Stream(function(next) {
    addObserver(model, path, function() {
      var value = observer.currentValue = model[path];
      next(value);
    });

    return observer;
  });

  this.currentValue = model[path];
  this.subscribe = stream.subscribe;
}

PathObserver.prototype = {
  constructor: PathObserver,

  subscribed: function(callbacks) {
    callbacks.next(this.currentValue);
  }
};

function addObserver(model, path, callback) {
  model.__observers = model.__observers || {};
  model.__observers[path] = model.__observers[path] || [];
  model.__observers[path].push(callback);
}

function notify(model, path) {
  model.__observers[path].forEach(function(callback) {
    callback();
  });
}

module("Basic test", {
  setup: function() {
  }
});

test("Basic HTML becomes an HTML fragment", function() {
  var template = compile("<p>hello</p>");

  equalHTML(template(), "<p>hello</p>");
});

test("Basic curlies insert the contents of the curlies", function() {
  var template = compile("<p>{{hello}}</p>");

  equalHTML(template({ hello: "hello world" }), "<p>hello world</p>");
});

test("Curlies are data-bound using the specified wrapper", function() {
  function TestHTMLElement(name) {
    HTMLElement.call(this, name);
    this.node.setAttribute('data-test-success', true);
  }

  TestHTMLElement.prototype = Object.create(HTMLElement.prototype);

  var template = compile("<p>{{hello}}</p>", {
    extensions: {
      HTMLElement: TestHTMLElement
    }
  });

  var model = { hello: "hello world" },
      fragment = template(model);

  equalHTML(fragment, "<p data-test-success=\"true\">hello world</p>");
});

test("Curlies can be updated when the model changes", function() {
  var template = compile("<p>{{hello}}</p>");

  var model = { hello: "hello world" },
      fragment = template(model);

  equalHTML(fragment, "<p>hello world</p>");

  model.hello = "goodbye cruel world";
  notify(model, 'hello');

  equalHTML(fragment, "<p>goodbye cruel world</p>");
});