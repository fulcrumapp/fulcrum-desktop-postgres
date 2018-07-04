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

        try {
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
        } catch (ex) {
          _this.integrityWarning(ex);
          throw ex;
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

      try {
        yield _this15.run(sql);
      } catch (ex) {
        _this15.integrityWarning(ex);
        throw ex;
      }
    })();
  }

  integrityWarning(ex) {
    console.warn(`
!! warning !!

PostgreSQL database integrity issue encountered. Common sources of postgres database issues are:

* Reinstalling Fulcrum Desktop and using an old postgres database without recreating
  postgres database.
* Deleting the internal application database and using an existing postgres database
* Manually modifying the postgres database
* Form name and repeatable data name combinations that exceeed the postgres limit of 63
  characters. It's best to keep your form names within the limit. The "friendly view"
  feature of the plugin derives the object names from the form and repeatable names.
* Creating multiple apps in Fulcrum with the same name. This is generally OK, except
  you will not be able to use the "friendly view" feature of the postgres plugin since
  the view names are derived from the form names.

Note: When reinstalling Fulcrum Desktop or "starting over" you need to drop and re-create
the postgres database. The names of database objects are tied directly to the database
objects in the internal application database.

---------------------------------------------------------------------
Report issues at https://github.com/fulcrumapp/fulcrum-desktop/issues
---------------------------------------------------------------------
Message: ${ex.message}

Stack:
${ex.stack}
---------------------------------------------------------------------
`.red);
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
        _this16.integrityWarning(ex);
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
        _this17.integrityWarning(ex);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwicnVuQ29tbWFuZCIsImFjdGl2YXRlIiwiZnVsY3J1bSIsImFyZ3MiLCJwZ0Ryb3AiLCJkcm9wU3lzdGVtVGFibGVzIiwicGdTZXR1cCIsInNldHVwRGF0YWJhc2UiLCJhY2NvdW50IiwiZmV0Y2hBY2NvdW50Iiwib3JnIiwicGdTeXN0ZW1UYWJsZXNPbmx5Iiwic2V0dXBTeXN0ZW1UYWJsZXMiLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInBnRm9ybSIsImlkIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uRm9ybURlbGV0ZSIsIl9pZCIsInJvd19pZCIsIl9uYW1lIiwiZWxlbWVudHMiLCJfZWxlbWVudHNKU09OIiwib25SZWNvcmRTYXZlIiwicmVjb3JkIiwidXBkYXRlUmVjb3JkIiwib25SZWNvcmREZWxldGUiLCJzdGF0ZW1lbnRzIiwiZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInBnZGIiLCJyZWNvcmRWYWx1ZU9wdGlvbnMiLCJtYXAiLCJvIiwiam9pbiIsIm9uUGhvdG9TYXZlIiwicGhvdG8iLCJ1cGRhdGVQaG90byIsIm9uVmlkZW9TYXZlIiwidmlkZW8iLCJ1cGRhdGVWaWRlbyIsIm9uQXVkaW9TYXZlIiwiYXVkaW8iLCJ1cGRhdGVBdWRpbyIsIm9uQ2hhbmdlc2V0U2F2ZSIsImNoYW5nZXNldCIsInVwZGF0ZUNoYW5nZXNldCIsIm9uQ2hvaWNlTGlzdFNhdmUiLCJjaG9pY2VMaXN0IiwidXBkYXRlQ2hvaWNlTGlzdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwiY2xhc3NpZmljYXRpb25TZXQiLCJ1cGRhdGVDbGFzc2lmaWNhdGlvblNldCIsIm9uUHJvamVjdFNhdmUiLCJwcm9qZWN0IiwidXBkYXRlUHJvamVjdCIsIm9uUm9sZVNhdmUiLCJyb2xlIiwidXBkYXRlUm9sZSIsIm9uTWVtYmVyc2hpcFNhdmUiLCJtZW1iZXJzaGlwIiwidXBkYXRlTWVtYmVyc2hpcCIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJiYXNlTWVkaWFVUkwiLCJmb3JtYXRQaG90b1VSTCIsImZvcm1hdFZpZGVvVVJMIiwiZm9ybWF0QXVkaW9VUkwiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInBnQ3VzdG9tTW9kdWxlIiwic2hvdWxkVXBkYXRlUmVjb3JkIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkaXNhYmxlQXJyYXlzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImludGVncml0eVdhcm5pbmciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInByb2dyZXNzIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU3luY0V2ZW50cyIsInBnQmVmb3JlRnVuY3Rpb24iLCJwZ0FmdGVyRnVuY3Rpb24iLCJyZXF1aXJlZCIsInBnUmVwb3J0QmFzZVVybCIsInBnTWVkaWFCYXNlVXJsIiwicGdVbmRlcnNjb3JlTmFtZXMiLCJwZ0FycmF5cyIsImhhbmRsZXIiLCJlc2NhcGVJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImlkZW50Iiwic3Vic3RyaW5nIiwidXNlU3luY0V2ZW50cyIsIm9wdGlvbnMiLCJ1c2VyIiwicGFzc3dvcmQiLCJyZXF1aXJlIiwiYXBwIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJvYmplY3QiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJ3YXJuIiwic3RhY2siLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJkYXRhTmFtZSIsImJlZm9yZVN5bmMiLCJhZnRlclN5bmMiLCJmaW5kRWFjaFJlY29yZCIsInByZXBhcmVNaWdyYXRpb25TY3JpcHQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaENoYW5nZXNldCIsImZpbmRFYWNoUm9sZSIsImZpbmRFYWNoUHJvamVjdCIsImZpbmRFYWNoRm9ybSIsImZpbmRFYWNoTWVtYmVyc2hpcCIsImZpbmRFYWNoQ2hvaWNlTGlzdCIsImZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQiLCJtYXliZVJ1bk1pZ3JhdGlvbnMiLCJtaWdyYXRpb25zIiwibWF5YmVSdW5NaWdyYXRpb24iLCJ2ZXJzaW9uIiwicG9wdWxhdGVSZWNvcmRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7SUFJWUEsRzs7QUFIWjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFHQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7OztBQUVBLE1BQU1DLHdCQUF3QixFQUE5Qjs7QUFFQSxNQUFNQyxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O0FBUUEsTUFBTUMsYUFBYTtBQUNqQiwwQkFEaUI7QUFFakIsMEJBRmlCO0FBR2pCO0FBSGlCLENBQW5COztrQkFNZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQTRHbkJDLFVBNUdtQixxQkE0R04sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxVQUFJQyxRQUFRQyxJQUFSLENBQWFDLE1BQWpCLEVBQXlCO0FBQ3ZCLGNBQU0sTUFBS0MsZ0JBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSUgsUUFBUUMsSUFBUixDQUFh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QStCO0FBQUE7O0FBQUE7QUFDN0IsWUFBTU0sUUFBUSxNQUFNTixRQUFRTyxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLFVBQUlPLFFBQVEsQ0FBWjs7QUFFQSxXQUFLLE1BQU1OLElBQVgsSUFBbUJGLEtBQW5CLEVBQTBCO0FBQ3hCUSxnQkFBUSxDQUFSOztBQUVBLGNBQU1OLEtBQUswTCxjQUFMLENBQW9CLEVBQXBCO0FBQUEseUNBQXdCLFdBQU85SSxNQUFQLEVBQWtCO0FBQzlDQSxtQkFBTzVDLElBQVAsR0FBY0EsSUFBZDs7QUFFQSxnQkFBSSxFQUFFTSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QixzQkFBSzhHLFFBQUwsQ0FBY3BILEtBQUtRLElBQW5CLEVBQXlCRixLQUF6QjtBQUNEOztBQUVELGtCQUFNLFFBQUt1QyxZQUFMLENBQWtCRCxNQUFsQixFQUEwQnBELE9BQTFCLEVBQW1DLEtBQW5DLENBQU47QUFDRCxXQVJLOztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQU47QUFTRDtBQWpCNEI7QUFrQjlCOztBQTd6QmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuaW1wb3J0IHRlbXBsYXRlRHJvcCBmcm9tICcuL3RlbXBsYXRlLmRyb3Auc3FsJztcbmltcG9ydCBTY2hlbWFNYXAgZnJvbSAnLi9zY2hlbWEtbWFwJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdmdWxjcnVtJztcblxuaW1wb3J0IHZlcnNpb24wMDEgZnJvbSAnLi92ZXJzaW9uLTAwMS5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDIgZnJvbSAnLi92ZXJzaW9uLTAwMi5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDMgZnJvbSAnLi92ZXJzaW9uLTAwMy5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDQgZnJvbSAnLi92ZXJzaW9uLTAwNC5zcWwnO1xuXG5jb25zdCBNQVhfSURFTlRJRklFUl9MRU5HVEggPSA2MztcblxuY29uc3QgUE9TVEdSRVNfQ09ORklHID0ge1xuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxuICBob3N0OiAnbG9jYWxob3N0JyxcbiAgcG9ydDogNTQzMixcbiAgbWF4OiAxMCxcbiAgaWRsZVRpbWVvdXRNaWxsaXM6IDMwMDAwXG59O1xuXG5jb25zdCBNSUdSQVRJT05TID0ge1xuICAnMDAyJzogdmVyc2lvbjAwMixcbiAgJzAwMyc6IHZlcnNpb24wMDMsXG4gICcwMDQnOiB2ZXJzaW9uMDA0XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGFzeW5jIHRhc2soY2xpKSB7XG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICdwb3N0Z3JlcycsXG4gICAgICBkZXNjOiAncnVuIHRoZSBwb3N0Z3JlcyBzeW5jIGZvciBhIHNwZWNpZmljIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIHBnRGF0YWJhc2U6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBkYXRhYmFzZSBuYW1lJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdIb3N0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIGhvc3QnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIHBnUG9ydDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBwb3J0JyxcbiAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLnBvcnRcbiAgICAgICAgfSxcbiAgICAgICAgcGdVc2VyOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgdXNlcicsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdQYXNzd29yZDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHBhc3N3b3JkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NjaGVtYToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeW5jRXZlbnRzOiB7XG4gICAgICAgICAgZGVzYzogJ2FkZCBzeW5jIGV2ZW50IGhvb2tzJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ0JlZm9yZUZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnQWZ0ZXJGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdGb3JtOiB7XG4gICAgICAgICAgZGVzYzogJ3RoZSBmb3JtIElEIHRvIHJlYnVpbGQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVwb3J0QmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdyZXBvcnQgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnTWVkaWFCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ21lZGlhIFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1VuZGVyc2NvcmVOYW1lczoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdW5kZXJzY29yZSBuYW1lcyAoZS5nLiBcIlBhcmsgSW5zcGVjdGlvbnNcIiBiZWNvbWVzIFwicGFya19pbnNwZWN0aW9uc1wiKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ1JlYnVpbGRWaWV3c09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSByZWJ1aWxkIHRoZSB2aWV3cycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0N1c3RvbU1vZHVsZToge1xuICAgICAgICAgIGRlc2M6ICdhIGN1c3RvbSBtb2R1bGUgdG8gbG9hZCB3aXRoIHN5bmMgZXh0ZW5zaW9ucycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2V0dXA6IHtcbiAgICAgICAgICBkZXNjOiAnc2V0dXAgdGhlIGRhdGFiYXNlJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgIH0sXG4gICAgICAgIHBnRHJvcDoge1xuICAgICAgICAgIGRlc2M6ICdkcm9wIHRoZSBzeXN0ZW0gdGFibGVzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQXJyYXlzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSBhcnJheSB0eXBlcyBmb3IgbXVsdGktdmFsdWUgZmllbGRzIGxpa2UgY2hvaWNlIGZpZWxkcywgY2xhc3NpZmljYXRpb24gZmllbGRzIGFuZCBtZWRpYSBmaWVsZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ1N5c3RlbVRhYmxlc09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSBjcmVhdGUgdGhlIHN5c3RlbSByZWNvcmRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Ryb3ApIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcFN5c3RlbVRhYmxlcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTZXR1cCkge1xuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTeXN0ZW1UYWJsZXNPbmx5KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdGb3JtICYmIGZvcm0uaWQgIT09IGZ1bGNydW0uYXJncy5wZ0Zvcm0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZWJ1aWxkVmlld3NPbmx5KSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIChpbmRleCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIGVzY2FwZUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICAgIHJldHVybiBpZGVudGlmaWVyICYmIHRoaXMucGdkYi5pZGVudChpZGVudGlmaWVyLnN1YnN0cmluZygwLCBNQVhfSURFTlRJRklFUl9MRU5HVEgpKTtcbiAgfVxuXG4gIGdldCB1c2VTeW5jRXZlbnRzKCkge1xuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzIDogdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdIb3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBnUG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdEYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2UsXG4gICAgICB1c2VyOiBmdWxjcnVtLmFyZ3MucGdVc2VyIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyXG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdVc2VyKSB7XG4gICAgICBvcHRpb25zLnVzZXIgPSBmdWxjcnVtLmFyZ3MucGdVc2VyO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCkge1xuICAgICAgb3B0aW9ucy5wYXNzd29yZCA9IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpIHtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUgPSByZXF1aXJlKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSk7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFwaSA9IGFwaTtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUuYXBwID0gZnVsY3J1bTtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQXJyYXlzID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5kaXNhYmxlQXJyYXlzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLnBvb2wgPSBuZXcgcGcuUG9vbChvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnVzZVN5bmNFdmVudHMpIHtcbiAgICAgIGZ1bGNydW0ub24oJ3N5bmM6c3RhcnQnLCB0aGlzLm9uU3luY1N0YXJ0KTtcbiAgICAgIGZ1bGNydW0ub24oJ3N5bmM6ZmluaXNoJywgdGhpcy5vblN5bmNGaW5pc2gpO1xuICAgICAgZnVsY3J1bS5vbigncGhvdG86c2F2ZScsIHRoaXMub25QaG90b1NhdmUpO1xuICAgICAgZnVsY3J1bS5vbigndmlkZW86c2F2ZScsIHRoaXMub25WaWRlb1NhdmUpO1xuICAgICAgZnVsY3J1bS5vbignYXVkaW86c2F2ZScsIHRoaXMub25BdWRpb1NhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2hhbmdlc2V0OnNhdmUnLCB0aGlzLm9uQ2hhbmdlc2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcblxuICAgICAgZnVsY3J1bS5vbignY2hvaWNlLWxpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpkZWxldGUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOnNhdmUnLCB0aGlzLm9uRm9ybVNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignZm9ybTpkZWxldGUnLCB0aGlzLm9uRm9ybVNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6c2F2ZScsIHRoaXMub25DbGFzc2lmaWNhdGlvblNldFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb24tc2V0OmRlbGV0ZScsIHRoaXMub25DbGFzc2lmaWNhdGlvblNldFNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOnNhdmUnLCB0aGlzLm9uUm9sZVNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncm9sZTpkZWxldGUnLCB0aGlzLm9uUm9sZVNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncHJvamVjdDpkZWxldGUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOnNhdmUnLCB0aGlzLm9uTWVtYmVyc2hpcFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignbWVtYmVyc2hpcDpkZWxldGUnLCB0aGlzLm9uTWVtYmVyc2hpcFNhdmUpO1xuICAgIH1cblxuICAgIC8vIEZldGNoIGFsbCB0aGUgZXhpc3RpbmcgdGFibGVzIG9uIHN0YXJ0dXAuIFRoaXMgYWxsb3dzIHVzIHRvIHNwZWNpYWwgY2FzZSB0aGVcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XG4gICAgLy8gZXhpc3QsIHdlIGNhbiBwcmV0ZW5kIHRoZSBmb3JtIGlzIHZlcnNpb24gMSBzbyBpdCBjcmVhdGVzIGFsbCBuZXcgdGFibGVzIGluc3RlYWRcbiAgICAvLyBvZiBhcHBseWluZyBhIHNjaGVtYSBkaWZmLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMuZGF0YVNjaGVtYSA9IGZ1bGNydW0uYXJncy5wZ1NjaGVtYSB8fCAncHVibGljJztcbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuXG4gICAgdGhpcy5zZXR1cE9wdGlvbnMoKTtcblxuICAgIGF3YWl0IHRoaXMubWF5YmVJbml0aWFsaXplKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gIH1cblxuICBvblN5bmNTdGFydCA9IGFzeW5jICh7YWNjb3VudCwgdGFza3N9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuICB9XG5cbiAgb25TeW5jRmluaXNoID0gYXN5bmMgKHthY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvbkZvcm1EZWxldGUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnR9KSA9PiB7XG4gICAgY29uc3Qgb2xkRm9ybSA9IHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBudWxsKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25QaG90b1NhdmUgPSBhc3luYyAoe3Bob3RvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICB9XG5cbiAgb25WaWRlb1NhdmUgPSBhc3luYyAoe3ZpZGVvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25BdWRpb1NhdmUgPSBhc3luYyAoe2F1ZGlvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25DaGFuZ2VzZXRTYXZlID0gYXN5bmMgKHtjaGFuZ2VzZXQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hvaWNlTGlzdFNhdmUgPSBhc3luYyAoe2Nob2ljZUxpc3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KGNob2ljZUxpc3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe2NsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQoY2xhc3NpZmljYXRpb25TZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7cHJvamVjdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3QocHJvamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJvbGVTYXZlID0gYXN5bmMgKHtyb2xlLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShyb2xlLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uTWVtYmVyc2hpcFNhdmUgPSBhc3luYyAoe21lbWJlcnNoaXAsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG1lbWJlcnNoaXAsIGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUGhvdG8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnBob3RvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0UGhvdG9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAncGhvdG9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVWaWRlbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAudmlkZW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRWaWRlb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICd2aWRlb3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUF1ZGlvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5hdWRpbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdEF1ZGlvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ2F1ZGlvJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaGFuZ2VzZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNoYW5nZXNldChvYmplY3QpLCAnY2hhbmdlc2V0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucHJvamVjdChvYmplY3QpLCAncHJvamVjdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLm1lbWJlcnNoaXAob2JqZWN0KSwgJ21lbWJlcnNoaXBzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yb2xlKG9iamVjdCksICdyb2xlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuZm9ybShvYmplY3QpLCAnZm9ybXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNob2ljZUxpc3Qob2JqZWN0KSwgJ2Nob2ljZV9saXN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCksICdjbGFzc2lmaWNhdGlvbl9zZXRzJyk7XG4gIH1cblxuXG4gIGFzeW5jIHVwZGF0ZU9iamVjdCh2YWx1ZXMsIHRhYmxlKSB7XG4gICAgY29uc3QgZGVsZXRlU3RhdGVtZW50ID0gdGhpcy5wZ2RiLmRlbGV0ZVN0YXRlbWVudCgnc3lzdGVtXycgKyB0YWJsZSwge3Jvd19yZXNvdXJjZV9pZDogdmFsdWVzLnJvd19yZXNvdXJjZV9pZH0pO1xuICAgIGNvbnN0IGluc2VydFN0YXRlbWVudCA9IHRoaXMucGdkYi5pbnNlcnRTdGF0ZW1lbnQoJ3N5c3RlbV8nICsgdGFibGUsIHZhbHVlcywge3BrOiAnaWQnfSk7XG5cbiAgICBjb25zdCBzcWwgPSBbIGRlbGV0ZVN0YXRlbWVudC5zcWwsIGluc2VydFN0YXRlbWVudC5zcWwgXS5qb2luKCdcXG4nKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0ncHVibGljJ1wiKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIGJhc2VNZWRpYVVSTCA9ICgpID0+IHtcbiAgfVxuXG4gIGZvcm1hdFBob3RvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy8keyBpZCB9LmpwZ2A7XG4gIH1cblxuICBmb3JtYXRWaWRlb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3MvJHsgaWQgfS5tcDRgO1xuICB9XG5cbiAgZm9ybWF0QXVkaW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vJHsgaWQgfS5tNGFgO1xuICB9XG5cbiAgaW50ZWdyaXR5V2FybmluZyhleCkge1xuICAgIGNvbnNvbGUud2FybihgXG4hISB3YXJuaW5nICEhXG5cblBvc3RncmVTUUwgZGF0YWJhc2UgaW50ZWdyaXR5IGlzc3VlIGVuY291bnRlcmVkLiBDb21tb24gc291cmNlcyBvZiBwb3N0Z3JlcyBkYXRhYmFzZSBpc3N1ZXMgYXJlOlxuXG4qIFJlaW5zdGFsbGluZyBGdWxjcnVtIERlc2t0b3AgYW5kIHVzaW5nIGFuIG9sZCBwb3N0Z3JlcyBkYXRhYmFzZSB3aXRob3V0IHJlY3JlYXRpbmdcbiAgcG9zdGdyZXMgZGF0YWJhc2UuXG4qIERlbGV0aW5nIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZSBhbmQgdXNpbmcgYW4gZXhpc3RpbmcgcG9zdGdyZXMgZGF0YWJhc2VcbiogTWFudWFsbHkgbW9kaWZ5aW5nIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBGb3JtIG5hbWUgYW5kIHJlcGVhdGFibGUgZGF0YSBuYW1lIGNvbWJpbmF0aW9ucyB0aGF0IGV4Y2VlZWQgdGhlIHBvc3RncmVzIGxpbWl0IG9mIDYzXG4gIGNoYXJhY3RlcnMuIEl0J3MgYmVzdCB0byBrZWVwIHlvdXIgZm9ybSBuYW1lcyB3aXRoaW4gdGhlIGxpbWl0LiBUaGUgXCJmcmllbmRseSB2aWV3XCJcbiAgZmVhdHVyZSBvZiB0aGUgcGx1Z2luIGRlcml2ZXMgdGhlIG9iamVjdCBuYW1lcyBmcm9tIHRoZSBmb3JtIGFuZCByZXBlYXRhYmxlIG5hbWVzLlxuKiBDcmVhdGluZyBtdWx0aXBsZSBhcHBzIGluIEZ1bGNydW0gd2l0aCB0aGUgc2FtZSBuYW1lLiBUaGlzIGlzIGdlbmVyYWxseSBPSywgZXhjZXB0XG4gIHlvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIHVzZSB0aGUgXCJmcmllbmRseSB2aWV3XCIgZmVhdHVyZSBvZiB0aGUgcG9zdGdyZXMgcGx1Z2luIHNpbmNlXG4gIHRoZSB2aWV3IG5hbWVzIGFyZSBkZXJpdmVkIGZyb20gdGhlIGZvcm0gbmFtZXMuXG5cbk5vdGU6IFdoZW4gcmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBvciBcInN0YXJ0aW5nIG92ZXJcIiB5b3UgbmVlZCB0byBkcm9wIGFuZCByZS1jcmVhdGVcbnRoZSBwb3N0Z3JlcyBkYXRhYmFzZS4gVGhlIG5hbWVzIG9mIGRhdGFiYXNlIG9iamVjdHMgYXJlIHRpZWQgZGlyZWN0bHkgdG8gdGhlIGRhdGFiYXNlXG5vYmplY3RzIGluIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZS5cblxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5SZXBvcnQgaXNzdWVzIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9mdWxjcnVtYXBwL2Z1bGNydW0tZGVza3RvcC9pc3N1ZXNcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuTWVzc2FnZTogJHsgZXgubWVzc2FnZSB9XG5cblN0YWNrOlxuJHsgZXguc3RhY2sgfVxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5gLnJlZFxuICAgICk7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5iYXNlTWVkaWFVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly9hcGkuZnVsY3J1bWFwcC5jb20vYXBpL3YyJztcblxuICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zID0ge1xuICAgICAgZGlzYWJsZUFycmF5czogdGhpcy5kaXNhYmxlQXJyYXlzLFxuXG4gICAgICB2YWx1ZXNUcmFuc2Zvcm1lcjogdGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnZhbHVlc1RyYW5zZm9ybWVyLFxuXG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcblxuICAgICAgICByZXR1cm4gbWVkaWFWYWx1ZS5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRQaG90b1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRWaWRlb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRBdWRpb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zL3ZpZXc/cGhvdG9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQgJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkKHtyZWNvcmQsIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG5cbiAgICBjb25zdCBzeXN0ZW1WYWx1ZXMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5zeXN0ZW1Db2x1bW5WYWx1ZXNGb3JGZWF0dXJlKHJlY29yZCwgbnVsbCwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucmVjb3JkKHJlY29yZCwgc3lzdGVtVmFsdWVzKSwgJ3JlY29yZHMnKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtKHtmb3JtLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtT2JqZWN0KGZvcm0sIGFjY291bnQpO1xuXG4gICAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0sIHRoaXMuZGlzYWJsZUFycmF5cywgdGhpcy5wZ0N1c3RvbU1vZHVsZSk7XG5cbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKFsnQkVHSU4gVFJBTlNBQ1RJT047JyxcbiAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICdDT01NSVQgVFJBTlNBQ1RJT047J10uam9pbignXFxuJykpO1xuXG4gICAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXMgQ0FTQ0FERTsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy5kYXRhU2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUlkZW50aWZpZXIodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgPyBzbmFrZShuYW1lKSA6IG5hbWU7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmJlZm9yZVN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hZnRlclN5bmMpIHtcbiAgICAgIGF3YWl0IHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcyhpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBwcm9ncmVzcyhpbmRleCk7XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cblxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BTeXN0ZW1UYWJsZXMoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHRlbXBsYXRlRHJvcCkpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBEYXRhYmFzZSgpIHtcbiAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQodmVyc2lvbjAwMSkpO1xuICB9XG5cbiAgcHJlcGFyZU1pZ3JhdGlvblNjcmlwdChzcWwpIHtcbiAgICByZXR1cm4gc3FsLnJlcGxhY2UoL19fU0NIRU1BX18vZywgJ3B1YmxpYycpXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9fX1ZJRVdfU0NIRU1BX18vZywgdGhpcy5kYXRhU2NoZW1hKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpIHtcbiAgICBjb25zdCBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICAgIH07XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUGhvdG8oe30sIGFzeW5jIChwaG90bywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUGhvdG9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hWaWRlbyh7fSwgYXN5bmMgKHZpZGVvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdWaWRlb3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEF1ZGlvKHt9LCBhc3luYyAoYXVkaW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0F1ZGlvJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaGFuZ2VzZXQoe30sIGFzeW5jIChjaGFuZ2VzZXQsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NoYW5nZXNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUm9sZSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUm9sZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFByb2plY3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Byb2plY3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hGb3JtKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdGb3JtcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoTWVtYmVyc2hpcCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnTWVtYmVyc2hpcHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENob2ljZUxpc3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Nob2ljZSBMaXN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NsYXNzaWZpY2F0aW9uIFNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlSW5pdGlhbGl6ZSgpIHtcbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAodGhpcy50YWJsZU5hbWVzLmluZGV4T2YoJ21pZ3JhdGlvbnMnKSA9PT0gLTEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdJbml0aXRhbGl6aW5nIGRhdGFiYXNlLi4uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb25zKGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVSdW5NaWdyYXRpb25zKGFjY291bnQpIHtcbiAgICB0aGlzLm1pZ3JhdGlvbnMgPSAoYXdhaXQgdGhpcy5ydW4oJ1NFTEVDVCBuYW1lIEZST00gbWlncmF0aW9ucycpKS5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbignMDAyJywgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbignMDAzJywgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbignMDA0JywgYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyBtYXliZVJ1bk1pZ3JhdGlvbih2ZXJzaW9uLCBhY2NvdW50KSB7XG4gICAgaWYgKHRoaXMubWlncmF0aW9ucy5pbmRleE9mKHZlcnNpb24pID09PSAtMSAmJiBNSUdSQVRJT05TW3ZlcnNpb25dKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQoTUlHUkFUSU9OU1t2ZXJzaW9uXSkpO1xuXG4gICAgICBpZiAodmVyc2lvbiA9PT0gJzAwMicpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BvcHVsYXRpbmcgc3lzdGVtIHRhYmxlcy4uLicpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgIGF3YWl0IHRoaXMucG9wdWxhdGVSZWNvcmRzKGFjY291bnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KSB7XG4gICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBpbmRleCA9IDA7XG5cbiAgICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgICB0aGlzLnByb2dyZXNzKGZvcm0ubmFtZSwgaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCBmYWxzZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgIHRoaXMudXBkYXRlU3RhdHVzKG5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkKTtcbiAgfVxufVxuIl19