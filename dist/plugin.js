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

var _version11 = require('./version-006.sql');

var _version12 = _interopRequireDefault(_version11);

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
  '005': _version10.default,
  '006': _version12.default
};

const CURRENT_VERSION = 6;

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
            useResourceID: false,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiQ1VSUkVOVF9WRVJTSU9OIiwiREVGQVVMVF9TQ0hFTUEiLCJsb2ciLCJ3YXJuIiwiZXJyb3IiLCJmdWxjcnVtIiwibG9nZ2VyIiwid2l0aENvbnRleHQiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhcmdzIiwicGdEcm9wIiwiZHJvcFN5c3RlbVRhYmxlcyIsInBnU2V0dXAiLCJzZXR1cERhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsInBnU3lzdGVtVGFibGVzT25seSIsInNldHVwU3lzdGVtVGFibGVzIiwiaW52b2tlQmVmb3JlRnVuY3Rpb24iLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJwZ0Zvcm0iLCJpZCIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVzY2FwZUlkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicGdkYiIsImlkZW50IiwidHJpbUlkZW50aWZpZXIiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJ1c2VBY2NvdW50UHJlZml4Iiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwiY2xlYW51cEZyaWVuZGx5Vmlld3MiLCJvbkZvcm1TYXZlIiwib2xkRm9ybSIsIm5ld0Zvcm0iLCJ1cGRhdGVGb3JtIiwib25Gb3JtRGVsZXRlIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvblNpZ25hdHVyZVNhdmUiLCJzaWduYXR1cmUiLCJ1cGRhdGVTaWduYXR1cmUiLCJvbkNoYW5nZXNldFNhdmUiLCJjaGFuZ2VzZXQiLCJ1cGRhdGVDaGFuZ2VzZXQiLCJvbkNob2ljZUxpc3RTYXZlIiwiY2hvaWNlTGlzdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsImNsYXNzaWZpY2F0aW9uU2V0IiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwicHJvamVjdCIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwicm9sZSIsInVwZGF0ZVJvbGUiLCJvbk1lbWJlcnNoaXBTYXZlIiwibWVtYmVyc2hpcCIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJkYXRhU2NoZW1hIiwidGFibGVOYW1lcyIsInJlbG9hZFZpZXdMaXN0Iiwidmlld1NjaGVtYSIsInZpZXdOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsImZvcm1hdFNpZ25hdHVyZVVSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwic3lzdGVtVmFsdWVzIiwic3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJvcHRpb25zIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJ0YWJsZVNjaGVtYSIsImNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQiLCJtZXRhZGF0YSIsInVzZVJlc291cmNlSUQiLCJhY2NvdW50UHJlZml4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImludGVncml0eVdhcm5pbmciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInByb2dyZXNzIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU2NoZW1hVmlld3MiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwicGdBcnJheXMiLCJwZ1ByZWZpeCIsInBnU2ltcGxlVHlwZXMiLCJoYW5kbGVyIiwic3Vic3RyaW5nIiwidXNlU3luY0V2ZW50cyIsInVzZXIiLCJwYXNzd29yZCIsInJlcXVpcmUiLCJhcHAiLCJQb29sIiwib24iLCJzZXR1cE9wdGlvbnMiLCJtYXliZUluaXRpYWxpemUiLCJkZWFjdGl2YXRlIiwiZW5kIiwib2JqZWN0IiwidmFsdWVzIiwiZmlsZSIsImFjY2Vzc19rZXkiLCJ0YWJsZSIsImRlbGV0ZVN0YXRlbWVudCIsInJvd19yZXNvdXJjZV9pZCIsImluc2VydFN0YXRlbWVudCIsInBrIiwic3RhY2siLCJzY2hlbWEiLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybUFuZFNjaGVtYSIsImRhdGFOYW1lIiwiZm9ybUlEIiwicGVyc2lzdGVudFRhYmxlTmFtZXMiLCJwcmVmaXgiLCJrZXkiLCJvYmplY3ROYW1lIiwiYmVmb3JlU3luYyIsImFmdGVyU3luYyIsImZpbmRFYWNoUmVjb3JkIiwiYWN0aXZlVmlld05hbWVzIiwicHVzaCIsInJlbW92ZSIsInByZXBhcmVNaWdyYXRpb25TY3JpcHQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaFNpZ25hdHVyZSIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hQcm9qZWN0IiwiZmluZEVhY2hGb3JtIiwiZmluZEVhY2hNZW1iZXJzaGlwIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCIsIm1heWJlUnVuTWlncmF0aW9ucyIsIm1pZ3JhdGlvbnMiLCJwb3B1bGF0ZVJlY29yZHMiLCJjb3VudCIsInZlcnNpb24iLCJuZWVkc01pZ3JhdGlvbiIsIm1pZ3JhdGVDYWxjdWxhdGVkRmllbGRzRGF0ZUZvcm1hdCIsImZpZWxkcyIsImZpbHRlciIsImRpc3BsYXkiLCJpc0RhdGUiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztJQUlZQSxHOztBQUhaOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7OztBQUVBLE1BQU1DLHdCQUF3QixFQUE5Qjs7QUFFQSxNQUFNQyxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O0FBUUEsTUFBTUMsYUFBYTtBQUNqQiwwQkFEaUI7QUFFakIsMEJBRmlCO0FBR2pCLDBCQUhpQjtBQUlqQiwyQkFKaUI7QUFLakI7QUFMaUIsQ0FBbkI7O0FBUUEsTUFBTUMsa0JBQWtCLENBQXhCOztBQUVBLE1BQU1DLGlCQUFpQixRQUF2Qjs7QUFFQSxNQUFNLEVBQUVDLEdBQUYsRUFBT0MsSUFBUCxFQUFhQyxLQUFiLEtBQXVCQyxRQUFRQyxNQUFSLENBQWVDLFdBQWYsQ0FBMkIsVUFBM0IsQ0FBN0I7O2tCQUVlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBa0luQkMsVUFsSW1CLHFCQWtJTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFVBQUlKLFFBQVFLLElBQVIsQ0FBYUMsTUFBakIsRUFBeUI7QUFDdkIsY0FBTSxNQUFLQyxnQkFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxVQUFJUCxRQUFRSyxJQUFSLENBQWFHLE9BQWpCLEVBQTBCO0FBQ3hCLGNBQU0sTUFBS0MsYUFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxZQUFNQyxVQUFVLE1BQU1WLFFBQVFXLFlBQVIsQ0FBcUJY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QW1CRixLQUFuQixFQUEwQjtBQUN4QlEsZ0JBQVEsQ0FBUjs7QUFFQSxjQUFNTixLQUFLaU4sY0FBTCxDQUFvQixFQUFwQjtBQUFBLHlDQUF3QixXQUFPakssTUFBUCxFQUFrQjtBQUM5Q0EsbUJBQU9oRCxJQUFQLEdBQWNBLElBQWQ7O0FBRUEsZ0JBQUksRUFBRU0sS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEIsc0JBQUtpSSxRQUFMLENBQWN2SSxLQUFLUSxJQUFuQixFQUF5QkYsS0FBekI7QUFDRDs7QUFFRCxrQkFBTSxRQUFLMkMsWUFBTCxDQUFrQkQsTUFBbEIsRUFBMEJ4RCxPQUExQixFQUFtQyxLQUFuQyxDQUFOO0FBQ0QsV0FSSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFOO0FBU0Q7QUFqQjRCO0FBa0I5Qjs7QUFFSytPLG1DQUFOLENBQXdDL08sT0FBeEMsRUFBaUQ7QUFBQTs7QUFBQTtBQUMvQyxZQUFNTSxRQUFRLE1BQU1OLFFBQVFPLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsV0FBSyxNQUFNQyxJQUFYLElBQW1CRixLQUFuQixFQUEwQjtBQUN4QixjQUFNME8sU0FBU3hPLEtBQUs2SCxjQUFMLENBQW9CLGlCQUFwQixFQUF1QzRHLE1BQXZDLENBQThDO0FBQUEsaUJBQVc1QyxRQUFRNkMsT0FBUixDQUFnQkMsTUFBM0I7QUFBQSxTQUE5QyxDQUFmOztBQUVBLFlBQUlILE9BQU9JLE1BQVgsRUFBbUI7QUFDakJqUSxjQUFJLDhDQUFKLEVBQW9EcUIsS0FBS1EsSUFBekQ7O0FBRUEsZ0JBQU0sUUFBS0gsV0FBTCxDQUFpQkwsSUFBakIsRUFBdUJSLE9BQXZCLEVBQWdDLFlBQU0sQ0FBRSxDQUF4QyxDQUFOO0FBQ0Q7QUFDRjtBQVg4QztBQVloRDs7QUE1OUJrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCBzbmFrZSBmcm9tICdzbmFrZS1jYXNlJztcbmltcG9ydCB0ZW1wbGF0ZURyb3AgZnJvbSAnLi90ZW1wbGF0ZS5kcm9wLnNxbCc7XG5pbXBvcnQgU2NoZW1hTWFwIGZyb20gJy4vc2NoZW1hLW1hcCc7XG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnZnVsY3J1bSc7XG5pbXBvcnQgeyBjb21wYWN0LCBkaWZmZXJlbmNlLCBwYWRTdGFydCB9IGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCB2ZXJzaW9uMDAxIGZyb20gJy4vdmVyc2lvbi0wMDEuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAyIGZyb20gJy4vdmVyc2lvbi0wMDIuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAzIGZyb20gJy4vdmVyc2lvbi0wMDMuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA0IGZyb20gJy4vdmVyc2lvbi0wMDQuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA1IGZyb20gJy4vdmVyc2lvbi0wMDUuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA2IGZyb20gJy4vdmVyc2lvbi0wMDYuc3FsJztcblxuY29uc3QgTUFYX0lERU5USUZJRVJfTEVOR1RIID0gNjM7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuY29uc3QgTUlHUkFUSU9OUyA9IHtcbiAgJzAwMic6IHZlcnNpb24wMDIsXG4gICcwMDMnOiB2ZXJzaW9uMDAzLFxuICAnMDA0JzogdmVyc2lvbjAwNCxcbiAgJzAwNSc6IHZlcnNpb24wMDUsXG4gICcwMDYnOiB2ZXJzaW9uMDA2XG59O1xuXG5jb25zdCBDVVJSRU5UX1ZFUlNJT04gPSA2O1xuXG5jb25zdCBERUZBVUxUX1NDSEVNQSA9ICdwdWJsaWMnO1xuXG5jb25zdCB7IGxvZywgd2FybiwgZXJyb3IgfSA9IGZ1bGNydW0ubG9nZ2VyLndpdGhDb250ZXh0KCdwb3N0Z3JlcycpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGFzeW5jIHRhc2soY2xpKSB7XG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICdwb3N0Z3JlcycsXG4gICAgICBkZXNjOiAncnVuIHRoZSBwb3N0Z3JlcyBzeW5jIGZvciBhIHNwZWNpZmljIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIHBnRGF0YWJhc2U6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBkYXRhYmFzZSBuYW1lJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdIb3N0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIGhvc3QnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIHBnUG9ydDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBwb3J0JyxcbiAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLnBvcnRcbiAgICAgICAgfSxcbiAgICAgICAgcGdVc2VyOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgdXNlcicsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdQYXNzd29yZDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHBhc3N3b3JkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NjaGVtYToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWFWaWV3czoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYSBmb3IgdGhlIGZyaWVuZGx5IHZpZXdzJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Zvcm06IHtcbiAgICAgICAgICBkZXNjOiAndGhlIGZvcm0gSUQgdG8gcmVidWlsZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZXBvcnRCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ3JlcG9ydCBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdNZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnVW5kZXJzY29yZU5hbWVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB1bmRlcnNjb3JlIG5hbWVzIChlLmcuIFwiUGFyayBJbnNwZWN0aW9uc1wiIGJlY29tZXMgXCJwYXJrX2luc3BlY3Rpb25zXCIpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZWJ1aWxkVmlld3NPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgcmVidWlsZCB0aGUgdmlld3MnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdDdXN0b21Nb2R1bGU6IHtcbiAgICAgICAgICBkZXNjOiAnYSBjdXN0b20gbW9kdWxlIHRvIGxvYWQgd2l0aCBzeW5jIGV4dGVuc2lvbnMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NldHVwOiB7XG4gICAgICAgICAgZGVzYzogJ3NldHVwIHRoZSBkYXRhYmFzZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Ryb3A6IHtcbiAgICAgICAgICBkZXNjOiAnZHJvcCB0aGUgc3lzdGVtIHRhYmxlcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0FycmF5czoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgYXJyYXkgdHlwZXMgZm9yIG11bHRpLXZhbHVlIGZpZWxkcyBsaWtlIGNob2ljZSBmaWVsZHMsIGNsYXNzaWZpY2F0aW9uIGZpZWxkcyBhbmQgbWVkaWEgZmllbGRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgLy8gcGdQZXJzaXN0ZW50VGFibGVOYW1lczoge1xuICAgICAgICAvLyAgIGRlc2M6ICd1c2UgdGhlIHNlcnZlciBpZCBpbiB0aGUgZm9ybSB0YWJsZSBuYW1lcycsXG4gICAgICAgIC8vICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAvLyAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgLy8gICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAvLyB9LFxuICAgICAgICBwZ1ByZWZpeDoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdGhlIG9yZ2FuaXphdGlvbiBhcyBhIHByZWZpeCBpbiB0aGUgb2JqZWN0IG5hbWVzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdTaW1wbGVUeXBlczoge1xuICAgICAgICAgIGRlc2M6ICd1c2Ugc2ltcGxlIHR5cGVzIGluIHRoZSBkYXRhYmFzZSB0aGF0IGFyZSBtb3JlIGNvbXBhdGlibGUgd2l0aCBvdGhlciBhcHBsaWNhdGlvbnMgKG5vIHRzdmVjdG9yLCBnZW9tZXRyeSwgYXJyYXlzKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ1N5c3RlbVRhYmxlc09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSBjcmVhdGUgdGhlIHN5c3RlbSByZWNvcmRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Ryb3ApIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcFN5c3RlbVRhYmxlcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTZXR1cCkge1xuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTeXN0ZW1UYWJsZXNPbmx5KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdGb3JtICYmIGZvcm0uaWQgIT09IGZ1bGNydW0uYXJncy5wZ0Zvcm0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZWJ1aWxkVmlld3NPbmx5KSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIChpbmRleCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgZnVsY3J1bS5hcmdzLm9yZyk7XG4gICAgfVxuICB9XG5cbiAgdHJpbUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICAgIHJldHVybiBpZGVudGlmaWVyLnN1YnN0cmluZygwLCBNQVhfSURFTlRJRklFUl9MRU5HVEgpO1xuICB9XG5cbiAgZXNjYXBlSWRlbnRpZmllciA9IChpZGVudGlmaWVyKSA9PiB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIgJiYgdGhpcy5wZ2RiLmlkZW50KHRoaXMudHJpbUlkZW50aWZpZXIoaWRlbnRpZmllcikpO1xuICB9XG5cbiAgZ2V0IHVzZVN5bmNFdmVudHMoKSB7XG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgIT0gbnVsbCA/IGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgOiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGUoKSB7XG4gICAgdGhpcy5hY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcGkgPSBhcGk7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFwcCA9IGZ1bGNydW07XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FycmF5cyA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUFycmF5cyA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NpbXBsZVR5cGVzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGlmIChmdWxjcnVtLmFyZ3MucGdQZXJzaXN0ZW50VGFibGVOYW1lcyA9PT0gdHJ1ZSkge1xuICAgICAgLy8gdGhpcy5wZXJzaXN0ZW50VGFibGVOYW1lcyA9IHRydWU7XG4gICAgLy8gfVxuXG4gICAgdGhpcy51c2VBY2NvdW50UHJlZml4ID0gKGZ1bGNydW0uYXJncy5wZ1ByZWZpeCAhPT0gZmFsc2UpO1xuXG4gICAgdGhpcy5wb29sID0gbmV3IHBnLlBvb2wob3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy51c2VTeW5jRXZlbnRzKSB7XG4gICAgICBmdWxjcnVtLm9uKCdzeW5jOnN0YXJ0JywgdGhpcy5vblN5bmNTdGFydCk7XG4gICAgICBmdWxjcnVtLm9uKCdzeW5jOmZpbmlzaCcsIHRoaXMub25TeW5jRmluaXNoKTtcbiAgICAgIGZ1bGNydW0ub24oJ3Bob3RvOnNhdmUnLCB0aGlzLm9uUGhvdG9TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3ZpZGVvOnNhdmUnLCB0aGlzLm9uVmlkZW9TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2F1ZGlvOnNhdmUnLCB0aGlzLm9uQXVkaW9TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3NpZ25hdHVyZTpzYXZlJywgdGhpcy5vblNpZ25hdHVyZVNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2hhbmdlc2V0OnNhdmUnLCB0aGlzLm9uQ2hhbmdlc2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpkZWxldGUnLCB0aGlzLm9uUmVjb3JkRGVsZXRlKTtcblxuICAgICAgZnVsY3J1bS5vbignY2hvaWNlLWxpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpkZWxldGUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOnNhdmUnLCB0aGlzLm9uRm9ybVNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignZm9ybTpkZWxldGUnLCB0aGlzLm9uRm9ybVNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6c2F2ZScsIHRoaXMub25DbGFzc2lmaWNhdGlvblNldFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb24tc2V0OmRlbGV0ZScsIHRoaXMub25DbGFzc2lmaWNhdGlvblNldFNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOnNhdmUnLCB0aGlzLm9uUm9sZVNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncm9sZTpkZWxldGUnLCB0aGlzLm9uUm9sZVNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncHJvamVjdDpkZWxldGUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOnNhdmUnLCB0aGlzLm9uTWVtYmVyc2hpcFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignbWVtYmVyc2hpcDpkZWxldGUnLCB0aGlzLm9uTWVtYmVyc2hpcFNhdmUpO1xuICAgIH1cblxuICAgIHRoaXMudmlld1NjaGVtYSA9IGZ1bGNydW0uYXJncy5wZ1NjaGVtYVZpZXdzIHx8IERFRkFVTFRfU0NIRU1BO1xuICAgIHRoaXMuZGF0YVNjaGVtYSA9IGZ1bGNydW0uYXJncy5wZ1NjaGVtYSB8fCBERUZBVUxUX1NDSEVNQTtcblxuICAgIC8vIEZldGNoIGFsbCB0aGUgZXhpc3RpbmcgdGFibGVzIG9uIHN0YXJ0dXAuIFRoaXMgYWxsb3dzIHVzIHRvIHNwZWNpYWwgY2FzZSB0aGVcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XG4gICAgLy8gZXhpc3QsIHdlIGNhbiBwcmV0ZW5kIHRoZSBmb3JtIGlzIHZlcnNpb24gMSBzbyBpdCBjcmVhdGVzIGFsbCBuZXcgdGFibGVzIGluc3RlYWRcbiAgICAvLyBvZiBhcHBseWluZyBhIHNjaGVtYSBkaWZmLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSckeyB0aGlzLmRhdGFTY2hlbWEgfSdgKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG5cbiAgICB0aGlzLnNldHVwT3B0aW9ucygpO1xuXG4gICAgYXdhaXQgdGhpcy5tYXliZUluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGxvZyhzcWwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnBvb2wucXVlcnkoc3FsLCBbXSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzb2x2ZShyZXMucm93cyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cblxuICB0YWJsZU5hbWUgPSAoYWNjb3VudCwgbmFtZSkgPT4ge1xuICAgIGlmICh0aGlzLnVzZUFjY291bnRQcmVmaXgpIHtcbiAgICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICBvblN5bmNTdGFydCA9IGFzeW5jICh7YWNjb3VudCwgdGFza3N9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuICB9XG5cbiAgb25TeW5jRmluaXNoID0gYXN5bmMgKHthY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuY2xlYW51cEZyaWVuZGx5Vmlld3MoYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uRm9ybURlbGV0ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudH0pID0+IHtcbiAgICBjb25zdCBvbGRGb3JtID0ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG51bGwpO1xuICB9XG5cbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUmVjb3JkRGVsZXRlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHJlY29yZC5mb3JtLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvblBob3RvU2F2ZSA9IGFzeW5jICh7cGhvdG8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gIH1cblxuICBvblZpZGVvU2F2ZSA9IGFzeW5jICh7dmlkZW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkF1ZGlvU2F2ZSA9IGFzeW5jICh7YXVkaW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gIH1cblxuICBvblNpZ25hdHVyZVNhdmUgPSBhc3luYyAoe3NpZ25hdHVyZSwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVNpZ25hdHVyZShzaWduYXR1cmUsIGFjY291bnQpO1xuICB9XG5cbiAgb25DaGFuZ2VzZXRTYXZlID0gYXN5bmMgKHtjaGFuZ2VzZXQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hvaWNlTGlzdFNhdmUgPSBhc3luYyAoe2Nob2ljZUxpc3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KGNob2ljZUxpc3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe2NsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQoY2xhc3NpZmljYXRpb25TZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7cHJvamVjdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3QocHJvamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJvbGVTYXZlID0gYXN5bmMgKHtyb2xlLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShyb2xlLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uTWVtYmVyc2hpcFNhdmUgPSBhc3luYyAoe21lbWJlcnNoaXAsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG1lbWJlcnNoaXAsIGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUGhvdG8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnBob3RvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0UGhvdG9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAncGhvdG9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVWaWRlbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAudmlkZW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRWaWRlb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICd2aWRlb3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUF1ZGlvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5hdWRpbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdEF1ZGlvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ2F1ZGlvJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVTaWduYXR1cmUob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnNpZ25hdHVyZShvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFNpZ25hdHVyZVVSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdzaWduYXR1cmVzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaGFuZ2VzZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNoYW5nZXNldChvYmplY3QpLCAnY2hhbmdlc2V0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucHJvamVjdChvYmplY3QpLCAncHJvamVjdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLm1lbWJlcnNoaXAob2JqZWN0KSwgJ21lbWJlcnNoaXBzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yb2xlKG9iamVjdCksICdyb2xlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuZm9ybShvYmplY3QpLCAnZm9ybXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNob2ljZUxpc3Qob2JqZWN0KSwgJ2Nob2ljZV9saXN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCksICdjbGFzc2lmaWNhdGlvbl9zZXRzJyk7XG4gIH1cblxuXG4gIGFzeW5jIHVwZGF0ZU9iamVjdCh2YWx1ZXMsIHRhYmxlKSB7XG4gICAgY29uc3QgZGVsZXRlU3RhdGVtZW50ID0gdGhpcy5wZ2RiLmRlbGV0ZVN0YXRlbWVudChgJHsgdGhpcy5kYXRhU2NoZW1hIH0uc3lzdGVtXyR7dGFibGV9YCwge3Jvd19yZXNvdXJjZV9pZDogdmFsdWVzLnJvd19yZXNvdXJjZV9pZH0pO1xuICAgIGNvbnN0IGluc2VydFN0YXRlbWVudCA9IHRoaXMucGdkYi5pbnNlcnRTdGF0ZW1lbnQoYCR7IHRoaXMuZGF0YVNjaGVtYSB9LnN5c3RlbV8ke3RhYmxlfWAsIHZhbHVlcywge3BrOiAnaWQnfSk7XG5cbiAgICBjb25zdCBzcWwgPSBbIGRlbGV0ZVN0YXRlbWVudC5zcWwsIGluc2VydFN0YXRlbWVudC5zcWwgXS5qb2luKCdcXG4nKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSckeyB0aGlzLmRhdGFTY2hlbWEgfSdgKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIHJlbG9hZFZpZXdMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSckeyB0aGlzLnZpZXdTY2hlbWEgfSdgKTtcbiAgICB0aGlzLnZpZXdOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIGJhc2VNZWRpYVVSTCA9ICgpID0+IHtcbiAgfVxuXG4gIGZvcm1hdFBob3RvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy8keyBpZCB9LmpwZ2A7XG4gIH1cblxuICBmb3JtYXRWaWRlb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3MvJHsgaWQgfS5tcDRgO1xuICB9XG5cbiAgZm9ybWF0QXVkaW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vJHsgaWQgfS5tNGFgO1xuICB9XG5cbiAgZm9ybWF0U2lnbmF0dXJlVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3NpZ25hdHVyZXMvJHsgaWQgfS5wbmdgO1xuICB9XG5cbiAgaW50ZWdyaXR5V2FybmluZyhleCkge1xuICAgIHdhcm4oYFxuLS0tLS0tLS0tLS0tLVxuISEgV0FSTklORyAhIVxuLS0tLS0tLS0tLS0tLVxuXG5Qb3N0Z3JlU1FMIGRhdGFiYXNlIGludGVncml0eSBpc3N1ZSBlbmNvdW50ZXJlZC4gQ29tbW9uIHNvdXJjZXMgb2YgcG9zdGdyZXMgZGF0YWJhc2UgaXNzdWVzIGFyZTpcblxuKiBSZWluc3RhbGxpbmcgRnVsY3J1bSBEZXNrdG9wIGFuZCB1c2luZyBhbiBvbGQgcG9zdGdyZXMgZGF0YWJhc2Ugd2l0aG91dCByZWNyZWF0aW5nXG4gIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZS5cbiogRGVsZXRpbmcgdGhlIGludGVybmFsIGFwcGxpY2F0aW9uIGRhdGFiYXNlIGFuZCB1c2luZyBhbiBleGlzdGluZyBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBNYW51YWxseSBtb2RpZnlpbmcgdGhlIHBvc3RncmVzIGRhdGFiYXNlXG4qIEZvcm0gbmFtZSBhbmQgcmVwZWF0YWJsZSBkYXRhIG5hbWUgY29tYmluYXRpb25zIHRoYXQgZXhjZWVlZCB0aGUgcG9zdGdyZXMgbGltaXQgb2YgNjNcbiAgY2hhcmFjdGVycy4gSXQncyBiZXN0IHRvIGtlZXAgeW91ciBmb3JtIG5hbWVzIHdpdGhpbiB0aGUgbGltaXQuIFRoZSBcImZyaWVuZGx5IHZpZXdcIlxuICBmZWF0dXJlIG9mIHRoZSBwbHVnaW4gZGVyaXZlcyB0aGUgb2JqZWN0IG5hbWVzIGZyb20gdGhlIGZvcm0gYW5kIHJlcGVhdGFibGUgbmFtZXMuXG4qIENyZWF0aW5nIG11bHRpcGxlIGFwcHMgaW4gRnVsY3J1bSB3aXRoIHRoZSBzYW1lIG5hbWUuIFRoaXMgaXMgZ2VuZXJhbGx5IE9LLCBleGNlcHRcbiAgeW91IHdpbGwgbm90IGJlIGFibGUgdG8gdXNlIHRoZSBcImZyaWVuZGx5IHZpZXdcIiBmZWF0dXJlIG9mIHRoZSBwb3N0Z3JlcyBwbHVnaW4gc2luY2VcbiAgdGhlIHZpZXcgbmFtZXMgYXJlIGRlcml2ZWQgZnJvbSB0aGUgZm9ybSBuYW1lcy5cblxuTm90ZTogV2hlbiByZWluc3RhbGxpbmcgRnVsY3J1bSBEZXNrdG9wIG9yIFwic3RhcnRpbmcgb3ZlclwiIHlvdSBuZWVkIHRvIGRyb3AgYW5kIHJlLWNyZWF0ZVxudGhlIHBvc3RncmVzIGRhdGFiYXNlLiBUaGUgbmFtZXMgb2YgZGF0YWJhc2Ugb2JqZWN0cyBhcmUgdGllZCBkaXJlY3RseSB0byB0aGUgZGF0YWJhc2Vcbm9iamVjdHMgaW4gdGhlIGludGVybmFsIGFwcGxpY2F0aW9uIGRhdGFiYXNlLlxuXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblJlcG9ydCBpc3N1ZXMgYXQgaHR0cHM6Ly9naXRodWIuY29tL2Z1bGNydW1hcHAvZnVsY3J1bS1kZXNrdG9wL2lzc3Vlc1xuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5NZXNzYWdlOlxuJHsgZXgubWVzc2FnZSB9XG5cblN0YWNrOlxuJHsgZXguc3RhY2sgfVxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5gLnJlZFxuICAgICk7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5iYXNlTWVkaWFVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly9hcGkuZnVsY3J1bWFwcC5jb20vYXBpL3YyJztcblxuICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zID0ge1xuICAgICAgc2NoZW1hOiB0aGlzLmRhdGFTY2hlbWEsXG5cbiAgICAgIGRpc2FibGVBcnJheXM6IHRoaXMuZGlzYWJsZUFycmF5cyxcblxuICAgICAgZXNjYXBlSWRlbnRpZmllcjogdGhpcy5lc2NhcGVJZGVudGlmaWVyLFxuXG4gICAgICAvLyBwZXJzaXN0ZW50VGFibGVOYW1lczogdGhpcy5wZXJzaXN0ZW50VGFibGVOYW1lcyxcblxuICAgICAgYWNjb3VudFByZWZpeDogdGhpcy51c2VBY2NvdW50UHJlZml4ID8gJ2FjY291bnRfJyArIHRoaXMuYWNjb3VudC5yb3dJRCA6IG51bGwsXG5cbiAgICAgIGNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQ6ICdkYXRlJyxcblxuICAgICAgZGlzYWJsZUNvbXBsZXhUeXBlczogdGhpcy5kaXNhYmxlQ29tcGxleFR5cGVzLFxuXG4gICAgICB2YWx1ZXNUcmFuc2Zvcm1lcjogdGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnZhbHVlc1RyYW5zZm9ybWVyLFxuXG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcblxuICAgICAgICByZXR1cm4gbWVkaWFWYWx1ZS5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRQaG90b1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRWaWRlb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRBdWRpb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zL3ZpZXc/cGhvdG9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQgJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkKHtyZWNvcmQsIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG5cbiAgICBjb25zdCBzeXN0ZW1WYWx1ZXMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5zeXN0ZW1Db2x1bW5WYWx1ZXNGb3JGZWF0dXJlKHJlY29yZCwgbnVsbCwgcmVjb3JkLCB7Li4udGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IGZhbHNlfSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucmVjb3JkKHJlY29yZCwgc3lzdGVtVmFsdWVzKSwgJ3JlY29yZHMnKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG51bGwsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGVycm9yKGV4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0gJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSh7Zm9ybSwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChmb3JtLCBhY2NvdW50KTtcblxuICAgICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcbiAgICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIGRpc2FibGVBcnJheXM6IHRoaXMuZGlzYWJsZUFycmF5cyxcbiAgICAgICAgZGlzYWJsZUNvbXBsZXhUeXBlczogdGhpcy5kaXNhYmxlQ29tcGxleFR5cGVzLFxuICAgICAgICB1c2VyTW9kdWxlOiB0aGlzLnBnQ3VzdG9tTW9kdWxlLFxuICAgICAgICB0YWJsZVNjaGVtYTogdGhpcy5kYXRhU2NoZW1hLFxuICAgICAgICBjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0OiAnZGF0ZScsXG4gICAgICAgIG1ldGFkYXRhOiB0cnVlLFxuICAgICAgICB1c2VSZXNvdXJjZUlEOiBmYWxzZSxcbiAgICAgICAgYWNjb3VudFByZWZpeDogdGhpcy51c2VBY2NvdW50UHJlZml4ID8gJ2FjY291bnRfJyArIHRoaXMuYWNjb3VudC5yb3dJRCA6IG51bGxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCBvcHRpb25zKTtcblxuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5ydW4oWydCRUdJTiBUUkFOU0FDVElPTjsnLFxuICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlbWVudHMsXG4gICAgICAgICAgICAgICAgICAgICAgJ0NPTU1JVCBUUkFOU0FDVElPTjsnXS5qb2luKCdcXG4nKSk7XG5cbiAgICAgIGlmIChuZXdGb3JtKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnRFJPUCBWSUVXIElGIEVYSVNUUyAlcy4lcyBDQVNDQURFOycsIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzOycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMudmlld1NjaGVtYSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybUFuZFNjaGVtYShmb3JtLCByZXBlYXRhYmxlLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucywgJ192aWV3X2Z1bGwnKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICB9XG4gIH1cblxuICBnZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3QgbmFtZSA9IGNvbXBhY3QoW2Zvcm0ubmFtZSwgcmVwZWF0YWJsZSAmJiByZXBlYXRhYmxlLmRhdGFOYW1lXSkuam9pbignIC0gJylcblxuICAgIGNvbnN0IGZvcm1JRCA9IHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMgPyBmb3JtLmlkIDogZm9ybS5yb3dJRDtcblxuICAgIGNvbnN0IHByZWZpeCA9IGNvbXBhY3QoWyd2aWV3JywgZm9ybUlELCByZXBlYXRhYmxlICYmIHJlcGVhdGFibGUua2V5XSkuam9pbignIC0gJyk7XG5cbiAgICBjb25zdCBvYmplY3ROYW1lID0gW3ByZWZpeCwgbmFtZV0uam9pbignIC0gJyk7XG5cbiAgICByZXR1cm4gdGhpcy50cmltSWRlbnRpZmllcihmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgIT09IGZhbHNlID8gc25ha2Uob2JqZWN0TmFtZSkgOiBvYmplY3ROYW1lKTtcbiAgfVxuXG4gIGFzeW5jIGludm9rZUJlZm9yZUZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLmJlZm9yZVN5bmMpIHtcbiAgICAgIGF3YWl0IHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGludm9rZUFmdGVyRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hZnRlclN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIGNsZWFudXBGcmllbmRseVZpZXdzKGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFZpZXdMaXN0KCk7XG5cbiAgICBjb25zdCBhY3RpdmVWaWV3TmFtZXMgPSBbXTtcblxuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBhY3RpdmVWaWV3TmFtZXMucHVzaCh0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIG51bGwpKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhY3RpdmVWaWV3TmFtZXMucHVzaCh0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZW1vdmUgPSBkaWZmZXJlbmNlKHRoaXMudmlld05hbWVzLCBhY3RpdmVWaWV3TmFtZXMpO1xuXG4gICAgZm9yIChjb25zdCB2aWV3TmFtZSBvZiByZW1vdmUpIHtcbiAgICAgIGlmICh2aWV3TmFtZS5pbmRleE9mKCd2aWV3XycpID09PSAwIHx8IHZpZXdOYW1lLmluZGV4T2YoJ3ZpZXcgLSAnKSA9PT0gMCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnRFJPUCBWSUVXIElGIEVYSVNUUyAlcy4lczsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cblxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BTeXN0ZW1UYWJsZXMoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHRlbXBsYXRlRHJvcCkpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBEYXRhYmFzZSgpIHtcbiAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQodmVyc2lvbjAwMSkpO1xuICB9XG5cbiAgcHJlcGFyZU1pZ3JhdGlvblNjcmlwdChzcWwpIHtcbiAgICByZXR1cm4gc3FsLnJlcGxhY2UoL19fU0NIRU1BX18vZywgdGhpcy5kYXRhU2NoZW1hKVxuICAgICAgICAgICAgICAucmVwbGFjZSgvX19WSUVXX1NDSEVNQV9fL2csIHRoaXMudmlld1NjaGVtYSk7XG4gIH1cblxuICBhc3luYyBzZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KSB7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkKTtcbiAgICB9O1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFBob3RvKHt9LCBhc3luYyAocGhvdG8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Bob3RvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoVmlkZW8oe30sIGFzeW5jICh2aWRlbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnVmlkZW9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hBdWRpbyh7fSwgYXN5bmMgKGF1ZGlvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdBdWRpbycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoU2lnbmF0dXJlKHt9LCBhc3luYyAoc2lnbmF0dXJlLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdTaWduYXR1cmVzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVNpZ25hdHVyZShzaWduYXR1cmUsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENoYW5nZXNldCh7fSwgYXN5bmMgKGNoYW5nZXNldCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hhbmdlc2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hSb2xlKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdSb2xlcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUHJvamVjdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUHJvamVjdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEZvcm0oe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Zvcm1zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hNZW1iZXJzaGlwKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdNZW1iZXJzaGlwcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hvaWNlTGlzdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hvaWNlIExpc3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2xhc3NpZmljYXRpb24gU2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVJbml0aWFsaXplKCkge1xuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmICh0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZignbWlncmF0aW9ucycpID09PSAtMSkge1xuICAgICAgbG9nKCdJbml0aXRhbGl6aW5nIGRhdGFiYXNlLi4uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb25zKGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVSdW5NaWdyYXRpb25zKGFjY291bnQpIHtcbiAgICB0aGlzLm1pZ3JhdGlvbnMgPSAoYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCBuYW1lIEZST00gJHsgdGhpcy5kYXRhU2NoZW1hIH0ubWlncmF0aW9uc2ApKS5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgbGV0IHBvcHVsYXRlUmVjb3JkcyA9IGZhbHNlO1xuXG4gICAgZm9yIChsZXQgY291bnQgPSAyOyBjb3VudCA8PSBDVVJSRU5UX1ZFUlNJT047ICsrY291bnQpIHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSBwYWRTdGFydChjb3VudCwgMywgJzAnKTtcblxuICAgICAgY29uc3QgbmVlZHNNaWdyYXRpb24gPSB0aGlzLm1pZ3JhdGlvbnMuaW5kZXhPZih2ZXJzaW9uKSA9PT0gLTEgJiYgTUlHUkFUSU9OU1t2ZXJzaW9uXTtcblxuICAgICAgaWYgKG5lZWRzTWlncmF0aW9uKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdChNSUdSQVRJT05TW3ZlcnNpb25dKSk7XG5cbiAgICAgICAgaWYgKHZlcnNpb24gPT09ICcwMDInKSB7XG4gICAgICAgICAgbG9nKCdQb3B1bGF0aW5nIHN5c3RlbSB0YWJsZXMuLi4nKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICAgIHBvcHVsYXRlUmVjb3JkcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmVyc2lvbiA9PT0gJzAwNScpIHtcbiAgICAgICAgICBsb2coJ01pZ3JhdGluZyBkYXRlIGNhbGN1bGF0aW9uIGZpZWxkcy4uLicpO1xuICAgICAgICAgIGF3YWl0IHRoaXMubWlncmF0ZUNhbGN1bGF0ZWRGaWVsZHNEYXRlRm9ybWF0KGFjY291bnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvcHVsYXRlUmVjb3Jkcykge1xuICAgICAgYXdhaXQgdGhpcy5wb3B1bGF0ZVJlY29yZHMoYWNjb3VudCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcG9wdWxhdGVSZWNvcmRzKGFjY291bnQpIHtcbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgIGluZGV4ID0gMDtcblxuICAgICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMucHJvZ3Jlc3MoZm9ybS5uYW1lLCBpbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIGZhbHNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG1pZ3JhdGVDYWxjdWxhdGVkRmllbGRzRGF0ZUZvcm1hdChhY2NvdW50KSB7XG4gICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgIGNvbnN0IGZpZWxkcyA9IGZvcm0uZWxlbWVudHNPZlR5cGUoJ0NhbGN1bGF0ZWRGaWVsZCcpLmZpbHRlcihlbGVtZW50ID0+IGVsZW1lbnQuZGlzcGxheS5pc0RhdGUpO1xuXG4gICAgICBpZiAoZmllbGRzLmxlbmd0aCkge1xuICAgICAgICBsb2coJ01pZ3JhdGluZyBkYXRlIGNhbGN1bGF0aW9uIGZpZWxkcyBpbiBmb3JtLi4uJywgZm9ybS5uYW1lKTtcblxuICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsICgpID0+IHt9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgIHRoaXMudXBkYXRlU3RhdHVzKG5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkKTtcbiAgfVxufVxuIl19