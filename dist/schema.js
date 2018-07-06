'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _schema = require('fulcrum-schema/dist/schema');

var _schema2 = _interopRequireDefault(_schema);

var _sqldiff = require('sqldiff');

var _sqldiff2 = _interopRequireDefault(_sqldiff);

var _postgresSchema = require('./postgres-schema');

var _postgresSchema2 = _interopRequireDefault(_postgresSchema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const { SchemaDiffer, Postgres } = _sqldiff2.default;

class PostgresSchema {
  static generateSchemaStatements(account, oldForm, newForm, disableArrays, userModule, tableSchema) {
    return _asyncToGenerator(function* () {
      let oldSchema = null;
      let newSchema = null;

      _postgresSchema2.default.disableArrays = disableArrays;

      if (userModule && userModule.updateSchema && !_postgresSchema2.default._modified) {
        userModule.updateSchema(_postgresSchema2.default);

        _postgresSchema2.default._modified = true;
      }

      if (oldForm) {
        oldSchema = new _schema2.default(oldForm, _postgresSchema2.default, userModule && userModule.schemaOptions);
      }

      if (newForm) {
        newSchema = new _schema2.default(newForm, _postgresSchema2.default, userModule && userModule.schemaOptions);
      }

      const differ = new SchemaDiffer(oldSchema, newSchema);
      const generator = new Postgres(differ, { afterTransform: null });

      generator.tablePrefix = 'account_' + account.rowID + '_';

      if (tableSchema) {
        generator.tableSchema = tableSchema;
      }

      const statements = generator.generate();

      return { statements, oldSchema, newSchema };
    })();
  }
}
exports.default = PostgresSchema;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJQb3N0Z3JlcyIsIlBvc3RncmVzU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJ0YWJsZVNjaGVtYSIsIm9sZFNjaGVtYSIsIm5ld1NjaGVtYSIsInVwZGF0ZVNjaGVtYSIsIl9tb2RpZmllZCIsInNjaGVtYU9wdGlvbnMiLCJkaWZmZXIiLCJnZW5lcmF0b3IiLCJhZnRlclRyYW5zZm9ybSIsInRhYmxlUHJlZml4Iiwicm93SUQiLCJzdGF0ZW1lbnRzIiwiZ2VuZXJhdGUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNLEVBQUNBLFlBQUQsRUFBZUMsUUFBZixzQkFBTjs7QUFFZSxNQUFNQyxjQUFOLENBQXFCO0FBQ2xDLFNBQWFDLHdCQUFiLENBQXNDQyxPQUF0QyxFQUErQ0MsT0FBL0MsRUFBd0RDLE9BQXhELEVBQWlFQyxhQUFqRSxFQUFnRkMsVUFBaEYsRUFBNEZDLFdBQTVGLEVBQXlHO0FBQUE7QUFDdkcsVUFBSUMsWUFBWSxJQUFoQjtBQUNBLFVBQUlDLFlBQVksSUFBaEI7O0FBRUEsK0JBQVNKLGFBQVQsR0FBeUJBLGFBQXpCOztBQUVBLFVBQUlDLGNBQWNBLFdBQVdJLFlBQXpCLElBQXlDLENBQUMseUJBQVNDLFNBQXZELEVBQWtFO0FBQ2hFTCxtQkFBV0ksWUFBWDs7QUFFQSxpQ0FBU0MsU0FBVCxHQUFxQixJQUFyQjtBQUNEOztBQUVELFVBQUlSLE9BQUosRUFBYTtBQUNYSyxvQkFBWSxxQkFBV0wsT0FBWCw0QkFBOEJHLGNBQWNBLFdBQVdNLGFBQXZELENBQVo7QUFDRDs7QUFFRCxVQUFJUixPQUFKLEVBQWE7QUFDWEssb0JBQVkscUJBQVdMLE9BQVgsNEJBQThCRSxjQUFjQSxXQUFXTSxhQUF2RCxDQUFaO0FBQ0Q7O0FBRUQsWUFBTUMsU0FBUyxJQUFJZixZQUFKLENBQWlCVSxTQUFqQixFQUE0QkMsU0FBNUIsQ0FBZjtBQUNBLFlBQU1LLFlBQVksSUFBSWYsUUFBSixDQUFhYyxNQUFiLEVBQXFCLEVBQUNFLGdCQUFnQixJQUFqQixFQUFyQixDQUFsQjs7QUFFQUQsZ0JBQVVFLFdBQVYsR0FBd0IsYUFBYWQsUUFBUWUsS0FBckIsR0FBNkIsR0FBckQ7O0FBRUEsVUFBSVYsV0FBSixFQUFpQjtBQUNmTyxrQkFBVVAsV0FBVixHQUF3QkEsV0FBeEI7QUFDRDs7QUFFRCxZQUFNVyxhQUFhSixVQUFVSyxRQUFWLEVBQW5COztBQUVBLGFBQU8sRUFBQ0QsVUFBRCxFQUFhVixTQUFiLEVBQXdCQyxTQUF4QixFQUFQO0FBL0J1RztBQWdDeEc7QUFqQ2lDO2tCQUFmVCxjIiwiZmlsZSI6InNjaGVtYS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTY2hlbWEgZnJvbSAnZnVsY3J1bS1zY2hlbWEvZGlzdC9zY2hlbWEnO1xuaW1wb3J0IHNxbGRpZmYgZnJvbSAnc3FsZGlmZic7XG5pbXBvcnQgUEdTY2hlbWEgZnJvbSAnLi9wb3N0Z3Jlcy1zY2hlbWEnO1xuXG5jb25zdCB7U2NoZW1hRGlmZmVyLCBQb3N0Z3Jlc30gPSBzcWxkaWZmO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb3N0Z3Jlc1NjaGVtYSB7XG4gIHN0YXRpYyBhc3luYyBnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwgZGlzYWJsZUFycmF5cywgdXNlck1vZHVsZSwgdGFibGVTY2hlbWEpIHtcbiAgICBsZXQgb2xkU2NoZW1hID0gbnVsbDtcbiAgICBsZXQgbmV3U2NoZW1hID0gbnVsbDtcblxuICAgIFBHU2NoZW1hLmRpc2FibGVBcnJheXMgPSBkaXNhYmxlQXJyYXlzO1xuXG4gICAgaWYgKHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS51cGRhdGVTY2hlbWEgJiYgIVBHU2NoZW1hLl9tb2RpZmllZCkge1xuICAgICAgdXNlck1vZHVsZS51cGRhdGVTY2hlbWEoUEdTY2hlbWEpO1xuXG4gICAgICBQR1NjaGVtYS5fbW9kaWZpZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChvbGRGb3JtKSB7XG4gICAgICBvbGRTY2hlbWEgPSBuZXcgU2NoZW1hKG9sZEZvcm0sIFBHU2NoZW1hLCB1c2VyTW9kdWxlICYmIHVzZXJNb2R1bGUuc2NoZW1hT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKG5ld0Zvcm0pIHtcbiAgICAgIG5ld1NjaGVtYSA9IG5ldyBTY2hlbWEobmV3Rm9ybSwgUEdTY2hlbWEsIHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS5zY2hlbWFPcHRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaWZmZXIgPSBuZXcgU2NoZW1hRGlmZmVyKG9sZFNjaGVtYSwgbmV3U2NoZW1hKTtcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBuZXcgUG9zdGdyZXMoZGlmZmVyLCB7YWZ0ZXJUcmFuc2Zvcm06IG51bGx9KTtcblxuICAgIGdlbmVyYXRvci50YWJsZVByZWZpeCA9ICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nO1xuXG4gICAgaWYgKHRhYmxlU2NoZW1hKSB7XG4gICAgICBnZW5lcmF0b3IudGFibGVTY2hlbWEgPSB0YWJsZVNjaGVtYTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gZ2VuZXJhdG9yLmdlbmVyYXRlKCk7XG5cbiAgICByZXR1cm4ge3N0YXRlbWVudHMsIG9sZFNjaGVtYSwgbmV3U2NoZW1hfTtcbiAgfVxufVxuIl19