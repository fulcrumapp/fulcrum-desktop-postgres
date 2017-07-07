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
          reportBaseUrl: {
            desc: 'report URL base',
            type: 'string'
          },
          mediaBaseUrl: {
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
        const baseURL = fulcrum.args.mediaBaseUrl ? fulcrum.args.mediaBaseUrl : 'https://api.fulcrumapp.com/api/v2';

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
        const baseURL = fulcrum.args.mediaBaseUrl ? fulcrum.args.mediaBaseUrl : 'https://web.fulcrumapp.com';

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

    if (fulcrum.args.reportBaseUrl) {
      this.recordValueOptions.reportURLFormatter = feature => {
        return `${fulcrum.args.reportBaseUrl}/reports/${feature.id}.pdf`;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInJlYnVpbGRGb3JtIiwiaW5kZXgiLCJ1cGRhdGVTdGF0dXMiLCJuYW1lIiwiZ3JlZW4iLCJ0b1N0cmluZyIsInJlZCIsImNvbnNvbGUiLCJsb2ciLCJpbnZva2VBZnRlckZ1bmN0aW9uIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwib25Qcm9qZWN0U2F2ZSIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ0RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ0hvc3QiLCJwZ1BvcnQiLCJwZ1VzZXIiLCJwZ1Bhc3N3b3JkIiwicGdTY2hlbWEiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJyZXBvcnRCYXNlVXJsIiwibWVkaWFCYXNlVXJsIiwiaGFuZGxlciIsInVzZVN5bmNFdmVudHMiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsInNldHVwT3B0aW9ucyIsImRlYWN0aXZhdGUiLCJlbmQiLCJtZWRpYVVSTEZvcm1hdHRlciIsIm1lZGlhVmFsdWUiLCJiYXNlVVJMIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJkYXRhTmFtZSIsImlkZW50IiwiYmVmb3JlRnVuY3Rpb24iLCJhZnRlckZ1bmN0aW9uIiwicHJvZ3Jlc3MiLCJmaW5kRWFjaFJlY29yZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLE1BQU1BLGtCQUFrQjtBQUN0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QW5DLENBQU47QUFDRCxTQVJLOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBVUFrSSxlQUFTeEgsS0FBVDtBQWhCeUM7QUFpQjFDOztBQXpWa0IsQyIsImZpbGUiOiJwbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGcgZnJvbSAncGcnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUG9zdGdyZXNTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgUG9zdGdyZXNSZWNvcmRWYWx1ZXMsIFBvc3RncmVzIH0gZnJvbSAnZnVsY3J1bSc7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ0RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnSG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ1BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIHBnVXNlcjoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHVzZXInLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUGFzc3dvcmQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBwYXNzd29yZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWE6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3luY0V2ZW50czoge1xuICAgICAgICAgIGRlc2M6ICdhZGQgc3luYyBldmVudCBob29rcycsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdCZWZvcmVGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0FmdGVyRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGFmdGVyIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBvcmc6IHtcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHJlcG9ydEJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAncmVwb3J0IFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBtZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIChpbmRleCkgPT4ge1xuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIGdldCB1c2VTeW5jRXZlbnRzKCkge1xuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzIDogdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdIb3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBnUG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdEYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2UsXG4gICAgICB1c2VyOiBmdWxjcnVtLmFyZ3MucGdVc2VyIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyXG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdVc2VyKSB7XG4gICAgICBvcHRpb25zLnVzZXIgPSBmdWxjcnVtLmFyZ3MucGdVc2VyO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCkge1xuICAgICAgb3B0aW9ucy5wYXNzd29yZCA9IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgLy8gZnVsY3J1bS5vbignY2hvaWNlX2xpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb25fc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAvLyBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuICAgIGlmICh0aGlzLnVzZVN5bmNFdmVudHMpIHtcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWEgfHwgJ3B1YmxpYyc7XG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcblxuICAgIHRoaXMuc2V0dXBPcHRpb25zKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgYmFzZVVSTCA9IGZ1bGNydW0uYXJncy5tZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MubWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vcGhvdG9zLyR7IGl0ZW0ubWVkaWFJRCB9LmpwZ2A7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3ZpZGVvcy8keyBpdGVtLm1lZGlhSUQgfS5tcDRgO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9hdWRpby8keyBpdGVtLm1lZGlhSUQgfS5tNGFgO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgYmFzZVVSTCA9IGZ1bGNydW0uYXJncy5tZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MubWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vd2ViLmZ1bGNydW1hcHAuY29tJztcblxuICAgICAgICBjb25zdCBpZHMgPSBtZWRpYVZhbHVlLml0ZW1zLm1hcChvID0+IG8ubWVkaWFJRCk7XG5cbiAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3Bob3Rvcy92aWV3P3Bob3Rvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9hdWRpby92aWV3P2F1ZGlvPSR7IGlkcyB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnJlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnJlcG9ydEJhc2VVcmwgfS9yZXBvcnRzLyR7IGZlYXR1cmUuaWQgfS5wZGZgO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSByZXBlYXRhYmxlID8gYCR7Zm9ybS5uYW1lfSAtICR7cmVwZWF0YWJsZS5kYXRhTmFtZX1gIDogZm9ybS5uYW1lO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGludm9rZUJlZm9yZUZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MuYmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLmJlZm9yZUZ1bmN0aW9uKSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQWZ0ZXJGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLmFmdGVyRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLmFmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcbiAgICBpZiAoZm9ybSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlU3RhdHVzID0gKG1lc3NhZ2UpID0+IHtcbiAgICBpZiAocHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==