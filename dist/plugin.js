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

var _lodash = require('lodash');

var _version = require('./version-001.sql');

var _version2 = _interopRequireDefault(_version);

var _version3 = require('./version-002.sql');

var _version4 = _interopRequireDefault(_version3);

var _version5 = require('./version-003.sql');

var _version6 = _interopRequireDefault(_version5);

var _version7 = require('./version-004.sql');

var _version8 = _interopRequireDefault(_version7);

var _version9 = require('./version-005.sql');

var _version10 = _interopRequireDefault(_version9);

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
  '004': _version8.default,
  '005': _version10.default
};

const CURRENT_VERSION = 5;

const DEFAULT_SCHEMA = 'public';

const { log, warn, error } = fulcrum.logger.withContext('postgres');

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

          log('');
        }

        yield _this.invokeAfterFunction();
      } else {
        error('Unable to find account', fulcrum.args.org);
      }
    });

    this.run = sql => {
      sql = sql.replace(/\0/g, '');

      if (fulcrum.args.debug) {
        log(sql);
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
      if (this.useAccountPrefix) {
        return 'account_' + account.rowID + '_' + name;
      }

      return name;
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
        yield _this.cleanupFriendlyViews(account);
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

    this.onSignatureSave = (() => {
      var _ref11 = _asyncToGenerator(function* ({ signature, account }) {
        yield _this.updateSignature(signature, account);
      });

      return function (_x10) {
        return _ref11.apply(this, arguments);
      };
    })();

    this.onChangesetSave = (() => {
      var _ref12 = _asyncToGenerator(function* ({ changeset, account }) {
        yield _this.updateChangeset(changeset, account);
      });

      return function (_x11) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref13 = _asyncToGenerator(function* ({ choiceList, account }) {
        yield _this.updateChoiceList(choiceList, account);
      });

      return function (_x12) {
        return _ref13.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref14 = _asyncToGenerator(function* ({ classificationSet, account }) {
        yield _this.updateClassificationSet(classificationSet, account);
      });

      return function (_x13) {
        return _ref14.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref15 = _asyncToGenerator(function* ({ project, account }) {
        yield _this.updateProject(project, account);
      });

      return function (_x14) {
        return _ref15.apply(this, arguments);
      };
    })();

    this.onRoleSave = (() => {
      var _ref16 = _asyncToGenerator(function* ({ role, account }) {
        yield _this.updateRole(role, account);
      });

      return function (_x15) {
        return _ref16.apply(this, arguments);
      };
    })();

    this.onMembershipSave = (() => {
      var _ref17 = _asyncToGenerator(function* ({ membership, account }) {
        yield _this.updateMembership(membership, account);
      });

      return function (_x16) {
        return _ref17.apply(this, arguments);
      };
    })();

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema='${_this.dataSchema}'`);

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });
    this.reloadViewList = _asyncToGenerator(function* () {
      const rows = yield _this.run(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema='${_this.viewSchema}'`);
      _this.viewNames = rows.map(function (o) {
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

    this.formatSignatureURL = id => {
      return `${this.baseMediaURL}/signatures/${id}.png`;
    };

    this.updateRecord = (() => {
      var _ref20 = _asyncToGenerator(function* (record, account, skipTableCheck) {
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

        const systemValues = _fulcrumDesktopPlugin.PostgresRecordValues.systemColumnValuesForFeature(record, null, record, _extends({}, _this.recordValueOptions, {
          disableComplexTypes: false }));

        yield _this.updateObject(_schemaMap2.default.record(record, systemValues), 'records');
      });

      return function (_x17, _x18, _x19) {
        return _ref20.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, null, this.recordValueOptions)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref21 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            error(ex);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x20, _x21) {
        return _ref21.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref22 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        if (_this.pgCustomModule && _this.pgCustomModule.shouldUpdateForm && !_this.pgCustomModule.shouldUpdateForm({ form, account })) {
          return;
        }

        try {
          yield _this.updateFormObject(form, account);

          if (!_this.rootTableExists(form) && newForm != null) {
            oldForm = null;
          }

          const options = {
            disableArrays: _this.disableArrays,
            disableComplexTypes: _this.disableComplexTypes,
            userModule: _this.pgCustomModule,
            tableSchema: _this.dataSchema,
            calculatedFieldDateFormat: 'date',
            metadata: true,
            useResourceID: _this.persistentTableNames,
            accountPrefix: _this.useAccountPrefix ? 'account_' + _this.account.rowID : null
          };

          const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm, options);

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

      return function (_x22, _x23, _x24, _x25) {
        return _ref22.apply(this, arguments);
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
          pgSchemaViews: {
            desc: 'postgresql schema for the friendly views',
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
            default: true
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
          // pgPersistentTableNames: {
          //   desc: 'use the server id in the form table names',
          //   required: false,
          //   type: 'boolean',
          //   default: false
          // },
          pgPrefix: {
            desc: 'use the organization as a prefix in the object names',
            required: false,
            type: 'boolean',
            default: true
          },
          pgSimpleTypes: {
            desc: 'use simple types in the database that are more compatible with other applications (no tsvector, geometry, arrays)',
            required: false,
            type: 'boolean',
            default: false
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

  trimIdentifier(identifier) {
    return identifier.substring(0, MAX_IDENTIFIER_LENGTH);
  }

  escapeIdentifier(identifier) {
    return identifier && this.pgdb.ident(this.trimIdentifier(identifier));
  }

  get useSyncEvents() {
    return fulcrum.args.pgSyncEvents != null ? fulcrum.args.pgSyncEvents : true;
  }

  activate() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      _this3.account = yield fulcrum.fetchAccount(fulcrum.args.org);

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

      if (fulcrum.args.pgSimpleTypes === true) {
        _this3.disableComplexTypes = true;
      }

      // if (fulcrum.args.pgPersistentTableNames === true) {
      // this.persistentTableNames = true;
      // }

      _this3.useAccountPrefix = fulcrum.args.pgPrefix !== false;

      _this3.pool = new _pg2.default.Pool(options);

      if (_this3.useSyncEvents) {
        fulcrum.on('sync:start', _this3.onSyncStart);
        fulcrum.on('sync:finish', _this3.onSyncFinish);
        fulcrum.on('photo:save', _this3.onPhotoSave);
        fulcrum.on('video:save', _this3.onVideoSave);
        fulcrum.on('audio:save', _this3.onAudioSave);
        fulcrum.on('signature:save', _this3.onSignatureSave);
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

      _this3.viewSchema = fulcrum.args.pgSchemaViews || DEFAULT_SCHEMA;
      _this3.dataSchema = fulcrum.args.pgSchema || DEFAULT_SCHEMA;

      // Fetch all the existing tables on startup. This allows us to special case the
      // creation of new tables even when the form isn't version 1. If the table doesn't
      // exist, we can pretend the form is version 1 so it creates all new tables instead
      // of applying a schema diff.
      const rows = yield _this3.run(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema='${_this3.dataSchema}'`);

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

  updateSignature(object, account) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      const values = _schemaMap2.default.signature(object);

      values.file = _this8.formatSignatureURL(values.access_key);

      yield _this8.updateObject(values, 'signatures');
    })();
  }

  updateChangeset(object, account) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      yield _this9.updateObject(_schemaMap2.default.changeset(object), 'changesets');
    })();
  }

  updateProject(object, account) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      yield _this10.updateObject(_schemaMap2.default.project(object), 'projects');
    })();
  }

  updateMembership(object, account) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      yield _this11.updateObject(_schemaMap2.default.membership(object), 'memberships');
    })();
  }

  updateRole(object, account) {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      yield _this12.updateObject(_schemaMap2.default.role(object), 'roles');
    })();
  }

  updateFormObject(object, account) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      yield _this13.updateObject(_schemaMap2.default.form(object), 'forms');
    })();
  }

  updateChoiceList(object, account) {
    var _this14 = this;

    return _asyncToGenerator(function* () {
      yield _this14.updateObject(_schemaMap2.default.choiceList(object), 'choice_lists');
    })();
  }

  updateClassificationSet(object, account) {
    var _this15 = this;

    return _asyncToGenerator(function* () {
      yield _this15.updateObject(_schemaMap2.default.classificationSet(object), 'classification_sets');
    })();
  }

  updateObject(values, table) {
    var _this16 = this;

    return _asyncToGenerator(function* () {
      const deleteStatement = _this16.pgdb.deleteStatement(`${_this16.dataSchema}.system_${table}`, { row_resource_id: values.row_resource_id });
      const insertStatement = _this16.pgdb.insertStatement(`${_this16.dataSchema}.system_${table}`, values, { pk: 'id' });

      const sql = [deleteStatement.sql, insertStatement.sql].join('\n');

      try {
        yield _this16.run(sql);
      } catch (ex) {
        _this16.integrityWarning(ex);
        throw ex;
      }
    })();
  }

  integrityWarning(ex) {
    warn(`
-------------
!! WARNING !!
-------------

PostgreSQL database integrity issue encountered. Common sources of postgres database issues are:

* Reinstalling Fulcrum Desktop and using an old postgres database without recreating
  the postgres database.
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
Message:
${ex.message}

Stack:
${ex.stack}
---------------------------------------------------------------------
`.red);
  }

  setupOptions() {
    this.baseMediaURL = fulcrum.args.pgMediaBaseUrl ? fulcrum.args.pgMediaBaseUrl : 'https://api.fulcrumapp.com/api/v2';

    this.recordValueOptions = {
      schema: this.dataSchema,

      disableArrays: this.disableArrays,

      accountPrefix: this.useAccountPrefix ? 'account_' + this.account.rowID : null,

      calculatedFieldDateFormat: 'date',

      disableComplexTypes: this.disableComplexTypes,

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
    var _this17 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this17.getFriendlyTableName(form, repeatable);

      try {
        yield _this17.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s CASCADE;', _this17.escapeIdentifier(_this17.viewSchema), _this17.escapeIdentifier(viewName)));
      } catch (ex) {
        _this17.integrityWarning(ex);
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this18 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this18.getFriendlyTableName(form, repeatable);

      try {
        yield _this18.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this18.escapeIdentifier(_this18.viewSchema), _this18.escapeIdentifier(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable, _this18.recordValueOptions)));
      } catch (ex) {
        // sometimes it doesn't exist
        _this18.integrityWarning(ex);
      }
    })();
  }

  getFriendlyTableName(form, repeatable) {
    const name = (0, _lodash.compact)([form.name, repeatable && repeatable.dataName]).join(' - ');

    const formID = this.persistentTableNames ? form.id : form.rowID;

    const prefix = (0, _lodash.compact)(['view', formID, repeatable && repeatable.key]).join(' - ');

    const objectName = [prefix, name].join(' - ');

    return this.trimIdentifier(fulcrum.args.pgUnderscoreNames !== false ? (0, _snakeCase2.default)(objectName) : objectName);
  }

  invokeBeforeFunction() {
    var _this19 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgBeforeFunction) {
        yield _this19.run((0, _util.format)('SELECT %s();', fulcrum.args.pgBeforeFunction));
      }
      if (_this19.pgCustomModule && _this19.pgCustomModule.beforeSync) {
        yield _this19.pgCustomModule.beforeSync();
      }
    })();
  }

  invokeAfterFunction() {
    var _this20 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgAfterFunction) {
        yield _this20.run((0, _util.format)('SELECT %s();', fulcrum.args.pgAfterFunction));
      }
      if (_this20.pgCustomModule && _this20.pgCustomModule.afterSync) {
        yield _this20.pgCustomModule.afterSync();
      }
    })();
  }

  rebuildForm(form, account, progress) {
    var _this21 = this;

    return _asyncToGenerator(function* () {
      yield _this21.recreateFormTables(form, account);
      yield _this21.reloadTableList();

      let index = 0;

      yield form.findEachRecord({}, (() => {
        var _ref23 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this21.updateRecord(record, account, true);
        });

        return function (_x26) {
          return _ref23.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

  cleanupFriendlyViews(account) {
    var _this22 = this;

    return _asyncToGenerator(function* () {
      yield _this22.reloadViewList();

      const activeViewNames = [];

      const forms = yield account.findActiveForms({});

      for (const form of forms) {
        activeViewNames.push(_this22.getFriendlyTableName(form, null));

        for (const repeatable of form.elementsOfType('Repeatable')) {
          activeViewNames.push(_this22.getFriendlyTableName(form, repeatable));
        }
      }

      const remove = (0, _lodash.difference)(_this22.viewNames, activeViewNames);

      for (const viewName of remove) {
        if (viewName.indexOf('view_') === 0 || viewName.indexOf('view - ') === 0) {
          try {
            yield _this22.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this22.escapeIdentifier(_this22.viewSchema), _this22.escapeIdentifier(viewName)));
          } catch (ex) {
            _this22.integrityWarning(ex);
          }
        }
      }
    })();
  }

  rebuildFriendlyViews(form, account) {
    var _this23 = this;

    return _asyncToGenerator(function* () {
      yield _this23.dropFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this23.dropFriendlyView(form, repeatable);
      }

      yield _this23.createFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this23.createFriendlyView(form, repeatable);
      }
    })();
  }

  dropSystemTables() {
    var _this24 = this;

    return _asyncToGenerator(function* () {
      yield _this24.run(_this24.prepareMigrationScript(_templateDrop2.default));
    })();
  }

  setupDatabase() {
    var _this25 = this;

    return _asyncToGenerator(function* () {
      yield _this25.run(_this25.prepareMigrationScript(_version2.default));
    })();
  }

  prepareMigrationScript(sql) {
    return sql.replace(/__SCHEMA__/g, this.dataSchema).replace(/__VIEW_SCHEMA__/g, this.viewSchema);
  }

  setupSystemTables(account) {
    var _this26 = this;

    return _asyncToGenerator(function* () {
      const progress = function (name, index) {
        _this26.updateStatus(name.green + ' : ' + index.toString().red);
      };

      yield account.findEachPhoto({}, (() => {
        var _ref24 = _asyncToGenerator(function* (photo, { index }) {
          if (++index % 10 === 0) {
            progress('Photos', index);
          }

          yield _this26.updatePhoto(photo, account);
        });

        return function (_x27, _x28) {
          return _ref24.apply(this, arguments);
        };
      })());

      yield account.findEachVideo({}, (() => {
        var _ref25 = _asyncToGenerator(function* (video, { index }) {
          if (++index % 10 === 0) {
            progress('Videos', index);
          }

          yield _this26.updateVideo(video, account);
        });

        return function (_x29, _x30) {
          return _ref25.apply(this, arguments);
        };
      })());

      yield account.findEachAudio({}, (() => {
        var _ref26 = _asyncToGenerator(function* (audio, { index }) {
          if (++index % 10 === 0) {
            progress('Audio', index);
          }

          yield _this26.updateAudio(audio, account);
        });

        return function (_x31, _x32) {
          return _ref26.apply(this, arguments);
        };
      })());

      yield account.findEachSignature({}, (() => {
        var _ref27 = _asyncToGenerator(function* (signature, { index }) {
          if (++index % 10 === 0) {
            progress('Signatures', index);
          }

          yield _this26.updateSignature(signature, account);
        });

        return function (_x33, _x34) {
          return _ref27.apply(this, arguments);
        };
      })());

      yield account.findEachChangeset({}, (() => {
        var _ref28 = _asyncToGenerator(function* (changeset, { index }) {
          if (++index % 10 === 0) {
            progress('Changesets', index);
          }

          yield _this26.updateChangeset(changeset, account);
        });

        return function (_x35, _x36) {
          return _ref28.apply(this, arguments);
        };
      })());

      yield account.findEachRole({}, (() => {
        var _ref29 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Roles', index);
          }

          yield _this26.updateRole(object, account);
        });

        return function (_x37, _x38) {
          return _ref29.apply(this, arguments);
        };
      })());

      yield account.findEachProject({}, (() => {
        var _ref30 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Projects', index);
          }

          yield _this26.updateProject(object, account);
        });

        return function (_x39, _x40) {
          return _ref30.apply(this, arguments);
        };
      })());

      yield account.findEachForm({}, (() => {
        var _ref31 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Forms', index);
          }

          yield _this26.updateFormObject(object, account);
        });

        return function (_x41, _x42) {
          return _ref31.apply(this, arguments);
        };
      })());

      yield account.findEachMembership({}, (() => {
        var _ref32 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Memberships', index);
          }

          yield _this26.updateMembership(object, account);
        });

        return function (_x43, _x44) {
          return _ref32.apply(this, arguments);
        };
      })());

      yield account.findEachChoiceList({}, (() => {
        var _ref33 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Choice Lists', index);
          }

          yield _this26.updateChoiceList(object, account);
        });

        return function (_x45, _x46) {
          return _ref33.apply(this, arguments);
        };
      })());

      yield account.findEachClassificationSet({}, (() => {
        var _ref34 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Classification Sets', index);
          }

          yield _this26.updateClassificationSet(object, account);
        });

        return function (_x47, _x48) {
          return _ref34.apply(this, arguments);
        };
      })());
    })();
  }

  maybeInitialize() {
    var _this27 = this;

    return _asyncToGenerator(function* () {
      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (_this27.tableNames.indexOf('migrations') === -1) {
        log('Inititalizing database...');

        yield _this27.setupDatabase();
      }

      yield _this27.maybeRunMigrations(account);
    })();
  }

  maybeRunMigrations(account) {
    var _this28 = this;

    return _asyncToGenerator(function* () {
      _this28.migrations = (yield _this28.run(`SELECT name FROM ${_this28.dataSchema}.migrations`)).map(function (o) {
        return o.name;
      });

      let populateRecords = false;

      for (let count = 2; count <= CURRENT_VERSION; ++count) {
        const version = (0, _lodash.padStart)(count, 3, '0');

        const needsMigration = _this28.migrations.indexOf(version) === -1 && MIGRATIONS[version];

        if (needsMigration) {
          yield _this28.run(_this28.prepareMigrationScript(MIGRATIONS[version]));

          if (version === '002') {
            log('Populating system tables...');
            yield _this28.setupSystemTables(account);
            populateRecords = true;
          } else if (version === '005') {
            log('Migrating date calculation fields...');
            yield _this28.migrateCalculatedFieldsDateFormat(account);
          }
        }
      }

      if (populateRecords) {
        yield _this28.populateRecords(account);
      }
    })();
  }

  populateRecords(account) {
    var _this29 = this;

    return _asyncToGenerator(function* () {
      const forms = yield account.findActiveForms({});

      let index = 0;

      for (const form of forms) {
        index = 0;

        yield form.findEachRecord({}, (() => {
          var _ref35 = _asyncToGenerator(function* (record) {
            record.form = form;

            if (++index % 10 === 0) {
              _this29.progress(form.name, index);
            }

            yield _this29.updateRecord(record, account, false);
          });

          return function (_x49) {
            return _ref35.apply(this, arguments);
          };
        })());
      }
    })();
  }

  migrateCalculatedFieldsDateFormat(account) {
    var _this30 = this;

    return _asyncToGenerator(function* () {
      const forms = yield account.findActiveForms({});

      for (const form of forms) {
        const fields = form.elementsOfType('CalculatedField').filter(function (element) {
          return element.display.isDate;
        });

        if (fields.length) {
          log('Migrating date calculation fields in form...', form.name);

          yield _this30.rebuildForm(form, account, function () {});
        }
      }
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiQ1VSUkVOVF9WRVJTSU9OIiwiREVGQVVMVF9TQ0hFTUEiLCJsb2ciLCJ3YXJuIiwiZXJyb3IiLCJmdWxjcnVtIiwibG9nZ2VyIiwid2l0aENvbnRleHQiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhcmdzIiwicGdEcm9wIiwiZHJvcFN5c3RlbVRhYmxlcyIsInBnU2V0dXAiLCJzZXR1cERhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsInBnU3lzdGVtVGFibGVzT25seSIsInNldHVwU3lzdGVtVGFibGVzIiwiaW52b2tlQmVmb3JlRnVuY3Rpb24iLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJwZ0Zvcm0iLCJpZCIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsInJ1biIsInNxbCIsInJlcGxhY2UiLCJkZWJ1ZyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicG9vbCIsInF1ZXJ5IiwiZXJyIiwicmVzIiwicm93cyIsInRhYmxlTmFtZSIsInVzZUFjY291bnRQcmVmaXgiLCJyb3dJRCIsIm9uU3luY1N0YXJ0IiwidGFza3MiLCJvblN5bmNGaW5pc2giLCJjbGVhbnVwRnJpZW5kbHlWaWV3cyIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvbkZvcm1EZWxldGUiLCJfaWQiLCJyb3dfaWQiLCJfbmFtZSIsImVsZW1lbnRzIiwiX2VsZW1lbnRzSlNPTiIsIm9uUmVjb3JkU2F2ZSIsInJlY29yZCIsInVwZGF0ZVJlY29yZCIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJwZ2RiIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvblNpZ25hdHVyZVNhdmUiLCJzaWduYXR1cmUiLCJ1cGRhdGVTaWduYXR1cmUiLCJvbkNoYW5nZXNldFNhdmUiLCJjaGFuZ2VzZXQiLCJ1cGRhdGVDaGFuZ2VzZXQiLCJvbkNob2ljZUxpc3RTYXZlIiwiY2hvaWNlTGlzdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsImNsYXNzaWZpY2F0aW9uU2V0IiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwicHJvamVjdCIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwicm9sZSIsInVwZGF0ZVJvbGUiLCJvbk1lbWJlcnNoaXBTYXZlIiwibWVtYmVyc2hpcCIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJkYXRhU2NoZW1hIiwidGFibGVOYW1lcyIsInJlbG9hZFZpZXdMaXN0Iiwidmlld1NjaGVtYSIsInZpZXdOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsImZvcm1hdFNpZ25hdHVyZVVSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwic3lzdGVtVmFsdWVzIiwic3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJvcHRpb25zIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJ0YWJsZVNjaGVtYSIsImNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQiLCJtZXRhZGF0YSIsInVzZVJlc291cmNlSUQiLCJwZXJzaXN0ZW50VGFibGVOYW1lcyIsImFjY291bnRQcmVmaXgiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkcm9wRnJpZW5kbHlWaWV3IiwicmVwZWF0YWJsZSIsImVsZW1lbnRzT2ZUeXBlIiwiY3JlYXRlRnJpZW5kbHlWaWV3IiwiaW50ZWdyaXR5V2FybmluZyIsIm1lc3NhZ2UiLCJwcm9jZXNzIiwic3Rkb3V0IiwiaXNUVFkiLCJjbGVhckxpbmUiLCJjdXJzb3JUbyIsIndyaXRlIiwicHJvZ3Jlc3MiLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdEYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdIb3N0IiwicGdQb3J0IiwicGdVc2VyIiwicGdQYXNzd29yZCIsInBnU2NoZW1hIiwicGdTY2hlbWFWaWV3cyIsInBnU3luY0V2ZW50cyIsInBnQmVmb3JlRnVuY3Rpb24iLCJwZ0FmdGVyRnVuY3Rpb24iLCJyZXF1aXJlZCIsInBnUmVwb3J0QmFzZVVybCIsInBnTWVkaWFCYXNlVXJsIiwicGdVbmRlcnNjb3JlTmFtZXMiLCJwZ0FycmF5cyIsInBnUHJlZml4IiwicGdTaW1wbGVUeXBlcyIsImhhbmRsZXIiLCJ0cmltSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJzdWJzdHJpbmciLCJlc2NhcGVJZGVudGlmaWVyIiwiaWRlbnQiLCJ1c2VTeW5jRXZlbnRzIiwidXNlciIsInBhc3N3b3JkIiwicmVxdWlyZSIsImFwcCIsIlBvb2wiLCJvbiIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJvYmplY3QiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJzdGFjayIsInNjaGVtYSIsInZhbHVlc1RyYW5zZm9ybWVyIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJtZWRpYVZhbHVlIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsImRhdGFOYW1lIiwiZm9ybUlEIiwicHJlZml4Iiwia2V5Iiwib2JqZWN0TmFtZSIsImJlZm9yZVN5bmMiLCJhZnRlclN5bmMiLCJmaW5kRWFjaFJlY29yZCIsImFjdGl2ZVZpZXdOYW1lcyIsInB1c2giLCJyZW1vdmUiLCJwcmVwYXJlTWlncmF0aW9uU2NyaXB0IiwiZmluZEVhY2hQaG90byIsImZpbmRFYWNoVmlkZW8iLCJmaW5kRWFjaEF1ZGlvIiwiZmluZEVhY2hTaWduYXR1cmUiLCJmaW5kRWFjaENoYW5nZXNldCIsImZpbmRFYWNoUm9sZSIsImZpbmRFYWNoUHJvamVjdCIsImZpbmRFYWNoRm9ybSIsImZpbmRFYWNoTWVtYmVyc2hpcCIsImZpbmRFYWNoQ2hvaWNlTGlzdCIsImZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQiLCJtYXliZVJ1bk1pZ3JhdGlvbnMiLCJtaWdyYXRpb25zIiwicG9wdWxhdGVSZWNvcmRzIiwiY291bnQiLCJ2ZXJzaW9uIiwibmVlZHNNaWdyYXRpb24iLCJtaWdyYXRlQ2FsY3VsYXRlZEZpZWxkc0RhdGVGb3JtYXQiLCJmaWVsZHMiLCJmaWx0ZXIiLCJkaXNwbGF5IiwiaXNEYXRlIiwibGVuZ3RoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7SUFJWUEsRzs7QUFIWjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFFQTs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7O0FBRUEsTUFBTUMsd0JBQXdCLEVBQTlCOztBQUVBLE1BQU1DLGtCQUFrQjtBQUN0QkMsWUFBVSxZQURZO0FBRXRCQyxRQUFNLFdBRmdCO0FBR3RCQyxRQUFNLElBSGdCO0FBSXRCQyxPQUFLLEVBSmlCO0FBS3RCQyxxQkFBbUI7QUFMRyxDQUF4Qjs7QUFRQSxNQUFNQyxhQUFhO0FBQ2pCLDBCQURpQjtBQUVqQiwwQkFGaUI7QUFHakIsMEJBSGlCO0FBSWpCO0FBSmlCLENBQW5COztBQU9BLE1BQU1DLGtCQUFrQixDQUF4Qjs7QUFFQSxNQUFNQyxpQkFBaUIsUUFBdkI7O0FBRUEsTUFBTSxFQUFFQyxHQUFGLEVBQU9DLElBQVAsRUFBYUMsS0FBYixLQUF1QkMsUUFBUUMsTUFBUixDQUFlQyxXQUFmLENBQTJCLFVBQTNCLENBQTdCOztrQkFFZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQWtJbkJDLFVBbEltQixxQkFrSU4sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxVQUFJSixRQUFRSyxJQUFSLENBQWFDLE1BQWpCLEVBQXlCO0FBQ3ZCLGNBQU0sTUFBS0MsZ0JBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSVAsUUFBUUssSUFBUixDQUFhRyxPQUFqQixFQUEwQjtBQUN4QixjQUFNLE1BQUtDLGFBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsWUFBTUMsVUFBVSxNQUFNVixRQUFRVyxZQUFSLENBQXFCWCxRQUFRSyxJQUFSLENBQWFPLEdBQWxDLENBQXRCOztBQUVBLFVBQUlGLE9BQUosRUFB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QSxtQkFBTzNDLElBQVAsR0FBY0EsSUFBZDs7QUFFQSxnQkFBSSxFQUFFTSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QixzQkFBSzhILFFBQUwsQ0FBY3BJLEtBQUtRLElBQW5CLEVBQXlCRixLQUF6QjtBQUNEOztBQUVELGtCQUFNLFFBQUtzQyxZQUFMLENBQWtCRCxNQUFsQixFQUEwQm5ELE9BQTFCLEVBQW1DLEtBQW5DLENBQU47QUFDRCxXQVJLOztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQU47QUFTRDtBQWpCNEI7QUFrQjlCOztBQUVLOE8sbUNBQU4sQ0FBd0M5TyxPQUF4QyxFQUFpRDtBQUFBOztBQUFBO0FBQy9DLFlBQU1NLFFBQVEsTUFBTU4sUUFBUU8sZUFBUixDQUF3QixFQUF4QixDQUFwQjs7QUFFQSxXQUFLLE1BQU1DLElBQVgsSUFBbUJGLEtBQW5CLEVBQTBCO0FBQ3hCLGNBQU15TyxTQUFTdk8sS0FBSzBILGNBQUwsQ0FBb0IsaUJBQXBCLEVBQXVDOEcsTUFBdkMsQ0FBOEM7QUFBQSxpQkFBVzFDLFFBQVEyQyxPQUFSLENBQWdCQyxNQUEzQjtBQUFBLFNBQTlDLENBQWY7O0FBRUEsWUFBSUgsT0FBT0ksTUFBWCxFQUFtQjtBQUNqQmhRLGNBQUksOENBQUosRUFBb0RxQixLQUFLUSxJQUF6RDs7QUFFQSxnQkFBTSxRQUFLSCxXQUFMLENBQWlCTCxJQUFqQixFQUF1QlIsT0FBdkIsRUFBZ0MsWUFBTSxDQUFFLENBQXhDLENBQU47QUFDRDtBQUNGO0FBWDhDO0FBWWhEOztBQXg5QmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuaW1wb3J0IHRlbXBsYXRlRHJvcCBmcm9tICcuL3RlbXBsYXRlLmRyb3Auc3FsJztcbmltcG9ydCBTY2hlbWFNYXAgZnJvbSAnLi9zY2hlbWEtbWFwJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCB7IGNvbXBhY3QsIGRpZmZlcmVuY2UsIHBhZFN0YXJ0IH0gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHZlcnNpb24wMDEgZnJvbSAnLi92ZXJzaW9uLTAwMS5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDIgZnJvbSAnLi92ZXJzaW9uLTAwMi5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDMgZnJvbSAnLi92ZXJzaW9uLTAwMy5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDQgZnJvbSAnLi92ZXJzaW9uLTAwNC5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDUgZnJvbSAnLi92ZXJzaW9uLTAwNS5zcWwnO1xuXG5jb25zdCBNQVhfSURFTlRJRklFUl9MRU5HVEggPSA2MztcblxuY29uc3QgUE9TVEdSRVNfQ09ORklHID0ge1xuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxuICBob3N0OiAnbG9jYWxob3N0JyxcbiAgcG9ydDogNTQzMixcbiAgbWF4OiAxMCxcbiAgaWRsZVRpbWVvdXRNaWxsaXM6IDMwMDAwXG59O1xuXG5jb25zdCBNSUdSQVRJT05TID0ge1xuICAnMDAyJzogdmVyc2lvbjAwMixcbiAgJzAwMyc6IHZlcnNpb24wMDMsXG4gICcwMDQnOiB2ZXJzaW9uMDA0LFxuICAnMDA1JzogdmVyc2lvbjAwNVxufTtcblxuY29uc3QgQ1VSUkVOVF9WRVJTSU9OID0gNTtcblxuY29uc3QgREVGQVVMVF9TQ0hFTUEgPSAncHVibGljJztcblxuY29uc3QgeyBsb2csIHdhcm4sIGVycm9yIH0gPSBmdWxjcnVtLmxvZ2dlci53aXRoQ29udGV4dCgncG9zdGdyZXMnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ0RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnSG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ1BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIHBnVXNlcjoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHVzZXInLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUGFzc3dvcmQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBwYXNzd29yZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWE6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hVmlld3M6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEgZm9yIHRoZSBmcmllbmRseSB2aWV3cycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeW5jRXZlbnRzOiB7XG4gICAgICAgICAgZGVzYzogJ2FkZCBzeW5jIGV2ZW50IGhvb2tzJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ0JlZm9yZUZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnQWZ0ZXJGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdGb3JtOiB7XG4gICAgICAgICAgZGVzYzogJ3RoZSBmb3JtIElEIHRvIHJlYnVpbGQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVwb3J0QmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdyZXBvcnQgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnTWVkaWFCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ21lZGlhIFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1VuZGVyc2NvcmVOYW1lczoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdW5kZXJzY29yZSBuYW1lcyAoZS5nLiBcIlBhcmsgSW5zcGVjdGlvbnNcIiBiZWNvbWVzIFwicGFya19pbnNwZWN0aW9uc1wiKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQ3VzdG9tTW9kdWxlOiB7XG4gICAgICAgICAgZGVzYzogJ2EgY3VzdG9tIG1vZHVsZSB0byBsb2FkIHdpdGggc3luYyBleHRlbnNpb25zJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTZXR1cDoge1xuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgfSxcbiAgICAgICAgcGdEcm9wOiB7XG4gICAgICAgICAgZGVzYzogJ2Ryb3AgdGhlIHN5c3RlbSB0YWJsZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdBcnJheXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIGFycmF5IHR5cGVzIGZvciBtdWx0aS12YWx1ZSBmaWVsZHMgbGlrZSBjaG9pY2UgZmllbGRzLCBjbGFzc2lmaWNhdGlvbiBmaWVsZHMgYW5kIG1lZGlhIGZpZWxkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIC8vIHBnUGVyc2lzdGVudFRhYmxlTmFtZXM6IHtcbiAgICAgICAgLy8gICBkZXNjOiAndXNlIHRoZSBzZXJ2ZXIgaWQgaW4gdGhlIGZvcm0gdGFibGUgbmFtZXMnLFxuICAgICAgICAvLyAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgLy8gICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIC8vICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgLy8gfSxcbiAgICAgICAgcGdQcmVmaXg6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHRoZSBvcmdhbml6YXRpb24gYXMgYSBwcmVmaXggaW4gdGhlIG9iamVjdCBuYW1lcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2ltcGxlVHlwZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHNpbXBsZSB0eXBlcyBpbiB0aGUgZGF0YWJhc2UgdGhhdCBhcmUgbW9yZSBjb21wYXRpYmxlIHdpdGggb3RoZXIgYXBwbGljYXRpb25zIChubyB0c3ZlY3RvciwgZ2VvbWV0cnksIGFycmF5cyknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeXN0ZW1UYWJsZXNPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgY3JlYXRlIHRoZSBzeXN0ZW0gcmVjb3JkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdEcm9wKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BTeXN0ZW1UYWJsZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2V0dXApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU3lzdGVtVGFibGVzT25seSkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRm9ybSAmJiBmb3JtLmlkICE9PSBmdWxjcnVtLmFyZ3MucGdGb3JtKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZygnJyk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIHRyaW1JZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgICByZXR1cm4gaWRlbnRpZmllci5zdWJzdHJpbmcoMCwgTUFYX0lERU5USUZJRVJfTEVOR1RIKTtcbiAgfVxuXG4gIGVzY2FwZUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICAgIHJldHVybiBpZGVudGlmaWVyICYmIHRoaXMucGdkYi5pZGVudCh0aGlzLnRyaW1JZGVudGlmaWVyKGlkZW50aWZpZXIpKTtcbiAgfVxuXG4gIGdldCB1c2VTeW5jRXZlbnRzKCkge1xuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzIDogdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIHRoaXMuYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLlBPU1RHUkVTX0NPTkZJRyxcbiAgICAgIGhvc3Q6IGZ1bGNydW0uYXJncy5wZ0hvc3QgfHwgUE9TVEdSRVNfQ09ORklHLmhvc3QsXG4gICAgICBwb3J0OiBmdWxjcnVtLmFyZ3MucGdQb3J0IHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ0RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZSxcbiAgICAgIHVzZXI6IGZ1bGNydW0uYXJncy5wZ1VzZXIgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXIsXG4gICAgICBwYXNzd29yZDogZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXJcbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1VzZXIpIHtcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5wZ1VzZXI7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkKSB7XG4gICAgICBvcHRpb25zLnBhc3N3b3JkID0gZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSkge1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZSA9IHJlcXVpcmUoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKTtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUuYXBpID0gYXBpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcHAgPSBmdWxjcnVtO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTaW1wbGVUeXBlcyA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5kaXNhYmxlQ29tcGxleFR5cGVzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBpZiAoZnVsY3J1bS5hcmdzLnBnUGVyc2lzdGVudFRhYmxlTmFtZXMgPT09IHRydWUpIHtcbiAgICAgIC8vIHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMgPSB0cnVlO1xuICAgIC8vIH1cblxuICAgIHRoaXMudXNlQWNjb3VudFByZWZpeCA9IChmdWxjcnVtLmFyZ3MucGdQcmVmaXggIT09IGZhbHNlKTtcblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdzaWduYXR1cmU6c2F2ZScsIHRoaXMub25TaWduYXR1cmVTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2NoYW5nZXNldDpzYXZlJywgdGhpcy5vbkNoYW5nZXNldFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOnNhdmUnLCB0aGlzLm9uUmVjb3JkU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6ZGVsZXRlJywgdGhpcy5vblJlY29yZERlbGV0ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OnNhdmUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2hvaWNlLWxpc3Q6ZGVsZXRlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignZm9ybTpzYXZlJywgdGhpcy5vbkZvcm1TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06ZGVsZXRlJywgdGhpcy5vbkZvcm1TYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb24tc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpkZWxldGUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbigncm9sZTpzYXZlJywgdGhpcy5vblJvbGVTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6ZGVsZXRlJywgdGhpcy5vblJvbGVTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbigncHJvamVjdDpzYXZlJywgdGhpcy5vblByb2plY3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6ZGVsZXRlJywgdGhpcy5vblByb2plY3RTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignbWVtYmVyc2hpcDpzYXZlJywgdGhpcy5vbk1lbWJlcnNoaXBTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6ZGVsZXRlJywgdGhpcy5vbk1lbWJlcnNoaXBTYXZlKTtcbiAgICB9XG5cbiAgICB0aGlzLnZpZXdTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWFWaWV3cyB8fCBERUZBVUxUX1NDSEVNQTtcbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWEgfHwgREVGQVVMVF9TQ0hFTUE7XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuXG4gICAgdGhpcy5zZXR1cE9wdGlvbnMoKTtcblxuICAgIGF3YWl0IHRoaXMubWF5YmVJbml0aWFsaXplKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBsb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICBpZiAodGhpcy51c2VBY2NvdW50UHJlZml4KSB7XG4gICAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICAgIH1cblxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLmNsZWFudXBGcmllbmRseVZpZXdzKGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvbkZvcm1EZWxldGUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnR9KSA9PiB7XG4gICAgY29uc3Qgb2xkRm9ybSA9IHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBudWxsKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25QaG90b1NhdmUgPSBhc3luYyAoe3Bob3RvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICB9XG5cbiAgb25WaWRlb1NhdmUgPSBhc3luYyAoe3ZpZGVvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25BdWRpb1NhdmUgPSBhc3luYyAoe2F1ZGlvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25TaWduYXR1cmVTYXZlID0gYXN5bmMgKHtzaWduYXR1cmUsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVTaWduYXR1cmUoc2lnbmF0dXJlLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hhbmdlc2V0U2F2ZSA9IGFzeW5jICh7Y2hhbmdlc2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtjaG9pY2VMaXN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChjaG9pY2VMaXN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2xhc3NpZmljYXRpb25TZXRTYXZlID0gYXN5bmMgKHtjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KGNsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe3Byb2plY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KHByb2plY3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25Sb2xlU2F2ZSA9IGFzeW5jICh7cm9sZSwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUocm9sZSwgYWNjb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHttZW1iZXJzaGlwLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChtZW1iZXJzaGlwLCBhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVBob3RvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5waG90byhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFBob3RvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3Bob3RvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlVmlkZW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnZpZGVvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0VmlkZW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAndmlkZW9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVBdWRpbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAuYXVkaW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRBdWRpb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdhdWRpbycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlU2lnbmF0dXJlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5zaWduYXR1cmUob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRTaWduYXR1cmVVUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnc2lnbmF0dXJlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hhbmdlc2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaGFuZ2VzZXQob2JqZWN0KSwgJ2NoYW5nZXNldHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnByb2plY3Qob2JqZWN0KSwgJ3Byb2plY3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5tZW1iZXJzaGlwKG9iamVjdCksICdtZW1iZXJzaGlwcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucm9sZShvYmplY3QpLCAncm9sZXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmZvcm0ob2JqZWN0KSwgJ2Zvcm1zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaG9pY2VMaXN0KG9iamVjdCksICdjaG9pY2VfbGlzdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jbGFzc2lmaWNhdGlvblNldChvYmplY3QpLCAnY2xhc3NpZmljYXRpb25fc2V0cycpO1xuICB9XG5cblxuICBhc3luYyB1cGRhdGVPYmplY3QodmFsdWVzLCB0YWJsZSkge1xuICAgIGNvbnN0IGRlbGV0ZVN0YXRlbWVudCA9IHRoaXMucGdkYi5kZWxldGVTdGF0ZW1lbnQoYCR7IHRoaXMuZGF0YVNjaGVtYSB9LnN5c3RlbV8ke3RhYmxlfWAsIHtyb3dfcmVzb3VyY2VfaWQ6IHZhbHVlcy5yb3dfcmVzb3VyY2VfaWR9KTtcbiAgICBjb25zdCBpbnNlcnRTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuaW5zZXJ0U3RhdGVtZW50KGAkeyB0aGlzLmRhdGFTY2hlbWEgfS5zeXN0ZW1fJHt0YWJsZX1gLCB2YWx1ZXMsIHtwazogJ2lkJ30pO1xuXG4gICAgY29uc3Qgc3FsID0gWyBkZWxldGVTdGF0ZW1lbnQuc3FsLCBpbnNlcnRTdGF0ZW1lbnQuc3FsIF0uam9pbignXFxuJyk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICByZWxvYWRWaWV3TGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy52aWV3U2NoZW1hIH0nYCk7XG4gICAgdGhpcy52aWV3TmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBiYXNlTWVkaWFVUkwgPSAoKSA9PiB7XG4gIH1cblxuICBmb3JtYXRQaG90b1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3MvJHsgaWQgfS5qcGdgO1xuICB9XG5cbiAgZm9ybWF0VmlkZW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zLyR7IGlkIH0ubXA0YDtcbiAgfVxuXG4gIGZvcm1hdEF1ZGlvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvLyR7IGlkIH0ubTRhYDtcbiAgfVxuXG4gIGZvcm1hdFNpZ25hdHVyZVVSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9zaWduYXR1cmVzLyR7IGlkIH0ucG5nYDtcbiAgfVxuXG4gIGludGVncml0eVdhcm5pbmcoZXgpIHtcbiAgICB3YXJuKGBcbi0tLS0tLS0tLS0tLS1cbiEhIFdBUk5JTkcgISFcbi0tLS0tLS0tLS0tLS1cblxuUG9zdGdyZVNRTCBkYXRhYmFzZSBpbnRlZ3JpdHkgaXNzdWUgZW5jb3VudGVyZWQuIENvbW1vbiBzb3VyY2VzIG9mIHBvc3RncmVzIGRhdGFiYXNlIGlzc3VlcyBhcmU6XG5cbiogUmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBhbmQgdXNpbmcgYW4gb2xkIHBvc3RncmVzIGRhdGFiYXNlIHdpdGhvdXQgcmVjcmVhdGluZ1xuICB0aGUgcG9zdGdyZXMgZGF0YWJhc2UuXG4qIERlbGV0aW5nIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZSBhbmQgdXNpbmcgYW4gZXhpc3RpbmcgcG9zdGdyZXMgZGF0YWJhc2VcbiogTWFudWFsbHkgbW9kaWZ5aW5nIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBGb3JtIG5hbWUgYW5kIHJlcGVhdGFibGUgZGF0YSBuYW1lIGNvbWJpbmF0aW9ucyB0aGF0IGV4Y2VlZWQgdGhlIHBvc3RncmVzIGxpbWl0IG9mIDYzXG4gIGNoYXJhY3RlcnMuIEl0J3MgYmVzdCB0byBrZWVwIHlvdXIgZm9ybSBuYW1lcyB3aXRoaW4gdGhlIGxpbWl0LiBUaGUgXCJmcmllbmRseSB2aWV3XCJcbiAgZmVhdHVyZSBvZiB0aGUgcGx1Z2luIGRlcml2ZXMgdGhlIG9iamVjdCBuYW1lcyBmcm9tIHRoZSBmb3JtIGFuZCByZXBlYXRhYmxlIG5hbWVzLlxuKiBDcmVhdGluZyBtdWx0aXBsZSBhcHBzIGluIEZ1bGNydW0gd2l0aCB0aGUgc2FtZSBuYW1lLiBUaGlzIGlzIGdlbmVyYWxseSBPSywgZXhjZXB0XG4gIHlvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIHVzZSB0aGUgXCJmcmllbmRseSB2aWV3XCIgZmVhdHVyZSBvZiB0aGUgcG9zdGdyZXMgcGx1Z2luIHNpbmNlXG4gIHRoZSB2aWV3IG5hbWVzIGFyZSBkZXJpdmVkIGZyb20gdGhlIGZvcm0gbmFtZXMuXG5cbk5vdGU6IFdoZW4gcmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBvciBcInN0YXJ0aW5nIG92ZXJcIiB5b3UgbmVlZCB0byBkcm9wIGFuZCByZS1jcmVhdGVcbnRoZSBwb3N0Z3JlcyBkYXRhYmFzZS4gVGhlIG5hbWVzIG9mIGRhdGFiYXNlIG9iamVjdHMgYXJlIHRpZWQgZGlyZWN0bHkgdG8gdGhlIGRhdGFiYXNlXG5vYmplY3RzIGluIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZS5cblxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5SZXBvcnQgaXNzdWVzIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9mdWxjcnVtYXBwL2Z1bGNydW0tZGVza3RvcC9pc3N1ZXNcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuTWVzc2FnZTpcbiR7IGV4Lm1lc3NhZ2UgfVxuXG5TdGFjazpcbiR7IGV4LnN0YWNrIH1cbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuYC5yZWRcbiAgICApO1xuICB9XG5cbiAgc2V0dXBPcHRpb25zKCkge1xuICAgIHRoaXMuYmFzZU1lZGlhVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyA9IHtcbiAgICAgIHNjaGVtYTogdGhpcy5kYXRhU2NoZW1hLFxuXG4gICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG5cbiAgICAgIGFjY291bnRQcmVmaXg6IHRoaXMudXNlQWNjb3VudFByZWZpeCA/ICdhY2NvdW50XycgKyB0aGlzLmFjY291bnQucm93SUQgOiBudWxsLFxuXG4gICAgICBjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0OiAnZGF0ZScsXG5cbiAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyxcblxuICAgICAgdmFsdWVzVHJhbnNmb3JtZXI6IHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS52YWx1ZXNUcmFuc2Zvcm1lcixcblxuICAgICAgbWVkaWFVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0UGhvdG9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0VmlkZW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0QXVkaW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBtZWRpYVZpZXdVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkcyA9IG1lZGlhVmFsdWUuaXRlbXMubWFwKG8gPT4gby5tZWRpYUlEKTtcblxuICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy92aWV3P3Bob3Rvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy92aWV3P3ZpZGVvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvL3ZpZXc/YXVkaW89JHsgaWRzIH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsKSB7XG4gICAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIgPSAoZmVhdHVyZSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7IGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwgfS9yZXBvcnRzLyR7IGZlYXR1cmUuaWQgfS5wZGZgO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCh7cmVjb3JkLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMudXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuXG4gICAgY29uc3Qgc3lzdGVtVmFsdWVzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShyZWNvcmQsIG51bGwsIHJlY29yZCwgey4uLnRoaXMucmVjb3JkVmFsdWVPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlQ29tcGxleFR5cGVzOiBmYWxzZX0pO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJlY29yZChyZWNvcmQsIHN5c3RlbVZhbHVlcyksICdyZWNvcmRzJyk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBudWxsLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucykpICE9PSAtMTtcbiAgfVxuXG4gIHJlY3JlYXRlRm9ybVRhYmxlcyA9IGFzeW5jIChmb3JtLCBhY2NvdW50KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBlcnJvcihleCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG51bGwsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSkpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0oe2Zvcm0sIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3QoZm9ybSwgYWNjb3VudCk7XG5cbiAgICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG4gICAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyxcbiAgICAgICAgdXNlck1vZHVsZTogdGhpcy5wZ0N1c3RvbU1vZHVsZSxcbiAgICAgICAgdGFibGVTY2hlbWE6IHRoaXMuZGF0YVNjaGVtYSxcbiAgICAgICAgY2FsY3VsYXRlZEZpZWxkRGF0ZUZvcm1hdDogJ2RhdGUnLFxuICAgICAgICBtZXRhZGF0YTogdHJ1ZSxcbiAgICAgICAgdXNlUmVzb3VyY2VJRDogdGhpcy5wZXJzaXN0ZW50VGFibGVOYW1lcyxcbiAgICAgICAgYWNjb3VudFByZWZpeDogdGhpcy51c2VBY2NvdW50UHJlZml4ID8gJ2FjY291bnRfJyArIHRoaXMuYWNjb3VudC5yb3dJRCA6IG51bGxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCBvcHRpb25zKTtcblxuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5ydW4oWydCRUdJTiBUUkFOU0FDVElPTjsnLFxuICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlbWVudHMsXG4gICAgICAgICAgICAgICAgICAgICAgJ0NPTU1JVCBUUkFOU0FDVElPTjsnXS5qb2luKCdcXG4nKSk7XG5cbiAgICAgIGlmIChuZXdGb3JtKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnRFJPUCBWSUVXIElGIEVYSVNUUyAlcy4lcyBDQVNDQURFOycsIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzX3ZpZXdfZnVsbDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gY29tcGFjdChbZm9ybS5uYW1lLCByZXBlYXRhYmxlICYmIHJlcGVhdGFibGUuZGF0YU5hbWVdKS5qb2luKCcgLSAnKVxuXG4gICAgY29uc3QgZm9ybUlEID0gdGhpcy5wZXJzaXN0ZW50VGFibGVOYW1lcyA/IGZvcm0uaWQgOiBmb3JtLnJvd0lEO1xuXG4gICAgY29uc3QgcHJlZml4ID0gY29tcGFjdChbJ3ZpZXcnLCBmb3JtSUQsIHJlcGVhdGFibGUgJiYgcmVwZWF0YWJsZS5rZXldKS5qb2luKCcgLSAnKTtcblxuICAgIGNvbnN0IG9iamVjdE5hbWUgPSBbcHJlZml4LCBuYW1lXS5qb2luKCcgLSAnKTtcblxuICAgIHJldHVybiB0aGlzLnRyaW1JZGVudGlmaWVyKGZ1bGNydW0uYXJncy5wZ1VuZGVyc2NvcmVOYW1lcyAhPT0gZmFsc2UgPyBzbmFrZShvYmplY3ROYW1lKSA6IG9iamVjdE5hbWUpO1xuICB9XG5cbiAgYXN5bmMgaW52b2tlQmVmb3JlRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQWZ0ZXJGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIHByb2dyZXNzKSB7XG4gICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgY2xlYW51cEZyaWVuZGx5Vmlld3MoYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVmlld0xpc3QoKTtcblxuICAgIGNvbnN0IGFjdGl2ZVZpZXdOYW1lcyA9IFtdO1xuXG4gICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgIGFjdGl2ZVZpZXdOYW1lcy5wdXNoKHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgbnVsbCkpO1xuXG4gICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgIGFjdGl2ZVZpZXdOYW1lcy5wdXNoKHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlbW92ZSA9IGRpZmZlcmVuY2UodGhpcy52aWV3TmFtZXMsIGFjdGl2ZVZpZXdOYW1lcyk7XG5cbiAgICBmb3IgKGNvbnN0IHZpZXdOYW1lIG9mIHJlbW92ZSkge1xuICAgICAgaWYgKHZpZXdOYW1lLmluZGV4T2YoJ3ZpZXdfJykgPT09IDAgfHwgdmlld05hbWUuaW5kZXhPZigndmlldyAtICcpID09PSAwKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodmlld05hbWUpKSk7XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcFN5c3RlbVRhYmxlcygpIHtcbiAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQodGVtcGxhdGVEcm9wKSk7XG4gIH1cblxuICBhc3luYyBzZXR1cERhdGFiYXNlKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh2ZXJzaW9uMDAxKSk7XG4gIH1cblxuICBwcmVwYXJlTWlncmF0aW9uU2NyaXB0KHNxbCkge1xuICAgIHJldHVybiBzcWwucmVwbGFjZSgvX19TQ0hFTUFfXy9nLCB0aGlzLmRhdGFTY2hlbWEpXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9fX1ZJRVdfU0NIRU1BX18vZywgdGhpcy52aWV3U2NoZW1hKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpIHtcbiAgICBjb25zdCBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICAgIH07XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUGhvdG8oe30sIGFzeW5jIChwaG90bywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUGhvdG9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hWaWRlbyh7fSwgYXN5bmMgKHZpZGVvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdWaWRlb3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEF1ZGlvKHt9LCBhc3luYyAoYXVkaW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0F1ZGlvJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hTaWduYXR1cmUoe30sIGFzeW5jIChzaWduYXR1cmUsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1NpZ25hdHVyZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlU2lnbmF0dXJlKHNpZ25hdHVyZSwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hhbmdlc2V0KHt9LCBhc3luYyAoY2hhbmdlc2V0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaGFuZ2VzZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFJvbGUoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1JvbGVzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQcm9qZWN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQcm9qZWN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoRm9ybSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnRm9ybXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaE1lbWJlcnNoaXAoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ01lbWJlcnNoaXBzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaG9pY2VMaXN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaG9pY2UgTGlzdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENsYXNzaWZpY2F0aW9uU2V0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDbGFzc2lmaWNhdGlvbiBTZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBtYXliZUluaXRpYWxpemUoKSB7XG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKHRoaXMudGFibGVOYW1lcy5pbmRleE9mKCdtaWdyYXRpb25zJykgPT09IC0xKSB7XG4gICAgICBsb2coJ0luaXRpdGFsaXppbmcgZGF0YWJhc2UuLi4nKTtcblxuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyBtYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCkge1xuICAgIHRoaXMubWlncmF0aW9ucyA9IChhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIG5hbWUgRlJPTSAkeyB0aGlzLmRhdGFTY2hlbWEgfS5taWdyYXRpb25zYCkpLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICBsZXQgcG9wdWxhdGVSZWNvcmRzID0gZmFsc2U7XG5cbiAgICBmb3IgKGxldCBjb3VudCA9IDI7IGNvdW50IDw9IENVUlJFTlRfVkVSU0lPTjsgKytjb3VudCkge1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHBhZFN0YXJ0KGNvdW50LCAzLCAnMCcpO1xuXG4gICAgICBjb25zdCBuZWVkc01pZ3JhdGlvbiA9IHRoaXMubWlncmF0aW9ucy5pbmRleE9mKHZlcnNpb24pID09PSAtMSAmJiBNSUdSQVRJT05TW3ZlcnNpb25dO1xuXG4gICAgICBpZiAobmVlZHNNaWdyYXRpb24pIHtcbiAgICAgICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KE1JR1JBVElPTlNbdmVyc2lvbl0pKTtcblxuICAgICAgICBpZiAodmVyc2lvbiA9PT0gJzAwMicpIHtcbiAgICAgICAgICBsb2coJ1BvcHVsYXRpbmcgc3lzdGVtIHRhYmxlcy4uLicpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgICAgcG9wdWxhdGVSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2ZXJzaW9uID09PSAnMDA1Jykge1xuICAgICAgICAgIGxvZygnTWlncmF0aW5nIGRhdGUgY2FsY3VsYXRpb24gZmllbGRzLi4uJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5taWdyYXRlQ2FsY3VsYXRlZEZpZWxkc0RhdGVGb3JtYXQoYWNjb3VudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9wdWxhdGVSZWNvcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBwb3B1bGF0ZVJlY29yZHMoYWNjb3VudCkge1xuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgaW5kZXggPSAwO1xuXG4gICAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5wcm9ncmVzcyhmb3JtLm5hbWUsIGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbWlncmF0ZUNhbGN1bGF0ZWRGaWVsZHNEYXRlRm9ybWF0KGFjY291bnQpIHtcbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgY29uc3QgZmllbGRzID0gZm9ybS5lbGVtZW50c09mVHlwZSgnQ2FsY3VsYXRlZEZpZWxkJykuZmlsdGVyKGVsZW1lbnQgPT4gZWxlbWVudC5kaXNwbGF5LmlzRGF0ZSk7XG5cbiAgICAgIGlmIChmaWVsZHMubGVuZ3RoKSB7XG4gICAgICAgIGxvZygnTWlncmF0aW5nIGRhdGUgY2FsY3VsYXRpb24gZmllbGRzIGluIGZvcm0uLi4nLCBmb3JtLm5hbWUpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICB9XG59XG4iXX0=