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
            type: 'string',
            default: 'public'
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
        yield _this5.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this5.pgdb.ident(fulcrum.args.pgschema), _this5.pgdb.ident(viewName)));
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
        yield _this6.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this6.pgdb.ident(fulcrum.args.pgschema), _this6.pgdb.ident(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        // sometimes it doesn't exist
      }
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJpbmRleCIsImZpbmRFYWNoUmVjb3JkIiwicmVjb3JkIiwiZ2V0Rm9ybSIsInByb2Nlc3MiLCJzdGRvdXQiLCJjbGVhckxpbmUiLCJjdXJzb3JUbyIsIndyaXRlIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJ1cGRhdGVSZWNvcmQiLCJjb25zb2xlIiwibG9nIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvblJlY29yZFNhdmUiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsIm1hcCIsIm8iLCJqb2luIiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwib25Qcm9qZWN0U2F2ZSIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdkYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdob3N0IiwicGdwb3J0IiwicGd1c2VyIiwicGdwYXNzd29yZCIsInBnc2NoZW1hIiwicmVxdWlyZWQiLCJoYW5kbGVyIiwib3B0aW9ucyIsInVzZXIiLCJwYXNzd29yZCIsIlBvb2wiLCJvbiIsImRlYWN0aXZhdGUiLCJlbmQiLCJ2aWV3TmFtZSIsImRhdGFOYW1lIiwiaWRlbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxNQUFNQSxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O2tCQVFlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBNENuQkMsVUE1Q21CLHFCQTRDTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFlBQU1DLFVBQVUsTUFBTUMsUUFBUUMsWUFBUixDQUFxQkQsUUFBUUUsSUFBUixDQUFhQyxHQUFsQyxDQUF0Qjs7QUFFQSxVQUFJSixPQUFKLEVBQWE7QUFDWCxjQUFNSyxRQUFRLE1BQU1MLFFBQVFNLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsYUFBSyxNQUFNQyxJQUFYLElBQW1CRixLQUFuQixFQUEwQjtBQUN4QixnQkFBTSxNQUFLRyxrQkFBTCxDQUF3QkQsSUFBeEIsRUFBOEJQLE9BQTlCLENBQU47O0FBRUEsY0FBSVMsUUFBUSxDQUFaOztBQUVBLGdCQUFNRixLQUFLRyxjQUFMLENBQW9C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WUFBTStCLFdBQVcvQixhQUFjLEdBQUU1RCxLQUFLVyxJQUFLLE1BQUtpRCxXQUFXZ0MsUUFBUyxFQUFuRCxHQUF1RDVGLEtBQUtXLElBQTdFOztBQUVBLFVBQUk7QUFDRixjQUFNLE9BQUtRLEdBQUwsQ0FBUyxrQkFBTyw0QkFBUCxFQUFxQyxPQUFLc0IsSUFBTCxDQUFVb0QsS0FBVixDQUFnQm5HLFFBQVFFLElBQVIsQ0FBYXFGLFFBQTdCLENBQXJDLEVBQTZFLE9BQUt4QyxJQUFMLENBQVVvRCxLQUFWLENBQWdCRixRQUFoQixDQUE3RSxDQUFULENBQU47QUFDRCxPQUZELENBRUUsT0FBT2xDLEVBQVAsRUFBVztBQUNYO0FBQ0Q7QUFQc0M7QUFReEM7O0FBRUtLLG9CQUFOLENBQXlCOUQsSUFBekIsRUFBK0I0RCxVQUEvQixFQUEyQztBQUFBOztBQUFBO0FBQ3pDLFlBQU0rQixXQUFXL0IsYUFBYyxHQUFFNUQsS0FBS1csSUFBSyxNQUFLaUQsV0FBV2dDLFFBQVMsRUFBbkQsR0FBdUQ1RixLQUFLVyxJQUE3RTs7QUFFQSxVQUFJO0FBQ0YsY0FBTSxPQUFLUSxHQUFMLENBQVMsa0JBQU8sa0RBQVAsRUFDTyxPQUFLc0IsSUFBTCxDQUFVb0QsS0FBVixDQUFnQm5HLFFBQVFFLElBQVIsQ0FBYXFGLFFBQTdCLENBRFAsRUFFTyxPQUFLeEMsSUFBTCxDQUFVb0QsS0FBVixDQUFnQkYsUUFBaEIsQ0FGUCxFQUdPLDJDQUFxQnBDLGlCQUFyQixDQUF1Q3ZELElBQXZDLEVBQTZDNEQsVUFBN0MsQ0FIUCxDQUFULENBQU47QUFJRCxPQUxELENBS0UsT0FBT0gsRUFBUCxFQUFXO0FBQ1g7QUFDRDtBQVZ3QztBQVcxQzs7QUExUGtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdkYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ2hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdwb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ3VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ3Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnc2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiAncHVibGljJ1xuICAgICAgICB9LFxuICAgICAgICBvcmc6IHtcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG5cbiAgICAgICAgbGV0IGluZGV4ID0gMDtcblxuICAgICAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICAgICAgYXdhaXQgcmVjb3JkLmdldEZvcm0oKTtcblxuICAgICAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShmb3JtLm5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkICsgJyByZWNvcmRzJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShmb3JtLm5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkICsgJyByZWNvcmRzJyk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgdGhpcy5hcmdzLm9yZyk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGUoKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLlBPU1RHUkVTX0NPTkZJRyxcbiAgICAgIGhvc3Q6IGZ1bGNydW0uYXJncy5wZ2hvc3QgfHwgUE9TVEdSRVNfQ09ORklHLmhvc3QsXG4gICAgICBwb3J0OiBmdWxjcnVtLmFyZ3MucGdwb3J0IHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ2RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZSxcbiAgICAgIHVzZXI6IGZ1bGNydW0uYXJncy5wZ3VzZXIgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXIsXG4gICAgICBwYXNzd29yZDogZnVsY3J1bS5hcmdzLnBncGFzc3dvcmQgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXJcbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ3VzZXIpIHtcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5wZ3VzZXI7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ3Bhc3N3b3JkKSB7XG4gICAgICBvcHRpb25zLnBhc3N3b3JkID0gZnVsY3J1bS5hcmdzLnBncGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgdGhpcy5wb29sID0gbmV3IHBnLlBvb2wob3B0aW9ucyk7XG5cbiAgICAvLyBmdWxjcnVtLm9uKCdjaG9pY2VfbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAvLyBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbl9zZXQ6c2F2ZScsIHRoaXMub25DbGFzc2lmaWNhdGlvblNldFNhdmUpO1xuICAgIC8vIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgZnVsY3J1bS5vbignZm9ybTpzYXZlJywgdGhpcy5vbkZvcm1TYXZlKTtcbiAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcbiAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6ZGVsZXRlJywgdGhpcy5vblJlY29yZERlbGV0ZSk7XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0pO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMocmVjb3JkLmZvcm0sIGFjY291bnQpO1xuICAgICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMudXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMucGdkYi5pZGVudChmdWxjcnVtLmFyZ3MucGdzY2hlbWEpLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzX3ZpZXdfZnVsbDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudChmdWxjcnVtLmFyZ3MucGdzY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxufVxuIl19