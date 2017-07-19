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

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _template = require('./template.sql');

var _template2 = _interopRequireDefault(_template);

var _schemaMap = require('./schema-map');

var _schemaMap2 = _interopRequireDefault(_schemaMap);

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

      if (fulcrum.args.pgSetup) {
        yield _this.setupDatabase();
        return;
      }

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

    this.onPhotoSave = (() => {
      var _ref7 = _asyncToGenerator(function* ({ photo, account }) {
        yield _this.updatePhoto(photo, account);
      });

      return function (_x6) {
        return _ref7.apply(this, arguments);
      };
    })();

    this.onVideoSave = (() => {
      var _ref8 = _asyncToGenerator(function* ({ video, account }) {
        yield _this.updateVideo(video, account);
      });

      return function (_x7) {
        return _ref8.apply(this, arguments);
      };
    })();

    this.onAudioSave = (() => {
      var _ref9 = _asyncToGenerator(function* ({ audio, account }) {
        yield _this.updateAudio(audio, account);
      });

      return function (_x8) {
        return _ref9.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref10 = _asyncToGenerator(function* ({ object }) {});

      return function (_x9) {
        return _ref10.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref11 = _asyncToGenerator(function* ({ object }) {});

      return function (_x10) {
        return _ref11.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref12 = _asyncToGenerator(function* ({ object }) {});

      return function (_x11) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });

    this.updateRecord = (() => {
      var _ref14 = _asyncToGenerator(function* (record, account, skipTableCheck) {
        if (!skipTableCheck && !_this.rootTableExists(record.form)) {
          yield _this.rebuildForm(record.form, account, function () {});
        }

        if (_this.pgCustomModule && _this.pgCustomModule.shouldUpdateRecord && !_this.pgCustomModule.shouldUpdateRecord({ record, account })) {
          return;
        }

        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.updateForRecordStatements(_this.pgdb, record, _this.recordValueOptions);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x12, _x13, _x14) {
        return _ref14.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref15 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            console.error(sql);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x15, _x16) {
        return _ref15.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref16 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        if (_this.pgCustomModule && _this.pgCustomModule.shouldUpdateForm && !_this.pgCustomModule.shouldUpdateForm({ form, account })) {
          return;
        }

        if (!_this.rootTableExists(form) && newForm != null) {
          oldForm = null;
        }

        const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm, _this.disableArrays);

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

      return function (_x17, _x18, _x19, _x20) {
        return _ref16.apply(this, arguments);
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
          },
          pgCustomModule: {
            desc: 'a custom module to load with sync extensions',
            required: false,
            type: 'string'
          },
          pgSetup: {
            desc: 'setup the database',
            required: false,
            type: 'boolean'
          },
          pgArrays: {
            desc: 'use array types for multi-value fields like choice fields, classification fields and media fields',
            required: false,
            type: 'boolean',
            default: true
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

      if (fulcrum.args.pgCustomModule) {
        _this3.pgCustomModule = require(fulcrum.args.pgCustomModule);
      }

      if (fulcrum.args.arrays === false) {
        _this3.disableArrays = true;
      }

      _this3.pool = new _pg2.default.Pool(options);

      if (_this3.useSyncEvents) {
        fulcrum.on('sync:start', _this3.onSyncStart);
        fulcrum.on('sync:finish', _this3.onSyncFinish);
        fulcrum.on('form:save', _this3.onFormSave);
        fulcrum.on('photo:save', _this3.onPhotoSave);
        fulcrum.on('video:save', _this3.onVideoSave);
        fulcrum.on('audio:save', _this3.onAudioSave);
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

  updatePhoto(object, account) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      yield _this5.updateObject(_schemaMap2.default.photo(object), 'photos');
    })();
  }

  updateVideo(object, account) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      yield _this6.updateObject(_schemaMap2.default.video(object), 'videos');
    })();
  }

  updateAudio(object, account) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      yield _this7.updateObject(_schemaMap2.default.audio(object), 'audio');
    })();
  }

  updateProject(object, account) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      yield _this8.updateObject(_schemaMap2.default.project(object), 'projects');
    })();
  }

  updateMemberships(object, account) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      yield _this9.updateObject(_schemaMap2.default.membership(object), 'memberships');
    })();
  }

  updateObject(values, table) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      try {
        const deleteStatement = _this10.pgdb.deleteStatement(table, { row_resource_id: values.row_resource_id });
        const insertStatement = _this10.pgdb.insertStatement(table, values, { pk: 'id' });

        const sql = [deleteStatement.sql, insertStatement.sql].join('\n');

        yield _this10.run(sql);
      } catch (ex) {
        console.error(ex);
      }
    })();
  }

  setupOptions() {
    this.recordValueOptions = {
      disableArrays: this.disableArrays,

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
    var _this11 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this11.getFriendlyTableName(form, repeatable);

      try {
        yield _this11.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this11.pgdb.ident(_this11.dataSchema), _this11.pgdb.ident(viewName)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this12.getFriendlyTableName(form, repeatable);

      try {
        yield _this12.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this12.pgdb.ident(_this12.dataSchema), _this12.pgdb.ident(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
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
    var _this13 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgBeforeFunction) {
        yield _this13.run((0, _util.format)('SELECT %s();', fulcrum.args.pgBeforeFunction));
      }
    })();
  }

  invokeAfterFunction() {
    var _this14 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgAfterFunction) {
        yield _this14.run((0, _util.format)('SELECT %s();', fulcrum.args.pgAfterFunction));
      }
    })();
  }

  rebuildForm(form, account, progress) {
    var _this15 = this;

    return _asyncToGenerator(function* () {
      yield _this15.recreateFormTables(form, account);
      yield _this15.reloadTableList();

      let index = 0;

      yield form.findEachRecord({}, (() => {
        var _ref17 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this15.updateRecord(record, account, true);
        });

        return function (_x21) {
          return _ref17.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

  rebuildFriendlyViews(form, account) {
    var _this16 = this;

    return _asyncToGenerator(function* () {
      yield _this16.dropFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this16.dropFriendlyView(form, repeatable);
      }

      yield _this16.createFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this16.createFriendlyView(form, repeatable);
      }
    })();
  }

  setupDatabase() {
    var _this17 = this;

    return _asyncToGenerator(function* () {
      const sql = _template2.default.replace(/__SCHEMA__/g, 'public').replace(/__VIEW_SCHEMA__/g, _this17.dataSchema);

      yield _this17.run(sql);
    })();
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInBnU2V0dXAiLCJzZXR1cERhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsImludm9rZUJlZm9yZUZ1bmN0aW9uIiwiZm9ybXMiLCJmaW5kQWN0aXZlRm9ybXMiLCJmb3JtIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uUmVjb3JkU2F2ZSIsInJlY29yZCIsInVwZGF0ZVJlY29yZCIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJwZ2RiIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvbkNob2ljZUxpc3RTYXZlIiwib2JqZWN0Iiwib25DbGFzc2lmaWNhdGlvblNldFNhdmUiLCJvblByb2plY3RTYXZlIiwicmVsb2FkVGFibGVMaXN0IiwidGFibGVOYW1lcyIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwiaW5kZXhPZiIsInRhYmxlTmFtZVdpdGhGb3JtIiwicmVjcmVhdGVGb3JtVGFibGVzIiwiZm9ybVZlcnNpb24iLCJleCIsInNob3VsZFVwZGF0ZUZvcm0iLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkaXNhYmxlQXJyYXlzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ0RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ0hvc3QiLCJwZ1BvcnQiLCJwZ1VzZXIiLCJwZ1Bhc3N3b3JkIiwicGdTY2hlbWEiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwicGdBcnJheXMiLCJoYW5kbGVyIiwidXNlU3luY0V2ZW50cyIsIm9wdGlvbnMiLCJ1c2VyIiwicGFzc3dvcmQiLCJyZXF1aXJlIiwiYXJyYXlzIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsInNldHVwT3B0aW9ucyIsImRlYWN0aXZhdGUiLCJlbmQiLCJ1cGRhdGVPYmplY3QiLCJ1cGRhdGVQcm9qZWN0IiwicHJvamVjdCIsInVwZGF0ZU1lbWJlcnNoaXBzIiwibWVtYmVyc2hpcCIsInZhbHVlcyIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJtZWRpYVVSTEZvcm1hdHRlciIsIm1lZGlhVmFsdWUiLCJiYXNlVVJMIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsImlkZW50IiwiZGF0YU5hbWUiLCJwcm9ncmVzcyIsImZpbmRFYWNoUmVjb3JkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNQSxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O2tCQVFlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBNEZuQkMsVUE1Rm1CLHFCQTRGTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFVBQUlDLFFBQVFDLElBQVIsQ0FBYUMsT0FBakIsRUFBMEI7QUFDeEIsY0FBTSxNQUFLQyxhQUFMLEVBQU47QUFDQTtBQUNEOztBQUVELFlBQU1DLFVBQVUsTUFBTUosUUFBUUssWUFBUixDQUFxQkwsUUFBUUMsSUFBUixDQUFhSyxHQUFsQyxDQUF0Qjs7QUFFQSxVQUFJRixPQUFKLEVBQWE7QUFDWCxjQUFNLE1BQUtHLG9CQUFMLEVBQU47O0FBRUEsY0FBTUMsUUFB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QUE4QjJFLFVBQTlCLENBQU47QUFDRDtBQVh1QztBQVl6Qzs7QUF1QktsRixlQUFOLEdBQXNCO0FBQUE7O0FBQUE7QUFDcEIsWUFBTXNCLE1BQU0sbUJBQVNDLE9BQVQsQ0FBaUIsYUFBakIsRUFBZ0MsUUFBaEMsRUFDU0EsT0FEVCxDQUNpQixrQkFEakIsRUFDcUMsUUFBS3lHLFVBRDFDLENBQVo7O0FBR0EsWUFBTSxRQUFLM0csR0FBTCxDQUFTQyxHQUFULENBQU47QUFKb0I7QUFLckI7QUF2ZmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlLnNxbCc7XG5pbXBvcnQgU2NoZW1hTWFwIGZyb20gJy4vc2NoZW1hLW1hcCc7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ0RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnSG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ1BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIHBnVXNlcjoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHVzZXInLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUGFzc3dvcmQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBwYXNzd29yZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWE6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3luY0V2ZW50czoge1xuICAgICAgICAgIGRlc2M6ICdhZGQgc3luYyBldmVudCBob29rcycsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdCZWZvcmVGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0FmdGVyRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGFmdGVyIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBvcmc6IHtcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVwb3J0QmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdyZXBvcnQgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnTWVkaWFCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ21lZGlhIFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1VuZGVyc2NvcmVOYW1lczoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdW5kZXJzY29yZSBuYW1lcyAoZS5nLiBcIlBhcmsgSW5zcGVjdGlvbnNcIiBiZWNvbWVzIFwicGFya19pbnNwZWN0aW9uc1wiKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ1JlYnVpbGRWaWV3c09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSByZWJ1aWxkIHRoZSB2aWV3cycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0N1c3RvbU1vZHVsZToge1xuICAgICAgICAgIGRlc2M6ICdhIGN1c3RvbSBtb2R1bGUgdG8gbG9hZCB3aXRoIHN5bmMgZXh0ZW5zaW9ucycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2V0dXA6IHtcbiAgICAgICAgICBkZXNjOiAnc2V0dXAgdGhlIGRhdGFiYXNlJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgIH0sXG4gICAgICAgIHBnQXJyYXlzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSBhcnJheSB0eXBlcyBmb3IgbXVsdGktdmFsdWUgZmllbGRzIGxpa2UgY2hvaWNlIGZpZWxkcywgY2xhc3NpZmljYXRpb24gZmllbGRzIGFuZCBtZWRpYSBmaWVsZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTZXR1cCkge1xuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuYXJyYXlzID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5kaXNhYmxlQXJyYXlzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLnBvb2wgPSBuZXcgcGcuUG9vbChvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnVzZVN5bmNFdmVudHMpIHtcbiAgICAgIGZ1bGNydW0ub24oJ3N5bmM6c3RhcnQnLCB0aGlzLm9uU3luY1N0YXJ0KTtcbiAgICAgIGZ1bGNydW0ub24oJ3N5bmM6ZmluaXNoJywgdGhpcy5vblN5bmNGaW5pc2gpO1xuICAgICAgZnVsY3J1bS5vbignZm9ybTpzYXZlJywgdGhpcy5vbkZvcm1TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3Bob3RvOnNhdmUnLCB0aGlzLm9uUGhvdG9TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3ZpZGVvOnNhdmUnLCB0aGlzLm9uVmlkZW9TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2F1ZGlvOnNhdmUnLCB0aGlzLm9uQXVkaW9TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuICAgIH1cblxuICAgIC8vIEZldGNoIGFsbCB0aGUgZXhpc3RpbmcgdGFibGVzIG9uIHN0YXJ0dXAuIFRoaXMgYWxsb3dzIHVzIHRvIHNwZWNpYWwgY2FzZSB0aGVcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XG4gICAgLy8gZXhpc3QsIHdlIGNhbiBwcmV0ZW5kIHRoZSBmb3JtIGlzIHZlcnNpb24gMSBzbyBpdCBjcmVhdGVzIGFsbCBuZXcgdGFibGVzIGluc3RlYWRcbiAgICAvLyBvZiBhcHBseWluZyBhIHNjaGVtYSBkaWZmLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMuZGF0YVNjaGVtYSA9IGZ1bGNydW0uYXJncy5wZ1NjaGVtYSB8fCAncHVibGljJztcbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuXG4gICAgdGhpcy5zZXR1cE9wdGlvbnMoKTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgfVxuXG4gIG9uU3luY1N0YXJ0ID0gYXN5bmMgKHthY2NvdW50LCB0YXNrc30pID0+IHtcbiAgICB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG4gIH1cblxuICBvblN5bmNGaW5pc2ggPSBhc3luYyAoe2FjY291bnR9KSA9PiB7XG4gICAgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25QaG90b1NhdmUgPSBhc3luYyAoe3Bob3RvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICB9XG5cbiAgb25WaWRlb1NhdmUgPSBhc3luYyAoe3ZpZGVvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25BdWRpb1NhdmUgPSBhc3luYyAoe2F1ZGlvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVBob3RvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5waG90byhvYmplY3QpLCAncGhvdG9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVWaWRlbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAudmlkZW8ob2JqZWN0KSwgJ3ZpZGVvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQXVkaW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmF1ZGlvKG9iamVjdCksICdhdWRpbycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucHJvamVjdChvYmplY3QpLCAncHJvamVjdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZU1lbWJlcnNoaXBzKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5tZW1iZXJzaGlwKG9iamVjdCksICdtZW1iZXJzaGlwcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlT2JqZWN0KHZhbHVlcywgdGFibGUpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVsZXRlU3RhdGVtZW50ID0gdGhpcy5wZ2RiLmRlbGV0ZVN0YXRlbWVudCh0YWJsZSwge3Jvd19yZXNvdXJjZV9pZDogdmFsdWVzLnJvd19yZXNvdXJjZV9pZH0pO1xuICAgICAgY29uc3QgaW5zZXJ0U3RhdGVtZW50ID0gdGhpcy5wZ2RiLmluc2VydFN0YXRlbWVudCh0YWJsZSwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcblxuICAgICAgY29uc3Qgc3FsID0gWyBkZWxldGVTdGF0ZW1lbnQuc3FsLCBpbnNlcnRTdGF0ZW1lbnQuc3FsIF0uam9pbignXFxuJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKHNxbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG5cbiAgICAgIG1lZGlhVVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBiYXNlVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vcGhvdG9zLyR7IGl0ZW0ubWVkaWFJRCB9LmpwZ2A7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3ZpZGVvcy8keyBpdGVtLm1lZGlhSUQgfS5tcDRgO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9hdWRpby8keyBpdGVtLm1lZGlhSUQgfS5tNGFgO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgYmFzZVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL3dlYi5mdWxjcnVtYXBwLmNvbSc7XG5cbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IGJhc2VVUkwgfS9waG90b3Mvdmlldz9waG90b3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgYmFzZVVSTCB9L3ZpZGVvcy92aWV3P3ZpZGVvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyBiYXNlVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQgJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkKHtyZWNvcmQsIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0gJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSh7Zm9ybSwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcbiAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCB0aGlzLmRpc2FibGVBcnJheXMpO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgPyBzbmFrZShuYW1lKSA6IG5hbWU7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2V0dXBEYXRhYmFzZSgpIHtcbiAgICBjb25zdCBzcWwgPSB0ZW1wbGF0ZS5yZXBsYWNlKC9fX1NDSEVNQV9fL2csICdwdWJsaWMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLmRhdGFTY2hlbWEpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgfVxufVxuIl19