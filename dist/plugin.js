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
          pgUniqueViews: {
            desc: 'make sure the views are uniquely identifiable. Disabling this makes the views easier to use, but has limitations when forms are renamed. ONLY use this is you know you will not rename or swap out forms or drastically alter form schemas.',
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
      _this3.useUniqueViews = fulcrum.args.pgUniqueViews !== false;

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
    let name = (0, _lodash.compact)([form.name, repeatable && repeatable.dataName]).join(' - ');

    if (this.useUniqueViews) {
      const formID = this.persistentTableNames ? form.id : form.rowID;

      const prefix = (0, _lodash.compact)(['view', formID, repeatable && repeatable.key]).join(' - ');

      name = [prefix, name].join(' - ');
    }

    return this.trimIdentifier(fulcrum.args.pgUnderscoreNames !== false ? (0, _snakeCase2.default)(name) : name);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiQ1VSUkVOVF9WRVJTSU9OIiwiREVGQVVMVF9TQ0hFTUEiLCJsb2ciLCJ3YXJuIiwiZXJyb3IiLCJmdWxjcnVtIiwibG9nZ2VyIiwid2l0aENvbnRleHQiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJhcmdzIiwicGdEcm9wIiwiZHJvcFN5c3RlbVRhYmxlcyIsInBnU2V0dXAiLCJzZXR1cERhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsInBnU3lzdGVtVGFibGVzT25seSIsInNldHVwU3lzdGVtVGFibGVzIiwiaW52b2tlQmVmb3JlRnVuY3Rpb24iLCJmb3JtcyIsImZpbmRBY3RpdmVGb3JtcyIsImZvcm0iLCJwZ0Zvcm0iLCJpZCIsInBnUmVidWlsZFZpZXdzT25seSIsInJlYnVpbGRGcmllbmRseVZpZXdzIiwicmVidWlsZEZvcm0iLCJpbmRleCIsInVwZGF0ZVN0YXR1cyIsIm5hbWUiLCJncmVlbiIsInRvU3RyaW5nIiwicmVkIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVzY2FwZUlkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicGdkYiIsImlkZW50IiwidHJpbUlkZW50aWZpZXIiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJ1c2VBY2NvdW50UHJlZml4Iiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwiY2xlYW51cEZyaWVuZGx5Vmlld3MiLCJvbkZvcm1TYXZlIiwib2xkRm9ybSIsIm5ld0Zvcm0iLCJ1cGRhdGVGb3JtIiwib25Gb3JtRGVsZXRlIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvblNpZ25hdHVyZVNhdmUiLCJzaWduYXR1cmUiLCJ1cGRhdGVTaWduYXR1cmUiLCJvbkNoYW5nZXNldFNhdmUiLCJjaGFuZ2VzZXQiLCJ1cGRhdGVDaGFuZ2VzZXQiLCJvbkNob2ljZUxpc3RTYXZlIiwiY2hvaWNlTGlzdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsImNsYXNzaWZpY2F0aW9uU2V0IiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwicHJvamVjdCIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwicm9sZSIsInVwZGF0ZVJvbGUiLCJvbk1lbWJlcnNoaXBTYXZlIiwibWVtYmVyc2hpcCIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJkYXRhU2NoZW1hIiwidGFibGVOYW1lcyIsInJlbG9hZFZpZXdMaXN0Iiwidmlld1NjaGVtYSIsInZpZXdOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsImZvcm1hdFNpZ25hdHVyZVVSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwic3lzdGVtVmFsdWVzIiwic3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJvcHRpb25zIiwiZGlzYWJsZUFycmF5cyIsInVzZXJNb2R1bGUiLCJ0YWJsZVNjaGVtYSIsImNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQiLCJtZXRhZGF0YSIsInVzZVJlc291cmNlSUQiLCJhY2NvdW50UHJlZml4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImludGVncml0eVdhcm5pbmciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInByb2dyZXNzIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU2NoZW1hVmlld3MiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwicGdBcnJheXMiLCJwZ1ByZWZpeCIsInBnVW5pcXVlVmlld3MiLCJwZ1NpbXBsZVR5cGVzIiwiaGFuZGxlciIsInN1YnN0cmluZyIsInVzZVN5bmNFdmVudHMiLCJ1c2VyIiwicGFzc3dvcmQiLCJyZXF1aXJlIiwiYXBwIiwidXNlVW5pcXVlVmlld3MiLCJQb29sIiwib24iLCJzZXR1cE9wdGlvbnMiLCJtYXliZUluaXRpYWxpemUiLCJkZWFjdGl2YXRlIiwiZW5kIiwib2JqZWN0IiwidmFsdWVzIiwiZmlsZSIsImFjY2Vzc19rZXkiLCJ0YWJsZSIsImRlbGV0ZVN0YXRlbWVudCIsInJvd19yZXNvdXJjZV9pZCIsImluc2VydFN0YXRlbWVudCIsInBrIiwic3RhY2siLCJzY2hlbWEiLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybUFuZFNjaGVtYSIsImRhdGFOYW1lIiwiZm9ybUlEIiwicGVyc2lzdGVudFRhYmxlTmFtZXMiLCJwcmVmaXgiLCJrZXkiLCJiZWZvcmVTeW5jIiwiYWZ0ZXJTeW5jIiwiZmluZEVhY2hSZWNvcmQiLCJhY3RpdmVWaWV3TmFtZXMiLCJwdXNoIiwicmVtb3ZlIiwicHJlcGFyZU1pZ3JhdGlvblNjcmlwdCIsImZpbmRFYWNoUGhvdG8iLCJmaW5kRWFjaFZpZGVvIiwiZmluZEVhY2hBdWRpbyIsImZpbmRFYWNoU2lnbmF0dXJlIiwiZmluZEVhY2hDaGFuZ2VzZXQiLCJmaW5kRWFjaFJvbGUiLCJmaW5kRWFjaFByb2plY3QiLCJmaW5kRWFjaEZvcm0iLCJmaW5kRWFjaE1lbWJlcnNoaXAiLCJmaW5kRWFjaENob2ljZUxpc3QiLCJmaW5kRWFjaENsYXNzaWZpY2F0aW9uU2V0IiwibWF5YmVSdW5NaWdyYXRpb25zIiwibWlncmF0aW9ucyIsInBvcHVsYXRlUmVjb3JkcyIsImNvdW50IiwidmVyc2lvbiIsIm5lZWRzTWlncmF0aW9uIiwibWlncmF0ZUNhbGN1bGF0ZWRGaWVsZHNEYXRlRm9ybWF0IiwiZmllbGRzIiwiZmlsdGVyIiwiZGlzcGxheSIsImlzRGF0ZSIsImxlbmd0aCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0lBSVlBLEc7O0FBSFo7Ozs7QUFDQTs7OztBQUNBOzs7O0FBRUE7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7Ozs7QUFFQSxNQUFNQyx3QkFBd0IsRUFBOUI7O0FBRUEsTUFBTUMsa0JBQWtCO0FBQ3RCQyxZQUFVLFlBRFk7QUFFdEJDLFFBQU0sV0FGZ0I7QUFHdEJDLFFBQU0sSUFIZ0I7QUFJdEJDLE9BQUssRUFKaUI7QUFLdEJDLHFCQUFtQjtBQUxHLENBQXhCOztBQVFBLE1BQU1DLGFBQWE7QUFDakIsMEJBRGlCO0FBRWpCLDBCQUZpQjtBQUdqQiwwQkFIaUI7QUFJakIsMkJBSmlCO0FBS2pCLDJCQUxpQjtBQU1qQjtBQU5pQixDQUFuQjs7QUFTQSxNQUFNQyxrQkFBa0IsQ0FBeEI7O0FBRUEsTUFBTUMsaUJBQWlCLFFBQXZCOztBQUVBLE1BQU0sRUFBRUMsR0FBRixFQUFPQyxJQUFQLEVBQWFDLEtBQWIsS0FBdUJDLFFBQVFDLE1BQVIsQ0FBZUMsV0FBZixDQUEyQixVQUEzQixDQUE3Qjs7a0JBRWUsTUFBTTtBQUFBO0FBQUE7O0FBQUEsU0F3SW5CQyxVQXhJbUIscUJBd0lOLGFBQVk7QUFDdkIsWUFBTSxNQUFLQyxRQUFMLEVBQU47O0FBRUEsVUFBSUosUUFBUUssSUFBUixDQUFhQyxNQUFqQixFQUF5QjtBQUN2QixjQUFNLE1BQUtDLGdCQUFMLEVBQU47QUFDQTtBQUNEOztBQUVELFVBQUlQLFFBQVFLLElBQVIsQ0FBYUcsT0FBakIsRUFBMEI7QUFDeEIsY0FBTSxNQUFLQyxhQUFMLEVBQU47QUFDQTtBQUNE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QUF6RDs7QUFFQSxnQkFBTSxRQUFLSCxXQUFMLENBQWlCTCxJQUFqQixFQUF1QlIsT0FBdkIsRUFBZ0MsWUFBTSxDQUFFLENBQXhDLENBQU47QUFDRDtBQUNGO0FBWDhDO0FBWWhEOztBQXIrQmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuaW1wb3J0IHRlbXBsYXRlRHJvcCBmcm9tICcuL3RlbXBsYXRlLmRyb3Auc3FsJztcbmltcG9ydCBTY2hlbWFNYXAgZnJvbSAnLi9zY2hlbWEtbWFwJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCB7IGNvbXBhY3QsIGRpZmZlcmVuY2UsIHBhZFN0YXJ0IH0gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHZlcnNpb24wMDEgZnJvbSAnLi92ZXJzaW9uLTAwMS5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDIgZnJvbSAnLi92ZXJzaW9uLTAwMi5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDMgZnJvbSAnLi92ZXJzaW9uLTAwMy5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDQgZnJvbSAnLi92ZXJzaW9uLTAwNC5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDUgZnJvbSAnLi92ZXJzaW9uLTAwNS5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDYgZnJvbSAnLi92ZXJzaW9uLTAwNi5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDcgZnJvbSAnLi92ZXJzaW9uLTAwNy5zcWwnO1xuXG5jb25zdCBNQVhfSURFTlRJRklFUl9MRU5HVEggPSA2MztcblxuY29uc3QgUE9TVEdSRVNfQ09ORklHID0ge1xuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxuICBob3N0OiAnbG9jYWxob3N0JyxcbiAgcG9ydDogNTQzMixcbiAgbWF4OiAxMCxcbiAgaWRsZVRpbWVvdXRNaWxsaXM6IDMwMDAwXG59O1xuXG5jb25zdCBNSUdSQVRJT05TID0ge1xuICAnMDAyJzogdmVyc2lvbjAwMixcbiAgJzAwMyc6IHZlcnNpb24wMDMsXG4gICcwMDQnOiB2ZXJzaW9uMDA0LFxuICAnMDA1JzogdmVyc2lvbjAwNSxcbiAgJzAwNic6IHZlcnNpb24wMDYsXG4gICcwMDcnOiB2ZXJzaW9uMDA3XG59O1xuXG5jb25zdCBDVVJSRU5UX1ZFUlNJT04gPSA3O1xuXG5jb25zdCBERUZBVUxUX1NDSEVNQSA9ICdwdWJsaWMnO1xuXG5jb25zdCB7IGxvZywgd2FybiwgZXJyb3IgfSA9IGZ1bGNydW0ubG9nZ2VyLndpdGhDb250ZXh0KCdwb3N0Z3JlcycpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGFzeW5jIHRhc2soY2xpKSB7XG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICdwb3N0Z3JlcycsXG4gICAgICBkZXNjOiAncnVuIHRoZSBwb3N0Z3JlcyBzeW5jIGZvciBhIHNwZWNpZmljIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIHBnRGF0YWJhc2U6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBkYXRhYmFzZSBuYW1lJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdIb3N0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIGhvc3QnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIHBnUG9ydDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBwb3J0JyxcbiAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLnBvcnRcbiAgICAgICAgfSxcbiAgICAgICAgcGdVc2VyOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgdXNlcicsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdQYXNzd29yZDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHBhc3N3b3JkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NjaGVtYToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWFWaWV3czoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYSBmb3IgdGhlIGZyaWVuZGx5IHZpZXdzJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Zvcm06IHtcbiAgICAgICAgICBkZXNjOiAndGhlIGZvcm0gSUQgdG8gcmVidWlsZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZXBvcnRCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ3JlcG9ydCBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdNZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnVW5kZXJzY29yZU5hbWVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB1bmRlcnNjb3JlIG5hbWVzIChlLmcuIFwiUGFyayBJbnNwZWN0aW9uc1wiIGJlY29tZXMgXCJwYXJrX2luc3BlY3Rpb25zXCIpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZWJ1aWxkVmlld3NPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgcmVidWlsZCB0aGUgdmlld3MnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdDdXN0b21Nb2R1bGU6IHtcbiAgICAgICAgICBkZXNjOiAnYSBjdXN0b20gbW9kdWxlIHRvIGxvYWQgd2l0aCBzeW5jIGV4dGVuc2lvbnMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NldHVwOiB7XG4gICAgICAgICAgZGVzYzogJ3NldHVwIHRoZSBkYXRhYmFzZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Ryb3A6IHtcbiAgICAgICAgICBkZXNjOiAnZHJvcCB0aGUgc3lzdGVtIHRhYmxlcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0FycmF5czoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgYXJyYXkgdHlwZXMgZm9yIG11bHRpLXZhbHVlIGZpZWxkcyBsaWtlIGNob2ljZSBmaWVsZHMsIGNsYXNzaWZpY2F0aW9uIGZpZWxkcyBhbmQgbWVkaWEgZmllbGRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgLy8gcGdQZXJzaXN0ZW50VGFibGVOYW1lczoge1xuICAgICAgICAvLyAgIGRlc2M6ICd1c2UgdGhlIHNlcnZlciBpZCBpbiB0aGUgZm9ybSB0YWJsZSBuYW1lcycsXG4gICAgICAgIC8vICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAvLyAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgLy8gICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAvLyB9LFxuICAgICAgICBwZ1ByZWZpeDoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdGhlIG9yZ2FuaXphdGlvbiBhcyBhIHByZWZpeCBpbiB0aGUgb2JqZWN0IG5hbWVzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdVbmlxdWVWaWV3czoge1xuICAgICAgICAgIGRlc2M6ICdtYWtlIHN1cmUgdGhlIHZpZXdzIGFyZSB1bmlxdWVseSBpZGVudGlmaWFibGUuIERpc2FibGluZyB0aGlzIG1ha2VzIHRoZSB2aWV3cyBlYXNpZXIgdG8gdXNlLCBidXQgaGFzIGxpbWl0YXRpb25zIHdoZW4gZm9ybXMgYXJlIHJlbmFtZWQuIE9OTFkgdXNlIHRoaXMgaXMgeW91IGtub3cgeW91IHdpbGwgbm90IHJlbmFtZSBvciBzd2FwIG91dCBmb3JtcyBvciBkcmFzdGljYWxseSBhbHRlciBmb3JtIHNjaGVtYXMuJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdTaW1wbGVUeXBlczoge1xuICAgICAgICAgIGRlc2M6ICd1c2Ugc2ltcGxlIHR5cGVzIGluIHRoZSBkYXRhYmFzZSB0aGF0IGFyZSBtb3JlIGNvbXBhdGlibGUgd2l0aCBvdGhlciBhcHBsaWNhdGlvbnMgKG5vIHRzdmVjdG9yLCBnZW9tZXRyeSwgYXJyYXlzKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ1N5c3RlbVRhYmxlc09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSBjcmVhdGUgdGhlIHN5c3RlbSByZWNvcmRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Ryb3ApIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcFN5c3RlbVRhYmxlcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTZXR1cCkge1xuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTeXN0ZW1UYWJsZXNPbmx5KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdGb3JtICYmIGZvcm0uaWQgIT09IGZ1bGNydW0uYXJncy5wZ0Zvcm0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZWJ1aWxkVmlld3NPbmx5KSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIChpbmRleCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgZnVsY3J1bS5hcmdzLm9yZyk7XG4gICAgfVxuICB9XG5cbiAgdHJpbUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICAgIHJldHVybiBpZGVudGlmaWVyLnN1YnN0cmluZygwLCBNQVhfSURFTlRJRklFUl9MRU5HVEgpO1xuICB9XG5cbiAgZXNjYXBlSWRlbnRpZmllciA9IChpZGVudGlmaWVyKSA9PiB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIgJiYgdGhpcy5wZ2RiLmlkZW50KHRoaXMudHJpbUlkZW50aWZpZXIoaWRlbnRpZmllcikpO1xuICB9XG5cbiAgZ2V0IHVzZVN5bmNFdmVudHMoKSB7XG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgIT0gbnVsbCA/IGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgOiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGUoKSB7XG4gICAgdGhpcy5hY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcGkgPSBhcGk7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFwcCA9IGZ1bGNydW07XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FycmF5cyA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUFycmF5cyA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NpbXBsZVR5cGVzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGlmIChmdWxjcnVtLmFyZ3MucGdQZXJzaXN0ZW50VGFibGVOYW1lcyA9PT0gdHJ1ZSkge1xuICAgICAgLy8gdGhpcy5wZXJzaXN0ZW50VGFibGVOYW1lcyA9IHRydWU7XG4gICAgLy8gfVxuXG4gICAgdGhpcy51c2VBY2NvdW50UHJlZml4ID0gKGZ1bGNydW0uYXJncy5wZ1ByZWZpeCAhPT0gZmFsc2UpO1xuICAgIHRoaXMudXNlVW5pcXVlVmlld3MgPSAoZnVsY3J1bS5hcmdzLnBnVW5pcXVlVmlld3MgIT09IGZhbHNlKTtcblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdzaWduYXR1cmU6c2F2ZScsIHRoaXMub25TaWduYXR1cmVTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2NoYW5nZXNldDpzYXZlJywgdGhpcy5vbkNoYW5nZXNldFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOnNhdmUnLCB0aGlzLm9uUmVjb3JkU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6ZGVsZXRlJywgdGhpcy5vblJlY29yZERlbGV0ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OnNhdmUnLCB0aGlzLm9uQ2hvaWNlTGlzdFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbignY2hvaWNlLWxpc3Q6ZGVsZXRlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignZm9ybTpzYXZlJywgdGhpcy5vbkZvcm1TYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06ZGVsZXRlJywgdGhpcy5vbkZvcm1TYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignY2xhc3NpZmljYXRpb24tc2V0OnNhdmUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpkZWxldGUnLCB0aGlzLm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbigncm9sZTpzYXZlJywgdGhpcy5vblJvbGVTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6ZGVsZXRlJywgdGhpcy5vblJvbGVTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbigncHJvamVjdDpzYXZlJywgdGhpcy5vblByb2plY3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6ZGVsZXRlJywgdGhpcy5vblByb2plY3RTYXZlKTtcblxuICAgICAgZnVsY3J1bS5vbignbWVtYmVyc2hpcDpzYXZlJywgdGhpcy5vbk1lbWJlcnNoaXBTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6ZGVsZXRlJywgdGhpcy5vbk1lbWJlcnNoaXBTYXZlKTtcbiAgICB9XG5cbiAgICB0aGlzLnZpZXdTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWFWaWV3cyB8fCBERUZBVUxUX1NDSEVNQTtcbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MucGdTY2hlbWEgfHwgREVGQVVMVF9TQ0hFTUE7XG5cbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXG4gICAgLy8gY3JlYXRpb24gb2YgbmV3IHRhYmxlcyBldmVuIHdoZW4gdGhlIGZvcm0gaXNuJ3QgdmVyc2lvbiAxLiBJZiB0aGUgdGFibGUgZG9lc24ndFxuICAgIC8vIGV4aXN0LCB3ZSBjYW4gcHJldGVuZCB0aGUgZm9ybSBpcyB2ZXJzaW9uIDEgc28gaXQgY3JlYXRlcyBhbGwgbmV3IHRhYmxlcyBpbnN0ZWFkXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICAvLyBtYWtlIGEgY2xpZW50IHNvIHdlIGNhbiB1c2UgaXQgdG8gYnVpbGQgU1FMIHN0YXRlbWVudHNcbiAgICB0aGlzLnBnZGIgPSBuZXcgUG9zdGdyZXMoe30pO1xuXG4gICAgdGhpcy5zZXR1cE9wdGlvbnMoKTtcblxuICAgIGF3YWl0IHRoaXMubWF5YmVJbml0aWFsaXplKCk7XG4gIH1cblxuICBhc3luYyBkZWFjdGl2YXRlKCkge1xuICAgIGlmICh0aGlzLnBvb2wpIHtcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBydW4gPSAoc3FsKSA9PiB7XG4gICAgc3FsID0gc3FsLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICBsb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICBpZiAodGhpcy51c2VBY2NvdW50UHJlZml4KSB7XG4gICAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICAgIH1cblxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLmNsZWFudXBGcmllbmRseVZpZXdzKGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvbkZvcm1EZWxldGUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnR9KSA9PiB7XG4gICAgY29uc3Qgb2xkRm9ybSA9IHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBudWxsKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25QaG90b1NhdmUgPSBhc3luYyAoe3Bob3RvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICB9XG5cbiAgb25WaWRlb1NhdmUgPSBhc3luYyAoe3ZpZGVvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25BdWRpb1NhdmUgPSBhc3luYyAoe2F1ZGlvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25TaWduYXR1cmVTYXZlID0gYXN5bmMgKHtzaWduYXR1cmUsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVTaWduYXR1cmUoc2lnbmF0dXJlLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hhbmdlc2V0U2F2ZSA9IGFzeW5jICh7Y2hhbmdlc2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtjaG9pY2VMaXN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChjaG9pY2VMaXN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2xhc3NpZmljYXRpb25TZXRTYXZlID0gYXN5bmMgKHtjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KGNsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe3Byb2plY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KHByb2plY3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25Sb2xlU2F2ZSA9IGFzeW5jICh7cm9sZSwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUocm9sZSwgYWNjb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHttZW1iZXJzaGlwLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChtZW1iZXJzaGlwLCBhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVBob3RvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5waG90byhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFBob3RvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3Bob3RvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlVmlkZW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnZpZGVvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0VmlkZW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAndmlkZW9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVBdWRpbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAuYXVkaW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRBdWRpb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdhdWRpbycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlU2lnbmF0dXJlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5zaWduYXR1cmUob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRTaWduYXR1cmVVUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnc2lnbmF0dXJlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hhbmdlc2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaGFuZ2VzZXQob2JqZWN0KSwgJ2NoYW5nZXNldHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnByb2plY3Qob2JqZWN0KSwgJ3Byb2plY3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5tZW1iZXJzaGlwKG9iamVjdCksICdtZW1iZXJzaGlwcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucm9sZShvYmplY3QpLCAncm9sZXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmZvcm0ob2JqZWN0KSwgJ2Zvcm1zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaG9pY2VMaXN0KG9iamVjdCksICdjaG9pY2VfbGlzdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jbGFzc2lmaWNhdGlvblNldChvYmplY3QpLCAnY2xhc3NpZmljYXRpb25fc2V0cycpO1xuICB9XG5cblxuICBhc3luYyB1cGRhdGVPYmplY3QodmFsdWVzLCB0YWJsZSkge1xuICAgIGNvbnN0IGRlbGV0ZVN0YXRlbWVudCA9IHRoaXMucGdkYi5kZWxldGVTdGF0ZW1lbnQoYCR7IHRoaXMuZGF0YVNjaGVtYSB9LnN5c3RlbV8ke3RhYmxlfWAsIHtyb3dfcmVzb3VyY2VfaWQ6IHZhbHVlcy5yb3dfcmVzb3VyY2VfaWR9KTtcbiAgICBjb25zdCBpbnNlcnRTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuaW5zZXJ0U3RhdGVtZW50KGAkeyB0aGlzLmRhdGFTY2hlbWEgfS5zeXN0ZW1fJHt0YWJsZX1gLCB2YWx1ZXMsIHtwazogJ2lkJ30pO1xuXG4gICAgY29uc3Qgc3FsID0gWyBkZWxldGVTdGF0ZW1lbnQuc3FsLCBpbnNlcnRTdGF0ZW1lbnQuc3FsIF0uam9pbignXFxuJyk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICByZWxvYWRWaWV3TGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy52aWV3U2NoZW1hIH0nYCk7XG4gICAgdGhpcy52aWV3TmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBiYXNlTWVkaWFVUkwgPSAoKSA9PiB7XG4gIH1cblxuICBmb3JtYXRQaG90b1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3MvJHsgaWQgfS5qcGdgO1xuICB9XG5cbiAgZm9ybWF0VmlkZW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zLyR7IGlkIH0ubXA0YDtcbiAgfVxuXG4gIGZvcm1hdEF1ZGlvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvLyR7IGlkIH0ubTRhYDtcbiAgfVxuXG4gIGZvcm1hdFNpZ25hdHVyZVVSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9zaWduYXR1cmVzLyR7IGlkIH0ucG5nYDtcbiAgfVxuXG4gIGludGVncml0eVdhcm5pbmcoZXgpIHtcbiAgICB3YXJuKGBcbi0tLS0tLS0tLS0tLS1cbiEhIFdBUk5JTkcgISFcbi0tLS0tLS0tLS0tLS1cblxuUG9zdGdyZVNRTCBkYXRhYmFzZSBpbnRlZ3JpdHkgaXNzdWUgZW5jb3VudGVyZWQuIENvbW1vbiBzb3VyY2VzIG9mIHBvc3RncmVzIGRhdGFiYXNlIGlzc3VlcyBhcmU6XG5cbiogUmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBhbmQgdXNpbmcgYW4gb2xkIHBvc3RncmVzIGRhdGFiYXNlIHdpdGhvdXQgcmVjcmVhdGluZ1xuICB0aGUgcG9zdGdyZXMgZGF0YWJhc2UuXG4qIERlbGV0aW5nIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZSBhbmQgdXNpbmcgYW4gZXhpc3RpbmcgcG9zdGdyZXMgZGF0YWJhc2VcbiogTWFudWFsbHkgbW9kaWZ5aW5nIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBGb3JtIG5hbWUgYW5kIHJlcGVhdGFibGUgZGF0YSBuYW1lIGNvbWJpbmF0aW9ucyB0aGF0IGV4Y2VlZWQgdGhlIHBvc3RncmVzIGxpbWl0IG9mIDYzXG4gIGNoYXJhY3RlcnMuIEl0J3MgYmVzdCB0byBrZWVwIHlvdXIgZm9ybSBuYW1lcyB3aXRoaW4gdGhlIGxpbWl0LiBUaGUgXCJmcmllbmRseSB2aWV3XCJcbiAgZmVhdHVyZSBvZiB0aGUgcGx1Z2luIGRlcml2ZXMgdGhlIG9iamVjdCBuYW1lcyBmcm9tIHRoZSBmb3JtIGFuZCByZXBlYXRhYmxlIG5hbWVzLlxuKiBDcmVhdGluZyBtdWx0aXBsZSBhcHBzIGluIEZ1bGNydW0gd2l0aCB0aGUgc2FtZSBuYW1lLiBUaGlzIGlzIGdlbmVyYWxseSBPSywgZXhjZXB0XG4gIHlvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIHVzZSB0aGUgXCJmcmllbmRseSB2aWV3XCIgZmVhdHVyZSBvZiB0aGUgcG9zdGdyZXMgcGx1Z2luIHNpbmNlXG4gIHRoZSB2aWV3IG5hbWVzIGFyZSBkZXJpdmVkIGZyb20gdGhlIGZvcm0gbmFtZXMuXG5cbk5vdGU6IFdoZW4gcmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBvciBcInN0YXJ0aW5nIG92ZXJcIiB5b3UgbmVlZCB0byBkcm9wIGFuZCByZS1jcmVhdGVcbnRoZSBwb3N0Z3JlcyBkYXRhYmFzZS4gVGhlIG5hbWVzIG9mIGRhdGFiYXNlIG9iamVjdHMgYXJlIHRpZWQgZGlyZWN0bHkgdG8gdGhlIGRhdGFiYXNlXG5vYmplY3RzIGluIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZS5cblxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5SZXBvcnQgaXNzdWVzIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9mdWxjcnVtYXBwL2Z1bGNydW0tZGVza3RvcC9pc3N1ZXNcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuTWVzc2FnZTpcbiR7IGV4Lm1lc3NhZ2UgfVxuXG5TdGFjazpcbiR7IGV4LnN0YWNrIH1cbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuYC5yZWRcbiAgICApO1xuICB9XG5cbiAgc2V0dXBPcHRpb25zKCkge1xuICAgIHRoaXMuYmFzZU1lZGlhVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyA9IHtcbiAgICAgIHNjaGVtYTogdGhpcy5kYXRhU2NoZW1hLFxuXG4gICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG5cbiAgICAgIGVzY2FwZUlkZW50aWZpZXI6IHRoaXMuZXNjYXBlSWRlbnRpZmllcixcblxuICAgICAgLy8gcGVyc2lzdGVudFRhYmxlTmFtZXM6IHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMsXG5cbiAgICAgIGFjY291bnRQcmVmaXg6IHRoaXMudXNlQWNjb3VudFByZWZpeCA/ICdhY2NvdW50XycgKyB0aGlzLmFjY291bnQucm93SUQgOiBudWxsLFxuXG4gICAgICBjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0OiAnZGF0ZScsXG5cbiAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyxcblxuICAgICAgdmFsdWVzVHJhbnNmb3JtZXI6IHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS52YWx1ZXNUcmFuc2Zvcm1lcixcblxuICAgICAgbWVkaWFVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0UGhvdG9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0VmlkZW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0QXVkaW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBtZWRpYVZpZXdVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkcyA9IG1lZGlhVmFsdWUuaXRlbXMubWFwKG8gPT4gby5tZWRpYUlEKTtcblxuICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy92aWV3P3Bob3Rvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy92aWV3P3ZpZGVvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvL3ZpZXc/YXVkaW89JHsgaWRzIH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsKSB7XG4gICAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIgPSAoZmVhdHVyZSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7IGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwgfS9yZXBvcnRzLyR7IGZlYXR1cmUuaWQgfS5wZGZgO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCh7cmVjb3JkLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMudXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuXG4gICAgY29uc3Qgc3lzdGVtVmFsdWVzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShyZWNvcmQsIG51bGwsIHJlY29yZCwgey4uLnRoaXMucmVjb3JkVmFsdWVPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlQ29tcGxleFR5cGVzOiBmYWxzZX0pO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJlY29yZChyZWNvcmQsIHN5c3RlbVZhbHVlcyksICdyZWNvcmRzJyk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBudWxsLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucykpICE9PSAtMTtcbiAgfVxuXG4gIHJlY3JlYXRlRm9ybVRhYmxlcyA9IGFzeW5jIChmb3JtLCBhY2NvdW50KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBlcnJvcihleCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG51bGwsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSkpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0oe2Zvcm0sIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3QoZm9ybSwgYWNjb3VudCk7XG5cbiAgICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG4gICAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IHRoaXMuZGlzYWJsZUNvbXBsZXhUeXBlcyxcbiAgICAgICAgdXNlck1vZHVsZTogdGhpcy5wZ0N1c3RvbU1vZHVsZSxcbiAgICAgICAgdGFibGVTY2hlbWE6IHRoaXMuZGF0YVNjaGVtYSxcbiAgICAgICAgY2FsY3VsYXRlZEZpZWxkRGF0ZUZvcm1hdDogJ2RhdGUnLFxuICAgICAgICBtZXRhZGF0YTogdHJ1ZSxcbiAgICAgICAgdXNlUmVzb3VyY2VJRDogZmFsc2UsXG4gICAgICAgIGFjY291bnRQcmVmaXg6IHRoaXMudXNlQWNjb3VudFByZWZpeCA/ICdhY2NvdW50XycgKyB0aGlzLmFjY291bnQucm93SUQgOiBudWxsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwgb3B0aW9ucyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKFsnQkVHSU4gVFJBTlNBQ1RJT047JyxcbiAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICdDT01NSVQgVFJBTlNBQ1RJT047J10uam9pbignXFxuJykpO1xuXG4gICAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXMgQ0FTQ0FERTsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlczsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm1BbmRTY2hlbWEoZm9ybSwgcmVwZWF0YWJsZSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMsICdfdmlld19mdWxsJykpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGxldCBuYW1lID0gY29tcGFjdChbZm9ybS5uYW1lLCByZXBlYXRhYmxlICYmIHJlcGVhdGFibGUuZGF0YU5hbWVdKS5qb2luKCcgLSAnKVxuXG4gICAgaWYgKHRoaXMudXNlVW5pcXVlVmlld3MpIHtcbiAgICAgIGNvbnN0IGZvcm1JRCA9IHRoaXMucGVyc2lzdGVudFRhYmxlTmFtZXMgPyBmb3JtLmlkIDogZm9ybS5yb3dJRDtcblxuICAgICAgY29uc3QgcHJlZml4ID0gY29tcGFjdChbJ3ZpZXcnLCBmb3JtSUQsIHJlcGVhdGFibGUgJiYgcmVwZWF0YWJsZS5rZXldKS5qb2luKCcgLSAnKTtcblxuICAgICAgbmFtZSA9IFtwcmVmaXgsIG5hbWVdLmpvaW4oJyAtICcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnRyaW1JZGVudGlmaWVyKGZ1bGNydW0uYXJncy5wZ1VuZGVyc2NvcmVOYW1lcyAhPT0gZmFsc2UgPyBzbmFrZShuYW1lKSA6IG5hbWUpO1xuICB9XG5cbiAgYXN5bmMgaW52b2tlQmVmb3JlRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQWZ0ZXJGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIHByb2dyZXNzKSB7XG4gICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgY2xlYW51cEZyaWVuZGx5Vmlld3MoYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVmlld0xpc3QoKTtcblxuICAgIGNvbnN0IGFjdGl2ZVZpZXdOYW1lcyA9IFtdO1xuXG4gICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgIGFjdGl2ZVZpZXdOYW1lcy5wdXNoKHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgbnVsbCkpO1xuXG4gICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgIGFjdGl2ZVZpZXdOYW1lcy5wdXNoKHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlbW92ZSA9IGRpZmZlcmVuY2UodGhpcy52aWV3TmFtZXMsIGFjdGl2ZVZpZXdOYW1lcyk7XG5cbiAgICBmb3IgKGNvbnN0IHZpZXdOYW1lIG9mIHJlbW92ZSkge1xuICAgICAgaWYgKHZpZXdOYW1lLmluZGV4T2YoJ3ZpZXdfJykgPT09IDAgfHwgdmlld05hbWUuaW5kZXhPZigndmlldyAtICcpID09PSAwKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLnZpZXdTY2hlbWEpLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodmlld05hbWUpKSk7XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcFN5c3RlbVRhYmxlcygpIHtcbiAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQodGVtcGxhdGVEcm9wKSk7XG4gIH1cblxuICBhc3luYyBzZXR1cERhdGFiYXNlKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh2ZXJzaW9uMDAxKSk7XG4gIH1cblxuICBwcmVwYXJlTWlncmF0aW9uU2NyaXB0KHNxbCkge1xuICAgIHJldHVybiBzcWwucmVwbGFjZSgvX19TQ0hFTUFfXy9nLCB0aGlzLmRhdGFTY2hlbWEpXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9fX1ZJRVdfU0NIRU1BX18vZywgdGhpcy52aWV3U2NoZW1hKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpIHtcbiAgICBjb25zdCBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICAgIH07XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUGhvdG8oe30sIGFzeW5jIChwaG90bywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUGhvdG9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hWaWRlbyh7fSwgYXN5bmMgKHZpZGVvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdWaWRlb3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEF1ZGlvKHt9LCBhc3luYyAoYXVkaW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0F1ZGlvJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hTaWduYXR1cmUoe30sIGFzeW5jIChzaWduYXR1cmUsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1NpZ25hdHVyZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlU2lnbmF0dXJlKHNpZ25hdHVyZSwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hhbmdlc2V0KHt9LCBhc3luYyAoY2hhbmdlc2V0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaGFuZ2VzZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFJvbGUoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1JvbGVzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQcm9qZWN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQcm9qZWN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoRm9ybSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnRm9ybXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaE1lbWJlcnNoaXAoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ01lbWJlcnNoaXBzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaG9pY2VMaXN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaG9pY2UgTGlzdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENsYXNzaWZpY2F0aW9uU2V0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDbGFzc2lmaWNhdGlvbiBTZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBtYXliZUluaXRpYWxpemUoKSB7XG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKHRoaXMudGFibGVOYW1lcy5pbmRleE9mKCdtaWdyYXRpb25zJykgPT09IC0xKSB7XG4gICAgICBsb2coJ0luaXRpdGFsaXppbmcgZGF0YWJhc2UuLi4nKTtcblxuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyBtYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCkge1xuICAgIHRoaXMubWlncmF0aW9ucyA9IChhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIG5hbWUgRlJPTSAkeyB0aGlzLmRhdGFTY2hlbWEgfS5taWdyYXRpb25zYCkpLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICBsZXQgcG9wdWxhdGVSZWNvcmRzID0gZmFsc2U7XG5cbiAgICBmb3IgKGxldCBjb3VudCA9IDI7IGNvdW50IDw9IENVUlJFTlRfVkVSU0lPTjsgKytjb3VudCkge1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHBhZFN0YXJ0KGNvdW50LCAzLCAnMCcpO1xuXG4gICAgICBjb25zdCBuZWVkc01pZ3JhdGlvbiA9IHRoaXMubWlncmF0aW9ucy5pbmRleE9mKHZlcnNpb24pID09PSAtMSAmJiBNSUdSQVRJT05TW3ZlcnNpb25dO1xuXG4gICAgICBpZiAobmVlZHNNaWdyYXRpb24pIHtcbiAgICAgICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KE1JR1JBVElPTlNbdmVyc2lvbl0pKTtcblxuICAgICAgICBpZiAodmVyc2lvbiA9PT0gJzAwMicpIHtcbiAgICAgICAgICBsb2coJ1BvcHVsYXRpbmcgc3lzdGVtIHRhYmxlcy4uLicpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgICAgcG9wdWxhdGVSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2ZXJzaW9uID09PSAnMDA1Jykge1xuICAgICAgICAgIGxvZygnTWlncmF0aW5nIGRhdGUgY2FsY3VsYXRpb24gZmllbGRzLi4uJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5taWdyYXRlQ2FsY3VsYXRlZEZpZWxkc0RhdGVGb3JtYXQoYWNjb3VudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9wdWxhdGVSZWNvcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBwb3B1bGF0ZVJlY29yZHMoYWNjb3VudCkge1xuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgaW5kZXggPSAwO1xuXG4gICAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5wcm9ncmVzcyhmb3JtLm5hbWUsIGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbWlncmF0ZUNhbGN1bGF0ZWRGaWVsZHNEYXRlRm9ybWF0KGFjY291bnQpIHtcbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgY29uc3QgZmllbGRzID0gZm9ybS5lbGVtZW50c09mVHlwZSgnQ2FsY3VsYXRlZEZpZWxkJykuZmlsdGVyKGVsZW1lbnQgPT4gZWxlbWVudC5kaXNwbGF5LmlzRGF0ZSk7XG5cbiAgICAgIGlmIChmaWVsZHMubGVuZ3RoKSB7XG4gICAgICAgIGxvZygnTWlncmF0aW5nIGRhdGUgY2FsY3VsYXRpb24gZmllbGRzIGluIGZvcm0uLi4nLCBmb3JtLm5hbWUpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICB9XG59XG4iXX0=