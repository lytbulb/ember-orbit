import Orbit from 'orbit';
import attr from 'ember-orbit/fields/attr';
import hasOne from 'ember-orbit/fields/has-one';
import hasMany from 'ember-orbit/fields/has-many';
import Store from 'ember-orbit/store';
import Model from 'ember-orbit/model';
import { createStore } from 'tests/test-helper';
import { RecordNotFoundException } from 'orbit-common/lib/exceptions';
import RequestConnector from 'orbit/request-connector';


Ember.RSVP.on('error', function(error){
  debugger
});

var get = Ember.get,
    set = Ember.set;

var Planet,
    Moon,
    Star,
    store,
    supportingSource;

module('Integration - Model - Lazy loading', {
  setup: function() {
    Orbit.Promise = Ember.RSVP.Promise;

    Star = Model.extend({
      name: attr('string'),
      planets: hasMany('planet', {inverse: 'sun'}),
      isStable: attr('boolean', {defaultValue: true})
    });

    Moon = Model.extend({
      name: attr('string'),
      planet: hasOne('planet', {inverse: 'moons'})
    });

    Planet = Model.extend({
      name: attr('string'),
      classification: attr('string'),
      sun: hasOne('star', {inverse: 'planets'}),
      moons: hasMany('moon', {inverse: 'planet'})
    });

    store = createStore({
      models: {
        star: Star,
        moon: Moon,
        planet: Planet
      }
    });

    supportingSource = {
      find: sinon.stub(),
      findLinked: sinon.stub()
    };

    store.orbitSource.on('rescueFindLinked', function(){
      return supportingSource.findLinked.apply(null, arguments);
    });
  },

  teardown: function() {
    Orbit.Promise = null;
    Star = null;
    Moon = null;
    Planet = null;
    store = null;
    supportingSource = null;
  }
});

test('hasOne is lazy loaded', function(){
  expect(2);
  stop();

  var jupiter = { id: 'jupiterId123', name: 'Jupiter', __rel: { sun: 'sun1' } };
  var sun = { id: 'sun1', name: "The Sun!" };

  store.orbitSource.reset({
    planet: {
      'jupiterId123': jupiter
    }
  });

  supportingSource.findLinked = function(){
    return Ember.RSVP.resolve(sun);
  }

  Ember.run(function() {

    store.find('planet', 'jupiterId123')
    .then(function(jupiter){
      return jupiter.get('sun');
    })
      .then(function(sun){
        start();
        equal(sun.get("id"), 'sun1', "sun id was lazy loaded");
        equal(sun.get("name"), 'The Sun!', "sun name was lazy loaded");
    }).catch(function(error){
      debugger

    });
  });

});

test('hasOne is updated when linked record is updated in supporting source', function(){
  expect(2);
  stop();

  var jupiter = { id: 'jupiterId123', name: 'Jupiter', __rel: { sun: 'sun1' } };
  var sun = { id: 'sun1', name: "The Sun!", __rel: { planets: { 'jupiterId123': true } } };

  store.orbitSource.reset({
    planet: {
      'jupiterId123': jupiter
    },
    star: {
      'sun1': sun
    }
  });

  Ember.run(function() {

    store.find('planet', 'jupiterId123')
    .then(function(jupiter){
      return jupiter.get('sun');
    })
    .then(function(sun){
      store.orbitSource.transform({op: 'replace', path: ['star', 'sun1', 'name'], value: 'Sol!' }).then(function(){
        start();
        equal(sun.get("id"), 'sun1', "sun id was lazy loaded");
        equal(sun.get("name"), 'Sol!', "sun name was lazy loaded");
      });
    });
  });

});

test('hasMany is lazy loaded', function(){
  expect(2);
  stop();

  var jupiter = { id: 'jupiterId123', name: 'Jupiter', __rel: {moons: {'europa1': true}}};
  var moon = { id: 'europa1', name: "Europa!" };

  store.orbitSource.reset({
    planet: {
      'jupiterId123': jupiter
    }
  });

  supportingSource.findLinked = function(){
    store.orbitSource.transform({op: 'add', path: ['moon', 'europa1'], value: moon});
    return Ember.RSVP.resolve(moon);
  };

  Ember.run(function() {
    store.find('planet', 'jupiterId123')
    .then(function(jupiter){
      return jupiter.get('moons');
    })
    .then(function(moons){
      store.orbitSource.on("didTransform", function(){
        start();
        equal(moons.get('firstObject.id'), 'europa1', "europa id was lazy loaded");
        equal(moons.get('firstObject.name'), 'Europa!', "europa name was lazy loaded");
      });
    });
  });

});

test("hasMany is updated when new item is added to store's source", function(){
  expect(2);
  stop();

  var jupiter = { id: 'jupiterId123', name: 'Jupiter', __rel: {moons: {'europa1': true}}};
  var europa = { id: 'europa1', name: "Europa!", __rel: {} };
  var ganymede = { id: 'ganymede2', name: "Ganymede!", __rel: {} };

  store.orbitSource.reset({
    planet: {
      'jupiterId123': jupiter
    },
    moon: {
      'europa1': europa
    }
  });

  Ember.run(function() {

    store.find('planet', 'jupiterId123')
    .then(function(jupiter){
      return jupiter.get('moons');
    })
    .then(function(moons){
      var addLinkOp = { op: 'add', path: ['planet', jupiter.id, '__rel', 'moons', ganymede.id], value: true };
      var addMoonOp = { op: 'add', path: ['moon', ganymede.id], value: ganymede };

      store.orbitSource.transform(addLinkOp).then(function(){
        store.orbitSource.transform(addMoonOp).then(function(){
          start();
          equal(moons.objectAt(0).get('name'), europa.name);
          equal(moons.objectAt(1).get('name'), ganymede.name);
        });
      });
    });
  });
});
