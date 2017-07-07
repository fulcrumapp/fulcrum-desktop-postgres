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
        yield _this.invokeBeforeFunction();

        const forms = yield account.findActiveForms({});

        for (const form of forms) {
          yield _this.rebuildForm(form, account, function (index) {
            _this.updateStatus(form.name.green + ' : ' + index.toString().red + ' records');
          });

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
        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.deleteForRecordStatements(_this.pgdb, record, record.form, _this.recordValueOptions);

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

        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.updateForRecordStatements(_this.pgdb, record, _this.recordValueOptions);

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

  invokeBeforeFunction() {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.beforeFunction) {
        yield _this7.run((0, _util.format)('SELECT %s();', fulcrum.args.beforeFunction));
      }
    })();
  }

  invokeAfterFunction() {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.afterFunction) {
        yield _this8.run((0, _util.format)('SELECT %s();', fulcrum.args.afterFunction));
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
        var _ref12 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this9.updateRecord(record, account, true);
        });

        return function (_x16) {
          return _ref12.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInJlYnVpbGRGb3JtIiwiaW5kZXgiLCJ1cGRhdGVTdGF0dXMiLCJuYW1lIiwiZ3JlZW4iLCJ0b1N0cmluZyIsInJlZCIsImNvbnNvbGUiLCJsb2ciLCJpbnZva2VBZnRlckZ1bmN0aW9uIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwib25Qcm9qZWN0U2F2ZSIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ0RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ0hvc3QiLCJwZ1BvcnQiLCJwZ1VzZXIiLCJwZ1Bhc3N3b3JkIiwicGdTY2hlbWEiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsImhhbmRsZXIiLCJ1c2VTeW5jRXZlbnRzIiwib3B0aW9ucyIsInVzZXIiLCJwYXNzd29yZCIsIlBvb2wiLCJvbiIsImRhdGFTY2hlbWEiLCJzZXR1cE9wdGlvbnMiLCJkZWFjdGl2YXRlIiwiZW5kIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJtZWRpYVZhbHVlIiwiYmFzZVVSTCIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZGF0YU5hbWUiLCJpZGVudCIsImJlZm9yZUZ1bmN0aW9uIiwiYWZ0ZXJGdW5jdGlvbiIsInByb2dyZXNzIiwiZmluZEVhY2hSZWNvcmQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxNQUFNQSxrQkFBa0I7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QUFtQyxJQUFuQyxDQUFOO0FBQ0QsU0FSSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVVBa0ksZUFBU3hILEtBQVQ7QUFoQnlDO0FBaUIxQzs7QUF6VmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1JlcG9ydEJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAncmVwb3J0IFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ01lZGlhQmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdtZWRpYSBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKGluZGV4KSA9PiB7XG4gICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgZnVsY3J1bS5hcmdzLm9yZyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHVzZVN5bmNFdmVudHMoKSB7XG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgIT0gbnVsbCA/IGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgOiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGUoKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLlBPU1RHUkVTX0NPTkZJRyxcbiAgICAgIGhvc3Q6IGZ1bGNydW0uYXJncy5wZ0hvc3QgfHwgUE9TVEdSRVNfQ09ORklHLmhvc3QsXG4gICAgICBwb3J0OiBmdWxjcnVtLmFyZ3MucGdQb3J0IHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ0RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZSxcbiAgICAgIHVzZXI6IGZ1bGNydW0uYXJncy5wZ1VzZXIgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXIsXG4gICAgICBwYXNzd29yZDogZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXJcbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1VzZXIpIHtcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5wZ1VzZXI7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkKSB7XG4gICAgICBvcHRpb25zLnBhc3N3b3JkID0gZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgdGhpcy5wb29sID0gbmV3IHBnLlBvb2wob3B0aW9ucyk7XG5cbiAgICAvLyBmdWxjcnVtLm9uKCdjaG9pY2VfbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAvLyBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbl9zZXQ6c2F2ZScsIHRoaXMub25DbGFzc2lmaWNhdGlvblNldFNhdmUpO1xuICAgIC8vIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignZm9ybTpzYXZlJywgdGhpcy5vbkZvcm1TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuICAgIH1cblxuICAgIC8vIEZldGNoIGFsbCB0aGUgZXhpc3RpbmcgdGFibGVzIG9uIHN0YXJ0dXAuIFRoaXMgYWxsb3dzIHVzIHRvIHNwZWNpYWwgY2FzZSB0aGVcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XG4gICAgLy8gZXhpc3QsIHdlIGNhbiBwcmV0ZW5kIHRoZSBmb3JtIGlzIHZlcnNpb24gMSBzbyBpdCBjcmVhdGVzIGFsbCBuZXcgdGFibGVzIGluc3RlYWRcbiAgICAvLyBvZiBhcHBseWluZyBhIHNjaGVtYSBkaWZmLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMuZGF0YVNjaGVtYSA9IGZ1bGNydW0uYXJncy5wZ1NjaGVtYSB8fCAncHVibGljJztcbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuXG4gICAgdGhpcy5zZXR1cE9wdGlvbnMoKTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgfVxuXG4gIG9uRm9ybVNhdmUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm19KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuICB9XG5cbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUmVjb3JkRGVsZXRlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHJlY29yZC5mb3JtLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gIH1cblxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIHNldHVwT3B0aW9ucygpIHtcbiAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyA9IHtcbiAgICAgIG1lZGlhVVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBiYXNlVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vcGhvdG9zLyR7IGl0ZW0ubWVkaWFJRCB9LmpwZ2A7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3ZpZGVvcy8keyBpdGVtLm1lZGlhSUQgfS5tcDRgO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9hdWRpby8keyBpdGVtLm1lZGlhSUQgfS5tNGFgO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgYmFzZVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL3dlYi5mdWxjcnVtYXBwLmNvbSc7XG5cbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9waG90b3Mvdmlldz9waG90b3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3ZpZGVvcy92aWV3P3ZpZGVvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG5cbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5qb2luKCdcXG4nKSk7XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXM7JywgdGhpcy5wZ2RiLmlkZW50KHRoaXMuZGF0YVNjaGVtYSksIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzX3ZpZXdfZnVsbDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQmVmb3JlRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5iZWZvcmVGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MuYmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MuYWZ0ZXJGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MuYWZ0ZXJGdW5jdGlvbikpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIHByb2dyZXNzKSB7XG4gICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cblxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxufVxuIl19