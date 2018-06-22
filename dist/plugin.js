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

var api = _interopRequireWildcard(_fulcrumDesktopPlugin);

var _snakeCase = require('snake-case');

var _snakeCase2 = _interopRequireDefault(_snakeCase);

var _templateDrop = require('./template.drop.sql');

var _templateDrop2 = _interopRequireDefault(_templateDrop);

var _schemaMap = require('./schema-map');

var _schemaMap2 = _interopRequireDefault(_schemaMap);

var _version = require('./version-001.sql');

var _version2 = _interopRequireDefault(_version);

var _version3 = require('./version-002.sql');

var _version4 = _interopRequireDefault(_version3);

var _version5 = require('./version-003.sql');

var _version6 = _interopRequireDefault(_version5);

var _version7 = require('./version-004.sql');

var _version8 = _interopRequireDefault(_version7);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const MAX_IDENTIFIER_LENGTH = 63;

const POSTGRES_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
};

const MIGRATIONS = {
  '002': _version4.default,
  '003': _version6.default,
  '004': _version8.default
};

exports.default = class {
  constructor() {
    var _this = this;

    this.runCommand = _asyncToGenerator(function* () {
      yield _this.activate();

      if (fulcrum.args.pgDrop) {
        yield _this.dropSystemTables();
        return;
      }

      if (fulcrum.args.pgSetup) {
        yield _this.setupDatabase();
        return;
      }

      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (account) {
        if (fulcrum.args.pgSystemTablesOnly) {
          yield _this.setupSystemTables(account);
          return;
        }

        yield _this.invokeBeforeFunction();

        const forms = yield account.findActiveForms({});

        for (const form of forms) {
          if (fulcrum.args.pgForm && form.id !== fulcrum.args.pgForm) {
            continue;
          }

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
        yield _this.invokeBeforeFunction();
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })();

    this.onSyncFinish = (() => {
      var _ref3 = _asyncToGenerator(function* ({ account }) {
        yield _this.invokeAfterFunction();
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

    this.onFormDelete = (() => {
      var _ref5 = _asyncToGenerator(function* ({ form, account }) {
        const oldForm = {
          id: form._id,
          row_id: form.rowID,
          name: form._name,
          elements: form._elementsJSON
        };

        yield _this.updateForm(form, account, oldForm, null);
      });

      return function (_x4) {
        return _ref5.apply(this, arguments);
      };
    })();

    this.onRecordSave = (() => {
      var _ref6 = _asyncToGenerator(function* ({ record, account }) {
        yield _this.updateRecord(record, account);
      });

      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    })();

    this.onRecordDelete = (() => {
      var _ref7 = _asyncToGenerator(function* ({ record }) {
        const statements = _fulcrumDesktopPlugin.PostgresRecordValues.deleteForRecordStatements(_this.pgdb, record, record.form, _this.recordValueOptions);

        yield _this.run(statements.map(function (o) {
          return o.sql;
        }).join('\n'));
      });

      return function (_x6) {
        return _ref7.apply(this, arguments);
      };
    })();

    this.onPhotoSave = (() => {
      var _ref8 = _asyncToGenerator(function* ({ photo, account }) {
        yield _this.updatePhoto(photo, account);
      });

      return function (_x7) {
        return _ref8.apply(this, arguments);
      };
    })();

    this.onVideoSave = (() => {
      var _ref9 = _asyncToGenerator(function* ({ video, account }) {
        yield _this.updateVideo(video, account);
      });

      return function (_x8) {
        return _ref9.apply(this, arguments);
      };
    })();

    this.onAudioSave = (() => {
      var _ref10 = _asyncToGenerator(function* ({ audio, account }) {
        yield _this.updateAudio(audio, account);
      });

      return function (_x9) {
        return _ref10.apply(this, arguments);
      };
    })();

    this.onChangesetSave = (() => {
      var _ref11 = _asyncToGenerator(function* ({ changeset, account }) {
        yield _this.updateChangeset(changeset, account);
      });

      return function (_x10) {
        return _ref11.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref12 = _asyncToGenerator(function* ({ choiceList, account }) {
        yield _this.updateChoiceList(choiceList, account);
      });

      return function (_x11) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref13 = _asyncToGenerator(function* ({ classificationSet, account }) {
        yield _this.updateClassificationSet(classificationSet, account);
      });

      return function (_x12) {
        return _ref13.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref14 = _asyncToGenerator(function* ({ project, account }) {
        yield _this.updateProject(project, account);
      });

      return function (_x13) {
        return _ref14.apply(this, arguments);
      };
    })();

    this.onRoleSave = (() => {
      var _ref15 = _asyncToGenerator(function* ({ role, account }) {
        yield _this.updateRole(role, account);
      });

      return function (_x14) {
        return _ref15.apply(this, arguments);
      };
    })();

    this.onMembershipSave = (() => {
      var _ref16 = _asyncToGenerator(function* ({ membership, account }) {
        yield _this.updateMembership(membership, account);
      });

      return function (_x15) {
        return _ref16.apply(this, arguments);
      };
    })();

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });

    this.baseMediaURL = () => {};

    this.formatPhotoURL = id => {
      return `${this.baseMediaURL}/photos/${id}.jpg`;
    };

    this.formatVideoURL = id => {
      return `${this.baseMediaURL}/videos/${id}.mp4`;
    };

    this.formatAudioURL = id => {
      return `${this.baseMediaURL}/audio/${id}.m4a`;
    };

    this.updateRecord = (() => {
      var _ref18 = _asyncToGenerator(function* (record, account, skipTableCheck) {
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

        const systemValues = _fulcrumDesktopPlugin.PostgresRecordValues.systemColumnValuesForFeature(record, null, record, _this.recordValueOptions);

        yield _this.updateObject(_schemaMap2.default.record(record, systemValues), 'records');
      });

      return function (_x16, _x17, _x18) {
        return _ref18.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref19 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            console.error(sql);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x19, _x20) {
        return _ref19.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref20 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        if (_this.pgCustomModule && _this.pgCustomModule.shouldUpdateForm && !_this.pgCustomModule.shouldUpdateForm({ form, account })) {
          return;
        }

        yield _this.updateFormObject(form, account);

        if (!_this.rootTableExists(form) && newForm != null) {
          oldForm = null;
        }

        const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm, _this.disableArrays, _this.pgCustomModule);

        yield _this.dropFriendlyView(form, null);

        for (const repeatable of form.elementsOfType('Repeatable')) {
          yield _this.dropFriendlyView(form, repeatable);
        }

        yield _this.run(['BEGIN TRANSACTION;', ...statements, 'COMMIT TRANSACTION;'].join('\n'));

        if (newForm) {
          yield _this.createFriendlyView(form, null);

          for (const repeatable of form.elementsOfType('Repeatable')) {
            yield _this.createFriendlyView(form, repeatable);
          }
        }
      });

      return function (_x21, _x22, _x23, _x24) {
        return _ref20.apply(this, arguments);
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

    this.progress = (name, index) => {
      this.updateStatus(name.green + ' : ' + index.toString().red);
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
          pgForm: {
            desc: 'the form ID to rebuild',
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
          pgDrop: {
            desc: 'drop the system tables',
            required: false,
            type: 'boolean',
            default: false
          },
          pgArrays: {
            desc: 'use array types for multi-value fields like choice fields, classification fields and media fields',
            required: false,
            type: 'boolean',
            default: true
          },
          pgSystemTablesOnly: {
            desc: 'only create the system records',
            required: false,
            type: 'boolean',
            default: false
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

  escapeIdentifier(identifier) {
    return identifier && this.pgdb.ident(identifier.substring(0, MAX_IDENTIFIER_LENGTH));
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
        _this3.pgCustomModule.api = api;
        _this3.pgCustomModule.app = fulcrum;
      }

      if (fulcrum.args.pgArrays === false) {
        _this3.disableArrays = true;
      }

      _this3.pool = new _pg2.default.Pool(options);

      if (_this3.useSyncEvents) {
        fulcrum.on('sync:start', _this3.onSyncStart);
        fulcrum.on('sync:finish', _this3.onSyncFinish);
        fulcrum.on('photo:save', _this3.onPhotoSave);
        fulcrum.on('video:save', _this3.onVideoSave);
        fulcrum.on('audio:save', _this3.onAudioSave);
        fulcrum.on('changeset:save', _this3.onChangesetSave);
        fulcrum.on('record:save', _this3.onRecordSave);
        fulcrum.on('record:delete', _this3.onRecordDelete);

        fulcrum.on('choice-list:save', _this3.onChoiceListSave);
        fulcrum.on('choice-list:delete', _this3.onChoiceListSave);

        fulcrum.on('form:save', _this3.onFormSave);
        fulcrum.on('form:delete', _this3.onFormSave);

        fulcrum.on('classification-set:save', _this3.onClassificationSetSave);
        fulcrum.on('classification-set:delete', _this3.onClassificationSetSave);

        fulcrum.on('role:save', _this3.onRoleSave);
        fulcrum.on('role:delete', _this3.onRoleSave);

        fulcrum.on('project:save', _this3.onProjectSave);
        fulcrum.on('project:delete', _this3.onProjectSave);

        fulcrum.on('membership:save', _this3.onMembershipSave);
        fulcrum.on('membership:delete', _this3.onMembershipSave);
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

      yield _this3.maybeInitialize();
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
      const values = _schemaMap2.default.photo(object);

      values.file = _this5.formatPhotoURL(values.access_key);

      yield _this5.updateObject(values, 'photos');
    })();
  }

  updateVideo(object, account) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const values = _schemaMap2.default.video(object);

      values.file = _this6.formatVideoURL(values.access_key);

      yield _this6.updateObject(values, 'videos');
    })();
  }

  updateAudio(object, account) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      const values = _schemaMap2.default.audio(object);

      values.file = _this7.formatAudioURL(values.access_key);

      yield _this7.updateObject(values, 'audio');
    })();
  }

  updateChangeset(object, account) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      yield _this8.updateObject(_schemaMap2.default.changeset(object), 'changesets');
    })();
  }

  updateProject(object, account) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      yield _this9.updateObject(_schemaMap2.default.project(object), 'projects');
    })();
  }

  updateMembership(object, account) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      yield _this10.updateObject(_schemaMap2.default.membership(object), 'memberships');
    })();
  }

  updateRole(object, account) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      yield _this11.updateObject(_schemaMap2.default.role(object), 'roles');
    })();
  }

  updateFormObject(object, account) {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      yield _this12.updateObject(_schemaMap2.default.form(object), 'forms');
    })();
  }

  updateChoiceList(object, account) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      yield _this13.updateObject(_schemaMap2.default.choiceList(object), 'choice_lists');
    })();
  }

  updateClassificationSet(object, account) {
    var _this14 = this;

    return _asyncToGenerator(function* () {
      yield _this14.updateObject(_schemaMap2.default.classificationSet(object), 'classification_sets');
    })();
  }

  updateObject(values, table) {
    var _this15 = this;

    return _asyncToGenerator(function* () {
      const deleteStatement = _this15.pgdb.deleteStatement('system_' + table, { row_resource_id: values.row_resource_id });
      const insertStatement = _this15.pgdb.insertStatement('system_' + table, values, { pk: 'id' });

      const sql = [deleteStatement.sql, insertStatement.sql].join('\n');

      yield _this15.run(sql);
    })();
  }

  setupOptions() {
    this.baseMediaURL = fulcrum.args.pgMediaBaseUrl ? fulcrum.args.pgMediaBaseUrl : 'https://api.fulcrumapp.com/api/v2';

    this.recordValueOptions = {
      disableArrays: this.disableArrays,

      valuesTransformer: this.pgCustomModule && this.pgCustomModule.valuesTransformer,

      mediaURLFormatter: mediaValue => {

        return mediaValue.items.map(item => {
          if (mediaValue.element.isPhotoElement) {
            return this.formatPhotoURL(item.mediaID);
          } else if (mediaValue.element.isVideoElement) {
            return this.formatVideoURL(item.mediaID);
          } else if (mediaValue.element.isAudioElement) {
            return this.formatAudioURL(item.mediaID);
          }

          return null;
        });
      },

      mediaViewURLFormatter: mediaValue => {
        const ids = mediaValue.items.map(o => o.mediaID);

        if (mediaValue.element.isPhotoElement) {
          return `${this.baseMediaURL}/photos/view?photos=${ids}`;
        } else if (mediaValue.element.isVideoElement) {
          return `${this.baseMediaURL}/videos/view?videos=${ids}`;
        } else if (mediaValue.element.isAudioElement) {
          return `${this.baseMediaURL}/audio/view?audio=${ids}`;
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
    var _this16 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this16.getFriendlyTableName(form, repeatable);

      try {
        yield _this16.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s CASCADE;', _this16.escapeIdentifier(_this16.dataSchema), _this16.escapeIdentifier(viewName)));
      } catch (ex) {
        // sometimes it doesn't exist
        console.error(ex.message);
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this17 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this17.getFriendlyTableName(form, repeatable);

      try {
        yield _this17.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this17.escapeIdentifier(_this17.dataSchema), _this17.escapeIdentifier(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        // sometimes it doesn't exist
        console.error(ex);
      }
    })();
  }

  getFriendlyTableName(form, repeatable) {
    const name = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

    return fulcrum.args.pgUnderscoreNames ? (0, _snakeCase2.default)(name) : name;
  }

  invokeBeforeFunction() {
    var _this18 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgBeforeFunction) {
        yield _this18.run((0, _util.format)('SELECT %s();', fulcrum.args.pgBeforeFunction));
      }
      if (_this18.pgCustomModule && _this18.pgCustomModule.beforeSync) {
        yield _this18.pgCustomModule.beforeSync();
      }
    })();
  }

  invokeAfterFunction() {
    var _this19 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgAfterFunction) {
        yield _this19.run((0, _util.format)('SELECT %s();', fulcrum.args.pgAfterFunction));
      }
      if (_this19.pgCustomModule && _this19.pgCustomModule.afterSync) {
        yield _this19.pgCustomModule.afterSync();
      }
    })();
  }

  rebuildForm(form, account, progress) {
    var _this20 = this;

    return _asyncToGenerator(function* () {
      yield _this20.recreateFormTables(form, account);
      yield _this20.reloadTableList();

      let index = 0;

      yield form.findEachRecord({}, (() => {
        var _ref21 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this20.updateRecord(record, account, true);
        });

        return function (_x25) {
          return _ref21.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

  rebuildFriendlyViews(form, account) {
    var _this21 = this;

    return _asyncToGenerator(function* () {
      yield _this21.dropFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this21.dropFriendlyView(form, repeatable);
      }

      yield _this21.createFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this21.createFriendlyView(form, repeatable);
      }
    })();
  }

  dropSystemTables() {
    var _this22 = this;

    return _asyncToGenerator(function* () {
      yield _this22.run(_this22.prepareMigrationScript(_templateDrop2.default));
    })();
  }

  setupDatabase() {
    var _this23 = this;

    return _asyncToGenerator(function* () {
      yield _this23.run(_this23.prepareMigrationScript(_version2.default));
    })();
  }

  prepareMigrationScript(sql) {
    return sql.replace(/__SCHEMA__/g, 'public').replace(/__VIEW_SCHEMA__/g, this.dataSchema);
  }

  setupSystemTables(account) {
    var _this24 = this;

    return _asyncToGenerator(function* () {
      const progress = function (name, index) {
        _this24.updateStatus(name.green + ' : ' + index.toString().red);
      };

      yield account.findEachPhoto({}, (() => {
        var _ref22 = _asyncToGenerator(function* (photo, { index }) {
          if (++index % 10 === 0) {
            progress('Photos', index);
          }

          yield _this24.updatePhoto(photo, account);
        });

        return function (_x26, _x27) {
          return _ref22.apply(this, arguments);
        };
      })());

      yield account.findEachVideo({}, (() => {
        var _ref23 = _asyncToGenerator(function* (video, { index }) {
          if (++index % 10 === 0) {
            progress('Videos', index);
          }

          yield _this24.updateVideo(video, account);
        });

        return function (_x28, _x29) {
          return _ref23.apply(this, arguments);
        };
      })());

      yield account.findEachAudio({}, (() => {
        var _ref24 = _asyncToGenerator(function* (audio, { index }) {
          if (++index % 10 === 0) {
            progress('Audio', index);
          }

          yield _this24.updateAudio(audio, account);
        });

        return function (_x30, _x31) {
          return _ref24.apply(this, arguments);
        };
      })());

      yield account.findEachChangeset({}, (() => {
        var _ref25 = _asyncToGenerator(function* (changeset, { index }) {
          if (++index % 10 === 0) {
            progress('Changesets', index);
          }

          yield _this24.updateChangeset(changeset, account);
        });

        return function (_x32, _x33) {
          return _ref25.apply(this, arguments);
        };
      })());

      yield account.findEachRole({}, (() => {
        var _ref26 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Roles', index);
          }

          yield _this24.updateRole(object, account);
        });

        return function (_x34, _x35) {
          return _ref26.apply(this, arguments);
        };
      })());

      yield account.findEachProject({}, (() => {
        var _ref27 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Projects', index);
          }

          yield _this24.updateProject(object, account);
        });

        return function (_x36, _x37) {
          return _ref27.apply(this, arguments);
        };
      })());

      yield account.findEachForm({}, (() => {
        var _ref28 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Forms', index);
          }

          yield _this24.updateFormObject(object, account);
        });

        return function (_x38, _x39) {
          return _ref28.apply(this, arguments);
        };
      })());

      yield account.findEachMembership({}, (() => {
        var _ref29 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Memberships', index);
          }

          yield _this24.updateMembership(object, account);
        });

        return function (_x40, _x41) {
          return _ref29.apply(this, arguments);
        };
      })());

      yield account.findEachChoiceList({}, (() => {
        var _ref30 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Choice Lists', index);
          }

          yield _this24.updateChoiceList(object, account);
        });

        return function (_x42, _x43) {
          return _ref30.apply(this, arguments);
        };
      })());

      yield account.findEachClassificationSet({}, (() => {
        var _ref31 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Classification Sets', index);
          }

          yield _this24.updateClassificationSet(object, account);
        });

        return function (_x44, _x45) {
          return _ref31.apply(this, arguments);
        };
      })());
    })();
  }

  maybeInitialize() {
    var _this25 = this;

    return _asyncToGenerator(function* () {
      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (_this25.tableNames.indexOf('migrations') === -1) {
        console.log('Inititalizing database...');

        yield _this25.setupDatabase();
      }

      yield _this25.maybeRunMigrations(account);
    })();
  }

  maybeRunMigrations(account) {
    var _this26 = this;

    return _asyncToGenerator(function* () {
      _this26.migrations = (yield _this26.run('SELECT name FROM migrations')).map(function (o) {
        return o.name;
      });

      yield _this26.maybeRunMigration('002', account);
      yield _this26.maybeRunMigration('003', account);
      yield _this26.maybeRunMigration('004', account);
    })();
  }

  maybeRunMigration(version, account) {
    var _this27 = this;

    return _asyncToGenerator(function* () {
      if (_this27.migrations.indexOf(version) === -1 && MIGRATIONS[version]) {
        yield _this27.run(_this27.prepareMigrationScript(MIGRATIONS[version]));

        if (version === '002') {
          console.log('Populating system tables...');

          yield _this27.setupSystemTables(account);
          yield _this27.populateRecords(account);
        }
      }
    })();
  }

  populateRecords(account) {
    var _this28 = this;

    return _asyncToGenerator(function* () {
      const forms = yield account.findActiveForms({});

      let index = 0;

      for (const form of forms) {
        index = 0;

        yield form.findEachRecord({}, (() => {
          var _ref32 = _asyncToGenerator(function* (record) {
            record.form = form;

            if (++index % 10 === 0) {
              _this28.progress(form.name, index);
            }

            yield _this28.updateRecord(record, account, false);
          });

          return function (_x46) {
            return _ref32.apply(this, arguments);
          };
        })());
      }
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwicnVuQ29tbWFuZCIsImFjdGl2YXRlIiwiZnVsY3J1bSIsImFyZ3MiLCJwZ0Ryb3AiLCJkcm9wU3lzdGVtVGFibGVzIiwicGdTZXR1cCIsInNldHVwRGF0YWJhc2UiLCJhY2NvdW50IiwiZmV0Y2hBY2NvdW50Iiwib3JnIiwicGdTeXN0ZW1UYWJsZXNPbmx5Iiwic2V0dXBTeXN0ZW1UYWJsZXMiLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInBnRm9ybSIsImlkIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uRm9ybURlbGV0ZSIsIl9pZCIsInJvd19pZCIsIl9uYW1lIiwiZWxlbWVudHMiLCJfZWxlbWVudHNKU09OIiwib25SZWNvcmRTYXZlIiwicmVjb3JkIiwidXBkYXRlUmVjb3JkIiwib25SZWNvcmREZWxldGUiLCJzdGF0ZW1lbnRzIiwiZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInBnZGIiLCJyZWNvcmRWYWx1ZU9wdGlvbnMiLCJtYXAiLCJvIiwiam9pbiIsIm9uUGhvdG9TYXZlIiwicGhvdG8iLCJ1cGRhdGVQaG90byIsIm9uVmlkZW9TYXZlIiwidmlkZW8iLCJ1cGRhdGVWaWRlbyIsIm9uQXVkaW9TYXZlIiwiYXVkaW8iLCJ1cGRhdGVBdWRpbyIsIm9uQ2hhbmdlc2V0U2F2ZSIsImNoYW5nZXNldCIsInVwZGF0ZUNoYW5nZXNldCIsIm9uQ2hvaWNlTGlzdFNhdmUiLCJjaG9pY2VMaXN0IiwidXBkYXRlQ2hvaWNlTGlzdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwiY2xhc3NpZmljYXRpb25TZXQiLCJ1cGRhdGVDbGFzc2lmaWNhdGlvblNldCIsIm9uUHJvamVjdFNhdmUiLCJwcm9qZWN0IiwidXBkYXRlUHJvamVjdCIsIm9uUm9sZVNhdmUiLCJyb2xlIiwidXBkYXRlUm9sZSIsIm9uTWVtYmVyc2hpcFNhdmUiLCJtZW1iZXJzaGlwIiwidXBkYXRlTWVtYmVyc2hpcCIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJiYXNlTWVkaWFVUkwiLCJmb3JtYXRQaG90b1VSTCIsImZvcm1hdFZpZGVvVVJMIiwiZm9ybWF0QXVkaW9VUkwiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInBnQ3VzdG9tTW9kdWxlIiwic2hvdWxkVXBkYXRlUmVjb3JkIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkaXNhYmxlQXJyYXlzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsIm1lc3NhZ2UiLCJwcm9jZXNzIiwic3Rkb3V0IiwiaXNUVFkiLCJjbGVhckxpbmUiLCJjdXJzb3JUbyIsIndyaXRlIiwicHJvZ3Jlc3MiLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdEYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdIb3N0IiwicGdQb3J0IiwicGdVc2VyIiwicGdQYXNzd29yZCIsInBnU2NoZW1hIiwicGdTeW5jRXZlbnRzIiwicGdCZWZvcmVGdW5jdGlvbiIsInBnQWZ0ZXJGdW5jdGlvbiIsInJlcXVpcmVkIiwicGdSZXBvcnRCYXNlVXJsIiwicGdNZWRpYUJhc2VVcmwiLCJwZ1VuZGVyc2NvcmVOYW1lcyIsInBnQXJyYXlzIiwiaGFuZGxlciIsImVzY2FwZUlkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwiaWRlbnQiLCJzdWJzdHJpbmciLCJ1c2VTeW5jRXZlbnRzIiwib3B0aW9ucyIsInVzZXIiLCJwYXNzd29yZCIsInJlcXVpcmUiLCJhcHAiLCJQb29sIiwib24iLCJkYXRhU2NoZW1hIiwic2V0dXBPcHRpb25zIiwibWF5YmVJbml0aWFsaXplIiwiZGVhY3RpdmF0ZSIsImVuZCIsIm9iamVjdCIsInZhbHVlcyIsImZpbGUiLCJhY2Nlc3Nfa2V5IiwidGFibGUiLCJkZWxldGVTdGF0ZW1lbnQiLCJyb3dfcmVzb3VyY2VfaWQiLCJpbnNlcnRTdGF0ZW1lbnQiLCJwayIsInZhbHVlc1RyYW5zZm9ybWVyIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJtZWRpYVZhbHVlIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsImRhdGFOYW1lIiwiYmVmb3JlU3luYyIsImFmdGVyU3luYyIsImZpbmRFYWNoUmVjb3JkIiwicHJlcGFyZU1pZ3JhdGlvblNjcmlwdCIsImZpbmRFYWNoUGhvdG8iLCJmaW5kRWFjaFZpZGVvIiwiZmluZEVhY2hBdWRpbyIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hQcm9qZWN0IiwiZmluZEVhY2hGb3JtIiwiZmluZEVhY2hNZW1iZXJzaGlwIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCIsIm1heWJlUnVuTWlncmF0aW9ucyIsIm1pZ3JhdGlvbnMiLCJtYXliZVJ1bk1pZ3JhdGlvbiIsInZlcnNpb24iLCJwb3B1bGF0ZVJlY29yZHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztJQUlZQSxHOztBQUhaOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUdBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7O0FBRUEsTUFBTUMsd0JBQXdCLEVBQTlCOztBQUVBLE1BQU1DLGtCQUFrQjtBQUN0QkMsWUFBVSxZQURZO0FBRXRCQyxRQUFNLFdBRmdCO0FBR3RCQyxRQUFNLElBSGdCO0FBSXRCQyxPQUFLLEVBSmlCO0FBS3RCQyxxQkFBbUI7QUFMRyxDQUF4Qjs7QUFRQSxNQUFNQyxhQUFhO0FBQ2pCLDBCQURpQjtBQUVqQiwwQkFGaUI7QUFHakI7QUFIaUIsQ0FBbkI7O2tCQU1lLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBNEduQkMsVUE1R21CLHFCQTRHTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFVBQUlDLFFBQVFDLElBQVIsQ0FBYUMsTUFBakIsRUFBeUI7QUFDdkIsY0FBTSxNQUFLQyxnQkFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxVQUFJSCxRQUFRQyxJQUFSLENBQWFHLE9BQWpCLEVBQTBCO0FBQ3hCLGNBQU0sTUFBS0MsYUFB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LFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCcEQsT0FBMUIsRUFBbUMsS0FBbkMsQ0FBTjtBQUNELFdBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBTjtBQVNEO0FBakI0QjtBQWtCOUI7O0FBbnhCa0IsQyIsImZpbGUiOiJwbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGcgZnJvbSAncGcnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUG9zdGdyZXNTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgUG9zdGdyZXNSZWNvcmRWYWx1ZXMsIFBvc3RncmVzIH0gZnJvbSAnZnVsY3J1bSc7XG5pbXBvcnQgc25ha2UgZnJvbSAnc25ha2UtY2FzZSc7XG5pbXBvcnQgdGVtcGxhdGVEcm9wIGZyb20gJy4vdGVtcGxhdGUuZHJvcC5zcWwnO1xuaW1wb3J0IFNjaGVtYU1hcCBmcm9tICcuL3NjaGVtYS1tYXAnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2Z1bGNydW0nO1xuXG5pbXBvcnQgdmVyc2lvbjAwMSBmcm9tICcuL3ZlcnNpb24tMDAxLnNxbCc7XG5pbXBvcnQgdmVyc2lvbjAwMiBmcm9tICcuL3ZlcnNpb24tMDAyLnNxbCc7XG5pbXBvcnQgdmVyc2lvbjAwMyBmcm9tICcuL3ZlcnNpb24tMDAzLnNxbCc7XG5pbXBvcnQgdmVyc2lvbjAwNCBmcm9tICcuL3ZlcnNpb24tMDA0LnNxbCc7XG5cbmNvbnN0IE1BWF9JREVOVElGSUVSX0xFTkdUSCA9IDYzO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmNvbnN0IE1JR1JBVElPTlMgPSB7XG4gICcwMDInOiB2ZXJzaW9uMDAyLFxuICAnMDAzJzogdmVyc2lvbjAwMyxcbiAgJzAwNCc6IHZlcnNpb24wMDRcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Zvcm06IHtcbiAgICAgICAgICBkZXNjOiAndGhlIGZvcm0gSUQgdG8gcmVidWlsZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZXBvcnRCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ3JlcG9ydCBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdNZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnVW5kZXJzY29yZU5hbWVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB1bmRlcnNjb3JlIG5hbWVzIChlLmcuIFwiUGFyayBJbnNwZWN0aW9uc1wiIGJlY29tZXMgXCJwYXJrX2luc3BlY3Rpb25zXCIpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQ3VzdG9tTW9kdWxlOiB7XG4gICAgICAgICAgZGVzYzogJ2EgY3VzdG9tIG1vZHVsZSB0byBsb2FkIHdpdGggc3luYyBleHRlbnNpb25zJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTZXR1cDoge1xuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgfSxcbiAgICAgICAgcGdEcm9wOiB7XG4gICAgICAgICAgZGVzYzogJ2Ryb3AgdGhlIHN5c3RlbSB0YWJsZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdBcnJheXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIGFycmF5IHR5cGVzIGZvciBtdWx0aS12YWx1ZSBmaWVsZHMgbGlrZSBjaG9pY2UgZmllbGRzLCBjbGFzc2lmaWNhdGlvbiBmaWVsZHMgYW5kIG1lZGlhIGZpZWxkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3lzdGVtVGFibGVzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IGNyZWF0ZSB0aGUgc3lzdGVtIHJlY29yZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRHJvcCkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wU3lzdGVtVGFibGVzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NldHVwKSB7XG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ1N5c3RlbVRhYmxlc09ubHkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG5cbiAgICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Zvcm0gJiYgZm9ybS5pZCAhPT0gZnVsY3J1bS5hcmdzLnBnRm9ybSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlYnVpbGRWaWV3c09ubHkpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKGluZGV4KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhmb3JtLm5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkICsgJyByZWNvcmRzJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgZnVsY3J1bS5hcmdzLm9yZyk7XG4gICAgfVxuICB9XG5cbiAgZXNjYXBlSWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIgJiYgdGhpcy5wZ2RiLmlkZW50KGlkZW50aWZpZXIuc3Vic3RyaW5nKDAsIE1BWF9JREVOVElGSUVSX0xFTkdUSCkpO1xuICB9XG5cbiAgZ2V0IHVzZVN5bmNFdmVudHMoKSB7XG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgIT0gbnVsbCA/IGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgOiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGUoKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLlBPU1RHUkVTX0NPTkZJRyxcbiAgICAgIGhvc3Q6IGZ1bGNydW0uYXJncy5wZ0hvc3QgfHwgUE9TVEdSRVNfQ09ORklHLmhvc3QsXG4gICAgICBwb3J0OiBmdWxjcnVtLmFyZ3MucGdQb3J0IHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ0RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZSxcbiAgICAgIHVzZXI6IGZ1bGNydW0uYXJncy5wZ1VzZXIgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXIsXG4gICAgICBwYXNzd29yZDogZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXJcbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1VzZXIpIHtcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5wZ1VzZXI7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkKSB7XG4gICAgICBvcHRpb25zLnBhc3N3b3JkID0gZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSkge1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZSA9IHJlcXVpcmUoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKTtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUuYXBpID0gYXBpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcHAgPSBmdWxjcnVtO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8ICdwdWJsaWMnO1xuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG5cbiAgICB0aGlzLnNldHVwT3B0aW9ucygpO1xuXG4gICAgYXdhaXQgdGhpcy5tYXliZUluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgfVxuXG4gIG9uU3luY1N0YXJ0ID0gYXN5bmMgKHthY2NvdW50LCB0YXNrc30pID0+IHtcbiAgICBhd2FpdCB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG4gIH1cblxuICBvblN5bmNGaW5pc2ggPSBhc3luYyAoe2FjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uRm9ybURlbGV0ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudH0pID0+IHtcbiAgICBjb25zdCBvbGRGb3JtID0ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG51bGwpO1xuICB9XG5cbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUmVjb3JkRGVsZXRlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHJlY29yZC5mb3JtLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvblBob3RvU2F2ZSA9IGFzeW5jICh7cGhvdG8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gIH1cblxuICBvblZpZGVvU2F2ZSA9IGFzeW5jICh7dmlkZW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkF1ZGlvU2F2ZSA9IGFzeW5jICh7YXVkaW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkNoYW5nZXNldFNhdmUgPSBhc3luYyAoe2NoYW5nZXNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7Y2hvaWNlTGlzdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3QoY2hvaWNlTGlzdCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7Y2xhc3NpZmljYXRpb25TZXQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvblByb2plY3RTYXZlID0gYXN5bmMgKHtwcm9qZWN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChwcm9qZWN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUm9sZVNhdmUgPSBhc3luYyAoe3JvbGUsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKHJvbGUsIGFjY291bnQpO1xuICB9XG5cbiAgb25NZW1iZXJzaGlwU2F2ZSA9IGFzeW5jICh7bWVtYmVyc2hpcCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAobWVtYmVyc2hpcCwgYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQaG90byhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAucGhvdG8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRQaG90b1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdwaG90b3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVZpZGVvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC52aWRlbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFZpZGVvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3ZpZGVvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQXVkaW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLmF1ZGlvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0QXVkaW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnYXVkaW8nKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNoYW5nZXNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hhbmdlc2V0KG9iamVjdCksICdjaGFuZ2VzZXRzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5wcm9qZWN0KG9iamVjdCksICdwcm9qZWN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAubWVtYmVyc2hpcChvYmplY3QpLCAnbWVtYmVyc2hpcHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJvbGUob2JqZWN0KSwgJ3JvbGVzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5mb3JtKG9iamVjdCksICdmb3JtcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hvaWNlTGlzdChvYmplY3QpLCAnY2hvaWNlX2xpc3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2xhc3NpZmljYXRpb25TZXQob2JqZWN0KSwgJ2NsYXNzaWZpY2F0aW9uX3NldHMnKTtcbiAgfVxuXG5cbiAgYXN5bmMgdXBkYXRlT2JqZWN0KHZhbHVlcywgdGFibGUpIHtcbiAgICBjb25zdCBkZWxldGVTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuZGVsZXRlU3RhdGVtZW50KCdzeXN0ZW1fJyArIHRhYmxlLCB7cm93X3Jlc291cmNlX2lkOiB2YWx1ZXMucm93X3Jlc291cmNlX2lkfSk7XG4gICAgY29uc3QgaW5zZXJ0U3RhdGVtZW50ID0gdGhpcy5wZ2RiLmluc2VydFN0YXRlbWVudCgnc3lzdGVtXycgKyB0YWJsZSwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcblxuICAgIGNvbnN0IHNxbCA9IFsgZGVsZXRlU3RhdGVtZW50LnNxbCwgaW5zZXJ0U3RhdGVtZW50LnNxbCBdLmpvaW4oJ1xcbicpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBiYXNlTWVkaWFVUkwgPSAoKSA9PiB7XG4gIH1cblxuICBmb3JtYXRQaG90b1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3MvJHsgaWQgfS5qcGdgO1xuICB9XG5cbiAgZm9ybWF0VmlkZW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zLyR7IGlkIH0ubXA0YDtcbiAgfVxuXG4gIGZvcm1hdEF1ZGlvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvLyR7IGlkIH0ubTRhYDtcbiAgfVxuXG4gIHNldHVwT3B0aW9ucygpIHtcbiAgICB0aGlzLmJhc2VNZWRpYVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL2FwaS5mdWxjcnVtYXBwLmNvbS9hcGkvdjInO1xuXG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG5cbiAgICAgIHZhbHVlc1RyYW5zZm9ybWVyOiB0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUudmFsdWVzVHJhbnNmb3JtZXIsXG5cbiAgICAgIG1lZGlhVVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuXG4gICAgICAgIHJldHVybiBtZWRpYVZhbHVlLml0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFBob3RvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFZpZGVvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdEF1ZGlvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgbWVkaWFWaWV3VVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZHMgPSBtZWRpYVZhbHVlLml0ZW1zLm1hcChvID0+IG8ubWVkaWFJRCk7XG5cbiAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3Mvdmlldz9waG90b3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3Mvdmlldz92aWRlb3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby92aWV3P2F1ZGlvPSR7IGlkcyB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCkge1xuICAgICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyID0gKGZlYXR1cmUpID0+IHtcbiAgICAgICAgcmV0dXJuIGAkeyBmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsIH0vcmVwb3J0cy8keyBmZWF0dXJlLmlkIH0ucGRmYDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlUmVjb3JkID0gYXN5bmMgKHJlY29yZCwgYWNjb3VudCwgc2tpcFRhYmxlQ2hlY2spID0+IHtcbiAgICBpZiAoIXNraXBUYWJsZUNoZWNrICYmICF0aGlzLnJvb3RUYWJsZUV4aXN0cyhyZWNvcmQuZm9ybSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0ocmVjb3JkLmZvcm0sIGFjY291bnQsICgpID0+IHt9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQoe3JlY29yZCwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcblxuICAgIGNvbnN0IHN5c3RlbVZhbHVlcyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUocmVjb3JkLCBudWxsLCByZWNvcmQsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yZWNvcmQocmVjb3JkLCBzeXN0ZW1WYWx1ZXMpLCAncmVjb3JkcycpO1xuICB9XG5cbiAgcm9vdFRhYmxlRXhpc3RzID0gKGZvcm0pID0+IHtcbiAgICByZXR1cm4gdGhpcy50YWJsZU5hbWVzLmluZGV4T2YoUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSkpICE9PSAtMTtcbiAgfVxuXG4gIHJlY3JlYXRlRm9ybVRhYmxlcyA9IGFzeW5jIChmb3JtLCBhY2NvdW50KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKHNxbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG51bGwsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSkpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0oe2Zvcm0sIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChmb3JtLCBhY2NvdW50KTtcblxuICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwgdGhpcy5kaXNhYmxlQXJyYXlzLCB0aGlzLnBnQ3VzdG9tTW9kdWxlKTtcblxuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihbJ0JFR0lOIFRSQU5TQUNUSU9OOycsXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlbWVudHMsXG4gICAgICAgICAgICAgICAgICAgICdDT01NSVQgVFJBTlNBQ1RJT047J10uam9pbignXFxuJykpO1xuXG4gICAgaWYgKG5ld0Zvcm0pIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXMgQ0FTQ0FERTsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy5kYXRhU2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgICAgY29uc29sZS5lcnJvcihleC5tZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0NSRUFURSBWSUVXICVzLiVzIEFTIFNFTEVDVCAqIEZST00gJXNfdmlld19mdWxsOycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMuZGF0YVNjaGVtYSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IG5hbWUgPSByZXBlYXRhYmxlID8gYCR7Zm9ybS5uYW1lfSAtICR7cmVwZWF0YWJsZS5kYXRhTmFtZX1gIDogZm9ybS5uYW1lO1xuXG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1VuZGVyc2NvcmVOYW1lcyA/IHNuYWtlKG5hbWUpIDogbmFtZTtcbiAgfVxuXG4gIGFzeW5jIGludm9rZUJlZm9yZUZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLmJlZm9yZVN5bmMpIHtcbiAgICAgIGF3YWl0IHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGludm9rZUFmdGVyRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hZnRlclN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcFN5c3RlbVRhYmxlcygpIHtcbiAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQodGVtcGxhdGVEcm9wKSk7XG4gIH1cblxuICBhc3luYyBzZXR1cERhdGFiYXNlKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh2ZXJzaW9uMDAxKSk7XG4gIH1cblxuICBwcmVwYXJlTWlncmF0aW9uU2NyaXB0KHNxbCkge1xuICAgIHJldHVybiBzcWwucmVwbGFjZSgvX19TQ0hFTUFfXy9nLCAncHVibGljJylcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLmRhdGFTY2hlbWEpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gICAgfTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQaG90byh7fSwgYXN5bmMgKHBob3RvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQaG90b3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFZpZGVvKHt9LCBhc3luYyAodmlkZW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1ZpZGVvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQXVkaW8oe30sIGFzeW5jIChhdWRpbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQXVkaW8nLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENoYW5nZXNldCh7fSwgYXN5bmMgKGNoYW5nZXNldCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hhbmdlc2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hSb2xlKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdSb2xlcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUHJvamVjdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUHJvamVjdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEZvcm0oe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Zvcm1zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hNZW1iZXJzaGlwKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdNZW1iZXJzaGlwcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hvaWNlTGlzdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hvaWNlIExpc3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2xhc3NpZmljYXRpb24gU2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVJbml0aWFsaXplKCkge1xuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmICh0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZignbWlncmF0aW9ucycpID09PSAtMSkge1xuICAgICAgY29uc29sZS5sb2coJ0luaXRpdGFsaXppbmcgZGF0YWJhc2UuLi4nKTtcblxuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyBtYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCkge1xuICAgIHRoaXMubWlncmF0aW9ucyA9IChhd2FpdCB0aGlzLnJ1bignU0VMRUNUIG5hbWUgRlJPTSBtaWdyYXRpb25zJykpLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9uKCcwMDInLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9uKCcwMDMnLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9uKCcwMDQnLCBhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlUnVuTWlncmF0aW9uKHZlcnNpb24sIGFjY291bnQpIHtcbiAgICBpZiAodGhpcy5taWdyYXRpb25zLmluZGV4T2YodmVyc2lvbikgPT09IC0xICYmIE1JR1JBVElPTlNbdmVyc2lvbl0pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdChNSUdSQVRJT05TW3ZlcnNpb25dKSk7XG5cbiAgICAgIGlmICh2ZXJzaW9uID09PSAnMDAyJykge1xuICAgICAgICBjb25zb2xlLmxvZygnUG9wdWxhdGluZyBzeXN0ZW0gdGFibGVzLi4uJyk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgYXdhaXQgdGhpcy5wb3B1bGF0ZVJlY29yZHMoYWNjb3VudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcG9wdWxhdGVSZWNvcmRzKGFjY291bnQpIHtcbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgIGluZGV4ID0gMDtcblxuICAgICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMucHJvZ3Jlc3MoZm9ybS5uYW1lLCBpbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIGZhbHNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICB9XG59XG4iXX0=