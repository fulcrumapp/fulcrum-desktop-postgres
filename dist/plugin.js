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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJhcGkiLCJNQVhfSURFTlRJRklFUl9MRU5HVEgiLCJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJNSUdSQVRJT05TIiwicnVuQ29tbWFuZCIsImFjdGl2YXRlIiwiZnVsY3J1bSIsImFyZ3MiLCJwZ0Ryb3AiLCJkcm9wU3lzdGVtVGFibGVzIiwicGdTZXR1cCIsInNldHVwRGF0YWJhc2UiLCJhY2NvdW50IiwiZmV0Y2hBY2NvdW50Iiwib3JnIiwicGdTeXN0ZW1UYWJsZXNPbmx5Iiwic2V0dXBTeXN0ZW1UYWJsZXMiLCJpbnZva2VCZWZvcmVGdW5jdGlvbiIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInBnRm9ybSIsImlkIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uRm9ybURlbGV0ZSIsIl9pZCIsInJvd19pZCIsIl9uYW1lIiwiZWxlbWVudHMiLCJfZWxlbWVudHNKU09OIiwib25SZWNvcmRTYXZlIiwicmVjb3JkIiwidXBkYXRlUmVjb3JkIiwib25SZWNvcmREZWxldGUiLCJzdGF0ZW1lbnRzIiwiZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInBnZGIiLCJyZWNvcmRWYWx1ZU9wdGlvbnMiLCJtYXAiLCJvIiwiam9pbiIsIm9uUGhvdG9TYXZlIiwicGhvdG8iLCJ1cGRhdGVQaG90byIsIm9uVmlkZW9TYXZlIiwidmlkZW8iLCJ1cGRhdGVWaWRlbyIsIm9uQXVkaW9TYXZlIiwiYXVkaW8iLCJ1cGRhdGVBdWRpbyIsIm9uQ2hhbmdlc2V0U2F2ZSIsImNoYW5nZXNldCIsInVwZGF0ZUNoYW5nZXNldCIsIm9uQ2hvaWNlTGlzdFNhdmUiLCJjaG9pY2VMaXN0IiwidXBkYXRlQ2hvaWNlTGlzdCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwiY2xhc3NpZmljYXRpb25TZXQiLCJ1cGRhdGVDbGFzc2lmaWNhdGlvblNldCIsIm9uUHJvamVjdFNhdmUiLCJwcm9qZWN0IiwidXBkYXRlUHJvamVjdCIsIm9uUm9sZVNhdmUiLCJyb2xlIiwidXBkYXRlUm9sZSIsIm9uTWVtYmVyc2hpcFNhdmUiLCJtZW1iZXJzaGlwIiwidXBkYXRlTWVtYmVyc2hpcCIsInJlbG9hZFRhYmxlTGlzdCIsInRhYmxlTmFtZXMiLCJiYXNlTWVkaWFVUkwiLCJmb3JtYXRQaG90b1VSTCIsImZvcm1hdFZpZGVvVVJMIiwiZm9ybWF0QXVkaW9VUkwiLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInBnQ3VzdG9tTW9kdWxlIiwic2hvdWxkVXBkYXRlUmVjb3JkIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJ1cGRhdGVPYmplY3QiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsInVwZGF0ZUZvcm1PYmplY3QiLCJnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMiLCJkaXNhYmxlQXJyYXlzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImludGVncml0eVdhcm5pbmciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInByb2dyZXNzIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInBnRGF0YWJhc2UiLCJ0eXBlIiwiZGVmYXVsdCIsInBnSG9zdCIsInBnUG9ydCIsInBnVXNlciIsInBnUGFzc3dvcmQiLCJwZ1NjaGVtYSIsInBnU3luY0V2ZW50cyIsInBnQmVmb3JlRnVuY3Rpb24iLCJwZ0FmdGVyRnVuY3Rpb24iLCJyZXF1aXJlZCIsInBnUmVwb3J0QmFzZVVybCIsInBnTWVkaWFCYXNlVXJsIiwicGdVbmRlcnNjb3JlTmFtZXMiLCJwZ0FycmF5cyIsImhhbmRsZXIiLCJlc2NhcGVJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImlkZW50Iiwic3Vic3RyaW5nIiwidXNlU3luY0V2ZW50cyIsIm9wdGlvbnMiLCJ1c2VyIiwicGFzc3dvcmQiLCJyZXF1aXJlIiwiYXBwIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJvYmplY3QiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJ3YXJuIiwic3RhY2siLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJkYXRhTmFtZSIsImJlZm9yZVN5bmMiLCJhZnRlclN5bmMiLCJmaW5kRWFjaFJlY29yZCIsInByZXBhcmVNaWdyYXRpb25TY3JpcHQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaENoYW5nZXNldCIsImZpbmRFYWNoUm9sZSIsImZpbmRFYWNoUHJvamVjdCIsImZpbmRFYWNoRm9ybSIsImZpbmRFYWNoTWVtYmVyc2hpcCIsImZpbmRFYWNoQ2hvaWNlTGlzdCIsImZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQiLCJtYXliZVJ1bk1pZ3JhdGlvbnMiLCJtaWdyYXRpb25zIiwibWF5YmVSdW5NaWdyYXRpb24iLCJ2ZXJzaW9uIiwicG9wdWxhdGVSZWNvcmRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7SUFJWUEsRzs7QUFIWjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFHQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7OztBQUVBLE1BQU1DLHdCQUF3QixFQUE5Qjs7QUFFQSxNQUFNQyxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O0FBUUEsTUFBTUMsYUFBYTtBQUNqQiwwQkFEaUI7QUFFakIsMEJBRmlCO0FBR2pCO0FBSGlCLENBQW5COztrQkFNZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQTRHbkJDLFVBNUdtQixxQkE0R04sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxVQUFJQyxRQUFRQyxJQUFSLENBQWFDLE1BQWpCLEVBQXlCO0FBQ3ZCLGNBQU0sTUFBS0MsZ0JBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSUgsUUFBUUMsSUFBUixDQUFhRyxPQUFqQixFQUEwQjtBQUN4QixjQUFNLE1BQUtDLGFBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsWUFBTUMsVUFBVSxNQUFNTixRQUFRTyxZQUFSLENBQXFCUCxRQUFRQyxJQUFSLENBQWFPLEdBQWxDLENBQXRCOztBQUVBLFVBQUlGLE9BQUosRUFBYTtBQUNYLFlBQUlOLFFBQVFDLElBQVIsQ0FBYVEsa0JBQWpCLEVBQXFDO0FBQ25DLGdCQUFNLE1BQUtDLGlCQUFMLENBQXVCSixPQUF2QixDQUFOO0FBQ0E7QUFDRDs7QUFFRCxjQUFNLE1BQUtLLG9CQUFMLEVBQU47O0FBRUEsY0FBTUMsUUFBUSxNQUFNTixRQUFRTyxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLGFBQUssTUFBTUMsSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEIsY0FBSVosUUFBUUMsSUFBUixDQUFhYyxNQUFiLElBQXVCRCxLQUFLRSxFQUFMLEtBQVloQixRQUFRQyxJQUFSLENBQWFjLE1BQXBELEVBQTREO0FBQzFEO0FBQ0Q7O0FBRUQsY0FBSWYsUUFBUUMsSUFBUixDQUFhZ0Isa0JBQWpCLEVBQXFDO0FBQ25DLGtCQUFNLE1BQUtDLG9CQUFMLENBQTBCSixJQUExQixFQUFnQ1IsT0FBaEMsQ0FBTjtBQUNELFdBRkQsTUFFTztBQUNMLGtCQUFNLE1BQUthLFdBQUwsQ0FBaUJMLElBQWpCLEVBQXVCUixPQUF2QixFQUFnQyxVQUFDYyxLQUFELEVBQVc7QUFDL0Msb0JBQUtDLFlBQUwsQ0FBa0JQLEtBQUtRLElBQUwsQ0FBVUMsS0FBVixHQUFrQixLQUFsQixHQUEwQkgsTUFBTUksUUFBTixHQUFpQkMsR0FBM0MsR0FBaUQsVUFBbkU7QUFDRCxhQUZLLENBQU47QUFHRDs7QUFFREMsa0JBQVFDLEdBQVIsQ0FBWSxFQUFaO0FBQ0Q7O0FBRUQsY0FBTSxNQUFLQyxtQkFBTCxFQUFOO0FBQ0QsT0EzQkQsTUEyQk87QUFDTEYsZ0JBQVFHLEtBQVIsQ0FBYyx3QkFBZCxFQUF3QzdCLFFBQVFDLElBQVIsQ0FBYU8sR0FBckQ7QUFDRDtBQUNGLEtBekprQjs7QUFBQSxTQXFQbkJzQixHQXJQbUIsR0FxUFpDLEdBQUQsSUFBUztBQUNiQSxZQUFNQSxJQUFJQyxPQUFKLENBQVksS0FBWixFQUFtQixFQUFuQixDQUFOOztBQUVBLFVBQUloQyxRQUFRQyxJQUFSLENBQWFnQyxLQUFqQixFQUF3QjtBQUN0QlAsZ0JBQVFDLEdBQVIsQ0FBWUksR0FBWjtBQUNEOztBQUVELGFBQU8sSUFBSUcsT0FBSixDQUFZLENBQUNDLE9BQUQsRUFBVUMsTUFBVixLQUFxQjtBQUN0QyxhQUFLQyxJQUFMLENBQVVDLEtBQVYsQ0FBZ0JQLEdBQWhCLEVBQXFCLEVBQXJCLEVBQXlCLENBQUNRLEdBQUQsRUFBTUMsR0FBTixLQUFjO0FBQ3JDLGNBQUlELEdBQUosRUFBUztBQUNQLG1CQUFPSCxPQUFPRyxHQUFQLENBQVA7QUFDRDs7QUFFRCxpQkFBT0osUUFBUUssSUFBSUMsSUFBWixDQUFQO0FBQ0QsU0FORDtBQU9ELE9BUk0sQ0FBUDtBQVNELEtBclFrQjs7QUFBQSxTQXVRbkJkLEdBdlFtQixHQXVRYixDQUFDLEdBQUcxQixJQUFKLEtBQWE7QUFDakI7QUFDRCxLQXpRa0I7O0FBQUEsU0EyUW5CeUMsU0EzUW1CLEdBMlFQLENBQUNwQyxPQUFELEVBQVVnQixJQUFWLEtBQW1CO0FBQzdCLGFBQU8sYUFBYWhCLFFBQVFxQyxLQUFyQixHQUE2QixHQUE3QixHQUFtQ3JCLElBQTFDO0FBQ0QsS0E3UWtCOztBQUFBLFNBK1FuQnNCLFdBL1FtQjtBQUFBLG9DQStRTCxXQUFPLEVBQUN0QyxPQUFELEVBQVV1QyxLQUFWLEVBQVAsRUFBNEI7QUFDeEMsY0FBTSxNQUFLbEMsb0JBQUwsRUFBTjtBQUNELE9BalJrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQW1SbkJtQyxZQW5SbUI7QUFBQSxvQ0FtUkosV0FBTyxFQUFDeEMsT0FBRCxFQUFQLEVBQXFCO0FBQ2xDLGNBQU0sTUFBS3NCLG1CQUFMLEVBQU47QUFDRCxPQXJSa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0F1Um5CbUIsVUF2Um1CO0FBQUEsb0NBdVJOLFdBQU8sRUFBQ2pDLElBQUQsRUFBT1IsT0FBUCxFQUFnQjBDLE9BQWhCLEVBQXlCQyxPQUF6QixFQUFQLEVBQTZDO0FBQ3hELGNBQU0sTUFBS0MsVUFBTCxDQUFnQnBDLElBQWhCLEVBQXNCUixPQUF0QixFQUErQjBDLE9BQS9CLEVBQXdDQyxPQUF4QyxDQUFOO0FBQ0QsT0F6UmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBMlJuQkUsWUEzUm1CO0FBQUEsb0NBMlJKLFdBQU8sRUFBQ3JDLElBQUQsRUFBT1IsT0FBUCxFQUFQLEVBQTJCO0FBQ3hDLGNBQU0wQyxVQUFVO0FBQ2RoQyxjQUFJRixLQUFLc0MsR0FESztBQUVkQyxrQkFBUXZDLEtBQUs2QixLQUZDO0FBR2RyQixnQkFBTVIsS0FBS3dDLEtBSEc7QUFJZEMsb0JBQVV6QyxLQUFLMEM7QUFKRCxTQUFoQjs7QUFPQSxjQUFNLE1BQUtOLFVBQUwsQ0FBZ0JwQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IwQyxPQUEvQixFQUF3QyxJQUF4QyxDQUFOO0FBQ0QsT0FwU2tCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBc1NuQlMsWUF0U21CO0FBQUEsb0NBc1NKLFdBQU8sRUFBQ0MsTUFBRCxFQUFTcEQsT0FBVCxFQUFQLEVBQTZCO0FBQzFDLGNBQU0sTUFBS3FELFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCcEQsT0FBMUIsQ0FBTjtBQUNELE9BeFNrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQTBTbkJzRCxjQTFTbUI7QUFBQSxvQ0EwU0YsV0FBTyxFQUFDRixNQUFELEVBQVAsRUFBb0I7QUFDbkMsY0FBTUcsYUFBYSwyQ0FBcUJDLHlCQUFyQixDQUErQyxNQUFLQyxJQUFwRCxFQUEwREwsTUFBMUQsRUFBa0VBLE9BQU81QyxJQUF6RSxFQUErRSxNQUFLa0Qsa0JBQXBGLENBQW5COztBQUVBLGNBQU0sTUFBS2xDLEdBQUwsQ0FBUytCLFdBQVdJLEdBQVgsQ0FBZTtBQUFBLGlCQUFLQyxFQUFFbkMsR0FBUDtBQUFBLFNBQWYsRUFBMkJvQyxJQUEzQixDQUFnQyxJQUFoQyxDQUFULENBQU47QUFDRCxPQTlTa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FnVG5CQyxXQWhUbUI7QUFBQSxvQ0FnVEwsV0FBTyxFQUFDQyxLQUFELEVBQVEvRCxPQUFSLEVBQVAsRUFBNEI7QUFDeEMsY0FBTSxNQUFLZ0UsV0FBTCxDQUFpQkQsS0FBakIsRUFBd0IvRCxPQUF4QixDQUFOO0FBQ0QsT0FsVGtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBb1RuQmlFLFdBcFRtQjtBQUFBLG9DQW9UTCxXQUFPLEVBQUNDLEtBQUQsRUFBUWxFLE9BQVIsRUFBUCxFQUE0QjtBQUN4QyxjQUFNLE1BQUttRSxXQUFMLENBQWlCRCxLQUFqQixFQUF3QmxFLE9BQXhCLENBQU47QUFDRCxPQXRUa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0F3VG5Cb0UsV0F4VG1CO0FBQUEscUNBd1RMLFdBQU8sRUFBQ0MsS0FBRCxFQUFRckUsT0FBUixFQUFQLEVBQTRCO0FBQ3hDLGNBQU0sTUFBS3NFLFdBQUwsQ0FBaUJELEtBQWpCLEVBQXdCckUsT0FBeEIsQ0FBTjtBQUNELE9BMVRrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQTRUbkJ1RSxlQTVUbUI7QUFBQSxxQ0E0VEQsV0FBTyxFQUFDQyxTQUFELEVBQVl4RSxPQUFaLEVBQVAsRUFBZ0M7QUFDaEQsY0FBTSxNQUFLeUUsZUFBTCxDQUFxQkQsU0FBckIsRUFBZ0N4RSxPQUFoQyxDQUFOO0FBQ0QsT0E5VGtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBZ1VuQjBFLGdCQWhVbUI7QUFBQSxxQ0FnVUEsV0FBTyxFQUFDQyxVQUFELEVBQWEzRSxPQUFiLEVBQVAsRUFBaUM7QUFDbEQsY0FBTSxNQUFLNEUsZ0JBQUwsQ0FBc0JELFVBQXRCLEVBQWtDM0UsT0FBbEMsQ0FBTjtBQUNELE9BbFVrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQW9VbkI2RSx1QkFwVW1CO0FBQUEscUNBb1VPLFdBQU8sRUFBQ0MsaUJBQUQsRUFBb0I5RSxPQUFwQixFQUFQLEVBQXdDO0FBQ2hFLGNBQU0sTUFBSytFLHVCQUFMLENBQTZCRCxpQkFBN0IsRUFBZ0Q5RSxPQUFoRCxDQUFOO0FBQ0QsT0F0VWtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBd1VuQmdGLGFBeFVtQjtBQUFBLHFDQXdVSCxXQUFPLEVBQUNDLE9BQUQsRUFBVWpGLE9BQVYsRUFBUCxFQUE4QjtBQUM1QyxjQUFNLE1BQUtrRixhQUFMLENBQW1CRCxPQUFuQixFQUE0QmpGLE9BQTVCLENBQU47QUFDRCxPQTFVa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0E0VW5CbUYsVUE1VW1CO0FBQUEscUNBNFVOLFdBQU8sRUFBQ0MsSUFBRCxFQUFPcEYsT0FBUCxFQUFQLEVBQTJCO0FBQ3RDLGNBQU0sTUFBS3FGLFVBQUwsQ0FBZ0JELElBQWhCLEVBQXNCcEYsT0FBdEIsQ0FBTjtBQUNELE9BOVVrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQWdWbkJzRixnQkFoVm1CO0FBQUEscUNBZ1ZBLFdBQU8sRUFBQ0MsVUFBRCxFQUFhdkYsT0FBYixFQUFQLEVBQWlDO0FBQ2xELGNBQU0sTUFBS3dGLGdCQUFMLENBQXNCRCxVQUF0QixFQUFrQ3ZGLE9BQWxDLENBQU47QUFDRCxPQWxWa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0F1Wm5CeUYsZUF2Wm1CLHFCQXVaRCxhQUFZO0FBQzVCLFlBQU10RCxPQUFPLE1BQU0sTUFBS1gsR0FBTCxDQUFTLHNGQUFULENBQW5COztBQUVBLFlBQUtrRSxVQUFMLEdBQWtCdkQsS0FBS3dCLEdBQUwsQ0FBUztBQUFBLGVBQUtDLEVBQUU1QyxJQUFQO0FBQUEsT0FBVCxDQUFsQjtBQUNELEtBM1prQjs7QUFBQSxTQTZabkIyRSxZQTdabUIsR0E2WkosTUFBTSxDQUNwQixDQTlaa0I7O0FBQUEsU0FnYW5CQyxjQWhhbUIsR0FnYURsRixFQUFELElBQVE7QUFDdkIsYUFBUSxHQUFHLEtBQUtpRixZQUFjLFdBQVdqRixFQUFJLE1BQTdDO0FBQ0QsS0FsYWtCOztBQUFBLFNBb2FuQm1GLGNBcGFtQixHQW9hRG5GLEVBQUQsSUFBUTtBQUN2QixhQUFRLEdBQUcsS0FBS2lGLFlBQWMsV0FBV2pGLEVBQUksTUFBN0M7QUFDRCxLQXRha0I7O0FBQUEsU0F3YW5Cb0YsY0F4YW1CLEdBd2FEcEYsRUFBRCxJQUFRO0FBQ3ZCLGFBQVEsR0FBRyxLQUFLaUYsWUFBYyxVQUFVakYsRUFBSSxNQUE1QztBQUNELEtBMWFrQjs7QUFBQSxTQTZmbkIyQyxZQTdmbUI7QUFBQSxxQ0E2ZkosV0FBT0QsTUFBUCxFQUFlcEQsT0FBZixFQUF3QitGLGNBQXhCLEVBQTJDO0FBQ3hELFlBQUksQ0FBQ0EsY0FBRCxJQUFtQixDQUFDLE1BQUtDLGVBQUwsQ0FBcUI1QyxPQUFPNUMsSUFBNUIsQ0FBeEIsRUFBMkQ7QUFDekQsZ0JBQU0sTUFBS0ssV0FBTCxDQUFpQnVDLE9BQU81QyxJQUF4QixFQUE4QlIsT0FBOUIsRUFBdUMsWUFBTSxDQUFFLENBQS9DLENBQU47QUFDRDs7QUFFRCxZQUFJLE1BQUtpRyxjQUFMLElBQXVCLE1BQUtBLGNBQUwsQ0FBb0JDLGtCQUEzQyxJQUFpRSxDQUFDLE1BQUtELGNBQUwsQ0FBb0JDLGtCQUFwQixDQUF1QyxFQUFDOUMsTUFBRCxFQUFTcEQsT0FBVCxFQUF2QyxDQUF0RSxFQUFpSTtBQUMvSDtBQUNEOztBQUVELGNBQU11RCxhQUFhLDJDQUFxQjRDLHlCQUFyQixDQUErQyxNQUFLMUMsSUFBcEQsRUFBMERMLE1BQTFELEVBQWtFLE1BQUtNLGtCQUF2RSxDQUFuQjs7QUFFQSxjQUFNLE1BQUtsQyxHQUFMLENBQVMrQixXQUFXSSxHQUFYLENBQWU7QUFBQSxpQkFBS0MsRUFBRW5DLEdBQVA7QUFBQSxTQUFmLEVBQTJCb0MsSUFBM0IsQ0FBZ0MsSUFBaEMsQ0FBVCxDQUFOOztBQUVBLGNBQU11QyxlQUFlLDJDQUFxQkMsNEJBQXJCLENBQWtEakQsTUFBbEQsRUFBMEQsSUFBMUQsRUFBZ0VBLE1BQWhFLEVBQXdFLE1BQUtNLGtCQUE3RSxDQUFyQjs7QUFFQSxjQUFNLE1BQUs0QyxZQUFMLENBQWtCLG9CQUFVbEQsTUFBVixDQUFpQkEsTUFBakIsRUFBeUJnRCxZQUF6QixDQUFsQixFQUEwRCxTQUExRCxDQUFOO0FBQ0QsT0E3Z0JrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQStnQm5CSixlQS9nQm1CLEdBK2dCQXhGLElBQUQsSUFBVTtBQUMxQixhQUFPLEtBQUtrRixVQUFMLENBQWdCYSxPQUFoQixDQUF3QiwyQ0FBcUJDLGlCQUFyQixDQUF1Q2hHLElBQXZDLENBQXhCLE1BQTBFLENBQUMsQ0FBbEY7QUFDRCxLQWpoQmtCOztBQUFBLFNBbWhCbkJpRyxrQkFuaEJtQjtBQUFBLHFDQW1oQkUsV0FBT2pHLElBQVAsRUFBYVIsT0FBYixFQUF5QjtBQUM1QyxZQUFJO0FBQ0YsZ0JBQU0sTUFBSzRDLFVBQUwsQ0FBZ0JwQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IsTUFBSzBHLFdBQUwsQ0FBaUJsRyxJQUFqQixDQUEvQixFQUF1RCxJQUF2RCxDQUFOO0FBQ0QsU0FGRCxDQUVFLE9BQU9tRyxFQUFQLEVBQVc7QUFDWCxjQUFJakgsUUFBUUMsSUFBUixDQUFhZ0MsS0FBakIsRUFBd0I7QUFDdEJQLG9CQUFRRyxLQUFSLENBQWNFLEdBQWQ7QUFDRDtBQUNGOztBQUVELGNBQU0sTUFBS21CLFVBQUwsQ0FBZ0JwQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IsSUFBL0IsRUFBcUMsTUFBSzBHLFdBQUwsQ0FBaUJsRyxJQUFqQixDQUFyQyxDQUFOO0FBQ0QsT0E3aEJrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQStoQm5Cb0MsVUEvaEJtQjtBQUFBLHFDQStoQk4sV0FBT3BDLElBQVAsRUFBYVIsT0FBYixFQUFzQjBDLE9BQXRCLEVBQStCQyxPQUEvQixFQUEyQztBQUN0RCxZQUFJLE1BQUtzRCxjQUFMLElBQXVCLE1BQUtBLGNBQUwsQ0FBb0JXLGdCQUEzQyxJQUErRCxDQUFDLE1BQUtYLGNBQUwsQ0FBb0JXLGdCQUFwQixDQUFxQyxFQUFDcEcsSUFBRCxFQUFPUixPQUFQLEVBQXJDLENBQXBFLEVBQTJIO0FBQ3pIO0FBQ0Q7O0FBRUQsWUFBSTtBQUNGLGdCQUFNLE1BQUs2RyxnQkFBTCxDQUFzQnJHLElBQXRCLEVBQTRCUixPQUE1QixDQUFOOztBQUVBLGNBQUksQ0FBQyxNQUFLZ0csZUFBTCxDQUFxQnhGLElBQXJCLENBQUQsSUFBK0JtQyxXQUFXLElBQTlDLEVBQW9EO0FBQ2xERCxzQkFBVSxJQUFWO0FBQ0Q7O0FBRUQsZ0JBQU0sRUFBQ2EsVUFBRCxLQUFlLE1BQU0saUJBQWV1RCx3QkFBZixDQUF3QzlHLE9BQXhDLEVBQWlEMEMsT0FBakQsRUFBMERDLE9BQTFELEVBQW1FLE1BQUtvRSxhQUF4RSxFQUF1RixNQUFLZCxjQUE1RixDQUEzQjs7QUFFQSxnQkFBTSxNQUFLZSxnQkFBTCxDQUFzQnhHLElBQXRCLEVBQTRCLElBQTVCLENBQU47O0FBRUEsZUFBSyxNQUFNeUcsVUFBWCxJQUF5QnpHLEtBQUswRyxjQUFMLENBQW9CLFlBQXBCLENBQXpCLEVBQTREO0FBQzFELGtCQUFNLE1BQUtGLGdCQUFMLENBQXNCeEcsSUFBdEIsRUFBNEJ5RyxVQUE1QixDQUFOO0FBQ0Q7O0FBRUQsZ0JBQU0sTUFBS3pGLEdBQUwsQ0FBUyxDQUFDLG9CQUFELEVBQ0MsR0FBRytCLFVBREosRUFFQyxxQkFGRCxFQUV3Qk0sSUFGeEIsQ0FFNkIsSUFGN0IsQ0FBVCxDQUFOOztBQUlBLGNBQUlsQixPQUFKLEVBQWE7QUFDWCxrQkFBTSxNQUFLd0Usa0JBQUwsQ0FBd0IzRyxJQUF4QixFQUE4QixJQUE5QixDQUFOOztBQUVBLGlCQUFLLE1BQU15RyxVQUFYLElBQXlCekcsS0FBSzBHLGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsb0JBQU0sTUFBS0Msa0JBQUwsQ0FBd0IzRyxJQUF4QixFQUE4QnlHLFVBQTlCLENBQU47QUFDRDtBQUNGO0FBQ0YsU0ExQkQsQ0EwQkUsT0FBT04sRUFBUCxFQUFXO0FBQ1gsZ0JBQUtTLGdCQUFMLENBQXNCVCxFQUF0QjtBQUNBLGdCQUFNQSxFQUFOO0FBQ0Q7QUFDRixPQWxrQmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBcXBCbkJELFdBcnBCbUIsR0FxcEJKbEcsSUFBRCxJQUFVO0FBQ3RCLFVBQUlBLFFBQVEsSUFBWixFQUFrQjtBQUNoQixlQUFPLElBQVA7QUFDRDs7QUFFRCxhQUFPO0FBQ0xFLFlBQUlGLEtBQUtzQyxHQURKO0FBRUxDLGdCQUFRdkMsS0FBSzZCLEtBRlI7QUFHTHJCLGNBQU1SLEtBQUt3QyxLQUhOO0FBSUxDLGtCQUFVekMsS0FBSzBDO0FBSlYsT0FBUDtBQU1ELEtBaHFCa0I7O0FBQUEsU0FrcUJuQm5DLFlBbHFCbUIsR0FrcUJIc0csT0FBRCxJQUFhO0FBQzFCLFVBQUlDLFFBQVFDLE1BQVIsQ0FBZUMsS0FBbkIsRUFBMEI7QUFDeEJGLGdCQUFRQyxNQUFSLENBQWVFLFNBQWY7QUFDQUgsZ0JBQVFDLE1BQVIsQ0FBZUcsUUFBZixDQUF3QixDQUF4QjtBQUNBSixnQkFBUUMsTUFBUixDQUFlSSxLQUFmLENBQXFCTixPQUFyQjtBQUNEO0FBQ0YsS0F4cUJrQjs7QUFBQSxTQWswQm5CTyxRQWwwQm1CLEdBazBCUixDQUFDNUcsSUFBRCxFQUFPRixLQUFQLEtBQWlCO0FBQzFCLFdBQUtDLFlBQUwsQ0FBa0JDLEtBQUtDLEtBQUwsR0FBYSxLQUFiLEdBQXFCSCxNQUFNSSxRQUFOLEdBQWlCQyxHQUF4RDtBQUNELEtBcDBCa0I7QUFBQTs7QUFDYjBHLE1BQU4sQ0FBV0MsR0FBWCxFQUFnQjtBQUFBOztBQUFBO0FBQ2QsYUFBT0EsSUFBSUMsT0FBSixDQUFZO0FBQ2pCQSxpQkFBUyxVQURRO0FBRWpCQyxjQUFNLG1EQUZXO0FBR2pCQyxpQkFBUztBQUNQQyxzQkFBWTtBQUNWRixrQkFBTSwwQkFESTtBQUVWRyxrQkFBTSxRQUZJO0FBR1ZDLHFCQUFTbkosZ0JBQWdCQztBQUhmLFdBREw7QUFNUG1KLGtCQUFRO0FBQ05MLGtCQUFNLHdCQURBO0FBRU5HLGtCQUFNLFFBRkE7QUFHTkMscUJBQVNuSixnQkFBZ0JFO0FBSG5CLFdBTkQ7QUFXUG1KLGtCQUFRO0FBQ05OLGtCQUFNLHdCQURBO0FBRU5HLGtCQUFNLFNBRkE7QUFHTkMscUJBQVNuSixnQkFBZ0JHO0FBSG5CLFdBWEQ7QUFnQlBtSixrQkFBUTtBQUNOUCxrQkFBTSxpQkFEQTtBQUVORyxrQkFBTTtBQUZBLFdBaEJEO0FBb0JQSyxzQkFBWTtBQUNWUixrQkFBTSxxQkFESTtBQUVWRyxrQkFBTTtBQUZJLFdBcEJMO0FBd0JQTSxvQkFBVTtBQUNSVCxrQkFBTSxtQkFERTtBQUVSRyxrQkFBTTtBQUZFLFdBeEJIO0FBNEJQTyx3QkFBYztBQUNaVixrQkFBTSxzQkFETTtBQUVaRyxrQkFBTSxTQUZNO0FBR1pDLHFCQUFTO0FBSEcsV0E1QlA7QUFpQ1BPLDRCQUFrQjtBQUNoQlgsa0JBQU0sb0NBRFU7QUFFaEJHLGtCQUFNO0FBRlUsV0FqQ1g7QUFxQ1BTLDJCQUFpQjtBQUNmWixrQkFBTSxtQ0FEUztBQUVmRyxrQkFBTTtBQUZTLFdBckNWO0FBeUNQakksZUFBSztBQUNIOEgsa0JBQU0sbUJBREg7QUFFSGEsc0JBQVUsSUFGUDtBQUdIVixrQkFBTTtBQUhILFdBekNFO0FBOENQMUgsa0JBQVE7QUFDTnVILGtCQUFNLHdCQURBO0FBRU5HLGtCQUFNO0FBRkEsV0E5Q0Q7QUFrRFBXLDJCQUFpQjtBQUNmZCxrQkFBTSxpQkFEUztBQUVmRyxrQkFBTTtBQUZTLFdBbERWO0FBc0RQWSwwQkFBZ0I7QUFDZGYsa0JBQU0sZ0JBRFE7QUFFZEcsa0JBQU07QUFGUSxXQXREVDtBQTBEUGEsNkJBQW1CO0FBQ2pCaEIsa0JBQU0sMkVBRFc7QUFFakJhLHNCQUFVLEtBRk87QUFHakJWLGtCQUFNLFNBSFc7QUFJakJDLHFCQUFTO0FBSlEsV0ExRFo7QUFnRVB6SCw4QkFBb0I7QUFDbEJxSCxrQkFBTSx3QkFEWTtBQUVsQmEsc0JBQVUsS0FGUTtBQUdsQlYsa0JBQU0sU0FIWTtBQUlsQkMscUJBQVM7QUFKUyxXQWhFYjtBQXNFUG5DLDBCQUFnQjtBQUNkK0Isa0JBQU0sOENBRFE7QUFFZGEsc0JBQVUsS0FGSTtBQUdkVixrQkFBTTtBQUhRLFdBdEVUO0FBMkVQckksbUJBQVM7QUFDUGtJLGtCQUFNLG9CQURDO0FBRVBhLHNCQUFVLEtBRkg7QUFHUFYsa0JBQU07QUFIQyxXQTNFRjtBQWdGUHZJLGtCQUFRO0FBQ05vSSxrQkFBTSx3QkFEQTtBQUVOYSxzQkFBVSxLQUZKO0FBR05WLGtCQUFNLFNBSEE7QUFJTkMscUJBQVM7QUFKSCxXQWhGRDtBQXNGUGEsb0JBQVU7QUFDUmpCLGtCQUFNLG1HQURFO0FBRVJhLHNCQUFVLEtBRkY7QUFHUlYsa0JBQU0sU0FIRTtBQUlSQyxxQkFBUztBQUpELFdBdEZIO0FBNEZQakksOEJBQW9CO0FBQ2xCNkgsa0JBQU0sZ0NBRFk7QUFFbEJhLHNCQUFVLEtBRlE7QUFHbEJWLGtCQUFNLFNBSFk7QUFJbEJDLHFCQUFTO0FBSlM7QUE1RmIsU0FIUTtBQXNHakJjLGlCQUFTLE9BQUsxSjtBQXRHRyxPQUFaLENBQVA7QUFEYztBQXlHZjs7QUFpREQySixtQkFBaUJDLFVBQWpCLEVBQTZCO0FBQzNCLFdBQU9BLGNBQWMsS0FBSzNGLElBQUwsQ0FBVTRGLEtBQVYsQ0FBZ0JELFdBQVdFLFNBQVgsQ0FBcUIsQ0FBckIsRUFBd0J0SyxxQkFBeEIsQ0FBaEIsQ0FBckI7QUFDRDs7QUFFRCxNQUFJdUssYUFBSixHQUFvQjtBQUNsQixXQUFPN0osUUFBUUMsSUFBUixDQUFhK0ksWUFBYixJQUE2QixJQUE3QixHQUFvQ2hKLFFBQVFDLElBQVIsQ0FBYStJLFlBQWpELEdBQWdFLElBQXZFO0FBQ0Q7O0FBRUtqSixVQUFOLEdBQWlCO0FBQUE7O0FBQUE7QUFDZixZQUFNK0osdUJBQ0R2SyxlQURDO0FBRUpFLGNBQU1PLFFBQVFDLElBQVIsQ0FBYTBJLE1BQWIsSUFBdUJwSixnQkFBZ0JFLElBRnpDO0FBR0pDLGNBQU1NLFFBQVFDLElBQVIsQ0FBYTJJLE1BQWIsSUFBdUJySixnQkFBZ0JHLElBSHpDO0FBSUpGLGtCQUFVUSxRQUFRQyxJQUFSLENBQWF1SSxVQUFiLElBQTJCakosZ0JBQWdCQyxRQUpqRDtBQUtKdUssY0FBTS9KLFFBQVFDLElBQVIsQ0FBYTRJLE1BQWIsSUFBdUJ0SixnQkFBZ0J3SyxJQUx6QztBQU1KQyxrQkFBVWhLLFFBQVFDLElBQVIsQ0FBYTZJLFVBQWIsSUFBMkJ2SixnQkFBZ0J3SztBQU5qRCxRQUFOOztBQVNBLFVBQUkvSixRQUFRQyxJQUFSLENBQWE0SSxNQUFqQixFQUF5QjtBQUN2QmlCLGdCQUFRQyxJQUFSLEdBQWUvSixRQUFRQyxJQUFSLENBQWE0SSxNQUE1QjtBQUNEOztBQUVELFVBQUk3SSxRQUFRQyxJQUFSLENBQWE2SSxVQUFqQixFQUE2QjtBQUMzQmdCLGdCQUFRRSxRQUFSLEdBQW1CaEssUUFBUUMsSUFBUixDQUFhNkksVUFBaEM7QUFDRDs7QUFFRCxVQUFJOUksUUFBUUMsSUFBUixDQUFhc0csY0FBakIsRUFBaUM7QUFDL0IsZUFBS0EsY0FBTCxHQUFzQjBELFFBQVFqSyxRQUFRQyxJQUFSLENBQWFzRyxjQUFyQixDQUF0QjtBQUNBLGVBQUtBLGNBQUwsQ0FBb0JsSCxHQUFwQixHQUEwQkEsR0FBMUI7QUFDQSxlQUFLa0gsY0FBTCxDQUFvQjJELEdBQXBCLEdBQTBCbEssT0FBMUI7QUFDRDs7QUFFRCxVQUFJQSxRQUFRQyxJQUFSLENBQWFzSixRQUFiLEtBQTBCLEtBQTlCLEVBQXFDO0FBQ25DLGVBQUtsQyxhQUFMLEdBQXFCLElBQXJCO0FBQ0Q7O0FBRUQsYUFBS2hGLElBQUwsR0FBWSxJQUFJLGFBQUc4SCxJQUFQLENBQVlMLE9BQVosQ0FBWjs7QUFFQSxVQUFJLE9BQUtELGFBQVQsRUFBd0I7QUFDdEI3SixnQkFBUW9LLEVBQVIsQ0FBVyxZQUFYLEVBQXlCLE9BQUt4SCxXQUE5QjtBQUNBNUMsZ0JBQVFvSyxFQUFSLENBQVcsYUFBWCxFQUEwQixPQUFLdEgsWUFBL0I7QUFDQTlDLGdCQUFRb0ssRUFBUixDQUFXLFlBQVgsRUFBeUIsT0FBS2hHLFdBQTlCO0FBQ0FwRSxnQkFBUW9LLEVBQVIsQ0FBVyxZQUFYLEVBQXlCLE9BQUs3RixXQUE5QjtBQUNBdkUsZ0JBQVFvSyxFQUFSLENBQVcsWUFBWCxFQUF5QixPQUFLMUYsV0FBOUI7QUFDQTFFLGdCQUFRb0ssRUFBUixDQUFXLGdCQUFYLEVBQTZCLE9BQUt2RixlQUFsQztBQUNBN0UsZ0JBQVFvSyxFQUFSLENBQVcsYUFBWCxFQUEwQixPQUFLM0csWUFBL0I7QUFDQXpELGdCQUFRb0ssRUFBUixDQUFXLGVBQVgsRUFBNEIsT0FBS3hHLGNBQWpDOztBQUVBNUQsZ0JBQVFvSyxFQUFSLENBQVcsa0JBQVgsRUFBK0IsT0FBS3BGLGdCQUFwQztBQUNBaEYsZ0JBQVFvSyxFQUFSLENBQVcsb0JBQVgsRUFBaUMsT0FBS3BGLGdCQUF0Qzs7QUFFQWhGLGdCQUFRb0ssRUFBUixDQUFXLFdBQVgsRUFBd0IsT0FBS3JILFVBQTdCO0FBQ0EvQyxnQkFBUW9LLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUtySCxVQUEvQjs7QUFFQS9DLGdCQUFRb0ssRUFBUixDQUFXLHlCQUFYLEVBQXNDLE9BQUtqRix1QkFBM0M7QUFDQW5GLGdCQUFRb0ssRUFBUixDQUFXLDJCQUFYLEVBQXdDLE9BQUtqRix1QkFBN0M7O0FBRUFuRixnQkFBUW9LLEVBQVIsQ0FBVyxXQUFYLEVBQXdCLE9BQUszRSxVQUE3QjtBQUNBekYsZ0JBQVFvSyxFQUFSLENBQVcsYUFBWCxFQUEwQixPQUFLM0UsVUFBL0I7O0FBRUF6RixnQkFBUW9LLEVBQVIsQ0FBVyxjQUFYLEVBQTJCLE9BQUs5RSxhQUFoQztBQUNBdEYsZ0JBQVFvSyxFQUFSLENBQVcsZ0JBQVgsRUFBNkIsT0FBSzlFLGFBQWxDOztBQUVBdEYsZ0JBQVFvSyxFQUFSLENBQVcsaUJBQVgsRUFBOEIsT0FBS3hFLGdCQUFuQztBQUNBNUYsZ0JBQVFvSyxFQUFSLENBQVcsbUJBQVgsRUFBZ0MsT0FBS3hFLGdCQUFyQztBQUNEOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBTW5ELE9BQU8sTUFBTSxPQUFLWCxHQUFMLENBQVMsc0ZBQVQsQ0FBbkI7O0FBRUEsYUFBS3VJLFVBQUwsR0FBa0JySyxRQUFRQyxJQUFSLENBQWE4SSxRQUFiLElBQXlCLFFBQTNDO0FBQ0EsYUFBSy9DLFVBQUwsR0FBa0J2RCxLQUFLd0IsR0FBTCxDQUFTO0FBQUEsZUFBS0MsRUFBRTVDLElBQVA7QUFBQSxPQUFULENBQWxCOztBQUVBO0FBQ0EsYUFBS3lDLElBQUwsR0FBWSxtQ0FBYSxFQUFiLENBQVo7O0FBRUEsYUFBS3VHLFlBQUw7O0FBRUEsWUFBTSxPQUFLQyxlQUFMLEVBQU47QUF6RWU7QUEwRWhCOztBQUVLQyxZQUFOLEdBQW1CO0FBQUE7O0FBQUE7QUFDakIsVUFBSSxPQUFLbkksSUFBVCxFQUFlO0FBQ2IsY0FBTSxPQUFLQSxJQUFMLENBQVVvSSxHQUFWLEVBQU47QUFDRDtBQUhnQjtBQUlsQjs7QUFpR0tuRyxhQUFOLENBQWtCb0csTUFBbEIsRUFBMEJwSyxPQUExQixFQUFtQztBQUFBOztBQUFBO0FBQ2pDLFlBQU1xSyxTQUFTLG9CQUFVdEcsS0FBVixDQUFnQnFHLE1BQWhCLENBQWY7O0FBRUFDLGFBQU9DLElBQVAsR0FBYyxPQUFLMUUsY0FBTCxDQUFvQnlFLE9BQU9FLFVBQTNCLENBQWQ7O0FBRUEsWUFBTSxPQUFLakUsWUFBTCxDQUFrQitELE1BQWxCLEVBQTBCLFFBQTFCLENBQU47QUFMaUM7QUFNbEM7O0FBRUtsRyxhQUFOLENBQWtCaUcsTUFBbEIsRUFBMEJwSyxPQUExQixFQUFtQztBQUFBOztBQUFBO0FBQ2pDLFlBQU1xSyxTQUFTLG9CQUFVbkcsS0FBVixDQUFnQmtHLE1BQWhCLENBQWY7O0FBRUFDLGFBQU9DLElBQVAsR0FBYyxPQUFLekUsY0FBTCxDQUFvQndFLE9BQU9FLFVBQTNCLENBQWQ7O0FBRUEsWUFBTSxPQUFLakUsWUFBTCxDQUFrQitELE1BQWxCLEVBQTBCLFFBQTFCLENBQU47QUFMaUM7QUFNbEM7O0FBRUsvRixhQUFOLENBQWtCOEYsTUFBbEIsRUFBMEJwSyxPQUExQixFQUFtQztBQUFBOztBQUFBO0FBQ2pDLFlBQU1xSyxTQUFTLG9CQUFVaEcsS0FBVixDQUFnQitGLE1BQWhCLENBQWY7O0FBRUFDLGFBQU9DLElBQVAsR0FBYyxPQUFLeEUsY0FBTCxDQUFvQnVFLE9BQU9FLFVBQTNCLENBQWQ7O0FBRUEsWUFBTSxPQUFLakUsWUFBTCxDQUFrQitELE1BQWxCLEVBQTBCLE9BQTFCLENBQU47QUFMaUM7QUFNbEM7O0FBRUs1RixpQkFBTixDQUFzQjJGLE1BQXRCLEVBQThCcEssT0FBOUIsRUFBdUM7QUFBQTs7QUFBQTtBQUNyQyxZQUFNLE9BQUtzRyxZQUFMLENBQWtCLG9CQUFVOUIsU0FBVixDQUFvQjRGLE1BQXBCLENBQWxCLEVBQStDLFlBQS9DLENBQU47QUFEcUM7QUFFdEM7O0FBRUtsRixlQUFOLENBQW9Ca0YsTUFBcEIsRUFBNEJwSyxPQUE1QixFQUFxQztBQUFBOztBQUFBO0FBQ25DLFlBQU0sT0FBS3NHLFlBQUwsQ0FBa0Isb0JBQVVyQixPQUFWLENBQWtCbUYsTUFBbEIsQ0FBbEIsRUFBNkMsVUFBN0MsQ0FBTjtBQURtQztBQUVwQzs7QUFFSzVFLGtCQUFOLENBQXVCNEUsTUFBdkIsRUFBK0JwSyxPQUEvQixFQUF3QztBQUFBOztBQUFBO0FBQ3RDLFlBQU0sUUFBS3NHLFlBQUwsQ0FBa0Isb0JBQVVmLFVBQVYsQ0FBcUI2RSxNQUFyQixDQUFsQixFQUFnRCxhQUFoRCxDQUFOO0FBRHNDO0FBRXZDOztBQUVLL0UsWUFBTixDQUFpQitFLE1BQWpCLEVBQXlCcEssT0FBekIsRUFBa0M7QUFBQTs7QUFBQTtBQUNoQyxZQUFNLFFBQUtzRyxZQUFMLENBQWtCLG9CQUFVbEIsSUFBVixDQUFlZ0YsTUFBZixDQUFsQixFQUEwQyxPQUExQyxDQUFOO0FBRGdDO0FBRWpDOztBQUVLdkQsa0JBQU4sQ0FBdUJ1RCxNQUF2QixFQUErQnBLLE9BQS9CLEVBQXdDO0FBQUE7O0FBQUE7QUFDdEMsWUFBTSxRQUFLc0csWUFBTCxDQUFrQixvQkFBVTlGLElBQVYsQ0FBZTRKLE1BQWYsQ0FBbEIsRUFBMEMsT0FBMUMsQ0FBTjtBQURzQztBQUV2Qzs7QUFFS3hGLGtCQUFOLENBQXVCd0YsTUFBdkIsRUFBK0JwSyxPQUEvQixFQUF3QztBQUFBOztBQUFBO0FBQ3RDLFlBQU0sUUFBS3NHLFlBQUwsQ0FBa0Isb0JBQVUzQixVQUFWLENBQXFCeUYsTUFBckIsQ0FBbEIsRUFBZ0QsY0FBaEQsQ0FBTjtBQURzQztBQUV2Qzs7QUFFS3JGLHlCQUFOLENBQThCcUYsTUFBOUIsRUFBc0NwSyxPQUF0QyxFQUErQztBQUFBOztBQUFBO0FBQzdDLFlBQU0sUUFBS3NHLFlBQUwsQ0FBa0Isb0JBQVV4QixpQkFBVixDQUE0QnNGLE1BQTVCLENBQWxCLEVBQXVELHFCQUF2RCxDQUFOO0FBRDZDO0FBRTlDOztBQUdLOUQsY0FBTixDQUFtQitELE1BQW5CLEVBQTJCRyxLQUEzQixFQUFrQztBQUFBOztBQUFBO0FBQ2hDLFlBQU1DLGtCQUFrQixRQUFLaEgsSUFBTCxDQUFVZ0gsZUFBVixDQUEwQixZQUFZRCxLQUF0QyxFQUE2QyxFQUFDRSxpQkFBaUJMLE9BQU9LLGVBQXpCLEVBQTdDLENBQXhCO0FBQ0EsWUFBTUMsa0JBQWtCLFFBQUtsSCxJQUFMLENBQVVrSCxlQUFWLENBQTBCLFlBQVlILEtBQXRDLEVBQTZDSCxNQUE3QyxFQUFxRCxFQUFDTyxJQUFJLElBQUwsRUFBckQsQ0FBeEI7O0FBRUEsWUFBTW5KLE1BQU0sQ0FBRWdKLGdCQUFnQmhKLEdBQWxCLEVBQXVCa0osZ0JBQWdCbEosR0FBdkMsRUFBNkNvQyxJQUE3QyxDQUFrRCxJQUFsRCxDQUFaOztBQUVBLFVBQUk7QUFDRixjQUFNLFFBQUtyQyxHQUFMLENBQVNDLEdBQVQsQ0FBTjtBQUNELE9BRkQsQ0FFRSxPQUFPa0YsRUFBUCxFQUFXO0FBQ1gsZ0JBQUtTLGdCQUFMLENBQXNCVCxFQUF0QjtBQUNBLGNBQU1BLEVBQU47QUFDRDtBQVgrQjtBQVlqQzs7QUF1QkRTLG1CQUFpQlQsRUFBakIsRUFBcUI7QUFDbkJ2RixZQUFReUosSUFBUixDQUFjOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTBCZmxFLEdBQUdVLE9BQVM7OztFQUdaVixHQUFHbUUsS0FBTzs7Q0E3QkksQ0ErQmYzSixHQS9CRTtBQWlDRDs7QUFFRDZJLGlCQUFlO0FBQ2IsU0FBS3JFLFlBQUwsR0FBb0JqRyxRQUFRQyxJQUFSLENBQWFvSixjQUFiLEdBQThCckosUUFBUUMsSUFBUixDQUFhb0osY0FBM0MsR0FBNEQsbUNBQWhGOztBQUVBLFNBQUtyRixrQkFBTCxHQUEwQjtBQUN4QnFELHFCQUFlLEtBQUtBLGFBREk7O0FBR3hCZ0UseUJBQW1CLEtBQUs5RSxjQUFMLElBQXVCLEtBQUtBLGNBQUwsQ0FBb0I4RSxpQkFIdEM7O0FBS3hCQyx5QkFBb0JDLFVBQUQsSUFBZ0I7O0FBRWpDLGVBQU9BLFdBQVdDLEtBQVgsQ0FBaUJ2SCxHQUFqQixDQUFzQndILElBQUQsSUFBVTtBQUNwQyxjQUFJRixXQUFXRyxPQUFYLENBQW1CQyxjQUF2QixFQUF1QztBQUNyQyxtQkFBTyxLQUFLekYsY0FBTCxDQUFvQnVGLEtBQUtHLE9BQXpCLENBQVA7QUFDRCxXQUZELE1BRU8sSUFBSUwsV0FBV0csT0FBWCxDQUFtQkcsY0FBdkIsRUFBdUM7QUFDNUMsbUJBQU8sS0FBSzFGLGNBQUwsQ0FBb0JzRixLQUFLRyxPQUF6QixDQUFQO0FBQ0QsV0FGTSxNQUVBLElBQUlMLFdBQVdHLE9BQVgsQ0FBbUJJLGNBQXZCLEVBQXVDO0FBQzVDLG1CQUFPLEtBQUsxRixjQUFMLENBQW9CcUYsS0FBS0csT0FBekIsQ0FBUDtBQUNEOztBQUVELGlCQUFPLElBQVA7QUFDRCxTQVZNLENBQVA7QUFXRCxPQWxCdUI7O0FBb0J4QkcsNkJBQXdCUixVQUFELElBQWdCO0FBQ3JDLGNBQU1TLE1BQU1ULFdBQVdDLEtBQVgsQ0FBaUJ2SCxHQUFqQixDQUFxQkMsS0FBS0EsRUFBRTBILE9BQTVCLENBQVo7O0FBRUEsWUFBSUwsV0FBV0csT0FBWCxDQUFtQkMsY0FBdkIsRUFBdUM7QUFDckMsaUJBQVEsR0FBRyxLQUFLMUYsWUFBYyx1QkFBdUIrRixHQUFLLEVBQTFEO0FBQ0QsU0FGRCxNQUVPLElBQUlULFdBQVdHLE9BQVgsQ0FBbUJHLGNBQXZCLEVBQXVDO0FBQzVDLGlCQUFRLEdBQUcsS0FBSzVGLFlBQWMsdUJBQXVCK0YsR0FBSyxFQUExRDtBQUNELFNBRk0sTUFFQSxJQUFJVCxXQUFXRyxPQUFYLENBQW1CSSxjQUF2QixFQUF1QztBQUM1QyxpQkFBUSxHQUFHLEtBQUs3RixZQUFjLHFCQUFxQitGLEdBQUssRUFBeEQ7QUFDRDs7QUFFRCxlQUFPLElBQVA7QUFDRDtBQWhDdUIsS0FBMUI7O0FBbUNBLFFBQUloTSxRQUFRQyxJQUFSLENBQWFtSixlQUFqQixFQUFrQztBQUNoQyxXQUFLcEYsa0JBQUwsQ0FBd0JpSSxrQkFBeEIsR0FBOENDLE9BQUQsSUFBYTtBQUN4RCxlQUFRLEdBQUdsTSxRQUFRQyxJQUFSLENBQWFtSixlQUFpQixZQUFZOEMsUUFBUWxMLEVBQUksTUFBakU7QUFDRCxPQUZEO0FBR0Q7QUFDRjs7QUF5RUtzRyxrQkFBTixDQUF1QnhHLElBQXZCLEVBQTZCeUcsVUFBN0IsRUFBeUM7QUFBQTs7QUFBQTtBQUN2QyxZQUFNNEUsV0FBVyxRQUFLQyxvQkFBTCxDQUEwQnRMLElBQTFCLEVBQWdDeUcsVUFBaEMsQ0FBakI7O0FBRUEsVUFBSTtBQUNGLGNBQU0sUUFBS3pGLEdBQUwsQ0FBUyxrQkFBTyxvQ0FBUCxFQUE2QyxRQUFLMkgsZ0JBQUwsQ0FBc0IsUUFBS1ksVUFBM0IsQ0FBN0MsRUFBcUYsUUFBS1osZ0JBQUwsQ0FBc0IwQyxRQUF0QixDQUFyRixDQUFULENBQU47QUFDRCxPQUZELENBRUUsT0FBT2xGLEVBQVAsRUFBVztBQUNYLGdCQUFLUyxnQkFBTCxDQUFzQlQsRUFBdEI7QUFDRDtBQVBzQztBQVF4Qzs7QUFFS1Esb0JBQU4sQ0FBeUIzRyxJQUF6QixFQUErQnlHLFVBQS9CLEVBQTJDO0FBQUE7O0FBQUE7QUFDekMsWUFBTTRFLFdBQVcsUUFBS0Msb0JBQUwsQ0FBMEJ0TCxJQUExQixFQUFnQ3lHLFVBQWhDLENBQWpCOztBQUVBLFVBQUk7QUFDRixjQUFNLFFBQUt6RixHQUFMLENBQVMsa0JBQU8sa0RBQVAsRUFDTyxRQUFLMkgsZ0JBQUwsQ0FBc0IsUUFBS1ksVUFBM0IsQ0FEUCxFQUVPLFFBQUtaLGdCQUFMLENBQXNCMEMsUUFBdEIsQ0FGUCxFQUdPLDJDQUFxQnJGLGlCQUFyQixDQUF1Q2hHLElBQXZDLEVBQTZDeUcsVUFBN0MsQ0FIUCxDQUFULENBQU47QUFJRCxPQUxELENBS0UsT0FBT04sRUFBUCxFQUFXO0FBQ1g7QUFDQSxnQkFBS1MsZ0JBQUwsQ0FBc0JULEVBQXRCO0FBQ0Q7QUFYd0M7QUFZMUM7O0FBRURtRix1QkFBcUJ0TCxJQUFyQixFQUEyQnlHLFVBQTNCLEVBQXVDO0FBQ3JDLFVBQU1qRyxPQUFPaUcsYUFBYyxHQUFFekcsS0FBS1EsSUFBSyxNQUFLaUcsV0FBVzhFLFFBQVMsRUFBbkQsR0FBdUR2TCxLQUFLUSxJQUF6RTs7QUFFQSxXQUFPdEIsUUFBUUMsSUFBUixDQUFhcUosaUJBQWIsR0FBaUMseUJBQU1oSSxJQUFOLENBQWpDLEdBQStDQSxJQUF0RDtBQUNEOztBQUVLWCxzQkFBTixHQUE2QjtBQUFBOztBQUFBO0FBQzNCLFVBQUlYLFFBQVFDLElBQVIsQ0FBYWdKLGdCQUFqQixFQUFtQztBQUNqQyxjQUFNLFFBQUtuSCxHQUFMLENBQVMsa0JBQU8sY0FBUCxFQUF1QjlCLFFBQVFDLElBQVIsQ0FBYWdKLGdCQUFwQyxDQUFULENBQU47QUFDRDtBQUNELFVBQUksUUFBSzFDLGNBQUwsSUFBdUIsUUFBS0EsY0FBTCxDQUFvQitGLFVBQS9DLEVBQTJEO0FBQ3pELGNBQU0sUUFBSy9GLGNBQUwsQ0FBb0IrRixVQUFwQixFQUFOO0FBQ0Q7QUFOMEI7QUFPNUI7O0FBRUsxSyxxQkFBTixHQUE0QjtBQUFBOztBQUFBO0FBQzFCLFVBQUk1QixRQUFRQyxJQUFSLENBQWFpSixlQUFqQixFQUFrQztBQUNoQyxjQUFNLFFBQUtwSCxHQUFMLENBQVMsa0JBQU8sY0FBUCxFQUF1QjlCLFFBQVFDLElBQVIsQ0FBYWlKLGVBQXBDLENBQVQsQ0FBTjtBQUNEO0FBQ0QsVUFBSSxRQUFLM0MsY0FBTCxJQUF1QixRQUFLQSxjQUFMLENBQW9CZ0csU0FBL0MsRUFBMEQ7QUFDeEQsY0FBTSxRQUFLaEcsY0FBTCxDQUFvQmdHLFNBQXBCLEVBQU47QUFDRDtBQU55QjtBQU8zQjs7QUFFS3BMLGFBQU4sQ0FBa0JMLElBQWxCLEVBQXdCUixPQUF4QixFQUFpQzRILFFBQWpDLEVBQTJDO0FBQUE7O0FBQUE7QUFDekMsWUFBTSxRQUFLbkIsa0JBQUwsQ0FBd0JqRyxJQUF4QixFQUE4QlIsT0FBOUIsQ0FBTjtBQUNBLFlBQU0sUUFBS3lGLGVBQUwsRUFBTjs7QUFFQSxVQUFJM0UsUUFBUSxDQUFaOztBQUVBLFlBQU1OLEtBQUswTCxjQUFMLENBQW9CLEVBQXBCO0FBQUEsdUNBQXdCLFdBQU85SSxNQUFQLEVBQWtCO0FBQzlDQSxpQkFBTzVDLElBQVAsR0FBY0EsSUFBZDs7QUFFQSxjQUFJLEVBQUVNLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCOEcscUJBQVM5RyxLQUFUO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3VDLFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCcEQsT0FBMUIsRUFBbUMsSUFBbkMsQ0FBTjtBQUNELFNBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFVQTRILGVBQVM5RyxLQUFUO0FBaEJ5QztBQWlCMUM7O0FBRUtGLHNCQUFOLENBQTJCSixJQUEzQixFQUFpQ1IsT0FBakMsRUFBMEM7QUFBQTs7QUFBQTtBQUN4QyxZQUFNLFFBQUtnSCxnQkFBTCxDQUFzQnhHLElBQXRCLEVBQTRCLElBQTVCLENBQU47O0FBRUEsV0FBSyxNQUFNeUcsVUFBWCxJQUF5QnpHLEtBQUswRyxjQUFMLENBQW9CLFlBQXBCLENBQXpCLEVBQTREO0FBQzFELGNBQU0sUUFBS0YsZ0JBQUwsQ0FBc0J4RyxJQUF0QixFQUE0QnlHLFVBQTVCLENBQU47QUFDRDs7QUFFRCxZQUFNLFFBQUtFLGtCQUFMLENBQXdCM0csSUFBeEIsRUFBOEIsSUFBOUIsQ0FBTjs7QUFFQSxXQUFLLE1BQU15RyxVQUFYLElBQXlCekcsS0FBSzBHLGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsY0FBTSxRQUFLQyxrQkFBTCxDQUF3QjNHLElBQXhCLEVBQThCeUcsVUFBOUIsQ0FBTjtBQUNEO0FBWHVDO0FBWXpDOztBQXVCS3BILGtCQUFOLEdBQXlCO0FBQUE7O0FBQUE7QUFDdkIsWUFBTSxRQUFLMkIsR0FBTCxDQUFTLFFBQUsySyxzQkFBTCx3QkFBVCxDQUFOO0FBRHVCO0FBRXhCOztBQUVLcE0sZUFBTixHQUFzQjtBQUFBOztBQUFBO0FBQ3BCLFlBQU0sUUFBS3lCLEdBQUwsQ0FBUyxRQUFLMkssc0JBQUwsbUJBQVQsQ0FBTjtBQURvQjtBQUVyQjs7QUFFREEseUJBQXVCMUssR0FBdkIsRUFBNEI7QUFDMUIsV0FBT0EsSUFBSUMsT0FBSixDQUFZLGFBQVosRUFBMkIsUUFBM0IsRUFDSUEsT0FESixDQUNZLGtCQURaLEVBQ2dDLEtBQUtxSSxVQURyQyxDQUFQO0FBRUQ7O0FBRUszSixtQkFBTixDQUF3QkosT0FBeEIsRUFBaUM7QUFBQTs7QUFBQTtBQUMvQixZQUFNNEgsV0FBVyxVQUFDNUcsSUFBRCxFQUFPRixLQUFQLEVBQWlCO0FBQ2hDLGdCQUFLQyxZQUFMLENBQWtCQyxLQUFLQyxLQUFMLEdBQWEsS0FBYixHQUFxQkgsTUFBTUksUUFBTixHQUFpQkMsR0FBeEQ7QUFDRCxPQUZEOztBQUlBLFlBQU1uQixRQUFRb00sYUFBUixDQUFzQixFQUF0QjtBQUFBLHVDQUEwQixXQUFPckksS0FBUCxFQUFjLEVBQUNqRCxLQUFELEVBQWQsRUFBMEI7QUFDeEQsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QjhHLHFCQUFTLFFBQVQsRUFBbUI5RyxLQUFuQjtBQUNEOztBQUVELGdCQUFNLFFBQUtrRCxXQUFMLENBQWlCRCxLQUFqQixFQUF3Qi9ELE9BQXhCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUEsWUFBTUEsUUFBUXFNLGFBQVIsQ0FBc0IsRUFBdEI7QUFBQSx1Q0FBMEIsV0FBT25JLEtBQVAsRUFBYyxFQUFDcEQsS0FBRCxFQUFkLEVBQTBCO0FBQ3hELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEI4RyxxQkFBUyxRQUFULEVBQW1COUcsS0FBbkI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLcUQsV0FBTCxDQUFpQkQsS0FBakIsRUFBd0JsRSxPQUF4QixDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBLFlBQU1BLFFBQVFzTSxhQUFSLENBQXNCLEVBQXRCO0FBQUEsdUNBQTBCLFdBQU9qSSxLQUFQLEVBQWMsRUFBQ3ZELEtBQUQsRUFBZCxFQUEwQjtBQUN4RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCOEcscUJBQVMsT0FBVCxFQUFrQjlHLEtBQWxCO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3dELFdBQUwsQ0FBaUJELEtBQWpCLEVBQXdCckUsT0FBeEIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQSxZQUFNQSxRQUFRdU0saUJBQVIsQ0FBMEIsRUFBMUI7QUFBQSx1Q0FBOEIsV0FBTy9ILFNBQVAsRUFBa0IsRUFBQzFELEtBQUQsRUFBbEIsRUFBOEI7QUFDaEUsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QjhHLHFCQUFTLFlBQVQsRUFBdUI5RyxLQUF2QjtBQUNEOztBQUVELGdCQUFNLFFBQUsyRCxlQUFMLENBQXFCRCxTQUFyQixFQUFnQ3hFLE9BQWhDLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUEsWUFBTUEsUUFBUXdNLFlBQVIsQ0FBcUIsRUFBckI7QUFBQSx1Q0FBeUIsV0FBT3BDLE1BQVAsRUFBZSxFQUFDdEosS0FBRCxFQUFmLEVBQTJCO0FBQ3hELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEI4RyxxQkFBUyxPQUFULEVBQWtCOUcsS0FBbEI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLdUUsVUFBTCxDQUFnQitFLE1BQWhCLEVBQXdCcEssT0FBeEIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQSxZQUFNQSxRQUFReU0sZUFBUixDQUF3QixFQUF4QjtBQUFBLHVDQUE0QixXQUFPckMsTUFBUCxFQUFlLEVBQUN0SixLQUFELEVBQWYsRUFBMkI7QUFDM0QsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QjhHLHFCQUFTLFVBQVQsRUFBcUI5RyxLQUFyQjtBQUNEOztBQUVELGdCQUFNLFFBQUtvRSxhQUFMLENBQW1Ca0YsTUFBbkIsRUFBMkJwSyxPQUEzQixDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBLFlBQU1BLFFBQVEwTSxZQUFSLENBQXFCLEVBQXJCO0FBQUEsdUNBQXlCLFdBQU90QyxNQUFQLEVBQWUsRUFBQ3RKLEtBQUQsRUFBZixFQUEyQjtBQUN4RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCOEcscUJBQVMsT0FBVCxFQUFrQjlHLEtBQWxCO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBSytGLGdCQUFMLENBQXNCdUQsTUFBdEIsRUFBOEJwSyxPQUE5QixDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBLFlBQU1BLFFBQVEyTSxrQkFBUixDQUEyQixFQUEzQjtBQUFBLHVDQUErQixXQUFPdkMsTUFBUCxFQUFlLEVBQUN0SixLQUFELEVBQWYsRUFBMkI7QUFDOUQsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QjhHLHFCQUFTLGFBQVQsRUFBd0I5RyxLQUF4QjtBQUNEOztBQUVELGdCQUFNLFFBQUswRSxnQkFBTCxDQUFzQjRFLE1BQXRCLEVBQThCcEssT0FBOUIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQSxZQUFNQSxRQUFRNE0sa0JBQVIsQ0FBMkIsRUFBM0I7QUFBQSx1Q0FBK0IsV0FBT3hDLE1BQVAsRUFBZSxFQUFDdEosS0FBRCxFQUFmLEVBQTJCO0FBQzlELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEI4RyxxQkFBUyxjQUFULEVBQXlCOUcsS0FBekI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLOEQsZ0JBQUwsQ0FBc0J3RixNQUF0QixFQUE4QnBLLE9BQTlCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUEsWUFBTUEsUUFBUTZNLHlCQUFSLENBQWtDLEVBQWxDO0FBQUEsdUNBQXNDLFdBQU96QyxNQUFQLEVBQWUsRUFBQ3RKLEtBQUQsRUFBZixFQUEyQjtBQUNyRSxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCOEcscUJBQVMscUJBQVQsRUFBZ0M5RyxLQUFoQztBQUNEOztBQUVELGdCQUFNLFFBQUtpRSx1QkFBTCxDQUE2QnFGLE1BQTdCLEVBQXFDcEssT0FBckMsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjtBQTdFK0I7QUFvRmhDOztBQUVLaUssaUJBQU4sR0FBd0I7QUFBQTs7QUFBQTtBQUN0QixZQUFNakssVUFBVSxNQUFNTixRQUFRTyxZQUFSLENBQXFCUCxRQUFRQyxJQUFSLENBQWFPLEdBQWxDLENBQXRCOztBQUVBLFVBQUksUUFBS3dGLFVBQUwsQ0FBZ0JhLE9BQWhCLENBQXdCLFlBQXhCLE1BQTBDLENBQUMsQ0FBL0MsRUFBa0Q7QUFDaERuRixnQkFBUUMsR0FBUixDQUFZLDJCQUFaOztBQUVBLGNBQU0sUUFBS3RCLGFBQUwsRUFBTjtBQUNEOztBQUVELFlBQU0sUUFBSytNLGtCQUFMLENBQXdCOU0sT0FBeEIsQ0FBTjtBQVRzQjtBQVV2Qjs7QUFFSzhNLG9CQUFOLENBQXlCOU0sT0FBekIsRUFBa0M7QUFBQTs7QUFBQTtBQUNoQyxjQUFLK00sVUFBTCxHQUFrQixDQUFDLE1BQU0sUUFBS3ZMLEdBQUwsQ0FBUyw2QkFBVCxDQUFQLEVBQWdEbUMsR0FBaEQsQ0FBb0Q7QUFBQSxlQUFLQyxFQUFFNUMsSUFBUDtBQUFBLE9BQXBELENBQWxCOztBQUVBLFlBQU0sUUFBS2dNLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCaE4sT0FBOUIsQ0FBTjtBQUNBLFlBQU0sUUFBS2dOLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCaE4sT0FBOUIsQ0FBTjtBQUNBLFlBQU0sUUFBS2dOLGlCQUFMLENBQXVCLEtBQXZCLEVBQThCaE4sT0FBOUIsQ0FBTjtBQUxnQztBQU1qQzs7QUFFS2dOLG1CQUFOLENBQXdCQyxPQUF4QixFQUFpQ2pOLE9BQWpDLEVBQTBDO0FBQUE7O0FBQUE7QUFDeEMsVUFBSSxRQUFLK00sVUFBTCxDQUFnQnhHLE9BQWhCLENBQXdCMEcsT0FBeEIsTUFBcUMsQ0FBQyxDQUF0QyxJQUEyQzFOLFdBQVcwTixPQUFYLENBQS9DLEVBQW9FO0FBQ2xFLGNBQU0sUUFBS3pMLEdBQUwsQ0FBUyxRQUFLMkssc0JBQUwsQ0FBNEI1TSxXQUFXME4sT0FBWCxDQUE1QixDQUFULENBQU47O0FBRUEsWUFBSUEsWUFBWSxLQUFoQixFQUF1QjtBQUNyQjdMLGtCQUFRQyxHQUFSLENBQVksNkJBQVo7O0FBRUEsZ0JBQU0sUUFBS2pCLGlCQUFMLENBQXVCSixPQUF2QixDQUFOO0FBQ0EsZ0JBQU0sUUFBS2tOLGVBQUwsQ0FBcUJsTixPQUFyQixDQUFOO0FBQ0Q7QUFDRjtBQVZ1QztBQVd6Qzs7QUFFS2tOLGlCQUFOLENBQXNCbE4sT0FBdEIsRUFBK0I7QUFBQTs7QUFBQTtBQUM3QixZQUFNTSxRQUFRLE1BQU1OLFFBQVFPLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsVUFBSU8sUUFBUSxDQUFaOztBQUVBLFdBQUssTUFBTU4sSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEJRLGdCQUFRLENBQVI7O0FBRUEsY0FBTU4sS0FBSzBMLGNBQUwsQ0FBb0IsRUFBcEI7QUFBQSx5Q0FBd0IsV0FBTzlJLE1BQVAsRUFBa0I7QUFDOUNBLG1CQUFPNUMsSUFBUCxHQUFjQSxJQUFkOztBQUVBLGdCQUFJLEVBQUVNLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCLHNCQUFLOEcsUUFBTCxDQUFjcEgsS0FBS1EsSUFBbkIsRUFBeUJGLEtBQXpCO0FBQ0Q7O0FBRUQsa0JBQU0sUUFBS3VDLFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCcEQsT0FBMUIsRUFBbUMsS0FBbkMsQ0FBTjtBQUNELFdBUks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBTjtBQVNEO0FBakI0QjtBQWtCOUI7O0FBaDBCa0IsQyIsImZpbGUiOiJwbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGcgZnJvbSAncGcnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUG9zdGdyZXNTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgUG9zdGdyZXNSZWNvcmRWYWx1ZXMsIFBvc3RncmVzIH0gZnJvbSAnZnVsY3J1bSc7XG5pbXBvcnQgc25ha2UgZnJvbSAnc25ha2UtY2FzZSc7XG5pbXBvcnQgdGVtcGxhdGVEcm9wIGZyb20gJy4vdGVtcGxhdGUuZHJvcC5zcWwnO1xuaW1wb3J0IFNjaGVtYU1hcCBmcm9tICcuL3NjaGVtYS1tYXAnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJ2Z1bGNydW0nO1xuXG5pbXBvcnQgdmVyc2lvbjAwMSBmcm9tICcuL3ZlcnNpb24tMDAxLnNxbCc7XG5pbXBvcnQgdmVyc2lvbjAwMiBmcm9tICcuL3ZlcnNpb24tMDAyLnNxbCc7XG5pbXBvcnQgdmVyc2lvbjAwMyBmcm9tICcuL3ZlcnNpb24tMDAzLnNxbCc7XG5pbXBvcnQgdmVyc2lvbjAwNCBmcm9tICcuL3ZlcnNpb24tMDA0LnNxbCc7XG5cbmNvbnN0IE1BWF9JREVOVElGSUVSX0xFTkdUSCA9IDYzO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmNvbnN0IE1JR1JBVElPTlMgPSB7XG4gICcwMDInOiB2ZXJzaW9uMDAyLFxuICAnMDAzJzogdmVyc2lvbjAwMyxcbiAgJzAwNCc6IHZlcnNpb24wMDRcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Zvcm06IHtcbiAgICAgICAgICBkZXNjOiAndGhlIGZvcm0gSUQgdG8gcmVidWlsZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZXBvcnRCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ3JlcG9ydCBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdNZWRpYUJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAnbWVkaWEgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnVW5kZXJzY29yZU5hbWVzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSB1bmRlcnNjb3JlIG5hbWVzIChlLmcuIFwiUGFyayBJbnNwZWN0aW9uc1wiIGJlY29tZXMgXCJwYXJrX2luc3BlY3Rpb25zXCIpJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVidWlsZFZpZXdzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IHJlYnVpbGQgdGhlIHZpZXdzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQ3VzdG9tTW9kdWxlOiB7XG4gICAgICAgICAgZGVzYzogJ2EgY3VzdG9tIG1vZHVsZSB0byBsb2FkIHdpdGggc3luYyBleHRlbnNpb25zJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTZXR1cDoge1xuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgfSxcbiAgICAgICAgcGdEcm9wOiB7XG4gICAgICAgICAgZGVzYzogJ2Ryb3AgdGhlIHN5c3RlbSB0YWJsZXMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdBcnJheXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIGFycmF5IHR5cGVzIGZvciBtdWx0aS12YWx1ZSBmaWVsZHMgbGlrZSBjaG9pY2UgZmllbGRzLCBjbGFzc2lmaWNhdGlvbiBmaWVsZHMgYW5kIG1lZGlhIGZpZWxkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3lzdGVtVGFibGVzT25seToge1xuICAgICAgICAgIGRlc2M6ICdvbmx5IGNyZWF0ZSB0aGUgc3lzdGVtIHJlY29yZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFjdGl2YXRlKCk7XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnRHJvcCkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wU3lzdGVtVGFibGVzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1NldHVwKSB7XG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgZnVsY3J1bS5mZXRjaEFjY291bnQoZnVsY3J1bS5hcmdzLm9yZyk7XG5cbiAgICBpZiAoYWNjb3VudCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ1N5c3RlbVRhYmxlc09ubHkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG5cbiAgICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgICBmb3IgKGNvbnN0IGZvcm0gb2YgZm9ybXMpIHtcbiAgICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Zvcm0gJiYgZm9ybS5pZCAhPT0gZnVsY3J1bS5hcmdzLnBnRm9ybSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlYnVpbGRWaWV3c09ubHkpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgKGluZGV4KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhmb3JtLm5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkICsgJyByZWNvcmRzJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQWZ0ZXJGdW5jdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgZnVsY3J1bS5hcmdzLm9yZyk7XG4gICAgfVxuICB9XG5cbiAgZXNjYXBlSWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIGlkZW50aWZpZXIgJiYgdGhpcy5wZ2RiLmlkZW50KGlkZW50aWZpZXIuc3Vic3RyaW5nKDAsIE1BWF9JREVOVElGSUVSX0xFTkdUSCkpO1xuICB9XG5cbiAgZ2V0IHVzZVN5bmNFdmVudHMoKSB7XG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgIT0gbnVsbCA/IGZ1bGNydW0uYXJncy5wZ1N5bmNFdmVudHMgOiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGUoKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLlBPU1RHUkVTX0NPTkZJRyxcbiAgICAgIGhvc3Q6IGZ1bGNydW0uYXJncy5wZ0hvc3QgfHwgUE9TVEdSRVNfQ09ORklHLmhvc3QsXG4gICAgICBwb3J0OiBmdWxjcnVtLmFyZ3MucGdQb3J0IHx8IFBPU1RHUkVTX0NPTkZJRy5wb3J0LFxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5wZ0RhdGFiYXNlIHx8IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZSxcbiAgICAgIHVzZXI6IGZ1bGNydW0uYXJncy5wZ1VzZXIgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXIsXG4gICAgICBwYXNzd29yZDogZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQgfHwgUE9TVEdSRVNfQ09ORklHLnVzZXJcbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1VzZXIpIHtcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5wZ1VzZXI7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkKSB7XG4gICAgICBvcHRpb25zLnBhc3N3b3JkID0gZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSkge1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZSA9IHJlcXVpcmUoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKTtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUuYXBpID0gYXBpO1xuICAgICAgdGhpcy5wZ0N1c3RvbU1vZHVsZS5hcHAgPSBmdWxjcnVtO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8ICdwdWJsaWMnO1xuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG5cbiAgICB0aGlzLnNldHVwT3B0aW9ucygpO1xuXG4gICAgYXdhaXQgdGhpcy5tYXliZUluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgfVxuXG4gIG9uU3luY1N0YXJ0ID0gYXN5bmMgKHthY2NvdW50LCB0YXNrc30pID0+IHtcbiAgICBhd2FpdCB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG4gIH1cblxuICBvblN5bmNGaW5pc2ggPSBhc3luYyAoe2FjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uRm9ybURlbGV0ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudH0pID0+IHtcbiAgICBjb25zdCBvbGRGb3JtID0ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG51bGwpO1xuICB9XG5cbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUmVjb3JkRGVsZXRlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHJlY29yZC5mb3JtLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvblBob3RvU2F2ZSA9IGFzeW5jICh7cGhvdG8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gIH1cblxuICBvblZpZGVvU2F2ZSA9IGFzeW5jICh7dmlkZW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkF1ZGlvU2F2ZSA9IGFzeW5jICh7YXVkaW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkNoYW5nZXNldFNhdmUgPSBhc3luYyAoe2NoYW5nZXNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7Y2hvaWNlTGlzdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3QoY2hvaWNlTGlzdCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7Y2xhc3NpZmljYXRpb25TZXQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChjbGFzc2lmaWNhdGlvblNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvblByb2plY3RTYXZlID0gYXN5bmMgKHtwcm9qZWN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChwcm9qZWN0LCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUm9sZVNhdmUgPSBhc3luYyAoe3JvbGUsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKHJvbGUsIGFjY291bnQpO1xuICB9XG5cbiAgb25NZW1iZXJzaGlwU2F2ZSA9IGFzeW5jICh7bWVtYmVyc2hpcCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAobWVtYmVyc2hpcCwgYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQaG90byhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAucGhvdG8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRQaG90b1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdwaG90b3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVZpZGVvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC52aWRlbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFZpZGVvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3ZpZGVvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQXVkaW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLmF1ZGlvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0QXVkaW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnYXVkaW8nKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNoYW5nZXNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hhbmdlc2V0KG9iamVjdCksICdjaGFuZ2VzZXRzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5wcm9qZWN0KG9iamVjdCksICdwcm9qZWN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAubWVtYmVyc2hpcChvYmplY3QpLCAnbWVtYmVyc2hpcHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJvbGUob2JqZWN0KSwgJ3JvbGVzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5mb3JtKG9iamVjdCksICdmb3JtcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hvaWNlTGlzdChvYmplY3QpLCAnY2hvaWNlX2xpc3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2xhc3NpZmljYXRpb25TZXQob2JqZWN0KSwgJ2NsYXNzaWZpY2F0aW9uX3NldHMnKTtcbiAgfVxuXG5cbiAgYXN5bmMgdXBkYXRlT2JqZWN0KHZhbHVlcywgdGFibGUpIHtcbiAgICBjb25zdCBkZWxldGVTdGF0ZW1lbnQgPSB0aGlzLnBnZGIuZGVsZXRlU3RhdGVtZW50KCdzeXN0ZW1fJyArIHRhYmxlLCB7cm93X3Jlc291cmNlX2lkOiB2YWx1ZXMucm93X3Jlc291cmNlX2lkfSk7XG4gICAgY29uc3QgaW5zZXJ0U3RhdGVtZW50ID0gdGhpcy5wZ2RiLmluc2VydFN0YXRlbWVudCgnc3lzdGVtXycgKyB0YWJsZSwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcblxuICAgIGNvbnN0IHNxbCA9IFsgZGVsZXRlU3RhdGVtZW50LnNxbCwgaW5zZXJ0U3RhdGVtZW50LnNxbCBdLmpvaW4oJ1xcbicpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKHNxbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICByZWxvYWRUYWJsZUxpc3QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuICB9XG5cbiAgYmFzZU1lZGlhVVJMID0gKCkgPT4ge1xuICB9XG5cbiAgZm9ybWF0UGhvdG9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zLyR7IGlkIH0uanBnYDtcbiAgfVxuXG4gIGZvcm1hdFZpZGVvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy8keyBpZCB9Lm1wNGA7XG4gIH1cblxuICBmb3JtYXRBdWRpb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby8keyBpZCB9Lm00YWA7XG4gIH1cblxuICBpbnRlZ3JpdHlXYXJuaW5nKGV4KSB7XG4gICAgY29uc29sZS53YXJuKGBcbi0tLS0tLS0tLS0tLS1cbiEhIFdBUk5JTkcgISFcbi0tLS0tLS0tLS0tLS1cblxuUG9zdGdyZVNRTCBkYXRhYmFzZSBpbnRlZ3JpdHkgaXNzdWUgZW5jb3VudGVyZWQuIENvbW1vbiBzb3VyY2VzIG9mIHBvc3RncmVzIGRhdGFiYXNlIGlzc3VlcyBhcmU6XG5cbiogUmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBhbmQgdXNpbmcgYW4gb2xkIHBvc3RncmVzIGRhdGFiYXNlIHdpdGhvdXQgcmVjcmVhdGluZ1xuICB0aGUgcG9zdGdyZXMgZGF0YWJhc2UuXG4qIERlbGV0aW5nIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZSBhbmQgdXNpbmcgYW4gZXhpc3RpbmcgcG9zdGdyZXMgZGF0YWJhc2VcbiogTWFudWFsbHkgbW9kaWZ5aW5nIHRoZSBwb3N0Z3JlcyBkYXRhYmFzZVxuKiBGb3JtIG5hbWUgYW5kIHJlcGVhdGFibGUgZGF0YSBuYW1lIGNvbWJpbmF0aW9ucyB0aGF0IGV4Y2VlZWQgdGhlIHBvc3RncmVzIGxpbWl0IG9mIDYzXG4gIGNoYXJhY3RlcnMuIEl0J3MgYmVzdCB0byBrZWVwIHlvdXIgZm9ybSBuYW1lcyB3aXRoaW4gdGhlIGxpbWl0LiBUaGUgXCJmcmllbmRseSB2aWV3XCJcbiAgZmVhdHVyZSBvZiB0aGUgcGx1Z2luIGRlcml2ZXMgdGhlIG9iamVjdCBuYW1lcyBmcm9tIHRoZSBmb3JtIGFuZCByZXBlYXRhYmxlIG5hbWVzLlxuKiBDcmVhdGluZyBtdWx0aXBsZSBhcHBzIGluIEZ1bGNydW0gd2l0aCB0aGUgc2FtZSBuYW1lLiBUaGlzIGlzIGdlbmVyYWxseSBPSywgZXhjZXB0XG4gIHlvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIHVzZSB0aGUgXCJmcmllbmRseSB2aWV3XCIgZmVhdHVyZSBvZiB0aGUgcG9zdGdyZXMgcGx1Z2luIHNpbmNlXG4gIHRoZSB2aWV3IG5hbWVzIGFyZSBkZXJpdmVkIGZyb20gdGhlIGZvcm0gbmFtZXMuXG5cbk5vdGU6IFdoZW4gcmVpbnN0YWxsaW5nIEZ1bGNydW0gRGVza3RvcCBvciBcInN0YXJ0aW5nIG92ZXJcIiB5b3UgbmVlZCB0byBkcm9wIGFuZCByZS1jcmVhdGVcbnRoZSBwb3N0Z3JlcyBkYXRhYmFzZS4gVGhlIG5hbWVzIG9mIGRhdGFiYXNlIG9iamVjdHMgYXJlIHRpZWQgZGlyZWN0bHkgdG8gdGhlIGRhdGFiYXNlXG5vYmplY3RzIGluIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiBkYXRhYmFzZS5cblxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5SZXBvcnQgaXNzdWVzIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9mdWxjcnVtYXBwL2Z1bGNydW0tZGVza3RvcC9pc3N1ZXNcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuTWVzc2FnZTpcbiR7IGV4Lm1lc3NhZ2UgfVxuXG5TdGFjazpcbiR7IGV4LnN0YWNrIH1cbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuYC5yZWRcbiAgICApO1xuICB9XG5cbiAgc2V0dXBPcHRpb25zKCkge1xuICAgIHRoaXMuYmFzZU1lZGlhVVJMID0gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsID8gZnVsY3J1bS5hcmdzLnBnTWVkaWFCYXNlVXJsIDogJ2h0dHBzOi8vYXBpLmZ1bGNydW1hcHAuY29tL2FwaS92Mic7XG5cbiAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyA9IHtcbiAgICAgIGRpc2FibGVBcnJheXM6IHRoaXMuZGlzYWJsZUFycmF5cyxcblxuICAgICAgdmFsdWVzVHJhbnNmb3JtZXI6IHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS52YWx1ZXNUcmFuc2Zvcm1lcixcblxuICAgICAgbWVkaWFVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhVmFsdWUuaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0UGhvdG9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0VmlkZW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0QXVkaW9VUkwoaXRlbS5tZWRpYUlEKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBtZWRpYVZpZXdVUkxGb3JtYXR0ZXI6IChtZWRpYVZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkcyA9IG1lZGlhVmFsdWUuaXRlbXMubWFwKG8gPT4gby5tZWRpYUlEKTtcblxuICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3Bob3Rvcy92aWV3P3Bob3Rvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy92aWV3P3ZpZGVvcz0keyBpZHMgfWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvL3ZpZXc/YXVkaW89JHsgaWRzIH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsKSB7XG4gICAgICB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIgPSAoZmVhdHVyZSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7IGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwgfS9yZXBvcnRzLyR7IGZlYXR1cmUuaWQgfS5wZGZgO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZWNvcmQgPSBhc3luYyAocmVjb3JkLCBhY2NvdW50LCBza2lwVGFibGVDaGVjaykgPT4ge1xuICAgIGlmICghc2tpcFRhYmxlQ2hlY2sgJiYgIXRoaXMucm9vdFRhYmxlRXhpc3RzKHJlY29yZC5mb3JtKSkge1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkICYmICF0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCh7cmVjb3JkLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMudXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5tYXAobyA9PiBvLnNxbCkuam9pbignXFxuJykpO1xuXG4gICAgY29uc3Qgc3lzdGVtVmFsdWVzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShyZWNvcmQsIG51bGwsIHJlY29yZCwgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJlY29yZChyZWNvcmQsIHN5c3RlbVZhbHVlcyksICdyZWNvcmRzJyk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0gJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSh7Zm9ybSwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChmb3JtLCBhY2NvdW50KTtcblxuICAgICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcbiAgICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCB0aGlzLmRpc2FibGVBcnJheXMsIHRoaXMucGdDdXN0b21Nb2R1bGUpO1xuXG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnJ1bihbJ0JFR0lOIFRSQU5TQUNUSU9OOycsXG4gICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGVtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAnQ09NTUlUIFRSQU5TQUNUSU9OOyddLmpvaW4oJ1xcbicpKTtcblxuICAgICAgaWYgKG5ld0Zvcm0pIHtcbiAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5V2FybmluZyhleCk7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzIENBU0NBREU7JywgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMuZGF0YVNjaGVtYSksIHRoaXMuZXNjYXBlSWRlbnRpZmllcih2aWV3TmFtZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0NSRUFURSBWSUVXICVzLiVzIEFTIFNFTEVDVCAqIEZST00gJXNfdmlld19mdWxsOycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHRoaXMuZGF0YVNjaGVtYSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHZpZXdOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlKSkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgICAgdGhpcy5pbnRlZ3JpdHlXYXJuaW5nKGV4KTtcbiAgICB9XG4gIH1cblxuICBnZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3QgbmFtZSA9IHJlcGVhdGFibGUgPyBgJHtmb3JtLm5hbWV9IC0gJHtyZXBlYXRhYmxlLmRhdGFOYW1lfWAgOiBmb3JtLm5hbWU7XG5cbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnVW5kZXJzY29yZU5hbWVzID8gc25ha2UobmFtZSkgOiBuYW1lO1xuICB9XG5cbiAgYXN5bmMgaW52b2tlQmVmb3JlRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0JlZm9yZUZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYmVmb3JlU3luYykge1xuICAgICAgYXdhaXQgdGhpcy5wZ0N1c3RvbU1vZHVsZS5iZWZvcmVTeW5jKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW52b2tlQWZ0ZXJGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuYWZ0ZXJTeW5jKSB7XG4gICAgICBhd2FpdCB0aGlzLnBnQ3VzdG9tTW9kdWxlLmFmdGVyU3luYygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIHByb2dyZXNzKSB7XG4gICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcbiAgICBpZiAoZm9ybSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlU3RhdHVzID0gKG1lc3NhZ2UpID0+IHtcbiAgICBpZiAocHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wU3lzdGVtVGFibGVzKCkge1xuICAgIGF3YWl0IHRoaXMucnVuKHRoaXMucHJlcGFyZU1pZ3JhdGlvblNjcmlwdCh0ZW1wbGF0ZURyb3ApKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwRGF0YWJhc2UoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KHZlcnNpb24wMDEpKTtcbiAgfVxuXG4gIHByZXBhcmVNaWdyYXRpb25TY3JpcHQoc3FsKSB7XG4gICAgcmV0dXJuIHNxbC5yZXBsYWNlKC9fX1NDSEVNQV9fL2csICdwdWJsaWMnKVxuICAgICAgICAgICAgICAucmVwbGFjZSgvX19WSUVXX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSk7XG4gIH1cblxuICBhc3luYyBzZXR1cFN5c3RlbVRhYmxlcyhhY2NvdW50KSB7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG5hbWUuZ3JlZW4gKyAnIDogJyArIGluZGV4LnRvU3RyaW5nKCkucmVkKTtcbiAgICB9O1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFBob3RvKHt9LCBhc3luYyAocGhvdG8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Bob3RvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoVmlkZW8oe30sIGFzeW5jICh2aWRlbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnVmlkZW9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hBdWRpbyh7fSwgYXN5bmMgKGF1ZGlvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdBdWRpbycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hhbmdlc2V0KHt9LCBhc3luYyAoY2hhbmdlc2V0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaGFuZ2VzZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFJvbGUoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1JvbGVzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQcm9qZWN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQcm9qZWN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoRm9ybSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnRm9ybXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybU9iamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaE1lbWJlcnNoaXAoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ01lbWJlcnNoaXBzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaG9pY2VMaXN0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDaG9pY2UgTGlzdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENsYXNzaWZpY2F0aW9uU2V0KHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdDbGFzc2lmaWNhdGlvbiBTZXRzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBtYXliZUluaXRpYWxpemUoKSB7XG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKHRoaXMudGFibGVOYW1lcy5pbmRleE9mKCdtaWdyYXRpb25zJykgPT09IC0xKSB7XG4gICAgICBjb25zb2xlLmxvZygnSW5pdGl0YWxpemluZyBkYXRhYmFzZS4uLicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnNldHVwRGF0YWJhc2UoKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLm1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KTtcbiAgfVxuXG4gIGFzeW5jIG1heWJlUnVuTWlncmF0aW9ucyhhY2NvdW50KSB7XG4gICAgdGhpcy5taWdyYXRpb25zID0gKGF3YWl0IHRoaXMucnVuKCdTRUxFQ1QgbmFtZSBGUk9NIG1pZ3JhdGlvbnMnKSkubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb24oJzAwMicsIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb24oJzAwMycsIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMubWF5YmVSdW5NaWdyYXRpb24oJzAwNCcsIGFjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVSdW5NaWdyYXRpb24odmVyc2lvbiwgYWNjb3VudCkge1xuICAgIGlmICh0aGlzLm1pZ3JhdGlvbnMuaW5kZXhPZih2ZXJzaW9uKSA9PT0gLTEgJiYgTUlHUkFUSU9OU1t2ZXJzaW9uXSkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4odGhpcy5wcmVwYXJlTWlncmF0aW9uU2NyaXB0KE1JR1JBVElPTlNbdmVyc2lvbl0pKTtcblxuICAgICAgaWYgKHZlcnNpb24gPT09ICcwMDInKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQb3B1bGF0aW5nIHN5c3RlbSB0YWJsZXMuLi4nKTtcblxuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICBhd2FpdCB0aGlzLnBvcHVsYXRlUmVjb3JkcyhhY2NvdW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBwb3B1bGF0ZVJlY29yZHMoYWNjb3VudCkge1xuICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xuXG4gICAgbGV0IGluZGV4ID0gMDtcblxuICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgaW5kZXggPSAwO1xuXG4gICAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICAgIHJlY29yZC5mb3JtID0gZm9ybTtcblxuICAgICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5wcm9ncmVzcyhmb3JtLm5hbWUsIGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUmVjb3JkKHJlY29yZCwgYWNjb3VudCwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJvZ3Jlc3MgPSAobmFtZSwgaW5kZXgpID0+IHtcbiAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gIH1cbn1cbiJdfQ==