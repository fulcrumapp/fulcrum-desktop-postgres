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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiY29uc29sZSIsImxvZyIsImludm9rZUFmdGVyRnVuY3Rpb24iLCJlcnJvciIsInJ1biIsInNxbCIsInJlcGxhY2UiLCJkZWJ1ZyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicG9vbCIsInF1ZXJ5IiwiZXJyIiwicmVzIiwicm93cyIsInRhYmxlTmFtZSIsInJvd0lEIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uUmVjb3JkU2F2ZSIsInJlY29yZCIsInVwZGF0ZVJlY29yZCIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJwZ2RiIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvbkNob2ljZUxpc3RTYXZlIiwib2JqZWN0Iiwib25DbGFzc2lmaWNhdGlvblNldFNhdmUiLCJvblByb2plY3RTYXZlIiwicmVsb2FkVGFibGVMaXN0IiwidGFibGVOYW1lcyIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsImluZGV4T2YiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsInJlY3JlYXRlRm9ybVRhYmxlcyIsImZvcm1WZXJzaW9uIiwiZXgiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkcm9wRnJpZW5kbHlWaWV3IiwicmVwZWF0YWJsZSIsImVsZW1lbnRzT2ZUeXBlIiwiY3JlYXRlRnJpZW5kbHlWaWV3IiwiaWQiLCJfaWQiLCJyb3dfaWQiLCJfbmFtZSIsImVsZW1lbnRzIiwiX2VsZW1lbnRzSlNPTiIsIm1lc3NhZ2UiLCJwcm9jZXNzIiwic3Rkb3V0IiwiaXNUVFkiLCJjbGVhckxpbmUiLCJjdXJzb3JUbyIsIndyaXRlIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU3luY0V2ZW50cyIsInBnQmVmb3JlRnVuY3Rpb24iLCJwZ0FmdGVyRnVuY3Rpb24iLCJyZXF1aXJlZCIsInBnUmVwb3J0QmFzZVVybCIsInBnTWVkaWFCYXNlVXJsIiwicGdVbmRlcnNjb3JlTmFtZXMiLCJoYW5kbGVyIiwidXNlU3luY0V2ZW50cyIsIm9wdGlvbnMiLCJ1c2VyIiwicGFzc3dvcmQiLCJQb29sIiwib24iLCJkYXRhU2NoZW1hIiwic2V0dXBPcHRpb25zIiwiZGVhY3RpdmF0ZSIsImVuZCIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsImJhc2VVUkwiLCJpdGVtcyIsIml0ZW0iLCJlbGVtZW50IiwiaXNQaG90b0VsZW1lbnQiLCJtZWRpYUlEIiwiaXNWaWRlb0VsZW1lbnQiLCJpc0F1ZGlvRWxlbWVudCIsIm1lZGlhVmlld1VSTEZvcm1hdHRlciIsImlkcyIsInJlcG9ydFVSTEZvcm1hdHRlciIsImZlYXR1cmUiLCJ2aWV3TmFtZSIsImdldEZyaWVuZGx5VGFibGVOYW1lIiwiaWRlbnQiLCJkYXRhTmFtZSIsImJlZm9yZUZ1bmN0aW9uIiwiYWZ0ZXJGdW5jdGlvbiIsInByb2dyZXNzIiwi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TSxRQUFLRSxrQkFBTCxDQUF3QjdELElBQXhCLEVBQThCLElBQTlCLENBQU47O0FBRUEsV0FBSyxNQUFNMkQsVUFBWCxJQUF5QjNELEtBQUs0RCxjQUFMLENBQW9CLFlBQXBCLENBQXpCLEVBQTREO0FBQzFELGNBQU0sUUFBS0Msa0JBQUwsQ0FBd0I3RCxJQUF4QixFQUE4QjJELFVBQTlCLENBQU47QUFDRDtBQVh1QztBQVl6Qzs7QUE3WGtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1JlcG9ydEJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAncmVwb3J0IFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ01lZGlhQmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdtZWRpYSBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdVbmRlcnNjb3JlTmFtZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHVuZGVyc2NvcmUgbmFtZXMgKGUuZy4gXCJQYXJrIEluc3BlY3Rpb25zXCIgYmVjb21lcyBcInBhcmtfaW5zcGVjdGlvbnNcIiknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZWJ1aWxkVmlld3NPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgcmVidWlsZCB0aGUgdmlld3MnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZWJ1aWxkVmlld3NPbmx5KSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIChpbmRleCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIGdldCB1c2VTeW5jRXZlbnRzKCkge1xuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzIDogdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdIb3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBnUG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdEYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2UsXG4gICAgICB1c2VyOiBmdWxjcnVtLmFyZ3MucGdVc2VyIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyXG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdVc2VyKSB7XG4gICAgICBvcHRpb25zLnVzZXIgPSBmdWxjcnVtLmFyZ3MucGdVc2VyO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCkge1xuICAgICAgb3B0aW9ucy5wYXNzd29yZCA9IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgLy8gZnVsY3J1bS5vbignY2hvaWNlX2xpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG4gICAgLy8gZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb25fc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAvLyBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuICAgIGlmICh0aGlzLnVzZVN5bmNFdmVudHMpIHtcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWEgfHwgJ3B1YmxpYyc7XG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcblxuICAgIHRoaXMuc2V0dXBPcHRpb25zKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgYmFzZVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL2FwaS5mdWxjcnVtYXBwLmNvbS9hcGkvdjInO1xuXG4gICAgICAgIHJldHVybiBtZWRpYVZhbHVlLml0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3Bob3Rvcy8keyBpdGVtLm1lZGlhSUQgfS5qcGdgO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS92aWRlb3MvJHsgaXRlbS5tZWRpYUlEIH0ubXA0YDtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vYXVkaW8vJHsgaXRlbS5tZWRpYUlEIH0ubTRhYDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBtZWRpYVZpZXdVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGJhc2VVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly93ZWIuZnVsY3J1bWFwcC5jb20nO1xuXG4gICAgICAgIGNvbnN0IGlkcyA9IG1lZGlhVmFsdWUuaXRlbXMubWFwKG8gPT4gby5tZWRpYUlEKTtcblxuICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vcGhvdG9zL3ZpZXc/cGhvdG9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS92aWRlb3Mvdmlldz92aWRlb3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L2F1ZGlvL3ZpZXc/YXVkaW89JHsgaWRzIH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsKSB7XG4gICAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIgPSAoZmVhdHVyZSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7IGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwgfS9yZXBvcnRzLyR7IGZlYXR1cmUuaWQgfS5wZGZgO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgPyBzbmFrZShuYW1lKSA6IG5hbWU7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLmJlZm9yZUZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5iZWZvcmVGdW5jdGlvbikpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGludm9rZUFmdGVyRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5hZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5hZnRlckZ1bmN0aW9uKSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcyhpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBwcm9ncmVzcyhpbmRleCk7XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cblxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxufVxuIl19