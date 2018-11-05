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

const DEFAULT_SCHEMA = 'public';

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

    this.updateRecord = (() => {
      var _ref19 = _asyncToGenerator(function* (record, account, skipTableCheck) {
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

      return function (_x16, _x17, _x18) {
        return _ref19.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref20 = _asyncToGenerator(function* (form, account) {
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
        return _ref20.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref21 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        if (_this.pgCustomModule && _this.pgCustomModule.shouldUpdateForm && !_this.pgCustomModule.shouldUpdateForm({ form, account })) {
          return;
        }

        try {
          yield _this.updateFormObject(form, account);

          if (!_this.rootTableExists(form) && newForm != null) {
            oldForm = null;
          }

          const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm, _this.disableArrays, _this.disableComplexTypes, _this.pgCustomModule, _this.dataSchema);

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
        return _ref21.apply(this, arguments);
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
      const deleteStatement = _this15.pgdb.deleteStatement(`${_this15.dataSchema}.system_${table}`, { row_resource_id: values.row_resource_id });
      const insertStatement = _this15.pgdb.insertStatement(`${_this15.dataSchema}.system_${table}`, values, { pk: 'id' });

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
    var _this16 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this16.getFriendlyTableName(form, repeatable);

      try {
        yield _this16.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s CASCADE;', _this16.escapeIdentifier(_this16.viewSchema), _this16.escapeIdentifier(viewName)));
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
        yield _this17.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s.%s_view_full;', _this17.escapeIdentifier(_this17.viewSchema), _this17.escapeIdentifier(viewName), _this17.escapeIdentifier(_this17.dataSchema), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        // sometimes it doesn't exist
        _this17.integrityWarning(ex);
      }
    })();
  }

  getFriendlyTableName(form, repeatable) {
    const name = (0, _lodash.compact)([form.name, repeatable && repeatable.dataName]).join(' - ');

    const prefix = (0, _lodash.compact)(['view', form.rowID, repeatable && repeatable.key]).join(' - ');

    const objectName = [prefix, name].join(' - ');

    return this.trimIdentifier(fulcrum.args.pgUnderscoreNames !== false ? (0, _snakeCase2.default)(objectName) : objectName);
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
        var _ref22 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this20.updateRecord(record, account, true);
        });

        return function (_x25) {
          return _ref22.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

  cleanupFriendlyViews(account) {
    var _this21 = this;

    return _asyncToGenerator(function* () {
      yield _this21.reloadViewList();

      const activeViewNames = [];

      const forms = yield account.findActiveForms({});

      for (const form of forms) {
        activeViewNames.push(_this21.getFriendlyTableName(form, null));

        for (const repeatable of form.elementsOfType('Repeatable')) {
          activeViewNames.push(_this21.getFriendlyTableName(form, repeatable));
        }
      }

      const remove = (0, _lodash.difference)(_this21.viewNames, activeViewNames);

      for (const viewName of remove) {
        if (viewName.indexOf('view_') === 0 || viewName.indexOf('view - ') === 0) {
          try {
            yield _this21.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this21.escapeIdentifier(_this21.viewSchema), _this21.escapeIdentifier(viewName)));
          } catch (ex) {
            _this21.integrityWarning(ex);
          }
        }
      }
    })();
  }

  rebuildFriendlyViews(form, account) {
    var _this22 = this;

    return _asyncToGenerator(function* () {
      yield _this22.dropFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this22.dropFriendlyView(form, repeatable);
      }

      yield _this22.createFriendlyView(form, null);

      for (const repeatable of form.elementsOfType('Repeatable')) {
        yield _this22.createFriendlyView(form, repeatable);
      }
    })();
  }

  dropSystemTables() {
    var _this23 = this;

    return _asyncToGenerator(function* () {
      yield _this23.run(_this23.prepareMigrationScript(_templateDrop2.default));
    })();
  }

  setupDatabase() {
    var _this24 = this;

    return _asyncToGenerator(function* () {
      yield _this24.run(_this24.prepareMigrationScript(_version2.default));
    })();
  }

  prepareMigrationScript(sql) {
    return sql.replace(/__SCHEMA__/g, this.dataSchema).replace(/__VIEW_SCHEMA__/g, this.viewSchema);
  }

  setupSystemTables(account) {
    var _this25 = this;

    return _asyncToGenerator(function* () {
      const progress = function (name, index) {
        _this25.updateStatus(name.green + ' : ' + index.toString().red);
      };

      yield account.findEachPhoto({}, (() => {
        var _ref23 = _asyncToGenerator(function* (photo, { index }) {
          if (++index % 10 === 0) {
            progress('Photos', index);
          }

          yield _this25.updatePhoto(photo, account);
        });

        return function (_x26, _x27) {
          return _ref23.apply(this, arguments);
        };
      })());

      yield account.findEachVideo({}, (() => {
        var _ref24 = _asyncToGenerator(function* (video, { index }) {
          if (++index % 10 === 0) {
            progress('Videos', index);
          }

          yield _this25.updateVideo(video, account);
        });

        return function (_x28, _x29) {
          return _ref24.apply(this, arguments);
        };
      })());

      yield account.findEachAudio({}, (() => {
        var _ref25 = _asyncToGenerator(function* (audio, { index }) {
          if (++index % 10 === 0) {
            progress('Audio', index);
          }

          yield _this25.updateAudio(audio, account);
        });

        return function (_x30, _x31) {
          return _ref25.apply(this, arguments);
        };
      })());

      yield account.findEachChangeset({}, (() => {
        var _ref26 = _asyncToGenerator(function* (changeset, { index }) {
          if (++index % 10 === 0) {
            progress('Changesets', index);
          }

          yield _this25.updateChangeset(changeset, account);
        });

        return function (_x32, _x33) {
          return _ref26.apply(this, arguments);
        };
      })());

      yield account.findEachRole({}, (() => {
        var _ref27 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Roles', index);
          }

          yield _this25.updateRole(object, account);
        });

        return function (_x34, _x35) {
          return _ref27.apply(this, arguments);
        };
      })());

      yield account.findEachProject({}, (() => {
        var _ref28 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Projects', index);
          }

          yield _this25.updateProject(object, account);
        });

        return function (_x36, _x37) {
          return _ref28.apply(this, arguments);
        };
      })());

      yield account.findEachForm({}, (() => {
        var _ref29 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Forms', index);
          }

          yield _this25.updateFormObject(object, account);
        });

        return function (_x38, _x39) {
          return _ref29.apply(this, arguments);
        };
      })());

      yield account.findEachMembership({}, (() => {
        var _ref30 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Memberships', index);
          }

          yield _this25.updateMembership(object, account);
        });

        return function (_x40, _x41) {
          return _ref30.apply(this, arguments);
        };
      })());

      yield account.findEachChoiceList({}, (() => {
        var _ref31 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Choice Lists', index);
          }

          yield _this25.updateChoiceList(object, account);
        });

        return function (_x42, _x43) {
          return _ref31.apply(this, arguments);
        };
      })());

      yield account.findEachClassificationSet({}, (() => {
        var _ref32 = _asyncToGenerator(function* (object, { index }) {
          if (++index % 10 === 0) {
            progress('Classification Sets', index);
          }

          yield _this25.updateClassificationSet(object, account);
        });

        return function (_x44, _x45) {
          return _ref32.apply(this, arguments);
        };
      })());
    })();
  }

  maybeInitialize() {
    var _this26 = this;

    return _asyncToGenerator(function* () {
      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (_this26.tableNames.indexOf('migrations') === -1) {
        console.log('Inititalizing database...');

        yield _this26.setupDatabase();
      }

      yield _this26.maybeRunMigrations(account);
    })();
  }

  maybeRunMigrations(account) {
    var _this27 = this;

    return _asyncToGenerator(function* () {
      _this27.migrations = (yield _this27.run(`SELECT name FROM ${_this27.dataSchema}.migrations`)).map(function (o) {
        return o.name;
      });

      yield _this27.maybeRunMigration('002', account);
      yield _this27.maybeRunMigration('003', account);
      yield _this27.maybeRunMigration('004', account);
    })();
  }

  maybeRunMigration(version, account) {
    var _this28 = this;

    return _asyncToGenerator(function* () {
      if (_this28.migrations.indexOf(version) === -1 && MIGRATIONS[version]) {
        yield _this28.run(_this28.prepareMigrationScript(MIGRATIONS[version]));

        if (version === '002') {
          console.log('Populating system tables...');

          yield _this28.setupSystemTables(account);
          yield _this28.populateRecords(account);
        }
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
          var _ref33 = _asyncToGenerator(function* (record) {
            record.form = form;

            if (++index % 10 === 0) {
              _this29.progress(form.name, index);
            }

            yield _this29.updateRecord(record, account, false);
          });

          return function (_x46) {
            return _ref33.apply(this, arguments);
          };
        })());
      }
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiREVGQVVMVF9TQ0hFTUEiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInBnRHJvcCIsImRyb3BTeXN0ZW1UYWJsZXMiLCJwZ1NldHVwIiwic2V0dXBEYXRhYmFzZSIsImFjY291bnQiLCJmZXRjaEFjY291bnQiLCJvcmciLCJwZ1N5c3RlbVRhYmxlc09ubHkiLCJzZXR1cFN5c3RlbVRhYmxlcyIsImludm9rZUJlZm9yZUZ1bmN0aW9uIiwiZm9ybXMiLCJmaW5kQWN0aXZlRm9ybXMiLCJmb3JtIiwicGdGb3JtIiwiaWQiLCJwZ1JlYnVpbGRWaWV3c09ubHkiLCJyZWJ1aWxkRnJpZW5kbHlWaWV3cyIsInJlYnVpbGRGb3JtIiwiaW5kZXgiLCJ1cGRhdGVTdGF0dXMiLCJuYW1lIiwiZ3JlZW4iLCJ0b1N0cmluZyIsInJlZCIsImNvbnNvbGUiLCJsb2ciLCJpbnZva2VBZnRlckZ1bmN0aW9uIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uU3luY1N0YXJ0IiwidGFza3MiLCJvblN5bmNGaW5pc2giLCJjbGVhbnVwRnJpZW5kbHlWaWV3cyIsIm9uRm9ybVNhdmUiLCJvbGRGb3JtIiwibmV3Rm9ybSIsInVwZGF0ZUZvcm0iLCJvbkZvcm1EZWxldGUiLCJfaWQiLCJyb3dfaWQiLCJfbmFtZSIsImVsZW1lbnRzIiwiX2VsZW1lbnRzSlNPTiIsIm9uUmVjb3JkU2F2ZSIsInJlY29yZCIsInVwZGF0ZVJlY29yZCIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJwZ2RiIiwicmVjb3JkVmFsdWVPcHRpb25zIiwibWFwIiwibyIsImpvaW4iLCJvblBob3RvU2F2ZSIsInBob3RvIiwidXBkYXRlUGhvdG8iLCJvblZpZGVvU2F2ZSIsInZpZGVvIiwidXBkYXRlVmlkZW8iLCJvbkF1ZGlvU2F2ZSIsImF1ZGlvIiwidXBkYXRlQXVkaW8iLCJvbkNoYW5nZXNldFNhdmUiLCJjaGFuZ2VzZXQiLCJ1cGRhdGVDaGFuZ2VzZXQiLCJvbkNob2ljZUxpc3RTYXZlIiwiY2hvaWNlTGlzdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsImNsYXNzaWZpY2F0aW9uU2V0IiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwicHJvamVjdCIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwicm9sZSIsInVwZGF0ZVJvbGUiLCJvbk1lbWJlcnNoaXBTYXZlIiwibWVtYmVyc2hpcCIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJkYXRhU2NoZW1hIiwidGFibGVOYW1lcyIsInJlbG9hZFZpZXdMaXN0Iiwidmlld1NjaGVtYSIsInZpZXdOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwic3lzdGVtVmFsdWVzIiwic3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkaXNhYmxlQXJyYXlzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImludGVncml0eVdhcm5pbmciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInByb2dyZXNzIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU2NoZW1hVmlld3MiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwicGdBcnJheXMiLCJwZ1NpbXBsZVR5cGVzIiwiaGFuZGxlciIsInRyaW1JZGVudGlmaWVyIiwiaWRlbnRpZmllciIsInN1YnN0cmluZyIsImVzY2FwZUlkZW50aWZpZXIiLCJpZGVudCIsInVzZVN5bmNFdmVudHMiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwicmVxdWlyZSIsImFwcCIsIlBvb2wiLCJvbiIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJvYmplY3QiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJ3YXJuIiwic3RhY2siLCJzY2hlbWEiLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJkYXRhTmFtZSIsInByZWZpeCIsImtleSIsIm9iamVjdE5hbWUiLCJiZWZvcmVTeW5jIiwiYWZ0ZXJTeW5jIiwiZmluZEVhY2hSZWNvcmQiLCJhY3RpdmVWaWV3TmFtZXMiLCJwdXNoIiwicmVtb3ZlIiwicHJlcGFyZU1pZ3JhdGlvblNjcmlwdCIsImZpbmRFYWNoUGhvdG8iLCJmaW5kRWFjaFZpZGVvIiwiZmluZEVhY2hBdWRpbyIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hQcm9qZWN0IiwiZmluZEVhY2hGb3JtIiwiZmluZEVhY2hNZW1iZXJzaGlwIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCIsIm1heWJlUnVuTWlncmF0aW9ucyIsIm1pZ3JhdGlvbnMiLCJtYXliZVJ1bk1pZ3JhdGlvbiIsInZlcnNpb24iLCJwb3B1bGF0ZVJlY29yZHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztJQUlZQSxHOztBQUhaOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7O0FBRUEsTUFBTUMsd0JBQXdCLEVBQTlCOztBQUVBLE1BQU1DLGtCQUFrQjtBQUN0QkMsWUFBVSxZQURZO0FBRXRCQyxRQUFNLFdBRmdCO0FBR3RCQyxRQUFNLElBSGdCO0FBSXRCQyxPQUFLLEVBSmlCO0FBS3RCQyxxQkFBbUI7QUFMRyxDQUF4Qjs7QUFRQSxNQUFNQyxhQUFhO0FBQ2pCLDBCQURpQjtBQUVqQiwwQkFGaUI7QUFHakI7QUFIaUIsQ0FBbkI7O0FBTUEsTUFBTUMsaUJBQWlCLFFBQXZCOztrQkFFZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQXNIbkJDLFVBdEhtQixxQkFzSE4sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxVQUFJQyxRQUFRQyxJQUFSLENBQWFDLE1BQWpCLEVBQXlCO0FBQ3ZCLGNBQU0sTUFBS0MsZ0JBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSUgsUUFBUUMsSUFBUixDQUFhRyxPQUFqQixFQUEwQjtBQUN4QixjQUFNLE1BQUtDLGFBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsWUFBTUMsVUFBVSxNQUFNTixRQUFRTyxZQUFSLENBQXFCUCxRQUFRQyxJQUFSLENBQWFPLEdBQWxDLENBQXRCOztBQUVBLFVBQUlGLE9BQUosRUFBYTtBQUNYLFlBQUlOLFFBQVFDLElBQVIsQ0FBYVEsa0JBQWpCLEVBQXFDO0FBQ25DLGdCQUFNLE1BQUtDLGlCQUFMLENBQXVCSixPQUF2QixDQUFOO0FBQ0E7QUFDRDs7QUFFRCxjQUFNLE1BQUtLLG9CQUFMLEVBQU47O0FBRUEsY0FBTUMsUUFBUSxNQUFNTixRQUFRTyxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLGFBQUssTUFBTUMsSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEIsY0FBSVosUUFBUUMsSUFBUixDQUFhYyxNQUFiLElBQXVCRCxLQUFLRSxFQUFMLEtBQVloQixRQUFRQyxJQUFSLENBQWFjLE1BQXBELEVBQTREO0FBQzFEO0FBQ0Q7O0FBRUQsY0FBSWYsUUFBUUMsSUFBUixDQUFhZ0Isa0JBQWpCLEVBQXFDO0FBQ25DLGtCQUFNLE1BQUtDLG9CQUFMLENBQTBCSixJQUExQixFQUFnQ1IsT0FBaEMsQ0FBTjtBQUNELFdBRkQsTUFFTztBQUNMLGtCQUFNLE1BQUthLFdBQUwsQ0FBaUJMLElBQWpCLEVBQXVCUixPQUF2QixFQUFnQyxVQUFDYyxLQUFELEVBQVc7QUFDL0Msb0JBQUtDLFlBQUwsQ0FBa0JQLEtBQUtRLElBQUwsQ0FBVUMsS0FBVixHQUFrQixLQUFsQixHQUEwQkgsTUFBTUksUUFBTixHQUFpQkMsR0FBM0MsR0FBaUQsVUFBbkU7QUFDRCxhQUZLLENBQU47QUFHRDs7QUFFREMsa0JBQVFDLEdBQVIsQ0FBWSxFQUFaO0FBQ0Q7O0FBRUQsY0FBTSxNQUFLQyxtQkFBTCxFQUFOO0FBQ0QsT0EzQkQsTUEyQk87QUFDTEYsZ0JBQVFHLEtBQVIsQ0FBYyx3QkFBZCxFQUF3QzdCLFFBQVFDLElBQVIsQ0FBYU8sR0FBckQ7QUFDRDtBQUNGLEtBbktrQjs7QUFBQSxTQXlRbkJzQixHQXpRbUIsR0F5UVpDLEdBQUQsSUFBUztBQUNiQSxZQUFNQSxJQUFJQyxPQUFKLENBQVksS0FBWixFQUFtQixFQUFuQixDQUFOOztBQUVBLFVBQUloQyxRQUFRQyxJQUFSLENBQWFnQyxLQUFqQixFQUF3QjtBQUN0QlAsZ0JBQVFDLEdBQVIsQ0FBWUksR0FBWjtBQUNEOztBQUVELGFBQU8sSUFBSUcsT0FBSixDQUFZLENBQUNDLE9BQUQsRUFBVUMsTUFBVixLQUFxQjtBQUN0QyxhQUFLQyxJQUFMLENBQVVDLEtBQVYsQ0FBZ0JQLEdBQWhCLEVBQXFCLEVBQXJCLEVBQXlCLENBQUNRLEdBQUQsRUFBTUMsR0FBTixLQUFjO0FBQ3JDLGNBQUlELEdBQUosRUFBUztBQUNQLG1CQUFPSCxPQUFPRyxHQUFQLENBQVA7QUFDRDs7QUFFRCxpQkFBT0osUUFBUUssSUFBSUMsSUFBWixDQUFQO0FBQ0QsU0FORDtBQU9ELE9BUk0sQ0FBUDtBQVNELEtBelJrQjs7QUFBQSxTQTJSbkJkLEdBM1JtQixHQTJSYixDQUFDLEdBQUcxQixJQUFKLEtBQWE7QUFDakI7QUFDRCxLQTdSa0I7O0FBQUEsU0ErUm5CeUMsU0EvUm1CLEdBK1JQLENBQUNwQyxPQUFELEVBQVVnQixJQUFWLEtBQW1CO0FBQzdCLGFBQU8sYUFBYWhCLFFBQVFxQyxLQUFyQixHQUE2QixHQUE3QixHQUFtQ3JCLElBQTFDO0FBQ0QsS0FqU2tCOztBQUFBLFNBbVNuQnNCLFdBblNtQjtBQUFBLG9DQW1TTCxXQUFPLEVBQUN0QyxPQUFELEVBQVV1QyxLQUFWLEVBQVAsRUFBNEI7QUFDeEMsY0FBTSxNQUFLbEMsb0JBQUwsRUFBTjtBQUNELE9BclNrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQXVTbkJtQyxZQXZTbUI7QUFBQSxvQ0F1U0osV0FBTyxFQUFDeEMsT0FBRCxFQUFQLEVBQXFCO0FBQ2xDLGNBQU0sTUFBS3lDLG9CQUFMLENBQTBCekMsT0FBMUIsQ0FBTjtBQUNBLGNBQU0sTUFBS3NCLG1CQUFMLEVBQU47QUFDRCxPQTFTa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0E0U25Cb0IsVUE1U21CO0FBQUEsb0NBNFNOLFdBQU8sRUFBQ2xDLElBQUQsRUFBT1IsT0FBUCxFQUFnQjJDLE9BQWhCLEVBQXlCQyxPQUF6QixFQUFQLEVBQTZDO0FBQ3hELGNBQU0sTUFBS0MsVUFBTCxDQUFnQnJDLElBQWhCLEVBQXNCUixPQUF0QixFQUErQjJDLE9BQS9CLEVBQXdDQyxPQUF4QyxDQUFOO0FBQ0QsT0E5U2tCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBZ1RuQkUsWUFoVG1CO0FBQUEsb0NBZ1RKLFdBQU8sRUFBQ3RDLElBQUQsRUFBT1IsT0FBUCxFQUFQLEVBQTJCO0FBQ3hDLGNBQU0yQyxVQUFVO0FBQ2RqQyxjQUFJRixLQUFLdUMsR0FESztBQUVkQyxrQkFBUXhDLEtBQUs2QixLQUZDO0FBR2RyQixnQkFBTVIsS0FBS3lDLEtBSEc7QUFJZEMsb0JBQVUxQyxLQUFLMkM7QUFKRCxTQUFoQjs7QUFPQSxjQUFNLE1BQUtOLFVBQUwsQ0FBZ0JyQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IyQyxPQUEvQixFQUF3QyxJQUF4QyxDQUFOO0FBQ0QsT0F6VGtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBMlRuQlMsWUEzVG1CO0FBQUEsb0NBMlRKLFdBQU8sRUFBQ0MsTUFBRCxFQUFTckQsT0FBVCxFQUFQLEVBQTZCO0FBQzFDLGNBQU0sTUFBS3NELFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCckQsT0FBMUIsQ0FBTjtBQUNELE9BN1RrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQStUbkJ1RCxjQS9UbUI7QUFBQSxvQ0ErVEYsV0FBTyxFQUFDRixNQUFELEVBQVAsRUFBb0I7QUFDbkMsY0FBTUcsYUFBYSwyQ0FBcUJDLHlCQUFyQixDQUErQyxNQUFLQyxJQUFwRCxFQUEwREwsTUFBMUQsRUFBa0VBLE9BQU83QyxJQUF6RSxFQUErRSxNQUFLbUQsa0JBQXBGLENBQW5COztBQUVBLGNBQU0sTUFBS25DLEdBQUwsQ0FBU2dDLFdBQVdJLEdBQVgsQ0FBZTtBQUFBLGlCQUFLQyxFQUFFcEMsR0FBUDtBQUFBLFNBQWYsRUFBMkJxQyxJQUEzQixDQUFnQyxJQUFoQyxDQUFULENBQU47QUFDRCxPQW5Va0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FxVW5CQyxXQXJVbUI7QUFBQSxvQ0FxVUwsV0FBTyxFQUFDQyxLQUFELEVBQVFoRSxPQUFSLEVBQVAsRUFBNEI7QUFDeEMsY0FBTSxNQUFLaUUsV0FBTCxDQUFpQkQsS0FBakIsRUFBd0JoRSxPQUF4QixDQUFOO0FBQ0QsT0F2VWtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBeVVuQmtFLFdBelVtQjtBQUFBLG9DQXlVTCxXQUFPLEVBQUNDLEtBQUQsRUFBUW5FLE9BQVIsRUFBUCxFQUE0QjtBQUN4QyxjQUFNLE1BQUtvRSxXQUFMLENBQWlCRCxLQUFqQixFQUF3Qm5FLE9BQXhCLENBQU47QUFDRCxPQTNVa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0E2VW5CcUUsV0E3VW1CO0FBQUEscUNBNlVMLFdBQU8sRUFBQ0MsS0FBRCxFQUFRdEUsT0FBUixFQUFQLEVBQTRCO0FBQ3hDLGNBQU0sTUFBS3VFLFdBQUwsQ0FBaUJELEtBQWpCLEVBQXdCdEUsT0FBeEIsQ0FBTjtBQUNELE9BL1VrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQWlWbkJ3RSxlQWpWbUI7QUFBQSxxQ0FpVkQsV0FBTyxFQUFDQyxTQUFELEVBQVl6RSxPQUFaLEVBQVAsRUFBZ0M7QUFDaEQsY0FBTSxNQUFLMEUsZUFBTCxDQUFxQkQsU0FBckIsRUFBZ0N6RSxPQUFoQyxDQUFOO0FBQ0QsT0FuVmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBcVZuQjJFLGdCQXJWbUI7QUFBQSxxQ0FxVkEsV0FBTyxFQUFDQyxVQUFELEVBQWE1RSxPQUFiLEVBQVAsRUFBaUM7QUFDbEQsY0FBTSxNQUFLNkUsZ0JBQUwsQ0FBc0JELFVBQXRCLEVBQWtDNUUsT0FBbEMsQ0FBTjtBQUNELE9BdlZrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQXlWbkI4RSx1QkF6Vm1CO0FBQUEscUNBeVZPLFdBQU8sRUFBQ0MsaUJBQUQsRUFBb0IvRSxPQUFwQixFQUFQLEVBQXdDO0FBQ2hFLGNBQU0sTUFBS2dGLHVCQUFMLENBQTZCRCxpQkFBN0IsRUFBZ0QvRSxPQUFoRCxDQUFOO0FBQ0QsT0EzVmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBNlZuQmlGLGFBN1ZtQjtBQUFBLHFDQTZWSCxXQUFPLEVBQUNDLE9BQUQsRUFBVWxGLE9BQVYsRUFBUCxFQUE4QjtBQUM1QyxjQUFNLE1BQUttRixhQUFMLENBQW1CRCxPQUFuQixFQUE0QmxGLE9BQTVCLENBQU47QUFDRCxPQS9Wa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FpV25Cb0YsVUFqV21CO0FBQUEscUNBaVdOLFdBQU8sRUFBQ0MsSUFBRCxFQUFPckYsT0FBUCxFQUFQLEVBQTJCO0FBQ3RDLGNBQU0sTUFBS3NGLFVBQUwsQ0FBZ0JELElBQWhCLEVBQXNCckYsT0FBdEIsQ0FBTjtBQUNELE9BbldrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQXFXbkJ1RixnQkFyV21CO0FBQUEscUNBcVdBLFdBQU8sRUFBQ0MsVUFBRCxFQUFheEYsT0FBYixFQUFQLEVBQWlDO0FBQ2xELGNBQU0sTUFBS3lGLGdCQUFMLENBQXNCRCxVQUF0QixFQUFrQ3hGLE9BQWxDLENBQU47QUFDRCxPQXZXa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0E0YW5CMEYsZUE1YW1CLHFCQTRhRCxhQUFZO0FBQzVCLFlBQU12RCxPQUFPLE1BQU0sTUFBS1gsR0FBTCxDQUFVLGdGQUFnRixNQUFLbUUsVUFBWSxHQUEzRyxDQUFuQjs7QUFFQSxZQUFLQyxVQUFMLEdBQWtCekQsS0FBS3lCLEdBQUwsQ0FBUztBQUFBLGVBQUtDLEVBQUU3QyxJQUFQO0FBQUEsT0FBVCxDQUFsQjtBQUNELEtBaGJrQjtBQUFBLFNBa2JuQjZFLGNBbGJtQixxQkFrYkYsYUFBWTtBQUMzQixZQUFNMUQsT0FBTyxNQUFNLE1BQUtYLEdBQUwsQ0FBVSxnRkFBZ0YsTUFBS3NFLFVBQVksR0FBM0csQ0FBbkI7QUFDQSxZQUFLQyxTQUFMLEdBQWlCNUQsS0FBS3lCLEdBQUwsQ0FBUztBQUFBLGVBQUtDLEVBQUU3QyxJQUFQO0FBQUEsT0FBVCxDQUFqQjtBQUNELEtBcmJrQjs7QUFBQSxTQXVibkJnRixZQXZibUIsR0F1YkosTUFBTSxDQUNwQixDQXhia0I7O0FBQUEsU0EwYm5CQyxjQTFibUIsR0EwYkR2RixFQUFELElBQVE7QUFDdkIsYUFBUSxHQUFHLEtBQUtzRixZQUFjLFdBQVd0RixFQUFJLE1BQTdDO0FBQ0QsS0E1YmtCOztBQUFBLFNBOGJuQndGLGNBOWJtQixHQThiRHhGLEVBQUQsSUFBUTtBQUN2QixhQUFRLEdBQUcsS0FBS3NGLFlBQWMsV0FBV3RGLEVBQUksTUFBN0M7QUFDRCxLQWhja0I7O0FBQUEsU0FrY25CeUYsY0FsY21CLEdBa2NEekYsRUFBRCxJQUFRO0FBQ3ZCLGFBQVEsR0FBRyxLQUFLc0YsWUFBYyxVQUFVdEYsRUFBSSxNQUE1QztBQUNELEtBcGNrQjs7QUFBQSxTQTJoQm5CNEMsWUEzaEJtQjtBQUFBLHFDQTJoQkosV0FBT0QsTUFBUCxFQUFlckQsT0FBZixFQUF3Qm9HLGNBQXhCLEVBQTJDO0FBQ3hELFlBQUksQ0FBQ0EsY0FBRCxJQUFtQixDQUFDLE1BQUtDLGVBQUwsQ0FBcUJoRCxPQUFPN0MsSUFBNUIsQ0FBeEIsRUFBMkQ7QUFDekQsZ0JBQU0sTUFBS0ssV0FBTCxDQUFpQndDLE9BQU83QyxJQUF4QixFQUE4QlIsT0FBOUIsRUFBdUMsWUFBTSxDQUFFLENBQS9DLENBQU47QUFDRDs7QUFFRCxZQUFJLE1BQUtzRyxjQUFMLElBQXVCLE1BQUtBLGNBQUwsQ0FBb0JDLGtCQUEzQyxJQUFpRSxDQUFDLE1BQUtELGNBQUwsQ0FBb0JDLGtCQUFwQixDQUF1QyxFQUFDbEQsTUFBRCxFQUFTckQsT0FBVCxFQUF2QyxDQUF0RSxFQUFpSTtBQUMvSDtBQUNEOztBQUVELGNBQU13RCxhQUFhLDJDQUFxQmdELHlCQUFyQixDQUErQyxNQUFLOUMsSUFBcEQsRUFBMERMLE1BQTFELEVBQWtFLE1BQUtNLGtCQUF2RSxDQUFuQjs7QUFFQSxjQUFNLE1BQUtuQyxHQUFMLENBQVNnQyxXQUFXSSxHQUFYLENBQWU7QUFBQSxpQkFBS0MsRUFBRXBDLEdBQVA7QUFBQSxTQUFmLEVBQTJCcUMsSUFBM0IsQ0FBZ0MsSUFBaEMsQ0FBVCxDQUFOOztBQUVBLGNBQU0yQyxlQUFlLDJDQUFxQkMsNEJBQXJCLENBQWtEckQsTUFBbEQsRUFBMEQsSUFBMUQsRUFBZ0VBLE1BQWhFLGVBQTRFLE1BQUtNLGtCQUFqRjtBQUN5RWdELCtCQUFxQixLQUQ5RixJQUFyQjs7QUFHQSxjQUFNLE1BQUtDLFlBQUwsQ0FBa0Isb0JBQVV2RCxNQUFWLENBQWlCQSxNQUFqQixFQUF5Qm9ELFlBQXpCLENBQWxCLEVBQTBELFNBQTFELENBQU47QUFDRCxPQTVpQmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBOGlCbkJKLGVBOWlCbUIsR0E4aUJBN0YsSUFBRCxJQUFVO0FBQzFCLGFBQU8sS0FBS29GLFVBQUwsQ0FBZ0JpQixPQUFoQixDQUF3QiwyQ0FBcUJDLGlCQUFyQixDQUF1Q3RHLElBQXZDLENBQXhCLE1BQTBFLENBQUMsQ0FBbEY7QUFDRCxLQWhqQmtCOztBQUFBLFNBa2pCbkJ1RyxrQkFsakJtQjtBQUFBLHFDQWtqQkUsV0FBT3ZHLElBQVAsRUFBYVIsT0FBYixFQUF5QjtBQUM1QyxZQUFJO0FBQ0YsZ0JBQU0sTUFBSzZDLFVBQUwsQ0FBZ0JyQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IsTUFBS2dILFdBQUwsQ0FBaUJ4RyxJQUFqQixDQUEvQixFQUF1RCxJQUF2RCxDQUFOO0FBQ0QsU0FGRCxDQUVFLE9BQU95RyxFQUFQLEVBQVc7QUFDWCxjQUFJdkgsUUFBUUMsSUFBUixDQUFhZ0MsS0FBakIsRUFBd0I7QUFDdEJQLG9CQUFRRyxLQUFSLENBQWNFLEdBQWQ7QUFDRDtBQUNGOztBQUVELGNBQU0sTUFBS29CLFVBQUwsQ0FBZ0JyQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IsSUFBL0IsRUFBcUMsTUFBS2dILFdBQUwsQ0FBaUJ4RyxJQUFqQixDQUFyQyxDQUFOO0FBQ0QsT0E1akJrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQThqQm5CcUMsVUE5akJtQjtBQUFBLHFDQThqQk4sV0FBT3JDLElBQVAsRUFBYVIsT0FBYixFQUFzQjJDLE9BQXRCLEVBQStCQyxPQUEvQixFQUEyQztBQUN0RCxZQUFJLE1BQUswRCxjQUFMLElBQXVCLE1BQUtBLGNBQUwsQ0FBb0JZLGdCQUEzQyxJQUErRCxDQUFDLE1BQUtaLGNBQUwsQ0FBb0JZLGdCQUFwQixDQUFxQyxFQUFDMUcsSUFBRCxFQUFPUixPQUFQLEVBQXJDLENBQXBFLEVBQTJIO0FBQ3pIO0FBQ0Q7O0FBRUQsWUFBSTtBQUNGLGdCQUFNLE1BQUttSCxnQkFBTCxDQUFzQjNHLElBQXRCLEVBQTRCUixPQUE1QixDQUFOOztBQUVBLGNBQUksQ0FBQyxNQUFLcUcsZUFBTCxDQUFxQjdGLElBQXJCLENBQUQsSUFBK0JvQyxXQUFXLElBQTlDLEVBQW9EO0FBQ2xERCxzQkFBVSxJQUFWO0FBQ0Q7O0FBRUQsZ0JBQU0sRUFBQ2EsVUFBRCxLQUFlLE1BQU0saUJBQWU0RCx3QkFBZixDQUF3Q3BILE9BQXhDLEVBQWlEMkMsT0FBakQsRUFBMERDLE9BQTFELEVBQW1FLE1BQUt5RSxhQUF4RSxFQUN6QixNQUFLVixtQkFEb0IsRUFDQyxNQUFLTCxjQUROLEVBQ3NCLE1BQUtYLFVBRDNCLENBQTNCOztBQUdBLGdCQUFNLE1BQUsyQixnQkFBTCxDQUFzQjlHLElBQXRCLEVBQTRCLElBQTVCLENBQU47O0FBRUEsZUFBSyxNQUFNK0csVUFBWCxJQUF5Qi9HLEtBQUtnSCxjQUFMLENBQW9CLFlBQXBCLENBQXpCLEVBQTREO0FBQzFELGtCQUFNLE1BQUtGLGdCQUFMLENBQXNCOUcsSUFBdEIsRUFBNEIrRyxVQUE1QixDQUFOO0FBQ0Q7O0FBRUQsZ0JBQU0sTUFBSy9GLEdBQUwsQ0FBUyxDQUFDLG9CQUFELEVBQ0MsR0FBR2dDLFVBREosRUFFQyxxQkFGRCxFQUV3Qk0sSUFGeEIsQ0FFNkIsSUFGN0IsQ0FBVCxDQUFOOztBQUlBLGNBQUlsQixPQUFKLEVBQWE7QUFDWCxrQkFBTSxNQUFLNkUsa0JBQUwsQ0FBd0JqSCxJQUF4QixFQUE4QixJQUE5QixDQUFOOztBQUVBLGlCQUFLLE1BQU0rRyxVQUFYLElBQXlCL0csS0FBS2dILGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsb0JBQU0sTUFBS0Msa0JBQUwsQ0FBd0JqSCxJQUF4QixFQUE4QitHLFVBQTlCLENBQU47QUFDRDtBQUNGO0FBQ0YsU0EzQkQsQ0EyQkUsT0FBT04sRUFBUCxFQUFXO0FBQ1gsZ0JBQUtTLGdCQUFMLENBQXNCVCxFQUF0QjtBQUNBLGdCQUFNQSxFQUFOO0FBQ0Q7QUFDRixPQWxtQmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBc3RCbkJELFdBdHRCbUIsR0FzdEJKeEcsSUFBRCxJQUFVO0FBQ3RCLFVBQUlBLFFBQVEsSUFBWixFQUFrQjtBQUNoQixlQUFPLElBQVA7QUFDRDs7QUFFRCxhQUFPO0FBQ0xFLFlBQUlGLEtBQUt1QyxHQURKO0FBRUxDLGdCQUFReEMsS0FBSzZCLEtBRlI7QUFHTHJCLGNBQU1SLEtBQUt5QyxLQUhOO0FBSUxDLGtCQUFVMUMsS0FBSzJDO0FBSlYsT0FBUDtBQU1ELEtBanVCa0I7O0FBQUEsU0FtdUJuQnBDLFlBbnVCbUIsR0FtdUJINEcsT0FBRCxJQUFhO0FBQzFCLFVBQUlDLFFBQVFDLE1BQVIsQ0FBZUMsS0FBbkIsRUFBMEI7QUFDeEJGLGdCQUFRQyxNQUFSLENBQWVFLFNBQWY7QUFDQUgsZ0JBQVFDLE1BQVIsQ0FBZUcsUUFBZixDQUF3QixDQUF4QjtBQUNBSixnQkFBUUMsTUFBUixDQUFlSSxLQUFmLENBQXFCTixPQUFyQjtBQUNEO0FBQ0YsS0F6dUJrQjs7QUFBQSxTQW00Qm5CTyxRQW40Qm1CLEdBbTRCUixDQUFDbEgsSUFBRCxFQUFPRixLQUFQLEtBQWlCO0FBQzFCLFdBQUtDLFlBQUwsQ0FBa0JDLEtBQUtDLEtBQUwsR0FBYSxLQUFiLEdBQXFCSCxNQUFNSSxRQUFOLEdBQWlCQyxHQUF4RDtBQUNELEtBcjRCa0I7QUFBQTs7QUFDYmdILE1BQU4sQ0FBV0MsR0FBWCxFQUFnQjtBQUFBOztBQUFBO0FBQ2QsYUFBT0EsSUFBSUMsT0FBSixDQUFZO0FBQ2pCQSxpQkFBUyxVQURRO0FBRWpCQyxjQUFNLG1EQUZXO0FBR2pCQyxpQkFBUztBQUNQQyxzQkFBWTtBQUNWRixrQkFBTSwwQkFESTtBQUVWRyxrQkFBTSxRQUZJO0FBR1ZDLHFCQUFTMUosZ0JBQWdCQztBQUhmLFdBREw7QUFNUDBKLGtCQUFRO0FBQ05MLGtCQUFNLHdCQURBO0FBRU5HLGtCQUFNLFFBRkE7QUFHTkMscUJBQVMxSixnQkFBZ0JFO0FBSG5CLFdBTkQ7QUFXUDBKLGtCQUFRO0FBQ05OLGtCQUFNLHdCQURBO0FBRU5HLGtCQUFNLFNBRkE7QUFHTkMscUJBQVMxSixnQkFBZ0JHO0FBSG5CLFdBWEQ7QUFnQlAwSixrQkFBUTtBQUNOUCxrQkFBTSxpQkFEQTtBQUVORyxrQkFBTTtBQUZBLFdBaEJEO0FBb0JQSyxzQkFBWTtBQUNWUixrQkFBTSxxQkFESTtBQUVWRyxrQkFBTTtBQUZJLFdBcEJMO0FBd0JQTSxvQkFBVTtBQUNSVCxrQkFBTSxtQkFERTtBQUVSRyxrQkFBTTtBQUZFLFdBeEJIO0FBNEJQTyx5QkFBZTtBQUNiVixrQkFBTSwwQ0FETztBQUViRyxrQkFBTTtBQUZPLFdBNUJSO0FBZ0NQUSx3QkFBYztBQUNaWCxrQkFBTSxzQkFETTtBQUVaRyxrQkFBTSxTQUZNO0FBR1pDLHFCQUFTO0FBSEcsV0FoQ1A7QUFxQ1BRLDRCQUFrQjtBQUNoQlosa0JBQU0sb0NBRFU7QUFFaEJHLGtCQUFNO0FBRlUsV0FyQ1g7QUF5Q1BVLDJCQUFpQjtBQUNmYixrQkFBTSxtQ0FEUztBQUVmRyxrQkFBTTtBQUZTLFdBekNWO0FBNkNQdkksZUFBSztBQUNIb0ksa0JBQU0sbUJBREg7QUFFSGMsc0JBQVUsSUFGUDtBQUdIWCxrQkFBTTtBQUhILFdBN0NFO0FBa0RQaEksa0JBQVE7QUFDTjZILGtCQUFNLHdCQURBO0FBRU5HLGtCQUFNO0FBRkEsV0FsREQ7QUFzRFBZLDJCQUFpQjtBQUNmZixrQkFBTSxpQkFEUztBQUVmRyxrQkFBTTtBQUZTLFdBdERWO0FBMERQYSwwQkFBZ0I7QUFDZGhCLGtCQUFNLGdCQURRO0FBRWRHLGtCQUFNO0FBRlEsV0ExRFQ7QUE4RFBjLDZCQUFtQjtBQUNqQmpCLGtCQUFNLDJFQURXO0FBRWpCYyxzQkFBVSxLQUZPO0FBR2pCWCxrQkFBTSxTQUhXO0FBSWpCQyxxQkFBUztBQUpRLFdBOURaO0FBb0VQL0gsOEJBQW9CO0FBQ2xCMkgsa0JBQU0sd0JBRFk7QUFFbEJjLHNCQUFVLEtBRlE7QUFHbEJYLGtCQUFNLFNBSFk7QUFJbEJDLHFCQUFTO0FBSlMsV0FwRWI7QUEwRVBwQywwQkFBZ0I7QUFDZGdDLGtCQUFNLDhDQURRO0FBRWRjLHNCQUFVLEtBRkk7QUFHZFgsa0JBQU07QUFIUSxXQTFFVDtBQStFUDNJLG1CQUFTO0FBQ1B3SSxrQkFBTSxvQkFEQztBQUVQYyxzQkFBVSxLQUZIO0FBR1BYLGtCQUFNO0FBSEMsV0EvRUY7QUFvRlA3SSxrQkFBUTtBQUNOMEksa0JBQU0sd0JBREE7QUFFTmMsc0JBQVUsS0FGSjtBQUdOWCxrQkFBTSxTQUhBO0FBSU5DLHFCQUFTO0FBSkgsV0FwRkQ7QUEwRlBjLG9CQUFVO0FBQ1JsQixrQkFBTSxtR0FERTtBQUVSYyxzQkFBVSxLQUZGO0FBR1JYLGtCQUFNLFNBSEU7QUFJUkMscUJBQVM7QUFKRCxXQTFGSDtBQWdHUGUseUJBQWU7QUFDYm5CLGtCQUFNLG1IQURPO0FBRWJjLHNCQUFVLEtBRkc7QUFHYlgsa0JBQU0sU0FITztBQUliQyxxQkFBUztBQUpJLFdBaEdSO0FBc0dQdkksOEJBQW9CO0FBQ2xCbUksa0JBQU0sZ0NBRFk7QUFFbEJjLHNCQUFVLEtBRlE7QUFHbEJYLGtCQUFNLFNBSFk7QUFJbEJDLHFCQUFTO0FBSlM7QUF0R2IsU0FIUTtBQWdIakJnQixpQkFBUyxPQUFLbEs7QUFoSEcsT0FBWixDQUFQO0FBRGM7QUFtSGY7O0FBaUREbUssaUJBQWVDLFVBQWYsRUFBMkI7QUFDekIsV0FBT0EsV0FBV0MsU0FBWCxDQUFxQixDQUFyQixFQUF3QjlLLHFCQUF4QixDQUFQO0FBQ0Q7O0FBRUQrSyxtQkFBaUJGLFVBQWpCLEVBQTZCO0FBQzNCLFdBQU9BLGNBQWMsS0FBS2xHLElBQUwsQ0FBVXFHLEtBQVYsQ0FBZ0IsS0FBS0osY0FBTCxDQUFvQkMsVUFBcEIsQ0FBaEIsQ0FBckI7QUFDRDs7QUFFRCxNQUFJSSxhQUFKLEdBQW9CO0FBQ2xCLFdBQU90SyxRQUFRQyxJQUFSLENBQWFzSixZQUFiLElBQTZCLElBQTdCLEdBQW9DdkosUUFBUUMsSUFBUixDQUFhc0osWUFBakQsR0FBZ0UsSUFBdkU7QUFDRDs7QUFFS3hKLFVBQU4sR0FBaUI7QUFBQTs7QUFBQTtBQUNmLFlBQU13Syx1QkFDRGpMLGVBREM7QUFFSkUsY0FBTVEsUUFBUUMsSUFBUixDQUFhZ0osTUFBYixJQUF1QjNKLGdCQUFnQkUsSUFGekM7QUFHSkMsY0FBTU8sUUFBUUMsSUFBUixDQUFhaUosTUFBYixJQUF1QjVKLGdCQUFnQkcsSUFIekM7QUFJSkYsa0JBQVVTLFFBQVFDLElBQVIsQ0FBYTZJLFVBQWIsSUFBMkJ4SixnQkFBZ0JDLFFBSmpEO0FBS0ppTCxjQUFNeEssUUFBUUMsSUFBUixDQUFha0osTUFBYixJQUF1QjdKLGdCQUFnQmtMLElBTHpDO0FBTUpDLGtCQUFVekssUUFBUUMsSUFBUixDQUFhbUosVUFBYixJQUEyQjlKLGdCQUFnQmtMO0FBTmpELFFBQU47O0FBU0EsVUFBSXhLLFFBQVFDLElBQVIsQ0FBYWtKLE1BQWpCLEVBQXlCO0FBQ3ZCb0IsZ0JBQVFDLElBQVIsR0FBZXhLLFFBQVFDLElBQVIsQ0FBYWtKLE1BQTVCO0FBQ0Q7O0FBRUQsVUFBSW5KLFFBQVFDLElBQVIsQ0FBYW1KLFVBQWpCLEVBQTZCO0FBQzNCbUIsZ0JBQVFFLFFBQVIsR0FBbUJ6SyxRQUFRQyxJQUFSLENBQWFtSixVQUFoQztBQUNEOztBQUVELFVBQUlwSixRQUFRQyxJQUFSLENBQWEyRyxjQUFqQixFQUFpQztBQUMvQixlQUFLQSxjQUFMLEdBQXNCOEQsUUFBUTFLLFFBQVFDLElBQVIsQ0FBYTJHLGNBQXJCLENBQXRCO0FBQ0EsZUFBS0EsY0FBTCxDQUFvQnhILEdBQXBCLEdBQTBCQSxHQUExQjtBQUNBLGVBQUt3SCxjQUFMLENBQW9CK0QsR0FBcEIsR0FBMEIzSyxPQUExQjtBQUNEOztBQUVELFVBQUlBLFFBQVFDLElBQVIsQ0FBYTZKLFFBQWIsS0FBMEIsS0FBOUIsRUFBcUM7QUFDbkMsZUFBS25DLGFBQUwsR0FBcUIsSUFBckI7QUFDRDs7QUFFRCxVQUFJM0gsUUFBUUMsSUFBUixDQUFhOEosYUFBYixLQUErQixJQUFuQyxFQUF5QztBQUN2QyxlQUFLOUMsbUJBQUwsR0FBMkIsSUFBM0I7QUFDRDs7QUFFRCxhQUFLNUUsSUFBTCxHQUFZLElBQUksYUFBR3VJLElBQVAsQ0FBWUwsT0FBWixDQUFaOztBQUVBLFVBQUksT0FBS0QsYUFBVCxFQUF3QjtBQUN0QnRLLGdCQUFRNkssRUFBUixDQUFXLFlBQVgsRUFBeUIsT0FBS2pJLFdBQTlCO0FBQ0E1QyxnQkFBUTZLLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUsvSCxZQUEvQjtBQUNBOUMsZ0JBQVE2SyxFQUFSLENBQVcsWUFBWCxFQUF5QixPQUFLeEcsV0FBOUI7QUFDQXJFLGdCQUFRNkssRUFBUixDQUFXLFlBQVgsRUFBeUIsT0FBS3JHLFdBQTlCO0FBQ0F4RSxnQkFBUTZLLEVBQVIsQ0FBVyxZQUFYLEVBQXlCLE9BQUtsRyxXQUE5QjtBQUNBM0UsZ0JBQVE2SyxFQUFSLENBQVcsZ0JBQVgsRUFBNkIsT0FBSy9GLGVBQWxDO0FBQ0E5RSxnQkFBUTZLLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUtuSCxZQUEvQjtBQUNBMUQsZ0JBQVE2SyxFQUFSLENBQVcsZUFBWCxFQUE0QixPQUFLaEgsY0FBakM7O0FBRUE3RCxnQkFBUTZLLEVBQVIsQ0FBVyxrQkFBWCxFQUErQixPQUFLNUYsZ0JBQXBDO0FBQ0FqRixnQkFBUTZLLEVBQVIsQ0FBVyxvQkFBWCxFQUFpQyxPQUFLNUYsZ0JBQXRDOztBQUVBakYsZ0JBQVE2SyxFQUFSLENBQVcsV0FBWCxFQUF3QixPQUFLN0gsVUFBN0I7QUFDQWhELGdCQUFRNkssRUFBUixDQUFXLGFBQVgsRUFBMEIsT0FBSzdILFVBQS9COztBQUVBaEQsZ0JBQVE2SyxFQUFSLENBQVcseUJBQVgsRUFBc0MsT0FBS3pGLHVCQUEzQztBQUNBcEYsZ0JBQVE2SyxFQUFSLENBQVcsMkJBQVgsRUFBd0MsT0FBS3pGLHVCQUE3Qzs7QUFFQXBGLGdCQUFRNkssRUFBUixDQUFXLFdBQVgsRUFBd0IsT0FBS25GLFVBQTdCO0FBQ0ExRixnQkFBUTZLLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUtuRixVQUEvQjs7QUFFQTFGLGdCQUFRNkssRUFBUixDQUFXLGNBQVgsRUFBMkIsT0FBS3RGLGFBQWhDO0FBQ0F2RixnQkFBUTZLLEVBQVIsQ0FBVyxnQkFBWCxFQUE2QixPQUFLdEYsYUFBbEM7O0FBRUF2RixnQkFBUTZLLEVBQVIsQ0FBVyxpQkFBWCxFQUE4QixPQUFLaEYsZ0JBQW5DO0FBQ0E3RixnQkFBUTZLLEVBQVIsQ0FBVyxtQkFBWCxFQUFnQyxPQUFLaEYsZ0JBQXJDO0FBQ0Q7O0FBRUQsYUFBS08sVUFBTCxHQUFrQnBHLFFBQVFDLElBQVIsQ0FBYXFKLGFBQWIsSUFBOEJ6SixjQUFoRDtBQUNBLGFBQUtvRyxVQUFMLEdBQWtCakcsUUFBUUMsSUFBUixDQUFhb0osUUFBYixJQUF5QnhKLGNBQTNDOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBTTRDLE9BQU8sTUFBTSxPQUFLWCxHQUFMLENBQVUsZ0ZBQWdGLE9BQUttRSxVQUFZLEdBQTNHLENBQW5COztBQUVBLGFBQUtDLFVBQUwsR0FBa0J6RCxLQUFLeUIsR0FBTCxDQUFTO0FBQUEsZUFBS0MsRUFBRTdDLElBQVA7QUFBQSxPQUFULENBQWxCOztBQUVBO0FBQ0EsYUFBSzBDLElBQUwsR0FBWSxtQ0FBYSxFQUFiLENBQVo7O0FBRUEsYUFBSzhHLFlBQUw7O0FBRUEsWUFBTSxPQUFLQyxlQUFMLEVBQU47QUEvRWU7QUFnRmhCOztBQUVLQyxZQUFOLEdBQW1CO0FBQUE7O0FBQUE7QUFDakIsVUFBSSxPQUFLM0ksSUFBVCxFQUFlO0FBQ2IsY0FBTSxPQUFLQSxJQUFMLENBQVU0SSxHQUFWLEVBQU47QUFDRDtBQUhnQjtBQUlsQjs7QUFrR0sxRyxhQUFOLENBQWtCMkcsTUFBbEIsRUFBMEI1SyxPQUExQixFQUFtQztBQUFBOztBQUFBO0FBQ2pDLFlBQU02SyxTQUFTLG9CQUFVN0csS0FBVixDQUFnQjRHLE1BQWhCLENBQWY7O0FBRUFDLGFBQU9DLElBQVAsR0FBYyxPQUFLN0UsY0FBTCxDQUFvQjRFLE9BQU9FLFVBQTNCLENBQWQ7O0FBRUEsWUFBTSxPQUFLbkUsWUFBTCxDQUFrQmlFLE1BQWxCLEVBQTBCLFFBQTFCLENBQU47QUFMaUM7QUFNbEM7O0FBRUt6RyxhQUFOLENBQWtCd0csTUFBbEIsRUFBMEI1SyxPQUExQixFQUFtQztBQUFBOztBQUFBO0FBQ2pDLFlBQU02SyxTQUFTLG9CQUFVMUcsS0FBVixDQUFnQnlHLE1BQWhCLENBQWY7O0FBRUFDLGFBQU9DLElBQVAsR0FBYyxPQUFLNUUsY0FBTCxDQUFvQjJFLE9BQU9FLFVBQTNCLENBQWQ7O0FBRUEsWUFBTSxPQUFLbkUsWUFBTCxDQUFrQmlFLE1BQWxCLEVBQTBCLFFBQTFCLENBQU47QUFMaUM7QUFNbEM7O0FBRUt0RyxhQUFOLENBQWtCcUcsTUFBbEIsRUFBMEI1SyxPQUExQixFQUFtQztBQUFBOztBQUFBO0FBQ2pDLFlBQU02SyxTQUFTLG9CQUFVdkcsS0FBVixDQUFnQnNHLE1BQWhCLENBQWY7O0FBRUFDLGFBQU9DLElBQVAsR0FBYyxPQUFLM0UsY0FBTCxDQUFvQjBFLE9BQU9FLFVBQTNCLENBQWQ7O0FBRUEsWUFBTSxPQUFLbkUsWUFBTCxDQUFrQmlFLE1BQWxCLEVBQTBCLE9BQTFCLENBQU47QUFMaUM7QUFNbEM7O0FBRUtuRyxpQkFBTixDQUFzQmtHLE1BQXRCLEVBQThCNUssT0FBOUIsRUFBdUM7QUFBQTs7QUFBQTtBQUNyQyxZQUFNLE9BQUs0RyxZQUFMLENBQWtCLG9CQUFVbkMsU0FBVixDQUFvQm1HLE1BQXBCLENBQWxCLEVBQStDLFlBQS9DLENBQU47QUFEcUM7QUFFdEM7O0FBRUt6RixlQUFOLENBQW9CeUYsTUFBcEIsRUFBNEI1SyxPQUE1QixFQUFxQztBQUFBOztBQUFBO0FBQ25DLFlBQU0sT0FBSzRHLFlBQUwsQ0FBa0Isb0JBQVUxQixPQUFWLENBQWtCMEYsTUFBbEIsQ0FBbEIsRUFBNkMsVUFBN0MsQ0FBTjtBQURtQztBQUVwQzs7QUFFS25GLGtCQUFOLENBQXVCbUYsTUFBdkIsRUFBK0I1SyxPQUEvQixFQUF3QztBQUFBOztBQUFBO0FBQ3RDLFlBQU0sUUFBSzRHLFlBQUwsQ0FBa0Isb0JBQVVwQixVQUFWLENBQXFCb0YsTUFBckIsQ0FBbEIsRUFBZ0QsYUFBaEQsQ0FBTjtBQURzQztBQUV2Qzs7QUFFS3RGLFlBQU4sQ0FBaUJzRixNQUFqQixFQUF5QjVLLE9BQXpCLEVBQWtDO0FBQUE7O0FBQUE7QUFDaEMsWUFBTSxRQUFLNEcsWUFBTCxDQUFrQixvQkFBVXZCLElBQVYsQ0FBZXVGLE1BQWYsQ0FBbEIsRUFBMEMsT0FBMUMsQ0FBTjtBQURnQztBQUVqQzs7QUFFS3pELGtCQUFOLENBQXVCeUQsTUFBdkIsRUFBK0I1SyxPQUEvQixFQUF3QztBQUFBOztBQUFBO0FBQ3RDLFlBQU0sUUFBSzRHLFlBQUwsQ0FBa0Isb0JBQVVwRyxJQUFWLENBQWVvSyxNQUFmLENBQWxCLEVBQTBDLE9BQTFDLENBQU47QUFEc0M7QUFFdkM7O0FBRUsvRixrQkFBTixDQUF1QitGLE1BQXZCLEVBQStCNUssT0FBL0IsRUFBd0M7QUFBQTs7QUFBQTtBQUN0QyxZQUFNLFFBQUs0RyxZQUFMLENBQWtCLG9CQUFVaEMsVUFBVixDQUFxQmdHLE1BQXJCLENBQWxCLEVBQWdELGNBQWhELENBQU47QUFEc0M7QUFFdkM7O0FBRUs1Rix5QkFBTixDQUE4QjRGLE1BQTlCLEVBQXNDNUssT0FBdEMsRUFBK0M7QUFBQTs7QUFBQTtBQUM3QyxZQUFNLFFBQUs0RyxZQUFMLENBQWtCLG9CQUFVN0IsaUJBQVYsQ0FBNEI2RixNQUE1QixDQUFsQixFQUF1RCxxQkFBdkQsQ0FBTjtBQUQ2QztBQUU5Qzs7QUFHS2hFLGNBQU4sQ0FBbUJpRSxNQUFuQixFQUEyQkcsS0FBM0IsRUFBa0M7QUFBQTs7QUFBQTtBQUNoQyxZQUFNQyxrQkFBa0IsUUFBS3ZILElBQUwsQ0FBVXVILGVBQVYsQ0FBMkIsR0FBRyxRQUFLdEYsVUFBWSxXQUFVcUYsS0FBTSxFQUEvRCxFQUFrRSxFQUFDRSxpQkFBaUJMLE9BQU9LLGVBQXpCLEVBQWxFLENBQXhCO0FBQ0EsWUFBTUMsa0JBQWtCLFFBQUt6SCxJQUFMLENBQVV5SCxlQUFWLENBQTJCLEdBQUcsUUFBS3hGLFVBQVksV0FBVXFGLEtBQU0sRUFBL0QsRUFBa0VILE1BQWxFLEVBQTBFLEVBQUNPLElBQUksSUFBTCxFQUExRSxDQUF4Qjs7QUFFQSxZQUFNM0osTUFBTSxDQUFFd0osZ0JBQWdCeEosR0FBbEIsRUFBdUIwSixnQkFBZ0IxSixHQUF2QyxFQUE2Q3FDLElBQTdDLENBQWtELElBQWxELENBQVo7O0FBRUEsVUFBSTtBQUNGLGNBQU0sUUFBS3RDLEdBQUwsQ0FBU0MsR0FBVCxDQUFOO0FBQ0QsT0FGRCxDQUVFLE9BQU93RixFQUFQLEVBQVc7QUFDWCxnQkFBS1MsZ0JBQUwsQ0FBc0JULEVBQXRCO0FBQ0EsY0FBTUEsRUFBTjtBQUNEO0FBWCtCO0FBWWpDOztBQTRCRFMsbUJBQWlCVCxFQUFqQixFQUFxQjtBQUNuQjdGLFlBQVFpSyxJQUFSLENBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBMEJmcEUsR0FBR1UsT0FBUzs7O0VBR1pWLEdBQUdxRSxLQUFPOztDQTdCSSxDQStCZm5LLEdBL0JFO0FBaUNEOztBQUVEcUosaUJBQWU7QUFDYixTQUFLeEUsWUFBTCxHQUFvQnRHLFFBQVFDLElBQVIsQ0FBYTJKLGNBQWIsR0FBOEI1SixRQUFRQyxJQUFSLENBQWEySixjQUEzQyxHQUE0RCxtQ0FBaEY7O0FBRUEsU0FBSzNGLGtCQUFMLEdBQTBCO0FBQ3hCNEgsY0FBUSxLQUFLNUYsVUFEVzs7QUFHeEIwQixxQkFBZSxLQUFLQSxhQUhJOztBQUt4QlYsMkJBQXFCLEtBQUtBLG1CQUxGOztBQU94QjZFLHlCQUFtQixLQUFLbEYsY0FBTCxJQUF1QixLQUFLQSxjQUFMLENBQW9Ca0YsaUJBUHRDOztBQVN4QkMseUJBQW9CQyxVQUFELElBQWdCOztBQUVqQyxlQUFPQSxXQUFXQyxLQUFYLENBQWlCL0gsR0FBakIsQ0FBc0JnSSxJQUFELElBQVU7QUFDcEMsY0FBSUYsV0FBV0csT0FBWCxDQUFtQkMsY0FBdkIsRUFBdUM7QUFDckMsbUJBQU8sS0FBSzdGLGNBQUwsQ0FBb0IyRixLQUFLRyxPQUF6QixDQUFQO0FBQ0QsV0FGRCxNQUVPLElBQUlMLFdBQVdHLE9BQVgsQ0FBbUJHLGNBQXZCLEVBQXVDO0FBQzVDLG1CQUFPLEtBQUs5RixjQUFMLENBQW9CMEYsS0FBS0csT0FBekIsQ0FBUDtBQUNELFdBRk0sTUFFQSxJQUFJTCxXQUFXRyxPQUFYLENBQW1CSSxjQUF2QixFQUF1QztBQUM1QyxtQkFBTyxLQUFLOUYsY0FBTCxDQUFvQnlGLEtBQUtHLE9BQXpCLENBQVA7QUFDRDs7QUFFRCxpQkFBTyxJQUFQO0FBQ0QsU0FWTSxDQUFQO0FBV0QsT0F0QnVCOztBQXdCeEJHLDZCQUF3QlIsVUFBRCxJQUFnQjtBQUNyQyxjQUFNUyxNQUFNVCxXQUFXQyxLQUFYLENBQWlCL0gsR0FBakIsQ0FBcUJDLEtBQUtBLEVBQUVrSSxPQUE1QixDQUFaOztBQUVBLFlBQUlMLFdBQVdHLE9BQVgsQ0FBbUJDLGNBQXZCLEVBQXVDO0FBQ3JDLGlCQUFRLEdBQUcsS0FBSzlGLFlBQWMsdUJBQXVCbUcsR0FBSyxFQUExRDtBQUNELFNBRkQsTUFFTyxJQUFJVCxXQUFXRyxPQUFYLENBQW1CRyxjQUF2QixFQUF1QztBQUM1QyxpQkFBUSxHQUFHLEtBQUtoRyxZQUFjLHVCQUF1Qm1HLEdBQUssRUFBMUQ7QUFDRCxTQUZNLE1BRUEsSUFBSVQsV0FBV0csT0FBWCxDQUFtQkksY0FBdkIsRUFBdUM7QUFDNUMsaUJBQVEsR0FBRyxLQUFLakcsWUFBYyxxQkFBcUJtRyxHQUFLLEVBQXhEO0FBQ0Q7O0FBRUQsZUFBTyxJQUFQO0FBQ0Q7QUFwQ3VCLEtBQTFCOztBQXVDQSxRQUFJek0sUUFBUUMsSUFBUixDQUFhMEosZUFBakIsRUFBa0M7QUFDaEMsV0FBSzFGLGtCQUFMLENBQXdCeUksa0JBQXhCLEdBQThDQyxPQUFELElBQWE7QUFDeEQsZUFBUSxHQUFHM00sUUFBUUMsSUFBUixDQUFhMEosZUFBaUIsWUFBWWdELFFBQVEzTCxFQUFJLE1BQWpFO0FBQ0QsT0FGRDtBQUdEO0FBQ0Y7O0FBMkVLNEcsa0JBQU4sQ0FBdUI5RyxJQUF2QixFQUE2QitHLFVBQTdCLEVBQXlDO0FBQUE7O0FBQUE7QUFDdkMsWUFBTStFLFdBQVcsUUFBS0Msb0JBQUwsQ0FBMEIvTCxJQUExQixFQUFnQytHLFVBQWhDLENBQWpCOztBQUVBLFVBQUk7QUFDRixjQUFNLFFBQUsvRixHQUFMLENBQVMsa0JBQU8sb0NBQVAsRUFBNkMsUUFBS3NJLGdCQUFMLENBQXNCLFFBQUtoRSxVQUEzQixDQUE3QyxFQUFxRixRQUFLZ0UsZ0JBQUwsQ0FBc0J3QyxRQUF0QixDQUFyRixDQUFULENBQU47QUFDRCxPQUZELENBRUUsT0FBT3JGLEVBQVAsRUFBVztBQUNYLGdCQUFLUyxnQkFBTCxDQUFzQlQsRUFBdEI7QUFDRDtBQVBzQztBQVF4Qzs7QUFFS1Esb0JBQU4sQ0FBeUJqSCxJQUF6QixFQUErQitHLFVBQS9CLEVBQTJDO0FBQUE7O0FBQUE7QUFDekMsWUFBTStFLFdBQVcsUUFBS0Msb0JBQUwsQ0FBMEIvTCxJQUExQixFQUFnQytHLFVBQWhDLENBQWpCOztBQUVBLFVBQUk7QUFDRixjQUFNLFFBQUsvRixHQUFMLENBQVMsa0JBQU8scURBQVAsRUFDTyxRQUFLc0ksZ0JBQUwsQ0FBc0IsUUFBS2hFLFVBQTNCLENBRFAsRUFFTyxRQUFLZ0UsZ0JBQUwsQ0FBc0J3QyxRQUF0QixDQUZQLEVBR08sUUFBS3hDLGdCQUFMLENBQXNCLFFBQUtuRSxVQUEzQixDQUhQLEVBSU8sMkNBQXFCbUIsaUJBQXJCLENBQXVDdEcsSUFBdkMsRUFBNkMrRyxVQUE3QyxDQUpQLENBQVQsQ0FBTjtBQUtELE9BTkQsQ0FNRSxPQUFPTixFQUFQLEVBQVc7QUFDWDtBQUNBLGdCQUFLUyxnQkFBTCxDQUFzQlQsRUFBdEI7QUFDRDtBQVp3QztBQWExQzs7QUFFRHNGLHVCQUFxQi9MLElBQXJCLEVBQTJCK0csVUFBM0IsRUFBdUM7QUFDckMsVUFBTXZHLE9BQU8scUJBQVEsQ0FBQ1IsS0FBS1EsSUFBTixFQUFZdUcsY0FBY0EsV0FBV2lGLFFBQXJDLENBQVIsRUFBd0QxSSxJQUF4RCxDQUE2RCxLQUE3RCxDQUFiOztBQUVBLFVBQU0ySSxTQUFTLHFCQUFRLENBQUMsTUFBRCxFQUFTak0sS0FBSzZCLEtBQWQsRUFBcUJrRixjQUFjQSxXQUFXbUYsR0FBOUMsQ0FBUixFQUE0RDVJLElBQTVELENBQWlFLEtBQWpFLENBQWY7O0FBRUEsVUFBTTZJLGFBQWEsQ0FBQ0YsTUFBRCxFQUFTekwsSUFBVCxFQUFlOEMsSUFBZixDQUFvQixLQUFwQixDQUFuQjs7QUFFQSxXQUFPLEtBQUs2RixjQUFMLENBQW9CakssUUFBUUMsSUFBUixDQUFhNEosaUJBQWIsS0FBbUMsS0FBbkMsR0FBMkMseUJBQU1vRCxVQUFOLENBQTNDLEdBQStEQSxVQUFuRixDQUFQO0FBQ0Q7O0FBRUt0TSxzQkFBTixHQUE2QjtBQUFBOztBQUFBO0FBQzNCLFVBQUlYLFFBQVFDLElBQVIsQ0FBYXVKLGdCQUFqQixFQUFtQztBQUNqQyxjQUFNLFFBQUsxSCxHQUFMLENBQVMsa0JBQU8sY0FBUCxFQUF1QjlCLFFBQVFDLElBQVIsQ0FBYXVKLGdCQUFwQyxDQUFULENBQU47QUFDRDtBQUNELFVBQUksUUFBSzVDLGNBQUwsSUFBdUIsUUFBS0EsY0FBTCxDQUFvQnNHLFVBQS9DLEVBQTJEO0FBQ3pELGNBQU0sUUFBS3RHLGNBQUwsQ0FBb0JzRyxVQUFwQixFQUFOO0FBQ0Q7QUFOMEI7QUFPNUI7O0FBRUt0TCxxQkFBTixHQUE0QjtBQUFBOztBQUFBO0FBQzFCLFVBQUk1QixRQUFRQyxJQUFSLENBQWF3SixlQUFqQixFQUFrQztBQUNoQyxjQUFNLFFBQUszSCxHQUFMLENBQVMsa0JBQU8sY0FBUCxFQUF1QjlCLFFBQVFDLElBQVIsQ0FBYXdKLGVBQXBDLENBQVQsQ0FBTjtBQUNEO0FBQ0QsVUFBSSxRQUFLN0MsY0FBTCxJQUF1QixRQUFLQSxjQUFMLENBQW9CdUcsU0FBL0MsRUFBMEQ7QUFDeEQsY0FBTSxRQUFLdkcsY0FBTCxDQUFvQnVHLFNBQXBCLEVBQU47QUFDRDtBQU55QjtBQU8zQjs7QUFFS2hNLGFBQU4sQ0FBa0JMLElBQWxCLEVBQXdCUixPQUF4QixFQUFpQ2tJLFFBQWpDLEVBQTJDO0FBQUE7O0FBQUE7QUFDekMsWUFBTSxRQUFLbkIsa0JBQUwsQ0FBd0J2RyxJQUF4QixFQUE4QlIsT0FBOUIsQ0FBTjtBQUNBLFlBQU0sUUFBSzBGLGVBQUwsRUFBTjs7QUFFQSxVQUFJNUUsUUFBUSxDQUFaOztBQUVBLFlBQU1OLEtBQUtzTSxjQUFMLENBQW9CLEVBQXBCO0FBQUEsdUNBQXdCLFdBQU96SixNQUFQLEVBQWtCO0FBQzlDQSxpQkFBTzdDLElBQVAsR0FBY0EsSUFBZDs7QUFFQSxjQUFJLEVBQUVNLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCb0gscUJBQVNwSCxLQUFUO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3dDLFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCckQsT0FBMUIsRUFBbUMsSUFBbkMsQ0FBTjtBQUNELFNBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFVQWtJLGVBQVNwSCxLQUFUO0FBaEJ5QztBQWlCMUM7O0FBRUsyQixzQkFBTixDQUEyQnpDLE9BQTNCLEVBQW9DO0FBQUE7O0FBQUE7QUFDbEMsWUFBTSxRQUFLNkYsY0FBTCxFQUFOOztBQUVBLFlBQU1rSCxrQkFBa0IsRUFBeEI7O0FBRUEsWUFBTXpNLFFBQVEsTUFBTU4sUUFBUU8sZUFBUixDQUF3QixFQUF4QixDQUFwQjs7QUFFQSxXQUFLLE1BQU1DLElBQVgsSUFBbUJGLEtBQW5CLEVBQTBCO0FBQ3hCeU0sd0JBQWdCQyxJQUFoQixDQUFxQixRQUFLVCxvQkFBTCxDQUEwQi9MLElBQTFCLEVBQWdDLElBQWhDLENBQXJCOztBQUVBLGFBQUssTUFBTStHLFVBQVgsSUFBeUIvRyxLQUFLZ0gsY0FBTCxDQUFvQixZQUFwQixDQUF6QixFQUE0RDtBQUMxRHVGLDBCQUFnQkMsSUFBaEIsQ0FBcUIsUUFBS1Qsb0JBQUwsQ0FBMEIvTCxJQUExQixFQUFnQytHLFVBQWhDLENBQXJCO0FBQ0Q7QUFDRjs7QUFFRCxZQUFNMEYsU0FBUyx3QkFBVyxRQUFLbEgsU0FBaEIsRUFBMkJnSCxlQUEzQixDQUFmOztBQUVBLFdBQUssTUFBTVQsUUFBWCxJQUF1QlcsTUFBdkIsRUFBK0I7QUFDN0IsWUFBSVgsU0FBU3pGLE9BQVQsQ0FBaUIsT0FBakIsTUFBOEIsQ0FBOUIsSUFBbUN5RixTQUFTekYsT0FBVCxDQUFpQixTQUFqQixNQUFnQyxDQUF2RSxFQUEwRTtBQUN4RSxjQUFJO0FBQ0Ysa0JBQU0sUUFBS3JGLEdBQUwsQ0FBUyxrQkFBTyw0QkFBUCxFQUFxQyxRQUFLc0ksZ0JBQUwsQ0FBc0IsUUFBS2hFLFVBQTNCLENBQXJDLEVBQTZFLFFBQUtnRSxnQkFBTCxDQUFzQndDLFFBQXRCLENBQTdFLENBQVQsQ0FBTjtBQUNELFdBRkQsQ0FFRSxPQUFPckYsRUFBUCxFQUFXO0FBQ1gsb0JBQUtTLGdCQUFMLENBQXNCVCxFQUF0QjtBQUNEO0FBQ0Y7QUFDRjtBQXpCaUM7QUEwQm5DOztBQUVLckcsc0JBQU4sQ0FBMkJKLElBQTNCLEVBQWlDUixPQUFqQyxFQUEwQztBQUFBOztBQUFBO0FBQ3hDLFlBQU0sUUFBS3NILGdCQUFMLENBQXNCOUcsSUFBdEIsRUFBNEIsSUFBNUIsQ0FBTjs7QUFFQSxXQUFLLE1BQU0rRyxVQUFYLElBQXlCL0csS0FBS2dILGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsY0FBTSxRQUFLRixnQkFBTCxDQUFzQjlHLElBQXRCLEVBQTRCK0csVUFBNUIsQ0FBTjtBQUNEOztBQUVELFlBQU0sUUFBS0Usa0JBQUwsQ0FBd0JqSCxJQUF4QixFQUE4QixJQUE5QixDQUFOOztBQUVBLFdBQUssTUFBTStHLFVBQVgsSUFBeUIvRyxLQUFLZ0gsY0FBTCxDQUFvQixZQUFwQixDQUF6QixFQUE0RDtBQUMxRCxjQUFNLFFBQUtDLGtCQUFMLENBQXdCakgsSUFBeEIsRUFBOEIrRyxVQUE5QixDQUFOO0FBQ0Q7QUFYdUM7QUFZekM7O0FBdUJLMUgsa0JBQU4sR0FBeUI7QUFBQTs7QUFBQTtBQUN2QixZQUFNLFFBQUsyQixHQUFMLENBQVMsUUFBSzBMLHNCQUFMLHdCQUFULENBQU47QUFEdUI7QUFFeEI7O0FBRUtuTixlQUFOLEdBQXNCO0FBQUE7O0FBQUE7QUFDcEIsWUFBTSxRQUFLeUIsR0FBTCxDQUFTLFFBQUswTCxzQkFBTCxtQkFBVCxDQUFOO0FBRG9CO0FBRXJCOztBQUVEQSx5QkFBdUJ6TCxHQUF2QixFQUE0QjtBQUMxQixXQUFPQSxJQUFJQyxPQUFKLENBQVksYUFBWixFQUEyQixLQUFLaUUsVUFBaEMsRUFDSWpFLE9BREosQ0FDWSxrQkFEWixFQUNnQyxLQUFLb0UsVUFEckMsQ0FBUDtBQUVEOztBQUVLMUYsbUJBQU4sQ0FBd0JKLE9BQXhCLEVBQWlDO0FBQUE7O0FBQUE7QUFDL0IsWUFBTWtJLFdBQVcsVUFBQ2xILElBQUQsRUFBT0YsS0FBUCxFQUFpQjtBQUNoQyxnQkFBS0MsWUFBTCxDQUFrQkMsS0FBS0MsS0FBTCxHQUFhLEtBQWIsR0FBcUJILE1BQU1JLFFBQU4sR0FBaUJDLEdBQXhEO0FBQ0QsT0FGRDs7QUFJQSxZQUFNbkIsUUFBUW1OLGFBQVIsQ0FBc0IsRUFBdEI7QUFBQSx1Q0FBMEIsV0FBT25KLEtBQVAsRUFBYyxFQUFDbEQsS0FBRCxFQUFkLEVBQTBCO0FBQ3hELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJvSCxxQkFBUyxRQUFULEVBQW1CcEgsS0FBbkI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLbUQsV0FBTCxDQUFpQkQsS0FBakIsRUFBd0JoRSxPQUF4QixDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBLFlBQU1BLFFBQVFvTixhQUFSLENBQXNCLEVBQXRCO0FBQUEsdUNBQTBCLFdBQU9qSixLQUFQLEVBQWMsRUFBQ3JELEtBQUQsRUFBZCxFQUEwQjtBQUN4RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCb0gscUJBQVMsUUFBVCxFQUFtQnBILEtBQW5CO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3NELFdBQUwsQ0FBaUJELEtBQWpCLEVBQXdCbkUsT0FBeEIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQSxZQUFNQSxRQUFRcU4sYUFBUixDQUFzQixFQUF0QjtBQUFBLHVDQUEwQixXQUFPL0ksS0FBUCxFQUFjLEVBQUN4RCxLQUFELEVBQWQsRUFBMEI7QUFDeEQsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0Qm9ILHFCQUFTLE9BQVQsRUFBa0JwSCxLQUFsQjtBQUNEOztBQUVELGdCQUFNLFFBQUt5RCxXQUFMLENBQWlCRCxLQUFqQixFQUF3QnRFLE9BQXhCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUEsWUFBTUEsUUFBUXNOLGlCQUFSLENBQTBCLEVBQTFCO0FBQUEsdUNBQThCLFdBQU83SSxTQUFQLEVBQWtCLEVBQUMzRCxLQUFELEVBQWxCLEVBQThCO0FBQ2hFLGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJvSCxxQkFBUyxZQUFULEVBQXVCcEgsS0FBdkI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLNEQsZUFBTCxDQUFxQkQsU0FBckIsRUFBZ0N6RSxPQUFoQyxDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBLFlBQU1BLFFBQVF1TixZQUFSLENBQXFCLEVBQXJCO0FBQUEsdUNBQXlCLFdBQU8zQyxNQUFQLEVBQWUsRUFBQzlKLEtBQUQsRUFBZixFQUEyQjtBQUN4RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCb0gscUJBQVMsT0FBVCxFQUFrQnBILEtBQWxCO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3dFLFVBQUwsQ0FBZ0JzRixNQUFoQixFQUF3QjVLLE9BQXhCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUEsWUFBTUEsUUFBUXdOLGVBQVIsQ0FBd0IsRUFBeEI7QUFBQSx1Q0FBNEIsV0FBTzVDLE1BQVAsRUFBZSxFQUFDOUosS0FBRCxFQUFmLEVBQTJCO0FBQzNELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJvSCxxQkFBUyxVQUFULEVBQXFCcEgsS0FBckI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLcUUsYUFBTCxDQUFtQnlGLE1BQW5CLEVBQTJCNUssT0FBM0IsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQSxZQUFNQSxRQUFReU4sWUFBUixDQUFxQixFQUFyQjtBQUFBLHVDQUF5QixXQUFPN0MsTUFBUCxFQUFlLEVBQUM5SixLQUFELEVBQWYsRUFBMkI7QUFDeEQsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0Qm9ILHFCQUFTLE9BQVQsRUFBa0JwSCxLQUFsQjtBQUNEOztBQUVELGdCQUFNLFFBQUtxRyxnQkFBTCxDQUFzQnlELE1BQXRCLEVBQThCNUssT0FBOUIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQSxZQUFNQSxRQUFRME4sa0JBQVIsQ0FBMkIsRUFBM0I7QUFBQSx1Q0FBK0IsV0FBTzlDLE1BQVAsRUFBZSxFQUFDOUosS0FBRCxFQUFmLEVBQTJCO0FBQzlELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJvSCxxQkFBUyxhQUFULEVBQXdCcEgsS0FBeEI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLMkUsZ0JBQUwsQ0FBc0JtRixNQUF0QixFQUE4QjVLLE9BQTlCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUEsWUFBTUEsUUFBUTJOLGtCQUFSLENBQTJCLEVBQTNCO0FBQUEsdUNBQStCLFdBQU8vQyxNQUFQLEVBQWUsRUFBQzlKLEtBQUQsRUFBZixFQUEyQjtBQUM5RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCb0gscUJBQVMsY0FBVCxFQUF5QnBILEtBQXpCO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBSytELGdCQUFMLENBQXNCK0YsTUFBdEIsRUFBOEI1SyxPQUE5QixDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBLFlBQU1BLFFBQVE0Tix5QkFBUixDQUFrQyxFQUFsQztBQUFBLHVDQUFzQyxXQUFPaEQsTUFBUCxFQUFlLEVBQUM5SixLQUFELEVBQWYsRUFBMkI7QUFDckUsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0Qm9ILHFCQUFTLHFCQUFULEVBQWdDcEgsS0FBaEM7QUFDRDs7QUFFRCxnQkFBTSxRQUFLa0UsdUJBQUwsQ0FBNkI0RixNQUE3QixFQUFxQzVLLE9BQXJDLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47QUE3RStCO0FBb0ZoQzs7QUFFS3lLLGlCQUFOLEdBQXdCO0FBQUE7O0FBQUE7QUFDdEIsWUFBTXpLLFVBQVUsTUFBTU4sUUFBUU8sWUFBUixDQUFxQlAsUUFBUUMsSUFBUixDQUFhTyxHQUFsQyxDQUF0Qjs7QUFFQSxVQUFJLFFBQUswRixVQUFMLENBQWdCaUIsT0FBaEIsQ0FBd0IsWUFBeEIsTUFBMEMsQ0FBQyxDQUEvQyxFQUFrRDtBQUNoRHpGLGdCQUFRQyxHQUFSLENBQVksMkJBQVo7O0FBRUEsY0FBTSxRQUFLdEIsYUFBTCxFQUFOO0FBQ0Q7O0FBRUQsWUFBTSxRQUFLOE4sa0JBQUwsQ0FBd0I3TixPQUF4QixDQUFOO0FBVHNCO0FBVXZCOztBQUVLNk4sb0JBQU4sQ0FBeUI3TixPQUF6QixFQUFrQztBQUFBOztBQUFBO0FBQ2hDLGNBQUs4TixVQUFMLEdBQWtCLENBQUMsTUFBTSxRQUFLdE0sR0FBTCxDQUFVLG9CQUFvQixRQUFLbUUsVUFBWSxhQUEvQyxDQUFQLEVBQXFFL0IsR0FBckUsQ0FBeUU7QUFBQSxlQUFLQyxFQUFFN0MsSUFBUDtBQUFBLE9BQXpFLENBQWxCOztBQUVBLFlBQU0sUUFBSytNLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCL04sT0FBOUIsQ0FBTjtBQUNBLFlBQU0sUUFBSytOLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCL04sT0FBOUIsQ0FBTjtBQUNBLFlBQU0sUUFBSytOLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCL04sT0FBOUIsQ0FBTjtBQUxnQztBQU1qQzs7QUFFSytOLG1CQUFOLENBQXdCQyxPQUF4QixFQUFpQ2hPLE9BQWpDLEVBQTBDO0FBQUE7O0FBQUE7QUFDeEMsVUFBSSxRQUFLOE4sVUFBTCxDQUFnQmpILE9BQWhCLENBQXdCbUgsT0FBeEIsTUFBcUMsQ0FBQyxDQUF0QyxJQUEyQzFPLFdBQVcwTyxPQUFYLENBQS9DLEVBQW9FO0FBQ2xFLGNBQU0sUUFBS3hNLEdBQUwsQ0FBUyxRQUFLMEwsc0JBQUwsQ0FBNEI1TixXQUFXME8sT0FBWCxDQUE1QixDQUFULENBQU47O0FBRUEsWUFBSUEsWUFBWSxLQUFoQixFQUF1QjtBQUNyQjVNLGtCQUFRQyxHQUFSLENBQVksNkJBQVo7O0FBRUEsZ0JBQU0sUUFBS2pCLGlCQUFMLENBQXVCSixPQUF2QixDQUFOO0FBQ0EsZ0JBQU0sUUFBS2lPLGVBQUwsQ0FBcUJqTyxPQUFyQixDQUFOO0FBQ0Q7QUFDRjtBQVZ1QztBQVd6Qzs7QUFFS2lPLGlCQUFOLENBQXNCak8sT0FBdEIsRUFBK0I7QUFBQTs7QUFBQTtBQUM3QixZQUFNTSxRQUFRLE1BQU1OLFFBQVFPLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsVUFBSU8sUUFBUSxDQUFaOztBQUVBLFdBQUssTUFBTU4sSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEJRLGdCQUFRLENBQVI7O0FBRUEsY0FBTU4sS0FBS3NNLGNBQUwsQ0FBb0IsRUFBcEI7QUFBQSx5Q0FBd0IsV0FBT3pKLE1BQVAsRUFBa0I7QUFDOUNBLG1CQUFPN0MsSUFBUCxHQUFjQSxJQUFkOztBQUVBLGdCQUFJLEVBQUVNLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCLHNCQUFLb0gsUUFBTCxDQUFjMUgsS0FBS1EsSUFBbkIsRUFBeUJGLEtBQXpCO0FBQ0Q7O0FBRUQsa0JBQU0sUUFBS3dDLFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCckQsT0FBMUIsRUFBbUMsS0FBbkMsQ0FBTjtBQUNELFdBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBTjtBQVNEO0FBakI0QjtBQWtCOUI7O0FBajRCa0IsQyIsImZpbGUiOiJwbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGcgZnJvbSAncGcnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUG9zdGdyZXNTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgUG9zdGdyZXNSZWNvcmRWYWx1ZXMsIFBvc3RncmVzIH0gZnJvbSAnZnVsY3J1bSc7XG5pbXBvcnQgc25ha2UgZnJvbSAnc25ha2UtY2FzZSc7XG5pbXBvcnQgdGVtcGxhdGVEcm9wIGZyb20gJy4vdGVtcGxhdGUuZHJvcC5zcWwnO1xuaW1wb3J0IFNjaGVtYU1hcCBmcm9tICcuL3NjaGVtYS1tYXAnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHsgY29tcGFjdCwgZGlmZmVyZW5jZSB9IGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCB2ZXJzaW9uMDAxIGZyb20gJy4vdmVyc2lvbi0wMDEuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAyIGZyb20gJy4vdmVyc2lvbi0wMDIuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDAzIGZyb20gJy4vdmVyc2lvbi0wMDMuc3FsJztcbmltcG9ydCB2ZXJzaW9uMDA0IGZyb20gJy4vdmVyc2lvbi0wMDQuc3FsJztcblxuY29uc3QgTUFYX0lERU5USUZJRVJfTEVOR1RIID0gNjM7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuY29uc3QgTUlHUkFUSU9OUyA9IHtcbiAgJzAwMic6IHZlcnNpb24wMDIsXG4gICcwMDMnOiB2ZXJzaW9uMDAzLFxuICAnMDA0JzogdmVyc2lvbjAwNFxufTtcblxuY29uc3QgREVGQVVMVF9TQ0hFTUEgPSAncHVibGljJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ0RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnSG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ1BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIHBnVXNlcjoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHVzZXInLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUGFzc3dvcmQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBwYXNzd29yZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWE6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hVmlld3M6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEgZm9yIHRoZSBmcmllbmRseSB2aWV3cycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeW5jRXZlbnRzOiB7XG4gICAgICAgICAgZGVzYzogJ2FkZCBzeW5jIGV2ZW50IGhvb2tzJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ0JlZm9yZUZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnQWZ0ZXJGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHN5bmMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdGb3JtOiB7XG4gICAgICAgICAgZGVzYzogJ3RoZSBmb3JtIElEIHRvIHJlYnVpbGQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVwb3J0QmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdyZXBvcnQgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnTWVkaWFCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ21lZGlhIFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1VuZGVyc2NvcmVOYW1lczoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdW5kZXJzY29yZSBuYW1lcyAoZS5nLiBcIlBhcmsgSW5zcGVjdGlvbnNcIiBiZWNvbWVzIFwicGFya19pbnNwZWN0aW9uc1wiKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQ3VzdG9tTW9kdWxlOiB7XG4gICAgICAgICAgZGVzYzogJ2EgY3VzdG9tIG1vZHVsZSB0byBsb2FkIHdpdGggc3luYyBleHRlbnNpb25zJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTZXR1cDoge1xuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgfSxcbiAgICAgICAgcGdEcm9wOiB7XG4gICAgICAgICAgZGVzYzogJ2Ryb3AgdGhlIHN5c3RlbSB0YWJsZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdBcnJheXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIGFycmF5IHR5cGVzIGZvciBtdWx0aS12YWx1ZSBmaWVsZHMgbGlrZSBjaG9pY2UgZmllbGRzLCBjbGFzc2lmaWNhdGlvbiBmaWVsZHMgYW5kIG1lZGlhIGZpZWxkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2ltcGxlVHlwZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHNpbXBsZSB0eXBlcyBpbiB0aGUgZGF0YWJhc2UgdGhhdCBhcmUgbW9yZSBjb21wYXRpYmxlIHdpdGggb3RoZXIgYXBwbGljYXRpb25zIChubyB0c3ZlY3RvciwgZ2VvbWV0cnksIGFycmF5cyknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeXN0ZW1UYWJsZXNPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgY3JlYXRlIHRoZSBzeXN0ZW0gcmVjb3JkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdEcm9wKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BTeXN0ZW1UYWJsZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2V0dXApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU3lzdGVtVGFibGVzT25seSkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRm9ybSAmJiBmb3JtLmlkICE9PSBmdWxjcnVtLmFyZ3MucGdGb3JtKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICB0cmltSWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIuc3Vic3RyaW5nKDAsIE1BWF9JREVOVElGSUVSX0xFTkdUSCk7XG4gIH1cblxuICBlc2NhcGVJZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgICByZXR1cm4gaWRlbnRpZmllciAmJiB0aGlzLnBnZGIuaWRlbnQodGhpcy50cmltSWRlbnRpZmllcihpZGVudGlmaWVyKSk7XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcGkgPSBhcGk7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFwcCA9IGZ1bGNydW07XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FycmF5cyA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUFycmF5cyA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NpbXBsZVR5cGVzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52aWV3U2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hVmlld3MgfHwgREVGQVVMVF9TQ0hFTUE7XG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8IERFRkFVTFRfU0NIRU1BO1xuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9JyR7IHRoaXMuZGF0YVNjaGVtYSB9J2ApO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcblxuICAgIHRoaXMuc2V0dXBPcHRpb25zKCk7XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlSW5pdGlhbGl6ZSgpO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLmNsZWFudXBGcmllbmRseVZpZXdzKGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICB9XG5cbiAgb25Gb3JtU2F2ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybX0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSk7XG4gIH1cblxuICBvbkZvcm1EZWxldGUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnR9KSA9PiB7XG4gICAgY29uc3Qgb2xkRm9ybSA9IHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBudWxsKTtcbiAgfVxuXG4gIG9uUmVjb3JkU2F2ZSA9IGFzeW5jICh7cmVjb3JkLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJlY29yZERlbGV0ZSA9IGFzeW5jICh7cmVjb3JkfSkgPT4ge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuICB9XG5cbiAgb25QaG90b1NhdmUgPSBhc3luYyAoe3Bob3RvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICB9XG5cbiAgb25WaWRlb1NhdmUgPSBhc3luYyAoe3ZpZGVvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25BdWRpb1NhdmUgPSBhc3luYyAoe2F1ZGlvLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICB9XG5cbiAgb25DaGFuZ2VzZXRTYXZlID0gYXN5bmMgKHtjaGFuZ2VzZXQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hvaWNlTGlzdFNhdmUgPSBhc3luYyAoe2Nob2ljZUxpc3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KGNob2ljZUxpc3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe2NsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQoY2xhc3NpZmljYXRpb25TZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7cHJvamVjdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3QocHJvamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJvbGVTYXZlID0gYXN5bmMgKHtyb2xlLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShyb2xlLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uTWVtYmVyc2hpcFNhdmUgPSBhc3luYyAoe21lbWJlcnNoaXAsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG1lbWJlcnNoaXAsIGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUGhvdG8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnBob3RvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0UGhvdG9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAncGhvdG9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVWaWRlbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAudmlkZW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRWaWRlb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICd2aWRlb3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUF1ZGlvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5hdWRpbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdEF1ZGlvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ2F1ZGlvJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaGFuZ2VzZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNoYW5nZXNldChvYmplY3QpLCAnY2hhbmdlc2V0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucHJvamVjdChvYmplY3QpLCAncHJvamVjdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLm1lbWJlcnNoaXAob2JqZWN0KSwgJ21lbWJlcnNoaXBzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yb2xlKG9iamVjdCksICdyb2xlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuZm9ybShvYmplY3QpLCAnZm9ybXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNob2ljZUxpc3Qob2JqZWN0KSwgJ2Nob2ljZV9saXN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCksICdjbGFzc2lmaWNhdGlvbl9zZXRzJyk7XG4gIH1cblxuXG4gIGFzeW5jIHVwZGF0ZU9iamVjdCh2YWx1ZXMsIHRhYmxlKSB7XG4gICAgY29uc3QgZGVsZXRlU3RhdGVtZW50ID0gdGhpcy5wZ2RiLmRlbGV0ZVN0YXRlbWVudChgJHsgdGhpcy5kYXRhU2NoZW1hIH0uc3lzdGVtXyR7dGFibGV9YCwge3Jvd19yZXNvdXJjZV9pZDogdmFsdWVzLnJvd19yZXNvdXJjZV9pZH0pO1xuICAgIGNvbnN0IGluc2VydFN0YXRlbWVudCA9IHRoaXMucGdkYi5pbnNlcnRTdGF0ZW1lbnQoYCR7IHRoaXMuZGF0YVNjaGVtYSB9LnN5c3RlbV8ke3RhYmxlfWAsIHZhbHVlcywge3BrOiAnaWQnfSk7XG5cbiAgICBjb25zdCBzcWwgPSBbIGRlbGV0ZVN0YXRlbWVudC5zcWwsIGluc2VydFN0YXRlbWVudC5zcWwgXS5qb2luKCdcXG4nKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSckeyB0aGlzLmRhdGFTY2hlbWEgfSdgKTtcblxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIHJlbG9hZFZpZXdMaXN0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSckeyB0aGlzLnZpZXdTY2hlbWEgfSdgKTtcbiAgICB0aGlzLnZpZXdOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcbiAgfVxuXG4gIGJhc2VNZWRpYVVSTCA9ICgpID0+IHtcbiAgfVxuXG4gIGZvcm1hdFBob3RvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy8keyBpZCB9LmpwZ2A7XG4gIH1cblxuICBmb3JtYXRWaWRlb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3MvJHsgaWQgfS5tcDRgO1xuICB9XG5cbiAgZm9ybWF0QXVkaW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vJHsgaWQgfS5tNGFgO1xuICB9XG5cbiAgaW50ZWdyaXR5V2FybmluZyhleCkge1xuICAgIGNvbnNvbGUud2FybihgXG4tLS0tLS0tLS0tLS0tXG4hISBXQVJOSU5HICEhXG4tLS0tLS0tLS0tLS0tXG5cblBvc3RncmVTUUwgZGF0YWJhc2UgaW50ZWdyaXR5IGlzc3VlIGVuY291bnRlcmVkLiBDb21tb24gc291cmNlcyBvZiBwb3N0Z3JlcyBkYXRhYmFzZSBpc3N1ZXMgYXJlOlxuXG4qIFJlaW5zdGFsbGluZyBGdWxjcnVtIERlc2t0b3AgYW5kIHVzaW5nIGFuIG9sZCBwb3N0Z3JlcyBkYXRhYmFzZSB3aXRob3V0IHJlY3JlYXRpbmdcbiAgdGhlIHBvc3RncmVzIGRhdGFiYXNlLlxuKiBEZWxldGluZyB0aGUgaW50ZXJuYWwgYXBwbGljYXRpb24gZGF0YWJhc2UgYW5kIHVzaW5nIGFuIGV4aXN0aW5nIHBvc3RncmVzIGRhdGFiYXNlXG4qIE1hbnVhbGx5IG1vZGlmeWluZyB0aGUgcG9zdGdyZXMgZGF0YWJhc2VcbiogRm9ybSBuYW1lIGFuZCByZXBlYXRhYmxlIGRhdGEgbmFtZSBjb21iaW5hdGlvbnMgdGhhdCBleGNlZWVkIHRoZSBwb3N0Z3JlcyBsaW1pdCBvZiA2M1xuICBjaGFyYWN0ZXJzLiBJdCdzIGJlc3QgdG8ga2VlcCB5b3VyIGZvcm0gbmFtZXMgd2l0aGluIHRoZSBsaW1pdC4gVGhlIFwiZnJpZW5kbHkgdmlld1wiXG4gIGZlYXR1cmUgb2YgdGhlIHBsdWdpbiBkZXJpdmVzIHRoZSBvYmplY3QgbmFtZXMgZnJvbSB0aGUgZm9ybSBhbmQgcmVwZWF0YWJsZSBuYW1lcy5cbiogQ3JlYXRpbmcgbXVsdGlwbGUgYXBwcyBpbiBGdWxjcnVtIHdpdGggdGhlIHNhbWUgbmFtZS4gVGhpcyBpcyBnZW5lcmFsbHkgT0ssIGV4Y2VwdFxuICB5b3Ugd2lsbCBub3QgYmUgYWJsZSB0byB1c2UgdGhlIFwiZnJpZW5kbHkgdmlld1wiIGZlYXR1cmUgb2YgdGhlIHBvc3RncmVzIHBsdWdpbiBzaW5jZVxuICB0aGUgdmlldyBuYW1lcyBhcmUgZGVyaXZlZCBmcm9tIHRoZSBmb3JtIG5hbWVzLlxuXG5Ob3RlOiBXaGVuIHJlaW5zdGFsbGluZyBGdWxjcnVtIERlc2t0b3Agb3IgXCJzdGFydGluZyBvdmVyXCIgeW91IG5lZWQgdG8gZHJvcCBhbmQgcmUtY3JlYXRlXG50aGUgcG9zdGdyZXMgZGF0YWJhc2UuIFRoZSBuYW1lcyBvZiBkYXRhYmFzZSBvYmplY3RzIGFyZSB0aWVkIGRpcmVjdGx5IHRvIHRoZSBkYXRhYmFzZVxub2JqZWN0cyBpbiB0aGUgaW50ZXJuYWwgYXBwbGljYXRpb24gZGF0YWJhc2UuXG5cbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuUmVwb3J0IGlzc3VlcyBhdCBodHRwczovL2dpdGh1Yi5jb20vZnVsY3J1bWFwcC9mdWxjcnVtLWRlc2t0b3AvaXNzdWVzXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbk1lc3NhZ2U6XG4keyBleC5tZXNzYWdlIH1cblxuU3RhY2s6XG4keyBleC5zdGFjayB9XG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmAucmVkXG4gICAgKTtcbiAgfVxuXG4gIHNldHVwT3B0aW9ucygpIHtcbiAgICB0aGlzLmJhc2VNZWRpYVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL2FwaS5mdWxjcnVtYXBwLmNvbS9hcGkvdjInO1xuXG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBzY2hlbWE6IHRoaXMuZGF0YVNjaGVtYSxcblxuICAgICAgZGlzYWJsZUFycmF5czogdGhpcy5kaXNhYmxlQXJyYXlzLFxuXG4gICAgICBkaXNhYmxlQ29tcGxleFR5cGVzOiB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMsXG5cbiAgICAgIHZhbHVlc1RyYW5zZm9ybWVyOiB0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUudmFsdWVzVHJhbnNmb3JtZXIsXG5cbiAgICAgIG1lZGlhVVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuXG4gICAgICAgIHJldHVybiBtZWRpYVZhbHVlLml0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFBob3RvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFZpZGVvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdEF1ZGlvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgbWVkaWFWaWV3VVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZHMgPSBtZWRpYVZhbHVlLml0ZW1zLm1hcChvID0+IG8ubWVkaWFJRCk7XG5cbiAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3Mvdmlldz9waG90b3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3Mvdmlldz92aWRlb3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby92aWV3P2F1ZGlvPSR7IGlkcyB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCkge1xuICAgICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyID0gKGZlYXR1cmUpID0+IHtcbiAgICAgICAgcmV0dXJuIGAkeyBmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsIH0vcmVwb3J0cy8keyBmZWF0dXJlLmlkIH0ucGRmYDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlUmVjb3JkID0gYXN5bmMgKHJlY29yZCwgYWNjb3VudCwgc2tpcFRhYmxlQ2hlY2spID0+IHtcbiAgICBpZiAoIXNraXBUYWJsZUNoZWNrICYmICF0aGlzLnJvb3RUYWJsZUV4aXN0cyhyZWNvcmQuZm9ybSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0ocmVjb3JkLmZvcm0sIGFjY291bnQsICgpID0+IHt9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQoe3JlY29yZCwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcblxuICAgIGNvbnN0IHN5c3RlbVZhbHVlcyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUocmVjb3JkLCBudWxsLCByZWNvcmQsIHsuLi50aGlzLnJlY29yZFZhbHVlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZUNvbXBsZXhUeXBlczogZmFsc2V9KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yZWNvcmQocmVjb3JkLCBzeXN0ZW1WYWx1ZXMpLCAncmVjb3JkcycpO1xuICB9XG5cbiAgcm9vdFRhYmxlRXhpc3RzID0gKGZvcm0pID0+IHtcbiAgICByZXR1cm4gdGhpcy50YWJsZU5hbWVzLmluZGV4T2YoUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSkpICE9PSAtMTtcbiAgfVxuXG4gIHJlY3JlYXRlRm9ybVRhYmxlcyA9IGFzeW5jIChmb3JtLCBhY2NvdW50KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pLCBudWxsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKHNxbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG51bGwsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSkpO1xuICB9XG5cbiAgdXBkYXRlRm9ybSA9IGFzeW5jIChmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKSA9PiB7XG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0oe2Zvcm0sIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3QoZm9ybSwgYWNjb3VudCk7XG5cbiAgICAgIGlmICghdGhpcy5yb290VGFibGVFeGlzdHMoZm9ybSkgJiYgbmV3Rm9ybSAhPSBudWxsKSB7XG4gICAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7c3RhdGVtZW50c30gPSBhd2FpdCBQb3N0Z3Jlc1NjaGVtYS5nZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSwgdGhpcy5kaXNhYmxlQXJyYXlzLFxuICAgICAgICB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMsIHRoaXMucGdDdXN0b21Nb2R1bGUsIHRoaXMuZGF0YVNjaGVtYSk7XG5cbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKFsnQkVHSU4gVFJBTlNBQ1RJT047JyxcbiAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICdDT01NSVQgVFJBTlNBQ1RJT047J10uam9pbignXFxuJykpO1xuXG4gICAgICBpZiAobmV3Rm9ybSkge1xuICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXMgQ0FTQ0FERTsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlcy4lc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUlkZW50aWZpZXIodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSWRlbnRpZmllcih0aGlzLmRhdGFTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICB0aGlzLmludGVncml0eVdhcm5pbmcoZXgpO1xuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gY29tcGFjdChbZm9ybS5uYW1lLCByZXBlYXRhYmxlICYmIHJlcGVhdGFibGUuZGF0YU5hbWVdKS5qb2luKCcgLSAnKVxuXG4gICAgY29uc3QgcHJlZml4ID0gY29tcGFjdChbJ3ZpZXcnLCBmb3JtLnJvd0lELCByZXBlYXRhYmxlICYmIHJlcGVhdGFibGUua2V5XSkuam9pbignIC0gJyk7XG5cbiAgICBjb25zdCBvYmplY3ROYW1lID0gW3ByZWZpeCwgbmFtZV0uam9pbignIC0gJyk7XG5cbiAgICByZXR1cm4gdGhpcy50cmltSWRlbnRpZmllcihmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgIT09IGZhbHNlID8gc25ha2Uob2JqZWN0TmFtZSkgOiBvYmplY3ROYW1lKTtcbiAgfVxuXG4gIGFzeW5jIGludm9rZUJlZm9yZUZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLmJlZm9yZVN5bmMpIHtcbiAgICAgIGF3YWl0IHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGludm9rZUFmdGVyRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hZnRlclN5bmMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIGNsZWFudXBGcmllbmRseVZpZXdzKGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnJlbG9hZFZpZXdMaXN0KCk7XG5cbiAgICBjb25zdCBhY3RpdmVWaWV3TmFtZXMgPSBbXTtcblxuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICBhY3RpdmVWaWV3TmFtZXMucHVzaCh0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIG51bGwpKTtcblxuICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICBhY3RpdmVWaWV3TmFtZXMucHVzaCh0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZW1vdmUgPSBkaWZmZXJlbmNlKHRoaXMudmlld05hbWVzLCBhY3RpdmVWaWV3TmFtZXMpO1xuXG4gICAgZm9yIChjb25zdCB2aWV3TmFtZSBvZiByZW1vdmUpIHtcbiAgICAgIGlmICh2aWV3TmFtZS5pbmRleE9mKCd2aWV3XycpID09PSAwIHx8IHZpZXdOYW1lLmluZGV4T2YoJ3ZpZXcgLSAnKSA9PT0gMCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnRFJPUCBWSUVXIElGIEVYSVNUUyAlcy4lczsnLCB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy52aWV3U2NoZW1hKSwgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSkpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgZm9ybVZlcnNpb24gPSAoZm9ybSkgPT4ge1xuICAgIGlmIChmb3JtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG4gIH1cblxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnN0ZG91dC5pc1RUWSkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY2xlYXJMaW5lKCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BTeXN0ZW1UYWJsZXMoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHRlbXBsYXRlRHJvcCkpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBEYXRhYmFzZSgpIHtcbiAgICBhd2FpdCB0aGlzLnJ1bih0aGlzLnByZXBhcmVNaWdyYXRpb25TY3JpcHQodmVyc2lvbjAwMSkpO1xuICB9XG5cbiAgcHJlcGFyZU1pZ3JhdGlvblNjcmlwdChzcWwpIHtcbiAgICByZXR1cm4gc3FsLnJlcGxhY2UoL19fU0NIRU1BX18vZywgdGhpcy5kYXRhU2NoZW1hKVxuICAgICAgICAgICAgICAucmVwbGFjZSgvX19WSUVXX1NDSEVNQV9fL2csIHRoaXMudmlld1NjaGVtYSk7XG4gIH1cblxuICBhc3luYyBzZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KSB7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkKTtcbiAgICB9O1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFBob3RvKHt9LCBhc3luYyAocGhvdG8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Bob3RvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoVmlkZW8oe30sIGFzeW5jICh2aWRlbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnVmlkZW9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hBdWRpbyh7fSwgYXN5bmMgKGF1ZGlvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdBdWRpbycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hhbmdlc2V0KHt9LCBhc3luYyAoY2hhbmdlc2V0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaGFuZ2VzZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFJvbGUoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1JvbGVzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQcm9qZWN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQcm9qZWN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoRm9ybSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnRm9ybXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaE1lbWJlcnNoaXAoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ01lbWJlcnNoaXBzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaG9pY2VMaXN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaG9pY2UgTGlzdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENsYXNzaWZpY2F0aW9uU2V0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDbGFzc2lmaWNhdGlvbiBTZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBtYXliZUluaXRpYWxpemUoKSB7XG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKHRoaXMudGFibGVOYW1lcy5pbmRleE9mKCdtaWdyYXRpb25zJykgPT09IC0xKSB7XG4gICAgICBjb25zb2xlLmxvZygnSW5pdGl0YWxpemluZyBkYXRhYmFzZS4uLicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KSB7XG4gICAgdGhpcy5taWdyYXRpb25zID0gKGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgbmFtZSBGUk9NICR7IHRoaXMuZGF0YVNjaGVtYSB9Lm1pZ3JhdGlvbnNgKSkubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb24oJzAwMicsIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb24oJzAwMycsIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb24oJzAwNCcsIGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVSdW5NaWdyYXRpb24odmVyc2lvbiwgYWNjb3VudCkge1xuICAgIGlmICh0aGlzLm1pZ3JhdGlvbnMuaW5kZXhPZih2ZXJzaW9uKSA9PT0gLTEgJiYgTUlHUkFUSU9OU1t2ZXJzaW9uXSkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KE1JR1JBVElPTlNbdmVyc2lvbl0pKTtcblxuICAgICAgaWYgKHZlcnNpb24gPT09ICcwMDInKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQb3B1bGF0aW5nIHN5c3RlbSB0YWJsZXMuLi4nKTtcblxuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICBhd2FpdCB0aGlzLnBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBwb3B1bGF0ZVJlY29yZHMoYWNjb3VudCkge1xuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgaW5kZXggPSAwO1xuXG4gICAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5wcm9ncmVzcyhmb3JtLm5hbWUsIGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gIH1cbn1cbiJdfQ==