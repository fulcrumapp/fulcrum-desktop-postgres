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

        const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm, _this.disableArrays);

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

      if (fulcrum.args.arrays === false) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJQT1NUR1JFU19DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInBnRHJvcCIsImRyb3BTeXN0ZW1UYWJsZXMiLCJwZ1NldHVwIiwic2V0dXBEYXRhYmFzZSIsImFjY291bnQiLCJmZXRjaEFjY291bnQiLCJvcmciLCJwZ1N5c3RlbVRhYmxlc09ubHkiLCJzZXR1cFN5c3RlbVRhYmxlcyIsImludm9rZUJlZm9yZUZ1bmN0aW9uIiwiZm9ybXMiLCJmaW5kQWN0aXZlRm9ybXMiLCJmb3JtIiwicGdSZWJ1aWxkVmlld3NPbmx5IiwicmVidWlsZEZyaWVuZGx5Vmlld3MiLCJyZWJ1aWxkRm9ybSIsImluZGV4IiwidXBkYXRlU3RhdHVzIiwibmFtZSIsImdyZWVuIiwidG9TdHJpbmciLCJyZWQiLCJjb25zb2xlIiwibG9nIiwiaW52b2tlQWZ0ZXJGdW5jdGlvbiIsImVycm9yIiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwb29sIiwicXVlcnkiLCJlcnIiLCJyZXMiLCJyb3dzIiwidGFibGVOYW1lIiwicm93SUQiLCJvblN5bmNTdGFydCIsInRhc2tzIiwib25TeW5jRmluaXNoIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uRm9ybURlbGV0ZSIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJvblJlY29yZFNhdmUiLCJyZWNvcmQiLCJ1cGRhdGVSZWNvcmQiLCJvblJlY29yZERlbGV0ZSIsInN0YXRlbWVudHMiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwicGdkYiIsInJlY29yZFZhbHVlT3B0aW9ucyIsIm1hcCIsIm8iLCJqb2luIiwib25QaG90b1NhdmUiLCJwaG90byIsInVwZGF0ZVBob3RvIiwib25WaWRlb1NhdmUiLCJ2aWRlbyIsInVwZGF0ZVZpZGVvIiwib25BdWRpb1NhdmUiLCJhdWRpbyIsInVwZGF0ZUF1ZGlvIiwib25DaGFuZ2VzZXRTYXZlIiwiY2hhbmdlc2V0IiwidXBkYXRlQ2hhbmdlc2V0Iiwib25DaG9pY2VMaXN0U2F2ZSIsIm9iamVjdCIsInVwZGF0ZUNob2ljZUxpc3QiLCJhY2Njb3VudCIsIm9uQ2xhc3NpZmljYXRpb25TZXRTYXZlIiwidXBkYXRlQ2xhc3NpZmljYXRpb25TZXQiLCJvblByb2plY3RTYXZlIiwidXBkYXRlUHJvamVjdCIsIm9uUm9sZVNhdmUiLCJ1cGRhdGVSb2xlIiwib25NZW1iZXJzaGlwU2F2ZSIsInVwZGF0ZU1lbWJlcnNoaXAiLCJyZWxvYWRUYWJsZUxpc3QiLCJ0YWJsZU5hbWVzIiwiYmFzZU1lZGlhVVJMIiwiZm9ybWF0UGhvdG9VUkwiLCJmb3JtYXRWaWRlb1VSTCIsImZvcm1hdEF1ZGlvVVJMIiwic2tpcFRhYmxlQ2hlY2siLCJyb290VGFibGVFeGlzdHMiLCJwZ0N1c3RvbU1vZHVsZSIsInNob3VsZFVwZGF0ZVJlY29yZCIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4Iiwic2hvdWxkVXBkYXRlRm9ybSIsImdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyIsImRpc2FibGVBcnJheXMiLCJkcm9wRnJpZW5kbHlWaWV3IiwicmVwZWF0YWJsZSIsImVsZW1lbnRzT2ZUeXBlIiwiY3JlYXRlRnJpZW5kbHlWaWV3IiwibWVzc2FnZSIsInByb2Nlc3MiLCJzdGRvdXQiLCJpc1RUWSIsImNsZWFyTGluZSIsImN1cnNvclRvIiwid3JpdGUiLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwicGdEYXRhYmFzZSIsInR5cGUiLCJkZWZhdWx0IiwicGdIb3N0IiwicGdQb3J0IiwicGdVc2VyIiwicGdQYXNzd29yZCIsInBnU2NoZW1hIiwicGdTeW5jRXZlbnRzIiwicGdCZWZvcmVGdW5jdGlvbiIsInBnQWZ0ZXJGdW5jdGlvbiIsInJlcXVpcmVkIiwicGdSZXBvcnRCYXNlVXJsIiwicGdNZWRpYUJhc2VVcmwiLCJwZ1VuZGVyc2NvcmVOYW1lcyIsInBnQXJyYXlzIiwiaGFuZGxlciIsInVzZVN5bmNFdmVudHMiLCJvcHRpb25zIiwidXNlciIsInBhc3N3b3JkIiwicmVxdWlyZSIsImFycmF5cyIsIlBvb2wiLCJvbiIsImRhdGFTY2hlbWEiLCJzZXR1cE9wdGlvbnMiLCJkZWFjdGl2YXRlIiwiZW5kIiwidmFsdWVzIiwiZmlsZSIsImFjY2Vzc19rZXkiLCJ1cGRhdGVPYmplY3QiLCJwcm9qZWN0IiwibWVtYmVyc2hpcCIsInJvbGUiLCJjaG9pY2VMaXN0IiwiY2xhc3NpZmljYXRpb25TZXQiLCJ0YWJsZSIsImRlbGV0ZVN0YXRlbWVudCIsInJvd19yZXNvdXJjZV9pZCIsImluc2VydFN0YXRlbWVudCIsInBrIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJtZWRpYVZhbHVlIiwiaXRlbXMiLCJpdGVtIiwiZWxlbWVudCIsImlzUGhvdG9FbGVtZW50IiwibWVkaWFJRCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJpZHMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJmZWF0dXJlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsImlkZW50IiwiZGF0YU5hbWUiLCJwcm9ncmVzcyIsImZpbmRFYWNoUmVjb3JkIiwiZmluZEVhY2hQaG90byIsImZpbmRFYWNoVmlkZW8iLCJmaW5kRWFjaEF1ZGlvIiwiZmluZEVhY2hDaGFuZ2VzZXQiLCJmaW5kRWFjaFJvbGUiLCJmaW5kRWFjaFByb2plY3QiLCJmaW5kRWFjaEZvcm0iLCJmaW5kRWFjaE1lbWJlcnNoaXAiLCJmaW5kRWFjaENob2ljZUxpc3QiLCJmaW5kRWFjaENsYXNzaWZpY2F0aW9uU2V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNQSxrQkFBa0I7QUFDdEJDLFlBQVUsWUFEWTtBQUV0QkMsUUFBTSxXQUZnQjtBQUd0QkMsUUFBTSxJQUhnQjtBQUl0QkMsT0FBSyxFQUppQjtBQUt0QkMscUJBQW1CO0FBTEcsQ0FBeEI7O2tCQVFlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBd0duQkMsVUF4R21CLHFCQXdHTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOOztBQUVBLFVBQUlDLFFBQVFDLElBQVIsQ0FBYUMsTUFBakIsRUFBeUI7QUFDdkIsY0FBTSxNQUFLQyxnQkFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxVQUFJSCxRQUFRQyxJQUFSLENBQWFHLE9BQWpCLEVBQTBCO0FBQ3hCLGNBQU0sTUFBS0MsYUFBTCxFQUFOO0FBQ0E7QUFDRDs7QUFFRCxZQUFNQyxVQUFVLE1BQU1OLFFBQVFPLFlBQVIsQ0FBcUJQLFFBQVFDLElBQVIsQ0FBYU8sR0FBbEMsQ0FBdEI7O0FBRUEsVUFBSUYsT0FBSixFQUFhO0FBQ1gsWUFBSU4sUUFBUUMsSUFBUixDQUFhUSxrQkFBakIsRUFBcUM7QUFDbkMsZ0JBQU0sTUFBS0MsaUJBQUwsQ0FBdUJKLE9BQXZCLENBQU47QUFDQTtBQUNEOztBQUVELGNBQU0sTUFBS0ssb0JBQUwsRUFBTjs7QUFFQSxjQUFNQyxRQUFRLE1BQU1OLFFBQVFPLGVBQVIsQ0FBd0IsRUFBeEIsQ0FBcEI7O0FBRUEsYUFBSyxNQUFNQyxJQUFYLElBQW1CRixLQUFuQixFQUEwQjtBQUN4QixjQUFJWixRQUFRQyxJQUFSLENBQWFjLGtCQUFqQixFQUFxQztBQUNuQyxrQkFBTSxNQUFLQyxvQkFBTCxDQUEwQkYsSUFBMUIsRUFBZ0NSLE9BQWhDLENBQU47QUFDRCxXQUZELE1BRU87QUFDTCxrQkFBTSxNQUFLVyxXQUFMLENBQWlCSCxJQUFqQixFQUF1QlIsT0FBdkIsRUFBZ0MsVUFBQ1ksS0FBRCxFQUFXO0FBQy9DLG9CQUFLQyxZQUFMLENBQWtCTCxLQUFLTSxJQUFMLENBQVVDLEtBQVYsR0FBa0IsS0FBbEIsR0FBMEJILE1BQU1JLFFBQU4sR0FBaUJDLEdBQTNDLEdBQWlELFVBQW5FO0FBQ0QsYUFGSyxDQUFOO0FBR0Q7O0FBRURDLGtCQUFRQyxHQUFSLENBQVksRUFBWjtBQUNEOztBQUVELGNBQU0sTUFBS0MsbUJBQUwsRUFBTjtBQUNELE9BdkJELE1BdUJPO0FBQ0xGLGdCQUFRRyxLQUFSLENBQWMsd0JBQWQsRUFBd0MzQixRQUFRQyxJQUFSLENBQWFPLEdBQXJEO0FBQ0Q7QUFDRixLQWpKa0I7O0FBQUEsU0FxT25Cb0IsR0FyT21CLEdBcU9aQyxHQUFELElBQVM7QUFDYkEsWUFBTUEsSUFBSUMsT0FBSixDQUFZLEtBQVosRUFBbUIsRUFBbkIsQ0FBTjs7QUFFQSxVQUFJOUIsUUFBUUMsSUFBUixDQUFhOEIsS0FBakIsRUFBd0I7QUFDdEJQLGdCQUFRQyxHQUFSLENBQVlJLEdBQVo7QUFDRDs7QUFFRCxhQUFPLElBQUlHLE9BQUosQ0FBWSxDQUFDQyxPQUFELEVBQVVDLE1BQVYsS0FBcUI7QUFDdEMsYUFBS0MsSUFBTCxDQUFVQyxLQUFWLENBQWdCUCxHQUFoQixFQUFxQixFQUFyQixFQUF5QixDQUFDUSxHQUFELEVBQU1DLEdBQU4sS0FBYztBQUNyQyxjQUFJRCxHQUFKLEVBQVM7QUFDUCxtQkFBT0gsT0FBT0csR0FBUCxDQUFQO0FBQ0Q7O0FBRUQsaUJBQU9KLFFBQVFLLElBQUlDLElBQVosQ0FBUDtBQUNELFNBTkQ7QUFPRCxPQVJNLENBQVA7QUFTRCxLQXJQa0I7O0FBQUEsU0F1UG5CZCxHQXZQbUIsR0F1UGIsQ0FBQyxHQUFHeEIsSUFBSixLQUFhO0FBQ2pCO0FBQ0QsS0F6UGtCOztBQUFBLFNBMlBuQnVDLFNBM1BtQixHQTJQUCxDQUFDbEMsT0FBRCxFQUFVYyxJQUFWLEtBQW1CO0FBQzdCLGFBQU8sYUFBYWQsUUFBUW1DLEtBQXJCLEdBQTZCLEdBQTdCLEdBQW1DckIsSUFBMUM7QUFDRCxLQTdQa0I7O0FBQUEsU0ErUG5Cc0IsV0EvUG1CO0FBQUEsb0NBK1BMLFdBQU8sRUFBQ3BDLE9BQUQsRUFBVXFDLEtBQVYsRUFBUCxFQUE0QjtBQUN4QyxjQUFLaEMsb0JBQUw7QUFDRCxPQWpRa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FtUW5CaUMsWUFuUW1CO0FBQUEsb0NBbVFKLFdBQU8sRUFBQ3RDLE9BQUQsRUFBUCxFQUFxQjtBQUNsQyxjQUFLb0IsbUJBQUw7QUFDRCxPQXJRa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0F1UW5CbUIsVUF2UW1CO0FBQUEsb0NBdVFOLFdBQU8sRUFBQy9CLElBQUQsRUFBT1IsT0FBUCxFQUFnQndDLE9BQWhCLEVBQXlCQyxPQUF6QixFQUFQLEVBQTZDO0FBQ3hELGNBQU0sTUFBS0MsVUFBTCxDQUFnQmxDLElBQWhCLEVBQXNCUixPQUF0QixFQUErQndDLE9BQS9CLEVBQXdDQyxPQUF4QyxDQUFOO0FBQ0QsT0F6UWtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBMlFuQkUsWUEzUW1CO0FBQUEsb0NBMlFKLFdBQU8sRUFBQ25DLElBQUQsRUFBT1IsT0FBUCxFQUFQLEVBQTJCO0FBQ3hDLGNBQU13QyxVQUFVO0FBQ2RJLGNBQUlwQyxLQUFLcUMsR0FESztBQUVkQyxrQkFBUXRDLEtBQUsyQixLQUZDO0FBR2RyQixnQkFBTU4sS0FBS3VDLEtBSEc7QUFJZEMsb0JBQVV4QyxLQUFLeUM7QUFKRCxTQUFoQjs7QUFPQSxjQUFNLE1BQUtQLFVBQUwsQ0FBZ0JsQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0J3QyxPQUEvQixFQUF3QyxJQUF4QyxDQUFOO0FBQ0QsT0FwUmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBc1JuQlUsWUF0Um1CO0FBQUEsb0NBc1JKLFdBQU8sRUFBQ0MsTUFBRCxFQUFTbkQsT0FBVCxFQUFQLEVBQTZCO0FBQzFDLGNBQU0sTUFBS29ELFlBQUwsQ0FBa0JELE1BQWxCLEVBQTBCbkQsT0FBMUIsQ0FBTjtBQUNELE9BeFJrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQTBSbkJxRCxjQTFSbUI7QUFBQSxvQ0EwUkYsV0FBTyxFQUFDRixNQUFELEVBQVAsRUFBb0I7QUFDbkMsY0FBTUcsYUFBYSwyQ0FBcUJDLHlCQUFyQixDQUErQyxNQUFLQyxJQUFwRCxFQUEwREwsTUFBMUQsRUFBa0VBLE9BQU8zQyxJQUF6RSxFQUErRSxNQUFLaUQsa0JBQXBGLENBQW5COztBQUVBLGNBQU0sTUFBS25DLEdBQUwsQ0FBU2dDLFdBQVdJLEdBQVgsQ0FBZTtBQUFBLGlCQUFLQyxFQUFFcEMsR0FBUDtBQUFBLFNBQWYsRUFBMkJxQyxJQUEzQixDQUFnQyxJQUFoQyxDQUFULENBQU47QUFDRCxPQTlSa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FnU25CQyxXQWhTbUI7QUFBQSxvQ0FnU0wsV0FBTyxFQUFDQyxLQUFELEVBQVE5RCxPQUFSLEVBQVAsRUFBNEI7QUFDeEMsY0FBTSxNQUFLK0QsV0FBTCxDQUFpQkQsS0FBakIsRUFBd0I5RCxPQUF4QixDQUFOO0FBQ0QsT0FsU2tCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBb1NuQmdFLFdBcFNtQjtBQUFBLG9DQW9TTCxXQUFPLEVBQUNDLEtBQUQsRUFBUWpFLE9BQVIsRUFBUCxFQUE0QjtBQUN4QyxjQUFNLE1BQUtrRSxXQUFMLENBQWlCRCxLQUFqQixFQUF3QmpFLE9BQXhCLENBQU47QUFDRCxPQXRTa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0F3U25CbUUsV0F4U21CO0FBQUEscUNBd1NMLFdBQU8sRUFBQ0MsS0FBRCxFQUFRcEUsT0FBUixFQUFQLEVBQTRCO0FBQ3hDLGNBQU0sTUFBS3FFLFdBQUwsQ0FBaUJELEtBQWpCLEVBQXdCcEUsT0FBeEIsQ0FBTjtBQUNELE9BMVNrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQTRTbkJzRSxlQTVTbUI7QUFBQSxxQ0E0U0QsV0FBTyxFQUFDQyxTQUFELEVBQVl2RSxPQUFaLEVBQVAsRUFBZ0M7QUFDaEQsY0FBTSxNQUFLd0UsZUFBTCxDQUFxQkQsU0FBckIsRUFBZ0N2RSxPQUFoQyxDQUFOO0FBQ0QsT0E5U2tCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBZ1RuQnlFLGdCQWhUbUI7QUFBQSxxQ0FnVEEsV0FBTyxFQUFDQyxNQUFELEVBQVAsRUFBb0I7QUFDckMsY0FBTSxNQUFLQyxnQkFBTCxDQUFzQkQsTUFBdEIsRUFBOEJFLFFBQTlCLENBQU47QUFDRCxPQWxUa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FvVG5CQyx1QkFwVG1CO0FBQUEscUNBb1RPLFdBQU8sRUFBQ0gsTUFBRCxFQUFQLEVBQW9CO0FBQzVDLGNBQU0sTUFBS0ksdUJBQUwsQ0FBNkJKLE1BQTdCLEVBQXFDRSxRQUFyQyxDQUFOO0FBQ0QsT0F0VGtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBd1RuQkcsYUF4VG1CO0FBQUEscUNBd1RILFdBQU8sRUFBQ0wsTUFBRCxFQUFQLEVBQW9CO0FBQ2xDLGNBQU0sTUFBS00sYUFBTCxDQUFtQk4sTUFBbkIsRUFBMkJFLFFBQTNCLENBQU47QUFDRCxPQTFUa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0E0VG5CSyxVQTVUbUI7QUFBQSxxQ0E0VE4sV0FBTyxFQUFDUCxNQUFELEVBQVAsRUFBb0I7QUFDL0IsY0FBTSxNQUFLUSxVQUFMLENBQWdCUixNQUFoQixFQUF3QkUsUUFBeEIsQ0FBTjtBQUNELE9BOVRrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQWdVbkJPLGdCQWhVbUI7QUFBQSxxQ0FnVUEsV0FBTyxFQUFDVCxNQUFELEVBQVAsRUFBb0I7QUFDckMsY0FBTSxNQUFLVSxnQkFBTCxDQUFzQlYsTUFBdEIsRUFBOEJFLFFBQTlCLENBQU47QUFDRCxPQWxVa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FzWW5CUyxlQXRZbUIscUJBc1lELGFBQVk7QUFDNUIsWUFBTXBELE9BQU8sTUFBTSxNQUFLWCxHQUFMLENBQVMsc0ZBQVQsQ0FBbkI7O0FBRUEsWUFBS2dFLFVBQUwsR0FBa0JyRCxLQUFLeUIsR0FBTCxDQUFTO0FBQUEsZUFBS0MsRUFBRTdDLElBQVA7QUFBQSxPQUFULENBQWxCO0FBQ0QsS0ExWWtCOztBQUFBLFNBNFluQnlFLFlBNVltQixHQTRZSixNQUFNLENBQ3BCLENBN1lrQjs7QUFBQSxTQStZbkJDLGNBL1ltQixHQStZRDVDLEVBQUQsSUFBUTtBQUN2QixhQUFRLEdBQUcsS0FBSzJDLFlBQWMsV0FBVzNDLEVBQUksTUFBN0M7QUFDRCxLQWpaa0I7O0FBQUEsU0FtWm5CNkMsY0FuWm1CLEdBbVpEN0MsRUFBRCxJQUFRO0FBQ3ZCLGFBQVEsR0FBRyxLQUFLMkMsWUFBYyxXQUFXM0MsRUFBSSxNQUE3QztBQUNELEtBclprQjs7QUFBQSxTQXVabkI4QyxjQXZabUIsR0F1WkQ5QyxFQUFELElBQVE7QUFDdkIsYUFBUSxHQUFHLEtBQUsyQyxZQUFjLFVBQVUzQyxFQUFJLE1BQTVDO0FBQ0QsS0F6WmtCOztBQUFBLFNBc2NuQlEsWUF0Y21CO0FBQUEscUNBc2NKLFdBQU9ELE1BQVAsRUFBZW5ELE9BQWYsRUFBd0IyRixjQUF4QixFQUEyQztBQUN4RCxZQUFJLENBQUNBLGNBQUQsSUFBbUIsQ0FBQyxNQUFLQyxlQUFMLENBQXFCekMsT0FBTzNDLElBQTVCLENBQXhCLEVBQTJEO0FBQ3pELGdCQUFNLE1BQUtHLFdBQUwsQ0FBaUJ3QyxPQUFPM0MsSUFBeEIsRUFBOEJSLE9BQTlCLEVBQXVDLFlBQU0sQ0FBRSxDQUEvQyxDQUFOO0FBQ0Q7O0FBRUQsWUFBSSxNQUFLNkYsY0FBTCxJQUF1QixNQUFLQSxjQUFMLENBQW9CQyxrQkFBM0MsSUFBaUUsQ0FBQyxNQUFLRCxjQUFMLENBQW9CQyxrQkFBcEIsQ0FBdUMsRUFBQzNDLE1BQUQsRUFBU25ELE9BQVQsRUFBdkMsQ0FBdEUsRUFBaUk7QUFDL0g7QUFDRDs7QUFFRCxjQUFNc0QsYUFBYSwyQ0FBcUJ5Qyx5QkFBckIsQ0FBK0MsTUFBS3ZDLElBQXBELEVBQTBETCxNQUExRCxFQUFrRSxNQUFLTSxrQkFBdkUsQ0FBbkI7O0FBRUEsY0FBTSxNQUFLbkMsR0FBTCxDQUFTZ0MsV0FBV0ksR0FBWCxDQUFlO0FBQUEsaUJBQUtDLEVBQUVwQyxHQUFQO0FBQUEsU0FBZixFQUEyQnFDLElBQTNCLENBQWdDLElBQWhDLENBQVQsQ0FBTjtBQUNELE9BbGRrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQW9kbkJnQyxlQXBkbUIsR0FvZEFwRixJQUFELElBQVU7QUFDMUIsYUFBTyxLQUFLOEUsVUFBTCxDQUFnQlUsT0FBaEIsQ0FBd0IsMkNBQXFCQyxpQkFBckIsQ0FBdUN6RixJQUF2QyxDQUF4QixNQUEwRSxDQUFDLENBQWxGO0FBQ0QsS0F0ZGtCOztBQUFBLFNBd2RuQjBGLGtCQXhkbUI7QUFBQSxxQ0F3ZEUsV0FBTzFGLElBQVAsRUFBYVIsT0FBYixFQUF5QjtBQUM1QyxZQUFJO0FBQ0YsZ0JBQU0sTUFBSzBDLFVBQUwsQ0FBZ0JsQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IsTUFBS21HLFdBQUwsQ0FBaUIzRixJQUFqQixDQUEvQixFQUF1RCxJQUF2RCxDQUFOO0FBQ0QsU0FGRCxDQUVFLE9BQU80RixFQUFQLEVBQVc7QUFDWCxjQUFJMUcsUUFBUUMsSUFBUixDQUFhOEIsS0FBakIsRUFBd0I7QUFDdEJQLG9CQUFRRyxLQUFSLENBQWNFLEdBQWQ7QUFDRDtBQUNGOztBQUVELGNBQU0sTUFBS21CLFVBQUwsQ0FBZ0JsQyxJQUFoQixFQUFzQlIsT0FBdEIsRUFBK0IsSUFBL0IsRUFBcUMsTUFBS21HLFdBQUwsQ0FBaUIzRixJQUFqQixDQUFyQyxDQUFOO0FBQ0QsT0FsZWtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBb2VuQmtDLFVBcGVtQjtBQUFBLHFDQW9lTixXQUFPbEMsSUFBUCxFQUFhUixPQUFiLEVBQXNCd0MsT0FBdEIsRUFBK0JDLE9BQS9CLEVBQTJDO0FBQ3RELFlBQUksTUFBS29ELGNBQUwsSUFBdUIsTUFBS0EsY0FBTCxDQUFvQlEsZ0JBQTNDLElBQStELENBQUMsTUFBS1IsY0FBTCxDQUFvQlEsZ0JBQXBCLENBQXFDLEVBQUM3RixJQUFELEVBQU9SLE9BQVAsRUFBckMsQ0FBcEUsRUFBMkg7QUFDekg7QUFDRDs7QUFFRCxZQUFJLENBQUMsTUFBSzRGLGVBQUwsQ0FBcUJwRixJQUFyQixDQUFELElBQStCaUMsV0FBVyxJQUE5QyxFQUFvRDtBQUNsREQsb0JBQVUsSUFBVjtBQUNEOztBQUVELGNBQU0sRUFBQ2MsVUFBRCxLQUFlLE1BQU0saUJBQWVnRCx3QkFBZixDQUF3Q3RHLE9BQXhDLEVBQWlEd0MsT0FBakQsRUFBMERDLE9BQTFELEVBQW1FLE1BQUs4RCxhQUF4RSxDQUEzQjs7QUFFQSxjQUFNLE1BQUtDLGdCQUFMLENBQXNCaEcsSUFBdEIsRUFBNEIsSUFBNUIsQ0FBTjs7QUFFQSxhQUFLLE1BQU1pRyxVQUFYLElBQXlCakcsS0FBS2tHLGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsZ0JBQU0sTUFBS0YsZ0JBQUwsQ0FBc0JoRyxJQUF0QixFQUE0QmlHLFVBQTVCLENBQU47QUFDRDs7QUFFRCxjQUFNLE1BQUtuRixHQUFMLENBQVNnQyxXQUFXTSxJQUFYLENBQWdCLElBQWhCLENBQVQsQ0FBTjs7QUFFQSxjQUFNLE1BQUsrQyxrQkFBTCxDQUF3Qm5HLElBQXhCLEVBQThCLElBQTlCLENBQU47O0FBRUEsYUFBSyxNQUFNaUcsVUFBWCxJQUF5QmpHLEtBQUtrRyxjQUFMLENBQW9CLFlBQXBCLENBQXpCLEVBQTREO0FBQzFELGdCQUFNLE1BQUtDLGtCQUFMLENBQXdCbkcsSUFBeEIsRUFBOEJpRyxVQUE5QixDQUFOO0FBQ0Q7QUFDRixPQTVma0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0E4a0JuQk4sV0E5a0JtQixHQThrQkozRixJQUFELElBQVU7QUFDdEIsVUFBSUEsUUFBUSxJQUFaLEVBQWtCO0FBQ2hCLGVBQU8sSUFBUDtBQUNEOztBQUVELGFBQU87QUFDTG9DLFlBQUlwQyxLQUFLcUMsR0FESjtBQUVMQyxnQkFBUXRDLEtBQUsyQixLQUZSO0FBR0xyQixjQUFNTixLQUFLdUMsS0FITjtBQUlMQyxrQkFBVXhDLEtBQUt5QztBQUpWLE9BQVA7QUFNRCxLQXpsQmtCOztBQUFBLFNBMmxCbkJwQyxZQTNsQm1CLEdBMmxCSCtGLE9BQUQsSUFBYTtBQUMxQixVQUFJQyxRQUFRQyxNQUFSLENBQWVDLEtBQW5CLEVBQTBCO0FBQ3hCRixnQkFBUUMsTUFBUixDQUFlRSxTQUFmO0FBQ0FILGdCQUFRQyxNQUFSLENBQWVHLFFBQWYsQ0FBd0IsQ0FBeEI7QUFDQUosZ0JBQVFDLE1BQVIsQ0FBZUksS0FBZixDQUFxQk4sT0FBckI7QUFDRDtBQUNGLEtBam1Ca0I7QUFBQTs7QUFDYk8sTUFBTixDQUFXQyxHQUFYLEVBQWdCO0FBQUE7O0FBQUE7QUFDZCxhQUFPQSxJQUFJQyxPQUFKLENBQVk7QUFDakJBLGlCQUFTLFVBRFE7QUFFakJDLGNBQU0sbURBRlc7QUFHakJDLGlCQUFTO0FBQ1BDLHNCQUFZO0FBQ1ZGLGtCQUFNLDBCQURJO0FBRVZHLGtCQUFNLFFBRkk7QUFHVkMscUJBQVN4SSxnQkFBZ0JDO0FBSGYsV0FETDtBQU1Qd0ksa0JBQVE7QUFDTkwsa0JBQU0sd0JBREE7QUFFTkcsa0JBQU0sUUFGQTtBQUdOQyxxQkFBU3hJLGdCQUFnQkU7QUFIbkIsV0FORDtBQVdQd0ksa0JBQVE7QUFDTk4sa0JBQU0sd0JBREE7QUFFTkcsa0JBQU0sU0FGQTtBQUdOQyxxQkFBU3hJLGdCQUFnQkc7QUFIbkIsV0FYRDtBQWdCUHdJLGtCQUFRO0FBQ05QLGtCQUFNLGlCQURBO0FBRU5HLGtCQUFNO0FBRkEsV0FoQkQ7QUFvQlBLLHNCQUFZO0FBQ1ZSLGtCQUFNLHFCQURJO0FBRVZHLGtCQUFNO0FBRkksV0FwQkw7QUF3QlBNLG9CQUFVO0FBQ1JULGtCQUFNLG1CQURFO0FBRVJHLGtCQUFNO0FBRkUsV0F4Qkg7QUE0QlBPLHdCQUFjO0FBQ1pWLGtCQUFNLHNCQURNO0FBRVpHLGtCQUFNLFNBRk07QUFHWkMscUJBQVM7QUFIRyxXQTVCUDtBQWlDUE8sNEJBQWtCO0FBQ2hCWCxrQkFBTSxvQ0FEVTtBQUVoQkcsa0JBQU07QUFGVSxXQWpDWDtBQXFDUFMsMkJBQWlCO0FBQ2ZaLGtCQUFNLG1DQURTO0FBRWZHLGtCQUFNO0FBRlMsV0FyQ1Y7QUF5Q1B2SCxlQUFLO0FBQ0hvSCxrQkFBTSxtQkFESDtBQUVIYSxzQkFBVSxJQUZQO0FBR0hWLGtCQUFNO0FBSEgsV0F6Q0U7QUE4Q1BXLDJCQUFpQjtBQUNmZCxrQkFBTSxpQkFEUztBQUVmRyxrQkFBTTtBQUZTLFdBOUNWO0FBa0RQWSwwQkFBZ0I7QUFDZGYsa0JBQU0sZ0JBRFE7QUFFZEcsa0JBQU07QUFGUSxXQWxEVDtBQXNEUGEsNkJBQW1CO0FBQ2pCaEIsa0JBQU0sMkVBRFc7QUFFakJhLHNCQUFVLEtBRk87QUFHakJWLGtCQUFNLFNBSFc7QUFJakJDLHFCQUFTO0FBSlEsV0F0RFo7QUE0RFBqSCw4QkFBb0I7QUFDbEI2RyxrQkFBTSx3QkFEWTtBQUVsQmEsc0JBQVUsS0FGUTtBQUdsQlYsa0JBQU0sU0FIWTtBQUlsQkMscUJBQVM7QUFKUyxXQTVEYjtBQWtFUDdCLDBCQUFnQjtBQUNkeUIsa0JBQU0sOENBRFE7QUFFZGEsc0JBQVUsS0FGSTtBQUdkVixrQkFBTTtBQUhRLFdBbEVUO0FBdUVQM0gsbUJBQVM7QUFDUHdILGtCQUFNLG9CQURDO0FBRVBhLHNCQUFVLEtBRkg7QUFHUFYsa0JBQU07QUFIQyxXQXZFRjtBQTRFUDdILGtCQUFRO0FBQ04wSCxrQkFBTSx3QkFEQTtBQUVOYSxzQkFBVSxLQUZKO0FBR05WLGtCQUFNLFNBSEE7QUFJTkMscUJBQVM7QUFKSCxXQTVFRDtBQWtGUGEsb0JBQVU7QUFDUmpCLGtCQUFNLG1HQURFO0FBRVJhLHNCQUFVLEtBRkY7QUFHUlYsa0JBQU0sU0FIRTtBQUlSQyxxQkFBUztBQUpELFdBbEZIO0FBd0ZQdkgsOEJBQW9CO0FBQ2xCbUgsa0JBQU0sZ0NBRFk7QUFFbEJhLHNCQUFVLEtBRlE7QUFHbEJWLGtCQUFNLFNBSFk7QUFJbEJDLHFCQUFTO0FBSlM7QUF4RmIsU0FIUTtBQWtHakJjLGlCQUFTLE9BQUtoSjtBQWxHRyxPQUFaLENBQVA7QUFEYztBQXFHZjs7QUE2Q0QsTUFBSWlKLGFBQUosR0FBb0I7QUFDbEIsV0FBTy9JLFFBQVFDLElBQVIsQ0FBYXFJLFlBQWIsSUFBNkIsSUFBN0IsR0FBb0N0SSxRQUFRQyxJQUFSLENBQWFxSSxZQUFqRCxHQUFnRSxJQUF2RTtBQUNEOztBQUVLdkksVUFBTixHQUFpQjtBQUFBOztBQUFBO0FBQ2YsWUFBTWlKLHVCQUNEeEosZUFEQztBQUVKRSxjQUFNTSxRQUFRQyxJQUFSLENBQWFnSSxNQUFiLElBQXVCekksZ0JBQWdCRSxJQUZ6QztBQUdKQyxjQUFNSyxRQUFRQyxJQUFSLENBQWFpSSxNQUFiLElBQXVCMUksZ0JBQWdCRyxJQUh6QztBQUlKRixrQkFBVU8sUUFBUUMsSUFBUixDQUFhNkgsVUFBYixJQUEyQnRJLGdCQUFnQkMsUUFKakQ7QUFLSndKLGNBQU1qSixRQUFRQyxJQUFSLENBQWFrSSxNQUFiLElBQXVCM0ksZ0JBQWdCeUosSUFMekM7QUFNSkMsa0JBQVVsSixRQUFRQyxJQUFSLENBQWFtSSxVQUFiLElBQTJCNUksZ0JBQWdCeUo7QUFOakQsUUFBTjs7QUFTQSxVQUFJakosUUFBUUMsSUFBUixDQUFha0ksTUFBakIsRUFBeUI7QUFDdkJhLGdCQUFRQyxJQUFSLEdBQWVqSixRQUFRQyxJQUFSLENBQWFrSSxNQUE1QjtBQUNEOztBQUVELFVBQUluSSxRQUFRQyxJQUFSLENBQWFtSSxVQUFqQixFQUE2QjtBQUMzQlksZ0JBQVFFLFFBQVIsR0FBbUJsSixRQUFRQyxJQUFSLENBQWFtSSxVQUFoQztBQUNEOztBQUVELFVBQUlwSSxRQUFRQyxJQUFSLENBQWFrRyxjQUFqQixFQUFpQztBQUMvQixlQUFLQSxjQUFMLEdBQXNCZ0QsUUFBUW5KLFFBQVFDLElBQVIsQ0FBYWtHLGNBQXJCLENBQXRCO0FBQ0Q7O0FBRUQsVUFBSW5HLFFBQVFDLElBQVIsQ0FBYW1KLE1BQWIsS0FBd0IsS0FBNUIsRUFBbUM7QUFDakMsZUFBS3ZDLGFBQUwsR0FBcUIsSUFBckI7QUFDRDs7QUFFRCxhQUFLMUUsSUFBTCxHQUFZLElBQUksYUFBR2tILElBQVAsQ0FBWUwsT0FBWixDQUFaOztBQUVBLFVBQUksT0FBS0QsYUFBVCxFQUF3QjtBQUN0Qi9JLGdCQUFRc0osRUFBUixDQUFXLFlBQVgsRUFBeUIsT0FBSzVHLFdBQTlCO0FBQ0ExQyxnQkFBUXNKLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUsxRyxZQUEvQjtBQUNBNUMsZ0JBQVFzSixFQUFSLENBQVcsWUFBWCxFQUF5QixPQUFLbkYsV0FBOUI7QUFDQW5FLGdCQUFRc0osRUFBUixDQUFXLFlBQVgsRUFBeUIsT0FBS2hGLFdBQTlCO0FBQ0F0RSxnQkFBUXNKLEVBQVIsQ0FBVyxZQUFYLEVBQXlCLE9BQUs3RSxXQUE5QjtBQUNBekUsZ0JBQVFzSixFQUFSLENBQVcsZ0JBQVgsRUFBNkIsT0FBSzFFLGVBQWxDO0FBQ0E1RSxnQkFBUXNKLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUs5RixZQUEvQjtBQUNBeEQsZ0JBQVFzSixFQUFSLENBQVcsZUFBWCxFQUE0QixPQUFLM0YsY0FBakM7O0FBRUEzRCxnQkFBUXNKLEVBQVIsQ0FBVyxrQkFBWCxFQUErQixPQUFLdkUsZ0JBQXBDO0FBQ0EvRSxnQkFBUXNKLEVBQVIsQ0FBVyxvQkFBWCxFQUFpQyxPQUFLdkUsZ0JBQXRDOztBQUVBL0UsZ0JBQVFzSixFQUFSLENBQVcsV0FBWCxFQUF3QixPQUFLekcsVUFBN0I7QUFDQTdDLGdCQUFRc0osRUFBUixDQUFXLGFBQVgsRUFBMEIsT0FBS3pHLFVBQS9COztBQUVBN0MsZ0JBQVFzSixFQUFSLENBQVcseUJBQVgsRUFBc0MsT0FBS25FLHVCQUEzQztBQUNBbkYsZ0JBQVFzSixFQUFSLENBQVcsMkJBQVgsRUFBd0MsT0FBS25FLHVCQUE3Qzs7QUFFQW5GLGdCQUFRc0osRUFBUixDQUFXLFdBQVgsRUFBd0IsT0FBSy9ELFVBQTdCO0FBQ0F2RixnQkFBUXNKLEVBQVIsQ0FBVyxhQUFYLEVBQTBCLE9BQUsvRCxVQUEvQjs7QUFFQXZGLGdCQUFRc0osRUFBUixDQUFXLGNBQVgsRUFBMkIsT0FBS2pFLGFBQWhDO0FBQ0FyRixnQkFBUXNKLEVBQVIsQ0FBVyxnQkFBWCxFQUE2QixPQUFLakUsYUFBbEM7O0FBRUFyRixnQkFBUXNKLEVBQVIsQ0FBVyxpQkFBWCxFQUE4QixPQUFLN0QsZ0JBQW5DO0FBQ0F6RixnQkFBUXNKLEVBQVIsQ0FBVyxtQkFBWCxFQUFnQyxPQUFLN0QsZ0JBQXJDO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFNbEQsT0FBTyxNQUFNLE9BQUtYLEdBQUwsQ0FBUyxzRkFBVCxDQUFuQjs7QUFFQSxhQUFLMkgsVUFBTCxHQUFrQnZKLFFBQVFDLElBQVIsQ0FBYW9JLFFBQWIsSUFBeUIsUUFBM0M7QUFDQSxhQUFLekMsVUFBTCxHQUFrQnJELEtBQUt5QixHQUFMLENBQVM7QUFBQSxlQUFLQyxFQUFFN0MsSUFBUDtBQUFBLE9BQVQsQ0FBbEI7O0FBRUE7QUFDQSxhQUFLMEMsSUFBTCxHQUFZLG1DQUFhLEVBQWIsQ0FBWjs7QUFFQSxhQUFLMEYsWUFBTDtBQXJFZTtBQXNFaEI7O0FBRUtDLFlBQU4sR0FBbUI7QUFBQTs7QUFBQTtBQUNqQixVQUFJLE9BQUt0SCxJQUFULEVBQWU7QUFDYixjQUFNLE9BQUtBLElBQUwsQ0FBVXVILEdBQVYsRUFBTjtBQUNEO0FBSGdCO0FBSWxCOztBQWlHS3JGLGFBQU4sQ0FBa0JXLE1BQWxCLEVBQTBCMUUsT0FBMUIsRUFBbUM7QUFBQTs7QUFBQTtBQUNqQyxZQUFNcUosU0FBUyxvQkFBVXZGLEtBQVYsQ0FBZ0JZLE1BQWhCLENBQWY7O0FBRUEyRSxhQUFPQyxJQUFQLEdBQWMsT0FBSzlELGNBQUwsQ0FBb0I2RCxPQUFPRSxVQUEzQixDQUFkOztBQUVBLFlBQU0sT0FBS0MsWUFBTCxDQUFrQkgsTUFBbEIsRUFBMEIsUUFBMUIsQ0FBTjtBQUxpQztBQU1sQzs7QUFFS25GLGFBQU4sQ0FBa0JRLE1BQWxCLEVBQTBCMUUsT0FBMUIsRUFBbUM7QUFBQTs7QUFBQTtBQUNqQyxZQUFNcUosU0FBUyxvQkFBVXBGLEtBQVYsQ0FBZ0JTLE1BQWhCLENBQWY7O0FBRUEyRSxhQUFPQyxJQUFQLEdBQWMsT0FBSzdELGNBQUwsQ0FBb0I0RCxPQUFPRSxVQUEzQixDQUFkOztBQUVBLFlBQU0sT0FBS0MsWUFBTCxDQUFrQkgsTUFBbEIsRUFBMEIsUUFBMUIsQ0FBTjtBQUxpQztBQU1sQzs7QUFFS2hGLGFBQU4sQ0FBa0JLLE1BQWxCLEVBQTBCMUUsT0FBMUIsRUFBbUM7QUFBQTs7QUFBQTtBQUNqQyxZQUFNcUosU0FBUyxvQkFBVWpGLEtBQVYsQ0FBZ0JNLE1BQWhCLENBQWY7O0FBRUEyRSxhQUFPQyxJQUFQLEdBQWMsT0FBSzVELGNBQUwsQ0FBb0IyRCxPQUFPRSxVQUEzQixDQUFkOztBQUVBLFlBQU0sT0FBS0MsWUFBTCxDQUFrQkgsTUFBbEIsRUFBMEIsT0FBMUIsQ0FBTjtBQUxpQztBQU1sQzs7QUFFSzdFLGlCQUFOLENBQXNCRSxNQUF0QixFQUE4QjFFLE9BQTlCLEVBQXVDO0FBQUE7O0FBQUE7QUFDckMsWUFBTSxPQUFLd0osWUFBTCxDQUFrQixvQkFBVWpGLFNBQVYsQ0FBb0JHLE1BQXBCLENBQWxCLEVBQStDLFlBQS9DLENBQU47QUFEcUM7QUFFdEM7O0FBRUtNLGVBQU4sQ0FBb0JOLE1BQXBCLEVBQTRCMUUsT0FBNUIsRUFBcUM7QUFBQTs7QUFBQTtBQUNuQyxZQUFNLE9BQUt3SixZQUFMLENBQWtCLG9CQUFVQyxPQUFWLENBQWtCL0UsTUFBbEIsQ0FBbEIsRUFBNkMsVUFBN0MsQ0FBTjtBQURtQztBQUVwQzs7QUFFS1Usa0JBQU4sQ0FBdUJWLE1BQXZCLEVBQStCMUUsT0FBL0IsRUFBd0M7QUFBQTs7QUFBQTtBQUN0QyxZQUFNLFFBQUt3SixZQUFMLENBQWtCLG9CQUFVRSxVQUFWLENBQXFCaEYsTUFBckIsQ0FBbEIsRUFBZ0QsYUFBaEQsQ0FBTjtBQURzQztBQUV2Qzs7QUFFS1EsWUFBTixDQUFpQlIsTUFBakIsRUFBeUIxRSxPQUF6QixFQUFrQztBQUFBOztBQUFBO0FBQ2hDLFlBQU0sUUFBS3dKLFlBQUwsQ0FBa0Isb0JBQVVHLElBQVYsQ0FBZWpGLE1BQWYsQ0FBbEIsRUFBMEMsT0FBMUMsQ0FBTjtBQURnQztBQUVqQzs7QUFFS2hDLFlBQU4sQ0FBaUJnQyxNQUFqQixFQUF5QjFFLE9BQXpCLEVBQWtDO0FBQUE7O0FBQUE7QUFDaEMsWUFBTSxRQUFLd0osWUFBTCxDQUFrQixvQkFBVWhKLElBQVYsQ0FBZWtFLE1BQWYsQ0FBbEIsRUFBMEMsT0FBMUMsQ0FBTjtBQURnQztBQUVqQzs7QUFFS0Msa0JBQU4sQ0FBdUJELE1BQXZCLEVBQStCMUUsT0FBL0IsRUFBd0M7QUFBQTs7QUFBQTtBQUN0QyxZQUFNLFFBQUt3SixZQUFMLENBQWtCLG9CQUFVSSxVQUFWLENBQXFCbEYsTUFBckIsQ0FBbEIsRUFBZ0QsY0FBaEQsQ0FBTjtBQURzQztBQUV2Qzs7QUFFS0kseUJBQU4sQ0FBOEJKLE1BQTlCLEVBQXNDMUUsT0FBdEMsRUFBK0M7QUFBQTs7QUFBQTtBQUM3QyxZQUFNLFFBQUt3SixZQUFMLENBQWtCLG9CQUFVSyxpQkFBVixDQUE0Qm5GLE1BQTVCLENBQWxCLEVBQXVELHFCQUF2RCxDQUFOO0FBRDZDO0FBRTlDOztBQUdLOEUsY0FBTixDQUFtQkgsTUFBbkIsRUFBMkJTLEtBQTNCLEVBQWtDO0FBQUE7O0FBQUE7QUFDaEMsVUFBSTtBQUNGLGNBQU1DLGtCQUFrQixRQUFLdkcsSUFBTCxDQUFVdUcsZUFBVixDQUEwQkQsS0FBMUIsRUFBaUMsRUFBQ0UsaUJBQWlCWCxPQUFPVyxlQUF6QixFQUFqQyxDQUF4QjtBQUNBLGNBQU1DLGtCQUFrQixRQUFLekcsSUFBTCxDQUFVeUcsZUFBVixDQUEwQkgsS0FBMUIsRUFBaUNULE1BQWpDLEVBQXlDLEVBQUNhLElBQUksSUFBTCxFQUF6QyxDQUF4Qjs7QUFFQSxjQUFNM0ksTUFBTSxDQUFFd0ksZ0JBQWdCeEksR0FBbEIsRUFBdUIwSSxnQkFBZ0IxSSxHQUF2QyxFQUE2Q3FDLElBQTdDLENBQWtELElBQWxELENBQVo7O0FBRUEsY0FBTSxRQUFLdEMsR0FBTCxDQUFTQyxHQUFULENBQU47QUFDRCxPQVBELENBT0UsT0FBTzZFLEVBQVAsRUFBVztBQUNYbEYsZ0JBQVFHLEtBQVIsQ0FBYytFLEVBQWQ7QUFDRDtBQVYrQjtBQVdqQzs7QUF1QkQ4QyxpQkFBZTtBQUNiLFNBQUszRCxZQUFMLEdBQW9CN0YsUUFBUUMsSUFBUixDQUFhMEksY0FBYixHQUE4QjNJLFFBQVFDLElBQVIsQ0FBYTBJLGNBQTNDLEdBQTRELG1DQUFoRjs7QUFFQSxTQUFLNUUsa0JBQUwsR0FBMEI7QUFDeEI4QyxxQkFBZSxLQUFLQSxhQURJOztBQUd4QjRELHlCQUFvQkMsVUFBRCxJQUFnQjs7QUFFakMsZUFBT0EsV0FBV0MsS0FBWCxDQUFpQjNHLEdBQWpCLENBQXNCNEcsSUFBRCxJQUFVO0FBQ3BDLGNBQUlGLFdBQVdHLE9BQVgsQ0FBbUJDLGNBQXZCLEVBQXVDO0FBQ3JDLG1CQUFPLEtBQUtoRixjQUFMLENBQW9COEUsS0FBS0csT0FBekIsQ0FBUDtBQUNELFdBRkQsTUFFTyxJQUFJTCxXQUFXRyxPQUFYLENBQW1CRyxjQUF2QixFQUF1QztBQUM1QyxtQkFBTyxLQUFLakYsY0FBTCxDQUFvQjZFLEtBQUtHLE9BQXpCLENBQVA7QUFDRCxXQUZNLE1BRUEsSUFBSUwsV0FBV0csT0FBWCxDQUFtQkksY0FBdkIsRUFBdUM7QUFDNUMsbUJBQU8sS0FBS2pGLGNBQUwsQ0FBb0I0RSxLQUFLRyxPQUF6QixDQUFQO0FBQ0Q7O0FBRUQsaUJBQU8sSUFBUDtBQUNELFNBVk0sQ0FBUDtBQVdELE9BaEJ1Qjs7QUFrQnhCRyw2QkFBd0JSLFVBQUQsSUFBZ0I7QUFDckMsY0FBTVMsTUFBTVQsV0FBV0MsS0FBWCxDQUFpQjNHLEdBQWpCLENBQXFCQyxLQUFLQSxFQUFFOEcsT0FBNUIsQ0FBWjs7QUFFQSxZQUFJTCxXQUFXRyxPQUFYLENBQW1CQyxjQUF2QixFQUF1QztBQUNyQyxpQkFBUSxHQUFHLEtBQUtqRixZQUFjLHVCQUF1QnNGLEdBQUssRUFBMUQ7QUFDRCxTQUZELE1BRU8sSUFBSVQsV0FBV0csT0FBWCxDQUFtQkcsY0FBdkIsRUFBdUM7QUFDNUMsaUJBQVEsR0FBRyxLQUFLbkYsWUFBYyx1QkFBdUJzRixHQUFLLEVBQTFEO0FBQ0QsU0FGTSxNQUVBLElBQUlULFdBQVdHLE9BQVgsQ0FBbUJJLGNBQXZCLEVBQXVDO0FBQzVDLGlCQUFRLEdBQUcsS0FBS3BGLFlBQWMscUJBQXFCc0YsR0FBSyxFQUF4RDtBQUNEOztBQUVELGVBQU8sSUFBUDtBQUNEO0FBOUJ1QixLQUExQjs7QUFpQ0EsUUFBSW5MLFFBQVFDLElBQVIsQ0FBYXlJLGVBQWpCLEVBQWtDO0FBQ2hDLFdBQUszRSxrQkFBTCxDQUF3QnFILGtCQUF4QixHQUE4Q0MsT0FBRCxJQUFhO0FBQ3hELGVBQVEsR0FBR3JMLFFBQVFDLElBQVIsQ0FBYXlJLGVBQWlCLFlBQVkyQyxRQUFRbkksRUFBSSxNQUFqRTtBQUNELE9BRkQ7QUFHRDtBQUNGOztBQTBESzRELGtCQUFOLENBQXVCaEcsSUFBdkIsRUFBNkJpRyxVQUE3QixFQUF5QztBQUFBOztBQUFBO0FBQ3ZDLFlBQU11RSxXQUFXLFFBQUtDLG9CQUFMLENBQTBCekssSUFBMUIsRUFBZ0NpRyxVQUFoQyxDQUFqQjs7QUFFQSxVQUFJO0FBQ0YsY0FBTSxRQUFLbkYsR0FBTCxDQUFTLGtCQUFPLDRCQUFQLEVBQXFDLFFBQUtrQyxJQUFMLENBQVUwSCxLQUFWLENBQWdCLFFBQUtqQyxVQUFyQixDQUFyQyxFQUF1RSxRQUFLekYsSUFBTCxDQUFVMEgsS0FBVixDQUFnQkYsUUFBaEIsQ0FBdkUsQ0FBVCxDQUFOO0FBQ0QsT0FGRCxDQUVFLE9BQU81RSxFQUFQLEVBQVc7QUFDWCxZQUFJMUcsUUFBUUMsSUFBUixDQUFhOEIsS0FBakIsRUFBd0I7QUFDdEJQLGtCQUFRRyxLQUFSLENBQWMrRSxFQUFkO0FBQ0Q7QUFDRDtBQUNEO0FBVnNDO0FBV3hDOztBQUVLTyxvQkFBTixDQUF5Qm5HLElBQXpCLEVBQStCaUcsVUFBL0IsRUFBMkM7QUFBQTs7QUFBQTtBQUN6QyxZQUFNdUUsV0FBVyxRQUFLQyxvQkFBTCxDQUEwQnpLLElBQTFCLEVBQWdDaUcsVUFBaEMsQ0FBakI7O0FBRUEsVUFBSTtBQUNGLGNBQU0sUUFBS25GLEdBQUwsQ0FBUyxrQkFBTyxrREFBUCxFQUNPLFFBQUtrQyxJQUFMLENBQVUwSCxLQUFWLENBQWdCLFFBQUtqQyxVQUFyQixDQURQLEVBRU8sUUFBS3pGLElBQUwsQ0FBVTBILEtBQVYsQ0FBZ0JGLFFBQWhCLENBRlAsRUFHTywyQ0FBcUIvRSxpQkFBckIsQ0FBdUN6RixJQUF2QyxFQUE2Q2lHLFVBQTdDLENBSFAsQ0FBVCxDQUFOO0FBSUQsT0FMRCxDQUtFLE9BQU9MLEVBQVAsRUFBVztBQUNYLFlBQUkxRyxRQUFRQyxJQUFSLENBQWE4QixLQUFqQixFQUF3QjtBQUN0QlAsa0JBQVFHLEtBQVIsQ0FBYytFLEVBQWQ7QUFDRDtBQUNEO0FBQ0Q7QUFid0M7QUFjMUM7O0FBRUQ2RSx1QkFBcUJ6SyxJQUFyQixFQUEyQmlHLFVBQTNCLEVBQXVDO0FBQ3JDLFVBQU0zRixPQUFPMkYsYUFBYyxHQUFFakcsS0FBS00sSUFBSyxNQUFLMkYsV0FBVzBFLFFBQVMsRUFBbkQsR0FBdUQzSyxLQUFLTSxJQUF6RTs7QUFFQSxXQUFPcEIsUUFBUUMsSUFBUixDQUFhMkksaUJBQWIsR0FBaUMseUJBQU14SCxJQUFOLENBQWpDLEdBQStDQSxJQUF0RDtBQUNEOztBQUVLVCxzQkFBTixHQUE2QjtBQUFBOztBQUFBO0FBQzNCLFVBQUlYLFFBQVFDLElBQVIsQ0FBYXNJLGdCQUFqQixFQUFtQztBQUNqQyxjQUFNLFFBQUszRyxHQUFMLENBQVMsa0JBQU8sY0FBUCxFQUF1QjVCLFFBQVFDLElBQVIsQ0FBYXNJLGdCQUFwQyxDQUFULENBQU47QUFDRDtBQUgwQjtBQUk1Qjs7QUFFSzdHLHFCQUFOLEdBQTRCO0FBQUE7O0FBQUE7QUFDMUIsVUFBSTFCLFFBQVFDLElBQVIsQ0FBYXVJLGVBQWpCLEVBQWtDO0FBQ2hDLGNBQU0sUUFBSzVHLEdBQUwsQ0FBUyxrQkFBTyxjQUFQLEVBQXVCNUIsUUFBUUMsSUFBUixDQUFhdUksZUFBcEMsQ0FBVCxDQUFOO0FBQ0Q7QUFIeUI7QUFJM0I7O0FBRUt2SCxhQUFOLENBQWtCSCxJQUFsQixFQUF3QlIsT0FBeEIsRUFBaUNvTCxRQUFqQyxFQUEyQztBQUFBOztBQUFBO0FBQ3pDLFlBQU0sUUFBS2xGLGtCQUFMLENBQXdCMUYsSUFBeEIsRUFBOEJSLE9BQTlCLENBQU47QUFDQSxZQUFNLFFBQUtxRixlQUFMLEVBQU47O0FBRUEsVUFBSXpFLFFBQVEsQ0FBWjs7QUFFQSxZQUFNSixLQUFLNkssY0FBTCxDQUFvQixFQUFwQjtBQUFBLHVDQUF3QixXQUFPbEksTUFBUCxFQUFrQjtBQUM5Q0EsaUJBQU8zQyxJQUFQLEdBQWNBLElBQWQ7O0FBRUEsY0FBSSxFQUFFSSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QndLLHFCQUFTeEssS0FBVDtBQUNEOztBQUVELGdCQUFNLFFBQUt3QyxZQUFMLENBQWtCRCxNQUFsQixFQUEwQm5ELE9BQTFCLEVBQW1DLElBQW5DLENBQU47QUFDRCxTQVJLOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBVUFvTCxlQUFTeEssS0FBVDtBQWhCeUM7QUFpQjFDOztBQUVLRixzQkFBTixDQUEyQkYsSUFBM0IsRUFBaUNSLE9BQWpDLEVBQTBDO0FBQUE7O0FBQUE7QUFDeEMsWUFBTSxRQUFLd0csZ0JBQUwsQ0FBc0JoRyxJQUF0QixFQUE0QixJQUE1QixDQUFOOztBQUVBLFdBQUssTUFBTWlHLFVBQVgsSUFBeUJqRyxLQUFLa0csY0FBTCxDQUFvQixZQUFwQixDQUF6QixFQUE0RDtBQUMxRCxjQUFNLFFBQUtGLGdCQUFMLENBQXNCaEcsSUFBdEIsRUFBNEJpRyxVQUE1QixDQUFOO0FBQ0Q7O0FBRUQsWUFBTSxRQUFLRSxrQkFBTCxDQUF3Qm5HLElBQXhCLEVBQThCLElBQTlCLENBQU47O0FBRUEsV0FBSyxNQUFNaUcsVUFBWCxJQUF5QmpHLEtBQUtrRyxjQUFMLENBQW9CLFlBQXBCLENBQXpCLEVBQTREO0FBQzFELGNBQU0sUUFBS0Msa0JBQUwsQ0FBd0JuRyxJQUF4QixFQUE4QmlHLFVBQTlCLENBQU47QUFDRDtBQVh1QztBQVl6Qzs7QUF1Qks1RyxrQkFBTixHQUF5QjtBQUFBOztBQUFBO0FBQ3ZCLFlBQU0wQixNQUFNLHVCQUFhQyxPQUFiLENBQXFCLGFBQXJCLEVBQW9DLFFBQXBDLEVBQ2FBLE9BRGIsQ0FDcUIsa0JBRHJCLEVBQ3lDLFFBQUt5SCxVQUQ5QyxDQUFaOztBQUdBLFlBQU0sUUFBSzNILEdBQUwsQ0FBU0MsR0FBVCxDQUFOO0FBSnVCO0FBS3hCOztBQUVLeEIsZUFBTixHQUFzQjtBQUFBOztBQUFBO0FBQ3BCLFlBQU13QixNQUFNLG1CQUFTQyxPQUFULENBQWlCLGFBQWpCLEVBQWdDLFFBQWhDLEVBQ1NBLE9BRFQsQ0FDaUIsa0JBRGpCLEVBQ3FDLFFBQUt5SCxVQUQxQyxDQUFaOztBQUdBLFlBQU0sUUFBSzNILEdBQUwsQ0FBU0MsR0FBVCxDQUFOO0FBSm9CO0FBS3JCOztBQUVLbkIsbUJBQU4sQ0FBd0JKLE9BQXhCLEVBQWlDO0FBQUE7O0FBQUE7QUFDL0IsWUFBTW9MLFdBQVcsVUFBQ3RLLElBQUQsRUFBT0YsS0FBUCxFQUFpQjtBQUNoQyxnQkFBS0MsWUFBTCxDQUFrQkMsS0FBS0MsS0FBTCxHQUFhLEtBQWIsR0FBcUJILE1BQU1JLFFBQU4sR0FBaUJDLEdBQXhEO0FBQ0QsT0FGRDs7QUFJQSxZQUFNakIsUUFBUXNMLGFBQVIsQ0FBc0IsRUFBdEI7QUFBQSx1Q0FBMEIsV0FBT3hILEtBQVAsRUFBYyxFQUFDbEQsS0FBRCxFQUFkLEVBQTBCO0FBQ3hELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJ3SyxxQkFBUyxRQUFULEVBQW1CeEssS0FBbkI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLbUQsV0FBTCxDQUFpQkQsS0FBakIsRUFBd0I5RCxPQUF4QixDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBa0IsY0FBUUMsR0FBUixDQUFZLEVBQVo7O0FBRUEsWUFBTW5CLFFBQVF1TCxhQUFSLENBQXNCLEVBQXRCO0FBQUEsdUNBQTBCLFdBQU90SCxLQUFQLEVBQWMsRUFBQ3JELEtBQUQsRUFBZCxFQUEwQjtBQUN4RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCd0sscUJBQVMsUUFBVCxFQUFtQnhLLEtBQW5CO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3NELFdBQUwsQ0FBaUJELEtBQWpCLEVBQXdCakUsT0FBeEIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQWtCLGNBQVFDLEdBQVIsQ0FBWSxFQUFaOztBQUVBLFlBQU1uQixRQUFRd0wsYUFBUixDQUFzQixFQUF0QjtBQUFBLHVDQUEwQixXQUFPcEgsS0FBUCxFQUFjLEVBQUN4RCxLQUFELEVBQWQsRUFBMEI7QUFDeEQsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QndLLHFCQUFTLE9BQVQsRUFBa0J4SyxLQUFsQjtBQUNEOztBQUVELGdCQUFNLFFBQUt5RCxXQUFMLENBQWlCRCxLQUFqQixFQUF3QnBFLE9BQXhCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUFrQixjQUFRQyxHQUFSLENBQVksRUFBWjs7QUFFQSxZQUFNbkIsUUFBUXlMLGlCQUFSLENBQTBCLEVBQTFCO0FBQUEsdUNBQThCLFdBQU9sSCxTQUFQLEVBQWtCLEVBQUMzRCxLQUFELEVBQWxCLEVBQThCO0FBQ2hFLGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJ3SyxxQkFBUyxZQUFULEVBQXVCeEssS0FBdkI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLNEQsZUFBTCxDQUFxQkQsU0FBckIsRUFBZ0N2RSxPQUFoQyxDQUFOO0FBQ0QsU0FOSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFOOztBQVFBa0IsY0FBUUMsR0FBUixDQUFZLEVBQVo7O0FBRUEsWUFBTW5CLFFBQVEwTCxZQUFSLENBQXFCLEVBQXJCO0FBQUEsdUNBQXlCLFdBQU9oSCxNQUFQLEVBQWUsRUFBQzlELEtBQUQsRUFBZixFQUEyQjtBQUN4RCxjQUFJLEVBQUVBLEtBQUYsR0FBVSxFQUFWLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCd0sscUJBQVMsT0FBVCxFQUFrQnhLLEtBQWxCO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS3NFLFVBQUwsQ0FBZ0JSLE1BQWhCLEVBQXdCMUUsT0FBeEIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQWtCLGNBQVFDLEdBQVIsQ0FBWSxFQUFaOztBQUVBLFlBQU1uQixRQUFRMkwsZUFBUixDQUF3QixFQUF4QjtBQUFBLHVDQUE0QixXQUFPakgsTUFBUCxFQUFlLEVBQUM5RCxLQUFELEVBQWYsRUFBMkI7QUFDM0QsY0FBSSxFQUFFQSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QndLLHFCQUFTLFVBQVQsRUFBcUJ4SyxLQUFyQjtBQUNEOztBQUVELGdCQUFNLFFBQUtvRSxhQUFMLENBQW1CTixNQUFuQixFQUEyQjFFLE9BQTNCLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBUUFrQixjQUFRQyxHQUFSLENBQVksRUFBWjs7QUFFQSxZQUFNbkIsUUFBUTRMLFlBQVIsQ0FBcUIsRUFBckI7QUFBQSx1Q0FBeUIsV0FBT2xILE1BQVAsRUFBZSxFQUFDOUQsS0FBRCxFQUFmLEVBQTJCO0FBQ3hELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJ3SyxxQkFBUyxPQUFULEVBQWtCeEssS0FBbEI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLOEIsVUFBTCxDQUFnQmdDLE1BQWhCLEVBQXdCMUUsT0FBeEIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQWtCLGNBQVFDLEdBQVIsQ0FBWSxFQUFaOztBQUVBLFlBQU1uQixRQUFRNkwsa0JBQVIsQ0FBMkIsRUFBM0I7QUFBQSx1Q0FBK0IsV0FBT25ILE1BQVAsRUFBZSxFQUFDOUQsS0FBRCxFQUFmLEVBQTJCO0FBQzlELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJ3SyxxQkFBUyxhQUFULEVBQXdCeEssS0FBeEI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLd0UsZ0JBQUwsQ0FBc0JWLE1BQXRCLEVBQThCMUUsT0FBOUIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQWtCLGNBQVFDLEdBQVIsQ0FBWSxFQUFaOztBQUVBLFlBQU1uQixRQUFROEwsa0JBQVIsQ0FBMkIsRUFBM0I7QUFBQSx1Q0FBK0IsV0FBT3BILE1BQVAsRUFBZSxFQUFDOUQsS0FBRCxFQUFmLEVBQTJCO0FBQzlELGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJ3SyxxQkFBUyxjQUFULEVBQXlCeEssS0FBekI7QUFDRDs7QUFFRCxnQkFBTSxRQUFLK0QsZ0JBQUwsQ0FBc0JELE1BQXRCLEVBQThCMUUsT0FBOUIsQ0FBTjtBQUNELFNBTks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBTjs7QUFRQWtCLGNBQVFDLEdBQVIsQ0FBWSxFQUFaOztBQUVBLFlBQU1uQixRQUFRK0wseUJBQVIsQ0FBa0MsRUFBbEM7QUFBQSx1Q0FBc0MsV0FBT3JILE1BQVAsRUFBZSxFQUFDOUQsS0FBRCxFQUFmLEVBQTJCO0FBQ3JFLGNBQUksRUFBRUEsS0FBRixHQUFVLEVBQVYsS0FBaUIsQ0FBckIsRUFBd0I7QUFDdEJ3SyxxQkFBUyxxQkFBVCxFQUFnQ3hLLEtBQWhDO0FBQ0Q7O0FBRUQsZ0JBQU0sUUFBS2tFLHVCQUFMLENBQTZCSixNQUE3QixFQUFxQzFFLE9BQXJDLENBQU47QUFDRCxTQU5LOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47QUEvRitCO0FBc0doQztBQXZ0QmtCLEMiLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBnIGZyb20gJ3BnJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBvc3RncmVzU2NoZW1hIGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFBvc3RncmVzUmVjb3JkVmFsdWVzLCBQb3N0Z3JlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHNuYWtlIGZyb20gJ3NuYWtlLWNhc2UnO1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUuc3FsJztcbmltcG9ydCB0ZW1wbGF0ZURyb3AgZnJvbSAnLi90ZW1wbGF0ZS5kcm9wLnNxbCc7XG5pbXBvcnQgU2NoZW1hTWFwIGZyb20gJy4vc2NoZW1hLW1hcCc7XG5cbmNvbnN0IFBPU1RHUkVTX0NPTkZJRyA9IHtcbiAgZGF0YWJhc2U6ICdmdWxjcnVtYXBwJyxcbiAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gIHBvcnQ6IDU0MzIsXG4gIG1heDogMTAsXG4gIGlkbGVUaW1lb3V0TWlsbGlzOiAzMDAwMFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncG9zdGdyZXMnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgcG9zdGdyZXMgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBwZ0RhdGFiYXNlOiB7XG4gICAgICAgICAgZGVzYzogJ3Bvc3RncmVzcWwgZGF0YWJhc2UgbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVmYXVsdDogUE9TVEdSRVNfQ09ORklHLmRhdGFiYXNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnSG9zdDoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHNlcnZlciBob3N0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZWZhdWx0OiBQT1NUR1JFU19DT05GSUcuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBwZ1BvcnQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzZXJ2ZXIgcG9ydCcsXG4gICAgICAgICAgdHlwZTogJ2ludGVnZXInLFxuICAgICAgICAgIGRlZmF1bHQ6IFBPU1RHUkVTX0NPTkZJRy5wb3J0XG4gICAgICAgIH0sXG4gICAgICAgIHBnVXNlcjoge1xuICAgICAgICAgIGRlc2M6ICdwb3N0Z3Jlc3FsIHVzZXInLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUGFzc3dvcmQ6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBwYXNzd29yZCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgcGdTY2hlbWE6IHtcbiAgICAgICAgICBkZXNjOiAncG9zdGdyZXNxbCBzY2hlbWEnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU3luY0V2ZW50czoge1xuICAgICAgICAgIGRlc2M6ICdhZGQgc3luYyBldmVudCBob29rcycsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcGdCZWZvcmVGdW5jdGlvbjoge1xuICAgICAgICAgIGRlc2M6ICdjYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ0FmdGVyRnVuY3Rpb246IHtcbiAgICAgICAgICBkZXNjOiAnY2FsbCB0aGlzIGZ1bmN0aW9uIGFmdGVyIHRoZSBzeW5jJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBvcmc6IHtcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnUmVwb3J0QmFzZVVybDoge1xuICAgICAgICAgIGRlc2M6ICdyZXBvcnQgVVJMIGJhc2UnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnTWVkaWFCYXNlVXJsOiB7XG4gICAgICAgICAgZGVzYzogJ21lZGlhIFVSTCBiYXNlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBwZ1VuZGVyc2NvcmVOYW1lczoge1xuICAgICAgICAgIGRlc2M6ICd1c2UgdW5kZXJzY29yZSBuYW1lcyAoZS5nLiBcIlBhcmsgSW5zcGVjdGlvbnNcIiBiZWNvbWVzIFwicGFya19pbnNwZWN0aW9uc1wiKScsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ1JlYnVpbGRWaWV3c09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSByZWJ1aWxkIHRoZSB2aWV3cycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBwZ0N1c3RvbU1vZHVsZToge1xuICAgICAgICAgIGRlc2M6ICdhIGN1c3RvbSBtb2R1bGUgdG8gbG9hZCB3aXRoIHN5bmMgZXh0ZW5zaW9ucycsXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIHBnU2V0dXA6IHtcbiAgICAgICAgICBkZXNjOiAnc2V0dXAgdGhlIGRhdGFiYXNlJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgIH0sXG4gICAgICAgIHBnRHJvcDoge1xuICAgICAgICAgIGRlc2M6ICdkcm9wIHRoZSBzeXN0ZW0gdGFibGVzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHBnQXJyYXlzOiB7XG4gICAgICAgICAgZGVzYzogJ3VzZSBhcnJheSB0eXBlcyBmb3IgbXVsdGktdmFsdWUgZmllbGRzIGxpa2UgY2hvaWNlIGZpZWxkcywgY2xhc3NpZmljYXRpb24gZmllbGRzIGFuZCBtZWRpYSBmaWVsZHMnLFxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBwZ1N5c3RlbVRhYmxlc09ubHk6IHtcbiAgICAgICAgICBkZXNjOiAnb25seSBjcmVhdGUgdGhlIHN5c3RlbSByZWNvcmRzJyxcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkNvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgdGhpcy5hY3RpdmF0ZSgpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ0Ryb3ApIHtcbiAgICAgIGF3YWl0IHRoaXMuZHJvcFN5c3RlbVRhYmxlcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTZXR1cCkge1xuICAgICAgYXdhaXQgdGhpcy5zZXR1cERhdGFiYXNlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdTeXN0ZW1UYWJsZXNPbmx5KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0dXBTeXN0ZW1UYWJsZXMoYWNjb3VudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5pbnZva2VCZWZvcmVGdW5jdGlvbigpO1xuXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IGFjY291bnQuZmluZEFjdGl2ZUZvcm1zKHt9KTtcblxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XG4gICAgICAgIGlmIChmdWxjcnVtLmFyZ3MucGdSZWJ1aWxkVmlld3NPbmx5KSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRnJpZW5kbHlWaWV3cyhmb3JtLCBhY2NvdW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKGZvcm0sIGFjY291bnQsIChpbmRleCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZm9ybS5uYW1lLmdyZWVuICsgJyA6ICcgKyBpbmRleC50b1N0cmluZygpLnJlZCArICcgcmVjb3JkcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGZpbmQgYWNjb3VudCcsIGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIH1cbiAgfVxuXG4gIGdldCB1c2VTeW5jRXZlbnRzKCkge1xuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MucGdTeW5jRXZlbnRzIDogdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi5QT1NUR1JFU19DT05GSUcsXG4gICAgICBob3N0OiBmdWxjcnVtLmFyZ3MucGdIb3N0IHx8IFBPU1RHUkVTX0NPTkZJRy5ob3N0LFxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLnBnUG9ydCB8fCBQT1NUR1JFU19DT05GSUcucG9ydCxcbiAgICAgIGRhdGFiYXNlOiBmdWxjcnVtLmFyZ3MucGdEYXRhYmFzZSB8fCBQT1NUR1JFU19DT05GSUcuZGF0YWJhc2UsXG4gICAgICB1c2VyOiBmdWxjcnVtLmFyZ3MucGdVc2VyIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkIHx8IFBPU1RHUkVTX0NPTkZJRy51c2VyXG4gICAgfTtcblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdVc2VyKSB7XG4gICAgICBvcHRpb25zLnVzZXIgPSBmdWxjcnVtLmFyZ3MucGdVc2VyO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdQYXNzd29yZCkge1xuICAgICAgb3B0aW9ucy5wYXNzd29yZCA9IGZ1bGNydW0uYXJncy5wZ1Bhc3N3b3JkO1xuICAgIH1cblxuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdDdXN0b21Nb2R1bGUpIHtcbiAgICAgIHRoaXMucGdDdXN0b21Nb2R1bGUgPSByZXF1aXJlKGZ1bGNydW0uYXJncy5wZ0N1c3RvbU1vZHVsZSk7XG4gICAgfVxuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5hcnJheXMgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpc2FibGVBcnJheXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucG9vbCA9IG5ldyBwZy5Qb29sKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXNlU3luY0V2ZW50cykge1xuICAgICAgZnVsY3J1bS5vbignc3luYzpzdGFydCcsIHRoaXMub25TeW5jU3RhcnQpO1xuICAgICAgZnVsY3J1bS5vbignc3luYzpmaW5pc2gnLCB0aGlzLm9uU3luY0ZpbmlzaCk7XG4gICAgICBmdWxjcnVtLm9uKCdwaG90bzpzYXZlJywgdGhpcy5vblBob3RvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCd2aWRlbzpzYXZlJywgdGhpcy5vblZpZGVvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdhdWRpbzpzYXZlJywgdGhpcy5vbkF1ZGlvU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjaGFuZ2VzZXQ6c2F2ZScsIHRoaXMub25DaGFuZ2VzZXRTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ3JlY29yZDpzYXZlJywgdGhpcy5vblJlY29yZFNhdmUpO1xuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xuXG4gICAgICBmdWxjcnVtLm9uKCdjaG9pY2UtbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcbiAgICAgIGZ1bGNydW0ub24oJ2Nob2ljZS1saXN0OmRlbGV0ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdmb3JtOmRlbGV0ZScsIHRoaXMub25Gb3JtU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uLXNldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdjbGFzc2lmaWNhdGlvbi1zZXQ6ZGVsZXRlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3JvbGU6c2F2ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdyb2xlOmRlbGV0ZScsIHRoaXMub25Sb2xlU2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdwcm9qZWN0OmRlbGV0ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XG5cbiAgICAgIGZ1bGNydW0ub24oJ21lbWJlcnNoaXA6c2F2ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgICBmdWxjcnVtLm9uKCdtZW1iZXJzaGlwOmRlbGV0ZScsIHRoaXMub25NZW1iZXJzaGlwU2F2ZSk7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2ggYWxsIHRoZSBleGlzdGluZyB0YWJsZXMgb24gc3RhcnR1cC4gVGhpcyBhbGxvd3MgdXMgdG8gc3BlY2lhbCBjYXNlIHRoZVxuICAgIC8vIGNyZWF0aW9uIG9mIG5ldyB0YWJsZXMgZXZlbiB3aGVuIHRoZSBmb3JtIGlzbid0IHZlcnNpb24gMS4gSWYgdGhlIHRhYmxlIGRvZXNuJ3RcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxuICAgIC8vIG9mIGFwcGx5aW5nIGEgc2NoZW1hIGRpZmYuXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy5kYXRhU2NoZW1hID0gZnVsY3J1bS5hcmdzLnBnU2NoZW1hIHx8ICdwdWJsaWMnO1xuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIC8vIG1ha2UgYSBjbGllbnQgc28gd2UgY2FuIHVzZSBpdCB0byBidWlsZCBTUUwgc3RhdGVtZW50c1xuICAgIHRoaXMucGdkYiA9IG5ldyBQb3N0Z3Jlcyh7fSk7XG5cbiAgICB0aGlzLnNldHVwT3B0aW9ucygpO1xuICB9XG5cbiAgYXN5bmMgZGVhY3RpdmF0ZSgpIHtcbiAgICBpZiAodGhpcy5wb29sKSB7XG4gICAgICBhd2FpdCB0aGlzLnBvb2wuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgcnVuID0gKHNxbCkgPT4ge1xuICAgIHNxbCA9IHNxbC5yZXBsYWNlKC9cXDAvZywgJycpO1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coc3FsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5wb29sLnF1ZXJ5KHNxbCwgW10sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzLnJvd3MpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICB9XG5cbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcbiAgICByZXR1cm4gJ2FjY291bnRfJyArIGFjY291bnQucm93SUQgKyAnXycgKyBuYW1lO1xuICB9XG5cbiAgb25TeW5jU3RhcnQgPSBhc3luYyAoe2FjY291bnQsIHRhc2tzfSkgPT4ge1xuICAgIHRoaXMuaW52b2tlQmVmb3JlRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uU3luY0ZpbmlzaCA9IGFzeW5jICh7YWNjb3VudH0pID0+IHtcbiAgICB0aGlzLmludm9rZUFmdGVyRnVuY3Rpb24oKTtcbiAgfVxuXG4gIG9uRm9ybVNhdmUgPSBhc3luYyAoe2Zvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm19KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xuICB9XG5cbiAgb25Gb3JtRGVsZXRlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50fSkgPT4ge1xuICAgIGNvbnN0IG9sZEZvcm0gPSB7XG4gICAgICBpZDogZm9ybS5faWQsXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXG4gICAgICBuYW1lOiBmb3JtLl9uYW1lLFxuICAgICAgZWxlbWVudHM6IGZvcm0uX2VsZW1lbnRzSlNPTlxuICAgIH07XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbnVsbCk7XG4gIH1cblxuICBvblJlY29yZFNhdmUgPSBhc3luYyAoe3JlY29yZCwgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xuICB9XG5cbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gUG9zdGdyZXNSZWNvcmRWYWx1ZXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyh0aGlzLnBnZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zKTtcblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMubWFwKG8gPT4gby5zcWwpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIG9uUGhvdG9TYXZlID0gYXN5bmMgKHtwaG90bywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uVmlkZW9TYXZlID0gYXN5bmMgKHt2aWRlbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVZpZGVvKHZpZGVvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQXVkaW9TYXZlID0gYXN5bmMgKHthdWRpbywgYWNjb3VudH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgfVxuXG4gIG9uQ2hhbmdlc2V0U2F2ZSA9IGFzeW5jICh7Y2hhbmdlc2V0LCBhY2NvdW50fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gIH1cblxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjY291bnQpO1xuICB9XG5cbiAgb25DbGFzc2lmaWNhdGlvblNldFNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCwgYWNjY291bnQpO1xuICB9XG5cbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlUHJvamVjdChvYmplY3QsIGFjY2NvdW50KTtcbiAgfVxuXG4gIG9uUm9sZVNhdmUgPSBhc3luYyAoe29iamVjdH0pID0+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJvbGUob2JqZWN0LCBhY2Njb3VudCk7XG4gIH1cblxuICBvbk1lbWJlcnNoaXBTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVNZW1iZXJzaGlwKG9iamVjdCwgYWNjY291bnQpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUGhvdG8ob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgY29uc3QgdmFsdWVzID0gU2NoZW1hTWFwLnBob3RvKG9iamVjdCk7XG5cbiAgICB2YWx1ZXMuZmlsZSA9IHRoaXMuZm9ybWF0UGhvdG9VUkwodmFsdWVzLmFjY2Vzc19rZXkpO1xuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QodmFsdWVzLCAncGhvdG9zJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVWaWRlbyhvYmplY3QsIGFjY291bnQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBTY2hlbWFNYXAudmlkZW8ob2JqZWN0KTtcblxuICAgIHZhbHVlcy5maWxlID0gdGhpcy5mb3JtYXRWaWRlb1VSTCh2YWx1ZXMuYWNjZXNzX2tleSk7XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdCh2YWx1ZXMsICd2aWRlb3MnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUF1ZGlvKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFNjaGVtYU1hcC5hdWRpbyhvYmplY3QpO1xuXG4gICAgdmFsdWVzLmZpbGUgPSB0aGlzLmZvcm1hdEF1ZGlvVVJMKHZhbHVlcy5hY2Nlc3Nfa2V5KTtcblxuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KHZhbHVlcywgJ2F1ZGlvJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVDaGFuZ2VzZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNoYW5nZXNldChvYmplY3QpLCAnY2hhbmdlc2V0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlUHJvamVjdChvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAucHJvamVjdChvYmplY3QpLCAncHJvamVjdHMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZU1lbWJlcnNoaXAob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLm1lbWJlcnNoaXAob2JqZWN0KSwgJ21lbWJlcnNoaXBzJyk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVSb2xlKG9iamVjdCwgYWNjb3VudCkge1xuICAgIGF3YWl0IHRoaXMudXBkYXRlT2JqZWN0KFNjaGVtYU1hcC5yb2xlKG9iamVjdCksICdyb2xlcycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRm9ybShvYmplY3QsIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZU9iamVjdChTY2hlbWFNYXAuZm9ybShvYmplY3QpLCAnZm9ybXMnKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUNob2ljZUxpc3Qob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNob2ljZUxpc3Qob2JqZWN0KSwgJ2Nob2ljZV9saXN0cycpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KSB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVPYmplY3QoU2NoZW1hTWFwLmNsYXNzaWZpY2F0aW9uU2V0KG9iamVjdCksICdjbGFzc2lmaWNhdGlvbl9zZXRzJyk7XG4gIH1cblxuXG4gIGFzeW5jIHVwZGF0ZU9iamVjdCh2YWx1ZXMsIHRhYmxlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRlbGV0ZVN0YXRlbWVudCA9IHRoaXMucGdkYi5kZWxldGVTdGF0ZW1lbnQodGFibGUsIHtyb3dfcmVzb3VyY2VfaWQ6IHZhbHVlcy5yb3dfcmVzb3VyY2VfaWR9KTtcbiAgICAgIGNvbnN0IGluc2VydFN0YXRlbWVudCA9IHRoaXMucGdkYi5pbnNlcnRTdGF0ZW1lbnQodGFibGUsIHZhbHVlcywge3BrOiAnaWQnfSk7XG5cbiAgICAgIGNvbnN0IHNxbCA9IFsgZGVsZXRlU3RhdGVtZW50LnNxbCwgaW5zZXJ0U3RhdGVtZW50LnNxbCBdLmpvaW4oJ1xcbicpO1xuXG4gICAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICB9XG4gIH1cblxuICByZWxvYWRUYWJsZUxpc3QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xuXG4gICAgdGhpcy50YWJsZU5hbWVzID0gcm93cy5tYXAobyA9PiBvLm5hbWUpO1xuICB9XG5cbiAgYmFzZU1lZGlhVVJMID0gKCkgPT4ge1xuICB9XG5cbiAgZm9ybWF0UGhvdG9VUkwgPSAoaWQpID0+IHtcbiAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zLyR7IGlkIH0uanBnYDtcbiAgfVxuXG4gIGZvcm1hdFZpZGVvVVJMID0gKGlkKSA9PiB7XG4gICAgcmV0dXJuIGAkeyB0aGlzLmJhc2VNZWRpYVVSTCB9L3ZpZGVvcy8keyBpZCB9Lm1wNGA7XG4gIH1cblxuICBmb3JtYXRBdWRpb1VSTCA9IChpZCkgPT4ge1xuICAgIHJldHVybiBgJHsgdGhpcy5iYXNlTWVkaWFVUkwgfS9hdWRpby8keyBpZCB9Lm00YWA7XG4gIH1cblxuICBzZXR1cE9wdGlvbnMoKSB7XG4gICAgdGhpcy5iYXNlTWVkaWFVUkwgPSBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgPyBmdWxjcnVtLmFyZ3MucGdNZWRpYUJhc2VVcmwgOiAnaHR0cHM6Ly9hcGkuZnVsY3J1bWFwcC5jb20vYXBpL3YyJztcblxuICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zID0ge1xuICAgICAgZGlzYWJsZUFycmF5czogdGhpcy5kaXNhYmxlQXJyYXlzLFxuXG4gICAgICBtZWRpYVVSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcblxuICAgICAgICByZXR1cm4gbWVkaWFWYWx1ZS5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzUGhvdG9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRQaG90b1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRWaWRlb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVkaWFWYWx1ZS5lbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXRBdWRpb1VSTChpdGVtLm1lZGlhSUQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG1lZGlhVmlld1VSTEZvcm1hdHRlcjogKG1lZGlhVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgaWRzID0gbWVkaWFWYWx1ZS5pdGVtcy5tYXAobyA9PiBvLm1lZGlhSUQpO1xuXG4gICAgICAgIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNQaG90b0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vcGhvdG9zL3ZpZXc/cGhvdG9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vdmlkZW9zL3ZpZXc/dmlkZW9zPSR7IGlkcyB9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtZWRpYVZhbHVlLmVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gYCR7IHRoaXMuYmFzZU1lZGlhVVJMIH0vYXVkaW8vdmlldz9hdWRpbz0keyBpZHMgfWA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGZ1bGNydW0uYXJncy5wZ1JlcG9ydEJhc2VVcmwpIHtcbiAgICAgIHRoaXMucmVjb3JkVmFsdWVPcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlciA9IChmZWF0dXJlKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHsgZnVsY3J1bS5hcmdzLnBnUmVwb3J0QmFzZVVybCB9L3JlcG9ydHMvJHsgZmVhdHVyZS5pZCB9LnBkZmA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XG4gICAgaWYgKCFza2lwVGFibGVDaGVjayAmJiAhdGhpcy5yb290VGFibGVFeGlzdHMocmVjb3JkLmZvcm0pKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlYnVpbGRGb3JtKHJlY29yZC5mb3JtLCBhY2NvdW50LCAoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGdDdXN0b21Nb2R1bGUgJiYgdGhpcy5wZ0N1c3RvbU1vZHVsZS5zaG91bGRVcGRhdGVSZWNvcmQgJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlUmVjb3JkKHtyZWNvcmQsIGFjY291bnR9KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBQb3N0Z3Jlc1JlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMucGdkYiwgcmVjb3JkLCB0aGlzLnJlY29yZFZhbHVlT3B0aW9ucyk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLm1hcChvID0+IG8uc3FsKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZXMuaW5kZXhPZihQb3N0Z3Jlc1JlY29yZFZhbHVlcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtKSkgIT09IC0xO1xuICB9XG5cbiAgcmVjcmVhdGVGb3JtVGFibGVzID0gYXN5bmMgKGZvcm0sIGFjY291bnQpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUZvcm0oZm9ybSwgYWNjb3VudCwgbnVsbCwgdGhpcy5mb3JtVmVyc2lvbihmb3JtKSk7XG4gIH1cblxuICB1cGRhdGVGb3JtID0gYXN5bmMgKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pID0+IHtcbiAgICBpZiAodGhpcy5wZ0N1c3RvbU1vZHVsZSAmJiB0aGlzLnBnQ3VzdG9tTW9kdWxlLnNob3VsZFVwZGF0ZUZvcm0gJiYgIXRoaXMucGdDdXN0b21Nb2R1bGUuc2hvdWxkVXBkYXRlRm9ybSh7Zm9ybSwgYWNjb3VudH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcbiAgICAgIG9sZEZvcm0gPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHtzdGF0ZW1lbnRzfSA9IGF3YWl0IFBvc3RncmVzU2NoZW1hLmdlbmVyYXRlU2NoZW1hU3RhdGVtZW50cyhhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtLCB0aGlzLmRpc2FibGVBcnJheXMpO1xuXG4gICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIG51bGwpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKSkge1xuICAgICAgYXdhaXQgdGhpcy5kcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucnVuKHN0YXRlbWVudHMuam9pbignXFxuJykpO1xuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkcm9wRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMucGdkYi5pZGVudCh0aGlzLmRhdGFTY2hlbWEpLCB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XG4gICAgY29uc3Qgdmlld05hbWUgPSB0aGlzLmdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnQ1JFQVRFIFZJRVcgJXMuJXMgQVMgU0VMRUNUICogRlJPTSAlc192aWV3X2Z1bGw7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBnZGIuaWRlbnQodmlld05hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RncmVzUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICB9XG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxuICAgIH1cbiAgfVxuXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcbiAgICBjb25zdCBuYW1lID0gcmVwZWF0YWJsZSA/IGAke2Zvcm0ubmFtZX0gLSAke3JlcGVhdGFibGUuZGF0YU5hbWV9YCA6IGZvcm0ubmFtZTtcblxuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MucGdVbmRlcnNjb3JlTmFtZXMgPyBzbmFrZShuYW1lKSA6IG5hbWU7XG4gIH1cblxuICBhc3luYyBpbnZva2VCZWZvcmVGdW5jdGlvbigpIHtcbiAgICBpZiAoZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pIHtcbiAgICAgIGF3YWl0IHRoaXMucnVuKGZvcm1hdCgnU0VMRUNUICVzKCk7JywgZnVsY3J1bS5hcmdzLnBnQmVmb3JlRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbnZva2VBZnRlckZ1bmN0aW9uKCkge1xuICAgIGlmIChmdWxjcnVtLmFyZ3MucGdBZnRlckZ1bmN0aW9uKSB7XG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ1NFTEVDVCAlcygpOycsIGZ1bGNydW0uYXJncy5wZ0FmdGVyRnVuY3Rpb24pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCBwcm9ncmVzcykge1xuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xuICAgIGF3YWl0IHRoaXMucmVsb2FkVGFibGVMaXN0KCk7XG5cbiAgICBsZXQgaW5kZXggPSAwO1xuXG4gICAgYXdhaXQgZm9ybS5maW5kRWFjaFJlY29yZCh7fSwgYXN5bmMgKHJlY29yZCkgPT4ge1xuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xuXG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHByb2dyZXNzKGluZGV4KTtcbiAgfVxuXG4gIGFzeW5jIHJlYnVpbGRGcmllbmRseVZpZXdzKGZvcm0sIGFjY291bnQpIHtcbiAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmRyb3BGcmllbmRseVZpZXcoZm9ybSwgcmVwZWF0YWJsZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVGcmllbmRseVZpZXcoZm9ybSwgbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XG4gICAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcbiAgICB9XG4gIH1cblxuICBmb3JtVmVyc2lvbiA9IChmb3JtKSA9PiB7XG4gICAgaWYgKGZvcm0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBmb3JtLl9pZCxcbiAgICAgIHJvd19pZDogZm9ybS5yb3dJRCxcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXG4gICAgICBlbGVtZW50czogZm9ybS5fZWxlbWVudHNKU09OXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jbGVhckxpbmUoKTtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZHJvcFN5c3RlbVRhYmxlcygpIHtcbiAgICBjb25zdCBzcWwgPSB0ZW1wbGF0ZURyb3AucmVwbGFjZSgvX19TQ0hFTUFfXy9nLCAncHVibGljJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvX19WSUVXX1NDSEVNQV9fL2csIHRoaXMuZGF0YVNjaGVtYSk7XG5cbiAgICBhd2FpdCB0aGlzLnJ1bihzcWwpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBEYXRhYmFzZSgpIHtcbiAgICBjb25zdCBzcWwgPSB0ZW1wbGF0ZS5yZXBsYWNlKC9fX1NDSEVNQV9fL2csICdwdWJsaWMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL19fVklFV19TQ0hFTUFfXy9nLCB0aGlzLmRhdGFTY2hlbWEpO1xuXG4gICAgYXdhaXQgdGhpcy5ydW4oc3FsKTtcbiAgfVxuXG4gIGFzeW5jIHNldHVwU3lzdGVtVGFibGVzKGFjY291bnQpIHtcbiAgICBjb25zdCBwcm9ncmVzcyA9IChuYW1lLCBpbmRleCkgPT4ge1xuICAgICAgdGhpcy51cGRhdGVTdGF0dXMobmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQpO1xuICAgIH07XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUGhvdG8oe30sIGFzeW5jIChwaG90bywge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUGhvdG9zJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVBob3RvKHBob3RvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hWaWRlbyh7fSwgYXN5bmMgKHZpZGVvLCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdWaWRlb3MnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlVmlkZW8odmlkZW8sIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaEF1ZGlvKHt9LCBhc3luYyAoYXVkaW8sIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0F1ZGlvJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUF1ZGlvKGF1ZGlvLCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hDaGFuZ2VzZXQoe30sIGFzeW5jIChjaGFuZ2VzZXQsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NoYW5nZXNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2hhbmdlc2V0KGNoYW5nZXNldCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoUm9sZSh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnUm9sZXMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlUm9sZShvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaFByb2plY3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ1Byb2plY3RzJywgaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVByb2plY3Qob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcblxuICAgIGF3YWl0IGFjY291bnQuZmluZEVhY2hGb3JtKHt9LCBhc3luYyAob2JqZWN0LCB7aW5kZXh9KSA9PiB7XG4gICAgICBpZiAoKytpbmRleCAlIDEwID09PSAwKSB7XG4gICAgICAgIHByb2dyZXNzKCdGb3JtcycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoTWVtYmVyc2hpcCh7fSwgYXN5bmMgKG9iamVjdCwge2luZGV4fSkgPT4ge1xuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xuICAgICAgICBwcm9ncmVzcygnTWVtYmVyc2hpcHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWVtYmVyc2hpcChvYmplY3QsIGFjY291bnQpO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgYXdhaXQgYWNjb3VudC5maW5kRWFjaENob2ljZUxpc3Qoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0Nob2ljZSBMaXN0cycsIGluZGV4KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDaG9pY2VMaXN0KG9iamVjdCwgYWNjb3VudCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBhd2FpdCBhY2NvdW50LmZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQoe30sIGFzeW5jIChvYmplY3QsIHtpbmRleH0pID0+IHtcbiAgICAgIGlmICgrK2luZGV4ICUgMTAgPT09IDApIHtcbiAgICAgICAgcHJvZ3Jlc3MoJ0NsYXNzaWZpY2F0aW9uIFNldHMnLCBpbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2xhc3NpZmljYXRpb25TZXQob2JqZWN0LCBhY2NvdW50KTtcbiAgICB9KTtcbiAgfVxufVxuIl19