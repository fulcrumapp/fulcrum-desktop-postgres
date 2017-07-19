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
  static generateSchemaStatements(account, oldForm, newForm, disableArrays) {
    return _asyncToGenerator(function* () {
      let oldSchema = null;
      let newSchema = null;

      _postgresSchema2.default.disableArrays = disableArrays;

      if (oldForm) {
        oldSchema = new _schema2.default(oldForm, _postgresSchema2.default, null);
      }

      if (newForm) {
        newSchema = new _schema2.default(newForm, _postgresSchema2.default, null);
      }

      const differ = new SchemaDiffer(oldSchema, newSchema);
      const generator = new Postgres(differ, { afterTransform: null });

      generator.tablePrefix = 'account_' + account.rowID + '_';

      const statements = generator.generate();

      return { statements, oldSchema, newSchema };
    })();
  }
}
exports.default = PostgresSchema;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJQb3N0Z3JlcyIsIlBvc3RncmVzU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwiZGlzYWJsZUFycmF5cyIsIm9sZFNjaGVtYSIsIm5ld1NjaGVtYSIsImRpZmZlciIsImdlbmVyYXRvciIsImFmdGVyVHJhbnNmb3JtIiwidGFibGVQcmVmaXgiLCJyb3dJRCIsInN0YXRlbWVudHMiLCJnZW5lcmF0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUVBLE1BQU0sRUFBQ0EsWUFBRCxFQUFlQyxRQUFmLHNCQUFOOztBQUVlLE1BQU1DLGNBQU4sQ0FBcUI7QUFDbEMsU0FBYUMsd0JBQWIsQ0FBc0NDLE9BQXRDLEVBQStDQyxPQUEvQyxFQUF3REMsT0FBeEQsRUFBaUVDLGFBQWpFLEVBQWdGO0FBQUE7QUFDOUUsVUFBSUMsWUFBWSxJQUFoQjtBQUNBLFVBQUlDLFlBQVksSUFBaEI7O0FBRUEsK0JBQVNGLGFBQVQsR0FBeUJBLGFBQXpCOztBQUVBLFVBQUlGLE9BQUosRUFBYTtBQUNYRyxvQkFBWSxxQkFBV0gsT0FBWCw0QkFBOEIsSUFBOUIsQ0FBWjtBQUNEOztBQUVELFVBQUlDLE9BQUosRUFBYTtBQUNYRyxvQkFBWSxxQkFBV0gsT0FBWCw0QkFBOEIsSUFBOUIsQ0FBWjtBQUNEOztBQUVELFlBQU1JLFNBQVMsSUFBSVYsWUFBSixDQUFpQlEsU0FBakIsRUFBNEJDLFNBQTVCLENBQWY7QUFDQSxZQUFNRSxZQUFZLElBQUlWLFFBQUosQ0FBYVMsTUFBYixFQUFxQixFQUFDRSxnQkFBZ0IsSUFBakIsRUFBckIsQ0FBbEI7O0FBRUFELGdCQUFVRSxXQUFWLEdBQXdCLGFBQWFULFFBQVFVLEtBQXJCLEdBQTZCLEdBQXJEOztBQUVBLFlBQU1DLGFBQWFKLFVBQVVLLFFBQVYsRUFBbkI7O0FBRUEsYUFBTyxFQUFDRCxVQUFELEVBQWFQLFNBQWIsRUFBd0JDLFNBQXhCLEVBQVA7QUFyQjhFO0FBc0IvRTtBQXZCaUM7a0JBQWZQLGMiLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNjaGVtYSBmcm9tICdmdWxjcnVtLXNjaGVtYS9kaXN0L3NjaGVtYSc7XG5pbXBvcnQgc3FsZGlmZiBmcm9tICdzcWxkaWZmJztcbmltcG9ydCBQR1NjaGVtYSBmcm9tICcuL3Bvc3RncmVzLXNjaGVtYSc7XG5cbmNvbnN0IHtTY2hlbWFEaWZmZXIsIFBvc3RncmVzfSA9IHNxbGRpZmY7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvc3RncmVzU2NoZW1hIHtcbiAgc3RhdGljIGFzeW5jIGdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCBkaXNhYmxlQXJyYXlzKSB7XG4gICAgbGV0IG9sZFNjaGVtYSA9IG51bGw7XG4gICAgbGV0IG5ld1NjaGVtYSA9IG51bGw7XG5cbiAgICBQR1NjaGVtYS5kaXNhYmxlQXJyYXlzID0gZGlzYWJsZUFycmF5cztcblxuICAgIGlmIChvbGRGb3JtKSB7XG4gICAgICBvbGRTY2hlbWEgPSBuZXcgU2NoZW1hKG9sZEZvcm0sIFBHU2NoZW1hLCBudWxsKTtcbiAgICB9XG5cbiAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgbmV3U2NoZW1hID0gbmV3IFNjaGVtYShuZXdGb3JtLCBQR1NjaGVtYSwgbnVsbCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlmZmVyID0gbmV3IFNjaGVtYURpZmZlcihvbGRTY2hlbWEsIG5ld1NjaGVtYSk7XG4gICAgY29uc3QgZ2VuZXJhdG9yID0gbmV3IFBvc3RncmVzKGRpZmZlciwge2FmdGVyVHJhbnNmb3JtOiBudWxsfSk7XG5cbiAgICBnZW5lcmF0b3IudGFibGVQcmVmaXggPSAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJztcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBnZW5lcmF0b3IuZ2VuZXJhdGUoKTtcblxuICAgIHJldHVybiB7c3RhdGVtZW50cywgb2xkU2NoZW1hLCBuZXdTY2hlbWF9O1xuICB9XG59XG4iXX0=