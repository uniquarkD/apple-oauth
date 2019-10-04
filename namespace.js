// The module.exports object of this module becomes the Apple namespace
// for other modules in this package.
Apple = module.exports;

// So that api.export finds the "Apple" property.
Apple.Apple = Apple;
