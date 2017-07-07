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

var _snakeCase = require('snake-case');

var _snakeCase2 = _interopRequireDefault(_snakeCase);

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
        yield _this.invokeBeforeFunction();

        const forms = yield account.findActiveForms({});

        for (const form of forms) {
          if (fulcrum.args.pgRebuildViewsOnly) {
            yield _this.rebuildFriendlyViews(form, account);
          } else {
            yield _this.rebuildForm(form, account, function (index) {
              _this.updateStatus(form.name.green + ' : ' + index.toString().red + ' records');
            });
          }

          console.log('');
        }

        yield _this.invokeAfterFunction();
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

    this.onSyncStart = (() => {
      var _ref2 = _asyncToGenerator(function* ({ account, tasks }) {
        _this.invokeBeforeFunction();
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })();

    this.onSyncFinish = (() => {
      var _ref3 = _asyncToGenerator(function* ({ account }) {
        _this.invokeAfterFunction();
      });

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    })();

    this.onFormSave = (() => {
      var _ref4 = _asyncToGenerator(function* ({ form, account, oldForm, newForm }) {
        yield _this.updateForm(form, account, oldForm, newForm);
      });

      return function (_x3) {
        return _ref4.apply(this, arguments);
      };
    })();

    this.onRecordSave = (() => {
      var _ref5 = _asyncToGenerator(function* ({ record, account }) {
        yield _this.updateRecord(record, account);
      });

      return function (_x4) {
        return _ref5.apply(this, arguments);
      };
    })();

    this.onRecordDelete = (() => {
      var _ref6 = _asyncToGenerator(function* ({ record }) {
        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.deleteForRecordStatements(_this.pgdb, record, record.form, _this.recordValueOptions);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref7 = _asyncToGenerator(function* ({ object }) {});

      return function (_x6) {
        return _ref7.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref8 = _asyncToGenerator(function* ({ object }) {});

      return function (_x7) {
        return _ref8.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref9 = _asyncToGenerator(function* ({ object }) {});

      return function (_x8) {
        return _ref9.apply(this, arguments);
      };
    })();

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });

    this.updateRecord = (() => {
      var _ref11 = _asyncToGenerator(function* (record, account, skipTableCheck) {
        if (!skipTableCheck && !_this.rootTableExists(record.form)) {
          yield _this.rebuildForm(record.form, account, function () {});
        }

        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.updateForRecordStatements(_this.pgdb, record, _this.recordValueOptions);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x9, _x10, _x11) {
        return _ref11.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref12 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            console.error(sql);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x12, _x13) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref13 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
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

      return function (_x14, _x15, _x16, _x17) {
        return _ref13.apply(this, arguments);
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
          pgDatabase: {
            desc: 'postgresql database name',
            type: 'string',
            default: POSTGRES_CONFIG.database
          },
          pgHost: {
            desc: 'postgresql server host',
            type: 'string',
            default: POSTGRES_CONFIG.host
          },
          pgPort: {
            desc: 'postgresql server port',
            type: 'integer',
            default: POSTGRES_CONFIG.port
          },
          pgUser: {
            desc: 'postgresql user',
            type: 'string'
          },
          pgPassword: {
            desc: 'postgresql password',
            type: 'string'
          },
          pgSchema: {
            desc: 'postgresql schema',
            type: 'string'
          },
          pgSyncEvents: {
            desc: 'add sync event hooks',
            type: 'boolean',
            default: true
          },
          pgBeforeFunction: {
            desc: 'call this function before the sync',
            type: 'string'
          },
          pgAfterFunction: {
            desc: 'call this function after the sync',
            type: 'string'
          },
          org: {
            desc: 'organization name',
            required: true,
            type: 'string'
          },
          pgReportBaseUrl: {
            desc: 'report URL base',
            type: 'string'
          },
          pgMediaBaseUrl: {
            desc: 'media URL base',
            type: 'string'
          },
          pgUnderscoreNames: {
            desc: 'use underscore names (e.g. "Park Inspections" becomes "park_inspections")',
            required: false,
            type: 'boolean',
            default: false
          },
          pgRebuildViewsOnly: {
            desc: 'only rebuild the views',
            required: false,
            type: 'boolean',
            default: false
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

  get useSyncEvents() {
    return fulcrum.args.pgSyncEvents != null ? fulcrum.args.pgSyncEvents : true;
  }

  activate() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      const options = _extends({}, POSTGRES_CONFIG, {
        host: fulcrum.args.pgHost || POSTGRES_CONFIG.host,
        port: fulcrum.args.pgPort || POSTGRES_CONFIG.port,
        database: fulcrum.args.pgDatabase || POSTGRES_CONFIG.database,
        user: fulcrum.args.pgUser || POSTGRES_CONFIG.user,
        password: fulcrum.args.pgPassword || POSTGRES_CONFIG.user
      });

      if (fulcrum.args.pgUser) {
        options.user = fulcrum.args.pgUser;
      }

      if (fulcrum.args.pgPassword) {
        options.password = fulcrum.args.pgPassword;
      }

      _this3.pool = new _pg2.default.Pool(options);

      // fulcrum.on('choice_list:save', this.onChoiceListSave);
      // fulcrum.on('classification_set:save', this.onClassificationSetSave);
      // fulcrum.on('project:save', this.onProjectSave);
      if (_this3.useSyncEvents) {
        fulcrum.on('sync:start', _this3.onSyncStart);
        fulcrum.on('sync:finish', _this3.onSyncFinish);
        fulcrum.on('form:save', _this3.onFormSave);
        fulcrum.on('record:save', _this3.onRecordSave);
        fulcrum.on('record:delete', _this3.onRecordDelete);
      }

      // Fetch all the existing tables on startup. This allows us to special case the
      // creation of new tables even when the form isn't version 1. If the table doesn't
      // exist, we can pretend the form is version 1 so it creates all new tables instead
      // of applying a schema diff.
      const rows = yield _this3.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this3.dataSchema = fulcrum.args.pgSchema || 'public';
      _this3.tableNames = rows.map(function (o) {
        return o.name;
      });

      // make a client so we can use it to build SQL statements
      _this3.pgdb = new _fulcrumDesktopPlugin.Postgres({});

      _this3.setupOptions();
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

  setupOptions() {
    this.recordValueOptions = {
      mediaURLFormatter: mediaValue => {
        const baseURL = fulcrum.args.pgMediaBaseUrl ? fulcrum.args.pgMediaBaseUrl : 'https://api.fulcrumapp.com/api/v2';

        return mediaValue.items.map(item => {
          if (mediaValue.element.isPhotoElement) {
            return `${baseURL}/photos/${item.mediaID}.jpg`;
          } else if (mediaValue.element.isVideoElement) {
            return `${baseURL}/videos/${item.mediaID}.mp4`;
          } else if (mediaValue.element.isAudioElement) {
            return `${baseURL}/audio/${item.mediaID}.m4a`;
          }

          return null;
        });
      },

      mediaViewURLFormatter: mediaValue => {
        const baseURL = fulcrum.args.pgMediaBaseUrl ? fulcrum.args.pgMediaBaseUrl : 'https://web.fulcrumapp.com';

        const ids = mediaValue.items.map(o => o.mediaID);

        if (mediaValue.element.isPhotoElement) {
          return `${baseURL}/photos/view?photos=${ids}`;
        } else if (mediaValue.element.isVideoElement) {
          return `${baseURL}/videos/view?videos=${ids}`;
        } else if (mediaValue.element.isAudioElement) {
          return `${baseURL}/audio/view?audio=${ids}`;
        }

        return null;
      }
    };

    if (fulcrum.args.pgReportBaseUrl) {
      this.recordValueOptions.reportURLFormatter = feature => {
        return `${fulcrum.args.pgReportBaseUrl}/reports/${feature.id}.pdf`;
      };
    }
  }

  dropFriendlyView(form, repeatable) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this5.getFriendlyTableName(form, repeatable);

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
      const viewName = _this6.getFriendlyTableName(form, repeatable);

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

  getFriendlyTableName(form, repeatable) {
    const name = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

    return fulcrum.args.pgUnderscoreNames ? (0, _snakeCase2.default)(name) : name;
  }

  invokeBeforeFunction() {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgBeforeFunction) {
        yield _this7.run((0, _util.format)('SELECT %s();', fulcrum.args.pgBeforeFunction));
      }
    })();
  }

  invokeAfterFunction() {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgAfterFunction) {
        yield _this8.run((0, _util.format)('SELECT %s();', fulcrum.args.pgAfterFunction));
      }
    })();
  }

  rebuildForm(form, account, progress) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      yield _this9.recreateFormTables(form, account);
      yield _this9.reloadTableList();

      let index = 0;

      yield form.findEachRecord({}, (() => {
        var _ref14 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this9.updateRecord(record, account, true);
        });

        return function (_x18) {
          return _ref14.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

  rebuildFriendlyViews(form, account) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      yield _this10.dropFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this10.dropFriendlyView(form, repeatable);
      }

      yield _this10.createFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this10.createFriendlyView(form, repeatable);
      }
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiY29uc29sZSIsImxvZyIsImludm9rZUFmdGVyRnVuY3Rpb24iLCJlcnJvciIsInJ1biIsInNxbCIsInJlcGxhY2UiLCJkZWJ1ZyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicG9vbCIsInF1ZXJ5IiwiZXJyIiwicmVzIiwicm93cyIsInRhYmxlTmFtZSIsInJvd0lEIiwib25TeW5jU3RhcnQiLCJ0YXNrcyIsIm9uU3luY0ZpbmlzaCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwib25Qcm9qZWN0U2F2ZSIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ0RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ0hvc3QiLCJwZ1BvcnQiLCJwZ1VzZXIiLCJwZ1Bhc3N3b3JkIiwicGdTY2hlbWEiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwiaGFuZGxlciIsInVzZVN5bmNFdmVudHMiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsInNldHVwT3B0aW9ucyIsImRlYWN0aXZhdGUiLCJlbmQiLCJtZWRpYVVSTEZvcm1hdHRlciIsIm1lZGlhVmFsdWUiLCJiYXNlVVJMIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsImlkZW50IiwiZGF0YU5hbWUiLCJwcm9ncmVz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MEI1QyxPQUExQixFQUFtQyxJQUFuQyxDQUFOO0FBQ0QsU0FSSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVVBdUksZUFBUzNILEtBQVQ7QUFoQnlDO0FBaUIxQzs7QUFFS0Ysc0JBQU4sQ0FBMkJGLElBQTNCLEVBQWlDUixPQUFqQyxFQUEwQztBQUFBOztBQUFBO0FBQ3hDLFlBQU0sUUFBS3FFLGdCQUFMLENBQXNCN0QsSUFBdEIsRUFBNEIsSUFBNUIsQ0FBTjs7QUFFQSxXQUFLLE1BQU04RCxVQUFYLElBQXlCOUQsS0FBSytELGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsY0FBTSxRQUFLRixnQkFBTCxDQUFzQjdELElBQXRCLEVBQTRCOEQsVUFBNUIsQ0FBTjtBQUNEOztBQUVELFlBQU0sUUFBS0Usa0JBQUwsQ0FBd0JoRSxJQUF4QixFQUE4QixJQUE5QixDQUFOOztBQUVBLFdBQUssTUFBTThELFVBQVgsSUFBeUI5RCxLQUFLK0QsY0FBTCxDQUFvQixZQUFwQixDQUF6QixFQUE0RDtBQUMxRCxjQUFNLFFBQUtDLGtCQUFMLENBQXdCaEUsSUFBeEIsRUFBOEI4RCxVQUE5QixDQUFOO0FBQ0Q7QUFYdUM7QUFZekM7O0FBdllrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCBzbmFrZSBmcm9tICdzbmFrZS1jYXNlJztcblxuY29uc3QgUE9TVEdSRVNfQ09ORklHID0ge1xuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxuICBob3N0OiAnbG9jYWxob3N0JyxcbiAgcG9ydDogNTQzMixcbiAgbWF4OiAxMCxcbiAgaWRsZVRpbWVvdXRNaWxsaXM6IDMwMDAwXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGFzeW5jIHRhc2soY2xpKSB7XG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICdwb3N0Z3JlcycsXG4gICAgICBkZXNjOiAncnVuIHRoZSBwb3N0Z3JlcyBzeW5jIGZvciBhIHNwZWNpZmljIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIHBnRGF0YWJhc2U6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBkYXRhYmFzZSBuYW1lJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdIb3N0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIGhvc3QnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIHBnUG9ydDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBwb3J0JyxcbiAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLnBvcnRcbiAgICAgICAgfSxcbiAgICAgICAgcGdVc2VyOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgdXNlcicsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdQYXNzd29yZDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHBhc3N3b3JkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NjaGVtYToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeW5jRXZlbnRzOiB7XG4gICAgICAgICAgZGVzYzogJ2FkZCBzeW5jIGV2ZW50IGhvb2tzJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ0JlZm9yZUZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnQWZ0ZXJGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZXBvcnRCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ3JlcG9ydCBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdNZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnVW5kZXJzY29yZU5hbWVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB1bmRlcnNjb3JlIG5hbWVzIChlLmcuIFwiUGFyayBJbnNwZWN0aW9uc1wiIGJlY29tZXMgXCJwYXJrX2luc3BlY3Rpb25zXCIpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICB0aGlzLnBvb2wgPSBuZXcgcGcuUG9vbChvcHRpb25zKTtcblxuICAgIC8vIGZ1bGNydW0ub24oJ2Nob2ljZV9saXN0OnNhdmUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuICAgIC8vIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uX3NldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbigncHJvamVjdDpzYXZlJywgdGhpcy5vblByb2plY3RTYXZlKTtcbiAgICBpZiAodGhpcy51c2VTeW5jRXZlbnRzKSB7XG4gICAgICBmdWxjcnVtLm9uKCdzeW5jOnN0YXJ0JywgdGhpcy5vblN5bmNTdGFydCk7XG4gICAgICBmdWxjcnVtLm9uKCdzeW5jOmZpbmlzaCcsIHRoaXMub25TeW5jRmluaXNoKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWEgfHwgJ3B1YmxpYyc7XG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcblxuICAgIHRoaXMuc2V0dXBPcHRpb25zKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gIH1cblxuICBvblN5bmNTdGFydCA9IGFzeW5jICh7YWNjb3VudCwgdGFza3N9KSA9PiB7XG4gICAgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuICB9XG5cbiAgb25TeW5jRmluaXNoID0gYXN5bmMgKHthY2NvdW50fSkgPT4ge1xuICAgIHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIG9uQ2hvaWNlTGlzdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uQ2xhc3NpZmljYXRpb25TZXRTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICBvblByb2plY3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICByZWxvYWRUYWJsZUxpc3QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuICB9XG5cbiAgc2V0dXBPcHRpb25zKCkge1xuICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zID0ge1xuICAgICAgbWVkaWFVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGJhc2VVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly9hcGkuZnVsY3J1bWFwcC5jb20vYXBpL3YyJztcblxuICAgICAgICByZXR1cm4gbWVkaWFWYWx1ZS5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9waG90b3MvJHsgaXRlbS5tZWRpYUlEIH0uanBnYDtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vdmlkZW9zLyR7IGl0ZW0ubWVkaWFJRCB9Lm1wNGA7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L2F1ZGlvLyR7IGl0ZW0ubWVkaWFJRCB9Lm00YWA7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgbWVkaWFWaWV3VVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBiYXNlVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vd2ViLmZ1bGNydW1hcHAuY29tJztcblxuICAgICAgICBjb25zdCBpZHMgPSBtZWRpYVZhbHVlLml0ZW1zLm1hcChvID0+IG8ubWVkaWFJRCk7XG5cbiAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3Bob3Rvcy92aWV3P3Bob3Rvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9hdWRpby92aWV3P2F1ZGlvPSR7IGlkcyB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCkge1xuICAgICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyID0gKGZlYXR1cmUpID0+IHtcbiAgICAgICAgcmV0dXJuIGAkeyBmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsIH0vcmVwb3J0cy8keyBmZWF0dXJlLmlkIH0ucGRmYDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlUmVjb3JkID0gYXN5bmMgKHJlY29yZCwgYWNjb3VudCwgc2tpcFRhYmxlQ2hlY2spID0+IHtcbiAgICBpZiAoIXNraXBUYWJsZUNoZWNrICYmICF0aGlzLnJvb3RUYWJsZUV4aXN0cyhyZWNvcmQuZm9ybSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0ocmVjb3JkLmZvcm0sIGFjY291bnQsICgpID0+IHt9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMudXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgcm9vdFRhYmxlRXhpc3RzID0gKGZvcm0pID0+IHtcbiAgICByZXR1cm4gdGhpcy50YWJsZU5hbWVzLmluZGV4T2YoUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSkpICE9PSAtMTtcbiAgfVxuXG4gIHJlY3JlYXRlRm9ybVRhYmxlcyA9IGFzeW5jIChmb3JtLCBhY2NvdW50KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKHNxbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG51bGwsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSkpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcbiAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcblxuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLmpvaW4oJ1xcbicpKTtcblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnRFJPUCBWSUVXIElGIEVYSVNUUyAlcy4lczsnLCB0aGlzLnBnZGIuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSwgdGhpcy5wZ2RiLmlkZW50KHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgfVxuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0NSRUFURSBWSUVXICVzLiVzIEFTIFNFTEVDVCAqIEZST00gJXNfdmlld19mdWxsOycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wZ2RiLmlkZW50KHRoaXMuZGF0YVNjaGVtYSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wZ2RiLmlkZW50KHZpZXdOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgfVxuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICB9XG4gIH1cblxuICBnZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3QgbmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnVW5kZXJzY29yZU5hbWVzID8gc25ha2UobmFtZSkgOiBuYW1lO1xuICB9XG5cbiAgYXN5bmMgaW52b2tlQmVmb3JlRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQWZ0ZXJGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcyhpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBwcm9ncmVzcyhpbmRleCk7XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cblxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxufVxuIl19