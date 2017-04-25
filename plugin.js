import Plugin from 'fulcrum-sync-plugin';
import pg from 'pg';
import {format} from 'util';
import PostgresSchema from './schema';

const POSTGRES_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000
};

export default class PostgresPlugin extends Plugin {
  get enabled() {
    return false;
  }

  async runTask({app, yargs}) {
    this.args = yargs.usage('Usage: postgres --org [org]')
      .demandOption([ 'org' ])
      .argv;

    const account = await app.fetchAccount(this.args.org);

    if (account) {
      const forms = await account.findActiveForms({});

      for (const form of forms) {
        try {
          await this.updateForm(form, account, this.formVersion(form), null);
        } catch (ex) {
          // ignore errors
        }

        await this.updateForm(form, account, null, this.formVersion(form));

        await form.findEachRecord({}, async (record) => {
          await record.getForm();

          process.stdout.write('.');

          await this.updateRecord(record);
        });
      }
    } else {
      console.error('Unable to find account', this.args.org);
    }
  }

  async initialize({app}) {
    this.pool = new pg.Pool(POSTGRES_CONFIG);

    // app.on('choice_list:save', this.onChoiceListSave);
    // app.on('classification_set:save', this.onClassificationSetSave);
    // app.on('project:save', this.onProjectSave);
    app.on('form:save', this.onFormSave);
    app.on('record:save', this.onRecordSave);
    app.on('record:delete', this.onRecordDelete);

    // Fetch all the existing tables on startup. This allows us to special case the
    // creation of new tables even when the form isn't version 1. If the table doesn't
    // exist, we can pretend the form is version 1 so it creates all new tables instead
    // of applying a schema diff.
    const rows = await this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

    this.tableNames = rows.map(o => o.name);

    // make a client so we can use it to build SQL statements
    this.pgdb = new app.api.Postgres({});
  }

  async dispose() {
    await this.pool.end();
  }

  run = (sql) => {
    sql = sql.replace(/\0/g, '');

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

  onRecordSave = async ({record}) => {
    await this.updateRecord(record);
  }

  onRecordDelete = async ({record}) => {
    const statements = this.app.api.PostgresRecordValues.deleteForRecordStatements(this.pgdb, record, record.form);

    await this.run(statements.map(o => o.sql).join('\n'));
  }

  onChoiceListSave = async ({object}) => {
  }

  onClassificationSetSave = async ({object}) => {
  }

  onProjectSave = async ({object}) => {
  }

  updateRecord = async (record) => {
    const statements = this.app.api.PostgresRecordValues.updateForRecordStatements(this.pgdb, record);

    await this.run(statements.map(o => o.sql).join('\n'));
  }

  updateForm = async (form, account, oldForm, newForm) => {
    const rootTableName = this.app.api.PostgresRecordValues.tableNameWithForm(form);

    if (this.tableNames.indexOf(rootTableName) === -1) {
      oldForm = null;
    }

    const {statements} = await PostgresSchema.generateSchemaStatements(account, oldForm, newForm);

    await this.run(format('DROP VIEW IF EXISTS %s', this.pgdb.ident(form.name)));

    await this.run(statements.join('\n'));

    await this.run(format('CREATE VIEW %s AS SELECT * FROM %s_view_full',
                          this.pgdb.ident(form.name),
                          this.app.api.PostgresRecordValues.tableNameWithForm(form)));
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
