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

var _snakeCase = require('snake-case');

var _snakeCase2 = _interopRequireDefault(_snakeCase);

var _template = require('./template.sql');

var _template2 = _interopRequireDefault(_template);

var _templateDrop = require('./template.drop.sql');

var _templateDrop2 = _interopRequireDefault(_templateDrop);

var _schemaMap = require('./schema-map');

var _schemaMap2 = _interopRequireDefault(_schemaMap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const POSTGRES_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
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
        _this.invokeBeforeFunction();
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })();

    this.onSyncFinish = (() => {
      var _ref3 = _asyncToGenerator(function* ({ account }) {
        _this.invokeAfterFunction();
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
      var _ref12 = _asyncToGenerator(function* ({ object, account }) {
        yield _this.updateChoiceList(object, account);
      });

      return function (_x11) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref13 = _asyncToGenerator(function* ({ object, account }) {
        yield _this.updateClassificationSet(object, account);
      });

      return function (_x12) {
        return _ref13.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref14 = _asyncToGenerator(function* ({ object, account }) {
        yield _this.updateProject(object, account);
      });

      return function (_x13) {
        return _ref14.apply(this, arguments);
      };
    })();

    this.onRoleSave = (() => {
      var _ref15 = _asyncToGenerator(function* ({ object, account }) {
        yield _this.updateRole(object, account);
      });

      return function (_x14) {
        return _ref15.apply(this, arguments);
      };
    })();

    this.onMembershipSave = (() => {
      var _ref16 = _asyncToGenerator(function* ({ object, account }) {
        yield _this.updateMembership(object, account);
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

        yield _this.run(statements.join('\n'));

        yield _this.createFriendlyView(form, null);

        for (const repeatable of form.elementsOfType('Repeatable')) {
          yield _this.createFriendlyView(form, repeatable);
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
      try {
        const deleteStatement = _this15.pgdb.deleteStatement(table, { row_resource_id: values.row_resource_id });
        const insertStatement = _this15.pgdb.insertStatement(table, values, { pk: 'id' });

        const sql = [deleteStatement.sql, insertStatement.sql].join('\n');

        yield _this15.run(sql);
      } catch (ex) {
        console.error(ex);
      }
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
        yield _this16.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this16.pgdb.ident(_this16.dataSchema), _this16.pgdb.ident(viewName)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this17 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this17.getFriendlyTableName(form, repeatable);

      try {
        yield _this17.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this17.pgdb.ident(_this17.dataSchema), _this17.pgdb.ident(viewName), _fulcrumDesktopPlugin.PostgresRecordValues.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
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
    })();
  }

  invokeAfterFunction() {
    var _this19 = this;

    return _asyncToGenerator(function* () {
      if (fulcrum.args.pgAfterFunction) {
        yield _this19.run((0, _util.format)('SELECT %s();', fulcrum.args.pgAfterFunction));
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
      const sql = _templateDrop2.default.replace(/__SCHEMA__/g, 'public').replace(/__VIEW_SCHEMA__/g, _this22.dataSchema);

      yield _this22.run(sql);
    })();
  }

  setupDatabase() {
    var _this23 = this;

    return _asyncToGenerator(function* () {
      const sql = _template2.default.replace(/__SCHEMA__/g, 'public').replace(/__VIEW_SCHEMA__/g, _this23.dataSchema);

      yield _this23.run(sql);
    })();
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

      console.log('');

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

      console.log('');

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

      console.log('');

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

      console.log('');

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

      console.log('');

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

      console.log('');

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

      console.log('');

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

      console.log('');

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

      console.log('');

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
      if (_this25.tableNames.indexOf('migrations') === -1) {
        console.log('Inititalizing database...');

        yield _this25.setupDatabase();

        const account = yield fulcrum.fetchAccount(fulcrum.args.org);

        console.log('Populating system tables...');

        yield _this25.setupSystemTables(account);
      }
    })();
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInBnRHJvcCIsImRyb3BTeXN0ZW1UYWJsZXMiLCJwZ1NldHVwIiwic2V0dXBEYXRhYmFzZSIsImFjY291bnQiLCJmZXRjaEFjY291bnQiLCJvcmciLCJwZ1N5c3RlbVRhYmxlc09ubHkiLCJzZXR1cFN5c3RlbVRhYmxlcyIsImludm9rZUJlZm9yZUZ1bmN0aW9uIiwiZm9ybXMiLCJmaW5kQWN0aXZlRm9ybXMiLCJmb3JtIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uRm9ybURlbGV0ZSIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25QaG90b1NhdmUiLCJwaG90byIsInVwZGF0ZVBob3RvIiwib25WaWRlb1NhdmUiLCJ2aWRlbyIsInVwZGF0ZVZpZGVvIiwib25BdWRpb1NhdmUiLCJhdWRpbyIsInVwZGF0ZUF1ZGlvIiwib25DaGFuZ2VzZXRTYXZlIiwiY2hhbmdlc2V0IiwidXBkYXRlQ2hhbmdlc2V0Iiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsInVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0Iiwib25Qcm9qZWN0U2F2ZSIsInVwZGF0ZVByb2plY3QiLCJvblJvbGVTYXZlIiwidXBkYXRlUm9sZSIsIm9uTWVtYmVyc2hpcFNhdmUiLCJ1cGRhdGVNZW1iZXJzaGlwIiwicmVsb2FkVGFibGVMaXN0IiwidGFibGVOYW1lcyIsImJhc2VNZWRpYVVSTCIsImZvcm1hdFBob3RvVVJMIiwiZm9ybWF0VmlkZW9VUkwiLCJmb3JtYXRBdWRpb1VSTCIsInNraXBUYWJsZUNoZWNrIiwicm9vdFRhYmxlRXhpc3RzIiwicGdDdXN0b21Nb2R1bGUiLCJzaG91bGRVcGRhdGVSZWNvcmQiLCJ1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwiaW5kZXhPZiIsInRhYmxlTmFtZVdpdGhGb3JtIiwicmVjcmVhdGVGb3JtVGFibGVzIiwiZm9ybVZlcnNpb24iLCJleCIsInNob3VsZFVwZGF0ZUZvcm0iLCJ1cGRhdGVGb3JtT2JqZWN0IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZGlzYWJsZUFycmF5cyIsImRyb3BGcmllbmRseVZpZXciLCJyZXBlYXRhYmxlIiwiZWxlbWVudHNPZlR5cGUiLCJjcmVhdGVGcmllbmRseVZpZXciLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJwZ0RhdGFiYXNlIiwidHlwZSIsImRlZmF1bHQiLCJwZ0hvc3QiLCJwZ1BvcnQiLCJwZ1VzZXIiLCJwZ1Bhc3N3b3JkIiwicGdTY2hlbWEiLCJwZ1N5bmNFdmVudHMiLCJwZ0JlZm9yZUZ1bmN0aW9uIiwicGdBZnRlckZ1bmN0aW9uIiwicmVxdWlyZWQiLCJwZ1JlcG9ydEJhc2VVcmwiLCJwZ01lZGlhQmFzZVVybCIsInBnVW5kZXJzY29yZU5hbWVzIiwicGdBcnJheXMiLCJoYW5kbGVyIiwidXNlU3luY0V2ZW50cyIsIm9wdGlvbnMiLCJ1c2VyIiwicGFzc3dvcmQiLCJyZXF1aXJlIiwiUG9vbCIsIm9uIiwiZGF0YVNjaGVtYSIsInNldHVwT3B0aW9ucyIsIm1heWJlSW5pdGlhbGl6ZSIsImRlYWN0aXZhdGUiLCJlbmQiLCJ2YWx1ZXMiLCJmaWxlIiwiYWNjZXNzX2tleSIsInVwZGF0ZU9iamVjdCIsInByb2plY3QiLCJtZW1iZXJzaGlwIiwicm9sZSIsImNob2ljZUxpc3QiLCJjbGFzc2lmaWNhdGlvblNldCIsInRhYmxlIiwiZGVsZXRlU3RhdGVtZW50Iiwicm93X3Jlc291cmNlX2lkIiwiaW5zZXJ0U3RhdGVtZW50IiwicGsiLCJ2YWx1ZXNUcmFuc2Zvcm1lciIsIm1lZGlhVVJMRm9ybWF0dGVyIiwibWVkaWFWYWx1ZSIsIml0ZW1zIiwiaXRlbSIsImVsZW1lbnQiLCJpc1Bob3RvRWxlbWVudCIsIm1lZGlhSUQiLCJpc1ZpZGVvRWxlbWVudCIsImlzQXVkaW9FbGVtZW50IiwibWVkaWFWaWV3VVJMRm9ybWF0dGVyIiwiaWRzIiwicmVwb3J0VVJMRm9ybWF0dGVyIiwiZmVhdHVyZSIsInZpZXdOYW1lIiwiZ2V0RnJpZW5kbHlUYWJsZU5hbWUiLCJpZGVudCIsImRhdGFOYW1lIiwicHJvZ3Jlc3MiLCJmaW5kRWFjaFJlY29yZCIsImZpbmRFYWNoUGhvdG8iLCJmaW5kRWFjaFZpZGVvIiwiZmluZEVhY2hBdWRpbyIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hQcm9qZWN0IiwiZmluZEVhY2hGb3JtIiwiZmluZEVhY2hNZW1iZXJzaGlwIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsTUFBTUEsa0JBQWtCO0FBQ3RCQyxZQUFVLFlBRFk7QUFFdEJDLFFBQU0sV0FGZ0I7QUFHdEJDLFFBQU0sSUFIZ0I7QUFJdEJDLE9BQUssRUFKaUI7QUFLdEJDLHFCQUFtQjtBQUxHLENBQXhCOztrQkFRZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQXdHbkJDLFVBeEdtQixxQkF3R04sYUFBWTtBQUN2QixZQUFNLE1BQUtDLFFBQUwsRUFBTjs7QUFFQSxVQUFJQyxRQUFRQyxJQUFSLENBQWFDLE1BQWpCLEVBQXlCO0FBQ3ZCLGNBQU0sTUFBS0MsZ0JBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSUgsUUFBUUMsSUFBUixDQUFhRyxPQUFqQixFQUEwQjtBQUN4QixjQUFNLE1BQUtDLGFBQUwsRUFBTjtBQUNBO0FBQ0Q7O0FBRUQsWUFBTUMsVUFBVSxNQUFNTixRQUFRTyxZQUFSLENBQXFCUCxRQUFRQyxJQUFSLENBQWFPLEdBQWxDLENBQXRCOztBQUVBLFVBQUlGLE9BQUosRUFBYTtBQUNYLFlBQUlOLFFBQVFDLElBQVIsQ0FBYVEsa0JBQWpCLEVBQXFDO0FBQ25DLGdCQUFNLE1BQUtDLGlCQUFMLENBQXVCSixPQUF2QixDQUFOO0FBQ0E7QUFDRDs7QUFFRCxjQUFNLE1BQUtLLG9CQUFMLEVBQU47O0FBRUEsY0FBTUMsUUFBUSxNQUFNTixRQUFRTyxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLGFBQUssTUFBTUMsSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEIsY0FBSVosUUFBUUMsSUFBUixDQUFhYyxrQkFBakIsRUFBcUM7QUFDbkMsa0JBQU0sTUFBS0Msb0JBQUwsQ0FBMEJGLElBQTFC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QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBa0IsY0FBUUMsR0FBUixDQUFZLEVBQVo7O0FBRUEsWUFBTW5CLFFBQVFnTSx5QkFBUixDQUFrQyxFQUFsQztBQUFBLHVDQUFzQyxXQUFPdEgsTUFBUCxFQUFlLEVBQUM5RCxLQUFELEVBQWYsRUFBMkI7QUFDckUsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QnlLLHFCQUFTLHFCQUFULEVBQWdDekssS0FBaEM7QUFDRDs7QUFFRCxnQkFBTSxRQUFLaUUsdUJBQUwsQ0FBNkJILE1BQTdCLEVBQXFDMUUsT0FBckMsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjtBQS9GK0I7QUFzR2hDOztBQUVLa0osaUJBQU4sR0FBd0I7QUFBQTs7QUFBQTtBQUN0QixVQUFJLFFBQUs3RCxVQUFMLENBQWdCVSxPQUFoQixDQUF3QixZQUF4QixNQUEwQyxDQUFDLENBQS9DLEVBQWtEO0FBQ2hEN0UsZ0JBQVFDLEdBQVIsQ0FBWSwyQkFBWjs7QUFFQSxjQUFNLFFBQUtwQixhQUFMLEVBQU47O0FBRUEsY0FBTUMsVUFBVSxNQUFNTixRQUFRTyxZQUFSLENBQXFCUCxRQUFRQyxJQUFSLENBQWFPLEdBQWxDLENBQXRCOztBQUVBZ0IsZ0JBQVFDLEdBQVIsQ0FBWSw2QkFBWjs7QUFFQSxjQUFNLFFBQUtmLGlCQUFMLENBQXVCSixPQUF2QixDQUFOO0FBQ0Q7QUFYcUI7QUFZdkI7QUEzdUJrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCBzbmFrZSBmcm9tICdzbmFrZS1jYXNlJztcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlLnNxbCc7XG5pbXBvcnQgdGVtcGxhdGVEcm9wIGZyb20gJy4vdGVtcGxhdGUuZHJvcC5zcWwnO1xuaW1wb3J0IFNjaGVtYU1hcCBmcm9tICcuL3NjaGVtYS1tYXAnO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1JlcG9ydEJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAncmVwb3J0IFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ01lZGlhQmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdtZWRpYSBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdVbmRlcnNjb3JlTmFtZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHVuZGVyc2NvcmUgbmFtZXMgKGUuZy4gXCJQYXJrIEluc3BlY3Rpb25zXCIgYmVjb21lcyBcInBhcmtfaW5zcGVjdGlvbnNcIiknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZWJ1aWxkVmlld3NPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgcmVidWlsZCB0aGUgdmlld3MnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdDdXN0b21Nb2R1bGU6IHtcbiAgICAgICAgICBkZXNjOiAnYSBjdXN0b20gbW9kdWxlIHRvIGxvYWQgd2l0aCBzeW5jIGV4dGVuc2lvbnMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NldHVwOiB7XG4gICAgICAgICAgZGVzYzogJ3NldHVwIHRoZSBkYXRhYmFzZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Ryb3A6IHtcbiAgICAgICAgICBkZXNjOiAnZHJvcCB0aGUgc3lzdGVtIHRhYmxlcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0FycmF5czoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgYXJyYXkgdHlwZXMgZm9yIG11bHRpLXZhbHVlIGZpZWxkcyBsaWtlIGNob2ljZSBmaWVsZHMsIGNsYXNzaWZpY2F0aW9uIGZpZWxkcyBhbmQgbWVkaWEgZmllbGRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeXN0ZW1UYWJsZXNPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgY3JlYXRlIHRoZSBzeXN0ZW0gcmVjb3JkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdEcm9wKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BTeXN0ZW1UYWJsZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2V0dXApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU3lzdGVtVGFibGVzT25seSkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8ICdwdWJsaWMnO1xuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG5cbiAgICB0aGlzLnNldHVwT3B0aW9ucygpO1xuXG4gICAgYXdhaXQgdGhpcy5tYXliZUluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XG4gICAgaWYgKHRoaXMucG9vbCkge1xuICAgICAgYXdhaXQgdGhpcy5wb29sLmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJ1biA9IChzcWwpID0+IHtcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucG9vbC5xdWVyeShzcWwsIFtdLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNvbHZlKHJlcy5yb3dzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxuXG4gIHRhYmxlTmFtZSA9IChhY2NvdW50LCBuYW1lKSA9PiB7XG4gICAgcmV0dXJuICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nICsgbmFtZTtcbiAgfVxuXG4gIG9uU3luY1N0YXJ0ID0gYXN5bmMgKHthY2NvdW50LCB0YXNrc30pID0+IHtcbiAgICB0aGlzLmludm9rZUJlZm9yZUZ1bmN0aW9uKCk7XG4gIH1cblxuICBvblN5bmNGaW5pc2ggPSBhc3luYyAoe2FjY291bnR9KSA9PiB7XG4gICAgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gIH1cblxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtKTtcbiAgfVxuXG4gIG9uRm9ybURlbGV0ZSA9IGFzeW5jICh7Zm9ybSwgYWNjb3VudH0pID0+IHtcbiAgICBjb25zdCBvbGRGb3JtID0ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG51bGwpO1xuICB9XG5cbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmQsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uUmVjb3JkRGVsZXRlID0gYXN5bmMgKHtyZWNvcmR9KSA9PiB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHJlY29yZC5mb3JtLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBvblBob3RvU2F2ZSA9IGFzeW5jICh7cGhvdG8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQaG90byhwaG90bywgYWNjb3VudCk7XG4gIH1cblxuICBvblZpZGVvU2F2ZSA9IGFzeW5jICh7dmlkZW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkF1ZGlvU2F2ZSA9IGFzeW5jICh7YXVkaW8sIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVBdWRpbyhhdWRpbywgYWNjb3VudCk7XG4gIH1cblxuICBvbkNoYW5nZXNldFNhdmUgPSBhc3luYyAoe2NoYW5nZXNldCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNoYW5nZXNldChjaGFuZ2VzZXQsIGFjY291bnQpO1xuICB9XG5cbiAgb25DaG9pY2VMaXN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpO1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBvblByb2plY3RTYXZlID0gYXN5bmMgKHtvYmplY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBvblJvbGVTYXZlID0gYXN5bmMgKHtvYmplY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHtvYmplY3QsIGFjY291bnR9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQaG90byhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAucGhvdG8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRQaG90b1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICdwaG90b3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVZpZGVvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC52aWRlbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdFZpZGVvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ3ZpZGVvcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQXVkaW8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLmF1ZGlvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0QXVkaW9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAnYXVkaW8nKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNoYW5nZXNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hhbmdlc2V0KG9iamVjdCksICdjaGFuZ2VzZXRzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVQcm9qZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5wcm9qZWN0KG9iamVjdCksICdwcm9qZWN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAubWVtYmVyc2hpcChvYmplY3QpLCAnbWVtYmVyc2hpcHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVJvbGUob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLnJvbGUob2JqZWN0KSwgJ3JvbGVzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVGb3JtT2JqZWN0KG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5mb3JtKG9iamVjdCksICdmb3JtcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2hvaWNlTGlzdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2hvaWNlTGlzdChvYmplY3QpLCAnY2hvaWNlX2xpc3RzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuY2xhc3NpZmljYXRpb25TZXQob2JqZWN0KSwgJ2NsYXNzaWZpY2F0aW9uX3NldHMnKTtcbiAgfVxuXG5cbiAgYXN5bmMgdXBkYXRlT2JqZWN0KHZhbHVlcywgdGFibGUpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVsZXRlU3RhdGVtZW50ID0gdGhpcy5wZ2RiLmRlbGV0ZVN0YXRlbWVudCh0YWJsZSwge3Jvd19yZXNvdXJjZV9pZDogdmFsdWVzLnJvd19yZXNvdXJjZV9pZH0pO1xuICAgICAgY29uc3QgaW5zZXJ0U3RhdGVtZW50ID0gdGhpcy5wZ2RiLmluc2VydFN0YXRlbWVudCh0YWJsZSwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcblxuICAgICAgY29uc3Qgc3FsID0gWyBkZWxldGVTdGF0ZW1lbnQuc3FsLCBpbnNlcnRTdGF0ZW1lbnQuc3FsIF0uam9pbignXFxuJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMucnVuKHNxbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFRhYmxlTGlzdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oXCJTRUxFQ1QgdGFibGVfbmFtZSBBUyBuYW1lIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlcyBXSEVSRSB0YWJsZV9zY2hlbWE9J3B1YmxpYydcIik7XG5cbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XG4gIH1cblxuICBiYXNlTWVkaWFVUkwgPSAoKSA9PiB7XG4gIH1cblxuICBmb3JtYXRQaG90b1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3MvJHsgaWQgfS5qcGdgO1xuICB9XG5cbiAgZm9ybWF0VmlkZW9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zLyR7IGlkIH0ubXA0YDtcbiAgfVxuXG4gIGZvcm1hdEF1ZGlvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L2F1ZGlvLyR7IGlkIH0ubTRhYDtcbiAgfVxuXG4gIHNldHVwT3B0aW9ucygpIHtcbiAgICB0aGlzLmJhc2VNZWRpYVVSTCA9IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA/IGZ1bGNydW0uYXJncy5wZ01lZGlhQmFzZVVybCA6ICdodHRwczovL2FwaS5mdWxjcnVtYXBwLmNvbS9hcGkvdjInO1xuXG4gICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMgPSB7XG4gICAgICBkaXNhYmxlQXJyYXlzOiB0aGlzLmRpc2FibGVBcnJheXMsXG5cbiAgICAgIHZhbHVlc1RyYW5zZm9ybWVyOiB0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUudmFsdWVzVHJhbnNmb3JtZXIsXG5cbiAgICAgIG1lZGlhVVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuXG4gICAgICAgIHJldHVybiBtZWRpYVZhbHVlLml0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFBob3RvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdFZpZGVvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm1hdEF1ZGlvVVJMKGl0ZW0ubWVkaWFJRCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgbWVkaWFWaWV3VVJMRm9ybWF0dGVyOiAobWVkaWFWYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZHMgPSBtZWRpYVZhbHVlLml0ZW1zLm1hcChvID0+IG8ubWVkaWFJRCk7XG5cbiAgICAgICAgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1Bob3RvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9waG90b3Mvdmlldz9waG90b3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc1ZpZGVvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS92aWRlb3Mvdmlldz92aWRlb3M9JHsgaWRzIH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1lZGlhVmFsdWUuZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby92aWV3P2F1ZGlvPSR7IGlkcyB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCkge1xuICAgICAgdGhpcy5yZWNvcmRWYWx1ZU9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyID0gKGZlYXR1cmUpID0+IHtcbiAgICAgICAgcmV0dXJuIGAkeyBmdWxjcnVtLmFyZ3MucGdSZXBvcnRCYXNlVXJsIH0vcmVwb3J0cy8keyBmZWF0dXJlLmlkIH0ucGRmYDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlUmVjb3JkID0gYXN5bmMgKHJlY29yZCwgYWNjb3VudCwgc2tpcFRhYmxlQ2hlY2spID0+IHtcbiAgICBpZiAoIXNraXBUYWJsZUNoZWNrICYmICF0aGlzLnJvb3RUYWJsZUV4aXN0cyhyZWNvcmQuZm9ybSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZvcm0ocmVjb3JkLmZvcm0sIGFjY291bnQsICgpID0+IHt9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZVJlY29yZCAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQoe3JlY29yZCwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFBvc3RncmVzUmVjb3JkVmFsdWVzLnVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHModGhpcy5wZ2RiLCByZWNvcmQsIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHJvb3RUYWJsZUV4aXN0cyA9IChmb3JtKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XG4gIH1cblxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSwgbnVsbCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzcWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcbiAgfVxuXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xuICAgIGlmICh0aGlzLnBnQ3VzdG9tTW9kdWxlICYmIHRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSAmJiAhdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVGb3JtKHtmb3JtLCBhY2NvdW50fSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3QoZm9ybSwgYWNjb3VudCk7XG5cbiAgICBpZiAoIXRoaXMucm9vdFRhYmxlRXhpc3RzKGZvcm0pICYmIG5ld0Zvcm0gIT0gbnVsbCkge1xuICAgICAgb2xkRm9ybSA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgUG9zdGdyZXNTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0sIHRoaXMuZGlzYWJsZUFycmF5cywgdGhpcy5wZ0N1c3RvbU1vZHVsZSk7XG5cbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50cy5qb2luKCdcXG4nKSk7XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0RST1AgVklFVyBJRiBFWElTVFMgJXMuJXM7JywgdGhpcy5wZ2RiLmlkZW50KHRoaXMuZGF0YVNjaGVtYSksIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdDUkVBVEUgVklFVyAlcy4lcyBBUyBTRUxFQ1QgKiBGUk9NICVzX3ZpZXdfZnVsbDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGdkYi5pZGVudCh2aWV3TmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdGdyZXNSZWNvcmRWYWx1ZXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSkpKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIH1cbiAgICAgIC8vIHNvbWV0aW1lcyBpdCBkb2Vzbid0IGV4aXN0XG4gICAgfVxuICB9XG5cbiAgZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSkge1xuICAgIGNvbnN0IG5hbWUgPSByZXBlYXRhYmxlID8gYCR7Zm9ybS5uYW1lfSAtICR7cmVwZWF0YWJsZS5kYXRhTmFtZX1gIDogZm9ybS5uYW1lO1xuXG4gICAgcmV0dXJuIGZ1bGNydW0uYXJncy5wZ1VuZGVyc2NvcmVOYW1lcyA/IHNuYWtlKG5hbWUpIDogbmFtZTtcbiAgfVxuXG4gIGFzeW5jIGludm9rZUJlZm9yZUZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdTRUxFQ1QgJXMoKTsnLCBmdWxjcnVtLmFyZ3MucGdCZWZvcmVGdW5jdGlvbikpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGludm9rZUFmdGVyRnVuY3Rpb24oKSB7XG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQWZ0ZXJGdW5jdGlvbikpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIHByb2dyZXNzKSB7XG4gICAgYXdhaXQgdGhpcy5yZWNyZWF0ZUZvcm1UYWJsZXMoZm9ybSwgYWNjb3VudCk7XG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcblxuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBhd2FpdCBmb3JtLmZpbmRFYWNoUmVjb3JkKHt9LCBhc3luYyAocmVjb3JkKSA9PiB7XG4gICAgICByZWNvcmQuZm9ybSA9IGZvcm07XG5cbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgcHJvZ3Jlc3MoaW5kZXgpO1xuICB9XG5cbiAgYXN5bmMgcmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJykpIHtcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cbiAgfVxuXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcbiAgICBpZiAoZm9ybSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGZvcm0uX2lkLFxuICAgICAgcm93X2lkOiBmb3JtLnJvd0lELFxuICAgICAgbmFtZTogZm9ybS5fbmFtZSxcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlU3RhdHVzID0gKG1lc3NhZ2UpID0+IHtcbiAgICBpZiAocHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wU3lzdGVtVGFibGVzKCkge1xuICAgIGNvbnN0IHNxbCA9IHRlbXBsYXRlRHJvcC5yZXBsYWNlKC9fX1NDSEVNQV9fL2csICdwdWJsaWMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9fX1ZJRVdfU0NIRU1BX18vZywgdGhpcy5kYXRhU2NoZW1hKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHNxbCk7XG4gIH1cblxuICBhc3luYyBzZXR1cERhdGFiYXNlKCkge1xuICAgIGNvbnN0IHNxbCA9IHRlbXBsYXRlLnJlcGxhY2UoL19fU0NIRU1BX18vZywgJ3B1YmxpYycpXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvX19WSUVXX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gKG5hbWUsIGluZGV4KSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhuYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCk7XG4gICAgfTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hQaG90byh7fSwgYXN5bmMgKHBob3RvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdQaG90b3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGhvdG8ocGhvdG8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFZpZGVvKHt9LCBhc3luYyAodmlkZW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1ZpZGVvcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVWaWRlbyh2aWRlbywgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQXVkaW8oe30sIGFzeW5jIChhdWRpbywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQXVkaW8nLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQXVkaW8oYXVkaW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENoYW5nZXNldCh7fSwgYXN5bmMgKGNoYW5nZXNldCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hhbmdlc2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaGFuZ2VzZXQoY2hhbmdlc2V0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hSb2xlKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdSb2xlcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUHJvamVjdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUHJvamVjdHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEZvcm0oe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Zvcm1zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm1PYmplY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hNZW1iZXJzaGlwKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdNZW1iZXJzaGlwcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2hvaWNlTGlzdCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2hvaWNlIExpc3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnQ2xhc3NpZmljYXRpb24gU2V0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDbGFzc2lmaWNhdGlvblNldChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbWF5YmVJbml0aWFsaXplKCkge1xuICAgIGlmICh0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZignbWlncmF0aW9ucycpID09PSAtMSkge1xuICAgICAgY29uc29sZS5sb2coJ0luaXRpdGFsaXppbmcgZGF0YWJhc2UuLi4nKTtcblxuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG5cbiAgICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgICAgY29uc29sZS5sb2coJ1BvcHVsYXRpbmcgc3lzdGVtIHRhYmxlcy4uLicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgIH1cbiAgfVxufVxuIl19