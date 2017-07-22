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
      var _ref12 = _asyncToGenerator(function* ({ object }) {
        yield _this.updateChoiceList(object, acccount);
      });

      return function (_x11) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref13 = _asyncToGenerator(function* ({ object }) {
        yield _this.updateClassificationSet(object, acccount);
      });

      return function (_x12) {
        return _ref13.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref14 = _asyncToGenerator(function* ({ object }) {
        yield _this.updateProject(object, acccount);
      });

      return function (_x13) {
        return _ref14.apply(this, arguments);
      };
    })();

    this.onRoleSave = (() => {
      var _ref15 = _asyncToGenerator(function* ({ object }) {
        yield _this.updateRole(object, acccount);
      });

      return function (_x14) {
        return _ref15.apply(this, arguments);
      };
    })();

    this.onMembershipSave = (() => {
      var _ref16 = _asyncToGenerator(function* ({ object }) {
        yield _this.updateMembership(object, acccount);
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

  updateForm(object, account) {
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

          yield _this24.updateForm(object, account);
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
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInBnRHJvcCIsImRyb3BTeXN0ZW1UYWJsZXMiLCJwZ1NldHVwIiwic2V0dXBEYXRhYmFzZSIsImFjY291bnQiLCJmZXRjaEFjY291bnQiLCJvcmciLCJwZ1N5c3RlbVRhYmxlc09ubHkiLCJzZXR1cFN5c3RlbVRhYmxlcyIsImludm9rZUJlZm9yZUZ1bmN0aW9uIiwiZm9ybXMiLCJmaW5kQWN0aXZlRm9ybXMiLCJmb3JtIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uRm9ybURlbGV0ZSIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25QaG90b1NhdmUiLCJwaG90byIsInVwZGF0ZVBob3RvIiwib25WaWRlb1NhdmUiLCJ2aWRlbyIsInVwZGF0ZVZpZGVvIiwib25BdWRpb1NhdmUiLCJhdWRpbyIsInVwZGF0ZUF1ZGlvIiwib25DaGFuZ2VzZXRTYXZlIiwiY2hhbmdlc2V0IiwidXBkYXRlQ2hhbmdlc2V0Iiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJhY2Njb3VudCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwidXBkYXRlUHJvamVjdCIsIm9uUm9sZVNhdmUiLCJ1cGRhdGVSb2xlIiwib25NZW1iZXJzaGlwU2F2ZSIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJ0YWJsZU5hbWVzIiwiYmFzZU1lZGlhVVJMIiwiZm9ybWF0UGhvdG9VUkwiLCJmb3JtYXRWaWRlb1VSTCIsImZvcm1hdEF1ZGlvVVJMIiwic2tpcFRhYmxlQ2hlY2siLCJyb290VGFibGVFeGlzdHMiLCJwZ0N1c3RvbU1vZHVsZSIsInNob3VsZFVwZGF0ZVJlY29yZCIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsImdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyIsImRpc2FibGVBcnJheXMiLCJkcm9wRnJpZW5kbHlWaWV3IiwicmVwZWF0YWJsZSIsImVsZW1lbnRzT2ZUeXBlIiwiY3JlYXRlRnJpZW5kbHlWaWV3IiwibWVzc2FnZSIsInByb2Nlc3MiLCJzdGRvdXQiLCJpc1RUWSIsImNsZWFyTGluZSIsImN1cnNvclRvIiwid3JpdGUiLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdEYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdIb3N0IiwicGdQb3J0IiwicGdVc2VyIiwicGdQYXNzd29yZCIsInBnU2NoZW1hIiwicGdTeW5jRXZlbnRzIiwicGdCZWZvcmVGdW5jdGlvbiIsInBnQWZ0ZXJGdW5jdGlvbiIsInJlcXVpcmVkIiwicGdSZXBvcnRCYXNlVXJsIiwicGdNZWRpYUJhc2VVcmwiLCJwZ1VuZGVyc2NvcmVOYW1lcyIsInBnQXJyYXlzIiwiaGFuZGxlciIsInVzZVN5bmNFdmVudHMiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwicmVxdWlyZSIsIlBvb2wiLCJvbiIsImRhdGFTY2hlbWEiLCJzZXR1cE9wdGlvbnMiLCJkZWFjdGl2YXRlIiwiZW5kIiwidmFsdWVzIiwiZmlsZSIsImFjY2Vzc19rZXkiLCJ1cGRhdGVPYmplY3QiLCJwcm9qZWN0IiwibWVtYmVyc2hpcCIsInJvbGUiLCJjaG9pY2VMaXN0IiwiY2xhc3NpZmljYXRpb25TZXQiLCJ0YWJsZSIsImRlbGV0ZVN0YXRlbWVudCIsInJvd19yZXNvdXJjZV9pZCIsImluc2VydFN0YXRlbWVudCIsInBrIiwidmFsdWVzVHJhbnNmb3JtZXIiLCJtZWRpYVVSTEZvcm1hdHRlciIsIm1lZGlhVmFsdWUiLCJpdGVtcyIsIml0ZW0iLCJlbGVtZW50IiwiaXNQaG90b0VsZW1lbnQiLCJtZWRpYUlEIiwiaXNWaWRlb0VsZW1lbnQiLCJpc0F1ZGlvRWxlbWVudCIsIm1lZGlhVmlld1VSTEZvcm1hdHRlciIsImlkcyIsInJlcG9ydFVSTEZvcm1hdHRlciIsImZlYXR1cmUiLCJ2aWV3TmFtZSIsImdldEZyaWVuZGx5VGFibGVOYW1lIiwiaWRlbnQiLCJkYXRhTmFtZSIsInByb2dyZXNzIiwiZmluZEVhY2hSZWNvcmQiLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaENoYW5nZXNldCIsImZpbmRFYWNoUm9sZSIsImZpbmRFYWNoUHJvamVjdCIsImZpbmRFYWNoRm9ybSIsImZpbmRFYWNoTWVtYmVyc2hp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LEVBQXdCO0FBQ3RCd0sscUJBQVMscUJBQVQsRUFBZ0N4SyxLQUFoQztBQUNEOztBQUVELGdCQUFNLFFBQUtrRSx1QkFBTCxDQUE2QkosTUFBN0IsRUFBcUMxRSxPQUFyQyxDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOO0FBL0YrQjtBQXNHaEM7QUF6dEJrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwZyBmcm9tICdwZyc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBQb3N0Z3Jlc1NjaGVtYSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBQb3N0Z3Jlc1JlY29yZFZhbHVlcywgUG9zdGdyZXMgfSBmcm9tICdmdWxjcnVtJztcbmltcG9ydCBzbmFrZSBmcm9tICdzbmFrZS1jYXNlJztcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlLnNxbCc7XG5pbXBvcnQgdGVtcGxhdGVEcm9wIGZyb20gJy4vdGVtcGxhdGUuZHJvcC5zcWwnO1xuaW1wb3J0IFNjaGVtYU1hcCBmcm9tICcuL3NjaGVtYS1tYXAnO1xuXG5jb25zdCBQT1NUR1JFU19DT05GSUcgPSB7XG4gIGRhdGFiYXNlOiAnZnVsY3J1bWFwcCcsXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICBwb3J0OiA1NDMyLFxuICBtYXg6IDEwLFxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3Bvc3RncmVzJyxcbiAgICAgIGRlc2M6ICdydW4gdGhlIHBvc3RncmVzIHN5bmMgZm9yIGEgc3BlY2lmaWMgb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgcGdEYXRhYmFzZToge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIGRhdGFiYXNlIG5hbWUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5kYXRhYmFzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0hvc3Q6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgaG9zdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgcGdQb3J0OiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2VydmVyIHBvcnQnLFxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcucG9ydFxuICAgICAgICB9LFxuICAgICAgICBwZ1VzZXI6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCB1c2VyJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1Bhc3N3b3JkOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgcGFzc3dvcmQnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2NoZW1hOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgc2NoZW1hJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1N5bmNFdmVudHM6IHtcbiAgICAgICAgICBkZXNjOiAnYWRkIHN5bmMgZXZlbnQgaG9va3MnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQmVmb3JlRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdBZnRlckZ1bmN0aW9uOiB7XG4gICAgICAgICAgZGVzYzogJ2NhbGwgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgc3luYycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1JlcG9ydEJhc2VVcmw6IHtcbiAgICAgICAgICBkZXNjOiAncmVwb3J0IFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ01lZGlhQmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdtZWRpYSBVUkwgYmFzZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdVbmRlcnNjb3JlTmFtZXM6IHtcbiAgICAgICAgICBkZXNjOiAndXNlIHVuZGVyc2NvcmUgbmFtZXMgKGUuZy4gXCJQYXJrIEluc3BlY3Rpb25zXCIgYmVjb21lcyBcInBhcmtfaW5zcGVjdGlvbnNcIiknLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdSZWJ1aWxkVmlld3NPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgcmVidWlsZCB0aGUgdmlld3MnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcGdDdXN0b21Nb2R1bGU6IHtcbiAgICAgICAgICBkZXNjOiAnYSBjdXN0b20gbW9kdWxlIHRvIGxvYWQgd2l0aCBzeW5jIGV4dGVuc2lvbnMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1NldHVwOiB7XG4gICAgICAgICAgZGVzYzogJ3NldHVwIHRoZSBkYXRhYmFzZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0Ryb3A6IHtcbiAgICAgICAgICBkZXNjOiAnZHJvcCB0aGUgc3lzdGVtIHRhYmxlcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0FycmF5czoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgYXJyYXkgdHlwZXMgZm9yIG11bHRpLXZhbHVlIGZpZWxkcyBsaWtlIGNob2ljZSBmaWVsZHMsIGNsYXNzaWZpY2F0aW9uIGZpZWxkcyBhbmQgbWVkaWEgZmllbGRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdTeXN0ZW1UYWJsZXNPbmx5OiB7XG4gICAgICAgICAgZGVzYzogJ29ubHkgY3JlYXRlIHRoZSBzeXN0ZW0gcmVjb3JkcycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdEcm9wKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BTeXN0ZW1UYWJsZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU2V0dXApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBEYXRhYmFzZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnU3lzdGVtVGFibGVzT25seSkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcblxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBhY2NvdW50LmZpbmRBY3RpdmVGb3Jtcyh7fSk7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xuICAgICAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUmVidWlsZFZpZXdzT25seSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVidWlsZEZyaWVuZGx5Vmlld3MoZm9ybSwgYWNjb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VBZnRlckZ1bmN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGFjY291bnQnLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICB9XG4gIH1cblxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcbiAgICByZXR1cm4gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyAhPSBudWxsID8gZnVsY3J1bS5hcmdzLnBnU3luY0V2ZW50cyA6IHRydWU7XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4uUE9TVEdSRVNfQ09ORklHLFxuICAgICAgaG9zdDogZnVsY3J1bS5hcmdzLnBnSG9zdCB8fCBQT1NUR1JFU19DT05GSUcuaG9zdCxcbiAgICAgIHBvcnQ6IGZ1bGNydW0uYXJncy5wZ1BvcnQgfHwgUE9TVEdSRVNfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhYmFzZTogZnVsY3J1bS5hcmdzLnBnRGF0YWJhc2UgfHwgUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlLFxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLnBnVXNlciB8fCBQT1NUR1JFU19DT05GSUcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCB8fCBQT1NUR1JFU19DT05GSUcudXNlclxuICAgIH07XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnVXNlcikge1xuICAgICAgb3B0aW9ucy51c2VyID0gZnVsY3J1bS5hcmdzLnBnVXNlcjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnUGFzc3dvcmQpIHtcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MucGdQYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQ3VzdG9tTW9kdWxlKSB7XG4gICAgICB0aGlzLnBnQ3VzdG9tTW9kdWxlID0gcmVxdWlyZShmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8ICdwdWJsaWMnO1xuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG5cbiAgICB0aGlzLnNldHVwT3B0aW9ucygpO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uRm9ybVNhdmUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm19KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuICB9XG5cbiAgb25Gb3JtRGVsZXRlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50fSkgPT4ge1xuICAgIGNvbnN0IG9sZEZvcm0gPSB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbnVsbCk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIG9uUGhvdG9TYXZlID0gYXN5bmMgKHtwaG90bywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uVmlkZW9TYXZlID0gYXN5bmMgKHt2aWRlbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQXVkaW9TYXZlID0gYXN5bmMgKHthdWRpbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hhbmdlc2V0U2F2ZSA9IGFzeW5jICh7Y2hhbmdlc2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjY291bnQpO1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjY291bnQpO1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChvYmplY3QsIGFjY2NvdW50KTtcbiAgfVxuXG4gIG9uUm9sZVNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUob2JqZWN0LCBhY2Njb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUGhvdG8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnBob3RvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0UGhvdG9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAncGhvdG9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVWaWRlbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAudmlkZW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRWaWRlb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICd2aWRlb3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUF1ZGlvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5hdWRpbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdEF1ZGlvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ2F1ZGlvJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaGFuZ2VzZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNoYW5nZXNldChvYmplY3QpLCAnY2hhbmdlc2V0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucHJvamVjdChvYmplY3QpLCAncHJvamVjdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLm1lbWJlcnNoaXAob2JqZWN0KSwgJ21lbWJlcnNoaXBzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yb2xlKG9iamVjdCksICdyb2xlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRm9ybShvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuZm9ybShvYmplY3QpLCAnZm9ybXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNob2ljZUxpc3Qob2JqZWN0KSwgJ2Nob2ljZV9saXN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCksICdjbGFzc2lmaWNhdGlvbl9zZXRzJyk7XG4gIH1cblxuXG4gIGFzeW5jIHVwZGF0ZU9iamVjdCh2YWx1ZXMsIHRhYmxlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRlbGV0ZVN0YXRlbWVudCA9IHRoaXMucGdkYi5kZWxldGVTdGF0ZW1lbnQodGFibGUsIHtyb3dfcmVzb3VyY2VfaWQ6IHZhbHVlcy5yb3dfcmVzb3VyY2VfaWR9KTtcbiAgICAgIGNvbnN0IGluc2VydFN0YXRlbWVudCA9IHRoaXMucGdkYi5pbnNlcnRTdGF0ZW1lbnQodGFibGUsIHZhbHVlcywge3BrOiAnaWQnfSk7XG5cbiAgICAgIGNvbnN0IHNxbCA9IFsgZGVsZXRlU3RhdGVtZW50LnNxbCwgaW5zZXJ0U3RhdGVtZW50LnNxbCBdLmpvaW4oJ1xcbicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICB9XG4gIH1cblxuICByZWxvYWRUYWJsZUxpc3QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuICB9XG5cbiAgYmFzZU1lZGlhVVJMID0gKCkgPT4ge1xuICB9XG5cbiAgZm9ybWF0UGhvdG9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zLyR7IGlkIH0uanBnYDtcbiAgfVxuXG4gIGZvcm1hdFZpZGVvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy8keyBpZCB9Lm1wNGA7XG4gIH1cblxuICBmb3JtYXRBdWRpb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby8keyBpZCB9Lm00YWA7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5iYXNlTWVkaWFVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly9hcGkuZnVsY3J1bWFwcC5jb20vYXBpL3YyJztcblxuICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zID0ge1xuICAgICAgZGlzYWJsZUFycmF5czogdGhpcy5kaXNhYmxlQXJyYXlzLFxuXG4gICAgICB2YWx1ZXNUcmFuc2Zvcm1lcjogdGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnZhbHVlc1RyYW5zZm9ybWVyLFxuXG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcblxuICAgICAgICByZXR1cm4gbWVkaWFWYWx1ZS5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRQaG90b1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRWaWRlb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRBdWRpb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zL3ZpZXc/cGhvdG9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQgJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkKHtyZWNvcmQsIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0gJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSh7Zm9ybSwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcbiAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCB0aGlzLmRpc2FibGVBcnJheXMsIHRoaXMucGdDdXN0b21Nb2R1bGUpO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgPyBzbmFrZShuYW1lKSA6IG5hbWU7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcFN5c3RlbVRhYmxlcygpIHtcbiAgICBjb25zdCBzcWwgPSB0ZW1wbGF0ZURyb3AucmVwbGFjZSgvX19TQ0hFTUFfXy9nLCAncHVibGljJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvX19WSUVXX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBEYXRhYmFzZSgpIHtcbiAgICBjb25zdCBzcWwgPSB0ZW1wbGF0ZS5yZXBsYWNlKC9fX1NDSEVNQV9fL2csICdwdWJsaWMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLmRhdGFTY2hlbWEpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpIHtcbiAgICBjb25zdCBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICAgIH07XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUGhvdG8oe30sIGFzeW5jIChwaG90bywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUGhvdG9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hWaWRlbyh7fSwgYXN5bmMgKHZpZGVvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdWaWRlb3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEF1ZGlvKHt9LCBhc3luYyAoYXVkaW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0F1ZGlvJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaGFuZ2VzZXQoe30sIGFzeW5jIChjaGFuZ2VzZXQsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NoYW5nZXNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUm9sZSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUm9sZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFByb2plY3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Byb2plY3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hGb3JtKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdGb3JtcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoTWVtYmVyc2hpcCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnTWVtYmVyc2hpcHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENob2ljZUxpc3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Nob2ljZSBMaXN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NsYXNzaWZpY2F0aW9uIFNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcbiAgfVxufVxuIl19