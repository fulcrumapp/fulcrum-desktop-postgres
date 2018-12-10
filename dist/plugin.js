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

    this.escapeIdentifier = identifier => {
      return identifier && this.pgdb.ident(this.trimIdentifier(identifier));
    };

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

      escapeIdentifier: this.escapeIdentifier,

      // persistentTableNames: this.persistentTableNames,

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
        yield _this18.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s;', _this18.escapeIdentifier(_this18.viewSchema), _this18.escapeIdentifier(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithFormAndSchema(form, repeatable, _this18.recordValueOptions, '_view_full')));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiQ1VSUkVOVF9WRVJTSU9OIiwiREVGQVVMVF9TQ0hFTUEiLCJsb2ciLCJ3YXJuIiwiZXJyb3IiLCJmdWxjcnVtIiwibG9nZ2VyIiwid2l0aENvbnRleHQiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhcmdzIiwicGdEcm9wIiwiZHJvcFN5c3RlbVRhYmxlcyIsInBnU2V0dXAiLCJzZXR1cERhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsInBnU3lzdGVtVGFibGVzT25seSIsInNldHVwU3lzdGVtVGFibGVzIiwiaW52b2tlQmVmb3JlRnVuY3Rpb24iLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJwZ0Zvcm0iLCJpZCIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVzY2FwZUlkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicGdkYiIsImlkZW50IiwidHJpbUlkZW50aWZpZXIiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJ1c2VBY2NvdW50UHJlZml4Iiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwiY2xlYW51cEZyaWVuZGx5Vmlld3MiLCJvbkZvcm1TYXZlIiwib2xkRm9ybSIsIm5ld0Zvcm0iLCJ1cGRhdGVGb3JtIiwib25Gb3JtRGVsZXRlIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvblNpZ25hdHVyZVNhdmUiLCJzaWduYXR1cmUiLCJ1cGRhdGVTaWduYXR1cmUiLCJvbkNoYW5nZXNldFNhdmUiLCJjaGFuZ2VzZXQiLCJ1cGRhdGVDaGFuZ2VzZXQiLCJvbkNob2ljZUxpc3RTYXZlIiwiY2hvaWNlTGlzdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsImNsYXNzaWZpY2F0aW9uU2V0IiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwicHJvamVjdCIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwicm9sZSIsInVwZGF0ZVJvbGUiLCJvbk1lbWJlcnNoaXBTYXZlIiwibWVtYmVyc2hpcCIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJkYXRhU2NoZW1hIiwidGFibGVOYW1lcyIsInJlbG9hZFZpZXdMaXN0Iiwidmlld1NjaGVtYSIsInZpZXdOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsImZvcm1hdFNpZ25hdHVyZVVSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwic3lzdGVtVmFsdWVzIiwic3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJvcHRpb25zIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJ0YWJsZVNjaGVtYSIsImNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQiLCJtZXRhZGF0YSIsInVzZVJlc291cmNlSUQiLCJwZXJzaXN0ZW50VGFibGVOYW1lcyIsImFjY291bnRQcmVmaXgiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkcm9wRnJpZW5kbHlWaWV3IiwicmVwZWF0YWJsZSIsImVsZW1lbnRzT2ZUeXBlIiwiY3JlYXRlRnJpZW5kbHlWaWV3IiwiaW50ZWdyaXR5V2FybmluZyIsIm1lc3NhZ2UiLCJwcm9jZXNzIiwic3Rkb3V0IiwiaXNUVFkiLCJjbGVhckxpbmUiLCJjdXJzb3JUbyIsIndyaXRlIiwicHJvZ3Jlc3MiLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdEYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdIb3N0IiwicGdQb3J0IiwicGdVc2VyIiwicGdQYXNzd29yZCIsInBnU2NoZW1hIiwicGdTY2hlbWFWaWV3cyIsInBnU3luY0V2ZW50cyIsInBnQmVmb3JlRnVuY3Rpb24iLCJwZ0FmdGVyRnVuY3Rpb24iLCJyZXF1aXJlZCIsInBnUmVwb3J0QmFzZVVybCIsInBnTWVkaWFCYXNlVXJsIiwicGdVbmRlcnNjb3JlTmFtZXMiLCJwZ0FycmF5cyIsInBnUHJlZml4IiwicGdTaW1wbGVUeXBlcyIsImhhbmRsZXIiLCJzdWJzdHJpbmciLCJ1c2VTeW5jRXZlbnRzIiwidXNlciIsInBhc3N3b3JkIiwicmVxdWlyZSIsImFwcCIsIlBvb2wiLCJvbiIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJvYmplY3QiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJzdGFjayIsInNjaGVtYSIsInZhbHVlc1RyYW5zZm9ybWVyIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJtZWRpYVZhbHVlIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsInRhYmxlTmFtZVdpdGhGb3JtQW5kU2NoZW1hIiwiZGF0YU5hbWUiLCJmb3JtSUQiLCJwcmVmaXgiLCJrZXkiLCJvYmplY3ROYW1lIiwiYmVmb3JlU3luYyIsImFmdGVyU3luYyIsImZpbmRFYWNoUmVjb3JkIiwiYWN0aXZlVmlld05hbWVzIiwicHVzaCIsInJlbW92ZSIsInByZXBhcmVNaWdyYXRpb25TY3JpcHQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaFNpZ25hdHVyZSIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hQcm9qZWN0IiwiZmluZEVhY2hGb3JtIiwiZmluZEVhY2hNZW1iZXJzaGlwIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCIsIm1heWJlUnVuTWlncmF0aW9ucyIsIm1pZ3JhdGlvbnMiLCJwb3B1bGF0ZVJlY29yZHMiLCJjb3VudCIsInZlcnNpb24iLCJuZWVkc01pZ3JhdGlvbiIsIm1pZ3JhdGVDYWxjdWxhdGVkRmllbGRzRGF0ZUZvcm1hdCIsImZpZWxkcyIsImZpbHRlciIsImRpc3BsYXkiLCJpc0RhdGUiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztJQUlZQSxHOztBQUhaOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7Ozs7QUFFQSxNQUFNQyx3QkFBd0IsRUFBOUI7O0FBRUEsTUFBTUMsa0JBQWtCO0FBQ3RCQyxZQUFVLFlBRFk7QUFFdEJDLFFBQU0sV0FGZ0I7QUFHdEJDLFFBQU0sSUFIZ0I7QUFJdEJDLE9BQUssRUFKaUI7QUFLdEJDLHFCQUFtQjtBQUxHLENBQXhCOztBQVFBLE1BQU1DLGFBQWE7QUFDakIsMEJBRGlCO0FBRWpCLDBCQUZpQjtBQUdqQiwwQkFIaUI7QUFJakI7QUFKaUIsQ0FBbkI7O0FBT0EsTUFBTUMsa0JBQWtCLENBQXhCOztBQUVBLE1BQU1DLGlCQUFpQixRQUF2Qjs7QUFFQSxNQUFNLEVBQUVDLEdBQUYsRUFBT0MsSUFBUCxFQUFhQyxLQUFiLEtBQXVCQyxRQUFRQyxNQUFSLENBQWVDLFdBQWYsQ0FBMkIsVUFBM0IsQ0FBN0I7O2tCQUVlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBa0luQkMsVUFsSW1CLHFCQWtJTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFVBQUlKLFFBQVFLLElBQVIsQ0FBYUMsTUFBakIsRUFBeUI7QUFDdkIsY0FBTSxNQUFLQyxnQkFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxVQUFJUCxRQUFRSyxJQUFSLENBQWFHLE9BQWpCLEVBQTBCO0FBQ3hCLGNBQU0sTUFBS0MsYUFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxZQUFNQyxVQUFVLE1BQU1WLFFBQVFXLFlBQVIsQ0FBcUJYLFFBQVFLLElBQVIsQ0FBYU8sR0FB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QUEwQjtBQUN4QlEsZ0JBQVEsQ0FBUjs7QUFFQSxjQUFNTixLQUFLaU4sY0FBTCxDQUFvQixFQUFwQjtBQUFBLHlDQUF3QixXQUFPakssTUFBUCxFQUFrQjtBQUM5Q0EsbUJBQU9oRCxJQUFQLEdBQWNBLElBQWQ7O0FBRUEsZ0JBQUksRUFBRU0sS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEIsc0JBQUtrSSxRQUFMLENBQWN4SSxLQUFLUSxJQUFuQixFQUF5QkYsS0FBekI7QUFDRDs7QUFFRCxrQkFBTSxRQUFLMkMsWUFBTCxDQUFrQkQsTUFBbEIsRUFBMEJ4RCxPQUExQixFQUFtQyxLQUFuQyxDQUFOO0FBQ0QsV0FSSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFOO0FBU0Q7QUFqQjRCO0FBa0I5Qjs7QUFFSytPLG1DQUFOLENBQXdDL08sT0FBeEMsRUFBaUQ7QUFBQTs7QUFBQTtBQUMvQyxZQUFNTSxRQUFRLE1BQU1OLFFBQVFPLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsV0FBSyxNQUFNQyxJQUFYLElBQW1CRixLQUFuQixFQUEwQjtBQUN4QixjQUFNME8sU0FBU3hPLEtBQUs4SCxjQUFMLENBQW9CLGlCQUFwQixFQUF1QzJHLE1BQXZDLENBQThDO0FBQUEsaUJBQVczQyxRQUFRNEMsT0FBUixDQUFnQkMsTUFBM0I7QUFBQSxTQUE5QyxDQUFmOztBQUVBLFlBQUlILE9BQU9JLE1BQVgsRUFBbUI7QUFDakJqUSxjQUFJLDhDQUFKLEVBQW9EcUIsS0FBS1EsSUFBekQ7O0FBRUEsZ0JBQU0sUUFBS0gsV0FBTCxDQUFpQkwsSUFBakIsRUFBdUJSLE9BQXZCLEVBQWdDLFlBQU0sQ0FBRSxDQUF4QyxDQUFOO0FBQ0Q7QUFDRjtBQVg4QztBQVloRDs7QUE1OUJrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCBzbmFrZSBmcm9tICdzbmFrZS1jYXNlJztcbmltcG9ydCB0ZW1wbGF0ZURyb3AgZnJvbSAnLi90ZW1wbGF0ZS5kcm9wLnNxbCc7XG5pbXBvcnQgU2NoZW1hTWFwIGZyb20gJy4vc2NoZW1hLW1hcCc7XG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnZnVsY3J1bSc7XG5pbXBvcnQgeyBjb21wYWN0LCBkaWZmZXJlbmNlLCBwYWRTdGFydCB9IGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCB2ZXJzaW9uMDAxIGZyb20gJy4vdmVyc2lvbi0wMDEuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAyIGZyb20gJy4vdmVyc2lvbi0wMDIuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAzIGZyb20gJy4vdmVyc2lvbi0wMDMuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA0IGZyb20gJy4vdmVyc2lvbi0wMDQuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA1IGZyb20gJy4vdmVyc2lvbi0wMDUuc3FsJztcblxuY29uc3QgTUFYX0lERU5USUZJRVJfTEVOR1RIID0gNjM7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuY29uc3QgTUlHUkFUSU9OUyA9IHtcbiAgJzAwMic6IHZlcnNpb24wMDIsXG4gICcwMDMnOiB2ZXJzaW9uMDAzLFxuICAnMDA0JzogdmVyc2lvbjAwNCxcbiAgJzAwNSc6IHZlcnNpb24wMDVcbn07XG5cbmNvbnN0IENVUlJFTlRfVkVSU0lPTiA9IDU7XG5cbmNvbnN0IERFRkFVTFRfU0NIRU1BID0gJ3B1YmxpYyc7XG5cbmNvbnN0IHsgbG9nLCB3YXJuLCBlcnJvciB9ID0gZnVsY3J1bS5sb2dnZXIud2l0aENvbnRleHQoJ3Bvc3RncmVzJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NjaGVtYVZpZXdzOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hIGZvciB0aGUgZnJpZW5kbHkgdmlld3MnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3luY0V2ZW50czoge1xuICAgICAgICAgIGRlc2M6ICdhZGQgc3luYyBldmVudCBob29rcycsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdCZWZvcmVGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0FmdGVyRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGFmdGVyIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBvcmc6IHtcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnRm9ybToge1xuICAgICAgICAgIGRlc2M6ICd0aGUgZm9ybSBJRCB0byByZWJ1aWxkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1JlcG9ydEJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAncmVwb3J0IFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ01lZGlhQmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdtZWRpYSBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdVbmRlcnNjb3JlTmFtZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHVuZGVyc2NvcmUgbmFtZXMgKGUuZy4gXCJQYXJrIEluc3BlY3Rpb25zXCIgYmVjb21lcyBcInBhcmtfaW5zcGVjdGlvbnNcIiknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ1JlYnVpbGRWaWV3c09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSByZWJ1aWxkIHRoZSB2aWV3cycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0N1c3RvbU1vZHVsZToge1xuICAgICAgICAgIGRlc2M6ICdhIGN1c3RvbSBtb2R1bGUgdG8gbG9hZCB3aXRoIHN5bmMgZXh0ZW5zaW9ucycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2V0dXA6IHtcbiAgICAgICAgICBkZXNjOiAnc2V0dXAgdGhlIGRhdGFiYXNlJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgIH0sXG4gICAgICAgIHBnRHJvcDoge1xuICAgICAgICAgIGRlc2M6ICdkcm9wIHRoZSBzeXN0ZW0gdGFibGVzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQXJyYXlzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSBhcnJheSB0eXBlcyBmb3IgbXVsdGktdmFsdWUgZmllbGRzIGxpa2UgY2hvaWNlIGZpZWxkcywgY2xhc3NpZmljYXRpb24gZmllbGRzIGFuZCBtZWRpYSBmaWVsZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICAvLyBwZ1BlcnNpc3RlbnRUYWJsZU5hbWVzOiB7XG4gICAgICAgIC8vICAgZGVzYzogJ3VzZSB0aGUgc2VydmVyIGlkIGluIHRoZSBmb3JtIHRhYmxlIG5hbWVzJyxcbiAgICAgICAgLy8gICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgIC8vICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAvLyAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIC8vIH0sXG4gICAgICAgIHBnUHJlZml4OiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB0aGUgb3JnYW5pemF0aW9uIGFzIGEgcHJlZml4IGluIHRoZSBvYmplY3QgbmFtZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ1NpbXBsZVR5cGVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSBzaW1wbGUgdHlwZXMgaW4gdGhlIGRhdGFiYXNlIHRoYXQgYXJlIG1vcmUgY29tcGF0aWJsZSB3aXRoIG90aGVyIGFwcGxpY2F0aW9ucyAobm8gdHN2ZWN0b3IsIGdlb21ldHJ5LCBhcnJheXMpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3lzdGVtVGFibGVzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IGNyZWF0ZSB0aGUgc3lzdGVtIHJlY29yZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRHJvcCkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wU3lzdGVtVGFibGVzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NldHVwKSB7XG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ1N5c3RlbVRhYmxlc09ubHkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG5cbiAgICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Zvcm0gJiYgZm9ybS5pZCAhPT0gZnVsY3J1bS5hcmdzLnBnRm9ybSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlYnVpbGRWaWV3c09ubHkpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKGluZGV4KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhmb3JtLm5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkICsgJyByZWNvcmRzJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2coJycpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICB0cmltSWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIuc3Vic3RyaW5nKDAsIE1BWF9JREVOVElGSUVSX0xFTkdUSCk7XG4gIH1cblxuICBlc2NhcGVJZGVudGlmaWVyID0gKGlkZW50aWZpZXIpID0+IHtcbiAgICByZXR1cm4gaWRlbnRpZmllciAmJiB0aGlzLnBnZGIuaWRlbnQodGhpcy50cmltSWRlbnRpZmllcihpZGVudGlmaWVyKSk7XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICB0aGlzLmFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdIb3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBnUG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdEYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2UsXG4gICAgICB1c2VyOiBmdWxjcnVtLmFyZ3MucGdVc2VyIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyXG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdVc2VyKSB7XG4gICAgICBvcHRpb25zLnVzZXIgPSBmdWxjcnVtLmFyZ3MucGdVc2VyO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCkge1xuICAgICAgb3B0aW9ucy5wYXNzd29yZCA9IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpIHtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUgPSByZXF1aXJlKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSk7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFwaSA9IGFwaTtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUuYXBwID0gZnVsY3J1bTtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQXJyYXlzID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5kaXNhYmxlQXJyYXlzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2ltcGxlVHlwZXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gaWYgKGZ1bGNydW0uYXJncy5wZ1BlcnNpc3RlbnRUYWJsZU5hbWVzID09PSB0cnVlKSB7XG4gICAgICAvLyB0aGlzLnBlcnNpc3RlbnRUYWJsZU5hbWVzID0gdHJ1ZTtcbiAgICAvLyB9XG5cbiAgICB0aGlzLnVzZUFjY291bnRQcmVmaXggPSAoZnVsY3J1bS5hcmdzLnBnUHJlZml4ICE9PSBmYWxzZSk7XG5cbiAgICB0aGlzLnBvb2wgPSBuZXcgcGcuUG9vbChvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnVzZVN5bmNFdmVudHMpIHtcbiAgICAgIGZ1bGNydW0ub24oJ3N5bmM6c3RhcnQnLCB0aGlzLm9uU3luY1N0YXJ0KTtcbiAgICAgIGZ1bGNydW0ub24oJ3N5bmM6ZmluaXNoJywgdGhpcy5vblN5bmNGaW5pc2gpO1xuICAgICAgZnVsY3J1bS5vbigncGhvdG86c2F2ZScsIHRoaXMub25QaG90b1NhdmUpO1xuICAgICAgZnVsY3J1bS5vbigndmlkZW86c2F2ZScsIHRoaXMub25WaWRlb1NhdmUpO1xuICAgICAgZnVsY3J1bS5vbignYXVkaW86c2F2ZScsIHRoaXMub25BdWRpb1NhdmUpO1xuICAgICAgZnVsY3J1bS5vbignc2lnbmF0dXJlOnNhdmUnLCB0aGlzLm9uU2lnbmF0dXJlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52aWV3U2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hVmlld3MgfHwgREVGQVVMVF9TQ0hFTUE7XG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8IERFRkFVTFRfU0NIRU1BO1xuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9JyR7IHRoaXMuZGF0YVNjaGVtYSB9J2ApO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcblxuICAgIHRoaXMuc2V0dXBPcHRpb25zKCk7XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlSW5pdGlhbGl6ZSgpO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgbG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgaWYgKHRoaXMudXNlQWNjb3VudFByZWZpeCkge1xuICAgICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuXG4gIG9uU3luY1N0YXJ0ID0gYXN5bmMgKHthY2NvdW50LCB0YXNrc30pID0+IHtcbiAgICBhd2FpdCB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG4gIH1cblxuICBvblN5bmNGaW5pc2ggPSBhc3luYyAoe2FjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy5jbGVhbnVwRnJpZW5kbHlWaWV3cyhhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uRm9ybVNhdmUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm19KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuICB9XG5cbiAgb25Gb3JtRGVsZXRlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50fSkgPT4ge1xuICAgIGNvbnN0IG9sZEZvcm0gPSB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbnVsbCk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIG9uUGhvdG9TYXZlID0gYXN5bmMgKHtwaG90bywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uVmlkZW9TYXZlID0gYXN5bmMgKHt2aWRlbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQXVkaW9TYXZlID0gYXN5bmMgKHthdWRpbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uU2lnbmF0dXJlU2F2ZSA9IGFzeW5jICh7c2lnbmF0dXJlLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlU2lnbmF0dXJlKHNpZ25hdHVyZSwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNoYW5nZXNldFNhdmUgPSBhc3luYyAoe2NoYW5nZXNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7Y2hvaWNlTGlzdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3QoY2hvaWNlTGlzdCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7Y2xhc3NpZmljYXRpb25TZXQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvblByb2plY3RTYXZlID0gYXN5bmMgKHtwcm9qZWN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChwcm9qZWN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUm9sZVNhdmUgPSBhc3luYyAoe3JvbGUsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKHJvbGUsIGFjY291bnQpO1xuICB9XG5cbiAgb25NZW1iZXJzaGlwU2F2ZSA9IGFzeW5jICh7bWVtYmVyc2hpcCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAobWVtYmVyc2hpcCwgYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQaG90byhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAucGhvdG8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRQaG90b1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdwaG90b3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVZpZGVvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC52aWRlbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFZpZGVvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3ZpZGVvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQXVkaW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLmF1ZGlvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0QXVkaW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnYXVkaW8nKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVNpZ25hdHVyZShvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAuc2lnbmF0dXJlKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0U2lnbmF0dXJlVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3NpZ25hdHVyZXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNoYW5nZXNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hhbmdlc2V0KG9iamVjdCksICdjaGFuZ2VzZXRzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5wcm9qZWN0KG9iamVjdCksICdwcm9qZWN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAubWVtYmVyc2hpcChvYmplY3QpLCAnbWVtYmVyc2hpcHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJvbGUob2JqZWN0KSwgJ3JvbGVzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5mb3JtKG9iamVjdCksICdmb3JtcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hvaWNlTGlzdChvYmplY3QpLCAnY2hvaWNlX2xpc3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2xhc3NpZmljYXRpb25TZXQob2JqZWN0KSwgJ2NsYXNzaWZpY2F0aW9uX3NldHMnKTtcbiAgfVxuXG5cbiAgYXN5bmMgdXBkYXRlT2JqZWN0KHZhbHVlcywgdGFibGUpIHtcbiAgICBjb25zdCBkZWxldGVTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuZGVsZXRlU3RhdGVtZW50KGAkeyB0aGlzLmRhdGFTY2hlbWEgfS5zeXN0ZW1fJHt0YWJsZX1gLCB7cm93X3Jlc291cmNlX2lkOiB2YWx1ZXMucm93X3Jlc291cmNlX2lkfSk7XG4gICAgY29uc3QgaW5zZXJ0U3RhdGVtZW50ID0gdGhpcy5wZ2RiLmluc2VydFN0YXRlbWVudChgJHsgdGhpcy5kYXRhU2NoZW1hIH0uc3lzdGVtXyR7dGFibGV9YCwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcblxuICAgIGNvbnN0IHNxbCA9IFsgZGVsZXRlU3RhdGVtZW50LnNxbCwgaW5zZXJ0U3RhdGVtZW50LnNxbCBdLmpvaW4oJ1xcbicpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKHNxbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICByZWxvYWRUYWJsZUxpc3QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9JyR7IHRoaXMuZGF0YVNjaGVtYSB9J2ApO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuICB9XG5cbiAgcmVsb2FkVmlld0xpc3QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9JyR7IHRoaXMudmlld1NjaGVtYSB9J2ApO1xuICAgIHRoaXMudmlld05hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuICB9XG5cbiAgYmFzZU1lZGlhVVJMID0gKCkgPT4ge1xuICB9XG5cbiAgZm9ybWF0UGhvdG9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zLyR7IGlkIH0uanBnYDtcbiAgfVxuXG4gIGZvcm1hdFZpZGVvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy8keyBpZCB9Lm1wNGA7XG4gIH1cblxuICBmb3JtYXRBdWRpb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby8keyBpZCB9Lm00YWA7XG4gIH1cblxuICBmb3JtYXRTaWduYXR1cmVVUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vc2lnbmF0dXJlcy8keyBpZCB9LnBuZ2A7XG4gIH1cblxuICBpbnRlZ3JpdHlXYXJuaW5nKGV4KSB7XG4gICAgd2FybihgXG4tLS0tLS0tLS0tLS0tXG4hISBXQVJOSU5HICEhXG4tLS0tLS0tLS0tLS0tXG5cblBvc3RncmVTUUwgZGF0YWJhc2UgaW50ZWdyaXR5IGlzc3VlIGVuY291bnRlcmVkLiBDb21tb24gc291cmNlcyBvZiBwb3N0Z3JlcyBkYXRhYmFzZSBpc3N1ZXMgYXJlOlxuXG4qIFJlaW5zdGFsbGluZyBGdWxjcnVtIERlc2t0b3AgYW5kIHVzaW5nIGFuIG9sZCBwb3N0Z3JlcyBkYXRhYmFzZSB3aXRob3V0IHJlY3JlYXRpbmdcbiAgdGhlIHBvc3RncmVzIGRhdGFiYXNlLlxuKiBEZWxldGluZyB0aGUgaW50ZXJuYWwgYXBwbGljYXRpb24gZGF0YWJhc2UgYW5kIHVzaW5nIGFuIGV4aXN0aW5nIHBvc3RncmVzIGRhdGFiYXNlXG4qIE1hbnVhbGx5IG1vZGlmeWluZyB0aGUgcG9zdGdyZXMgZGF0YWJhc2VcbiogRm9ybSBuYW1lIGFuZCByZXBlYXRhYmxlIGRhdGEgbmFtZSBjb21iaW5hdGlvbnMgdGhhdCBleGNlZWVkIHRoZSBwb3N0Z3JlcyBsaW1pdCBvZiA2M1xuICBjaGFyYWN0ZXJzLiBJdCdzIGJlc3QgdG8ga2VlcCB5b3VyIGZvcm0gbmFtZXMgd2l0aGluIHRoZSBsaW1pdC4gVGhlIFwiZnJpZW5kbHkgdmlld1wiXG4gIGZlYXR1cmUgb2YgdGhlIHBsdWdpbiBkZXJpdmVzIHRoZSBvYmplY3QgbmFtZXMgZnJvbSB0aGUgZm9ybSBhbmQgcmVwZWF0YWJsZSBuYW1lcy5cbiogQ3JlYXRpbmcgbXVsdGlwbGUgYXBwcyBpbiBGdWxjcnVtIHdpdGggdGhlIHNhbWUgbmFtZS4gVGhpcyBpcyBnZW5lcmFsbHkgT0ssIGV4Y2VwdFxuICB5b3Ugd2lsbCBub3QgYmUgYWJsZSB0byB1c2UgdGhlIFwiZnJpZW5kbHkgdmlld1wiIGZlYXR1cmUgb2YgdGhlIHBvc3RncmVzIHBsdWdpbiBzaW5jZVxuICB0aGUgdmlldyBuYW1lcyBhcmUgZGVyaXZlZCBmcm9tIHRoZSBmb3JtIG5hbWVzLlxuXG5Ob3RlOiBXaGVuIHJlaW5zdGFsbGluZyBGdWxjcnVtIERlc2t0b3Agb3IgXCJzdGFydGluZyBvdmVyXCIgeW91IG5lZWQgdG8gZHJvcCBhbmQgcmUtY3JlYXRlXG50aGUgcG9zdGdyZXMgZGF0YWJhc2UuIFRoZSBuYW1lcyBvZiBkYXRhYmFzZSBvYmplY3RzIGFyZSB0aWVkIGRpcmVjdGx5IHRvIHRoZSBkYXRhYmFzZVxub2JqZWN0cyBpbiB0aGUgaW50ZXJuYWwgYXBwbGljYXRpb24gZGF0YWJhc2UuXG5cbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuUmVwb3J0IGlzc3VlcyBhdCBodHRwczovL2dpdGh1Yi5jb20vZnVsY3J1bWFwcC9mdWxjcnVtLWRlc2t0b3AvaXNzdWVzXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbk1lc3NhZ2U6XG4keyBleC5tZXNzYWdlIH1cblxuU3RhY2s6XG4keyBleC5zdGFjayB9XG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmAucmVkXG4gICAgKTtcbiAgfVxuXG4gIHNldHVwT3B0aW9ucygpIHtcbiAgICB0aGlzLmJhc2VNZWRpYVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL2FwaS5mdWxjcnVtYXBwLmNvbS9hcGkvdjInO1xuXG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBzY2hlbWE6IHRoaXMuZGF0YVNjaGVtYSxcblxuICAgICAgZGlzYWJsZUFycmF5czogdGhpcy5kaXNhYmxlQXJyYXlzLFxuXG4gICAgICBlc2NhcGVJZGVudGlmaWVyOiB0aGlzLmVzY2FwZUlkZW50aWZpZXIsXG5cbiAgICAgIC8vIHBlcnNpc3RlbnRUYWJsZU5hbWVzOiB0aGlzLnBlcnNpc3RlbnRUYWJsZU5hbWVzLFxuXG4gICAgICBhY2NvdW50UHJlZml4OiB0aGlzLnVzZUFjY291bnRQcmVmaXggPyAnYWNjb3VudF8nICsgdGhpcy5hY2NvdW50LnJvd0lEIDogbnVsbCxcblxuICAgICAgY2FsY3VsYXRlZEZpZWxkRGF0ZUZvcm1hdDogJ2RhdGUnLFxuXG4gICAgICBkaXNhYmxlQ29tcGxleFR5cGVzOiB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMsXG5cbiAgICAgIHZhbHVlc1RyYW5zZm9ybWVyOiB0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUudmFsdWVzVHJhbnNmb3JtZXIsXG5cbiAgICAgIG1lZGlhVVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuXG4gICAgICAgIHJldHVybiBtZWRpYVZhbHVlLml0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFBob3RvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFZpZGVvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdEF1ZGlvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgbWVkaWFWaWV3VVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZHMgPSBtZWRpYVZhbHVlLml0ZW1zLm1hcChvID0+IG8ubWVkaWFJRCk7XG5cbiAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3Mvdmlldz9waG90b3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3Mvdmlldz92aWRlb3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby92aWV3P2F1ZGlvPSR7IGlkcyB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCkge1xuICAgICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyID0gKGZlYXR1cmUpID0+IHtcbiAgICAgICAgcmV0dXJuIGAkeyBmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsIH0vcmVwb3J0cy8keyBmZWF0dXJlLmlkIH0ucGRmYDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlUmVjb3JkID0gYXN5bmMgKHJlY29yZCwgYWNjb3VudCwgc2tpcFRhYmxlQ2hlY2spID0+IHtcbiAgICBpZiAoIXNraXBUYWJsZUNoZWNrICYmICF0aGlzLnJvb3RUYWJsZUV4aXN0cyhyZWNvcmQuZm9ybSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0ocmVjb3JkLmZvcm0sIGFjY291bnQsICgpID0+IHt9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQoe3JlY29yZCwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcblxuICAgIGNvbnN0IHN5c3RlbVZhbHVlcyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUocmVjb3JkLCBudWxsLCByZWNvcmQsIHsuLi50aGlzLnJlY29yZFZhbHVlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZUNvbXBsZXhUeXBlczogZmFsc2V9KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yZWNvcmQocmVjb3JkLCBzeXN0ZW1WYWx1ZXMpLCAncmVjb3JkcycpO1xuICB9XG5cbiAgcm9vdFRhYmxlRXhpc3RzID0gKGZvcm0pID0+IHtcbiAgICByZXR1cm4gdGhpcy50YWJsZU5hbWVzLmluZGV4T2YoUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgbnVsbCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgZXJyb3IoZXgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtKHtmb3JtLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtT2JqZWN0KGZvcm0sIGFjY291bnQpO1xuXG4gICAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgZGlzYWJsZUFycmF5czogdGhpcy5kaXNhYmxlQXJyYXlzLFxuICAgICAgICBkaXNhYmxlQ29tcGxleFR5cGVzOiB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMsXG4gICAgICAgIHVzZXJNb2R1bGU6IHRoaXMucGdDdXN0b21Nb2R1bGUsXG4gICAgICAgIHRhYmxlU2NoZW1hOiB0aGlzLmRhdGFTY2hlbWEsXG4gICAgICAgIGNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQ6ICdkYXRlJyxcbiAgICAgICAgbWV0YWRhdGE6IHRydWUsXG4gICAgICAgIHVzZVJlc291cmNlSUQ6IHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMsXG4gICAgICAgIGFjY291bnRQcmVmaXg6IHRoaXMudXNlQWNjb3VudFByZWZpeCA/ICdhY2NvdW50XycgKyB0aGlzLmFjY291bnQucm93SUQgOiBudWxsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwgb3B0aW9ucyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKFsnQkVHSU4gVFJBTlNBQ1RJT047JyxcbiAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICdDT01NSVQgVFJBTlNBQ1RJT047J10uam9pbignXFxuJykpO1xuXG4gICAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXMgQ0FTQ0FERTsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlczsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm1BbmRTY2hlbWEoZm9ybSwgcmVwZWF0YWJsZSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMsICdfdmlld19mdWxsJykpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IG5hbWUgPSBjb21wYWN0KFtmb3JtLm5hbWUsIHJlcGVhdGFibGUgJiYgcmVwZWF0YWJsZS5kYXRhTmFtZV0pLmpvaW4oJyAtICcpXG5cbiAgICBjb25zdCBmb3JtSUQgPSB0aGlzLnBlcnNpc3RlbnRUYWJsZU5hbWVzID8gZm9ybS5pZCA6IGZvcm0ucm93SUQ7XG5cbiAgICBjb25zdCBwcmVmaXggPSBjb21wYWN0KFsndmlldycsIGZvcm1JRCwgcmVwZWF0YWJsZSAmJiByZXBlYXRhYmxlLmtleV0pLmpvaW4oJyAtICcpO1xuXG4gICAgY29uc3Qgb2JqZWN0TmFtZSA9IFtwcmVmaXgsIG5hbWVdLmpvaW4oJyAtICcpO1xuXG4gICAgcmV0dXJuIHRoaXMudHJpbUlkZW50aWZpZXIoZnVsY3J1bS5hcmdzLnBnVW5kZXJzY29yZU5hbWVzICE9PSBmYWxzZSA/IHNuYWtlKG9iamVjdE5hbWUpIDogb2JqZWN0TmFtZSk7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmJlZm9yZVN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hZnRlclN5bmMpIHtcbiAgICAgIGF3YWl0IHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcyhpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBwcm9ncmVzcyhpbmRleCk7XG4gIH1cblxuICBhc3luYyBjbGVhbnVwRnJpZW5kbHlWaWV3cyhhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRWaWV3TGlzdCgpO1xuXG4gICAgY29uc3QgYWN0aXZlVmlld05hbWVzID0gW107XG5cbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgYWN0aXZlVmlld05hbWVzLnB1c2godGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCBudWxsKSk7XG5cbiAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgICAgYWN0aXZlVmlld05hbWVzLnB1c2godGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVtb3ZlID0gZGlmZmVyZW5jZSh0aGlzLnZpZXdOYW1lcywgYWN0aXZlVmlld05hbWVzKTtcblxuICAgIGZvciAoY29uc3Qgdmlld05hbWUgb2YgcmVtb3ZlKSB7XG4gICAgICBpZiAodmlld05hbWUuaW5kZXhPZigndmlld18nKSA9PT0gMCB8fCB2aWV3TmFtZS5pbmRleE9mKCd2aWV3IC0gJykgPT09IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXM7JywgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMudmlld1NjaGVtYSksIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSkpKTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcbiAgICBpZiAoZm9ybSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlU3RhdHVzID0gKG1lc3NhZ2UpID0+IHtcbiAgICBpZiAocHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wU3lzdGVtVGFibGVzKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh0ZW1wbGF0ZURyb3ApKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwRGF0YWJhc2UoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHZlcnNpb24wMDEpKTtcbiAgfVxuXG4gIHByZXBhcmVNaWdyYXRpb25TY3JpcHQoc3FsKSB7XG4gICAgcmV0dXJuIHNxbC5yZXBsYWNlKC9fX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSlcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLnZpZXdTY2hlbWEpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gICAgfTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQaG90byh7fSwgYXN5bmMgKHBob3RvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQaG90b3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFZpZGVvKHt9LCBhc3luYyAodmlkZW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1ZpZGVvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQXVkaW8oe30sIGFzeW5jIChhdWRpbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQXVkaW8nLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFNpZ25hdHVyZSh7fSwgYXN5bmMgKHNpZ25hdHVyZSwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnU2lnbmF0dXJlcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVTaWduYXR1cmUoc2lnbmF0dXJlLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaGFuZ2VzZXQoe30sIGFzeW5jIChjaGFuZ2VzZXQsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NoYW5nZXNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUm9sZSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUm9sZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFByb2plY3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Byb2plY3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hGb3JtKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdGb3JtcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoTWVtYmVyc2hpcCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnTWVtYmVyc2hpcHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENob2ljZUxpc3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Nob2ljZSBMaXN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NsYXNzaWZpY2F0aW9uIFNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlSW5pdGlhbGl6ZSgpIHtcbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAodGhpcy50YWJsZU5hbWVzLmluZGV4T2YoJ21pZ3JhdGlvbnMnKSA9PT0gLTEpIHtcbiAgICAgIGxvZygnSW5pdGl0YWxpemluZyBkYXRhYmFzZS4uLicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KSB7XG4gICAgdGhpcy5taWdyYXRpb25zID0gKGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgbmFtZSBGUk9NICR7IHRoaXMuZGF0YVNjaGVtYSB9Lm1pZ3JhdGlvbnNgKSkubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIGxldCBwb3B1bGF0ZVJlY29yZHMgPSBmYWxzZTtcblxuICAgIGZvciAobGV0IGNvdW50ID0gMjsgY291bnQgPD0gQ1VSUkVOVF9WRVJTSU9OOyArK2NvdW50KSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gcGFkU3RhcnQoY291bnQsIDMsICcwJyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzTWlncmF0aW9uID0gdGhpcy5taWdyYXRpb25zLmluZGV4T2YodmVyc2lvbikgPT09IC0xICYmIE1JR1JBVElPTlNbdmVyc2lvbl07XG5cbiAgICAgIGlmIChuZWVkc01pZ3JhdGlvbikge1xuICAgICAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQoTUlHUkFUSU9OU1t2ZXJzaW9uXSkpO1xuXG4gICAgICAgIGlmICh2ZXJzaW9uID09PSAnMDAyJykge1xuICAgICAgICAgIGxvZygnUG9wdWxhdGluZyBzeXN0ZW0gdGFibGVzLi4uJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgICBwb3B1bGF0ZVJlY29yZHMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZlcnNpb24gPT09ICcwMDUnKSB7XG4gICAgICAgICAgbG9nKCdNaWdyYXRpbmcgZGF0ZSBjYWxjdWxhdGlvbiBmaWVsZHMuLi4nKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLm1pZ3JhdGVDYWxjdWxhdGVkRmllbGRzRGF0ZUZvcm1hdChhY2NvdW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3B1bGF0ZVJlY29yZHMpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9wdWxhdGVSZWNvcmRzKGFjY291bnQpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KSB7XG4gICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBpbmRleCA9IDA7XG5cbiAgICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgICB0aGlzLnByb2dyZXNzKGZvcm0ubmFtZSwgaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCBmYWxzZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBtaWdyYXRlQ2FsY3VsYXRlZEZpZWxkc0RhdGVGb3JtYXQoYWNjb3VudCkge1xuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBjb25zdCBmaWVsZHMgPSBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdDYWxjdWxhdGVkRmllbGQnKS5maWx0ZXIoZWxlbWVudCA9PiBlbGVtZW50LmRpc3BsYXkuaXNEYXRlKTtcblxuICAgICAgaWYgKGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgICAgbG9nKCdNaWdyYXRpbmcgZGF0ZSBjYWxjdWxhdGlvbiBmaWVsZHMgaW4gZm9ybS4uLicsIGZvcm0ubmFtZSk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gIH1cbn1cbiJdfQ==