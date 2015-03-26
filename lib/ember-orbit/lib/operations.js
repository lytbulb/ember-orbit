function copyInto(source, target, schema, type) {
	copyKeys(source, target, schema, type);
	copyAttributes(source, target, schema, type);
	copyLinks(source, target, schema, type);
}

function copyKeys(source, target, schema, type) {
	schema.keys(type).forEach(function(key) {
		target.set(key, source[key]);
	}, this);
}

function copyAttributes(source, target, schema, type) {
	schema.attributes(type).forEach(function(attr) {
		target.set(attr, source[attr]);
	}, this);
}

function copyLinks(source, target, schema, type) {
	if (!source.__rel) {
		return;
	}

	var linkNames = schema.links(type);

	if (!target.__rel) {
		target.__rel = {};
	}

	linkNames.forEach(function(link){
		target.__rel[link] = source.__rel[link];
	});
}

export { copyInto };
