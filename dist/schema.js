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
  static generateSchemaStatements(account, oldForm, newForm, disableArrays, disableComplexTypes, userModule, tableSchema) {
    return _asyncToGenerator(function* () {
      let oldSchema = null;
      let newSchema = null;

      _postgresSchema2.default.disableArrays = disableArrays;
      _postgresSchema2.default.disableComplexTypes = disableComplexTypes;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJQb3N0Z3JlcyIsIlBvc3RncmVzU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwiZGlzYWJsZUFycmF5cyIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1c2VyTW9kdWxlIiwidGFibGVTY2hlbWEiLCJvbGRTY2hlbWEiLCJuZXdTY2hlbWEiLCJ1cGRhdGVTY2hlbWEiLCJfbW9kaWZpZWQiLCJzY2hlbWFPcHRpb25zIiwiZGlmZmVyIiwiZ2VuZXJhdG9yIiwiYWZ0ZXJUcmFuc2Zvcm0iLCJ0YWJsZVByZWZpeCIsInJvd0lEIiwic3RhdGVtZW50cyIsImdlbmVyYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsTUFBTSxFQUFDQSxZQUFELEVBQWVDLFFBQWYsc0JBQU47O0FBRWUsTUFBTUMsY0FBTixDQUFxQjtBQUNsQyxTQUFhQyx3QkFBYixDQUFzQ0MsT0FBdEMsRUFBK0NDLE9BQS9DLEVBQXdEQyxPQUF4RCxFQUFpRUMsYUFBakUsRUFBZ0ZDLG1CQUFoRixFQUFxR0MsVUFBckcsRUFBaUhDLFdBQWpILEVBQThIO0FBQUE7QUFDNUgsVUFBSUMsWUFBWSxJQUFoQjtBQUNBLFVBQUlDLFlBQVksSUFBaEI7O0FBRUEsK0JBQVNMLGFBQVQsR0FBeUJBLGFBQXpCO0FBQ0EsK0JBQVNDLG1CQUFULEdBQStCQSxtQkFBL0I7O0FBRUEsVUFBSUMsY0FBY0EsV0FBV0ksWUFBekIsSUFBeUMsQ0FBQyx5QkFBU0MsU0FBdkQsRUFBa0U7QUFDaEVMLG1CQUFXSSxZQUFYOztBQUVBLGlDQUFTQyxTQUFULEdBQXFCLElBQXJCO0FBQ0Q7O0FBRUQsVUFBSVQsT0FBSixFQUFhO0FBQ1hNLG9CQUFZLHFCQUFXTixPQUFYLDRCQUE4QkksY0FBY0EsV0FBV00sYUFBdkQsQ0FBWjtBQUNEOztBQUVELFVBQUlULE9BQUosRUFBYTtBQUNYTSxvQkFBWSxxQkFBV04sT0FBWCw0QkFBOEJHLGNBQWNBLFdBQVdNLGFBQXZELENBQVo7QUFDRDs7QUFFRCxZQUFNQyxTQUFTLElBQUloQixZQUFKLENBQWlCVyxTQUFqQixFQUE0QkMsU0FBNUIsQ0FBZjtBQUNBLFlBQU1LLFlBQVksSUFBSWhCLFFBQUosQ0FBYWUsTUFBYixFQUFxQixFQUFDRSxnQkFBZ0IsSUFBakIsRUFBckIsQ0FBbEI7O0FBRUFELGdCQUFVRSxXQUFWLEdBQXdCLGFBQWFmLFFBQVFnQixLQUFyQixHQUE2QixHQUFyRDs7QUFFQSxVQUFJVixXQUFKLEVBQWlCO0FBQ2ZPLGtCQUFVUCxXQUFWLEdBQXdCQSxXQUF4QjtBQUNEOztBQUVELFlBQU1XLGFBQWFKLFVBQVVLLFFBQVYsRUFBbkI7O0FBRUEsYUFBTyxFQUFDRCxVQUFELEVBQWFWLFNBQWIsRUFBd0JDLFNBQXhCLEVBQVA7QUFoQzRIO0FBaUM3SDtBQWxDaUM7a0JBQWZWLGMiLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNjaGVtYSBmcm9tICdmdWxjcnVtLXNjaGVtYS9kaXN0L3NjaGVtYSc7XG5pbXBvcnQgc3FsZGlmZiBmcm9tICdzcWxkaWZmJztcbmltcG9ydCBQR1NjaGVtYSBmcm9tICcuL3Bvc3RncmVzLXNjaGVtYSc7XG5cbmNvbnN0IHtTY2hlbWFEaWZmZXIsIFBvc3RncmVzfSA9IHNxbGRpZmY7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvc3RncmVzU2NoZW1hIHtcbiAgc3RhdGljIGFzeW5jIGdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCBkaXNhYmxlQXJyYXlzLCBkaXNhYmxlQ29tcGxleFR5cGVzLCB1c2VyTW9kdWxlLCB0YWJsZVNjaGVtYSkge1xuICAgIGxldCBvbGRTY2hlbWEgPSBudWxsO1xuICAgIGxldCBuZXdTY2hlbWEgPSBudWxsO1xuXG4gICAgUEdTY2hlbWEuZGlzYWJsZUFycmF5cyA9IGRpc2FibGVBcnJheXM7XG4gICAgUEdTY2hlbWEuZGlzYWJsZUNvbXBsZXhUeXBlcyA9IGRpc2FibGVDb21wbGV4VHlwZXM7XG5cbiAgICBpZiAodXNlck1vZHVsZSAmJiB1c2VyTW9kdWxlLnVwZGF0ZVNjaGVtYSAmJiAhUEdTY2hlbWEuX21vZGlmaWVkKSB7XG4gICAgICB1c2VyTW9kdWxlLnVwZGF0ZVNjaGVtYShQR1NjaGVtYSk7XG5cbiAgICAgIFBHU2NoZW1hLl9tb2RpZmllZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG9sZEZvcm0pIHtcbiAgICAgIG9sZFNjaGVtYSA9IG5ldyBTY2hlbWEob2xkRm9ybSwgUEdTY2hlbWEsIHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS5zY2hlbWFPcHRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgbmV3U2NoZW1hID0gbmV3IFNjaGVtYShuZXdGb3JtLCBQR1NjaGVtYSwgdXNlck1vZHVsZSAmJiB1c2VyTW9kdWxlLnNjaGVtYU9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpZmZlciA9IG5ldyBTY2hlbWFEaWZmZXIob2xkU2NoZW1hLCBuZXdTY2hlbWEpO1xuICAgIGNvbnN0IGdlbmVyYXRvciA9IG5ldyBQb3N0Z3JlcyhkaWZmZXIsIHthZnRlclRyYW5zZm9ybTogbnVsbH0pO1xuXG4gICAgZ2VuZXJhdG9yLnRhYmxlUHJlZml4ID0gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXyc7XG5cbiAgICBpZiAodGFibGVTY2hlbWEpIHtcbiAgICAgIGdlbmVyYXRvci50YWJsZVNjaGVtYSA9IHRhYmxlU2NoZW1hO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBnZW5lcmF0b3IuZ2VuZXJhdGUoKTtcblxuICAgIHJldHVybiB7c3RhdGVtZW50cywgb2xkU2NoZW1hLCBuZXdTY2hlbWF9O1xuICB9XG59XG4iXX0=