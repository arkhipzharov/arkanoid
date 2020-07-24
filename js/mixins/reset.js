// you should integrate this mixin at the end of class constructor() {}, like this:
// reset.init(classNotClassInstance, dataToReset, this);

export default {
  // pass array as 2nd param if you want to reset static props
  init(classNotClassInstance, dataToResetMaybeKeys, classInstanceContext) {
    let dataToReset;
    let isStaticData;
    if (Array.isArray(dataToResetMaybeKeys)) {
      dataToReset = Object.fromEntries(
        dataToResetMaybeKeys.map((key) => [key, classNotClassInstance[key]]),
      );
      isStaticData = true;
    } else {
      dataToReset = dataToResetMaybeKeys;
      Object.assign(classInstanceContext, dataToReset);
    }
    classNotClassInstance.reset = this.reset.bind(
      classNotClassInstance,
      // destroying references to nested object, if we dont do it they are will
      // have irrelevant values
      JSON.parse(JSON.stringify(dataToReset)),
      classNotClassInstance,
      classInstanceContext,
      this,
      isStaticData
    );
    classNotClassInstance._resetValue = this._resetValue.bind(
      classNotClassInstance,
      JSON.parse(JSON.stringify(dataToReset)),
      classNotClassInstance,
      classInstanceContext,
      this,
      isStaticData,
    );
    this.classNotClassInstance = classNotClassInstance;
  },
  reset(
    dataToReset,
    classNotClassInstance,
    classInstanceContext,
    mixinContext,
    isStaticData,
    specificKeyOrKeys,
    specificKeyOrKeysOfThatObjName,
    isStaticDataAfterInitNotForIt,
  ) {
    if (Array.isArray(specificKeyOrKeys)) {
      specificKeyOrKeys.forEach((key) => {
        classNotClassInstance._resetValue(
          key,
          specificKeyOrKeysOfThatObjName,
          isStaticDataAfterInitNotForIt,
        );
      });
    } else if (typeof specificKeyOrKeys === 'string') {
      classNotClassInstance._resetValue(
        specificKeyOrKeys,
        specificKeyOrKeysOfThatObjName,
        isStaticDataAfterInitNotForIt,
      );
    } else {
      Object.keys(dataToReset).forEach((key) => {
        classNotClassInstance._resetValue(
          key,
          specificKeyOrKeysOfThatObjName,
          isStaticDataAfterInitNotForIt,
        );
      });
    }
  },
  _resetValue(
    dataToReset,
    classNotClassInstance,
    classInstanceContext,
    mixinContext,
    isStaticData,
    key,
    specificKeyOrKeysOfThatObjName,
    isStaticDataAfterInitNotForIt,
  ) {
    const currDataContext =
      isStaticDataAfterInitNotForIt || isStaticData
        ? specificKeyOrKeysOfThatObjName
          ? classNotClassInstance[specificKeyOrKeysOfThatObjName]
          : classNotClassInstance
        : specificKeyOrKeysOfThatObjName
          ? classInstanceContext[specificKeyOrKeysOfThatObjName]
          : classInstanceContext;
    const value =
      specificKeyOrKeysOfThatObjName
        ? dataToReset[specificKeyOrKeysOfThatObjName][key]
        : dataToReset[key];
    if (_.isObject(value)) {
      // we need to destroy references to nested objects every time,
      // or they are will be set after this[key] = dataToReset[key]
      const objectPossiblyWithNestedObjectWithoutReferencesAfterParse =
        JSON.parse(JSON.stringify(value));
      currDataContext[key] =
        objectPossiblyWithNestedObjectWithoutReferencesAfterParse;
    } else {
      currDataContext[key] = value;
    }
  },
};
