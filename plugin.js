import pg from 'pg';
import { format } from 'util';
import PostgresSchema from './schema';
import { PostgresRecordValues, Postgres } from 'fulcrum';
import snake from 'snake-case';
import templateDrop from './template.drop.sql';
import SchemaMap from './schema-map';

import version001 from './version-001.sql';
import version002 from './version-002.sql';

const POSTGRES_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
};

const MIGRATIONS = {
  '002': version002
};

export default class {
  async task(cli) {
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
      handler: this.runCommand
    });
  }

  runCommand = async () => {
    await this.activate();

    if (fulcrum.args.pgDrop) {
      await this.dropSystemTables();
      return;
    }

    if (fulcrum.args.pgSetup) {
      await this.setupDatabase();
      return;
    }

    const account = await fulcrum.fetchAccount(fulcrum.args.org);

    if (account) {
      if (fulcrum.args.pgSystemTablesOnly) {
        await this.setupSystemTables(account);
        return;
      }

      await this.invokeBeforeFunction();

      const forms = await account.findActiveForms({});

      for (const form of forms) {
        if (fulcrum.args.pgRebuildViewsOnly) {
          await this.rebuildFriendlyViews(form, account);
        } else {
          await this.rebuildForm(form, account, (index) => {
            this.updateStatus(form.name.green + ' : ' + index.toString().red + ' records');
          });
        }

        console.log('');
      }

      await this.invokeAfterFunction();
    } else {
      console.error('Unable to find account', fulcrum.args.org);
    }
  }

  get useSyncEvents() {
    return fulcrum.args.pgSyncEvents != null ? fulcrum.args.pgSyncEvents : true;
  }

  async activate() {
    const options = {
      ...POSTGRES_CONFIG,
      host: fulcrum.args.pgHost || POSTGRES_CONFIG.host,
      port: fulcrum.args.pgPort || POSTGRES_CONFIG.port,
      database: fulcrum.args.pgDatabase || POSTGRES_CONFIG.database,
      user: fulcrum.args.pgUser || POSTGRES_CONFIG.user,
      password: fulcrum.args.pgPassword || POSTGRES_CONFIG.user
    };

    if (fulcrum.args.pgUser) {
      options.user = fulcrum.args.pgUser;
    }

    if (fulcrum.args.pgPassword) {
      options.password = fulcrum.args.pgPassword;
    }

    if (fulcrum.args.pgCustomModule) {
      this.pgCustomModule = require(fulcrum.args.pgCustomModule);
    }

    if (fulcrum.args.pgArrays === false) {
      this.disableArrays = true;
    }

    this.pool = new pg.Pool(options);

    if (this.useSyncEvents) {
      fulcrum.on('sync:start', this.onSyncStart);
      fulcrum.on('sync:finish', this.onSyncFinish);
      fulcrum.on('photo:save', this.onPhotoSave);
      fulcrum.on('video:save', this.onVideoSave);
      fulcrum.on('audio:save', this.onAudioSave);
      fulcrum.on('changeset:save', this.onChangesetSave);
      fulcrum.on('record:save', this.onRecordSave);
      fulcrum.on('record:delete', this.onRecordDelete);

      fulcrum.on('choice-list:save', this.onChoiceListSave);
      fulcrum.on('choice-list:delete', this.onChoiceListSave);

      fulcrum.on('form:save', this.onFormSave);
      fulcrum.on('form:delete', this.onFormSave);

      fulcrum.on('classification-set:save', this.onClassificationSetSave);
      fulcrum.on('classification-set:delete', this.onClassificationSetSave);

      fulcrum.on('role:save', this.onRoleSave);
      fulcrum.on('role:delete', this.onRoleSave);

      fulcrum.on('project:save', this.onProjectSave);
      fulcrum.on('project:delete', this.onProjectSave);

      fulcrum.on('membership:save', this.onMembershipSave);
      fulcrum.on('membership:delete', this.onMembershipSave);
    }

    // Fetch all the existing tables on startup. This allows us to special case the
    // creation of new tables even when the form isn't version 1. If the table doesn't
    // exist, we can pretend the form is version 1 so it creates all new tables instead
    // of applying a schema diff.
    const rows = await this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

    this.dataSchema = fulcrum.args.pgSchema || 'public';
    this.tableNames = rows.map(o => o.name);

    // make a client so we can use it to build SQL statements
    this.pgdb = new Postgres({});

    this.setupOptions();

    await this.maybeInitialize();
  }

  async deactivate() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  run = (sql) => {
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
  }

  log = (...args) => {
    // console.log(...args);
  }

  tableName = (account, name) => {
    return 'account_' + account.rowID + '_' + name;
  }

  onSyncStart = async ({account, tasks}) => {
    this.invokeBeforeFunction();
  }

  onSyncFinish = async ({account}) => {
    this.invokeAfterFunction();
  }

  onFormSave = async ({form, account, oldForm, newForm}) => {
    await this.updateForm(form, account, oldForm, newForm);
  }

  onFormDelete = async ({form, account}) => {
    const oldForm = {
      id: form._id,
      row_id: form.rowID,
      name: form._name,
      elements: form._elementsJSON
    };

    await this.updateForm(form, account, oldForm, null);
  }

  onRecordSave = async ({record, account}) => {
    await this.updateRecord(record, account);
  }

  onRecordDelete = async ({record}) => {
    const statements = PostgresRecordValues.deleteForRecordStatements(this.pgdb, record, record.form, this.recordValueOptions);

    await this.run(statements.map(o => o.sql).join('\n'));
  }

  onPhotoSave = async ({photo, account}) => {
    await this.updatePhoto(photo, account);
  }

  onVideoSave = async ({video, account}) => {
    await this.updateVideo(video, account);
  }

  onAudioSave = async ({audio, account}) => {
    await this.updateAudio(audio, account);
  }

  onChangesetSave = async ({changeset, account}) => {
    await this.updateChangeset(changeset, account);
  }

  onChoiceListSave = async ({choiceList, account}) => {
    await this.updateChoiceList(choiceList, account);
  }

  onClassificationSetSave = async ({classificationSet, account}) => {
    await this.updateClassificationSet(classificationSet, account);
  }

  onProjectSave = async ({project, account}) => {
    await this.updateProject(project, account);
  }

  onRoleSave = async ({role, account}) => {
    await this.updateRole(role, account);
  }

  onMembershipSave = async ({membership, account}) => {
    await this.updateMembership(membership, account);
  }

  async updatePhoto(object, account) {
    const values = SchemaMap.photo(object);

    values.file = this.formatPhotoURL(values.access_key);

    await this.updateObject(values, 'photos');
  }

  async updateVideo(object, account) {
    const values = SchemaMap.video(object);

    values.file = this.formatVideoURL(values.access_key);

    await this.updateObject(values, 'videos');
  }

  async updateAudio(object, account) {
    const values = SchemaMap.audio(object);

    values.file = this.formatAudioURL(values.access_key);

    await this.updateObject(values, 'audio');
  }

  async updateChangeset(object, account) {
    await this.updateObject(SchemaMap.changeset(object), 'changesets');
  }

  async updateProject(object, account) {
    await this.updateObject(SchemaMap.project(object), 'projects');
  }

  async updateMembership(object, account) {
    await this.updateObject(SchemaMap.membership(object), 'memberships');
  }

  async updateRole(object, account) {
    await this.updateObject(SchemaMap.role(object), 'roles');
  }

  async updateFormObject(object, account) {
    await this.updateObject(SchemaMap.form(object), 'forms');
  }

  async updateChoiceList(object, account) {
    await this.updateObject(SchemaMap.choiceList(object), 'choice_lists');
  }

  async updateClassificationSet(object, account) {
    await this.updateObject(SchemaMap.classificationSet(object), 'classification_sets');
  }


  async updateObject(values, table) {
    try {
      const deleteStatement = this.pgdb.deleteStatement('system_' + table, {row_resource_id: values.row_resource_id});
      const insertStatement = this.pgdb.insertStatement('system_' + table, values, {pk: 'id'});

      const sql = [ deleteStatement.sql, insertStatement.sql ].join('\n');

      await this.run(sql);
    } catch (ex) {
      console.error(ex);
    }
  }

  reloadTableList = async () => {
    const rows = await this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

    this.tableNames = rows.map(o => o.name);
  }

  baseMediaURL = () => {
  }

  formatPhotoURL = (id) => {
    return `${ this.baseMediaURL }/photos/${ id }.jpg`;
  }

  formatVideoURL = (id) => {
    return `${ this.baseMediaURL }/videos/${ id }.mp4`;
  }

  formatAudioURL = (id) => {
    return `${ this.baseMediaURL }/audio/${ id }.m4a`;
  }

  setupOptions() {
    this.baseMediaURL = fulcrum.args.pgMediaBaseUrl ? fulcrum.args.pgMediaBaseUrl : 'https://api.fulcrumapp.com/api/v2';

    this.recordValueOptions = {
      disableArrays: this.disableArrays,

      valuesTransformer: this.pgCustomModule && this.pgCustomModule.valuesTransformer,

      mediaURLFormatter: (mediaValue) => {

        return mediaValue.items.map((item) => {
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

      mediaViewURLFormatter: (mediaValue) => {
        const ids = mediaValue.items.map(o => o.mediaID);

        if (mediaValue.element.isPhotoElement) {
          return `${ this.baseMediaURL }/photos/view?photos=${ ids }`;
        } else if (mediaValue.element.isVideoElement) {
          return `${ this.baseMediaURL }/videos/view?videos=${ ids }`;
        } else if (mediaValue.element.isAudioElement) {
          return `${ this.baseMediaURL }/audio/view?audio=${ ids }`;
        }

        return null;
      }
    };

    if (fulcrum.args.pgReportBaseUrl) {
      this.recordValueOptions.reportURLFormatter = (feature) => {
        return `${ fulcrum.args.pgReportBaseUrl }/reports/${ feature.id }.pdf`;
      };
    }
  }

  updateRecord = async (record, account, skipTableCheck) => {
    if (!skipTableCheck && !this.rootTableExists(record.form)) {
      await this.rebuildForm(record.form, account, () => {});
    }

    if (this.pgCustomModule && this.pgCustomModule.shouldUpdateRecord && !this.pgCustomModule.shouldUpdateRecord({record, account})) {
      return;
    }

    const statements = PostgresRecordValues.updateForRecordStatements(this.pgdb, record, this.recordValueOptions);

    await this.run(statements.map(o => o.sql).join('\n'));

    const systemValues = PostgresRecordValues.systemColumnValuesForFeature(record, null, record, this.recordValueOptions);

    await this.updateObject(SchemaMap.record(record, systemValues), 'records');
  }

  rootTableExists = (form) => {
    return this.tableNames.indexOf(PostgresRecordValues.tableNameWithForm(form)) !== -1;
  }

  recreateFormTables = async (form, account) => {
    try {
      await this.updateForm(form, account, this.formVersion(form), null);
    } catch (ex) {
      if (fulcrum.args.debug) {
        console.error(sql);
      }
    }

    await this.updateForm(form, account, null, this.formVersion(form));
  }

  updateForm = async (form, account, oldForm, newForm) => {
    if (this.pgCustomModule && this.pgCustomModule.shouldUpdateForm && !this.pgCustomModule.shouldUpdateForm({form, account})) {
      return;
    }

    await this.updateFormObject(form, account);

    if (!this.rootTableExists(form) && newForm != null) {
      oldForm = null;
    }

    const {statements} = await PostgresSchema.generateSchemaStatements(account, oldForm, newForm, this.disableArrays, this.pgCustomModule);

    await this.dropFriendlyView(form, null);

    for (const repeatable of form.elementsOfType('Repeatable')) {
      await this.dropFriendlyView(form, repeatable);
    }

    await this.run(statements.join('\n'));

    await this.createFriendlyView(form, null);

    for (const repeatable of form.elementsOfType('Repeatable')) {
      await this.createFriendlyView(form, repeatable);
    }
  }

  async dropFriendlyView(form, repeatable) {
    const viewName = this.getFriendlyTableName(form, repeatable);

    try {
      await this.run(format('DROP VIEW IF EXISTS %s.%s;', this.pgdb.ident(this.dataSchema), this.pgdb.ident(viewName)));
    } catch (ex) {
      if (fulcrum.args.debug) {
        console.error(ex);
      }
      // sometimes it doesn't exist
    }
  }

  async createFriendlyView(form, repeatable) {
    const viewName = this.getFriendlyTableName(form, repeatable);

    try {
      await this.run(format('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;',
                            this.pgdb.ident(this.dataSchema),
                            this.pgdb.ident(viewName),
                            PostgresRecordValues.tableNameWithForm(form, repeatable)));
    } catch (ex) {
      if (fulcrum.args.debug) {
        console.error(ex);
      }
      // sometimes it doesn't exist
    }
  }

  getFriendlyTableName(form, repeatable) {
    const name = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

    return fulcrum.args.pgUnderscoreNames ? snake(name) : name;
  }

  async invokeBeforeFunction() {
    if (fulcrum.args.pgBeforeFunction) {
      await this.run(format('SELECT %s();', fulcrum.args.pgBeforeFunction));
    }
  }

  async invokeAfterFunction() {
    if (fulcrum.args.pgAfterFunction) {
      await this.run(format('SELECT %s();', fulcrum.args.pgAfterFunction));
    }
  }

  async rebuildForm(form, account, progress) {
    await this.recreateFormTables(form, account);
    await this.reloadTableList();

    let index = 0;

    await form.findEachRecord({}, async (record) => {
      record.form = form;

      if (++index % 10 === 0) {
        progress(index);
      }

      await this.updateRecord(record, account, true);
    });

    progress(index);
  }

  async rebuildFriendlyViews(form, account) {
    await this.dropFriendlyView(form, null);

    for (const repeatable of form.elementsOfType('Repeatable')) {
      await this.dropFriendlyView(form, repeatable);
    }

    await this.createFriendlyView(form, null);

    for (const repeatable of form.elementsOfType('Repeatable')) {
      await this.createFriendlyView(form, repeatable);
    }
  }

  formVersion = (form) => {
    if (form == null) {
      return null;
    }

    return {
      id: form._id,
      row_id: form.rowID,
      name: form._name,
      elements: form._elementsJSON
    };
  }

  updateStatus = (message) => {
    if (process.stdout.isTTY) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(message);
    }
  }

  async dropSystemTables() {
    await this.run(this.prepareMigrationScript(templateDrop));
  }

  async setupDatabase() {
    await this.run(this.prepareMigrationScript(version001));
  }

  prepareMigrationScript(sql) {
    return sql.replace(/__SCHEMA__/g, 'public')
              .replace(/__VIEW_SCHEMA__/g, this.dataSchema);
  }

  async setupSystemTables(account) {
    const progress = (name, index) => {
      this.updateStatus(name.green + ' : ' + index.toString().red);
    };

    await account.findEachPhoto({}, async (photo, {index}) => {
      if (++index % 10 === 0) {
        progress('Photos', index);
      }

      await this.updatePhoto(photo, account);
    });

    await account.findEachVideo({}, async (video, {index}) => {
      if (++index % 10 === 0) {
        progress('Videos', index);
      }

      await this.updateVideo(video, account);
    });

    await account.findEachAudio({}, async (audio, {index}) => {
      if (++index % 10 === 0) {
        progress('Audio', index);
      }

      await this.updateAudio(audio, account);
    });

    await account.findEachChangeset({}, async (changeset, {index}) => {
      if (++index % 10 === 0) {
        progress('Changesets', index);
      }

      await this.updateChangeset(changeset, account);
    });

    await account.findEachRole({}, async (object, {index}) => {
      if (++index % 10 === 0) {
        progress('Roles', index);
      }

      await this.updateRole(object, account);
    });

    await account.findEachProject({}, async (object, {index}) => {
      if (++index % 10 === 0) {
        progress('Projects', index);
      }

      await this.updateProject(object, account);
    });

    await account.findEachForm({}, async (object, {index}) => {
      if (++index % 10 === 0) {
        progress('Forms', index);
      }

      await this.updateFormObject(object, account);
    });

    await account.findEachMembership({}, async (object, {index}) => {
      if (++index % 10 === 0) {
        progress('Memberships', index);
      }

      await this.updateMembership(object, account);
    });

    await account.findEachChoiceList({}, async (object, {index}) => {
      if (++index % 10 === 0) {
        progress('Choice Lists', index);
      }

      await this.updateChoiceList(object, account);
    });

    await account.findEachClassificationSet({}, async (object, {index}) => {
      if (++index % 10 === 0) {
        progress('Classification Sets', index);
      }

      await this.updateClassificationSet(object, account);
    });
  }

  async maybeInitialize() {
    const account = await fulcrum.fetchAccount(fulcrum.args.org);

    if (this.tableNames.indexOf('migrations') === -1) {
      console.log('Inititalizing database...');

      await this.setupDatabase();
    }

    await this.maybeRunMigrations(account);
  }

  async maybeRunMigrations(account) {
    this.migrations = (await this.run('SELECT name FROM migrations')).map(o => o.name);

    await this.maybeRunMigration('002', account);
  }

  async maybeRunMigration(version, account) {
    if (this.migrations.indexOf(version) === -1 && MIGRATIONS[version]) {
      await this.run(this.prepareMigrationScript(MIGRATIONS[version]));

      console.log('Populating system tables...');

      await this.setupSystemTables(account);
      await this.populateRecords(account);
    }
  }

  async populateRecords(account) {
    const forms = await account.findActiveForms({});

    let index = 0;

    for (const form of forms) {
      index = 0;

      await form.findEachRecord({}, async (record) => {
        record.form = form;

        if (++index % 10 === 0) {
          this.progress(form.name, index);
        }

        await this.updateRecord(record, account, false);
      });
    }
  }

  progress = (name, index) => {
    this.updateStatus(name.green + ' : ' + index.toString().red);
  }
}
