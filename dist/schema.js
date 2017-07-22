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
  static generateSchemaStatements(account, oldForm, newForm, disableArrays, userModule) {
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

      const statements = generator.generate();

      return { statements, oldSchema, newSchema };
    })();
  }
}
exports.default = PostgresSchema;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJQb3N0Z3JlcyIsIlBvc3RncmVzU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJvbGRTY2hlbWEiLCJuZXdTY2hlbWEiLCJ1cGRhdGVTY2hlbWEiLCJfbW9kaWZpZWQiLCJzY2hlbWFPcHRpb25zIiwiZGlmZmVyIiwiZ2VuZXJhdG9yIiwiYWZ0ZXJUcmFuc2Zvcm0iLCJ0YWJsZVByZWZpeCIsInJvd0lEIiwic3RhdGVtZW50cyIsImdlbmVyYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsTUFBTSxFQUFDQSxZQUFELEVBQWVDLFFBQWYsc0JBQU47O0FBRWUsTUFBTUMsY0FBTixDQUFxQjtBQUNsQyxTQUFhQyx3QkFBYixDQUFzQ0MsT0FBdEMsRUFBK0NDLE9BQS9DLEVBQXdEQyxPQUF4RCxFQUFpRUMsYUFBakUsRUFBZ0ZDLFVBQWhGLEVBQTRGO0FBQUE7QUFDMUYsVUFBSUMsWUFBWSxJQUFoQjtBQUNBLFVBQUlDLFlBQVksSUFBaEI7O0FBRUEsK0JBQVNILGFBQVQsR0FBeUJBLGFBQXpCOztBQUVBLFVBQUlDLGNBQWNBLFdBQVdHLFlBQXpCLElBQXlDLENBQUMseUJBQVNDLFNBQXZELEVBQWtFO0FBQ2hFSixtQkFBV0csWUFBWDs7QUFFQSxpQ0FBU0MsU0FBVCxHQUFxQixJQUFyQjtBQUNEOztBQUVELFVBQUlQLE9BQUosRUFBYTtBQUNYSSxvQkFBWSxxQkFBV0osT0FBWCw0QkFBOEJHLGNBQWNBLFdBQVdLLGFBQXZELENBQVo7QUFDRDs7QUFFRCxVQUFJUCxPQUFKLEVBQWE7QUFDWEksb0JBQVkscUJBQVdKLE9BQVgsNEJBQThCRSxjQUFjQSxXQUFXSyxhQUF2RCxDQUFaO0FBQ0Q7O0FBRUQsWUFBTUMsU0FBUyxJQUFJZCxZQUFKLENBQWlCUyxTQUFqQixFQUE0QkMsU0FBNUIsQ0FBZjtBQUNBLFlBQU1LLFlBQVksSUFBSWQsUUFBSixDQUFhYSxNQUFiLEVBQXFCLEVBQUNFLGdCQUFnQixJQUFqQixFQUFyQixDQUFsQjs7QUFFQUQsZ0JBQVVFLFdBQVYsR0FBd0IsYUFBYWIsUUFBUWMsS0FBckIsR0FBNkIsR0FBckQ7O0FBRUEsWUFBTUMsYUFBYUosVUFBVUssUUFBVixFQUFuQjs7QUFFQSxhQUFPLEVBQUNELFVBQUQsRUFBYVYsU0FBYixFQUF3QkMsU0FBeEIsRUFBUDtBQTNCMEY7QUE0QjNGO0FBN0JpQztrQkFBZlIsYyIsImZpbGUiOiJzY2hlbWEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2NoZW1hIGZyb20gJ2Z1bGNydW0tc2NoZW1hL2Rpc3Qvc2NoZW1hJztcbmltcG9ydCBzcWxkaWZmIGZyb20gJ3NxbGRpZmYnO1xuaW1wb3J0IFBHU2NoZW1hIGZyb20gJy4vcG9zdGdyZXMtc2NoZW1hJztcblxuY29uc3Qge1NjaGVtYURpZmZlciwgUG9zdGdyZXN9ID0gc3FsZGlmZjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9zdGdyZXNTY2hlbWEge1xuICBzdGF0aWMgYXN5bmMgZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0sIGRpc2FibGVBcnJheXMsIHVzZXJNb2R1bGUpIHtcbiAgICBsZXQgb2xkU2NoZW1hID0gbnVsbDtcbiAgICBsZXQgbmV3U2NoZW1hID0gbnVsbDtcblxuICAgIFBHU2NoZW1hLmRpc2FibGVBcnJheXMgPSBkaXNhYmxlQXJyYXlzO1xuXG4gICAgaWYgKHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS51cGRhdGVTY2hlbWEgJiYgIVBHU2NoZW1hLl9tb2RpZmllZCkge1xuICAgICAgdXNlck1vZHVsZS51cGRhdGVTY2hlbWEoUEdTY2hlbWEpO1xuXG4gICAgICBQR1NjaGVtYS5fbW9kaWZpZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChvbGRGb3JtKSB7XG4gICAgICBvbGRTY2hlbWEgPSBuZXcgU2NoZW1hKG9sZEZvcm0sIFBHU2NoZW1hLCB1c2VyTW9kdWxlICYmIHVzZXJNb2R1bGUuc2NoZW1hT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKG5ld0Zvcm0pIHtcbiAgICAgIG5ld1NjaGVtYSA9IG5ldyBTY2hlbWEobmV3Rm9ybSwgUEdTY2hlbWEsIHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS5zY2hlbWFPcHRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaWZmZXIgPSBuZXcgU2NoZW1hRGlmZmVyKG9sZFNjaGVtYSwgbmV3U2NoZW1hKTtcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBuZXcgUG9zdGdyZXMoZGlmZmVyLCB7YWZ0ZXJUcmFuc2Zvcm06IG51bGx9KTtcblxuICAgIGdlbmVyYXRvci50YWJsZVByZWZpeCA9ICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IGdlbmVyYXRvci5nZW5lcmF0ZSgpO1xuXG4gICAgcmV0dXJuIHtzdGF0ZW1lbnRzLCBvbGRTY2hlbWEsIG5ld1NjaGVtYX07XG4gIH1cbn1cbiJdfQ==