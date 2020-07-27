/*
  you should call .register inside classe's constructor() {} like this:

  reset.register(ClassItself, dataToResetFinal, this);

  or like this if you want to reset only static class props:

  reset.register(ClassItself, dataToResetFinal, this, true);

  and use it like this:

  ClassItself.reset(...)
*/

export default {
  registeredClasseAndStaticDatasToResetPairs: [],
  register(
    classItself,
    dataToReset,
    classInstanceContext,
    isStaticClassProps,
  ) {
    let dataToResetFinal = dataToReset;
    if (isStaticClassProps) {
      const pair = this.registeredClasseAndStaticDatasToResetPairs.find(
        (pair) => pair[0] === classItself,
      );
      if (pair) {
        dataToResetFinal = pair[1];
      } else {
        Object.assign(classItself, dataToResetFinal);
      }
    } else {
      Object.assign(classInstanceContext, dataToResetFinal);
    }
    const dataToResetFinalWithoutRefs = this.destroyRefsToNestedObjects(
      dataToResetFinal,
    );
    classItself.reset = this.reset.bind(
      classItself,
      dataToResetFinalWithoutRefs,
      classItself,
      classInstanceContext,
      this,
      isStaticClassProps
    );
    classItself._resetValue = this._resetValue.bind(
      classItself,
      dataToResetFinalWithoutRefs,
      classItself,
      classInstanceContext,
      this,
      isStaticClassProps,
    );
    this.registeredClasseAndStaticDatasToResetPairs.push([
      classItself,
      dataToResetFinalWithoutRefs,
    ]);
  },
  reset(
    dataToResetFinal,
    classItself,
    classInstanceContext,
    mixinContext,
    isStaticClassProps,
    specificKeyOrKeys,
  ) {
    if (Array.isArray(specificKeyOrKeys)) {
      specificKeyOrKeys.forEach((key) => {
        classItself._resetValue(key);
      });
    } else if (typeof specificKeyOrKeys === 'string') {
      classItself._resetValue(specificKeyOrKeys);
    } else {
      Object.keys(dataToResetFinal).forEach((key) => {
        classItself._resetValue(key);
      });
    }
  },
  _resetValue(
    dataToResetFinal,
    classItself,
    classInstanceContext,
    mixinContext,
    isStaticClassProps,
    key,
  ) {
    const currDataContext =
      isStaticClassProps ? classItself : classInstanceContext;
    const value = dataToResetFinal[key];
    if (_.isObject(value)) {
      currDataContext[key] =  mixinContext.destroyRefsToNestedObjects(value);
    } else {
      currDataContext[key] = value;
    }
  },
  destroyRefsToNestedObjects(obj) {
    const wow = JSON.parse(JSON.stringify(obj));
    return wow;
  },
};
