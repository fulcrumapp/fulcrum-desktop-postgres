'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

var _util = require('util');

var _schema = require('./schema');

var _schema2 = _interopRequireDefault(_schema);

var _fulcrumDesktopPlugin = require('fulcrum-desktop-plugin');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const POSTGRES_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
};

exports.default = class {
  constructor() {
    var _this = this;

    this.runCommand = _asyncToGenerator(function* () {
      yield _this.activate();

      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (account) {
        const forms = yield account.findActiveForms({});

        for (const form of forms) {
          try {
            yield _this.updateForm(form, account, _this.formVersion(form), null);
          } catch (ex) {
            // ignore errors
          }

          yield _this.updateForm(form, account, null, _this.formVersion(form));

          yield form.findEachRecord({}, (() => {
            var _ref2 = _asyncToGenerator(function* (record) {
              yield record.getForm();

              process.stdout.write('.');

              yield _this.updateRecord(record);
            });

            return function (_x) {
              return _ref2.apply(this, arguments);
            };
          })());
        }
      } else {
        console.error('Unable to find account', _this.args.org);
      }
    });

    this.run = sql => {
      sql = sql.replace(/\0/g, '');

      if (fulcrum.args.debug) {
        console.log(sql);
      }

      return new Promise((resolve, reject) => {
        this.pool.query(sql, [], (err, res) => {
          if (err) {
            return reject(err);
          }

          return resolve(res.rows);
        });
      });
    };

    this.log = (...args) => {
      // console.log(...args);
    };

    this.tableName = (account, name) => {
      return 'account_' + account.rowID + '_' + name;
    };

    this.onFormSave = (() => {
      var _ref3 = _asyncToGenerator(function* ({ form, account, oldForm, newForm }) {
        yield _this.updateForm(form, account, oldForm, newForm);
      });

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    })();

    this.onRecordSave = (() => {
      var _ref4 = _asyncToGenerator(function* ({ record }) {
        yield _this.updateRecord(record);
      });

      return function (_x3) {
        return _ref4.apply(this, arguments);
      };
    })();

    this.onRecordDelete = (() => {
      var _ref5 = _asyncToGenerator(function* ({ record }) {
        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.deleteForRecordStatements(_this.pgdb, record, record.form);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x4) {
        return _ref5.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref6 = _asyncToGenerator(function* ({ object }) {});

      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref7 = _asyncToGenerator(function* ({ object }) {});

      return function (_x6) {
        return _ref7.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref8 = _asyncToGenerator(function* ({ object }) {});

      return function (_x7) {
        return _ref8.apply(this, arguments);
      };
    })();

    this.updateRecord = (() => {
      var _ref9 = _asyncToGenerator(function* (record) {
        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.updateForRecordStatements(_this.pgdb, record);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x8) {
        return _ref9.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref10 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        const rootTableName = _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form);

        if (_this.tableNames.indexOf(rootTableName) === -1) {
          oldForm = null;
        }

        const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm);

        yield _this.dropFriendlyView(form, null);

        for (const repeatable of form.elementsOfType('Repeatable')) {
          yield _this.dropFriendlyView(form, repeatable);
        }

        yield _this.run(statements.join('\n'));

        yield _this.createFriendlyView(form, null);

        for (const repeatable of form.elementsOfType('Repeatable')) {
          yield _this.createFriendlyView(form, repeatable);
        }
      });

      return function (_x9, _x10, _x11, _x12) {
        return _ref10.apply(this, arguments);
      };
    })();

    this.formVersion = form => {
      if (form == null) {
        return null;
      }

      return {
        id: form._id,
        row_id: form.rowID,
        name: form._name,
        elements: form._elementsJSON
      };
    };
  }

  task(cli) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'postgres',
        desc: 'run the postgres sync for a specific organization',
        builder: {
          pgdatabase: {
            desc: 'postgresql database name',
            type: 'string',
            default: POSTGRES_CONFIG.database
          },
          pghost: {
            desc: 'postgresql server host',
            type: 'string',
            default: POSTGRES_CONFIG.host
          },
          pgport: {
            desc: 'postgresql server port',
            type: 'integer',
            default: POSTGRES_CONFIG.port
          },
          org: {
            desc: 'organization name',
            required: true,
            type: 'string'
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

  activate() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      return;
      _this3.pool = new _pg2.default.Pool(_extends({}, POSTGRES_CONFIG, {
        host: fulcrum.args.pghost || POSTGRES_CONFIG.host,
        port: fulcrum.args.pgport || POSTGRES_CONFIG.port,
        database: fulcrum.args.pgdatabase || POSTGRES_CONFIG.database
      }));

      // fulcrum.on('choice_list:save', this.onChoiceListSave);
      // fulcrum.on('classification_set:save', this.onClassificationSetSave);
      // fulcrum.on('project:save', this.onProjectSave);
      fulcrum.on('form:save', _this3.onFormSave);
      fulcrum.on('record:save', _this3.onRecordSave);
      fulcrum.on('record:delete', _this3.onRecordDelete);

      // Fetch all the existing tables on startup. This allows us to special case the
      // creation of new tables even when the form isn't version 1. If the table doesn't
      // exist, we can pretend the form is version 1 so it creates all new tables instead
      // of applying a schema diff.
      const rows = yield _this3.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this3.tableNames = rows.map(function (o) {
        return o.name;
      });

      // make a client so we can use it to build SQL statements
      _this3.pgdb = new _fulcrumDesktopPlugin.Postgres({});
    })();
  }

  deactivate() {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (_this4.pool) {
        yield _this4.pool.end();
      }
    })();
  }

  dropFriendlyView(form, repeatable) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const viewName = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

      yield _this5.run((0, _util.format)('DROP VIEW IF EXISTS %s', _this5.pgdb.ident(viewName)));
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const viewName = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

      yield _this6.run((0, _util.format)('CREATE VIEW %s AS SELECT * FROM %s_view_full', _this6.pgdb.ident(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJ1cGRhdGVGb3JtIiwiZm9ybVZlcnNpb24iLCJleCIsImZpbmRFYWNoUmVjb3JkIiwicmVjb3JkIiwiZ2V0Rm9ybSIsInByb2Nlc3MiLCJzdGRvdXQiLCJ3cml0ZSIsInVwZGF0ZVJlY29yZCIsImNvbnNvbGUiLCJlcnJvciIsInJ1biIsInNxbCIsInJlcGxhY2UiLCJkZWJ1ZyIsImxvZyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicG9vbCIsInF1ZXJ5IiwiZXJyIiwicmVzIiwicm93cyIsInRhYmxlTmFtZSIsIm5hbWUiLCJyb3dJRCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsIm9uUmVjb3JkU2F2ZSIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJwZ2RiIiwibWFwIiwibyIsImpvaW4iLCJvbkNob2ljZUxpc3RTYXZlIiwib2JqZWN0Iiwib25DbGFzc2lmaWNhdGlvblNldFNhdmUiLCJvblByb2plY3RTYXZlIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInJvb3RUYWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsInRhYmxlTmFtZXMiLCJpbmRleE9mIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdkYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdob3N0IiwicGdwb3J0IiwicmVxdWlyZWQiLCJoYW5kbGVyIiwiUG9vbCIsIm9uIiwiZGVhY3RpdmF0ZSIsImVuZCIsInZpZXdOYW1lIiwiZGF0YU5hbWUiLCJpZGVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLE1BQU1BLGtCQUFrQjtBQUN0QkMsWUFBVSxZQURZO0FBRXRCQyxRQUFNLFdBRmdCO0FBR3RCQyxRQUFNLElBSGdCO0FBSXRCQyxPQUFLLEVBSmlCO0FBS3RCQyxxQkFBbUI7QUFMRyxDQUF4Qjs7a0JBUWUsTUFBTTtBQUFBO0FBQUE7O0FBQUEsU0ErQm5CQyxVQS9CbUIscUJBK0JOLGFBQVk7QUFDdkIsWUFBTSxNQUFLQyxRQUFMLEVBQU47O0FBRUEsWUFBTUMsVUFBVSxNQUFNQyxRQUFRQyxZQUFSLENBQXFCRCxRQUFRRSxJQUFSLENBQWFDLEdBQWxDLENBQXRCOztBQUVBLFVBQUlKLE9BQUosRUFBYTtBQUNYLGNBQU1LLFFBQVEsTUFBTUwsUUFBUU0sZUFBUixDQUF3QixFQUF4QixDQUFwQjs7QUFFQSxhQUFLLE1BQU1DLElBQVgsSUFBbUJGLEtBQW5CLEVBQTBCO0FBQ3hCLGNBQUk7QUFDRixrQkFBTSxNQUFLRyxVQUFMLENBQWdCRCxJQUFoQixFQUFzQlAsT0FBdEIsRUFBK0IsTUFBS1MsV0FBTCxDQUFpQkYsSUFBakIsQ0FBL0IsRUFBdUQsSUFBdkQsQ0FBTjtBQUNELFdBRkQsQ0FFRSxPQUFPRyxFQUFQLEVBQVc7QUFDWDtBQUNEOztBQUVELGdCQUFNLE1BQUtGLFVBQUwsQ0FBZ0JELElBQWhCLEVBQXNCUCxPQUF0QixFQUErQixJQUEvQixFQUFxQyxNQUFLUyxXQUFMLENBQWlCRixJQUFqQixDQUFyQyxDQUFOOztBQUVBLGdCQUFNQSxLQUFLSSxjQUFMLENB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N0U7O0FBRUEsWUFBTSxPQUFLZCxHQUFMLENBQVMsa0JBQU8sd0JBQVAsRUFBaUMsT0FBS3VCLElBQUwsQ0FBVTBDLEtBQVYsQ0FBZ0JGLFFBQWhCLENBQWpDLENBQVQsQ0FBTjtBQUh1QztBQUl4Qzs7QUFFS3ZCLG9CQUFOLENBQXlCckQsSUFBekIsRUFBK0JtRCxVQUEvQixFQUEyQztBQUFBOztBQUFBO0FBQ3pDLFlBQU15QixXQUFXekIsYUFBYyxHQUFFbkQsS0FBSzJCLElBQUssTUFBS3dCLFdBQVcwQixRQUFTLEVBQW5ELEdBQXVEN0UsS0FBSzJCLElBQTdFOztBQUVBLFlBQU0sT0FBS2QsR0FBTCxDQUFTLGtCQUFPLDhDQUFQLEVBQ08sT0FBS3VCLElBQUwsQ0FBVTBDLEtBQVYsQ0FBZ0JGLFFBQWhCLENBRFAsRUFFTywyQ0FBcUI5QixpQkFBckIsQ0FBdUM5QyxJQUF2QyxFQUE2Q21ELFVBQTdDLENBRlAsQ0FBVCxDQUFOO0FBSHlDO0FBTTFDOztBQTFMa0IsQyIsImZpbGUiOiJwbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGcgZnJvbSAncGcnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUG9zdGdyZXNTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgUG9zdGdyZXNSZWNvcmRWYWx1ZXMsIFBvc3RncmVzIH0gZnJvbSAnZnVsY3J1bSc7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ2RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnaG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ3BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAvLyBpZ25vcmUgZXJyb3JzXG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG5cbiAgICAgICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHJlY29yZC5nZXRGb3JtKCk7XG5cbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnLicpO1xuXG4gICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCB0aGlzLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICByZXR1cm47XG4gICAgdGhpcy5wb29sID0gbmV3IHBnLlBvb2woe1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnaG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ3BvcnQgIHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ2RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgIH0pO1xuXG4gICAgLy8gZnVsY3J1bS5vbignY2hvaWNlX2xpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb25fc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAvLyBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgZnVsY3J1bS5vbigncmVjb3JkOnNhdmUnLCB0aGlzLm9uUmVjb3JkU2F2ZSk7XG4gICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgfVxuXG4gIG9uRm9ybVNhdmUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm19KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuICB9XG5cbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkKTtcbiAgfVxuXG4gIG9uUmVjb3JkRGVsZXRlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHJlY29yZC5mb3JtKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIG9uQ2hvaWNlTGlzdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uQ2xhc3NpZmljYXRpb25TZXRTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICBvblByb2plY3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgY29uc3Qgcm9vdFRhYmxlTmFtZSA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pO1xuXG4gICAgaWYgKHRoaXMudGFibGVOYW1lcy5pbmRleE9mKHJvb3RUYWJsZU5hbWUpID09PSAtMSkge1xuICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMnLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gIH1cblxuICBhc3luYyBjcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlKSkpO1xuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cbn1cbiJdfQ==