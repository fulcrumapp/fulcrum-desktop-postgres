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

        const systemValues = _fulcrumDesktopPlugin.PostgresRecordValues.systemColumnValuesForFeature(record, null, record, _extends({}, _this.recordValueOptions, {
          disableComplexTypes: false }));

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
    return sql.replace(/__SCHEMA__/g, this.dataSchema).replace(/__VIEW_SCHEMA__/g, this.viewSchema);
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
      _this26.migrations = (yield _this26.run(`SELECT name FROM ${_this26.dataSchema}.migrations`)).map(function (o) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwiREVGQVVMVF9TQ0hFTUEiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInBnRHJvcCIsImRyb3BTeXN0ZW1UYWJsZXMiLCJwZ1NldHVwIiwic2V0dXBEYXRhYmFzZSIsImFjY291bnQiLCJmZXRjaEFjY291bnQiLCJvcmciLCJwZ1N5c3RlbVRhYmxlc09ubHkiLCJzZXR1cFN5c3RlbVRhYmxlcyIsImludm9rZUJlZm9yZUZ1bmN0aW9uIiwiZm9ybXMiLCJmaW5kQWN0aXZlRm9ybXMiLCJmb3JtIiwicGdGb3JtIiwiaWQiLCJwZ1JlYnVpbGRWaWV3c09ubHkiLCJyZWJ1aWxkRnJpZW5kbHlWaWV3cyIsInJlYnVpbGRGb3JtIiwiaW5kZXgiLCJ1cGRhdGVTdGF0dXMiLCJuYW1lIiwiZ3JlZW4iLCJ0b1N0cmluZyIsInJlZCIsImNvbnNvbGUiLCJsb2ciLCJpbnZva2VBZnRlckZ1bmN0aW9uIiwiZXJyb3IiLCJydW4iLCJzcWwiLCJyZXBsYWNlIiwiZGVidWciLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBvb2wiLCJxdWVyeSIsImVyciIsInJlcyIsInJvd3MiLCJ0YWJsZU5hbWUiLCJyb3dJRCIsIm9uU3luY1N0YXJ0IiwidGFza3MiLCJvblN5bmNGaW5pc2giLCJvbkZvcm1TYXZlIiwib2xkRm9ybSIsIm5ld0Zvcm0iLCJ1cGRhdGVGb3JtIiwib25Gb3JtRGVsZXRlIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25QaG90b1NhdmUiLCJwaG90byIsInVwZGF0ZVBob3RvIiwib25WaWRlb1NhdmUiLCJ2aWRlbyIsInVwZGF0ZVZpZGVvIiwib25BdWRpb1NhdmUiLCJhdWRpbyIsInVwZGF0ZUF1ZGlvIiwib25DaGFuZ2VzZXRTYXZlIiwiY2hhbmdlc2V0IiwidXBkYXRlQ2hhbmdlc2V0Iiwib25DaG9pY2VMaXN0U2F2ZSIsImNob2ljZUxpc3QiLCJ1cGRhdGVDaG9pY2VMaXN0Iiwib25DbGFzc2lmaWNhdGlvblNldFNhdmUiLCJjbGFzc2lmaWNhdGlvblNldCIsInVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0Iiwib25Qcm9qZWN0U2F2ZSIsInByb2plY3QiLCJ1cGRhdGVQcm9qZWN0Iiwib25Sb2xlU2F2ZSIsInJvbGUiLCJ1cGRhdGVSb2xlIiwib25NZW1iZXJzaGlwU2F2ZSIsIm1lbWJlcnNoaXAiLCJ1cGRhdGVNZW1iZXJzaGlwIiwicmVsb2FkVGFibGVMaXN0IiwiZGF0YVNjaGVtYSIsInRhYmxlTmFtZXMiLCJiYXNlTWVkaWFVUkwiLCJmb3JtYXRQaG90b1VSTCIsImZvcm1hdFZpZGVvVVJMIiwiZm9ybWF0QXVkaW9VUkwiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInBnQ3VzdG9tTW9kdWxlIiwic2hvdWxkVXBkYXRlUmVjb3JkIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJkaXNhYmxlQ29tcGxleFR5cGVzIiwidXBkYXRlT2JqZWN0IiwiaW5kZXhPZiIsInRhYmxlTmFtZVdpdGhGb3JtIiwicmVjcmVhdGVGb3JtVGFibGVzIiwiZm9ybVZlcnNpb24iLCJleCIsInNob3VsZFVwZGF0ZUZvcm0iLCJ1cGRhdGVGb3JtT2JqZWN0IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZGlzYWJsZUFycmF5cyIsImRyb3BGcmllbmRseVZpZXciLCJyZXBlYXRhYmxlIiwiZWxlbWVudHNPZlR5cGUiLCJjcmVhdGVGcmllbmRseVZpZXciLCJpbnRlZ3JpdHlXYXJuaW5nIiwibWVzc2FnZSIsInByb2Nlc3MiLCJzdGRvdXQiLCJpc1RUWSIsImNsZWFyTGluZSIsImN1cnNvclRvIiwid3JpdGUiLCJwcm9ncmVzcyIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ0RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ0hvc3QiLCJwZ1BvcnQiLCJwZ1VzZXIiLCJwZ1Bhc3N3b3JkIiwicGdTY2hlbWEiLCJwZ1NjaGVtYVZpZXdzIiwicGdTeW5jRXZlbnRzIiwicGdCZWZvcmVGdW5jdGlvbiIsInBnQWZ0ZXJGdW5jdGlvbiIsInJlcXVpcmVkIiwicGdSZXBvcnRCYXNlVXJsIiwicGdNZWRpYUJhc2VVcmwiLCJwZ1VuZGVyc2NvcmVOYW1lcyIsInBnQXJyYXlzIiwicGdTaW1wbGVUeXBlcyIsImhhbmRsZXIiLCJlc2NhcGVJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImlkZW50Iiwic3Vic3RyaW5nIiwidXNlU3luY0V2ZW50cyIsIm9wdGlvbnMiLCJ1c2VyIiwicGFzc3dvcmQiLCJyZXF1aXJlIiwiYXBwIiwiUG9vbCIsIm9uIiwidmlld1NjaGVtYSIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJvYmplY3QiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJ3YXJuIiwic3RhY2siLCJzY2hlbWEiLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJkYXRhTmFtZSIsImJlZm9yZVN5bmMiLCJhZnRlclN5bmMiLCJmaW5kRWFjaFJlY29yZCIsInByZXBhcmVNaWdyYXRpb25TY3JpcHQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaENoYW5nZXNldCIsImZpbmRFYWNoUm9sZSIsImZpbmRFYWNoUHJvamVjdCIsImZpbmRFYWNoRm9ybSIsImZpbmRFYWNoTWVtYmVyc2hpcCIsImZpbmRFYWNoQ2hvaWNlTGlzdCIsImZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQiLCJtYXliZVJ1bk1pZ3JhdGlvbnMiLCJtaWdyYXRpb25zIiwibWF5YmVSdW5NaWdyYXRpb24iLCJ2ZXJzaW9uIiwicG9wdWxhdGVSZWNvcmRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7SUFJWUEsRzs7QUFIWjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFHQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7OztBQUVBLE1BQU1DLHdCQUF3QixFQUE5Qjs7QUFFQSxNQUFNQyxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O0FBUUEsTUFBTUMsYUFBYTtBQUNqQiwwQkFEaUI7QUFFakIsMEJBRmlCO0FBR2pCO0FBSGlCLENBQW5COztBQU1BLE1BQU1DLGlCQUFpQixRQUF2Qjs7a0JBRWUsTUFBTTtBQUFBO0FBQUE7O0FBQUEsU0FzSG5CQyxVQXRIbUIscUJBc0hOLGFBQVk7QUFDdkIsWUFBTSxNQUFL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QzlDQSxtQkFBTzVDLElBQVAsR0FBY0EsSUFBZDs7QUFFQSxnQkFBSSxFQUFFTSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QixzQkFBS2dILFFBQUwsQ0FBY3RILEtBQUtRLElBQW5CLEVBQXlCRixLQUF6QjtBQUNEOztBQUVELGtCQUFNLFFBQUt1QyxZQUFMLENBQWtCRCxNQUFsQixFQUEwQnBELE9BQTFCLEVBQW1DLEtBQW5DLENBQU47QUFDRCxXQVJLOztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQU47QUFTRDtBQWpCNEI7QUFrQjlCOztBQXYxQmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuaW1wb3J0IHRlbXBsYXRlRHJvcCBmcm9tICcuL3RlbXBsYXRlLmRyb3Auc3FsJztcbmltcG9ydCBTY2hlbWFNYXAgZnJvbSAnLi9zY2hlbWEtbWFwJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICdmdWxjcnVtJztcblxuaW1wb3J0IHZlcnNpb24wMDEgZnJvbSAnLi92ZXJzaW9uLTAwMS5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDIgZnJvbSAnLi92ZXJzaW9uLTAwMi5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDMgZnJvbSAnLi92ZXJzaW9uLTAwMy5zcWwnO1xuaW1wb3J0IHZlcnNpb24wMDQgZnJvbSAnLi92ZXJzaW9uLTAwNC5zcWwnO1xuXG5jb25zdCBNQVhfSURFTlRJRklFUl9MRU5HVEggPSA2MztcblxuY29uc3QgUE9TVEdSRVNfQ09ORklHID0ge1xuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxuICBob3N0OiAnbG9jYWxob3N0JyxcbiAgcG9ydDogNTQzMixcbiAgbWF4OiAxMCxcbiAgaWRsZVRpbWVvdXRNaWxsaXM6IDMwMDAwXG59O1xuXG5jb25zdCBNSUdSQVRJT05TID0ge1xuICAnMDAyJzogdmVyc2lvbjAwMixcbiAgJzAwMyc6IHZlcnNpb24wMDMsXG4gICcwMDQnOiB2ZXJzaW9uMDA0XG59O1xuXG5jb25zdCBERUZBVUxUX1NDSEVNQSA9ICdwdWJsaWMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGFzeW5jIHRhc2soY2xpKSB7XG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICdwb3N0Z3JlcycsXG4gICAgICBkZXNjOiAncnVuIHRoZSBwb3N0Z3JlcyBzeW5jIGZvciBhIHNwZWNpZmljIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIHBnRGF0YWJhc2U6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBkYXRhYmFzZSBuYW1lJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdIb3N0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIGhvc3QnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIHBnUG9ydDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBwb3J0JyxcbiAgICAgICAgICB0eXBlOiAnaW50ZWdlcicsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLnBvcnRcbiAgICAgICAgfSxcbiAgICAgICAgcGdVc2VyOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgdXNlcicsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdQYXNzd29yZDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHBhc3N3b3JkJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NjaGVtYToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWFWaWV3czoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNjaGVtYSBmb3IgdGhlIGZyaWVuZGx5IHZpZXdzJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Zvcm06IHtcbiAgICAgICAgICBkZXNjOiAndGhlIGZvcm0gSUQgdG8gcmVidWlsZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZXBvcnRCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ3JlcG9ydCBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdNZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnVW5kZXJzY29yZU5hbWVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB1bmRlcnNjb3JlIG5hbWVzIChlLmcuIFwiUGFyayBJbnNwZWN0aW9uc1wiIGJlY29tZXMgXCJwYXJrX2luc3BlY3Rpb25zXCIpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQ3VzdG9tTW9kdWxlOiB7XG4gICAgICAgICAgZGVzYzogJ2EgY3VzdG9tIG1vZHVsZSB0byBsb2FkIHdpdGggc3luYyBleHRlbnNpb25zJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTZXR1cDoge1xuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgfSxcbiAgICAgICAgcGdEcm9wOiB7XG4gICAgICAgICAgZGVzYzogJ2Ryb3AgdGhlIHN5c3RlbSB0YWJsZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdBcnJheXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIGFycmF5IHR5cGVzIGZvciBtdWx0aS12YWx1ZSBmaWVsZHMgbGlrZSBjaG9pY2UgZmllbGRzLCBjbGFzc2lmaWNhdGlvbiBmaWVsZHMgYW5kIG1lZGlhIGZpZWxkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2ltcGxlVHlwZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHNpbXBsZSB0eXBlcyBpbiB0aGUgZGF0YWJhc2UgdGhhdCBhcmUgbW9yZSBjb21wYXRpYmxlIHdpdGggb3RoZXIgYXBwbGljYXRpb25zIChubyB0c3ZlY3RvciwgZ2VvbWV0cnksIGFycmF5cyknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeXN0ZW1UYWJsZXNPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgY3JlYXRlIHRoZSBzeXN0ZW0gcmVjb3JkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdEcm9wKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BTeXN0ZW1UYWJsZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2V0dXApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU3lzdGVtVGFibGVzT25seSkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRm9ybSAmJiBmb3JtLmlkICE9PSBmdWxjcnVtLmFyZ3MucGdGb3JtKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBlc2NhcGVJZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgICByZXR1cm4gaWRlbnRpZmllciAmJiB0aGlzLnBnZGIuaWRlbnQoaWRlbnRpZmllci5zdWJzdHJpbmcoMCwgTUFYX0lERU5USUZJRVJfTEVOR1RIKSk7XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcGkgPSBhcGk7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFwcCA9IGZ1bGNydW07XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FycmF5cyA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUFycmF5cyA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NpbXBsZVR5cGVzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmRpc2FibGVDb21wbGV4VHlwZXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52aWV3U2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hVmlld3MgfHwgREVGQVVMVF9TQ0hFTUE7XG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8IERFRkFVTFRfU0NIRU1BO1xuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKGBTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9JyR7IHRoaXMuZGF0YVNjaGVtYSB9J2ApO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXG4gICAgdGhpcy5wZ2RiID0gbmV3IFBvc3RncmVzKHt9KTtcblxuICAgIHRoaXMuc2V0dXBPcHRpb25zKCk7XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlSW5pdGlhbGl6ZSgpO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uRm9ybVNhdmUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm19KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuICB9XG5cbiAgb25Gb3JtRGVsZXRlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50fSkgPT4ge1xuICAgIGNvbnN0IG9sZEZvcm0gPSB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbnVsbCk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIG9uUGhvdG9TYXZlID0gYXN5bmMgKHtwaG90bywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uVmlkZW9TYXZlID0gYXN5bmMgKHt2aWRlbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQXVkaW9TYXZlID0gYXN5bmMgKHthdWRpbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hhbmdlc2V0U2F2ZSA9IGFzeW5jICh7Y2hhbmdlc2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtjaG9pY2VMaXN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChjaG9pY2VMaXN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2xhc3NpZmljYXRpb25TZXRTYXZlID0gYXN5bmMgKHtjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KGNsYXNzaWZpY2F0aW9uU2V0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUHJvamVjdFNhdmUgPSBhc3luYyAoe3Byb2plY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KHByb2plY3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25Sb2xlU2F2ZSA9IGFzeW5jICh7cm9sZSwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUocm9sZSwgYWNjb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHttZW1iZXJzaGlwLCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChtZW1iZXJzaGlwLCBhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVBob3RvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5waG90byhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFBob3RvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3Bob3RvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlVmlkZW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnZpZGVvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0VmlkZW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAndmlkZW9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVBdWRpbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAuYXVkaW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRBdWRpb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdhdWRpbycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hhbmdlc2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaGFuZ2VzZXQob2JqZWN0KSwgJ2NoYW5nZXNldHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnByb2plY3Qob2JqZWN0KSwgJ3Byb2plY3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5tZW1iZXJzaGlwKG9iamVjdCksICdtZW1iZXJzaGlwcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucm9sZShvYmplY3QpLCAncm9sZXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmZvcm0ob2JqZWN0KSwgJ2Zvcm1zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jaG9pY2VMaXN0KG9iamVjdCksICdjaG9pY2VfbGlzdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5jbGFzc2lmaWNhdGlvblNldChvYmplY3QpLCAnY2xhc3NpZmljYXRpb25fc2V0cycpO1xuICB9XG5cblxuICBhc3luYyB1cGRhdGVPYmplY3QodmFsdWVzLCB0YWJsZSkge1xuICAgIGNvbnN0IGRlbGV0ZVN0YXRlbWVudCA9IHRoaXMucGdkYi5kZWxldGVTdGF0ZW1lbnQoYCR7IHRoaXMuZGF0YVNjaGVtYSB9LnN5c3RlbV8ke3RhYmxlfWAsIHtyb3dfcmVzb3VyY2VfaWQ6IHZhbHVlcy5yb3dfcmVzb3VyY2VfaWR9KTtcbiAgICBjb25zdCBpbnNlcnRTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuaW5zZXJ0U3RhdGVtZW50KGAkeyB0aGlzLmRhdGFTY2hlbWEgfS5zeXN0ZW1fJHt0YWJsZX1gLCB2YWx1ZXMsIHtwazogJ2lkJ30pO1xuXG4gICAgY29uc3Qgc3FsID0gWyBkZWxldGVTdGF0ZW1lbnQuc3FsLCBpbnNlcnRTdGF0ZW1lbnQuc3FsIF0uam9pbignXFxuJyk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oYFNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nJHsgdGhpcy5kYXRhU2NoZW1hIH0nYCk7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBiYXNlTWVkaWFVUkwgPSAoKSA9PiB7XG4gIH1cblxuICBmb3JtYXRQaG90b1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3MvJHsgaWQgfS5qcGdgO1xuICB9XG5cbiAgZm9ybWF0VmlkZW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zLyR7IGlkIH0ubXA0YDtcbiAgfVxuXG4gIGZvcm1hdEF1ZGlvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvLyR7IGlkIH0ubTRhYDtcbiAgfVxuXG4gIGludGVncml0eVdhcm5pbmcoZXgpIHtcbiAgICBjb25zb2xlLndhcm4oYFxuLS0tLS0tLS0tLS0tLVxuISEgV0FSTklORyAhIVxuLS0tLS0tLS0tLS0tLVxuXG5Qb3N0Z3JlU1FMIGRhdGFiYXNlIGludGVncml0eSBpc3N1ZSBlbmNvdW50ZXJlZC4gQ29tbW9uIHNvdXJjZXMgb2YgcG9zdGdyZXMgZGF0YWJhc2UgaXNzdWVzIGFyZTpcblxuKiBSZWluc3RhbGxpbmcgRnVsY3J1bSBEZXNrdG9wIGFuZCB1c2luZyBhbiBvbGQgcG9zdGdyZXMgZGF0YWJhc2Ugd2l0aG91dCByZWNyZWF0aW5nXG4gIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZS5cbiogRGVsZXRpbmcgdGhlIGludGVybmFsIGFwcGxpY2F0aW9uIGRhdGFiYXNlIGFuZCB1c2luZyBhbiBleGlzdGluZyBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBNYW51YWxseSBtb2RpZnlpbmcgdGhlIHBvc3RncmVzIGRhdGFiYXNlXG4qIEZvcm0gbmFtZSBhbmQgcmVwZWF0YWJsZSBkYXRhIG5hbWUgY29tYmluYXRpb25zIHRoYXQgZXhjZWVlZCB0aGUgcG9zdGdyZXMgbGltaXQgb2YgNjNcbiAgY2hhcmFjdGVycy4gSXQncyBiZXN0IHRvIGtlZXAgeW91ciBmb3JtIG5hbWVzIHdpdGhpbiB0aGUgbGltaXQuIFRoZSBcImZyaWVuZGx5IHZpZXdcIlxuICBmZWF0dXJlIG9mIHRoZSBwbHVnaW4gZGVyaXZlcyB0aGUgb2JqZWN0IG5hbWVzIGZyb20gdGhlIGZvcm0gYW5kIHJlcGVhdGFibGUgbmFtZXMuXG4qIENyZWF0aW5nIG11bHRpcGxlIGFwcHMgaW4gRnVsY3J1bSB3aXRoIHRoZSBzYW1lIG5hbWUuIFRoaXMgaXMgZ2VuZXJhbGx5IE9LLCBleGNlcHRcbiAgeW91IHdpbGwgbm90IGJlIGFibGUgdG8gdXNlIHRoZSBcImZyaWVuZGx5IHZpZXdcIiBmZWF0dXJlIG9mIHRoZSBwb3N0Z3JlcyBwbHVnaW4gc2luY2VcbiAgdGhlIHZpZXcgbmFtZXMgYXJlIGRlcml2ZWQgZnJvbSB0aGUgZm9ybSBuYW1lcy5cblxuTm90ZTogV2hlbiByZWluc3RhbGxpbmcgRnVsY3J1bSBEZXNrdG9wIG9yIFwic3RhcnRpbmcgb3ZlclwiIHlvdSBuZWVkIHRvIGRyb3AgYW5kIHJlLWNyZWF0ZVxudGhlIHBvc3RncmVzIGRhdGFiYXNlLiBUaGUgbmFtZXMgb2YgZGF0YWJhc2Ugb2JqZWN0cyBhcmUgdGllZCBkaXJlY3RseSB0byB0aGUgZGF0YWJhc2Vcbm9iamVjdHMgaW4gdGhlIGludGVybmFsIGFwcGxpY2F0aW9uIGRhdGFiYXNlLlxuXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblJlcG9ydCBpc3N1ZXMgYXQgaHR0cHM6Ly9naXRodWIuY29tL2Z1bGNydW1hcHAvZnVsY3J1bS1kZXNrdG9wL2lzc3Vlc1xuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5NZXNzYWdlOlxuJHsgZXgubWVzc2FnZSB9XG5cblN0YWNrOlxuJHsgZXguc3RhY2sgfVxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5gLnJlZFxuICAgICk7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5iYXNlTWVkaWFVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly9hcGkuZnVsY3J1bWFwcC5jb20vYXBpL3YyJztcblxuICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zID0ge1xuICAgICAgc2NoZW1hOiB0aGlzLmRhdGFTY2hlbWEsXG5cbiAgICAgIGRpc2FibGVBcnJheXM6IHRoaXMuZGlzYWJsZUFycmF5cyxcblxuICAgICAgZGlzYWJsZUNvbXBsZXhUeXBlczogdGhpcy5kaXNhYmxlQ29tcGxleFR5cGVzLFxuXG4gICAgICB2YWx1ZXNUcmFuc2Zvcm1lcjogdGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnZhbHVlc1RyYW5zZm9ybWVyLFxuXG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcblxuICAgICAgICByZXR1cm4gbWVkaWFWYWx1ZS5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRQaG90b1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRWaWRlb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRBdWRpb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zL3ZpZXc/cGhvdG9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQgJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkKHtyZWNvcmQsIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG5cbiAgICBjb25zdCBzeXN0ZW1WYWx1ZXMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy5zeXN0ZW1Db2x1bW5WYWx1ZXNGb3JGZWF0dXJlKHJlY29yZCwgbnVsbCwgcmVjb3JkLCB7Li4udGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVDb21wbGV4VHlwZXM6IGZhbHNlfSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucmVjb3JkKHJlY29yZCwgc3lzdGVtVmFsdWVzKSwgJ3JlY29yZHMnKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtKHtmb3JtLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtT2JqZWN0KGZvcm0sIGFjY291bnQpO1xuXG4gICAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgICBvbGRGb3JtID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0sIHRoaXMuZGlzYWJsZUFycmF5cyxcbiAgICAgICAgdGhpcy5kaXNhYmxlQ29tcGxleFR5cGVzLCB0aGlzLnBnQ3VzdG9tTW9kdWxlLCB0aGlzLmRhdGFTY2hlbWEpO1xuXG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnJ1bihbJ0JFR0lOIFRSQU5TQUNUSU9OOycsXG4gICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGVtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAnQ09NTUlUIFRSQU5TQUNUSU9OOyddLmpvaW4oJ1xcbicpKTtcblxuICAgICAgaWYgKG5ld0Zvcm0pIHtcbiAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzIENBU0NBREU7JywgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMudmlld1NjaGVtYSksIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0NSRUFURSBWSUVXICVzLiVzIEFTIFNFTEVDVCAqIEZST00gJXMuJXNfdmlld19mdWxsOycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMudmlld1NjaGVtYSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUlkZW50aWZpZXIodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICB9XG4gIH1cblxuICBnZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3QgbmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnVW5kZXJzY29yZU5hbWVzID8gc25ha2UobmFtZSkgOiBuYW1lO1xuICB9XG5cbiAgYXN5bmMgaW52b2tlQmVmb3JlRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQWZ0ZXJGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIHByb2dyZXNzKSB7XG4gICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcbiAgICBpZiAoZm9ybSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlU3RhdHVzID0gKG1lc3NhZ2UpID0+IHtcbiAgICBpZiAocHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wU3lzdGVtVGFibGVzKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh0ZW1wbGF0ZURyb3ApKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwRGF0YWJhc2UoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHZlcnNpb24wMDEpKTtcbiAgfVxuXG4gIHByZXBhcmVNaWdyYXRpb25TY3JpcHQoc3FsKSB7XG4gICAgcmV0dXJuIHNxbC5yZXBsYWNlKC9fX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSlcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLnZpZXdTY2hlbWEpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gICAgfTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQaG90byh7fSwgYXN5bmMgKHBob3RvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQaG90b3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFZpZGVvKHt9LCBhc3luYyAodmlkZW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1ZpZGVvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQXVkaW8oe30sIGFzeW5jIChhdWRpbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQXVkaW8nLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENoYW5nZXNldCh7fSwgYXN5bmMgKGNoYW5nZXNldCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hhbmdlc2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hSb2xlKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdSb2xlcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUHJvamVjdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUHJvamVjdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEZvcm0oe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Zvcm1zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hNZW1iZXJzaGlwKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdNZW1iZXJzaGlwcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hvaWNlTGlzdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hvaWNlIExpc3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2xhc3NpZmljYXRpb24gU2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVJbml0aWFsaXplKCkge1xuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmICh0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZignbWlncmF0aW9ucycpID09PSAtMSkge1xuICAgICAgY29uc29sZS5sb2coJ0luaXRpdGFsaXppbmcgZGF0YWJhc2UuLi4nKTtcblxuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5tYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyBtYXliZVJ1bk1pZ3JhdGlvbnMoYWNjb3VudCkge1xuICAgIHRoaXMubWlncmF0aW9ucyA9IChhd2FpdCB0aGlzLnJ1bihgU0VMRUNUIG5hbWUgRlJPTSAkeyB0aGlzLmRhdGFTY2hlbWEgfS5taWdyYXRpb25zYCkpLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9uKCcwMDInLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9uKCcwMDMnLCBhY2NvdW50KTtcbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9uKCcwMDQnLCBhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlUnVuTWlncmF0aW9uKHZlcnNpb24sIGFjY291bnQpIHtcbiAgICBpZiAodGhpcy5taWdyYXRpb25zLmluZGV4T2YodmVyc2lvbikgPT09IC0xICYmIE1JR1JBVElPTlNbdmVyc2lvbl0pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdChNSUdSQVRJT05TW3ZlcnNpb25dKSk7XG5cbiAgICAgIGlmICh2ZXJzaW9uID09PSAnMDAyJykge1xuICAgICAgICBjb25zb2xlLmxvZygnUG9wdWxhdGluZyBzeXN0ZW0gdGFibGVzLi4uJyk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgYXdhaXQgdGhpcy5wb3B1bGF0ZVJlY29yZHMoYWNjb3VudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcG9wdWxhdGVSZWNvcmRzKGFjY291bnQpIHtcbiAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgIGluZGV4ID0gMDtcblxuICAgICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMucHJvZ3Jlc3MoZm9ybS5uYW1lLCBpbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIGZhbHNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICB9XG59XG4iXX0=