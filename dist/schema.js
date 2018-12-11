'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _schema = require('fulcrum-schema/dist/schema');

var _schema2 = _interopRequireDefault(_schema);

var _metadata = require('fulcrum-schema/dist/metadata');

var _metadata2 = _interopRequireDefault(_metadata);

var _sqldiff = require('sqldiff');

var _sqldiff2 = _interopRequireDefault(_sqldiff);

var _postgresSchema = require('./postgres-schema');

var _postgresSchema2 = _interopRequireDefault(_postgresSchema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const { SchemaDiffer, Postgres } = _sqldiff2.default;

class PostgresSchema {
  static generateSchemaStatements(account, oldForm, newForm, { disableArrays, disableComplexTypes, userModule, tableSchema, calculatedFieldDateFormat, metadata, useResourceID, accountPrefix }) {
    return _asyncToGenerator(function* () {
      let oldSchema = null;
      let newSchema = null;

      _postgresSchema2.default.disableArrays = disableArrays;
      _postgresSchema2.default.disableComplexTypes = disableComplexTypes;
      _postgresSchema2.default.calculatedFieldDateFormat = calculatedFieldDateFormat;

      if (userModule && userModule.updateSchema && !_postgresSchema2.default._modified) {
        userModule.updateSchema(_postgresSchema2.default);

        _postgresSchema2.default._modified = true;
      }

      if (useResourceID) {
        if (oldForm) {
          oldForm.row_id = oldForm.id;
        }
        if (newForm) {
          newForm.row_id = newForm.id;
        }
      }

      if (oldForm) {
        oldSchema = new _schema2.default(oldForm, _postgresSchema2.default, userModule && userModule.schemaOptions);
      }

      if (newForm) {
        newSchema = new _schema2.default(newForm, _postgresSchema2.default, userModule && userModule.schemaOptions);
      }

      const differ = new SchemaDiffer(oldSchema, newSchema);

      const meta = new _metadata2.default(differ, { quote: '"', schema: tableSchema, prefix: 'system_', useAliases: false });
      const generator = new Postgres(differ, { afterTransform: metadata && meta.build.bind(meta) });

      generator.tablePrefix = accountPrefix != null ? accountPrefix + '_' : '';

      if (tableSchema) {
        generator.tableSchema = tableSchema;
      }

      const statements = generator.generate();

      return { statements, oldSchema, newSchema };
    })();
  }
}
exports.default = PostgresSchema;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJQb3N0Z3JlcyIsIlBvc3RncmVzU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwiZGlzYWJsZUFycmF5cyIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1c2VyTW9kdWxlIiwidGFibGVTY2hlbWEiLCJjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0IiwibWV0YWRhdGEiLCJ1c2VSZXNvdXJjZUlEIiwiYWNjb3VudFByZWZpeCIsIm9sZFNjaGVtYSIsIm5ld1NjaGVtYSIsInVwZGF0ZVNjaGVtYSIsIl9tb2RpZmllZCIsInJvd19pZCIsImlkIiwic2NoZW1hT3B0aW9ucyIsImRpZmZlciIsIm1ldGEiLCJxdW90ZSIsInNjaGVtYSIsInByZWZpeCIsInVzZUFsaWFzZXMiLCJnZW5lcmF0b3IiLCJhZnRlclRyYW5zZm9ybSIsImJ1aWxkIiwiYmluZCIsInRhYmxlUHJlZml4Iiwic3RhdGVtZW50cyIsImdlbmVyYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNLEVBQUNBLFlBQUQsRUFBZUMsUUFBZixzQkFBTjs7QUFFZSxNQUFNQyxjQUFOLENBQXFCO0FBQ2xDLFNBQWFDLHdCQUFiLENBQXNDQyxPQUF0QyxFQUErQ0MsT0FBL0MsRUFBd0RDLE9BQXhELEVBQWlFLEVBQUNDLGFBQUQsRUFBZ0JDLG1CQUFoQixFQUFxQ0MsVUFBckMsRUFBaURDLFdBQWpELEVBQThEQyx5QkFBOUQsRUFBeUZDLFFBQXpGLEVBQW1HQyxhQUFuRyxFQUFrSEMsYUFBbEgsRUFBakUsRUFBbU07QUFBQTtBQUNqTSxVQUFJQyxZQUFZLElBQWhCO0FBQ0EsVUFBSUMsWUFBWSxJQUFoQjs7QUFFQSwrQkFBU1QsYUFBVCxHQUF5QkEsYUFBekI7QUFDQSwrQkFBU0MsbUJBQVQsR0FBK0JBLG1CQUEvQjtBQUNBLCtCQUFTRyx5QkFBVCxHQUFxQ0EseUJBQXJDOztBQUVBLFVBQUlGLGNBQWNBLFdBQVdRLFlBQXpCLElBQXlDLENBQUMseUJBQVNDLFNBQXZELEVBQWtFO0FBQ2hFVCxtQkFBV1EsWUFBWDs7QUFFQSxpQ0FBU0MsU0FBVCxHQUFxQixJQUFyQjtBQUNEOztBQUVELFVBQUlMLGFBQUosRUFBbUI7QUFDakIsWUFBSVIsT0FBSixFQUFhO0FBQ1hBLGtCQUFRYyxNQUFSLEdBQWlCZCxRQUFRZSxFQUF6QjtBQUNEO0FBQ0QsWUFBSWQsT0FBSixFQUFhO0FBQ1hBLGtCQUFRYSxNQUFSLEdBQWlCYixRQUFRYyxFQUF6QjtBQUNEO0FBQ0Y7O0FBRUQsVUFBSWYsT0FBSixFQUFhO0FBQ1hVLG9CQUFZLHFCQUFXVixPQUFYLDRCQUE4QkksY0FBY0EsV0FBV1ksYUFBdkQsQ0FBWjtBQUNEOztBQUVELFVBQUlmLE9BQUosRUFBYTtBQUNYVSxvQkFBWSxxQkFBV1YsT0FBWCw0QkFBOEJHLGNBQWNBLFdBQVdZLGFBQXZELENBQVo7QUFDRDs7QUFFRCxZQUFNQyxTQUFTLElBQUl0QixZQUFKLENBQWlCZSxTQUFqQixFQUE0QkMsU0FBNUIsQ0FBZjs7QUFFQSxZQUFNTyxPQUFPLHVCQUFhRCxNQUFiLEVBQXFCLEVBQUNFLE9BQU8sR0FBUixFQUFhQyxRQUFRZixXQUFyQixFQUFrQ2dCLFFBQVEsU0FBMUMsRUFBcURDLFlBQVksS0FBakUsRUFBckIsQ0FBYjtBQUNBLFlBQU1DLFlBQVksSUFBSTNCLFFBQUosQ0FBYXFCLE1BQWIsRUFBcUIsRUFBQ08sZ0JBQWdCakIsWUFBWVcsS0FBS08sS0FBTCxDQUFXQyxJQUFYLENBQWdCUixJQUFoQixDQUE3QixFQUFyQixDQUFsQjs7QUFFQUssZ0JBQVVJLFdBQVYsR0FBd0JsQixpQkFBaUIsSUFBakIsR0FBd0JBLGdCQUFnQixHQUF4QyxHQUE4QyxFQUF0RTs7QUFFQSxVQUFJSixXQUFKLEVBQWlCO0FBQ2ZrQixrQkFBVWxCLFdBQVYsR0FBd0JBLFdBQXhCO0FBQ0Q7O0FBRUQsWUFBTXVCLGFBQWFMLFVBQVVNLFFBQVYsRUFBbkI7O0FBRUEsYUFBTyxFQUFDRCxVQUFELEVBQWFsQixTQUFiLEVBQXdCQyxTQUF4QixFQUFQO0FBNUNpTTtBQTZDbE07QUE5Q2lDO2tCQUFmZCxjIiwiZmlsZSI6InNjaGVtYS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTY2hlbWEgZnJvbSAnZnVsY3J1bS1zY2hlbWEvZGlzdC9zY2hlbWEnO1xuaW1wb3J0IE1ldGFkYXRhIGZyb20gJ2Z1bGNydW0tc2NoZW1hL2Rpc3QvbWV0YWRhdGEnO1xuaW1wb3J0IHNxbGRpZmYgZnJvbSAnc3FsZGlmZic7XG5pbXBvcnQgUEdTY2hlbWEgZnJvbSAnLi9wb3N0Z3Jlcy1zY2hlbWEnO1xuXG5jb25zdCB7U2NoZW1hRGlmZmVyLCBQb3N0Z3Jlc30gPSBzcWxkaWZmO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb3N0Z3Jlc1NjaGVtYSB7XG4gIHN0YXRpYyBhc3luYyBnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwge2Rpc2FibGVBcnJheXMsIGRpc2FibGVDb21wbGV4VHlwZXMsIHVzZXJNb2R1bGUsIHRhYmxlU2NoZW1hLCBjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0LCBtZXRhZGF0YSwgdXNlUmVzb3VyY2VJRCwgYWNjb3VudFByZWZpeH0pIHtcbiAgICBsZXQgb2xkU2NoZW1hID0gbnVsbDtcbiAgICBsZXQgbmV3U2NoZW1hID0gbnVsbDtcblxuICAgIFBHU2NoZW1hLmRpc2FibGVBcnJheXMgPSBkaXNhYmxlQXJyYXlzO1xuICAgIFBHU2NoZW1hLmRpc2FibGVDb21wbGV4VHlwZXMgPSBkaXNhYmxlQ29tcGxleFR5cGVzO1xuICAgIFBHU2NoZW1hLmNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQgPSBjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0O1xuXG4gICAgaWYgKHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS51cGRhdGVTY2hlbWEgJiYgIVBHU2NoZW1hLl9tb2RpZmllZCkge1xuICAgICAgdXNlck1vZHVsZS51cGRhdGVTY2hlbWEoUEdTY2hlbWEpO1xuXG4gICAgICBQR1NjaGVtYS5fbW9kaWZpZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh1c2VSZXNvdXJjZUlEKSB7XG4gICAgICBpZiAob2xkRm9ybSkge1xuICAgICAgICBvbGRGb3JtLnJvd19pZCA9IG9sZEZvcm0uaWQ7XG4gICAgICB9XG4gICAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgICBuZXdGb3JtLnJvd19pZCA9IG5ld0Zvcm0uaWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9sZEZvcm0pIHtcbiAgICAgIG9sZFNjaGVtYSA9IG5ldyBTY2hlbWEob2xkRm9ybSwgUEdTY2hlbWEsIHVzZXJNb2R1bGUgJiYgdXNlck1vZHVsZS5zY2hlbWFPcHRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgbmV3U2NoZW1hID0gbmV3IFNjaGVtYShuZXdGb3JtLCBQR1NjaGVtYSwgdXNlck1vZHVsZSAmJiB1c2VyTW9kdWxlLnNjaGVtYU9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpZmZlciA9IG5ldyBTY2hlbWFEaWZmZXIob2xkU2NoZW1hLCBuZXdTY2hlbWEpO1xuXG4gICAgY29uc3QgbWV0YSA9IG5ldyBNZXRhZGF0YShkaWZmZXIsIHtxdW90ZTogJ1wiJywgc2NoZW1hOiB0YWJsZVNjaGVtYSwgcHJlZml4OiAnc3lzdGVtXycsIHVzZUFsaWFzZXM6IGZhbHNlfSk7XG4gICAgY29uc3QgZ2VuZXJhdG9yID0gbmV3IFBvc3RncmVzKGRpZmZlciwge2FmdGVyVHJhbnNmb3JtOiBtZXRhZGF0YSAmJiBtZXRhLmJ1aWxkLmJpbmQobWV0YSl9KTtcblxuICAgIGdlbmVyYXRvci50YWJsZVByZWZpeCA9IGFjY291bnRQcmVmaXggIT0gbnVsbCA/IGFjY291bnRQcmVmaXggKyAnXycgOiAnJztcblxuICAgIGlmICh0YWJsZVNjaGVtYSkge1xuICAgICAgZ2VuZXJhdG9yLnRhYmxlU2NoZW1hID0gdGFibGVTY2hlbWE7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IGdlbmVyYXRvci5nZW5lcmF0ZSgpO1xuXG4gICAgcmV0dXJuIHtzdGF0ZW1lbnRzLCBvbGRTY2hlbWEsIG5ld1NjaGVtYX07XG4gIH1cbn1cbiJdfQ==