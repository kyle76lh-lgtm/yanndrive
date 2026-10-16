const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../app.js', 'utf8');
function app(saved) {
  const storage = new Map(saved ? [['lhdrive-consumption-kwh-100km', saved]] : []);
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', value: '', style: {}, dataset: {}, hidden: true, children: [],
      append(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
      scrollIntoView() {}, getAttribute() {return null;},
      classList: {toggle() {}, add() {}, remove() {}, contains() {return false;}},
      addEventListener() {}, setAttribute() {}, querySelector() {return element(id + '-child');},
      querySelectorAll() {return [];}
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: {getElementById:element, querySelectorAll:() => [], createElement:() => element('created-' + elements.size)},
    window: {addEventListener() {}}, location: {origin:'https://lhdrive.by-labs.fr'},
    localStorage:{getItem:k => storage.get(k) ?? null, setItem:(k,v) => storage.set(k,v)},
    navigator:{geolocation:{watchPosition:() => 1, clearWatch() {}}},
    setTimeout:() => 1, clearTimeout() {}, setInterval:() => 1, clearInterval() {},
    fetch:async () => ({ok:false}), console
  });
  vm.runInContext(source + '\nglobalThis.test = {state,ui,startTrip,stopTrip,resetTrip,resetVmax,onPosition,onGpsError,renderTrip,renderSpeed,parseTides,parisTimestamp,renderTides,updateTripConsumption,updateTripElectricityRate};', context);
  return {test:context.test, storage};
}
let {test, storage} = app();
assert.equal(test.state.consumptionKwh100Km, 18);
assert.equal(test.ui.tripCost.textContent, '0,00 €');
test.startTrip();
// 100 GPS segments, about 111 m each, at 10-second intervals.
const position = (i) => ({timestamp:1000000 + i * 10000, coords:{latitude:49 + i * .001, longitude:0, accuracy:6, speed:11.1}});
test.onPosition(position(0));
for (let i=1; i<=100; i++) test.onPosition(position(i));
assert.ok(Math.abs(test.state.distanceM - 11100) < 1);
assert.equal(test.ui.tripCost.textContent, '0,27 €');
test.stopTrip();
const stoppedDistance = test.state.distanceM;
test.onPosition(position(101));
assert.equal(test.state.distanceM, stoppedDistance);
assert.equal(test.ui.tripCost.textContent, '0,27 €');
test.startTrip();
test.onPosition(position(110)); // Baseline on resume excludes the paused segment.
assert.equal(test.state.distanceM, stoppedDistance);
test.onPosition(position(111));
assert.ok(test.state.distanceM > stoppedDistance);
test.stopTrip();
test.state.distanceM = 100000;
test.renderTrip();
assert.equal(test.ui.tripCost.textContent, '2,41 €');
assert.equal(test.ui.tripEnergy.textContent, '18,00 kWh estimés');
test.ui.tripConsumption.value = '20';
test.updateTripConsumption();
assert.equal(test.ui.tripCost.textContent, '2,68 €');
assert.equal(storage.get('lhdrive-consumption-kwh-100km'), '20');
for (const invalid of ['', '0', '-5', '101', 'NaN']) {
  test.ui.tripConsumption.value = invalid;
  test.updateTripConsumption();
  assert.equal(test.state.consumptionKwh100Km, 20);
  assert.equal(test.ui.tripConsumption.value, '20');
}
test.state.tripHasDemo = true;
test.renderTrip();
assert.match(test.ui.tripCostStatus.textContent, /fictive/);
test.resetTrip();
assert.equal(test.ui.tripCost.textContent, '0,00 €');
assert.equal(test.state.tripHasDemo, false);
assert.equal(test.state.consumptionKwh100Km, 20);
assert.equal(app('22.5').test.state.consumptionKwh100Km, 22.5);
assert.equal(app('invalid').test.state.consumptionKwh100Km, 18);
assert.equal(app('-1').test.state.consumptionKwh100Km, 18);
test.state.distanceM = 100000;
test.ui.tripElectricityRate.value = '0.25';
test.updateTripElectricityRate();
assert.equal(test.ui.tripCost.textContent, '5,00 €');
assert.equal(storage.get('lhdrive-electricity-rate-eur-kwh'), '0.25');
test.ui.tripElectricityRate.value = '0';
test.updateTripElectricityRate();
assert.equal(test.ui.tripCost.textContent, '0,00 €');
for (const invalid of ['', '-1', '11', 'NaN']) {
  test.ui.tripElectricityRate.value = invalid;
  test.updateTripElectricityRate();
  assert.equal(test.state.electricityRate, 0);
}
test.resetTrip();
assert.equal(test.state.electricityRate, 0);
console.log('PASS: GPS distance, tariff, stop/resume, reset, consumption validation/persistence, demo warning.');
// Reproduction: good GPS accuracy, changing speed, identical coordinates.
const motion = (t, speed, latitude = 49) => ({timestamp:1000000 + t * 1000, coords:{latitude, longitude:0, accuracy:6, speed}});
test = app().test;
test.startTrip();
test.onPosition(motion(0, 10));
test.onPosition(motion(1, 12));
assert.equal(test.state.distanceM, 11);
assert.equal(test.state.accelerationMps2, 2);
assert.equal(test.state.maxAccelerationMps2, 2);
test.onPosition(motion(2, 9));
assert.equal(test.state.distanceM, 21.5);
assert.equal(test.state.maxDecelerationMps2, 3);
test.onPosition(motion(2, 9));
test.onPosition(motion(1, 12));
assert.equal(test.state.distanceM, 21.5); // Duplicate/backwards timestamps.
test.stopTrip();
test.onPosition(motion(3, 15));
assert.equal(test.state.distanceM, 21.5);
assert.equal(test.state.maxAccelerationMps2, 2); // Records freeze while stopped.
test.startTrip();
test.onPosition(motion(10, 15));
assert.equal(test.state.distanceM, 21.5);
assert.equal(test.state.accelerationMps2, null);
test.onPosition(motion(11, 15));
assert.equal(test.state.distanceM, 36.5);
test.onGpsError({code:2});
test.onPosition(motion(12, 15));
assert.equal(test.state.distanceM, 36.5); // Never bridge GPS loss.
test.onPosition(motion(100, 15));
assert.equal(test.state.distanceM, 36.5); // Never extrapolate over long gaps.
test.resetTrip();
assert.equal(test.state.maxAccelerationMps2, 0);
assert.equal(test.state.maxDecelerationMps2, 0);
// Coordinate fallback when speed is unavailable or incorrectly fixed at zero.
for (const speed of [null, 0]) {
  test = app().test;
  test.startTrip();
  for (let i=0; i<=100; i++) test.onPosition(motion(i, speed, 49 + i * .00001));
  assert.ok(test.state.distanceM > 108 && test.state.distanceM < 113);
}
// Stationary positions do not create distance, and implausible jumps are rejected.
test = app().test;
test.startTrip();
for (let i=0; i<=10; i++) test.onPosition(motion(i, 0));
assert.equal(test.state.distanceM, 0);
test.onPosition(motion(11, null, 50));
assert.equal(test.state.distanceM, 0);
console.log('PASS: frozen coordinates, acceleration/braking, duplicate timestamps, pause/resume, signal loss, coordinate fallback, stationary/jump rejection.');
test = app().test;
test.renderSpeed(80);
test.renderSpeed(50);
assert.equal(test.ui.headerMaxSpeed.textContent, 80);
test.renderSpeed(100);
assert.equal(test.ui.headerMaxSpeed.textContent, 100);
test.state.demo = true;
test.renderSpeed(120);
assert.equal(test.ui.headerMaxSpeed.textContent, 120);
assert.equal(test.state.autoMaxSpeedKmh, 100);
test.resetVmax();
assert.equal(test.state.demoMaxSpeedKmh, 0);
assert.equal(test.state.autoMaxSpeedKmh, 100);
test.state.demo = false;
test.renderSpeed(0);
assert.equal(test.ui.headerMaxSpeed.textContent, 100);
test.resetVmax();
assert.equal(test.ui.headerMaxSpeed.textContent, '0');
test.renderSpeed(30);
assert.equal(test.ui.headerMaxSpeed.textContent, 30);
assert.equal(test.parisTimestamp('2026-01-15', '12:00'), Date.parse('2026-01-15T11:00:00Z'));
assert.equal(test.parisTimestamp('2026-07-15', '12:00'), Date.parse('2026-07-15T10:00:00Z'));
assert.equal(test.parisTimestamp('2026-10-25', '08:00'), Date.parse('2026-10-25T07:00:00Z'));
const tides = test.parseTides(fs.readFileSync(__dirname + '/../data/tides-le-havre-2026.csv','utf8'));
assert.ok(tides.length > 1300);
test.renderTides(tides, Date.parse('2026-10-16T12:00:00Z'));
assert.notEqual(test.ui.nextHighTide.textContent, 'Indisponible');
assert.notEqual(test.ui.nextLowTide.textContent, 'Indisponible');
assert.ok(test.ui.tideRows.children.length >= 6);
assert.ok(test.ui.tideRows.children.some(row => row.className === 'tide-past'));
test.renderTides(tides, Date.parse('2027-01-02T12:00:00Z'));
assert.equal(test.ui.nextHighTide.textContent, 'Indisponible');
assert.match(test.ui.tideStatus.textContent, /période non couverte/);
console.log('PASS: header maximum/reset, Paris winter/summer/DST times, high/low tides, day table and expired data.');
