Template.configureLoginServiceDialogForApple.helpers({
  siteUrl: function() {
    return Meteor.absoluteUrl();
  }
});

Template.configureLoginServiceDialogForApple.fields = function() {
  return [
    { property: "clientId", label: "Client Id" },
    { property: "secret", label: "Client Secret" }
  ];
};
