// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by apple.js.
import { name as packageName } from "meteor/bigowl:apple";

// Write your tests here!
// Here is an example.
Tinytest.add("apple - example", function(test) {
  test.equal(packageName, "apple");
});
