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
  static generateSchemaStatements(account, oldForm, newForm) {
    return _asyncToGenerator(function* () {
      let oldSchema = null;
      let newSchema = null;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJQb3N0Z3JlcyIsIlBvc3RncmVzU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwib2xkU2NoZW1hIiwibmV3U2NoZW1hIiwiZGlmZmVyIiwiZ2VuZXJhdG9yIiwiYWZ0ZXJUcmFuc2Zvcm0iLCJ0YWJsZVByZWZpeCIsInJvd0lEIiwic3RhdGVtZW50cyIsImdlbmVyYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsTUFBTSxFQUFDQSxZQUFELEVBQWVDLFFBQWYsc0JBQU47O0FBRWUsTUFBTUMsY0FBTixDQUFxQjtBQUNsQyxTQUFhQyx3QkFBYixDQUFzQ0MsT0FBdEMsRUFBK0NDLE9BQS9DLEVBQXdEQyxPQUF4RCxFQUFpRTtBQUFBO0FBQy9ELFVBQUlDLFlBQVksSUFBaEI7QUFDQSxVQUFJQyxZQUFZLElBQWhCOztBQUVBLFVBQUlILE9BQUosRUFBYTtBQUNYRSxvQkFBWSxxQkFBV0YsT0FBWCw0QkFBOEIsSUFBOUIsQ0FBWjtBQUNEOztBQUVELFVBQUlDLE9BQUosRUFBYTtBQUNYRSxvQkFBWSxxQkFBV0YsT0FBWCw0QkFBOEIsSUFBOUIsQ0FBWjtBQUNEOztBQUVELFlBQU1HLFNBQVMsSUFBSVQsWUFBSixDQUFpQk8sU0FBakIsRUFBNEJDLFNBQTVCLENBQWY7QUFDQSxZQUFNRSxZQUFZLElBQUlULFFBQUosQ0FBYVEsTUFBYixFQUFxQixFQUFDRSxnQkFBZ0IsSUFBakIsRUFBckIsQ0FBbEI7O0FBRUFELGdCQUFVRSxXQUFWLEdBQXdCLGFBQWFSLFFBQVFTLEtBQXJCLEdBQTZCLEdBQXJEOztBQUVBLFlBQU1DLGFBQWFKLFVBQVVLLFFBQVYsRUFBbkI7O0FBRUEsYUFBTyxFQUFDRCxVQUFELEVBQWFQLFNBQWIsRUFBd0JDLFNBQXhCLEVBQVA7QUFuQitEO0FBb0JoRTtBQXJCaUM7a0JBQWZOLGMiLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFNjaGVtYSBmcm9tICdmdWxjcnVtLXNjaGVtYS9kaXN0L3NjaGVtYSc7XG5pbXBvcnQgc3FsZGlmZiBmcm9tICdzcWxkaWZmJztcbmltcG9ydCBQR1NjaGVtYSBmcm9tICcuL3Bvc3RncmVzLXNjaGVtYSc7XG5cbmNvbnN0IHtTY2hlbWFEaWZmZXIsIFBvc3RncmVzfSA9IHNxbGRpZmY7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvc3RncmVzU2NoZW1hIHtcbiAgc3RhdGljIGFzeW5jIGdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSB7XG4gICAgbGV0IG9sZFNjaGVtYSA9IG51bGw7XG4gICAgbGV0IG5ld1NjaGVtYSA9IG51bGw7XG5cbiAgICBpZiAob2xkRm9ybSkge1xuICAgICAgb2xkU2NoZW1hID0gbmV3IFNjaGVtYShvbGRGb3JtLCBQR1NjaGVtYSwgbnVsbCk7XG4gICAgfVxuXG4gICAgaWYgKG5ld0Zvcm0pIHtcbiAgICAgIG5ld1NjaGVtYSA9IG5ldyBTY2hlbWEobmV3Rm9ybSwgUEdTY2hlbWEsIG51bGwpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpZmZlciA9IG5ldyBTY2hlbWFEaWZmZXIob2xkU2NoZW1hLCBuZXdTY2hlbWEpO1xuICAgIGNvbnN0IGdlbmVyYXRvciA9IG5ldyBQb3N0Z3JlcyhkaWZmZXIsIHthZnRlclRyYW5zZm9ybTogbnVsbH0pO1xuXG4gICAgZ2VuZXJhdG9yLnRhYmxlUHJlZml4ID0gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXyc7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gZ2VuZXJhdG9yLmdlbmVyYXRlKCk7XG5cbiAgICByZXR1cm4ge3N0YXRlbWVudHMsIG9sZFNjaGVtYSwgbmV3U2NoZW1hfTtcbiAgfVxufVxuIl19