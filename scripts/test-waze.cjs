const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    const classes = new Set();
    elements.set(id, { handlers: {}, attributes: {},
      classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); }, contains: name => classes.has(name) },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; }
    });
  }
  return elements.get(id);
}
let success, failure;
const navigator = { geolocation: { getCurrentPosition(ok, fail) { success = ok; failure = fail; } } };
const context = vm.createContext({ URLSearchParams, navigator,
  document: { getElementById: element, body: element('body'), addEventListener() {} } });
vm.runInContext(fs.readFileSync(__dirname + '/../waze.js', 'utf8') + '\nglobalThis.waze = LHdriveWaze;', context);
const map = element('wazeMap');
assert.equal(map.src, undefined, 'No external map before opening Waze');
context.waze.setVisible(true);
assert.equal(new URL(map.src).hostname, 'embed.waze.com');
assert.equal(new URL(map.src).pathname, '/fr/iframe');
assert.equal(new URL(map.src).searchParams.get('lat'), '49.4944');
map.src = 'retained-map';
context.waze.setVisible(false);
context.waze.setVisible(true);
assert.equal(map.src, 'retained-map', 'Tab switches preserve map interaction');
element('wazeLocate').handlers.click();
assert.equal(element('wazeLocate').disabled, true);
failure({code:1});
assert.equal(element('wazeLocate').disabled, false);
assert.match(element('wazeStatus').textContent, /refusé/);
assert.equal(map.src, 'retained-map');
element('wazeLocate').handlers.click();
success({coords:{latitude:48.8,longitude:2.3}});
assert.equal(new URL(map.src).searchParams.get('lat'), '48.8');
assert.equal(new URL(map.src).searchParams.get('lon'), '2.3');
const valid = map.src;
element('wazeLocate').handlers.click();
success({coords:{latitude:NaN,longitude:2}});
assert.equal(map.src, valid);
element('wazeHome').handlers.click();
assert.equal(new URL(map.src).searchParams.get('lat'), '49.4944');
element('wazeExpand').handlers.click();
assert.equal(element('body').classList.contains('waze-expanded-page'), true);
context.waze.setVisible(false);
assert.equal(element('body').classList.contains('waze-expanded-page'), false);
assert.equal(element('wazeExpand').attributes['aria-pressed'], 'false');
console.log('PASS: lazy map, preserved map, GPS refusal/success/invalid position, Le Havre, fullscreen cleanup.');
