var get = Ember.get,
    set = Ember.set;

export default Ember.Object.extend({
	init: function(){
		this._super();
		this._hasOneObjects = [];
	},

	recordDidChange: function(record, operation){
		var path = [operation.path[0], operation.path[1]];
		var hasOneObjects = this._findHasOneObjects(path);

		hasOneObjects.forEach(function(hasOneObject){
			hasOneObject.set("content", record);
		});
	},

	add: function(hasOneObject){
		this._hasOneObjects.push(hasOneObject);
	},

	_findHasOneObjects: function(path){
		var store = this.store;
		var schema = get(store, 'schema');
		var recordType = path[0];
		var recordId = path[1];

		return this._hasOneObjects.filter(function(hasOneObject){
			var hasOneOwnerType = get(hasOneObject, '_ownerType');
	        var hasOneOwnerId = get(hasOneObject, '_ownerId');
	        var hasOneLinkField = get(hasOneObject, '_linkField');

	        var linkType = schema.linkProperties(hasOneOwnerType, hasOneLinkField).model;
	        var linkId = store.orbitSource.retrieve([hasOneOwnerType, hasOneOwnerId, '__rel', hasOneLinkField]);

	        return recordType === linkType && recordId === linkId;
		});
	}
});
