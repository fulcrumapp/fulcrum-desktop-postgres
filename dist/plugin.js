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
          yield _this.recreateFormTables(form, account);

          let index = 0;

          yield form.findEachRecord({}, (() => {
            var _ref2 = _asyncToGenerator(function* (record) {
              yield record.getForm();

              if (++index % 10 === 0) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(form.name.green + ' : ' + index.toString().red + ' records');
              }

              yield _this.updateRecord(record, account, true);
            });

            return function (_x) {
              return _ref2.apply(this, arguments);
            };
          })());

          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(form.name.green + ' : ' + index.toString().red + ' records');

          console.log('');
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
      var _ref4 = _asyncToGenerator(function* ({ record, account }) {
        yield _this.updateRecord(record, account);
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

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });

    this.updateRecord = (() => {
      var _ref10 = _asyncToGenerator(function* (record, account, skipTableCheck) {
        if (!skipTableCheck && !_this.rootTableExists(record.form)) {
          yield _this.recreateFormTables(record.form, account);
          yield _this.reloadTableList();
        }

        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.updateForRecordStatements(_this.pgdb, record);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x8, _x9, _x10) {
        return _ref10.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref11 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            console.error(sql);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x11, _x12) {
        return _ref11.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref12 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        if (!_this.rootTableExists(form) && newForm != null) {
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

      return function (_x13, _x14, _x15, _x16) {
        return _ref12.apply(this, arguments);
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

      try {
        yield _this5.run((0, _util.format)('DROP VIEW IF EXISTS %s;', _this5.pgdb.ident(viewName)));
      } catch (ex) {
        // sometimes it doesn't exist
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const viewName = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

      try {
        yield _this6.run((0, _util.format)('CREATE VIEW %s AS SELECT * FROM %s_view_full;', _this6.pgdb.ident(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        // sometimes it doesn't exist
      }
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJpbmRleCIsImZpbmRFYWNoUmVjb3JkIiwicmVjb3JkIiwiZ2V0Rm9ybSIsInByb2Nlc3MiLCJzdGRvdXQiLCJjbGVhckxpbmUiLCJjdXJzb3JUbyIsIndyaXRlIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJ1cGRhdGVSZWNvcmQiLCJjb25zb2xlIiwibG9nIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvblJlY29yZFNhdmUiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsIm1hcCIsIm8iLCJqb2luIiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwib25Qcm9qZWN0U2F2ZSIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdkYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdob3N0IiwicGdwb3J0IiwicmVxdWlyZWQiLCJoYW5kbGVyIiwiUG9vbCIsIm9uIiwiZGVhY3RpdmF0ZSIsImVuZCIsInZpZXdOYW1lIiwiZGF0YU5hbWUiLCJpZGVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLE1BQU1BLGtCQUFrQjtBQUN0QkMsWUFBVSxZQURZO0FBRXRCQyxRQUFNLFdBRmdCO0FBR3RCQyxRQUFNLElBSGdCO0FBSXRCQyxPQUFLLEVBSmlCO0FBS3RCQyxxQkFBbUI7QUFMRyxDQUF4Qjs7a0JBUWUsTUFBTTtBQUFBO0FBQUE7O0FBQUEsU0ErQm5CQyxVQS9CbUIscUJBK0JOLGFBQVk7QUFDdkIsWUFBTSxNQUFLQyxRQUFMLEVBQU47O0FBRUEsWUFBTUMsVUFBVSxNQUFNQyxRQUFRQyxZQUFSLENBQXFCRCxRQUFRRSxJQUFSLENBQWFDLEdBQWxDLENBQXRCOztBQUVBLFVBQUlKLE9BQUosRUFBYTtBQUNYLGNBQU1LLFFBQVEsTUFBTUwsUUFBUU0sZUFBUixDQUF3QixFQUF4QixDQUFwQjs7QUFFQSxhQUFLLE1BQU1DLElBQVgsSUFBbUJGLEtBQW5CLEVBQTBCO0FBQ3hCLGdCQUFNLE1BQUtHLGtCQUFMLENBQXdCRCxJQUF4QixFQUE4QlAsT0FBOUIsQ0FBTjs7QUFFQSxjQUFJUyxRQUFRLENBQVo7O0FBRUEsZ0JBQU1GLEtBQUtHLGNBQUwsQ0FBb0IsRUFBcEI7QUFBQSwwQ0FBd0IsV0FBT0MsTUFBUCxFQUFrQjtBQUM5QyxvQkFBTUEsT0FBT0MsT0FBUCxF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O0FBVHdDO0FBVTFDOztBQWhPa0IsQyIsImZpbGUiOiJwbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGcgZnJvbSAncGcnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUG9zdGdyZXNTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgUG9zdGdyZXNSZWNvcmRWYWx1ZXMsIFBvc3RncmVzIH0gZnJvbSAnZnVsY3J1bSc7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ2RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnaG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ3BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcblxuICAgICAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgICAgICBhd2FpdCByZWNvcmQuZ2V0Rm9ybSgpO1xuXG4gICAgICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcblxuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCB0aGlzLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICB0aGlzLnBvb2wgPSBuZXcgcGcuUG9vbCh7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdob3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBncG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdkYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICB9KTtcblxuICAgIC8vIGZ1bGNydW0ub24oJ2Nob2ljZV9saXN0OnNhdmUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuICAgIC8vIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uX3NldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbigncHJvamVjdDpzYXZlJywgdGhpcy5vblByb2plY3RTYXZlKTtcbiAgICBmdWxjcnVtLm9uKCdmb3JtOnNhdmUnLCB0aGlzLm9uRm9ybVNhdmUpO1xuICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcblxuICAgIC8vIEZldGNoIGFsbCB0aGUgZXhpc3RpbmcgdGFibGVzIG9uIHN0YXJ0dXAuIFRoaXMgYWxsb3dzIHVzIHRvIHNwZWNpYWwgY2FzZSB0aGVcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XG4gICAgLy8gZXhpc3QsIHdlIGNhbiBwcmV0ZW5kIHRoZSBmb3JtIGlzIHZlcnNpb24gMSBzbyBpdCBjcmVhdGVzIGFsbCBuZXcgdGFibGVzIGluc3RlYWRcbiAgICAvLyBvZiBhcHBseWluZyBhIHNjaGVtYSBkaWZmLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhyZWNvcmQuZm9ybSwgYWNjb3VudCk7XG4gICAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG5cbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5qb2luKCdcXG4nKSk7XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXM7JywgdGhpcy5wZ2RiLmlkZW50KHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSByZXBlYXRhYmxlID8gYCR7Zm9ybS5uYW1lfSAtICR7cmVwZWF0YWJsZS5kYXRhTmFtZX1gIDogZm9ybS5uYW1lO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cbn1cbiJdfQ==