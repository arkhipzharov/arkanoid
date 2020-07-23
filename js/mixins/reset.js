// you should integrate this mixin at the end of class constructor() {}, like this:
// reset.init(ClassNotClassInstance, dataToReset, this);

export default {
  init(ClassNotClassInstance, dataToReset, ClassInstanceContext) {
    Object.assign(ClassInstanceContext, dataToReset);
    ClassNotClassInstance.prototype.reset = this.reset.bind(
      ClassInstanceContext,
      // destroying references to nested object, if we dont do it they are will
      // have irrelevant values
      JSON.parse(JSON.stringify(dataToReset)),
    );
  },
  // carry function, you shouldn't pass args when calling it
  reset(dataToReset) {
    Object.keys(dataToReset).forEach((key) => {
      let value = dataToReset[key];
      if (_.isObject(value)) {
        // we need to destroy references to nested objects every time,
        // or they are will be set after this[key] = dataToReset[key]
        const objectPossiblyWithNestedObjectWithoutReferencesAfterParse
          = JSON.parse(JSON.stringify(value));
        this[key] = objectPossiblyWithNestedObjectWithoutReferencesAfterParse;
      } else {
        this[key] = value;
      }
    });
  },
};
