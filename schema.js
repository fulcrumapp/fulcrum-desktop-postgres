import Schema from 'fulcrum-schema/dist/schema';
import sqldiff from 'sqldiff';
import PGSchema from './postgres-schema';

const {SchemaDiffer, Postgres} = sqldiff;

export default class PostgresSchema {
  static async generateSchemaStatements(account, oldForm, newForm) {
    let oldSchema = null;
    let newSchema = null;

    if (oldForm) {
      oldSchema = new Schema(oldForm, PGSchema, null);
    }

    if (newForm) {
      newSchema = new Schema(newForm, PGSchema, null);
    }

    const differ = new SchemaDiffer(oldSchema, newSchema);
    const generator = new Postgres(differ, {afterTransform: null});

    generator.tablePrefix = 'account_' + account.rowID + '_';

    const statements = generator.generate();

    return {statements, oldSchema, newSchema};
  }
}
