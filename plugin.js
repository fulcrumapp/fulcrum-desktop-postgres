import pg from 'pg';
import { format } from 'util';
import PostgresSchema from './schema';
import { PostgresRecordValues, Postgres } from 'fulcrum';

const POSTGRES_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
};

export default class {
  async task(cli) {
    return cli.command({
      command: 'postgres',
      desc: 'run the postgres sync for a specific organization',
      builder: {
        pgdatabase: {
          desc: 'postgresql database name',
          type: 'string',
          default: POSTGRES_CONFIG.database
        },
        pghost: {
          desc: 'postgresql server host',
          type: 'string',
          default: POSTGRES_CONFIG.host
        },
        pgport: {
          desc: 'postgresql server port',
          type: 'integer',
          default: POSTGRES_CONFIG.port
        },
        pguser: {
          desc: 'postgresql user',
          type: 'string'
        },
        pgpassword: {
          desc: 'postgresql password',
          type: 'string'
        },
        pgschema: {
          desc: 'postgresql schema',
          type: 'string',
          default: 'public'
        },
        org: {
          desc: 'organization name',
          required: true,
          type: 'string'
        }
      },
      handler: this.runCommand
    });
  }

  runCommand = async () => {
    await this.activate();

    const account = await fulcrum.fetchAccount(fulcrum.args.org);

    if (account) {
      const forms = await account.findActiveForms({});

      for (const form of forms) {
        await this.recreateFormTables(form, account);

        let index = 0;

        await form.findEachRecord({}, async (record) => {
          await record.getForm();

          if (++index % 10 === 0) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(form.name.green + ' : ' + index.toString().red + ' records');
          }

          await this.updateRecord(record, account, true);
        });

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(form.name.green + ' : ' + index.toString().red + ' records');

        console.log('');
      }
    } else {
      console.error('Unable to find account', this.args.org);
    }
  }

  async activate() {
    const options = {
      ...POSTGRES_CONFIG,
      host: fulcrum.args.pghost || POSTGRES_CONFIG.host,
      port: fulcrum.args.pgport || POSTGRES_CONFIG.port,
      database: fulcrum.args.pgdatabase || POSTGRES_CONFIG.database,
      user: fulcrum.args.pguser || POSTGRES_CONFIG.user,
      password: fulcrum.args.pgpassword || POSTGRES_CONFIG.user
    };

    if (fulcrum.args.pguser) {
      options.user = fulcrum.args.pguser;
    }

    if (fulcrum.args.pgpassword) {
      options.password = fulcrum.args.pgpassword;
    }

    this.pool = new pg.Pool(options);

    // fulcrum.on('choice_list:save', this.onChoiceListSave);
    // fulcrum.on('classification_set:save', this.onClassificationSetSave);
    // fulcrum.on('project:save', this.onProjectSave);
    fulcrum.on('form:save', this.onFormSave);
    fulcrum.on('record:save', this.onRecordSave);
    fulcrum.on('record:delete', this.onRecordDelete);

    // Fetch all the existing tables on startup. This allows us to special case the
    // creation of new tables even when the form isn't version 1. If the table doesn't
    // exist, we can pretend the form is version 1 so it creates all new tables instead
    // of applying a schema diff.
    const rows = await this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

    this.tableNames = rows.map(o => o.name);

    // make a client so we can use it to build SQL statements
    this.pgdb = new Postgres({});
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

  onFormSave = async ({form, account, oldForm, newForm}) => {
    await this.updateForm(form, account, oldForm, newForm);
  }

  onRecordSave = async ({record, account}) => {
    await this.updateRecord(record, account);
  }

  onRecordDelete = async ({record}) => {
    const statements = PostgresRecordValues.deleteForRecordStatements(this.pgdb, record, record.form);

    await this.run(statements.map(o => o.sql).join('\n'));
  }

  onChoiceListSave = async ({object}) => {
  }

  onClassificationSetSave = async ({object}) => {
  }

  onProjectSave = async ({object}) => {
  }

  reloadTableList = async () => {
    const rows = await this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

    this.tableNames = rows.map(o => o.name);
  }

  updateRecord = async (record, account, skipTableCheck) => {
    if (!skipTableCheck && !this.rootTableExists(record.form)) {
      await this.recreateFormTables(record.form, account);
      await this.reloadTableList();
    }

    const statements = PostgresRecordValues.updateForRecordStatements(this.pgdb, record);

    await this.run(statements.map(o => o.sql).join('\n'));
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
    if (!this.rootTableExists(form) && newForm != null) {
      oldForm = null;
    }

    const {statements} = await PostgresSchema.generateSchemaStatements(account, oldForm, newForm);

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
    const viewName = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

    try {
      await this.run(format('DROP VIEW IF EXISTS %s.%s;', this.pgdb.ident(fulcrum.args.schema), this.pgdb.ident(viewName)));
    } catch (ex) {
      // sometimes it doesn't exist
    }
  }

  async createFriendlyView(form, repeatable) {
    const viewName = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

    try {
      await this.run(format('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;',
                            this.pgdb.ident(fulcrum.args.schema),
                            this.pgdb.ident(viewName),
                            PostgresRecordValues.tableNameWithForm(form, repeatable)));
    } catch (ex) {
      // sometimes it doesn't exist
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
}
