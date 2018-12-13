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

var _version13 = require('./version-007.sql');

var _version14 = _interopRequireDefault(_version13);

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
  '006': _version12.default,
  '007': _version14.default
};

const CURRENT_VERSION = 7;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiQ1VSUkVOVF9WRVJTSU9OIiwiREVGQVVMVF9TQ0hFTUEiLCJsb2ciLCJ3YXJuIiwiZXJyb3IiLCJmdWxjcnVtIiwibG9nZ2VyIiwid2l0aENvbnRleHQiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhcmdzIiwicGdEcm9wIiwiZHJvcFN5c3RlbVRhYmxlcyIsInBnU2V0dXAiLCJzZXR1cERhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsInBnU3lzdGVtVGFibGVzT25seSIsInNldHVwU3lzdGVtVGFibGVzIiwiaW52b2tlQmVmb3JlRnVuY3Rpb24iLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJwZ0Zvcm0iLCJpZCIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVzY2FwZUlkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicGdkYiIsImlkZW50IiwidHJpbUlkZW50aWZpZXIiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJ1c2VBY2NvdW50UHJlZml4Iiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwiY2xlYW51cEZyaWVuZGx5Vmlld3MiLCJvbkZvcm1TYXZlIiwib2xkRm9ybSIsIm5ld0Zvcm0iLCJ1cGRhdGVGb3JtIiwib25Gb3JtRGVsZXRlIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvblNpZ25hdHVyZVNhdmUiLCJzaWduYXR1cmUiLCJ1cGRhdGVTaWduYXR1cmUiLCJvbkNoYW5nZXNldFNhdmUiLCJjaGFuZ2VzZXQiLCJ1cGRhdGVDaGFuZ2VzZXQiLCJvbkNob2ljZUxpc3RTYXZlIiwiY2hvaWNlTGlzdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsImNsYXNzaWZpY2F0aW9uU2V0IiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwicHJvamVjdCIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwicm9sZSIsInVwZGF0ZVJvbGUiLCJvbk1lbWJlcnNoaXBTYXZlIiwibWVtYmVyc2hpcCIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJkYXRhU2NoZW1hIiwidGFibGVOYW1lcyIsInJlbG9hZFZpZXdMaXN0Iiwidmlld1NjaGVtYSIsInZpZXdOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsImZvcm1hdFNpZ25hdHVyZVVSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwic3lzdGVtVmFsdWVzIiwic3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJvcHRpb25zIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJ0YWJsZVNjaGVtYSIsImNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQiLCJtZXRhZGF0YSIsInVzZVJlc291cmNlSUQiLCJhY2NvdW50UHJlZml4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImludGVncml0eVdhcm5pbmciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInByb2dyZXNzIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU2NoZW1hVmlld3MiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwicGdBcnJheXMiLCJwZ1ByZWZpeCIsInBnU2ltcGxlVHlwZXMiLCJoYW5kbGVyIiwic3Vic3RyaW5nIiwidXNlU3luY0V2ZW50cyIsInVzZXIiLCJwYXNzd29yZCIsInJlcXVpcmUiLCJhcHAiLCJQb29sIiwib24iLCJzZXR1cE9wdGlvbnMiLCJtYXliZUluaXRpYWxpemUiLCJkZWFjdGl2YXRlIiwiZW5kIiwib2JqZWN0IiwidmFsdWVzIiwiZmlsZSIsImFjY2Vzc19rZXkiLCJ0YWJsZSIsImRlbGV0ZVN0YXRlbWVudCIsInJvd19yZXNvdXJjZV9pZCIsImluc2VydFN0YXRlbWVudCIsInBrIiwic3RhY2siLCJzY2hlbWEiLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybUFuZFNjaGVtYSIsImRhdGFOYW1lIiwiZm9ybUlEIiwicGVyc2lzdGVudFRhYmxlTmFtZXMiLCJwcmVmaXgiLCJrZXkiLCJvYmplY3ROYW1lIiwiYmVmb3JlU3luYyIsImFmdGVyU3luYyIsImZpbmRFYWNoUmVjb3JkIiwiYWN0aXZlVmlld05hbWVzIiwicHVzaCIsInJlbW92ZSIsInByZXBhcmVNaWdyYXRpb25TY3JpcHQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaFNpZ25hdHVyZSIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hQcm9qZWN0IiwiZmluZEVhY2hGb3JtIiwiZmluZEVhY2hNZW1iZXJzaGlwIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCIsIm1heWJlUnVuTWlncmF0aW9ucyIsIm1pZ3JhdGlvbnMiLCJwb3B1bGF0ZVJlY29yZHMiLCJjb3VudCIsInZlcnNpb24iLCJuZWVkc01pZ3JhdGlvbiIsIm1pZ3JhdGVDYWxjdWxhdGVkRmllbGRzRGF0ZUZvcm1hdCIsImZpZWxkcyIsImZpbHRlciIsImRpc3BsYXkiLCJpc0RhdGUiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztJQUlZQSxHOztBQUhaOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7O0FBRUEsTUFBTUMsd0JBQXdCLEVBQTlCOztBQUVBLE1BQU1DLGtCQUFrQjtBQUN0QkMsWUFBVSxZQURZO0FBRXRCQyxRQUFNLFdBRmdCO0FBR3RCQyxRQUFNLElBSGdCO0FBSXRCQyxPQUFLLEVBSmlCO0FBS3RCQyxxQkFBbUI7QUFMRyxDQUF4Qjs7QUFRQSxNQUFNQyxhQUFhO0FBQ2pCLDBCQURpQjtBQUVqQiwwQkFGaUI7QUFHakIsMEJBSGlCO0FBSWpCLDJCQUppQjtBQUtqQiwyQkFMaUI7QUFNakI7QUFOaUIsQ0FBbkI7O0FBU0EsTUFBTUMsa0JBQWtCLENBQXhCOztBQUVBLE1BQU1DLGlCQUFpQixRQUF2Qjs7QUFFQSxNQUFNLEVBQUVDLEdBQUYsRUFBT0MsSUFBUCxFQUFhQyxLQUFiLEtBQXVCQyxRQUFRQyxNQUFSLENBQWVDLFdBQWYsQ0FBMkIsVUFBM0IsQ0FBN0I7O2tCQUVlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBa0luQkMsVUFsSW1CLHFCQWtJTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFVBQUlKLFFBQVFLLElBQVIsQ0FBYUMsTUFBakIsRUFBeUI7QUFDdkIsY0FBTSxNQUFLQyxnQkFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxVQUFJUCxRQUFRSyxJQUFSLENBQWFHLE9BQWpCLEVBQTBCO0FBQ3hCLGNBQU0sTUFBS0MsYUFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxZQUFNQyxVQUFVLE1B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RUEsV0FBSyxNQUFNTixJQUFYLElBQW1CRixLQUFuQixFQUEwQjtBQUN4QlEsZ0JBQVEsQ0FBUjs7QUFFQSxjQUFNTixLQUFLaU4sY0FBTCxDQUFvQixFQUFwQjtBQUFBLHlDQUF3QixXQUFPakssTUFBUCxFQUFrQjtBQUM5Q0EsbUJBQU9oRCxJQUFQLEdBQWNBLElBQWQ7O0FBRUEsZ0JBQUksRUFBRU0sS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEIsc0JBQUtpSSxRQUFMLENBQWN2SSxLQUFLUSxJQUFuQixFQUF5QkYsS0FBekI7QUFDRDs7QUFFRCxrQkFBTSxRQUFLMkMsWUFBTCxDQUFrQkQsTUFBbEIsRUFBMEJ4RCxPQUExQixFQUFtQyxLQUFuQyxDQUFOO0FBQ0QsV0FSSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFOO0FBU0Q7QUFqQjRCO0FBa0I5Qjs7QUFFSytPLG1DQUFOLENBQXdDL08sT0FBeEMsRUFBaUQ7QUFBQTs7QUFBQTtBQUMvQyxZQUFNTSxRQUFRLE1BQU1OLFFBQVFPLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsV0FBSyxNQUFNQyxJQUFYLElBQW1CRixLQUFuQixFQUEwQjtBQUN4QixjQUFNME8sU0FBU3hPLEtBQUs2SCxjQUFMLENBQW9CLGlCQUFwQixFQUF1QzRHLE1BQXZDLENBQThDO0FBQUEsaUJBQVc1QyxRQUFRNkMsT0FBUixDQUFnQkMsTUFBM0I7QUFBQSxTQUE5QyxDQUFmOztBQUVBLFlBQUlILE9BQU9JLE1BQVgsRUFBbUI7QUFDakJqUSxjQUFJLDhDQUFKLEVBQW9EcUIsS0FBS1EsSUFBekQ7O0FBRUEsZ0JBQU0sUUFBS0gsV0FBTCxDQUFpQkwsSUFBakIsRUFBdUJSLE9BQXZCLEVBQWdDLFlBQU0sQ0FBRSxDQUF4QyxDQUFOO0FBQ0Q7QUFDRjtBQVg4QztBQVloRDs7QUE1OUJrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCBzbmFrZSBmcm9tICdzbmFrZS1jYXNlJztcbmltcG9ydCB0ZW1wbGF0ZURyb3AgZnJvbSAnLi90ZW1wbGF0ZS5kcm9wLnNxbCc7XG5pbXBvcnQgU2NoZW1hTWFwIGZyb20gJy4vc2NoZW1hLW1hcCc7XG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnZnVsY3J1bSc7XG5pbXBvcnQgeyBjb21wYWN0LCBkaWZmZXJlbmNlLCBwYWRTdGFydCB9IGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCB2ZXJzaW9uMDAxIGZyb20gJy4vdmVyc2lvbi0wMDEuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAyIGZyb20gJy4vdmVyc2lvbi0wMDIuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAzIGZyb20gJy4vdmVyc2lvbi0wMDMuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA0IGZyb20gJy4vdmVyc2lvbi0wMDQuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA1IGZyb20gJy4vdmVyc2lvbi0wMDUuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA2IGZyb20gJy4vdmVyc2lvbi0wMDYuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA3IGZyb20gJy4vdmVyc2lvbi0wMDcuc3FsJztcblxuY29uc3QgTUFYX0lERU5USUZJRVJfTEVOR1RIID0gNjM7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuY29uc3QgTUlHUkFUSU9OUyA9IHtcbiAgJzAwMic6IHZlcnNpb24wMDIsXG4gICcwMDMnOiB2ZXJzaW9uMDAzLFxuICAnMDA0JzogdmVyc2lvbjAwNCxcbiAgJzAwNSc6IHZlcnNpb24wMDUsXG4gICcwMDYnOiB2ZXJzaW9uMDA2LFxuICAnMDA3JzogdmVyc2lvbjAwN1xufTtcblxuY29uc3QgQ1VSUkVOVF9WRVJTSU9OID0gNztcblxuY29uc3QgREVGQVVMVF9TQ0hFTUEgPSAncHVibGljJztcblxuY29uc3QgeyBsb2csIHdhcm4sIGVycm9yIH0gPSBmdWxjcnVtLmxvZ2dlci53aXRoQ29udGV4dCgncG9zdGdyZXMnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ0RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnSG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ1BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIHBnVXNlcjoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHVzZXInLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUGFzc3dvcmQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBwYXNzd29yZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWE6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hVmlld3M6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEgZm9yIHRoZSBmcmllbmRseSB2aWV3cycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeW5jRXZlbnRzOiB7XG4gICAgICAgICAgZGVzYzogJ2FkZCBzeW5jIGV2ZW50IGhvb2tzJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ0JlZm9yZUZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnQWZ0ZXJGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdGb3JtOiB7XG4gICAgICAgICAgZGVzYzogJ3RoZSBmb3JtIElEIHRvIHJlYnVpbGQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVwb3J0QmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdyZXBvcnQgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnTWVkaWFCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ21lZGlhIFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1VuZGVyc2NvcmVOYW1lczoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdW5kZXJzY29yZSBuYW1lcyAoZS5nLiBcIlBhcmsgSW5zcGVjdGlvbnNcIiBiZWNvbWVzIFwicGFya19pbnNwZWN0aW9uc1wiKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQ3VzdG9tTW9kdWxlOiB7XG4gICAgICAgICAgZGVzYzogJ2EgY3VzdG9tIG1vZHVsZSB0byBsb2FkIHdpdGggc3luYyBleHRlbnNpb25zJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTZXR1cDoge1xuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgfSxcbiAgICAgICAgcGdEcm9wOiB7XG4gICAgICAgICAgZGVzYzogJ2Ryb3AgdGhlIHN5c3RlbSB0YWJsZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdBcnJheXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIGFycmF5IHR5cGVzIGZvciBtdWx0aS12YWx1ZSBmaWVsZHMgbGlrZSBjaG9pY2UgZmllbGRzLCBjbGFzc2lmaWNhdGlvbiBmaWVsZHMgYW5kIG1lZGlhIGZpZWxkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIC8vIHBnUGVyc2lzdGVudFRhYmxlTmFtZXM6IHtcbiAgICAgICAgLy8gICBkZXNjOiAndXNlIHRoZSBzZXJ2ZXIgaWQgaW4gdGhlIGZvcm0gdGFibGUgbmFtZXMnLFxuICAgICAgICAvLyAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgLy8gICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIC8vICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgLy8gfSxcbiAgICAgICAgcGdQcmVmaXg6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHRoZSBvcmdhbml6YXRpb24gYXMgYSBwcmVmaXggaW4gdGhlIG9iamVjdCBuYW1lcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2ltcGxlVHlwZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHNpbXBsZSB0eXBlcyBpbiB0aGUgZGF0YWJhc2UgdGhhdCBhcmUgbW9yZSBjb21wYXRpYmxlIHdpdGggb3RoZXIgYXBwbGljYXRpb25zIChubyB0c3ZlY3RvciwgZ2VvbWV0cnksIGFycmF5cyknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeXN0ZW1UYWJsZXNPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgY3JlYXRlIHRoZSBzeXN0ZW0gcmVjb3JkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdEcm9wKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BTeXN0ZW1UYWJsZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2V0dXApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU3lzdGVtVGFibGVzT25seSkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRm9ybSAmJiBmb3JtLmlkICE9PSBmdWxjcnVtLmFyZ3MucGdGb3JtKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvZygnJyk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIHRyaW1JZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgICByZXR1cm4gaWRlbnRpZmllci5zdWJzdHJpbmcoMCwgTUFYX0lERU5USUZJRVJfTEVOR1RIKTtcbiAgfVxuXG4gIGVzY2FwZUlkZW50aWZpZXIgPSAoaWRlbnRpZmllcikgPT4ge1xuICAgIHJldHVybiBpZGVudGlmaWVyICYmIHRoaXMucGdkYi5pZGVudCh0aGlzLnRyaW1JZGVudGlmaWVyKGlkZW50aWZpZXIpKTtcbiAgfVxuXG4gIGdldCB1c2VTeW5jRXZlbnRzKCkge1xuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzIDogdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIHRoaXMuYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLlBPU1RHUkVTX0NPTkZJRyxcbiAgICAgIGhvc3Q6IGZ1bGNydW0uYXJncy5wZ0hvc3QgfHwgUE9TVEdSRVNfQ09ORklHLmhvc3QsXG4gICAgICBwb3J0OiBmdWxjcnVtLmFyZ3MucGdQb3J0IHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ0RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZSxcbiAgICAgIHVzZXI6IGZ1bGNydW0uYXJncy5wZ1VzZXIgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXIsXG4gICAgICBwYXNzd29yZDogZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXJcbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1VzZXIpIHtcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5wZ1VzZXI7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkKSB7XG4gICAgICBvcHRpb25zLnBhc3N3b3JkID0gZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSkge1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZSA9IHJlcXVpcmUoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKTtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUuYXBpID0gYXBpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcHAgPSBmdWxjcnVtO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTaW1wbGVUeXBlcyA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5kaXNhYmxlQ29tcGxleFR5cGVzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBpZiAoZnVsY3J1bS5hcmdzLnBnUGVyc2lzdGVudFRhYmxlTmFtZXMgPT09IHRydWUpIHtcbiAgICAgIC8vIHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMgPSB0cnVlO1xuICAgIC8vIH1cblxuICAgIHRoaXMudXNlQWNjb3VudFByZWZpeCA9IChmdWxjcnVtLmFyZ3MucGdQcmVmaXggIT09IGZhbHNlKTtcblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdzaWduYXR1cmU6c2F2ZScsIHRoaXMub25TaWduYXR1cmVTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2NoYW5nZXNldDpzYXZlJywgdGhpcy5vbkNoYW5nZXNldFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOnNhdmUnLCB0aGlzLm9uUmVjb3JkU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6ZGVsZXRlJywgdGhpcy5vblJlY29yZERlbGV0ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OnNhdmUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2hvaWNlLWxpc3Q6ZGVsZXRlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignZm9ybTpzYXZlJywgdGhpcy5vbkZvcm1TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06ZGVsZXRlJywgdGhpcy5vbkZvcm1TYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb24tc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpkZWxldGUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbigncm9sZTpzYXZlJywgdGhpcy5vblJvbGVTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6ZGVsZXRlJywgdGhpcy5vblJvbGVTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbigncHJvamVjdDpzYXZlJywgdGhpcy5vblByb2plY3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6ZGVsZXRlJywgdGhpcy5vblByb2plY3RTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignbWVtYmVyc2hpcDpzYXZlJywgdGhpcy5vbk1lbWJlcnNoaXBTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6ZGVsZXRlJywgdGhpcy5vbk1lbWJlcnNoaXBTYXZlKTtcbiAgICB9XG5cbiAgICB0aGlzLnZpZXdTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWFWaWV3cyB8fCBERUZBVUxUX1NDSEVNQTtcbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWEgfHwgREVGQVVMVF9TQ0hFTUE7XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuXG4gICAgdGhpcy5zZXR1cE9wdGlvbnMoKTtcblxuICAgIGF3YWl0IHRoaXMubWF5YmVJbml0aWFsaXplKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBsb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICBpZiAodGhpcy51c2VBY2NvdW50UHJlZml4KSB7XG4gICAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICAgIH1cblxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLmNsZWFudXBGcmllbmRseVZpZXdzKGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvbkZvcm1EZWxldGUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnR9KSA9PiB7XG4gICAgY29uc3Qgb2xkRm9ybSA9IHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBudWxsKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25QaG90b1NhdmUgPSBhc3luYyAoe3Bob3RvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICB9XG5cbiAgb25WaWRlb1NhdmUgPSBhc3luYyAoe3ZpZGVvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25BdWRpb1NhdmUgPSBhc3luYyAoe2F1ZGlvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25TaWduYXR1cmVTYXZlID0gYXN5bmMgKHtzaWduYXR1cmUsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVTaWduYXR1cmUoc2lnbmF0dXJlLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hhbmdlc2V0U2F2ZSA9IGFzeW5jICh7Y2hhbmdlc2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtjaG9pY2VMaXN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChjaG9pY2VMaXN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2xhc3NpZmljYXRpb25TZXRTYXZlID0gYXN5bmMgKHtjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KGNsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe3Byb2plY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KHByb2plY3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25Sb2xlU2F2ZSA9IGFzeW5jICh7cm9sZSwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUocm9sZSwgYWNjb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHttZW1iZXJzaGlwLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChtZW1iZXJzaGlwLCBhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVBob3RvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5waG90byhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFBob3RvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3Bob3RvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlVmlkZW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnZpZGVvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0VmlkZW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAndmlkZW9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVBdWRpbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAuYXVkaW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRBdWRpb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdhdWRpbycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlU2lnbmF0dXJlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5zaWduYXR1cmUob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRTaWduYXR1cmVVUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnc2lnbmF0dXJlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hhbmdlc2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaGFuZ2VzZXQob2JqZWN0KSwgJ2NoYW5nZXNldHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnByb2plY3Qob2JqZWN0KSwgJ3Byb2plY3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5tZW1iZXJzaGlwKG9iamVjdCksICdtZW1iZXJzaGlwcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucm9sZShvYmplY3QpLCAncm9sZXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmZvcm0ob2JqZWN0KSwgJ2Zvcm1zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaG9pY2VMaXN0KG9iamVjdCksICdjaG9pY2VfbGlzdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jbGFzc2lmaWNhdGlvblNldChvYmplY3QpLCAnY2xhc3NpZmljYXRpb25fc2V0cycpO1xuICB9XG5cblxuICBhc3luYyB1cGRhdGVPYmplY3QodmFsdWVzLCB0YWJsZSkge1xuICAgIGNvbnN0IGRlbGV0ZVN0YXRlbWVudCA9IHRoaXMucGdkYi5kZWxldGVTdGF0ZW1lbnQoYCR7IHRoaXMuZGF0YVNjaGVtYSB9LnN5c3RlbV8ke3RhYmxlfWAsIHtyb3dfcmVzb3VyY2VfaWQ6IHZhbHVlcy5yb3dfcmVzb3VyY2VfaWR9KTtcbiAgICBjb25zdCBpbnNlcnRTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuaW5zZXJ0U3RhdGVtZW50KGAkeyB0aGlzLmRhdGFTY2hlbWEgfS5zeXN0ZW1fJHt0YWJsZX1gLCB2YWx1ZXMsIHtwazogJ2lkJ30pO1xuXG4gICAgY29uc3Qgc3FsID0gWyBkZWxldGVTdGF0ZW1lbnQuc3FsLCBpbnNlcnRTdGF0ZW1lbnQuc3FsIF0uam9pbignXFxuJyk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICByZWxvYWRWaWV3TGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy52aWV3U2NoZW1hIH0nYCk7XG4gICAgdGhpcy52aWV3TmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBiYXNlTWVkaWFVUkwgPSAoKSA9PiB7XG4gIH1cblxuICBmb3JtYXRQaG90b1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3MvJHsgaWQgfS5qcGdgO1xuICB9XG5cbiAgZm9ybWF0VmlkZW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zLyR7IGlkIH0ubXA0YDtcbiAgfVxuXG4gIGZvcm1hdEF1ZGlvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvLyR7IGlkIH0ubTRhYDtcbiAgfVxuXG4gIGZvcm1hdFNpZ25hdHVyZVVSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9zaWduYXR1cmVzLyR7IGlkIH0ucG5nYDtcbiAgfVxuXG4gIGludGVncml0eVdhcm5pbmcoZXgpIHtcbiAgICB3YXJuKGBcbi0tLS0tLS0tLS0tLS1cbiEhIFdBUk5JTkcgISFcbi0tLS0tLS0tLS0tLS1cblxuUG9zdGdyZVNRTCBkYXRhYmFzZSBpbnRlZ3JpdHkgaXNzdWUgZW5jb3VudGVyZWQuIENvbW1vbiBzb3VyY2VzIG9mIHBvc3RncmVzIGRhdGFiYXNlIGlzc3VlcyBhcmU6XG5cbiogUmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBhbmQgdXNpbmcgYW4gb2xkIHBvc3RncmVzIGRhdGFiYXNlIHdpdGhvdXQgcmVjcmVhdGluZ1xuICB0aGUgcG9zdGdyZXMgZGF0YWJhc2UuXG4qIERlbGV0aW5nIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZSBhbmQgdXNpbmcgYW4gZXhpc3RpbmcgcG9zdGdyZXMgZGF0YWJhc2VcbiogTWFudWFsbHkgbW9kaWZ5aW5nIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBGb3JtIG5hbWUgYW5kIHJlcGVhdGFibGUgZGF0YSBuYW1lIGNvbWJpbmF0aW9ucyB0aGF0IGV4Y2VlZWQgdGhlIHBvc3RncmVzIGxpbWl0IG9mIDYzXG4gIGNoYXJhY3RlcnMuIEl0J3MgYmVzdCB0byBrZWVwIHlvdXIgZm9ybSBuYW1lcyB3aXRoaW4gdGhlIGxpbWl0LiBUaGUgXCJmcmllbmRseSB2aWV3XCJcbiAgZmVhdHVyZSBvZiB0aGUgcGx1Z2luIGRlcml2ZXMgdGhlIG9iamVjdCBuYW1lcyBmcm9tIHRoZSBmb3JtIGFuZCByZXBlYXRhYmxlIG5hbWVzLlxuKiBDcmVhdGluZyBtdWx0aXBsZSBhcHBzIGluIEZ1bGNydW0gd2l0aCB0aGUgc2FtZSBuYW1lLiBUaGlzIGlzIGdlbmVyYWxseSBPSywgZXhjZXB0XG4gIHlvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIHVzZSB0aGUgXCJmcmllbmRseSB2aWV3XCIgZmVhdHVyZSBvZiB0aGUgcG9zdGdyZXMgcGx1Z2luIHNpbmNlXG4gIHRoZSB2aWV3IG5hbWVzIGFyZSBkZXJpdmVkIGZyb20gdGhlIGZvcm0gbmFtZXMuXG5cbk5vdGU6IFdoZW4gcmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBvciBcInN0YXJ0aW5nIG92ZXJcIiB5b3UgbmVlZCB0byBkcm9wIGFuZCByZS1jcmVhdGVcbnRoZSBwb3N0Z3JlcyBkYXRhYmFzZS4gVGhlIG5hbWVzIG9mIGRhdGFiYXNlIG9iamVjdHMgYXJlIHRpZWQgZGlyZWN0bHkgdG8gdGhlIGRhdGFiYXNlXG5vYmplY3RzIGluIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZS5cblxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5SZXBvcnQgaXNzdWVzIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9mdWxjcnVtYXBwL2Z1bGNydW0tZGVza3RvcC9pc3N1ZXNcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuTWVzc2FnZTpcbiR7IGV4Lm1lc3NhZ2UgfVxuXG5TdGFjazpcbiR7IGV4LnN0YWNrIH1cbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuYC5yZWRcbiAgICApO1xuICB9XG5cbiAgc2V0dXBPcHRpb25zKCkge1xuICAgIHRoaXMuYmFzZU1lZGlhVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyA9IHtcbiAgICAgIHNjaGVtYTogdGhpcy5kYXRhU2NoZW1hLFxuXG4gICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG5cbiAgICAgIGVzY2FwZUlkZW50aWZpZXI6IHRoaXMuZXNjYXBlSWRlbnRpZmllcixcblxuICAgICAgLy8gcGVyc2lzdGVudFRhYmxlTmFtZXM6IHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMsXG5cbiAgICAgIGFjY291bnRQcmVmaXg6IHRoaXMudXNlQWNjb3VudFByZWZpeCA/ICdhY2NvdW50XycgKyB0aGlzLmFjY291bnQucm93SUQgOiBudWxsLFxuXG4gICAgICBjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0OiAnZGF0ZScsXG5cbiAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyxcblxuICAgICAgdmFsdWVzVHJhbnNmb3JtZXI6IHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS52YWx1ZXNUcmFuc2Zvcm1lcixcblxuICAgICAgbWVkaWFVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0UGhvdG9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0VmlkZW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0QXVkaW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBtZWRpYVZpZXdVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkcyA9IG1lZGlhVmFsdWUuaXRlbXMubWFwKG8gPT4gby5tZWRpYUlEKTtcblxuICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy92aWV3P3Bob3Rvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy92aWV3P3ZpZGVvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvL3ZpZXc/YXVkaW89JHsgaWRzIH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsKSB7XG4gICAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIgPSAoZmVhdHVyZSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7IGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwgfS9yZXBvcnRzLyR7IGZlYXR1cmUuaWQgfS5wZGZgO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCh7cmVjb3JkLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMudXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuXG4gICAgY29uc3Qgc3lzdGVtVmFsdWVzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShyZWNvcmQsIG51bGwsIHJlY29yZCwgey4uLnRoaXMucmVjb3JkVmFsdWVPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlQ29tcGxleFR5cGVzOiBmYWxzZX0pO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJlY29yZChyZWNvcmQsIHN5c3RlbVZhbHVlcyksICdyZWNvcmRzJyk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBudWxsLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucykpICE9PSAtMTtcbiAgfVxuXG4gIHJlY3JlYXRlRm9ybVRhYmxlcyA9IGFzeW5jIChmb3JtLCBhY2NvdW50KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBlcnJvcihleCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG51bGwsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSkpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0oe2Zvcm0sIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3QoZm9ybSwgYWNjb3VudCk7XG5cbiAgICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG4gICAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyxcbiAgICAgICAgdXNlck1vZHVsZTogdGhpcy5wZ0N1c3RvbU1vZHVsZSxcbiAgICAgICAgdGFibGVTY2hlbWE6IHRoaXMuZGF0YVNjaGVtYSxcbiAgICAgICAgY2FsY3VsYXRlZEZpZWxkRGF0ZUZvcm1hdDogJ2RhdGUnLFxuICAgICAgICBtZXRhZGF0YTogdHJ1ZSxcbiAgICAgICAgdXNlUmVzb3VyY2VJRDogZmFsc2UsXG4gICAgICAgIGFjY291bnRQcmVmaXg6IHRoaXMudXNlQWNjb3VudFByZWZpeCA/ICdhY2NvdW50XycgKyB0aGlzLmFjY291bnQucm93SUQgOiBudWxsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwgb3B0aW9ucyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKFsnQkVHSU4gVFJBTlNBQ1RJT047JyxcbiAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICdDT01NSVQgVFJBTlNBQ1RJT047J10uam9pbignXFxuJykpO1xuXG4gICAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXMgQ0FTQ0FERTsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlczsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm1BbmRTY2hlbWEoZm9ybSwgcmVwZWF0YWJsZSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMsICdfdmlld19mdWxsJykpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IG5hbWUgPSBjb21wYWN0KFtmb3JtLm5hbWUsIHJlcGVhdGFibGUgJiYgcmVwZWF0YWJsZS5kYXRhTmFtZV0pLmpvaW4oJyAtICcpXG5cbiAgICBjb25zdCBmb3JtSUQgPSB0aGlzLnBlcnNpc3RlbnRUYWJsZU5hbWVzID8gZm9ybS5pZCA6IGZvcm0ucm93SUQ7XG5cbiAgICBjb25zdCBwcmVmaXggPSBjb21wYWN0KFsndmlldycsIGZvcm1JRCwgcmVwZWF0YWJsZSAmJiByZXBlYXRhYmxlLmtleV0pLmpvaW4oJyAtICcpO1xuXG4gICAgY29uc3Qgb2JqZWN0TmFtZSA9IFtwcmVmaXgsIG5hbWVdLmpvaW4oJyAtICcpO1xuXG4gICAgcmV0dXJuIHRoaXMudHJpbUlkZW50aWZpZXIoZnVsY3J1bS5hcmdzLnBnVW5kZXJzY29yZU5hbWVzICE9PSBmYWxzZSA/IHNuYWtlKG9iamVjdE5hbWUpIDogb2JqZWN0TmFtZSk7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmJlZm9yZVN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hZnRlclN5bmMpIHtcbiAgICAgIGF3YWl0IHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcbiAgICBhd2FpdCB0aGlzLnJlY3JlYXRlRm9ybVRhYmxlcyhmb3JtLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFRhYmxlTGlzdCgpO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcyhpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBwcm9ncmVzcyhpbmRleCk7XG4gIH1cblxuICBhc3luYyBjbGVhbnVwRnJpZW5kbHlWaWV3cyhhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRWaWV3TGlzdCgpO1xuXG4gICAgY29uc3QgYWN0aXZlVmlld05hbWVzID0gW107XG5cbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgYWN0aXZlVmlld05hbWVzLnB1c2godGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCBudWxsKSk7XG5cbiAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgICAgYWN0aXZlVmlld05hbWVzLnB1c2godGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVtb3ZlID0gZGlmZmVyZW5jZSh0aGlzLnZpZXdOYW1lcywgYWN0aXZlVmlld05hbWVzKTtcblxuICAgIGZvciAoY29uc3Qgdmlld05hbWUgb2YgcmVtb3ZlKSB7XG4gICAgICBpZiAodmlld05hbWUuaW5kZXhPZigndmlld18nKSA9PT0gMCB8fCB2aWV3TmFtZS5pbmRleE9mKCd2aWV3IC0gJykgPT09IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXM7JywgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMudmlld1NjaGVtYSksIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSkpKTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcbiAgICBpZiAoZm9ybSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlU3RhdHVzID0gKG1lc3NhZ2UpID0+IHtcbiAgICBpZiAocHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wU3lzdGVtVGFibGVzKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh0ZW1wbGF0ZURyb3ApKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwRGF0YWJhc2UoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHZlcnNpb24wMDEpKTtcbiAgfVxuXG4gIHByZXBhcmVNaWdyYXRpb25TY3JpcHQoc3FsKSB7XG4gICAgcmV0dXJuIHNxbC5yZXBsYWNlKC9fX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSlcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLnZpZXdTY2hlbWEpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gICAgfTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQaG90byh7fSwgYXN5bmMgKHBob3RvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQaG90b3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFZpZGVvKHt9LCBhc3luYyAodmlkZW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1ZpZGVvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQXVkaW8oe30sIGFzeW5jIChhdWRpbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQXVkaW8nLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFNpZ25hdHVyZSh7fSwgYXN5bmMgKHNpZ25hdHVyZSwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnU2lnbmF0dXJlcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVTaWduYXR1cmUoc2lnbmF0dXJlLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaGFuZ2VzZXQoe30sIGFzeW5jIChjaGFuZ2VzZXQsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NoYW5nZXNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUm9sZSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUm9sZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFByb2plY3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Byb2plY3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hGb3JtKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdGb3JtcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoTWVtYmVyc2hpcCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnTWVtYmVyc2hpcHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENob2ljZUxpc3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Nob2ljZSBMaXN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NsYXNzaWZpY2F0aW9uIFNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlSW5pdGlhbGl6ZSgpIHtcbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAodGhpcy50YWJsZU5hbWVzLmluZGV4T2YoJ21pZ3JhdGlvbnMnKSA9PT0gLTEpIHtcbiAgICAgIGxvZygnSW5pdGl0YWxpemluZyBkYXRhYmFzZS4uLicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KSB7XG4gICAgdGhpcy5taWdyYXRpb25zID0gKGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgbmFtZSBGUk9NICR7IHRoaXMuZGF0YVNjaGVtYSB9Lm1pZ3JhdGlvbnNgKSkubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIGxldCBwb3B1bGF0ZVJlY29yZHMgPSBmYWxzZTtcblxuICAgIGZvciAobGV0IGNvdW50ID0gMjsgY291bnQgPD0gQ1VSUkVOVF9WRVJTSU9OOyArK2NvdW50KSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gcGFkU3RhcnQoY291bnQsIDMsICcwJyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzTWlncmF0aW9uID0gdGhpcy5taWdyYXRpb25zLmluZGV4T2YodmVyc2lvbikgPT09IC0xICYmIE1JR1JBVElPTlNbdmVyc2lvbl07XG5cbiAgICAgIGlmIChuZWVkc01pZ3JhdGlvbikge1xuICAgICAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQoTUlHUkFUSU9OU1t2ZXJzaW9uXSkpO1xuXG4gICAgICAgIGlmICh2ZXJzaW9uID09PSAnMDAyJykge1xuICAgICAgICAgIGxvZygnUG9wdWxhdGluZyBzeXN0ZW0gdGFibGVzLi4uJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgICBwb3B1bGF0ZVJlY29yZHMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZlcnNpb24gPT09ICcwMDUnKSB7XG4gICAgICAgICAgbG9nKCdNaWdyYXRpbmcgZGF0ZSBjYWxjdWxhdGlvbiBmaWVsZHMuLi4nKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLm1pZ3JhdGVDYWxjdWxhdGVkRmllbGRzRGF0ZUZvcm1hdChhY2NvdW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3B1bGF0ZVJlY29yZHMpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9wdWxhdGVSZWNvcmRzKGFjY291bnQpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KSB7XG4gICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBpbmRleCA9IDA7XG5cbiAgICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcbiAgICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgICB0aGlzLnByb2dyZXNzKGZvcm0ubmFtZSwgaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCBmYWxzZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBtaWdyYXRlQ2FsY3VsYXRlZEZpZWxkc0RhdGVGb3JtYXQoYWNjb3VudCkge1xuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBjb25zdCBmaWVsZHMgPSBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdDYWxjdWxhdGVkRmllbGQnKS5maWx0ZXIoZWxlbWVudCA9PiBlbGVtZW50LmRpc3BsYXkuaXNEYXRlKTtcblxuICAgICAgaWYgKGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgICAgbG9nKCdNaWdyYXRpbmcgZGF0ZSBjYWxjdWxhdGlvbiBmaWVsZHMgaW4gZm9ybS4uLicsIGZvcm0ubmFtZSk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gIH1cbn1cbiJdfQ==