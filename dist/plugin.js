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
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(form.name.green + ' : ' + index.toString().red + ' records');
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
          yield _this.recreateFormTables(record.form, account);
          yield _this.reloadTableList();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwicHJvY2VzcyIsInN0ZG91dCIsImNsZWFyTGluZSIsImN1cnNvclRvIiwid3JpdGUiLCJuYW1lIiwiZ3JlZW4iLCJ0b1N0cmluZyIsInJlZCIsImNvbnNvbGUiLCJsb2ciLCJlcnJvciIsInJ1biIsInNxbCIsInJlcGxhY2UiLCJkZWJ1ZyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicG9vbCIsInF1ZXJ5IiwiZXJyIiwicmVzIiwicm93cyIsInRhYmxlTmFtZSIsInJvd0lEIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uUmVjb3JkU2F2ZSIsInJlY29yZCIsInVwZGF0ZVJlY29yZCIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJwZ2RiIiwibWFwIiwibyIsImpvaW4iLCJvbkNob2ljZUxpc3RTYXZlIiwib2JqZWN0Iiwib25DbGFzc2lmaWNhdGlvblNldFNhdmUiLCJvblByb2plY3RTYXZlIiwicmVsb2FkVGFibGVMaXN0IiwidGFibGVOYW1lcyIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicmVjcmVhdGVGb3JtVGFibGVzIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsImluZGV4T2YiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsImZvcm1WZXJzaW9uIiwiZXgiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkcm9wRnJpZW5kbHlWaWV3IiwicmVwZWF0YWJsZSIsImVsZW1lbnRzT2ZUeXBlIiwiY3JlYXRlRnJpZW5kbHlWaWV3IiwiaWQiLCJfaWQiLCJyb3dfaWQiLCJfbmFtZSIsImVsZW1lbnRzIiwiX2VsZW1lbnRzSlNPTiIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ2RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ2hvc3QiLCJwZ3BvcnQiLCJwZ3VzZXIiLCJwZ3Bhc3N3b3JkIiwicGdzY2hlbWEiLCJyZXF1aXJlZCIsImhhbmRsZXIiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsImRlYWN0aXZhdGUiLCJlbmQiLCJ2aWV3TmFtZSIsImRhdGFOYW1lIiwiaWRlbnQiLCJwcm9ncmVzcyIsImZpbmRFYWNoUmVjb3JkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsTUFBTUEsa0JBQWtCO0FBQ3RCQyxZQUFVLFlBRFk7QUFFdEJDLFFBQU0sV0FGZ0I7QUFHdEJDLFFBQU0sSUFIZ0I7QUFJdEJDLE9BQUssRUFKaUI7QUFLdEJDLHFCQUFtQjtBQUxHLENBQXhCOztrQkFRZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQTJDbkJDLFVBM0NtQixxQkEyQ04sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxZQUFNQyxVQUFVLE1BQU1DLFFBQVFDLFlBQVIsQ0FBcUJELFFBQVFFLElBQVIsQ0FBYUMsR0FBbEMsQ0FBdEI7O0FBRUEsVUFBSUosT0FBSixFQUFhO0FBQ1gsY0FBTUssUUFBUSxNQUFNTCxRQUFRTSxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLGFBQUssTUFBTUMsSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEIsZ0JBQU0sTUFBS0csV0FBTCxDQUFpQkQsSUFBakIsRUFBdUJQLE9BQXZCLEVBQWdDLFVBQUNTLEtBQUQsRUFBVztBQUMvQ0Ms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cUJBQVM1RixLQUFUO0FBQ0Q7O0FBRUQsZ0JBQU0sT0FBS2lDLFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCekMsT0FBMUIsRUFBbUMsSUFBbkMsQ0FBTjtBQUNELFNBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFVQXFHLGVBQVM1RixLQUFUO0FBZnlDO0FBZ0IxQzs7QUFyUWtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdkYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ2hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdwb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ3VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ3Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnc2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBvcmc6IHtcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShmb3JtLm5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkICsgJyByZWNvcmRzJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdob3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBncG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdkYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2UsXG4gICAgICB1c2VyOiBmdWxjcnVtLmFyZ3MucGd1c2VyIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wZ3Bhc3N3b3JkIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyXG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGd1c2VyKSB7XG4gICAgICBvcHRpb25zLnVzZXIgPSBmdWxjcnVtLmFyZ3MucGd1c2VyO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdwYXNzd29yZCkge1xuICAgICAgb3B0aW9ucy5wYXNzd29yZCA9IGZ1bGNydW0uYXJncy5wZ3Bhc3N3b3JkO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgLy8gZnVsY3J1bS5vbignY2hvaWNlX2xpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb25fc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAvLyBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgZnVsY3J1bS5vbigncmVjb3JkOnNhdmUnLCB0aGlzLm9uUmVjb3JkU2F2ZSk7XG4gICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnc2NoZW1hIHx8ICdwdWJsaWMnO1xuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhyZWNvcmQuZm9ybSwgYWNjb3VudCk7XG4gICAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG5cbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5qb2luKCdcXG4nKSk7XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXM7JywgdGhpcy5wZ2RiLmlkZW50KHRoaXMuZGF0YVNjaGVtYSksIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzX3ZpZXdfZnVsbDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cbn1cbiJdfQ==