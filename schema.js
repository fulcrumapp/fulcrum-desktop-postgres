import Schema from 'fulcrum-schema/dist/schema';
import sqldiff from 'sqldiff';
import PGSchema from './postgres-schema';

const {SchemaDiffer, Postgres} = sqldiff;

export default class PostgresSchema {
  static async generateSchemaStatements(account, oldForm, newForm, disableArrays, userModule) {
    let oldSchema = null;
    let newSchema = null;

    PGSchema.disableArrays = disableArrays;

    if (userModule && userModule.updateSchema && !PGSchema._modified) {
      userModule.updateSchema(PGSchema);

      PGSchema._modified = true;
    }

    if (oldForm) {
      oldSchema = new Schema(oldForm, PGSchema, userModule && userModule.schemaOptions);
    }

    if (newForm) {
      newSchema = new Schema(newForm, PGSchema, userModule && userModule.schemaOptions);
    }

    const differ = new SchemaDiffer(oldSchema, newSchema);
    const generator = new Postgres(differ, {afterTransform: null});

    generator.tablePrefix = 'account_' + account.rowID + '_';

    const statements = generator.generate();

    return {statements, oldSchema, newSchema};
  }
}
