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
          yield _this.rebuildForm(form, account, function (index) {
            _this.updateStatus(form.name.green + ' : ' + index.toString().red + ' records');
          });

          console.log('');
        }
      } else {
        console.error('Unable to find account', fulcrum.args.org);
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
      var _ref2 = _asyncToGenerator(function* ({ form, account, oldForm, newForm }) {
        yield _this.updateForm(form, account, oldForm, newForm);
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })();

    this.onRecordSave = (() => {
      var _ref3 = _asyncToGenerator(function* ({ record, account }) {
        yield _this.updateRecord(record, account);
      });

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    })();

    this.onRecordDelete = (() => {
      var _ref4 = _asyncToGenerator(function* ({ record }) {
        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.deleteForRecordStatements(_this.pgdb, record, record.form);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x3) {
        return _ref4.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref5 = _asyncToGenerator(function* ({ object }) {});

      return function (_x4) {
        return _ref5.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref6 = _asyncToGenerator(function* ({ object }) {});

      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref7 = _asyncToGenerator(function* ({ object }) {});

      return function (_x6) {
        return _ref7.apply(this, arguments);
      };
    })();

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });

    this.updateRecord = (() => {
      var _ref9 = _asyncToGenerator(function* (record, account, skipTableCheck) {
        if (!skipTableCheck && !_this.rootTableExists(record.form)) {
          yield _this.rebuildForm(record.form, account, function () {});
        }

        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.updateForRecordStatements(_this.pgdb, record);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x7, _x8, _x9) {
        return _ref9.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref10 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            console.error(sql);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x10, _x11) {
        return _ref10.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref11 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
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

      return function (_x12, _x13, _x14, _x15) {
        return _ref11.apply(this, arguments);
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

    this.updateStatus = message => {
      if (process.stdout.isTTY) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(message);
      }
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
          pguser: {
            desc: 'postgresql user',
            type: 'string'
          },
          pgpassword: {
            desc: 'postgresql password',
            type: 'string'
          },
          pgschema: {
            desc: 'postgresql schema',
            type: 'string'
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
      const options = _extends({}, POSTGRES_CONFIG, {
        host: fulcrum.args.pghost || POSTGRES_CONFIG.host,
        port: fulcrum.args.pgport || POSTGRES_CONFIG.port,
        database: fulcrum.args.pgdatabase || POSTGRES_CONFIG.database,
        user: fulcrum.args.pguser || POSTGRES_CONFIG.user,
        password: fulcrum.args.pgpassword || POSTGRES_CONFIG.user
      });

      if (fulcrum.args.pguser) {
        options.user = fulcrum.args.pguser;
      }

      if (fulcrum.args.pgpassword) {
        options.password = fulcrum.args.pgpassword;
      }

      _this3.pool = new _pg2.default.Pool(options);

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

      _this3.dataSchema = fulcrum.args.pgschema || 'public';
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
        yield _this5.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this5.pgdb.ident(_this5.dataSchema), _this5.pgdb.ident(viewName)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const viewName = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

      try {
        yield _this6.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this6.pgdb.ident(_this6.dataSchema), _this6.pgdb.ident(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
      }
    })();
  }

  rebuildForm(form, account, progress) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      yield _this7.recreateFormTables(form, account);
      yield _this7.reloadTableList();

      let index = 0;

      yield form.findEachRecord({}, (() => {
        var _ref12 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this7.updateRecord(record, account, true);
        });

        return function (_x16) {
          return _ref12.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsIm1hcCIsIm8iLCJqb2luIiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwib25Qcm9qZWN0U2F2ZSIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ2RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ2hvc3QiLCJwZ3BvcnQiLCJwZ3VzZXIiLCJwZ3Bhc3N3b3JkIiwicGdzY2hlbWEiLCJyZXF1aXJlZCIsImhhbmRsZXIiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsImRlYWN0aXZhdGUiLCJlbmQiLCJ2aWV3TmFtZSIsImRhdGFOYW1lIiwiaWRlbnQiLCJwcm9ncmVzcyIsImZpbmRFYWNoUmVjb3JkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsTUFBTUEsa0JBQWtCO0FBQ3RCQyxZQUFVLFlBRFk7QUFFdEJDLFFBQU0sV0FGZ0I7QUFHdEJDLFFBQU0sSUFIZ0I7QUFJdEJDLE9BQUssRUFKaUI7QUFLdEJDLHFCQUFtQjtBQUxHLENBQXhCOztrQkFRZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQTJDbkJDLFVBM0NtQixxQkEyQ04sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxZQUFNQyxVQUFVLE1BQU1DLFFBQVFDLFlBQVIsQ0FBcUJELFFBQVFFLElBQVIsQ0FBYUMsR0FBbEMsQ0FBdEI7O0FBRUEsVUFBSUosT0FBSixFQUFhO0FBQ1gsY0FBTUssUUFBUSxNQUFNTCxRQUFRTSxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLGFBQUssTUFBTUMsSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEIsZ0JBQU0sTUFBS0csV0FBTCxDQUFpQkQsSUFBakIsRUFBdUJQLE9B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LEVBQWtCO0FBQzlDQSxpQkFBTzlCLElBQVAsR0FBY0EsSUFBZDs7QUFFQSxjQUFJLEVBQUVFLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCK0YscUJBQVMvRixLQUFUO0FBQ0Q7O0FBRUQsZ0JBQU0sT0FBSzZCLFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCckMsT0FBMUIsRUFBbUMsSUFBbkMsQ0FBTjtBQUNELFNBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFVQXdHLGVBQVMvRixLQUFUO0FBaEJ5QztBQWlCMUM7O0FBbFFrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcblxuY29uc3QgUE9TVEdSRVNfQ09ORklHID0ge1xuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxuICBob3N0OiAnbG9jYWxob3N0JyxcbiAgcG9ydDogNTQzMixcbiAgbWF4OiAxMCxcbiAgaWRsZVRpbWVvdXRNaWxsaXM6IDMwMDAwXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGFzeW5jIHRhc2soY2xpKSB7XG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICdwb3N0Z3JlcycsXG4gICAgICBkZXNjOiAncnVuIHRoZSBwb3N0Z3JlcyBzeW5jIGZvciBhIHNwZWNpZmljIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIHBnZGF0YWJhc2U6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBkYXRhYmFzZSBuYW1lJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdob3N0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIGhvc3QnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIHBncG9ydDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBwb3J0JyxcbiAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLnBvcnRcbiAgICAgICAgfSxcbiAgICAgICAgcGd1c2VyOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgdXNlcicsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdwYXNzd29yZDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHBhc3N3b3JkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ3NjaGVtYToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKGluZGV4KSA9PiB7XG4gICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnaG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ3BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnZGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBndXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdwYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBndXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBndXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBncGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdwYXNzd29yZDtcbiAgICB9XG5cbiAgICB0aGlzLnBvb2wgPSBuZXcgcGcuUG9vbChvcHRpb25zKTtcblxuICAgIC8vIGZ1bGNydW0ub24oJ2Nob2ljZV9saXN0OnNhdmUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuICAgIC8vIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uX3NldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbigncHJvamVjdDpzYXZlJywgdGhpcy5vblByb2plY3RTYXZlKTtcbiAgICBmdWxjcnVtLm9uKCdmb3JtOnNhdmUnLCB0aGlzLm9uRm9ybVNhdmUpO1xuICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcblxuICAgIC8vIEZldGNoIGFsbCB0aGUgZXhpc3RpbmcgdGFibGVzIG9uIHN0YXJ0dXAuIFRoaXMgYWxsb3dzIHVzIHRvIHNwZWNpYWwgY2FzZSB0aGVcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XG4gICAgLy8gZXhpc3QsIHdlIGNhbiBwcmV0ZW5kIHRoZSBmb3JtIGlzIHZlcnNpb24gMSBzbyBpdCBjcmVhdGVzIGFsbCBuZXcgdGFibGVzIGluc3RlYWRcbiAgICAvLyBvZiBhcHBseWluZyBhIHNjaGVtYSBkaWZmLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMuZGF0YVNjaGVtYSA9IGZ1bGNydW0uYXJncy5wZ3NjaGVtYSB8fCAncHVibGljJztcbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0pO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG5cbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5qb2luKCdcXG4nKSk7XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXM7JywgdGhpcy5wZ2RiLmlkZW50KHRoaXMuZGF0YVNjaGVtYSksIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzX3ZpZXdfZnVsbDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcyhpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBwcm9ncmVzcyhpbmRleCk7XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG59XG4iXX0=